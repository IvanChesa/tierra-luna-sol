import { defineConfig, devices } from '@playwright/test';

/**
 * E2e del explorador (PLAN, fase 3, 3.d.12). Chromium sin interfaz y WebGL por software
 * (SwiftShader), como en el CI, sobre el build servido por `scripts/serve-dist.mjs`. Idioma y zona
 * fijos: la interfaz escribe las fechas en la hora local del navegador.
 *
 * Uso: `npm run e2e` (compila antes; `npx playwright test` reutiliza el build que haya).
 */
/**
 * Un puerto poco común y en 127.0.0.1 (el servidor no escucha en otra dirección). En este equipo
 * pueden estar en marcha los `astro dev` y `preview` de ivanchesa.es (4321, 4322, 4330…).
 * `E2E_PORT` lo cambia (4391 por defecto), para que dos sesiones en paralelo no se pisen el puerto.
 * Si trae otra cosa que un puerto sin privilegios, falla: no cae en silencio en el de por defecto.
 */
function portFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || port < 1024 || port > 65535) {
    throw new Error(
      `${name}=${process.env[name]} no es un puerto válido (un entero de 1024 a 65535).`,
    );
  }
  return port;
}
const PORT = portFromEnv('E2E_PORT', 4391);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: 'e2e',
  // SwiftShader pinta con la CPU: un frame de la escena tarda decenas de milisegundos.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: process.env['CI'] ? 2 : 4,
  retries: process.env['CI'] ? 1 : 0,
  forbidOnly: Boolean(process.env['CI']),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: ORIGIN,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    // El recorrido de la portada (fase 9c), ya visto: arranca la primera vez en `/` sin parámetros y
    // pararía las pruebas que entran así. Las suyas (`recorrido.spec.ts`) empiezan sin nada guardado.
    storageState: {
      cookies: [],
      origins: [{ origin: ORIGIN, localStorage: [{ name: 'tls.recorrido', value: 'visto' }] }],
    },
  },
  projects: [
    {
      name: 'escritorio',
      testIgnore: ['movil.spec.ts', 'sin-webgl.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      name: 'movil',
      testMatch: ['movil.spec.ts', 'accesibilidad.spec.ts', 'regresion.spec.ts'],
      use: { ...devices['Pixel 7'], launchOptions: { args: SWIFTSHADER } },
    },
    {
      // Sin WebGL: todo lo que no es el lienzo tiene que seguir funcionando (PLAN §5).
      name: 'sin-webgl',
      testMatch: ['sin-webgl.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: { args: ['--disable-3d-apis'] },
      },
    },
  ],
  // Nunca se reutiliza un servidor que ya esté en el puerto: podría ser otra web y los e2e la
  // probarían sin decir nada. Si el puerto está ocupado, Playwright lo dice y no arranca.
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `${ORIGIN}/`,
    reuseExistingServer: false,
  },
});
