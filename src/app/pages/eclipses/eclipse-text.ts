/**
 * Los textos de `/eclipses` (fase 8; ESTILO §1, §3 y §4): el título de cada eclipse, cuánto tapa, la
 * hora del máximo en la zona del lugar, la parte que se ve y el enlace «Ver en 3D». Puros, con tests.
 */
import {
  formatClockInZone,
  formatLongDateInZone,
  formatNumber,
  utcOffsetLabelInZone,
} from '../../core/format';
import type { EclipseEntry } from '../../data/eclipse-entry';

const NBSP = String.fromCharCode(0xa0);

/** «Eclipse total de Sol», «Eclipse penumbral de Luna»… */
export function eclipseTitle(entry: EclipseEntry): string {
  const type = {
    total: 'total',
    partial: 'parcial',
    annular: 'anular',
    penumbral: 'penumbral',
  }[entry.type];
  return `Eclipse ${type} de ${entry.kind === 'solar' ? 'Sol' : 'Luna'}`;
}

/** «12 de agosto de 2026», el día del máximo en el lugar. */
export const eclipseDate = (entry: EclipseEntry, timeZone: string): string =>
  formatLongDateInZone(new Date(entry.peak), timeZone);

/** «Máximo a las 20:29 (Europe/Madrid, UTC+2)». */
export function peakText(entry: EclipseEntry, timeZone: string): string {
  const peak = new Date(entry.peak);
  return `Máximo a las ${formatClockInZone(peak, timeZone)} (${timeZone}, ${utcOffsetLabelInZone(peak, timeZone)})`;
}

const percent = (fraction: number): string =>
  `${formatNumber(Math.round(fraction * 100), 0)}${NBSP}%`;

/** Cuánto se tapa: el Sol (por la Luna) o la Luna (por la sombra de la Tierra). */
export function amountText(entry: EclipseEntry): string {
  if (entry.kind === 'solar') {
    if (entry.type === 'total') return 'La Luna tapa el Sol del todo.';
    if (entry.type === 'annular')
      return `Queda un anillo de Sol alrededor de la Luna (tapa el ${percent(entry.obscuration)}).`;
    return `La Luna tapa el ${percent(entry.obscuration)} del Sol.`;
  }
  if (entry.type === 'total') return 'La Luna entra entera en la sombra de la Tierra y enrojece.';
  if (entry.type === 'partial')
    return `La sombra de la Tierra cubre el ${percent(entry.obscuration)} de la Luna.`;
  return 'Solo la penumbra de la Tierra: la Luna apenas se oscurece.';
}

/**
 * La parte que se ve: «Se ve entero; en el máximo, el Sol a 44° de altura.» o «Se ve en parte: de
 * 20:05 a 21:02, con el Sol sobre el horizonte.». En un total o un anular cuya fase central no se
 * ve, se dice.
 */
export function visibilityText(entry: EclipseEntry, timeZone: string): string {
  const body = entry.kind === 'solar' ? 'el Sol' : 'la Luna';
  const parts: string[] = [];
  if (entry.complete) {
    parts.push(
      `Se ve entero; en el máximo, ${body} a ${formatNumber(Math.round(entry.altitudeDeg), 0)}° de altura.`,
    );
  } else {
    const from = formatClockInZone(new Date(entry.visibleFrom), timeZone);
    const to = formatClockInZone(new Date(entry.visibleTo), timeZone);
    parts.push(`Se ve en parte: de ${from} a ${to}, con ${body} sobre el horizonte.`);
  }
  if (entry.kind === 'solar' && entry.type !== 'partial' && !entry.centralVisible) {
    parts.push(
      `La fase ${entry.type === 'total' ? 'total' : 'anular'} ocurre con el Sol bajo el horizonte.`,
    );
  }
  return parts.join(' ');
}

/** La URL de «Ver en 3D»: la vista Tierra con la sombra de la Luna o la vista Luna, en el máximo. */
export function view3dLink(entry: EclipseEntry): {
  readonly path: string;
  readonly queryParams: Readonly<Record<string, string>>;
} {
  // El instante del máximo, al segundo, como lo lee el explorador (`?fecha=2026-08-12T18:29:29Z`).
  const fecha = entry.peak;
  return entry.kind === 'solar'
    ? { path: '/explorar/tierra', queryParams: { fecha, sombra: '1' } }
    : { path: '/explorar/luna', queryParams: { fecha } };
}

/** «Ver en 3D el eclipse total de Sol del 12 de agosto de 2026» (el nombre accesible del enlace). */
export const view3dLabel = (entry: EclipseEntry, timeZone: string): string =>
  `Ver en 3D el ${eclipseTitle(entry).charAt(0).toLowerCase()}${eclipseTitle(entry).slice(1)} del ${eclipseDate(entry, timeZone)}`;
