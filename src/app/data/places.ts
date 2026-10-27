/**
 * Lugares del cielo desde España (decisión de Iván del 26-10, `docs/decisiones/CAMBIO-CIELO-ESPANA.md`;
 * el selector llega en la fase 8) y marcadores de la vista «España» de la Tierra (fase 5).
 *
 * Latitud y longitud geográficas (ETRS89 o WGS84, equivalentes a efectos del proyecto), longitud
 * positiva hacia el este, de fuentes oficiales, cada una con su URL (consultadas el 2026-10-27, salvo
 * Fraga y Lleida, el 2026-10-23):
 * - Instituto Geográfico Nacional: API OGC «Núcleos de población» (Fraga, Lleida) y «Lugar nombrado»
 *   del Nomenclátor (el Observatori Fabra, edificación; la Puerta del Sol, el punto del barrio de Sol,
 *   en la plaza). Licencia: uso libre compatible con CC BY 4.0, citando «© Instituto Geográfico
 *   Nacional» (https://www.ign.es/web/politica-datos).
 * - Instituto de Astrofísica de Canarias (el Roque de los Muchachos y el Teide), el Observatorio de
 *   Calar Alto (CAHA) y el Parc Astronòmic Montsec (en Àger: el punto de su enlace al mapa), en sus
 *   webs. La altitud del Observatori Fabra, de su estación del Servei Meteorològic de Catalunya.
 * La altitud de los lugares cuya fuente no la da queda en `null` (la fase 8 la busca).
 */
export interface Place {
  readonly id: string;
  readonly name: string;
  /** Provincia (y, en las islas, la isla), para situarlo. */
  readonly province: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  /** Altitud (m), o `null` si su fuente no la da. */
  readonly altitudeM: number | null;
  /** Zona horaria IANA: las Canarias van una hora por detrás de la Península. */
  readonly timeZone: string;
  /** En el selector del cielo desde España (fase 8) y con marcador en la vista «España» (fase 5). */
  readonly sky: boolean;
  /** Fuente de la latitud y la longitud, y de la altitud si no se indica otra. */
  readonly source: string;
  readonly altitudeSource?: string;
}

/** Grados, minutos y segundos a grados (las webs de los observatorios los dan así). */
const dms = (degrees: number, minutes: number, seconds: number): number =>
  degrees + minutes / 60 + seconds / 3600;

export const PLACES = [
  {
    id: 'montsec',
    name: 'Parque Astronómico del Montsec',
    province: 'Lleida',
    latitudeDeg: 42.024637,
    longitudeDeg: 0.736936,
    altitudeM: null,
    timeZone: 'Europe/Madrid',
    sky: true,
    source: 'https://parcastronomic.cat/en/prepare-your-visit/location/',
  },
  {
    id: 'observatori-fabra',
    name: 'Observatori Fabra',
    province: 'Barcelona',
    latitudeDeg: 41.418518088,
    longitudeDeg: 2.124084483,
    altitudeM: 410,
    timeZone: 'Europe/Madrid',
    sky: true,
    source: 'https://api-features.ign.es/collections/namedplace/items/1998172?f=json',
    altitudeSource: 'https://www.meteo.cat/observacions/xema/dades?codi=D5',
  },
  {
    id: 'roque-de-los-muchachos',
    name: 'Observatorio del Roque de los Muchachos',
    province: 'La Palma (Santa Cruz de Tenerife)',
    latitudeDeg: dms(28, 45, 22),
    longitudeDeg: -dms(17, 53, 30),
    altitudeM: 2396,
    timeZone: 'Atlantic/Canary',
    sky: true,
    source: 'https://www.iac.es/en/observatorios-de-canarias/roque-de-los-muchachos-observatory',
  },
  {
    id: 'teide',
    name: 'Observatorio del Teide',
    province: 'Tenerife (Santa Cruz de Tenerife)',
    latitudeDeg: dms(28, 18, 4),
    longitudeDeg: -dms(16, 30, 38),
    altitudeM: 2390,
    timeZone: 'Atlantic/Canary',
    sky: true,
    source: 'https://www.iac.es/en/observatorios-de-canarias/teide-observatory',
  },
  {
    id: 'calar-alto',
    name: 'Observatorio de Calar Alto',
    province: 'Almería',
    latitudeDeg: dms(37, 13, 25),
    longitudeDeg: -dms(2, 32, 46),
    altitudeM: 2168,
    timeZone: 'Europe/Madrid',
    sky: true,
    source: 'https://www.caha.es/WDXI/oldwdxi.php',
  },
  {
    id: 'madrid',
    name: 'Puerta del Sol',
    province: 'Madrid',
    latitudeDeg: 40.417114428,
    longitudeDeg: -3.703307681,
    altitudeM: null,
    timeZone: 'Europe/Madrid',
    sky: true,
    source: 'https://api-features.ign.es/collections/namedplace/items/2085074?f=json',
  },
  {
    id: 'fraga',
    name: 'Fraga',
    province: 'Huesca',
    latitudeDeg: 41.52125932,
    longitudeDeg: 0.352158695,
    altitudeM: 100.825,
    timeZone: 'Europe/Madrid',
    sky: true,
    source: 'https://api-features.ign.es/collections/nuc/items/200000448?f=json',
  },
  {
    id: 'lleida',
    name: 'Lleida',
    province: 'Lleida',
    latitudeDeg: 41.61470371,
    longitudeDeg: 0.6267342,
    altitudeM: 150.114,
    timeZone: 'Europe/Madrid',
    sky: false,
    source: 'https://api-features.ign.es/collections/nuc/items/900014081?f=json',
  },
] as const satisfies readonly Place[];

export type PlaceId = (typeof PLACES)[number]['id'];

/**
 * Observador por defecto hasta la fase 8, que añade el selector de los lugares del cielo desde España
 * con el Montsec por defecto (docs/decisiones/CAMBIO-CIELO-ESPANA.md).
 */
export const DEFAULT_PLACE_ID: PlaceId = 'fraga';

/** Los lugares del cielo desde España (los del selector y los marcadores de la vista «España»). */
export const SKY_PLACES: readonly Place[] = PLACES.filter((place) => place.sky);

export const PLACES_ATTRIBUTION = '© Instituto Geográfico Nacional';
export const PLACES_LICENSE_URL = 'https://www.ign.es/web/politica-datos';

export function findPlace(id: string): Place | undefined {
  return PLACES.find((place) => place.id === id);
}
