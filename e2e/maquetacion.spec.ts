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

/**
 * Pantallas bajas (revisión de diseño de la fase 3, hallazgo 1): teléfonos táctiles con la barra de
 * tiempo desplegada, uno en horizontal y una ventana de 1280 × 720 con el zoom al 200 % (640 × 360).
 * El lienzo no desaparece, la cámara no pisa la cabecera ni el texto, y todo control se ve o se
 * alcanza desplazando (la hoja inferior o la página).
 */
const LOW_SCREENS = [
  {
    name: 'táctil 360 × 640 con la barra desplegada',
    width: 360,
    height: 640,
    touch: true,
    expand: true,
  },
  {
    name: 'táctil 375 × 667 con la barra desplegada',
    width: 375,
    height: 667,
    touch: true,
    expand: true,
  },
  {
    name: 'táctil 390 × 844 con la barra desplegada',
    width: 390,
    height: 844,
    touch: true,
    expand: true,
  },
  { name: 'táctil 844 × 390 (horizontal)', width: 844, height: 390, touch: true, expand: false },
  {
    name: 'zoom al 200 % (640 × 360) con la barra desplegada',
    width: 640,
    height: 360,
    touch: false,
    expand: true,
  },
];

for (const screen of LOW_SCREENS) {
  test(`${screen.name}: el lienzo se ve y todos los controles se alcanzan`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      viewport: { width: screen.width, height: screen.height },
      deviceScaleFactor: 2,
      isMobile: screen.touch,
      hasTouch: screen.touch,
    });
    const page = await context.newPage();
    await page.goto('/?captura=1');
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    await expect(page.locator('tls-camera-controls button').first()).toBeVisible();
    if (screen.expand) await page.locator('.time__more').click();
    await page.waitForTimeout(300);

    const layout = await page.evaluate(() => {
      const explorer = document.querySelector('.explorer') as HTMLElement;
      const style = getComputedStyle(explorer);
      const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
      const rect = explorer.getBoundingClientRect();
      const view = { top: rect.top + px('--view-top'), bottom: rect.bottom - px('--view-bottom') };
      const header = (
        document.querySelector('.site-header') as HTMLElement
      ).getBoundingClientRect();
      /** ¿Lo tapa un contenedor que solo lo oculta a la vista (texto para lectores)? */
      const hiddenByClip = (el: Element) => {
        for (let node: Element | null = el; node; node = node.parentElement) {
          const s = getComputedStyle(node);
          if (s.display === 'none' || s.visibility === 'hidden' || s.clipPath !== 'none')
            return true;
        }
        return false;
      };
      /** El contenedor que se desplaza (en cualquier eje) y en el que el control queda fuera. */
      const scroller = (el: Element) => {
        for (
          let node = el.parentElement;
          node && node !== document.body;
          node = node.parentElement
        ) {
          const s = getComputedStyle(node);
          const y = /(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 1;
          const x = /(auto|scroll)/.test(s.overflowX) && node.scrollWidth > node.clientWidth + 1;
          if (x || y) return node.className;
        }
        return null;
      };
      const pageScrolls = document.documentElement.scrollHeight > innerHeight + 1;
      const controls = [
        ...document.querySelectorAll(
          '.explorer button, .explorer select, .explorer input, .site-header button',
        ),
      ]
        .filter((el) => !hiddenByClip(el))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: (el.textContent ?? '').trim().slice(0, 24) || el.className || el.tagName,
            camera: el.closest('tls-camera-controls') !== null,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            scroller: scroller(el),
          };
        })
        .filter((c) => c.right - c.left > 1 && c.bottom - c.top > 1);
      const strip = document.querySelector('.tree') as HTMLElement;
      return {
        view,
        header: header.bottom,
        controls,
        pageScrolls,
        stripHeight: strip.clientHeight,
        pageHeight: document.documentElement.scrollHeight,
      };
    });

    // El lienzo se ve: al menos 150 px de alto entre el texto de la vista y la hoja inferior.
    expect(layout.view.bottom - layout.view.top).toBeGreaterThanOrEqual(150);
    // La tira de cuerpos no desaparece.
    expect(layout.stripHeight).toBeGreaterThanOrEqual(40);
    for (const control of layout.controls) {
      // Cada control se ve en la ventana o se alcanza desplazando la página o su contenedor.
      if (!control.scroller) {
        expect(control.left, control.name).toBeGreaterThanOrEqual(-1);
        expect(control.right, control.name).toBeLessThanOrEqual(screen.width + 1);
        if (!layout.pageScrolls) {
          expect(control.bottom, control.name).toBeLessThanOrEqual(screen.height + 1);
        }
        expect(control.bottom, control.name).toBeLessThanOrEqual(layout.pageHeight + 1);
      }
    }
    // La cámara, dentro del lienzo visible: ni sobre la cabecera ni sobre el texto de la vista.
    for (const button of layout.controls.filter((c) => c.camera)) {
      expect(button.top, 'cámara').toBeGreaterThanOrEqual(
        Math.max(layout.view.top, layout.header) - 1,
      );
      expect(button.bottom, 'cámara').toBeLessThanOrEqual(layout.view.bottom + 1);
      for (const other of layout.controls.filter((c) => !c.camera)) {
        expect(overlaps(button, other), `cámara y ${other.name}`).toBe(false);
      }
    }
    await context.close();
  });
}
