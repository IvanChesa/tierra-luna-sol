import {
  Body,
  Equator,
  Horizon,
  Observer,
  SearchLunarEclipse,
  SearchMoonPhase,
} from 'astronomy-engine';
import { KM_PER_AU } from './constants';
import { sunApparentGeocentricEcl, sunGeocentricEcl } from './coordinates';
import { earthShadow, moonShadowCenter, satelliteShadowPoint } from './eclipse';
import { planetHeliocentric } from './ephemeris';
import { GalileanId } from './ids';
import { galileanMoons } from './moons';
import { NASA_ECLIPSE_2026_08_12, NASA_LUNAR_ECLIPSES } from './fixtures/fixtures';
import { angleBetweenDeg, dot, length, scale, sub } from './vec3';

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

describe('eclipse: la sombra de la Tierra sobre la Luna frente al catálogo de la NASA (fase 6)', () => {
  /** El mínimo de una función en [from, to] (ms), por sección áurea (unimodal cerca del máximo). */
  const minimize = (f: (ms: number) => number, from: number, to: number): number => {
    const golden = (Math.sqrt(5) - 1) / 2;
    let a = from;
    let b = to;
    while (b - a > 100) {
      const c = b - golden * (b - a);
      const d = a + golden * (b - a);
      if (f(c) < f(d)) b = d;
      else a = c;
    }
    return (a + b) / 2;
  };
  /** Dónde una función creciente o decreciente cruza `target` entre dos instantes (bisección). */
  const crossing = (
    f: (ms: number) => number,
    target: number,
    from: number,
    to: number,
  ): number => {
    let a = from;
    let b = to;
    const sign = Math.sign(f(a) - target);
    while (b - a > 100) {
      const middle = (a + b) / 2;
      if (Math.sign(f(middle) - target) === sign) a = middle;
      else b = middle;
    }
    return (a + b) / 2;
  };
  const at = (ms: number) => earthShadow(new Date(ms));

  it.each(NASA_LUNAR_ECLIPSES.eclipses.map((e) => [e.greatestEclipseTd, e] as const))(
    'el eclipse de %s: el máximo, gamma, las magnitudes y la duración de sus fases',
    (_, nasa) => {
      // El catálogo da el máximo en TD; la escena, en UTC: UT = TD − ΔT (el ΔT de la NASA).
      const nasaUt = Date.parse(nasa.greatestEclipseTd) - nasa.deltaTSeconds * 1000;
      const greatest = minimize((ms) => at(ms).axisDeg, nasaUt - 3_600_000, nasaUt + 3_600_000);
      // Con un ΔT algo distinto (el de astronomy-engine), unos segundos.
      expect(Math.abs(greatest - nasaUt) / 1000).toBeLessThan(60);
      const shadow = at(greatest);
      expect(shadow.gamma).toBeCloseTo(nasa.gamma, 2);
      expect(Math.abs(shadow.gamma - nasa.gamma)).toBeLessThan(0.003);
      expect(Math.abs(shadow.umbralMagnitude - nasa.umbralMagnitude)).toBeLessThan(0.004);
      expect(Math.abs(shadow.penumbralMagnitude - nasa.penumbralMagnitude)).toBeLessThan(0.004);
      // Las fases: de cuando la magnitud penumbral, la umbral (parcial) o la umbral = 1 (total)
      // empiezan a cuando acaban.
      const phase = (magnitude: (s: ReturnType<typeof at>) => number, level: number) => {
        const f = (ms: number) => magnitude(at(ms));
        const start = crossing(f, level, greatest - 6 * 3_600_000, greatest);
        const end = crossing(f, level, greatest, greatest + 6 * 3_600_000);
        return (end - start) / 60_000;
      };
      const minutes = [
        [phase((s) => s.penumbralMagnitude, 0), nasa.penumbralMinutes],
        [phase((s) => s.umbralMagnitude, 0), nasa.partialMinutes],
        [nasa.totalMinutes === null ? null : phase((s) => s.umbralMagnitude, 1), nasa.totalMinutes],
      ] as const;
      for (const [ours, theirs] of minutes) {
        if (theirs === null) continue;
        expect(Math.abs((ours ?? 0) - theirs), `${ours} frente a ${theirs} min`).toBeLessThan(0.6);
      }
    },
  );

  it('los radios de la sombra del 3-3-2026, los de la ficha de la NASA (regla de Danjon)', () => {
    // Ficha del eclipse (F. Espenak, NASA/GSFC; https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/
    // LE2026Mar03T.pdf, una imagen): radio de la umbra 0,6983°, de la penumbra 1,2361° y eje 0,3596°
    // en el máximo (11:33:37,0 UT).
    const shadow = earthShadow(new Date('2026-03-03T11:33:37Z'));
    expect(Math.abs(shadow.umbraDeg - 0.6983)).toBeLessThan(0.0005);
    expect(Math.abs(shadow.penumbraDeg - 1.2361)).toBeLessThan(0.0005);
    expect(Math.abs(shadow.axisDeg - 0.3596)).toBeLessThan(0.002);
    // Fuera de un eclipse, la Luna lejos de la sombra: magnitudes negativas.
    const later = earthShadow(new Date('2026-03-10T11:33:37Z'));
    expect(later.penumbralMagnitude).toBeLessThan(0);
    expect(later.umbralMagnitude).toBeLessThan(0);
  });
});

describe('sombras de las galileanas sobre Júpiter frente al Hubble (fase 7)', () => {
  /** Radio ecuatorial de Júpiter (km), de la ficha de la NASA (https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html). */
  const JUPITER_EQUATORIAL_KM = 71_492;
  /** Velocidad de la luz (km/s), exacta por definición del metro. */
  const LIGHT_KM_S = 299_792.458;

  /**
   * Las galileanas cuya sombra se ve sobre Júpiter desde la Tierra a una hora de observación: la
   * geometría es la de un tiempo de luz antes (cuando salió de Júpiter la luz que llega), y la sombra
   * se ve si cae en el hemisferio que mira a la Tierra.
   */
  function visibleShadows(iso: string): GalileanId[] {
    const observed = new Date(iso);
    const earth = planetHeliocentric('tierra', observed);
    let emitted = observed;
    for (let k = 0; k < 3; k++) {
      const distanceKm = length(sub(planetHeliocentric('jupiter', emitted), earth)) * KM_PER_AU;
      emitted = new Date(observed.getTime() - (distanceKm / LIGHT_KM_S) * 1000);
    }
    const jupiter = planetHeliocentric('jupiter', emitted);
    const earthFromJupiter = sub(earth, jupiter);
    const moons = galileanMoons(emitted);
    return (Object.keys(moons) as GalileanId[]).filter((id) => {
      const point = satelliteShadowPoint(moons[id], scale(jupiter, -1), JUPITER_EQUATORIAL_KM);
      return point !== null && dot(point, sub(earthFromJupiter, point)) > 0;
    });
  }

  // El tránsito triple del 24-1-2015 que fotografió el Hubble (NASA, ESA y el Hubble Heritage Team,
  // https://science.nasa.gov/asset/hubble/jupiter-january-24-2015/): a las 06:28 UT, las sombras de
  // Europa, Calisto e Ío sobre Júpiter; a las 07:10 UT, las de Europa y Calisto, y la de Ío ya no.
  it('a las 06:28 UT del 24-1-2015, las de Europa, Calisto e Ío; a las 07:10 UT, ya no la de Ío', () => {
    expect(visibleShadows('2015-01-24T06:28:00Z').sort()).toEqual(['calisto', 'europa', 'io']);
    expect(visibleShadows('2015-01-24T07:10:00Z').sort()).toEqual(['calisto', 'europa']);
  });

  it('sin sombra si la luna está detrás del planeta o la recta no lo toca', () => {
    const sun = { x: -5, y: 0, z: 0 };
    // Detrás de Júpiter, respecto al Sol (el Sol, a la izquierda): su «sombra» caería delante, no cuenta.
    expect(satelliteShadowPoint({ x: 0.003, y: 0, z: 0 }, sun, JUPITER_EQUATORIAL_KM)).toBeNull();
    // Muy por encima del planeta: la recta no lo corta.
    expect(
      satelliteShadowPoint({ x: -0.003, y: 0.01, z: 0 }, sun, JUPITER_EQUATORIAL_KM),
    ).toBeNull();
    // Entre el Sol y el planeta, en su recta: la sombra, en el punto subsolar.
    const point = satelliteShadowPoint({ x: -0.003, y: 0, z: 0 }, sun, JUPITER_EQUATORIAL_KM);
    expect(point?.x).toBeCloseTo(-JUPITER_EQUATORIAL_KM / KM_PER_AU, 12);
  });
});
