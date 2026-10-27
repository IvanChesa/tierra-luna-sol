import { Color, ShaderLib, WebGLRenderer } from 'three';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { SCHEMATIC_COLORS } from './body-colors';
import { ORBIT_WIDTH_PX, OrbitLines, trailColor, trailWeight } from './orbits';
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
