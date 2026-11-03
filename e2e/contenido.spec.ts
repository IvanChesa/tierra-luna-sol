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
  test('la ficha de Marte: datos con su fuente, «Hoy» calculado en el navegador y «Ver en 3D»', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await page.goto('/planetas/marte?captura=1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marte');
    const crumbs = page.getByRole('navigation', { name: 'Migas de pan' });
    await expect(crumbs.getByRole('link')).toHaveText(['Inicio', 'Planetas']);
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Marte');
    // Cada fila de datos enlaza a su fuente, que está en la lista del final.
    const refs = page.locator('table.facts td.facts__ref a');
    expect(await refs.count()).toBeGreaterThan(15);
    for (const href of await refs.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')),
    )) {
      await expect(page.locator(href ?? '#nada')).toHaveCount(1);
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

  test('los índices: los 8 planetas y las 20 lunas, por planeta, con la Luna aparte', async ({
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
    await expect(page.locator('tls-body-card')).toHaveCount(20);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Las lunas de Marte',
      'Las lunas de Júpiter',
      'Las lunas de Saturno',
      'Las lunas de Urano',
      'Las lunas de Neptuno',
    ]);
    await expect(page.getByRole('link', { name: 'la Luna' })).toHaveAttribute('href', '/luna');
  });

  test('desde el explorador, la ficha completa de una luna lleva a /lunas/:id', async ({
    page,
  }) => {
    await openExplorer(page, '/?captura=1');
    await page
      .getByRole('toolbar', { name: 'Sol y planetas' })
      .getByRole('button', { name: 'Saturno', exact: true })
      .click();
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
  test('cada página, en su HTML, con su título, su description y Open Graph; noindex en todas', async ({
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
      // Mientras el sitio no sea indexable (fase 11), noindex en todas; la 404, siempre.
      expect(tag(html, 'name="robots"'), route).toBe('noindex');
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

  test('robots.txt no bloquea el rastreo (si no, no se vería el noindex)', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toMatch(/^User-agent: \*$/m);
    expect(text).toMatch(/^Allow: \/$/m);
    expect(text).not.toMatch(/^Disallow: \/\s*$/m);
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
    // La frase del NEL de Cloudflare (revisión del bloque C, C8).
    await expect(page.locator('section[aria-labelledby="privacidad"]')).toContainText(
      'Network Error Logging',
    );
  });

  test('una página nueva empieza arriba, aunque vengas de abajo de otra', async ({ page }) => {
    await page.goto('/sobre-el-proyecto');
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.getByRole('main').getByRole('link', { name: 'créditos', exact: true }).click();
    await expect(page).toHaveURL(/\/creditos$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
