import { expect, test, type Page } from '@playwright/test';
import { openExplorer, trackProblems, waitForIdle } from './support';

const views = (page: Page) => page.getByRole('navigation', { name: 'Vistas del explorador' });

async function goToView(page: Page, label: string, view: string): Promise<void> {
  await views(page).getByRole('link', { name: label }).click();
  await expect.poll(() => page.evaluate(() => window.__tlsViewer?.engine?.view ?? null)).toBe(view);
  await waitForIdle(page);
}

const memory = (page: Page) =>
  page.evaluate(() => {
    const stats = window.__tlsViewer?.engine?.stats();
    return { geometries: stats?.geometries ?? -1, textures: stats?.textures ?? -1 };
  });

test.describe('Vistas y viajes', () => {
  test('sistema → Tierra → Luna → sistema sin recrear el motor ni el lienzo, y sin fugas', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/?captura=1');
    await page.evaluate(() => {
      window.__e2eEngine = window.__tlsViewer?.engine ?? null;
      document.querySelector('canvas')?.setAttribute('data-e2e', 'original');
    });

    const cycle = async () => {
      await goToView(page, 'Tierra', 'earth');
      await goToView(page, 'Luna', 'moon');
      await goToView(page, 'Sistema solar', 'system');
    };
    await cycle();
    await expect(page).toHaveURL(/\/\?captura=1$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('El sistema solar');
    // El primer ciclo sube las texturas de la Tierra y la Luna; los siguientes no añaden nada.
    const warm = await memory(page);
    await cycle();
    await cycle();
    expect(await memory(page)).toEqual(warm);

    expect(await page.evaluate(() => window.__e2eEngine === window.__tlsViewer?.engine)).toBe(true);
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveAttribute('data-e2e', 'original');
    expect(problems).toEqual([]);
  });

  test('los números 1, 2 y 3 cambian de vista', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    await page.keyboard.press('2');
    await expect(page).toHaveURL(/\/explorar\/tierra\?captura=1$/);
    await page.keyboard.press('3');
    await expect(page).toHaveURL(/\/explorar\/luna\?captura=1$/);
    await page.keyboard.press('1');
    await expect(page).toHaveURL(/\/\?captura=1$/);
  });

  test('un viaje entre vistas dura unos segundos y se puede saltar con Esc', async ({ page }) => {
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    await views(page).getByRole('link', { name: 'Luna' }).click();
    const skip = page.getByRole('button', { name: /Saltar el viaje/ });
    await expect(skip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(skip).toBeHidden();
    await expect(page).toHaveURL(/\/explorar\/luna\?fecha=2030-06-01T12:00Z$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luna');
  });

  test('con movimiento reducido no hay viajes ni transiciones de texto', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    await views(page).getByRole('link', { name: 'Luna' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Luna');
    // El cambio es directo: «Saltar el viaje» no llega a aparecer.
    for (let k = 0; k < 6; k++) {
      await expect(page.getByRole('button', { name: /Saltar el viaje/ })).toHaveCount(0);
      await page.waitForTimeout(150);
    }
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('.explorer__intro > :not(router-outlet)')].map((node) =>
        parseFloat(getComputedStyle(node).transitionDuration),
      ),
    );
    expect(durations.length).toBeGreaterThan(0);
    for (const seconds of durations) expect(seconds).toBeLessThan(0.001);
  });
});
