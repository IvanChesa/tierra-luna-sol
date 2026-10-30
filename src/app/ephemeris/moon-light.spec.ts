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
