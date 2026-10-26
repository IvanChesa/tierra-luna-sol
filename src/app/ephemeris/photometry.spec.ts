import { Body, Illumination } from 'astronomy-engine';
import {
  Haze,
  PHASE_LAWS,
  Photometry,
  albedoScale,
  discBrightness,
  discFactor,
  geometricFactor,
  hazeGlow,
  henyeyGreenstein,
  integratedPhase,
  lawPhaseMagnitude,
  lommelWeight,
  phaseFunction,
  reflectance,
  smoothstep,
  srgbLuminance,
  twilightWidth,
} from './photometry';

const DEG = Math.PI / 180;
const ISOTROPIC = {
  oppositionAmplitude: 0,
  oppositionWidth: 0.1,
  backAsymmetry: 0,
  forwardFraction: 0,
  forwardAsymmetry: 0.5,
} as const;
/** Lommel–Seeliger puro (L = 1 a toda fase) y Lambert (Minnaert con k = 1). */
const LOMMEL_SEELIGER: Photometry = { lommel: 1, lommelSlope: 0, minnaertK: 1, ...ISOTROPIC };
const LAMBERT: Photometry = { lommel: 0, lommelSlope: 0, minnaertK: 1, ...ISOTROPIC };
const minnaert = (k: number): Photometry => ({ ...LAMBERT, minnaertK: k });

describe('fotometría: Lommel–Seeliger', () => {
  it('vale 2μ₀/(μ₀ + μ): 1 en el centro de un disco lleno', () => {
    expect(geometricFactor(1, 1, 0, LOMMEL_SEELIGER)).toBeCloseTo(1, 12);
    expect(geometricFactor(0.5, 0.5, 0, LOMMEL_SEELIGER)).toBeCloseTo(1, 12);
    expect(geometricFactor(1, 0.5, 0, LOMMEL_SEELIGER)).toBeCloseTo(4 / 3, 12);
    expect(geometricFactor(0.5, 1, 0, LOMMEL_SEELIGER)).toBeCloseTo(2 / 3, 12);
  });

  it('cumple la reciprocidad de Helmholtz (la BRDF, r/μ₀, es simétrica)', () => {
    for (const [a, b] of [
      [0.9, 0.2],
      [0.3, 0.7],
      [0.55, 0.15],
    ] as const) {
      const ab = geometricFactor(a, b, 0, LOMMEL_SEELIGER) / a;
      const ba = geometricFactor(b, a, 0, LOMMEL_SEELIGER) / b;
      expect(ab).toBeCloseTo(ba, 12);
    }
  });

  it('en fase llena, el disco es uniforme: su brillo medio es el del centro', () => {
    expect(discFactor(LOMMEL_SEELIGER)).toBe(1);
    expect(discBrightness(0, LOMMEL_SEELIGER)).toBeCloseTo(1, 3);
  });

  it('la curva de fase integrada coincide con la ley cerrada 1 − sen(α/2)·tan(α/2)·ln(cot(α/4))', () => {
    for (const alphaDeg of [30, 60, 90, 120]) {
      const a = alphaDeg * DEG;
      const exact = 1 - Math.sin(a / 2) * Math.tan(a / 2) * Math.log(1 / Math.tan(a / 4));
      expect(integratedPhase(a, LOMMEL_SEELIGER)).toBeCloseTo(exact, 2);
    }
  });

  it('no devuelve luz donde el Sol no da (μ₀ ≤ 0)', () => {
    expect(geometricFactor(0, 0.5, 0, LOMMEL_SEELIGER)).toBe(0);
    expect(reflectance(-0.2, 0.5, 1, LOMMEL_SEELIGER)).toBe(0);
  });
});

describe('fotometría: limbo de Minnaert', () => {
  it('con k = 1 es Lambert: solo depende de μ₀', () => {
    for (const mu of [0.1, 0.5, 1])
      expect(geometricFactor(0.6, mu, 0, LAMBERT)).toBeCloseTo(0.6, 12);
  });

  it('vale μ₀^k · μ^(k − 1)', () => {
    expect(geometricFactor(0.5, 0.5, 0, minnaert(0.8))).toBeCloseTo(0.5 ** 0.6, 12);
    expect(geometricFactor(0.9, 0.3, 0, minnaert(0.7))).toBeCloseTo(0.9 ** 0.7 * 0.3 ** -0.3, 12);
  });

  it('oscurece el limbo en fase llena salvo con k = 1/2', () => {
    const limb = (k: number) => geometricFactor(0.2, 0.2, 0, minnaert(k));
    expect(limb(1)).toBeCloseTo(0.2, 12);
    expect(limb(0.85)).toBeLessThan(1);
    expect(limb(0.5)).toBeCloseTo(1, 12);
  });

  it('el brillo medio del disco en fase llena es 2 / (2k + 1): 2/3 en Lambert', () => {
    expect(discFactor(LAMBERT)).toBeCloseTo(2 / 3, 12);
    expect(discFactor(minnaert(0.85))).toBeCloseTo(2 / 2.7, 12);
    for (const k of [1, 0.85, 0.6]) {
      expect(discBrightness(0, minnaert(k))).toBeCloseTo(2 / (2 * k + 1), 2);
    }
  });

  it('la esfera de Lambert sigue su ley de fase [sen α + (π − α)·cos α] / π', () => {
    for (const alphaDeg of [20, 60, 100, 140]) {
      const a = alphaDeg * DEG;
      const exact = (Math.sin(a) + (Math.PI - a) * Math.cos(a)) / Math.PI;
      expect(integratedPhase(a, LAMBERT)).toBeCloseTo(exact, 2);
    }
  });
});

describe('fotometría: fase, oposición y mezcla', () => {
  it('Henyey–Greenstein: isótropa con g = 0 y con el máximo donde toca', () => {
    expect(henyeyGreenstein(1.2, 0)).toBeCloseTo(1, 12);
    expect(henyeyGreenstein(0, -0.3)).toBeGreaterThan(henyeyGreenstein(Math.PI, -0.3));
    expect(henyeyGreenstein(Math.PI, 0.7)).toBeGreaterThan(henyeyGreenstein(0, 0.7));
  });

  it('el pico de oposición multiplica por 1 + B₀ en α = 0 y se apaga con la fase', () => {
    const p: Photometry = { ...LOMMEL_SEELIGER, oppositionAmplitude: 1.5, oppositionWidth: 0.05 };
    expect(phaseFunction(0, p)).toBeCloseTo(2.5, 12);
    expect(phaseFunction(60 * DEG, p)).toBeCloseTo(1 + 1.5 / (1 + Math.tan(30 * DEG) / 0.05), 12);
    expect(phaseFunction(60 * DEG, p)).toBeLessThan(phaseFunction(0, p) / 2);
  });

  it('la reflectancia está normalizada a 1 en el centro de un disco lleno', () => {
    const p: Photometry = {
      ...LOMMEL_SEELIGER,
      oppositionAmplitude: 2,
      oppositionWidth: 0.1,
      backAsymmetry: -0.2,
    };
    expect(reflectance(1, 1, 0, p)).toBeCloseTo(1, 12);
  });

  it('el peso de Lommel–Seeliger baja con la fase y se queda entre 0 y 1', () => {
    const p: Photometry = { ...LOMMEL_SEELIGER, lommelSlope: 1 };
    expect(lommelWeight(0, p)).toBe(1);
    expect(lommelWeight(0.5, p)).toBeCloseTo(0.5, 12);
    expect(lommelWeight(2, p)).toBe(0);
  });
});

describe('fotometría: albedo y color', () => {
  it('el factor de albedo hace que el disco lleno valga el albedo geométrico', () => {
    const scale = albedoScale(0.12, 0.3, LOMMEL_SEELIGER);
    expect(scale).toBeCloseTo(0.4, 12);
    expect(0.3 * scale * discBrightness(0, LOMMEL_SEELIGER)).toBeCloseTo(0.12, 3);
    const k = minnaert(0.85);
    expect(0.5 * albedoScale(0.499, 0.5, k) * discBrightness(0, k)).toBeCloseTo(0.499, 2);
  });

  it('sin luminancia conocida, el factor es neutro', () => {
    expect(albedoScale(0.3, 0, LAMBERT)).toBe(1);
  });

  it('la luminancia sRGB pasa a lineal con los pesos de Rec. 709', () => {
    expect(srgbLuminance(1, 1, 1)).toBeCloseTo(1, 12);
    expect(srgbLuminance(0, 0, 0)).toBe(0);
    expect(srgbLuminance(0.5, 0.5, 0.5)).toBeCloseTo(0.214, 3);
  });
});

describe('fotometría: atmósfera', () => {
  const haze: Haze = {
    strength: 0.4,
    limbExponent: 3,
    twilight: 0.15,
    forwardBoost: 2,
    forwardAsymmetry: 0.7,
  };

  it('no brilla en el lado nocturno más allá del crepúsculo', () => {
    expect(hazeGlow(-0.2, 0.3, 1, haze)).toBe(0);
    expect(hazeGlow(-0.1, 0.3, 1, haze)).toBeGreaterThan(0);
  });

  it('crece hacia el limbo', () => {
    expect(hazeGlow(0.5, 0.1, 1, haze)).toBeGreaterThan(hazeGlow(0.5, 0.8, 1, haze));
    expect(hazeGlow(0.5, 1, 1, haze)).toBe(0);
  });

  it('se refuerza a contraluz hasta 1 + el refuerzo', () => {
    const lit = (alpha: number) => hazeGlow(1, 0, alpha, haze);
    expect(lit(Math.PI) / haze.strength).toBeCloseTo(1 + haze.forwardBoost, 12);
    expect(lit(Math.PI)).toBeGreaterThan(lit(0.3));
  });

  it('sin atmósfera, nada', () => {
    expect(hazeGlow(1, 0, 0, { ...haze, strength: 0 })).toBe(0);
  });

  it('el crepúsculo de una capa de altura H mide √(1 − (R / (R + H))²)', () => {
    expect(twilightWidth(1, 0)).toBe(0);
    expect(twilightWidth(6052, 90)).toBeCloseTo(Math.sqrt(1 - (6052 / 6142) ** 2), 12);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});

describe('fotometría: leyes de fase publicadas', () => {
  /** La magnitud de una ley con el término de la distancia, como en astronomy-engine. */
  const lawMagnitude = (body: Body, date: Date): { expected: number; ours: number } => {
    const info = Illumination(body, date);
    const law =
      body === Body.Mercury
        ? PHASE_LAWS.mercurio
        : body === Body.Venus
          ? PHASE_LAWS.venus
          : body === Body.Mars
            ? PHASE_LAWS.marte
            : PHASE_LAWS.luna;
    if (body === Body.Moon) {
      const meanDistanceAu = 385000.6 / 149597870.69098932;
      return {
        expected: info.mag,
        ours:
          law.magnitude(info.phase_angle) +
          5 * Math.log10(info.helio_dist * (info.geo_dist / meanDistanceAu)),
      };
    }
    return {
      expected: info.mag,
      ours: law.magnitude(info.phase_angle) + 5 * Math.log10(info.helio_dist * info.geo_dist),
    };
  };

  it('están copiadas igual que en astronomy-engine (magnitudes de Illumination)', () => {
    const date = new Date('2026-03-01T00:00:00Z');
    for (const body of [Body.Mercury, Body.Venus, Body.Mars, Body.Moon]) {
      const { expected, ours } = lawMagnitude(body, date);
      expect(ours).toBeCloseTo(expected, 6);
    }
  });

  it('valen 0 en α = 0 respecto a su propio valor (diferencias de magnitud)', () => {
    expect(lawPhaseMagnitude(PHASE_LAWS.mercurio, 0)).toBe(0);
    expect(lawPhaseMagnitude(PHASE_LAWS.mercurio, 100)).toBeCloseTo(4.98 - 4.88 + 3.02, 12);
  });
});
