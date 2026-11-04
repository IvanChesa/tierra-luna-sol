import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openExplorer, openIndex, settlePage } from './support';

/** Las rutas prerenderizadas del build: todas las páginas del sitio (fase 9: en todas). */
const ROUTES = Object.keys(
  (
    JSON.parse(readFileSync('dist/tierra-luna-sol/prerendered-routes.json', 'utf8')) as {
      routes: Record<string, unknown>;
    }
  ).routes,
);

test('0 peticiones a otros dominios y 0 cookies en todas las páginas del sitio', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(600_000);
  const origin = new URL(baseURL ?? '').origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== origin) {
      foreign.push(`${page.url()} → ${request.url()}`);
    }
  });

  // Un recorrido con clics (el explorador, su índice y la ficha) y, después, cada página.
  await openExplorer(page, '/');
  await openIndex(page);
  await page.locator('#tree-marte > .row').click();
  await expect(page.locator('#card-title')).toHaveText('Marte');
  await page.getByRole('link', { name: 'Ficha completa de Marte' }).click();
  await expect(page).toHaveURL(/\/planetas\/marte$/);
  await page.goBack();
  await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });

  expect(ROUTES.length).toBeGreaterThanOrEqual(40);
  // Con movimiento reducido: el explorador arranca en pausa y SwiftShader no tiene la CPU ocupada.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ROUTES) {
    await page.goto(route);
    await settlePage(page);
    // Sin `networkidle` (revisión del bloque C, C5): se siguen oyendo las peticiones un tiempo fijo,
    // por si alguna llega tarde (como el `import()` de los datos «de hoy» de las fichas).
    await page.waitForTimeout(800);
  }

  expect(foreign).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  // localStorage solo para preferencias (claves «tls.*»).
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const key of keys) expect(key).toMatch(/^tls\./);
});
