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
