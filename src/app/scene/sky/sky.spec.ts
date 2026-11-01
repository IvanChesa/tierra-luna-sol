import { NO_INSETS } from '../view-insets';
import {
  discOverlapFraction,
  eclipseSkyAltitude,
  interpolateTable,
  luminance,
  milkyWayGainAt,
  skyColorsAt,
  srgbHexToLinear,
  starLimitAt,
} from './sky-colors';
import {
  DEFAULT_SKY_POSE,
  SKY_ALTITUDE_LIMITS,
  SKY_FOV_LIMITS,
  SkyRig,
  skyProjection,
} from './sky-rig';

describe('sky-rig: la cámara del cielo', () => {
  it('arrastrar gira ya; el rumbo da la vuelta y la altura tiene tope', () => {
    const rig = new SkyRig({ azimuthDeg: 350, altitudeDeg: 20, fovDeg: 60 });
    rig.rotate(20, 0);
    expect(rig.pose.azimuthDeg).toBeCloseTo(10, 9);
    rig.rotate(0, 200);
    expect(rig.pose.altitudeDeg).toBe(SKY_ALTITUDE_LIMITS.max);
    rig.rotate(0, -500);
    expect(rig.pose.altitudeDeg).toBe(SKY_ALTITUDE_LIMITS.min);
  });

  it('«Mirar a…» va por el camino más corto y llega suave (o directo)', () => {
    const rig = new SkyRig({ azimuthDeg: 350, altitudeDeg: 10, fovDeg: 60 });
    rig.lookAt(10, 40);
    let moving = true;
    let steps = 0;
    let maxAzimuthStep = 0;
    let last = rig.pose.azimuthDeg;
    while (moving && steps < 500) {
      moving = rig.update(16);
      const now = rig.pose.azimuthDeg;
      const step = Math.min(Math.abs(now - last), 360 - Math.abs(now - last));
      maxAzimuthStep = Math.max(maxAzimuthStep, step);
      last = now;
      steps++;
    }
    expect(moving).toBe(false);
    expect(rig.pose.azimuthDeg).toBeCloseTo(10, 6);
    expect(rig.pose.altitudeDeg).toBeCloseTo(40, 6);
    // 20° por el norte, no 340° por el sur: ningún paso grande.
    expect(maxAzimuthStep).toBeLessThan(3);
    const direct = new SkyRig();
    direct.lookAt(90, 5, true);
    expect(direct.pose.azimuthDeg).toBe(90);
    expect(direct.update(16)).toBe(false);
  });

  it('el campo de visión, con sus límites, en escala logarítmica', () => {
    const rig = new SkyRig(DEFAULT_SKY_POSE);
    rig.zoom(0.5, true);
    expect(rig.pose.fovDeg).toBeCloseTo(DEFAULT_SKY_POSE.fovDeg / 2, 9);
    rig.zoom(0.001, true);
    expect(rig.pose.fovDeg).toBe(SKY_FOV_LIMITS.min);
    rig.zoom(1000, true);
    expect(rig.pose.fovDeg).toBe(SKY_FOV_LIMITS.max);
    rig.zoom(-1, true);
    expect(rig.pose.fovDeg).toBe(SKY_FOV_LIMITS.max);
  });

  it('un arrastre del alto de la parte visible gira su campo de visión', () => {
    const rig = new SkyRig({ azimuthDeg: 0, altitudeDeg: 0, fovDeg: 60 });
    expect(rig.degreesPerPixel(1200, 600) * 600).toBeCloseTo(60, 9);
    expect(rig.degreesPerPixel(400, 800) * 400).toBeCloseTo(60, 9);
  });

  it('la proyección: el campo pedido en el lado más corto de la parte visible', () => {
    const DEG = Math.PI / 180;
    // Apaisada, sin márgenes: el campo vertical es el pedido.
    const wide = skyProjection(1600, 800, NO_INSETS, 70);
    expect(wide.visibleFovDeg).toBeCloseTo(70, 6);
    // Vertical: el horizontal es el pedido (el vertical, mayor).
    const tall = skyProjection(400, 800, NO_INSETS, 70);
    const horizontal = 2 * Math.atan(Math.tan((tall.visibleFovDeg * DEG) / 2) * tall.visibleAspect);
    expect(horizontal / DEG).toBeCloseTo(70, 6);
    // Con un panel a la derecha, la parte visible sigue con el campo pedido.
    const panel = skyProjection(1600, 800, { top: 0, right: 400, bottom: 120, left: 0 }, 70);
    expect(panel.visibleFovDeg).toBeCloseTo(70, 6);
    expect(panel.offset).not.toBeNull();
  });
});

describe('sky-colors: la luz del cielo según la altura del Sol', () => {
  it('sRGB → lineal', () => {
    expect(srgbHexToLinear('#000000')).toEqual([0, 0, 0]);
    expect(srgbHexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(srgbHexToLinear('#808080')[0]).toBeCloseTo(0.2158, 3);
  });

  it('el cielo se oscurece en orden: día, puesta, crepúsculos y noche', () => {
    const altitudes = [30, 10, 0, -3, -6, -9, -12, -15, -18, -40];
    const zenith = altitudes.map((h) => luminance(skyColorsAt(h).zenith));
    const horizon = altitudes.map((h) => luminance(skyColorsAt(h).horizon));
    for (let k = 1; k < altitudes.length; k++) {
      expect(zenith[k], `cénit a ${altitudes[k]}°`).toBeLessThanOrEqual(zenith[k - 1] as number);
      expect(horizon[k], `horizonte a ${altitudes[k]}°`).toBeLessThanOrEqual(
        horizon[k - 1] as number,
      );
    }
    // De día, el cénit azul (más azul que rojo); en la puesta, el resplandor anaranjado.
    const day = skyColorsAt(30).zenith;
    expect(day[2]).toBeGreaterThan(day[0]);
    const sunset = skyColorsAt(0).glow;
    expect(sunset[0]).toBeGreaterThan(sunset[2]);
    // De noche cerrada, casi negro, pero no negro.
    expect(luminance(skyColorsAt(-30).zenith)).toBeGreaterThan(0);
    expect(luminance(skyColorsAt(-30).zenith)).toBeLessThan(0.003);
  });

  it('las estrellas y la Vía Láctea aparecen al oscurecer', () => {
    expect(starLimitAt(20)).toBeLessThan(-4);
    expect(starLimitAt(-6)).toBe(2);
    expect(starLimitAt(-30)).toBe(6.5);
    expect(milkyWayGainAt(-6)).toBe(0);
    expect(milkyWayGainAt(-30)).toBe(1);
    expect(milkyWayGainAt(-16)).toBeGreaterThan(0);
    expect(interpolateTable([], 3)).toBe(0);
  });

  it('el disco del Sol tapado por la Luna', () => {
    expect(discOverlapFraction(1, 0.27, 0.25)).toBe(0);
    expect(discOverlapFraction(0, 0.27, 0.28)).toBe(1);
    // Una Luna más pequeña, centrada (anular): su área entre la del Sol.
    expect(discOverlapFraction(0, 0.27, 0.25)).toBeCloseTo((0.25 / 0.27) ** 2, 9);
    // Medio solape de dos discos iguales: el área de la lente.
    const half = discOverlapFraction(0.27, 0.27, 0.27);
    expect(half).toBeCloseTo((2 * Math.PI) / 3 / Math.PI - Math.sqrt(3) / (2 * Math.PI), 9);
    // Crece al acercarse los centros.
    expect(discOverlapFraction(0.1, 0.27, 0.27)).toBeGreaterThan(half);
  });

  it('en un eclipse total el cielo se oscurece como en el crepúsculo; en uno parcial poco, no', () => {
    expect(eclipseSkyAltitude(30, 0.5)).toBe(30);
    expect(eclipseSkyAltitude(30, 1)).toBeCloseTo(-7, 9);
    expect(eclipseSkyAltitude(30, 0.98)).toBeLessThan(30);
    expect(eclipseSkyAltitude(30, 0.98)).toBeGreaterThan(-7);
    expect(eclipseSkyAltitude(-10, 1)).toBe(-10);
  });
});
