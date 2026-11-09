import { expect, test, type Page } from '@playwright/test';
import { TAP_MIN_PX, coveredFocus, indexToggle, openExplorer, simTime, treeRow } from './support';

/**
 * Desliza el dedo desde el centro de `selector`, `dy` píxeles (hacia abajo, positivo), a paso de
 * dedo: con los tiempos de cada evento (50 ms entre uno y otro). Sin ellos, Chrome lo toma por un
 * lanzamiento, y el toque siguiente solo lo para (no llega a ser un clic).
 */
async function swipe(page: Page, selector: string, dy: number): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Sin ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const start = Date.now() / 1000;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
    timestamp: start,
  });
  for (let step = 1; step <= 4; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + (dy * step) / 4 }],
      timestamp: start + step * 0.05,
    });
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    timestamp: start + 0.3,
  });
  await cdp.detach();
}

// Proyecto «movil» (Pixel 7, táctil): las hojas inferiores (índice y ficha) y el menú del sitio.
test.describe('Móvil', () => {
  test('el índice sube como hoja; al elegir, se cierra y arriba sale la franja del cuerpo; «ⓘ» abre su ficha (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await indexToggle(page).tap();
    const sheet = page.getByRole('region', { name: 'Índice' });
    await expect(sheet).toBeVisible();
    // Con una hoja abierta, el texto de la vista se recoge a la vista (el H1 sigue para el lector).
    const intro = page.locator('.explorer__intro');
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
    await treeRow(page, 'marte').tap();
    await expect(sheet).toBeHidden();
    // Elegir no abre la ficha: arriba, la franja con «‹ Sistema solar», el nombre y «ⓘ».
    const panel = page.locator('.panel');
    await expect(panel).toBeHidden();
    await expect(page.locator('.site-focus__name')).toHaveText('Marte');
    // El título sigue al cuerpo elegido (fase 9c, decisión 2 de Iván).
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marte');
    const info = page.getByRole('button', { name: 'Ver la ficha de Marte' });
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await info.tap();
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    await expect(panel).toBeHidden();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Volver al sistema solar' }).tap();
    await expect(page.locator('.site-focus')).toHaveCount(0);
    // Vuelve el H1 (la descripción ya se ha plegado al usar el explorador).
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeGreaterThan(20);
  });

  test('Venus «Bajo las nubes» (fase 9b, D44): en la ficha en reposo, el botón y, al tocarlo, su aviso a la vista', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&cuerpo=venus');
    await page.getByRole('button', { name: 'Ver la ficha de Venus' }).tap();
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Venus');
    const button = panel.getByRole('button', { name: 'Bajo las nubes' });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    // Su zona táctil, de al menos 44 px de alto.
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(TAP_MIN_PX);
    await button.tap();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const note = panel.locator('#card-radar-note');
    await expect(note).toHaveText(
      'Imagen de radar de la sonda Magellan, con el color de las fotos de las Venera 13 y 14: no es lo que verían tus ojos.',
    );
    await expect(note).toBeInViewport();
    // Al cerrar la ficha (y con ella el aviso), vuelven las nubes.
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    await page.getByRole('button', { name: 'Ver la ficha de Venus' }).tap();
    await expect(panel.getByRole('button', { name: 'Bajo las nubes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('con el teclado: «ⓘ» abre la ficha con el foco en su contenido; nada tapado; Esc la cierra y el foco vuelve a «ⓘ» (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Elegir en el índice con el teclado: el índice se cierra y la ficha no se abre.
    await indexToggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tree-sol')).toBeFocused();
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tree-marte')).toBeFocused();
    await page.keyboard.press('Enter');
    const panel = page.locator('.panel');
    await expect(page.locator('.site-focus__name')).toHaveText('Marte');
    await expect(panel).toBeHidden();
    const info = page.getByRole('button', { name: 'Ver la ficha de Marte' });
    await info.focus();
    await page.keyboard.press('Enter');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(page.locator('#card-body')).toBeFocused();
    expect(await coveredFocus(page)).toBeNull();
    // Por la hoja (su ×, «Ficha completa»), nada tapado.
    for (let k = 0; k < 2; k++) {
      await page.keyboard.press('Tab');
      expect(await coveredFocus(page)).toBeNull();
    }
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(info).toBeFocused();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
  });

  test('al abrirse la ficha, aunque su animación no avance (un móvil lento), la barra se puede pulsar', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Las animaciones, congeladas en su principio: como en el CI, con SwiftShader y casi sin
    // fotogramas, donde la hoja (2 rem más abajo al entrar, aún transparente) tapaba reproducir.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    await page
      .getByRole('toolbar', { name: 'Sol y planetas' })
      .getByRole('button', { name: 'Marte', exact: true })
      .tap();
    await page.getByRole('button', { name: 'Ver la ficha de Marte' }).tap();
    await expect(page.locator('.panel #card-title')).toHaveText('Marte');
    for (const name of ['Reproducir', 'Controles', 'Ficha completa de Marte']) {
      const control = page.getByRole(name.startsWith('Ficha') ? 'link' : 'button', {
        name,
        exact: true,
      });
      const covered = await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return hit === null || !element.contains(hit);
      });
      expect(covered, name).toBe(false);
    }
  });

  test('durante un viaje, «Saltar el viaje» queda encima de lo que tapa el lienzo por abajo', async ({
    page,
  }) => {
    // Sin captura: el viaje de la vista de la Tierra al sistema solar es animado.
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    // En la vista Tierra no hay fichas ni botón «Índice» (fase 9c); el índice se abre con su atajo.
    await page.keyboard.press('i');
    await treeRow(page, 'saturno').tap();
    await expect(page.getByRole('button', { name: /Saltar el viaje/ })).toBeVisible();
    // «Saltar el viaje» se coloca encima de la parte visible del lienzo (`--view-bottom`). El viaje
    // (unos 3 s) puede acabar antes de medir: si el botón sigue, su sitio.
    const gap = await page.evaluate(() => {
      const explorer = document.querySelector('.explorer') as HTMLElement;
      const viewBottom = parseFloat(getComputedStyle(explorer).getPropertyValue('--view-bottom'));
      const skip = document.querySelector('.skip')?.getBoundingClientRect();
      return skip ? explorer.getBoundingClientRect().bottom - viewBottom - skip.bottom : null;
    });
    if (gap !== null) expect(gap).toBeGreaterThanOrEqual(-1);
  });

  test('al entrar en la vista Tierra desde el sistema solar, el encuadre acaba encima de su panel', async ({
    page,
  }) => {
    // El panel de la Tierra aparece al entrar en su vista: los márgenes del encuadre tienen que
    // medirlo también entonces, no solo los paneles que había al arrancar (revisión de la fase 5).
    await openExplorer(page, '/?captura=1');
    await page
      .getByRole('navigation', { name: 'Vistas del explorador' })
      .getByRole('link', { name: 'Tierra' })
      .tap();
    await expect(page.locator('tls-earth-panel')).toBeVisible();
    const overlap = () =>
      page.evaluate(() => {
        const explorer = document.querySelector('.explorer') as HTMLElement;
        const viewBottom = parseFloat(getComputedStyle(explorer).getPropertyValue('--view-bottom'));
        const panel = document.querySelector('tls-earth-panel')?.getBoundingClientRect();
        return panel ? explorer.getBoundingClientRect().bottom - viewBottom - panel.top : null;
      });
    await expect.poll(overlap).toBeLessThanOrEqual(1);
  });

  test('las fichas: una fila que se desplaza, con zonas táctiles de al menos 44 px', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const row = page.getByRole('toolbar', { name: 'Sol y planetas' });
    const sizes = await row.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return [box.width, box.height] as const;
      }),
    );
    expect(sizes).toHaveLength(9);
    for (const [width, height] of sizes) {
      expect(width).toBeGreaterThanOrEqual(TAP_MIN_PX);
      expect(height).toBeGreaterThanOrEqual(TAP_MIN_PX);
    }
    // No caben todas: la fila se desplaza (la página, no).
    expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await row.getByRole('button', { name: 'Neptuno', exact: true }).tap();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // Elegir no abre la ficha (decisión del 08-11): la fila pasa a ser la de su sistema, Neptuno y sus
    // lunas, con las mismas zonas táctiles.
    await expect(page.locator('.panel')).toBeHidden();
    const moons = page.getByRole('toolbar', { name: 'Neptuno y sus lunas' });
    await expect(moons.getByRole('button')).toHaveCount(3);
    // El planeta, redondo; una raya; y sus lunas, en pastillas (decisión de Iván del 07-11).
    await expect(moons.locator('.row__divider')).toHaveCount(1);
    await expect(moons.locator('button.chip')).toHaveText(['Neptuno']);
    await expect(moons.locator('button.moon')).toHaveText(['Tritón', 'Proteo']);
    for (const height of await moons
      .getByRole('button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(TAP_MIN_PX);
    }
  });

  test('al elegir un planeta, la fila de su sistema y ninguna ficha, con el 3D al menos en el 70 %; la ficha, con «ⓘ» (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&cuerpo=saturno');
    const panel = page.locator('.panel');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('toolbar', { name: 'Saturno y sus lunas' })).toBeVisible();
    const info = page.getByRole('button', { name: 'Ver la ficha de Saturno' });
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(info).toHaveAttribute('aria-controls', 'ficha');
    // El hueco libre del encuadre (lo que no tapan la franja de arriba, la fila y la barra), ≥ 70 %.
    const free = () =>
      page.evaluate(() => {
        const explorer = document.querySelector('.explorer') as HTMLElement;
        const style = getComputedStyle(explorer);
        const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
        const box = explorer.getBoundingClientRect();
        return (box.bottom - px('--view-bottom') - (box.top + px('--view-top'))) / innerHeight;
      });
    await expect.poll(free).toBeGreaterThanOrEqual(0.7);
    // «ⓘ»: la ficha, a media pantalla como mucho, con el foco en su contenido; la pausa, a mano.
    await info.tap();
    await expect(panel.locator('#card-title')).toHaveText('Saturno');
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#card-body')).toBeFocused();
    expect(
      await panel.evaluate((element) => element.getBoundingClientRect().height / innerHeight),
    ).toBeLessThanOrEqual(0.5);
    await page.getByRole('button', { name: 'Ver los datos' }).tap();
    await expect(panel.locator('#card-rest')).toBeVisible();
    // Deslizar el tirador hacia abajo (con el dedo): los datos se recogen y, otra vez, se cierra.
    await swipe(page, '.panel__grip', 140);
    await expect(panel.locator('#card-rest')).toBeHidden();
    await swipe(page, '.panel__grip', 140);
    await expect(panel).toBeHidden();
    await page.locator('.time__play').tap();
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await page.locator('.time__play').tap();
  });

  test('del planeta a sus lunas y de vuelta, con el toque: planeta, luna, luna y «‹ Sistema solar» (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const planets = page.getByRole('toolbar', { name: 'Sol y planetas' });
    await planets.getByRole('button', { name: 'Saturno', exact: true }).tap();
    const system = page.getByRole('toolbar', { name: 'Saturno y sus lunas' });
    await expect(system).toBeVisible();
    for (const name of ['Mimas', 'Encélado']) {
      const moon = system.getByRole('button', { name, exact: true });
      await moon.tap();
      await expect(moon).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.site-focus__name')).toHaveText(name);
      // Con una luna elegida, la fila sigue siendo la de su sistema; sin ficha.
      await expect(system).toBeVisible();
      await expect(page.locator('.panel')).toBeHidden();
    }
    await page.getByRole('button', { name: 'Volver al sistema solar' }).tap();
    await expect(planets).toBeVisible();
    await expect(page.locator('.site-focus')).toHaveCount(0);
  });

  test('del planeta a sus lunas y de vuelta, con el teclado: las flechas, Intro y «‹ Sistema solar» (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const planets = page.getByRole('toolbar', { name: 'Sol y planetas' });
    // Una parada por fila: del Sol, con las flechas, a Saturno.
    await planets.getByRole('button', { name: 'Sol', exact: true }).focus();
    for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowRight');
    const saturn = page.locator('button.chip[data-body="saturno"]');
    await expect(saturn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('toolbar', { name: 'Saturno y sus lunas' })).toBeVisible();
    // El foco sigue en Saturno, ya en la fila de su sistema; a su derecha, sus lunas.
    await expect(saturn).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const mimas = page.locator('button.moon[data-body="mimas"]');
    await expect(mimas).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(mimas).toHaveAttribute('aria-pressed', 'true');
    await expect(mimas).toBeFocused();
    await page.keyboard.press('ArrowRight');
    const enceladus = page.locator('button.moon[data-body="encelado"]');
    await expect(enceladus).toBeFocused();
    await page.keyboard.press('Space');
    await expect(enceladus).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.panel')).toBeHidden();
    // «‹ Sistema solar», en la franja de arriba: los planetas otra vez, con el foco en Saturno.
    await page.getByRole('button', { name: 'Volver al sistema solar' }).focus();
    await page.keyboard.press('Enter');
    await expect(planets).toBeVisible();
    await expect(planets.locator('button.chip[data-body="saturno"]')).toBeFocused();
  });

  test('con un cuerpo elegido, arriba, una sola franja: «‹ Sistema solar», su nombre, «ⓘ» y «Menú» (decisión del 08-11)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const tabs = page.locator('tls-view-switcher');
    await expect(tabs).toBeVisible();
    await page
      .getByRole('toolbar', { name: 'Sol y planetas' })
      .getByRole('button', { name: 'Saturno', exact: true })
      .tap();
    await expect(page.locator('.site-focus__name')).toHaveText('Saturno');
    await expect(page.getByRole('button', { name: 'Ver la ficha de Saturno' })).toBeVisible();
    await expect(tabs).toBeHidden();
    await expect(page.locator('.site-name')).toBeHidden();
    const header = await page.locator('.site-header').boundingBox();
    expect(header?.height ?? 0).toBeLessThanOrEqual(49);
    // El H1 sigue, para el lector.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saturno');
    // El menú, a mano.
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await page.getByRole('button', { name: 'Menú' }).tap();
    await expect(menu).toBeVisible();
    await page.getByRole('button', { name: 'Menú' }).tap();
    await expect(menu).toBeHidden();
    // «‹ Sistema solar», a la vista general: vuelven la cabecera y las pestañas.
    await page.getByRole('button', { name: 'Volver al sistema solar' }).tap();
    await expect(page.locator('.site-focus')).toHaveCount(0);
    await expect(tabs).toBeVisible();
    await expect(page.locator('.site-name')).toBeVisible();
  });

  test('la línea de tiempo responde al tacto', async ({ page }) => {
    await openExplorer(page, '/?fecha=2031-03-15T13:00Z');
    const line = page.getByRole('slider', { name: 'Línea de tiempo' });
    const box = await line.boundingBox();
    if (!box) throw new Error('Sin línea de tiempo');
    // Un toque hacia el final de la pista: el último trimestre de 2031.
    await page.touchscreen.tap(box.x + box.width * 0.9, box.y + box.height / 2);
    await expect.poll(async () => new Date(await simTime(page)).getUTCMonth()).toBeGreaterThan(8);
    await expect(line).toHaveAttribute('aria-valuetext', /de 2031$/);
  });

  test('«Controles +» sube como hoja con la fecha, la velocidad y los ajustes', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    const more = page.getByRole('button', { name: 'Controles', exact: true });
    await expect(page.locator('#time-date')).toBeHidden();
    // En móvil, la velocidad no está en la barra (no cabe): está en el panel.
    await expect(page.locator('#time-speed')).toBeHidden();
    await more.tap();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#time-date')).toBeVisible();
    await expect(page.locator('#time-speed-menu')).toBeVisible();
    await page.locator('#time-speed-menu').selectOption('day');
    await expect(page.locator('.time__speedtext')).toContainText('1 día por segundo');
    // Ocupa el ancho de abajo, por encima de todo, y se cierra al pulsar fuera (por encima de la hoja).
    const box = await page.locator('#time-menu').boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport && Math.round(box.x + box.width)).toBe(viewport?.width);
    // Una hoja baja, como mucho el 45 % de la pantalla (crítica de la 9c): el 3D se ve mientras se usa,
    // y cuenta en el encuadre (el margen de abajo crece hasta su borde).
    expect((box?.height ?? 0) / (viewport?.height ?? 1)).toBeLessThanOrEqual(0.45);
    // El margen de abajo, menos lo que la hoja deja por encima del borde de abajo del explorador.
    const uncovered = () =>
      page.evaluate(() => {
        const explorer = document.querySelector('.explorer') as HTMLElement;
        const menu = document.querySelector('#time-menu') as HTMLElement;
        const inset = parseFloat(getComputedStyle(explorer).getPropertyValue('--view-bottom'));
        return explorer.getBoundingClientRect().bottom - menu.getBoundingClientRect().top - inset;
      });
    await expect.poll(uncovered).toBeLessThanOrEqual(1);
    await page.mouse.click(20, (box?.y ?? 200) - 20);
    await expect(page.locator('#time-date')).toBeHidden();
    // Su botón de cerrar (la hoja tapa el de «Controles»): el foco vuelve a «Controles».
    await more.tap();
    await page.getByRole('button', { name: 'Cerrar los controles' }).tap();
    await expect(page.locator('#time-date')).toBeHidden();
    await expect(more).toBeFocused();
    // Con el teclado, el foco nunca se para en lo que tapa la hoja (la barra, las fichas).
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#time-menu')).toBeFocused();
    for (let k = 0; k < 8; k++) {
      await page.keyboard.press('Shift+Tab');
      expect(await coveredFocus(page)).toBeNull();
    }
  });

  test('el menú del sitio se abre y se cierra al navegar', async ({ page }) => {
    await openExplorer(page, '/?captura=1');
    await page.getByRole('button', { name: 'Menú' }).tap();
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await expect(menu).toBeVisible();
    // Las páginas de lectura y «Explorar en 3D»; el cielo, en las pestañas del explorador (fase 9c).
    await expect(menu.locator('ul:not(.site-nav__legal) > li > a')).toHaveText([
      'Planetas',
      'Lunas',
      'Sol',
      'Eclipses',
      'Sobre el proyecto',
      'Explorar en 3D',
    ]);
    // Lo legal, aparte y abajo (fase 9c).
    await expect(menu.locator('ul.site-nav__legal a')).toHaveText([
      'Créditos',
      'Aviso legal',
      'Política de privacidad',
    ]);
    // El explorador no tiene pie del sitio: la nota de privacidad y los enlaces legales, aquí (fase 9).
    await expect(menu).toContainText('Sin cookies, sin analítica y sin peticiones a terceros');
    await expect(menu.getByRole('link', { name: 'Aviso legal' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Política de privacidad' })).toBeVisible();
    await menu.getByRole('link', { name: 'Créditos' }).tap();
    await expect(page).toHaveURL(/\/creditos$/);
    await expect(menu).toBeHidden();
  });

  // WCAG 1.4.4 y 1.4.10: en horizontal (o con el zoom al 200 %), el menú cabe en la pantalla y se
  // desplaza por dentro hasta lo último, la nota de privacidad (fase 9, segunda ronda, hallazgo 22).
  test('en horizontal, el menú cabe en la pantalla y se desplaza hasta la nota de privacidad', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 915, height: 412 });
    await openExplorer(page, '/?captura=1');
    await page.getByRole('button', { name: 'Menú' }).tap();
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect((box?.y ?? 0) + (box?.height ?? Infinity)).toBeLessThanOrEqual(412);
    // Sin desplazarse por dentro, lo último quedaba debajo del borde de la pantalla.
    for (const name of ['Aviso legal', 'Política de privacidad', 'tu privacidad']) {
      const link = menu.getByRole('link', { name, exact: true });
      await link.scrollIntoViewIfNeeded();
      await expect(link, name).toBeInViewport();
    }
    const privacy = menu.getByRole('link', { name: 'tu privacidad', exact: true });
    await privacy.tap();
    await expect(page).toHaveURL(/\/sobre-el-proyecto#privacidad$/);
    await expect(menu).toBeHidden();
  });

  // WCAG 1.4.10: a 320 px de ancho, nada obliga a desplazarse en horizontal (revisión de la fase 8,
  // hallazgo 2: el selector de /eclipses ensanchaba la página hasta 625 px).
  for (const path of [
    '/eclipses',
    '/creditos',
    '/sobre-el-proyecto',
    '/planetas',
    '/lunas',
    '/planetas/saturno',
    '/sol',
  ]) {
    test(`${path}: a 320 px de ancho, sin desplazamiento horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      if (path === '/eclipses') {
        await expect(page.locator('.eclipses__note')).toContainText('Calculado en tu navegador', {
          timeout: 30_000,
        });
      }
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(widths).toEqual({ page: 320, viewport: 320 });
    });
  }
});

// Crítica de la 9c (P1): con un cuerpo elegido, ninguna parada del tabulador cae en algo que no se ve.
// Desde la decisión de Iván del 08-11, «‹ Sistema solar» va en la franja de arriba, y lo recogido de la
// presentación (la autoría) sale del orden del foco.
for (const [width, height] of [
  [390, 844],
  [768, 1024],
] as const) {
  test.describe(`A ${width} px`, () => {
    test.use({ viewport: { width, height } });

    test('con un cuerpo elegido, el tabulador no se para en nada que no se vea', async ({
      page,
    }) => {
      await openExplorer(page, '/?captura=1&cuerpo=saturno');
      // En el móvil, el cuerpo de la URL se elige sin abrir su ficha (decisión del 08-11): la franja.
      await expect(page.locator('.site-focus__name')).toHaveText('Saturno');
      const visited: string[] = [];
      // Desde el principio de la página hasta el lienzo: la cabecera, las pestañas y la presentación.
      for (let k = 0; k < 15; k++) {
        await page.keyboard.press('Tab');
        const name = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          if (!element || element.tagName === 'CANVAS') return null;
          return (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
        });
        if (name === null) break;
        visited.push(name);
        expect(await coveredFocus(page), name).toBeNull();
      }
      // Arriba, la franja del cuerpo elegido (decisión del 08-11): «‹ Sistema solar» y «Menú»; las
      // pestañas y la autoría, fuera (ni se ven ni se alcanzan).
      expect(visited).toContain('Volver al sistema solar');
      expect(visited).toContain('Ver la ficha de Saturno');
      expect(visited).toContain('Menú');
      expect(visited).not.toContain('Cómo se calcula');
    });
  });
}

// Decisión de Iván del 08-11: el cielo del móvil, «muy invasor». En reposo, arriba una sola franja y abajo
// su barra, en la fila de la barra de tiempo; el panel entero, a demanda. Y sin franjas vacías.
for (const [width, height] of [
  [390, 844],
  [390, 660],
] as const) {
  test.describe(`El cielo a ${width} × ${height}`, () => {
    test.use({ viewport: { width, height } });

    test('en reposo, el cielo ocupa al menos el 80 % y no queda ninguna franja vacía; la barra abre el panel y Esc lo cierra', async ({
      page,
    }) => {
      await openExplorer(page, '/cielo?captura=1');
      const bar = page.locator('tls-sky-bar .bar');
      await expect(bar).toHaveAttribute('aria-expanded', 'false');
      await expect(bar).toContainText('Montsec (Lleida)');
      await expect(page.locator('.site-focus__place')).toHaveText('Montsec (Lleida)');
      await expect(page.locator('tls-view-switcher')).toBeHidden();
      await expect(page.locator('#sky-place')).toBeHidden();
      const layout = () =>
        page.evaluate(() => {
          const explorer = document.querySelector('.explorer') as HTMLElement;
          const style = getComputedStyle(explorer);
          const px = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
          const box = explorer.getBoundingClientRect();
          const rect = (selector: string) =>
            (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
          const play = rect('.time__play');
          const more = rect('.time__more');
          const sky = rect('tls-sky-bar .bar');
          return {
            sky: (box.bottom - px('--view-bottom') - (box.top + px('--view-top'))) / innerHeight,
            // Sin franja vacía: el explorador llega abajo del todo y la página no se desplaza.
            bottomGap: innerHeight - box.bottom,
            scrolls: document.documentElement.scrollHeight > innerHeight + 1,
            // La barra del cielo, en la fila de la barra de tiempo, entre reproducir y «Controles».
            inRow:
              sky.left >= play.right &&
              sky.right <= more.left &&
              sky.top >= play.top - 12 &&
              sky.bottom <= play.bottom + 12,
          };
        });
      await expect.poll(async () => (await layout()).sky).toBeGreaterThanOrEqual(0.8);
      const rest = await layout();
      expect(rest.bottomGap).toBeLessThanOrEqual(1);
      expect(rest.scrolls).toBe(false);
      expect(rest.inRow).toBe(true);
      // Un toque: el panel entero (el lugar, la hora, «Esta noche»), de media pantalla como mucho;
      // el foco, en su contenido.
      await bar.tap();
      await expect(bar).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#sky-place')).toBeVisible();
      await expect(page.locator('#sky-tonight')).toBeVisible();
      await expect(page.locator('#sky-now')).toBeFocused();
      const panel = await page.locator('tls-sky-panel').boundingBox();
      expect((panel?.height ?? 0) / height).toBeLessThanOrEqual(0.51);
      // Esc lo cierra y el foco vuelve a la barra; con el teclado, Intro lo abre otra vez.
      await page.keyboard.press('Escape');
      await expect(bar).toHaveAttribute('aria-expanded', 'false');
      await expect(bar).toBeFocused();
      await expect(page.locator('#sky-place')).toBeHidden();
      await page.keyboard.press('Enter');
      await expect(bar).toHaveAttribute('aria-expanded', 'true');
    });
  });
}
