/**
 * Conversión entre el instante de la simulación (UTC) y los valores de los inputs nativos `date`
 * (`AAAA-MM-DD`) y `time` (`HH:MM:SS`), en la hora local del navegador o en UTC (PLAN §4.3).
 */
import type { TimeZoneChoice } from '../../core/format';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Partes de la fecha en la zona elegida. */
function parts(date: Date, zone: TimeZoneChoice) {
  return zone === 'utc'
    ? {
        y: date.getUTCFullYear(),
        mo: date.getUTCMonth() + 1,
        d: date.getUTCDate(),
        h: date.getUTCHours(),
        mi: date.getUTCMinutes(),
        s: date.getUTCSeconds(),
      }
    : {
        y: date.getFullYear(),
        mo: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        mi: date.getMinutes(),
        s: date.getSeconds(),
      };
}

export function toDateInputValue(date: Date, zone: TimeZoneChoice): string {
  const p = parts(date, zone);
  return `${pad(p.y, 4)}-${pad(p.mo)}-${pad(p.d)}`;
}

export function toTimeInputValue(date: Date, zone: TimeZoneChoice): string {
  const p = parts(date, zone);
  return `${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

/**
 * El instante que dicen los inputs, o `null` si no forman una fecha que exista. La hora puede venir
 * sin segundos (`HH:MM`) o vacía (medianoche).
 */
export function fromInputValues(
  dateValue: string,
  timeValue: string,
  zone: TimeZoneChoice,
): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const time = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(timeValue || '00:00');
  if (!date || !time) return null;
  const [y, mo, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
  const [h, mi, s] = [Number(time[1]), Number(time[2]), Number(time[3] ?? 0)];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const result =
    zone === 'utc' ? new Date(Date.UTC(y, mo - 1, d, h, mi, s)) : new Date(y, mo - 1, d, h, mi, s);
  // El 31 de febrero no existe: Date lo convertiría en marzo.
  const check = parts(result, zone);
  if (check.y !== y || check.mo !== mo || check.d !== d) return null;
  return result;
}
