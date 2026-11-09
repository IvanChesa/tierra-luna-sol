// Capturas de las peticiones de Iván del 08-11 (revisión del bloque S), antes y después:
// - S9, «‹ Sistema solar»: la cabecera del explorador con la Tierra elegida, en escritorio (1280 y 1440;
//   en reposo, con el ratón encima y con el foco del teclado) y la franja del móvil (390);
// - S11, la nota bajo «Ver en 3D» de las fichas (la del Sol y la de una luna recreada), a 1280 y a 390;
// - y, de las propuestas de la fase 9b, el rótulo de Saturno en la vista general (a 1440 y a 390).
// Uso: npm run build && node scripts/capture-requests.mjs <antes|despues> [nombre…]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, pageOptions } from './capture-lib.mjs';

const stage = process.argv[2];
if (stage !== 'antes' && stage !== 'despues') {
  throw new Error('Uso: node scripts/capture-requests.mjs <antes|despues> [nombre…]');
}
const wanted = new Set(process.argv.slice(3).filter((arg) => !arg.startsWith('--')));
const dir = new URL('../docs/informes/img/fase-10/', import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(`${stage}-${name}.webp`, dir));
const save = (png, name) => sharp(png).webp({ quality: 90 }).toFile(file(name));

const SIZES = {
  1280: { width: 1280, height: 800, scale: 1 },
  1440: { width: 1440, height: 900, scale: 1 },
  390: { width: 390, height: 844, scale: 2, mobile: true },
};

/** Lo que rodea al botón (px CSS de margen alrededor de su caja y del título, juntos). */
const AROUND = 24;

/** El recorte de la cabecera del explorador: el botón y el título, con aire alrededor. */
async function headerClip(page, mobile) {
  const box = await page.evaluate((isMobile) => {
    const parts = isMobile
      ? [document.querySelector('.site-focus')]
      : [
          document.querySelector('.explorer__intro .explorer__back'),
          document.querySelector('.explorer__intro h1'),
          document.querySelector('tls-view-switcher'),
        ];
    const rects = parts.filter(Boolean).map((el) => el.getBoundingClientRect());
    return {
      left: Math.min(...rects.map((r) => r.left)),
      top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  }, mobile);
  const viewport = page.viewportSize();
  const x = Math.max(0, box.left - AROUND);
  const y = Math.max(0, box.top - AROUND);
  return {
    x,
    y,
    width: Math.min(viewport.width, box.right + AROUND) - x,
    height: Math.min(viewport.height, box.bottom + AROUND) - y,
  };
}

const { browser, close } = await openBrowser(process.argv);
try {
  // S9: la Tierra elegida, como en la captura de Iván.
  if (!wanted.size || wanted.has('volver')) {
    for (const size of ['1280', '1440', '390']) {
      const options = SIZES[size];
      const { page } = await openViewer(browser, '/?captura=1&cuerpo=tierra', options);
      await page.mouse.move(options.width - 5, options.height / 2);
      await page.waitForTimeout(500);
      await save(await page.screenshot(), `volver-${size}`);
      const clip = await headerClip(page, Boolean(options.mobile));
      await save(await page.screenshot({ clip }), `volver-${size}-detalle`);
      if (!options.mobile) {
        // Con el ratón encima y con el foco del teclado (el botón, enfocado como con el tabulador).
        const back = page.locator('.explorer__intro .explorer__back');
        await back.hover();
        await page.waitForTimeout(300);
        await save(await page.screenshot({ clip }), `volver-${size}-encima`);
        // Una tecla antes, para que el foco sea «de teclado» (`:focus-visible`).
        await page.mouse.move(options.width - 5, options.height / 2);
        await page.keyboard.press('Shift');
        await back.focus();
        await page.waitForTimeout(300);
        await save(await page.screenshot({ clip }), `volver-${size}-foco`);
      }
      await page.close();
    }
  }
  // S11: la nota bajo «Ver en 3D», en la ficha del Sol y en la de Oberón (una luna recreada).
  if (!wanted.size || wanted.has('nota')) {
    for (const [name, path] of [
      ['sol', '/sol?captura=1'],
      ['oberon', '/lunas/oberon?captura=1'],
    ]) {
      for (const size of ['1280', '390']) {
        const page = await browser.newPage(pageOptions(SIZES[size]));
        await page.goto(BASE + path);
        await page.waitForSelector('.body__note');
        await page.waitForTimeout(500);
        await save(await page.locator('.body__head').screenshot(), `nota-${name}-${size}`);
        await page.close();
      }
    }
  }
  // El rótulo de Saturno en la vista general (propuesta de la 9b): junto al planeta, no más allá de
  // sus anillos. Con el recorte de Saturno, a partir de su posición en pantalla.
  if (!wanted.size || wanted.has('rotulo')) {
    for (const size of ['1440', '390']) {
      const options = SIZES[size];
      const { page } = await openViewer(browser, '/?captura=1', options);
      await page.mouse.move(options.width - 5, options.height / 2);
      await page.waitForTimeout(500);
      await save(await page.screenshot(), `rotulo-saturno-${size}`);
      const clip = await page.evaluate(() => {
        const label = document.querySelector('[data-body="saturno"]');
        const r = label?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2 - 110, y: r.top - 70, width: 220, height: 160 } : null;
      });
      if (clip) {
        const safe = { ...clip, x: Math.max(0, clip.x), y: Math.max(0, clip.y) };
        await save(await page.screenshot({ clip: safe }), `rotulo-saturno-${size}-detalle`);
      }
      await page.close();
    }
  }
} finally {
  await close();
}
