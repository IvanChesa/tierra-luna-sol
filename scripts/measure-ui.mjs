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
// - la ficha del cuerpo en el móvil, en reposo (desde el 08-11, la barra fina): su alto sobre el de la
//   ventana, y si la pausa se puede pulsar; abierta (el estado «ficha»), el alto de la hoja;
// - el centro del cuerpo elegido en el hueco libre (el que dejan los márgenes del encuadre): el
//   centroide de lo que brilla en una captura de ese hueco, respecto a su centro (decisión del 08-11);
// - el velo de abajo (el fondo de la barra de tiempo): la parte del lienzo que tapa (9c.2, ≤ 10 %);
// - el contraste de los nombres de la fila de fichas, en el peor caso (blanco o negro detrás; ≥ 4,5:1);
// - recortes (revisión de la 9c, hallazgos 6, 7 y 18): los contenedores que se desbordan en horizontal
//   sin ser una fila desplazable (`.scroll-hint`), los controles que recortan, y las opciones de un
//   `select` que no caben enteras en él.
//
// No es una medida de rendimiento: no depende de la carga del equipo.
// Uso: npm run build && CAPTURE_PORT=4350 node scripts/measure-ui.mjs [--json <fichero>] [--solo <grupo>]
//   grupos: explorador (las vistas en los cuatro tamaños), estados (Controles, el Índice y «Más»
//   abiertos), paginas (las fichas, los índices y /eclipses).
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
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

/** Cierra la ficha del cuerpo elegido (el cuerpo sigue elegido). */
async function closePanel(page) {
  const close = page.getByRole('button', { name: 'Cerrar la ficha' });
  if (await close.isVisible()) {
    await close.click();
    await page.waitForTimeout(400);
  }
}

/** Las vistas, con lo que se hace al llegar (revisión de la 9c, hallazgo 12: con la ficha cerrada). */
const VIEWS = [
  ['portada', '/?captura=1'],
  ['Saturno', '/?captura=1&cuerpo=saturno'],
  ['Saturno, sin ficha', '/?captura=1&cuerpo=saturno', closePanel],
  ['Tierra', '/explorar/tierra?captura=1'],
  ['Luna', '/explorar/luna?captura=1'],
  ['Cielo', '/cielo?captura=1'],
  ['Cielo, Saturno sin ficha', '/cielo?captura=1&cuerpo=saturno', closePanel],
];

/** Lo que se abre en cada vista, y en cuáles (tarea 9c.4; «Más», hallazgo 12). */
const STATES = [
  ['controles', '.time__more', ['portada', 'Saturno', 'Tierra', 'Luna', 'Cielo']],
  ['índice', '.index-toggle', ['portada', 'Saturno', 'Tierra', 'Luna', 'Cielo']],
  ['más', '.earth__toggle, .moon__toggle', ['Tierra', 'Luna']],
  // La hoja de la ficha, abierta desde la barra fina (móvil y tableta; decisión del 08-11).
  ['ficha', '.bar__toggle', ['Saturno']],
];

/** Las vistas con un cuerpo elegido en el sistema solar: su centro, en el hueco libre. */
const CENTRED = new Set(['Saturno', 'Saturno, sin ficha']);

/**
 * El centro del cuerpo elegido en el hueco libre del lienzo (el que dejan `--view-*`): el centroide de
 * lo que brilla (luminancia > 110 de 255) en una captura del hueco, respecto a su centro, en fracción
 * de su ancho y de su alto. Las órbitas y las estrellas, más tenues o diminutas, apenas cuentan.
 */
async function bodyCentre(page) {
  const area = await page.evaluate(() => {
    const explorer = document.querySelector('.explorer');
    const style = getComputedStyle(explorer);
    const px = (name) => parseFloat(style.getPropertyValue(name)) || 0;
    const box = explorer.getBoundingClientRect();
    const top = Math.max(box.top + px('--view-top'), 0);
    const bottom = Math.min(box.bottom - px('--view-bottom'), innerHeight);
    const left = box.left + px('--view-left');
    const right = box.right - px('--view-right');
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
  if (area.width < 10 || area.height < 10) return null;
  const png = await page.screenshot({ clip: area, animations: 'disabled' });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (luminance <= 110) continue;
      count++;
      sumX += x;
      sumY += y;
    }
  }
  if (count < 200) return null;
  return { dx: sumX / count / info.width - 0.5, dy: sumY / count / info.height - 0.5 };
}

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
  // En su centro, ese control o un hijo suyo (la adenda, 9c.4): no un antecesor, que escondería un
  // control con `pointer-events: none` (revisión, hallazgo 18). Un enlace partido en dos líneas tiene
  // una caja por línea (el centro de la caja entera puede caer entre ellas): basta con el de una.
  const hits = (el) => {
    const lines = [...el.getClientRects()];
    const boxes = lines.length > 1 ? lines : [el.getBoundingClientRect()];
    const outer = clipped(el);
    return boxes.some((r) => {
      const left = Math.max(r.left, outer.left);
      const right = Math.min(r.right, outer.right);
      const top = Math.max(r.top, outer.top);
      const bottom = Math.min(r.bottom, outer.bottom);
      if (right - left < 1 || bottom - top < 1) return false;
      const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      return hit !== null && (el === hit || el.contains(hit));
    });
  };
  /** Dentro de una fila hecha para desplazarse en horizontal (las fichas, las vistas guiadas). */
  const inScroller = (el) => el.closest('.scroll-hint') !== null;
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
    if (block === null) return false;
    // En una lista, solo si el elemento tiene texto propio alrededor del enlace (no una tarjeta).
    if (block.tagName === 'LI') {
      const own = [...block.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 1,
      );
      if (!own) return false;
    }
    return block.textContent.trim().length > el.textContent.trim().length + 2;
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

  // Recortes: los controles que se ven a medias en horizontal (su contenedor o la ventana los cortan)
  // fuera de una fila desplazable, y los contenedores que se desbordan en horizontal (hallazgo 7).
  const cut = outer
    .filter((el) => !inScroller(el))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const box = clipped(el);
      return box.right - box.left < r.width - 1;
    })
    .map(describe);
  // Sin las capas de etiquetas de la escena (`scene/labels.ts`, de la 9b): recortan a propósito lo que
  // se sale del lienzo (un rótulo en el borde no es un contenedor de la interfaz que se desborde).
  const overflowing = [...document.querySelectorAll('body *')]
    .filter((el) => !inScroller(el) && !el.closest('[hidden], [inert], .scene-labels, .sky-labels'))
    .filter((el) => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.display === 'contents') return false;
      if (style.overflowX === 'visible') return false;
      // Lo de 1 px es lo que solo leen los lectores de pantalla (`.visually-hidden`): no se ve.
      return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1;
    })
    .map((el) => {
      const label = el.id
        ? `#${el.id}`
        : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
      return `${label} (${el.scrollWidth} > ${el.clientWidth})`;
    });
  // Las opciones de un `select` que no caben enteras: una copia del `select` con solo esa opción, de
  // su ancho natural (el texto, el relleno y la flecha), frente al ancho del de verdad (hallazgo 6).
  const cutOptions = [];
  for (const select of [...document.querySelectorAll('select')].filter(drawn)) {
    const probe = select.cloneNode(false);
    probe.removeAttribute('id');
    Object.assign(probe.style, {
      position: 'absolute',
      visibility: 'hidden',
      width: 'auto',
      minWidth: '0',
      maxWidth: 'none',
    });
    select.parentElement.append(probe);
    for (const option of select.options) {
      probe.replaceChildren(new Option(option.text));
      if (probe.offsetWidth > select.offsetWidth + 0.5) {
        cutOptions.push(`${option.text.trim()} (${probe.offsetWidth} > ${select.offsetWidth})`);
      }
    }
    probe.remove();
  }

  const result = {
    controls: visible.length,
    controlNames: visible.map(name),
    covered: covered.map(describe),
    small,
    tiny: [...tiny].slice(0, 20),
    cut,
    overflowing,
    cutOptions,
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

  // El velo de abajo (el fondo de la barra de tiempo, con su fundido): la parte del lienzo visible que
  // queda debajo de su caja (9c.2: ≤ 10 %).
  const dock = document.querySelector('.explorer__dock');
  if (dock && right > left && bottom > top) {
    const d = dock.getBoundingClientRect();
    const w = Math.max(0, Math.min(d.right, right) - Math.max(d.left, left));
    const h = Math.max(0, Math.min(d.bottom, bottom) - Math.max(d.top, top));
    result.veil = (w * h) / ((right - left) * (bottom - top));
  }

  // El contraste de los nombres de la fila de fichas sobre su placa (o su fondo), en el peor caso: con
  // blanco o con negro detrás de lo que no es opaco (crítica de la 9c, AA: ≥ 4,5:1).
  const rgba = (value) => {
    const numbers = (value.match(/[\d.]+/g) ?? []).map(Number);
    const unit = value.startsWith('color(') ? 1 : 255;
    const [r = 0, g = 0, b = 0] = numbers.slice(0, 3).map((n) => n / unit);
    const a = numbers.length > 3 ? numbers[3] : 1;
    return [r, g, b, a];
  };
  const over = ([r, g, b, a], [R, G, B]) => [
    r * a + R * (1 - a),
    g * a + G * (1 - a),
    b * a + B * (1 - a),
  ];
  const luminance = (channels) => {
    const [r, g, b] = channels.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (x, y) => {
    const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  const contrasts = [...document.querySelectorAll('tls-body-chips :is(.chip__name, .moon)')]
    .filter((el) => el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true }))
    .flatMap((el) => {
      const style = getComputedStyle(el);
      const plate = rgba(style.backgroundColor);
      return [
        [0, 0, 0],
        [1, 1, 1],
      ].map((behind) => {
        const background = over(plate, behind);
        return ratio(over(rgba(style.color), background), background);
      });
    });
  result.nameContrast = contrasts.length ? Math.min(...contrasts) : null;

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
      for (const [view, path, arrive] of VIEWS) {
        const { page } = await openViewer(browser, path, options);
        if (arrive) await arrive(page);
        const result = await page.evaluate(inspect, { explorer: true });
        result.centre = CENTRED.has(view) ? await bodyCentre(page) : null;
        report.explorer.push({ size: Number(size), view, ...result });
        await page.close();
        console.error(
          `explorador · ${size} · ${view}: ${result.controls} controles, zona útil ${(result.useful * 100).toFixed(1)} %`,
        );
      }
    }
  }
  if (!only || only === 'estados') {
    // Con «Controles», el Índice y «Más» abiertos, con y sin cuerpo (tarea 9c.4).
    for (const [size, options] of Object.entries(SIZES)) {
      for (const [view, path] of VIEWS) {
        for (const [state, selector, views] of STATES) {
          if (!views.includes(view)) continue;
          const { page } = await openViewer(browser, path, options);
          const toggle = page.locator(selector);
          if (!(await toggle.first().isVisible())) {
            await page.close();
            continue;
          }
          await toggle.first().click();
          await page.waitForTimeout(400);
          const result = await page.evaluate(inspect, { explorer: true });
          report.states.push({ size: Number(size), view, state, ...result });
          await page.close();
          console.error(
            `estado · ${size} · ${view} · ${state}: ${result.controls} controles, ${result.covered.length} tapados`,
          );
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
/** El desvío del centro del cuerpo: «+1,2 % / −0,8 %» del ancho y del alto del hueco libre. */
const signed = (value) => `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(1)} %`;
const centre = (value) => (value ? `${signed(value.dx)} / ${signed(value.dy)}` : '—');
/** Los recortes de una medida: controles, contenedores y opciones. */
const cuts = (r) => r.cut.length + r.overflowing.length + r.cutOptions.length;
if (report.explorer.length) {
  console.log(
    '| Tamaño | Vista | Zona útil | Velo | Controles visibles | Tapados | Recortes | Zonas < objetivo | Textos < 11 px | Contraste de los nombres | Ficha en reposo (alto, pausa) | Centro del cuerpo (Δx, Δy) |',
  );
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of report.explorer) {
    const sheet = r.sheet
      ? `${pct(r.sheet.share)}, ${r.sheet.playReachable ? 'a mano' : 'no'}`
      : '—';
    console.log(
      `| ${r.size} | ${r.view} | ${pct(r.useful)} | ${r.veil === undefined ? '—' : pct(r.veil)} | ${r.controls} | ${r.covered.length} | ${cuts(r)} | ${r.small.length} | ${r.tiny.length} | ${r.nameContrast === null ? '—' : r.nameContrast.toFixed(1) + ':1'} | ${sheet} | ${centre(r.centre)} |`,
    );
  }
}
if (report.states.length) {
  console.log(
    '\n| Tamaño | Vista | Abierto | Controles visibles | Tapados | Recortes | Zona útil | Hoja |',
  );
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of report.states) {
    const sheet = r.state === 'ficha' && r.sheet ? pct(r.sheet.share) : '—';
    console.log(
      `| ${r.size} | ${r.view} | ${r.state} | ${r.controls} | ${r.covered.length} | ${cuts(r)} | ${pct(r.useful)} | ${sheet} |`,
    );
  }
}
if (report.pages.length) {
  console.log('\n| Tamaño | Página | Zonas < 24 px | Textos < 11 px | Recortes |');
  console.log('|---|---|---|---|---|');
  for (const r of report.pages)
    console.log(`| ${r.size} | ${r.path} | ${r.small.length} | ${r.tiny.length} | ${cuts(r)} |`);
}
console.log('\nDetalle (tapados, recortes, zonas pequeñas y textos pequeños):');
for (const r of [...report.explorer, ...report.states, ...report.pages]) {
  const label = `${r.size} · ${r.view ?? r.path}${r.state ? ` · ${r.state}` : ''}`;
  if (r.covered.length) console.log(`- ${label} · tapados: ${r.covered.join(' · ')}`);
  if (r.cut.length) console.log(`- ${label} · controles recortados: ${r.cut.join(' · ')}`);
  if (r.overflowing.length) console.log(`- ${label} · desbordan: ${r.overflowing.join(' · ')}`);
  if (r.cutOptions.length)
    console.log(`- ${label} · opciones cortadas: ${r.cutOptions.join(' · ')}`);
  if (r.small.length) console.log(`- ${label} · pequeños: ${r.small.join(' · ')}`);
  if (r.tiny.length) console.log(`- ${label} · textos: ${r.tiny.join(' · ')}`);
}
if (jsonOut) await writeFile(jsonOut, JSON.stringify(report, null, 2));
