/**
 * Fotometría de los cuerpos (D29): cuánta luz del Sol devuelve cada punto de un cuerpo hacia quien
 * mira y cuánta devuelve el disco entero según la fase. TS puro: lo usan los tests, que comparan las
 * curvas de fase con leyes publicadas, y `scene/materials/shading.ts` lleva LAS MISMAS fórmulas en
 * GLSL.
 *
 * Convenciones: μ₀ = cos(incidencia) = normal · Sol; μ = cos(emergencia) = normal · observador;
 * α = ángulo de fase (Sol–cuerpo–observador), en radianes. La reflectancia está normalizada a 1 en
 * μ₀ = μ = 1 y α = 0 (el centro de un disco lleno): el brillo absoluto lo pone el albedo.
 *
 * Modelo: la función lunar–lambertiana de McEwen (1991, Icarus 92, 298), con Minnaert en el término
 * difuso, por una función de fase con el pico de oposición de Hapke (1986) y Henyey–Greenstein doble:
 *
 *   r = [L(α) · 2μ₀/(μ₀ + μ) + (1 − L(α)) · μ₀^k · μ^(k − 1)] · Φ(α) / Φ(0)
 *   L(α) = clamp(L₀ − s·α, 0, 1)
 *   Φ(α) = (1 + B₀ / (1 + tan(α/2) / h)) · [(1 − f) · HG(α; g₁) + f · HG(α; g₂)]
 *   HG(α; g) = (1 − g²) / (1 + 2g·cos α + g²)^(3/2)   (g < 0: hacia atrás; g > 0: hacia delante)
 *
 * - L₀ = 1: Lommel–Seeliger en fase llena, la ley de los rocosos sin atmósfera (disco casi uniforme,
 *   como la Luna llena). McEwen encontró que el peso de Lommel–Seeliger baja con la fase: con s > 0,
 *   el disco se vuelve más lambertiano y se oscurece hacia el terminador (la rugosidad).
 * - L₀ = 0 y k < 1: Minnaert, oscurecimiento del limbo de los planetas con atmósfera densa (k = 1 es
 *   Lambert).
 */

export interface Photometry {
  /** Peso de Lommel–Seeliger en fase llena (L₀): 1 en los rocosos, 0 en los gigantes. */
  readonly lommel: number;
  /** Cuánto baja ese peso por radián de fase (s ≥ 0). */
  readonly lommelSlope: number;
  /** Exponente de Minnaert (k) del término difuso: 1 = Lambert; menor, más oscuro el limbo. */
  readonly minnaertK: number;
  /** Amplitud del pico de oposición de Hapke (B₀; 0 = sin pico). */
  readonly oppositionAmplitude: number;
  /** Anchura del pico de oposición (h, adimensional). */
  readonly oppositionWidth: number;
  /** Asimetría del lóbulo principal de Henyey–Greenstein (g₁; < 0, hacia atrás). */
  readonly backAsymmetry: number;
  /** Fracción del lóbulo hacia delante (f; 0 = ninguno). */
  readonly forwardFraction: number;
  /** Asimetría del lóbulo hacia delante (g₂ > 0). */
  readonly forwardAsymmetry: number;
}

/**
 * Atmósfera (D29): el brillo de la luz dispersada cerca del limbo y en el crepúsculo. Es una
 * aproximación barata, sin integrar la dispersión: da el tono y suaviza el terminador.
 */
export interface Haze {
  /** Intensidad del brillo en el limbo, respecto a la luz del Sol (0 = sin atmósfera). */
  readonly strength: number;
  /** Exponente del aumento hacia el limbo: (1 − μ)^p. */
  readonly limbExponent: number;
  /**
   * Cuánto se adentra el crepúsculo en el lado nocturno, en μ₀: sen de la depresión del Sol bajo
   * el horizonte a la que la alta atmósfera aún está iluminada, √(1 − (R / (R + H))²).
   */
  readonly twilight: number;
  /** Refuerzo del brillo a contraluz (dispersión hacia delante), con la asimetría `forward`. */
  readonly forwardBoost: number;
  readonly forwardAsymmetry: number;
}

/** μ más pequeño que se usa (el término de Minnaert diverge en el limbo exacto si k < 1). */
export const MIN_MU = 0.02;

/** Henyey–Greenstein en función del ángulo de fase (rad). */
export function henyeyGreenstein(alpha: number, g: number): number {
  return (1 - g * g) / Math.pow(1 + 2 * g * Math.cos(alpha) + g * g, 1.5);
}

/** Función de fase Φ(α) sin normalizar (pico de oposición × lóbulos). */
export function phaseFunction(alpha: number, p: Photometry): number {
  const opposition =
    p.oppositionAmplitude > 0
      ? 1 + p.oppositionAmplitude / (1 + Math.tan(alpha / 2) / p.oppositionWidth)
      : 1;
  const lobes =
    (1 - p.forwardFraction) * henyeyGreenstein(alpha, p.backAsymmetry) +
    p.forwardFraction * henyeyGreenstein(alpha, p.forwardAsymmetry);
  return opposition * lobes;
}

/** Peso de Lommel–Seeliger a la fase α: L(α) = clamp(L₀ − s·α, 0, 1). */
export const lommelWeight = (alpha: number, p: Photometry): number =>
  Math.min(Math.max(p.lommel - p.lommelSlope * alpha, 0), 1);

/** La parte geométrica (sin la fase): Lommel–Seeliger y Minnaert, con el peso de la fase α. */
export function geometricFactor(mu0: number, mu: number, alpha: number, p: Photometry): number {
  if (mu0 <= 0) return 0;
  const m = Math.max(mu, MIN_MU);
  const lommelSeeliger = (2 * mu0) / (mu0 + m);
  const minnaert = Math.pow(mu0, p.minnaertK) * Math.pow(m, p.minnaertK - 1);
  const weight = lommelWeight(alpha, p);
  return weight * lommelSeeliger + (1 - weight) * minnaert;
}

/** Reflectancia relativa de un punto (1 en μ₀ = μ = 1, α = 0). */
export function reflectance(mu0: number, mu: number, alpha: number, p: Photometry): number {
  return (geometricFactor(mu0, mu, alpha, p) * phaseFunction(alpha, p)) / phaseFunction(0, p);
}

/**
 * Brillo medio del disco en fase llena (α = 0), en unidades de la reflectancia del centro:
 * L + (1 − L) · 2 / (2k + 1). Con él, el albedo geométrico fija el brillo absoluto del cuerpo.
 */
export function discFactor(p: Photometry): number {
  return p.lommel + ((1 - p.lommel) * 2) / (2 * p.minnaertK + 1);
}

/**
 * Factor que lleva una textura al albedo geométrico del cuerpo: con él, el brillo medio del disco en
 * fase llena (luminancia media de la textura × factor × `discFactor`) vale exactamente `albedo`.
 * `meanLuminance` es la luminancia lineal media de la textura (o del color) ponderada por el área.
 */
export function albedoScale(albedo: number, meanLuminance: number, p: Photometry): number {
  if (!(meanLuminance > 0)) return 1;
  return albedo / (meanLuminance * discFactor(p));
}

/** Luminancia lineal (Rec. 709) de un color sRGB con componentes de 0 a 1. */
export function srgbLuminance(r: number, g: number, b: number): number {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * Brillo del disco entero a la fase α, integrado numéricamente sobre la cara visible, en unidades de
 * π (un disco lambertiano blanco de frente vale 1). Se integra en (μ, φ): dA = μ dμ dφ.
 */
export function discBrightness(alpha: number, p: Photometry, muSteps = 96, phiSteps = 192): number {
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);
  let sum = 0;
  for (let i = 0; i < muSteps; i++) {
    const mu = (i + 0.5) / muSteps;
    const rho = Math.sqrt(1 - mu * mu);
    for (let j = 0; j < phiSteps; j++) {
      const phi = ((j + 0.5) / phiSteps) * 2 * Math.PI;
      // El Sol en el plano x–z: x hacia el Sol, z hacia el observador.
      const mu0 = rho * Math.cos(phi) * sinA + mu * cosA;
      if (mu0 > 0) sum += reflectance(mu0, mu, alpha, p) * mu;
    }
  }
  return (sum * 2) / (muSteps * phiSteps); // ∫∫ μ dμ dφ / π
}

/** Curva de fase del disco: brillo a la fase α respecto a fase llena (1 en α = 0). */
export function integratedPhase(alpha: number, p: Photometry): number {
  return discBrightness(alpha, p) / discBrightness(0, p);
}

/**
 * Brillo medio de la parte iluminada del disco a la fase α, respecto a fase llena: la curva de fase
 * dividida por la fracción iluminada, (1 + cos α) / 2. Es lo que mira quien expone una foto: una
 * fase creciente tiene poca superficie iluminada, pero esa superficie no es tan oscura.
 */
export function litDiscBrightness(alpha: number, p: Photometry, steps = 32): number {
  const fraction = (1 + Math.cos(alpha)) / 2;
  if (fraction < 1e-4) return 0;
  const full = discBrightness(0, p, steps, 2 * steps);
  return discBrightness(alpha, p, steps, 2 * steps) / full / fraction;
}

/** Tabla de {@link litDiscBrightness} cada 10° (de 0° a 180°), para consultarla en cada frame. */
export function litBrightnessTable(p: Photometry): Float64Array {
  return Float64Array.from({ length: 19 }, (_, k) =>
    litDiscBrightness((k * 10 * Math.PI) / 180, p),
  );
}

/** Interpola la tabla de {@link litBrightnessTable} a la fase α (rad). */
export function interpolateLitBrightness(table: Float64Array, alpha: number): number {
  const x = Math.min(Math.max((alpha * 180) / Math.PI / 10, 0), 18);
  const k = Math.min(Math.floor(x), 17);
  const t = x - k;
  return (table[k] as number) * (1 - t) + (table[k + 1] as number) * t;
}

/** Diferencia de magnitud respecto a fase llena: −2,5 · log10 de la curva de fase. */
export const phaseMagnitude = (alpha: number, p: Photometry): number =>
  -2.5 * Math.log10(integratedPhase(alpha, p));

/**
 * Brillo de la atmósfera en un punto, respecto a la luz del Sol: crece hacia el limbo, sigue al
 * Sol hasta `twilight` por detrás del terminador y se refuerza a contraluz.
 */
export function hazeGlow(mu0: number, mu: number, alpha: number, haze: Haze): number {
  if (haze.strength <= 0) return 0;
  const lit = smoothstep(-haze.twilight, haze.twilight, mu0);
  if (lit <= 0) return 0;
  const limb = Math.pow(1 - Math.min(Math.max(mu, 0), 1), haze.limbExponent);
  const forward =
    1 +
    (haze.forwardBoost * henyeyGreenstein(alpha, haze.forwardAsymmetry)) /
      henyeyGreenstein(Math.PI, haze.forwardAsymmetry);
  return haze.strength * lit * limb * forward;
}

/** `smoothstep` de GLSL. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Ancho del crepúsculo en μ₀ para una capa de altura H sobre un cuerpo de radio R (mismas unidades). */
export const twilightWidth = (radius: number, hazeHeight: number): number =>
  Math.sqrt(1 - (radius / (radius + hazeHeight)) ** 2);

/**
 * Oscurecimiento del limbo del Sol a 550 nm: I(μ)/I(1) = 0,3 + 0,93·μ − 0,23·μ² (Allen's
 * Astrophysical Quantities, Cox, 2000). El borde queda al 30 % del centro y el disco, de media, al
 * 80,5 %.
 */
export const SOLAR_LIMB_DARKENING = [0.3, 0.93, -0.23] as const;

export const solarLimbDarkening = (mu: number): number => {
  const m = Math.min(Math.max(mu, 0), 1);
  const [a, b, c] = SOLAR_LIMB_DARKENING;
  return a + b * m + c * m * m;
};

/**
 * Anillos (fase 3b): una capa de partículas de profundidad óptica normal τ con dispersión simple
 * (el modelo clásico de los anillos de Saturno, como en Cuzzi et al.). Con μ₀ y μ los senos de las
 * elevaciones del Sol y de quien mira sobre el plano, y normalizado para que una capa opaca valga 1 en
 * μ₀ = μ y fase 0 (el albedo y la fase se aplican aparte):
 * - cara iluminada (los dos del mismo lado): 2μ₀/(μ₀ + μ) · (1 − e^(−τ(1/μ₀ + 1/μ)));
 * - cara oscura (la luz que atraviesa): 2μ₀/(μ₀ − μ) · (e^(−τ/μ₀) − e^(−τ/μ)), con su límite
 *   2τ/μ₀ · e^(−τ/μ₀) cuando μ = μ₀.
 * Los anillos densos (el B) se ven oscuros por la cara no iluminada y los tenues (el C, la división
 * de Cassini) brillan: lo que muestran las fotos de Cassini a contraluz.
 */
export function ringReflectance(mu0: number, mu: number, tau: number, litSide: boolean): number {
  if (mu0 <= 0 || mu <= 0 || tau <= 0) return 0;
  if (litSide) return ((2 * mu0) / (mu0 + mu)) * (1 - Math.exp(-tau * (1 / mu0 + 1 / mu)));
  if (Math.abs(mu0 - mu) < 1e-6) return ((2 * tau) / mu0) * Math.exp(-tau / mu0);
  return ((2 * mu0) / (mu0 - mu)) * (Math.exp(-tau / mu0) - Math.exp(-tau / mu));
}

/** Fracción de lo que hay detrás que tapan los anillos vistos con elevación μ: 1 − e^(−τ/μ). */
export const ringCoverage = (mu: number, tau: number): number =>
  mu <= 0 ? (tau > 0 ? 1 : 0) : 1 - Math.exp(-tau / mu);

/** Profundidad óptica normal a partir de la opacidad vista de frente: τ = −ln(1 − opacidad). */
export const opticalDepth = (opacity: number): number =>
  Math.log(1 / (1 - Math.min(Math.max(opacity, 0), 0.995)));

/**
 * Detalle relativo de un perfil (la luminancia de la tira de los anillos, columna a columna): cada
 * valor dividido por la media de los índices `[from, to)`. Con él se modula el albedo de un anillo:
 * recupera la estructura radial fina de la textura sin cambiar su brillo medio en esa ventana, que es
 * donde se calibra con una medida (revisión del bloque R, R1).
 */
export function relativeDetail(values: ArrayLike<number>, from: number, to: number): Float64Array {
  let sum = 0;
  for (let i = from; i < to; i++) sum += values[i] as number;
  const mean = sum / (to - from);
  if (!(to > from) || !(mean > 0)) {
    throw new Error(`Ventana sin brillo para el detalle relativo: [${from}, ${to})`);
  }
  return Float64Array.from({ length: values.length }, (_, i) => (values[i] as number) / mean);
}

/**
 * Leyes de fase publicadas (magnitud visual frente al ángulo de fase), las que usa astronomy-engine
 * en `Illumination`: las de Mercurio y Venus son de Hilton (2005, AJ 129, 2902,
 * https://doi.org/10.1086/430212); la de Marte, lineal; la de la Luna, m = −12,717 + 1,49·|α| +
 * 0,0431·α⁴ (α en radianes). Solo la parte que depende de la fase, sin la distancia.
 */
export interface PhaseLaw {
  readonly validDeg: readonly [number, number];
  /** Magnitud a la fase α (grados), sin el término de la distancia. */
  readonly magnitude: (alphaDeg: number) => number;
  readonly source: string;
}

const cubic = (c0: number, c1: number, c2: number, c3: number) => (alphaDeg: number) => {
  const x = alphaDeg / 100;
  return c0 + x * (c1 + x * (c2 + x * c3));
};

export const PHASE_LAWS = {
  mercurio: {
    validDeg: [2.1, 169.5],
    magnitude: cubic(-0.6, 4.98, -4.88, 3.02),
    source:
      'Hilton (2005), AJ 129, 2902 (https://iopscience.iop.org/article/10.1086/430212), como en astronomy-engine 2.1.19 (VisualMagnitude)',
  },
  venus: {
    validDeg: [2.2, 170.2],
    magnitude: (alphaDeg: number) =>
      alphaDeg < 163.6 ? cubic(-4.47, 1.03, 0.57, 0.13)(alphaDeg) : 0.98 - 1.02 * (alphaDeg / 100),
    source:
      'Hilton (2005), AJ 129, 2902 (https://iopscience.iop.org/article/10.1086/430212), como en astronomy-engine 2.1.19 (VisualMagnitude)',
  },
  marte: {
    validDeg: [0, 50],
    magnitude: (alphaDeg: number) => -1.52 + 1.6 * (alphaDeg / 100),
    source:
      'astronomy-engine 2.1.19 (VisualMagnitude, https://github.com/cosinekitty/astronomy): −1,52 + 1,60 · α/100°; el fichero no cita su origen',
  },
  luna: {
    validDeg: [0, 150],
    magnitude: (alphaDeg: number) => {
      const rad = (alphaDeg * Math.PI) / 180;
      return -12.717 + 1.49 * Math.abs(rad) + 0.0431 * rad ** 4;
    },
    source:
      'astronomy-engine 2.1.19 (MoonMagnitude, https://github.com/cosinekitty/astronomy), que cita https://astronomy.stackexchange.com/questions/10246/is-there-a-simple-analytical-formula-for-the-lunar-phase-brightness-curve',
  },
} as const satisfies Record<string, PhaseLaw>;

export type PhaseLawId = keyof typeof PHASE_LAWS;

/** Diferencia de magnitud de una ley respecto a fase llena (su valor extrapolado en α = 0). */
export const lawPhaseMagnitude = (law: PhaseLaw, alphaDeg: number): number =>
  law.magnitude(alphaDeg) - law.magnitude(0);
