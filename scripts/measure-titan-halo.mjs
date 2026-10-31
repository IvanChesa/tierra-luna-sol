// El halo de Titán frente a la foto en color natural de Cassini PIA06230 (fase 7; NASA/JPL/Space
// Science Institute, 16-04-2005, fase de 56°): Titán solo (`aislado=1`), con esa fase y visto desde
// su ecuador, y el brillo en coronas del lado iluminado, en RGB lineal y respecto al borde del disco
// (de 0,85 a 0,95 radios). En la foto (medido con este mismo método; la foto no entra en el repo):
// - de 1,00 a 1,02 radios: 0,060 del borde, cromaticidad 1,01/1,04/0,62 (el borde, algo borroso);
// - de 1,02 a 1,05: 0,010, cromaticidad 0,97/1,02/0,85;
// - de 1,05 a 1,10: 0,001.
// Uso: npm run build && node scripts/measure-titan-halo.mjs [--swiftshader]
import sharp from 'sharp';
import { openBrowser, openViewer } from './capture-lib.mjs';

/** El lienzo cuadrado y la fracción de su lado que ocupa el disco (`FRAMING_FILL.body`). */
const SHOT = { width: 640, height: 640 };
const BODY_FILL = 0.46;
const RINGS = [
  [0.85, 0.95],
  [1.0, 1.02],
  [1.02, 1.05],
  [1.05, 1.1],
];
const PHOTO = { '1–1.02': 0.06, '1.02–1.05': 0.01, '1.05–1.1': 0.001 };

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const { browser, close } = await openBrowser();
try {
  const query = new URLSearchParams({
    captura: '1',
    aislado: '1',
    cuerpo: 'titan',
    fase: '56',
    latitud: '0',
    sobre: 'ecliptica',
  });
  const { page } = await openViewer(browser, `/?${query}`, SHOT);
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  await page.close();
  const { data, info } = await sharp(Buffer.from(base64, 'base64'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cx = info.width / 2;
  const cy = info.height / 2;
  const radius = (BODY_FILL * Math.min(info.width, info.height)) / 2;
  // El lado iluminado: el del Sol en la captura (el de más brillo del borde), por cuadrantes.
  const sideBrightness = (sign) => {
    let sum = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        if (d < 0.85 || d > 0.95 || Math.sign(x - cx) !== sign) continue;
        const k = (y * info.width + x) * info.channels;
        sum += data[k] + data[k + 1] + data[k + 2];
      }
    }
    return sum;
  };
  const lit = sideBrightness(-1) > sideBrightness(1) ? -1 : 1;
  const ring = (r0, r1) => {
    const rgb = [0, 0, 0];
    let n = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        // El lado iluminado, sin la franja del terminador (|x − cx| > 0,3 radios).
        if (d < r0 || d > r1 || lit * (x - cx) < 0.3 * radius) continue;
        const k = (y * info.width + x) * info.channels;
        for (let c = 0; c < 3; c++) rgb[c] += linear(data[k + c]);
        n++;
      }
    }
    const mean = rgb.map((v) => v / n);
    const luminance = 0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2];
    return { mean, luminance };
  };
  // El fondo del lienzo (#0d1321) no es negro como el de la foto: se resta, medido lejos del halo.
  const background = ring(1.5, 2);
  const edge = ring(...RINGS[0]);
  console.log(
    `Borde del disco (0,85–0,95 radios): luminancia ${edge.luminance.toFixed(4)}; fondo ${background.luminance.toFixed(4)}`,
  );
  for (const [r0, r1] of RINGS.slice(1)) {
    const { mean } = ring(r0, r1);
    const own = mean.map((v, c) => Math.max(v - background.mean[c], 0));
    const luminance = 0.2126 * own[0] + 0.7152 * own[1] + 0.0722 * own[2];
    const key = `${r0}–${r1}`;
    console.log(
      `${key} radios: ${(luminance / edge.luminance).toFixed(4)} del borde (foto: ${PHOTO[key]}), cromaticidad ${own.map((v) => (v / Math.max(luminance, 1e-9)).toFixed(2)).join('/')}`,
    );
  }
} finally {
  await close();
}
