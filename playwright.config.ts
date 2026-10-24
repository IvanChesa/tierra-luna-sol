import { defineConfig, devices } from '@playwright/test';

/**
 * E2e del explorador (PLAN, fase 3, 3.d.12). Chromium sin interfaz y WebGL por software
 * (SwiftShader), como en el CI, sobre el build servido por `scripts/serve-dist.mjs`. Idioma y zona
 * fijos: la interfaz escribe las fechas en la hora local del navegador.
 *
 * Uso: `npm run e2e` (compila antes; `npx playwright test` reutiliza el build que haya).
 */
const PORT = 4330;
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
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
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
      testMatch: ['movil.spec.ts', 'accesibilidad.spec.ts'],
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
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env['CI'],
  },
});
