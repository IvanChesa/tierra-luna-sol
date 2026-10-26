import { expect, test } from '@playwright/test';
import { simTime, treeRow } from './support';

// Proyecto «sin-webgl» (Chromium con --disable-3d-apis): el lienzo no puede arrancar.
test('sin WebGL, el índice, la ficha y el tiempo siguen funcionando', async ({ page }) => {
  await page.goto('/?fecha=2030-06-01T12:00Z');
  const error = page
    .getByRole('alert')
    .filter({ hasText: 'No se ha podido mostrar la escena 3D.' });
  await expect(error).toBeVisible({ timeout: 60_000 });
  await expect(error).toContainText('El índice, la ficha y el tiempo siguen funcionando.');
  // El póster sigue debajo del aviso.
  await expect(page.locator('tls-viewer-poster')).toBeVisible();

  await treeRow(page, 'marte').click();
  await expect(page.locator('#card-title')).toHaveText('Marte');
  await expect(page.locator('.panel')).toContainText(/millones de km/);

  // Sin motor, el tiempo avanza con el reloj de la propia interfaz.
  await page.locator('#time-speed').selectOption('day');
  await page.keyboard.press('k');
  const start = await simTime(page);
  await page.waitForTimeout(1500);
  expect((await simTime(page)) - start).toBeGreaterThan(12 * 3600_000);
  await page.keyboard.press('k');
  await expect(page).toHaveURL(/fecha=2030-06-0\dT/);
});
