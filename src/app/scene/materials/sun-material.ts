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
 *   (`uEnhance` = 1). Segunda vuelta (08-11, «las manchas estas que sobresalen parecen tumores…
 *   intentemos basarnos en el sol del proyecto ejemplo»): un naranja saturado en todo el disco, con el
 *   brillo del oscurecimiento del limbo por canal (su luminancia: la forma del perfil sigue siendo la
 *   medida) y el borde más rojizo; manchas claras y oscuras a escala media y grande (ruido de gradiente
 *   propio, retorcido por un campo que cambia despacio: la superficie fluye), que mueven también el
 *   color (lo claro, más amarillo; lo oscuro, más rojo), y una granulación fina. En el halo, un borde
 *   fino naranja rojizo pegado al limbo con rayos cortos y finos (en lugar del resplandor ancho y
 *   pálido) y, de cerca, pocos bucles de plasma finos y translúcidos que se desvanecen con la altura
 *   (en lugar de los bultos sólidos de la primera vuelta). Con luz visible normal el Sol es blanco: el
 *   de `/cielo` (otro shader, `sky/`) y el de `?medida=limbo` siguen siendo el de D41. Los valores, en
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
/** Rayos por vuelta de la primera capa del halo del Sol realzado (la segunda lleva 157). */
const RAYS_PER_TURN = 283;
/** Los bucles de plasma del limbo, de cerca: pocos. */
const LOOPS = 3;
/** Los hilos de cada bucle. */
const STRANDS = 14;

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
// La granulación (fina): su amplitud (0: sin ella; solo en primer plano), sus granos por radio del Sol
// y su tiempo (s, a su ritmo lento; quieta con movimiento reducido y en las capturas).
uniform float uGranulation;
uniform float uGranuleScale;
uniform float uTime;
// Cada mancha: su dirección en el sistema propio del Sol (xyz) y el radio angular de su umbra (w, rad).
uniform vec4 uSpots[${MAX_SUNSPOTS}];
uniform float uSpotPresence[${MAX_SUNSPOTS}];
// (brillo de la umbra, brillo de la penumbra, radio de la penumbra en radios de la umbra)
uniform vec3 uSpotShade;
// Con el realzado (D46), lo que oscurece cada canal la mancha (su sombra elevada a cada componente): más
// el verde y el azul, para que lo oscuro sea pardo rojizo y no oliva.
uniform vec3 uSpotWarmth;
uniform float uFaculae;
// El Sol realzado del explorador (fase 9b, D46): 0, el de la luz visible (D41); 1, el de color realzado.
// Su paleta: el color lineal (antes del tone mapping) del centro del disco y el del borde, mezclados por
// μ entre los dos bordes de \`uPaletteEdges\`, y oscurecidos por el perfil del limbo (el de la 9b.c, con
// sus exponentes por \`uLimbSoftening\`: más suave, como la referencia). Su estructura: la amplitud, la
// ganancia de cada canal por unidad de estructura (exp(estructura · ganancia), una en lo claro, más
// amarillo, y otra en lo oscuro, más rojo) y el tiempo (s) de su evolución lenta (quieta con movimiento
// reducido y en las capturas).
uniform float uEnhance;
uniform vec3 uEnhanceCenter;
uniform vec3 uEnhanceLimb;
uniform vec2 uPaletteEdges;
uniform float uLimbSoftening;
uniform float uStructure;
uniform vec3 uStructureGain;
uniform vec3 uStructureGainDark;
// (la frecuencia de su primera octava, en ciclos por radio; lo que pesa cada octava frente a la
// anterior; y su forma, de 0, lineal, a 1)
uniform vec3 uStructureOctaves;
// (lo más que oscurece y lo más que aclara, en unidades de estructura: un límite suave, tanh)
uniform vec2 uStructureLimits;
uniform float uStructureTime;
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

// El gradiente pseudoaleatorio de un vértice de la red, frente al punto (\`f\`, relativo a él).
float tlsCorner(vec3 i, vec3 f) {
  return dot(tlsHash3(i) * 2.0 - 1.0, f);
}

// Ruido de gradiente en 3D (propio): un gradiente pseudoaleatorio en cada vértice de la red y la
// interpolación quíntica. De media 0; en la práctica, entre −1 y 1 (desviación típica ≈ 0,3).
float tlsGradientNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 e = vec3(1.0, 0.0, 0.0);
  float n000 = tlsCorner(i, f);
  float n100 = tlsCorner(i + e.xyy, f - e.xyy);
  float n010 = tlsCorner(i + e.yxy, f - e.yxy);
  float n110 = tlsCorner(i + e.xxy, f - e.xxy);
  float n001 = tlsCorner(i + e.yyx, f - e.yyx);
  float n101 = tlsCorner(i + e.xyx, f - e.xyx);
  float n011 = tlsCorner(i + e.yxx, f - e.yxx);
  float n111 = tlsCorner(i + e.xxx, f - e.xxx);
  return 1.6 * mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

// La estructura a escala media y grande del Sol realzado (D46, ilustrativa): ruido de gradiente en
// cinco octavas sobre la esfera (de unos 0,45 a 0,025 radios, cada una algo más débil), retorcido por un
// campo ancho que cambia con el tiempo: la superficie fluye despacio y sus manchas cambian de forma, sin
// el aspecto de manchas redondas ni de mosaico. Cada octava se apaga cuando su detalle mide menos de un
// par de píxeles (\`footprint\`: lo que mide un píxel, en radios). De media 0 (la amplitud la escala).
float tlsSunStructure(vec3 p, float t, float footprint) {
  vec3 flow = vec3(
    tlsGradientNoise(p * 1.3 + vec3(0.0, 0.0, t)),
    tlsGradientNoise(p * 1.3 + vec3(5.2, 1.3, -t)),
    tlsGradientNoise(p * 1.3 + vec3(-3.7, 8.1, 0.5 * t))
  );
  vec3 q = p + 0.12 * flow;
  float sum = 0.0;
  float frequency = uStructureOctaves.x;
  float amplitude = 1.0;
  for (int octave = 0; octave < 5; octave++) {
    float fo = float(octave);
    float visible = 1.0 - smoothstep(0.3, 0.7, footprint * frequency);
    sum += amplitude * visible *
      tlsGradientNoise(q * frequency + vec3(7.3 * fo, 3.1 * fo + (0.5 + 0.3 * fo) * t, -5.7 * fo));
    frequency *= 2.1;
    amplitude *= uStructureOctaves.y;
  }
  float v = 0.5 * sum;
  // Su forma: con \`uStructureOctaves.z\` > 0, lo intermedio se aplana y quedan manchas sueltas más
  // marcadas (como en la referencia: un naranja casi uniforme con zonas claras y oscuras).
  return v * mix(1.0, 2.5 * abs(v), uStructureOctaves.z);
}

void main() {
  ${DEPTH_FRAGMENT}
  float mu = clamp(dot(normalize(vNormal), normalize(-vViewPosition)), 0.0, 1.0);
  vec3 limb = pow(vec3(max(mu, 1e-4)), uLimbExponent);
  vec3 p = normalize(vLocal);
  // Lo que mide un píxel, en radios del Sol (para apagar el detalle que no se puede pintar).
  float footprint = length(fwidth(p));
  // La granulación (ilustrativa, fina): dos octavas de ruido de gradiente a \`uGranuleScale\` granos por
  // radio, que cambian despacio. Cada octava se apaga cuando su grano mide menos de un par de píxeles
  // (sin parpadeos ni moiré cuando el Sol se ve pequeño).
  float grain = 0.0;
  if (uGranulation > 0.0) {
    vec3 x = p * uGranuleScale;
    float cell = footprint * uGranuleScale;
    float coarse = 1.0 - smoothstep(0.35, 0.8, cell);
    float fine = 1.0 - smoothstep(0.35, 0.8, 2.3 * cell);
    grain = uGranulation * (
      0.75 * coarse * tlsGradientNoise(x + vec3(0.0, uTime, 0.0)) +
      0.45 * fine * tlsGradientNoise(x * 2.3 + vec3(31.0, 0.0, -uTime))
    );
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
    // Con el realzado, los bordes más suaves (sin anillos marcados).
    float umbra = 1.0 - smoothstep(mix(0.7, 0.3, uEnhance) * spot.w, mix(1.0, 1.15, uEnhance) * spot.w, rough);
    float penumbra = 1.0 - smoothstep(mix(0.8, 0.4, uEnhance) * outer, mix(1.0, 1.1, uEnhance) * outer, rough);
    float level = mix(mix(1.0, uSpotShade.y, penumbra), uSpotShade.x, umbra);
    shade = min(shade, mix(1.0, level, presence));
    facula = max(facula, presence * (1.0 - smoothstep(outer, 3.5 * outer, d)) * (1.0 - penumbra));
  }
  // Las fáculas: claras alrededor de las manchas, a trozos (con el ruido de la estructura media), y solo
  // hacia el limbo (en el centro no se ven). Solo se calculan cerca de una mancha.
  float faculae = 1.0;
  if (facula > 0.001 && uFaculae > 0.0) {
    float network = smoothstep(-0.2, 0.5, tlsGradientNoise(p * 22.0 + 5.0));
    faculae += uFaculae * facula * network * (1.0 - mu) * (1.0 - mu);
  }
  vec3 surface = uColor * limb * (1.0 + grain);
  if (uEnhance > 0.0) {
    // El realzado (D46): la paleta, del borde (más rojo) al centro, con el brillo del oscurecimiento del
    // limbo por canal (su luminancia: la forma del perfil de la 9b.c); la estructura y la granulación
    // mueven el brillo y el color a la vez (lo claro, más amarillo; lo oscuro, más rojo).
    // En el último píxel del borde (μ → 0) la ley iría a negro: un borde oscuro y dentado contra el
    // halo. Con μ ≥ 0,1, el último 0,5 % del radio queda como el anterior.
    vec3 edge = pow(vec3(max(mu, 0.1)), uLimbExponent * uLimbSoftening);
    float profile = dot(edge, vec3(0.2126, 0.7152, 0.0722));
    vec3 palette = mix(uEnhanceLimb, uEnhanceCenter, smoothstep(uPaletteEdges.x, uPaletteEdges.y, mu));
    // La estructura, más tenue junto al borde: así el borde queda algo más oscuro y rojizo en toda la
    // vuelta, sin manchas claras pegadas a él.
    float structure = uStructure > 0.0
      ? uStructure * mix(0.45, 1.0, smoothstep(0.05, 0.45, mu)) * tlsSunStructure(p, uStructureTime, footprint)
      : 0.0;
    float value = structure + grain;
    // Con un límite suave: sin manchas pardas ni blancas en los extremos del ruido.
    value = value < 0.0
      ? -uStructureLimits.x * tanh(-value / uStructureLimits.x)
      : uStructureLimits.y * tanh(value / uStructureLimits.y);
    vec3 enhanced =
      palette * profile * exp(max(value, 0.0) * uStructureGain + min(value, 0.0) * uStructureGainDark);
    surface = mix(surface, enhanced, uEnhance);
  }
  vec3 spots = mix(vec3(shade), pow(vec3(shade), uSpotWarmth), uEnhance);
  gl_FragColor = vec4(surface * spots * faculae * uIntensity, 1.0);
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
    /** Granos por radio del Sol (ilustrativo). */
    uGranuleScale: new Uniform(110),
    /** Tiempo de la granulación (s del reloj de pared, a su ritmo lento). */
    uTime: new Uniform(0),
    uSpots: new Uniform(Array.from({ length: MAX_SUNSPOTS }, () => new Vector4(1, 0, 0, 0))),
    uSpotPresence: new Uniform(new Array<number>(MAX_SUNSPOTS).fill(0)),
    uSpotShade: new Uniform(new Vector3(0.2, 0.7, 2.4)),
    uSpotWarmth: new Uniform(new Vector3(1, 1, 1)),
    uFaculae: new Uniform(0),
    /** El Sol realzado (D46): 0, el de la luz visible; 1, el de color realzado (en el explorador). */
    uEnhance: new Uniform(0),
    uEnhanceCenter: new Uniform(new Color(1, 1, 1)),
    uEnhanceLimb: new Uniform(new Color(1, 1, 1)),
    /** Los valores de μ entre los que la paleta pasa del color del borde al del centro. */
    uPaletteEdges: new Uniform(new Vector2(0, 0.6)),
    /** Lo que se suavizan los exponentes del limbo en el perfil del realzado (1: los de la 9b.c). */
    uLimbSoftening: new Uniform(1),
    /** Amplitud de su estructura (0: sin ella). */
    uStructure: new Uniform(0),
    /**
     * La ganancia de cada canal por unidad de estructura y de granulación (exp(valor · ganancia)), en lo
     * claro y en lo oscuro.
     */
    uStructureGain: new Uniform(new Vector3(0.17, 0.38, 0.6)),
    uStructureGainDark: new Uniform(new Vector3(0.17, 0.38, 0.6)),
    /** Sus octavas: la frecuencia de la primera (ciclos por radio), el peso relativo y la forma. */
    uStructureOctaves: new Uniform(new Vector3(2.2, 0.8, 0)),
    /** Lo más que oscurece y aclara su estructura (un límite suave). */
    uStructureLimits: new Uniform(new Vector2(10, 10)),
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
uniform float uPixelRatio;
varying vec2 vOffset;
varying float vDisc;
varying float vPixel;

void main() {
  vOffset = position.xy;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // Unidades de escena por píxel (CSS) a la distancia del Sol (perspectiva).
  float unitsPerPixel = -center.z * 2.0 / (uViewportHeight * projectionMatrix[1][1]);
  float size = max(uRadius, uMinPixels * unitsPerPixel);
  // El radio del disco del Sol en las unidades del cuadrado (para la corona).
  vDisc = uSunRadius / size;
  // Lo que mide un píxel del lienzo en las unidades del cuadrado (el cuadrado mira a la cámara: igual en
  // todo él).
  vPixel = unitsPerPixel / (size * uPixelRatio);
  gl_Position = projectionMatrix * (center + vec4(position.xy * size, 0.0, 0.0));
  ${DEPTH_VERTEX}
}
`;

const haloFragment = /* glsl */ `
${DEPTH_FRAGMENT_PARS}
// El resplandor ancho y tenue (en la vista general): su color, su brillo y su caída, (1 − r)^exponente
// hasta el borde del cuadrado.
uniform vec3 uColor;
uniform float uIntensity;
uniform float uGlowExponent;
uniform float uCorona;
uniform vec3 uCoronaColor;
uniform float uPoleAngle;
uniform float uRoundness;
// El Sol realzado (D46, segunda vuelta):
// - el borde fino naranja rojizo pegado al limbo: su brillo, su color y su forma (el peso de la caída
//   ancha, el ancho de la estrecha y el de la ancha, en radios del disco), con un ancho mínimo en
//   píxeles para cuando el Sol se ve pequeño;
// - el resplandor suave naranja que lo envuelve, algo más ancho que el borde: su color por su brillo
//   (rgb) y su ancho (w, radios del disco; como mínimo, el triple del mínimo del borde);
// - los rayos cortos y finos: su brillo, su color y su longitud media (radios del disco);
// - los bucles de plasma de primer plano: su brillo y su color;
// - el tiempo (s) de los rayos y los bucles, que cambian despacio (quietos con movimiento reducido y en
//   las capturas).
uniform float uRim;
uniform vec3 uRimColor;
uniform vec3 uRimShape;
uniform float uRimMinPixels;
uniform vec4 uSoftGlow;
uniform float uRays;
uniform vec3 uRayColor;
uniform float uRayLength;
uniform float uProminences;
uniform vec3 uProminenceColor;
uniform float uProminenceTime;
varying vec2 vOffset;
varying float vDisc;
varying float vPixel;
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

// Los rayos (ilustrativos): finos y cortos, uno por celda de ángulo en dos capas (${RAYS_PER_TURN} y 157
// por vuelta), cada uno con su longitud, su brillo y una ligera curva, que cambian despacio. \`x\`: la
// altura sobre el limbo (radios del disco); \`cellPx\`: lo que mide una celda de la primera capa en
// píxeles a esa altura (por debajo de ~2 px, cada rayo se funde en su media: sin moiré).
float tlsRays(float theta, float x, float t, float cellPx) {
  float sum = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    float n = layer == 0 ? ${RAYS_PER_TURN}.0 : 157.0;
    float seed = layer == 0 ? 3.0 : 17.0;
    // La curva: el ángulo se desvía un poco con la altura, distinto por zonas.
    float bend = (tlsAngularNoise(theta, 7.0, seed + 5.0) - 0.5) * 0.3;
    float a = ((theta + bend * x) / 6.2831853 + 0.5) * n;
    float id = mod(floor(a), n);
    float f = fract(a) - 0.5;
    float h1 = tlsHaloHash(id + seed);
    float h2 = tlsHaloHash(id + seed + 41.7);
    float h3 = tlsHaloHash(id + seed + 83.1);
    float len = uRayLength * (0.35 + 1.3 * h1 * h1) * (0.8 + 0.2 * sin(0.21 * t + 6.2831853 * h3));
    float width = 0.16 + 0.1 * h2;
    float across = exp(-(f * f) / (width * width));
    float px = layer == 0 ? cellPx : cellPx * ${RAYS_PER_TURN}.0 / 157.0;
    across = mix(1.7725 * width, across, smoothstep(1.5, 3.0, px));
    sum += across * exp(-x / len) * (0.35 + 0.65 * h2) * (layer == 0 ? 1.0 : 0.7);
  }
  return sum;
}

// Los bucles de plasma (ilustrativos): pocos (${LOOPS}), de cerca; cada uno, un manojo de hilos finos
// (de ~1 px) en arco entre dos pies en el limbo (semielipses de distinto ancho, altura e inclinación),
// que se desvanecen con la altura; respiran, se mecen y se encienden y se apagan despacio, cada uno a
// su ritmo. \`rho\`: la distancia al centro (radios del disco); \`theta\`: el ángulo en pantalla desde
// el polo; \`px\`: un píxel, en radios del disco.
float tlsLoops(float rho, float theta, float t, float px) {
  float y = rho - 1.0;
  if (y > 0.7) return 0.0;
  float sum = 0.0;
  for (int k = 0; k < ${LOOPS}; k++) {
    float fk = float(k);
    float center = 6.2831853 * (fk / ${LOOPS}.0 + 0.2 * tlsHaloHash(fk + 3.1)) + 0.7;
    float d = mod(theta - center + 3.14159265, 6.2831853) - 3.14159265;
    if (abs(d) > 0.5) continue;
    float x = d * rho;
    float a = 0.06 + 0.05 * tlsHaloHash(fk + 7.7);
    float rate = 0.045 + 0.03 * tlsHaloHash(fk + 5.9);
    float b = (0.22 + 0.2 * tlsHaloHash(fk + 11.3)) *
      (0.88 + 0.12 * sin(rate * t + 6.2831853 * tlsHaloHash(fk)));
    float tilt = (tlsHaloHash(fk + 13.7) - 0.5) * 0.9;
    float life = smoothstep(0.0, 0.5, 0.5 + 0.5 * sin(0.017 * t + 6.2831853 * tlsHaloHash(fk + 19.3)));
    float loop = 0.0;
    for (int j = 0; j < ${STRANDS}; j++) {
      float fj = float(j);
      float hj = tlsHaloHash(fk * 13.0 + fj * 1.7 + 61.0);
      float aj = a * (0.7 + 0.6 * hj);
      float bj = b * (0.75 + 0.5 * tlsHaloHash(fk * 5.0 + fj * 3.1 + 71.0));
      // Cada hilo, con su inclinación (la del bucle más la suya, que oscila despacio) y su pie.
      float lean = tilt + 0.35 * (tlsHaloHash(fk * 11.0 + fj * 4.1 + 101.0) - 0.5) +
        0.03 * sin(0.07 * t + 6.2831853 * hj);
      float xj = x - lean * y - 0.3 * a * (tlsHaloHash(fk * 3.0 + fj * 5.3 + 81.0) - 0.5);
      // La distancia a la semielipse, aproximada por el valor de su ecuación entre su gradiente.
      vec2 q = vec2(xj / aj, y / bj);
      float len = max(length(q), 1e-4);
      float g = length(vec2(xj / (aj * aj), y / (bj * bj))) / len;
      float dist = abs(len - 1.0) / max(g, 1e-4);
      float width = px * (0.45 + 0.35 * tlsHaloHash(fk * 7.0 + fj * 2.3 + 91.0));
      float core = exp(-(dist * dist) / (width * width));
      float along = atan(q.y, q.x);
      float speckle = tlsAngularNoise(2.0 * along + 0.05 * t + fj, 71.0, fk * 17.0 + fj);
      float knots = 0.2 + 0.8 * speckle * speckle;
      loop += core * knots * (0.45 + 0.55 * hj);
    }
    sum += loop * exp(-max(y, 0.0) / b) * life;
  }
  return sum;
}

void main() {
  ${DEPTH_FRAGMENT}
  float r = length(vOffset);
  if (r > 1.0) discard;
  // Lo que cambia r de un píxel al siguiente (lo mismo que fwidth(r)), sin derivadas: dentro de la rama
  // de abajo, que no siguen todos los píxeles de su cuadro de 2 × 2, una derivada no está definida, y el
  // compilador de D3D la mete en la rama aunque se calcule antes. Con el Sol pequeño, el cuadro que cruza
  // ρ = 0,97 la daba casi 0: el borde fino perdía su ancho mínimo y dejaba puntos oscuros en el limbo.
  float pixel = vPixel * (abs(vOffset.x) + abs(vOffset.y)) / max(r, 1e-6);
  vec3 color = uColor * pow(1.0 - r, uGlowExponent) * uIntensity;
  float angle = atan(vOffset.y, vOffset.x);
  float rho = r / vDisc;
  // Desde algo dentro del disco: donde la silueta de la malla (un polígono) se queda dentro del círculo,
  // el hueco lleva el borde y no el fondo (en el resto, el disco tapa el halo).
  if (rho > 0.97) {
    // Un píxel, en radios del disco, y la altura sobre el limbo.
    float px = max(pixel / vDisc, 1e-5);
    float x = max(rho - 1.0, 0.0);
    float theta = angle - uPoleAngle;
    // El borde fino, pegado al limbo: dos caídas exponenciales (con un ancho mínimo en píxeles).
    if (uRim > 0.0) {
      float narrow = max(uRimShape.y, uRimMinPixels * px);
      float wide = max(uRimShape.z, 2.5 * uRimMinPixels * px);
      float rim = (1.0 - uRimShape.x) * exp(-x / narrow) + uRimShape.x * exp(-x / wide);
      color += uRimColor * uRim * rim;
    }
    // El resplandor suave naranja que lo envuelve.
    if (uSoftGlow.w > 0.0) {
      color += uSoftGlow.rgb * exp(-x / max(uSoftGlow.w, 3.0 * uRimMinPixels * px));
    }
    // Los rayos cortos y finos.
    if (uRays > 0.0) {
      float cellPx = 6.2831853 * rho / (${RAYS_PER_TURN}.0 * px);
      color += uRayColor * uRays * tlsRays(theta, x, uProminenceTime, cellPx);
    }
    // Los bucles de plasma, de cerca.
    if (uProminences > 0.0) {
      float loops = tlsLoops(rho, theta, uProminenceTime, px);
      color += uProminenceColor * uProminences * (1.0 - exp(-loops));
    }
    // La corona, hasta el borde del cuadrado (en primer plano, si tiene brillo).
    if (uCorona > 0.0) {
      float fade = smoothstep(vDisc, vDisc * 1.03, r) * (1.0 - smoothstep(0.7, 1.0, r));
      color += uCoronaColor * tlsCorona(rho, theta, uRoundness) * uCorona * fade;
    }
  }
  gl_FragColor = vec4(color, 1.0);
  ${OUTPUT_FRAGMENT}
}
`;

export function createHaloMaterial() {
  const uniforms = {
    uRadius: new Uniform(1),
    /** Radio del disco del Sol (unidades de escena), para la corona, el borde, los rayos y los bucles. */
    uSunRadius: new Uniform(0.5),
    uMinPixels: new Uniform(26),
    uViewportHeight: new Uniform(800),
    /** Densidad de píxeles del lienzo (la del renderer): lo que mide un píxel, sin derivadas. */
    uPixelRatio: new Uniform(1),
    /** El resplandor ancho: su color (lineal), su brillo y el exponente de su caída. */
    uColor: new Uniform(new Color(1, 0.78, 0.5)),
    uIntensity: new Uniform(1.1),
    uGlowExponent: new Uniform(2.6),
    /** Brillo de la corona (0: sin ella; solo en primer plano). */
    uCorona: new Uniform(0),
    uCoronaColor: new Uniform(new Color(1, 0.96, 0.9)),
    /** Ángulo en pantalla del polo norte del Sol (rad), para orientar las serpentinas. */
    uPoleAngle: new Uniform(Math.PI / 2),
    /** De 0 (la corona del mínimo, con serpentinas) a 1 (la del máximo, redonda). */
    uRoundness: new Uniform(0.4),
    /** El Sol realzado (D46): el borde fino (0: sin él), su color (lineal) y su forma. */
    uRim: new Uniform(0),
    uRimColor: new Uniform(new Color(1, 0.17, 0.035)),
    uRimShape: new Uniform(new Vector3(0.3, 0.016, 0.05)),
    uRimMinPixels: new Uniform(1.2),
    /** El resplandor suave: su color por su brillo (rgb, lineal) y su ancho (w, radios; 0: sin él). */
    uSoftGlow: new Uniform(new Vector4(0, 0, 0, 0)),
    /** Los rayos (0: sin ellos), su color (lineal) y su longitud media (radios del disco). */
    uRays: new Uniform(0),
    uRayColor: new Uniform(new Color(1, 0.2, 0.05)),
    uRayLength: new Uniform(0.1),
    /** Los bucles de plasma de primer plano (0: sin ellos) y su color (lineal). */
    uProminences: new Uniform(0),
    uProminenceColor: new Uniform(new Color(1, 0.32, 0.08)),
    /** El tiempo (s) de los rayos y los bucles. */
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
