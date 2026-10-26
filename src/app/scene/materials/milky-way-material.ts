/**
 * Vía Láctea alineada con el cielo real (fase 3b, tarea 5b): el panorama «The Milky Way panorama» de
 * ESO/S. Brunier (CC BY 4.0), en coordenadas galácticas, con la longitud 0 (el centro galáctico) en el
 * centro y creciendo hacia la izquierda y el norte galáctico arriba. Cada fragmento convierte su
 * dirección (ejes de Three) a ECL y de ahí a galácticas con la matriz de `ephemeris/coordinates.ts`
 * (sistema de Hipparcos, testada con el centro galáctico, el polo y Vega): u = 0,5 − l / 360°,
 * v = 0,5 + b / 180°.
 *
 * Brillo sutil, por debajo de las estrellas del catálogo HYG, que se pintan encima. En la costura de
 * l = 180° las derivadas de u saltan; se usa la variante continua de u para elegir el mipmap.
 */
import { AdditiveBlending, BackSide, Matrix3, Texture, Uniform } from 'three';
import { ECL_TO_GALACTIC } from '../../ephemeris/coordinates';
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
uniform mat3 uEclToGalactic;
varying vec3 vDirection;

void main() {
  ${DEPTH_FRAGMENT}
  if (uHasMap < 0.5) discard;
  vec3 three = normalize(vDirection);
  // Three (x, y, z) → ECL (x, −z, y) → galácticas.
  vec3 galactic = uEclToGalactic * vec3(three.x, -three.z, three.y);
  float l = atan(galactic.y, galactic.x);
  float b = asin(clamp(galactic.z, -1.0, 1.0));
  vec2 uv = vec2(fract(0.5 - l / (2.0 * PI)), b / PI + 0.5);
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

/** ECL → galácticas como `Matrix3` de three (que guarda por columnas; `set` recibe filas). */
function eclToGalacticMatrix(): Matrix3 {
  const m = ECL_TO_GALACTIC;
  return new Matrix3().set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
}

/** Brillo del panorama: tenue, para que no compita con las estrellas ni con los cuerpos. */
export const MILKY_WAY_INTENSITY = 0.35;

export function createMilkyWayMaterial() {
  const uniforms = {
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uIntensity: new Uniform(MILKY_WAY_INTENSITY),
    uSkyDistance: new Uniform(1),
    uEclToGalactic: new Uniform(eclToGalacticMatrix()),
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
