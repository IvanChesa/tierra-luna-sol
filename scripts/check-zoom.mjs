// El zum al 200 % (fase 10, tarea 3; WCAG 1.4.4 y 1.4.10): una ventana de 1440 × 900 y otra de
// 1280 × 800 con el navegador al 200 % son, para la maquetación, una de 720 × 450 y una de 640 × 400
// px CSS a densidad 2. En cada ruta: si la página se desborda en horizontal (lo que no sea una fila
// que se desplaza a propósito), si algún control queda fuera de la ventana sin poder llegar a él y si
// algún texto se corta (su contenido, más ancho que su caja, sin puntos suspensivos).
// Uso: npm run build && node scripts/check-zoom.mjs
import { BASE, openBrowser, openViewer, pageOptions } from './capture-lib.mjs';

const SIZES = [
  { width: 720, height: 450, scale: 2 },
  { width: 640, height: 400, scale: 2 },
];
const EXPLORER = ['/', '/?cuerpo=saturno', '/explorar/tierra', '/explorar/luna', '/cielo'];
const PAGES = ['/sol', '/planetas/marte', '/lunas', '/eclipses', '/creditos', '/sobre-el-proyecto'];

/** Lo que se mide en la página. */
const MEASURE = () => {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - doc.clientWidth;
  const controls = [...document.querySelectorAll('button, a[href], input, select, summary')].filter(
    (el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden';
    },
  );
  // Fuera de la ventana y sin contenedor que se desplace hacia él.
  const unreachable = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.right <= doc.clientWidth + 1 && r.left >= -1) return false;
      for (let node = el.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth)
          return false;
      }
      return true;
    })
    .map((el) =>
      (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40),
    );
  const clipped = [...document.querySelectorAll('h1, h2, h3, p, li, dt, dd, label, button')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return (
        el.scrollWidth > el.clientWidth + 1 &&
        style.overflowX === 'hidden' &&
        style.textOverflow !== 'ellipsis' &&
        el.clientWidth > 0
      );
    })
    .map((el) => (el.textContent || '').trim().slice(0, 40));
  return { overflow, unreachable, clipped };
};

const { browser, close } = await openBrowser(process.argv);
let problems = 0;
try {
  for (const size of SIZES) {
    for (const path of [...EXPLORER, ...PAGES]) {
      let page;
      if (EXPLORER.includes(path)) {
        ({ page } = await openViewer(
          browser,
          `${path}${path.includes('?') ? '&' : '?'}captura=1`,
          size,
        ));
      } else {
        page = await browser.newPage(pageOptions(size));
        await page.goto(BASE + path);
        await page.waitForTimeout(300);
      }
      const { overflow, unreachable, clipped } = await page.evaluate(MEASURE);
      const bad = overflow > 1 || unreachable.length > 0 || clipped.length > 0;
      if (bad) problems++;
      console.log(
        `${bad ? '✗' : '✓'} ${size.width}×${size.height} ${path}: desborde ${overflow} px` +
          (unreachable.length ? ` · fuera: ${unreachable.join(' | ')}` : '') +
          (clipped.length ? ` · cortado: ${clipped.join(' | ')}` : ''),
      );
      await page.close();
    }
  }
} finally {
  await close();
}
process.exit(problems > 0 ? 1 : 0);
