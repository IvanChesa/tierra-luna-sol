import { expect, test } from '@playwright/test';
import { openExplorer } from './support';

/**
 * La regresión visual (fase 10, tarea 6): las vistas clave del explorador en el modo de captura
 * (`?captura=1`: una fecha fija, sin animación y con las texturas ya subidas) frente a sus referencias,
 * en escritorio y en el móvil. Las referencias son las del CI (Linux, el Chromium de Playwright con
 * SwiftShader): el WebGL por software y las fuentes del sistema cambian de un sistema a otro, así que
 * solo se comparan en Linux. Las genera el trabajo «Referencias de la regresión visual» del CI, en una
 * rama `referencias-*`, y se guardan junto a este fichero (`regresion.spec.ts-snapshots/`).
 */
test.skip(process.platform !== 'linux', 'Las referencias son las del CI (Linux)');

const VIEWS: readonly (readonly [string, string])[] = [
  ['portada', '/?captura=1'],
  ['saturno', '/?captura=1&cuerpo=saturno'],
  ['sol', '/?captura=1&cuerpo=sol'],
  ['tierra', '/explorar/tierra?captura=1'],
  ['luna', '/explorar/luna?captura=1'],
  ['cielo', '/cielo?captura=1&fecha=2026-11-01T21:00Z'],
];

test.describe('Regresión visual (fase 10)', () => {
  for (const [name, path] of VIEWS) {
    test(name, async ({ page }) => {
      await openExplorer(page, path);
      // En el borde derecho, lejos de los cuerpos y de la interfaz: sin estados de «encima».
      const size = page.viewportSize() ?? { width: 1280, height: 800 };
      await page.mouse.move(size.width - 5, size.height / 2);
      await expect(page).toHaveScreenshot(`${name}.png`, {
        animations: 'disabled',
        caret: 'hide',
        // SwiftShader es determinista en el mismo sistema; el margen, para el suavizado de los bordes.
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
