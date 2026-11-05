/**
 * Los materiales de la vista del cielo (fase 8). Todos incluyen los chunks de profundidad (D13,
 * `sceneShaderMaterial`), aunque en esta escena nada escribe profundidad: todo está en el infinito,
 * centrado en la cámara, y el orden lo da `renderOrder`.
 *
 * El orden de pintado sigue a la luz: primero lo que está fuera de la atmósfera (la Vía Láctea, las
 * estrellas, las constelaciones, el Sol, la Luna y los planetas) sobre negro, después **la luz del
 * cielo, sumada** (la atmósfera está delante de todo: la cara oscura de la Luna se ve del color del
 * cielo, de día las estrellas no se ven y la Luna tapa al Sol en un eclipse) y por último el suelo,
 * opaco, que tapa lo que queda bajo el horizonte.
 *
 * Las direcciones van en los ejes del cielo en Three (X al este, Y al cénit, Z al sur). Las estrellas y
 * las líneas de las constelaciones llevan la refracción de `ephemeris/sky.ts` (`refractionDeg`, la
 * `normal` de astronomy-engine), copiada aquí en GLSL.
 */
import { AdditiveBlending, Color, Matrix3, NormalBlending, Texture, Uniform, Vector3 } from 'three';
import { SOLAR_LIMB_EXPONENTS } from '../../ephemeris/sun';
import {
  DEPTH_FRAGMENT,
  DEPTH_FRAGMENT_PARS,
  DEPTH_VERTEX,
  DEPTH_VERTEX_PARS,
  OUTPUT_FRAGMENT,
  sceneShaderMaterial,
} from '../materials/depth';
import { CORONA_GLSL } from '../materials/sun-material';

/**
 * La refracción `normal` de astronomy-engine en GLSL (grados), la misma que `refractionDeg`: Saemundsson
 * acotada a −1° y reducida linealmente hasta el nadir. Y la dirección aparente: la geométrica levantada
 * hacia el cénit por la refracción, con su rumbo.
 */
const REFRACTION = /* glsl */ `
float tlsRefractionDeg(float h) {
  if (h < -90.0 || h > 90.0) return 0.0;
  float hd = max(h, -1.0);
  float r = 1.02 / tan(radians(hd + 10.3 / (hd + 5.11))) / 60.0;
  if (h < -1.0) r *= (h + 90.0) / 89.0;
  return r;
}

vec3 tlsApparent(vec3 direction) {
  vec3 d = normalize(direction);
  float h = degrees(asin(clamp(d.y, -1.0, 1.0)));
  float lifted = radians(h + tlsRefractionDeg(h));
  vec2 ground = d.xz;
  float len = length(ground);
  ground = len > 1e-6 ? ground / len : vec2(0.0, -1.0);
  return vec3(ground.x * cos(lifted), sin(lifted), ground.y * cos(lifted));
}

/** Masa de aire (Kasten y Young, 1989) a esa altura aparente (grados). */
float tlsAirmass(float h) {
  float s = sin(radians(max(h, 0.0)));
  return 1.0 / (s + 0.50572 * pow(max(h, 0.0) + 6.07995, -1.6364));
}
`;

const SKY_VERTEX_PARS = /* glsl */ `
${DEPTH_VERTEX_PARS}
uniform float uSkyDistance;
`;

/** Una dirección (en el infinito) en la posición de recorte: solo gira con la cámara. */
const PROJECT_DIRECTION = /* glsl */ `
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * direction * uSkyDistance, 1.0);
`;

// --- La luz del cielo (la cúpula) ------------------------------------------------------------------

export function createSkyDomeMaterial() {
  const uniforms = {
    uSkyDistance: new Uniform(1),
    uZenith: new Uniform(new Color()),
    uHorizon: new Uniform(new Color()),
    uGlow: new Uniform(new Color()),
    uSunDirection: new Uniform(new Vector3(0, -1, 0)),
    uGlowPower: new Uniform(6),
    uGlowRise: new Uniform(3),
    /** El brillo del cielo (1, o menos en un eclipse). */
    uBrightness: new Uniform(1),
    /**
     * La totalidad de un eclipse de Sol (0–1, fase 9b, E1): sin el resplandor alrededor del Sol, con el
     * anillo del horizonte y la Luna más oscura que el cielo.
     */
    uTotality: new Uniform(0),
    /**
     * El anillo de todo el horizonte en la totalidad (el «atardecer de 360°»), en dos partes: una
     * naranja pegada al horizonte y otra amarilla algo más alta (su color y su altura, rad).
     */
    uRingInner: new Uniform(new Color()),
    uRingInnerHeight: new Uniform(0.016),
    uRingOuter: new Uniform(new Color()),
    uRingOuterHeight: new Uniform(0.035),
    /** La Luna (dirección en los ejes del cielo y radio angular, rad) y lo que se oscurece su disco. */
    uMoonDirection: new Uniform(new Vector3(0, -1, 0)),
    uMoonRadius: new Uniform(0.0045),
    uMoonVeil: new Uniform(0),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-dome',
    uniforms,
    vertexShader: /* glsl */ `
      ${SKY_VERTEX_PARS}
      varying vec3 vDirection;
      void main() {
        vec3 direction = position;
        vDirection = position;
        ${PROJECT_DIRECTION}
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uGlow;
      uniform vec3 uSunDirection;
      uniform float uGlowPower;
      uniform float uGlowRise;
      uniform float uBrightness;
      uniform float uTotality;
      uniform vec3 uRingInner;
      uniform float uRingInnerHeight;
      uniform vec3 uRingOuter;
      uniform float uRingOuterHeight;
      uniform vec3 uMoonDirection;
      uniform float uMoonRadius;
      uniform float uMoonVeil;
      varying vec3 vDirection;
      void main() {
        ${DEPTH_FRAGMENT}
        vec3 d = normalize(vDirection);
        float h = max(d.y, 0.0);
        // Del horizonte al cénit, más deprisa cerca del horizonte (la masa de aire).
        vec3 color = mix(uHorizon, uZenith, pow(h, 0.45));
        // El resplandor del lado del Sol, pegado al horizonte, y un halo alrededor del Sol. En la
        // totalidad no hay luz directa del Sol: ninguno de los dos.
        vec3 sun = normalize(uSunDirection);
        float toward = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-6), normalize(vec3(sun.x, 0.0, sun.z) + 1e-6)), 0.0);
        float band = pow(toward, uGlowPower) * pow(1.0 - h, uGlowRise);
        float halo = pow(max(dot(d, sun), 0.0), 64.0) * 0.6 + pow(max(dot(d, sun), 0.0), 8.0) * 0.15;
        color += uGlow * (band + halo * smoothstep(-0.2, 0.05, sun.y)) * (1.0 - uTotality);
        // La totalidad: el anillo de todo el horizonte (el aire iluminado fuera de la sombra de la Luna)
        // y la Luna, más oscura que el cielo que la rodea (ilustrativo, como en las fotos).
        if (uTotality > 0.0) {
          float altitude = asin(h);
          vec3 ring = uRingInner * exp(-altitude / uRingInnerHeight)
            + uRingOuter * exp(-altitude / uRingOuterHeight);
          color += ring * uTotality;
          vec3 moon = normalize(uMoonDirection);
          float apart = atan(length(cross(d, moon)), dot(d, moon));
          color *= 1.0 - uMoonVeil * (1.0 - smoothstep(uMoonRadius * 0.97, uMoonRadius, apart));
        }
        gl_FragColor = vec4(color * uBrightness, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return { material, uniforms };
}

// --- El suelo ----------------------------------------------------------------------------------------

export function createGroundMaterial() {
  const uniforms = {
    uSkyDistance: new Uniform(1),
    uColor: new Uniform(new Color()),
    /** Una línea de horizonte algo más clara (el borde de la silueta). */
    uRim: new Uniform(new Color()),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-ground',
    uniforms,
    vertexShader: /* glsl */ `
      ${SKY_VERTEX_PARS}
      varying vec3 vDirection;
      void main() {
        vec3 direction = position;
        vDirection = position;
        ${PROJECT_DIRECTION}
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform vec3 uColor;
      uniform vec3 uRim;
      varying vec3 vDirection;
      void main() {
        ${DEPTH_FRAGMENT}
        vec3 d = normalize(vDirection);
        if (d.y > 0.0) discard;
        // Una franja de unos 0,4° bajo el horizonte, más clara: se lee dónde acaba el cielo.
        float rim = 1.0 - smoothstep(0.0, 0.007, -d.y);
        gl_FragColor = vec4(mix(uColor, uRim, rim), 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: NormalBlending,
    toneMapped: false,
  });
  return { material, uniforms };
}

// --- Las estrellas ----------------------------------------------------------------------------------

export function createSkyStarMaterial() {
  const uniforms = {
    uSkyDistance: new Uniform(1),
    /** ECL en ejes de Three → el cielo del lugar (`eclThreeToSkyThree`). */
    uSkyRotation: new Uniform(new Matrix3()),
    uPixelRatio: new Uniform(1),
    uMagnitudeLimit: new Uniform(6.5),
    uExtinction: new Uniform(0.25),
    /** Cuánto crecen los puntos al estrechar el campo (raíz del aumento, acotada). */
    uZoom: new Uniform(1),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-stars',
    uniforms,
    vertexShader: /* glsl */ `
      ${SKY_VERTEX_PARS}
      ${REFRACTION}
      attribute float aMagnitude;
      attribute vec3 aColor;
      uniform mat3 uSkyRotation;
      uniform float uPixelRatio;
      uniform float uMagnitudeLimit;
      uniform float uExtinction;
      uniform float uZoom;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 direction = tlsApparent(uSkyRotation * position);
        float h = degrees(asin(clamp(direction.y, -1.0, 1.0)));
        // Extinción: más débil junto al horizonte (k magnitudes por masa de aire).
        float magnitude = aMagnitude + uExtinction * (tlsAirmass(h) - 1.0);
        float flux = pow(10.0, -0.4 * (magnitude - 1.0));
        float size = clamp(1.5 + 2.5 * sqrt(flux), 1.5, 6.5) * uZoom;
        // Se apagan poco a poco al acercarse al límite, en vez de desaparecer de golpe.
        float fade = clamp(uMagnitudeLimit + 0.5 - magnitude, 0.0, 1.0);
        gl_PointSize = (h < -0.5 || fade <= 0.0) ? 0.0 : size * uPixelRatio;
        vAlpha = clamp(0.32 + 0.9 * sqrt(flux), 0.0, 1.0) * fade;
        vColor = aColor;
        ${PROJECT_DIRECTION}
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        ${DEPTH_FRAGMENT}
        float d = length(gl_PointCoord - vec2(0.5));
        float disc = 1.0 - smoothstep(0.15, 0.5, d);
        if (disc <= 0.0) discard;
        gl_FragColor = vec4(vColor * vAlpha * disc, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}

// --- Las líneas de las constelaciones -------------------------------------------------------------

export function createConstellationMaterial() {
  const uniforms = {
    uSkyDistance: new Uniform(1),
    uSkyRotation: new Uniform(new Matrix3()),
    uColor: new Uniform(new Color('#7f9cc4')),
    uOpacity: new Uniform(0.5),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-constellations',
    uniforms,
    vertexShader: /* glsl */ `
      ${SKY_VERTEX_PARS}
      ${REFRACTION}
      uniform mat3 uSkyRotation;
      varying float vAltitude;
      void main() {
        vec3 direction = tlsApparent(uSkyRotation * position);
        vAltitude = direction.y;
        ${PROJECT_DIRECTION}
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAltitude;
      void main() {
        ${DEPTH_FRAGMENT}
        // Más tenues junto al horizonte, donde se juntan con el suelo.
        float fade = smoothstep(-0.01, 0.12, vAltitude);
        gl_FragColor = vec4(uColor * uOpacity * fade, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return { material, uniforms };
}

// --- El Sol ----------------------------------------------------------------------------------------

/**
 * El disco del Sol (un cuadrado de cara a la cámara, con su radio aparente) con el oscurecimiento del
 * limbo por canal de Hestroffer y Magnan (1998; `ephemeris/sun.ts`, fase 9b), en blanco: la luz que lo
 * rodea la pone la cúpula. Se pinta opaco: la Luna, que va después, lo tapa en un eclipse.
 */
export function createSunDiscMaterial() {
  const [red, green, blue] = SOLAR_LIMB_EXPONENTS;
  const uniforms = {
    uIntensity: new Uniform(1.6),
    uLimbExponent: new Uniform(new Vector3(red, green, blue)),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-sun',
    uniforms,
    vertexShader: /* glsl */ `
      ${DEPTH_VERTEX_PARS}
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform float uIntensity;
      uniform vec3 uLimbExponent;
      varying vec2 vUv;
      void main() {
        ${DEPTH_FRAGMENT}
        float r = length(vUv);
        if (r > 1.0) discard;
        // Oscurecimiento del limbo por canal: I(μ)/I(1) = μ^α.
        float mu = sqrt(max(1.0 - r * r, 0.0));
        vec3 limb = pow(vec3(max(mu, 1e-4)), uLimbExponent);
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * uIntensity * limb, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
  });
  return { material, uniforms };
}

/** El cuadrado de la corona del cielo mide esto en radios solares (desde el centro). */
export const SKY_CORONA_RADII = 6;

/**
 * La corona del Sol: solo se ve en la totalidad de un eclipse (de día la tapa la luz del cielo). Un
 * resplandor blanco nacarado, casi redondo y con serpentinas que salen del ecuador del Sol y se afilan
 * al alejarse (`CORONA_GLSL`, la misma del Sol del espacio en primer plano), en un cuadrado de
 * `SKY_CORONA_RADII` radios solares. Ilustrativa en su forma: no es la de cada eclipse.
 */
export function createCoronaMaterial() {
  const uniforms = {
    uStrength: new Uniform(0),
    /** Ángulo en pantalla del polo norte del Sol (rad), para orientar las serpentinas. */
    uPoleAngle: new Uniform(Math.PI / 2),
    /** De 0 (la corona del mínimo del ciclo, con serpentinas) a 1 (la del máximo, redonda). */
    uRoundness: new Uniform(0.45),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-corona',
    uniforms,
    vertexShader: /* glsl */ `
      ${DEPTH_VERTEX_PARS}
      varying vec2 vUv;
      void main() {
        vUv = (uv * 2.0 - 1.0) * ${SKY_CORONA_RADII.toFixed(1)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform float uStrength;
      uniform float uPoleAngle;
      uniform float uRoundness;
      varying vec2 vUv;
      ${CORONA_GLSL}
      void main() {
        ${DEPTH_FRAGMENT}
        float r = length(vUv);
        if (r < 1.0 || r > ${SKY_CORONA_RADII.toFixed(1)}) discard;
        float theta = atan(vUv.y, vUv.x) - uPoleAngle;
        // Se apaga despacio hacia el borde del cuadrado: sin un círculo marcado alrededor.
        float glow = tlsCorona(r, theta, uRoundness) * (1.0 - smoothstep(3.0, ${SKY_CORONA_RADII.toFixed(1)}, r));
        gl_FragColor = vec4(vec3(0.95, 0.93, 0.88) * glow * uStrength, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return { material, uniforms };
}

// --- La Luna ---------------------------------------------------------------------------------------

/**
 * La Luna: una esfera con su textura (si está cargada) y su orientación real (con la libración),
 * iluminada desde el Sol (Lommel–Seeliger, como en el espacio, D29) y con la sombra de la Tierra en los
 * eclipses (umbra rojiza y penumbra, D20): la de la Tierra vista desde su centro, la misma para
 * cualquier observador. Opaca: la cara oscura es negra, y la cúpula, que se suma después, le pone el
 * color del cielo.
 */
export function createSkyMoonMaterial() {
  const uniforms = {
    uMap: new Uniform<Texture | null>(null),
    uHasMap: new Uniform(0),
    uColor: new Uniform(new Color('#9b9890')),
    /** Hacia el Sol, en los ejes del cielo. */
    uSunDirection: new Uniform(new Vector3(0, 1, 0)),
    /** La Luna y el punto antisolar vistos desde el centro de la Tierra (ejes del cielo). */
    uMoonGeocentric: new Uniform(new Vector3(0, 0, -1)),
    uAntisolar: new Uniform(new Vector3(0, 0, 1)),
    /** Radios angulares (rad) de la Luna, la umbra y la penumbra, desde el centro de la Tierra. */
    uMoonRadius: new Uniform(0.0045),
    uUmbra: new Uniform(0.012),
    uPenumbra: new Uniform(0.021),
    uUmbraColor: new Uniform(new Color('#b8502e')),
    uUmbraLight: new Uniform(0.18),
    uBrightness: new Uniform(1),
    /** El meridiano 0 de la textura (`meridianOffset` del manifiesto). */
    uMeridianOffset: new Uniform(0),
  };
  const material = sceneShaderMaterial({
    name: 'tls-sky-moon',
    uniforms,
    vertexShader: /* glsl */ `
      ${DEPTH_VERTEX_PARS}
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform vec3 uColor;
      uniform vec3 uSunDirection;
      uniform vec3 uMoonGeocentric;
      uniform vec3 uAntisolar;
      uniform float uMoonRadius;
      uniform float uUmbra;
      uniform float uPenumbra;
      uniform vec3 uUmbraColor;
      uniform float uUmbraLight;
      uniform float uBrightness;
      uniform float uMeridianOffset;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        ${DEPTH_FRAGMENT}
        vec3 n = normalize(vNormal);
        vec3 sun = normalize(uSunDirection);
        vec3 view = -normalize(uMoonGeocentric);
        float mu0 = max(dot(n, sun), 0.0);
        float mu = max(dot(n, view), 0.0);
        // Lommel–Seeliger: el disco lleno no se oscurece hacia el borde, como la Luna real. En el limbo
        // rasante (mu → 0) se dispara: se apaga ahí (en un eclipse de Sol salía un anillo de puntos).
        float light = mu0 > 0.0 ? 2.0 * mu0 / (mu0 + mu + 1e-4) * smoothstep(0.0, 0.06, mu) : 0.0;
        vec3 albedo = uHasMap > 0.5
          ? texture2D(uMap, vec2(fract(vUv.x + uMeridianOffset), vUv.y)).rgb
          : uColor;
        // La sombra de la Tierra: este punto de la Luna, visto desde el centro de la Tierra, frente al
        // eje de la sombra (aproximación de ángulos pequeños: la Luna mide medio grado).
        vec3 point = normalize(normalize(uMoonGeocentric) + n * uMoonRadius);
        float axis = acos(clamp(dot(point, normalize(uAntisolar)), -1.0, 1.0));
        float penumbra = smoothstep(uUmbra, uPenumbra, axis);
        float umbra = 1.0 - smoothstep(uUmbra * 0.97, uUmbra * 1.03, axis);
        vec3 sunlit = albedo * light * penumbra;
        vec3 red = albedo * uUmbraColor * uUmbraLight * umbra;
        gl_FragColor = vec4((sunlit + red) * uBrightness, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
  });
  return { material, uniforms };
}

// --- Los planetas ---------------------------------------------------------------------------------

/** Los planetas: puntos con su color y un tamaño según su magnitud (como las estrellas, mayores). */
export function createPlanetMaterial() {
  const uniforms = { uPixelRatio: new Uniform(1), uZoom: new Uniform(1) };
  const material = sceneShaderMaterial({
    name: 'tls-sky-planets',
    uniforms,
    vertexShader: /* glsl */ `
      ${DEPTH_VERTEX_PARS}
      attribute float aMagnitude;
      attribute float aVisible;
      attribute vec3 aColor;
      uniform float uPixelRatio;
      uniform float uZoom;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float flux = pow(10.0, -0.4 * (aMagnitude - 1.0));
        float size = clamp(2.6 + 2.2 * sqrt(flux), 2.6, 9.0) * uZoom;
        gl_PointSize = aVisible > 0.0 ? size * uPixelRatio : 0.0;
        vAlpha = clamp(0.45 + 0.6 * sqrt(flux), 0.0, 1.0) * aVisible;
        vColor = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        ${DEPTH_VERTEX}
      }
    `,
    fragmentShader: /* glsl */ `
      ${DEPTH_FRAGMENT_PARS}
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        ${DEPTH_FRAGMENT}
        float d = length(gl_PointCoord - vec2(0.5));
        float disc = 1.0 - smoothstep(0.2, 0.5, d);
        if (disc <= 0.0) discard;
        gl_FragColor = vec4(vColor * vAlpha * disc, 1.0);
        ${OUTPUT_FRAGMENT}
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: AdditiveBlending,
  });
  return { material, uniforms };
}
