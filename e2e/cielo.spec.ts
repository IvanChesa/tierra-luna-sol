import { expect, test } from '@playwright/test';
import { openExplorer, simTime, trackProblems } from './support';

/** La región viva del explorador (lo que se anuncia). */
const live = 'p.visually-hidden[aria-live="polite"]';

test.describe('El cielo desde España (fase 8)', () => {
  test('entra en el Montsec con su tabla; al cambiar de lugar, el cielo, la tabla y la URL cambian', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    // «Cielo», en las vistas del explorador; en el menú del sitio, «Explorar en 3D» (fase 9c).
    await expect(
      page
        .getByRole('navigation', { name: 'Vistas del explorador' })
        .getByRole('link', { name: 'Cielo' }),
    ).toHaveAttribute('aria-current', 'page');
    // (El menú del sitio, en el explorador, está cerrado: el enlace se busca por su clase.)
    await expect(page.locator('#site-menu a.site-nav__explore')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('h1')).toHaveText('El cielo desde España');
    const select = page.getByLabel('Lugar desde el que ves el cielo');
    await expect(select).toHaveValue('montsec');
    const table = page.locator('table.sky__table');
    await expect(table.locator('tbody tr')).toHaveCount(9);
    await expect(table.locator('caption')).toContainText('el Parque Astronómico del Montsec');
    await expect(table.locator('caption')).toContainText('Europe/Madrid, UTC+1');
    // El Sol, bajo el horizonte a las 22:00; Saturno, a la vista.
    await expect(table.getByRole('row', { name: /^Sol/ })).toContainText('Bajo el horizonte');
    await expect(table.getByRole('row', { name: /^Saturno/ })).not.toContainText(
      'Bajo el horizonte',
    );
    await expect(page.locator('canvas')).toHaveAccessibleName(/Vista 3D del cielo/);

    await select.selectOption('teide');
    await expect(page).toHaveURL(/[?&]lugar=teide/);
    await expect(table.locator('caption')).toContainText('el Observatorio del Teide');
    // En Canarias, una hora menos que en la Península: la hora canaria (UTC en invierno).
    await expect(table.locator('caption')).toContainText('Atlantic/Canary, UTC');
    await expect(page.locator(live)).toContainText('El cielo desde el Observatorio del Teide');
    // La URL con el lugar abre el mismo cielo.
    await page.goto('/cielo?fecha=2026-11-01T21:00Z&lugar=teide');
    await expect(page.getByLabel('Lugar desde el que ves el cielo')).toHaveValue('teide', {
      timeout: 90_000,
    });
    expect(problems).toEqual([]);
  });

  test('la hora de la noche: el deslizador cambia la hora del lugar y pausa', async ({ page }) => {
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    const slider = page.getByRole('slider', { name: 'Hora' });
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      /^22:00, hora del lugar \(Europe\/Madrid, UTC\+1\)$/,
    );
    const before = await simTime(page);
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => simTime(page)).toBe(before + 10 * 60_000);
    await expect(slider).toHaveAttribute('aria-valuetext', /^22:10, /);
    await expect(page.locator('.time__play')).toHaveAccessibleName(/Reproducir/);
  });

  test('la hora de la noche: Inicio y Fin llevan a sus extremos sin cambiar de noche', async ({
    page,
  }) => {
    // Revisión de la fase 8, hallazgo 1: en la media hora que sigue a la salida del Sol, el panel saltaba
    // a la noche siguiente y el pulgar volvía a 0.
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    const slider = page.getByRole('slider', { name: 'Hora' });
    const daytime = page.locator('.sky__day');
    const dusk = page.locator('.sky__tonight .sky__text').first();
    const duskText = (await dusk.textContent()) ?? '';
    const max = Number(await slider.getAttribute('max'));
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue(String(max));
    // La salida del Sol del 2-11 en el Montsec (las 07:5x) más media hora, como mucho.
    await expect(slider).toHaveAttribute('aria-valuetext', /^08:\d\d, hora del lugar/);
    await expect(daytime).toHaveCount(0);
    await expect(dusk).toHaveText(duskText);
    const end = await simTime(page);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => simTime(page)).toBe(end - 5 * 60_000);
    await expect(slider).toHaveValue(String(max - 5));
    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('0');
    await expect(daytime).toHaveCount(0);
    await expect(dusk).toHaveText(duskText);
    // De día, antes de la noche del deslizador, se dice (también en el móvil, hallazgo 3), con un
    // botón que lleva a la noche cerrada (crítica de la fase 10), en pausa.
    await openExplorer(page, '/cielo?fecha=2026-11-01T12:00Z');
    await expect(daytime).toBeVisible();
    await expect(daytime.locator('.sky__hint')).toHaveText('Ahora es de día: arrastra la hora o');
    await expect(page.locator('.sky__summary-line [aria-hidden="true"]')).toHaveText(
      /^De día · noche cerrada a las \d\d:\d\d$/,
    );
    const tonight = daytime.getByRole('button', { name: 'Ver el cielo de esta noche' });
    await tonight.click();
    await expect(daytime).toHaveCount(0);
    // El 1-11-2026 en el Montsec, la noche cerrada empieza hacia las 19:10 (UTC+1).
    await expect(slider).toHaveAttribute('aria-valuetext', /^19:\d\d, hora del lugar/);
    await expect(page.getByRole('button', { name: 'Reproducir' }).first()).toBeVisible();
  });

  test('«Mirar» lleva la cámara y lo anuncia; bajo el horizonte, lo dice', async ({ page }) => {
    // En captura: el motor se ve desde el test y los giros son directos.
    await openExplorer(page, '/cielo?captura=1&fecha=2026-11-01T21:00Z');
    const pose = () =>
      page.evaluate(
        () =>
          (
            window.__tlsViewer?.engine as unknown as {
              skyView: { azimuthDeg: number; altitudeDeg: number };
            }
          ).skyView,
      );
    await page.getByRole('button', { name: 'Mirar a Saturno' }).click();
    // A las 22:00 del 1-11-2026, desde el Montsec, Saturno culmina: a 48° hacia el sur.
    await expect(page.locator(live)).toContainText('Saturno, a 48° de altura, hacia el sur.');
    await expect.poll(async () => Math.round((await pose()).altitudeDeg)).toBe(48);
    expect(Math.abs((await pose()).azimuthDeg - 180)).toBeLessThan(22.5);
    await page.getByRole('button', { name: 'Mirar al Sol' }).click();
    await expect(page.locator(live)).toContainText('El Sol está bajo el horizonte.');
  });

  test('«Usar mi ubicación»: sin permiso, sigue el lugar; con él, la ubicación, que no va a la URL', async ({
    browser,
  }) => {
    const denied = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
    const page = await denied.newPage();
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    // «Usar mi ubicación», un botón debajo del selector (revisión de la 9c, hallazgo 5).
    await page.getByRole('button', { name: 'Usar mi ubicación' }).click();
    await expect(page.locator('.sky__note')).toContainText(
      'Sigues viendo el cielo desde el Parque Astronómico del Montsec',
    );
    await expect(page.getByLabel('Lugar desde el que ves el cielo')).toHaveValue('montsec');
    await denied.close();

    const granted = await browser.newContext({
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      permissions: ['geolocation'],
      geolocation: { latitude: 41.39, longitude: 2.17 },
    });
    const other = await granted.newPage();
    await openExplorer(other, '/cielo?fecha=2026-11-01T21:00Z&lugar=teide');
    await other.getByRole('button', { name: 'Usar mi ubicación' }).click();
    await expect(other.getByLabel('Lugar desde el que ves el cielo')).toHaveValue('user');
    await expect(other.locator('.sky__note')).toContainText('No sale de tu navegador');
    await expect(other).not.toHaveURL(/lugar=/);
    await expect(other).not.toHaveURL(/41\.39/);
    await granted.close();
  });

  test('recorrer los lugares con las flechas no pide la ubicación; los nombres caben enteros', async ({
    page,
  }) => {
    // Cada petición de la ubicación, contada (sin pedirla de verdad).
    await page.addInitScript(() => {
      const count = () => {
        const root = document.documentElement;
        root.dataset['geo'] = String(Number(root.dataset['geo'] ?? '0') + 1);
      };
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: { getCurrentPosition: count, watchPosition: count, clearWatch: () => undefined },
      });
    });
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    const select = page.getByLabel('Lugar desde el que ves el cielo');
    await select.focus();
    for (let step = 0; step < 9; step++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    const calls = () => page.evaluate(() => document.documentElement.dataset['geo'] ?? '0');
    expect(await calls()).toBe('0');
    // Las opciones, cortas (sin el tipo de lugar) y enteras en el ancho del selector.
    await expect(select.locator('option')).toHaveText([
      'Montsec (Lleida)',
      'Observatori Fabra (Barcelona)',
      'Roque de los Muchachos (La Palma)',
      'Teide (Tenerife)',
      'Calar Alto (Almería)',
      'Puerta del Sol (Madrid)',
      'Fraga (Huesca)',
    ]);
    // Solo el botón la pide.
    await page.getByRole('button', { name: 'Usar mi ubicación' }).click();
    await expect.poll(calls).toBe('1');
  });

  test('la tecla 4 lleva al cielo y la 1 vuelve al sistema solar, con el mismo motor', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1&fecha=2026-11-01T21:00Z');
    await page.evaluate(() => (window.__e2eEngine = window.__tlsViewer?.engine ?? null));
    await page.locator('body').press('4');
    await expect(page).toHaveURL(/\/cielo/);
    await expect.poll(() => page.evaluate(() => window.__tlsViewer?.engine?.view)).toBe('sky');
    await page.locator('body').press('1');
    await expect.poll(() => page.evaluate(() => window.__tlsViewer?.engine?.view)).toBe('system');
    expect(await page.evaluate(() => window.__tlsViewer?.engine === window.__e2eEngine)).toBe(true);
  });
});

test.describe('El cielo desde España: los rápidos de la crítica de la 9c', () => {
  test('«Esta noche», con su marcador de abierto o cerrado; «Constelaciones», de 24 px de alto', async ({
    page,
  }) => {
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z');
    const summary = page.locator('.sky__summary');
    const marker = () =>
      summary.evaluate((element) => {
        const style = getComputedStyle(element);
        return `${style.display} ${style.listStyleType}`;
      });
    // En escritorio, abierto al entrar; al pulsarlo, se pliega y el marcador lo dice.
    await expect.poll(marker).toBe('list-item disclosure-open');
    const toggle = await page.locator('.sky__toggle').boundingBox();
    expect(toggle?.height ?? 0).toBeGreaterThanOrEqual(24);
    await summary.click();
    await expect.poll(marker).toBe('list-item disclosure-closed');
  });
});

test.describe('Próximos eclipses (fase 8)', () => {
  test('con migas y la medida de lectura del sitio, de unos 68 caracteres (crítica de la 9c)', async ({
    page,
  }) => {
    await page.goto('/eclipses');
    const crumbs = page.getByRole('navigation', { name: 'Migas de pan' });
    await expect(crumbs.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Eclipses');
    // La línea más larga de cada párrafo, en caracteres (letra a letra, por la altura de su caja).
    const longest = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '.eclipses__intro, .eclipses__sources, .eclipse p',
        ),
      ].map((paragraph) => {
        const lines = new Map<number, number>();
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? '';
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect) continue;
            const top = Math.round(rect.top);
            lines.set(top, (lines.get(top) ?? 0) + 1);
          }
        }
        return Math.max(0, ...lines.values());
      }),
    );
    expect(Math.max(...longest)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...longest)).toBeLessThanOrEqual(80);
  });

  test('la lista prerenderizada se lee sin JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto('/eclipses');
    await expect(page.locator('h1')).toHaveText('Próximos eclipses visibles desde España');
    await expect(page.locator('.eclipse').first()).toBeVisible();
    await expect(page.locator('.eclipses__note')).toContainText(
      'Lista calculada el 1 de noviembre de 2026 con astronomy-engine.',
    );
    await context.close();
  });

  test('se recalcula en el navegador, cambia de lugar y «Ver en 3D» lleva a la sombra', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await page.goto('/eclipses');
    await expect(page.locator('.eclipses__note')).toContainText('Calculado en tu navegador', {
      timeout: 30_000,
    });
    await page.getByLabel('Lugar', { exact: true }).selectOption('teide');
    await expect(page).toHaveURL(/lugar=teide/);
    await expect(page.locator('.eclipse').first()).toContainText('Atlantic/Canary');
    const solar = page.locator('.eclipse', { hasText: 'de Sol' }).first();
    const link = solar.getByRole('link', { name: /^Ver en 3D el eclipse/ });
    // El enlace lleva la sombra; el explorador la quita de la URL en cuanto apunta a ella (es de un
    // solo uso), así que se mira en el enlace y no en la URL de llegada, que depende de la velocidad.
    // También el tipo de eclipse y el lugar, para el aviso de la llegada (crítica de diseño de la fase 10).
    await expect(link).toHaveAttribute(
      'href',
      /^\/explorar\/tierra\?fecha=[^&]+&sombra=1&eclipse=sol-[a-z]+&lugar=teide$/,
    );
    await link.click();
    await expect(page).toHaveURL(/\/explorar\/tierra\?fecha=/);
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    await expect(page.locator('canvas')).toHaveAccessibleName(/Vista 3D de la Tierra/);
    // Al llegar, qué eclipse es y desde dónde, y la vuelta a la lista del mismo lugar.
    const notice = page.locator('.notice--eclipse');
    await expect(notice).toContainText(
      /Eclipse \S+ de Sol del .+, en su máximo visto desde el Observatorio del Teide\./,
    );
    await expect(notice.getByRole('link', { name: 'Volver a los eclipses' })).toHaveAttribute(
      'href',
      '/eclipses?lugar=teide',
    );
    expect(problems).toEqual([]);
  });
});
