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
 * - **El Sol realzado** (fase 9b, D46, decisión de Iván del 06-11; ilustrativo), el del explorador
 *   (`uEnhance` = 1): una paleta naranja del centro al borde con el brillo del oscurecimiento del limbo
 *   por canal (su luminancia: la forma del perfil sigue siendo la medida), zonas claras y oscuras a
 *   gran escala que evolucionan despacio, rayos suaves en el resplandor y, en primer plano,
 *   protuberancias en el limbo (en el halo). Con luz visible normal el Sol es blanco: el de `/cielo`
 *   (otro shader, `sky/`) y el de `?medida=limbo` siguen siendo el de D41. Los valores, en
 *   `VISUAL_CONFIG.sun.enhanced`.
 */
import { AdditiveBlending, Color, Uniform, Vector2, Vector3, Vector4 } from 'three';
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
// El Sol realzado del explorador (fase 9b, D46): 0, el de la luz visible (D41); 1, el de color realzado,
// con su paleta (el color del centro y del borde, lineales) y su estructura a gran escala (amplitud y
// tiempo, s, de su evolución lenta; quieta con movimiento reducido y en las capturas).
uniform float uEnhance;
uniform vec3 uEnhanceCenter;
uniform vec3 uEnhanceLimb;
uniform float uStructure;
uniform float uStructureTime;
// Los bordes (smoothstep) que llevan el ruido de la estructura a manchas claras y oscuras.
uniform vec2 uStructureEdges;
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

// La estructura a gran escala del Sol realzado (D46, ilustrativa): zonas claras y oscuras a tres
// escalas (ruido de valor en 3D sobre la esfera), retorcidas por otro ruido más ancho (como las
// regiones activas y la red que las une, no como manchas redondas), que evolucionan despacio. De −1 a
// 1, de media 0.
float tlsSunStructure(vec3 p, float t) {
  vec3 drift = vec3(0.0, t * 0.004, t * 0.003);
  vec3 warp = vec3(
    tlsValueNoise(p * 1.7 + drift + 3.1),
    tlsValueNoise(p * 1.7 - drift + 7.9),
    tlsValueNoise(p * 1.7 + drift.zyx + 13.7)
  ) - 0.5;
  vec3 q = p + 0.45 * warp;
  float large = tlsValueNoise(q * 3.2 + drift);
  float medium = tlsValueNoise(q * 8.0 - drift * 1.7 + 17.0);
  float small = tlsValueNoise(q * 19.0 + drift * 2.3 + 41.0);
  return (0.42 * large + 0.36 * medium + 0.22 * small - 0.5) * 2.0;
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
  vec3 surface = uColor * limb;
  if (uEnhance > 0.0) {
    // El realzado (D46): la paleta, del borde al centro, con el brillo del oscurecimiento del limbo
    // por canal (su luminancia: la forma del perfil de la 9b.c), y la estructura a gran escala, que
    // también mueve el color: lo claro, hacia el del centro (más amarillo); lo oscuro, hacia el del
    // borde (más anaranjado).
    float profile = dot(limb, vec3(0.2126, 0.7152, 0.0722));
    float structure = 0.0;
    if (uStructure > 0.0) {
      float noise = tlsSunStructure(p, uStructureTime);
      structure = smoothstep(uStructureEdges.x, uStructureEdges.y, noise) * 2.0 - 1.0;
    }
    float warmth = clamp(smoothstep(0.05, 0.95, mu) + 0.5 * structure, 0.0, 1.0);
    vec3 palette = mix(uEnhanceLimb, uEnhanceCenter, warmth);
    vec3 enhanced = palette * profile * exp(uStructure * structure);
    surface = mix(surface, enhanced, uEnhance);
  }
  gl_FragColor = vec4(surface * grain * shade * faculae * uIntensity, 1.0);
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
    /** El Sol realzado (D46): 0, el de la luz visible; 1, el de color realzado (en el explorador). */
    uEnhance: new Uniform(0),
    uEnhanceCenter: new Uniform(new Color(1, 1, 1)),
    uEnhanceLimb: new Uniform(new Color(1, 1, 1)),
    /** Amplitud de su estructura a gran escala (0: sin ella; el brillo, por exp(amplitud · ±1)). */
    uStructure: new Uniform(0),
    /** Los bordes que llevan su ruido a manchas claras y oscuras. */
    uStructureEdges: new Uniform(new Vector2(-0.35, 0.35)),
    /** Tiempo (s) de su evolución lenta. */
    uStructureTime: new Uniform(0),
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
// El Sol realzado (D46): los rayos suaves del resplandor (su intensidad) y las protuberancias del limbo
// en primer plano (su brillo, su color y su tiempo, s; quietas con movimiento reducido y en las
// capturas).
uniform float uRays;
uniform vec3 uRayColor;
uniform float uProminences;
uniform vec3 uProminenceColor;
uniform float uProminenceTime;
varying vec2 vOffset;
varying float vDisc;
${CORONA_GLSL}

float tlsHaloHash(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

// Ruido de valor en una dimensión, periódico en el ángulo (n celdas por vuelta).
float tlsAngularNoise(float theta, float n, float seed) {
  float x = (theta / 6.2831853 + 0.5) * n;
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(tlsHaloHash(mod(i, n) + seed), tlsHaloHash(mod(i + 1.0, n) + seed), f);
}

// Las protuberancias (ilustrativas): bucles de plasma sobre el limbo, cada uno de tres hilos finos en
// arco entre dos pies en el borde del disco, separados y más tenues hacia dentro, que suben y bajan
// despacio, cada bucle con su ritmo. \`rho\`: la distancia al centro en radios del disco; \`theta\`: el
// ángulo en pantalla desde el polo; \`width\`: el grosor de cada hilo, en radios del disco.
float tlsProminences(float rho, float theta, float t, float width) {
  if (rho <= 1.0) return 0.0;
  float sum = 0.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k);
    float center = 6.2831853 * tlsHaloHash(fk + 3.1) - 3.14159265;
    float halfWidth = 0.07 + 0.09 * tlsHaloHash(fk + 7.7);
    float d = mod(theta - center + 3.14159265, 6.2831853) - 3.14159265;
    float u = d / halfWidth;
    if (abs(u) > 1.0) continue;
    // La altura del bucle (en radios del disco), que sube y baja con su propio ritmo.
    float height = (0.1 + 0.16 * tlsHaloHash(fk + 11.3)) *
      (0.75 + 0.25 * sin(t * (0.05 + 0.04 * tlsHaloHash(fk + 5.9)) + 6.2831853 * tlsHaloHash(fk)));
    float shape = sqrt(max(0.0, 1.0 - u * u));
    float feet = smoothstep(1.0, 0.8, abs(u));
    for (int j = 0; j < 3; j++) {
      float fj = float(j);
      float arc = 1.0 + height * (1.0 - 0.2 * fj) * shape;
      float strand = exp(-pow((rho - arc) / width, 2.0));
      float knots = 0.5 + 0.5 * tlsAngularNoise(theta * 2.0 + fj * 0.37, 128.0, fk * 13.0 + fj);
      sum += strand * knots * feet * (1.0 - 0.3 * fj);
    }
  }
  return sum;
}

void main() {
  ${DEPTH_FRAGMENT}
  float r = length(vOffset);
  if (r > 1.0) discard;
  vec3 color = uColor * pow(1.0 - r, 2.6) * uIntensity;
  float angle = atan(vOffset.y, vOffset.x);
  // Los rayos suaves del resplandor (D46, ilustrativos): finos y cortos, junto al limbo, de un
  // brillo que varía con el ángulo a dos escalas.
  if (uRays > 0.0 && r > vDisc) {
    float rho = r / vDisc;
    float fine = tlsAngularNoise(angle, 160.0, 1.0);
    float coarse = tlsAngularNoise(angle, 47.0, 9.0);
    float rays = 0.3 + 0.7 * fine * (0.4 + 0.6 * coarse);
    float near = exp(-(rho - 1.0) / 0.16) * smoothstep(1.0, 1.012, rho);
    color += uRayColor * uRays * rays * near;
  }
  // Las protuberancias, junto al limbo (en primer plano).
  if (uProminences > 0.0 && r > vDisc) {
    // Cada hilo, de ~1,5 px (en unidades del cuadrado del halo: vDisc es el radio del disco).
    float strandWidth = max(0.006, 1.5 * fwidth(r) / vDisc);
    color += uProminenceColor * uProminences * tlsProminences(r / vDisc, angle - uPoleAngle, uProminenceTime, strandWidth);
  }
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
    /** El Sol realzado (D46): los rayos suaves del resplandor (0: sin ellos) y su color (lineal). */
    uRays: new Uniform(0),
    uRayColor: new Uniform(new Color(1, 0.5, 0.18)),
    /** Y las protuberancias del limbo en primer plano (0: sin ellas), su color y su tiempo (s). */
    uProminences: new Uniform(0),
    uProminenceColor: new Uniform(new Color(1, 0.45, 0.15)),
    uProminenceTime: new Uniform(0),
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
