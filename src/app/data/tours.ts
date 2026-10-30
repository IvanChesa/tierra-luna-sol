/**
 * Vistas guiadas de la Tierra (fase 5; decisión de Iván: Tierra completa, Pacífico, Himalaya, luces
 * nocturnas y España, con marcadores en los lugares del cielo desde España).
 *
 * Cada vista mira un punto de la superficie desde una distancia (en radios terrestres) y lleva la hora
 * del día, sin cambiar la fecha, a la que ese punto se ve como se quiere: de día (hora solar media 12)
 * o, las luces, de noche (0). En una pantalla pequeña, la cámara se aleja lo justo para que se vea su
 * región (`extentDeg`). Los textos son subtítulos breves, con sus fuentes y `reviewed: false` (Iván
 * los revisa en la fase 9).
 */
import { MAX_DATE, MIN_DATE } from '../ephemeris/constants';
import { SKY_PLACES } from './places';

export interface GuidedView {
  readonly id: string;
  readonly title: string;
  /** Subtítulo de la vista (se muestra y se anuncia). */
  readonly text: string;
  /** Las páginas que respaldan el subtítulo. */
  readonly sources: readonly string[];
  readonly reviewed: boolean;
  readonly latDeg: number;
  readonly lonDeg: number;
  /** Distancia de la cámara al centro de la Tierra, en radios terrestres (la de una pantalla ancha). */
  readonly distanceRadii: number;
  /**
   * Radio angular (grados de arco sobre la Tierra) de la región que tiene que verse alrededor del
   * punto: la cámara se aleja más de `distanceRadii` si la parte visible del lienzo no la deja ver.
   * 90: el disco entero.
   */
  readonly extentDeg: number;
  /** Hora solar media en el punto (0–24) a la que se lleva el reloj sin cambiar la fecha. */
  readonly solarHour: number;
  /** Con los marcadores de los lugares del cielo desde España. */
  readonly markers: boolean;
}

/** Distancia angular (grados de arco) entre dos puntos de la superficie (haversine). */
export function arcDistanceDeg(latA: number, lonA: number, latB: number, lonB: number): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((latB - latA) * rad) / 2) ** 2 +
    Math.cos(latA * rad) * Math.cos(latB * rad) * Math.sin(((lonB - lonA) * rad) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / rad;
}

/** La vista «España» mira aquí: entre la Península y Canarias. */
const SPAIN = { latDeg: 36, lonDeg: -7 };

export const GUIDED_VIEWS: readonly GuidedView[] = [
  {
    id: 'tierra-completa',
    title: 'La Tierra completa',
    text: 'La Tierra entera, de día: océanos, continentes y nubes, como la fotografía la cámara EPIC de la NASA desde el espacio, entre la Tierra y el Sol.',
    sources: ['https://epic.gsfc.nasa.gov/about/epic'],
    reviewed: false,
    latDeg: 15,
    lonDeg: 10,
    distanceRadii: 4.2,
    extentDeg: 90,
    solarHour: 12,
    markers: false,
  },
  {
    id: 'pacifico',
    title: 'El Pacífico',
    text: 'El océano Pacífico, el mayor y más profundo de la Tierra: guarda más de la mitad de su agua libre.',
    sources: ['https://oceanservice.noaa.gov/facts/biggestocean.html'],
    reviewed: false,
    latDeg: 0,
    lonDeg: -160,
    distanceRadii: 3.6,
    extentDeg: 90,
    solarHour: 12,
    markers: false,
  },
  {
    id: 'himalaya',
    title: 'El Himalaya',
    text: 'El Himalaya, la cordillera del Everest, la montaña más alta de la Tierra.',
    sources: [
      'https://science.nasa.gov/earth/earth-observatory/the-worlds-tallest-mountain-82578/',
    ],
    reviewed: false,
    latDeg: 28,
    lonDeg: 86,
    distanceRadii: 1.9,
    extentDeg: 13,
    solarHour: 10,
    markers: false,
  },
  {
    id: 'luces-nocturnas',
    title: 'Las luces de la noche',
    text: 'De noche, las luces de las ciudades y los pueblos dibujan dónde vive la gente.',
    sources: ['https://www.nasa.gov/image-article/black-marble/'],
    reviewed: false,
    latDeg: 45,
    lonDeg: 10,
    distanceRadii: 2.4,
    extentDeg: 20,
    solarHour: 0,
    markers: false,
  },
  {
    id: 'espana',
    title: 'España',
    text: 'España y los lugares del cielo desde España: el Montsec, el Observatori Fabra, Calar Alto, la Puerta del Sol y Fraga, en la Península, y el Teide y el Roque de los Muchachos, en Canarias.',
    // Cada lugar y dónde está: las fuentes oficiales de `data/places.ts`.
    sources: SKY_PLACES.map((place) => place.source),
    reviewed: false,
    ...SPAIN,
    distanceRadii: 2,
    // Los siete lugares, con 2° de aire.
    extentDeg:
      Math.max(
        ...SKY_PLACES.map((place) =>
          arcDistanceDeg(SPAIN.latDeg, SPAIN.lonDeg, place.latitudeDeg, place.longitudeDeg),
        ),
      ) + 2,
    solarHour: 12,
    markers: true,
  },
];

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** El día que enseña la interfaz, como clave («2026-6-21»): en la hora local del navegador o en UTC. */
export type DayOf = (date: Date) => string;

export const localDay: DayOf = (date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
export const utcDay: DayOf = (date) =>
  `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;

/**
 * El instante del mismo día en el que la hora solar media en `lonDeg` es `solarHour`: la longitud
 * adelanta la hora solar 1 h cada 15° hacia el este. Sin la ecuación del tiempo (unos minutos): basta
 * para ver el punto de día o de noche.
 *
 * El día es el que enseña la interfaz (`day`: el local del navegador o el UTC), no el día UTC: si no,
 * en España «Las luces de la noche» (las 23:20 UTC) pasarían al día siguiente. Esas horas se repiten
 * cada 24 h: de los tres candidatos (el del día UTC y los de los días vecinos), el que cae en ese día y
 * dentro de 1900–2100; si ninguno cae (un día de 23 h, por el cambio de hora), el más cercano.
 */
export function atSolarHour(
  date: Date,
  lonDeg: number,
  solarHour: number,
  day: DayOf = localDay,
): Date {
  const utcHours = (((solarHour - lonDeg / 15) % 24) + 24) % 24;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const base = midnight + utcHours * HOUR_MS;
  const shown = day(date);
  const candidates = [base - DAY_MS, base, base + DAY_MS].filter(
    (ms) => ms >= MIN_DATE.getTime() && ms <= MAX_DATE.getTime(),
  );
  const sameDay = candidates.find((ms) => day(new Date(ms)) === shown);
  const nearest = candidates.reduce(
    (best, ms) => (Math.abs(ms - date.getTime()) < Math.abs(best - date.getTime()) ? ms : best),
    base,
  );
  return new Date(sameDay ?? nearest);
}
