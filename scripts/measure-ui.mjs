// Las medidas de la interfaz de la fase 9c (D47, `docs/decisiones/FASE-9c-INTERFAZ.md`, §4):
// - zona útil del 3D: el porcentaje del lienzo donde `elementFromPoint` devuelve el canvas (donde
//   arrastrar y acercar funcionan), en una rejilla de 8 px;
// - controles visibles: botones, enlaces, campos, `summary` y filas del árbol que se ven en la ventana,
//   sin tapar (en su centro, `elementFromPoint` da el control o algo suyo); el lienzo no cuenta;
// - solapes (tarea 9c.4): los controles que se dibujan (visibles, dentro de la ventana y de los
//   contenedores que los recortan) y que, en su centro, tienen otra cosa encima;
// - zonas táctiles: los controles visibles de menos de 44 × 44 px (en el explorador, con pantalla
//   táctil) o de menos de 24 × 24 (en todas las páginas; WCAG 2.5.8, sin los enlaces dentro de una
//   frase, que la norma exceptúa);
// - texto: lo legible por debajo de 11 px;
// - la hoja del cuerpo en el móvil: su alto sobre el de la ventana, y si la pausa se puede pulsar.
//
// No es una medida de rendimiento: no depende de la carga del equipo.
// Uso: npm run build && CAPTURE_PORT=4350 node scripts/measure-ui.mjs [--json <fichero>] [--solo <grupo>]
//   grupos: explorador (las vistas en los cuatro tamaños), estados (Controles e Índice abiertos),
//   paginas (las fichas, los índices y /eclipses).
import { writeFile } from 'node:fs/promises';
import { openBrowser, openViewer, pageOptions, BASE } from './capture-lib.mjs';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;

/** Los tamaños de la adenda (390, 768 y 1440) y el de 9c.4 (1024 × 768). */
export const SIZES = {
  390: { width: 390, height: 844, scale: 1, mobile: true },
  768: { width: 768, height: 1024, scale: 1, mobile: true },
  1024: { width: 1024, height: 768, scale: 1 },
  1440: { width: 1440, height: 900, scale: 1 },
};

const VIEWS = [
  ['portada', '/?captura=1'],
  ['saturno', '/?captura=1&cuerpo=saturno'],
  ['tierra', '/explorar/tierra?captura=1'],
  ['luna', '/explorar/luna?captura=1'],
  ['cielo', '/cielo?captura=1'],
];

const PAGES = [
  '/planetas',
  '/planetas/marte',
  '/lunas',
  '/lunas/titan',
  '/luna',
  '/sol',
  '/eclipses',
  '/sobre-el-proyecto',
  '/creditos',
];

/** Lo que se mide dentro de la página (se evalúa en el navegador). */
function inspect({ explorer }) {
  const SELECTOR =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="treeitem"], [tabindex="0"]';
  const vw = innerWidth;
  const vh = innerHeight;
  const touch = matchMedia('(pointer: coarse)').matches;

  /** La caja del elemento recortada por la ventana y por los contenedores que recortan. */
  const clipped = (el) => {
    const r = el.getBoundingClientRect();
    let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    box = {
      left: Math.max(box.left, 0),
      top: Math.max(box.top, 0),
      right: Math.min(box.right, vw),
      bottom: Math.min(box.bottom, vh),
    };
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const c = node.getBoundingClientRect();
      box = {
        left: Math.max(box.left, c.left),
        top: Math.max(box.top, c.top),
        right: Math.min(box.right, c.right),
        bottom: Math.min(box.bottom, c.bottom),
      };
    }
    return box;
  };
  const drawn = (el) => {
    if (el.tagName === 'CANVAS') return false;
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    if (
      !el.checkVisibility({
        checkVisibilityCSS: true,
        visibilityProperty: true,
        opacityProperty: true,
      })
    )
      return false;
    const box = clipped(el);
    return box.right - box.left >= 2 && box.bottom - box.top >= 2;
  };
  const hits = (el) => {
    const box = clipped(el);
    const x = (box.left + box.right) / 2;
    const y = (box.top + box.bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    return hit !== null && (el === hit || el.contains(hit) || hit.contains(el));
  };
  const name = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
  const describe = (el) => {
    const r = el.getBoundingClientRect();
    return `${name(el)} (${Math.round(r.width)}×${Math.round(r.height)})`;
  };

  const all = [...document.querySelectorAll(SELECTOR)].filter(drawn);
  // Un control dentro de otro (un enlace con un botón dentro) cuenta una vez.
  const outer = all.filter((el) => !all.some((o) => o !== el && o.contains(el)));
  const visible = outer.filter(hits);
  const covered = outer.filter((el) => !hits(el));

  // Zonas táctiles: 44 × 44 en el explorador con pantalla táctil; 24 × 24 en todo (WCAG 2.5.8). Los
  // enlaces dentro de una frase (un párrafo o una celda con más texto que el enlace) están exceptuados.
  const inSentence = (el) => {
    if (el.tagName !== 'A') return false;
    const block = el.closest('p, li, td, dd, figcaption, caption');
    return block !== null && block.textContent.trim().length > el.textContent.trim().length + 2;
  };
  const minTarget = (el) => (touch && el.closest('.explorer') !== null ? 44 : 24);
  const small = visible
    .filter((el) => !inSentence(el))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < minTarget(el) - 0.5 || r.height < minTarget(el) - 0.5;
    })
    .map(describe);

  // Texto legible por debajo de 11 px: todo lo que se ve, también las etiquetas del 3D (que llevan
  // `aria-hidden`); no lo oculto ni lo que solo es para lectores de pantalla.
  const tiny = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const el = node.parentElement;
    if (!text || !el || el.closest('.visually-hidden, [hidden], script, style')) continue;
    if (
      !el.checkVisibility({
        checkVisibilityCSS: true,
        visibilityProperty: true,
        opacityProperty: true,
      })
    )
      continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    const r = el.getBoundingClientRect();
    if (
      size < 10.95 &&
      r.width > 0 &&
      r.right > 0 &&
      r.left < vw &&
      r.bottom > 0 &&
      r.top < document.documentElement.scrollHeight
    )
      tiny.add(`${text.slice(0, 30)} (${size.toFixed(1)} px)`);
  }

  const result = {
    controls: visible.length,
    controlNames: visible.map(name),
    covered: covered.map(describe),
    small,
    tiny: [...tiny].slice(0, 20),
  };
  if (!explorer) return result;

  // Zona útil: una rejilla de 8 px sobre la parte del lienzo que cae en la ventana.
  const canvas = document.querySelector('tls-viewer-canvas canvas');
  const c = canvas.getBoundingClientRect();
  const left = Math.max(c.left, 0);
  const top = Math.max(c.top, 0);
  const right = Math.min(c.right, vw);
  const bottom = Math.min(c.bottom, vh);
  let total = 0;
  let free = 0;
  for (let y = top + 4; y < bottom; y += 8) {
    for (let x = left + 4; x < right; x += 8) {
      total += 1;
      if (document.elementFromPoint(x, y) === canvas) free += 1;
    }
  }
  result.useful = total ? free / total : 0;

  // La hoja del cuerpo (móvil): su alto sobre el de la ventana, y la pausa a mano.
  const panel = document.querySelector('.panel');
  if (panel && !panel.hidden && panel.checkVisibility()) {
    const r = panel.getBoundingClientRect();
    const play = document.querySelector('.time__play');
    result.sheet = {
      share: Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh,
      playReachable: play !== null && drawn(play) && hits(play),
    };
  }
  return result;
}

const { browser, close } = await openBrowser([]);
const report = { explorer: [], states: [], pages: [] };
try {
  if (!only || only === 'explorador') {
    for (const [size, options] of Object.entries(SIZES)) {
      for (const [view, path] of VIEWS) {
        const { page } = await openViewer(browser, path, options);
        const result = await page.evaluate(inspect, { explorer: true });
        report.explorer.push({ size: Number(size), view, ...result });
        await page.close();
        console.error(
          `explorador · ${size} · ${view}: ${result.controls} controles, zona útil ${(result.useful * 100).toFixed(1)} %`,
        );
      }
    }
  }
  if (!only || only === 'estados') {
    // Con «Controles» y el Índice abiertos, con y sin cuerpo (tarea 9c.4).
    const STATES = [
      ['controles', '.time__more'],
      ['indice', '.index-toggle'],
    ];
    for (const [size, options] of Object.entries(SIZES)) {
      for (const [view, path] of VIEWS) {
        for (const [state, selector] of STATES) {
          const { page } = await openViewer(browser, path, options);
          const toggle = page.locator(selector);
          if (!(await toggle.isVisible())) {
            await page.close();
            continue;
          }
          await toggle.click();
          await page.waitForTimeout(400);
          const result = await page.evaluate(inspect, { explorer: true });
          report.states.push({ size: Number(size), view, state, ...result });
          await page.close();
          console.error(`estado · ${size} · ${view} · ${state}: ${result.covered.length} tapados`);
        }
      }
    }
  }
  if (!only || only === 'paginas') {
    for (const size of [390, 1440]) {
      for (const path of PAGES) {
        const page = await browser.newPage(pageOptions(SIZES[size]));
        await page.goto(BASE + path);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        // Toda la página, no solo lo que cabe en la ventana: se mide en una ventana tan alta como ella.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width: SIZES[size].width, height: Math.min(height, 16000) });
        const result = await page.evaluate(inspect, { explorer: false });
        report.pages.push({ size, path, ...result });
        await page.close();
        console.error(
          `página · ${size} · ${path}: ${result.small.length} zonas pequeñas, ${result.tiny.length} textos < 11 px`,
        );
      }
    }
  }
} finally {
  await close();
}

const pct = (value) => `${(value * 100).toFixed(1)} %`;
if (report.explorer.length) {
  console.log(
    '| Tamaño | Vista | Zona útil | Controles visibles | Tapados | Zonas < objetivo | Textos < 11 px | Hoja (alto, pausa) |',
  );
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of report.explorer) {
    const sheet = r.sheet
      ? `${pct(r.sheet.share)}, ${r.sheet.playReachable ? 'a mano' : 'no'}`
      : '—';
    console.log(
      `| ${r.size} | ${r.view} | ${pct(r.useful)} | ${r.controls} | ${r.covered.length} | ${r.small.length} | ${r.tiny.length} | ${sheet} |`,
    );
  }
}
if (report.states.length) {
  console.log('\n| Tamaño | Vista | Abierto | Controles visibles | Tapados |');
  console.log('|---|---|---|---|---|');
  for (const r of report.states) {
    console.log(`| ${r.size} | ${r.view} | ${r.state} | ${r.controls} | ${r.covered.length} |`);
  }
}
if (report.pages.length) {
  console.log('\n| Tamaño | Página | Zonas < 24 px | Textos < 11 px |');
  console.log('|---|---|---|---|');
  for (const r of report.pages)
    console.log(`| ${r.size} | ${r.path} | ${r.small.length} | ${r.tiny.length} |`);
}
console.log('\nDetalle (tapados, zonas pequeñas y textos pequeños):');
for (const r of [...report.explorer, ...report.states, ...report.pages]) {
  const label = `${r.size} · ${r.view ?? r.path}${r.state ? ` · ${r.state}` : ''}`;
  if (r.covered.length) console.log(`- ${label} · tapados: ${r.covered.join(' · ')}`);
  if (r.small.length) console.log(`- ${label} · pequeños: ${r.small.join(' · ')}`);
  if (r.tiny.length) console.log(`- ${label} · textos: ${r.tiny.join(' · ')}`);
}
if (jsonOut) await writeFile(jsonOut, JSON.stringify(report, null, 2));
