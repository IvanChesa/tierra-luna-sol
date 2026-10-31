import { MIN_DATE } from './constants';
import { USNO_MOON_PHASES } from './fixtures/fixtures';
import {
  moonSubsolarPoint,
  moonSunElevationDeg,
  nearestMoonPhase,
  nearestMoonSunElevation,
} from './moon-light';

/** Las fases de 2026 del USNO (fixture de la fase 1). */
const PHASES_2026 = USNO_MOON_PHASES.series.find((series) => series.year === 2026)?.phases ?? [];

describe('la luz sobre la Luna (fase 6)', () => {
  it('el punto subsolar en las fases del USNO: llena en la cara visible, nueva en la oculta y cuartos a 90°', () => {
    expect(PHASES_2026.length).toBeGreaterThan(40);
    for (const [phase, iso] of PHASES_2026) {
      const { latDeg, lonDeg } = moonSubsolarPoint(new Date(iso));
      // El Sol, visto desde la Luna, no se aparta más de 1,6° de su ecuador.
      expect(Math.abs(latDeg), iso).toBeLessThan(1.6);
      const expected = {
        'New Moon': 180,
        'First Quarter': 90,
        'Full Moon': 0,
        'Last Quarter': -90,
      }[phase];
      if (expected === undefined) throw new Error(`Fase desconocida: ${phase}`);
      // La libración lo aparta hasta unos 8° del valor medio.
      const difference = Math.abs(((lonDeg - expected + 540) % 360) - 180);
      expect(difference, `${phase} ${iso}: ${lonDeg.toFixed(1)}°`).toBeLessThan(10);
    }
  });

  it('la fase más cercana es la del USNO (al minuto), hacia delante o hacia atrás', () => {
    const iso = (name: string, from: string) =>
      PHASES_2026.find(([phase, at]) => phase === name && at >= from)?.[1] ?? '';
    const full = iso('Full Moon', '2026-11-01');
    const newMoon = iso('New Moon', '2026-11-01');
    // Desde el 20-11: la llena del 24 (adelante) y la nueva del 9 (atrás, más cerca que la de diciembre).
    const from = new Date('2026-11-20T00:00:00Z');
    expect(Math.abs(nearestMoonPhase(from, 180).getTime() - Date.parse(full))).toBeLessThan(90_000);
    expect(Math.abs(nearestMoonPhase(from, 0).getTime() - Date.parse(newMoon))).toBeLessThan(
      90_000,
    );
    // Junto a 1900: sin fases antes del límite, la siguiente.
    expect(nearestMoonPhase(MIN_DATE, 180).getTime()).toBeGreaterThanOrEqual(MIN_DATE.getTime());
  });

  it('justo antes y justo después de cada fase de 2026 del USNO, esa fase, aunque la lunación anterior sea corta (revisión de la fase 6)', () => {
    const PHASE_DEG: Readonly<Record<string, number>> = {
      'New Moon': 0,
      'First Quarter': 90,
      'Full Moon': 180,
      'Last Quarter': 270,
    };
    const HOUR = 3_600_000;
    for (const [phase, iso] of PHASES_2026) {
      const deg = PHASE_DEG[phase];
      if (deg === undefined) throw new Error(`Fase desconocida: ${phase}`);
      const at = Date.parse(iso);
      for (const offset of [-12 * HOUR, -HOUR, 180_000, HOUR, 6 * HOUR, 12 * HOUR]) {
        const found = nearestMoonPhase(new Date(at + offset), deg).getTime();
        expect(Math.abs(found - at), `${phase} ${iso} ${offset / HOUR} h`).toBeLessThan(90_000);
      }
    }
  });

  it('una hora después de la llena del 26-10-2026, la misma llena; y pulsar dos veces no salta de mes', () => {
    const full = PHASES_2026.find(
      ([phase, at]) => phase === 'Full Moon' && at.startsWith('2026-10-26'),
    );
    if (!full) throw new Error('Falta la llena del 26-10-2026 en el fixture del USNO');
    const at = Date.parse(full[1]);
    const once = nearestMoonPhase(new Date(at + 3_600_000), 180);
    expect(Math.abs(once.getTime() - at)).toBeLessThan(90_000);
    const twice = nearestMoonPhase(once, 180);
    expect(Math.abs(twice.getTime() - once.getTime())).toBeLessThan(1000);
    // La cara oculta (luna nueva) desde el 14-10-2026, dos veces: la nueva del 10-10 las dos.
    const newMoon = nearestMoonPhase(new Date('2026-10-14T00:00:00Z'), 0);
    expect(newMoon.toISOString().slice(0, 10)).toBe('2026-10-10');
    expect(nearestMoonPhase(newMoon, 0).toISOString().slice(0, 10)).toBe('2026-10-10');
  });

  it('la mañana lunar más cercana con el Sol a la altura pedida, en un lugar con nombre', () => {
    // Copérnico (9,621° N, 20,079° O; Gazetteer, IAU/USGS), con el Sol a 20° subiendo.
    const date = new Date('2026-11-20T00:00:00Z');
    const found = nearestMoonSunElevation(9.621, -20.079, 20, date);
    expect(found).not.toBeNull();
    const at = found ?? date;
    expect(moonSunElevationDeg(9.621, -20.079, at)).toBeCloseTo(20, 2);
    // Subiendo: una hora después, más alto.
    expect(moonSunElevationDeg(9.621, -20.079, new Date(at.getTime() + 3_600_000))).toBeGreaterThan(
      20,
    );
    // A menos de medio mes sinódico.
    expect(Math.abs(at.getTime() - date.getTime())).toBeLessThan(15 * 86_400_000);
    // Junto al polo sur (Shackleton, 89,67° S), el Sol no sube nunca a 20°.
    expect(nearestMoonSunElevation(-89.67, 129.78, 20, date)).toBeNull();
    // Junto a 1900, el resultado no se sale del intervalo.
    const early = nearestMoonSunElevation(0, 0, 10, MIN_DATE);
    expect(early?.getTime() ?? Infinity).toBeGreaterThanOrEqual(MIN_DATE.getTime());
  });
});
