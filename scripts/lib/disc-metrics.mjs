// Medidas de un disco en una imagen (fase 9b, D46): las del Sol (el color del centro y del borde y el
// contraste a gran escala de su superficie) con las que se compara el nuestro con la referencia. Las
// mismas funciones para las capturas de la referencia y para las nuestras: lo que se compara se mide
// igual. La imagen, RGB(A) de 8 bits en sRGB (`{ data, info }` de sharp); el disco, su centro y su radio
// (px).
import { gaussianBlur } from './moon-maps.mjs';
import { cielab, srgbToLinear } from './color.mjs';

/** El color medio (RGB lineal y CIELAB) de los píxeles del disco con μ entre `mu0` y `mu1`. */
export function ringColor({ data, info }, { cx, cy, r }, mu0, mu1) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(info.height - 1, cy + r); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(info.width - 1, cx + r); x++) {
      const d2 = ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (r * r);
      if (d2 >= 1) continue;
      const mu = Math.sqrt(1 - d2);
      if (mu < mu0 || mu > mu1) continue;
      const k = (y * info.width + x) * info.channels;
      for (let c = 0; c < 3; c++) sum[c] += srgbToLinear(data[k + c]);
      n++;
    }
  }
  const rgb = sum.map((v) => v / n);
  return { rgb, lab: cielab(rgb), pixels: n };
}

/**
 * El contraste a gran escala de la superficie de un disco: la desviación típica de L* (por encima de
 * μ = `minMu`), con la imagen desenfocada a `sigmaR` radios (sin la granulación ni el ruido) y sin el
 * perfil del limbo (la mediana de L* en anillos de μ, restada a cada píxel).
 */
export function largeScaleContrast(
  { data, info },
  { cx, cy, r },
  { minMu = 0.3, sigmaR = 0.02 } = {},
) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const w = Math.min(info.width, Math.ceil(cx + r)) - x0;
  const h = Math.min(info.height, Math.ceil(cy + r)) - y0;
  const L = new Float32Array(w * h);
  const inside = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const x = x0 + i;
      const y = y0 + j;
      const k = (y * info.width + x) * info.channels;
      const lab = cielab([
        srgbToLinear(data[k]),
        srgbToLinear(data[k + 1]),
        srgbToLinear(data[k + 2]),
      ]);
      L[j * w + i] = lab.L;
      inside[j * w + i] = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < r * r ? 1 : 0;
    }
  }
  // Desenfoque normalizado dentro del disco (el fondo no entra).
  const masked = new Float32Array(w * h);
  const weight = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    masked[k] = inside[k] ? L[k] : 0;
    weight[k] = inside[k];
  }
  const sigma = Math.max(0.5, sigmaR * r);
  const blurred = gaussianBlur(masked, w, h, sigma);
  const norm = gaussianBlur(weight, w, h, sigma);
  // El perfil del limbo: la mediana de L* desenfocado en anillos de μ.
  const BINS = 20;
  const bins = Array.from({ length: BINS }, () => []);
  const muOf = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!inside[k] || norm[k] < 0.5) continue;
      const d2 = ((x0 + i + 0.5 - cx) ** 2 + (y0 + j + 0.5 - cy) ** 2) / (r * r);
      const mu = Math.sqrt(Math.max(0, 1 - d2));
      muOf[k] = mu;
      if (mu < minMu) continue;
      bins[Math.min(BINS - 1, Math.floor(mu * BINS))].push(blurred[k] / norm[k]);
    }
  }
  const medians = bins.map((list) => {
    if (!list.length) return Number.NaN;
    list.sort((a, b) => a - b);
    return list[Math.floor(list.length / 2)];
  });
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let k = 0; k < w * h; k++) {
    if (!inside[k] || norm[k] < 0.5 || muOf[k] < minMu) continue;
    const m = medians[Math.min(BINS - 1, Math.floor(muOf[k] * BINS))];
    if (!Number.isFinite(m)) continue;
    const v = blurred[k] / norm[k] - m;
    sum += v;
    sum2 += v * v;
    n++;
  }
  return Math.sqrt(Math.max(0, sum2 / n - (sum / n) ** 2));
}

/** El color del centro (μ > 0,9), el del borde (μ de 0,15 a 0,35) y el contraste a gran escala. */
export function sunMetrics(image, disc) {
  return {
    center: ringColor(image, disc, 0.9, 1),
    limb: ringColor(image, disc, 0.15, 0.35),
    contrast: largeScaleContrast(image, disc),
  };
}

/**
 * El resplandor alrededor de un disco: la mediana de L* (y su tono) en una circunferencia de `rho`
 * radios (720 muestras dentro de la imagen), para ver cuánto se aclara el fondo junto al Sol.
 */
export function ringLightness({ data, info }, { cx, cy, r }, rho) {
  const list = [];
  for (let a = 0; a < 720; a++) {
    const theta = (a / 720) * 2 * Math.PI;
    const x = Math.round(cx + rho * r * Math.cos(theta));
    const y = Math.round(cy + rho * r * Math.sin(theta));
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
    const k = (y * info.width + x) * info.channels;
    list.push(
      cielab([srgbToLinear(data[k]), srgbToLinear(data[k + 1]), srgbToLinear(data[k + 2])]),
    );
  }
  if (!list.length) return null;
  list.sort((p, q) => p.L - q.L);
  return list[Math.floor(list.length / 2)];
}

/** El Sol en la vista general: lo de `sunMetrics` y el resplandor a 1,5, 2 y 3 radios y el fondo (6). */
export function overviewSunMetrics(image, disc) {
  return {
    ...sunMetrics(image, disc),
    glow: Object.fromEntries([1.5, 2, 3, 6].map((rho) => [rho, ringLightness(image, disc, rho)])),
  };
}
