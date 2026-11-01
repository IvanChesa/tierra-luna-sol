import { Body, GeoVector, MakeTime } from 'astronomy-engine';
import {
  GeoObserver,
  ECL_TO_THREE,
  eclThreeToSkyThree,
  eqjToEcl,
  equatorialToVector,
  horizontalToSkyThree,
  skyThreeToHorizontal,
} from './coordinates';
import {
  COMPASS_POINTS,
  SKY_BODY_IDS,
  SUNRISE_ALTITUDE_DEG,
  compassPoint,
  constellationOf,
  horizontalOf,
  referenceRefractionDeg,
  refractionDeg,
  skyBodies,
  skyPhase,
} from './sky';
import { USNO_RISE_SET_SPAIN } from './fixtures/fixtures';
import { angleBetweenDeg, mulMat3Vec, normalize } from './vec3';

const MONTSEC: GeoObserver = { latDeg: 42.024637, lonDeg: 0.736936, altitudeM: 812 };

describe('sky: la refracción de las estrellas', () => {
  it('la del shader es la `normal` de astronomy-engine, del nadir al cénit', () => {
    for (let h = -90; h <= 90; h += 0.25) {
      expect(Math.abs(refractionDeg(h) - referenceRefractionDeg(h)), `h = ${h}`).toBeLessThan(
        1e-12,
      );
    }
    // Unos 34′ en el horizonte y nada en el cénit.
    expect(refractionDeg(0) * 60).toBeGreaterThan(28);
    expect(refractionDeg(0) * 60).toBeLessThan(36);
    expect(refractionDeg(90)).toBeLessThan(1e-4);
    expect(refractionDeg(120)).toBe(0);
  });
});

describe('sky: las fases del cielo y los rumbos', () => {
  it('de día, en los tres crepúsculos y de noche, según la altura geométrica del Sol', () => {
    expect(skyPhase(10)).toBe('day');
    expect(skyPhase(SUNRISE_ALTITUDE_DEG + 0.01)).toBe('day');
    expect(skyPhase(-3)).toBe('civil');
    expect(skyPhase(-6.01)).toBe('nautical');
    expect(skyPhase(-12.01)).toBe('astronomical');
    expect(skyPhase(-18.01)).toBe('night');
    expect(skyPhase(-60)).toBe('night');
  });

  it('el rumbo de la rosa de los vientos más cercano, ±22,5°', () => {
    expect(COMPASS_POINTS).toHaveLength(8);
    expect(compassPoint(0)).toBe('n');
    expect(compassPoint(22.4)).toBe('n');
    expect(compassPoint(22.6)).toBe('ne');
    expect(compassPoint(90)).toBe('e');
    expect(compassPoint(180)).toBe('s');
    expect(compassPoint(225)).toBe('sw');
    expect(compassPoint(270)).toBe('w');
    expect(compassPoint(337.6)).toBe('n');
    expect(compassPoint(-90)).toBe('w');
    expect(compassPoint(720 + 45)).toBe('ne');
  });
});

describe('sky: los ejes del cielo en Three', () => {
  it('el norte hacia −Z, el este hacia +X y el cénit hacia +Y; ida y vuelta', () => {
    const north = horizontalToSkyThree(0, 0);
    expect(north.z).toBeCloseTo(-1, 12);
    expect(horizontalToSkyThree(90, 0).x).toBeCloseTo(1, 12);
    expect(horizontalToSkyThree(0, 90).y).toBeCloseTo(1, 12);
    for (const [az, alt] of [
      [12, 34],
      [181, -5],
      [300.5, 71],
    ] as const) {
      const back = skyThreeToHorizontal(horizontalToSkyThree(az, alt));
      expect(back.azimuthDeg).toBeCloseTo(az, 9);
      expect(back.altitudeDeg).toBeCloseTo(alt, 9);
    }
  });

  it('la rotación de las estrellas lleva el Sol a donde lo pone `skyBodies` (sin refracción)', () => {
    for (const iso of ['2026-06-21T10:00:00Z', '2026-12-21T15:30:00Z', '1950-03-01T08:00:00Z']) {
      const date = new Date(iso);
      const sunEcl = eqjToEcl(GeoVector(Body.Sun, MakeTime(date), true));
      const sunThree = mulMat3Vec(ECL_TO_THREE, normalize(sunEcl));
      const fromMatrix = mulMat3Vec(eclThreeToSkyThree(date, MONTSEC), sunThree);
      const sun = skyBodies(date, MONTSEC).find((b) => b.id === 'sol');
      if (!sun) throw new Error('Sin Sol');
      const geometric = horizontalToSkyThree(sun.azimuthDeg, sun.geometricAltitudeDeg);
      // Solo los separan el paralaje del Sol (8,8″) y redondeos.
      expect(angleBetweenDeg(fromMatrix, geometric), iso).toBeLessThan(0.01);
    }
  });

  it('la Polar, a la altura de la latitud del lugar (±0,8°: está a 0,7° del polo)', () => {
    // Polaris, J2000 (Hipparcos): α = 2 h 31 min 49 s, δ = +89° 15′ 51″.
    const polaris = equatorialToVector(
      (2 + 31 / 60 + 49.09 / 3600) * 15,
      89 + 15 / 60 + 50.8 / 3600,
    );
    const polarisThree = mulMat3Vec(ECL_TO_THREE, eqjToEcl(polaris));
    for (const iso of ['2026-01-01T00:00:00Z', '2026-07-01T06:00:00Z']) {
      const date = new Date(iso);
      const sky = skyThreeToHorizontal(mulMat3Vec(eclThreeToSkyThree(date, MONTSEC), polarisThree));
      expect(Math.abs(sky.altitudeDeg - MONTSEC.latDeg), iso).toBeLessThan(0.8);
      const azimuth = sky.azimuthDeg > 180 ? sky.azimuthDeg - 360 : sky.azimuthDeg;
      expect(Math.abs(azimuth), iso).toBeLessThan(1.2);
    }
  });
});

describe('sky: el Sol, la Luna y los planetas desde el lugar', () => {
  it('los nueve, con rumbo, altura, magnitud y el disco del Sol y de la Luna', () => {
    const bodies = skyBodies(new Date('2026-11-01T21:00:00Z'), MONTSEC);
    expect(bodies.map((b) => b.id)).toEqual([...SKY_BODY_IDS]);
    for (const body of bodies) {
      expect(body.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(body.azimuthDeg).toBeLessThan(360);
      expect(Math.abs(body.altitudeDeg)).toBeLessThanOrEqual(90);
      expect(Number.isFinite(body.magnitude)).toBe(true);
      // La refracción solo levanta.
      expect(body.altitudeDeg).toBeGreaterThanOrEqual(body.geometricAltitudeDeg - 1e-9);
    }
    const sun = bodies.find((b) => b.id === 'sol');
    const moon = bodies.find((b) => b.id === 'luna');
    // Unos 16′ de radio los dos (el Sol, 15,8′–16,3′; la Luna, 14,7′–16,8′).
    expect(sun?.angularRadiusDeg).toBeGreaterThan(0.26);
    expect(sun?.angularRadiusDeg).toBeLessThan(0.275);
    expect(moon?.angularRadiusDeg).toBeGreaterThan(0.24);
    expect(moon?.angularRadiusDeg).toBeLessThan(0.285);
    expect(sun?.magnitude).toBeLessThan(-26);
    // De noche (las 22:00 en el Montsec), el Sol bajo el horizonte.
    expect(sun?.altitudeDeg).toBeLessThan(-18);
  });

  it('en la culminación del USNO, el Sol al sur y a 90° − latitud + declinación (solsticio de junio)', () => {
    const series = USNO_RISE_SET_SPAIN.series.find(
      (s) => s.place === 'montsec' && s.date === '2026-06-21',
    );
    if (!series) throw new Error('Falta el fixture');
    const sun = skyBodies(new Date(series.sun.transit.ut), MONTSEC).find((b) => b.id === 'sol');
    if (!sun) throw new Error('Sin Sol');
    // La hora del USNO va al minuto: cerca del cénit el rumbo corre unos 0,7° por minuto.
    expect(Math.abs(sun.azimuthDeg - 180)).toBeLessThan(1);
    // Declinación del Sol en el solsticio, 23,44°: altura ≈ 90 − 42,02 + 23,44 = 71,41°.
    expect(Math.abs(sun.geometricAltitudeDeg - (90 - MONTSEC.latDeg + 23.44))).toBeLessThan(0.05);
  });

  it('el rumbo y la altura de un cuerpo solo son los de `skyBodies`', () => {
    const date = new Date('2026-11-01T22:00:00Z');
    const jupiter = skyBodies(date, MONTSEC).find((b) => b.id === 'jupiter');
    const quick = horizontalOf('jupiter', date, MONTSEC);
    expect(quick.azimuthDeg).toBeCloseTo(jupiter?.azimuthDeg ?? NaN, 9);
    expect(quick.altitudeDeg).toBeCloseTo(jupiter?.altitudeDeg ?? NaN, 9);
  });

  it('la constelación de la IAU en la que se ve un cuerpo', () => {
    // En el solsticio de diciembre, el Sol está en Sagitario (en el límite J2000 de la IAU).
    expect(constellationOf('sol', new Date('2026-12-21T12:00:00Z'), MONTSEC)).toBe('Sgr');
    // En el solsticio de junio, entre Tauro y Géminis: en Géminis desde el 21-06 aproximadamente.
    expect(['Tau', 'Gem']).toContain(
      constellationOf('sol', new Date('2026-06-21T12:00:00Z'), MONTSEC),
    );
  });
});
