import { expect, test } from '@playwright/test';
import { indexToggle, openExplorer, treeRow } from './support';

// Proyecto «movil» (Pixel 7, táctil): las hojas inferiores (índice y ficha) y el menú del sitio.
test.describe('Móvil', () => {
  test('el índice sube como hoja; al elegir, la ficha sube en su lugar y se cierra', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await indexToggle(page).tap();
    const sheet = page.getByRole('region', { name: 'Índice' });
    await expect(sheet).toBeVisible();
    // Con una hoja abierta, el texto de la vista se recoge a la vista (el H1 sigue para el lector).
    const intro = page.locator('.explorer__intro');
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
    await treeRow(page, 'marte').tap();
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('El sistema solar');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    await expect(panel).toBeHidden();
    // Vuelve el H1 (la descripción ya se ha plegado al usar el explorador).
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeGreaterThan(20);
  });

  test('con la ficha abierta, el foco va a la ficha y no pasa por lo que tapa la hoja', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Con el teclado (o un lector de pantalla): abrir el índice y elegir lleva el foco a la ficha.
    await indexToggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tree-sol')).toBeFocused();
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tree-marte')).toBeFocused();
    await page.keyboard.press('Enter');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(panel).toBeFocused();
    // El tabulador no se para en nada tapado (el botón «Índice», la barra de tiempo, la cámara).
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
    // Al cerrarla desde dentro, el foco vuelve al botón «Índice»: la fila elegida estaba en la hoja
    // del índice, que se ha cerrado (con el foco fuera de la ficha, Esc la cierra sin moverlo).
    await panel.getByRole('button', { name: 'Cerrar la ficha' }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(indexToggle(page)).toBeFocused();
  });

  test('durante un viaje con la ficha abierta, «Saltar el viaje» queda encima de la ficha', async ({
    page,
  }) => {
    // Sin captura: el viaje de la vista de la Tierra al sistema solar es animado.
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    await indexToggle(page).tap();
    await treeRow(page, 'saturno').tap();
    await expect(page.getByRole('button', { name: /Saltar el viaje/ })).toBeVisible();
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    // Las dos cajas a la vez (el viaje dura unos segundos y, con varios SwiftShader en paralelo,
    // podría acabar entre dos mediciones): el botón termina por encima de la ficha.
    const gap = await page.evaluate(() => {
      const skip = document.querySelector('.skip')?.getBoundingClientRect();
      const panel = document.querySelector('.panel:not([hidden])')?.getBoundingClientRect();
      return skip && panel ? panel.top - skip.bottom : null;
    });
    expect(gap).not.toBeNull();
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  test('las fichas: una fila que se desplaza, con zonas táctiles de al menos 44 px', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const row = page.getByRole('toolbar', { name: 'Sol y planetas' });
    const sizes = await row.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return [box.width, box.height] as const;
      }),
    );
    expect(sizes).toHaveLength(9);
    for (const [width, height] of sizes) {
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }
    // No caben todas: la fila se desplaza (la página, no).
    expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await row.getByRole('button', { name: 'Neptuno', exact: true }).tap();
    await expect(page.locator('#card-title')).toHaveText('Neptuno');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // Sus lunas, en una segunda fila con las mismas zonas táctiles.
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    const moons = page.getByRole('toolbar', { name: 'Lunas de Neptuno' });
    await expect(moons.getByRole('button')).toHaveCount(2);
    for (const height of await moons
      .getByRole('button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
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
