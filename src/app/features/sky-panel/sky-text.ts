/**
 * Los textos de la vista del cielo (fase 8; ESTILO §1, §3 y §4): el lugar, las horas en su zona, los
 * rumbos y las frases de «Esta noche» («hacia dónde mirar»). Funciones puras, con tests. Las horas van
 * en la hora local del lugar (con su zona) y los grados de altura, pegados a la cifra (35°).
 */
import { formatClockInZone, formatNumber, utcOffsetLabelInZone } from '../../core/format';
import { CONSTELLATION_NAMES } from '../../data/constellations';
import type { MoonPhaseInfo } from '../../ephemeris/ephemeris';
import type { NightBody, NightSky } from '../../ephemeris/night';
import { CompassPoint, NAKED_EYE_MAGNITUDE, SkyBodyId, compassPoint } from '../../ephemeris/sky';
import type { SkyPlace } from '../../data/sky-place';

export const BODY_NAMES: Readonly<Record<SkyBodyId, string>> = {
  sol: 'Sol',
  luna: 'Luna',
  mercurio: 'Mercurio',
  venus: 'Venus',
  marte: 'Marte',
  jupiter: 'Júpiter',
  saturno: 'Saturno',
  urano: 'Urano',
  neptuno: 'Neptuno',
};

const COMPASS_NAMES: Readonly<Record<CompassPoint, string>> = {
  n: 'norte',
  ne: 'noreste',
  e: 'este',
  se: 'sureste',
  s: 'sur',
  sw: 'suroeste',
  w: 'oeste',
  nw: 'noroeste',
};

/** «N», «NE», «SO»… (los de los puntos cardinales del cielo). */
const COMPASS_SHORT: Readonly<Record<CompassPoint, string>> = {
  n: 'N',
  ne: 'NE',
  e: 'E',
  se: 'SE',
  s: 'S',
  sw: 'SO',
  w: 'O',
  nw: 'NO',
};

/** Cada lugar con su artículo, para «desde el Observatorio del Teide» o «desde Fraga». */
const FROM_PLACE: Readonly<Record<string, string>> = {
  montsec: 'el Parque Astronómico del Montsec',
  'observatori-fabra': 'el Observatori Fabra',
  'roque-de-los-muchachos': 'el Observatorio del Roque de los Muchachos',
  teide: 'el Observatorio del Teide',
  'calar-alto': 'el Observatorio de Calar Alto',
  madrid: 'la Puerta del Sol',
  fraga: 'Fraga',
  user: 'tu ubicación',
};

/** «el Observatorio del Teide» (con su artículo). */
export const placePhrase = (place: SkyPlace): string => FROM_PLACE[place.id] ?? place.name;

/** «El cielo desde el Observatorio del Teide». */
export const placeTitle = (place: SkyPlace): string => `El cielo desde ${placePhrase(place)}`;

/** «noreste». */
export const compassName = (azimuthDeg: number): string => COMPASS_NAMES[compassPoint(azimuthDeg)];

/** «NE». */
export const compassShort = (azimuthDeg: number): string => COMPASS_SHORT[compassPoint(azimuthDeg)];

/** «35°» (grados enteros, pegados a la cifra). */
export const degreesText = (deg: number): string => `${formatNumber(Math.round(deg), 0)}°`;

/** «22:40», en la hora del lugar. */
export const clockAt = (date: Date, place: SkyPlace): string =>
  formatClockInZone(date, place.timeZone);

/** «Europe/Madrid, UTC+1»: la zona del lugar en ese instante (ESTILO §4). */
export const zoneText = (date: Date, place: SkyPlace): string =>
  `${place.timeZone}, ${utcOffsetLabelInZone(date, place.timeZone)}`;

/** La constelación por su símbolo de la IAU («Gemini»). */
export const constellationName = (symbol: string): string => CONSTELLATION_NAMES[symbol] ?? symbol;

/** «Júpiter, a 35° de altura, hacia el sureste.» o «Júpiter está bajo el horizonte.» */
export function skyPositionText(id: SkyBodyId, azimuthDeg: number, altitudeDeg: number): string {
  const name = id === 'sol' ? 'El Sol' : id === 'luna' ? 'La Luna' : BODY_NAMES[id];
  if (altitudeDeg <= -0.5) return `${name} está bajo el horizonte.`;
  return `${name}, a ${degreesText(altitudeDeg)} de altura, hacia el ${compassName(azimuthDeg)}.`;
}

/** El botón «Mirar» de la tabla: «Mirar al Sol», «Mirar a la Luna», «Mirar a Saturno». */
export function lookLabel(id: SkyBodyId): string {
  if (id === 'sol') return 'Mirar al Sol';
  if (id === 'luna') return 'Mirar a la Luna';
  return `Mirar a ${BODY_NAMES[id]}`;
}

/** «35° SE» (la celda «Ahora» de la tabla) o «Bajo el horizonte». */
export function nowCell(azimuthDeg: number, altitudeDeg: number): string {
  if (altitudeDeg <= -0.5) return 'Bajo el horizonte';
  return `${degreesText(altitudeDeg)} ${compassShort(azimuthDeg)}`;
}

/** La celda «Ahora» para el lector de pantalla: «35° de altura, hacia el sureste». */
export function nowSpoken(azimuthDeg: number, altitudeDeg: number): string {
  if (altitudeDeg <= -0.5) return 'Bajo el horizonte';
  return `${degreesText(altitudeDeg)} de altura, hacia el ${compassName(azimuthDeg)}`;
}

/** Espacio duro entre la cifra y el símbolo (ESTILO §3). */
const NBSP = String.fromCharCode(0xa0);

/** «Gibosa creciente, 87 % iluminada». */
export function moonPhaseText(phase: MoonPhaseInfo): string {
  const percent = formatNumber(Math.round(phase.illuminatedFraction * 100), 0);
  return `${phase.name}, ${percent}${NBSP}% iluminada`;
}

/**
 * Lo que hace la Luna esta noche: «Sale a las 21:40.», «Se pone a las 03:12.», «Se ve toda la noche.»,
 * «Sale a las 23:05 y se pone a las 11:20.» o «No sale esta noche.».
 */
export function moonNightText(moon: NightBody, place: SkyPlace): string {
  const rise = moon.rise ? clockAt(moon.rise, place) : null;
  const set = moon.set ? clockAt(moon.set, place) : null;
  if (moon.upAtSunset) {
    return set
      ? `Ya está en el cielo al anochecer y se pone a las ${set}.`
      : 'Se ve toda la noche.';
  }
  if (rise && set && moon.set && moon.rise && moon.set > moon.rise)
    return `Sale a las ${rise} y se pone a las ${set}.`;
  if (rise) return `Sale a las ${rise}.`;
  return 'No sale esta noche.';
}

/** Las frases de los crepúsculos de la noche (ESTILO §4: la hora del lugar). */
export function twilightTexts(
  night: Extract<NightSky, { kind: 'night' }>,
  place: SkyPlace,
): string[] {
  const at = (date: Date | null) => (date ? clockAt(date, place) : null);
  const lines = [`El Sol se pone a las ${at(night.sunset)} y sale a las ${at(night.sunrise)}.`];
  const civil = at(night.dusk.civil);
  if (civil) lines.push(`Anochece (termina el crepúsculo civil) a las ${civil}.`);
  const dark = at(night.dusk.astronomical);
  const dawn = at(night.dawn.astronomical);
  if (dark && dawn) lines.push(`Noche cerrada, sin luz del Sol: de ${dark} a ${dawn}.`);
  else lines.push('No llega a ser noche cerrada: el Sol no baja de 18° bajo el horizonte.');
  return lines;
}

/**
 * «Hacia dónde mirar» un planeta: «Júpiter: de 20:15 a 06:30. Lo más alto, a las 01:10, hacia el sur,
 * a 62°. Magnitud −2,4, en Gemini.». Si no se ve de noche, `null`.
 */
export function planetNightText(body: NightBody, place: SkyPlace): string | null {
  if (!body.visible) return null;
  const name = BODY_NAMES[body.id];
  const parts: string[] = [];
  if (body.window) {
    parts.push(
      `${name}: de ${clockAt(body.window.from, place)} a ${clockAt(body.window.to, place)}.`,
    );
  } else {
    parts.push(`${name}:`);
  }
  parts.push(
    `Lo más alto, a las ${clockAt(body.best.time, place)}, hacia el ${compassName(body.best.azimuthDeg)}, a ${degreesText(body.best.altitudeDeg)}.`,
  );
  const magnitude = formatNumber(body.magnitude, 1, true);
  const eye =
    body.magnitude <= NAKED_EYE_MAGNITUDE - 0.5
      ? ''
      : body.magnitude <= NAKED_EYE_MAGNITUDE
        ? ' Solo a simple vista con un cielo muy oscuro.'
        : ' Con prismáticos o telescopio.';
  parts.push(`Magnitud ${magnitude}, en ${constellationName(body.constellation)}.${eye}`);
  return parts.join(' ');
}
