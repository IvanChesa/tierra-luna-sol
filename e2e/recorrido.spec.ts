import { expect, test, type Page } from '@playwright/test';

/**
 * El recorrido de la portada (fase 9c, 9c.6; decisión 3 de Iván): unos 30 s la primera vez que se entra
 * en `/` sin parámetros, con «Saltar el recorrido» a la vista y con el foco. Lo paran «Saltar», `Esc`
 * y cualquier toque, rueda o tecla, y la escena se queda donde está. No arranca con movimiento
 * reducido (se ofrece «Ver el recorrido»), en el modo de captura ni con un enlace profundo.
 */
// Sin nada guardado: la primera vez (la configuración da el recorrido por visto a las demás pruebas).
test.use({ storageState: { cookies: [], origins: [] } });

const skip = (page: Page) => page.getByRole('button', { name: /Saltar el recorrido/ });
const title = (page: Page) => page.getByRole('heading', { level: 1 });

async function arrive(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
  await expect(page.locator('tls-time-controls')).toBeVisible();
}

test.describe('El recorrido de la portada (fase 9c)', () => {
  test('arranca la primera vez, con «Saltar» enfocado; «Saltar» lo para donde está y no vuelve', async ({
    page,
  }) => {
    await arrive(page, '/');
    await expect(skip(page)).toBeVisible();
    await expect(skip(page)).toBeFocused();
    // Primero, Saturno: el título lo dice (sigue al cuerpo elegido).
    await expect(title(page)).toHaveText('Saturno', { timeout: 20_000 });
    await skip(page).click();
    await expect(skip(page)).toBeHidden();
    // Se queda donde está: en Saturno, sin seguir a la Tierra.
    await page.waitForTimeout(9000);
    await expect(title(page)).toHaveText('Saturno');
    await expect(page).toHaveURL(/\/(\?.*)?$/);
    expect(await page.evaluate(() => localStorage.getItem('tls.recorrido'))).toBe('visto');
    // La próxima vez, no arranca.
    await arrive(page, '/');
    await page.waitForTimeout(2000);
    await expect(skip(page)).toBeHidden();
  });

  test('Esc lo para sin hacer nada más; un clic en el lienzo y la rueda, también', async ({
    browser,
    baseURL,
  }) => {
    for (const how of ['Esc', 'clic', 'rueda'] as const) {
      const context = await browser.newContext({
        baseURL,
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      await arrive(page, '/');
      await expect(skip(page), how).toBeVisible();
      if (how === 'Esc') await page.keyboard.press('Escape');
      else if (how === 'clic') await page.mouse.click(640, 300);
      else {
        await page.mouse.move(640, 300);
        await page.mouse.wheel(0, 200);
      }
      await expect(skip(page), how).toBeHidden();
      // (El clic, además, hace lo suyo: si cae en un cuerpo, lo elige, y el anuncio es el suyo.)
      if (how !== 'clic') {
        await expect(page.locator('p.visually-hidden[aria-live="polite"]'), how).toContainText(
          'Recorrido parado.',
        );
      }
      await context.close();
    }
  });

  test('llega hasta el final: la Tierra, la Luna y la vista general en marcha', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await arrive(page, '/');
    await expect(skip(page)).toBeVisible();
    await expect(title(page)).toHaveText('La Tierra', { timeout: 30_000 });
    await expect(title(page)).toHaveText('La Luna', { timeout: 30_000 });
    await expect(title(page)).toHaveText('El sistema solar', { timeout: 30_000 });
    await expect(skip(page)).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    // El historial no se llena con sus viajes: atrás no vuelve a la Luna.
    expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(2);
  });

  test('no arranca con movimiento reducido (ofrece «Ver el recorrido»), en captura ni con un enlace profundo', async ({
    browser,
    baseURL,
  }) => {
    const reduced = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
    const page = await reduced.newPage();
    await arrive(page, '/');
    await page.waitForTimeout(2000);
    await expect(skip(page)).toBeHidden();
    const offer = page.getByRole('button', { name: 'Ver el recorrido' });
    await expect(offer).toBeVisible();
    // A demanda, sí (con movimiento reducido, los viajes de cámara son cortes).
    await offer.click();
    await expect(skip(page)).toBeVisible();
    await reduced.close();

    for (const path of [
      '/?captura=1',
      '/?cuerpo=marte',
      '/?fecha=2030-06-01T12:00Z',
      '/explorar/tierra',
      '/cielo',
    ]) {
      const context = await browser.newContext({ baseURL });
      const other = await context.newPage();
      await arrive(other, path);
      await other.waitForTimeout(2000);
      await expect(skip(other), path).toBeHidden();
      await context.close();
    }
  });
});
