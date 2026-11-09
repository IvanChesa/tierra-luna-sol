/**
 * La luz del cielo desde un lugar (fase 8): los colores de la cúpula, la magnitud más débil que se ve
 * y la ganancia de la Vía Láctea según la altura del Sol, y el oscurecimiento en un eclipse de Sol.
 * Funciones puras (sin three) con los valores ilustrativos de `VISUAL_CONFIG.sky`, con tests.
 */
import { VISUAL_CONFIG } from '../visual-config';

export type Rgb = readonly [number, number, number];

/** «#rrggbb» (sRGB) → lineal (0–1), el espacio en el que trabaja three. */
export function srgbHexToLinear(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 0xff) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [channel(16), channel(8), channel(0)];
}

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Interpola linealmente una tabla [x, y] (x creciente), constante fuera de ella. */
export function interpolateTable(table: readonly (readonly [number, number])[], x: number): number {
  const first = table[0];
  const last = table[table.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let k = 1; k < table.length; k++) {
    const [x1, y1] = table[k] as readonly [number, number];
    const [x0, y0] = table[k - 1] as readonly [number, number];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

export interface SkyColors {
  readonly zenith: Rgb;
  readonly horizon: Rgb;
  /** El resplandor del lado del Sol (sobre el horizonte). */
  readonly glow: Rgb;
}

const KEYFRAMES = VISUAL_CONFIG.sky.keyframes.map(
  ([altitude, zenith, horizon, glow]) =>
    [altitude, srgbHexToLinear(zenith), srgbHexToLinear(horizon), srgbHexToLinear(glow)] as const,
);

/** Los colores de la cúpula (lineales) con el Sol a esa altura geométrica (grados). */
export function skyColorsAt(sunAltitudeDeg: number): SkyColors {
  const first = KEYFRAMES[0] as (typeof KEYFRAMES)[number];
  const last = KEYFRAMES[KEYFRAMES.length - 1] as (typeof KEYFRAMES)[number];
  let a = first;
  let b = first;
  let t = 0;
  if (sunAltitudeDeg >= last[0]) {
    a = b = last;
  } else if (sunAltitudeDeg > first[0]) {
    for (let k = 1; k < KEYFRAMES.length; k++) {
      const next = KEYFRAMES[k] as (typeof KEYFRAMES)[number];
      if (sunAltitudeDeg <= next[0]) {
        a = KEYFRAMES[k - 1] as (typeof KEYFRAMES)[number];
        b = next;
        t = (sunAltitudeDeg - a[0]) / (b[0] - a[0]);
        break;
      }
    }
  }
  return {
    zenith: mixRgb(a[1], b[1], t),
    horizon: mixRgb(a[2], b[2], t),
    glow: mixRgb(a[3], b[3], t),
  };
}

/**
 * Cuánto se ve el resplandor del lado del Sol pegado al horizonte (0–1) con el Sol a esa altura
 * (grados): entero en la puesta y poco con el Sol alto (`VISUAL_CONFIG.sky.glow.band`).
 */
export const glowBandAt = (sunAltitudeDeg: number): number =>
  interpolateTable(VISUAL_CONFIG.sky.glow.band, sunAltitudeDeg);

const SUN_DISC = VISUAL_CONFIG.sky.sunDisc.map(
  ([altitude, color]) => [altitude, srgbHexToLinear(color)] as const,
);

/**
 * El color del disco del Sol (lineal, que multiplica su blanco cálido) con el Sol a esa altura
 * (grados): blanco desde unos 20° y cada vez más naranja hacia el horizonte (`VISUAL_CONFIG.sky.sunDisc`).
 */
export function sunDiscTintAt(sunAltitudeDeg: number): Rgb {
  const first = SUN_DISC[0] as (typeof SUN_DISC)[number];
  const last = SUN_DISC[SUN_DISC.length - 1] as (typeof SUN_DISC)[number];
  if (sunAltitudeDeg <= first[0]) return first[1];
  if (sunAltitudeDeg >= last[0]) return last[1];
  for (let k = 1; k < SUN_DISC.length; k++) {
    const b = SUN_DISC[k] as (typeof SUN_DISC)[number];
    if (sunAltitudeDeg <= b[0]) {
      const a = SUN_DISC[k - 1] as (typeof SUN_DISC)[number];
      return mixRgb(a[1], b[1], (sunAltitudeDeg - a[0]) / (b[0] - a[0]));
    }
  }
  return last[1];
}

/** Luminancia relativa (lineal) de un color: para comprobar que el cielo se oscurece en orden. */
export const luminance = (c: Rgb): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** La magnitud más débil que se ve con el Sol a esa altura. */
export const starLimitAt = (sunAltitudeDeg: number): number =>
  interpolateTable(VISUAL_CONFIG.sky.starLimit, sunAltitudeDeg);

/** La ganancia de la Vía Láctea (0–1) con el Sol a esa altura. */
export const milkyWayGainAt = (sunAltitudeDeg: number): number =>
  interpolateTable(VISUAL_CONFIG.sky.milkyWay, sunAltitudeDeg);

/** La opacidad de las líneas de las constelaciones (0–0,5) con el Sol a esa altura. */
export const constellationOpacityAt = (sunAltitudeDeg: number): number =>
  interpolateTable(VISUAL_CONFIG.sky.constellations, sunAltitudeDeg);

/** La luz del día, de 0 (noche) a 1 (Sol alto), para el suelo. */
export const daylightAt = (sunAltitudeDeg: number): number =>
  Math.min(Math.max((sunAltitudeDeg + 6) / 16, 0), 1);

/**
 * Parte del disco del Sol tapada por la Luna (0–1), vistos los dos discos desde el lugar: el área de
 * la intersección de dos círculos de radios `sun` y `moon` con los centros a `separation` (en grados,
 * o en cualquier unidad común), entre el área del Sol.
 */
export function discOverlapFraction(separation: number, sun: number, moon: number): number {
  const d = Math.abs(separation);
  if (sun <= 0) return 0;
  if (d >= sun + moon) return 0;
  if (d <= Math.abs(moon - sun)) return moon >= sun ? 1 : (moon * moon) / (sun * sun);
  const a = Math.acos(Math.min(Math.max((d * d + sun * sun - moon * moon) / (2 * d * sun), -1), 1));
  const b = Math.acos(
    Math.min(Math.max((d * d + moon * moon - sun * sun) / (2 * d * moon), -1), 1),
  );
  const area =
    sun * sun * a +
    moon * moon * b -
    0.5 *
      Math.sqrt(
        Math.max((-d + sun + moon) * (d + sun - moon) * (d - sun + moon) * (d + sun + moon), 0),
      );
  return Math.min(Math.max(area / (Math.PI * sun * sun), 0), 1);
}

/**
 * Cuánto de totalidad hay (0–1) con esa parte del disco del Sol tapada: nada hasta el 99,9 % y toda con
 * el disco tapado del todo (en un eclipse total, la Luna es mayor que el Sol: la fracción llega a 1 y se
 * queda ahí mientras dura). Con ella salen la corona, el anillo del horizonte y la Luna oscura.
 */
export function totalityOf(obscuration: number): number {
  return Math.min(Math.max((obscuration - 0.999) / 0.001, 0), 1);
}

/**
 * La altura del Sol «efectiva» para la luz del cielo en un eclipse: con el Sol tapado casi del todo,
 * el cielo se oscurece hacia el de un crepúsculo civil tardío (`VISUAL_CONFIG.sky.eclipse`).
 */
export function eclipseSkyAltitude(sunAltitudeDeg: number, obscuration: number): number {
  const { from, altitudeDeg } = VISUAL_CONFIG.sky.eclipse;
  if (obscuration <= from || sunAltitudeDeg <= altitudeDeg) return sunAltitudeDeg;
  const t = Math.min((obscuration - from) / (1 - from), 1);
  const smooth = t * t * (3 - 2 * t);
  return sunAltitudeDeg + (altitudeDeg - sunAltitudeDeg) * smooth;
}
