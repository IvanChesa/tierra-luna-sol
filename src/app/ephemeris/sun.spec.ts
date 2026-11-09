import {
  SOLAR_CHANNEL_WAVELENGTHS_NM,
  SOLAR_LIMB_EXPONENTS,
  SunspotSchedule,
  solarCenterColor,
  solarLimbExponent,
  solarLimbIntensity,
  sunspotsAt,
} from './sun';

/**
 * Los exponentes de la ley de potencia que Hestroffer y Magnan (1998, A&A 333, 338) ajustan a los
 * polinomios de Neckel y Labs (1994), tabla 2, columna «NL» (longitud de onda en nm, α): el ajuste de
 * su ec. 5 tiene que quedar a unos ±0,02 de cada uno.
 */
const NECKEL_LABS_EXPONENTS: readonly (readonly [number, number])[] = [
  [443.885, 0.649],
  [457.345, 0.628],
  [477.427, 0.594],
  [492.905, 0.57],
  [519.93, 0.538],
  [541.76, 0.514],
  [559.95, 0.496],
  [579.88, 0.477],
  [610.975, 0.447],
  [640.97, 0.428],
  [669.4, 0.407],
  [700.875, 0.386],
  [1046.6, 0.274],
];

const SCHEDULE: SunspotSchedule = {
  count: 8,
  latitudeDeg: [5, 32],
  lifeDays: [12, 40],
  umbraDeg: [0.5, 1.6],
  fadeIn: 0.2,
  fadeOut: 0.3,
};

describe('el Sol en luz visible (fase 9b, D41)', () => {
  it('el exponente del limbo, el de Hestroffer y Magnan (1998), a ±0,02 de los de Neckel y Labs', () => {
    for (const [wavelength, alpha] of NECKEL_LABS_EXPONENTS) {
      expect(Math.abs(solarLimbExponent(wavelength) - alpha), `${wavelength} nm`).toBeLessThan(
        0.02,
      );
    }
    // Más oscurecimiento en el azul que en el rojo: el borde, dorado.
    const [red, green, blue] = SOLAR_LIMB_EXPONENTS;
    expect(SOLAR_CHANNEL_WAVELENGTHS_NM).toEqual([650, 550, 450]);
    expect(red).toBeCloseTo(-0.023 + 0.292 / 0.65, 12);
    expect(green).toBeCloseTo(0.508, 3);
    expect(blue).toBeCloseTo(0.626, 3);
    expect(red).toBeLessThan(green);
    expect(green).toBeLessThan(blue);
    // Fuera de su intervalo (por debajo de 417 nm cambia de ley, con el límite de Balmer), no vale.
    expect(() => solarLimbExponent(400)).toThrow(RangeError);
    expect(() => solarLimbExponent(3000)).toThrow(RangeError);
  });

  it('la ley de potencia: 1 en el centro, 0 en el limbo, y el borde más rojo que el centro', () => {
    const [red, , blue] = SOLAR_LIMB_EXPONENTS;
    expect(solarLimbIntensity(1, red)).toBe(1);
    expect(solarLimbIntensity(0, red)).toBe(0);
    expect(solarLimbIntensity(2, red)).toBe(1);
    // A μ = 0,1 (el 99,5 % del radio), el rojo conserva el 37 % y el azul el 24 %.
    expect(solarLimbIntensity(0.1, red)).toBeCloseTo(0.1 ** red, 12);
    expect(solarLimbIntensity(0.1, red) / solarLimbIntensity(0.1, blue)).toBeGreaterThan(1.5);
  });

  it('el color del centro da al disco entero el de su temperatura (canal a canal, el flujo de μ^α)', () => {
    const disc: [number, number, number] = [1, 0.86, 0.75];
    const center = solarCenterColor(disc);
    // El flujo de cada canal, ∫ I(1)·μ^α · 2μ dμ, con la regla del trapecio.
    const flux = center.map((c, k) => {
      const alpha = SOLAR_LIMB_EXPONENTS[k] as number;
      let sum = 0;
      const steps = 20_000;
      for (let i = 0; i < steps; i++) {
        const mu = (i + 0.5) / steps;
        sum += c * solarLimbIntensity(mu, alpha) * 2 * mu;
      }
      return sum / steps;
    });
    // La misma cromaticidad que el disco.
    expect((flux[0] as number) / (flux[1] as number)).toBeCloseTo(disc[0] / disc[1], 4);
    expect((flux[2] as number) / (flux[1] as number)).toBeCloseTo(disc[2] / disc[1], 4);
    // La misma luminancia que el color de partida, y algo más azul (el centro está más caliente).
    const luminance = (c: readonly number[]) =>
      0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
    expect(luminance(center)).toBeCloseTo(luminance(disc), 12);
    expect(center[2] / center[0]).toBeGreaterThan(disc[2] / disc[0]);
  });

  it('las manchas ilustrativas: deterministas, en su banda, apareciendo y apagándose sin saltos', () => {
    const t = Date.UTC(2026, 9, 24);
    const spots = sunspotsAt(t, SCHEDULE);
    expect(spots).toHaveLength(SCHEDULE.count);
    expect(sunspotsAt(t, SCHEDULE)).toEqual(spots);
    for (const spot of spots) {
      expect(Math.abs(spot.latitudeDeg)).toBeGreaterThanOrEqual(5);
      expect(Math.abs(spot.latitudeDeg)).toBeLessThanOrEqual(32);
      expect(spot.longitudeDeg).toBeGreaterThanOrEqual(0);
      expect(spot.longitudeDeg).toBeLessThan(360);
      expect(spot.umbraDeg).toBeGreaterThanOrEqual(0.5);
      expect(spot.umbraDeg).toBeLessThanOrEqual(1.6);
      expect(spot.presence).toBeGreaterThanOrEqual(0);
      expect(spot.presence).toBeLessThanOrEqual(1);
    }
    // Hay manchas en los dos hemisferios a lo largo de un año, y en cada instante alguna se ve.
    const year = Array.from({ length: 52 }, (_, w) => sunspotsAt(t + w * 7 * 86_400_000, SCHEDULE));
    expect(year.flat().some((s) => s.latitudeDeg > 0)).toBe(true);
    expect(year.flat().some((s) => s.latitudeDeg < 0)).toBe(true);
    for (const week of year) expect(week.some((s) => s.presence > 0.5)).toBe(true);
    // Cada hora, de 1900 a 2100 en unos días sueltos: lo que se ve (presencia × tamaño) y su sitio
    // cambian poco; cuando una mancha cambia de vida, su presencia es 0.
    for (const start of [Date.UTC(1900, 0, 1), Date.UTC(2050, 5, 1), Date.UTC(2100, 11, 1)]) {
      let previous = sunspotsAt(start, SCHEDULE);
      for (let h = 1; h <= 24 * 60; h++) {
        const current = sunspotsAt(start + h * 3_600_000, SCHEDULE);
        current.forEach((spot, k) => {
          const before = previous[k];
          if (!before) return;
          expect(Math.abs(spot.presence - before.presence)).toBeLessThan(0.05);
          if (spot.presence > 0.01 && before.presence > 0.01) {
            const jump = Math.abs(((spot.longitudeDeg - before.longitudeDeg + 540) % 360) - 180);
            expect(jump).toBeLessThan(0.1);
            expect(spot.latitudeDeg).toBe(before.latitudeDeg);
          }
        });
        previous = current;
      }
    }
  });

  it('las manchas no se mueven: el Sol del explorador no gira (revisión del bloque S, S8)', () => {
    const t = Date.UTC(2026, 9, 24);
    const later = t + 2 * 86_400_000;
    const a = sunspotsAt(t, SCHEDULE);
    const b = sunspotsAt(later, SCHEDULE);
    let same = 0;
    a.forEach((spot, k) => {
      const next = b[k];
      // La misma mancha (la misma vida) en los dos instantes: en el mismo sitio.
      if (!next || spot.latitudeDeg !== next.latitudeDeg) return;
      expect(next.longitudeDeg).toBe(spot.longitudeDeg);
      same++;
    });
    expect(same).toBeGreaterThan(0);
  });
});
