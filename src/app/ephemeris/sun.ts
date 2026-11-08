/**
 * El Sol en luz visible (fase 9b, D41), en TS puro y con tests:
 * - el oscurecimiento del limbo por longitud de onda (la ley de potencia de Hestroffer y Magnan, 1998);
 * - el color del centro del disco que da al disco entero el color de su temperatura efectiva;
 * - la rotación diferencial de las manchas (Lößnitz et al., 2025) respecto al meridiano de la IAU;
 * - un calendario determinista de manchas **ilustrativas** (no son las de ese día: eso pediría datos
 *   en vivo, D24): cada una nace, dura y se apaga, en las bandas de latitud de las manchas, con esa
 *   rotación. Sus tamaños, vidas y bandas los pone la configuración visual (`scene/visual-config.ts`).
 */

/**
 * El exponente α de la ley I(μ)/I(1) = μ^α del oscurecimiento del limbo del Sol para una longitud de
 * onda (nm): α ≈ −0,023 + 0,292·λ⁻¹, con λ⁻¹ en μm⁻¹, «exacta a unos ±0,02» para λ⁻¹ < 2,4 μm⁻¹
 * (λ > 417 nm). Hestroffer y Magnan (1998), «Wavelength dependency of the Solar limb darkening»,
 * A&A 333, 338–342, ec. 5: el ajuste de los exponentes de los datos de Pierce y Slaughter (1977) y de
 * Neckel y Labs (1994), que llegan a 2402 nm.
 */
export function solarLimbExponent(wavelengthNm: number): number {
  if (!(wavelengthNm > 1000 / 2.4 && wavelengthNm <= 2402)) {
    throw new RangeError('La ley de Hestroffer y Magnan vale de 417 a 2402 nm.');
  }
  return -0.023 + 0.292 / (wavelengthNm / 1000);
}

/** I(μ)/I(1) = μ^α (μ, el coseno entre la normal y la visual, de 0 en el limbo a 1 en el centro). */
export function solarLimbIntensity(mu: number, exponent: number): number {
  return Math.min(Math.max(mu, 0), 1) ** exponent;
}

/**
 * Las longitudes de onda (nm) con las que se oscurece cada canal de color (R, G y B): una elección de
 * presentación, una por canal en el centro de cada parte del visible.
 */
export const SOLAR_CHANNEL_WAVELENGTHS_NM = [650, 550, 450] as const;

/** Los exponentes del limbo de los tres canales (R, G y B): 0,426, 0,508 y 0,626. */
export const SOLAR_LIMB_EXPONENTS = SOLAR_CHANNEL_WAVELENGTHS_NM.map(solarLimbExponent) as [
  number,
  number,
  number,
];

/**
 * El color (RGB lineal) del centro del disco que da al disco entero el color `disc` (el de un cuerpo
 * negro a la temperatura efectiva del catálogo): el flujo de un disco con I(μ) = I(1)·μ^α es
 * I(1)·2/(α + 2), así que, canal a canal, el centro es el del disco por (α + 2)/2. Se normaliza a la
 * luminancia de `disc` (el brillo lo pone la intensidad del material): el centro sale algo más
 * blanco y azulado que el disco entero, y el borde, más rojo.
 */
export function solarCenterColor(
  disc: readonly [number, number, number],
  exponents: readonly [number, number, number] = SOLAR_LIMB_EXPONENTS,
): [number, number, number] {
  const luminance = ([r, g, b]: readonly [number, number, number]) =>
    0.2126 * r + 0.7152 * g + 0.0722 * b;
  const center = disc.map((c, k) => (c * ((exponents[k] as number) + 2)) / 2) as [
    number,
    number,
    number,
  ];
  const scale = luminance(disc) / luminance(center);
  return center.map((c) => c * scale) as [number, number, number];
}

/**
 * La rotación diferencial de las manchas, ω(φ) = A + B·sin²φ + C·sin⁴φ en grados por día sidéreos:
 * la de las manchas α (redondas), con tres parámetros, medida con el HMI del SDO de 2013 a 2024, de
 * Lößnitz et al. (2025), «Differential rotation of solar α sunspots and implications for stellar light
 * curves», tabla A.1 (https://arxiv.org/abs/2508.08196): A = 14,336, B = −2,561 y C = −2,04. En el
 * ecuador, una vuelta en 25,1 días; a 30°, en 26,5.
 */
export const SUNSPOT_ROTATION = { a: 14.336, b: -2.561, c: -2.04 } as const;

/**
 * Lo que gira el meridiano 0 del Sol de la IAU (W = 84,176° + 14,1844°·d, la que usa astronomy-engine
 * para su orientación), en grados por día: las manchas se mueven respecto a él.
 */
export const SUN_MERIDIAN_RATE_DEG_PER_DAY = 14.1844;

/** La velocidad de rotación (grados por día, sidérea) de una mancha a esa latitud (grados). */
export function sunspotRotation(latitudeDeg: number): number {
  const s = Math.sin((latitudeDeg * Math.PI) / 180) ** 2;
  const { a, b, c } = SUNSPOT_ROTATION;
  return a + b * s + c * s * s;
}

/**
 * Lo que avanza en longitud una mancha a esa latitud en `days` días respecto al meridiano de la IAU
 * (grados; positivo, hacia el este, en el sentido de la rotación): en el ecuador, +0,15° al día; a 30°,
 * −0,62°.
 */
export const sunspotDrift = (latitudeDeg: number, days: number): number =>
  (sunspotRotation(latitudeDeg) - SUN_MERIDIAN_RATE_DEG_PER_DAY) * days;

/** Los parámetros, ilustrativos, del calendario de manchas (la configuración visual los da). */
export interface SunspotSchedule {
  /** Cuántas manchas hay a la vez como mucho (cada una con su vida). */
  readonly count: number;
  /** Banda de latitud (grados, en los dos hemisferios). */
  readonly latitudeDeg: readonly [number, number];
  /** Vida de cada mancha (días). */
  readonly lifeDays: readonly [number, number];
  /** Radio de la umbra (grados heliográficos). */
  readonly umbraDeg: readonly [number, number];
  /** Fracción de su vida en la que aparece y en la que se apaga. */
  readonly fadeIn: number;
  readonly fadeOut: number;
}

/** Una mancha en un instante: dónde está (en el sistema de la IAU), su umbra y lo que se ve (0–1). */
export interface Sunspot {
  readonly latitudeDeg: number;
  /** Longitud planetográfica en el sistema del meridiano de la IAU (grados, de 0 a 360). */
  readonly longitudeDeg: number;
  readonly umbraDeg: number;
  readonly presence: number;
}

/** Un número de 0 a 1 que solo depende de sus enteros (splitmix32 sobre su combinación). */
function hash01(...values: number[]): number {
  let h = 0x9e3779b9;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

const lerp = ([a, b]: readonly [number, number], t: number): number => a + (b - a) * t;
const smooth = (t: number): number => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

/** El instante de referencia del calendario (J2000, en ms UTC). */
const EPOCH_MS = Date.UTC(2000, 0, 1, 12);

/**
 * Las manchas ilustrativas de un instante: cada una de las `count` plazas tiene una vida que se repite
 * (con su desfase), y en cada vida una mancha nueva nace en un sitio y con un tamaño que solo dependen
 * de la plaza y de esa vida (la misma fecha da siempre las mismas manchas, como pide el modo de
 * captura), aparece, deriva con la rotación diferencial y se apaga. Al cambiar de vida su presencia es
 * 0: no salta nada que se vea.
 */
export function sunspotsAt(timeMs: number, schedule: SunspotSchedule): Sunspot[] {
  const days = (timeMs - EPOCH_MS) / 86_400_000;
  const spots: Sunspot[] = [];
  for (let k = 0; k < schedule.count; k++) {
    const life = lerp(schedule.lifeDays, hash01(k, 1));
    const offset = hash01(k, 2);
    const generation = Math.floor(days / life + offset);
    const age = days - (generation - offset) * life;
    const fraction = age / life;
    const presence =
      smooth(fraction / schedule.fadeIn) *
      (1 - smooth((fraction - (1 - schedule.fadeOut)) / schedule.fadeOut));
    const hemisphere = hash01(k, generation, 3) < 0.5 ? -1 : 1;
    const latitudeDeg = hemisphere * lerp(schedule.latitudeDeg, hash01(k, generation, 4));
    const birthLongitude = 360 * hash01(k, generation, 5);
    const longitudeDeg = (((birthLongitude + sunspotDrift(latitudeDeg, age)) % 360) + 360) % 360;
    spots.push({
      latitudeDeg,
      longitudeDeg,
      umbraDeg: lerp(schedule.umbraDeg, hash01(k, generation, 6)),
      presence,
    });
  }
  return spots;
}
