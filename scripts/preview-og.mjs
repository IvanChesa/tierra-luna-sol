// La vista previa del enlace de algunas páginas (fase 9, criterio «la vista previa del enlace se ve
// bien»), simulada en local: lee las etiquetas Open Graph del HTML del build, como hacen las apps de
// mensajería y las redes, y pinta con ellas dos tarjetas (la grande, con la imagen arriba, y la
// compacta, con la imagen al lado). La de una app real, cuando el dominio exista (fase 11): hasta
// entonces, la imagen (una URL absoluta del dominio) no se puede pedir desde fuera.
// Uso: npm run build && node scripts/preview-og.mjs docs/informes/img/fase-9
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, pageOptions } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/preview-og.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const DIST = new URL('../dist/tierra-luna-sol/browser/', import.meta.url);
const ROUTES = ['/', '/planetas/marte', '/lunas/titan', '/cielo'];

const unescape = (text) =>
  text
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
const escape = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

/** Las etiquetas Open Graph de una página, como las lee una app. */
async function tags(route) {
  const html = await readFile(
    new URL(route === '/' ? 'index.html' : `${route.slice(1)}.html`, DIST),
    'utf8',
  );
  const get = (property) =>
    unescape(new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1] ?? '');
  return {
    title: get('og:title'),
    description: get('og:description'),
    image: get('og:image'),
    alt: get('og:image:alt'),
    url: get('og:url'),
  };
}

/** Las dos tarjetas, con una tipografía y unos colores neutros (los de una app, no los del sitio). */
const card = (t) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 24px; background: #e9edf1; font: 15px/1.35 system-ui, sans-serif; color: #111b21; }
  .big { width: 420px; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .15); }
  .big img { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; }
  .text { padding: 10px 12px 12px; }
  .site { color: #667781; font-size: 12px; text-transform: lowercase; }
  .title { margin: 2px 0; font-weight: 600; }
  .desc { color: #3b4a54; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .small { display: flex; width: 420px; margin-top: 20px; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .15); }
  .small img { width: 96px; height: 96px; object-fit: cover; flex: none; }
</style></head><body>
  <div class="big"><img src="${escape(t.local)}" alt="${escape(t.alt)}"><div class="text">
    <div class="site">${escape(new URL(t.url || 'https://tierra-luna-sol.ivanchesa.com/').host)}</div>
    <div class="title">${escape(t.title)}</div><div class="desc">${escape(t.description)}</div></div></div>
  <div class="small"><img src="${escape(t.local)}" alt=""><div class="text">
    <div class="title">${escape(t.title)}</div><div class="desc">${escape(t.description)}</div>
    <div class="site">${escape(new URL(t.url || 'https://tierra-luna-sol.ivanchesa.com/').host)}</div></div></div>
</body></html>`;

const { browser, close } = await openBrowser();
try {
  for (const route of ROUTES) {
    const t = await tags(route);
    // La imagen, del servidor local (en producción, la misma ruta en el dominio).
    t.local = BASE + new URL(t.image).pathname;
    const page = await browser.newPage(pageOptions({ width: 470, height: 520, scale: 2 }));
    await page.setContent(card(t), { waitUntil: 'load' });
    const name = route === '/' ? 'inicio' : route.slice(1).replaceAll('/', '-');
    // Con la GPU, Chromium falla a veces al capturar una página sin lienzo: un reintento.
    const png = await page.screenshot().catch(async () => {
      await page.waitForTimeout(500);
      return page.screenshot();
    });
    await sharp(png)
      .webp({ quality: 88 })
      .toFile(fileURLToPath(new URL(`compartir-${name}.webp`, dir)));
    await page.close();
    console.log(`${route}: «${t.title}» · ${t.description.slice(0, 70)}… · ${t.image}`);
  }
} finally {
  await close();
}
