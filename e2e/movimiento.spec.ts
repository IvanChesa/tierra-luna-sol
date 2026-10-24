import { expect, test } from '@playwright/test';
import { openExplorer } from './support';

const aliased = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__tlsViewer?.engine?.stats().aliased ?? []);

test('a 1 año por segundo, Fobos y Deimos se dibujan como su órbita (sin aliasing)', async ({
  page,
}) => {
  await openExplorer(page, '/?captura=1&cuerpo=marte');
  expect(await aliased(page)).toEqual([]);
  await page.locator('#time-speed').selectOption('year');
  await page.keyboard.press('k');
  // Fobos da más de 1000 vueltas por segundo real: su marcador se sustituye por su órbita.
  await expect.poll(() => aliased(page)).toEqual(expect.arrayContaining(['fobos', 'deimos']));
  // Marte (el foco) sigue a la vista con su etiqueta.
  await expect(page.locator('.scene-label[data-body="marte"] .scene-label__name')).toBeVisible();
  // Al pausar, vuelven.
  await page.keyboard.press('k');
  await expect.poll(() => aliased(page)).toEqual([]);
});
