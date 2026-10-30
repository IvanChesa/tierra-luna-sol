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
 * - La Tierra (fase 5, `earth: true`, `#define TLS_EARTH`): nubes en una capa propia con deriva
 *   ilustrativa y su sombra aproximada, brillo del Sol en los océanos (máscara especular), luces de
 *   las ciudades que se encienden en el crepúsculo, un tono crepuscular junto al terminador y la luz
 *   que dispersa la atmósfera sobre todo el lado diurno (azulada; aclara el océano respecto a la
 *   tierra, como en las fotos de EPIC, sin el velo blanquecino de la fase 3b). Y la sombra de la
 *   Luna en los eclipses (D20): desde cada punto, la fracción del disco del Sol que tapa la Luna,
 *   con la Luna y el Sol en el sistema propio de la Tierra (geometría real, calculada en float64).
 *
 * - La Luna (fase 6, `moon: true`, `#define TLS_MOON`): su malla (una esfera cúbica cuando se ve de
 *   cerca) se desplaza con la elevación del LOLA (16 bits en R y G, D15) a escala física (la
 *   exageración, en la configuración visual). Las coordenadas de textura se calculan por píxel desde
 *   la dirección: sin el pellizco de los polos de `SphereGeometry`, y con la costura del meridiano
 *   180° resuelta por derivadas (Tarini, 2012, «Cylindrical and Toroidal Parameterizations Without
 *   Vertex Seams»): de las dos u, la que tiene el corte en ±180° o la que lo tiene en 0°, la que no
 *   salta dentro del cuadrado de píxeles. El marco este–norte del relieve, también por píxel, con el
 *   polo del cuerpo: el interpolado entre vértices falla junto a los polos. Y la sombra de la Tierra
 *   en los eclipses de Luna (D20), como la de la Luna sobre la Tierra, con el radio de la Tierra de
 *   la regla de Danjon (`EARTH_SHADOW_RADIUS_KM`): dentro de la umbra, la luz del Sol que refracta la
 *   atmósfera de la Tierra, rojiza y más tenue hacia el eje (ilustrativa, de la configuración visual).
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
#ifdef TLS_MOON
uniform float uMeridianOffset;
uniform sampler2D uElevationMap;
uniform float uHasElevation;
// Elevación en radios del cuerpo, ya con la exageración: (la del valor 0, la del intervalo entero).
uniform vec2 uElevation;
varying vec3 vPoleView;
#endif
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vSunDirection;
varying vec3 vLocal;
varying vec3 vViewPosition;
varying vec3 vCenterView;
varying vec3 vEast;
varying vec3 vNorth;

void main() {
  vUv = uv;
  vLocal = position;
  vec3 displaced = position;
#ifdef TLS_MOON
  vPoleView = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  if (uHasElevation > 0.5) {
    vec3 d = normalize(position);
    vec2 elevationUv = vec2(
      atan(-d.z, d.x) / 6.28318530718 + 0.5 + uMeridianOffset,
      asin(clamp(d.y, -1.0, 1.0)) / 3.14159265359 + 0.5
    );
    // 16 bits: R, el byte alto, y G, el bajo (D15). El filtrado lineal de los dos canales es el del
    // valor entero, porque es lineal en ellos.
    vec2 packed = texture2D(uElevationMap, elevationUv).rg;
    displaced = position * (1.0 + uElevation.x + uElevation.y * (packed.r * 65280.0 + packed.g * 255.0) / 65535.0);
  }
#endif
  vNormal = normalize(normalMatrix * normal);
  // Marco tangente del relieve: este y norte en el sistema propio, llevados a la vista.
  vec3 up = normalize(position);
  vec3 east = vec3(up.z, 0.0, -up.x);
  float eastLength = length(east);
  east = eastLength > 1e-5 ? east / eastLength : vec3(1.0, 0.0, 0.0);
  vEast = normalize((modelViewMatrix * vec4(east, 0.0)).xyz);
  vNorth = normalize((modelViewMatrix * vec4(cross(up, east), 0.0)).xyz);
  vSunDirection = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = mvPosition.xyz;
  vCenterView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
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
uniform float uContrast;
uniform float uMeanLuminance;
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
varying vec3 vCenterView;
varying vec3 vEast;
varying vec3 vNorth;
#ifdef TLS_MOON
varying vec3 vPoleView;

// Coordenadas de textura por píxel (ver la cabecera): u y v de la dirección del punto.
vec2 tlsMoonUv() {
  vec3 d = normalize(vLocal);
  float u = atan(-d.z, d.x) / 6.28318530718 + 0.5;
  float v = asin(clamp(d.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
  // Con el corte en ±180° (u) o en 0° (uSeam): la que no salta en este cuadrado de píxeles.
  float uSeam = fract(u + 0.5) - 0.5;
  return vec2((fwidth(u) <= fwidth(uSeam) + 1e-6 ? u : uSeam) + uMeridianOffset, v);
}
#endif
#ifdef TLS_EARTH
uniform sampler2D uNightMap;
uniform sampler2D uCloudMap;
uniform sampler2D uSpecularMap;
uniform float uHasNight;
uniform float uHasClouds;
uniform float uHasSpecular;
uniform float uCloudOffset;
// Opacidad de las nubes y de su sombra: 1 con el disco entero a la vista; menos en los primeros planos.
uniform float uCloudOpacity;
// (albedo de las nubes, intensidad de las luces, brillo del océano, oscuridad de la sombra)
uniform vec4 uEarth;
// Luz dispersada por la atmósfera (color lineal × intensidad) y refuerzo hacia el limbo.
uniform vec4 uScatter;
uniform vec3 uTwilightColor;
// Tierras áridas: (rodilla de la compresión, calidez desde la que empieza, calidez a la que es entera).
uniform vec3 uArid;
#endif
#if defined(TLS_EARTH) || defined(TLS_MOON)
// Centros del cuerpo que puede tapar el Sol (la Luna sobre la Tierra; la Tierra sobre la Luna) y del
// Sol (radios ecuatoriales, sistema propio) y sus radios: desde cada punto, las direcciones y los
// radios aparentes de los dos (el paralaje del Sol mueve la sombra decenas de kilómetros si se toma
// su dirección desde el centro del cuerpo).
uniform vec4 uOccluderLocal;
uniform vec4 uSunLocal;

// La sombra en p (D20): x, la fracción del disco del Sol que se ve (el que tapa es un disco de radio
// angular aO a una separación d del centro del Sol, de radio aS: se resta el área común de los dos
// círculos); y, lo hondo que está p en la umbra (0 en su borde, 1 en el eje). Ángulos pequeños: d es
// la cuerda entre las direcciones, que en float32 no pierde precisión como acos.
vec2 tlsShadow(vec3 p) {
  vec3 toOccluder = uOccluderLocal.xyz - p;
  vec3 toSun = uSunLocal.xyz - p;
  float occluderDistance = length(toOccluder);
  float sunDistance = length(toSun);
  float aO = uOccluderLocal.w / occluderDistance;
  float aS = uSunLocal.w / sunDistance;
  float d = length(toOccluder / occluderDistance - toSun / sunDistance);
  if (d >= aS + aO) return vec2(1.0, 0.0);
  if (d <= aO - aS) return vec2(0.0, 1.0 - d / (aO - aS));
  if (d <= aS - aO) return vec2(1.0 - (aO * aO) / (aS * aS), 0.0);
  float a1 = aS * aS * acos(clamp((d * d + aS * aS - aO * aO) / (2.0 * d * aS), -1.0, 1.0));
  float a2 = aO * aO * acos(clamp((d * d + aO * aO - aS * aS) / (2.0 * d * aO), -1.0, 1.0));
  float a3 = 0.5 * sqrt(max((-d + aS + aO) * (d + aS - aO) * (d - aS + aO) * (d + aS + aO), 0.0));
  return vec2(clamp(1.0 - (a1 + a2 - a3) / (3.14159265 * aS * aS), 0.0, 1.0), 0.0);
}
#endif
#ifdef TLS_MOON
// La luz refractada por la atmósfera de la Tierra dentro de su sombra (rgb lineal, ilustrativa).
uniform vec3 uUmbraLight;
#endif

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
#ifdef TLS_MOON
  // El este, por píxel: el polo por la normal (solo degenera en el polo exacto).
  vec3 east = cross(vPoleView, geometric);
  float eastLength = length(east);
  east = eastLength > 1e-5 ? east / eastLength : normalize(vEast);
  vec3 north = cross(geometric, east);
#else
  vec3 east = normalize(vEast);
  vec3 north = normalize(vNorth);
#endif
  return normalize(east * t.x + north * t.y + geometric * max(t.z, 0.05));
}

void main() {
  ${DEPTH_FRAGMENT}
#ifdef TLS_MOON
  vec2 uv = tlsMoonUv();
#else
  vec2 uv = vec2(vUv.x + uMeridianOffset, vUv.y);
#endif
  vec3 base = uHasMap > 0.5 ? texture2D(uMap, uv).rgb : uColor;
  // Color medido (data/photometry.ts): la textura conserva su luminancia y toma esa cromaticidad.
  if (uChromaticity.w > 0.0) {
    float luminance = dot(base, vec3(0.2126, 0.7152, 0.0722));
    base = mix(base, luminance * uChromaticity.rgb, uChromaticity.w);
  }
  // Contraste (data/photometry.ts): se acerca la luminancia a la media sin cambiar el matiz.
  if (uContrast < 1.0) {
    float luminance = max(dot(base, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
    base *= (uMeanLuminance + (luminance - uMeanLuminance) * uContrast) / luminance;
  }
  vec3 albedo = base * uAlbedoScale;
#ifdef TLS_EARTH
  // Las tierras áridas de la textura, casi tan claras como las nubes (en EPIC, un tercio): su brillo,
  // comprimido, L / (1 + L / rodilla), solo en la tierra cálida ((R − B) / L): ni el océano ni el
  // hielo (neutros), y apenas los bosques (oscuros).
  float aridLum = max(dot(albedo, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
  float arid = smoothstep(uArid.y, uArid.z, (albedo.r - albedo.b) / aridLum);
  albedo *= mix(1.0, 1.0 / (1.0 + aridLum / uArid.x), arid);
#endif
  vec3 geometric = normalize(vNormal);
  vec3 normal = uNormalStrength > 0.0 ? reliefNormal(geometric, uv) : geometric;
  vec3 toSun = normalize(vSunDirection);
  vec3 toViewer = normalize(-vViewPosition);
  // Ángulo de fase de un observador lejano (Sol, centro del cuerpo y cámara), el mismo en todo el
  // disco: la distancia de la cámara es un recurso de encuadre (en la escala ilustrativa, ni siquiera
  // es real), no la de una sonda. Con el de cada punto, a unos radios del cuerpo, el pico de oposición
  // oscurecería el borde del disco en fase llena. μ₀ y μ sí son los de cada punto.
  float cosAlpha = clamp(dot(toSun, normalize(-vCenterView)), -1.0, 1.0);
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
#ifdef TLS_EARTH
  float muSun = dot(geometric, toSun);
  // La sombra de la Luna: lo que llega del Sol a este punto (1 fuera de los eclipses).
  float sunVisible = muSun > 0.0 ? tlsShadow(vLocal * vec3(1.0, uPolarScale, 1.0)).x : 1.0;
  light *= sunVisible;
  haze *= sunVisible;
  // Nubes: la cobertura de su capa, que deriva en longitud (ilustrativo).
  vec2 cloudUv = vec2(uv.x + uCloudOffset, uv.y);
  float cloud = uHasClouds > 0.5 ? texture2D(uCloudMap, cloudUv).r * uCloudOpacity : 0.0;
  // Su sombra: la misma capa, un poco desplazada hacia el Sol en el plano tangente (aproximación).
  float shadow = 0.0;
  if (uHasClouds > 0.5 && muSun > 0.0) {
    vec2 towardSun = vec2(dot(toSun, normalize(vEast)), dot(toSun, normalize(vNorth)));
    shadow = texture2D(uCloudMap, cloudUv + towardSun * vec2(0.0016, 0.0032)).r * uCloudOpacity;
  }
  vec3 surface = albedo * light * (1.0 - uEarth.w * shadow * (1.0 - cloud));
  // El Sol reflejado en el agua, sin nubes delante.
  if (uHasSpecular > 0.5 && muSun > 0.0) {
    float water = texture2D(uSpecularMap, uv).r;
    float facing = max(dot(geometric, normalize(toSun + toViewer)), 0.0);
    float glint = pow(facing, 400.0) + 0.12 * pow(facing, 40.0);
    surface += vec3(uEarth.z * water * (1.0 - cloud) * glint * smoothstep(0.0, 0.1, muSun))
      * sunVisible;
  }
  // Las nubes, blancas y difusas, con el mismo terminador que la superficie.
  vec3 clouds = vec3(uEarth.x) * max(muSun, 0.0) * 1.15 * sunVisible;
  vec3 color = mix(surface, clouds, cloud);
  // Junto al terminador, la luz del Sol atraviesa más atmósfera y llega enrojecida.
  float twilight = (1.0 - smoothstep(0.0, 0.18, muSun)) * smoothstep(-0.08, 0.0, muSun);
  color *= mix(vec3(1.0), uTwilightColor, 0.7 * twilight);
  // La atmósfera: luz azulada dispersada sobre el lado diurno, más hacia el limbo.
  float day = smoothstep(-0.1, 0.25, muSun) * sunVisible;
  color += uScatter.rgb * day * (1.0 + uScatter.w * pow(1.0 - clamp(muViewer, 0.0, 1.0), 2.0));
  // Luces de las ciudades: se encienden en el crepúsculo (del Sol en el horizonte a unos 9° bajo él).
  if (uHasNight > 0.5) {
    // (Los bordes de smoothstep, en orden: al revés, GLSL ES no define el resultado.)
    float night = 1.0 - smoothstep(-0.15, 0.0, muSun);
    color += texture2D(uNightMap, uv).rgb * uEarth.y * night * (1.0 - 0.85 * cloud);
  }
  vec3 composite = mix(albedo, vec3(uEarth.x), cloud);
  vec3 earthFill = composite * uFill * (0.25 + 0.75 * max(muViewer, 0.0));
  gl_FragColor = vec4(color + uHazeColor.rgb * haze + earthFill, 1.0);
#else
  vec3 lit = vec3(light);
#ifdef TLS_MOON
  // La sombra de la Tierra: lo que llega del Sol y, donde la Tierra lo tapa, su luz refractada,
  // más tenue hacia el eje de la umbra.
  if (light > 0.0) {
    vec2 eclipse = tlsShadow(vLocal * vec3(1.0, uPolarScale, 1.0));
    lit = light * (eclipse.x + (1.0 - eclipse.x) * mix(1.0, 0.35, eclipse.y) * uUmbraLight);
    haze *= eclipse.x;
  }
#endif
  gl_FragColor = vec4(albedo * lit + uHazeColor.rgb * haze + fill, 1.0);
#endif
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
  /** Contraste de la textura (1 = el suyo) y su luminancia media, que conserva. */
  readonly uContrast: Uniform<number>;
  readonly uMeanLuminance: Uniform<number>;
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

/** Uniformes de la Tierra (fase 5): solo con `earth: true`. */
export interface EarthUniforms {
  readonly uNightMap: Uniform<Texture | null>;
  readonly uCloudMap: Uniform<Texture | null>;
  readonly uSpecularMap: Uniform<Texture | null>;
  readonly uHasNight: Uniform<number>;
  readonly uHasClouds: Uniform<number>;
  readonly uHasSpecular: Uniform<number>;
  /** Deriva de las nubes, en fracción de vuelta (0 con movimiento reducido o en captura). */
  readonly uCloudOffset: Uniform<number>;
  /** Opacidad de las nubes y de su sombra (`cloudOpacity`; 1 con el disco entero a la vista). */
  readonly uCloudOpacity: Uniform<number>;
  /** (albedo de las nubes, intensidad de las luces, brillo del océano, oscuridad de su sombra). */
  readonly uEarth: Uniform<Vector4>;
  /** Luz dispersada por la atmósfera (rgb lineal) y su refuerzo hacia el limbo (w). */
  readonly uScatter: Uniform<Vector4>;
  readonly uTwilightColor: Uniform<Color>;
  /** Tierras áridas: (rodilla, calidez desde, calidez hasta); `VISUAL_CONFIG.earth.arid`. */
  readonly uArid: Uniform<Vector3>;
  /** Centro de la Luna en el sistema propio de la Tierra (radios ecuatoriales) y su radio (w). */
  readonly uOccluderLocal: Uniform<Vector4>;
  /** Centro del Sol en el sistema propio de la Tierra (radios ecuatoriales) y su radio (w). */
  readonly uSunLocal: Uniform<Vector4>;
}

/** Uniformes de la Luna (fase 6): solo con `moon: true`. */
export interface MoonUniforms {
  /** Elevación del LOLA en 16 bits empaquetados en R y G (D15), sin mipmaps. */
  readonly uElevationMap: Uniform<Texture | null>;
  readonly uHasElevation: Uniform<number>;
  /** (Elevación del valor 0, la del intervalo entero), en radios de la Luna y con la exageración. */
  readonly uElevation: Uniform<Vector2>;
  /** Centro de la Tierra en el sistema propio de la Luna (radios de la Luna) y su radio de sombra (w). */
  readonly uOccluderLocal: Uniform<Vector4>;
  /** Centro del Sol en el sistema propio de la Luna (radios de la Luna) y su radio (w). */
  readonly uSunLocal: Uniform<Vector4>;
  /** Luz refractada dentro de la sombra de la Tierra (rgb lineal, en fracción de la del Sol). */
  readonly uUmbraLight: Uniform<Color>;
}

export interface BodyMaterialOptions {
  readonly color: Color;
  readonly polarScale: number;
  readonly photometry: Photometry;
  readonly haze: Haze | null;
  readonly hazeColor: string;
  /** La Tierra: nubes, océanos, luces nocturnas, crepúsculo y luz dispersada (`TLS_EARTH`). */
  readonly earth?: boolean;
  /** La Luna: relieve desplazado y coordenadas de textura por píxel (`TLS_MOON`). */
  readonly moon?: boolean;
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
    uContrast: new Uniform(1),
    uMeanLuminance: new Uniform(0.5),
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
  const earth: EarthUniforms | null = options.earth
    ? {
        uNightMap: new Uniform<Texture | null>(null),
        uCloudMap: new Uniform<Texture | null>(null),
        uSpecularMap: new Uniform<Texture | null>(null),
        uHasNight: new Uniform(0),
        uHasClouds: new Uniform(0),
        uHasSpecular: new Uniform(0),
        uCloudOffset: new Uniform(0),
        uCloudOpacity: new Uniform(1),
        uEarth: new Uniform(new Vector4(0.8, 1, 1, 0.35)),
        uScatter: new Uniform(new Vector4(0, 0, 0, 0)),
        uTwilightColor: new Uniform(new Color(1, 0.6, 0.35)),
        // Sin compresión hasta que se configura (rodilla enorme).
        uArid: new Uniform(new Vector3(1e6, 0.25, 0.4)),
        // Sin datos, la Luna lejísimos y del otro lado: no tapa nada.
        uOccluderLocal: new Uniform(new Vector4(0, 0, 1e6, 0)),
        uSunLocal: new Uniform(new Vector4(23_455, 0, 0, 109)),
      }
    : null;
  const moon: MoonUniforms | null = options.moon
    ? {
        uElevationMap: new Uniform<Texture | null>(null),
        uHasElevation: new Uniform(0),
        uElevation: new Uniform(new Vector2(0, 0)),
        // Sin datos, la Tierra lejísimos y del otro lado: no tapa nada.
        uOccluderLocal: new Uniform(new Vector4(0, 0, 1e6, 0)),
        uSunLocal: new Uniform(new Vector4(86_000, 0, 0, 400)),
        uUmbraLight: new Uniform(new Color(0, 0, 0)),
      }
    : null;
  const defines = {
    ...(options.earth ? { TLS_EARTH: '' } : {}),
    ...(options.moon ? { TLS_MOON: '' } : {}),
  };
  const material = sceneShaderMaterial({
    name: options.earth ? 'tls-earth' : options.moon ? 'tls-moon' : 'tls-body',
    uniforms: { ...uniforms, ...earth, ...moon } as unknown as Record<string, Uniform>,
    vertexShader,
    fragmentShader,
    ...(Object.keys(defines).length > 0 ? { defines } : {}),
  });
  return { material, uniforms, earth, moon };
}
