/**
 * Anillos de Saturno (D20, fase 3b): una capa de partículas con la profundidad óptica y el albedo de
 * cada anillo (la tira de `build-textures.mjs`, calibrada con la ficha de la NASA) y dispersión
 * simple, la misma fórmula que `ringReflectance` de `ephemeris/photometry.ts`:
 *
 * - Cara iluminada: 2μ₀/(μ₀ + μ) · (1 − e^(−τ(1/μ₀ + 1/μ))). Con el Sol rasante, se apagan.
 * - Cara oscura (la luz que atraviesa): 2μ₀/(μ₀ − μ) · (e^(−τ/μ₀) − e^(−τ/μ)). El denso anillo B
 *   se ve oscuro y los tenues (el C, la división de Cassini) brillan, como en las fotos de Cassini
 *   a contraluz.
 * - Función de fase de las partículas (pico de oposición y un lóbulo hacia delante para el polvo
 *   fino), de `data/photometry.ts`, con el ángulo de fase de un observador lejano.
 * - Lo que tapan de lo que hay detrás: 1 − e^(−τ/μ), más cuanto más rasante es la vista. El color
 *   sale premultiplicado por esa cobertura.
 * - Sombra del planeta: rayo desde cada punto del anillo hacia el Sol contra el elipsoide del
 *   planeta. Todo en el sistema propio del planeta y en radios ecuatoriales.
 */
import { DoubleSide, Texture, Uniform, Vector3 } from 'three';
import type { Photometry } from '../../ephemeris/photometry';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';
import { SHADING_PARS, shadingUniforms } from './shading';

const vertexShader = /* glsl */ `
${DEPTH_VERTEX_PARS}
varying vec2 vUv;
varying vec3 vLocal;

void main() {
  vUv = uv;
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
${SHADING_PARS}
uniform sampler2D uRingMap;
uniform float uHasMap;
uniform vec3 uSunDirectionLocal;
uniform vec3 uCameraLocal;
uniform float uPolarScale;
uniform float uFill;
varying vec2 vUv;
varying vec3 vLocal;

float tlsRingReflectance(float mu0, float mu, float tau, bool litSide) {
  if (mu0 <= 0.0 || tau <= 0.0) return 0.0;
  if (litSide) return 2.0 * mu0 / (mu0 + mu) * (1.0 - exp(-tau * (1.0 / mu0 + 1.0 / mu)));
  if (abs(mu0 - mu) < 1e-4) return 2.0 * tau / mu0 * exp(-tau / mu0);
  return 2.0 * mu0 / (mu0 - mu) * (exp(-tau / mu0) - exp(-tau / mu));
}

void main() {
  ${DEPTH_FRAGMENT}
  vec4 ring = uHasMap > 0.5 ? texture2D(uRingMap, vec2(vUv.x, 0.5)) : vec4(0.45, 0.42, 0.36, 0.6);
  float tau = -log(1.0 - clamp(ring.a, 0.0, 0.995));
  if (tau < 0.002) discard;
  vec3 s = normalize(uSunDirectionLocal);
  vec3 v = normalize(uCameraLocal - vLocal);
  float mu0 = abs(s.y);
  float mu = max(abs(v.y), 0.002);
  bool litSide = s.y * v.y > 0.0;
  // Ángulo de fase de un observador lejano (Sol, centro de Saturno y cámara), como en el material de
  // los cuerpos: con el de cada punto, desde unos radios de distancia, las ansas se verían a ~20° de
  // fase en vez de a los 2° de una foto del Hubble y el pico de oposición las apagaría un 30 %.
  float cosAlpha = clamp(dot(s, normalize(uCameraLocal)), -1.0, 1.0);
  float phase = tlsPhase(acos(cosAlpha), cosAlpha) * uPhaseNorm;
  float reflected = tlsRingReflectance(mu0, mu, tau, litSide) * phase;
  // Sombra del planeta: el elipsoide x² + (y / c)² + z² = 1 se vuelve una esfera escalando y.
  vec3 ps = vec3(vLocal.x, vLocal.y / uPolarScale, vLocal.z);
  vec3 ss = normalize(vec3(s.x, s.y / uPolarScale, s.z));
  float b = dot(ps, ss);
  float disc = b * b - (dot(ps, ps) - 1.0);
  float sunlit = b < 0.0 ? 1.0 - smoothstep(-0.002, 0.002, disc) : 1.0;
  float coverage = 1.0 - exp(-tau / mu);
  vec3 color = ring.rgb * (reflected * sunlit + uFill * coverage);
  gl_FragColor = vec4(color, coverage);
  ${OUTPUT_FRAGMENT}
}
`;

export interface RingMaterialOptions {
  readonly polarScale: number;
  /** Función de fase de las partículas (solo cuentan sus términos de fase). */
  readonly photometry: Photometry;
}

export function createRingMaterial(options: RingMaterialOptions) {
  const uniforms = {
    ...shadingUniforms(options.photometry, null, '#ffffff'),
    uRingMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uSunDirectionLocal: new Uniform(new Vector3(1, 0.3, 0)),
    uCameraLocal: new Uniform(new Vector3(0, 1, 5)),
    uPolarScale: new Uniform(options.polarScale),
    uFill: new Uniform(0),
  };
  const material = sceneShaderMaterial({
    name: 'tls-rings',
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    // El color va multiplicado por la cobertura: se mezcla con (1, 1 − α).
    premultipliedAlpha: true,
    depthWrite: false,
    side: DoubleSide,
  });
  return { material, uniforms };
}
