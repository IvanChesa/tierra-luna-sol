// La recreación de D45 (fase 9b, adenda del 05-11) dentro de `build-textures.mjs`: de un mosaico ya
// cargado y comprobado con sus sondas, sus clases (lo real con detalle, lo visto de lejos y lo no visto),
// la recreación de lo que no es real con la receta de cada luna, la calidad (el grano y el borde, los
// criterios de D45) y la máscara de cada clase para el informe y FUENTES.md.
//
// Lo real no se toca: aquí se comprueba byte a byte antes de comprimir (`assertRealUnchanged`) y, en
// build-textures.mjs, en el WebP ya escrito, frente a lo que se aparta el propio mosaico al comprimirlo.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  borderSteps,
  boxBlur,
  classShares,
  distanceTo,
  gaussianBlur,
  grainRatio,
  lightness,
  lowPassContrast,
  naturalSteps,
  recreationQuality,
  stepSummary,
} from './moon-maps.mjs';
import { bandedTerrain, coronaLayer, craterLayer, spotPopulation } from './moon-craters.mjs';
import {
  GRAZING,
  SEAM,
  TERMINATOR,
  correctGrazing,
  grazingClasses,
  terminatorProfile,
} from './moon-grazing.mjs';
import { recipeFor } from './moon-recipes.mjs';
import { recreate } from './moon-recreate.mjs';
import { classifyMosaic } from '../measure-moon-maps.mjs';

const REAL = 0;
const FAR = 1;
const NONE = 2;

/**
 * D48: la escala del brillo medio en el borde con lo real (σ, texeles de 2k: 16, unos 2,8°), la de la
 * franja oscura del terminador que había que quitar; y el fundido de la corrección hacia dentro de lo
 * recreado (hasta `BORDER_MEAN.fade` × σ).
 */
export const BORDER_MEAN = { sigma: 16, fade: 4 };

/**
 * Las escalas de la mezcla multibanda del borde (D45, regla 4; D48): la de `BORDER_MEAN` y una fina, la
 * de la medida del salto fino (σ = 4 texeles), para que tampoco quede una línea donde el borde es recto.
 */
export const BORDER_BANDS = [BORDER_MEAN, { sigma: 4, fade: 3 }];

/**
 * Las pasadas de la mezcla: cada escala corrige lo suyo y mueve un poco la otra (la fina, lo que cubre de
 * la ancha), así que se repiten hasta que las dos quedan iguales a la vez.
 */
export const BORDER_ROUNDS = 3;

/**
 * D48: la resolución de origen que se da a la franja del terminador en la síntesis (σ, px de 2k), para que
 * lo recreado conserve el brillo de lo corregido por encima de unos 12 px (`keepSigma`, 1,5 × σ) y ponga
 * el detalle de los parches por debajo: sin las sombras de la luz rasante, que son más finas.
 */
export const TERMINATOR_SIGMA = 8;

/** La semilla de la recreación (determinista; la misma para todas las lunas: sus datos ya difieren). */
export const RECREATION_SEED = 1;

/**
 * Los criterios de D45 y D48 (entrega 10.a): el grano de lo recreado frente al de lo real vecino; el salto
 * fino en el borde con lo real intacto, por encima de lo natural (bordes ficticios dentro de lo real), en
 * su percentil 95 y en su máximo (con lo visto de lejos, cuyo brillo a gran escala es el real, por encima
 * del mayor de lo natural y del salto que ya tenía el mosaico en ese borde); el brillo medio a varios
 * grados, en absoluto; y el contraste a gran escala de lo no visto. En las lunas de sombras duras,
 * cualquier borde salta 10 L* por los cráteres a la escala fina: ahí el criterio es relativo.
 */
export const RECREATION_CRITERIA = {
  grain: [0.7, 1.3],
  // D48: el salto fino (σ = 4 texeles), como mucho 2 L* por encima de lo natural (hace fallar el build).
  fineSigma: 4,
  fineExcess: 2,
  // D48: el brillo medio a la escala de varios grados (`BORDER_MEAN`, σ = 16 texeles, 2,8°), ΔL* ≤ 2 en
  // el percentil 95, en el borde con lo que pone la recreación (lo no visto y lo real con luz rasante).
  meanSigma: 16,
  meanDeltaL: 2,
  // D48: el contraste a gran escala de lo no visto (σ de su L* a 8 texeles), del 70 al 130 % del de lo
  // real, en las lunas de Urano.
  contrastSigma: 8,
  contrast: [0.7, 1.3],
};

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
 * Recrea un mosaico (`loadMosaic`, a 2048 × 1024, RGB de 8 bits) con la receta de su luna, antes de
 * cualquier calibración que cambie su contraste (la dicotomía de Jápeto va después: lo real o lo visto
 * de lejos es cosa de la resolución de origen, no del brillo). Con D48 (entrega 10.a), primero lo real
 * con luz rasante (moon-grazing.mjs): su clase, su corrección y, en la franja del terminador, el fundido
 * hacia lo recreado. Devuelve el mapa nuevo (Buffer RGB), sus clases (0 real, 1 de lejos, 2 no visto, 3
 * real con luz rasante), la fracción de cada una (por el área de la esfera), la calidad antes y después
 * (`recreationQuality`) y un informe. Falla (con `check`) si lo real cambia o si la recreación no cumple
 * los criterios.
 */
export function recreateMosaic(id, mosaic, { check = true } = {}) {
  const { width: W, height: H } = mosaic;
  const pixels = W * H;
  const measured = classifyMosaic(mosaic);
  const { sigmaEff } = measured;
  const rgb = new Float32Array(pixels * 3);
  for (let k = 0; k < rgb.length; k++) rgb[k] = mosaic.data[k] / 255;
  const recipe = recipeFor(id, { rgb, classes: measured.classes, W, H });
  // D48: lo real con luz rasante, con su clase y su corrección.
  const profile = recipe.terminator ? terminatorProfile(rgb, measured.classes, W, H) : null;
  const grazing = grazingClasses(measured.classes, W, H, {
    widthDeg: profile?.widthDeg ?? 0,
    seam: recipe.seam ?? false,
  });
  const { classes, kind } = grazing;
  const corrected = correctGrazing(rgb, grazing, W, H);
  // Para la síntesis: la franja del terminador, como lo visto de lejos (su brillo a gran escala, el
  // corregido; el detalle, de los parches); la unión de 180°, fija como lo real. Ninguna es origen.
  const synthClasses = Uint8Array.from(classes, (c, k) =>
    c !== GRAZING ? c : kind[k] === TERMINATOR ? FAR : REAL,
  );
  const exclude = Uint8Array.from(classes, (c) => (c === GRAZING ? 1 : 0));
  const synthSigma = Float32Array.from(sigmaEff, (s, k) =>
    kind[k] === TERMINATOR ? TERMINATOR_SIGMA : s,
  );
  const started = Date.now();
  const result = recreate({
    rgb: corrected.rgb,
    classes: synthClasses,
    sigmaEff: synthSigma,
    W,
    H,
    recipe,
    seed: RECREATION_SEED,
    exclude,
    params: recipe.synthesis ?? {},
  });
  const seconds = (Date.now() - started) / 1000;
  // El mapa final (sRGB de 0 a 1): lo real, el mosaico; la unión de 180°, lo corregido; la franja del
  // terminador, el fundido de lo corregido con lo recreado; lo demás, lo recreado.
  const final = new Float32Array(pixels * 3);
  for (let k = 0; k < pixels; k++) {
    for (let c = 0; c < 3; c++) {
      const i = 3 * k + c;
      if (classes[k] === REAL) final[i] = rgb[i];
      else if (kind[k] === SEAM) final[i] = corrected.rgb[i];
      else if (kind[k] === TERMINATOR) {
        const w = corrected.realWeight[k];
        final[i] = w * corrected.rgb[i] + (1 - w) * result.rgb[i];
      } else final[i] = result.rgb[i];
    }
  }
  // D48: los cráteres de lo no visto (moon-craters.mjs) y la misma media a gran escala junto a lo real.
  const craters = recipe.craters
    ? addCraters(final, rgb, classes, kind, corrected.realWeight, W, H, recipe.craters)
    : null;
  // La mezcla del borde y el grano, en las lunas de D48 y en las que tienen mucho sin ver (Tritón, Deimos).
  const noneShare = classShares(classes, W, H)[2];
  const blend = recipe.terminator || recipe.craters || noneShare > 0.02;
  if (blend) {
    for (let round = 0; round < BORDER_ROUNDS; round++) {
      for (const band of BORDER_BANDS) matchBorderMean(final, classes, kind, W, H, band);
    }
  }
  // El grano de lo recreado junto a lo real, al de lo real (D45), después de todo lo de D48.
  const grainAmount = blend ? calibrateGrain(final, classes, kind, W, H) : 0;
  const data = Buffer.alloc(pixels * 3);
  for (let k = 0; k < pixels; k++) {
    for (let c = 0; c < 3; c++) {
      const i = 3 * k + c;
      data[i] =
        classes[k] === REAL
          ? mosaic.data[i]
          : Math.max(0, Math.min(255, Math.round(255 * final[i])));
    }
  }
  assertRealUnchanged(id, mosaic.data, data, classes);
  const original = grayOf(mosaic.data, pixels, 255);
  const before = recreationQuality(original, classes, W, H, {}, original);
  const after = recreationQuality(grayOf(data, pixels, 255), classes, W, H, {}, original);
  const [real, far, none, grazed] = classShares(classes, W, H);
  const pct = (x) => `${(100 * x).toFixed(1).replace('.', ',')} %`;
  const n = (x, d = 2) => x.toFixed(d).replace('.', ',');
  const synthesized = far + none + grazed > 0.001;
  // D48: el borde de lo real (la clase 0, intacta) con cada clase, a la escala fina y a la del brillo
  // medio, y lo natural a esas escalas; y el contraste a gran escala de lo no visto.
  const d48 = synthesized ? qualityD48(data, mosaic.data, classes, W, H) : null;
  const fails = [];
  if (synthesized) {
    const g = after.grain.ratioNear;
    const [lo, hi] = RECREATION_CRITERIA.grain;
    if (!(g >= lo && g <= hi)) {
      fails.push(
        `el grano de lo recreado es ${n(g)} veces el de lo real vecino (de ${lo} a ${hi})`,
      );
    }
    // El salto fino: como mucho `fineExcess` L* por encima de lo natural (con lo visto de lejos, del
    // mayor de lo natural y del salto que ya tenía el mosaico en ese borde), en el p95 y en el máximo.
    const nat = d48.natural.fine;
    for (const [name, border] of Object.entries(d48.borders)) {
      const f = border.fine;
      if (!f.tiles) continue;
      const refP95 = name === 'far' ? Math.max(nat.p95, border.original.p95) : nat.p95;
      const refMax = name === 'far' ? Math.max(nat.max, border.original.max) : nat.max;
      const limit = RECREATION_CRITERIA.fineExcess;
      if (f.p95 > refP95 + limit || f.max > refMax + limit) {
        fails.push(
          `el borde fino con ${BORDER_NAMES[name]} salta p95 ${n(f.p95)} y máximo ${n(f.max)}, frente a ${n(refP95)} y ${n(refMax)} de referencia (como mucho, ${limit} L* más)`,
        );
      }
    }
  }
  if (fails.length && check) {
    throw new Error(`La recreación de «${id}» no cumple: ${fails.join('; ')}`);
  }
  // Lo que se mide y se da (no hace fallar el build): el brillo medio a 2,8° y el contraste.
  const warnings = [];
  if (d48) {
    for (const name of ['none', 'grazing']) {
      const m = d48.borders[name].mean;
      if (m.tiles && m.p95 > RECREATION_CRITERIA.meanDeltaL) {
        warnings.push(
          `el brillo medio en el borde con ${BORDER_NAMES[name]} salta p95 ${n(m.p95)} (más de ${RECREATION_CRITERIA.meanDeltaL})`,
        );
      }
    }
    if (recipe.craters && recipe.terminator) {
      const [clo, chi] = RECREATION_CRITERIA.contrast;
      if (!(d48.contrast.ratio >= clo && d48.contrast.ratio <= chi)) {
        warnings.push(
          `el contraste a gran escala de lo no visto es ${n(d48.contrast.ratio)} del de lo real`,
        );
      }
    }
  }
  const side = (s) => (s.tiles ? `p95 ${n(s.p95)} · máx. ${n(s.max)} (${s.tiles} teselas)` : '—');
  const grazingNote = grazed
    ? `; real con luz rasante ${pct(grazed)} (${profile?.widthDeg ? `la franja del terminador, de ${n(profile.widthDeg, 1)}°` : 'sin franja del terminador'}${recipe.seam ? ' y la unión de 180°' : ''})`
    : '';
  const bordersText = d48
    ? Object.entries(d48.borders)
        .filter(([, border]) => border.fine.tiles || border.mean.tiles)
        .map(
          ([name, border]) =>
            `con ${BORDER_NAMES[name]}, fino ${side(border.fine)} y medio ${side(border.mean)}`,
        )
        .join('; ')
    : '';
  const report = synthesized
    ? `${id}: D45 y D48, real ${pct(real)}, visto de lejos ${pct(far)}, no visto ${pct(none)}${grazingNote}; recreado en ${n(seconds, 0)} s (${result.stats.patches} parches, enfoque ${n(result.stats.sharpen)}, grano ${n(grainAmount)})${recipe.name ? ` con la receta «${recipe.name}»` : ''}${craters ? `; ${craters.count} cráteres (factor ${n(craters.gain)})${craters.coronae ? ` y ${craters.coronae.units.length} coronas` : ''}` : ''}; grano de lo recreado / lo real vecino ${n(after.grain.ratioNear)} (antes ${n(before.grain.ratioNear)}); el borde con lo real (ΔL*, por teselas de 64; fino, σ = ${RECREATION_CRITERIA.fineSigma}; medio, σ = ${RECREATION_CRITERIA.meanSigma}): ${bordersText}; lo natural, fino ${side(d48.natural.fine)} y medio ${side(d48.natural.mean)}; contraste a gran escala de lo no visto / lo real ${d48.contrast.ratio ? n(d48.contrast.ratio) : '—'}; lo real, igual byte a byte${warnings.length ? `. AVISO: ${warnings.join('; ')}` : ''}${fails.length ? `. NO CUMPLE: ${fails.join('; ')}` : ''}`
    : `${id}: D45, real ${pct(real)}: nada que recrear`;
  const pick = (s) => (s?.tiles > 0 ? { p95: s.p95, max: s.max, tiles: s.tiles } : null);
  const summary = {
    real,
    far,
    none,
    grazing: grazed,
    terminatorDeg: profile?.widthDeg ?? null,
    recipe: recipe.name ?? null,
    grain: synthesized ? after.grain.ratioNear : null,
    grainBefore: synthesized ? before.grain.ratioNear : null,
    border: d48
      ? Object.fromEntries(
          Object.entries(d48.borders).map(([name, border]) => [
            name,
            {
              fine: pick(border.fine),
              mean: pick(border.mean),
              original: pick(border.original),
            },
          ]),
        )
      : null,
    natural: d48 ? { fine: pick(d48.natural.fine), mean: pick(d48.natural.mean) } : null,
    contrast: d48?.contrast ?? null,
    craters: craters
      ? {
          count: craters.count,
          gain: craters.gain,
          coronae: craters.coronae
            ? {
                wavelength: craters.coronae.banded.wavelength,
                amplitude: craters.coronae.banded.amplitude,
                units: craters.coronae.units,
              }
            : null,
        }
      : null,
    capEdge: recipe.capEdge
      ? {
          southLat: recipe.capEdge.southLat,
          southColumns: recipe.capEdge.southColumns,
          transitionDeg: recipe.capEdge.transitionDeg,
          reference: recipe.capEdge.reference,
          generated: recipe.capEdge.generated,
        }
      : null,
    sharpen: synthesized ? result.stats.sharpen : null,
    grainAmount,
    warnings,
    fails,
  };
  return {
    data,
    classes,
    kind,
    shares: { real, far, none, grazing: grazed },
    profile,
    craters,
    corrected,
    synthesis: result,
    before,
    after,
    seconds,
    report,
    summary,
  };
}

/** Los nombres de cada clase en el borde con lo real, para los informes. */
const BORDER_NAMES = {
  none: 'lo no visto',
  far: 'lo visto de lejos',
  grazing: 'lo real con luz rasante',
};

/**
 * Las medidas de D48 de un mapa recreado (`data`, RGB de 8 bits) frente al mosaico (`reference`): el borde
 * de lo real intacto (la clase 0) con cada clase (lo no visto, lo visto de lejos y lo real con luz
 * rasante) a la escala fina (σ = `fineSigma`, el criterio relativo) y a la del brillo medio (σ =
 * `meanSigma`, el absoluto), con su número de teselas; con lo visto de lejos, también el salto que ya
 * tenía el mosaico; lo natural (bordes ficticios dentro de lo real intacto) a las dos escalas; y el
 * contraste a gran escala de lo no visto frente al de lo real (`lowPassContrast`, σ = `contrastSigma`,
 * entre ±60°).
 */
function qualityD48(data, reference, classes, W, H) {
  const pixels = W * H;
  const L = lightnessMap(
    Float32Array.from(data, (v) => v / 255),
    pixels,
  );
  const L0 = lightnessMap(
    Float32Array.from(reference, (v) => v / 255),
    pixels,
  );
  const real = Uint8Array.from(classes, (c) => (c === REAL ? 1 : 0));
  const masks = {
    none: Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0)),
    far: Uint8Array.from(classes, (c) => (c === FAR ? 1 : 0)),
    grazing: Uint8Array.from(classes, (c) => (c === GRAZING ? 1 : 0)),
  };
  const { fineSigma, meanSigma, contrastSigma } = RECREATION_CRITERIA;
  const borders = {};
  for (const [name, mask] of Object.entries(masks)) {
    const any = mask.some((v) => v);
    const empty = { tiles: 0, median: 0, p95: 0, max: 0 };
    borders[name] = {
      fine: any ? stepSummary(borderSteps(L, real, mask, W, H, { sigma: fineSigma })) : empty,
      mean: any ? stepSummary(borderSteps(L, real, mask, W, H, { sigma: meanSigma })) : empty,
      original:
        any && name === 'far'
          ? stepSummary(borderSteps(L0, real, mask, W, H, { sigma: fineSigma }))
          : empty,
    };
  }
  const natural = {
    fine: stepSummary(naturalSteps(L, real, W, H, { sigma: fineSigma })),
    mean: stepSummary(naturalSteps(L, real, W, H, { sigma: meanSigma })),
  };
  const realC = lowPassContrast(L, real, W, H, { sigma: contrastSigma, maxLat: 60 });
  const noneC = lowPassContrast(L, masks.none, W, H, { sigma: contrastSigma, maxLat: 60 });
  const contrast = {
    real: realC.sigma,
    none: noneC.sigma,
    ratio: noneC.area > 0 && realC.sigma > 0 ? noneC.sigma / realC.sigma : null,
  };
  return { borders, natural, contrast };
}

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => {
  const c = Math.min(Math.max(v, 0), 1);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
/** La luminancia lineal de un L*. */
const yOfLightness = (L) => {
  const f = (Math.min(Math.max(L, 0), 100) + 16) / 116;
  return f ** 3 > 216 / 24389 ? f ** 3 : (116 * f - 16) / (24389 / 27);
};
/** El L* de cada píxel de un mapa RGB en coma flotante (sRGB de 0 a 1). */
function lightnessMap(rgb, pixels) {
  const L = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    L[k] = lightness(0.2126 * rgb[3 * k] + 0.7152 * rgb[3 * k + 1] + 0.0722 * rgb[3 * k + 2]);
  }
  return L;
}
/** Lleva el píxel `k` de `rgb` (sRGB de 0 a 1) de su L* a `L`, con el mismo tono (en luz lineal). */
function setLightness(rgb, k, from, to) {
  const ratio = yOfLightness(to) / Math.max(yOfLightness(from), 1e-6);
  for (let c = 0; c < 3; c++) rgb[3 * k + c] = toSrgb(toLinear(rgb[3 * k + c]) * ratio);
}

/**
 * D48: los cráteres de lo no visto (moon-craters.mjs), con la población y el albedo de lo real de la misma
 * luna, sumados en L* a lo recreado: enteros en lo no visto y, en la franja del terminador, con lo que no
 * pesa lo corregido. Sin cambiar su brillo regional (a la capa se le quita su media a gran escala). El
 * factor común de los cráteres lleva el contraste a gran escala de lo no visto (σ de su L* a
 * `contrastSigma` texeles) al de lo real, en dos pasos. Devuelve la población, cuántos cráteres, el
 * factor y los contrastes.
 */
function addCraters(final, rgb, classes, kind, realWeight, W, H, options) {
  const pixels = W * H;
  const sigma = options.contrastSigma ?? 8;
  const real = Uint8Array.from(classes, (c) => (c === REAL ? 1 : 0));
  const none = Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0));
  const target = Uint8Array.from(classes, (c, k) => (c === NONE || kind[k] === TERMINATOR ? 1 : 0));
  const realL = lightnessMap(rgb, pixels);
  // Las coronas (Miranda): con las bandas de su terreno bandeado real, y sin cráteres dentro.
  let corona = null;
  if (options.coronae) {
    const banded = bandedTerrain(realL, real, W, H);
    corona = {
      banded,
      ...coronaLayer(none, W, H, {
        wavelength: banded.wavelength,
        amplitude: banded.amplitude,
        seed: RECREATION_SEED + 11,
        ...options.coronae,
      }),
    };
    for (let k = 0; k < pixels; k++) if (corona.footprint[k] > 0.5) target[k] = 0;
  }
  const population = spotPopulation(realL, real, W, H, options);
  const { layer, count } = craterLayer(
    population,
    target,
    W,
    H,
    { seed: RECREATION_SEED + 7, blur: options.blur ?? 2.5 },
    options,
  );
  // Sin la media a gran escala de la capa (lo que suma de más o de menos una zona con muchos cráteres).
  const weight = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    weight[k] = classes[k] === NONE ? 1 : kind[k] === TERMINATOR ? 1 - realWeight[k] : 0;
    if (corona && corona.footprint[k] > 0) weight[k] = Math.max(weight[k], 1e-6);
  }
  const t = Float32Array.from(target);
  const tl = Float32Array.from(layer, (v, k) => v * t[k]);
  const mean = boxBlur(tl, W, H, 48);
  const norm = boxBlur(t, W, H, 48);
  for (let k = 0; k < pixels; k++) if (norm[k] > 1e-3) layer[k] -= mean[k] / norm[k];
  const base = lightnessMap(final, pixels);
  const maxLat = options.contrastMaxLat ?? 60;
  const realContrast = lowPassContrast(realL, real, W, H, {
    sigma,
    maxLat,
  }).sigma;
  // Lo que oscurece la capa, comprimido por debajo de `maxDarkening` L* (un fondo oscuro, no un agujero).
  const limit = options.maxDarkening ?? 18;
  const soften = (v) => (v >= 0 ? v : -limit * Math.tanh(-v / limit));
  const apply = (gain) => {
    const out = Float32Array.from(final);
    for (let k = 0; k < pixels; k++) {
      if (!weight[k]) continue;
      const extra = corona && classes[k] === NONE ? corona.layer[k] : 0;
      setLightness(out, k, base[k], base[k] + weight[k] * soften(gain * layer[k]) + extra);
    }
    return out;
  };
  const contrastOf = (map) =>
    lowPassContrast(lightnessMap(map, pixels), none, W, H, { sigma, maxLat }).sigma;
  const baseContrast = contrastOf(final);
  // Dos pasos: con factor 1, y después el que lleva el contraste al de lo real (σ² = σ_base² + g² σ_capa²).
  let gain = 1;
  let contrast = contrastOf(apply(gain));
  for (let step = 0; step < 2; step++) {
    const layerPart =
      Math.max(contrast * contrast - baseContrast * baseContrast, 1e-6) / (gain * gain);
    const want = (options.targetContrast ?? 0.9) * realContrast;
    gain = Math.min(
      3,
      Math.max(0.3, Math.sqrt(Math.max(want * want - baseContrast * baseContrast, 0) / layerPart)),
    );
    contrast = contrastOf(apply(gain));
  }
  final.set(apply(gain));
  return {
    population,
    count,
    coronae: corona
      ? { banded: corona.banded, units: corona.coronae.map(({ outline, ...c }) => c) }
      : null,
    gain,
    contrast: { real: realContrast, base: baseContrast, after: contrast },
  };
}

/**
 * D48, «la misma media» de la regla 4 de D45: junto a `reference` (Uint8Array), el brillo medio (L*) de
 * `target` a la escala σ se lleva al de `reference` a esa escala en su borde: la diferencia de las dos
 * medias (cada una solo con su lado), donde los dos lados pesan, extendida hacia dentro con la misma σ y
 * aplicada entera hasta σ de `reference` y apagándose hasta `fade` × σ.
 */
export function matchMean(final, reference, target, W, H, { sigma, fade }) {
  const pixels = W * H;
  const L = lightnessMap(final, pixels);
  const ref = Float32Array.from(reference);
  const tgt = Float32Array.from(target);
  const wr = boxBlur(ref, W, H, sigma);
  const wt = boxBlur(tgt, W, H, sigma);
  const mr = boxBlur(
    Float32Array.from(L, (v, k) => v * ref[k]),
    W,
    H,
    sigma,
  );
  const mt = boxBlur(
    Float32Array.from(L, (v, k) => v * tgt[k]),
    W,
    H,
    sigma,
  );
  const delta = new Float32Array(pixels);
  const known = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    if (!tgt[k] || wr[k] < 0.1 || wt[k] < 0.1) continue;
    delta[k] = mr[k] / wr[k] - mt[k] / wt[k];
    known[k] = 1;
  }
  const spread = boxBlur(delta, W, H, sigma);
  const spreadW = boxBlur(known, W, H, sigma);
  const distance = distanceTo(Uint8Array.from(reference), W, H, Math.ceil(fade * sigma) + 2);
  for (let k = 0; k < pixels; k++) {
    if (!tgt[k] || spreadW[k] < 1e-3) continue;
    const u = Math.min(1, Math.max(0, (distance[k] - sigma) / ((fade - 1) * sigma)));
    const w = 1 - u * u * (3 - 2 * u);
    if (w <= 0) continue;
    setLightness(final, k, L[k], L[k] + w * (spread[k] / spreadW[k]));
  }
}

/**
 * D48, «la misma media» junto a lo real: primero la franja del terminador frente a lo real (el borde que
 * se ve: lo real intacto junto a lo corregido) y después lo no visto frente a lo real y la franja. No toca
 * lo real, ni lo visto de lejos (su brillo a gran escala es el real), ni la unión de 180°.
 */
function matchBorderMean(final, classes, kind, W, H, options) {
  const real = Uint8Array.from(classes, (c) => (c === REAL ? 1 : 0));
  const strip = Uint8Array.from(kind, (v) => (v === TERMINATOR ? 1 : 0));
  matchMean(final, real, strip, W, H, options);
  const seen = Uint8Array.from(real, (v, k) => (v || strip[k] ? 1 : 0));
  const none = Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0));
  matchMean(final, seen, none, W, H, options);
}

/**
 * D48: el grano de lo recreado junto a lo real (`grainRatio`), llevado al de lo real después de la luz
 * rasante, los cráteres y la mezcla del borde: una máscara de enfoque (o, con cantidad negativa, un
 * desenfoque parcial) de σ = 1 texel sobre lo recreado (no sobre lo real ni sobre la unión de 180°), en
 * dos pasos, entre −0,7 y 1,5. Devuelve la cantidad.
 */
function calibrateGrain(final, classes, kind, W, H, target = 1) {
  const pixels = W * H;
  const original = Float32Array.from(final);
  const weight = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) weight[k] = classes[k] !== REAL && kind[k] !== SEAM ? 1 : 0;
  const norm = gaussianBlur(weight, W, H, 1, true);
  const lows = [0, 1, 2].map((c) => {
    const channel = new Float32Array(pixels);
    for (let k = 0; k < pixels; k++) channel[k] = original[3 * k + c] * weight[k];
    return gaussianBlur(channel, W, H, 1, true);
  });
  const apply = (amount) => {
    for (let k = 0; k < pixels; k++) {
      if (!weight[k]) continue;
      for (let c = 0; c < 3; c++) {
        const v = original[3 * k + c];
        const mean = norm[k] > 1e-3 ? lows[c][k] / norm[k] : v;
        final[3 * k + c] = Math.min(1, Math.max(0, v + amount * (v - mean)));
      }
    }
  };
  const ratio = () => grainRatio(grayOf(final, pixels, 1), classes, W, H);
  let amount = 0;
  let r = ratio();
  for (let step = 0; step < 2 && Number.isFinite(r) && r > 0; step++) {
    amount = Math.min(1.5, Math.max(-0.7, (1 + amount) * (target / r) - 1));
    apply(amount);
    r = ratio();
  }
  return amount;
}

/**
 * La máscara de una luna para el informe (WebP de `width` × `width / 2`): el mapa recreado en gris, con
 * lo visto de lejos teñido de rojo, lo no visto (recreado entero) de azul y lo real con luz rasante (D48)
 * de ámbar; lo real, sin tinte.
 */
export async function writeMask(file, data, classes, W, H, width = 1024) {
  const out = Buffer.alloc(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    const v = 0.2126 * data[3 * k] + 0.7152 * data[3 * k + 1] + 0.0722 * data[3 * k + 2];
    const [r, g, b] =
      classes[k] === FAR
        ? [1, 0.55, 0.5]
        : classes[k] === REAL
          ? [1, 1, 1]
          : classes[k] === GRAZING
            ? [1, 0.82, 0.3]
            : [0.5, 0.62, 1];
    out[3 * k] = Math.round(v * r);
    out[3 * k + 1] = Math.round(v * g);
    out[3 * k + 2] = Math.round(v * b);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .resize(width, width / 2, { kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toFile(file instanceof URL ? fileURLToPath(file) : file);
}
