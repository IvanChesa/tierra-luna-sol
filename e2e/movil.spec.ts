import { expect, test } from '@playwright/test';
import { openExplorer, treeRow } from './support';

// Proyecto «movil» (Pixel 7, táctil): la hoja inferior, la tira de cuerpos y el menú del sitio.
test.describe('Móvil', () => {
  test('la tira de cuerpos abre la ficha en una hoja que se cierra', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    await treeRow(page, 'marte').tap();
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    // Con la ficha abierta, el texto de la vista se recoge a la vista (el H1 sigue para el lector).
    const intro = page.locator('.explorer__intro');
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tierra Luna Sol');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    await expect(panel).toBeHidden();
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeGreaterThan(40);
  });

  test('la barra de tiempo se despliega para la fecha, la velocidad y los ajustes', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const more = page.getByRole('button', { name: 'Fecha, velocidad y ajustes' });
    await expect(page.locator('#time-date')).toBeHidden();
    await more.tap();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#time-date')).toBeVisible();
    await expect(page.locator('#time-speed')).toBeVisible();
  });

  test('el menú del sitio se abre y se cierra al navegar', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    await page.getByRole('button', { name: 'Menú' }).tap();
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: 'Créditos' }).tap();
    await expect(page).toHaveURL(/\/creditos$/);
    await expect(menu).toBeHidden();
  });
});
