/**
 * El Sol: disco con oscurecimiento del limbo y un halo (PLAN, fase 2, 2.c.12).
 *
 * - Oscurecimiento del limbo con la ley lineal I(μ) / I(1) = 1 − u · (1 − μ), con μ el coseno del
 *   ángulo entre la normal y la visual, y u = 0,6 (valor clásico para la luz visible).
 * - Emite luz (no se ilumina) con intensidad por encima de 1: el tone mapping la lleva casi a blanco
 *   en el centro y deja ver el color de la textura hacia el borde.
 * - El halo es un cuadrado orientado a la cámara, aditivo, con un tamaño mínimo en píxeles para que
 *   el Sol se vea aunque mida menos de un píxel (escala real, desde Neptuno).
 */
import { AdditiveBlending, Color, Texture, Uniform } from 'three';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';

/** Coeficiente de la ley lineal del oscurecimiento del limbo en el visible. */
export const SUN_LIMB_DARKENING = 0.6;

const sunVertex = /* glsl */ `
${DEPTH_VERTEX_PARS}
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  ${DEPTH_VERTEX}
}
`;

const sunFragment = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uLimbDarkening;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  ${DEPTH_FRAGMENT}
  float mu = clamp(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0, 1.0);
  float limb = 1.0 - uLimbDarkening * (1.0 - mu);
  vec3 base = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uColor;
  gl_FragColor = vec4(base * limb * uIntensity, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createSunMaterial() {
  const uniforms = {
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uColor: new Uniform(new Color(1, 0.62, 0.25)),
    uIntensity: new Uniform(2.6),
    uLimbDarkening: new Uniform(SUN_LIMB_DARKENING),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sun',
    uniforms,
    vertexShader: sunVertex,
    fragmentShader: sunFragment,
  });
  return { material, uniforms };
}

const haloVertex = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform float uRadius;
uniform float uMinPixels;
uniform float uViewportHeight;
varying vec2 vOffset;

void main() {
  vOffset = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // Unidades de escena por píxel a la distancia del Sol (perspectiva).
  float unitsPerPixel = -center.z * 2.0 / (uViewportHeight * projectionMatrix[1][1]);
  float size = max(uRadius, uMinPixels * unitsPerPixel);
  gl_Position = projectionMatrix * (center + vec4(position.xy * size, 0.0, 0.0));
  ${DEPTH_VERTEX}
}
`;

const haloFragment = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vOffset;

void main() {
  ${DEPTH_FRAGMENT}
  float r = length(vOffset);
  if (r > 1.0) discard;
  float glow = pow(1.0 - r, 2.6) * uIntensity;
  gl_FragColor = vec4(uColor * glow, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createHaloMaterial() {
  const uniforms = {
    uRadius: new Uniform(1),
    uMinPixels: new Uniform(26),
    uViewportHeight: new Uniform(800),
    uColor: new Uniform(new Color(1, 0.78, 0.5)),
    uIntensity: new Uniform(1.1),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sun-halo',
    uniforms,
    vertexShader: haloVertex,
    fragmentShader: haloFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}
