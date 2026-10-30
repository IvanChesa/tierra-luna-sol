/**
 * Estrellas del catálogo HYG (D14): puntos con el tamaño y el brillo según la magnitud y el color
 * según el índice B−V. Están en el infinito: solo giran con la cámara, no se trasladan.
 *
 * Se pintan antes que todo (`renderOrder` negativo), sin test ni escritura de profundidad y en la
 * lista de opacos (`transparent: false` con mezcla aditiva), para que los cuerpos las tapen.
 */
import { AdditiveBlending, Uniform } from 'three';
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
attribute float aMagnitude;
attribute vec3 aColor;
uniform float uPixelRatio;
uniform float uMagnitudeLimit;
uniform float uSkyDistance;
uniform float uBrightness;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Solo la rotación de la vista: las estrellas no se trasladan con la cámara.
  vec3 direction = mat3(viewMatrix) * position;
  gl_Position = projectionMatrix * vec4(direction * uSkyDistance, 1.0);
  // Flujo relativo a una estrella de magnitud 1 (10^(−0,4 · Δm)), acotado.
  float flux = pow(10.0, -0.4 * (aMagnitude - 1.0));
  float size = clamp(1.4 + 2.2 * sqrt(flux), 1.4, 5.5);
  gl_PointSize = aMagnitude > uMagnitudeLimit ? 0.0 : size * uPixelRatio;
  vAlpha = clamp(0.22 + 0.9 * sqrt(flux), 0.0, 1.0) * uBrightness;
  vColor = aColor;
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
varying vec3 vColor;
varying float vAlpha;

void main() {
  ${DEPTH_FRAGMENT}
  float d = length(gl_PointCoord - vec2(0.5));
  // Los bordes de smoothstep, en orden (al revés, GLSL ES no define el resultado).
  float disc = 1.0 - smoothstep(0.15, 0.5, d);
  if (disc <= 0.0) discard;
  gl_FragColor = vec4(vColor * vAlpha * disc, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createStarMaterial() {
  const uniforms = {
    uPixelRatio: new Uniform(1),
    uMagnitudeLimit: new Uniform(6.5),
    uSkyDistance: new Uniform(1),
    uBrightness: new Uniform(1),
  };
  const material = sceneShaderMaterial({
    name: 'tls-stars',
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}
