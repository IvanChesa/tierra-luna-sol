import {
  Body,
  Equator,
  Horizon,
  Observer,
  SearchLunarEclipse,
  SearchMoonPhase,
} from 'astronomy-engine';
import { sunApparentGeocentricEcl, sunGeocentricEcl } from './coordinates';
import { moonShadowCenter } from './eclipse';
import { NASA_ECLIPSE_2026_08_12 } from './fixtures/fixtures';
import { angleBetweenDeg } from './vec3';

describe('eclipses: el centro de la sombra de la Luna', () => {
  const eclipse = NASA_ECLIPSE_2026_08_12;
  const greatest = new Date(eclipse.greatestEclipseUt);

  it('en el máximo del eclipse total del 12-08-2026, donde lo pone la NASA (±0,1°; el plan pide ±1°)', () => {
    // Con el Sol aparente (aberración), a unos 3 km del punto de la ficha, que da décimas de grado;
    // sin ella, a 36 km (0,25° de latitud y 0,47° de longitud: revisión de la fase 5).
    const center = moonShadowCenter(greatest);
    expect(center).not.toBeNull();
    expect(Math.abs((center?.latDeg ?? 0) - eclipse.latitudeDeg)).toBeLessThan(0.1);
    expect(Math.abs((center?.lonDeg ?? 0) - eclipse.longitudeDeg)).toBeLessThan(0.1);
  });

  it('desde ese punto, el Sol a la altura de la ficha de la NASA y tapado por la Luna', () => {
    const center = moonShadowCenter(greatest);
    if (!center) throw new Error('Sin sombra');
    const observer = new Observer(center.latDeg, center.lonDeg, 0);
    const sun = Equator(Body.Sun, greatest, observer, true, true);
    const moon = Equator(Body.Moon, greatest, observer, true, true);
    const altitude = Horizon(greatest, observer, sun.ra, sun.dec).altitude;
    expect(Math.abs(altitude - eclipse.sunAltitudeDeg)).toBeLessThan(0.2);
    // La Luna, delante del Sol: sus centros a menos de 6″ (sin la aberración, a unos 20″).
    const cosine =
      (sun.vec.x * moon.vec.x + sun.vec.y * moon.vec.y + sun.vec.z * moon.vec.z) /
      (sun.vec.Length() * moon.vec.Length());
    const separationArcsec = (Math.acos(Math.min(1, cosine)) * 180 * 3600) / Math.PI;
    expect(separationArcsec).toBeLessThan(6);
  });

  it('el Sol aparente está a unos 20,5″ del geométrico (la aberración anual)', () => {
    const arcsec =
      angleBetweenDeg(sunApparentGeocentricEcl(greatest), sunGeocentricEcl(greatest)) * 3600;
    expect(arcsec).toBeGreaterThan(19.5);
    expect(arcsec).toBeLessThan(21.5);
  });

  it('sin eclipse, el eje de la sombra no toca la Tierra', () => {
    // Una semana después de la Luna nueva del eclipse y la Luna nueva de octubre (en 2026, los
    // eclipses de Sol son en febrero y en agosto).
    expect(moonShadowCenter(new Date('2026-08-19T12:00:00Z'))).toBeNull();
    const october = SearchMoonPhase(0, new Date('2026-09-25T00:00:00Z'), 40);
    expect(october?.date.getUTCMonth()).toBe(9);
    expect(moonShadowCenter(october?.date ?? new Date())).toBeNull();
  });

  it('en un eclipse de Luna, la recta Sol–Luna cruza la Tierra por detrás de la Luna: no hay sombra', () => {
    // El primer eclipse de Luna de 2026 (el total del 3 de marzo): la Tierra entre el Sol y la Luna.
    const lunar = SearchLunarEclipse(new Date('2026-01-01T00:00:00Z'));
    expect(lunar.kind).toBe('total');
    expect(lunar.peak.date.toISOString().slice(0, 10)).toBe('2026-03-03');
    expect(moonShadowCenter(lunar.peak.date)).toBeNull();
  });
});
