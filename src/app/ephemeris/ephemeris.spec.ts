import { KM_PER_AU } from './coordinates';
import {
  MOON_PHASE_NAMES,
  distancesAu,
  moonGeocentric,
  moonPhase,
  moonPhaseName,
  planetHeliocentric,
} from './ephemeris';
import {
  HORIZONS_DECADES,
  HORIZONS_MOON_ILLUMINATION,
  HORIZONS_PLAN_DATES,
  USNO_MOON_PHASES,
  VectorFixture,
  VectorRow,
  rowDate,
  seriesOf,
  vectorError,
} from './fixtures/fixtures';
import { PLANET_IDS, isPlanetId } from './ids';
import { length, sub, vec3 } from './vec3';

/** Peor error de una función de posición sobre las filas de los fixtures (plan + décadas). */
function worstError(id: string, position: (date: Date) => ReturnType<typeof planetHeliocentric>) {
  const rows: [VectorFixture, VectorRow][] = [HORIZONS_PLAN_DATES, HORIZONS_DECADES].flatMap(
    (fixture) =>
      seriesOf(fixture, id).rows.map((row): [VectorFixture, VectorRow] => [fixture, row]),
  );
  let angleDeg = 0;
  let distanceRatio = 0;
  for (const [fixture, row] of rows) {
    const error = vectorError(position(rowDate(fixture, row)), row);
    angleDeg = Math.max(angleDeg, error.angleDeg);
    distanceRatio = Math.max(distanceRatio, error.distanceRatio);
  }
  return { angleDeg, distanceRatio, samples: rows.length };
}

const fmt = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

describe('ephemeris: planetas frente a Horizons (3 fechas del plan + décadas 1900–2100)', () => {
  // El error se calcula al recoger los tests para que la cifra salga en su nombre.
  for (const id of PLANET_IDS) {
    const error = worstError(id, (date) => planetHeliocentric(id, date));
    it(`${id}: peor error ${fmt(error.angleDeg, 4)}° y ${fmt(error.distanceRatio * 100, 4)} % en ${error.samples} instantes (≤ 0,05° y 0,1 %)`, () => {
      expect(error.angleDeg).toBeLessThan(0.05);
      expect(error.distanceRatio).toBeLessThan(0.001);
    });
  }
});

describe('ephemeris: Luna geocéntrica frente a Horizons', () => {
  const error = worstError('luna', moonGeocentric);
  it(`luna: peor error ${fmt(error.angleDeg, 4)}° y ${fmt(error.distanceRatio * 100, 4)} % en ${error.samples} instantes (≤ 0,1° y 0,5 %)`, () => {
    expect(error.angleDeg).toBeLessThan(0.1);
    expect(error.distanceRatio).toBeLessThan(0.005);
  });
});

describe('ephemeris: distancias', () => {
  it('calcula la distancia al Sol y a la Tierra a partir de posiciones heliocéntricas', () => {
    const { toSun, toEarth } = distancesAu(vec3(3, 4, 0), vec3(3, 0, 0));
    expect(toSun).toBe(5);
    expect(toEarth).toBe(4);
  });

  it('la distancia Tierra–Marte del 2026-10-23 coincide con Horizons (±0,1 %)', () => {
    const iso = '2026-10-23T00:00:00Z';
    const date = new Date(iso);
    const { toEarth } = distancesAu(
      planetHeliocentric('marte', date),
      planetHeliocentric('tierra', date),
    );
    const row = (id: string) => seriesOf(HORIZONS_PLAN_DATES, id).rows.find((r) => r[0] === iso);
    const mars = row('marte');
    const earth = row('tierra');
    if (!mars || !earth) throw new Error('Fixture incompleto');
    const expectedKm = length(
      sub(vec3(mars[1], mars[2], mars[3]), vec3(earth[1], earth[2], earth[3])),
    );
    expect(Math.abs((toEarth * KM_PER_AU) / expectedKm - 1)).toBeLessThan(0.001);
  });
});

describe('ephemeris: fase lunar', () => {
  const target: Record<string, number> = {
    'New Moon': 0,
    'First Quarter': 90,
    'Full Moon': 180,
    'Last Quarter': 270,
  };
  const names: Record<string, string> = {
    'New Moon': 'Luna nueva',
    'First Quarter': 'Cuarto creciente',
    'Full Moon': 'Luna llena',
    'Last Quarter': 'Cuarto menguante',
  };

  for (const { year, phases } of USNO_MOON_PHASES.series) {
    // Diferencia angular con signo, en (−180, 180].
    const errors = phases.map(([phase, iso]) => {
      const delta = moonPhase(new Date(iso)).angleDeg - (target[phase] ?? NaN);
      return Math.abs(((delta + 540) % 360) - 180);
    });
    const worst = Math.max(...errors);
    // La elongación avanza ~0,5° por hora: 0,05° son unos 6 minutos.
    it(`${year}: las ${phases.length} fases del USNO caen a menos de 0,05° de su ángulo (peor ${fmt(worst, 4)}°, ~${fmt((worst / 0.508) * 60, 1)} min)`, () => {
      expect(worst).toBeLessThan(0.05);
    });
  }

  it('en el instante de cada fase principal del USNO de 2026 da su nombre en español', () => {
    const series = USNO_MOON_PHASES.series.find((s) => s.year === 2026);
    for (const [phase, iso] of series?.phases ?? []) {
      expect(moonPhase(new Date(iso)).name).toBe(names[phase]);
    }
  });

  it('la fracción iluminada coincide con Horizons (±0,5 puntos)', () => {
    for (const [iso, percent] of HORIZONS_MOON_ILLUMINATION.rows) {
      expect(Math.abs(moonPhase(new Date(iso)).illuminatedFraction * 100 - percent)).toBeLessThan(
        0.5,
      );
    }
  });

  it('nombra las 8 fases según la elongación', () => {
    const cases: [number, string][] = [
      [0, 'Luna nueva'],
      [6.9, 'Luna nueva'],
      [7, 'Luna creciente'],
      [45, 'Luna creciente'],
      [90, 'Cuarto creciente'],
      [135, 'Gibosa creciente'],
      [180, 'Luna llena'],
      [225, 'Gibosa menguante'],
      [270, 'Cuarto menguante'],
      [315, 'Luna menguante'],
      [353, 'Luna nueva'],
      [-90, 'Cuarto menguante'],
      [720, 'Luna nueva'],
    ];
    for (const [angle, name] of cases) expect(moonPhaseName(angle)).toBe(name);
    expect(new Set(cases.map(([angle]) => moonPhaseName(angle)))).toEqual(
      new Set(MOON_PHASE_NAMES),
    );
  });

  it('indica si crece o mengua', () => {
    const fullMoon = new Date('2026-01-03T10:03:00Z');
    expect(moonPhase(new Date(fullMoon.getTime() - 86_400_000)).waxing).toBe(true);
    expect(moonPhase(new Date(fullMoon.getTime() + 86_400_000)).waxing).toBe(false);
  });
});

describe('ephemeris: ids de planeta', () => {
  it('reconoce los 8 planetas y nada más', () => {
    expect(PLANET_IDS).toHaveLength(8);
    expect(isPlanetId('marte')).toBe(true);
    expect(isPlanetId('pluton')).toBe(false);
  });
});
