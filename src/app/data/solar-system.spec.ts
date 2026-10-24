import { KM_PER_AU } from '../ephemeris/constants';
import { length, sub } from '../ephemeris/vec3';
import { bodyDistances, createSolarSystemModel, offsetFunction } from './solar-system';

describe('solar-system: el modelo de los 30 cuerpos fuera del motor', () => {
  const date = new Date('2026-10-24T00:00:00Z');
  const state = createSolarSystemModel().at(date);

  it('distancias de centro a centro: la Tierra a ~1 UA del Sol y la Luna a ~384.000 km', () => {
    const earth = bodyDistances(state, 'tierra');
    expect((earth.toSunKm as number) / KM_PER_AU).toBeGreaterThan(0.98);
    expect((earth.toSunKm as number) / KM_PER_AU).toBeLessThan(1.02);
    expect(earth.toEarthKm).toBeNull();
    expect(earth.toParentKm).toBeNull();
    const moon = bodyDistances(state, 'luna');
    expect(moon.toParentKm).toBeGreaterThan(356_000);
    expect(moon.toParentKm).toBeLessThan(407_000);
    expect(moon.toEarthKm).toBeCloseTo(moon.toParentKm as number, 3);
    const sun = bodyDistances(state, 'sol');
    expect(sun.toSunKm).toBeNull();
    expect(sun.toEarthKm).toBeCloseTo(earth.toSunKm as number, 3);
  });

  it('Titán: su distancia a Saturno es la de su órbita (~1,22 millones de km)', () => {
    const titan = bodyDistances(state, 'titan');
    expect(titan.toParentKm).toBeGreaterThan(1.18e6);
    expect(titan.toParentKm).toBeLessThan(1.26e6);
  });

  it('offsetFunction da lo mismo que el estado del sistema', () => {
    const offset = offsetFunction('ganimedes')(date);
    expect(length(sub(offset, state.parentOffsetOf('ganimedes'))) * KM_PER_AU).toBeLessThan(1e-3);
    expect(length(offsetFunction('sol')(date))).toBe(0);
  });
});
