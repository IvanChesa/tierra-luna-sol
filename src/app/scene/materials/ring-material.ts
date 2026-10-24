/**
 * Anillos de Saturno (D20): color y opacidad de la textura a lo largo del radio, iluminación según
 * la cara que se ve y sombra analítica del planeta sobre los anillos.
 *
 * - Cara iluminada: reflexión de Lommel–Seeliger, I ∝ μ₀ / (μ₀ + μ), con μ₀ y μ los senos de las
 *   elevaciones del Sol y del observador sobre el plano. Con el Sol rasante, los anillos se apagan.
 * - Cara en sombra: solo la luz que atraviesa; las zonas más transparentes (anillo C, división de
 *   Cassini) brillan más que el denso anillo B, como en las imágenes de Cassini.
 * - Sombra del planeta: rayo desde cada punto del anillo hacia el Sol contra el elipsoide del
 *   planeta. Todo en el sistema propio del planeta y en radios ecuatoriales.
 */
import { DoubleSide, Texture, Uniform, Vector3 } from 'three';
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
uniform sampler2D uRingMap;
uniform float uHasMap;
uniform vec3 uSunDirectionLocal;
uniform vec3 uCameraLocal;
uniform float uPolarScale;
uniform float uAmbient;
varying vec2 vUv;
varying vec3 vLocal;

void main() {
  ${DEPTH_FRAGMENT}
  vec4 ring = uHasMap > 0.5 ? texture2D(uRingMap, vec2(vUv.x, 0.5)) : vec4(0.8, 0.75, 0.65, 0.6);
  if (ring.a < 0.01) discard;
  vec3 s = normalize(uSunDirectionLocal);
  vec3 v = normalize(uCameraLocal - vLocal);
  float mu0 = abs(s.y);
  float mu = abs(v.y);
  float lommel = mu0 / max(mu0 + mu, 1e-4);
  bool litSide = s.y * v.y > 0.0;
  float brightness = litSide ? 2.0 * lommel : 1.2 * lommel * (1.0 - ring.a);
  // Sombra del planeta: el elipsoide x² + (y / c)² + z² = 1 se vuelve una esfera escalando y.
  vec3 ps = vec3(vLocal.x, vLocal.y / uPolarScale, vLocal.z);
  vec3 ss = normalize(vec3(s.x, s.y / uPolarScale, s.z));
  float b = dot(ps, ss);
  float disc = b * b - (dot(ps, ps) - 1.0);
  float lit = (disc > 0.0 && b < 0.0) ? 0.0 : 1.0;
  gl_FragColor = vec4(ring.rgb * (brightness * lit + uAmbient), ring.a);
  ${OUTPUT_FRAGMENT}
}
`;

export function createRingMaterial(polarScale: number) {
  const uniforms = {
    uRingMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uSunDirectionLocal: new Uniform(new Vector3(1, 0.3, 0)),
    uCameraLocal: new Uniform(new Vector3(0, 1, 5)),
    uPolarScale: new Uniform(polarScale),
    uAmbient: new Uniform(0.02),
  };
  const material = sceneShaderMaterial({
    name: 'tls-rings',
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  return { material, uniforms };
}
