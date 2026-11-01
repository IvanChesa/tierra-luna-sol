/**
 * Los próximos eclipses que se ven desde un lugar (fase 8, `/eclipses`): de Sol (`NextLocalSolarEclipse`,
 * con su tipo allí) y de Luna (`NextLunarEclipse`, el mismo para toda la Tierra), con la parte que se ve
 * con el astro sobre el horizonte. La geometría de las sombras está en `eclipse.ts`.
 *
 * Un eclipse se ve si el astro está sobre el horizonte (el centro, con la refracción) en alguna parte
 * de su fase principal: en los de Sol, entre el primer y el último contacto; en los de Luna, mientras
 * la sombra (la umbra en los parciales y los totales, la penumbra en los penumbrales) la cubre.
 */
import {
  AstroTime,
  Body,
  EclipseKind,
  MakeTime,
  NextGlobalSolarEclipse,
  NextLocalSolarEclipse,
  NextLunarEclipse,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
  SearchLunarEclipse,
  SearchRiseSet,
} from 'astronomy-engine';
import { GeoObserver, astronomyObserver } from './coordinates';
import { horizontalOf } from './sky';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export type SolarEclipseType = 'partial' | 'annular' | 'total';
export type LunarEclipseType = 'penumbral' | 'partial' | 'total';

export interface Interval {
  readonly from: Date;
  readonly to: Date;
}

export interface LocalSolarEclipse {
  readonly kind: 'solar';
  /** El tipo que se ve desde el lugar. */
  readonly type: SolarEclipseType;
  /** El máximo en el lugar. */
  readonly peak: Date;
  /** Del primer al último contacto en el lugar. */
  readonly contacts: Interval;
  /** La fase total o anular, si el lugar está en la franja central. */
  readonly central: Interval | null;
  /** Parte del disco del Sol tapada en el máximo (0–1). */
  readonly obscuration: number;
  /** Altura del Sol en el máximo (grados, con la refracción). */
  readonly altitudeDeg: number;
  /** La parte del eclipse con el Sol sobre el horizonte. */
  readonly visible: Interval;
  /** Todo el eclipse, del primer al último contacto, con el Sol sobre el horizonte. */
  readonly complete: boolean;
  /** La fase total o anular se ve entera con el Sol sobre el horizonte. */
  readonly centralVisible: boolean;
}

export interface LocalLunarEclipse {
  readonly kind: 'lunar';
  readonly type: LunarEclipseType;
  readonly peak: Date;
  /** La Luna en la penumbra, en la umbra (parcial y total) y entera en la umbra (total). */
  readonly penumbral: Interval;
  readonly partial: Interval | null;
  readonly total: Interval | null;
  /** Parte del disco de la Luna dentro de la umbra en el máximo (0–1). */
  readonly obscuration: number;
  /** Altura de la Luna en el máximo (grados, con la refracción). */
  readonly altitudeDeg: number;
  /** La parte de su fase principal con la Luna sobre el horizonte. */
  readonly visible: Interval;
  /** Toda la fase principal con la Luna sobre el horizonte. */
  readonly complete: boolean;
}

export type LocalEclipse = LocalSolarEclipse | LocalLunarEclipse;

const SOLAR_TYPES: Readonly<Record<EclipseKind, SolarEclipseType | null>> = {
  [EclipseKind.Partial]: 'partial',
  [EclipseKind.Annular]: 'annular',
  [EclipseKind.Total]: 'total',
  [EclipseKind.Penumbral]: null,
};
const LUNAR_TYPES: Readonly<Record<EclipseKind, LunarEclipseType | null>> = {
  [EclipseKind.Penumbral]: 'penumbral',
  [EclipseKind.Partial]: 'partial',
  [EclipseKind.Total]: 'total',
  [EclipseKind.Annular]: null,
};

const around = (peak: AstroTime, halfMinutes: number): Interval => ({
  from: new Date(peak.date.getTime() - halfMinutes * MINUTE_MS),
  to: new Date(peak.date.getTime() + halfMinutes * MINUTE_MS),
});

/**
 * La parte de un intervalo con el astro (el Sol o la Luna) sobre el horizonte, o `null` si no sale en
 * todo él. Con las salidas y las puestas de astronomy-engine: el intervalo dura unas horas, así que
 * dentro hay como mucho una salida o una puesta (o una puesta y una salida en latitudes altas).
 */
function aboveHorizon(
  id: 'sol' | 'luna',
  interval: Interval,
  place: GeoObserver,
): { visible: Interval; complete: boolean } | null {
  const observer = astronomyObserver(place);
  const body = id === 'sol' ? Body.Sun : Body.Moon;
  const span = (interval.to.getTime() - interval.from.getTime()) / DAY_MS;
  const up = (date: Date) => horizontalOf(id, date, place).altitudeDeg > 0;
  const upAtStart = up(interval.from);
  const from = upAtStart
    ? interval.from
    : (SearchRiseSet(body, observer, +1, interval.from, span)?.date ?? null);
  if (!from || from > interval.to) return null;
  const rest = (interval.to.getTime() - from.getTime()) / DAY_MS;
  const setting = rest > 0 ? (SearchRiseSet(body, observer, -1, from, rest)?.date ?? null) : null;
  const to = setting && setting <= interval.to ? setting : interval.to;
  return { visible: { from, to }, complete: upAtStart && to === interval.to };
}

/** Un eclipse de Sol en el lugar, con la parte que se ve, o `null` si no se ve nada. */
function localSolar(
  info: ReturnType<typeof SearchLocalSolarEclipse>,
  place: GeoObserver,
): LocalSolarEclipse | null {
  const type = SOLAR_TYPES[info.kind];
  if (!type) return null;
  const contacts = { from: info.partial_begin.time.date, to: info.partial_end.time.date };
  const sky = aboveHorizon('sol', contacts, place);
  if (!sky) return null;
  const central =
    info.total_begin && info.total_end
      ? { from: info.total_begin.time.date, to: info.total_end.time.date }
      : null;
  return {
    kind: 'solar',
    type,
    peak: info.peak.time.date,
    contacts,
    central,
    obscuration: info.obscuration,
    altitudeDeg: info.peak.altitude,
    visible: sky.visible,
    complete: sky.complete,
    centralVisible:
      central !== null && sky.visible.from <= central.from && sky.visible.to >= central.to,
  };
}

/** Un eclipse de Luna en el lugar, con la parte que se ve, o `null` si no se ve nada. */
function localLunar(
  info: ReturnType<typeof SearchLunarEclipse>,
  place: GeoObserver,
): LocalLunarEclipse | null {
  const type = LUNAR_TYPES[info.kind];
  if (!type) return null;
  const penumbral = around(info.peak, info.sd_penum);
  const partial = info.sd_partial > 0 ? around(info.peak, info.sd_partial) : null;
  const total = info.sd_total > 0 ? around(info.peak, info.sd_total) : null;
  const main = partial ?? penumbral;
  const sky = aboveHorizon('luna', main, place);
  if (!sky) return null;
  return {
    kind: 'lunar',
    type,
    peak: info.peak.date,
    penumbral,
    partial,
    total,
    obscuration: info.obscuration,
    altitudeDeg: horizontalOf('luna', info.peak.date, place).altitudeDeg,
    visible: sky.visible,
    complete: sky.complete,
  };
}

/** El próximo eclipse de Sol que se ve desde el lugar después de `after` y antes de `until`. */
export function nextSolarEclipse(
  after: Date,
  until: Date,
  place: GeoObserver,
): LocalSolarEclipse | null {
  const observer = astronomyObserver(place);
  let info = SearchLocalSolarEclipse(MakeTime(after), observer);
  while (info.peak.time.date <= until) {
    const local = localSolar(info, place);
    if (local) return local;
    info = NextLocalSolarEclipse(info.peak.time, observer);
  }
  return null;
}

/** El próximo eclipse de Luna que se ve desde el lugar después de `after` y antes de `until`. */
export function nextLunarEclipse(
  after: Date,
  until: Date,
  place: GeoObserver,
): LocalLunarEclipse | null {
  let info = SearchLunarEclipse(MakeTime(after));
  while (info.peak.date <= until) {
    const local = localLunar(info, place);
    if (local) return local;
    info = NextLunarEclipse(info.peak);
  }
  return null;
}

/** Todos los eclipses que se ven desde el lugar entre dos fechas, por orden. */
export function eclipsesBetween(from: Date, until: Date, place: GeoObserver): LocalEclipse[] {
  const list: LocalEclipse[] = [];
  for (let solar = nextSolarEclipse(from, until, place); solar;) {
    list.push(solar);
    solar = nextSolarEclipse(new Date(solar.peak.getTime() + DAY_MS), until, place);
  }
  for (let lunar = nextLunarEclipse(from, until, place); lunar;) {
    list.push(lunar);
    lunar = nextLunarEclipse(new Date(lunar.peak.getTime() + DAY_MS), until, place);
  }
  return list.sort((a, b) => a.peak.getTime() - b.peak.getTime());
}

/** Un eclipse en toda la Tierra: el instante del máximo (UT y TT) y su tipo. */
export interface GlobalEclipse {
  readonly kind: 'solar' | 'lunar';
  readonly peak: Date;
  /** El mismo instante en TT, como los catálogos de la NASA (TD). */
  readonly peakTt: Date;
  readonly type: SolarEclipseType | LunarEclipseType;
}

const ttOf = (time: AstroTime): Date =>
  new Date(time.date.getTime() + (time.tt - time.ut) * DAY_MS);

/**
 * Los eclipses de Sol (en el punto del máximo) y de Luna de toda la Tierra entre dos fechas, para
 * compararlos con los catálogos de la NASA. Los híbridos salen como totales o anulares: astronomy-engine
 * da el tipo en el punto del máximo.
 */
export function globalEclipsesBetween(from: Date, until: Date): GlobalEclipse[] {
  const list: GlobalEclipse[] = [];
  for (
    let solar = SearchGlobalSolarEclipse(MakeTime(from));
    solar.peak.date <= until;
    solar = NextGlobalSolarEclipse(solar.peak)
  ) {
    const type = SOLAR_TYPES[solar.kind];
    if (type) list.push({ kind: 'solar', peak: solar.peak.date, peakTt: ttOf(solar.peak), type });
  }
  for (
    let lunar = SearchLunarEclipse(MakeTime(from));
    lunar.peak.date <= until;
    lunar = NextLunarEclipse(lunar.peak)
  ) {
    const type = LUNAR_TYPES[lunar.kind];
    if (type) list.push({ kind: 'lunar', peak: lunar.peak.date, peakTt: ttOf(lunar.peak), type });
  }
  return list.sort((a, b) => a.peak.getTime() - b.peak.getTime());
}
