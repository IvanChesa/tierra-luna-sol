/**
 * El lugar del cielo desde España (fase 8): uno del selector (`data/places.ts`, con su zona horaria
 * IANA) o la ubicación del navegador («Usar mi ubicación», con la zona del navegador). La ubicación
 * nunca sale del navegador: ni a la URL ni a `localStorage`.
 */
import { DEFAULT_PLACE_ID, PlaceId, SKY_PLACES, findPlace } from './places';

export interface SkyPlace {
  /** El del selector, o `user` para la ubicación del navegador. */
  readonly id: PlaceId | 'user';
  readonly name: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly altitudeM: number;
  readonly timeZone: string;
}

/** Un lugar del selector por su id (el de por defecto, el Montsec, si no está). */
export function skyPlaceOf(id: string): SkyPlace {
  const place = SKY_PLACES.find((candidate) => candidate.id === id) ?? findPlace(DEFAULT_PLACE_ID);
  if (!place) throw new Error('Falta el lugar por defecto del cielo');
  return {
    id: place.id as PlaceId,
    name: place.name,
    latDeg: place.latitudeDeg,
    lonDeg: place.longitudeDeg,
    altitudeM: place.altitudeM ?? 0,
    timeZone: place.timeZone,
  };
}

/** La ubicación del navegador, con su zona horaria (la persona está allí). */
export function userSkyPlace(
  coords: {
    readonly latitude: number;
    readonly longitude: number;
    readonly altitude?: number | null;
  },
  timeZone: string,
): SkyPlace {
  return {
    id: 'user',
    name: 'Tu ubicación',
    latDeg: coords.latitude,
    lonDeg: coords.longitude,
    altitudeM: Number.isFinite(coords.altitude) ? (coords.altitude as number) : 0,
    timeZone,
  };
}

/** La zona horaria del navegador (UTC si no la dice). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
