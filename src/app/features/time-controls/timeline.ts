/**
 * Lógica pura de la línea de tiempo de la barra (fase 3c, tarea 2): abarca el año de la fecha
 * mostrada, de enero a diciembre, en la zona elegida (la hora local del navegador o UTC). Cada valor
 * de la línea es un día del año (0 = 1 de enero). Al moverse se conserva la hora del día, y en los
 * extremos se pasa al año anterior o al siguiente. El rango total (1900–2100) lo pone el store.
 *
 * Teclado (PLAN, fase 3c): las flechas, un día; RePág y AvPág, un mes; Inicio y Fin, el principio y
 * el final del año.
 */
import type { TimeZoneChoice } from '../../core/format';

interface Parts {
  readonly year: number;
  /** 0–11. */
  readonly month: number;
  readonly day: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly ms: number;
}

function partsOf(date: Date, zone: TimeZoneChoice): Parts {
  return zone === 'utc'
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        seconds: date.getUTCSeconds(),
        ms: date.getUTCMilliseconds(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
        ms: date.getMilliseconds(),
      };
}

/**
 * El instante de esas partes en la zona. El día puede salirse del mes (el 32 de enero es el 1 de
 * febrero): `Date` lo pasa al siguiente, y en la hora local respeta los cambios de horario.
 */
function fromParts(p: Parts, zone: TimeZoneChoice): Date {
  if (zone === 'utc') {
    const date = new Date(0);
    date.setUTCFullYear(p.year, p.month, p.day);
    date.setUTCHours(p.hours, p.minutes, p.seconds, p.ms);
    return date;
  }
  // `setFullYear` (y no el constructor), para que los años 0–99 no se lean como 1900–1999.
  const date = new Date(2000, 0, 1);
  date.setFullYear(p.year, p.month, p.day);
  date.setHours(p.hours, p.minutes, p.seconds, p.ms);
  return date;
}

const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Días de un año del calendario gregoriano: 365 o 366. */
export function daysInYear(year: number): number {
  return isLeap(year) ? 366 : 365;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** El año de la fecha en la zona. */
export function yearOf(date: Date, zone: TimeZoneChoice): number {
  return partsOf(date, zone).year;
}

/** El día del año de la fecha en la zona (0 = 1 de enero). */
export function dayOfYear(date: Date, zone: TimeZoneChoice): number {
  const p = partsOf(date, zone);
  return Math.round((Date.UTC(p.year, p.month, p.day) - Date.UTC(p.year, 0, 1)) / 86_400_000);
}

/** El día `day` del año de la fecha (acotado al año), a la misma hora del día. */
export function dateAtDay(date: Date, day: number, zone: TimeZoneChoice): Date {
  const p = partsOf(date, zone);
  const index = Math.min(Math.max(Math.round(day), 0), daysInYear(p.year) - 1);
  return fromParts({ ...p, month: 0, day: 1 + index }, zone);
}

/**
 * Los días del año `year` (en la zona) que caen dentro de [min, max]: el primero y el último. En los
 * años de los extremos, parte de la pista no se puede alcanzar: en la hora de Madrid, el final de
 * 2100 (UTC) es la primera hora del 1 de enero de 2101, y el principio de 1900, con la hora solar de
 * entonces (−0:14:44), el 31 de diciembre de 1899 a las 23:45.
 */
export function reachableDays(
  year: number,
  zone: TimeZoneChoice,
  min: Date,
  max: Date,
): { first: number; last: number } {
  const first = yearOf(min, zone) === year ? dayOfYear(min, zone) : 0;
  const last = yearOf(max, zone) === year ? dayOfYear(max, zone) : daysInYear(year) - 1;
  return { first, last };
}

/** El mismo día y hora `years` años antes o después (el 29 de febrero pasa al 28). */
export function shiftYears(date: Date, years: number, zone: TimeZoneChoice): Date {
  const p = partsOf(date, zone);
  const year = p.year + years;
  return fromParts({ ...p, year, day: Math.min(p.day, daysInMonth(year, p.month)) }, zone);
}

export type TimelineKey =
  'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'PageUp' | 'PageDown' | 'Home' | 'End';

const TIMELINE_KEYS: ReadonlySet<string> = new Set<TimelineKey>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

export const isTimelineKey = (key: string): key is TimelineKey => TIMELINE_KEYS.has(key);

/**
 * El instante al que lleva una tecla desde `date`, a la misma hora del día: un día con las flechas
 * (al pasar del 31 de diciembre, al año siguiente), un mes con RePág y AvPág (el 31 de enero más un
 * mes es el último día de febrero) y el 1 de enero o el 31 de diciembre de su año con Inicio y Fin.
 */
export function stepDate(date: Date, key: TimelineKey, zone: TimeZoneChoice): Date {
  const p = partsOf(date, zone);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return fromParts({ ...p, day: p.day + 1 }, zone);
    case 'ArrowLeft':
    case 'ArrowDown':
      return fromParts({ ...p, day: p.day - 1 }, zone);
    case 'PageUp':
    case 'PageDown': {
      const month = p.month + (key === 'PageUp' ? 1 : -1);
      const year = p.year + Math.floor(month / 12);
      const inYear = ((month % 12) + 12) % 12;
      const day = Math.min(p.day, daysInMonth(year, inYear));
      return fromParts({ ...p, year, month: inYear, day }, zone);
    }
    case 'Home':
      return fromParts({ ...p, month: 0, day: 1 }, zone);
    case 'End':
      return fromParts({ ...p, month: 11, day: 31 }, zone);
  }
}
