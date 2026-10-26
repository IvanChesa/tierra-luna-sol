import { expect, test } from '@playwright/test';
import { canvasImage, openExplorer } from './support';

test.describe('Cámara, vista limpia y atajos', () => {
  test('acercar y alejar con los botones y con + y −', async ({ page }) => {
    await openExplorer(page, '/?captura=1&cuerpo=saturno');
    const start = await canvasImage(page);
    await page.getByRole('button', { name: 'Acercar' }).click();
    const closer = await canvasImage(page);
    expect(closer).not.toBe(start);
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    const farther = await canvasImage(page);
    expect(farther).not.toBe(closer);
  });

  test('teclado en el lienzo: las flechas giran e Inicio vuelve a la vista general', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&cuerpo=jupiter');
    const canvas = page.getByRole('application', { name: 'Vista 3D del sistema solar' });
    await canvas.focus();
    await expect(canvas).toBeFocused();
    const start = await canvasImage(page);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    expect(await canvasImage(page)).not.toBe(start);
    await page.keyboard.press('Home');
    await expect
      .poll(() => page.evaluate(() => window.__tlsViewer?.engine?.focusedBody ?? 'ninguno'))
      .toBe('ninguno');
  });

  test('vista limpia: V oculta la interfaz y las etiquetas; Esc y el botón la recuperan', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const index = page.getByRole('tree', { name: 'Cuerpos del sistema solar' });
    await expect(index).toBeVisible();
    await page.keyboard.press('v');
    await expect(index).toBeHidden();
    await expect(page.locator('tls-time-controls')).toBeHidden();
    await expect(page.locator('.scene-labels')).toBeHidden();
    const restore = page.getByRole('button', { name: /Mostrar la interfaz/ });
    await expect(restore).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(index).toBeVisible();
    await expect(page.locator('.scene-labels')).toBeVisible();

    await page.getByRole('button', { name: 'Vista limpia' }).click();
    await expect(index).toBeHidden();
    await restore.click();
    await expect(index).toBeVisible();

    // El foco no se pierde: al entrar va a «Mostrar la interfaz»; al salir, a donde estaba.
    const clean = page.getByRole('button', { name: 'Vista limpia' });
    await clean.focus();
    await page.keyboard.press('Enter');
    await expect(restore).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(clean).toBeFocused();
    await page.locator('#tree-sol').focus();
    await page.keyboard.press('v');
    await expect(restore).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tree-sol')).toBeFocused();
  });

  test('el diálogo de atajos: ? lo abre, Esc lo cierra y se pueden desactivar', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'Atajos de teclado' });
    await expect(dialog).toBeVisible();
    // El foco está dentro del diálogo (modal) y los atajos no actúan mientras está abierto.
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('k');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Desactivados (WCAG 2.1.4), las letras ya no hacen nada; el botón de ayuda sigue abriéndolo.
    await page.getByRole('button', { name: 'Atajos de teclado' }).click();
    await dialog.getByRole('checkbox', { name: 'Atajos de una sola tecla' }).uncheck();
    await page.keyboard.press('Escape');
    await page.keyboard.press('k');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    // Al volver a abrir la página, la preferencia sigue (localStorage).
    await openExplorer(page, '/?captura=1');
    await page.keyboard.press('k');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
    // Las teclas del lienzo solo actúan con el foco en él: siguen valiendo (también + y −).
    await page.getByRole('application').focus();
    const before = await canvasImage(page);
    await page.keyboard.press('+');
    expect(await canvasImage(page)).not.toBe(before);
  });
});
