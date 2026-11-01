import { Color, Matrix4, PerspectiveCamera, ShaderLib, WebGLRenderer } from 'three';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { SCHEMATIC_COLORS } from './body-colors';
import {
  ORBIT_WIDTH_PX,
  OrbitLines,
  OrbitView,
  screenPath,
  straightOrbitFade,
  trailColor,
  trailWeight,
} from './orbits';
import { VISUAL_CONFIG } from './visual-config';

describe('órbitas: desvanecimiento sobre los discos', () => {
  it('se inyecta en el shader real de LineMaterial (si three cambia sus cadenas, falla aquí)', () => {
    const lines = new OrbitLines([]);
    const material = lines.object.material as LineMaterial;
    // La importación de LineMaterial registra su shader en ShaderLib.
    const line = ShaderLib['line'];
    expect(line).toBeDefined();
    const shader = {
      uniforms: {},
      vertexShader: line?.vertexShader ?? '',
      fragmentShader: line?.fragmentShader ?? '',
    };
    material.onBeforeCompile(shader as never, undefined as unknown as WebGLRenderer);
    // La función se declara y se aplica al color final, con la ganancia del fondo.
    expect(shader.fragmentShader.match(/tlsDiscFade\(\)/g)?.length).toBe(2);
    expect(shader.fragmentShader).toContain('diffuseColor.rgb * uTlsGain');
    // Sin remates (con mezcla aditiva, las uniones se sumarían dos veces).
    expect(shader.fragmentShader).toContain('if ( abs( vUv.y ) > 1.0 ) discard;');
    // El grosor por vértice de las estelas (D34) entra en el vértice.
    expect(shader.vertexShader).toContain('attribute float instanceWidthStart;');
    expect(shader.vertexShader).toContain(
      'offset *= linewidth * ( ( position.y < 0.5 ) ? instanceWidthStart : instanceWidthEnd );',
    );
    expect(Object.keys(shader.uniforms)).toEqual(
      expect.arrayContaining(['uTlsDiscs', 'uTlsDiscCount', 'uTlsGain']),
    );
    lines.dispose();
  });
});

describe('estelas de los cuerpos (D34)', () => {
  const { planet, moon, falloff } = VISUAL_CONFIG.trails;

  it('pesan 1 en el cuerpo, se desvanecen sin saltos y desaparecen al cubrir su fracción de vuelta', () => {
    expect(trailWeight(0, planet.fraction, falloff)).toBe(1);
    let previous = 1;
    for (let k = 1; k <= 100; k++) {
      const weight = trailWeight((k / 100) * planet.fraction, planet.fraction, falloff);
      expect(weight).toBeLessThan(previous);
      expect(previous - weight).toBeLessThan(0.05);
      previous = weight;
    }
    expect(previous).toBe(0);
    // Más allá, y en el resto de la vuelta, nada.
    expect(trailWeight(0.5, planet.fraction, falloff)).toBe(0);
    expect(trailWeight(0.999, planet.fraction, falloff)).toBe(0);
    // Sin longitud, no hay estela.
    expect(trailWeight(0, 0, falloff)).toBe(0);
  });

  it('van por fracción de vuelta (1/8 en los planetas) y en las lunas son más cortas y tenues', () => {
    expect(planet.fraction).toBeCloseTo(1 / 8, 12);
    expect(moon.fraction).toBeLessThan(planet.fraction);
    expect(moon.intensity).toBeLessThan(planet.intensity);
    expect(moon.widthPx).toBeLessThan(planet.widthPx);
    // Más gruesas que la órbita junto al cuerpo (adelgazan hasta ella).
    expect(moon.widthPx).toBeGreaterThan(ORBIT_WIDTH_PX);
  });

  it('tienen el tono de su cuerpo, con el canal mayor a 1', () => {
    for (const id of ['mercurio', 'marte', 'jupiter', 'neptuno', 'titan'] as const) {
      const body = new Color(SCHEMATIC_COLORS[id]);
      const trail = trailColor(SCHEMATIC_COLORS[id]);
      expect(Math.max(trail.r, trail.g, trail.b)).toBeCloseTo(1, 12);
      // Las mismas proporciones entre canales: el mismo tono, más vivo.
      const scale = trail.r / body.r;
      expect(trail.g / body.g).toBeCloseTo(scale, 9);
      expect(trail.b / body.b).toBeCloseTo(scale, 9);
      expect(scale).toBeGreaterThanOrEqual(1);
    }
    // Marte, rojizo; Neptuno, azul.
    expect(trailColor(SCHEMATIC_COLORS.marte).r).toBe(1);
    expect(trailColor(SCHEMATIC_COLORS.neptuno).b).toBe(1);
  });
});

describe('órbitas casi rectas en pantalla (revisión del bloque D, D3)', () => {
  const WIDTH = 1600;
  const HEIGHT = 900;
  /** La cámara de un frame: una de three de verdad, de 50° de campo vertical. */
  const viewFrom = (
    position: readonly [number, number, number],
    target: readonly [number, number, number],
  ): OrbitView => {
    const camera = new PerspectiveCamera(50, WIDTH / HEIGHT, 1e-3, 1e12);
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateMatrixWorld();
    const matrix = new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    return { matrix: matrix.elements, width: WIDTH, height: HEIGHT, camera: position };
  };
  /** La cámara, en radios de una órbita centrada en el origen. */
  const outside = (view: OrbitView, r: number) => Math.hypot(...view.camera) / r;
  /** El desvanecimiento de una órbita circular de radio r vista desde `view`. */
  const fadeOf = (r: number, view: OrbitView) => {
    const { points, count } = circle(r);
    return straightOrbitFade(screenPath(points, count, view), outside(view, r));
  };
  /** Una órbita circular de radio r en el plano de la eclíptica (XZ de la escena), cerrada. */
  const circle = (r: number, segments = 256): { points: Float64Array; count: number } => {
    const count = segments + 1;
    const points = new Float64Array(3 * count);
    for (let k = 0; k < count; k++) {
      const angle = (2 * Math.PI * k) / segments;
      points[3 * k] = r * Math.cos(angle);
      points[3 * k + 2] = -r * Math.sin(angle);
    }
    return { points, count };
  };

  it('una órbita entera en pantalla gira una vuelta y se ve entera (la vista general, un sistema)', () => {
    const { points, count } = circle(5);
    const view = viewFrom([0, 30, 12], [0, 0, 0]);
    const path = screenPath(points, count, view);
    // Una vuelta, menos el giro en el cuerpo (donde la polilínea empieza y acaba).
    expect(path.turning).toBeGreaterThan(2 * Math.PI * (1 - 2 / 256));
    expect(path.lengthPx).toBeGreaterThan(500);
    expect(straightOrbitFade(path, outside(view, 5))).toBe(1);
    // Aun con la cámara dentro de ella (no cuenta por estar fuera): se ve curva.
    expect(straightOrbitFade(path, 0)).toBe(1);
  });

  it('de cerca, junto al cuerpo, una órbita enorme es una recta que cruza la pantalla: se apaga', () => {
    // Saturno enfocado a unos radios: su órbita (9,5 UA) es el tramo recto que lo atraviesa.
    const r = 1.4e9;
    const { points, count } = circle(r);
    const view = viewFrom([r + 2e5, 1e5, -3e5], [r, 0, 0]);
    const path = screenPath(points, count, view);
    // Lo que gira es lo lejano de la órbita, que se acerca al horizonte de su plano (unos 8°): la
    // cuerda que lo atraviesa se junta con ello en una esquina, que no cuenta.
    expect(path.lengthPx).toBeGreaterThan(WIDTH / 2);
    expect(path.turning).toBeLessThan(0.15);
    expect(outside(view, r)).toBeCloseTo(1, 3);
    expect(straightOrbitFade(path, outside(view, r))).toBeLessThan(0.05);
  });

  it('vista desde cerca de su centro, una órbita es una recta (la de la Luna desde la Tierra): se apaga', () => {
    // La Luna, a 60 radios terrestres; la cámara, a 3 radios de la Tierra, mirando hacia la órbita.
    const { points, count } = circle(60);
    const view = viewFrom([2, 1, 2], [0, 0, -60]);
    const path = screenPath(points, count, view);
    expect(path.lengthPx).toBeGreaterThan(WIDTH / 2);
    expect(path.turning).toBeLessThan(VISUAL_CONFIG.straightOrbits.fadeBelowRad);
    expect(straightOrbitFade(path, outside(view, 60))).toBe(0);
  });

  it('la órbita de una luna vista en su sistema, aunque no quepa entera, se ve curva y se queda', () => {
    // Una órbita de 30 radios con la cámara a 20 del planeta y 25° sobre su plano.
    const { points, count } = circle(30);
    const elevation = (25 * Math.PI) / 180;
    const view = viewFrom([0, 20 * Math.sin(elevation), 20 * Math.cos(elevation)], [0, 0, 0]);
    const path = screenPath(points, count, view);
    // La cámara, dentro de ella: lo que cuenta es lo que gira.
    expect(outside(view, 30)).toBeLessThan(1);
    expect(path.lengthPx).toBeGreaterThan(WIDTH / 2);
    expect(path.turning).toBeGreaterThan(VISUAL_CONFIG.straightOrbits.fullAboveRad);
    expect(straightOrbitFade(path, outside(view, 30))).toBe(1);
  });

  it('con `enough`, la medida para en cuanto la órbita se ve entera: el mismo desvanecimiento', () => {
    const { points, count } = circle(5);
    const view = viewFrom([0, 30, 12], [0, 0, 0]);
    const full = screenPath(points, count, view);
    const quick = screenPath(points, count, view, true);
    expect(quick.turning).toBeLessThan(full.turning);
    expect(quick.turning).toBeGreaterThanOrEqual(VISUAL_CONFIG.straightOrbits.fullAboveRad);
    expect(straightOrbitFade(quick, 0)).toBe(straightOrbitFade(full, 0));
    // Una recta no para: la medida es la misma.
    const line = circle(60);
    const inside = viewFrom([2, 1, 2], [0, 0, -60]);
    expect(screenPath(line.points, line.count, inside, true)).toEqual(
      screenPath(line.points, line.count, inside),
    );
  });

  it('lo que queda detrás de la cámara no cuenta, sin NaN, y lo que no se ve no gira', () => {
    // La cámara sobre la propia órbita, mirando a lo largo de ella: la mitad queda detrás.
    const { points, count } = circle(10);
    const along = screenPath(points, count, viewFrom([10, 0.2, 0], [10, 0.2, -1]));
    expect(Number.isFinite(along.turning)).toBe(true);
    expect(Number.isFinite(along.lengthPx)).toBe(true);
    // Mirando hacia fuera, lejos de ella: nada en pantalla.
    const away = screenPath(points, count, viewFrom([0, 50, 0], [0, 100, 0]));
    expect(away).toEqual({ turning: 0, lengthPx: 0 });
    expect(straightOrbitFade(away, 5)).toBe(1);
    expect(straightOrbitFade(away, 0)).toBe(1);
  });

  it('vista de canto desde fuera, la órbita de una luna es una elipse casi recta pero entera: se queda', () => {
    // Una órbita de 5 radios vista desde 12, a 2° sobre su plano (como las de Saturno en 2026).
    const elevation = (2 * Math.PI) / 180;
    const view = viewFrom([0, 12 * Math.sin(elevation), 12 * Math.cos(elevation)], [0, 0, 0]);
    expect(outside(view, 5)).toBeGreaterThan(VISUAL_CONFIG.straightOrbits.outsideTo);
    expect(fadeOf(5, view)).toBe(1);
    // La misma cámara, dentro de una órbita de 60 radios: su horizonte es una recta y se apaga.
    expect(fadeOf(60, view)).toBe(0);
  });

  it('el desvanecimiento sube sin saltos con el giro y no toca lo que apenas se ve', () => {
    const { fadeBelowRad, fullAboveRad, minLengthPx, outsideFrom, outsideTo } =
      VISUAL_CONFIG.straightOrbits;
    const long = 10 * minLengthPx;
    const piece = (turning: number, lengthPx = long, ratio = 0.5) =>
      straightOrbitFade({ turning, lengthPx }, ratio);
    expect(piece(0)).toBe(0);
    expect(piece(fadeBelowRad)).toBe(0);
    expect(piece(fullAboveRad)).toBe(1);
    let previous = 0;
    for (let turning = fadeBelowRad; turning <= fullAboveRad; turning += 0.01) {
      const fade = piece(turning);
      expect(fade).toBeGreaterThanOrEqual(previous);
      expect(fade - previous).toBeLessThan(0.1);
      previous = fade;
    }
    // Unos píxeles de recta no se tocan; entre medias, un paso suave.
    expect(piece(0, minLengthPx / 2)).toBe(1);
    const half = piece(0, (3 * minLengthPx) / 4);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    // Lo mismo con la cámara fuera de la órbita: junto a ella, se apaga; bien fuera, se queda.
    expect(piece(0, long, outsideFrom)).toBe(0);
    expect(piece(0, long, outsideTo)).toBe(1);
    const between = piece(0, long, (outsideFrom + outsideTo) / 2);
    expect(between).toBeGreaterThan(0);
    expect(between).toBeLessThan(1);
  });
});
