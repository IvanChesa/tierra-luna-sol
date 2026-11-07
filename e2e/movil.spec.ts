import { expect, test } from '@playwright/test';
import { coveredFocus, indexToggle, openExplorer, simTime, treeRow } from './support';

// Proyecto «movil» (Pixel 7, táctil): las hojas inferiores (índice y ficha) y el menú del sitio.
test.describe('Móvil', () => {
  test('el índice sube como hoja; al elegir, la ficha sube en su lugar y se cierra', async ({
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
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(sheet).toBeHidden();
    // El título sigue al cuerpo elegido (fase 9c, decisión 2 de Iván).
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marte');
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    await expect(panel).toBeHidden();
    // Vuelve el H1 (la descripción ya se ha plegado al usar el explorador).
    await expect.poll(async () => (await intro.boundingBox())?.height ?? 0).toBeGreaterThan(20);
  });

  test('con la ficha abierta, el foco va a la ficha y no pasa por lo que tapa la hoja', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // Con el teclado (o un lector de pantalla): abrir el índice y elegir lleva el foco a la ficha.
    await indexToggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tree-sol')).toBeFocused();
    for (let k = 0; k < 4; k++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tree-marte')).toBeFocused();
    await page.keyboard.press('Enter');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Marte');
    await expect(panel).toBeFocused();
    // El tabulador no se para en nada tapado (el botón «Índice», la barra de tiempo, la cámara).
    for (let k = 0; k < 6; k++) {
      await page.keyboard.press('Tab');
      expect(await coveredFocus(page)).toBeNull();
    }
    // La barra de tiempo sigue a la vista bajo la hoja (fase 9c): el tabulador ha salido de la ficha a
    // ella. Al cerrarla desde dentro, el foco vuelve a lo último que lo tuvo fuera de la hoja.
    const outside = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element.closest('.panel')) return false;
      element.dataset['e2eLast'] = '';
      return true;
    });
    expect(outside).toBe(true);
    await panel.getByRole('button', { name: 'Cerrar la ficha' }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('[data-e2e-last]')).toBeFocused();
  });

  test('durante un viaje con la ficha abierta, «Saltar el viaje» queda encima de la ficha', async ({
    page,
  }) => {
    // Sin captura: el viaje de la vista de la Tierra al sistema solar es animado.
    await openExplorer(page, '/explorar/tierra?fecha=2030-06-01T12:00Z');
    // En la vista Tierra no hay fichas ni botón «Índice» (fase 9c); el índice se abre con su atajo.
    await page.keyboard.press('i');
    await treeRow(page, 'saturno').tap();
    await expect(page.getByRole('button', { name: /Saltar el viaje/ })).toBeVisible();
    await expect(page.locator('#card-title')).toHaveText('Saturno');
    // «Saltar el viaje» se coloca encima de la parte visible del lienzo (`--view-bottom`), que acaba
    // donde empieza la hoja de la ficha. Con varios SwiftShader en paralelo, el viaje (unos 3 s)
    // puede acabar antes de que llegue la ficha: se comprueba la regla y, si el botón sigue, su sitio.
    const geometry = () =>
      page.evaluate(() => {
        const explorer = document.querySelector('.explorer') as HTMLElement;
        const viewBottom = parseFloat(getComputedStyle(explorer).getPropertyValue('--view-bottom'));
        const panel = document.querySelector('.panel:not([hidden])')?.getBoundingClientRect();
        const skip = document.querySelector('.skip')?.getBoundingClientRect();
        return {
          overlap: panel ? explorer.getBoundingClientRect().bottom - viewBottom - panel.top : null,
          skipGap: skip && panel ? panel.top - skip.bottom : null,
        };
      });
    await expect.poll(async () => (await geometry()).overlap).toBeLessThanOrEqual(1);
    const { skipGap } = await geometry();
    if (skipGap !== null) expect(skipGap).toBeGreaterThanOrEqual(0);
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
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }
    // No caben todas: la fila se desplaza (la página, no).
    expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await row.getByRole('button', { name: 'Neptuno', exact: true }).tap();
    await expect(page.locator('#card-title')).toHaveText('Neptuno');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // La fila pasa a ser la de su sistema (fase 9c): Neptuno y sus lunas, con las mismas zonas táctiles.
    await page.getByRole('button', { name: 'Cerrar la ficha' }).tap();
    const moons = page.getByRole('toolbar', { name: 'Neptuno y sus lunas' });
    await expect(moons.getByRole('button')).toHaveCount(3);
    for (const height of await moons
      .getByRole('button')
      .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });

  test('la ficha, en reposo: como mucho el 45 % de la pantalla, el cuerpo en el hueco libre y la pausa a mano (fase 9c)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&cuerpo=saturno');
    const panel = page.locator('.panel');
    await expect(panel.locator('#card-title')).toHaveText('Saturno');
    const geometry = () =>
      page.evaluate(() => {
        const explorer = document.querySelector('.explorer') as HTMLElement;
        const sheet = (document.querySelector('.panel') as HTMLElement).getBoundingClientRect();
        const play = (document.querySelector('.time__play') as HTMLElement).getBoundingClientRect();
        const hit = document.elementFromPoint(
          play.left + play.width / 2,
          play.top + play.height / 2,
        );
        const viewBottom = parseFloat(getComputedStyle(explorer).getPropertyValue('--view-bottom'));
        return {
          share: sheet.height / innerHeight,
          // El encuadre sabe la altura de la hoja: el 3D se encuadra por encima de ella.
          framedAbove: explorer.getBoundingClientRect().bottom - viewBottom <= sheet.top + 1,
          playReachable: hit !== null && hit.closest('.time__play') !== null,
          playBelowSheet: play.top >= sheet.bottom - 1,
        };
      });
    await expect.poll(async () => (await geometry()).framedAbove).toBe(true);
    const { share, playReachable, playBelowSheet } = await geometry();
    expect(share).toBeLessThanOrEqual(0.45);
    expect(playReachable).toBe(true);
    expect(playBelowSheet).toBe(true);
    // Subida («Ver los datos»), los datos; la pausa sigue a mano.
    await page.getByRole('button', { name: 'Ver los datos' }).tap();
    await expect(panel.locator('#card-rest')).toBeVisible();
    expect((await geometry()).playReachable).toBe(true);
    await page.locator('.time__play').tap();
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Pausar/);
    await page.locator('.time__play').tap();
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
    // Deja a la vista, arriba, la cabecera y algo del 3D (fase 9c: ya no ocupa la pantalla entera).
    expect(box?.y ?? 0).toBeGreaterThan(100);
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
