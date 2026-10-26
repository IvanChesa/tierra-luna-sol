/**
 * El Sol (fase 3b, tarea 6): la fotosfera con el oscurecimiento del limbo medido, el color de su
 * temperatura efectiva, una granulación procedural tenue y un halo.
 *
 * - Oscurecimiento del limbo: la ley cuadrática a 550 nm de Allen's Astrophysical Quantities
 *   (Cox, 2000), I(μ)/I(1) = 0,3 + 0,93·μ − 0,23·μ², con μ el coseno entre la normal y la visual
 *   (`solarLimbDarkening` de `ephemeris/photometry.ts`, con su test). El borde queda al 30 %.
 * - Color: el de un cuerpo negro a la temperatura efectiva del catálogo (5772 K), en lineal.
 * - Emite luz (no se ilumina) con intensidad por encima de 1: el tone mapping lo lleva casi a blanco
 *   en el centro y deja ver el tono hacia el borde, más oscuro.
 * - Granulación: ruido procedural en la esfera que cambia despacio con el reloj de pared (quieto con
 *   movimiento reducido y en las capturas) y solo en primer plano. Es ilustrativa: los gránulos
 *   reales (~1000 km) no se distinguirían en el disco entero; esto es un moteado del 5 % que da
 *   textura a la superficie.
 * - El halo es un cuadrado orientado a la cámara, aditivo, con un tamaño mínimo en píxeles para que
 *   el Sol se vea aunque mida menos de un píxel (escala real, desde Neptuno). En primer plano se
 *   recoge (configuración visual).
 */
import { AdditiveBlending, Color, Uniform, Vector3 } from 'three';
import { SOLAR_LIMB_DARKENING } from '../../ephemeris/photometry';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';

const sunVertex = /* glsl */ `
${DEPTH_VERTEX_PARS}
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocal;

void main() {
  vLocal = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  ${DEPTH_VERTEX}
}
`;

const sunFragment = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform vec3 uColor;
uniform float uIntensity;
uniform vec3 uLimb;
uniform float uGranulation;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocal;

float tlsHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float tlsValueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(tlsHash(i), tlsHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(tlsHash(i + vec3(0.0, 1.0, 0.0)), tlsHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(tlsHash(i + vec3(0.0, 0.0, 1.0)), tlsHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(tlsHash(i + vec3(0.0, 1.0, 1.0)), tlsHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

void main() {
  ${DEPTH_FRAGMENT}
  float mu = clamp(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0, 1.0);
  float limb = uLimb.x + uLimb.y * mu + uLimb.z * mu * mu;
  float grain = 1.0;
  if (uGranulation > 0.0) {
    vec3 q = normalize(vLocal) * 38.0 + vec3(0.0, 0.0, uTime);
    float n = 0.5 * tlsValueNoise(q) + 0.3 * tlsValueNoise(q * 2.3 + 7.1) + 0.2 * tlsValueNoise(q * 5.1 + 3.7);
    grain = 1.0 + uGranulation * (n - 0.5) * 2.0;
  }
  gl_FragColor = vec4(uColor * limb * grain * uIntensity, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createSunMaterial(color: Color) {
  const [a, b, c] = SOLAR_LIMB_DARKENING;
  const uniforms = {
    uColor: new Uniform(color),
    uIntensity: new Uniform(2.6),
    uLimb: new Uniform(new Vector3(a, b, c)),
    /** Amplitud de la granulación (0: sin ella; la configuración visual la da en primer plano). */
    uGranulation: new Uniform(0),
    /** Tiempo de la granulación (s del reloj de pared, a su ritmo lento). */
    uTime: new Uniform(0),
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
