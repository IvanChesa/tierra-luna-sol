import { ShaderLib, WebGLRenderer } from 'three';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { OrbitLines } from './orbits';

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
    expect(Object.keys(shader.uniforms)).toEqual(
      expect.arrayContaining(['uTlsDiscs', 'uTlsDiscCount', 'uTlsGain']),
    );
    lines.dispose();
  });
});
