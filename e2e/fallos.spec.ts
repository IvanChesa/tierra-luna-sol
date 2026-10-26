import { expect, test } from '@playwright/test';
import { simTime } from './support';

test.describe('Fallos del 3D', () => {
  test('si el motor falla al arrancar, el tiempo sigue y «Reintentar» devuelve la escena', async ({
    page,
  }) => {
    // El motor se crea y falla al bajar las estrellas (el caso de la revisión de la fase 3).
    await page.route('**/data/stars.bin', (route) => route.fulfill({ status: 503 }));
    await page.goto('/?captura=1');
    const error = page
      .getByRole('alert')
      .filter({ hasText: 'No se ha podido mostrar la escena 3D.' });
    await expect(error).toBeVisible({ timeout: 60_000 });
    await expect(error).toContainText('El índice, la ficha y el tiempo siguen funcionando.');

    // Sin 3D, el lienzo no es una parada del tabulador ni una «aplicación».
    await expect(page.getByRole('application')).toHaveCount(0);
    await expect(page.locator('canvas.viewer-canvas')).not.toHaveAttribute('tabindex');

    // «El tiempo sigue funcionando»: lo lleva el reloj de la interfaz.
    await page.locator('#time-speed').selectOption('day');
    await page.locator('.time__play').click();
    const start = await simTime(page);
    await page.waitForTimeout(1500);
    expect((await simTime(page)) - start).toBeGreaterThan(12 * 3600_000);

    // Con la red ya bien, «Reintentar» crea un motor nuevo, que sigue reproduciendo.
    await page.unroute('**/data/stars.bin');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, {
      timeout: 90_000,
    });
    expect(await page.evaluate(() => window.__tlsViewer?.engine?.playing)).toBe(true);
    await expect(page.getByRole('application')).toHaveCount(1);
    const resumed = await simTime(page);
    await page.waitForTimeout(1500);
    expect((await simTime(page)) - resumed).toBeGreaterThan(6 * 3600_000);
  });
});
