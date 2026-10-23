/**
 * Acceso tipado a los fixtures de referencia (solo para tests). Los JSON los genera
 * `scripts/fetch-horizons-fixtures.mjs` y cada serie lleva la URL exacta de su consulta.
 */
import { AstroTime } from 'astronomy-engine';
import controlTt from './horizons-control-tt.json';
import controlUt from './horizons-control-ut.json';
import decades from './horizons-decades.json';
import moonIllumination from './horizons-moon-illumination.json';
import moons2020To2035 from './horizons-moons-2020-2035.json';
import planDates from './horizons-plan-dates.json';
import moonPhases from './usno-moon-phases.json';
import seasons from './usno-seasons-2026.json';
import siderealTimes from './usno-sidereal-time.json';
import { KM_PER_AU } from '../constants';
import { Vec3, angleBetweenDeg, length, sub, vec3 } from '../vec3';

/** `[instante ISO 8601 en la escala de tiempo del fixture, x, y, z]` en km, eclíptica J2000. */
export type VectorRow = readonly [string, number, number, number];

export interface VectorSeries {
  readonly id: string;
  readonly target: string;
  readonly center: string;
  readonly query: string;
  readonly ephemeris: string;
  readonly rows: readonly VectorRow[];
}

export interface VectorFixture {
  readonly description: string;
  /** UT, o TT en el barrido por décadas (ver scripts/fetch-horizons-fixtures.mjs). */
  readonly timeScale: 'UT' | 'TT';
  readonly source: string;
  readonly retrieved: string;
  readonly series: readonly VectorSeries[];
}

export const HORIZONS_PLAN_DATES = planDates as unknown as VectorFixture;
export const HORIZONS_DECADES = decades as unknown as VectorFixture;
export const HORIZONS_MOONS_2020_2035 = moons2020To2035 as unknown as VectorFixture;
/**
 * Control independiente (revisión del bloque A, hallazgo A3): 6 instantes fuera de los demás
 * fixtures y de la rejilla del ajuste de las lunas, para 16 cuerpos. Tres en UT y tres en TT.
 */
export const HORIZONS_CONTROL_UT = controlUt as unknown as VectorFixture;
export const HORIZONS_CONTROL_TT = controlTt as unknown as VectorFixture;

export const HORIZONS_MOON_ILLUMINATION = moonIllumination as unknown as {
  readonly query: string;
  readonly rows: readonly (readonly [string, number])[];
};

export const USNO_MOON_PHASES = moonPhases as unknown as {
  readonly series: readonly {
    readonly year: number;
    readonly query: string;
    readonly phases: readonly (readonly [string, string])[];
  }[];
};

export const USNO_SIDEREAL_TIMES = siderealTimes as unknown as {
  readonly rows: readonly {
    readonly instant: string;
    readonly query: string;
    readonly gmst: string;
    readonly gast: string;
  }[];
};

export const USNO_SEASONS_2026 = seasons as unknown as {
  readonly query: string;
  readonly events: readonly (readonly [string, string])[];
};

/** Error de un vector calculado (UA) frente a una fila de Horizons (km). */
export function vectorError(
  actualAu: Vec3,
  row: VectorRow,
): { angleDeg: number; distanceRatio: number; km: number } {
  const expected = vec3(row[1] / KM_PER_AU, row[2] / KM_PER_AU, row[3] / KM_PER_AU);
  return {
    angleDeg: angleBetweenDeg(actualAu, expected),
    distanceRatio: Math.abs(length(actualAu) / length(expected) - 1),
    km: length(sub(actualAu, expected)) * KM_PER_AU,
  };
}

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/**
 * Fecha (UT) que hay que pasar al código para evaluar una fila. En los fixtures en TT se usa el
 * ΔT de astronomy-engine, de modo que el código calcula exactamente en el TT de Horizons.
 */
export function rowDate(fixture: VectorFixture, row: VectorRow): Date {
  if (fixture.timeScale === 'UT') return new Date(row[0]);
  return AstroTime.FromTerrestrialTime((Date.parse(row[0]) - J2000_MS) / 86_400_000).date;
}

/** ¿Tiene el fixture una serie de este cuerpo? (los de control solo llevan 16). */
export const hasSeries = (fixture: VectorFixture, id: string): boolean =>
  fixture.series.some((s) => s.id === id);

/** Serie de un cuerpo; falla si no existe (un fixture incompleto debe romper el test). */
export function seriesOf(fixture: VectorFixture, id: string): VectorSeries {
  const series = fixture.series.find((s) => s.id === id);
  if (!series) throw new Error(`El fixture no tiene la serie «${id}».`);
  return series;
}

/** «hh:mm:ss.ssss» → horas decimales. */
export function hmsToHours(hms: string): number {
  const [h = 0, m = 0, s = 0] = hms.split(':').map(Number);
  return h + m / 60 + s / 3600;
}
