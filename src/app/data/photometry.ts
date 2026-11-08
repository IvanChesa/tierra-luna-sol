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
   * El halo por encima del limbo, si no es como la neblina del disco (Titán, fase 7): su color
   * (cromaticidad, RGB lineal / luminancia) y su intensidad respecto a la de la neblina, ajustados a
   * una foto (el disco conserva `hazeColor`).
   */
  readonly halo?: {
    readonly chromaticity: readonly [number, number, number];
    readonly gain: number;
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

/**
 * Atmósfera: brillo en el limbo, exponente, crepúsculo (en μ₀), refuerzo a contraluz y asimetría de
 * ese refuerzo (g de Henyey–Greenstein: cuanto más cerca de 1, más estrecho y más a contraluz).
 */
const haze = (
  strength: number,
  limbExponent: number,
  twilight: number,
  forwardBoost: number,
  forwardAsymmetry = 0.7,
) => ({ strength, limbExponent, twilight, forwardBoost, forwardAsymmetry }) as const;

/**
 * El anillo de luz del limbo de Saturno a contraluz (fase 7, R2 de la revisión del bloque R): la luz
 * del Sol que la neblina de su alta atmósfera dispersa hacia delante, lo más reconocible de las fotos
 * de Cassini con el Sol detrás del planeta (PIA17172, «The Day the Earth Smiled», con una fase de
 * unos 176°; docs/realismo/referencias.md). Un lóbulo estrecho (g = 0,9) e intenso. Ajuste visual con
 * esa foto, no una medida (`photometry.spec.ts` dice cuánto cambia con la fase).
 */
export const SATURN_FORWARD_HAZE = { forwardBoost: 60, forwardAsymmetry: 0.9 } as const;

/**
 * Reflectividad de los anillos de Saturno medida por el Hubble (WFPC2, 1996–2005) en cinco filtros:
 * I/F a 6° de fase con los anillos abiertos 23,6°, del ajuste log-lineal de la tabla 5 de Salo y
 * French (2010), «The opposition and tilt effects of Saturn's rings from HST observations», Icarus 210,
 * 785 (https://arxiv.org/abs/1007.0349), en el anillo C (78 000–83 000 km), el B (100 000–107 000 km) y
 * el A (127 000–129 000 km). Las longitudes de onda, las efectivas de cada filtro para la luz del Sol de
 * la tabla II de Cuzzi, French y Dones (2002), Icarus 158, 199 (https://doi.org/10.1006/icar.2002.6851).
 * Dan el color de cada anillo (fase 7, D36) y, en F555W, el brillo con el que se calibra su albedo.
 */
export const RING_SPECTRA = {
  wavelengthsNm: [338, 434, 549, 672, 798],
  C: [0.0313, 0.0409, 0.0437, 0.0485, 0.0523],
  B: [0.1924, 0.3534, 0.465, 0.5354, 0.5519],
  A: [0.1379, 0.2362, 0.297, 0.3327, 0.3442],
  phaseDeg: 6,
  openingDeg: 23.6,
  /**
   * De qué espectro sale el color de cada anillo (`bandChromaticity`, en la tira de los anillos): la
   * división de Cassini no tiene valores publicados y toma el del anillo C, el más cercano documentado
   * (Cuzzi et al., 2002, agrupan sus espectros; Hedman et al., 2013, https://arxiv.org/abs/1210.4727,
   * los describen igual).
   */
  colorFrom: { C: 'C', B: 'B', Cassini: 'C', A: 'A' },
  source:
    'Salo y French (2010), Icarus 210, 785, tabla 5 (B_eff 23,6°, α 6°): https://arxiv.org/abs/1007.0349 · longitudes de onda efectivas: Cuzzi, French y Dones (2002), Icarus 158, 199, tabla II: https://doi.org/10.1006/icar.2002.6851',
} as const;

/**
 * Partículas de los anillos de Saturno (solo cuenta su función de fase; la profundidad óptica sale de
 * una ocultación de Cassini, y el color y el albedo de cada anillo, de `RING_SPECTRA` y de la ficha de la
 * NASA, en la tira de los anillos): el pico de oposición y la dispersión hacia atrás de la Luna, como
 * unas partículas heladas y rugosas, y un lóbulo hacia delante para el polvo fino que hace brillar los
 * anillos tenues a contraluz. Aproximación y ajuste visual, comparando con las fotos del Hubble y de
 * Cassini.
 */
export const RING_PHOTOMETRY: {
  readonly photometry: Photometry;
  /** Luz de los anillos sobre el planeta (fracción de la del Sol): se ve en su lado nocturno. */
  readonly ringShine: number;
  readonly note: string;
} = {
  photometry: { ...MOON, forwardFraction: 0.08, forwardAsymmetry: 0.75 },
  ringShine: 0.05,
  note: 'Fase de la Luna y un lóbulo hacia delante (8 %, g = 0,75) para el polvo fino; luz de los anillos sobre el planeta, 0,05 de la del Sol por el seno de su elevación: aproximación y ajuste visual.',
};

/**
 * El color de las lunas que se ven en gris (fase 9b, D42): su índice B−V publicado frente al del Sol da
 * su reflectividad relativa en las bandas B y V de Johnson, R_B / R_V = 10^(−0,4 · ((B−V) − (B−V)☉)), y
 * con `bandChromaticity` (el método de Venus), su cromaticidad. Los valores de `chromaticity` de cada
 * luna salen de aquí (photometry.spec.ts lo comprueba). Son casi neutros: «The neutral gray color of
 * Titania is typical of most of the significant Uranian moons» (NASA,
 * https://science.nasa.gov/uranus/moons/titania/).
 */
export const COLOR_INDICES = {
  sun: {
    bv: 0.653,
    source:
      'Ramírez et al. (2012), «The UBV(RI)c colors of the Sun», ApJ 752, 5: «(B-V)=0.653+/-0.003» (https://arxiv.org/abs/1204.0828)',
  },
  /** Las longitudes de onda pivote de las bandas B y V de Johnson (nm). */
  bandsNm: {
    B: 439.0,
    V: 550.1,
    source:
      'SVO Filter Profile Service, Generic/Johnson.B y Generic/Johnson.V (WavelengthPivot: 4390,2 y 5501,4 Å): https://svo2.cab.inta-csic.es/theory/fps/index.php?id=Generic/Johnson.B',
  },
  moons: {
    deimos: {
      bv: 0.65,
      source:
        'Zellner y Capen (1974), Icarus 23, 437: «B − V = 0.65 ± 0.03» (https://www.sciencedirect.com/science/article/abs/pii/0019103574900621)',
    },
    ariel: {
      bv: 0.65,
      source:
        'The Astronomical Almanac (USNO), sección F, datos físicos de los satélites, 2024 (https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt)',
    },
    umbriel: {
      bv: 0.68,
      source:
        'The Astronomical Almanac (USNO), sección F, datos físicos de los satélites, 2024 (https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt)',
    },
    titania: {
      bv: 0.7,
      source:
        'The Astronomical Almanac (USNO), sección F, datos físicos de los satélites, 2024, de Andersson (1974) (https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt)',
    },
    oberon: {
      bv: 0.68,
      source:
        'The Astronomical Almanac (USNO), sección F, datos físicos de los satélites, 2024, de Andersson (1974) (https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt)',
    },
    triton: {
      bv: 0.7,
      source:
        'Pascu et al. (2006), «HST BVI photometry of Triton and Proteus», Icarus 185, 487: «Our (B – V) result of 0.70 ± 0.01» (HST, julio de 1997; su color ha cambiado con los años) (https://www.sciencedirect.com/science/article/abs/pii/S0019103506002648)',
    },
  },
} as const;

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
    haze: haze(
      0.02,
      4,
      0.07,
      SATURN_FORWARD_HAZE.forwardBoost,
      SATURN_FORWARD_HAZE.forwardAsymmetry,
    ),
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
  deimos: {
    ...airless(),
    chromaticity: {
      rgb: [0.999, 1.0, 1.002],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.deimos) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://www.sciencedirect.com/science/article/abs/pii/0019103574900621',
    },
  },
  // Ío, sin tinte: su mosaico es en color (revisión del bloque D, D1).
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
    // El terminador suave de su neblina (fase 9b): × min(1, μ₀/μ)^1,15, ajustado a los perfiles del
    // brillo de PIA06230 a lo largo del Sol y en perpendicular (scripts/measure-titan-terminator.mjs).
    photometry: { ...giant(0.9), terminatorExponent: 1.15 },
    haze: haze(0.4, 2.5, 0.35, 3),
    hazeColor: '#e3a95c',
    // La caída del halo de PIA06230: diez veces menos brillo de 1,02–1,05 a 1,05–1,1 radios (fase 7).
    haloScaleHeight: 0.017,
    chromaticity: {
      rgb: [1.478, 0.945, 0.137],
      mix: 1,
      source:
        'Media del 60 % del disco en la foto en color natural de Cassini del 16-04-2005, con una fase de 56° (PIA06230, NASA/JPL/Space Science Institute; https://photojournal.jpl.nasa.gov/catalog/PIA06230), con scripts/measure-reference-colors.mjs',
    },
    halo: {
      chromaticity: [0.97, 1.02, 0.85],
      gain: 0.085,
      source:
        'PIA06230 (la foto de su color): por encima del limbo iluminado, una neblina tenue y casi neutra (de 1,02 a 1,05 radios, cromaticidad 0,97/1,02/0,85 y un 1 % del brillo del borde del disco; nada a partir de 1,05), no un halo naranja. Su intensidad, ajustada a esa proporción en la misma geometría (scripts/measure-titan-halo.mjs)',
    },
    calibrateAlbedo: true,
    note: 'Neblina espesa y anaranjada: Minnaert y atmósfera, ajuste visual. Sin textura de superficie: el mosaico del USGS (ISS de Cassini, 938 nm) muestra la superficie en una ventana del metano, y en luz visible la neblina la oculta (PIA06230). Color y halo, de PIA06230 (fase 7).',
  },
  japeto: airless(),
  // Miranda, sin B−V en ninguna fuente libre (el Astronomical Almanac lo deja en blanco; Karkoschka, 1997,
  // la describe como «blue» sin cifras que usar): gris neutro (fase 9b).
  miranda: {
    ...airless(),
    chromaticity: {
      rgb: [1, 1, 1],
      mix: 1,
      source:
        'Sin índice de color publicado en una fuente libre: gris neutro. The Astronomical Almanac, 2024 (https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt), sin B−V para Miranda; Karkoschka (1997), «Miranda is blue», sin cifras (https://www.sciencedirect.com/science/article/abs/pii/S0019103596956316)',
    },
  },
  ariel: {
    ...airless(),
    chromaticity: {
      rgb: [0.999, 1.0, 1.002],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.ariel) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt',
    },
  },
  umbriel: {
    ...airless(),
    chromaticity: {
      rgb: [1.012, 0.998, 0.98],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.umbriel) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt',
    },
  },
  titania: {
    ...airless(),
    chromaticity: {
      rgb: [1.021, 0.997, 0.965],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.titania) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt',
    },
  },
  oberon: {
    ...airless(),
    chromaticity: {
      rgb: [1.012, 0.998, 0.98],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.oberon) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://aa.usno.navy.mil/downloads/publications/Satellite_data_web_b_2024_2.txt',
    },
  },
  triton: {
    ...airless(),
    chromaticity: {
      rgb: [1.021, 0.997, 0.965],
      mix: 1,
      source:
        'Su B−V (COLOR_INDICES.moons.triton) frente al del Sol, en las bandas B y V de Johnson, interpolado a los primarios sRGB (fase 9b): https://www.sciencedirect.com/science/article/abs/pii/S0019103506002648',
    },
  },
  // Proteo (fase 9b): «Color measurements (0.4 to 0.6 µm) of Proteus show a neutral color» (Thomas y
  // Veverka, 1991, JGR 96, 19261): gris neutro.
  proteo: {
    ...airless(),
    chromaticity: {
      rgb: [1, 1, 1],
      mix: 1,
      source:
        'Thomas y Veverka (1991), «Neptune’s small inner satellites», JGR 96, 19261: un color neutro de 0,4 a 0,6 µm (https://doi.org/10.1029/91JA01461)',
    },
  },
};
