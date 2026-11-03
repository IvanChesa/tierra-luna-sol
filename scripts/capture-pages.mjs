// Capturas de las páginas de contenido para el informe de la fase 9 (?captura=1: los datos «de hoy»,
// en la fecha fija de las capturas): las fichas, sus índices, los créditos, «Sobre el proyecto», el
// pie y la 404, en escritorio y en móvil, a página entera.
// Uso: npm run build && node scripts/capture-pages.mjs docs/informes/img/fase-9 [--solo=a,b]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, pageOptions } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-pages.mjs <carpeta de salida>');
const only =
  process.argv
    .find((arg) => arg.startsWith('--solo='))
    ?.slice(7)
    .split(',') ?? null;
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1280, height: 800, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };

/** [nombre, ruta, tamaño, ¿página entera?] */
const SHOTS = [
  ['escritorio-ficha-marte', '/planetas/marte?captura=1', DESKTOP, true],
  ['movil-ficha-marte', '/planetas/marte?captura=1', MOBILE, true],
  ['escritorio-ficha-saturno', '/planetas/saturno?captura=1', DESKTOP, true],
  ['escritorio-ficha-titan', '/lunas/titan?captura=1', DESKTOP, true],
  ['movil-ficha-titan', '/lunas/titan?captura=1', MOBILE, true],
  ['escritorio-ficha-sol', '/sol?captura=1', DESKTOP, true],
  ['escritorio-ficha-luna', '/luna?captura=1', DESKTOP, true],
  ['escritorio-planetas', '/planetas', DESKTOP, true],
  ['movil-planetas', '/planetas', MOBILE, true],
  ['escritorio-lunas', '/lunas', DESKTOP, true],
  ['movil-lunas', '/lunas', MOBILE, true],
  ['escritorio-creditos', '/creditos', DESKTOP, true],
  ['escritorio-sobre-el-proyecto', '/sobre-el-proyecto', DESKTOP, true],
  ['movil-sobre-el-proyecto', '/sobre-el-proyecto', MOBILE, true],
  ['escritorio-404', '/no-existe', DESKTOP, false],
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, full] of SHOTS) {
    if (only && !only.includes(name)) continue;
    const page = await browser.newPage(pageOptions(size));
    const problems = [];
    page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`[console] ${m.text()}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`[${r.status()}] ${r.url()}`));
    await page.goto(BASE + path);
    await page.waitForLoadState('load');
    // Los datos «de hoy» llegan con un import() después de pintar.
    if (path.includes('captura=1')) {
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.today__value')].every((el) => el.textContent !== '—'),
      );
    }
    await page.evaluate(() => document.fonts.ready);
    // En WebP (las de página entera, en PNG, pasaban de 1 MB).
    const png = await page.screenshot({ fullPage: full });
    await sharp(png)
      .webp({ quality: 86 })
      .toFile(file(`${name}.webp`));
    await page.close();
    // En la 404, su propio 404 es lo esperado.
    const real = problems.filter((p) => !(path === '/no-existe' && /404/.test(p)));
    console.log(`${name}${real.length ? `\n  ${real.join('\n  ')}` : ''}`);
  }
} finally {
  await close();
}
