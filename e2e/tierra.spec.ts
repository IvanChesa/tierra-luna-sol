import { expect, test } from '@playwright/test';
import { openExplorer, simTime, trackProblems } from './support';

test.describe('La vista Tierra (fase 5)', () => {
  test('una vista guiada se marca, pausa, pone su hora y se anuncia; «España» lleva marcadores', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/explorar/tierra?captura=1&fecha=2026-06-21T07:30Z');
    const views = page.getByRole('group', { name: 'Vistas guiadas' });
    await expect(views.getByRole('button')).toHaveText([
      'La Tierra completa',
      'El Pacífico',
      'El Himalaya',
      'Las luces de la noche',
      'España',
    ]);
    await views.getByRole('button', { name: 'España', exact: true }).click();
    await expect(views.getByRole('button', { name: 'España', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('p.visually-hidden[aria-live="polite"]')).toContainText(
      'España. España y los lugares del cielo desde España',
    );
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    // Mediodía solar a 7° O, el mismo día: las 12:28 UTC del 21 de junio.
    await expect.poll(() => simTime(page)).toBe(Date.parse('2026-06-21T12:28:00Z'));
    const markers = () =>
      page.evaluate(() => {
        const engine = window.__tlsViewer?.engine as unknown as {
          world: { scene: { getObjectByName(name: string): { visible: boolean } | undefined } };
        };
        return engine.world.scene.getObjectByName('earth-markers')?.visible ?? null;
      });
    await expect.poll(markers).toBe(true);
    // Otra vista los quita.
    await views.getByRole('button', { name: 'El Pacífico', exact: true }).click();
    await expect.poll(markers).toBe(false);
    expect(problems).toEqual([]);
  });

  test('«Luz del Sol» cambia la hora del día sin cambiar la fecha', async ({ page }) => {
    await openExplorer(page, '/explorar/tierra?captura=1&fecha=2026-06-21T07:30Z');
    const slider = page.getByRole('slider', { name: 'Hora del día' });
    await expect(slider).toBeVisible();
    const before = new Date(await simTime(page));
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // Dos pasos de 5 minutos, el mismo día.
    await expect.poll(async () => (await simTime(page)) - before.getTime()).toBe(10 * 60_000);
    await expect(slider).toHaveAttribute('aria-valuetext', /, hora local$/);
  });
});
