import { formatClockInZone, isoDateInZone, utcOffsetLabelInZone } from '../../core/format';
import { USNO_RISE_SET_SPAIN } from '../../ephemeris/fixtures/fixtures';
import { nightSky } from '../../ephemeris/night';
import { skyPlaceOf } from '../../data/sky-place';
import {
  clockAt,
  compassName,
  constellationName,
  darkStart,
  daySummary,
  degreesText,
  lookLabel,
  moonNightText,
  nowCell,
  nowSpoken,
  skySummary,
  placeTitle,
  planetNightText,
  skyPositionText,
  twilightTexts,
  zoneText,
} from './sky-text';

/** Minutos entre dos relojes «HH:MM». */
const minutesApart = (a: string, b: string): number => {
  const [ha = 0, ma = 0] = a.split(':').map(Number);
  const [hb = 0, mb = 0] = b.split(':').map(Number);
  return Math.abs(ha * 60 + ma - (hb * 60 + mb));
};

describe('sky-text: las horas en la zona de cada lugar', () => {
  it('en el Teide y el Roque de los Muchachos, la hora canaria; en la Península, la de Madrid', () => {
    const instant = new Date('2026-01-15T12:00:00Z');
    expect(clockAt(instant, skyPlaceOf('teide'))).toBe('12:00');
    expect(clockAt(instant, skyPlaceOf('roque-de-los-muchachos'))).toBe('12:00');
    expect(clockAt(instant, skyPlaceOf('montsec'))).toBe('13:00');
    // Con su horario de verano.
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(clockAt(summer, skyPlaceOf('teide'))).toBe('13:00');
    expect(clockAt(summer, skyPlaceOf('madrid'))).toBe('14:00');
    expect(zoneText(summer, skyPlaceOf('teide'))).toBe('Atlantic/Canary, UTC+1');
    expect(zoneText(instant, skyPlaceOf('teide'))).toBe('Atlantic/Canary, UTC');
    expect(utcOffsetLabelInZone(instant, 'Asia/Kolkata')).toBe('UTC+5:30');
    expect(isoDateInZone(new Date('2026-01-15T23:30:00Z'), 'Europe/Madrid')).toBe('2026-01-16');
    expect(formatClockInZone(new Date(Number.NaN), 'Europe/Madrid')).toBe('—');
  });

  it('las horas de «Esta noche» salen como el reloj del USNO en cada lugar (±2 min)', () => {
    // El criterio de la fase 8: en el Teide, la hora canaria (con el horario de verano en junio).
    for (const series of USNO_RISE_SET_SPAIN.series) {
      const place = skyPlaceOf(series.place);
      // A mediodía local: la noche que empieza esa tarde (su puesta y el fin del civil).
      const noon = new Date(
        Date.parse(`${series.date}T12:00:00Z`) - series.utcOffsetHours * 3_600_000,
      );
      const night = nightSky(noon, place);
      if (night.kind !== 'night') throw new Error(night.kind);
      const label = `${series.place} ${series.date}`;
      expect(
        minutesApart(clockAt(night.sunset, place), series.sun.set.local),
        label,
      ).toBeLessThanOrEqual(2);
      expect(
        minutesApart(clockAt(night.dusk.civil as Date, place), series.sun.civilDusk.local),
        label,
      ).toBeLessThanOrEqual(2);
    }
  });
});

describe('sky-text: los rumbos y las frases', () => {
  it('«Mirar»: con la contracción del artículo («al Sol»)', () => {
    expect(lookLabel('sol')).toBe('Mirar al Sol');
    expect(lookLabel('luna')).toBe('Mirar a la Luna');
    expect(lookLabel('jupiter')).toBe('Mirar a Júpiter');
  });

  it('el lugar con su artículo y el rumbo en palabras', () => {
    expect(placeTitle(skyPlaceOf('teide'))).toBe('El cielo desde el Observatorio del Teide');
    expect(placeTitle(skyPlaceOf('madrid'))).toBe('El cielo desde la Puerta del Sol');
    expect(placeTitle(skyPlaceOf('fraga'))).toBe('El cielo desde Fraga');
    expect(compassName(0)).toBe('norte');
    expect(compassName(135)).toBe('sureste');
    expect(compassName(230)).toBe('suroeste');
    expect(compassName(250)).toBe('oeste');
  });

  it('dónde está un cuerpo: la frase, la celda de la tabla y su lectura', () => {
    expect(skyPositionText('jupiter', 135, 35.4)).toBe(
      'Júpiter, a 35° de altura, hacia el sureste.',
    );
    expect(skyPositionText('luna', 270, -3)).toBe('La Luna está bajo el horizonte.');
    expect(nowCell(135, 35.4)).toBe('35° SE');
    expect(nowCell(225, 10)).toBe('10° SO');
    expect(nowCell(0, -2)).toBe('Bajo el horizonte');
    expect(nowSpoken(270, 61.6)).toBe('62° de altura, hacia el oeste');
  });

  it('«Esta noche» en el Montsec el 1-11-2026: crepúsculos, la Luna y los planetas', () => {
    const place = skyPlaceOf('montsec');
    const night = nightSky(new Date('2026-11-01T12:00:00Z'), place);
    if (night.kind !== 'night') throw new Error(night.kind);
    const lines = twilightTexts(night, place);
    expect(lines[0]).toMatch(/^El Sol se pone a las \d{2}:\d{2} y sale a las \d{2}:\d{2}\.$/);
    expect(lines).toContainEqual(expect.stringMatching(/^Noche cerrada, sin luz del Sol: de /));
    expect(moonNightText(night.moon, place)).toMatch(/^(Sale|Se ve|Ya está|No sale)/);
    const visible = night.planets.filter((planet) => planet.visible);
    expect(visible.length).toBeGreaterThan(0);
    for (const planet of visible) {
      expect(planetNightText(planet, place)).toMatch(
        /: (de \d{2}:\d{2} a \d{2}:\d{2}\. )?Lo más alto, a las \d{2}:\d{2}, hacia el [a-z]+, a \d+°\. Magnitud .+, en [A-Z]/,
      );
    }
    for (const planet of night.planets.filter((p) => !p.visible)) {
      expect(planetNightText(planet, place)).toBeNull();
    }
  });

  it('las constelaciones, en español y con el nombre de la IAU como secundario (D38)', () => {
    expect(constellationName('Gem')).toBe('Géminis (Gemini)');
    expect(constellationName('UMa')).toBe('Osa Mayor (Ursa Major)');
    expect(constellationName('Ori')).toBe('Orión (Orion)');
    // Si coinciden, una vez.
    expect(constellationName('Leo')).toBe('Leo');
    expect(constellationName('Vir')).toBe('Virgo');
    // Un símbolo que no existe, tal cual (no rompe el texto).
    expect(constellationName('Xyz')).toBe('Xyz');
  });
});

describe('daySummary: de día, que es de día y cuándo empieza la noche (crítica de la fase 10)', () => {
  it('la noche cerrada: el final del crepúsculo astronómico, a la hora del lugar', () => {
    const place = skyPlaceOf('montsec');
    const night = nightSky(new Date('2026-11-01T12:00:00Z'), place);
    if (night.kind !== 'night') throw new Error('sin noche');
    expect(darkStart(night)).toEqual(night.dusk.astronomical);
    const at = clockAt(night.dusk.astronomical as Date, place);
    expect(daySummary(night, place)).toEqual({
      text: `De día · noche cerrada a las ${at}`,
      spoken: `Ahora es de día. La noche cerrada empieza a las ${at}.`,
    });
    // Sin noche astronómica (el Sol no baja tanto), el final del náutico o del civil.
    const short = { ...night, dusk: { ...night.dusk, astronomical: null } };
    expect(darkStart(short)).toEqual(night.dusk.nautical);
    const shorter = { ...short, dusk: { ...short.dusk, nautical: null } };
    expect(darkStart(shorter)).toEqual(night.dark.start);
  });
});

describe('skySummary: la línea de resumen del panel del cielo (fase 9c)', () => {
  const body = (
    id: string,
    name: string,
    altitude: number,
    compass: string,
    spokenCompass: string,
  ) => ({
    id,
    name,
    up: altitude > -0.5,
    altitudeDeg: altitude,
    now: altitude > -0.5 ? `${altitude}° ${compass}` : 'Bajo el horizonte',
    nowSpoken:
      altitude > -0.5 ? `${altitude}° de altura, hacia el ${spokenCompass}` : 'Bajo el horizonte',
  });

  it('la Luna y los planetas sobre el horizonte, los más altos primero, sin el Sol', () => {
    const summary = skySummary([
      body('sol', 'Sol', 20, 'S', 'sur'),
      body('luna', 'Luna', 12, 'E', 'este'),
      body('saturno', 'Saturno', 37, 'SE', 'sureste'),
      body('marte', 'Marte', -10, 'O', 'oeste'),
    ]);
    expect(summary.text).toBe('Ahora: Saturno, 37° SE · Luna, 12° E');
    expect(summary.spoken).toBe(
      'Sobre el horizonte, ahora: Saturno, a 37° de altura, hacia el sureste; Luna, a 12° de altura, hacia el este.',
    );
  });

  it('como mucho tres; el resto, en «Esta noche»', () => {
    const summary = skySummary([
      body('luna', 'Luna', 50, 'S', 'sur'),
      body('jupiter', 'Júpiter', 40, 'E', 'este'),
      body('saturno', 'Saturno', 30, 'SE', 'sureste'),
      body('venus', 'Venus', 10, 'O', 'oeste'),
      body('marte', 'Marte', 5, 'NE', 'noreste'),
    ]);
    expect(summary.text).toBe('Ahora: Luna, 50° S · Júpiter, 40° E · Saturno, 30° SE · y 2 más');
    expect(summary.spoken.endsWith('Y 2 más en «Esta noche».')).toBe(true);
  });

  it('ordena por la altura, no por el texto: con «0°» (antes «−0°», que no se ordenaba)', () => {
    const summary = skySummary([
      {
        ...body('venus', 'Venus', 0, 'O', 'oeste'),
        altitudeDeg: -0.3,
        now: `${degreesText(-0.3)} O`,
      },
      body('luna', 'Luna', 3, 'E', 'este'),
      { ...body('marte', 'Marte', 0, 'SO', 'suroeste'), altitudeDeg: 0.4 },
    ]);
    expect(summary.text).toBe('Ahora: Luna, 3° E · Marte, 0° SO · Venus, 0° O');
    expect(degreesText(-0.3)).toBe('0°');
    expect(degreesText(-12.6)).toBe('−13°');
  });

  it('sin nada sobre el horizonte, lo dice', () => {
    expect(skySummary([body('luna', 'Luna', -3, 'N', 'norte')]).text).toBe(
      'Ni la Luna ni ningún planeta están ahora sobre el horizonte.',
    );
  });
});
