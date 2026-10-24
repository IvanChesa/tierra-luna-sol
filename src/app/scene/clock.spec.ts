import { MAX_DATE, MIN_DATE } from '../ephemeris/time';
import { MAX_SPEED, SimClock } from './clock';

const HOUR = 3_600_000;

describe('SimClock: tiempo de la simulación', () => {
  it('avanza a la velocidad pedida solo mientras reproduce, también hacia atrás', () => {
    const clock = new SimClock(new Date('2026-10-24T00:00:00Z'));
    expect(clock.advance(1000)).toBeNull();
    expect(clock.time.toISOString()).toBe('2026-10-24T00:00:00.000Z'); // en pausa no avanza
    clock.setSpeed(3600); // 1 h/s
    clock.setPlaying(true);
    clock.advance(2000);
    expect(clock.timeMsValue).toBe(Date.parse('2026-10-24T02:00:00Z'));
    clock.setSpeed(-86_400); // 1 día/s hacia atrás
    clock.advance(500);
    expect(clock.timeMsValue).toBe(Date.parse('2026-10-23T14:00:00Z'));
    clock.setSpeed(1); // tiempo real
    clock.advance(1000);
    expect(clock.timeMsValue).toBe(Date.parse('2026-10-23T14:00:01Z'));
  });

  it('se para en 2100 y en 1900 y dice en qué límite', () => {
    const clock = new SimClock(new Date(MAX_DATE.getTime() - HOUR));
    clock.setSpeed(86_400);
    clock.setPlaying(true);
    expect(clock.advance(1000)).toBe('max');
    expect(clock.playing).toBe(false);
    expect(clock.time).toEqual(MAX_DATE);
    // En el límite no arranca hacia delante, pero sí hacia atrás.
    expect(clock.setPlaying(true)).toBe('max');
    expect(clock.playing).toBe(false);
    clock.setSpeed(-1_000_000_000); // se limita a MAX_SPEED (2 años/s): 200 años en 100 s
    expect(clock.setPlaying(true)).toBeNull();
    expect(clock.advance(99_000)).toBeNull();
    expect(clock.advance(2_000)).toBe('min');
    expect(clock.time).toEqual(MIN_DATE);
    expect(clock.setPlaying(true)).toBe('min');
  });

  it('lleva las fechas al rango 1900–2100 y rechaza fechas y velocidades no válidas', () => {
    expect(new SimClock(new Date('1850-01-01T00:00:00Z')).time).toEqual(MIN_DATE);
    const clock = new SimClock(new Date('2026-01-01T00:00:00Z'));
    clock.setTime(new Date('2300-01-01T00:00:00Z'));
    expect(clock.time).toEqual(MAX_DATE);
    expect(() => clock.setTime(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => clock.setSpeed(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    clock.setSpeed(1e12);
    expect(clock.speed).toBe(MAX_SPEED);
    clock.setSpeed(0);
    clock.setPlaying(true);
    expect(clock.advance(1000)).toBeNull();
  });
});
