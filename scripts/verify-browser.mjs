// Comprueba una publicación en el navegador (fase 11), lo que `verify-pages.mjs` no ve con `fetch`:
// - ninguna petición a otro dominio (D24) en las vistas del explorador y en las páginas, contando lo
//   que pide el 3D al arrancar (texturas, estrellas, chunks) y unos segundos de reproducción;
// - ninguna cookie en el navegador al terminar;
// - el panel de rendimiento (FPS, CPU, llamadas, VRAM…), ausente: solo sale con `ng serve`
//   (`isDevMode()`, `viewer-canvas.ts`; petición de Iván del 08-11).
// Con la GPU del equipo (como `capture-lib.mjs`); `--swiftshader`, con WebGL por software.
// Uso: node scripts/verify-browser.mjs https://tierra-luna-sol.ivanchesa.com [--swiftshader]
import { chromium } from '@playwright/test';
import { launchArgs, PAGE_OPTIONS } from './capture-lib.mjs';

const base = (process.argv.find((arg) => /^https?:\/\//.test(arg)) ?? '').replace(/\/$/, '');
if (!base) throw new Error('Uso: node scripts/verify-browser.mjs <url> [--swiftshader]');
const host = new URL(base).host;
const EXPLORER = ['/', '/?cuerpo=saturno', '/explorar/tierra', '/explorar/luna', '/cielo'];
const PAGES = ['/planetas/marte', '/lunas/titan', '/eclipses', '/sobre-el-proyecto', '/creditos'];

const browser = await chromium.launch({ args: launchArgs() });
const context = await browser.newContext({
  ...PAGE_OPTIONS,
  viewport: { width: 1440, height: 900 },
});
const outside = new Set();
let requests = 0;
context.on('request', (request) => {
  const url = new URL(request.url());
  if (url.protocol === 'data:' || url.protocol === 'blob:') return;
  requests++;
  if (url.host !== host) outside.add(url.href);
});
const failures = [];
try {
  for (const path of [...EXPLORER, ...PAGES]) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await page.goto(base + path, { waitUntil: 'networkidle' });
    if (EXPLORER.includes(path)) {
      await page.locator('canvas[role="application"]').waitFor({ timeout: 60_000 });
      await page.waitForTimeout(6000);
    }
    const panel = await page.locator('.viewer-stats').count();
    const text = (await page.textContent('body')) ?? '';
    const devPanel = panel > 0 || text.includes('solo en desarrollo');
    if (devPanel) failures.push(`${path}: sale el panel de rendimiento`);
    for (const error of errors) failures.push(`${path}: error en la consola: ${error}`);
    console.log(
      `${devPanel ? '✖' : '✔'} ${path}: sin panel de rendimiento${errors.length ? `, ${errors.length} errores` : ''}`,
    );
    await page.close();
  }
  const cookies = await context.cookies();
  if (cookies.length) failures.push(`cookies: ${cookies.map((c) => c.name).join(', ')}`);
  for (const url of outside) failures.push(`petición a otro dominio: ${url}`);
  console.log(
    `\n${requests} peticiones a ${host}; ${outside.size} a otros dominios; ${cookies.length} cookies`,
  );
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.map((f) => `✖ ${f}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('✔ Todo bien');
}
