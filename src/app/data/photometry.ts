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
   * Contraste de la textura (1: el suyo; menos, más plano), si en luz visible el cuerpo tiene menos
   * detalle que la textura. Conserva el brillo medio.
   */
  readonly contrast?: { readonly value: number; readonly note: string };
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

/**
 * Partículas de los anillos de Saturno (solo cuenta su función de fase; la profundidad óptica y el
 * albedo de cada anillo salen de la ficha de la NASA, en la tira de los anillos): el pico de
 * oposición y la dispersión hacia atrás de la Luna, como unas partículas heladas y rugosas, y un
 * lóbulo hacia delante para el polvo fino que hace brillar los anillos tenues a contraluz.
 * Aproximación y ajuste visual, comparando con las fotos del Hubble y de Cassini.
 */
export const RING_PHOTOMETRY: {
  readonly photometry: Photometry;
  /** Luz de los anillos sobre el planeta (fracción de la del Sol): se ve en su lado nocturno. */
  readonly ringShine: number;
  /**
   * Color de cada anillo (RGB lineal / luminancia), medido en una foto en color real. La tira de los
   * anillos (`scripts/build-textures.mjs`) conserva el brillo de la textura (su estructura radial, que
   * modula el albedo de la ficha) y toma este color: el de la textura sale morado en los anillos
   * tenues.
   */
  readonly chromaticity: {
    readonly C: readonly [number, number, number];
    readonly B: readonly [number, number, number];
    readonly Cassini: readonly [number, number, number];
    readonly A: readonly [number, number, number];
    readonly source: string;
  };
  readonly note: string;
} = {
  photometry: { ...MOON, forwardFraction: 0.08, forwardAsymmetry: 0.75 },
  ringShine: 0.05,
  chromaticity: {
    C: [1.04, 0.96, 1.24],
    B: [0.94, 1.01, 1.07],
    Cassini: [0.92, 1.0, 1.24],
    A: [0.99, 1.0, 1.09],
    source:
      'Media de cada anillo en el ansa derecha (a menos de 0,3 semiejes menores del eje mayor; C 80–90, B 95–115, Cassini 118,5–121,5 y A 124–135 mil km) de la foto del Hubble del 20-06-2019 (OPAL, NASA/ESA, A. Simon y M. H. Wong; https://esahubble.org/images/heic1917a/), con scripts/measure-reference-colors.mjs. El anillo B es blanco algo azulado (el balance de color de esa foto), no tostado.',
  },
  note: 'Fase de la Luna y un lóbulo hacia delante (8 %, g = 0,75) para el polvo fino; luz de los anillos sobre el planeta, 0,05 de la del Sol por el seno de su elevación: aproximación y ajuste visual.',
};

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
    chromaticity: {
      rgb: [1.027, 0.996, 0.958],
      mix: 1,
      source:
        'Albedos geométricos por banda de Mallama, Krobusek y Pavlov (2017, Icarus 282, 19, tabla 7; https://arxiv.org/abs/1609.05048): g′ 0,664 (469 nm), V 0,689 (549 nm) y r′ 0,712 (616 nm), interpolados a las longitudes de onda dominantes de los primarios sRGB (611, 549 y 464 nm). No hay una foto de Venus en color real con licencia compatible, y la textura era ocre (1,42/0,94/0,40): en el visible, Venus es casi tan blanca como el Sol (B−V 0,70 frente a 0,65)',
    },
    contrast: {
      value: 0.3,
      note: 'En luz visible, las nubes de Venus casi no tienen contraste (PIA10124, MESSENGER); la textura las realza como en las imágenes en ultravioleta.',
    },
    calibrateAlbedo: true,
    note: 'Ajustada a la ley de fase de Hilton (2005); la neblina (tono, limbo y crepúsculo), ajuste visual. Color: la fotometría de Mallama et al. (2017).',
  },
  tierra: {
    kind: 'atmosphere',
    photometry: giant(1),
    haze: haze(0.06, 1.5, 0.12, 1.2),
    hazeColor: '#cfe2ff',
    haloScaleHeight: 0.002,
    calibrateAlbedo: false,
    note: 'Lambert. Desde la fase 5, la Tierra lleva nubes, océanos, luces nocturnas y la luz que dispersa la atmósfera sobre el lado diurno (VISUAL_CONFIG.earth); esta neblina solo aclara el limbo, azulada y más tenue que la de la fase 3b (el velo lechoso de la revisión del bloque R, R3). Ajuste visual con las fotos de EPIC (DSCOVR, 21-06-2016; docs/realismo/referencias.md). El brillo lo pone su albedo geométrico, que incluye las nubes.',
  },
  marte: {
    kind: 'atmosphere',
    photometry: MARS,
    haze: haze(0.12, 4, 0.12, 1),
    hazeColor: '#cfe0f2',
    chromaticity: {
      rgb: [1.789, 0.838, 0.285],
      mix: 1,
      source:
        'Media del 70 % del disco en la foto del Hubble de Marte del 12-05-2016 (heic1609, NASA/ESA; https://cdn.esahubble.org/archives/images/screen/heic1609a.jpg), con scripts/measure-reference-colors.mjs. Entera: con una parte del color de la textura (más roja y saturada), la captura salía más saturada que la foto',
    },
    haloScaleHeight: 0.006,
    calibrateAlbedo: true,
    note: 'Ajustada a la ley de fase lineal de astronomy-engine 2.1.19 (VisualMagnitude). Neblina azulada y blanquecina en el limbo, como en las fotos del Hubble (ajuste visual). Color: Hubble 2016.',
  },
  jupiter: {
    kind: 'giant',
    photometry: giant(1),
    haze: haze(0.02, 4, 0.07, 10),
    haloScaleHeight: 0.005,
    hazeColor: '#f2e3cc',
    chromaticity: {
      rgb: [1.196, 0.974, 0.684],
      mix: 0.5,
      source:
        'Media del 60 % del disco en la foto del Hubble de Júpiter del 27-06-2019 (OPAL, NASA/ESA; https://cdn.esahubble.org/archives/images/screen/heic1914a.jpg), con scripts/measure-reference-colors.mjs: las zonas de la textura eran azuladas',
    },
    calibrateAlbedo: true,
    note: 'Minnaert k = 1,0 (NASA-CR-131891, 1973, https://ntrs.nasa.gov/citations/19730014045, medido entre 0,6 y 2,0 µm). Neblina: ajuste visual.',
  },
  saturno: {
    kind: 'giant',
    photometry: giant(0.85),
    haze: haze(0.02, 4, 0.07, 10),
    haloScaleHeight: 0.005,
    hazeColor: '#f0e2c4',
    chromaticity: {
      rgb: [1.356, 0.94, 0.548],
      mix: 0.5,
      source:
        'Media del 50 % del globo, por encima de los anillos, en la foto del Hubble de Saturno del 20-06-2019 (OPAL, NASA/ESA; https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg), con scripts/measure-reference-colors.mjs',
    },
    calibrateAlbedo: true,
    note: 'Minnaert k = 0,85, en el intervalo 0,75–0,90 medido según la latitud (NASA-CR-131891, 1973, https://ntrs.nasa.gov/citations/19730014045, entre 0,6 y 2,0 µm). Neblina: ajuste visual.',
  },
  urano: {
    kind: 'giant',
    photometry: giant(0.8),
    haze: haze(0.04, 3, 0.07, 8),
    haloScaleHeight: 0.006,
    hazeColor: '#c9f0f2',
    chromaticity: {
      rgb: [0.765, 1.063, 1.065],
      mix: 1,
      source:
        'Media del 60 % del disco en la reconstrucción en color real de Irwin et al. (2024, MNRAS 527, 11521, https://doi.org/10.1093/mnras/stad3761), en la figura de The Planetary Society (https://www.planetary.org/space-images/the-true-colors-of-uranus-and-neptune), con scripts/measure-reference-colors.mjs',
    },
    calibrateAlbedo: true,
    note: 'Minnaert y neblina: ajuste visual con las fotos del Hubble y de Voyager 2. Color: Irwin et al. (2024).',
  },
  neptuno: {
    kind: 'giant',
    photometry: giant(0.8),
    haze: haze(0.04, 3, 0.07, 8),
    haloScaleHeight: 0.006,
    hazeColor: '#bfe0f5',
    chromaticity: {
      rgb: [0.654, 1.074, 1.281],
      mix: 1,
      source:
        'Media del 60 % del disco en la reconstrucción en color real de Irwin et al. (2024, MNRAS 527, 11521, https://doi.org/10.1093/mnras/stad3761), en la figura de The Planetary Society (https://www.planetary.org/space-images/the-true-colors-of-uranus-and-neptune), con scripts/measure-reference-colors.mjs: la textura (de las imágenes realzadas de Voyager 2) era demasiado azul',
    },
    calibrateAlbedo: true,
    note: 'Minnaert y neblina: ajuste visual con las fotos del Hubble. Color: Irwin et al. (2024), que corrigen el azul exagerado de las primeras imágenes de Voyager 2.',
  },
  luna: {
    ...airless(
      'Ajustada a la ley de fase de la Luna de astronomy-engine 2.1.19 (MoonMagnitude), con el disco plano en fase llena.',
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
