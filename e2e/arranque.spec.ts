import { expect, test, type Page } from '@playwright/test';
import { openExplorer, openIndex, simTime, treeRow } from './support';

const HOUR_MS = 3_600_000;

/**
 * El instante de la barra de tiempo en cuanto cambia (su `datetime`) y la hora de la página en ese
 * momento: sin el retraso de leerla entre dos actualizaciones.
 */
const nextReadout = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ sim: number; wall: number }>((resolve, reject) => {
        const time = document.querySelector('.time__readout time') as Node;
        // Con SwiftShader, un frame puede tardar segundos; si la barra no cambia en 20 s, falla claro.
        const timer = setTimeout(() => {
          observer.disconnect();
          reject(new Error('La barra de tiempo no ha cambiado en 20 s'));
        }, 20_000);
        const observer = new MutationObserver(() => {
          observer.disconnect();
          clearTimeout(timer);
          const value = (time as Element).getAttribute('datetime') ?? '';
          resolve({ sim: Date.parse(value), wall: Date.now() });
        });
        observer.observe(time, { attributes: true, attributeFilter: ['datetime'] });
      }),
  );

test.describe('Arranque del explorador sin que el navegador quede libre (cierre de la fase 9b)', () => {
  test('la interfaz y el 3D llegan aunque requestIdleCallback no se dispare nunca por sí solo', async ({
    page,
  }) => {
    // Un navegador que nunca queda libre (el CI con SwiftShader y dos workers): requestIdleCallback
    // solo llama por su `timeout`. Sin él, el `@defer (on idle)` del explorador esperaba para siempre.
    await page.addInitScript(() => {
      const timers = new Map<number, ReturnType<typeof setTimeout>>();
      let next = 1;
      window.requestIdleCallback = (callback, options) => {
        const id = next++;
        if (options?.timeout !== undefined) {
          timers.set(
            id,
            setTimeout(
              () => callback({ didTimeout: true, timeRemaining: () => 0 }),
              options.timeout,
            ),
          );
        }
        return id;
      };
      window.cancelIdleCallback = (id) => {
        clearTimeout(timers.get(id));
        timers.delete(id);
      };
    });
    await page.goto('/');
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 60_000 });
    await expect(page.locator('tls-time-controls')).toBeVisible();
  });
});

test.describe('Arranque en movimiento (D31) y velocidad según el contexto (D33)', () => {
  test('al entrar, el sistema se mueve a 3 días por segundo desde ahora', async ({ page }) => {
    await openExplorer(page, '/');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.locator('#time-speed')).toHaveValue('days3');
    const start = await simTime(page);
    // Desde «ahora»: lo que haya avanzado mientras cargaba la interfaz (con SwiftShader, segundos).
    expect(Math.abs(start - Date.now())).toBeLessThan(15 * 24 * HOUR_MS);
    // La barra se actualiza como mucho 5 veces por segundo: leída entre dos actualizaciones, cada
    // extremo podía llevar hasta 200 ms de retraso (y salían 85 h/s en una ventana de 2 s; cierre de
    // la fase 9b). Cada extremo, justo cuando cambia, con la hora de la página en ese momento.
    const from = await nextReadout(page);
    await page.waitForTimeout(2000);
    const to = await nextReadout(page);
    // Como mucho 3 días por segundo real (72 h), y muy por encima de 1 hora por segundo. Con
    // SwiftShader cada frame tarda tanto que el reloj, que avanza como mucho 400 ms de tiempo real por
    // frame, va más lento; con una GPU, a 60 FPS, la velocidad es exacta (informe de la fase 3, §4.9).
    const hoursPerSecond = (to.sim - from.sim) / HOUR_MS / ((to.wall - from.wall) / 1000);
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
    await page.getByRole('button', { name: 'Volver al sistema solar' }).click();
    await expect(speed).toHaveValue('days3');
    // En el lienzo (su etiqueta).
    await page.locator('.scene-label[data-body="saturno"] .scene-label__name').click();
    await expect(speed).toHaveValue('hour');
    await page.getByRole('button', { name: 'Volver al sistema solar' }).click();
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
    // De un cuerpo a otro (una luna de Marte, en la fila de su sistema: fase 9c): el mismo contexto,
    // la misma velocidad.
    await page.locator('tls-body-chips button[data-body="fobos"]').click();
    await expect(page.locator('#card-title')).toHaveText('Fobos');
    await expect(speed).toHaveValue('day');
    // Al volver a la vista general, la suya.
    await page.getByRole('button', { name: 'Volver al sistema solar' }).click();
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
