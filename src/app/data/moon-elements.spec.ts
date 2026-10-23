import {
  HORIZONS_CONTROL_TT,
  HORIZONS_CONTROL_UT,
  HORIZONS_DECADES,
  HORIZONS_MOONS_2020_2035,
  HORIZONS_PLAN_DATES,
  VectorFixture,
  VectorRow,
  hasSeries,
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

/** Cota absoluta de §5 del plan para las lunas con elementos medios. */
const ABSOLUTE_BOUND_DEG = 0.5;

/**
 * Para instantes UTC posteriores a 2017, Horizons usa TDB − UTC = 69,184 s (último salto de
 * segundo), y astronomy-engine su modelo de ΔT, que da unos segundos más. Para el mismo instante
 * UT, la luna se calcula unos segundos más tarde: es una diferencia de escala de tiempo, no del
 * modelo orbital, y se descuenta aquí a la velocidad angular de cada luna.
 */
const HORIZONS_TDB_MINUS_UTC_S = 69.184;

const inYears = (row: VectorRow, fromYear: number, toYear: number) => {
  const year = Number(row[0].slice(0, 4));
  return year >= fromYear && year <= toYear;
};

/**
 * Peor error angular (visto desde el planeta) y peor margen por ΔT de una luna en unos fixtures,
 * opcionalmente solo en las filas que cumplan `filter`. Los fixtures sin esa luna se saltan.
 */
function worst(
  id: MeanElementsMoonId,
  fixtures: readonly VectorFixture[],
  filter: (row: VectorRow) => boolean = () => true,
) {
  const { elements } = MOON_ELEMENTS[id];
  const rateDegPerDay =
    elements.meanMotionDegPerDay + elements.argPeriapsisRateDegPerDay + elements.nodeRateDegPerDay;
  let angleDeg = 0;
  let deltaTAllowanceDeg = 0;
  let samples = 0;
  for (const fixture of fixtures.filter((f) => hasSeries(f, id))) {
    for (const row of seriesOf(fixture, id).rows.filter(filter)) {
      const date = rowDate(fixture, row);
      angleDeg = Math.max(
        angleDeg,
        vectorError(meanElementsPosition(elements, date), row).angleDeg,
      );
      samples++;
      if (fixture.timeScale === 'UT' && date.getUTCFullYear() >= 2017) {
        const time = toAstroTime(date);
        const deltaS = (time.tt - time.ut) * 86_400 - HORIZONS_TDB_MINUS_UTC_S;
        deltaTAllowanceDeg = Math.max(
          deltaTAllowanceDeg,
          (Math.abs(deltaS) / 86_400) * rateDegPerDay,
        );
      }
    }
  }
  return { angleDeg, deltaTAllowanceDeg, samples };
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

describe('moon-elements: precisión frente a Horizons (§5: ≤ 0,5° en TT en 1900–2100 y en UT en 2020–2035)', () => {
  // - Fechas del plan, trimestres de 2020–2035 y décadas de 1900–2100: instantes distintos de las
  //   muestras del ajuste (salvo 1900-01-01, la primera de la ventana larga), pero dentro de su
  //   intervalo.
  // - Control (revisión del bloque A): 6 instantes fuera de la rejilla del ajuste, para 11 de
  //   estas lunas. Es la validación independiente.
  // La cifra sale en el nombre del test.
  for (const id of ids) {
    const regression = 1.5 * MOON_ELEMENTS[id].fit.maxDeg;
    const tt = worst(id, [HORIZONS_DECADES, HORIZONS_CONTROL_TT]);
    const ut2020 = worst(
      id,
      [HORIZONS_PLAN_DATES, HORIZONS_MOONS_2020_2035, HORIZONS_CONTROL_UT],
      (row) => inYears(row, 2020, 2035),
    );
    const controlUt = worst(id, [HORIZONS_CONTROL_UT]);
    const control = worst(id, [HORIZONS_CONTROL_UT, HORIZONS_CONTROL_TT]);
    const controlLabel = control.samples
      ? ` · control independiente ${fmt(control.angleDeg, 3)}° (${control.samples} instantes)`
      : '';
    it(`${id}: TT 1900–2100 ${fmt(tt.angleDeg, 3)}° · UT 2020–2035 ${fmt(ut2020.angleDeg, 3)}° (${fmt(ut2020.deltaTAllowanceDeg, 3)}° por ΔT)${controlLabel}`, () => {
      // Cota absoluta del plan (§5).
      expect(tt.angleDeg).toBeLessThan(ABSOLUTE_BOUND_DEG);
      expect(ut2020.angleDeg).toBeLessThan(ABSOLUTE_BOUND_DEG);
      // Los instantes de control en UT (1957, 2026 y 2042) son anteriores a ~2055, antes de que
      // el ΔT futuro pueda añadir más de 0,5°: también se les exige la cota absoluta.
      expect(controlUt.angleDeg).toBeLessThan(ABSOLUTE_BOUND_DEG);
      // Regresión: nunca peor que 1,5 veces el máximo del propio ajuste (más el efecto del ΔT).
      expect(tt.angleDeg).toBeLessThan(regression);
      expect(ut2020.angleDeg).toBeLessThan(regression + ut2020.deltaTAllowanceDeg);
    });
  }

  it('el control independiente cubre las 11 lunas que comprobó la revisión del bloque A', () => {
    const covered = ids.filter((id) => hasSeries(HORIZONS_CONTROL_UT, id));
    expect(covered).toHaveLength(11);
    for (const id of covered) expect(hasSeries(HORIZONS_CONTROL_TT, id)).toBe(true);
  });
});
