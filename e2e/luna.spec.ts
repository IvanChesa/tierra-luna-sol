import { expect, test } from '@playwright/test';
import { openExplorer, simTime, trackProblems } from './support';

test.describe('La vista Luna (fase 6)', () => {
  test('las vistas llevan la fecha a su luz y se anuncian; el panel dice la fase', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/explorar/luna?captura=1&fecha=2026-11-20T00:00Z');
    await expect(page.locator('.moon__phase')).toHaveText(/% iluminada$/);
    const views = page.getByRole('group', { name: 'Vistas' });
    await expect(views.getByRole('button')).toHaveText([
      'Cara visible',
      'Cara oculta',
      'Polo sur',
      'Luz rasante',
    ]);
    await views.getByRole('button', { name: 'Cara visible', exact: true }).click();
    await expect(views.getByRole('button', { name: 'Cara visible', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('p.visually-hidden[aria-live="polite"]')).toContainText(
      'Cara visible. La cara que la Luna enseña siempre a la Tierra',
    );
    // La luna llena más cercana al 20-11-2026: el 24 a las 14:54 UT (astronomy-engine; el USNO,
    // 14:53).
    await expect
      .poll(async () => Math.abs((await simTime(page)) - Date.parse('2026-11-24T14:54:04Z')))
      .toBeLessThan(60_000);
    await expect(page.locator('.moon__phase')).toHaveText('Luna llena · 100 % iluminada');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    expect(problems).toEqual([]);
  });

  test('el recorrido se maneja con el teclado: reproducir, saltar a la siguiente y pausar', async ({
    page,
  }) => {
    await openExplorer(page, '/explorar/luna?captura=1&fecha=2026-11-20T00:00Z');
    const play = page.getByRole('button', { name: 'Recorrer la Luna' });
    await play.focus();
    await page.keyboard.press('Enter');
    const caption = page.locator('.moon__caption');
    await expect(caption).toContainText('1 de 5 · Base Tranquilidad.');
    await expect(page.getByRole('button', { name: 'Pausar el recorrido' })).toBeFocused();
    // «Parada siguiente», con el teclado: salta y para el recorrido.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Parada siguiente' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(caption).toContainText('2 de 5 · Copérnico.');
    await expect(page.getByRole('button', { name: 'Recorrer la Luna' })).toBeVisible();
  });

  test('con movimiento reducido, el recorrido va paso a paso', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openExplorer(page, '/explorar/luna?fecha=2026-11-20T00:00Z');
    await expect(page.locator('.moon__hint')).toHaveText(/paso a paso/);
    await page.getByRole('button', { name: 'Recorrer la Luna' }).click();
    const caption = page.locator('.moon__caption');
    await expect(caption).toContainText('1 de 5');
    // No avanza solo (una parada dura 12 s): sigue en la primera, y el botón da la siguiente.
    await page.waitForTimeout(13_000);
    await expect(caption).toContainText('1 de 5');
    await page.getByRole('button', { name: 'Seguir el recorrido' }).click();
    await expect(caption).toContainText('2 de 5');
  });
});
