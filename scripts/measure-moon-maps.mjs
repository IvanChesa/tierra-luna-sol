// D45 (fase 9b): mide los mapas de las lunas a la resolución de su textura de 2k (2048 × 1024, la que
// se ve de cerca): qué parte es real con detalle, cuál se vio solo de lejos y cuál no se vio
// (`scripts/lib/moon-maps.mjs`). Con `--png=<carpeta>`, guarda por luna el mapa con sus clases
// encima (sin tinte: real; rojo: de lejos; azul: sin datos) y el cociente de bandas, para revisarlo.
// Uso: node scripts/measure-moon-maps.mjs [--png=carpeta] [--factor=1,5] [luna…]
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  classShares,
  classify,
  cutoffSigma,
  degradedRatio,
  degradedSigma,
  detailBands,
  percentile,
} from './lib/moon-maps.mjs';
import { loadMosaic } from './usgs-mosaic.mjs';

const SRC = new URL('../assets-src/textures/', import.meta.url);
const WIDTH = 2048;
const HEIGHT = WIDTH / 2;

/** Los mosaicos de las lunas (los de `build-textures.mjs`). */
export const MOON_MOSAICS = {
  fobos: { file: 'Phobos_Viking_Mosaic_40ppd_DLRcontrol.tif' },
  io: { file: 'Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif' },
  europa: { file: 'Europa_Voyager_GalileoSSI_global_mosaic_500m.tif' },
  ganimedes: { file: 'Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif' },
  calisto: { file: 'Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif' },
  mimas: { file: 'SM_1M_0_0_SIMP.IMG' },
  encelado: { file: 'Enceladus_Cassini_mosaic_global_110m.tif' },
  tetis: { file: 'Tethys_Cassini_mosaic_global_293m.tif' },
  dione: { file: 'Dione_Cassini_Voyager_mosaic_global_154m.tif' },
  rea: { file: 'Rhea_Cassini_Voyager_mosaic_global_417m.tif' },
  japeto: { file: 'Iapetus_Cassini_Voyager_mosaic_global_783m.tif' },
  triton: { file: 'Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif', band: 0 },
  // Los mapas del JPL (fase 9b), con la convención de build-textures.mjs (`JPL_MAP`).
  deimos: {
    file: 'mar2kuu2.tif',
    plain: { leftEdgeEastDeg: -180, eastward: true, background: { above: 165, blurPx: 8 } },
  },
  miranda: { file: 'ura5vuu2.tif', plain: { leftEdgeEastDeg: -180, eastward: true } },
  ariel: { file: 'ura1vuu2.tif', plain: { leftEdgeEastDeg: -180, eastward: true } },
  umbriel: { file: 'ura2vuu2.tif', plain: { leftEdgeEastDeg: -180, eastward: true } },
  titania: { file: 'ura3vuu2.tif', plain: { leftEdgeEastDeg: -180, eastward: true } },
  oberon: { file: 'ura4vuu2.tif', plain: { leftEdgeEastDeg: -180, eastward: true } },
};

/**
 * El umbral de lo visto de lejos, calibrado en cada luna: el cociente de bandas de lo más nítido de su
 * mapa (por encima de su percentil 75, entre ±60° de latitud) degradado `FAR_FACTOR` veces, como si se
 * hubiera fotografiado con una resolución 1,5 veces más gruesa que el texel de 2k. Lo que tiene menos
 * detalle fino que eso se vio de lejos. (Con 1,5 y no con 1: el detalle fino cambia algo con el tipo de
 * terreno, y un umbral pegado al texel marcaría como «de lejos» llanuras lisas fotografiadas de cerca.)
 */
export const FAR_FACTOR = 1.5;

/**
 * El umbral de la σ por octavas (`cutoffSigma`), calibrado igual: la mediana de la σ de lo más nítido
 * degradado `SIGMA_FACTOR` veces (en Tritón, Europa y Jápeto, 1,2 texeles). Con 3 y no con 1,5: la σ
 * solo hace falta donde el cociente de bandas se engaña con el ruido (lo muy blando, como el limbo de
 * las imágenes de la Voyager), y con un umbral bajo marcaría terrenos nítidos poco contrastados.
 */
export const SIGMA_FACTOR = 3;

const args = process.argv.slice(2);
const pngDir = args.find((a) => a.startsWith('--png='))?.slice(6);
const factor = Number(
  args
    .find((a) => a.startsWith('--factor='))
    ?.slice(9)
    .replace(',', '.') ?? FAR_FACTOR,
);
const wanted = args.filter((a) => !a.startsWith('--'));

/** Mide una luna: su mapa en gris a 2048 px, sus clases, sus porcentajes y la calibración. */
export async function measureMoon(id, spec, farFactor = FAR_FACTOR) {
  const mosaic = await loadMosaic(new URL(spec.file, SRC), WIDTH, {
    band: spec.band,
    plain: spec.plain,
  });
  return { id, ...classifyMosaic(mosaic, farFactor) };
}

/**
 * Las clases de un mosaico ya cargado (`loadMosaic`, a 2048 × 1024): lo real con detalle, lo visto de
 * lejos y lo no visto, con la calibración de cada luna (lo usa también `build-textures.mjs`, D45).
 */
export function classifyMosaic(mosaic, farFactor = FAR_FACTOR) {
  if (mosaic.width !== WIDTH || mosaic.height !== HEIGHT) {
    throw new Error(
      `Las clases se miden en el mapa de ${WIDTH} × ${HEIGHT}, no de ${mosaic.width} × ${mosaic.height}`,
    );
  }
  const gray = new Float32Array(WIDTH * HEIGHT);
  for (let k = 0; k < gray.length; k++) {
    const r = mosaic.data[3 * k];
    const g = mosaic.data[3 * k + 1];
    const b = mosaic.data[3 * k + 2];
    gray[k] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  const { ratio } = detailBands(gray, WIDTH, HEIGHT);
  // La referencia: donde hay datos y entre ±60° de latitud (los polos de un mapa equirrectangular se
  // estiran en longitud, y su banda fina se mide peor).
  const reference = new Uint8Array(gray.length);
  for (let j = 0; j < HEIGHT; j++) {
    const lat = 90 - ((j + 0.5) / HEIGHT) * 180;
    if (Math.abs(lat) > 60) continue;
    for (let i = 0; i < WIDTH; i++) {
      const k = j * WIDTH + i;
      reference[k] = mosaic.coverage[k] >= 0.95 ? 1 : 0;
    }
  }
  const p75 = percentile(ratio, reference, 0.75);
  const sharpMask = new Uint8Array(gray.length);
  for (let k = 0; k < gray.length; k++) sharpMask[k] = reference[k] && ratio[k] >= p75 ? 1 : 0;
  const sharp = percentile(ratio, sharpMask, 0.5);
  const threshold = degradedRatio(gray, WIDTH, HEIGHT, sharpMask, farFactor);
  const twice = degradedRatio(gray, WIDTH, HEIGHT, sharpMask, 2);
  // La resolución de origen de cada texel, por octavas (`cutoffSigma`), y su umbral, calibrado igual.
  const { sigma: sigmaEff, reference: bands } = cutoffSigma(gray, WIDTH, HEIGHT, { sharpMask });
  const sigmaThreshold = degradedSigma(gray, WIDTH, HEIGHT, sharpMask, bands, SIGMA_FACTOR);
  const classes = classify(mosaic.coverage, ratio, sigmaEff, WIDTH, HEIGHT, {
    threshold,
    sigmaThreshold,
  });
  const [real, far, none] = classShares(classes, WIDTH, HEIGHT);
  return {
    gray,
    ratio,
    classes,
    coverage: mosaic.coverage,
    data: mosaic.data,
    sharp,
    threshold,
    twice,
    sigmaEff,
    sigmaThreshold,
    real,
    far,
    none,
  };
}

async function savePng(dir, result) {
  const { id, gray, ratio, classes } = result;
  const overlay = Buffer.alloc(WIDTH * HEIGHT * 3);
  const heat = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let k = 0; k < gray.length; k++) {
    const v = Math.round(255 * gray[k]);
    const [r, g, b] =
      classes[k] === 2 ? [0.4, 0.5, 1] : classes[k] === 1 ? [1, 0.45, 0.4] : [1, 1, 1];
    overlay[3 * k] = Math.round(v * r);
    overlay[3 * k + 1] = Math.round(v * g);
    overlay[3 * k + 2] = Math.round(v * b);
    const h = Math.min(255, Math.round((255 * ratio[k]) / (result.sharp * 1.2)));
    heat[3 * k] = heat[3 * k + 1] = heat[3 * k + 2] = h;
  }
  const raw = { raw: { width: WIDTH, height: HEIGHT, channels: 3 } };
  await sharp(overlay, raw)
    .png()
    .toFile(join(dir, `${id}-clases.png`));
  await sharp(heat, raw)
    .resize(1024, 512)
    .png()
    .toFile(join(dir, `${id}-cociente.png`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (pngDir) await mkdir(pngDir, { recursive: true });
  console.log(
    'luna        real   de lejos  sin datos   (cociente: nítido · ×1,5 [umbral] · ×2; σ: umbral)',
  );
  for (const [id, spec] of Object.entries(MOON_MOSAICS)) {
    if (wanted.length && !wanted.includes(id)) continue;
    const result = await measureMoon(id, spec, factor);
    const pct = (x) => `${(100 * x).toFixed(1).padStart(5)} %`;
    console.log(
      `${id.padEnd(10)} ${pct(result.real)} ${pct(result.far)} ${pct(result.none)}   (${result.sharp.toFixed(3)} · ${result.threshold.toFixed(3)} · ${result.twice.toFixed(3)}; ${result.sigmaThreshold.toFixed(2)})`,
    );
    if (pngDir) await savePng(pngDir, result);
  }
}
