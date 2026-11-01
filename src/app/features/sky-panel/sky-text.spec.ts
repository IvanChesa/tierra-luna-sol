import { formatClockInZone, isoDateInZone, utcOffsetLabelInZone } from '../../core/format';
import { USNO_RISE_SET_SPAIN } from '../../ephemeris/fixtures/fixtures';
import { nightSky } from '../../ephemeris/night';
import { skyPlaceOf } from '../../data/sky-place';
import {
  clockAt,
  compassName,
  moonNightText,
  nowCell,
  nowSpoken,
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
});
