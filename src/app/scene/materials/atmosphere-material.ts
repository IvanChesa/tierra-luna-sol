/**
 * Halo de las atmósferas (D29): una esfera algo mayor que el cuerpo, con mezcla aditiva, que pinta la
 * luz que dispersa la atmósfera por encima del limbo (el disco ya lleva la suya, `shading.ts`).
 *
 * Para cada píxel se busca el punto del rayo de visión más cercano al centro del cuerpo: su altura
 * sobre la superficie da la densidad (exponencial, con la escala `uScaleHeight` en radios) y su
 * normal, si el Sol lo ilumina (con el mismo crepúsculo que el disco). A contraluz, la dispersión
 * hacia delante lo refuerza: el anillo de luz de Venus o de Titán con el Sol detrás. Es una
 * aproximación barata y documentada, no una integración de la dispersión.
 */
import { AdditiveBlending, Uniform, Vector3, Vector4 } from 'three';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';

/** Radio de la esfera del halo, en radios del cuerpo y en alturas de escala: el halo cabe entero. */
export const ATMOSPHERE_SHELL_HEIGHTS = 5;

const vertexShader = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform vec3 uSunDirection;
varying vec3 vViewPosition;
varying vec3 vCenter;
varying vec3 vSunDirection;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vSunDirection = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
  gl_Position = projectionMatrix * mvPosition;
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform float uRadius;
uniform float uScaleHeight;
uniform vec4 uHaze;
uniform vec4 uHazeColor;
varying vec3 vViewPosition;
varying vec3 vCenter;
varying vec3 vSunDirection;

float tlsHenyeyGreenstein(float cosAlpha, float g) {
  return (1.0 - g * g) / pow(1.0 + 2.0 * g * cosAlpha + g * g, 1.5);
}

void main() {
  ${DEPTH_FRAGMENT}
  vec3 ray = normalize(vViewPosition);
  float along = dot(vCenter, ray);
  if (along <= 0.0) discard;
  vec3 offset = ray * along - vCenter;
  float impact = length(offset) / uRadius;
  float height = impact - 1.0;
  // Fuera del disco, la densidad cae con la altura; dentro, solo una banda fina junto al limbo
  // (el resto lo pinta el material del cuerpo).
  float density = height >= 0.0
    ? exp(-height / uScaleHeight)
    : exp(height / (0.35 * uScaleHeight));
  vec3 toSun = normalize(vSunDirection);
  float lit = smoothstep(-uHaze.z, uHaze.z, dot(normalize(offset), toSun));
  float g = uHazeColor.w;
  // Ángulo de fase de un observador lejano, como en el disco (body-material.ts).
  float cosAlpha = dot(toSun, normalize(-vCenter));
  float forward = 1.0 + uHaze.w * tlsHenyeyGreenstein(cosAlpha, g) / tlsHenyeyGreenstein(-1.0, g);
  float glow = uHaze.x * density * lit * forward;
  gl_FragColor = vec4(uHazeColor.rgb * glow, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export interface AtmosphereUniforms {
  /** Radio ecuatorial del cuerpo en unidades de escena (lo pone el motor en cada frame). */
  readonly uRadius: Uniform<number>;
  /** Altura de escala del halo, en radios del cuerpo (ajuste visual). */
  readonly uScaleHeight: Uniform<number>;
  /** Los mismos de la atmósfera del cuerpo (`shading.ts`). */
  readonly uHaze: Uniform<Vector4>;
  readonly uHazeColor: Uniform<Vector4>;
  /** El mismo vector que usa el material del cuerpo: no hay que copiarlo en cada frame. */
  readonly uSunDirection: Uniform<Vector3>;
}

export function createAtmosphereMaterial(uniforms: AtmosphereUniforms) {
  const material = sceneShaderMaterial({
    name: 'tls-atmosphere',
    uniforms: uniforms as unknown as Record<string, Uniform>,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}
