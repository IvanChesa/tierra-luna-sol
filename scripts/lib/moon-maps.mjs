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

/** La fracción del área de la esfera de cada clase (0, 1 y 2). */
export function classShares(classes, width, height) {
  const weights = rowWeights(height);
  const area = [0, 0, 0];
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
