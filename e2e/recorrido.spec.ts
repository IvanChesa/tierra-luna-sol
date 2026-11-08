import { expect, test, type Page } from '@playwright/test';

/**
 * El recorrido de la portada (fase 9c, 9c.6; decisión 3 de Iván): unos 30 s la primera vez que se entra
 * en `/` sin parámetros, con «Saltar el recorrido» a la vista y con el foco, y un rótulo por parada.
 * «Saltar» y `Esc` llevan a la vista general en marcha; cualquier otro toque, rueda o tecla lo para y la
 * escena se queda donde está (crítica de la 9c). Al acabar, las pistas («Ahora tú: elige un cuerpo
 * abajo…»). No arranca con movimiento reducido (se ofrece «Ver el recorrido»), en el modo de captura ni
 * con un enlace profundo.
 */
// Sin nada guardado: la primera vez (la configuración da el recorrido por visto a las demás pruebas).
test.use({ storageState: { cookies: [], origins: [] } });

const skip = (page: Page) => page.getByRole('button', { name: /Saltar el recorrido/ });
const title = (page: Page) => page.getByRole('heading', { level: 1 });
const callout = (page: Page) => page.locator('tls-callout .callout__text');
const live = 'p.visually-hidden[aria-live="polite"]';

async function arrive(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
  await expect(page.locator('tls-time-controls')).toBeVisible();
}

test.describe('El recorrido de la portada (fase 9c)', () => {
  test('arranca la primera vez, con «Saltar» enfocado; «Saltar» lleva a la vista general en marcha', async ({
    page,
  }) => {
    await arrive(page, '/');
    await expect(skip(page)).toBeVisible();
    await expect(skip(page)).toBeFocused();
    // Primero, Saturno: el título lo dice (sigue al cuerpo elegido) y el rótulo, la parada.
    await expect(title(page)).toHaveText('Saturno', { timeout: 20_000 });
    await expect(callout(page)).toHaveText(/^1 de [34] · Saturno y sus anillos$/);
    await skip(page).click();
    await expect(skip(page)).toBeHidden();
    // La vista general, en marcha, sin «Saltar el viaje» ni marco de foco sobre el lienzo (con el ratón).
    await expect(title(page)).toHaveText('El sistema solar');
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await expect(page.getByRole('button', { name: /Saltar el viaje/ })).toBeHidden();
    await expect(page.locator('canvas')).not.toBeFocused();
    await expect(page).toHaveURL(/\/$/);
    // Las pistas, junto a la fila, desde que se salta; se van solas a los pocos segundos.
    await expect(callout(page)).toHaveText(
      /^Ahora tú: elige un cuerpo abajo · arrastra para girar/,
    );
    await expect(callout(page)).toBeHidden({ timeout: 12_000 });
    expect(await page.evaluate(() => localStorage.getItem('tls.recorrido'))).toBe('visto');
    // Sin un gesto, las pistas no se dan por vistas.
    expect(await page.evaluate(() => localStorage.getItem('tls.pistas'))).toBeNull();
    // La próxima vez, no arranca.
    await arrive(page, '/');
    await page.waitForTimeout(2000);
    await expect(skip(page)).toBeHidden();
  });

  test('al pararlo con Intro, el foco no se pierde: va al lienzo (revisión, hallazgo 2)', async ({
    page,
  }) => {
    await arrive(page, '/');
    await expect(skip(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(skip(page)).toBeHidden();
    await expect(page.locator('canvas[tabindex="0"]')).toBeFocused();
  });

  test('con una red lenta, no arranca si ya se ha elegido un cuerpo antes del 3D (hallazgo 1)', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    // El código de three llega 8 s tarde: las fichas y la barra ya funcionan.
    await page.route('**/*.js', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes('THREE.WebGLRenderer')) await new Promise((r) => setTimeout(r, 8000));
      await route.fulfill({ response, body });
    });
    await page.goto('/');
    await page
      .getByRole('toolbar', { name: 'Sol y planetas' })
      .getByRole('button', { name: 'Júpiter', exact: true })
      .click();
    await expect(title(page)).toHaveText('Júpiter');
    await expect(page.locator('tls-viewer-canvas')).not.toHaveClass(/is-ready/);
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    await page.waitForTimeout(5000);
    await expect(skip(page)).toBeHidden();
    await expect(title(page)).toHaveText('Júpiter');
    // No se ha visto: la próxima vez que se llegue a `/` sin tocar nada, arrancará.
    expect(await page.evaluate(() => localStorage.getItem('tls.recorrido'))).toBeNull();
  });

  test('Esc lleva a la vista general; un clic en el lienzo y la rueda lo paran donde está', async ({
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
      if (how === 'Esc') {
        await expect(page.locator(live), how).toContainText('Vista general del sistema solar');
        await expect(page.locator('.time__play'), how).toHaveAccessibleName(/Pausar/);
      } else if (how === 'rueda') {
        // (El clic, además, hace lo suyo: si cae en un cuerpo, lo elige, y el anuncio es el suyo.)
        await expect(page.locator(live), how).toContainText('Recorrido parado.');
      }
      await context.close();
    }
  });

  test('llega hasta el final: la Tierra con España, la Luna si se ve y la vista general en marcha', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await arrive(page, '/');
    await expect(skip(page)).toBeVisible();
    await expect(callout(page)).toHaveText(/^1 de [34] · /, { timeout: 20_000 });
    // La Luna, solo si se ve iluminada: el rótulo cuenta 4 paradas (con ella) o 3.
    const stops = Number(/de (\d)/.exec((await callout(page).textContent()) ?? '')?.[1]);
    await expect(title(page)).toHaveText('La Tierra', { timeout: 30_000 });
    // España, con sus lugares nombrados en el rótulo.
    await expect(callout(page)).toContainText('el Montsec, Fabra', { timeout: 30_000 });
    if (stops === 4) await expect(title(page)).toHaveText('La Luna', { timeout: 30_000 });
    await expect(title(page)).toHaveText('El sistema solar', { timeout: 30_000 });
    await expect(skip(page)).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    // Al acabar, la invitación junto a la fila.
    await expect(callout(page)).toHaveText(/^Ahora tú: elige un cuerpo abajo/);
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
