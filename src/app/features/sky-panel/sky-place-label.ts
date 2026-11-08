import { SKY_PLACES } from '../../data/places';
import type { SkyPlace } from '../../data/sky-place';
import { placeShortLabel } from './place-label';

/**
 * El lugar del cielo, corto, como en su selector: «Montsec (Lleida)»; la ubicación del usuario, «Tu
 * ubicación». Para la barra del cielo y la franja de arriba en el móvil (decisión de Iván del 08-11).
 */
export function skyPlaceShortLabel(place: SkyPlace): string {
  const option = SKY_PLACES.find((candidate) => candidate.id === place.id);
  return option ? placeShortLabel(option) : 'Tu ubicación';
}
