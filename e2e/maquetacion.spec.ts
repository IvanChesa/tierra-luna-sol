import { expect, test } from '@playwright/test';

interface Box {
  readonly name: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const overlaps = (a: Box, b: Box) =>
  a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;

// La fila de la barra de tiempo es lo más ancho del escritorio: a 1024 px (el mínimo) tiene que caber.
for (const width of [1024, 1100, 1280, 1600]) {
  test(`a ${width} px de ancho, la barra de tiempo cabe sin solaparse`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?captura=1&cuerpo=saturno');
    await expect(page.locator('tls-time-controls .time__play')).toBeVisible();
    const boxes = await page.evaluate(() => {
      const visible = (el: Element) => getComputedStyle(el).display !== 'none';
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.className || el.tagName,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      };
      // Los controles uno a uno (no sus cajas: un campo encogido deja que su control se salga).
      const controls = [...document.querySelectorAll('.time button, .time select, .time input')]
        .filter(visible)
        .map(box);
      const labels = [...document.querySelectorAll('.time .field__label')].filter(visible).map(box);
      return { controls, labels, page: document.documentElement.scrollWidth };
    });
    expect(boxes.page).toBeLessThanOrEqual(width);
    for (const group of [boxes.controls, boxes.labels]) {
      for (const [i, a] of group.entries()) {
        expect(a.right, a.name).toBeLessThanOrEqual(width);
        for (const b of group.slice(i + 1)) {
          expect(overlaps(a, b), `${a.name} y ${b.name}`).toBe(false);
        }
      }
    }
  });
}
