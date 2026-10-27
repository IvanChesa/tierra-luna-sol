// Comprueba una publicación de Cloudflare Pages (fase 4; en la fase 11, la de producción), como con
// `curl`: las rutas sin barra final (D9), las redirecciones, el 404, las cabeceras de `_headers`, los
// tipos MIME, la caché, las cabeceras `Link` de los Early Hints y que no se cuela nada de terceros
// (D24): ni Cloudflare Web Analytics ni, si se puede, Network Error Logging.
//
// Uso: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-pages.mjs <url> [--build <carpeta>]
//   <url>: https://<rama>.tierra-luna-sol.pages.dev (o la de producción)
//   --build: el build publicado (dist/tierra-luna-sol/browser); compara el HTML servido de cada
//            página con el suyo, byte a byte (Cloudflare no debe inyectar nada).
// Sale con un error si alguna comprobación falla (✖); los avisos (⚠) no la hacen fallar. Las
// texturas se buscan con el manifiesto del repo: hay que comprobar la publicación del mismo commit.
import { readFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { SITE_CONFIG } from '../src/app/core/site.config.ts';
import { TEXTURE_FILES } from '../src/app/scene/texture-files.ts';

const args = process.argv.slice(2);
const base = (args.find((arg) => /^https:\/\//.test(arg)) ?? '').replace(/\/$/, '');
const buildIndex = args.indexOf('--build');
const build = buildIndex >= 0 ? args[buildIndex + 1] : null;
if (!base) {
  throw new Error(
    'Uso: node scripts/verify-pages.mjs https://<rama>.tierra-luna-sol.pages.dev [--build <carpeta>]',
  );
}
const pagesDev = new URL(base).hostname.endsWith('.pages.dev');
const site = SITE_CONFIG.baseUrl;

const results = [];
const check = (name, ok, detail) => results.push({ name, state: ok ? 'ok' : 'error', detail });
const warn = (name, ok, detail) => results.push({ name, state: ok ? 'ok' : 'warning', detail });
const get = (path, init = {}) => fetch(`${base}${path}`, { redirect: 'manual', ...init });

// --- La página principal: estado, cabeceras y que no hay scripts de terceros ---------------------
const home = await get('/');
const html = await home.text();
const h = (name) => home.headers.get(name) ?? '';
check('/ → 200', home.status === 200, home.status);
check('HTML con su tipo', /^text\/html/.test(h('content-type')), h('content-type'));
check(
  'HTML sin caché larga',
  !/immutable|max-age=[1-9]/.test(h('cache-control')),
  h('cache-control'),
);
check(
  'CSP con los hashes de los scripts en línea',
  /script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+;/.test(h('content-security-policy')) &&
    !h('content-security-policy').includes('{{'),
  h('content-security-policy').slice(0, 90) + '…',
);
check(
  'X-Content-Type-Options',
  h('x-content-type-options') === 'nosniff',
  h('x-content-type-options'),
);
check('X-Frame-Options', h('x-frame-options') === 'DENY', h('x-frame-options'));
check(
  'Referrer-Policy',
  h('referrer-policy') === 'strict-origin-when-cross-origin',
  h('referrer-policy'),
);
check(
  'Permissions-Policy',
  h('permissions-policy').includes('geolocation=(self)'),
  h('permissions-policy'),
);
check(
  'Cross-Origin-Opener-Policy',
  h('cross-origin-opener-policy') === 'same-origin',
  h('cross-origin-opener-policy'),
);
check(
  'Strict-Transport-Security',
  /max-age=\d+/.test(h('strict-transport-security')),
  h('strict-transport-security'),
);
if (pagesDev) check('noindex en *.pages.dev', /noindex/.test(h('x-robots-tag')), h('x-robots-tag'));
check(
  'Sin Cloudflare Web Analytics',
  !/cloudflareinsights|beacon\.min\.js|data-cf-beacon/.test(html),
  'ningún script de cloudflareinsights.com',
);
// Network Error Logging: con estas cabeceras, Chrome y Edge envían a un dominio de Cloudflare un
// informe de cada petición que falla. `_headers` intenta quitarlas; si las pone la red de Cloudflare
// después, es un aviso para Iván (PENDIENTES.md), no un error de la publicación.
const nel = [h('report-to'), h('nel')].filter(Boolean).join(' · ');
warn('Sin Network Error Logging (Report-To, NEL)', !nel, nel || 'sin esas cabeceras');
check('Canonical de la raíz', html.includes(`<link rel="canonical" href="${site}/">`), `${site}/`);

// --- Rutas sin barra final y redirecciones ------------------------------------------------------
const page = await get('/planetas/marte');
check('/planetas/marte → 200', page.status === 200, page.status);
check(
  'Canonical sin barra',
  (await page.text()).includes(`<link rel="canonical" href="${site}/planetas/marte">`),
  `${site}/planetas/marte`,
);
for (const [from, to] of [
  ['/planetas/marte/', '/planetas/marte'],
  ['/planetas/marte.html', '/planetas/marte'],
  ['/planetas/', '/planetas'],
  ['/index.html', '/'],
  ['/explorar', '/'],
  ['/explorar/', '/'],
]) {
  const response = await get(from);
  const location = response.headers.get('location') ?? '';
  const target = new URL(location, base).pathname;
  check(
    `${from} → ${to}`,
    [301, 302, 307, 308].includes(response.status) && target === to,
    `${response.status} → ${location}`,
  );
}

// --- Early Hints: la cabecera `Link` de una página anidada lleva a ficheros que existen ------------
// Pages la genera con los `modulepreload` del HTML desde la segunda petición; el navegador la resuelve
// contra la URL de la página (no contra `<base href="/">`): las rutas del HTML tienen que ser absolutas.
for (const path of ['/planetas/marte', '/explorar/tierra']) {
  let link = '';
  for (let attempt = 0; attempt < 3 && !link; attempt++) {
    const response = await get(path);
    link = response.headers.get('link') ?? '';
    await response.body?.cancel();
  }
  const targets = [...link.matchAll(/<([^>]+)>/g)].map(
    ([, href]) => new URL(href, `${base}${path}`),
  );
  const broken = [];
  for (const url of targets) {
    const response = await fetch(url, { redirect: 'manual' });
    if (response.status !== 200 || !/javascript/.test(response.headers.get('content-type') ?? '')) {
      broken.push(`${url.pathname} (${response.status})`);
    }
    await response.body?.cancel();
  }
  check(
    `Link de ${path} → ficheros que existen`,
    broken.length === 0,
    targets.length
      ? `${targets.length} (${targets.map((u) => u.pathname).join(', ')})${broken.length ? `; rotos: ${broken.join(', ')}` : ''}`
      : 'sin cabecera Link',
  );
}

// --- 404 -----------------------------------------------------------------------------------------
const missing = await get('/no-existe/de-verdad');
const missingHtml = await missing.text();
check(
  '/no-existe → 404 con la página de error',
  missing.status === 404 && missingHtml.includes('Página no encontrada'),
  missing.status,
);
check('404 sin canonical', !missingHtml.includes('rel="canonical"'), '');

// --- Recursos: tipos MIME y caché -----------------------------------------------------------------
const main = /src="\/?(main-[^"]+\.js)"/.exec(html)?.[1];
const texture = TEXTURE_FILES['saturn-rings']?.[0]?.path;
const assets = [
  [`/${main}`, /javascript/, 'public, max-age=31536000, immutable'],
  ['/img/cuerpos/saturno.webp', /^image\/webp/, 'public, max-age=86400'],
  ['/data/stars.bin', /^application\/octet-stream/, 'public, max-age=86400'],
  ...(texture ? [[`/${texture}`, /^image\/webp/, 'public, max-age=31536000, immutable']] : []),
];
for (const [path, type, cache] of assets) {
  const response = await get(path);
  const contentType = response.headers.get('content-type') ?? '';
  const cacheControl = response.headers.get('cache-control') ?? '';
  check(
    `${path.length > 48 ? `${path.slice(0, 45)}…` : path}`,
    response.status === 200 && type.test(contentType) && cacheControl === cache,
    `${response.status} · ${contentType} · ${cacheControl}`,
  );
  await response.body?.cancel();
}

// --- HTTP → HTTPS ---------------------------------------------------------------------------------
const http = await fetch(base.replace(/^https:/, 'http:'), { redirect: 'manual' }).catch(
  () => null,
);
check(
  'http:// → https://',
  http &&
    [301, 302, 307, 308].includes(http.status) &&
    (http.headers.get('location') ?? '').startsWith('https://'),
  http ? `${http.status} → ${http.headers.get('location')}` : 'sin respuesta',
);

// --- El HTML servido es el del build (Cloudflare no inyecta nada) ----------------------------------
if (build) {
  const list = await readdir(build, { recursive: true, withFileTypes: true });
  const pages = list
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name).slice(build.length).split(sep).join('/'))
    .map((file) => file.replace(/^\/?/, ''));
  const different = [];
  for (const file of pages) {
    // 404.html se sirve en lo que no existe; las demás, en su ruta sin `.html`.
    const route =
      file === 'index.html' ? '/' : file === '404.html' ? '/no-existe' : `/${file.slice(0, -5)}`;
    const served = await (await get(route)).text();
    if (served !== (await readFile(join(build, file), 'utf8'))) different.push(route);
  }
  check(
    `HTML servido = build (${pages.length} páginas)`,
    different.length === 0,
    different.length ? `distintas: ${different.join(', ')}` : 'idénticas byte a byte',
  );
}

// --- Informe ---------------------------------------------------------------------------------------
const MARK = { ok: '✔', error: '✖', warning: '⚠' };
console.log(`Comprobaciones de ${base}\n`);
for (const { name, state, detail } of results) {
  console.log(`${MARK[state]} ${name}${detail === '' ? '' : `: ${detail}`}`);
}
const failed = results.filter((r) => r.state === 'error').length;
const warnings = results.filter((r) => r.state === 'warning').length;
console.log(
  `\n${results.length - failed - warnings} de ${results.length} bien${warnings ? `, ${warnings} aviso${warnings > 1 ? 's' : ''}` : ''}${failed ? `, ${failed} mal` : ''}`,
);
if (failed) process.exitCode = 1;
