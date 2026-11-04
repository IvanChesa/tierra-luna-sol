/**
 * Cifras, distancias, duraciones y fechas con el formato de `docs/ESTILO.md` (§3 y §4). Todo pasa
 * por `Intl` con `es-ES`: nunca se concatenan cifras a mano. Sin dependencias: lo puede usar
 * cualquier capa de la interfaz.
 */
import { KM_PER_AU } from '../ephemeris/constants';

const LOCALE = 'es-ES';
/** Signo menos tipográfico (U+2212): `Intl` da el guion. */
const MINUS = '\u2212';
/** Espacio duro entre la cifra y la unidad: «384.400 km» no se parte al final de una línea. */
const NBSP = '\u00a0';

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(minDigits: number, maxDigits: number): Intl.NumberFormat {
  const key = `${minDigits}:${maxDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    numberFormats.set(key, format);
  }
  return format;
}

/** Número con `digits` decimales como mucho (`fixed`: siempre esos decimales). */
export function formatNumber(value: number, digits = 0, fixed = false): string {
  if (!Number.isFinite(value)) return '—';
  return numberFormat(fixed ? digits : 0, digits)
    .format(value)
    .replace('-', MINUS);
}

/**
 * Los decimales con los que está escrita una cifra (`1407.6` → 1, `0.0009` → 4, `6e-5` → 5): los de
 * su fuente, que las fichas copian sin redondear.
 */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const [mantissa = '', exponent = '0'] = String(Math.abs(value)).split('e');
  const decimals = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, decimals - Number(exponent));
}

/** La cifra con los decimales con los que está escrita (como mucho, `maxDigits`). */
export function formatExact(value: number, maxDigits = 6): string {
  // Sin el ruido de la coma flotante: 27,3217 días pasados a horas y vueltos a días dan
  // 27,321700000000003, y saldría «27,321700». Ninguna fuente da más de 12 cifras significativas.
  const clean = Number(value.toPrecision(12));
  return formatNumber(clean, Math.min(decimalsOf(clean), maxDigits), true);
}

/** Una cifra en notación científica, por partes: «6,4171 × 10²³» (ESTILO §3). */
export interface ScientificNumber {
  /** «6,4171». */
  readonly mantissa: string;
  /** «23» o «−5» (el superíndice). */
  readonly exponent: string;
  /** Para el lector de pantalla: «6,4171 por 10 elevado a 23». */
  readonly spoken: string;
}

/**
 * Notación científica con los decimales de la fuente (las masas: 6,4171 × 10²³ kg). La mantisa sale
 * redondeada a 12 cifras significativas, que quita el ruido de la división en coma flotante
 * (6,4171e23 / 1e23 = 6,417100000000001) sin tocar ninguna cifra de los datos.
 */
export function formatScientific(value: number): ScientificNumber {
  if (!Number.isFinite(value) || value === 0) {
    const text = formatNumber(value);
    return { mantissa: text, exponent: '0', spoken: text };
  }
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  let mantissa = Number((value / 10 ** exponent).toPrecision(12));
  if (Math.abs(mantissa) >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  const m = formatExact(mantissa);
  const e = formatNumber(exponent);
  return { mantissa: m, exponent: e, spoken: `${m} por 10 elevado a ${e}` };
}

/** Distancia en km según el rango (ESTILO §3): km, millones con un decimal o sin decimales. */
export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km)) return '—';
  const abs = Math.abs(km);
  if (abs < 1e6) return `${formatNumber(km, 0)}${NBSP}km`;
  const millions = km / 1e6;
  // Con un decimal siempre, también si es cero («795,0»): la cifra no cambia de ancho al reproducir.
  const digits = Math.abs(millions) < 1000 ? 1 : 0;
  return `${formatNumber(millions, digits, true)}${NBSP}millones de km`;
}

/** Distancia en unidades astronómicas con dos decimales («9,63 UA»). */
export function formatAu(km: number): string {
  return `${formatNumber(km / KM_PER_AU, 2, true)}${NBSP}UA`;
}

/**
 * Periodo a partir de horas (ESTILO §3): horas hasta 48 h, días hasta 1000 días y años después.
 * El signo (rotación retrógrada) no se muestra: lo dice el texto que lo acompaña.
 */
export function formatPeriodHours(hours: number): string {
  const h = Math.abs(hours);
  if (h < 48) return `${formatNumber(h, 1, true)}${NBSP}h`;
  const days = h / 24;
  if (days < 1000) return `${formatNumber(days, days < 100 ? 1 : 0, days < 100)}${NBSP}días`;
  return `${formatNumber(days / 365.25, 1, true)}${NBSP}años`;
}

/** Zona de la interfaz del explorador: la del navegador o UTC (PLAN §4.3). */
export type TimeZoneChoice = 'local' | 'utc';

const dateFormats = new Map<string, Intl.DateTimeFormat>();

function dateFormat(
  zone: TimeZoneChoice,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${zone}:${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(LOCALE, {
      ...options,
      ...(zone === 'utc' ? { timeZone: 'UTC' } : {}),
    });
    dateFormats.set(key, format);
  }
  return format;
}

/** «24 oct 2026, 21:40:05» en la zona elegida. */
export function formatDateTime(date: Date, zone: TimeZoneChoice, seconds = true): string {
  return dateFormat(zone, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).format(date);
}

/** Fecha larga, sin la hora (ESTILO §4): «17 de marzo de 2026», en esa zona. */
export function formatLongDate(date: Date, zone: TimeZoneChoice): string {
  return dateFormat(zone, { dateStyle: 'long' }).format(date);
}

/** Formato largo de los textos (ESTILO §4): «24 de octubre de 2026 a las 21:40», en esa zona. */
export function formatLongDateTime(date: Date, zone: TimeZoneChoice): string {
  return dateFormat(zone, { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

/** El nombre de la zona del navegador («Europe/Madrid»), para los textos largos (ESTILO §4). */
export function localZoneName(): string {
  return new Intl.DateTimeFormat(LOCALE).resolvedOptions().timeZone;
}

/**
 * Desfase de la zona local en ese instante, como «UTC+2» o «UTC−0:14:44» (la hora solar de Madrid
 * en 1900). Sale de los campos locales de la fecha: `getTimezoneOffset()` lo da en minutos enteros.
 */
export function utcOffsetLabel(date: Date): string {
  const local = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  );
  const seconds = Math.round((local - Math.floor(date.getTime() / 1000) * 1000) / 1000);
  if (seconds === 0) return 'UTC';
  const sign = seconds > 0 ? '+' : MINUS;
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (s !== 0) return `UTC${sign}${h}:${pad(m)}:${pad(s)}`;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${pad(m)}`;
}

// --- Horas en la zona de un lugar (fase 8: el cielo desde España) ---------------------------------

const zoneFormats = new Map<string, Intl.DateTimeFormat>();

function zoneFormat(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let format = zoneFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
    zoneFormats.set(key, format);
  }
  return format;
}

/** «22:40»: la hora del reloj de un lugar (su zona IANA), con el reloj de 24 horas (ESTILO §4). */
export function formatClockInZone(date: Date, timeZone: string): string {
  if (Number.isNaN(date.getTime())) return '—';
  return zoneFormat(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    date,
  );
}

/** «1 de noviembre de 2026» en la zona de un lugar. */
export function formatLongDateInZone(date: Date, timeZone: string): string {
  return zoneFormat(timeZone, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** La fecha de un lugar como «AAAA-MM-DD» (para saber de qué noche es un instante). */
export function isoDateInZone(date: Date, timeZone: string): string {
  const parts = zoneFormat(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Minutos que la zona va por delante de UTC en ese instante (con su horario de verano). */
export function utcOffsetMinutesInZone(date: Date, timeZone: string): number {
  const parts = zoneFormat(timeZone, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/** «UTC+1», «UTC» o «UTC−3:30»: el desfase de la zona de un lugar en ese instante. */
export function utcOffsetLabelInZone(date: Date, timeZone: string): string {
  const minutes = utcOffsetMinutesInZone(date, timeZone);
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : MINUS;
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}
