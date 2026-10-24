/**
 * Material de los planetas y las lunas (D20, D21).
 *
 * - Luz del Sol sin atenuación por distancia (D21) y con su dirección REAL: la calcula el motor con
 *   la geometría verdadera en float64, no con la posición del Sol en la escena. Así ningún marco de
 *   escala puede falsear una fase o una estación.
 * - Lambert con un poco de luz ambiente (documentado: deja ver la forma del lado nocturno).
 * - Sombra analítica de los anillos sobre el planeta (Saturno): desde cada punto de la superficie se
 *   lanza un rayo hacia el Sol y, si cruza el plano de los anillos entre sus bordes, se atenúa con
 *   la opacidad del anillo en ese radio. Todo en el sistema propio del planeta, en radios.
 *
 * La geometría es la esfera unidad (Y = polo, meridiano 0 en +X, como `SphereGeometry`); el
 * elipsoide sale de la escala de la malla (radio ecuatorial, polar, ecuatorial).
 */
import { Color, Texture, Uniform, Vector2, Vector3 } from 'three';
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
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDirection;
varying vec3 vLocal;

void main() {
  vUv = uv;
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  vSunDirection = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uMeridianOffset;
uniform float uAmbient;
uniform float uRingShadow;
uniform vec3 uSunDirectionLocal;
uniform float uPolarScale;
uniform vec2 uRingRadii;
uniform sampler2D uRingMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDirection;
varying vec3 vLocal;

float ringShadow() {
  // Punto de la superficie en radios ecuatoriales, en el sistema propio (Y = polo).
  vec3 p = vLocal * vec3(1.0, uPolarScale, 1.0);
  vec3 s = normalize(uSunDirectionLocal);
  if (abs(s.y) < 1e-5) return 1.0;
  float t = -p.y / s.y;
  if (t <= 0.0) return 1.0;
  float r = length((p + t * s).xz);
  float u = (r - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
  if (u < 0.0 || u > 1.0) return 1.0;
  return 1.0 - texture2D(uRingMap, vec2(u, 0.5)).a;
}

void main() {
  ${DEPTH_FRAGMENT}
  vec3 albedo = uHasMap > 0.5 ? texture2D(uMap, vec2(vUv.x + uMeridianOffset, vUv.y)).rgb : uColor;
  float light = max(dot(normalize(vNormal), vSunDirection), 0.0);
  if (uRingShadow > 0.5 && light > 0.0) light *= ringShadow();
  gl_FragColor = vec4(albedo * (light + uAmbient), 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export interface BodyMaterialUniforms {
  readonly uMap: Uniform<Texture | null>;
  readonly uHasMap: Uniform<number>;
  readonly uColor: Uniform<Color>;
  readonly uMeridianOffset: Uniform<number>;
  readonly uAmbient: Uniform<number>;
  /** Dirección hacia el Sol en el mundo (ejes de Three, unitaria). */
  readonly uSunDirection: Uniform<Vector3>;
  readonly uRingShadow: Uniform<number>;
  /** Dirección hacia el Sol en el sistema propio del planeta (para la sombra de los anillos). */
  readonly uSunDirectionLocal: Uniform<Vector3>;
  /** Radio polar / ecuatorial = 1 − achatamiento. */
  readonly uPolarScale: Uniform<number>;
  /** Bordes interior y exterior de los anillos, en radios ecuatoriales. */
  readonly uRingRadii: Uniform<Vector2>;
  readonly uRingMap: Uniform<Texture | null>;
}

/** Luz ambiente: deja intuir el lado nocturno sin falsear el terminador. */
export const BODY_AMBIENT = 0.025;

export function createBodyMaterial(color: Color, polarScale = 1) {
  const uniforms: BodyMaterialUniforms = {
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uColor: new Uniform(color),
    uMeridianOffset: new Uniform(0),
    uAmbient: new Uniform(BODY_AMBIENT),
    uSunDirection: new Uniform(new Vector3(1, 0, 0)),
    uRingShadow: new Uniform(0),
    uSunDirectionLocal: new Uniform(new Vector3(1, 0, 0)),
    uPolarScale: new Uniform(polarScale),
    uRingRadii: new Uniform(new Vector2(1, 2)),
    uRingMap: new Uniform<Texture | null>(null),
  };
  const material = sceneShaderMaterial({
    name: 'tls-body',
    uniforms: uniforms as unknown as Record<string, Uniform>,
    vertexShader,
    fragmentShader,
  });
  return { material, uniforms };
}
