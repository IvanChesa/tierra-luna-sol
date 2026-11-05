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
 * la del mosaico; `ratio`, el de `detailBands`; `threshold`, el cociente por debajo del cual una zona se
 * vio de lejos. Las clases se limpian con un desenfoque de la máscara de lo visto de lejos (una zona
 * es «de lejos» si lo es la mayor parte de su entorno: sin motas sueltas).
 */
export function classify(coverage, ratio, width, height, threshold, smooth = 6, minArea = 0.004) {
  const far = new Float32Array(width * height);
  for (let k = 0; k < far.length; k++) far[k] = coverage[k] >= 0.5 && ratio[k] < threshold ? 1 : 0;
  const farSmooth = gaussianBlur(far, width, height, smooth, true);
  const classes = new Uint8Array(width * height);
  for (let k = 0; k < classes.length; k++) {
    classes[k] = coverage[k] < 0.5 ? 2 : farSmooth[k] > 0.5 ? 1 : 0;
  }
  // Sin islas: los trozos de lo real o de lo visto de lejos de menos de `minArea` de la esfera pasan a
  // la clase que los rodea (una llanura lisa dentro de lo real no es «de lejos»; un parche de ruido
  // dentro de lo de lejos no es real).
  absorbIslands(classes, width, height, 1, 0, minArea);
  absorbIslands(classes, width, height, 0, 1, minArea);
  return classes;
}

/**
 * Las componentes conexas (8 vecinos, con la vuelta del antimeridiano) de la clase `from` con menos de
 * `minArea` (fracción del área de la esfera) pasan a `to` si las rodea `to` o lo que no se vio.
 */
export function absorbIslands(classes, width, height, from, to, minArea) {
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
    if (!touchesOther && area / total < minArea) for (const k of members) classes[k] = to;
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
