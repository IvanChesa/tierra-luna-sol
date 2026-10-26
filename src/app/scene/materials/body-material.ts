/**
 * Material de los planetas y las lunas (D20, D21, D29).
 *
 * - Luz del Sol sin atenuación por distancia (D21) y con su dirección REAL: la calcula el motor con
 *   la geometría verdadera en float64, no con la posición del Sol en la escena. Así ningún marco de
 *   escala puede falsear una fase o una estación.
 * - Sombreado físico por tipo de cuerpo (D29, `shading.ts`): Lommel–Seeliger en los rocosos,
 *   Minnaert en los gigantes y una atmósfera aproximada en el limbo y el crepúsculo.
 * - Brillo calibrado: el color de la textura por `uAlbedoScale` hace que el disco lleno valga el
 *   albedo geométrico del cuerpo. La luz ambiente plana ya no existe: solo un relleno ilustrativo
 *   (`uFill`, del módulo de configuración visual) que mira a la cámara.
 * - Relieve (fase 3b): mapa de normales en el marco tangente este–norte–arriba, que sale de la
 *   posición en el sistema propio del cuerpo (no hacen falta atributos de tangentes).
 * - Sombra analítica de los anillos sobre el planeta (Saturno): desde cada punto de la superficie se
 *   lanza un rayo hacia el Sol y, si cruza el plano de los anillos entre sus bordes, se atenúa con
 *   la transmisión del anillo en ese radio por el camino inclinado de la luz, e^(−τ/μ₀) (con la
 *   profundidad óptica física de la tira). Todo en el sistema propio del planeta, en radios.
 *
 * La geometría es la esfera unidad (Y = polo, meridiano 0 en +X, longitud este hacia −Z, como
 * `SphereGeometry`); el elipsoide sale de la escala de la malla (radio ecuatorial, polar, ecuatorial).
 */
import { Color, Texture, Uniform, Vector2, Vector3, Vector4 } from 'three';
import type { Haze, Photometry } from '../../ephemeris/photometry';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';
import { SHADING_PARS, ShadingUniforms, shadingUniforms } from './shading';

const vertexShader = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform vec3 uSunDirection;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDirection;
varying vec3 vLocal;
varying vec3 vViewPosition;
varying vec3 vEast;
varying vec3 vNorth;

void main() {
  vUv = uv;
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  // Marco tangente del relieve: este y norte en el sistema propio, llevados a la vista.
  vec3 up = normalize(position);
  vec3 east = vec3(up.z, 0.0, -up.x);
  float eastLength = length(east);
  east = eastLength > 1e-5 ? east / eastLength : vec3(1.0, 0.0, 0.0);
  vEast = normalize((modelViewMatrix * vec4(east, 0.0)).xyz);
  vNorth = normalize((modelViewMatrix * vec4(cross(up, east), 0.0)).xyz);
  vSunDirection = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  ${DEPTH_VERTEX}
}
`;

const fragmentShader = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
${SHADING_PARS}
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uMeridianOffset;
uniform float uAlbedoScale;
uniform vec4 uChromaticity;
uniform float uFill;
uniform sampler2D uNormalMap;
uniform float uNormalStrength;
uniform float uRingShadow;
uniform float uRingShine;
uniform vec3 uSunDirectionLocal;
uniform float uPolarScale;
uniform vec2 uRingRadii;
uniform sampler2D uRingMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDirection;
varying vec3 vLocal;
varying vec3 vViewPosition;
varying vec3 vEast;
varying vec3 vNorth;

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
  float tau = -log(1.0 - clamp(texture2D(uRingMap, vec2(u, 0.5)).a, 0.0, 0.995));
  return exp(-tau / max(abs(s.y), 1e-3));
}

// Normal con el relieve: el mapa guarda (este, norte, arriba) en [0, 1].
vec3 reliefNormal(vec3 geometric, vec2 uv) {
  vec3 t = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
  t.xy *= uNormalStrength;
  return normalize(normalize(vEast) * t.x + normalize(vNorth) * t.y + geometric * max(t.z, 0.05));
}

void main() {
  ${DEPTH_FRAGMENT}
  vec2 uv = vec2(vUv.x + uMeridianOffset, vUv.y);
  vec3 base = uHasMap > 0.5 ? texture2D(uMap, uv).rgb : uColor;
  // Color medido (data/photometry.ts): la textura conserva su luminancia y toma esa cromaticidad.
  if (uChromaticity.w > 0.0) {
    float luminance = dot(base, vec3(0.2126, 0.7152, 0.0722));
    base = mix(base, luminance * uChromaticity.rgb, uChromaticity.w);
  }
  vec3 albedo = base * uAlbedoScale;
  vec3 geometric = normalize(vNormal);
  vec3 normal = uNormalStrength > 0.0 ? reliefNormal(geometric, uv) : geometric;
  vec3 toSun = normalize(vSunDirection);
  vec3 toViewer = normalize(-vViewPosition);
  float cosAlpha = clamp(dot(toSun, toViewer), -1.0, 1.0);
  float alpha = acos(cosAlpha);
  float light = tlsReflectance(dot(normal, toSun), dot(normal, toViewer), alpha, cosAlpha);
  float muViewer = dot(geometric, toViewer);
  float haze = tlsHaze(dot(geometric, toSun), muViewer, cosAlpha);
  if (uRingShadow > 0.5 && (light > 0.0 || haze > 0.0)) {
    float shadow = ringShadow();
    light *= shadow;
    haze *= shadow;
  }
  // Relleno ilustrativo (configuración visual): una luz suave desde la cámara.
  vec3 fill = albedo * uFill * (0.25 + 0.75 * max(muViewer, 0.0));
  // Luz de los anillos (Saturno): la cara iluminada de los anillos alumbra el hemisferio que la ve,
  // más cuanto más alto está el Sol sobre ellos (aproximación; se nota en el lado nocturno).
  if (uRingShine > 0.0) {
    vec3 sunLocal = normalize(uSunDirectionLocal);
    float facing = max(normalize(vLocal).y * sign(sunLocal.y), 0.0);
    fill += albedo * uRingShine * abs(sunLocal.y) * facing;
  }
  gl_FragColor = vec4(albedo * light + uHazeColor.rgb * haze + fill, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export interface BodyMaterialUniforms extends ShadingUniforms {
  readonly uMap: Uniform<Texture | null>;
  readonly uHasMap: Uniform<number>;
  readonly uColor: Uniform<Color>;
  readonly uMeridianOffset: Uniform<number>;
  /** Lleva la textura (o el color) al albedo geométrico del cuerpo (D29). */
  readonly uAlbedoScale: Uniform<number>;
  /** Cromaticidad medida (rgb) y cuánto se aplica (w; 0 = el color de la textura). */
  readonly uChromaticity: Uniform<Vector4>;
  /** Relleno ilustrativo, en fracción de la luz del Sol (configuración visual). */
  readonly uFill: Uniform<number>;
  readonly uNormalMap: Uniform<Texture | null>;
  /** Intensidad del relieve (0 = sin mapa de normales). */
  readonly uNormalStrength: Uniform<number>;
  /** Dirección hacia el Sol en el mundo (ejes de Three, unitaria). */
  readonly uSunDirection: Uniform<Vector3>;
  readonly uRingShadow: Uniform<number>;
  /** Luz de los anillos sobre el planeta (0 = sin anillos). */
  readonly uRingShine: Uniform<number>;
  /** Dirección hacia el Sol en el sistema propio del planeta (para la sombra de los anillos). */
  readonly uSunDirectionLocal: Uniform<Vector3>;
  /** Radio polar / ecuatorial = 1 − achatamiento. */
  readonly uPolarScale: Uniform<number>;
  /** Bordes interior y exterior de los anillos, en radios ecuatoriales. */
  readonly uRingRadii: Uniform<Vector2>;
  readonly uRingMap: Uniform<Texture | null>;
}

export interface BodyMaterialOptions {
  readonly color: Color;
  readonly polarScale: number;
  readonly photometry: Photometry;
  readonly haze: Haze | null;
  readonly hazeColor: string;
}

export function createBodyMaterial(options: BodyMaterialOptions) {
  const uniforms: BodyMaterialUniforms = {
    ...shadingUniforms(options.photometry, options.haze, options.hazeColor),
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uColor: new Uniform(options.color),
    uMeridianOffset: new Uniform(0),
    uAlbedoScale: new Uniform(1),
    uChromaticity: new Uniform(new Vector4(1, 1, 1, 0)),
    uFill: new Uniform(0),
    uNormalMap: new Uniform<Texture | null>(null),
    uNormalStrength: new Uniform(0),
    uSunDirection: new Uniform(new Vector3(1, 0, 0)),
    uRingShadow: new Uniform(0),
    uRingShine: new Uniform(0),
    uSunDirectionLocal: new Uniform(new Vector3(1, 0, 0)),
    uPolarScale: new Uniform(options.polarScale),
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
