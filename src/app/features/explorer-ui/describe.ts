/**
 * Textos de la interfaz sobre los cuerpos y las vistas (ESTILO §2 y §6): el tipo de cada cuerpo, la
 * ruta de su ficha y la frase que se anuncia al elegirlo. Funciones puras, con tests.
 */
import { formatAu, formatDistanceKm, formatNumber } from '../../core/format';
import { findBody } from '../../data/body-index';
import type { BodyId } from '../../data/body.model';
import type { BodyDistances } from '../../data/solar-system';
import type { ExplorerView } from '../../scene';

/** «Estrella», «Planeta», «Satélite de la Tierra» o «Luna de Saturno». */
export function bodyKindLabel(id: BodyId): string {
  const entry = findBody(id);
  if (!entry) return '';
  if (entry.kind === 'star') return 'Estrella';
  if (entry.kind === 'planet') return 'Planeta';
  if (id === 'luna') return 'Satélite de la Tierra';
  const parent = entry.parent ? findBody(entry.parent) : undefined;
  return parent ? `Luna de ${parent.name}` : 'Luna';
}

/** Ruta de la ficha completa, si ya existe (las de las lunas llegan en la fase 9). */
export function bodyPagePath(id: BodyId): string | null {
  if (id === 'sol') return '/sol';
  if (id === 'luna') return '/luna';
  // TODO(fase-9): enlazar /lunas/:id cuando existan sus fichas.
  return findBody(id)?.kind === 'planet' ? `/planetas/${id}` : null;
}

/** «del Sol», «de la Tierra», «de Saturno»… (con el artículo que lleva cada nombre). */
export function ofBody(id: BodyId): string {
  if (id === 'sol') return 'del Sol';
  if (id === 'tierra') return 'de la Tierra';
  if (id === 'luna') return 'de la Luna';
  return `de ${findBody(id)?.name ?? id}`;
}

/** «Al Sol», «A la Tierra», «A Saturno»: la etiqueta de una distancia a ese cuerpo. */
export function toBodyLabel(id: BodyId): string {
  if (id === 'sol') return 'Al Sol';
  if (id === 'tierra') return 'A la Tierra';
  if (id === 'luna') return 'A la Luna';
  return `A ${findBody(id)?.name ?? id}`;
}

/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = '\u00a0';

/**
 * La distancia de un cuerpo como columna de una tabla de efemérides (el índice y las fichas): los
 * planetas, al Sol en UA; las lunas, a su planeta en km enteros (ESTILO §3, la excepción del índice).
 * El Sol no tiene: es el origen. `null` si no hay dato.
 */
export function distanceValue(id: BodyId, distances: BodyDistances): string | null {
  const entry = findBody(id);
  if (!entry || entry.kind === 'star') return null;
  if (entry.kind === 'planet')
    return distances.toSunKm === null ? null : formatAu(distances.toSunKm);
  return distances.toParentKm === null ? null : `${formatNumber(distances.toParentKm, 0)}${NBSP}km`;
}

/**
 * La distancia para el lector de pantalla, como descripción de una fila del índice o de una ficha:
 * «A 9,54 UA del Sol», «A 1.221.870 km de Saturno». Vacía para el Sol.
 */
export function distanceText(id: BodyId, distances: BodyDistances): string {
  const value = distanceValue(id, distances);
  const entry = findBody(id);
  if (!value || !entry) return '';
  return `A ${value} ${entry.kind === 'moon' && entry.parent ? ofBody(entry.parent) : 'del Sol'}`;
}

/**
 * La frase que se anuncia al elegir un cuerpo (ESTILO §6): «Saturno, planeta. A 1430 millones de km
 * del Sol y a 1320 millones de km de la Tierra.». Las lunas dicen la distancia a su planeta.
 */
export function describeBody(id: BodyId, distances: BodyDistances): string {
  const entry = findBody(id);
  if (!entry) return '';
  const kind = bodyKindLabel(id);
  const parts: string[] = [];
  if (entry.kind === 'moon' && entry.parent && distances.toParentKm !== null) {
    parts.push(`${formatDistanceKm(distances.toParentKm)} ${ofBody(entry.parent)}`);
  } else if (distances.toSunKm !== null) {
    parts.push(`${formatDistanceKm(distances.toSunKm)} del Sol`);
  }
  if (distances.toEarthKm !== null && entry.parent !== 'tierra') {
    parts.push(`${formatDistanceKm(distances.toEarthKm)} de la Tierra`);
  }
  const where = parts.length > 0 ? ` A ${parts.join(' y a ')}.` : '';
  return `${entry.name}, ${kind.charAt(0).toLowerCase()}${kind.slice(1)}.${where}`;
}

const VIEW_NAMES: Readonly<Record<ExplorerView, string>> = {
  system: 'Vista del sistema solar',
  earth: 'Vista de la Tierra',
  moon: 'Vista de la Luna',
};

export const viewName = (view: ExplorerView): string => VIEW_NAMES[view];
