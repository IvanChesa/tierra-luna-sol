/**
 * Vía Láctea alineada con el cielo real (PLAN, fase 2, 2.c.15): el mapa *Deep Star Maps 2020* del
 * NASA SVS sin las estrellas brillantes (las pone el catálogo HYG), en ascensión recta y declinación
 * ICRF/J2000. Cada fragmento convierte su dirección (ejes de Three) a ECL, de ahí a EQJ y a (AR, Dec).
 *
 * El mapa tiene la AR 0 en el centro y crece hacia la izquierda: u = 0,5 − AR / 360°. En la costura
 * de AR = 180° las derivadas de u saltan; se usa la variante continua de u para elegir el mipmap.
 */
import { AdditiveBlending, BackSide, Matrix3, Texture, Uniform } from 'three';
import { ECL_TO_EQJ } from '../../ephemeris/coordinates';
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
uniform float uSkyDistance;
varying vec3 vDirection;

void main() {
  vDirection = position;
  vec3 direction = mat3(viewMatrix) * position;
  gl_Position = projectionMatrix * vec4(direction * uSkyDistance, 1.0);
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
#include <common>
${DEPTH_FRAGMENT_PARS}
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uIntensity;
uniform mat3 uEclToEqj;
varying vec3 vDirection;

void main() {
  ${DEPTH_FRAGMENT}
  if (uHasMap < 0.5) discard;
  vec3 three = normalize(vDirection);
  // Three (x, y, z) → ECL (x, −z, y) → EQJ.
  vec3 eqj = uEclToEqj * vec3(three.x, -three.z, three.y);
  float ra = atan(eqj.y, eqj.x);
  float dec = asin(clamp(eqj.z, -1.0, 1.0));
  vec2 uv = vec2(fract(0.5 - ra / (2.0 * PI)), dec / PI + 0.5);
  vec2 uvSeam = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  vec2 dxSeam = dFdx(uvSeam);
  vec2 dySeam = dFdy(uvSeam);
  if (dot(dxSeam, dxSeam) + dot(dySeam, dySeam) < dot(dx, dx) + dot(dy, dy)) {
    dx = dxSeam;
    dy = dySeam;
  }
  vec3 color = textureGrad(uMap, uv, dx, dy).rgb;
  gl_FragColor = vec4(color * uIntensity, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

/** ECL → EQJ como `Matrix3` de three (que guarda por columnas). */
function eclToEqjMatrix(): Matrix3 {
  const m = ECL_TO_EQJ;
  return new Matrix3().set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
}

export function createMilkyWayMaterial() {
  const uniforms = {
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uIntensity: new Uniform(0.35),
    uSkyDistance: new Uniform(1),
    uEclToEqj: new Uniform(eclToEqjMatrix()),
  };
  const material = sceneShaderMaterial({
    name: 'tls-milky-way',
    uniforms,
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}
