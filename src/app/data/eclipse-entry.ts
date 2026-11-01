/**
 * Un eclipse visto desde un lugar, como lo guarda la lista de `/eclipses` (fase 8): sin dependencias,
 * para que la página prerenderizada no cargue astronomy-engine (la lista generada, `data/eclipses.ts`,
 * y la que recalcula el navegador con `ephemeris/eclipse-search.ts` tienen esta forma).
 */
import type { LocalEclipse } from '../ephemeris/eclipse-search';

export interface EclipseEntry {
  readonly kind: 'solar' | 'lunar';
  /** El tipo que se ve desde el lugar (en los de Luna, el mismo para toda la Tierra). */
  readonly type: 'partial' | 'annular' | 'total' | 'penumbral';
  /** El máximo (UTC, ISO 8601): en el lugar, en los de Sol. */
  readonly peak: string;
  /** La parte que se ve, con el astro sobre el horizonte (UTC, ISO 8601). */
  readonly visibleFrom: string;
  readonly visibleTo: string;
  /** Se ve entero (con el astro sobre el horizonte de principio a fin). */
  readonly complete: boolean;
  /** Solo en los de Sol totales o anulares: la fase central se ve entera. */
  readonly centralVisible: boolean;
  /** Parte del disco tapada en el máximo (0–1): del Sol por la Luna o de la Luna por la umbra. */
  readonly obscuration: number;
  /** Altura del astro en el máximo (grados). */
  readonly altitudeDeg: number;
}

/** Al segundo (la lista dice horas y minutos). */
const iso = (date: Date): string =>
  new Date(Math.round(date.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');

/** De un eclipse calculado a una entrada de la lista (redondeado: es lo que se muestra). */
export function toEclipseEntry(eclipse: LocalEclipse): EclipseEntry {
  return {
    kind: eclipse.kind,
    type: eclipse.type,
    peak: iso(eclipse.peak),
    visibleFrom: iso(eclipse.visible.from),
    visibleTo: iso(eclipse.visible.to),
    complete: eclipse.complete,
    centralVisible: eclipse.kind === 'solar' ? eclipse.centralVisible : false,
    obscuration: Math.round(eclipse.obscuration * 1000) / 1000,
    altitudeDeg: Math.round(eclipse.altitudeDeg * 10) / 10,
  };
}
