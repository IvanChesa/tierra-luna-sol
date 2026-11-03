import type { GeoObserver } from '../../ephemeris/coordinates';
import type { NightSky } from '../../ephemeris/night';
import { skyPlaceOf } from '../../data/sky-place';
import {
  NIGHT_MARGIN_MS,
  STEP_MINUTES,
  sliderNight,
  sliderNightHolds,
  sliderRange,
} from './night-slider';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const place = (id: string): GeoObserver => skyPlaceOf(id);

/** La puesta de una noche (y que es una noche, no el Sol de medianoche). */
function sunsetOf(night: NightSky): number {
  if (night.kind !== 'night') throw new Error(night.kind);
  return night.sunset.getTime();
}

/**
 * Las dos son la misma noche: la misma puesta, salvo la precisión de la búsqueda (unas decenas de ms
 * según desde dónde se busque).
 */
function expectSameNight(actual: NightSky, expected: NightSky, what: string): void {
  expect(Math.abs(sunsetOf(actual) - sunsetOf(expected)), what).toBeLessThan(1000);
}

describe('night-slider: la noche del deslizador del cielo', () => {
  const montsec = place('montsec');
  /**
   * A 67,3° N el 21-12, el día dura 45 minutos («usar mi ubicación» en Laponia): el deslizador no puede
   * empezar media hora antes de la puesta, porque eso es antes de la salida.
   */
  const lapland: GeoObserver = { latDeg: 67.3, lonDeg: 25.73, altitudeM: 0 };
  const cases: readonly [string, GeoObserver, string][] = [
    ['el Montsec en otoño', montsec, '2026-11-01T21:00:00Z'],
    ['el Montsec en la noche más corta', montsec, '2026-06-21T23:00:00Z'],
    ['el Teide en invierno', place('teide'), '2026-12-21T23:00:00Z'],
    ['Laponia, con un día de 45 minutos', lapland, '2026-12-21T15:00:00Z'],
  ];

  for (const [label, where, iso] of cases) {
    it(`${label}: el principio y el final del deslizador dan la misma noche`, () => {
      const time = Date.parse(iso);
      const night = sliderNight(time, where);
      const { start, max } = sliderRange(night, time);
      expect(max % STEP_MINUTES).toBe(0);
      expect(start % (STEP_MINUTES * MINUTE_MS)).toBe(0);
      for (const edge of [start, start + max * MINUTE_MS]) {
        expectSameNight(sliderNight(edge, where), night, new Date(edge).toISOString());
        expect(sliderNightHolds(night, edge)).toBe(true);
      }
    });
  }

  it('la última media hora, después de la salida del Sol, sigue siendo la misma noche', () => {
    const night = sliderNight(Date.parse('2026-11-01T21:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    const sunrise = night.sunrise.getTime();
    const { start, max } = sliderRange(night, sunrise);
    // El final del deslizador, en la media hora que sigue a la salida (antes, el pulgar se iba a 0).
    const end = start + max * MINUTE_MS;
    expect(end).toBeGreaterThanOrEqual(sunrise + NIGHT_MARGIN_MS - STEP_MINUTES * MINUTE_MS);
    expect(end).toBeLessThan(sunrise + NIGHT_MARGIN_MS);
    expectSameNight(sliderNight(sunrise + 29 * MINUTE_MS, montsec), night, 'salida + 29 min');
    // La noche siguiente: su puesta, unas 24 horas después.
    expect(sunsetOf(sliderNight(sunrise + 31 * MINUTE_MS, montsec))).toBeGreaterThan(
      sunsetOf(night) + 20 * HOUR_MS,
    );
  });

  it('reutilizar la noche da lo mismo que recalcularla, también hacia atrás en invierno', () => {
    // El caso de la revisión: de mediodía del 21-12 hacia atrás, a las 06:00 UT del 21 es la noche
    // del 20 al 21 (la caché anterior, que valía desde la puesta menos 12 h, daba la del 21).
    let kept: NightSky | null = null;
    for (let t = Date.parse('2026-12-21T12:00:00Z'); t >= Date.parse('2026-12-20T00:00:00Z');) {
      kept = kept && sliderNightHolds(kept, t) ? kept : sliderNight(t, montsec);
      expectSameNight(kept, sliderNight(t, montsec), new Date(t).toISOString());
      t -= 40 * MINUTE_MS;
    }
    const at6 = sliderNight(Date.parse('2026-12-21T06:00:00Z'), montsec);
    expect(new Date(sunsetOf(at6)).toISOString().slice(0, 10)).toBe('2026-12-20');
  });

  it('sin noche (el Sol de medianoche), doce horas a cada lado del instante, y se recalcula', () => {
    const tromso: GeoObserver = { latDeg: 69.65, lonDeg: 18.96, altitudeM: 0 };
    const time = Date.parse('2026-06-21T12:00:00Z');
    const night = sliderNight(time, tromso);
    expect(night.kind).toBe('midnight-sun');
    const { start, max } = sliderRange(night, time);
    expect(time - start).toBeGreaterThanOrEqual(12 * HOUR_MS);
    expect(time - start).toBeLessThan(12 * HOUR_MS + STEP_MINUTES * MINUTE_MS);
    expect(max).toBe(24 * 60);
    expect(sliderNightHolds(night, time)).toBe(false);
  });
});
