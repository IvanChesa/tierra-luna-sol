import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openExplorer, openIndex, treeRow, waitForIdle } from './support';

/** axe con las reglas de WCAG 2.1 A y AA: las violaciones graves o críticas (el criterio del plan). */
async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.help}`);
}

const NOTICE = 'Imagen de radar de la sonda Magellan, con el color de las fotos de las Venera 13 y 14: no es lo que verían tus ojos.';

test.describe('Venus «Bajo las nubes» (fase 9b, D44)', () => {
  test('el botón de la ficha de Venus, con el teclado: aria-pressed, el aviso y el radar pedido solo al pulsarlo', async ({
    page,
  }) => {
    const radarRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/textures\/\dk\/venus-radar\.[0-9a-f]{10}\.webp$/.test(request.url())) {
        radarRequests.push(request.url());
      }
    });
    await openExplorer(page, '/?captura=1&cuerpo=venus');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    const button = panel.getByRole('button', { name: 'Bajo las nubes' });
    const note = panel.locator('#card-radar-note');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    // Hasta pulsarlo, ni se pide ni se ve el aviso.
    expect(radarRequests).toEqual([]);
    await expect(note).not.toHaveText(NOTICE);

    // Con el teclado (Intro): pulsado, la textura pedida y el aviso visible.
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(note).toHaveText(NOTICE);
    await expect(note).toBeVisible();
    expect(radarRequests).toHaveLength(1);
    // En el modo de captura, el nivel alto: la de 4k.
    expect(radarRequests[0]).toMatch(/\/textures\/4k\//);
    await waitForIdle(page);
    expect(await seriousViolations(page)).toEqual([]);

    // Con la barra espaciadora, otra vez las nubes (el foco sigue en el botón).
    await expect(button).toBeFocused();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(note).not.toHaveText(NOTICE);

    // Encendido y con otro cuerpo elegido, vuelven las nubes: de vuelta en Venus, sin pulsar.
    await page.keyboard.press('Enter');
    await expect(note).toHaveText(NOTICE);
    await openIndex(page);
    await treeRow(page, 'marte').click();
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(panel.getByRole('button', { name: 'Bajo las nubes' })).toHaveCount(0);
    await treeRow(page, 'venus').click();
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    await expect(panel.getByRole('button', { name: 'Bajo las nubes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('con ?radar=1 (captura), Venus sale ya con el radar y su aviso', async ({ page }) => {
    await openExplorer(page, '/?captura=1&cuerpo=venus&radar=1');
    const panel = page.locator('.panel');
    await expect(panel.getByRole('button', { name: 'Bajo las nubes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(panel.locator('#card-radar-note')).toHaveText(NOTICE);
  });
});
