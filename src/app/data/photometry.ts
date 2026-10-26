/**
 * Fotometría de cada cuerpo (D29): qué modelo de luz usa y con qué parámetros. Las fórmulas están en
 * `ephemeris/photometry.ts` (y en GLSL en `scene/materials/shading.ts`); aquí, los valores y de
 * dónde sale cada uno:
 * - **Ajustados a una ley de fase publicada** con `scripts/fit-photometry.mjs` (Mercurio, Venus,
 *   Marte y la Luna): la curva de fase del disco entero sigue la ley de magnitud que usa
 *   astronomy-engine. `photometry.spec.ts` lo comprueba.
 * - **De la literatura** (el exponente de Minnaert de Júpiter y Saturno).
 * - **Ajuste visual**, comparando con las fotos de `docs/realismo/referencias.md`: el brillo de las
 *   atmósferas y el exponente de Urano, Neptuno y Titán. Son dirección de arte, no medidas.
 *
 * El brillo absoluto lo pone el albedo geométrico del catálogo (`data/body-data.ts`).
 */
import type { BodyId } from './body.model';
import type { Haze, Photometry } from '../ephemeris/photometry';

export type PhotometricKind = 'rocky' | 'giant' | 'atmosphere';

export interface BodyPhotometry {
  readonly kind: PhotometricKind;
  readonly photometry: Photometry;
  /** Atmósfera visible (limbo y crepúsculo), o `null`. */
  readonly haze: Haze | null;
  /** Tono de la atmósfera (sRGB). */
  readonly hazeColor: string;
  /**
   * Altura de escala del halo por encima del limbo, en radios del cuerpo (ajuste visual: a escala
   * real, la atmósfera de la Tierra apenas mide un píxel en un primer plano).
   */
  readonly haloScaleHeight?: number;
  /**
   * Color medido en una foto de referencia, si la textura no lo respeta: la textura conserva sus
   * detalles (su luminancia) y toma esta cromaticidad (RGB lineal / luminancia) en la proporción
   * `mix` (1: toda; menos, conserva parte de las variaciones de color de la textura).
   */
  readonly chromaticity?: {
    readonly rgb: readonly [number, number, number];
    readonly mix: number;
    readonly source: string;
  };
  /**
   * ¿Se calibra el brillo con el albedo geométrico? En la Tierra, no hasta la fase 5: su albedo
   * (0,434) incluye las nubes, que todavía no se dibujan.
   */
  readonly calibrateAlbedo: boolean;
  /** De dónde salen los parámetros. */
  readonly note: string;
}

const NO_FORWARD = { forwardFraction: 0, forwardAsymmetry: 0.5 } as const;
const NO_OPPOSITION = { oppositionAmplitude: 0, oppositionWidth: 0.1 } as const;

/** La Luna, ajustada a su ley de fase (RMS 0,013 mag de 2,5° a 150°). */
const MOON: Photometry = {
  lommel: 1,
  lommelSlope: 0.225,
  minnaertK: 1,
  oppositionAmplitude: 2.354,
  oppositionWidth: 0.241,
  backAsymmetry: -0.127,
  ...NO_FORWARD,
};

/** Mercurio, ajustado a la ley de Hilton (2005) (RMS 0,117 mag de 2,5° a 167,5°). */
const MERCURY: Photometry = {
  lommel: 1,
  lommelSlope: 1.706,
  minnaertK: 1,
  oppositionAmplitude: 1.027,
  oppositionWidth: 0.078,
  backAsymmetry: -0.118,
  ...NO_FORWARD,
};

/** Venus, ajustada a la ley de Hilton (2005) (RMS 0,096 mag de 2,5° a 167,5°). */
const VENUS: Photometry = {
  lommel: 0,
  lommelSlope: 0,
  minnaertK: 0.5,
  ...NO_OPPOSITION,
  backAsymmetry: -0.16,
  forwardFraction: 0.231,
  forwardAsymmetry: 0.756,
};

/** Marte, ajustado a la ley lineal de astronomy-engine (RMS 0,022 mag de 2,5° a 47,5°). */
const MARS: Photometry = {
  lommel: 1,
  lommelSlope: 1.659,
  minnaertK: 1,
  ...NO_OPPOSITION,
  backAsymmetry: 0.042,
  ...NO_FORWARD,
};

/** Un gigante con el exponente de Minnaert dado, sin pico de oposición y con dispersión isótropa. */
const giant = (minnaertK: number): Photometry => ({
  lommel: 0,
  lommelSlope: 0,
  minnaertK,
  ...NO_OPPOSITION,
  backAsymmetry: 0,
  ...NO_FORWARD,
});

/** Atmósfera: brillo en el limbo, exponente, crepúsculo (en μ₀) y refuerzo a contraluz. */
const haze = (strength: number, limbExponent: number, twilight: number, forwardBoost: number) =>
  ({ strength, limbExponent, twilight, forwardBoost, forwardAsymmetry: 0.7 }) as const;

/** Las lunas sin atmósfera usan la fotometría de la Luna (aproximación documentada). */
const airless = (
  note = 'Fotometría de la Luna (aproximación: no hay leyes de fase de cada luna en el proyecto).',
): BodyPhotometry => ({
  kind: 'rocky',
  photometry: MOON,
  haze: null,
  hazeColor: '#ffffff',
  calibrateAlbedo: true,
  note,
});

export const BODY_PHOTOMETRY: Readonly<Record<Exclude<BodyId, 'sol'>, BodyPhotometry>> = {
  mercurio: {
    kind: 'rocky',
    photometry: MERCURY,
    haze: null,
    hazeColor: '#ffffff',
    calibrateAlbedo: true,
    note: 'Ajustada a la ley de fase de Hilton (2005, AJ 129, 2902), con el disco plano en fase llena.',
  },
  venus: {
    kind: 'atmosphere',
    photometry: VENUS,
    haze: haze(0.35, 3, 0.18, 2.5),
    hazeColor: '#f4e6c8',
    haloScaleHeight: 0.012,
    calibrateAlbedo: true,
    note: 'Ajustada a la ley de fase de Hilton (2005); la neblina (tono, limbo y crepúsculo), ajuste visual.',
  },
  tierra: {
    kind: 'atmosphere',
    photometry: giant(1),
    haze: haze(0.45, 4, 0.12, 1.2),
    hazeColor: '#8fb4ff',
    haloScaleHeight: 0.009,
    calibrateAlbedo: false,
    note: 'Provisional hasta la fase 5: Lambert y una atmósfera azul (ajuste visual).',
  },
  marte: {
    kind: 'atmosphere',
    photometry: MARS,
    haze: haze(0.12, 4, 0.12, 1),
    hazeColor: '#cfe0f2',
    chromaticity: {
      rgb: [1.789, 0.838, 0.285],
      mix: 0.75,
      source:
        'Media del disco (70 % del radio) en la foto del Hubble de Marte del 12-05-2016 (heic1609, NASA/ESA), medida en su imagen: la textura era más roja y saturada',
    },
    haloScaleHeight: 0.006,
    calibrateAlbedo: true,
    note: 'Ajustada a la ley de fase lineal de astronomy-engine. Neblina azulada y blanquecina en el limbo, como en las fotos del Hubble (ajuste visual). Color: Hubble 2016.',
  },
  jupiter: {
    kind: 'giant',
    photometry: giant(1),
    haze: haze(0.04, 4, 0.07, 1.5),
    hazeColor: '#f2e3cc',
    chromaticity: {
      rgb: [1.202, 0.972, 0.679],
      mix: 0.5,
      source:
        'Media del disco (60 % del radio) en la foto del Hubble de Júpiter del 27-06-2019 (OPAL, NASA/ESA), medida en su imagen: las zonas de la textura eran azuladas',
    },
    calibrateAlbedo: true,
    note: 'Minnaert k = 1,0 en el visible (NASA-CR-131891, 1973; y Lambert en las correcciones de Cassini ISS). Neblina: ajuste visual.',
  },
  saturno: {
    kind: 'giant',
    photometry: giant(0.85),
    haze: haze(0.04, 4, 0.07, 1.5),
    hazeColor: '#f0e2c4',
    chromaticity: {
      rgb: [1.357, 0.938, 0.559],
      mix: 0.5,
      source:
        'Media del disco (60 % del radio) en la foto del Hubble de Saturno del 20-06-2019 (OPAL, NASA/ESA), medida en su imagen',
    },
    calibrateAlbedo: true,
    note: 'Minnaert k = 0,85, en el intervalo 0,75–0,90 medido según la latitud (NASA-CR-131891, 1973). Neblina: ajuste visual.',
  },
  urano: {
    kind: 'giant',
    photometry: giant(0.8),
    haze: haze(0.06, 3, 0.07, 1.5),
    hazeColor: '#c9f0f2',
    chromaticity: {
      rgb: [0.767, 1.063, 1.061],
      mix: 1,
      source:
        'Media del disco en la reconstrucción en color real de Irwin et al. (2024, MNRAS 527, 11521, https://doi.org/10.1093/mnras/stad3761), medida en su imagen',
    },
    calibrateAlbedo: true,
    note: 'Minnaert y neblina: ajuste visual con las fotos del Hubble y de Voyager 2. Color: Irwin et al. (2024).',
  },
  neptuno: {
    kind: 'giant',
    photometry: giant(0.8),
    haze: haze(0.06, 3, 0.07, 1.5),
    hazeColor: '#bfe0f5',
    chromaticity: {
      rgb: [0.65, 1.075, 1.288],
      mix: 1,
      source:
        'Media del disco en la reconstrucción en color real de Irwin et al. (2024, MNRAS 527, 11521, https://doi.org/10.1093/mnras/stad3761), medida en su imagen: la textura (de las imágenes realzadas de Voyager 2) era demasiado azul',
    },
    calibrateAlbedo: true,
    note: 'Minnaert y neblina: ajuste visual con las fotos del Hubble. Color: Irwin et al. (2024), que corrigen el azul exagerado de las primeras imágenes de Voyager 2.',
  },
  luna: {
    ...airless(
      'Ajustada a la ley de fase de la Luna de astronomy-engine, con el disco plano en fase llena.',
    ),
  },
  fobos: airless(),
  deimos: airless(),
  io: airless(),
  europa: airless(),
  ganimedes: airless(),
  calisto: airless(),
  mimas: airless(),
  encelado: airless(),
  tetis: airless(),
  dione: airless(),
  rea: airless(),
  titan: {
    kind: 'atmosphere',
    photometry: giant(0.9),
    haze: haze(0.4, 2.5, 0.35, 3),
    hazeColor: '#e3a95c',
    haloScaleHeight: 0.04,
    calibrateAlbedo: true,
    note: 'Neblina espesa y anaranjada: Minnaert y atmósfera, ajuste visual (la fase 7 añade su textura).',
  },
  japeto: airless(),
  miranda: airless(),
  ariel: airless(),
  umbriel: airless(),
  titania: airless(),
  oberon: airless(),
  triton: airless(),
  proteo: airless(),
};
