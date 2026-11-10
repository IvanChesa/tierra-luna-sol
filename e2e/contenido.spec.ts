import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openExplorer, trackProblems } from './support';

/** Las rutas prerenderizadas del build. */
const ROUTES = Object.keys(
  (
    JSON.parse(readFileSync('dist/tierra-luna-sol/prerendered-routes.json', 'utf8')) as {
      routes: Record<string, unknown>;
    }
  ).routes,
);

const meta = (page: Page, selector: string) =>
  page.locator(`head meta[${selector}]`).getAttribute('content');

test.describe('Fichas de los cuerpos (fase 9)', () => {
  test('al final, la ficha anterior y la siguiente; los datos técnicos, después de lo esencial (fase 9c)', async ({
    page,
  }) => {
    await page.goto('/planetas/marte');
    const pager = page.getByRole('navigation', { name: 'Otras fichas' });
    // En el orden del atlas: la Tierra, la Luna, Marte, Fobos…
    await expect(pager.getByRole('link', { name: 'Anterior: Luna' })).toHaveAttribute(
      'href',
      '/luna',
    );
    await expect(pager.getByRole('link', { name: 'Siguiente: Fobos' })).toHaveAttribute(
      'href',
      '/lunas/fobos',
    );
    const physical = page.locator('table.facts').first();
    const headers = await physical.locator('tbody th').allTextContents();
    const technical = headers.findIndex((text) => text.trim() === 'Datos técnicos');
    expect(technical).toBeGreaterThan(0);
    // Lo esencial (el radio) antes; lo técnico (la densidad), después de su rótulo.
    expect(headers.findIndex((text) => text.includes('Radio'))).toBeLessThan(technical);
    expect(headers.findIndex((text) => text.includes('Densidad'))).toBeGreaterThan(technical);
    await pager.getByRole('link', { name: 'Siguiente: Fobos' }).click();
    await expect(page).toHaveURL(/\/lunas\/fobos$/);
    await expect(page.locator('h1')).toHaveText('Fobos');
  });

  test('la ficha de Marte: datos con su fuente, «Hoy» calculado en el navegador y «Ver en 3D»', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await page.goto('/planetas/marte?captura=1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marte');
    const crumbs = page.getByRole('navigation', { name: 'Migas de pan' });
    await expect(crumbs.getByRole('link')).toHaveText(['Inicio', 'Planetas']);
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Marte');
    // Cada fila de datos enlaza a su fuente, que está en la lista del final de la misma página (con
    // la ruta delante: con <base href="/">, un «#fuente-1» suelto llevaría a la portada).
    const refs = page.locator('table.facts td.facts__ref a');
    expect(await refs.count()).toBeGreaterThan(15);
    for (const href of await refs.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href') ?? ''),
    )) {
      expect(href).toMatch(/^\/planetas\/marte#fuente-\d+$/);
      await expect(page.locator(href.slice(href.indexOf('#')))).toHaveCount(1);
    }
    // La masa, en notación científica, con su lectura para el lector de pantalla.
    await expect(page.locator('td.facts__value .visually-hidden').first()).toHaveText(
      /^\d,\d+ por 10 elevado a \d+ kilogramos$/,
    );
    // «Hoy»: las cifras llegan después de pintar, sin moverse nada.
    await expect(page.locator('.today__value').first()).toHaveText(/^\d,\d\d\u00a0UA$/);
    await expect(page.locator('.today__note')).toHaveText(/^Calculado en tu navegador el /);
    const view = page.getByRole('link', { name: 'Ver en 3D' });
    await expect(view).toHaveAttribute('href', '/?cuerpo=marte');
    await view.click();
    await expect(page).toHaveURL(/\/\?cuerpo=marte$/);
    await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
    await expect(page.locator('#card-title')).toHaveText('Marte');
    expect(problems).toEqual([]);
  });

  test('las notas de las tablas y «Saltar al contenido» se quedan en la página (con <base href="/">)', async ({
    page,
  }) => {
    // Cada valor que toma el enlace del salto desde el HTML prerenderizado: al hidratar, tampoco
    // apunta a la portada mientras llega la primera navegación (segunda ronda, hallazgo 21).
    await page.addInitScript(() => {
      const seen: string[] = [];
      window.__e2eSkipHrefs = seen;
      new MutationObserver((records) => {
        for (const record of records) {
          if ((record.target as Element).matches('a.skip-link')) seen.push(record.oldValue ?? '');
        }
      }).observe(document, { subtree: true, attributeFilter: ['href'], attributeOldValue: true });
    });
    await page.goto('/planetas/marte');
    // La nota 1 baja a su fuente, en la misma ficha (no a la portada: revisión, hallazgo 1).
    await page.locator('table.facts td.facts__ref a').first().click();
    await expect(page).toHaveURL(/\/planetas\/marte#fuente-1$/);
    await expect(page.locator('h1')).toHaveText('Marte');
    await expect(page.locator('#fuente-1')).toBeInViewport();
    // «Saltar al contenido», lo primero con el teclado.
    await page.goto('/planetas/marte');
    // «Hoy» llega después de hidratar la ficha, ya acabada la primera navegación.
    await expect(page.locator('.today__value').first()).toHaveText(/UA$/);
    const hrefs = await page.evaluate(() => [
      ...(window.__e2eSkipHrefs ?? []),
      document.querySelector('a.skip-link')?.getAttribute('href') ?? '',
    ]);
    expect([...new Set(hrefs)]).toEqual(['/planetas/marte#contenido']);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '/planetas/marte#contenido');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/planetas\/marte#contenido$/);
    await expect(page.locator('h1')).toHaveText('Marte');
  });

  test('«Saltar al contenido» conserva la consulta: el mismo documento y el mismo lugar', async ({
    page,
  }) => {
    // Sin la consulta, el salto cargaría otro documento: el lugar volvería al Montsec y el
    // explorador, a su estado de entrada (segunda ronda de la revisión, hallazgo 21).
    test.setTimeout(180_000); // Una página y el explorador, con SwiftShader.
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await page.goto('/eclipses?lugar=teide');
    // El lugar de la consulta lo aplica el navegador: la página ya está hidratada.
    await expect(page.locator('#eclipses-place')).toHaveValue('teide');
    await page.evaluate(() => (window.__e2eSameDocument = true));
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '/eclipses?lugar=teide#contenido');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/eclipses\?lugar=teide#contenido$/);
    expect(await page.evaluate(() => window.__e2eSameDocument)).toBe(true);
    await expect(page.locator('#eclipses-place')).toHaveValue('teide');

    // En el explorador, con el estado que escribe él mismo en la URL (el lugar y la fecha del cielo).
    await openExplorer(page, '/cielo?fecha=2026-11-01T21:00Z&lugar=teide');
    const place = page.getByLabel('Lugar desde el que ves el cielo');
    await expect(place).toHaveValue('teide');
    const here = () => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    };
    await expect
      .poll(async () => (await skip.getAttribute('href')) === `${here()}#contenido`)
      .toBe(true);
    const before = here();
    await page.evaluate(() => (window.__e2eSameDocument = true));
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
    expect(await page.evaluate(() => window.__e2eSameDocument)).toBe(true);
    expect(here()).toBe(before);
    await expect(place).toHaveValue('teide');
  });

  test('la Luna es el satélite de la Tierra, y la description cambia al ir de una luna a otra', async ({
    page,
  }) => {
    await page.goto('/luna');
    await expect(page.locator('.body__kind')).toHaveText(/^\s*Satélite de\s+la Tierra\s*$/);
    await page.goto('/lunas/fobos');
    expect(await meta(page, 'name="description"')).toMatch(/^Fobos/);
    // La misma ficha, reutilizada (revisión, hallazgo 4).
    await page.getByRole('link', { name: 'Deimos', exact: true }).click();
    await expect(page).toHaveTitle('Deimos · Tierra Luna Sol');
    await expect.poll(() => meta(page, 'name="description"')).toMatch(/^Deimos/);
    expect(await meta(page, 'property="og:description"')).toMatch(/^Deimos/);
  });

  test('las 30 fichas responden, cada una con su imagen, sus tablas y sus fuentes', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const fichas = ROUTES.filter((route) => /^\/(planetas|lunas)\/.|^\/(sol|luna)$/.test(route));
    expect(fichas).toHaveLength(30);
    for (const route of fichas) {
      await page.goto(route);
      await expect(page.locator('h1'), route).toBeVisible();
      await expect(page.locator('img.body__image'), route).toHaveJSProperty('complete', true);
      expect(
        await page.locator('img.body__image').evaluate((img: HTMLImageElement) => img.naturalWidth),
        route,
      ).toBeGreaterThan(0);
      await expect(page.locator('table.facts').first(), route).toBeVisible();
      await expect(page.locator('ol.sources li').first(), route).toBeVisible();
      await expect(page.locator('ul.curiosities > li'), route).toHaveCount(3);
    }
  });

  test('sin JavaScript, la ficha se lee entera: los datos, las fuentes y la nota de «Hoy»', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/lunas/titan');
    await expect(page.locator('h1')).toHaveText('Titán');
    await expect(page.locator('.body__kind')).toHaveText(/Luna de\s+Saturno/);
    await expect(page.locator('table.facts tbody tr').first()).toBeVisible();
    await expect(page.locator('.today__value').first()).toHaveText('—');
    await expect(page.locator('.today__note')).toHaveText(/hace falta JavaScript/);
    await expect(page.locator('ol.sources li')).not.toHaveCount(0);
    await context.close();
  });

  test('los índices: los 8 planetas y, en /lunas, la Luna la primera y destacada y las 20 por planeta', async ({
    page,
  }) => {
    await page.goto('/planetas');
    await expect(page.locator('tls-body-card')).toHaveCount(8);
    await page.getByRole('link', { name: 'Saturno', exact: true }).click();
    await expect(page).toHaveURL(/\/planetas\/saturno$/);
    // Saturno: sus lunas, y la tabla de los anillos.
    await expect(page.getByRole('heading', { name: 'Las lunas de Saturno' })).toBeVisible();
    await expect(page.locator('table.facts caption', { hasText: 'Anillos' })).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Lunas' })
      .click();
    await expect(page).toHaveURL(/\/lunas$/);
    // La Luna, la primera y destacada (decisión de Iván del 03-11), con su ficha de siempre.
    await expect(page.locator('tls-body-card')).toHaveCount(21);
    const featured = page.locator('.featured .card--featured');
    await expect(featured).toContainText('Satélite de la Tierra');
    await expect(featured.getByRole('link', { name: 'Luna', exact: true })).toHaveAttribute(
      'href',
      '/luna',
    );
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Luna',
      'Las lunas de Marte',
      'Las lunas de Júpiter',
      'Las lunas de Saturno',
      'Las lunas de Urano',
      'Las lunas de Neptuno',
    ]);
    // La ficha de la Luna, en «Lunas» (decisión de Iván del 04-11): sus migas y el menú.
    await featured.getByRole('link', { name: 'Luna', exact: true }).click();
    await expect(page).toHaveURL(/\/luna$/);
    const crumbs = page.getByRole('navigation', { name: 'Migas de pan' });
    await expect(crumbs.getByRole('link')).toHaveText(['Inicio', 'Lunas']);
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Luna');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link', { name: 'Lunas' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    // En el menú, ni «Luna» ni «Cielo» (es una vista del explorador): «Explorar en 3D» (fase 9c).
    await expect(nav.getByRole('link', { name: 'Luna', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Cielo' })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Explorar en 3D' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toHaveText('El sistema solar');
  });

  test('desde el explorador, la ficha completa de una luna lleva a /lunas/:id', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await page
      .getByRole('toolbar', { name: 'Sol y planetas' })
      .getByRole('button', { name: 'Saturno', exact: true })
      .click();
    // Sus lunas, en la fila de encima (decisión de Iván del 07-11).
    await page
      .getByRole('toolbar', { name: 'Lunas de Saturno' })
      .getByRole('button', { name: 'Titán', exact: true })
      .click();
    await expect(page.locator('#card-title')).toHaveText('Titán');
    await page.getByRole('link', { name: 'Ficha completa de Titán' }).click();
    await expect(page).toHaveURL(/\/lunas\/titan$/);
    await expect(page.locator('h1')).toHaveText('Titán');
  });
});

test.describe('Compartir, legal y privacidad (fase 9)', () => {
  test('cada página, en su HTML, con su título, su description y Open Graph; noindex solo en la 404', async ({
    request,
  }) => {
    const tag = (html: string, attribute: string) =>
      new RegExp(`<meta ${attribute} content="([^"]*)"`).exec(html)?.[1] ?? null;
    const descriptions = new Set<string>();
    for (const route of ROUTES) {
      const html = await (await request.get(route)).text();
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
      const description = tag(html, 'name="description"');
      expect(description, route).toBeTruthy();
      descriptions.add(description ?? '');
      expect(tag(html, 'property="og:title"'), route).toBe(title);
      expect(tag(html, 'property="og:description"'), route).toBe(description);
      expect(tag(html, 'property="og:image"'), route).toBe(
        'https://tierra-luna-sol.ivanchesa.com/img/og.jpg',
      );
      expect(tag(html, 'property="og:image:alt"'), route).toBeTruthy();
      expect(tag(html, 'name="twitter:card"'), route).toBe('summary_large_image');
      // El sitio es indexable desde el lanzamiento (fase 11): noindex, solo en la 404.
      expect(tag(html, 'name="robots"'), route).toBe(route === '/404' ? 'noindex' : null);
      if (route === '/404') {
        expect(html, route).not.toMatch(/rel="canonical"|property="og:url"/);
      } else {
        expect(tag(html, 'property="og:url"'), route).toBe(
          `https://tierra-luna-sol.ivanchesa.com${route === '/' ? '/' : route}`,
        );
      }
    }
    // Cada página dice la suya (las fichas, la primera frase de su resumen).
    expect(descriptions.size).toBe(ROUTES.length);
  });

  test('al navegar en el cliente, las etiquetas cambian con la página', async ({ page }) => {
    await page.goto('/planetas');
    await page.getByRole('link', { name: 'Marte', exact: true }).click();
    await expect(page).toHaveTitle('Marte · Tierra Luna Sol');
    expect(await meta(page, 'name="description"')).toMatch(/^Marte, el cuarto planeta/);
    expect(await meta(page, 'property="og:url"')).toBe(
      'https://tierra-luna-sol.ivanchesa.com/planetas/marte',
    );
    await page.getByRole('link', { name: 'Deimos' }).click();
    await expect(page).toHaveTitle('Deimos · Tierra Luna Sol');
    expect(await meta(page, 'name="description"')).toMatch(/^Deimos/);
  });

  test('robots.txt no bloquea el rastreo y cita el sitemap (fase 11)', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toMatch(/^User-agent: \*$/m);
    expect(text).toMatch(/^Allow: \/$/m);
    expect(text).not.toMatch(/^Disallow: \/\s*$/m);
    expect(text).toMatch(/^Sitemap: https:\/\/tierra-luna-sol\.ivanchesa\.com\/sitemap\.xml$/m);
  });

  test('sitemap.xml: cada página prerenderizada menos la 404, con su URL canónica', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const urls = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const expected = ROUTES.filter((route) => route !== '/404').map(
      (route) => `https://tierra-luna-sol.ivanchesa.com${route}`,
    );
    expect(urls.sort()).toEqual(expected.sort());
  });

  test('el pie: la nota de privacidad, que lleva a su sección, y los enlaces legales', async ({
    page,
  }) => {
    await page.goto('/creditos');
    const footer = page.locator('footer.site-footer');
    await expect(footer).toContainText('Sin cookies, sin analítica y sin peticiones a terceros');
    await expect(footer.getByRole('link', { name: 'Aviso legal' })).toHaveAttribute(
      'href',
      'https://ivanchesa.com/aviso-legal/',
    );
    await expect(footer.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      'https://ivanchesa.com/privacidad/',
    );
    await footer.getByRole('link', { name: 'tu privacidad, en detalle' }).click();
    await expect(page).toHaveURL(/\/sobre-el-proyecto#privacidad$/);
    const heading = page.getByRole('heading', { name: 'Privacidad', level: 2 });
    await expect(heading).toBeInViewport();
    // La frase del NEL de Cloudflare (revisión del bloque C, C8): desde la fase 11, en el dominio
    // propio no se envía (lo quita una regla de la zona); solo en las direcciones de pages.dev.
    const privacy = page.locator('section[aria-labelledby="privacidad"]');
    await expect(privacy).toContainText('Network Error Logging');
    await expect(privacy).toContainText('En tierra-luna-sol.ivanchesa.com no');
  });

  test('en escritorio, la cabecera de las páginas de lectura, en una fila y sin lo legal (hallazgo 4)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/planetas/marte');
    const header = page.locator('header.site-header');
    const visible = await header
      .getByRole('link')
      .evaluateAll((links) =>
        links
          .filter((link) => link.checkVisibility({ checkVisibilityCSS: true }))
          .map((link) => link.textContent?.trim()),
      );
    expect(visible).toEqual([
      'Tierra Luna Sol',
      'Planetas',
      'Lunas',
      'Sol',
      'Eclipses',
      'Sobre el proyecto',
      'Explorar en 3D',
    ]);
    // Lo legal y los créditos, en el pie (no en una segunda fila de la cabecera).
    const height = await header.evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeLessThanOrEqual(60);
  });

  test('en el explorador, la nota de privacidad y lo legal, en su menú (fase 9c)', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    // La cabecera del explorador, compacta también en escritorio: el nombre y «Menú».
    const menu = page.getByRole('navigation', { name: 'Principal' });
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Menú' }).click();
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('Sin cookies, sin analítica y sin peticiones a terceros');
    await expect(menu.getByRole('link', { name: 'tu privacidad', exact: true })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Aviso legal' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Créditos' })).toBeVisible();
    // «Explorar en 3D», marcado: es la página.
    await expect(menu.getByRole('link', { name: 'Explorar en 3D' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // El pie del explorador ya no lleva lo legal (solo las pistas, la primera vez).
    await expect(page.locator('footer.explorer__foot a')).toHaveCount(0);
  });

  test('si solo cambia la consulta (el lugar de /eclipses), la página no se mueve', async ({
    page,
  }) => {
    await page.goto('/eclipses');
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.locator('#eclipses-place').selectOption('teide');
    await expect(page).toHaveURL(/lugar=teide/);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(150);
  });

  test('una página nueva empieza arriba, aunque vengas de abajo de otra', async ({ page }) => {
    await page.goto('/sobre-el-proyecto');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.getByRole('main').getByRole('link', { name: 'créditos', exact: true }).click();
    await expect(page).toHaveURL(/\/creditos$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
