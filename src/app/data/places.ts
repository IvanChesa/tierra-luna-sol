/**
 * Observadores del cielo del Bajo Cinca (fase 8) y marcador de la vista de la Tierra (fase 5).
 *
 * Coordenadas y altitud del núcleo de población, del Instituto Geográfico Nacional (API OGC
 * «Núcleos de población», consultada el 2026-10-23). Latitud y longitud geográficas ETRS89
 * (equivalente a WGS84 a efectos del proyecto), longitud positiva hacia el este.
 * Licencia: uso libre compatible con CC BY 4.0, citando «© Instituto Geográfico Nacional»
 * (https://www.ign.es/web/politica-datos).
 */
export interface Place {
  readonly id: string;
  readonly name: string;
  readonly province: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly altitudeM: number;
  readonly source: string;
}

export const PLACES = [
  {
    id: 'fraga',
    name: 'Fraga',
    province: 'Huesca',
    latitudeDeg: 41.52125932,
    longitudeDeg: 0.352158695,
    altitudeM: 100.825,
    source: 'https://api-features.ign.es/collections/nuc/items/200000448?f=json',
  },
  {
    id: 'lleida',
    name: 'Lleida',
    province: 'Lleida',
    latitudeDeg: 41.61470371,
    longitudeDeg: 0.6267342,
    altitudeM: 150.114,
    source: 'https://api-features.ign.es/collections/nuc/items/900014081?f=json',
  },
] as const satisfies readonly Place[];

export type PlaceId = (typeof PLACES)[number]['id'];

/** Observador por defecto del cielo del Bajo Cinca (PLAN, fase 8). */
export const DEFAULT_PLACE_ID: PlaceId = 'fraga';

export const PLACES_ATTRIBUTION = '© Instituto Geográfico Nacional';
export const PLACES_LICENSE_URL = 'https://www.ign.es/web/politica-datos';

export function findPlace(id: string): Place | undefined {
  return PLACES.find((place) => place.id === id);
}
