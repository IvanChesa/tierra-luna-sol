import { expect, test } from '@playwright/test';
import { openExplorer } from './support';

test('0 peticiones a otros dominios y 0 cookies en un recorrido por el sitio', async ({
  page,
  context,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? '').origin;
  const foreign: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== origin) {
      foreign.push(request.url());
    }
  });

  await openExplorer(page, '/');
  await page.locator('#tree-marte > .row').click();
  await expect(page.locator('#card-title')).toHaveText('Marte');
  await page.getByRole('link', { name: 'Ficha completa de Marte' }).click();
  await expect(page).toHaveURL(/\/planetas\/marte$/);
  await page.goBack();
  await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
  await page
    .getByRole('navigation', { name: 'Vistas del explorador' })
    .getByRole('link', {
      name: 'Tierra',
    })
    .click();
  await expect(page).toHaveURL(/\/explorar\/tierra/);
  for (const path of ['/planetas', '/sol', '/luna', '/creditos', '/sobre-el-proyecto']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  expect(foreign).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  // localStorage solo para preferencias (claves «tls.*»).
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const key of keys) expect(key).toMatch(/^tls\./);
});
