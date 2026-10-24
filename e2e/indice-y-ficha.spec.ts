import { expect, test } from '@playwright/test';
import { openExplorer, trackProblems, treeRow } from './support';

const focusedBody = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__tlsViewer?.engine?.focusedBody ?? null);

test.describe('Índice de cuerpos y ficha resumida', () => {
  test('elegir un cuerpo en el índice abre su ficha, lo enfoca y lo anuncia', async ({ page }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/?captura=1');
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
    // Tabulador desde el principio de la página hasta el índice (sin ratón).
    let id: string | null = null;
    for (let k = 0; k < 40 && !id?.startsWith('tree-'); k++) {
      await page.keyboard.press('Tab');
      id = await page.evaluate(() => document.activeElement?.id ?? null);
    }
    expect(id).toBe('tree-sol');
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

  test('la ficha se cierra con su botón y con Esc', async ({ page }) => {
    await openExplorer(page, '/?captura=1&cuerpo=marte');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).click();
    await expect(panel).toBeHidden();

    await treeRow(page, 'venus').click();
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
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
