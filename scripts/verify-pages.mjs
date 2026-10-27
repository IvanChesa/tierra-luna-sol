// Comprueba una publicación de Cloudflare Pages (fase 4; en la fase 11, la de producción), como con
// `curl`: las rutas sin barra final (D9), las redirecciones, el 404, las cabeceras de `_headers`, los
// tipos MIME, la caché y que Pages no inyecta Cloudflare Web Analytics (D24).
// Uso: node scripts/verify-pages.mjs https://staging.tierra-luna-sol.pages.dev
// Sale con un error si alguna comprobación falla. Las texturas se buscan con el manifiesto del repo:
// hay que comprobar la publicación del mismo commit.
import { TEXTURE_FILES } from '../src/app/scene/texture-files.ts';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(base)) {
  throw new Error('Uso: node scripts/verify-pages.mjs https://<rama>.tierra-luna-sol.pages.dev');
}
const pagesDev = new URL(base).hostname.endsWith('.pages.dev');

const results = [];
const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail });
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
check(
  'Canonical de la raíz',
  html.includes('<link rel="canonical" href="https://tierra-luna-sol.ivanchesa.es/">'),
  'https://tierra-luna-sol.ivanchesa.es/',
);

// --- Rutas sin barra final y redirecciones ------------------------------------------------------
const page = await get('/planetas/marte');
check('/planetas/marte → 200', page.status === 200, page.status);
check(
  'Canonical sin barra',
  (await page.text()).includes(
    '<link rel="canonical" href="https://tierra-luna-sol.ivanchesa.es/planetas/marte">',
  ),
  '…/planetas/marte',
);
for (const [from, to] of [
  ['/planetas/marte/', '/planetas/marte'],
  ['/planetas/marte.html', '/planetas/marte'],
  ['/planetas/', '/planetas'],
  ['/index.html', '/'],
  ['/explorar', '/'],
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
const main = /src="(main-[^"]+\.js)"/.exec(html)?.[1];
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

// --- Informe ---------------------------------------------------------------------------------------
console.log(`Comprobaciones de ${base}\n`);
for (const { name, ok, detail } of results) {
  console.log(`${ok ? '✔' : '✖'} ${name}${detail === '' ? '' : `: ${detail}`}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} de ${results.length} bien`);
if (failed) process.exitCode = 1;
