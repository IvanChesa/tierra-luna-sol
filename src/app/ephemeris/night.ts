/**
 * «Esta noche» desde un lugar (fase 8): la noche del instante, sus crepúsculos, la Luna y su fase, y
 * cuándo y hacia dónde se ve cada planeta. TS puro con astronomy-engine (D4): `SearchRiseSet` para las
 * salidas y las puestas (el borde superior del Sol y de la Luna, con la refracción), `SearchAltitude`
 * para los crepúsculos (el centro del Sol a −6°, −12° y −18°, sin refracción, por convención) y
 * `SearchHourAngle` para las culminaciones.
 *
 * La noche de un instante va de la última puesta del Sol antes de la próxima salida a esa salida: de
 * noche, la noche en curso; de día, la que viene. Lejos de España («usar mi ubicación») puede no haber
 * puesta (el Sol de medianoche) o salida (la noche polar), o no llegar a la noche astronómica: se dice,
 * no se rompe.
 */
import {
  AstroTime,
  Body,
  Equator,
  Horizon,
  Illumination,
  MakeTime,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from 'astronomy-engine';
import { GeoObserver, astronomyObserver } from './coordinates';
import { MoonPhaseInfo, moonPhase } from './ephemeris';
import { SKY_BODIES, SUNRISE_ALTITUDE_DEG, SkyBodyId, constellationOf, horizontalOf } from './sky';
import { clampToSupportedRange, toAstroTime } from './time';

const DAY_MS = 86_400_000;

/** Por debajo de esta altura (grados), un cuerpo se pierde en la bruma del horizonte. */
export const VISIBLE_ALTITUDE_DEG = 5;

/** Los cuerpos de «Esta noche»: la Luna y los planetas (el Sol marca la noche). */
export const NIGHT_BODY_IDS = [
  'luna',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
] as const satisfies readonly SkyBodyId[];
export type NightBodyId = (typeof NIGHT_BODY_IDS)[number];

/** Los finales (al anochecer) o los comienzos (al amanecer) de los tres crepúsculos. */
export interface Twilights {
  readonly civil: Date | null;
  readonly nautical: Date | null;
  readonly astronomical: Date | null;
}

export interface SkyMoment {
  readonly time: Date;
  readonly azimuthDeg: number;
  readonly altitudeDeg: number;
}

export interface NightBody {
  readonly id: NightBodyId;
  /** Salida y puesta durante la noche (de la puesta a la salida del Sol), si las hay. */
  readonly rise: Date | null;
  readonly set: Date | null;
  /** Ya está sobre el horizonte cuando se pone el Sol. */
  readonly upAtSunset: boolean;
  /** La culminación (el paso por el meridiano, lo más alto del día) si cae de noche. */
  readonly transit: SkyMoment | null;
  /** Lo más alto que llega con el cielo oscuro (el Sol por debajo de −6°). */
  readonly best: SkyMoment;
  /** Mientras está sobre el horizonte con el cielo oscuro. */
  readonly window: { readonly from: Date; readonly to: Date } | null;
  /** Se ve: a más de {@link VISIBLE_ALTITUDE_DEG} de altura con el cielo oscuro. */
  readonly visible: boolean;
  /** Magnitud visual en su mejor momento. */
  readonly magnitude: number;
  /** Símbolo IAU de su constelación en su mejor momento. */
  readonly constellation: string;
}

export type NightSky =
  | {
      readonly kind: 'night';
      /**
       * Desde cuándo es «esta noche»: justo después de la salida del Sol anterior (de día, `nightSky`
       * ya da la noche que viene). `nightSky` da esta misma noche en cualquier instante de
       * [since, sunrise). Si no hay salida en los dos días anteriores (al acabar el Sol de medianoche),
       * la puesta.
       */
      readonly since: Date;
      readonly sunset: Date;
      readonly sunrise: Date;
      /** Al anochecer: cuándo termina cada crepúsculo (`null`: el Sol no baja tanto). */
      readonly dusk: Twilights;
      /** Al amanecer: cuándo empieza cada uno. */
      readonly dawn: Twilights;
      /** El cielo oscuro, del final del crepúsculo civil al comienzo del de la mañana. */
      readonly dark: { readonly start: Date; readonly end: Date };
      readonly moon: NightBody & { readonly phase: MoonPhaseInfo };
      readonly planets: readonly NightBody[];
    }
  /** El Sol no se pone en los próximos días. */
  | { readonly kind: 'midnight-sun' }
  /** El Sol no sale en los próximos días. */
  | { readonly kind: 'polar-night' };

const days = (from: Date, to: Date): number => (to.getTime() - from.getTime()) / DAY_MS;
const dateOf = (time: AstroTime | null): Date | null => (time ? time.date : null);
const after = (date: Date, limit: Date): boolean => date.getTime() <= limit.getTime();

/** Altura geométrica del centro del Sol (sin refracción). */
function sunGeometricAltitude(date: Date, place: GeoObserver): number {
  const time = toAstroTime(date);
  const observer = astronomyObserver(place);
  const equator = Equator(Body.Sun, time, observer, true, true);
  return Horizon(time, observer, equator.ra, equator.dec).altitude;
}

/** «Esta noche» en un lugar: la noche que contiene el instante o, de día, la siguiente. */
export function nightSky(date: Date, place: GeoObserver): NightSky {
  const observer = astronomyObserver(place);
  const start = toAstroTime(date);
  const sunriseTime = SearchRiseSet(Body.Sun, observer, +1, start, 2);
  const sunsetTime = sunriseTime ? SearchRiseSet(Body.Sun, observer, -1, sunriseTime, -2) : null;
  if (!sunriseTime || !sunsetTime) {
    return sunGeometricAltitude(date, place) > SUNRISE_ALTITUDE_DEG
      ? { kind: 'midnight-sun' }
      : { kind: 'polar-night' };
  }
  const sunset = sunsetTime.date;
  const sunrise = sunriseTime.date;
  // Un segundo después de la salida anterior: en el instante mismo de la salida, la búsqueda podría
  // encontrar esa misma salida.
  const previousSunrise = SearchRiseSet(Body.Sun, observer, +1, sunsetTime, -2);
  const since = previousSunrise ? new Date(previousSunrise.date.getTime() + 1000) : sunset;
  const span = days(sunset, sunrise);
  const descent = (altitude: number) =>
    dateOf(SearchAltitude(Body.Sun, observer, -1, sunsetTime, span, altitude));
  const dusk: Twilights = {
    civil: descent(-6),
    nautical: descent(-12),
    astronomical: descent(-18),
  };
  const ascent = (from: Date | null, altitude: number) =>
    from
      ? dateOf(SearchAltitude(Body.Sun, observer, +1, from, days(from, sunrise), altitude))
      : null;
  const dawn: Twilights = {
    astronomical: ascent(dusk.astronomical, -18),
    nautical: ascent(dusk.nautical, -12),
    civil: ascent(dusk.civil, -6),
  };
  const dark = { start: dusk.civil ?? sunset, end: dawn.civil ?? sunrise };
  const night = { sunset, sunrise, dark };
  const middle = new Date((dark.start.getTime() + dark.end.getTime()) / 2);
  const [moon, ...planets] = NIGHT_BODY_IDS.map((id) => nightBody(id, place, night));
  return {
    kind: 'night',
    since,
    sunset,
    sunrise,
    dusk,
    dawn,
    dark,
    // La mitad de la última noche de 2100 ya es 2101: la fase apenas cambia en unas horas.
    moon: { ...(moon as NightBody), phase: moonPhase(clampToSupportedRange(middle)) },
    planets,
  };
}

interface NightFrame {
  readonly sunset: Date;
  readonly sunrise: Date;
  readonly dark: { readonly start: Date; readonly end: Date };
}

/** Un cuerpo en la noche: sus salidas, su culminación y su mejor momento con el cielo oscuro. */
export function nightBody(id: NightBodyId, place: GeoObserver, night: NightFrame): NightBody {
  const observer = astronomyObserver(place);
  const body = SKY_BODIES[id];
  const { sunset, sunrise, dark } = night;
  const span = days(sunset, sunrise);
  const rise = dateOf(SearchRiseSet(body, observer, +1, sunset, span));
  const set = dateOf(SearchRiseSet(body, observer, -1, sunset, span));
  const upAtSunset =
    set !== null && (rise === null || set < rise)
      ? true
      : rise !== null
        ? false
        : horizontalOf(id, sunset, place).altitudeDeg > 0;
  const moment = (time: Date): SkyMoment => ({ time, ...horizontalOf(id, time, place) });

  const transitTime = SearchHourAngle(body, observer, 0, sunset, +1).time.date;
  const transit = after(transitTime, sunrise) ? moment(transitTime) : null;

  // Lo más alto con el cielo oscuro: la culminación si cae dentro; si no, el extremo más alto (la
  // altura solo tiene un máximo al día, así que entre dos extremos sin culminación no sube y baja).
  const atStart = moment(dark.start);
  const atEnd = moment(dark.end);
  const darkTransit =
    transit && transit.time >= dark.start && after(transit.time, dark.end) ? transit : null;
  const best = darkTransit ?? (atStart.altitudeDeg >= atEnd.altitudeDeg ? atStart : atEnd);

  // Mientras está sobre el horizonte con el cielo oscuro.
  const darkSpan = days(dark.start, dark.end);
  const from =
    atStart.altitudeDeg > 0
      ? dark.start
      : dateOf(SearchRiseSet(body, observer, +1, dark.start, darkSpan));
  let window: NightBody['window'] = null;
  if (from && after(from, dark.end)) {
    const setting = dateOf(SearchRiseSet(body, observer, -1, from, days(from, dark.end)));
    window = { from, to: setting && after(setting, dark.end) ? setting : dark.end };
  }

  return {
    id,
    rise,
    set,
    upAtSunset,
    transit,
    best,
    window,
    visible: best.altitudeDeg >= VISIBLE_ALTITUDE_DEG,
    // Con MakeTime: la última noche de 2100 acaba en 2101, fuera del rango de `toAstroTime`.
    magnitude: Illumination(body, MakeTime(best.time)).mag,
    constellation: constellationOf(id, best.time, place),
  };
}
