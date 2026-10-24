/**
 * Chunks comunes de profundidad (D13). TODO `ShaderMaterial` de la escena los incluye, sea cual sea
 * el buffer elegido:
 * - con `logarithmicDepthBuffer`, el fragmento escribe `gl_FragDepth` en escala logarítmica (si un
 *   shader no lo hiciera, su profundidad no casaría con la del resto y parpadearía);
 * - con `reversedDepthBuffer`, three ajusta la matriz de proyección y estos chunks no hacen nada;
 * - con el buffer estándar, tampoco.
 *
 * `sceneShaderMaterial` es la única forma de crear un `ShaderMaterial` en `scene/`: comprueba que
 * los cuatro chunks están en su sitio y falla si no.
 */
import { ShaderMaterial, ShaderMaterialParameters } from 'three';

/** Al principio del vertex shader (declaraciones). */
export const DEPTH_VERTEX_PARS = '#include <common>\n#include <logdepthbuf_pars_vertex>';
/** Al final de `main()` del vertex shader, después de escribir `gl_Position`. */
export const DEPTH_VERTEX = '#include <logdepthbuf_vertex>';
/** Al principio del fragment shader (declaraciones). */
export const DEPTH_FRAGMENT_PARS = '#include <logdepthbuf_pars_fragment>';
/** Al principio de `main()` del fragment shader. */
export const DEPTH_FRAGMENT = '#include <logdepthbuf_fragment>';

/** Salida de color común: tone mapping y paso al espacio de color de salida (sRGB). */
export const OUTPUT_FRAGMENT = '#include <tonemapping_fragment>\n#include <colorspace_fragment>';

const REQUIRED: readonly (readonly ['vertexShader' | 'fragmentShader', string])[] = [
  ['vertexShader', '#include <logdepthbuf_pars_vertex>'],
  ['vertexShader', '#include <logdepthbuf_vertex>'],
  ['fragmentShader', '#include <logdepthbuf_pars_fragment>'],
  ['fragmentShader', '#include <logdepthbuf_fragment>'],
];

/** ¿Lleva el material los chunks de profundidad? (también para materiales de `three/addons`). */
export function hasDepthChunks(material: {
  vertexShader: string;
  fragmentShader: string;
}): boolean {
  return REQUIRED.every(([stage, chunk]) => material[stage].includes(chunk));
}

/** Crea un `ShaderMaterial` comprobando que incluye los chunks de profundidad. */
export function sceneShaderMaterial(
  parameters: ShaderMaterialParameters & { vertexShader: string; fragmentShader: string },
): ShaderMaterial {
  const missing = REQUIRED.filter(([stage, chunk]) => !parameters[stage].includes(chunk));
  if (missing.length > 0) {
    throw new Error(
      `Shader sin los chunks de profundidad (D13): ${missing.map(([, chunk]) => chunk).join(', ')}`,
    );
  }
  return new ShaderMaterial(parameters);
}
