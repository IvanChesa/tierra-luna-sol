import {
  HORIZONS_DECADES,
  HORIZONS_MOONS_2020_2035,
  HORIZONS_PLAN_DATES,
  VectorFixture,
  rowDate,
  seriesOf,
  vectorError,
} from '../ephemeris/fixtures/fixtures';
import { isPlanetId } from '../ephemeris/ids';
import { meanElementsPosition } from '../ephemeris/moons';
import { toAstroTime } from '../ephemeris/time';
import { MOON_ELEMENTS, MeanElementsMoonId } from './moon-elements';

const fmt = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');
const ids = Object.keys(MOON_ELEMENTS) as MeanElementsMoonId[];

/**
 * Para instantes UTC posteriores a 2017, Horizons usa TDB − UTC = 69,184 s (último salto de
 * segundo), y astronomy-engine su modelo de ΔT, que da unos segundos más. Para el mismo instante
 * UT, la luna se calcula unos segundos más tarde: es una diferencia de escala de tiempo, no del
 * modelo orbital, y se descuenta aquí a la velocidad angular de cada luna.
 */
const HORIZONS_TDB_MINUS_UTC_S = 69.184;

/** Peor error angular (visto desde el planeta) y peor margen por ΔT en un fixture. */
function worst(id: MeanElementsMoonId, fixture: VectorFixture) {
  const { elements } = MOON_ELEMENTS[id];
  const rateDegPerDay =
    elements.meanMotionDegPerDay + elements.argPeriapsisRateDegPerDay + elements.nodeRateDegPerDay;
  let angleDeg = 0;
  let deltaTAllowanceDeg = 0;
  for (const row of seriesOf(fixture, id).rows) {
    const date = rowDate(fixture, row);
    angleDeg = Math.max(angleDeg, vectorError(meanElementsPosition(elements, date), row).angleDeg);
    if (fixture.timeScale === 'UT') {
      const time = toAstroTime(date);
      const deltaS = (time.tt - time.ut) * 86_400 - HORIZONS_TDB_MINUS_UTC_S;
      deltaTAllowanceDeg = Math.max(
        deltaTAllowanceDeg,
        (Math.abs(deltaS) / 86_400) * rateDegPerDay,
      );
    }
  }
  return { angleDeg, deltaTAllowanceDeg };
}

describe('moon-elements: las 16 lunas con elementos medios', () => {
  it('son las 16 del plan, cada una con su planeta y su fuente', () => {
    expect(ids).toHaveLength(16);
    for (const id of ids) {
      const entry = MOON_ELEMENTS[id];
      expect(isPlanetId(entry.parent)).toBe(true);
      expect(entry.source).toMatch(/^https:\/\/ssd\.jpl\.nasa\.gov\/api\/horizons\.api\?/);
      expect(entry.source).toContain(`CENTER='500%40`);
      expect(entry.referencePlane.source).toMatch(/^https:\/\//);
      expect(entry.elements.eccentricity).toBeLessThan(0.1);
    }
  });
});

describe('moon-elements: precisión frente a Horizons (objetivo §5: ≤ 5° en 2020–2035)', () => {
  // Instantes distintos de las muestras del ajuste (salvo 1900-01-01, que es la primera de la
  // ventana larga), aunque dentro de su intervalo: las 3 fechas del plan y cada trimestre de
  // 2020–2035 (en UT), y el 1 de enero de cada década de 1900–2100 (en TT). La cifra sale en el
  // nombre del test.
  for (const id of ids) {
    const bound = 1.5 * MOON_ELEMENTS[id].fit.maxDeg;
    const plan = worst(id, HORIZONS_PLAN_DATES);
    const quarters = worst(id, HORIZONS_MOONS_2020_2035);
    const decades = worst(id, HORIZONS_DECADES);
    it(`${id}: fechas del plan ${fmt(plan.angleDeg, 3)}° · 2020–2035 ${fmt(quarters.angleDeg, 3)}° (UT; ${fmt(quarters.deltaTAllowanceDeg, 3)}° por ΔT) · décadas 1900–2100 ${fmt(decades.angleDeg, 3)}° (TT)`, () => {
      expect(Math.max(plan.angleDeg, quarters.angleDeg)).toBeLessThan(5);
      // Regresión: nunca peor que 1,5 veces el máximo del propio ajuste (más el efecto del ΔT).
      expect(decades.angleDeg).toBeLessThan(bound);
      expect(plan.angleDeg).toBeLessThan(bound + plan.deltaTAllowanceDeg);
      expect(quarters.angleDeg).toBeLessThan(bound + quarters.deltaTAllowanceDeg);
    });
  }
});
