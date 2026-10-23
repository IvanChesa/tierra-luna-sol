import { Body, Equator, Horizon, MakeTime, Observer, ObserverVector } from 'astronomy-engine';
import {
  ECL_TO_THREE,
  EQJ_TO_ECL,
  earthFixedToEcl,
  earthFixedToGeographic,
  eclRotationToThree,
  eclToEqj,
  eclToThree,
  eqjToEcl,
  equatorialToVector,
  geographicToEarthFixed,
  greenwichSiderealTimeHours,
  referencePlaneToEcl,
  referencePlaneToEqj,
  subsolarPoint,
  threeToEcl,
} from './coordinates';
import { KM_PER_AU } from './constants';
import { USNO_SEASONS_2026, USNO_SIDEREAL_TIMES, hmsToHours } from './fixtures/fixtures';
import { Mat3, Vec3, angleBetweenDeg, mulMat3, mulMat3Vec, normalize, vec3 } from './vec3';

const expectVecClose = (actual: Vec3, expected: Vec3, digits = 12) => {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
};
const det = (m: Mat3) =>
  m[0] * (m[4] * m[8] - m[5] * m[7]) -
  m[1] * (m[3] * m[8] - m[5] * m[6]) +
  m[2] * (m[3] * m[7] - m[4] * m[6]);

/**
 * Oblicuidad media J2000 de astronomy-engine: 84381,406″ (IAU 2006). Horizons usa 84381,448″
 * (IAU 1976); la diferencia, 0,042″, no se nota en ninguna precisión del proyecto.
 */
const OBLIQUITY_J2000_DEG = 84381.406 / 3600;
const DEG = Math.PI / 180;

describe('coordinates: EQJ ↔ ECL', () => {
  it('deja quieto el equinoccio y gira el polo norte celeste la oblicuidad J2000', () => {
    expectVecClose(eqjToEcl(vec3(1, 0, 0)), vec3(1, 0, 0));
    const pole = eqjToEcl(vec3(0, 0, 1));
    expectVecClose(
      pole,
      vec3(0, Math.sin(OBLIQUITY_J2000_DEG * DEG), Math.cos(OBLIQUITY_J2000_DEG * DEG)),
      9,
    );
  });

  it('es una rotación (determinante 1) y su inversa la deshace', () => {
    expect(det(EQJ_TO_ECL)).toBeCloseTo(1, 12);
    const v = vec3(0.3, -1.2, 2.5);
    expectVecClose(eclToEqj(eqjToEcl(v)), v);
  });
});

describe('coordinates: ECL ↔ Three', () => {
  it('pone el polo norte de la eclíptica hacia +Y', () => {
    expectVecClose(eclToThree(vec3(0, 0, 1)), vec3(0, 1, 0));
    expectVecClose(eclToThree(vec3(1, 0, 0)), vec3(1, 0, 0));
    expectVecClose(eclToThree(vec3(0, 1, 0)), vec3(0, 0, -1));
  });

  it('conserva la orientación (sistema dextrógiro) y es reversible', () => {
    expect(det(ECL_TO_THREE)).toBe(1);
    const v = vec3(-4, 5, 6);
    expectVecClose(threeToEcl(eclToThree(v)), v);
    expectVecClose(mulMat3Vec(ECL_TO_THREE, v), eclToThree(v));
  });

  it('traduce rotaciones: rotar en ECL y pasar a Three es lo mismo que al revés', () => {
    const m = referencePlaneToEcl(40.6, 83.5);
    const v = vec3(0.2, 0.7, -0.4);
    expectVecClose(mulMat3Vec(eclRotationToThree(m), eclToThree(v)), eclToThree(mulMat3Vec(m, v)));
  });
});

describe('coordinates: planos de referencia de las lunas', () => {
  it('con el polo en el polo celeste, el plano es el ecuador (y con el nodo en 0h, la identidad)', () => {
    expectVecClose(mulMat3Vec(referencePlaneToEqj(0, 90), vec3(0, 0, 1)), vec3(0, 0, 1));
    const identity = referencePlaneToEqj(270, 90);
    identity.forEach((value, k) =>
      expect(value).toBeCloseTo([1, 0, 0, 0, 1, 0, 0, 0, 1][k] ?? NaN, 12),
    );
  });

  it('lleva el eje Z al polo y el eje X al nodo ascendente sobre el ecuador (polo + 90°)', () => {
    // Polo del plano de Laplace de las lunas de Saturno en la tabla del JPL.
    const m = referencePlaneToEqj(40.6, 83.5);
    expectVecClose(mulMat3Vec(m, vec3(0, 0, 1)), equatorialToVector(40.6, 83.5));
    expectVecClose(mulMat3Vec(m, vec3(1, 0, 0)), equatorialToVector(130.6, 0));
    expect(det(m)).toBeCloseTo(1, 12);
  });
});

describe('coordinates: tiempo sidéreo frente al USNO', () => {
  it.each(USNO_SIDEREAL_TIMES.rows.map((row) => [row.instant, row]))(
    'GAST de %s coincide con el USNO en menos de 0,05 s',
    (_instant, row) => {
      const hours = greenwichSiderealTimeHours(new Date(row.instant));
      expect(Math.abs(hours - hmsToHours(row.gast)) * 3600).toBeLessThan(0.05);
    },
  );
});

describe('coordinates: orientación de la Tierra', () => {
  const date = new Date('2026-10-23T00:00:00Z');

  it('lleva el punto (0°, 0°) al mismo sitio que ObserverVector de astronomy-engine', () => {
    const equator = mulMat3Vec(earthFixedToEcl(date), vec3(1, 0, 0));
    const reference = eqjToEcl(ObserverVector(MakeTime(date), new Observer(0, 0, 0), false));
    expect(angleBetweenDeg(equator, reference)).toBeLessThan(1e-6);
  });

  it('lleva el polo norte geográfico al polo de la fecha (geodésica = geocéntrica en el polo)', () => {
    const pole = mulMat3Vec(earthFixedToEcl(date), vec3(0, 0, 1));
    const reference = eqjToEcl(ObserverVector(MakeTime(date), new Observer(90, 0, 0), false));
    expect(angleBetweenDeg(pole, reference)).toBeLessThan(1e-6);
  });

  it('es una rotación', () => {
    expect(det(earthFixedToEcl(date))).toBeCloseTo(1, 12);
  });

  it('convierte latitud y longitud en ambos sentidos', () => {
    const { latDeg, lonDeg } = earthFixedToGeographic(geographicToEarthFixed(41.52, 0.35));
    expect(latDeg).toBeCloseTo(41.52, 10);
    expect(lonDeg).toBeCloseTo(0.35, 10);
    expect(earthFixedToGeographic(vec3(-1, 0, 0)).lonDeg).toBe(180);
  });
});

describe('coordinates: punto subsolar', () => {
  it('el 21-06-2026 a las 12:00 UTC está a ≈ +23,4° de latitud y 0° de longitud (±2°)', () => {
    const { latDeg, lonDeg } = subsolarPoint(new Date('2026-06-21T12:00:00Z'));
    expect(Math.abs(latDeg - 23.4)).toBeLessThan(2);
    expect(Math.abs(lonDeg)).toBeLessThan(2);
  });

  it('desde el punto subsolar, astronomy-engine ve el Sol en el cénit (> 89,9°)', () => {
    for (const iso of ['2026-06-21T12:00:00Z', '2026-10-23T09:30:00Z', '1900-01-01T00:00:00Z']) {
      const date = new Date(iso);
      const { latDeg, lonDeg } = subsolarPoint(date);
      const observer = new Observer(latDeg, lonDeg, 0);
      const sun = Equator(Body.Sun, date, observer, true, true);
      expect(Horizon(date, observer, sun.ra, sun.dec).altitude).toBeGreaterThan(89.9);
    }
  });

  it.each(USNO_SEASONS_2026.events.map(([phenom, iso]) => [phenom, iso]))(
    '%s del USNO (%s): latitud subsolar 0° o ±23,44° (±0,01°)',
    (phenom, iso) => {
      const { latDeg } = subsolarPoint(new Date(iso));
      const month = new Date(iso).getUTCMonth();
      const expected = phenom === 'Equinox' ? 0 : month === 5 ? 23.436 : -23.436;
      // El USNO redondea al minuto: la declinación del Sol cambia como mucho 0,0003° por minuto.
      expect(Math.abs(latDeg - expected)).toBeLessThan(0.01);
    },
  );
});

describe('coordinates: constantes', () => {
  it('la UA vale 149 597 870,7 km (IAU 2012)', () => {
    expect(KM_PER_AU).toBe(149_597_870.7);
  });

  it('equatorialToVector da vectores unitarios', () => {
    const v = equatorialToVector(123.4, -56.7);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 14);
    expectVecClose(
      normalize(mulMat3Vec(mulMat3(EQJ_TO_ECL, referencePlaneToEqj(270, 90)), v)),
      eqjToEcl(v),
    );
  });
});
