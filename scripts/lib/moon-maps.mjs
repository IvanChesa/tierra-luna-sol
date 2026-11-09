// Análisis de los mapas de las lunas para D45 (fase 9b, adenda del 05-11): qué parte de cada mapa es
// real con detalle, cuál se vio solo de lejos y cuál no se vio. Funciones puras sobre una imagen en
// gris equirrectangular (Float32Array, ancho × alto, de 0 a 1), sin dependencias.
//
// - Lo que no se vio: donde el mosaico no tiene datos (su cobertura, por debajo de la mitad).
// - Lo visto de lejos: donde la imagen no tiene detalle a la escala del texel del mapa de 2k (la
//   textura con la que se ve una luna de cerca). En un mosaico, una zona que solo se fotografió de
//   lejos está ampliada desde su resolución de origen: su banda más fina (de 2 a 4 texeles de longitud
//   de onda) está vacía, mientras que la siguiente (de 4 a 10) aún tiene algo. Se mide el cociente de
//   la energía de las dos bandas en una ventana local: en un terreno fotografiado de cerca, ese
//   cociente es parecido en toda la luna (el espectro del relieve cae de forma suave); en una zona
//   ampliada, se hunde. El umbral se toma respecto a lo mejor de la propia luna (`farThreshold`).

/** Un núcleo gaussiano normalizado de desviación `sigma` (en píxeles). */
function kernelOf(sigma) {
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const kernel = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++) {
    kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    sum += kernel[k + radius];
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= sum;
  return { kernel, radius };
}

/**
 * Desenfoque gaussiano separable en una imagen equirrectangular, con `sigma` píxeles en latitud y, si
 * `physical`, la misma distancia sobre la esfera en longitud (sigma / cos(latitud) píxeles, con tope):
 * así una banda de frecuencias es la misma en km en todo el mapa, también junto a los polos, donde el
 * mapa estira la imagen en longitud. En longitud, con la vuelta del antimeridiano.
 */
export function gaussianBlur(src, width, height, sigma, physical = false) {
  if (sigma <= 0) return Float32Array.from(src);
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  const vertical = kernelOf(sigma);
  let rowKernel = vertical;
  for (let j = 0; j < height; j++) {
    if (physical) {
      const cos = Math.cos(((j + 0.5) / height - 0.5) * Math.PI);
      rowKernel = kernelOf(Math.min(sigma / Math.max(cos, 1e-3), width / 6));
    }
    const { kernel, radius } = rowKernel;
    const row = j * width;
    for (let i = 0; i < width; i++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const x = (((i + k) % width) + width) % width;
        acc += kernel[k + radius] * src[row + x];
      }
      tmp[row + i] = acc;
    }
  }
  const { kernel, radius } = vertical;
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const y = Math.min(Math.max(j + k, 0), height - 1);
        acc += kernel[k + radius] * tmp[y * width + i];
      }
      out[j * width + i] = acc;
    }
  }
  return out;
}

/**
 * La energía local de las dos bandas finas de la imagen (raíz de la media local de su cuadrado, en una
 * ventana gaussiana de `window` texeles) y su cociente. En los polos, la ventana en longitud se
 * ensancha sola con el mapa equirrectangular (los texeles se estrechan): el cociente, que compara dos
 * bandas en la misma ventana, no cambia por ello.
 */
export function detailBands(gray, width, height, window = 8) {
  const g1 = gaussianBlur(gray, width, height, 1, true);
  const g2 = gaussianBlur(g1, width, height, 2.3, true);
  const fine = new Float32Array(width * height);
  const coarse = new Float32Array(width * height);
  for (let k = 0; k < fine.length; k++) {
    const a = gray[k] - g1[k];
    const b = g1[k] - g2[k];
    fine[k] = a * a;
    coarse[k] = b * b;
  }
  const ef = gaussianBlur(fine, width, height, window, true);
  const ec = gaussianBlur(coarse, width, height, window, true);
  const ratio = new Float32Array(width * height);
  const energy = new Float32Array(width * height);
  for (let k = 0; k < ratio.length; k++) {
    const f = Math.sqrt(ef[k]);
    const c = Math.sqrt(ec[k]);
    energy[k] = f + c;
    ratio[k] = c > 1e-5 ? f / c : 0;
  }
  return { ratio, energy };
}

/**
 * La calibración del umbral: la misma imagen, reducida `factor` veces (con un desenfoque gaussiano de
 * sigma ≈ 0,5·factor, el de una cámara que resuelve `factor` texeles) y vuelta a ampliar, como un mosaico
 * hecho con imágenes `factor` veces más gruesas que el texel. Devuelve la mediana de su cociente de
 * bandas en `mask` (relativa a la de la imagen sin degradar).
 */
export function degradedRatio(gray, width, height, mask, factor) {
  const blurred = gaussianBlur(gray, width, height, 0.5 * factor, true);
  const { ratio } = detailBands(blurred, width, height);
  return percentile(ratio, mask, 0.5);
}

/**
 * La resolución de origen de cada texel (σ gaussiana en texeles de 2k), por octavas: la imagen se
 * parte en bandas (de 1, 2, 4, 8 y 16 texeles) y en cada texel se mira, desde la más fina, la primera
 * banda que aún tiene detalle respecto a la más gruesa (al menos `alive` veces el que tiene lo más
 * nítido de la propia luna, `sharpMask`). Una zona ampliada desde una resolución gruesa tiene vacías
 * todas las bandas por debajo de su escala de origen: así se mide también lo muy desenfocado, que con
 * dos bandas se confundía con el ruido. Devuelve σ = 2^(banda − 1), alisada (0,5 en lo nítido; hasta 8),
 * y la referencia de cada banda (para medir con la misma una versión degradada de la imagen).
 */
export function cutoffSigma(
  gray,
  width,
  height,
  { sharpMask, reference = null, alive = 0.5, smooth = 6 },
) {
  const sigmas = [1, 2, 4, 8, 16];
  const levels = [gray];
  let previous = 0;
  for (const s of sigmas) {
    const step = Math.sqrt(s * s - previous * previous);
    levels.push(gaussianBlur(levels[levels.length - 1], width, height, step, true));
    previous = s;
  }
  // Energía local de cada banda (la diferencia entre dos niveles), en una ventana que crece con ella.
  const energies = sigmas.map((s, b) => {
    const band = new Float32Array(gray.length);
    const a = levels[b];
    const c = levels[b + 1];
    for (let k = 0; k < band.length; k++) {
      const d = a[k] - c[k];
      band[k] = d * d;
    }
    const e = gaussianBlur(band, width, height, Math.max(6, 2 * s), true);
    for (let k = 0; k < e.length; k++) e[k] = Math.sqrt(e[k]);
    return e;
  });
  const coarse = energies[energies.length - 1];
  const relative = energies.slice(0, -1).map((e) => {
    const q = new Float32Array(e.length);
    for (let k = 0; k < q.length; k++) q[k] = e[k] / (coarse[k] + 1e-5);
    return q;
  });
  const bands = reference ?? relative.map((q) => percentile(q, sharpMask, 0.5) || 1);
  const sigma = new Float32Array(gray.length);
  for (let k = 0; k < sigma.length; k++) {
    let value = 8;
    for (let b = 0; b < relative.length; b++) {
      const a = relative[b][k] / bands[b];
      if (a >= alive) {
        // El corte, entre la banda anterior (vacía) y esta: tanto más cerca de la anterior cuanto más
        // detalle le queda (σ de 2^(b − 2) a 2^(b − 1)).
        if (b === 0) value = 0.5;
        else {
          const before = relative[b - 1][k] / bands[b - 1];
          const u = Math.min(1, Math.max(0, before / alive));
          value = 2 ** (b - 1 - u);
        }
        break;
      }
    }
    sigma[k] = value;
  }
  return { sigma: gaussianBlur(sigma, width, height, smooth, true), reference: bands };
}

/**
 * La calibración del umbral de la σ: la mediana de la σ por octavas de lo más nítido (`sharpMask`)
 * degradado `factor` veces (como en `degradedRatio`), medida con las referencias de la imagen original.
 */
export function degradedSigma(gray, width, height, sharpMask, reference, factor) {
  const blurred = gaussianBlur(gray, width, height, 0.5 * factor, true);
  const { sigma } = cutoffSigma(blurred, width, height, { sharpMask, reference });
  return percentile(sigma, sharpMask, 0.5);
}

/** El percentil `p` (0–1) de los valores de `values` donde `mask` es cierto. */
export function percentile(values, mask, p) {
  const picked = [];
  for (let k = 0; k < values.length; k++) if (mask[k]) picked.push(values[k]);
  if (picked.length === 0) return 0;
  picked.sort((a, b) => a - b);
  return picked[Math.min(picked.length - 1, Math.max(0, Math.round(p * (picked.length - 1))))];
}

/** El área de cada fila de un mapa equirrectangular (proporcional al coseno de su latitud). */
export function rowWeights(height) {
  return Float64Array.from({ length: height }, (_, j) =>
    Math.cos(((j + 0.5) / height - 0.5) * Math.PI),
  );
}

/**
 * Las clases de cada texel: 0, real con detalle; 1, visto de lejos; 2, no visto. `coverage` (0–1) es
 * la del mosaico; `ratio`, el de `detailBands`, y `sigma`, la de `cutoffSigma`. Una zona se vio de lejos
 * si su cociente queda por debajo de `threshold` o su σ por encima de `sigmaThreshold`: el cociente de
 * dos bandas nota lo un poco blando, pero se engaña donde solo queda ruido (el ruido llena la banda
 * fina); la σ por octavas no se engaña con el ruido, y se usa para lo claramente blando. Lo que queda a
 * menos de `edge` texeles de lo no visto también pasa a «no visto»: el borde de un mosaico suele traer
 * una línea (el limbo de la imagen). Las clases se limpian con un desenfoque de la máscara de lo visto
 * de lejos (una zona es «de lejos» si lo es la mayor parte de su entorno: sin motas sueltas).
 */
export function classify(
  coverage,
  ratio,
  sigma,
  width,
  height,
  { threshold, sigmaThreshold, smooth = 6, minArea = 0.004, edge = 3 },
) {
  const seen = new Float32Array(width * height);
  for (let k = 0; k < seen.length; k++) seen[k] = coverage[k] >= 0.5 ? 1 : 0;
  // Con σ = edge / 1,5, el desenfoque de lo visto baja de 0,933 (Φ(1,5)) a `edge` texeles del borde.
  const inside = gaussianBlur(seen, width, height, edge / 1.5, true);
  const far = new Float32Array(width * height);
  for (let k = 0; k < far.length; k++) {
    far[k] = seen[k] && (ratio[k] < threshold || sigma[k] > sigmaThreshold) ? 1 : 0;
  }
  const farSmooth = gaussianBlur(far, width, height, smooth, true);
  const classes = new Uint8Array(width * height);
  for (let k = 0; k < classes.length; k++) {
    classes[k] = !seen[k] || inside[k] < 0.933 ? 2 : farSmooth[k] > 0.5 ? 1 : 0;
  }
  // Sin islas: los trozos de lo real o de lo visto de lejos de menos de `minArea` de la esfera pasan a
  // la clase que los rodea (una llanura lisa dentro de lo real no es «de lejos»; un parche de ruido
  // dentro de lo de lejos no es real). Salvo lo claramente blando (la mayor parte, con la σ por encima
  // de su umbral, como el limbo de una imagen junto a lo nítido): eso sigue «de lejos» aunque sea pequeño.
  const blurry = (members) => {
    let count = 0;
    for (const k of members) if (sigma[k] > sigmaThreshold) count++;
    return count > members.length / 2;
  };
  absorbIslands(classes, width, height, 1, 0, minArea, blurry);
  absorbIslands(classes, width, height, 0, 1, minArea);
  return classes;
}

/**
 * Las componentes conexas (8 vecinos, con la vuelta del antimeridiano) de la clase `from` con menos de
 * `minArea` (fracción del área de la esfera) pasan a `to` si las rodea `to` o lo que no se vio, y si
 * `keep` (opcional) no dice que se queden como están.
 */
export function absorbIslands(classes, width, height, from, to, minArea, keep = null) {
  const weights = rowWeights(height);
  const total = weights.reduce((sum, w) => sum + w, 0) * width;
  const seen = new Uint8Array(classes.length);
  const stack = [];
  for (let start = 0; start < classes.length; start++) {
    if (seen[start] || classes[start] !== from) continue;
    const members = [];
    let area = 0;
    let touchesOther = false;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop();
      members.push(k);
      const j = Math.floor(k / width);
      const i = k - j * width;
      area += weights[j];
      for (let dj = -1; dj <= 1; dj++) {
        const y = j + dj;
        if (y < 0 || y >= height) continue;
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const n = y * width + ((((i + di) % width) + width) % width);
          const c = classes[n];
          if (c === from) {
            if (!seen[n]) {
              seen[n] = 1;
              stack.push(n);
            }
          } else if (c !== to && c !== 2) {
            touchesOther = true;
          }
        }
      }
    }
    if (touchesOther || area / total >= minArea || (keep && keep(members))) continue;
    for (const k of members) classes[k] = to;
  }
}

/**
 * La fracción del área de la esfera de cada clase: 0, real; 1, visto de lejos; 2, no visto; 3, real con
 * luz rasante (D48, scripts/lib/moon-grazing.mjs).
 */
export function classShares(classes, width, height) {
  const weights = rowWeights(height);
  const area = [0, 0, 0, 0];
  let total = 0;
  for (let j = 0; j < height; j++) {
    const w = weights[j];
    for (let i = 0; i < width; i++) {
      area[classes[j * width + i]] += w;
      total += w;
    }
  }
  return area.map((a) => a / total);
}

// --- La calidad de la recreación (D45): el grano y el borde con lo real ---------------------------

/** L* (CIELAB) de un valor sRGB de 0 a 1 en gris (o de la luminancia ya en sRGB). */
export function lightness(v) {
  const c = Math.min(Math.max(v, 0), 1);
  const y = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const f = y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116;
  return 116 * f - 16;
}

/**
 * La distancia (en texeles, chaflán 3-4 / 3 con la vuelta del antimeridiano) de cada texel al conjunto
 * `inSet` más cercano (0 dentro de él), hasta `cap` texeles.
 */
export function distanceTo(inSet, width, height, cap = 64) {
  const INF = 3 * cap + 4;
  const d = new Float32Array(width * height);
  for (let k = 0; k < d.length; k++) d[k] = inSet[k] ? 0 : INF;
  const at = (j, i) => j * width + ((i + width) % width);
  // Dos pasadas por sentido; la vuelta en longitud, con una pasada extra de cada una.
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const k = j * width + i;
        let v = d[k];
        v = Math.min(v, d[at(j, i - 1)] + 3);
        if (j > 0) {
          v = Math.min(v, d[at(j - 1, i)] + 3, d[at(j - 1, i - 1)] + 4, d[at(j - 1, i + 1)] + 4);
        }
        d[k] = v;
      }
    }
    for (let j = height - 1; j >= 0; j--) {
      for (let i = width - 1; i >= 0; i--) {
        const k = j * width + i;
        let v = d[k];
        v = Math.min(v, d[at(j, i + 1)] + 3);
        if (j < height - 1) {
          v = Math.min(v, d[at(j + 1, i)] + 3, d[at(j + 1, i + 1)] + 4, d[at(j + 1, i - 1)] + 4);
        }
        d[k] = v;
      }
    }
  }
  for (let k = 0; k < d.length; k++) d[k] = Math.min(d[k] / 3, cap);
  return d;
}

/**
 * El grano y el borde de un mapa recreado (D45), en L*, entre ±`maxLat` de latitud (cerca de los
 * polos, el equirrectangular estira la imagen y su paso alto se mide peor).
 * - El grano: la raíz de la media del cuadrado del paso alto (L* menos su desenfoque de σ = 1,5 texeles a
 *   escala física), en lo recreado (lo visto de lejos y lo no visto) a menos de `band` texeles de lo real
 *   y en lo real a menos de `band` de lo recreado; y su cociente (el criterio: de 0,7 a 1,3). También el
 *   de lo visto de lejos y el de lo no visto, por separado, y en toda la luna.
 * - El borde (`border`): el brillo medio de cada lado en el propio borde (abajo), por teselas. Con
 *   `reference` (el mapa original), también el mismo salto en el original en ese borde y en bordes
 *   ficticios dentro de lo real (lo natural); y, por separado, el borde con lo no visto (`none`), frente a
 *   lo natural, y el borde con lo visto de lejos (`far`), frente al mayor de lo natural y del original en
 *   ese borde (el criterio de D45: 2 L* como mucho por encima, en el percentil 95 y en el máximo).
 *   Y, como información (`bands`), por teselas de `tile` texeles, la media de L* de
 *   lo real a 1–3 texeles del borde y la de lo recreado a 1–3 texeles de lo real, y su diferencia. Solo
 *   cuentan las teselas donde esa diferencia se mide con un error típico de `maxError` L* como mucho (de
 *   las varianzas de las dos franjas): con pocos píxeles (una mota sin datos), la medida es el relieve y
 *   no un salto (en Encélado, con σ de L* ≈ 10, dos medias de 48 píxeles difieren ±2 por azar). Un salto
 *   es una discontinuidad en el propio borde: con franjas más anchas (de 2 a 8 texeles) se mide también la
 *   pendiente natural del terreno, y el mosaico original, continuo donde lo real se junta con lo visto de
 *   lejos, ya daba |ΔL*| de hasta 4 en Tritón.
 * `values`: el mapa en gris (0–1, sRGB); `classes`: 0 real, 1 de lejos, 2 no visto.
 */
export function recreationQuality(values, classes, width, height, options = {}, reference = null) {
  const {
    maxLat = 70,
    band = 32,
    tile = 64,
    inner = 1,
    outer = 3,
    minCount = 48,
    maxError = 0.5,
    meanSigma = 4,
    minBorder = 32,
  } = options;
  const L = new Float32Array(width * height);
  for (let k = 0; k < L.length; k++) L[k] = lightness(values[k]);
  const low = gaussianBlur(L, width, height, 1.5, true);
  const real = new Uint8Array(width * height);
  const synth = new Uint8Array(width * height);
  for (let k = 0; k < classes.length; k++) {
    real[k] = classes[k] === 0 ? 1 : 0;
    synth[k] = classes[k] === 0 ? 0 : 1;
  }
  const toReal = distanceTo(real, width, height);
  const toSynth = distanceTo(synth, width, height);
  const weights = rowWeights(height);
  const acc = { realNear: [0, 0], synthNear: [0, 0], far: [0, 0], none: [0, 0], real: [0, 0] };
  const add = (key, w, v) => {
    acc[key][0] += w * v;
    acc[key][1] += w;
  };
  for (let j = 0; j < height; j++) {
    const lat = 90 - ((j + 0.5) / height) * 180;
    if (Math.abs(lat) > maxLat) continue;
    const w = weights[j];
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      const hp = (L[k] - low[k]) ** 2;
      if (classes[k] === 0) {
        add('real', w, hp);
        if (toSynth[k] <= band) add('realNear', w, hp);
      } else {
        add(classes[k] === 1 ? 'far' : 'none', w, hp);
        if (toReal[k] <= band) add('synthNear', w, hp);
      }
    }
  }
  const rms = ([sum, n]) => (n > 0 ? Math.sqrt(sum / n) : NaN);
  const grain = {
    real: rms(acc.real),
    far: rms(acc.far),
    none: rms(acc.none),
    realNear: rms(acc.realNear),
    synthNear: rms(acc.synthNear),
  };
  grain.ratioNear = grain.synthNear / grain.realNear;
  grain.ratioFar = grain.far / grain.real;
  grain.ratioNone = grain.none / grain.real;
  // El borde, por teselas.
  const steps = [];
  let skipped = 0;
  for (let ty = 0; ty < height; ty += tile) {
    const latTop = 90 - (ty / height) * 180;
    const latBottom = 90 - (Math.min(ty + tile, height) / height) * 180;
    if (Math.min(Math.abs(latTop), Math.abs(latBottom)) > maxLat) continue;
    for (let tx = 0; tx < width; tx += tile) {
      let si = 0;
      let ni = 0;
      let so = 0;
      let no = 0;
      let qi = 0;
      let qo = 0;
      for (let j = ty; j < Math.min(ty + tile, height); j++) {
        const lat = 90 - ((j + 0.5) / height) * 180;
        if (Math.abs(lat) > maxLat) continue;
        for (let i = tx; i < Math.min(tx + tile, width); i++) {
          const k = j * width + i;
          if (classes[k] === 0) {
            if (toSynth[k] >= inner && toSynth[k] <= outer) {
              si += L[k];
              qi += L[k] * L[k];
              ni++;
            }
          } else if (toReal[k] >= inner && toReal[k] <= outer) {
            so += L[k];
            qo += L[k] * L[k];
            no++;
          }
        }
      }
      if (ni >= minCount && no >= minCount) {
        const vi = Math.max(0, qi / ni - (si / ni) ** 2);
        const vo = Math.max(0, qo / no - (so / no) ** 2);
        const error = Math.sqrt(vi / ni + vo / no);
        if (error <= maxError) steps.push({ tx, ty, delta: so / no - si / ni, error });
        else skipped++;
      }
    }
  }
  const summary = (list) => {
    const abs = list.map((s) => Math.abs(s.delta)).sort((a, b) => a - b);
    const q = (p) =>
      abs.length ? abs[Math.min(abs.length - 1, Math.round(p * (abs.length - 1)))] : 0;
    const worst = list.reduce(
      (m, s) => (Math.abs(s.delta) > Math.abs(m?.delta ?? 0) ? s : m),
      null,
    );
    return { tiles: list.length, median: q(0.5), p95: q(0.95), max: q(1), worst };
  };
  // El brillo medio a cada lado del borde (el criterio): en cada píxel del borde (lo real junto a lo
  // recreado y lo recreado junto a lo real), la media normalizada de cada lado con σ = `meanSigma`
  // texeles a escala física (cada lado, solo con sus píxeles), y su diferencia; por teselas, la media
  // de esa diferencia en sus píxeles del borde (al menos `minBorder`). Así el relieve fino (las sombras
  // de los cráteres) no pasa por salto, como en las franjas estrechas.
  const tileSteps = (Lv, sideA, sideB, toA, toB, allowed) => {
    const wA = gaussianBlur(Float32Array.from(sideA), width, height, meanSigma, true);
    const wB = gaussianBlur(Float32Array.from(sideB), width, height, meanSigma, true);
    const lA = new Float32Array(width * height);
    const lB = new Float32Array(width * height);
    for (let k = 0; k < Lv.length; k++) {
      lA[k] = sideA[k] ? Lv[k] : 0;
      lB[k] = sideB[k] ? Lv[k] : 0;
    }
    const mA = gaussianBlur(lA, width, height, meanSigma, true);
    const mB = gaussianBlur(lB, width, height, meanSigma, true);
    const list = [];
    for (let ty = 0; ty < height; ty += tile) {
      for (let tx = 0; tx < width; tx += tile) {
        let sum = 0;
        let count = 0;
        for (let j = ty; j < Math.min(ty + tile, height); j++) {
          const lat = 90 - ((j + 0.5) / height) * 180;
          if (Math.abs(lat) > maxLat) continue;
          for (let i = tx; i < Math.min(tx + tile, width); i++) {
            const k = j * width + i;
            // Solo los píxeles de los dos lados (con un lado de una sola clase, los de la otra no cuentan).
            if (!sideA[k] && !sideB[k]) continue;
            const edge = sideA[k] ? toB[k] <= 1 : toA[k] <= 1;
            if (!edge || (allowed && !allowed[k]) || wA[k] < 0.05 || wB[k] < 0.05) continue;
            sum += mB[k] / wB[k] - mA[k] / wA[k];
            count++;
          }
        }
        if (count >= minBorder) list.push({ tx, ty, delta: sum / count, count });
      }
    }
    return list;
  };
  const means = tileSteps(L, real, synth, toReal, toSynth, null);
  // Lo natural (`reference`, el mapa original): el mismo salto en bordes ficticios trazados dentro de lo
  // real, con la máscara girada 90°, 180° y 270° en longitud, solo donde los dos lados son reales en el
  // original (a 8 texeles o más de lo que no lo es). En un relieve de sombras duras, cualquier borde da
  // saltos de 10 L* por los cráteres: el criterio es que el borde con lo recreado no salte más que eso.
  let natural = null;
  if (reference) {
    const L0 = new Float32Array(width * height);
    for (let k = 0; k < L0.length; k++) L0[k] = lightness(reference[k]);
    const toNotReal = distanceTo(synth, width, height, 16);
    const allowed = new Uint8Array(width * height);
    for (let k = 0; k < allowed.length; k++) allowed[k] = toNotReal[k] >= 8 ? 1 : 0;
    const list = [];
    for (const turn of [0.25, 0.5, 0.75]) {
      const shift = Math.round(turn * width);
      const a = new Uint8Array(width * height);
      const b = new Uint8Array(width * height);
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const from = j * width + ((i + shift) % width);
          a[j * width + i] = real[from];
          b[j * width + i] = 1 - real[from];
        }
      }
      list.push(
        ...tileSteps(L0, a, b, distanceTo(a, width, height), distanceTo(b, width, height), allowed),
      );
    }
    natural = summary(list);
  }
  // Y el original en el mismo borde: lo visto de lejos es continuo con lo real en el mosaico, y lo no
  // visto, el gris de su relleno.
  let original = null;
  let L0 = null;
  if (reference) {
    L0 = new Float32Array(width * height);
    for (let k = 0; k < L0.length; k++) L0[k] = lightness(reference[k]);
    original = summary(tileSteps(L0, real, synth, toReal, toSynth, null));
  }
  const border = summary(means);
  // Cada borde por separado (el criterio de D45):
  // - con lo no visto, cuyo brillo pone solo la recreación: frente a lo natural;
  // - con lo visto de lejos, cuyo brillo a gran escala es el real (D45, regla 1) y que en el mosaico ya
  //   podía saltar (imágenes distintas): frente al mayor de lo natural y del original en ese borde.
  const far = new Uint8Array(width * height);
  const none = new Uint8Array(width * height);
  for (let k = 0; k < classes.length; k++) {
    far[k] = classes[k] === 1 ? 1 : 0;
    none[k] = classes[k] === 2 ? 1 : 0;
  }
  const byKind = (Lv, set) =>
    summary(tileSteps(Lv, real, set, toReal, distanceTo(set, width, height), null));
  const noneBorder = byKind(L, none);
  const farBorder = byKind(L, far);
  const farOriginal = reference ? byKind(L0, far) : null;
  const excess = (b, refP95, refMax) =>
    b.tiles > 0 && refP95 !== null ? { p95: b.p95 - refP95, max: b.max - refMax } : null;
  const noneExcess = reference ? excess(noneBorder, natural.p95, natural.max) : null;
  const farExcess = reference
    ? excess(
        farBorder,
        Math.max(natural.p95, farOriginal.p95),
        Math.max(natural.max, farOriginal.max),
      )
    : null;
  return {
    grain,
    border: {
      ...border,
      natural,
      original,
      none: { ...noneBorder, excess: noneExcess },
      far: { ...farBorder, original: farOriginal, excess: farExcess },
      // El peor de los dos (lo que pide D45: como mucho 2 L* por encima de su referencia).
      excessP95: reference
        ? Math.max(noneExcess?.p95 ?? -Infinity, farExcess?.p95 ?? -Infinity)
        : null,
      excessMax: reference
        ? Math.max(noneExcess?.max ?? -Infinity, farExcess?.max ?? -Infinity)
        : null,
    },
    bands: { ...summary(steps), skipped },
  };
}

// --- D48 (entrega 10.a): el borde a varias escalas y el contraste a gran escala --------------------

/**
 * Desenfoque casi gaussiano de σ = `sigma` texeles en un mapa equirrectangular, en tiempo constante por
 * píxel: tres pasadas de caja (la varianza de tres cajas de ancho 2r + 1 es r (r + 1)), a escala física
 * como `gaussianBlur` (en longitud, σ / cos φ, con tope y con la vuelta del antimeridiano; en latitud,
 * repitiendo la fila del polo). Para las medidas a varios grados, donde el núcleo gaussiano entero
 * costaría cientos de muestras por píxel.
 */
export function boxBlur(src, width, height, sigma, physical = true) {
  const radiusOf = (s) => Math.max(1, Math.round((Math.sqrt(4 * s * s + 1) - 1) / 2));
  let a = Float32Array.from(src);
  let b = new Float32Array(src.length);
  const rowRadius = Int32Array.from({ length: height }, (_, j) => {
    const cos = Math.cos(((j + 0.5) / height - 0.5) * Math.PI);
    return radiusOf(physical ? Math.min(sigma / Math.max(cos, 1e-3), width / 6) : sigma);
  });
  const colRadius = radiusOf(sigma);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 0; j < height; j++) {
      const r = Math.min(rowRadius[j], (width >> 1) - 1);
      const span = 2 * r + 1;
      const row = j * width;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += a[row + ((k + width) % width)];
      for (let i = 0; i < width; i++) {
        b[row + i] = acc / span;
        acc += a[row + ((i + r + 1) % width)] - a[row + ((i - r + width) % width)];
      }
    }
    [a, b] = [b, a];
    const span = 2 * colRadius + 1;
    for (let i = 0; i < width; i++) {
      const at = (y) => a[Math.min(Math.max(y, 0), height - 1) * width + i];
      let acc = 0;
      for (let k = -colRadius; k <= colRadius; k++) acc += at(k);
      for (let j = 0; j < height; j++) {
        b[j * width + i] = acc / span;
        acc += at(j + colRadius + 1) - at(j - colRadius);
      }
    }
    [a, b] = [b, a];
  }
  return a;
}

/** El desenfoque de las medidas: el gaussiano entero hasta σ = 3 texeles; por encima, el de cajas. */
const measureBlur = (src, width, height, sigma) =>
  sigma > 3 ? boxBlur(src, width, height, sigma) : gaussianBlur(src, width, height, sigma, true);

/**
 * El salto del brillo medio en el borde entre `a` y `b` (máscaras, 1 dentro) a la escala σ = `sigma`
 * texeles (a escala física: en longitud, σ / cos φ): en cada píxel del borde (de un lado, a menos de 1
 * texel del otro), la media de L* de cada lado, normalizada con solo sus píxeles (y, con `valid`, solo
 * los válidos), y su diferencia (b − a); por teselas de `tile` texeles, la media de esa diferencia en
 * sus píxeles del borde (al menos `minBorder`). Cuenta un píxel del borde solo si cada lado pesa al
 * menos `minWeight` en su entorno (las dos medias, con datos). Devuelve las teselas
 * ({ tx, ty, delta, count }).
 */
export function borderSteps(
  L,
  a,
  b,
  width,
  height,
  { sigma, tile = 64, maxLat = 70, minBorder = 32, minWeight = 0.2, valid = null },
) {
  const sideA = new Float32Array(width * height);
  const sideB = new Float32Array(width * height);
  for (let k = 0; k < sideA.length; k++) {
    const ok = !valid || valid[k];
    sideA[k] = a[k] && ok ? 1 : 0;
    sideB[k] = b[k] && ok ? 1 : 0;
  }
  const wA = measureBlur(sideA, width, height, sigma);
  const wB = measureBlur(sideB, width, height, sigma);
  const lA = new Float32Array(width * height);
  const lB = new Float32Array(width * height);
  for (let k = 0; k < L.length; k++) {
    lA[k] = sideA[k] * L[k];
    lB[k] = sideB[k] * L[k];
  }
  const mA = measureBlur(lA, width, height, sigma);
  const mB = measureBlur(lB, width, height, sigma);
  const toA = distanceTo(a, width, height, 4);
  const toB = distanceTo(b, width, height, 4);
  const list = [];
  for (let ty = 0; ty < height; ty += tile) {
    for (let tx = 0; tx < width; tx += tile) {
      let sum = 0;
      let count = 0;
      for (let j = ty; j < Math.min(ty + tile, height); j++) {
        const lat = 90 - ((j + 0.5) / height) * 180;
        if (Math.abs(lat) > maxLat) continue;
        for (let i = tx; i < Math.min(tx + tile, width); i++) {
          const k = j * width + i;
          if (!a[k] && !b[k]) continue;
          const edge = a[k] ? toB[k] <= 1 : toA[k] <= 1;
          if (!edge || (valid && !valid[k]) || wA[k] < minWeight || wB[k] < minWeight) continue;
          sum += mB[k] / wB[k] - mA[k] / wA[k];
          count++;
        }
      }
      if (count >= minBorder) list.push({ tx, ty, delta: sum / count, count });
    }
  }
  return list;
}

/** El resumen de unas teselas: cuántas, la mediana, el percentil 95 y el máximo de |Δ|. */
export function stepSummary(list) {
  const abs = list.map((s) => Math.abs(s.delta)).sort((x, y) => x - y);
  const q = (p) =>
    abs.length ? abs[Math.min(abs.length - 1, Math.round(p * (abs.length - 1)))] : 0;
  return { tiles: list.length, median: q(0.5), p95: q(0.95), max: q(1) };
}

/**
 * Lo natural a la escala σ: el mismo salto en bordes ficticios dentro de lo real (`real`), con la
 * máscara girada 90°, 180° y 270° en longitud, y cada lado solo con lo real (lo que no lo es no cuenta en
 * las medias). Es la variación del brillo medio del propio terreno a esa escala.
 */
export function naturalSteps(L, real, width, height, options) {
  const list = [];
  for (const turn of [0.25, 0.5, 0.75]) {
    const shift = Math.round(turn * width);
    const a = new Uint8Array(width * height);
    const b = new Uint8Array(width * height);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const from = j * width + ((i + shift) % width);
        a[j * width + i] = real[from];
        b[j * width + i] = 1 - real[from];
      }
    }
    list.push(...borderSteps(L, a, b, width, height, { ...options, valid: real }));
  }
  return list;
}

/**
 * El contraste a gran escala de una región (D48): la desviación típica (por el área) de su L* a la
 * escala σ = `sigma` texeles (la media normalizada, solo con sus píxeles), en los píxeles de la región
 * cuyo entorno es suyo en al menos `minWeight` y entre ±`maxLat` de latitud.
 */
export function lowPassContrast(L, region, width, height, { sigma, maxLat = 70, minWeight = 0.5 }) {
  const w = new Float32Array(width * height);
  const lw = new Float32Array(width * height);
  for (let k = 0; k < L.length; k++) {
    w[k] = region[k] ? 1 : 0;
    lw[k] = w[k] * L[k];
  }
  const bw = measureBlur(w, width, height, sigma);
  const bl = measureBlur(lw, width, height, sigma);
  const weights = rowWeights(height);
  let s = 0;
  let s2 = 0;
  let n = 0;
  for (let j = 0; j < height; j++) {
    const lat = 90 - ((j + 0.5) / height) * 180;
    if (Math.abs(lat) > maxLat) continue;
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if (!region[k] || bw[k] < minWeight) continue;
      const v = bl[k] / bw[k];
      s += weights[j] * v;
      s2 += weights[j] * v * v;
      n += weights[j];
    }
  }
  if (!n) return { sigma: NaN, mean: NaN, area: 0 };
  const mean = s / n;
  return { sigma: Math.sqrt(Math.max(0, s2 / n - mean * mean)), mean, area: n };
}

/**
 * El salto en el borde entre `a` y `b` a la escala `band` (texeles), sin los degradados (D48): la media
 * de cada lado en dos bandas, de 0 a `band` texeles del otro lado y de `band` a 2 × `band`, a lo largo
 * del borde (σ = `along`, por defecto 2 × `band`); la de la banda de dentro, extrapolada al borde con la
 * pendiente de su propio lado. Así un degradado natural del terreno (que con medias más anchas pasaría por
 * salto) no cuenta, y un escalón sí, entero: (b₁ − a₁) − ((a₁ − a₂) + (b₂ − b₁)) / 2. Por teselas de
 * `tile` texeles, la media en sus píxeles del borde (al menos `minBorder`), solo donde las cuatro bandas
 * tienen datos (`valid`, si se da, limita los dos lados).
 */
export function borderJumps(
  L,
  a,
  b,
  width,
  height,
  {
    band,
    along = 2 * band,
    tile = 64,
    maxLat = 70,
    minBorder = 32,
    minWeight = 0.05,
    valid = null,
  },
) {
  const pixels = width * height;
  const reach = Math.ceil(2 * band) + 2;
  const dA = distanceTo(b, width, height, reach); // en `a`, la distancia a `b`
  const dB = distanceTo(a, width, height, reach); // en `b`, la distancia a `a`
  const bandMean = (side, dist, from, to) => {
    const m = new Float32Array(pixels);
    const ml = new Float32Array(pixels);
    for (let k = 0; k < pixels; k++) {
      if (!side[k] || (valid && !valid[k])) continue;
      if (dist[k] > from && dist[k] <= to) {
        m[k] = 1;
        ml[k] = L[k];
      }
    }
    const w = measureBlur(m, width, height, along);
    const s = measureBlur(ml, width, height, along);
    return { w, s };
  };
  const a1 = bandMean(a, dA, 0, band);
  const a2 = bandMean(a, dA, band, 2 * band);
  const b1 = bandMean(b, dB, 0, band);
  const b2 = bandMean(b, dB, band, 2 * band);
  const list = [];
  for (let ty = 0; ty < height; ty += tile) {
    for (let tx = 0; tx < width; tx += tile) {
      let sum = 0;
      let count = 0;
      for (let j = ty; j < Math.min(ty + tile, height); j++) {
        const lat = 90 - ((j + 0.5) / height) * 180;
        if (Math.abs(lat) > maxLat) continue;
        for (let i = tx; i < Math.min(tx + tile, width); i++) {
          const k = j * width + i;
          const edge = a[k] ? dA[k] <= 1 : b[k] ? dB[k] <= 1 : false;
          if (!edge || (valid && !valid[k])) continue;
          if (
            a1.w[k] < minWeight ||
            a2.w[k] < minWeight ||
            b1.w[k] < minWeight ||
            b2.w[k] < minWeight
          )
            continue;
          const ma1 = a1.s[k] / a1.w[k];
          const ma2 = a2.s[k] / a2.w[k];
          const mb1 = b1.s[k] / b1.w[k];
          const mb2 = b2.s[k] / b2.w[k];
          sum += mb1 - ma1 - (ma1 - ma2 + (mb2 - mb1)) / 2;
          count++;
        }
      }
      if (count >= minBorder) list.push({ tx, ty, delta: sum / count, count });
    }
  }
  return list;
}

/** Lo natural de `borderJumps`: el mismo salto en bordes ficticios dentro de lo real (como `naturalSteps`). */
export function naturalJumps(L, real, width, height, options) {
  const list = [];
  for (const turn of [0.25, 0.5, 0.75]) {
    const shift = Math.round(turn * width);
    const a = new Uint8Array(width * height);
    const b = new Uint8Array(width * height);
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const from = j * width + ((i + shift) % width);
        a[j * width + i] = real[from];
        b[j * width + i] = 1 - real[from];
      }
    }
    list.push(...borderJumps(L, a, b, width, height, { ...options, valid: real }));
  }
  return list;
}

/**
 * Solo el grano de `recreationQuality` (D45): el cociente entre la raíz de la media del cuadrado del paso
 * alto de L* (σ = 1,5 texeles) de lo recreado (clase distinta de 0) a menos de `band` texeles de lo real y
 * el de lo real a menos de `band` de lo recreado, entre ±`maxLat`. Para calibrar sin la medida entera.
 */
export function grainRatio(values, classes, width, height, { maxLat = 70, band = 32 } = {}) {
  const L = new Float32Array(width * height);
  for (let k = 0; k < L.length; k++) L[k] = lightness(values[k]);
  const low = gaussianBlur(L, width, height, 1.5, true);
  const real = Uint8Array.from(classes, (c) => (c === 0 ? 1 : 0));
  const synth = Uint8Array.from(classes, (c) => (c === 0 ? 0 : 1));
  const toReal = distanceTo(real, width, height, band + 1);
  const toSynth = distanceTo(synth, width, height, band + 1);
  const weights = rowWeights(height);
  let sr = 0;
  let nr = 0;
  let ss = 0;
  let ns = 0;
  for (let j = 0; j < height; j++) {
    const lat = 90 - ((j + 0.5) / height) * 180;
    if (Math.abs(lat) > maxLat) continue;
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      const hp = (L[k] - low[k]) ** 2;
      if (real[k] && toSynth[k] <= band) {
        sr += weights[j] * hp;
        nr += weights[j];
      } else if (synth[k] && toReal[k] <= band) {
        ss += weights[j] * hp;
        ns += weights[j];
      }
    }
  }
  return nr && ns ? Math.sqrt(ss / ns) / Math.sqrt(sr / nr) : NaN;
}
