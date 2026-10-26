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

  test('con la ficha abierta, el foco va a la ficha y no pasa por lo que tapa la hoja', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Con el teclado (o un lector de pantalla): elegir en la tira lleva el foco a la ficha.
    await page.locator('#tree-marte').focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(panel).toBeFocused();
    // El tabulador no se para en nada tapado (la tira, la barra de tiempo, la cámara).
    for (let k = 0; k < 6; k++) {
      await page.keyboard.press('Tab');
      const covered = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body) return null;
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit && !element.contains(hit) && !hit.contains(element) ? element.outerHTML : null;
      });
      expect(covered).toBeNull();
    }
    // Al cerrarla desde dentro, el foco vuelve a la fila de la tira (con el foco fuera de la ficha,
    // por ejemplo ya en la cabecera, Esc la cierra sin moverlo).
    await panel.getByRole('button', { name: 'Cerrar la ficha' }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#tree-marte')).toBeFocused();
  });

  test('durante un viaje con la ficha abierta, «Saltar el viaje» queda encima de la ficha', async ({
    page,
  }) => {
    // Sin captura: el viaje de la vista de la Tierra al sistema solar es animado.
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    await treeRow(page, 'saturno').tap();
    const skip = page.getByRole('button', { name: /Saltar el viaje/ });
    await expect(skip).toBeVisible();
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    const [button, panel] = await Promise.all([
      skip.boundingBox(),
      page.locator('.panel').boundingBox(),
    ]);
    expect(button && panel && button.y + button.height).toBeLessThanOrEqual(panel?.y ?? 0);
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
