import { expect, test, type Page } from '@playwright/test';
import { canvasImage, openExplorer } from './support';

/**
 * Los gestos, en todo el lienzo (fase 9c, 9c.1; D47): lo que flota sobre el 3D sin ser un control (la
 * presentación, el sobrante del selector de vistas) no captura el puntero. Arrastrar en la franja de
 * arriba del lienzo gira la escena y no selecciona texto, en un teléfono y en una tableta.
 */
const SCREENS = [
  { name: 'teléfono', viewport: { width: 390, height: 844 } },
  { name: 'tableta', viewport: { width: 768, height: 1024 } },
];

/** Lo que hay en un punto de la página (la etiqueta del elemento de encima). */
const tagAt = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.tagName ?? null, [x, y]);

for (const screen of SCREENS) {
  test.describe(`Gestos (${screen.name})`, () => {
    test.use({ viewport: screen.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

    test('arrastrar sobre la presentación gira la escena y no selecciona texto', async ({
      page,
    }) => {
      await openExplorer(page, '/?captura=1');
      const title = page.locator('.explorer__intro h1');
      const intro = page.locator('.explorer__intro p').first();
      const views = page.locator('tls-view-switcher');
      const nav = page.locator('tls-view-switcher nav');
      const titleBox = (await title.boundingBox())!;
      const introBox = (await intro.boundingBox())!;
      const viewsBox = (await views.boundingBox())!;
      const navBox = (await nav.boundingBox())!;

      // Debajo del título, de la entradilla y del sobrante del selector de vistas, el lienzo.
      const x = titleBox.x + titleBox.width / 2;
      const y = titleBox.y + titleBox.height / 2;
      expect(await tagAt(page, x, y)).toBe('CANVAS');
      expect(
        await tagAt(page, introBox.x + introBox.width / 2, introBox.y + introBox.height / 2),
      ).toBe('CANVAS');
      if (viewsBox.x + viewsBox.width > navBox.x + navBox.width + 8) {
        const spare = (navBox.x + navBox.width + viewsBox.x + viewsBox.width) / 2;
        expect(await tagAt(page, spare, viewsBox.y + viewsBox.height / 2)).toBe('CANVAS');
      }

      const before = await canvasImage(page);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 140, y + 12, { steps: 10 });
      await page.mouse.up();
      expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
      expect(await canvasImage(page)).not.toBe(before);
    });
  });
}
