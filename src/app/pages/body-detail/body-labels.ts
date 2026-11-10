/**
 * Los textos fijos de la ficha de un cuerpo (fase 9; ESTILO, «Las fichas»): el tipo, el texto
 * alternativo de su imagen y cómo se nombran sus fuentes. Funciones puras, con tests: las usan la
 * página y la lista de revisión de los textos (`scripts/build-text-review.mjs`).
 */
import { formatLongDate } from '../../core/format';
import { bodyPagePath } from '../../data/body-links';
import { findBody } from '../../data/body-index';
import type { BodyId, BodyIndexEntry } from '../../data/body.model';
import { MOON_RECREATION } from '../../data/moon-recreation';

/** El tipo, encima del H1: «Planeta», «Estrella», «Luna de Saturno» o «Satélite de la Tierra». */
export interface KindLine {
  readonly text: string;
  /** El cuerpo del que es luna, con el enlace a su ficha. */
  readonly parent?: { readonly name: string; readonly path: string };
}

export function kindLineOf(body: BodyIndexEntry): KindLine {
  if (body.kind === 'star') return { text: 'Estrella' };
  if (body.kind === 'planet') return { text: 'Planeta' };
  const parent = body.parent ? findBody(body.parent) : undefined;
  if (!parent) return { text: 'Luna' };
  // La nuestra es «el satélite de la Tierra» (ESTILO), con su artículo.
  if (body.id === 'luna') {
    return { text: 'Satélite de', parent: { name: 'la Tierra', path: bodyPagePath('tierra') } };
  }
  return { text: 'Luna de', parent: { name: parent.name, path: bodyPagePath(parent.id) } };
}

/**
 * Las lunas sin mapa de su superficie (fase 7): solo Proteo. Deimos y las cinco grandes de Urano ya
 * tienen el suyo (D43 y D45) y sus imágenes lo enseñan (revisión de los textos, fase 10).
 */
const SCHEMATIC = new Set<BodyId>(['proteo']);

/**
 * Las lunas con una parte que nadie ha visto y que el mapa recrea (D45 y D48): al menos el 10 % de su
 * superficie (`none` en `moon-recreation.ts`), Tritón, Deimos y las cinco grandes de Urano. Su imagen
 * lo dice (revisión de la fase 10, hallazgo 12; duda 4 de la revisión de los textos).
 */
const PARTLY_RECREATED = new Set<BodyId>(
  MOON_RECREATION.filter((moon) => moon.none >= 0.1).map((moon) => moon.body),
);

/** Lo que muestra la imagen de cada cuerpo (ESTILO §6: qué se ve, no «imagen de»), sin género. */
function seen(id: BodyId): string {
  if (SCHEMATIC.has(id)) return 'su color esquemático (no hay un mapa de su superficie)';
  switch (id) {
    case 'tierra':
      return 'sus continentes, sus océanos y sus nubes';
    case 'venus':
    case 'jupiter':
    case 'urano':
    case 'neptuno':
      return 'sus nubes';
    case 'saturno':
      return 'sus nubes y sus anillos';
    case 'titan':
      return 'su neblina';
    default:
      return PARTLY_RECREATED.has(id) ? 'su superficie, en parte recreada' : 'su superficie real';
  }
}

/** El texto alternativo de la imagen de la ficha: «Marte, con la luz del Sol de lado y su superficie real…». */
export function imageAltOf(body: BodyIndexEntry): string {
  if (body.kind === 'star') return 'El Sol, con su halo: imagen del propio explorador.';
  const name = body.id === 'tierra' ? 'La Tierra' : body.id === 'luna' ? 'La Luna' : body.name;
  return `${name}, con la luz del Sol de lado y ${seen(body.id)}: imagen del propio explorador.`;
}

/** «NASA Science», por la página de la fuente de un texto. */
export function textSourceName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host === 'science.nasa.gov') return 'NASA Science';
  if (host.endsWith('nasa.gov')) return 'NASA';
  return host;
}

/** «science.nasa.gov/mars/facts»: la dirección de una página, sin el protocolo ni la barra final. */
export function urlText(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`;
}

/** «23 de octubre de 2026» de una fecha «2026-10-23» (ESTILO §4). */
export const accessedText = (iso: string): string =>
  formatLongDate(new Date(`${iso}T12:00:00Z`), 'utc');
