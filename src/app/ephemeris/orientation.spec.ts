import { Body, GeoVector, Libration } from 'astronomy-engine';
import { earthFixedToEcl, equatorialToVector, eqjToEcl } from './coordinates';
import { moonGeocentric, planetHeliocentric } from './ephemeris';
import { GALILEAN_IDS } from './ids';
import { MeanElements, galileanMoons, meanElementsPosition } from './moons';
import {
  IauBodyId,
  bodyCentricLatLon,
  bodyFixedToEcl,
  equatorialElevationDeg,
  galileanOrbitNormals,
  isRotation,
  meanElementsOrbitNormal,
  northPoleEcl,
  synchronousBodyFixedToEcl,
} from './orientation';
import { toAstroTime } from './time';
import { angleBetweenDeg, columnOf, cross, dot, length, normalize, scale, sub, vec3 } from './vec3';

const fmt = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

const IAU_IDS: IauBodyId[] = [
  'sol',
  'mercurio',
  'venus',
  'tierra',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
  'luna',
];

describe('orientation: modelo IAU (RotationAxis)', () => {
  const date = new Date('2026-10-24T00:00:00Z');

  it('da rotaciones válidas para el Sol, los planetas y la Luna', () => {
    for (const id of IAU_IDS) expect(isRotation(bodyFixedToEcl(id, date))).toBe(true);
  });

  it('usa para la Tierra la orientación de la fase 1 (precesión, nutación y sidéreo)', () => {
    expect(bodyFixedToEcl('tierra', date)).toEqual(earthFixedToEcl(date));
  });

  it('el polo del Sol es el de la IAU (α₀ = 286,13°, δ₀ = 63,87°)', () => {
    const iau = eqjToEcl(equatorialToVector(286.13, 63.87));
    expect(angleBetweenDeg(northPoleEcl('sol', date), iau)).toBeLessThan(0.01);
  });

  it('Urano gira en sentido retrógrado alrededor de su polo norte IAU', () => {
    // El meridiano 0 avanza hacia el oeste: tras 1 h, X ha girado hacia −Y.
    const m0 = bodyFixedToEcl('urano', date);
    const m1 = bodyFixedToEcl('urano', new Date(date.getTime() + 3_600_000));
    const x1 = columnOf(m1, 0);
    expect(dot(x1, columnOf(m0, 1))).toBeLessThan(0);
  });
});

describe('orientation: la Luna frente a Astronomy.Libration (criterio de la fase 2)', () => {
  // Tres fechas con libraciones distintas en signo y tamaño.
  const cases = ['2026-10-24T00:00:00Z', '2027-03-15T06:00:00Z', '2030-07-01T12:00:00Z'].map(
    (iso) => {
      const date = new Date(iso);
      const toEarth = scale(moonGeocentric(date), -1);
      const subEarth = bodyCentricLatLon(bodyFixedToEcl('luna', date), toEarth);
      const libration = Libration(toAstroTime(date));
      return {
        iso,
        libration: `${fmt(libration.elon, 2)}°, ${fmt(libration.elat, 2)}°`,
        dLon: Math.abs(subEarth.lonDeg - libration.elon),
        dLat: Math.abs(subEarth.latDeg - libration.elat),
      };
    },
  );
  it.each(cases.map((c) => [c.iso, c.libration, fmt(c.dLon, 3), fmt(c.dLat, 3), c] as const))(
    'el %s (libración %s) el punto subterrestre difiere %s° en longitud y %s° en latitud (±1°)',
    (_iso, _libration, _dLon, _dLat, c) => {
      expect(c.dLon).toBeLessThan(1);
      expect(c.dLat).toBeLessThan(1);
      // Lo medido: centésimas de grado (la libración física que incluye el modelo IAU).
      expect(Math.max(c.dLon, c.dLat)).toBeLessThan(0.05);
    },
  );
});

describe('orientation: apertura de los anillos de Saturno vista desde la Tierra', () => {
  const opening = (iso: string) => {
    const date = new Date(iso);
    const saturnToEarth = scale(eqjToEcl(GeoVector(Body.Saturn, toAstroTime(date), false)), -1);
    return equatorialElevationDeg(northPoleEcl('saturno', date), saturnToEarth);
  };

  const crossing = opening('2025-03-23T00:00:00Z');
  it(`es ≈ 0° en el cruce del plano de los anillos del 23-03-2025 (${fmt(crossing, 3)}°; ±1°)`, () => {
    expect(Math.abs(crossing)).toBeLessThan(1);
  });

  it('se abre hasta ≈ +27° (cara norte) en 2017 y ≈ −27° (cara sur) en 2032', () => {
    expect(opening('2017-10-16T00:00:00Z')).toBeCloseTo(27, 0);
    expect(opening('2032-05-01T00:00:00Z')).toBeCloseTo(-27, 0);
  });
});

describe('orientation: lunas en rotación síncrona', () => {
  const date = new Date('2026-10-24T00:00:00Z');

  it('el meridiano 0 mira al planeta y el polo queda al norte de la eclíptica', () => {
    const offset = vec3(0.001, 0.002, 0.0001);
    const normal = vec3(0.1, -0.05, -1); // órbita retrógrada respecto a la eclíptica
    const m = synchronousBodyFixedToEcl(offset, normal);
    expect(isRotation(m)).toBe(true);
    expect(angleBetweenDeg(columnOf(m, 0), scale(offset, -1))).toBeLessThan(6);
    expect(columnOf(m, 2).z).toBeGreaterThan(0);
    expect(angleBetweenDeg(columnOf(m, 2), scale(normal, -1))).toBeLessThan(1e-9);
    // El planeta está en la longitud 0 y la latitud ≈ 0 vista desde la luna.
    const subPlanet = bodyCentricLatLon(m, scale(offset, -1));
    expect(Math.abs(subPlanet.lonDeg)).toBeLessThan(1e-9);
    // Con una órbita directa, el polo es el del momento angular.
    const direct = synchronousBodyFixedToEcl(offset, scale(normal, -1));
    expect(angleBetweenDeg(columnOf(direct, 2), scale(normal, -1))).toBeLessThan(1e-9);
  });

  it('las galileanas: normal perpendicular a la posición y en el sentido del movimiento', () => {
    const normals = galileanOrbitNormals(date);
    const now = galileanMoons(date);
    const later = galileanMoons(new Date(date.getTime() + 600_000));
    for (const id of GALILEAN_IDS) {
      const r = now[id];
      const v = sub(later[id], r);
      expect(Math.abs(dot(normalize(r), normals[id]))).toBeLessThan(1e-3);
      expect(dot(cross(r, v), normals[id])).toBeGreaterThan(0);
    }
  });

  it('las lunas con elementos medios: normal perpendicular a la órbita y en su sentido', () => {
    const elements: MeanElements = {
      referencePole: { raDeg: 299.3337, decDeg: 42.9504 }, // ecuador de Neptuno
      semiMajorAxisKm: 354_759,
      eccentricity: 0.00002,
      inclinationDeg: 157.3, // retrógrada, como Tritón
      nodeDeg: 177.6,
      nodeRateDegPerDay: 0.0014,
      argPeriapsisDeg: 260,
      argPeriapsisRateDegPerDay: 0,
      meanAnomalyDeg: 10,
      meanMotionDegPerDay: 61.257,
    };
    const normal = meanElementsOrbitNormal(elements, date);
    expect(length(normal)).toBeCloseTo(1, 12);
    const r = meanElementsPosition(elements, date);
    const r2 = meanElementsPosition(elements, new Date(date.getTime() + 3_600_000));
    expect(Math.abs(dot(normalize(r), normal))).toBeLessThan(1e-6);
    expect(dot(cross(r, sub(r2, r)), normal)).toBeGreaterThan(0);
    // Retrógrada respecto a Neptuno: su normal apunta al hemisferio sur del planeta.
    expect(dot(normal, northPoleEcl('neptuno', date))).toBeLessThan(0);
    // La luna síncrona elige el polo opuesto, en el lado norte de la eclíptica.
    const m = synchronousBodyFixedToEcl(r, normal);
    expect(dot(columnOf(m, 2), normal)).toBeLessThan(0);
  });
});

describe('orientation: utilidades', () => {
  it('detecta matrices que no son rotaciones', () => {
    expect(isRotation([1, 0, 0, 0, 1, 0, 0, 0, -1])).toBe(false);
    expect(isRotation([2, 0, 0, 0, 1, 0, 0, 0, 1])).toBe(false);
    expect(isRotation([1, 0.1, 0, 0, 1, 0, 0, 0, 1])).toBe(false);
  });

  it('latitud y longitud en el sistema propio, con la longitud en (−180, 180]', () => {
    const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;
    // atan2(−0, −1) = −180°: se lleva a +180°.
    expect(bodyCentricLatLon(identity, vec3(-1, -0, 0)).lonDeg).toBe(180);
    expect(bodyCentricLatLon(identity, vec3(-1, -1e-9, 0)).lonDeg).toBeCloseTo(-180, 6);
    expect(bodyCentricLatLon(identity, vec3(0, 0, 2)).latDeg).toBeCloseTo(90, 12);
    expect(equatorialElevationDeg(vec3(0, 0, 1), vec3(1, 0, 1))).toBeCloseTo(45, 12);
  });

  it('el subsolar de la Tierra con la orientación IAU es el de la fase 1', () => {
    const date = new Date('2026-06-21T12:00:00Z');
    const sun = scale(planetHeliocentric('tierra', date), -1);
    const point = bodyCentricLatLon(bodyFixedToEcl('tierra', date), sun);
    expect(point.latDeg).toBeCloseTo(23.4, 0);
    expect(Math.abs(point.lonDeg)).toBeLessThan(2);
  });
});
