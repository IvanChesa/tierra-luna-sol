// Capturas de las peticiones de Iván del 08-11 (revisión del bloque S), antes y después:
// - S9, «‹ Sistema solar»: la cabecera del explorador con la Tierra elegida, en escritorio (1280 y 1440;
//   en reposo, con el ratón encima y con el foco del teclado) y la franja del móvil (390);
// - S11, la nota bajo «Ver en 3D» de las fichas (la del Sol y la de una luna recreada), a 1280 y a 390;
// - de las propuestas de la fase 9b, el rótulo de Saturno en la vista general (a 1440 y a 390);
// - y, de las de la fase 8 (sugerencias 14 y 15 de su revisión), la luz del cielo desde España (de
//   día, la franja del horizonte del lado del Sol; el disco del Sol al ponerse; y un eclipse, parcial
//   y total) y «Ver en 3D» del eclipse del 12-08-2026 (en el máximo desde Fraga, a la puesta, y en el
//   máximo global).
// Uso: npm run build && node scripts/capture-requests.mjs <antes|despues> [nombre…]
// (nombres: volver, nota, rotulo, cielo y sombra; sin ninguno, todos)
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

/** Los píxeles del lienzo (`engine.capture()`), sin la interfaz. */
async function canvasPng(page) {
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  return Buffer.from(base64, 'base64');
}

/** [nombre, ruta] de las capturas del cielo (solo el lienzo, a 1600 × 900). */
const SKY_SHOTS = [
  // El mediodía del 1-11-2026 hacia el sur (la captura de día de la fase 8) y el del 21-06, el Sol a 71°.
  ['cielo-dia', '/cielo?captura=1&fecha=2026-11-01T11:30Z&rumbo=180&altura=25&campo=70'],
  ['cielo-verano', '/cielo?captura=1&fecha=2026-06-21T11:50Z&rumbo=173.6&altura=35&campo=70'],
  // La puesta del 1-11-2026: el Sol a 1,4° (de lejos) y a 3,1° (de cerca, con el campo de 8°).
  ['cielo-puesta', '/cielo?captura=1&fecha=2026-11-01T16:40Z&rumbo=240&altura=8&campo=40'],
  ['cielo-puesta-cerca', '/cielo?captura=1&fecha=2026-11-01T16:30Z&rumbo=247.4&altura=3&campo=8'],
  // El eclipse del 12-08-2026 desde Fraga: parcial a las 18:20 UTC y total en el máximo.
  [
    'cielo-eclipse-parcial',
    '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:20Z&rumbo=284&altura=6.6&campo=3',
  ],
  [
    'cielo-eclipse-total',
    '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:29:29Z&rumbo=285.33&altura=5.19&campo=3',
  ],
];

/** [nombre, ruta] de «Ver en 3D» del eclipse del 12-08-2026 (solo el lienzo, a 1600 × 900). */
const SHADOW_SHOTS = [
  ['sombra-fraga', '/explorar/tierra?captura=1&fecha=2026-08-12T18:29:29Z&sombra=1'],
  ['sombra-maximo', '/explorar/tierra?captura=1&fecha=2026-08-12T17:45:51Z&sombra=1'],
];

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
  // La luz del cielo y «Ver en 3D» de un eclipse de Sol (propuestas de la fase 8).
  for (const [group, shots] of [
    ['cielo', SKY_SHOTS],
    ['sombra', SHADOW_SHOTS],
  ]) {
    if (wanted.size && !wanted.has(group)) continue;
    for (const [name, path] of shots) {
      const { page } = await openViewer(browser, path, { width: 1600, height: 900, scale: 1 });
      await save(await canvasPng(page), name);
      await page.close();
    }
  }
} finally {
  await close();
}
