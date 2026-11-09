import { NO_INSETS } from '../view-insets';
import { VISUAL_CONFIG } from '../visual-config';
import {
  discOverlapFraction,
  eclipseSkyAltitude,
  glowBandAt,
  interpolateTable,
  luminance,
  milkyWayGainAt,
  skyColorsAt,
  srgbHexToLinear,
  starLimitAt,
  sunDiscTintAt,
  totalityOf,
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
    expect(rig.degreesPerPixel(600) * 600).toBeCloseTo(60, 9);
    expect(rig.degreesPerPixel(800) * 800).toBeCloseTo(60, 9);
  });

  it('la proyección: el campo pedido, el vertical de la parte visible', () => {
    const DEG = Math.PI / 180;
    // Apaisada, sin márgenes: el campo vertical es el pedido.
    const wide = skyProjection(1600, 800, NO_INSETS, 70);
    expect(wide.visibleFovDeg).toBeCloseTo(70, 6);
    // Vertical (un móvil): también el vertical; el horizontal, menor (sin la deformación de un campo
    // vertical de más de 110°).
    const tall = skyProjection(400, 800, NO_INSETS, 70);
    expect(tall.visibleFovDeg).toBeCloseTo(70, 6);
    const horizontal = 2 * Math.atan(Math.tan((tall.visibleFovDeg * DEG) / 2) * tall.visibleAspect);
    expect(horizontal / DEG).toBeLessThan(40);
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

  it('de día, el horizonte del lado del Sol ya no satura a blanco; en la puesta, el resplandor entero', () => {
    // Sugerencia 14 de la revisión de la fase 8: el resplandor, poco con el Sol alto.
    expect(glowBandAt(0)).toBe(1);
    expect(glowBandAt(3)).toBe(1);
    expect(glowBandAt(60)).toBeLessThan(0.3);
    const altitudes = [0, 3, 6, 12, 20, 30, 60];
    for (let k = 1; k < altitudes.length; k++) {
      expect(glowBandAt(altitudes[k] as number)).toBeLessThanOrEqual(
        glowBandAt(altitudes[k - 1] as number),
      );
    }
    // El horizonte justo debajo del Sol (el resplandor entero, `band` = 1 en el sombreado): con el
    // Sol alto, por debajo de 1 en los tres canales (antes, blanco: 1,47 en el rojo).
    for (const altitude of [20, 33, 45, 71]) {
      const { horizon, glow } = skyColorsAt(altitude);
      const band = glowBandAt(altitude);
      for (let c = 0; c < 3; c++) {
        expect((horizon[c] as number) + band * (glow[c] as number), `a ${altitude}°`).toBeLessThan(
          1,
        );
      }
    }
  });

  it('el disco del Sol enrojece junto al horizonte y es blanco con el Sol alto', () => {
    expect(sunDiscTintAt(20)).toEqual([1, 1, 1]);
    expect(sunDiscTintAt(70)).toEqual([1, 1, 1]);
    const [r, g, b] = sunDiscTintAt(0);
    expect(r).toBe(1);
    expect(g).toBeLessThan(0.3);
    expect(b).toBeLessThan(g);
    expect(sunDiscTintAt(-1)).toEqual(sunDiscTintAt(0));
    // Pierde antes el azul que el verde, y menos cuanto más alto (el aire que atraviesa).
    const altitudes = [0, 1, 3, 5, 8, 12, 20];
    for (let k = 1; k < altitudes.length; k++) {
      const low = sunDiscTintAt(altitudes[k - 1] as number);
      const high = sunDiscTintAt(altitudes[k] as number);
      expect(high[1]).toBeGreaterThan(low[1]);
      expect(high[2]).toBeGreaterThan(low[2]);
      expect(high[2] / high[1]).toBeGreaterThanOrEqual(low[2] / low[1]);
    }
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

  it('la totalidad (fase 9b, E1): nada hasta el 99,9 % del disco tapado y toda con el disco tapado', () => {
    expect(totalityOf(0)).toBe(0);
    expect(totalityOf(0.99)).toBe(0);
    expect(totalityOf(0.999)).toBe(0);
    expect(totalityOf(0.9995)).toBeCloseTo(0.5, 9);
    expect(totalityOf(1)).toBe(1);
  });

  it('el cielo de la totalidad desde Fraga, en la configuración: azul, con el horizonte anaranjado', () => {
    const { ring, moonVeil } = VISUAL_CONFIG.sky.eclipse.totality;
    // El anillo: naranja pegado al horizonte (R > G > B) y amarillo más arriba, y más bajo el naranja.
    const [ir, ig, ib] = srgbHexToLinear(ring.inner.color);
    const [or, og] = srgbHexToLinear(ring.outer.color);
    expect(ir).toBeGreaterThan(ig);
    expect(ig).toBeGreaterThan(ib);
    expect(og / or).toBeGreaterThan(ig / ir);
    expect(ring.inner.heightDeg).toBeLessThan(ring.outer.heightDeg);
    // La Luna, más oscura que el cielo, sin llegar a negro (ilustrativo).
    expect(moonVeil).toBeGreaterThan(0);
    expect(moonVeil).toBeLessThan(1);
    // El cielo de la totalidad (la altura efectiva del eclipse): azul, B > G > R en el cénit.
    const { zenith } = skyColorsAt(VISUAL_CONFIG.sky.eclipse.altitudeDeg);
    expect(zenith[2]).toBeGreaterThan(zenith[1]);
    expect(zenith[1]).toBeGreaterThan(zenith[0]);
  });
});

describe('sky-scene: los planetas que se dibujan', () => {
  it('con el límite de la luz del cielo; de noche cerrada, todos (Neptuno, tenue)', async () => {
    const { planetPresence } = await import('./sky-scene');
    expect(planetPresence(-4.5, -5)).toBe(0); // Venus, a pleno día no: el límite es más brillante
    expect(planetPresence(-2, -5)).toBe(0);
    expect(planetPresence(-2, 2)).toBe(1); // Júpiter, en el crepúsculo
    expect(planetPresence(5.7, 2)).toBe(0); // Urano, en el crepúsculo, no
    expect(planetPresence(7.8, 6.5)).toBe(0.6); // Neptuno, de noche, tenue
    expect(planetPresence(5.7, 6.5)).toBe(1);
  });
});
