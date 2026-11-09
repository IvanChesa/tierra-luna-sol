// El terminador de Titán (fase 9b, D42; venía de la fase 10) frente a fotos en color natural de Cassini
// (NASA/JPL/Space Science Institute), que se bajan a assets-src/referencias/ (no entran en el repo):
// - PIA06230 (16-04-2005, fase de 56°; la de su color y su halo en la fase 7), con la que se ajustó;
// - PIA06183 («Hazy Days on Titan», 15-02-2005, fase de 20°, «Sun-Titan-spacecraft, or phase, angle of
//   20 degrees» en su pie), la comprobación con otra fase (fase 10, tarea 14): `--foto=PIA06183`.
// - Dos perfiles del brillo lineal a través del disco: a lo largo de la dirección del Sol (de lo
//   iluminado al terminador) y en perpendicular por el centro; con la fase, μ₀ y μ de cada punto.
// - Su ajuste a la fotometría de la escena: Minnaert (k = 0,9, la de la fase 7) por el oscurecimiento
//   hacia el terminador min(1, μ₀/μ)^e, con una escala libre: el e de menor error (el que usa
//   data/photometry.ts) y el error con e = 0 (sin él, el «escalón» de la fase 7).
// - Con `--captura`, los mismos perfiles en la escena (Titán solo, con esa fase y visto desde su
//   ecuador, como measure-titan-halo.mjs) y su error frente a la foto.
// Uso: node scripts/measure-titan-terminator.mjs [--foto=PIA06230|PIA06183] [--captura]
//   (con --captura, antes npm run build)
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BODY_PHOTOMETRY } from '../src/app/data/photometry.ts';
import { reflectance } from '../src/app/ephemeris/photometry.ts';

const PHOTOS = {
  PIA06230: {
    url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia06/pia06230/PIA06230.jpg',
    file: new URL('../assets-src/referencias/PIA06230.jpg', import.meta.url),
    /** El disco (measure-reference-colors.mjs): centro y radio (px). */
    center: [380, 385],
    radius: 272,
    phaseDeg: 56,
  },
  PIA06183: {
    url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia06/pia06183/PIA06183.tif',
    file: new URL('../assets-src/referencias/PIA06183.tif', import.meta.url),
    /**
     * El disco: el radio, del ancho en horizontal (perpendicular al Sol, que llega por abajo) con el
     * brillo por encima del 5–10 % del máximo, 206–200 px; el centro, a un radio del limbo iluminado.
     */
    center: [355, 348],
    radius: 203,
    phaseDeg: 20,
  },
};
const PHOTO_ID = process.argv.find((arg) => arg.startsWith('--foto='))?.slice(7) ?? 'PIA06230';
const PHOTO = PHOTOS[PHOTO_ID];
if (!PHOTO) throw new Error(`No hay foto «${PHOTO_ID}»: ${Object.keys(PHOTOS).join(', ')}`);
const PHASE_DEG = PHOTO.phaseDeg;
/** La captura: el lienzo cuadrado y la fracción de su lado que ocupa el disco (`FRAMING_FILL.body`). */
const SHOT = { width: 640, height: 640 };
const BODY_FILL = 0.46;
/** Los tramos que se ajustan: de −0,9 a 0,45 radios a lo largo del Sol y de −0,9 a 0,9 en perpendicular. */
const ALONG = [-0.9, 0.45];
const ACROSS = [-0.9, 0.9];

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const alpha = (PHASE_DEG * Math.PI) / 180;

/** Los dos perfiles de una imagen (RGB de 8 bits) con su disco: [{ mu0, mu, value }]. */
function profiles({ data, info }, [cx, cy], R) {
  const L = (x, y) => {
    const xi = Math.min(info.width - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(info.height - 1, Math.max(0, Math.round(y)));
    const k = (yi * info.width + xi) * info.channels;
    return 0.2126 * linear(data[k]) + 0.7152 * linear(data[k + 1]) + 0.0722 * linear(data[k + 2]);
  };
  // La dirección del Sol: el centroide del brillo del disco.
  let sx = 0;
  let sy = 0;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > (0.95 * R) ** 2) continue;
      const v = L(x, y);
      sx += v * (x - cx);
      sy += v * (y - cy);
    }
  }
  const n = Math.hypot(sx, sy);
  const [ux, uy] = [sx / n, sy / n];
  // La media en una franja de ±0,05 radios de ancho y ±0,015 de largo alrededor de cada punto.
  const band = (along, across) => {
    let sum = 0;
    let count = 0;
    for (let t = -0.05; t <= 0.0501; t += 0.01) {
      for (let d = -0.015; d <= 0.0151; d += 0.005) {
        const a = along + (across === null ? d : t);
        const b = across === null ? t : across + d;
        sum += L(cx + a * R * ux - b * R * uy, cy + a * R * uy + b * R * ux);
        count++;
      }
    }
    return sum / count;
  };
  const out = [];
  for (let s = ALONG[0]; s <= ALONG[1] + 1e-9; s += 0.04) {
    const mu = Math.sqrt(1 - s * s);
    out.push({ mu0: s * Math.sin(alpha) + mu * Math.cos(alpha), mu, value: band(s, null) });
  }
  for (let t = ACROSS[0]; t <= ACROSS[1] + 1e-9; t += 0.04) {
    const mu = Math.sqrt(1 - t * t);
    out.push({ mu0: mu * Math.cos(alpha), mu, value: band(0, t) });
  }
  return out;
}

/** El error RMS (en fracción del máximo) de un modelo frente a unos perfiles, con una escala libre. */
function fitError(samples, model) {
  const m = samples.map(model);
  const y = samples.map((s) => s.value);
  const a = m.reduce((acc, v, i) => acc + v * y[i], 0) / m.reduce((acc, v) => acc + v * v, 0);
  return (
    Math.sqrt(m.reduce((acc, v, i) => acc + (a * v - y[i]) ** 2, 0) / m.length) / Math.max(...y)
  );
}

async function exists(url) {
  try {
    return (await stat(url)).size > 0;
  } catch {
    return false;
  }
}

if (!(await exists(PHOTO.file))) {
  await mkdir(new URL('./', PHOTO.file), { recursive: true });
  const response = await fetch(PHOTO.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (tierra-luna-sol build)' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${PHOTO.url}`);
  await writeFile(PHOTO.file, new Uint8Array(await response.arrayBuffer()));
}
const photo = profiles(
  await sharp(fileURLToPath(PHOTO.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  PHOTO.center,
  PHOTO.radius,
);
const base = { ...BODY_PHOTOMETRY.titan.photometry, terminatorExponent: 0 };
const withExponent = (e) => (s) =>
  reflectance(s.mu0, s.mu, alpha, { ...base, terminatorExponent: e });
let best = { e: 0, error: fitError(photo, withExponent(0)) };
for (let e = 0.05; e <= 3.0001; e += 0.05) {
  const error = fitError(photo, withExponent(e));
  if (error < best.error) best = { e, error };
}
const used = BODY_PHOTOMETRY.titan.photometry.terminatorExponent ?? 0;
const pct = (x) => `${(100 * x).toFixed(1).replace('.', ',')} %`;
console.log(
  `${PHOTO_ID} (fase de ${PHASE_DEG}°), dos perfiles a través del disco, ${photo.length} puntos:`,
);
console.log(
  `- la fotometría sin oscurecimiento hacia el terminador (e = 0): error ${pct(fitError(photo, withExponent(0)))}`,
);
console.log(
  `- el mejor ajuste: e = ${best.e.toFixed(2).replace('.', ',')}, error ${pct(best.error)}`,
);
console.log(
  `- el de la escena (data/photometry.ts): e = ${String(used).replace('.', ',')}, error ${pct(fitError(photo, withExponent(used)))}`,
);

if (process.argv.includes('--captura')) {
  const { openBrowser, openViewer } = await import('./capture-lib.mjs');
  const { browser, close } = await openBrowser();
  try {
    const query = new URLSearchParams({
      captura: '1',
      aislado: '1',
      cuerpo: 'titan',
      fase: String(PHASE_DEG),
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
    const image = await sharp(Buffer.from(base64, 'base64'))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const radius = (BODY_FILL * Math.min(image.info.width, image.info.height)) / 2;
    const scene = profiles(image, [image.info.width / 2, image.info.height / 2], radius);
    // La escena frente a la foto, punto a punto (con una escala libre).
    const error = fitError(
      scene.map((s, i) => ({ ...s, value: photo[i].value })),
      (s) => scene.find((t) => t.mu0 === s.mu0 && t.mu === s.mu)?.value ?? 0,
    );
    console.log(`- la captura de la escena frente a la foto: error ${pct(error)}`);
  } finally {
    await close();
  }
}
