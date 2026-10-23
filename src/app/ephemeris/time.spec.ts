import { moonGeocentric, moonPhase, planetHeliocentric } from './ephemeris';
import {
  MAX_DATE,
  MIN_DATE,
  clampToSupportedRange,
  daysSinceJ2000,
  fromDaysSinceJ2000,
  isSupportedDate,
  toAstroTime,
} from './time';
import { length } from './vec3';

describe('time: rango 1900–2100', () => {
  it('admite los extremos exactos y rechaza un segundo fuera', () => {
    expect(isSupportedDate(MIN_DATE)).toBe(true);
    expect(isSupportedDate(MAX_DATE)).toBe(true);
    expect(isSupportedDate(new Date(MIN_DATE.getTime() - 1000))).toBe(false);
    expect(isSupportedDate(new Date(MAX_DATE.getTime() + 1000))).toBe(false);
    expect(MIN_DATE.toISOString()).toBe('1900-01-01T00:00:00.000Z');
    expect(MAX_DATE.toISOString()).toBe('2100-12-31T23:59:59.000Z');
  });

  it('las efemérides funcionan en los extremos y dan valores finitos', () => {
    for (const date of [MIN_DATE, MAX_DATE]) {
      expect(Number.isFinite(length(planetHeliocentric('neptuno', date)))).toBe(true);
      expect(Number.isFinite(length(moonGeocentric(date)))).toBe(true);
      expect(Number.isFinite(moonPhase(date).angleDeg)).toBe(true);
    }
  });

  it('falla con fechas fuera de rango o inválidas en vez de inventar posiciones', () => {
    expect(() => toAstroTime(new Date('1899-12-31T23:59:59Z'))).toThrow(RangeError);
    expect(() => toAstroTime(new Date('2101-01-01T00:00:00Z'))).toThrow(RangeError);
    expect(() => planetHeliocentric('marte', new Date('no es una fecha'))).toThrow(RangeError);
  });

  it('acota una fecha al rango y rechaza las inválidas', () => {
    expect(clampToSupportedRange(new Date('1800-06-01T00:00:00Z'))).toEqual(MIN_DATE);
    expect(clampToSupportedRange(new Date('2200-06-01T00:00:00Z'))).toEqual(MAX_DATE);
    const inside = new Date('2026-10-23T12:00:00Z');
    expect(clampToSupportedRange(inside)).toEqual(inside);
    expect(() => clampToSupportedRange(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('time: días J2000', () => {
  it('J2000 es 2000-01-01 12:00 UT y la conversión es reversible', () => {
    expect(daysSinceJ2000(new Date('2000-01-01T12:00:00Z'))).toBe(0);
    expect(daysSinceJ2000(new Date('2000-01-02T12:00:00Z'))).toBe(1);
    const date = new Date('2030-06-15T00:00:00Z');
    expect(fromDaysSinceJ2000(daysSinceJ2000(date))).toEqual(date);
    // astronomy-engine usa la misma escala para `ut`.
    expect(toAstroTime(date).ut).toBeCloseTo(daysSinceJ2000(date), 9);
  });
});
