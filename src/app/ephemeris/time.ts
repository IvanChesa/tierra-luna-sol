import { AstroTime, MakeTime } from 'astronomy-engine';
import { MAX_DATE, MIN_DATE } from './constants';

/**
 * Rango de fechas del explorador (PLAN §0.2: «cualquier fecha, 1900–2100»), definido en
 * `constants.ts`. El tiempo interno es siempre UTC; los `Date` de JavaScript ya lo son.
 */
export { MAX_DATE, MIN_DATE };

const MS_PER_DAY = 86_400_000;
/** 2000-01-01T12:00:00Z en milisegundos Unix: el origen de los días J2000 en UT. */
const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export function isSupportedDate(date: Date): boolean {
  const ms = date.getTime();
  return ms >= MIN_DATE.getTime() && ms <= MAX_DATE.getTime();
}

/** Lleva una fecha válida al rango admitido. Una fecha inválida (`NaN`) es un error. */
export function clampToSupportedRange(date: Date): Date {
  const ms = date.getTime();
  if (Number.isNaN(ms)) throw new RangeError('Fecha inválida.');
  return new Date(Math.min(Math.max(ms, MIN_DATE.getTime()), MAX_DATE.getTime()));
}

/**
 * Convierte una fecha a `AstroTime` (UT + TT con el ΔT de astronomy-engine).
 * Falla con fechas inválidas o fuera de 1900–2100, en vez de devolver posiciones absurdas.
 */
export function toAstroTime(date: Date): AstroTime {
  if (!isSupportedDate(date)) {
    throw new RangeError(
      `Fecha fuera del rango admitido (${MIN_DATE.toISOString()} – ${MAX_DATE.toISOString()}).`,
    );
  }
  return MakeTime(date);
}

/** Días desde J2000 (2000-01-01 12:00 UT), la escala que usa astronomy-engine para `ut`. */
export const daysSinceJ2000 = (date: Date): number => (date.getTime() - J2000_UNIX_MS) / MS_PER_DAY;

/** Fecha a partir de días J2000 en UT. */
export const fromDaysSinceJ2000 = (days: number): Date =>
  new Date(J2000_UNIX_MS + days * MS_PER_DAY);
