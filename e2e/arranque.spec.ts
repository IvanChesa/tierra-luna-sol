import { expect, test } from '@playwright/test';
import { openExplorer, simTime } from './support';

const HOUR_MS = 3_600_000;

test.describe('Arranque en movimiento (D31)', () => {
  test('al entrar, el sistema se mueve a 3 horas por segundo desde ahora', async ({ page }) => {
    await openExplorer(page, '/');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.locator('#time-speed')).toHaveValue('hours3');
    const start = await simTime(page);
    const wallStart = Date.now();
    // Desde «ahora»: lo que haya avanzado mientras cargaba la interfaz (con SwiftShader, segundos).
    expect(Math.abs(start - wallStart)).toBeLessThan(15 * 24 * HOUR_MS);
    await page.waitForTimeout(2000);
    const advanced = (await simTime(page)) - start;
    const wall = (Date.now() - wallStart) / 1000;
    // Como mucho 3 horas por segundo real, y muy por encima del tiempo real. Con SwiftShader cada
    // frame tarda tanto que el reloj, que avanza como mucho 400 ms de tiempo real por frame, va más
    // lento; con una GPU, a 60 FPS, la velocidad es exacta (informe de la fase 3, §4.9).
    const hoursPerSecond = advanced / HOUR_MS / wall;
    expect(hoursPerSecond).toBeGreaterThan(0.1);
    expect(hoursPerSecond).toBeLessThan(3.6);
  });

  test('con movimiento reducido arranca en pausa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openExplorer(page, '/');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    await expect(page.locator('#time-speed')).toHaveValue('hours3');
    const start = await simTime(page);
    await page.waitForTimeout(1500);
    expect(await simTime(page)).toBe(start);
  });

  test('con una fecha en el enlace arranca en pausa en ese instante', async ({ page }) => {
    await openExplorer(page, '/?fecha=2031-03-15T13:00Z');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
    await page.waitForTimeout(1000);
    expect(await simTime(page)).toBe(Date.parse('2031-03-15T13:00:00Z'));
  });
});
