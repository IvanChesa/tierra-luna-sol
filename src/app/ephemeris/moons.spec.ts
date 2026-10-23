import { KM_PER_AU, eqjToEcl } from './coordinates';
import {
  HORIZONS_DECADES,
  HORIZONS_MOONS_2020_2035,
  HORIZONS_PLAN_DATES,
  rowDate,
  seriesOf,
  vectorError,
} from './fixtures/fixtures';
import { GALILEAN_IDS } from './ids';
import {
  MeanElements,
  galileanMoons,
  meanAnomalyAt,
  meanElementsPosition,
  positionInReferencePlane,
  solveKepler,
} from './moons';
import { toAstroTime } from './time';
import { angleBetweenDeg, length, vec3 } from './vec3';

const fmt = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

/** Órbita circular de prueba en el ecuador EQJ (polo 270°, 90°: el plano de referencia es EQJ). */
const circular: MeanElements = {
  referencePole: { raDeg: 270, decDeg: 90 },
  semiMajorAxisKm: 100_000,
  eccentricity: 0,
  inclinationDeg: 0,
  nodeDeg: 0,
  nodeRateDegPerDay: 0,
  argPeriapsisDeg: 0,
  argPeriapsisRateDegPerDay: 0,
  meanAnomalyDeg: 0,
  meanMotionDegPerDay: 90,
};

describe('moons: ecuación de Kepler', () => {
  it('cumple E − e·sen E = M para excentricidades bajas y altas', () => {
    for (const e of [0, 0.0151, 0.2, 0.6, 0.95]) {
      for (let m = -10; m <= 10; m += 0.37) {
        const anomaly = solveKepler(m, e);
        const reduced = ((m % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        expect(anomaly - e * Math.sin(anomaly)).toBeCloseTo(reduced, 12);
      }
    }
  });
});

describe('moons: elipse con precesión', () => {
  it('una órbita circular avanza a su movimiento medio', () => {
    const p0 = positionInReferencePlane(circular, 0);
    const p1 = positionInReferencePlane(circular, 1);
    expect(length(p0)).toBeCloseTo(100_000, 6);
    expect(angleBetweenDeg(p0, p1)).toBeCloseTo(90, 9);
  });

  it('en el periapsis la distancia es a(1 − e) y la inclinación levanta la órbita del plano', () => {
    const elements: MeanElements = {
      ...circular,
      eccentricity: 0.1,
      inclinationDeg: 30,
      argPeriapsisDeg: 90,
    };
    const periapsis = positionInReferencePlane(elements, 0);
    expect(length(periapsis)).toBeCloseTo(90_000, 6);
    // Con ω = 90° el periapsis es el punto más alto: z = r·sen i.
    expect(periapsis.z).toBeCloseTo(90_000 * Math.sin(Math.PI / 6), 6);
  });

  it('aplica las precesiones, la aceleración secular y los términos de longitud', () => {
    const elements: MeanElements = {
      ...circular,
      nodeRateDegPerDay: 1,
      argPeriapsisRateDegPerDay: 2,
      meanMotionRateDegPerDay2: 0.5,
      longitudeTerms: [{ amplitudeDeg: 10, periodDays: 40, phaseDeg: 0 }],
    };
    // t = 10: M = 900 + ½·0,5·100 + 10·sen(90°) = 935.
    expect(meanAnomalyAt(elements, 10)).toBeCloseTo(935, 9);
    // La longitud total es nodo + argumento + anomalía: 10 + 20 + 935 = 965° ≡ 245°.
    const p = positionInReferencePlane(elements, 10);
    expect((Math.atan2(p.y, p.x) * 180) / Math.PI + 360).toBeCloseTo(245, 6);
  });

  it('pasa del plano de referencia a ECL y a UA', () => {
    const date = new Date('2026-10-23T00:00:00Z');
    const t = toAstroTime(date).tt;
    const inPlane = positionInReferencePlane(circular, t);
    const expected = eqjToEcl(
      vec3(inPlane.x / KM_PER_AU, inPlane.y / KM_PER_AU, inPlane.z / KM_PER_AU),
    );
    const actual = meanElementsPosition(circular, date);
    expect(angleBetweenDeg(actual, expected)).toBeLessThan(1e-9);
    expect(length(actual)).toBeCloseTo(100_000 / KM_PER_AU, 15);
  });
});

describe('moons: galileanas (JupiterMoons) frente a Horizons', () => {
  const fixtures = [HORIZONS_PLAN_DATES, HORIZONS_DECADES, HORIZONS_MOONS_2020_2035];
  for (const id of GALILEAN_IDS) {
    let worst = 0;
    let samples = 0;
    for (const fixture of fixtures) {
      for (const row of seriesOf(fixture, id).rows) {
        const date = rowDate(fixture, row);
        worst = Math.max(worst, vectorError(galileanMoons(date)[id], row).angleDeg);
        samples++;
      }
    }
    it(`${id}: peor error ${fmt(worst, 3)}° en ${samples} instantes de 1900–2100 (≤ 0,5°)`, () => {
      expect(worst).toBeLessThan(0.5);
    });
  }
});
