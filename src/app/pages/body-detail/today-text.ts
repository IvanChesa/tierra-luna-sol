/**
 * Los datos «de hoy» de las fichas (fase 9): qué filas lleva cada cuerpo y cómo se escriben sus
 * cifras. Sin astronomy-engine: las etiquetas van en el HTML prerenderizado (con «—» hasta que el
 * navegador calcula las cifras) y el cálculo llega después con un `import()` (`today.ts`).
 *
 * - El Sol: su distancia a la Tierra.
 * - Los planetas: al Sol y a la Tierra (la Tierra, solo al Sol).
 * - La Luna: a la Tierra y su fase.
 * - Las demás lunas: a su planeta y a la Tierra.
 */
import {
  formatAu,
  formatDistanceKm,
  formatLongDateTime,
  formatNumber,
  localZoneName,
  utcOffsetLabel,
} from '../../core/format';
import { findBody } from '../../data/body-index';
import type { BodyId } from '../../data/body.model';
import { GALILEAN_IDS } from '../../ephemeris/ids';

/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = ' ';
/**
 * Las lunas que se calculan con elementos medios ajustados a Horizons (D11): todas menos la nuestra y
 * las galileanas (sin importar `data/moon-elements.ts`, que va con el cálculo).
 */
const isMeanElementsMoonId = (id: BodyId): boolean =>
  findBody(id)?.kind === 'moon' &&
  id !== 'luna' &&
  !(GALILEAN_IDS as readonly string[]).includes(id);

/** Más cerca que esto, las distancias se dan en km; más lejos, en UA con los km debajo. */
const NEAR_KM = 5e6;

export type TodayKey = 'toSun' | 'toEarth' | 'toParent' | 'phase';

export interface TodayRow {
  readonly key: TodayKey;
  readonly label: string;
  /** La cifra (o el nombre de la fase); «—» hasta que se calcula. */
  readonly value: string;
  /** Debajo, más pequeño: la misma distancia en km, o la fracción iluminada. */
  readonly detail: string;
}

/** «Al Sol», «A la Tierra», «A Saturno». */
function toLabel(id: BodyId): string {
  if (id === 'sol') return 'Al Sol';
  if (id === 'tierra') return 'A la Tierra';
  return `A ${findBody(id)?.name ?? id}`;
}

/** Las filas de un cuerpo, sin cifras (las del HTML prerenderizado). */
export function todayKeys(id: BodyId): { key: TodayKey; label: string }[] {
  const entry = findBody(id);
  if (!entry) return [];
  if (entry.kind === 'star') return [{ key: 'toEarth', label: toLabel('tierra') }];
  if (entry.kind === 'planet') {
    const rows: { key: TodayKey; label: string }[] = [{ key: 'toSun', label: toLabel('sol') }];
    if (id !== 'tierra') rows.push({ key: 'toEarth', label: toLabel('tierra') });
    return rows;
  }
  if (id === 'luna') {
    return [
      { key: 'toEarth', label: toLabel('tierra') },
      { key: 'phase', label: 'Fase' },
    ];
  }
  return [
    { key: 'toParent', label: toLabel(entry.parent ?? 'sol') },
    { key: 'toEarth', label: toLabel('tierra') },
  ];
}

/** Las filas sin calcular: «—» en la cifra (el HTML prerenderizado y sin JavaScript). */
export const pendingRows = (id: BodyId): TodayRow[] =>
  todayKeys(id).map(({ key, label }) => ({ key, label, value: '—', detail: '' }));

/** Una distancia: en km si está cerca; si no, en UA con los km debajo (como la ficha del explorador). */
export function distanceCells(km: number): { value: string; detail: string } {
  return km < NEAR_KM
    ? { value: formatDistanceKm(km), detail: '' }
    : { value: formatAu(km), detail: formatDistanceKm(km) };
}

/**
 * La distancia de una luna a su planeta: en km enteros, como en la tabla de su ficha y en el índice del
 * explorador (ESTILO §3; revisión de la fase 9, sugerencia 19): con un decimal en millones no se ve
 * cómo varía.
 */
export const parentDistanceCells = (km: number): { value: string; detail: string } => ({
  value: `${formatNumber(km, 0)}${NBSP}km`,
  detail: '',
});

/** Lo que dice el HTML antes del cálculo (y sin JavaScript). */
export const PENDING_NOTE =
  'Las distancias de hoy las calcula tu navegador con astronomy-engine al abrir la página (hace falta JavaScript).';

/**
 * Cuándo y con qué se ha calculado (ESTILO §4 y §5): «Calculado en tu navegador el 3 de noviembre de
 * 2026 a las 19:40, hora local (Europe/Madrid, UTC+1), con astronomy-engine.». Tan larga como la nota
 * de antes del cálculo: al cambiar, la página no se mueve.
 */
export function calculatedNote(date: Date): string {
  const when = formatLongDateTime(date, 'local').replace(/, (\d{1,2}:\d{2})$/, ' a las $1');
  return `Calculado en tu navegador el ${when}, hora local (${localZoneName()}, ${utcOffsetLabel(date)}), con astronomy-engine.`;
}

/**
 * De dónde sale la posición de las lunas con elementos medios (D11), en el HTML: «La posición de
 * Titán respecto a Saturno sale de elementos orbitales ajustados a las efemérides del JPL.».
 */
export function positionNote(id: BodyId): string | null {
  const entry = findBody(id);
  if (entry?.kind !== 'moon' || !entry.parent || !isMeanElementsMoonId(id)) return null;
  const parent = findBody(entry.parent)?.name ?? entry.parent;
  return `La posición de ${entry.name} respecto a ${parent} sale de elementos orbitales ajustados a las efemérides del JPL.`;
}

/** «87 % iluminada» (ESTILO §3: espacio duro antes del %). */
export const illuminatedText = (fraction: number): string =>
  `${formatNumber(fraction * 100, 0)}${NBSP}% iluminada`;
