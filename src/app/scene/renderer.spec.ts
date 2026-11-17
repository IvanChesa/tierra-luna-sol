/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La compilación por partes de `renderer.ts` (fase 10) usa internos de three que no son API pública:
 * `compileAsync(objeto, cámara, escenaDestino)`, `renderer.properties.get(material).currentProgram` y
 * los `getUniforms()` y `getAttributes()` del programa. Si un `three` nuevo los cambia, este test
 * avisa al subirlo (fase 11b, F11 de la revisión del bloque F), antes de que falle en el navegador.
 */
const source = (path: string) =>
  readFileSync(join(process.cwd(), 'node_modules/three/src', path), 'utf8');

describe('renderer: los internos de three de la compilación por partes', () => {
  it('compileAsync con escena destino, currentProgram y la primera lectura del programa', () => {
    const renderer = source('renderers/WebGLRenderer.js');
    expect(renderer).toMatch(
      /this\.compileAsync = function \( scene, camera, targetScene = null \)/,
    );
    expect(renderer).toMatch(/materialProperties\.currentProgram = program;/);
    const program = source('renderers/webgl/WebGLProgram.js');
    expect(program).toMatch(/this\.getUniforms = function \(\)/);
    expect(program).toMatch(/this\.getAttributes = function \(\)/);
  });
});
