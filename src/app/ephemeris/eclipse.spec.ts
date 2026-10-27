import { Body, Equator, Horizon, Observer, SearchMoonPhase } from 'astronomy-engine';
import { moonShadowCenter } from './eclipse';
import { NASA_ECLIPSE_2026_08_12 } from './fixtures/fixtures';

describe('eclipses: el centro de la sombra de la Luna', () => {
  const eclipse = NASA_ECLIPSE_2026_08_12;
  const greatest = new Date(eclipse.greatestEclipseUt);

  it('en el máximo del eclipse total del 12-08-2026, donde lo pone la NASA (±1°)', () => {
    const center = moonShadowCenter(greatest);
    expect(center).not.toBeNull();
    expect(Math.abs((center?.latDeg ?? 0) - eclipse.latitudeDeg)).toBeLessThan(1);
    expect(Math.abs((center?.lonDeg ?? 0) - eclipse.longitudeDeg)).toBeLessThan(1);
  });

  it('desde ese punto, el Sol a la altura de la ficha de la NASA (25,8°) y tapado por la Luna', () => {
    const center = moonShadowCenter(greatest);
    if (!center) throw new Error('Sin sombra');
    const observer = new Observer(center.latDeg, center.lonDeg, 0);
    const sun = Equator(Body.Sun, greatest, observer, true, true);
    const moon = Equator(Body.Moon, greatest, observer, true, true);
    expect(Math.abs(Horizon(greatest, observer, sun.ra, sun.dec).altitude - 25.8)).toBeLessThan(1);
    // La Luna, delante del Sol: sus centros a menos de un minuto de arco.
    const cosine =
      (sun.vec.x * moon.vec.x + sun.vec.y * moon.vec.y + sun.vec.z * moon.vec.z) /
      (sun.vec.Length() * moon.vec.Length());
    const separationDeg = (Math.acos(Math.min(1, cosine)) * 180) / Math.PI;
    expect(separationDeg).toBeLessThan(1 / 60);
  });

  it('sin eclipse, el eje de la sombra no toca la Tierra', () => {
    // Una semana después de la Luna nueva del eclipse y la Luna nueva de octubre (en 2026, los
    // eclipses de Sol son en febrero y en agosto).
    expect(moonShadowCenter(new Date('2026-08-19T12:00:00Z'))).toBeNull();
    const october = SearchMoonPhase(0, new Date('2026-09-25T00:00:00Z'), 40);
    expect(october?.date.getUTCMonth()).toBe(9);
    expect(moonShadowCenter(october?.date ?? new Date())).toBeNull();
  });
});
