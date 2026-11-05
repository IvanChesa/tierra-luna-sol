/**
 * El Sol (fase 3b, tarea 6; fase 9b, D41: «real y luminoso», el de la luz visible, como en las imágenes
 * de luz blanca del HMI del SDO): la fotosfera, su granulación, sus manchas y su halo con la corona.
 *
 * - Oscurecimiento del limbo **por canal** (fase 9b; antes, el mismo en los tres): I(μ)/I(1) = μ^α, con
 *   el α de Hestroffer y Magnan (1998) para 650, 550 y 450 nm (`ephemeris/sun.ts`, con sus tests): el
 *   borde, más oscuro y dorado; μ es el coseno entre la normal y la visual.
 * - Color: el del centro del disco que da al disco entero el de un cuerpo negro a la temperatura efectiva
 *   del catálogo (5772 K), en lineal (`solarCenterColor`).
 * - Emite luz (no se ilumina) con intensidad por encima de 1: el tone mapping lleva el centro casi a
 *   blanco y deja ver el tono hacia el borde. Medido en la captura (`scripts/measure-sun.mjs`): con
 *   `?medida=limbo`, el α de cada canal a ±0,003 de la ley.
 * - Granulación **ilustrativa**: celdas claras separadas por calles oscuras (ruido de Worley) que se
 *   mueven despacio con el reloj de pared mientras se pinta (quietas con movimiento reducido y en las
 *   capturas), solo en primer plano. Los gránulos reales (~1000 km) no se distinguirían en el disco
 *   entero: estos son mucho mayores, para que se vea la textura de la superficie.
 * - Manchas **ilustrativas** (`sunspotsAt`): umbra y penumbra de borde irregular, en las bandas de
 *   latitud de las manchas y con la rotación diferencial publicada; no son las de ese día. Fáculas
 *   claras a trozos a su alrededor (en la red de las celdas grandes) y solo hacia el limbo, como en luz
 *   blanca.
 * - El halo es un cuadrado orientado a la cámara, aditivo, con un tamaño mínimo en píxeles para que el
 *   Sol se vea aunque mida menos de un píxel (escala real, desde Neptuno). En primer plano se recoge y
 *   lleva una corona tenue con serpentinas (ilustrativa: la real solo se ve en un eclipse). En los
 *   niveles alto y medio, el resplandor lo pone sobre todo el bloom (`scene/sun-bloom.ts`).
 */
import { AdditiveBlending, Color, Uniform, Vector3, Vector4 } from 'three';
import { SOLAR_LIMB_EXPONENTS } from '../../ephemeris/sun';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from './depth';

/** Plazas de manchas del shader: `VISUAL_CONFIG.sun.spots.count` no puede pasar de aquí. */
export const MAX_SUNSPOTS = 8;

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
uniform vec3 uLimbExponent;
uniform float uGranulation;
uniform float uGranuleScale;
uniform float uTime;
// Cada mancha: su dirección en el sistema propio del Sol (xyz) y el radio angular de su umbra (w, rad).
uniform vec4 uSpots[${MAX_SUNSPOTS}];
uniform float uSpotPresence[${MAX_SUNSPOTS}];
// (brillo de la umbra, brillo de la penumbra, radio de la penumbra en radios de la umbra)
uniform vec3 uSpotShade;
uniform float uFaculae;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocal;

vec3 tlsHash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

// Granulación (ilustrativa): ruido de Worley, 1 dentro de cada gránulo y 0 en las calles que los
// separan; cada punto de la celda se mueve despacio con el tiempo (los gránulos evolucionan).
float tlsGranules(vec3 x, float t) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int k = -1; k <= 1; k++) {
        vec3 g = vec3(float(k), float(y), float(z));
        vec3 o = 0.5 + 0.42 * sin(t + 6.2831853 * tlsHash3(i + g));
        float d = length(g + o - f);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
  }
  return smoothstep(0.0, 0.3, f2 - f1);
}

// Ruido de valor barato (para el borde irregular de las manchas).
float tlsHash1(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float tlsValueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(tlsHash1(i), tlsHash1(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(tlsHash1(i + vec3(0.0, 1.0, 0.0)), tlsHash1(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(tlsHash1(i + vec3(0.0, 0.0, 1.0)), tlsHash1(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(tlsHash1(i + vec3(0.0, 1.0, 1.0)), tlsHash1(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

void main() {
  ${DEPTH_FRAGMENT}
  float mu = clamp(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0, 1.0);
  vec3 limb = pow(vec3(max(mu, 1e-4)), uLimbExponent);
  vec3 p = normalize(vLocal);
  float grain = 1.0;
  if (uGranulation > 0.0) {
    grain = 1.0 + uGranulation * (tlsGranules(p * uGranuleScale, uTime) - 0.6) * 2.0;
  }
  float shade = 1.0;
  float facula = 0.0;
  for (int i = 0; i < ${MAX_SUNSPOTS}; i++) {
    float presence = uSpotPresence[i];
    if (presence <= 0.0) continue;
    vec4 spot = uSpots[i];
    // El ángulo hasta la mancha (preciso también a ángulos pequeños).
    float d = atan(length(cross(p, spot.xyz)), dot(p, spot.xyz));
    float outer = spot.w * uSpotShade.z;
    if (d > 3.5 * outer) continue;
    // Bordes irregulares: la distancia, deformada por un ruido de unas décimas de grado.
    float rough = d * (1.0 + 0.4 * (tlsValueNoise(p * 160.0 + float(i) * 7.3) - 0.5));
    float umbra = 1.0 - smoothstep(0.7 * spot.w, spot.w, rough);
    float penumbra = 1.0 - smoothstep(0.8 * outer, outer, rough);
    float level = mix(mix(1.0, uSpotShade.y, penumbra), uSpotShade.x, umbra);
    shade = min(shade, mix(1.0, level, presence));
    facula = max(facula, presence * (1.0 - smoothstep(outer, 3.5 * outer, d)) * (1.0 - penumbra));
  }
  // Las fáculas: claras alrededor de las manchas, a trozos, siguiendo la red de celdas grandes (como
  // la red magnética de los bordes de la supergranulación), y solo hacia el limbo (en el centro no se
  // ven). Solo se calculan cerca de una mancha.
  float faculae = 1.0;
  if (facula > 0.001 && uFaculae > 0.0) {
    float network = 1.0 - tlsGranules(p * uGranuleScale * 0.35, 0.0);
    faculae += uFaculae * facula * network * (1.0 - mu) * (1.0 - mu);
  }
  gl_FragColor = vec4(uColor * limb * grain * shade * faculae * uIntensity, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createSunMaterial(color: Color) {
  const [red, green, blue] = SOLAR_LIMB_EXPONENTS;
  const uniforms = {
    uColor: new Uniform(color),
    uIntensity: new Uniform(2.6),
    uLimbExponent: new Uniform(new Vector3(red, green, blue)),
    /** Amplitud de la granulación (0: sin ella; la configuración visual la da en primer plano). */
    uGranulation: new Uniform(0),
    /** Gránulos por radio del Sol (ilustrativo). */
    uGranuleScale: new Uniform(40),
    /** Tiempo de la granulación (s del reloj de pared, a su ritmo lento). */
    uTime: new Uniform(0),
    uSpots: new Uniform(Array.from({ length: MAX_SUNSPOTS }, () => new Vector4(1, 0, 0, 0))),
    uSpotPresence: new Uniform(new Array<number>(MAX_SUNSPOTS).fill(0)),
    uSpotShade: new Uniform(new Vector3(0.2, 0.7, 2.4)),
    uFaculae: new Uniform(0),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sun',
    uniforms,
    vertexShader: sunVertex,
    fragmentShader: sunFragment,
  });
  return { material, uniforms };
}

/**
 * La corona (ilustrativa), en GLSL, para el halo del Sol en primer plano y para el cielo en la
 * totalidad: su brillo relativo a `rho` radios del centro del Sol (rho ≥ 1) en el ángulo `theta` (rad)
 * medido desde su polo norte (junto al limbo, de unas décimas entre las serpentinas a 2 o 3 en ellas;
 * quien la usa le pone su intensidad). Una parte casi redonda que cae como rho^−3 (la corona K, de
 * media) y serpentinas a varias latitudes que se afilan al alejarse, más plumas finas en los polos;
 * `roundness` (0–1) la acerca a la del máximo del ciclo, redonda.
 */
export const CORONA_GLSL = /* glsl */ `
float tlsLobe(float theta, float center, float width) {
  float d = mod(theta - center + 3.14159265, 6.2831853) - 3.14159265;
  return exp(-(d * d) / (width * width));
}

float tlsCorona(float rho, float theta, float roundness) {
  float taper = inversesqrt(max(rho, 1.0));
  float streamers =
    tlsLobe(theta, 1.50, 0.30 * taper) +
    tlsLobe(theta, -1.62, 0.34 * taper) +
    0.7 * tlsLobe(theta, 1.98, 0.18 * taper) +
    0.6 * tlsLobe(theta, -1.12, 0.20 * taper) +
    0.45 * tlsLobe(theta, 1.08, 0.15 * taper) +
    0.4 * tlsLobe(theta, -2.12, 0.16 * taper);
  float plumes = pow(abs(cos(theta)), 30.0) * (0.5 + 0.5 * cos(theta * 22.0)) * 0.35;
  float base = mix(0.35, 1.0, roundness);
  float shape = base + mix(1.6, 0.6, roundness) * streamers + (1.0 - roundness) * plumes;
  return shape * pow(rho, -3.0);
}
`;

const haloVertex = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform float uRadius;
uniform float uSunRadius;
uniform float uMinPixels;
uniform float uViewportHeight;
varying vec2 vOffset;
varying float vDisc;

void main() {
  vOffset = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // Unidades de escena por píxel a la distancia del Sol (perspectiva).
  float unitsPerPixel = -center.z * 2.0 / (uViewportHeight * projectionMatrix[1][1]);
  float size = max(uRadius, uMinPixels * unitsPerPixel);
  // El radio del disco del Sol en las unidades del cuadrado (para la corona).
  vDisc = uSunRadius / size;
  gl_Position = projectionMatrix * (center + vec4(position.xy * size, 0.0, 0.0));
  ${DEPTH_VERTEX}
}
`;

const haloFragment = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
uniform vec3 uColor;
uniform float uIntensity;
uniform float uCorona;
uniform vec3 uCoronaColor;
uniform float uPoleAngle;
uniform float uRoundness;
varying vec2 vOffset;
varying float vDisc;
${CORONA_GLSL}

void main() {
  ${DEPTH_FRAGMENT}
  float r = length(vOffset);
  if (r > 1.0) discard;
  vec3 color = uColor * pow(1.0 - r, 2.6) * uIntensity;
  // La corona, fuera del disco y hasta el borde del cuadrado (en primer plano).
  if (uCorona > 0.0 && r > vDisc) {
    float rho = r / vDisc;
    float theta = atan(vOffset.y, vOffset.x) - uPoleAngle;
    float fade = smoothstep(vDisc, vDisc * 1.03, r) * (1.0 - smoothstep(0.7, 1.0, r));
    color += uCoronaColor * tlsCorona(rho, theta, uRoundness) * uCorona * fade;
  }
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createHaloMaterial() {
  const uniforms = {
    uRadius: new Uniform(1),
    /** Radio del disco del Sol (unidades de escena), para la corona. */
    uSunRadius: new Uniform(0.5),
    uMinPixels: new Uniform(26),
    uViewportHeight: new Uniform(800),
    uColor: new Uniform(new Color(1, 0.78, 0.5)),
    uIntensity: new Uniform(1.1),
    /** Brillo de la corona (0: sin ella; solo en primer plano). */
    uCorona: new Uniform(0),
    uCoronaColor: new Uniform(new Color(1, 0.96, 0.9)),
    /** Ángulo en pantalla del polo norte del Sol (rad), para orientar las serpentinas. */
    uPoleAngle: new Uniform(Math.PI / 2),
    /** De 0 (la corona del mínimo, con serpentinas) a 1 (la del máximo, redonda). */
    uRoundness: new Uniform(0.4),
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
