import { expect, test } from '@playwright/test';
import { indexToggle, openExplorer, openIndex, trackProblems, treeRow } from './support';

const focusedBody = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__tlsViewer?.engine?.focusedBody ?? null);

test.describe('Índice de cuerpos y ficha resumida', () => {
  test('elegir un cuerpo en el índice abre su ficha, lo enfoca y lo anuncia', async ({ page }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/?captura=1');
    await openIndex(page);
    await treeRow(page, 'saturno').click();

    await expect(page.locator('#tree-saturno')).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('complementary', { name: 'Ficha del cuerpo elegido' });
    await expect(panel.getByRole('heading', { level: 2 })).toHaveText('Saturno');
    await expect(panel).toContainText('Planeta');
    await expect(panel).toContainText('Al Sol');
    await expect(page.locator('[aria-live="polite"]')).toContainText('Saturno, planeta.');
    await expect.poll(() => focusedBody(page)).toBe('saturno');
    // Sus lunas se abren solas en el índice.
    await expect(page.locator('#tree-saturno')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#tree-titan')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('con el teclado: el árbol es una parada de tabulación; flechas e Intro eligen', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Tabulador desde el principio de la página hasta el botón «Índice» (sin ratón); al abrirlo,
    // el foco entra en el árbol.
    const toggle = indexToggle(page);
    for (let k = 0; k < 40; k++) {
      await page.keyboard.press('Tab');
      if (await toggle.evaluate((node) => node === document.activeElement)) break;
    }
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tree-sol')).toBeFocused();
    // Sol → Mercurio → Venus → Tierra → Marte → Júpiter.
    for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tree-jupiter')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#card-title')).toHaveText('Júpiter');
    // → abre las lunas (ya abiertas al elegir) y entra en la primera; Intro la elige.
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tree-io')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#card-title')).toHaveText('Ío');
    await expect.poll(() => focusedBody(page)).toBe('io');
    // El siguiente Tab sale del árbol (una sola parada).
    await page.keyboard.press('Tab');
    await expect(page.locator('[role="treeitem"]:focus')).toHaveCount(0);
  });

  test('la ficha se cierra con su botón y con Esc, y el foco no se pierde', async ({ page }) => {
    await openExplorer(page, '/?captura=1&cuerpo=marte');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).click();
    await expect(panel).toBeHidden();

    // Elegir en el índice, ir a la ficha y cerrarla con su botón: el foco no se queda en <body>.
    await openIndex(page);
    await treeRow(page, 'venus').click();
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeHidden();
    await expect(page.locator('#tree-venus')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    // Esc cierra lo que tiene el foco: primero el índice (el foco vuelve a su botón) y después la
    // ficha (el foco se queda en el botón).
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tree', { name: 'Cuerpos del sistema solar' })).toBeHidden();
    await expect(indexToggle(page)).toBeFocused();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(indexToggle(page)).toBeFocused();
  });

  test('el índice está cerrado al entrar; se abre y se cierra con el ratón, el teclado y Esc', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const toggle = indexToggle(page);
    const tree = page.getByRole('tree', { name: 'Cuerpos del sistema solar' });
    const region = page.getByRole('region', { name: 'Índice' });
    const viewLeft = () =>
      page.evaluate(() =>
        parseFloat(
          getComputedStyle(document.querySelector('.explorer') as HTMLElement).getPropertyValue(
            '--view-left',
          ),
        ),
      );
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(tree).toBeHidden();
    expect(await viewLeft()).toBe(0);

    // Con el ratón: se abre (el foco entra en el árbol), el encuadre se aparta y se cierra.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(region).toBeVisible();
    await expect(page.locator('#tree-sol')).toBeFocused();
    await expect.poll(viewLeft).toBeGreaterThan(200);
    // Con las distancias de cada fila (la de Saturno, en UA).
    await expect(page.locator('#tree-saturno .row__value')).toHaveText(/^\d+,\d\d\sUA$/);
    await toggle.click();
    await expect(tree).toBeHidden();
    await expect.poll(viewLeft).toBe(0);

    // Con el teclado: I lo abre; Esc lo cierra y el foco vuelve al botón.
    await page.keyboard.press('i');
    await expect(page.locator('#tree-sol')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tree-mercurio')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tree).toBeHidden();
    await expect(toggle).toBeFocused();
    // Su botón de cerrar, también con el foco de vuelta en «Índice».
    await page.keyboard.press('Enter');
    await region.getByRole('button', { name: 'Cerrar el índice' }).click();
    await expect(tree).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('un clic en la etiqueta de un cuerpo en el lienzo lo elige', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    // La etiqueta es una caja sin tamaño en el punto del cuerpo; lo que se ve y se pulsa es el nombre.
    const label = page.locator('.scene-label[data-body="jupiter"] .scene-label__name');
    await expect(label).toBeVisible();
    await label.click();
    await expect(page.locator('#card-title')).toHaveText('Júpiter');
    await expect.poll(() => focusedBody(page)).toBe('jupiter');
  });
});
