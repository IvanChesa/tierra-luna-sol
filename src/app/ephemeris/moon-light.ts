/**
 * La luz sobre la Luna (fase 6): dónde está el Sol visto desde ella y cuándo da a un lugar con la luz
 * que se busca. Las vistas de la Luna y las paradas de su recorrido llevan la fecha a esos instantes:
 * la cara visible, a la luna llena más cercana; la oculta, a la luna nueva; y un lugar, a la mañana
 * lunar más cercana en que el Sol está a cierta altura sobre su horizonte (rasante cerca del
 * terminador, más alto para ver bien un cráter).
 *
 * La Luna, como esfera (sus coordenadas selenográficas, del modelo IAU de `orientation.ts`), y el Sol
 * visto desde ella: el geocéntrico menos la Luna. Fuera de 1900–2100 no se busca.
 */
import { SearchMoonPhase } from 'astronomy-engine';
import { MAX_DATE, MIN_DATE } from './constants';
import { sunGeocentricEcl } from './coordinates';
import { moonGeocentric } from './ephemeris';
import { bodyCentricLatLon, bodyFixedToEcl } from './orientation';
import { sub } from './vec3';

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
/** Un mes sinódico medio (días). */
const SYNODIC_DAYS = 29.530589;

/** Punto subsolar de la Luna: latitud y longitud selenográficas (grados, este positivo). */
export function moonSubsolarPoint(date: Date): { latDeg: number; lonDeg: number } {
  const sun = sub(sunGeocentricEcl(date), moonGeocentric(date));
  return bodyCentricLatLon(bodyFixedToEcl('luna', date), sun);
}

/** Altura del Sol (grados) sobre el horizonte de un lugar de la Luna, tomada como esfera. */
export function moonSunElevationDeg(latDeg: number, lonDeg: number, date: Date): number {
  const sun = moonSubsolarPoint(date);
  const lat = latDeg * DEG;
  const sunLat = sun.latDeg * DEG;
  const cosine =
    Math.sin(lat) * Math.sin(sunLat) +
    Math.cos(lat) * Math.cos(sunLat) * Math.cos((lonDeg - sun.lonDeg) * DEG);
  return Math.asin(Math.max(-1, Math.min(1, cosine))) / DEG;
}

const inRange = (ms: number): boolean => ms >= MIN_DATE.getTime() && ms <= MAX_DATE.getTime();

/**
 * Media ventana de {@link nearestMoonPhase} (días): la fase más cercana está a menos de media lunación
 * (las más largas duran unos 29,8 días), así que cae entre 16 días antes y 16 después.
 */
const PHASE_WINDOW_DAYS = 16;

/**
 * El instante más cercano a `date` (a menos de medio mes) en que la Luna tiene la fase `phaseDeg` (su
 * elongación eclíptica: 0, nueva; 90, cuarto creciente; 180, llena), dentro de 1900–2100; `date` si
 * no hay ninguno. En la ventana de 16 días antes a 16 después caben una o dos fases: la primera y la
 * siguiente (revisión de la fase 6: buscar «un mes atrás» encontraba a veces la de hace un mes, si la
 * lunación anterior era corta).
 */
export function nearestMoonPhase(date: Date, phaseDeg: number): Date {
  const first = SearchMoonPhase(
    phaseDeg,
    new Date(date.getTime() - PHASE_WINDOW_DAYS * DAY_MS),
    2 * PHASE_WINDOW_DAYS,
  );
  const next = first
    ? SearchMoonPhase(phaseDeg, new Date(first.date.getTime() + DAY_MS), SYNODIC_DAYS + 1)
    : null;
  const candidates = [first?.date, next?.date]
    .filter((d): d is Date => d !== undefined && inRange(d.getTime()))
    .sort(
      (a, b) => Math.abs(a.getTime() - date.getTime()) - Math.abs(b.getTime() - date.getTime()),
    );
  return candidates[0] ?? date;
}

/** Paso de la búsqueda de {@link nearestMoonSunElevation} (el Sol sube ~0,5° por hora en el ecuador). */
const SEARCH_STEP_MS = 2 * 3_600_000;

/**
 * El instante más cercano a `date` (a menos de medio mes) en que el Sol, subiendo (la mañana del día
 * lunar), está a `elevationDeg` sobre el horizonte de un lugar de la Luna, dentro de 1900–2100; o
 * `null` si no llega a esa altura (junto a los polos). Se recorre el intervalo cada 2 horas y cada
 * cruce se afina por bisección (al segundo).
 */
export function nearestMoonSunElevation(
  latDeg: number,
  lonDeg: number,
  elevationDeg: number,
  date: Date,
): Date | null {
  const center = date.getTime();
  const half = (SYNODIC_DAYS / 2) * DAY_MS;
  const from = Math.max(center - half, MIN_DATE.getTime());
  const to = Math.min(center + half, MAX_DATE.getTime());
  const offset = (ms: number) => moonSunElevationDeg(latDeg, lonDeg, new Date(ms)) - elevationDeg;
  let best: number | null = null;
  let previous = offset(from);
  for (let start = from; start < to; start += SEARCH_STEP_MS) {
    const end = Math.min(start + SEARCH_STEP_MS, to);
    const next = offset(end);
    if (previous < 0 && next >= 0) {
      let low = start;
      let high = end;
      while (high - low > 1000) {
        const middle = (low + high) / 2;
        if (offset(middle) < 0) low = middle;
        else high = middle;
      }
      const crossing = (low + high) / 2;
      if (best === null || Math.abs(crossing - center) < Math.abs(best - center)) best = crossing;
    }
    previous = next;
  }
  return best === null ? null : new Date(Math.round(best));
}
