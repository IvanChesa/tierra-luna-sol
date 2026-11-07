// La recreación de D45 (fase 9b, adenda del 05-11) dentro de `build-textures.mjs`: de un mosaico ya
// cargado y comprobado con sus sondas, sus clases (lo real con detalle, lo visto de lejos y lo no visto),
// la recreación de lo que no es real con la receta de cada luna, la calidad (el grano y el borde, los
// criterios de D45) y la máscara de cada clase para el informe y FUENTES.md.
//
// Lo real no se toca: aquí se comprueba byte a byte antes de comprimir (`assertRealUnchanged`) y, en
// build-textures.mjs, en el WebP ya escrito, frente a lo que se aparta el propio mosaico al comprimirlo.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { classShares, recreationQuality } from './moon-maps.mjs';
import { recipeFor } from './moon-recipes.mjs';
import { recreate } from './moon-recreate.mjs';
import { classifyMosaic } from '../measure-moon-maps.mjs';

const REAL = 0;
const FAR = 1;

/** La semilla de la recreación (determinista; la misma para todas las lunas: sus datos ya difieren). */
export const RECREATION_SEED = 1;

/**
 * Los criterios de D45: el grano de lo recreado frente al de lo real vecino, y el salto del brillo medio
 * en el borde con lo real por encima de su referencia (`recreationQuality`), en su percentil 95 y en su
 * máximo: en el borde con lo no visto, el de bordes ficticios dentro de lo real (lo natural); en el borde
 * con lo visto de lejos, cuyo brillo a gran escala es el real, el mayor de lo natural y del salto que ya
 * tenía el mosaico en ese borde. En las lunas de sombras duras, cualquier borde salta 10 L* por los
 * cráteres: un umbral absoluto de 2 solo lo pasaría el relieve liso.
 */
export const RECREATION_CRITERIA = { grain: [0.7, 1.3], borderDeltaL: 2 };

/** Gris (de 0 a 1, sRGB) de un búfer RGB de 8 bits o de un Float32Array RGB de 0 a 1. */
function grayOf(rgb, pixels, scale) {
  const gray = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    gray[k] = (0.2126 * rgb[3 * k] + 0.7152 * rgb[3 * k + 1] + 0.0722 * rgb[3 * k + 2]) / scale;
  }
  return gray;
}

/** Falla si algún píxel real (clase 0) del mapa recreado no es el del mosaico, canal a canal. */
export function assertRealUnchanged(id, mosaicData, recreatedData, classes) {
  let changed = 0;
  for (let k = 0; k < classes.length; k++) {
    if (classes[k] !== REAL) continue;
    for (let c = 0; c < 3; c++) if (mosaicData[3 * k + c] !== recreatedData[3 * k + c]) changed++;
  }
  if (changed)
    throw new Error(`La recreación de «${id}» ha cambiado ${changed} canales de lo real`);
}

/**
 * Recrea un mosaico (`loadMosaic`, a 2048 × 1024, RGB de 8 bits) con la receta de su luna. Devuelve el
 * mapa nuevo (Buffer RGB), sus clases, la fracción de cada una (real, de lejos y no visto, por el área de
 * la esfera), la calidad antes y después (`recreationQuality`) y un informe. Falla si lo real cambia o si
 * la recreación no cumple los criterios de D45.
 */
export function recreateMosaic(id, mosaic) {
  const { width: W, height: H } = mosaic;
  const pixels = W * H;
  const measured = classifyMosaic(mosaic);
  const { classes, sigmaEff } = measured;
  const rgb = new Float32Array(pixels * 3);
  for (let k = 0; k < rgb.length; k++) rgb[k] = mosaic.data[k] / 255;
  const recipe = recipeFor(id, { rgb, classes, W, H });
  const started = Date.now();
  const result = recreate({ rgb, classes, sigmaEff, W, H, recipe, seed: RECREATION_SEED });
  const seconds = (Date.now() - started) / 1000;
  const data = Buffer.alloc(pixels * 3);
  for (let k = 0; k < data.length; k++) {
    data[k] =
      classes[Math.floor(k / 3)] === REAL
        ? mosaic.data[k]
        : Math.max(0, Math.min(255, Math.round(255 * result.rgb[k])));
  }
  assertRealUnchanged(id, mosaic.data, data, classes);
  const original = grayOf(mosaic.data, pixels, 255);
  const before = recreationQuality(original, classes, W, H, {}, original);
  const after = recreationQuality(grayOf(data, pixels, 255), classes, W, H, {}, original);
  const [real, far, none] = classShares(classes, W, H);
  const pct = (x) => `${(100 * x).toFixed(1).replace('.', ',')} %`;
  const n = (x, d = 2) => x.toFixed(d).replace('.', ',');
  const synthesized = far + none > 0.001;
  if (synthesized) {
    const g = after.grain.ratioNear;
    const [lo, hi] = RECREATION_CRITERIA.grain;
    if (!(g >= lo && g <= hi)) {
      throw new Error(
        `El grano de lo recreado de «${id}» es ${n(g)} veces el de lo real vecino (de ${lo} a ${hi})`,
      );
    }
    // El borde, por separado (`recreationQuality`): con lo no visto, frente a lo natural; con lo visto
    // de lejos, frente al mayor de lo natural y del salto que ya tenía el mosaico en ese borde.
    const { natural, none: noneB, far: farB } = after.border;
    const limit = RECREATION_CRITERIA.borderDeltaL;
    const fails = [];
    if (noneB.excess && (noneB.excess.p95 > limit || noneB.excess.max > limit)) {
      fails.push(
        `con lo no visto, p95 ${n(noneB.p95)} y máximo ${n(noneB.max)}, frente a ${n(natural.p95)} y ${n(natural.max)} de lo natural`,
      );
    }
    if (farB.excess && (farB.excess.p95 > limit || farB.excess.max > limit)) {
      fails.push(
        `con lo visto de lejos, p95 ${n(farB.p95)} y máximo ${n(farB.max)}, frente a ${n(Math.max(natural.p95, farB.original.p95))} y ${n(Math.max(natural.max, farB.original.max))}`,
      );
    }
    if (fails.length) {
      throw new Error(
        `El borde de lo recreado de «${id}» salta más que su referencia (como mucho, ${limit} L* más): ${fails.join('; ')}`,
      );
    }
  }
  const b = after.border;
  const side = (s, ref) =>
    s.tiles > 0 ? `p95 ${n(s.p95)} y máximo ${n(s.max)} (${ref})` : 'sin borde medible';
  const report = synthesized
    ? `${id}: D45, real ${pct(real)}, visto de lejos ${pct(far)}, no visto ${pct(none)}; recreado en ${n(seconds, 0)} s (${result.stats.patches} parches, enfoque ${n(result.stats.sharpen)})${recipe.name ? ` con la receta «${recipe.name}»` : ''}; grano de lo recreado / lo real vecino ${n(after.grain.ratioNear)} (antes ${n(before.grain.ratioNear)}); salto del brillo medio en el borde (ΔL*, σ = 4, por teselas de 64), con lo no visto ${side(b.none, `lo natural, en bordes ficticios dentro de lo real: ${n(b.natural.p95)} y ${n(b.natural.max)}`)} y con lo visto de lejos ${side(b.far, `en el mosaico original: ${n(b.far.original.p95)} y ${n(b.far.original.max)}`)}; lo real, igual byte a byte`
    : `${id}: D45, real ${pct(real)}: nada que recrear`;
  const pick = (s) => (s.tiles > 0 ? { p95: s.p95, max: s.max, tiles: s.tiles } : null);
  const summary = {
    real,
    far,
    none,
    recipe: recipe.name ?? null,
    grain: synthesized ? after.grain.ratioNear : null,
    grainBefore: synthesized ? before.grain.ratioNear : null,
    border: {
      none: synthesized ? pick(b.none) : null,
      far: synthesized ? pick(b.far) : null,
      farOriginal: synthesized && b.far.original?.tiles ? b.far.original : null,
      naturalP95: b.natural?.p95 ?? null,
      naturalMax: b.natural?.max ?? null,
    },
    sharpen: synthesized ? result.stats.sharpen : null,
  };
  return { data, classes, shares: { real, far, none }, before, after, seconds, report, summary };
}

/**
 * La máscara de una luna para el informe (WebP de `width` × `width / 2`): el mapa recreado en gris, con
 * lo visto de lejos teñido de rojo y lo no visto (recreado entero) de azul; lo real, sin tinte.
 */
export async function writeMask(file, data, classes, W, H, width = 1024) {
  const out = Buffer.alloc(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    const v = 0.2126 * data[3 * k] + 0.7152 * data[3 * k + 1] + 0.0722 * data[3 * k + 2];
    const [r, g, b] =
      classes[k] === FAR ? [1, 0.55, 0.5] : classes[k] === REAL ? [1, 1, 1] : [0.5, 0.62, 1];
    out[3 * k] = Math.round(v * r);
    out[3 * k + 1] = Math.round(v * g);
    out[3 * k + 2] = Math.round(v * b);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .resize(width, width / 2, { kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toFile(file instanceof URL ? fileURLToPath(file) : file);
}
