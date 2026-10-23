import { planetHeliocentric } from './ephemeris';
import { OrbitCache, OrbitRequest, sampleOrbit } from './orbits';
import { MAX_DATE, MIN_DATE } from './time';
import { Vec3, angleBetweenDeg, length, vec3 } from './vec3';

/** Órbita circular de juguete: una vuelta cada `period` días. */
const circle =
  (period: number) =>
  (date: Date): Vec3 => {
    const angle = (2 * Math.PI * date.getTime()) / (period * 86_400_000);
    return vec3(Math.cos(angle), Math.sin(angle), 0);
  };

const point = (points: Float64Array, k: number) =>
  vec3(points[3 * k] ?? NaN, points[3 * k + 1] ?? NaN, points[3 * k + 2] ?? NaN);

describe('orbits: muestreo', () => {
  it('da una vuelta completa en puntos equiespaciados, sin repetir el primero', () => {
    const points = sampleOrbit(circle(10), new Date(0), 10, 8);
    expect(points).toHaveLength(24);
    for (let k = 1; k < 8; k++) {
      expect(angleBetweenDeg(point(points, k - 1), point(points, k))).toBeCloseTo(45, 6);
    }
    expect(angleBetweenDeg(point(points, 7), point(points, 0))).toBeCloseTo(45, 6);
  });

  it('la órbita de Marte pasa por Marte y cierra tras un periodo sidéreo', () => {
    const date = new Date('2026-10-23T00:00:00Z');
    const position = (d: Date) => planetHeliocentric('marte', d);
    const points = sampleOrbit(position, date, 686.98, 360);
    expect(angleBetweenDeg(point(points, 0), position(date))).toBe(0);
    const afterOnePeriod = position(new Date(date.getTime() + 686.98 * 86_400_000));
    expect(angleBetweenDeg(afterOnePeriod, point(points, 0))).toBeLessThan(0.1);
  });

  it('rechaza periodos o segmentos no válidos', () => {
    expect(() => sampleOrbit(circle(1), new Date(0), 0, 10)).toThrow(RangeError);
    expect(() => sampleOrbit(circle(1), new Date(0), 1, 2)).toThrow(RangeError);
    expect(() => sampleOrbit(circle(1), new Date(0), 1, 10.5)).toThrow(RangeError);
  });
});

describe('orbits: caché', () => {
  const request = (overrides: Partial<OrbitRequest> = {}): OrbitRequest => ({
    id: 'prueba',
    date: new Date('2026-10-23T00:00:00Z'),
    periodDays: 10,
    segments: 16,
    validityDays: 30,
    position: circle(10),
    ...overrides,
  });

  it('reutiliza la órbita dentro del mismo tramo y la recalcula en otro', () => {
    const cache = new OrbitCache();
    const calls = { count: 0 };
    const position = (date: Date) => {
      calls.count++;
      return circle(10)(date);
    };
    const first = cache.get(request({ position }));
    const second = cache.get(request({ position, date: new Date('2026-10-24T00:00:00Z') }));
    expect(second).toBe(first);
    expect(calls.count).toBe(16);
    const other = cache.get(request({ position, date: new Date('2027-10-24T00:00:00Z') }));
    expect(other).not.toBe(first);
    expect(calls.count).toBe(32);
    expect(cache.size).toBe(2);
  });

  it('distingue cuerpos y resoluciones', () => {
    const cache = new OrbitCache();
    const a = cache.get(request());
    expect(cache.get(request({ id: 'otra' }))).not.toBe(a);
    expect(cache.get(request({ segments: 32 }))).not.toBe(a);
  });

  it('descarta la entrada usada hace más tiempo al llenarse (LRU)', () => {
    const cache = new OrbitCache(2);
    const a = cache.get(request({ id: 'a' }));
    cache.get(request({ id: 'b' }));
    expect(cache.get(request({ id: 'a' }))).toBe(a); // «a» pasa a ser la más reciente
    cache.get(request({ id: 'c' })); // sale «b»
    expect(cache.size).toBe(2);
    expect(cache.get(request({ id: 'a' }))).toBe(a);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('mantiene la vuelta muestreada dentro de 1900–2100', () => {
    const cache = new OrbitCache();
    const seen: number[] = [];
    const position = (date: Date) => {
      seen.push(date.getTime());
      return vec3(1, 0, 0);
    };
    cache.get(request({ position, date: MIN_DATE, periodDays: 60_190, validityDays: 15_000 }));
    cache.get(
      request({ id: 'b', position, date: MAX_DATE, periodDays: 60_190, validityDays: 15_000 }),
    );
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(MIN_DATE.getTime());
    expect(Math.max(...seen)).toBeLessThanOrEqual(MAX_DATE.getTime());
    expect(length(vec3(1, 0, 0))).toBe(1);
  });

  it('rechaza una validez no positiva', () => {
    expect(() => new OrbitCache().get(request({ validityDays: 0 }))).toThrow(RangeError);
  });
});
