import { expect, test } from '@playwright/test';
import { openExplorer } from './support';

/**
 * Lo que se publica en Cloudflare Pages (fase 4): el servidor de los e2e (`scripts/serve-dist.mjs`)
 * imita a Pages con el build ya preparado (`scripts/prepare-pages.mjs`), así que aquí se prueban las
 * rutas sin barra final (D9), las redirecciones, el 404, las cabeceras de `_headers` y que la CSP no
 * bloquea nada de la página. En la vista previa real se repite con `curl` (informe de la fase 4).
 */
test.describe('Publicación (Cloudflare Pages)', () => {
  test('las rutas van sin barra final y lo demás redirige a ellas', async ({ request }) => {
    const get = (path: string) => request.get(path, { maxRedirects: 0 });

    const page = await get('/planetas/marte');
    expect(page.status()).toBe(200);
    expect(await page.text()).toContain(
      '<link rel="canonical" href="https://tierra-luna-sol.ivanchesa.es/planetas/marte">',
    );
    for (const [from, to] of [
      ['/planetas/marte/', '/planetas/marte'],
      ['/planetas/marte.html', '/planetas/marte'],
      ['/planetas/', '/planetas'],
      ['/index.html', '/'],
    ] as const) {
      const response = await get(from);
      expect(response.status(), from).toBe(308);
      expect(response.headers()['location'], from).toBe(to);
    }
    // _redirects: /explorar no es una página.
    const explorar = await get('/explorar');
    expect(explorar.status()).toBe(301);
    expect(explorar.headers()['location']).toBe('/');
  });

  test('lo que no existe responde 404 con la página de error, sin canonical', async ({
    request,
  }) => {
    const response = await request.get('/no-existe/de-verdad');
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain('Página no encontrada');
    expect(html).not.toContain('rel="canonical"');
  });

  test('las cabeceras: CSP con los scripts en línea, seguridad y caché', async ({ request }) => {
    const home = await request.get('/');
    const headers = home.headers();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+;/);
    expect(csp).not.toContain('{{');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    // El HTML no lleva caché larga; el JS con hash, un año.
    expect(headers['cache-control'] ?? '').not.toContain('immutable');
    const main = /src="(main-[^"]+\.js)"/.exec(await home.text())?.[1];
    expect(main).toBeTruthy();
    const script = await request.get(`/${main}`);
    expect(script.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    // Sin hash en el nombre: un día.
    const thumbnail = await request.get('/img/cuerpos/saturno.webp');
    expect(thumbnail.headers()['cache-control']).toBe('public, max-age=86400');
  });

  test('la CSP no bloquea nada: el explorador y una ficha, sin violaciones', async ({ page }) => {
    await page.addInitScript(() => {
      const list: string[] = [];
      (window as unknown as { __csp: string[] }).__csp = list;
      document.addEventListener('securitypolicyviolation', (event) => {
        list.push(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    const violations = () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    await openExplorer(page, '/');
    // La escena ha cargado sus texturas, las estrellas y las fuentes.
    await page.waitForLoadState('networkidle');
    expect(await violations()).toEqual([]);
    await page.goto('/planetas/saturno');
    await page.waitForLoadState('networkidle');
    expect(await violations()).toEqual([]);
    // Control: la CSP está activa y el detector la oye. Un script en línea sin hash no se ejecuta.
    const ran = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__inline = true';
      document.head.append(script);
      return (window as unknown as { __inline?: boolean }).__inline === true;
    });
    expect(ran).toBe(false);
    await expect.poll(async () => (await violations()).length).toBe(1);
  });
});
