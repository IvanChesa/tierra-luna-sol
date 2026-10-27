/**
 * Marcadores de lugares sobre la superficie de la Tierra (fase 5, vista guiada «España»): puntos
 * redondos y discretos, de tamaño fijo en pantalla, con un borde oscuro que los separa del océano y de
 * las nubes. Van en el sistema propio del cuerpo (giran con él) y la profundidad los oculta en la cara
 * de atrás.
 */
import { Color, Uniform } from 'three';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';

const vertexShader = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform float uSize;
uniform float uPixelRatio;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixelRatio;
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform vec3 uColor;

void main() {
  ${DEPTH_FRAGMENT}
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  vec3 color = d > 0.32 ? vec3(0.04, 0.06, 0.1) : uColor;
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createMarkerMaterial(color: string) {
  const uniforms = {
    uSize: new Uniform(7),
    uPixelRatio: new Uniform(1),
    uColor: new Uniform(new Color(color)),
  };
  const material = sceneShaderMaterial({
    name: 'tls-markers',
    uniforms,
    vertexShader,
    fragmentShader,
    toneMapped: false,
  });
  return { material, uniforms };
}
