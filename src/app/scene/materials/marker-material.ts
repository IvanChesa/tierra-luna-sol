/**
 * Marcadores de lugares sobre la superficie de la Tierra (fase 5, vista guiada «España»): puntos
 * redondos y discretos, de tamaño fijo en pantalla, con un borde oscuro que los separa del océano y de
 * las nubes. Van en el sistema propio del cuerpo (giran con él) y la profundidad los oculta en la cara
 * de atrás. Color, borde y tamaño, en `VISUAL_CONFIG.earth.markers`.
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
uniform vec3 uEdge;

void main() {
  ${DEPTH_FRAGMENT}
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  gl_FragColor = vec4(d > 0.32 ? uEdge : uColor, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export interface MarkerStyle {
  /** Color del punto y de su borde (sRGB). */
  readonly color: string;
  readonly edge: string;
  /** Diámetro en px CSS. */
  readonly sizePx: number;
}

export function createMarkerMaterial(style: MarkerStyle) {
  const uniforms = {
    uSize: new Uniform(style.sizePx),
    uPixelRatio: new Uniform(1),
    uColor: new Uniform(new Color(style.color)),
    uEdge: new Uniform(new Color(style.edge)),
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
