import { expect, test } from '@playwright/test';
import { openExplorer, openIndex, simTime, treeRow } from './support';

const HOUR_MS = 3_600_000;

test.describe('Arranque en movimiento (D31) y velocidad según el contexto (D33)', () => {
  test('al entrar, el sistema se mueve a 3 días por segundo desde ahora', async ({ page }) => {
    await openExplorer(page, '/');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.locator('#time-speed')).toHaveValue('days3');
    const start = await simTime(page);
    const wallStart = Date.now();
    // Desde «ahora»: lo que haya avanzado mientras cargaba la interfaz (con SwiftShader, segundos).
    expect(Math.abs(start - wallStart)).toBeLessThan(15 * 24 * HOUR_MS);
    await page.waitForTimeout(2000);
    const advanced = (await simTime(page)) - start;
    const wall = (Date.now() - wallStart) / 1000;
    // Como mucho 3 días por segundo real (72 h), y muy por encima de 1 hora por segundo. Con
    // SwiftShader cada frame tarda tanto que el reloj, que avanza como mucho 400 ms de tiempo real por
    // frame, va más lento; con una GPU, a 60 FPS, la velocidad es exacta (informe de la fase 3, §4.9).
    const hoursPerSecond = advanced / HOUR_MS / wall;
    expect(hoursPerSecond).toBeGreaterThan(2);
    expect(hoursPerSecond).toBeLessThan(80);
  });

  test('al elegir un cuerpo, 1 hora por segundo; al volver a la vista general, 3 días (D33)', async ({
    page,
  }) => {
    await openExplorer(page, '/');
    const speed = page.locator('#time-speed');
    await expect(speed).toHaveValue('days3');
    // En una ficha.
    await page.locator('tls-body-chips button[data-body="marte"]').click();
    await expect(speed).toHaveValue('hour');
    // El aviso, una vez y en la misma frase que el cuerpo.
    await expect(page.locator('p.visually-hidden[aria-live="polite"]')).toContainText(
      'Velocidad: 1 hora por segundo',
    );
    await page.getByRole('button', { name: 'Vista general' }).click();
    await expect(speed).toHaveValue('days3');
    // En el lienzo (su etiqueta).
    await page.locator('.scene-label[data-body="saturno"] .scene-label__name').click();
    await expect(speed).toHaveValue('hour');
    await page.getByRole('button', { name: 'Vista general' }).click();
    await expect(speed).toHaveValue('days3');
    // En el índice.
    await openIndex(page);
    await treeRow(page, 'jupiter').click();
    await expect(speed).toHaveValue('hour');
    // Sigue reproduciendo, sin que el contexto la arranque o la pare.
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
  });

  test('un cambio de velocidad a mano se respeta en su contexto (D33)', async ({ page }) => {
    await openExplorer(page, '/');
    const speed = page.locator('#time-speed');
    await page.locator('tls-body-chips button[data-body="marte"]').click();
    await expect(speed).toHaveValue('hour');
    await speed.selectOption('day');
    // De un cuerpo a otro: el mismo contexto, la misma velocidad.
    await page.locator('tls-body-chips button[data-body="jupiter"]').click();
    await expect(page.locator('#card-title')).toHaveText('Júpiter');
    await expect(speed).toHaveValue('day');
    // Al volver a la vista general, la suya.
    await page.getByRole('button', { name: 'Vista general' }).click();
    await expect(speed).toHaveValue('days3');
  });

  test('con movimiento reducido arranca en pausa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openExplorer(page, '/');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    await expect(page.locator('#time-speed')).toHaveValue('days3');
    const start = await simTime(page);
    await page.waitForTimeout(1500);
    expect(await simTime(page)).toBe(start);
    // Un cambio de contexto cambia la velocidad, pero no arranca la reproducción.
    await page.locator('tls-body-chips button[data-body="saturno"]').click();
    await expect(page.locator('#time-speed')).toHaveValue('hour');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
  });

  test('con una fecha en el enlace arranca en pausa en ese instante', async ({ page }) => {
    await openExplorer(page, '/?fecha=2031-03-15T13:00Z');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
    await page.waitForTimeout(1000);
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
  });
});
