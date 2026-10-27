import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openControls, openExplorer, openIndex } from './support';

/** Las rutas prerenderizadas del build (todas las páginas del sitio). */
const ROUTES = Object.keys(
  (
    JSON.parse(readFileSync('dist/tierra-luna-sol/prerendered-routes.json', 'utf8')) as {
      routes: Record<string, unknown>;
    }
  ).routes,
);

/** axe con las reglas de WCAG 2.1 A y AA; el criterio del plan: 0 violaciones graves o críticas. */
async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} → ${violation.nodes
          .map((node) => node.target.join(' '))
          .join(', ')}`,
    );
}

test.describe('Accesibilidad (axe)', () => {
  test('el explorador en sus estados: vista, índice, ficha, Tierra, Luna, atajos y vista limpia', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    expect(await seriousViolations(page)).toEqual([]);

    await openIndex(page);
    expect(await seriousViolations(page)).toEqual([]);

    await page.locator('#tree-saturno > .row').click();
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/explorar/tierra?captura=1');
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    expect(await seriousViolations(page)).toEqual([]);

    await page.goto('/explorar/luna?captura=1');
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    expect(await seriousViolations(page)).toEqual([]);

    // «Controles +» abierto y, dentro, el botón de los atajos.
    await openControls(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Atajos de teclado' }).click();
    await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');

    await page.keyboard.press('v');
    await expect(page.getByRole('button', { name: /Mostrar la interfaz/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('todas las páginas del sitio', async ({ page }) => {
    // Con movimiento reducido, el explorador arranca en pausa (D31): sus tres rutas no tienen la CPU
    // ocupada pintando con SwiftShader mientras axe las analiza. Con el sistema en marcha, ya lo
    // mira la prueba de arriba.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(ROUTES.length).toBeGreaterThan(10);
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const violations = await seriousViolations(page);
      expect(violations, route).toEqual([]);
    }
  });
});
