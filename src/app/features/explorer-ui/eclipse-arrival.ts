/**
 * La llegada al explorador desde «Ver en 3D» de `/eclipses` (crítica de diseño de la fase 10): se
 * llegaba a la vista genérica, con la sombra como una mancha sin rótulo y sin forma de volver a la
 * lista. Ahora, un aviso dice qué eclipse es, cuándo y desde dónde, y ofrece la vuelta. Pura, con tests.
 *
 * Solo si esa fecha es de verdad el máximo de ese eclipse visto desde ese lugar (fase 11b, F7 de la
 * revisión del bloque F): `?fecha=2030-01-01&eclipse=sol-total` hacía decir a la web «Eclipse total de
 * Sol del 1 de enero de 2030». Si no, `null`, y el explorador avisa de que lo ha ignorado.
 */
import { formatLongDateInZone } from '../../core/format';
import { EclipseKind, eclipseParam, eclipseTitle } from '../../data/eclipse-entry';
import { DEFAULT_PLACE_ID, PlaceId } from '../../data/places';
import { isEclipsePeak } from '../../ephemeris/eclipse-search';
import { skyPlaceOf } from '../../data/sky-place';
import { placePhrase } from '../sky-panel/sky-text';

export interface EclipseArrival {
  /** «Eclipse total de Sol del 12 de agosto de 2026, en su máximo visto desde Fraga.» */
  readonly text: string;
  /** La vuelta a la lista: `/eclipses`, con el lugar de la lista si no es el de por defecto. */
  readonly queryParams: Readonly<Record<string, string>>;
}

export function eclipseArrival(params: {
  readonly eclipse: EclipseKind | null;
  readonly time: Date | null;
  readonly place: PlaceId | null;
}): EclipseArrival | null {
  if (!params.eclipse || !params.time) return null;
  const place = skyPlaceOf(params.place ?? DEFAULT_PLACE_ID);
  if (!isEclipsePeak(params.eclipse.kind, params.eclipse.type, params.time, place)) return null;
  const date = formatLongDateInZone(params.time, place.timeZone);
  // El de Sol, en el máximo de ese lugar (la sombra pasa por otro sitio en cada instante); el de Luna,
  // el mismo para todos los que la ven.
  const where =
    params.eclipse.kind === 'solar'
      ? `, en su máximo visto desde ${placePhrase(place)}`
      : ', en su máximo';
  return {
    text: `${eclipseTitle(params.eclipse)} del ${date}${where}.`,
    queryParams: params.place && params.place !== DEFAULT_PLACE_ID ? { lugar: params.place } : {},
  };
}

/** El aviso de un `?eclipse=` que no es el de su fecha (y lugar): se ha ignorado. */
export const eclipseIgnoredWarning = (eclipse: EclipseKind): string =>
  `El eclipse «${eclipseParam(eclipse)}» no es el de esa fecha y se ha ignorado.`;
