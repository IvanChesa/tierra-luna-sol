/**
 * Escalas de la escena (PLAN §4.4). Funciones puras en float64; las usan igual los cuerpos, las
 * órbitas y las estelas para que todo encaje.
 *
 * - Ilustrativa: la distancia al Sol se comprime con r_vis = K · log10(1 + r / R0), con R0 = 0,1 UA,
 *   y la dirección real se conserva. Los radios se agrandan con una potencia acotada.
 * - Real: distancias y radios físicos (en unidades de escena de `kmPerUnit` km).
 * - Transición: interpolación geométrica de las distancias y los radios. Como la escala
 *   ilustrativa conserva las direcciones y el orden de las distancias, ningún cuerpo adelanta a
 *   otro a mitad de la transición.
 *
 * Los tres marcos de la escena (D12) se describen con {@link FrameSpec}: el ilustrativo, el sistema
 * local físico de un planeta y la escala real global (los dos últimos, geometría real con distinta
 * unidad). Las transiciones entre marcos se hacen relativas al foco ({@link blendPlacements}).
 */
import { KM_PER_AU } from './constants';
import { Vec3, length, lerp, scale, vec3 } from './vec3';

export type ScaleMode = 'illustrative' | 'real';

export interface IllustrativeScale {
  /** K: unidades de escena por década de distancia. */
  readonly unitsPerDecade: number;
  /** R0: distancia de referencia, en UA. */
  readonly referenceAu: number;
  /** Radio visible = clamp(radiusFactor · radio_km ^ radiusExponent, minRadius, maxRadius). */
  readonly radiusFactor: number;
  readonly radiusExponent: number;
  readonly minRadius: number;
  readonly maxRadius: number;
  /** Separación de los sistemas de lunas: offset_vis = R_vis · (1 + moonSpread · log10(r / R)). */
  readonly moonSpread: number;
}

/**
 * Valores de presentación, sin significado físico: Neptuno queda a ~248 unidades, la Tierra a ~104 y
 * Mercurio a ~69. Los radios (fase 4b, planetas más visibles en la vista general) son los mayores con
 * los que, de 1900 a 2100, ningún disco toca el Sol ni otro planeta, Júpiter no entra en los anillos
 * de Saturno y ninguna luna toca otro planeta (muestreo en `scene/illustrative-layout.spec.ts`): el
 * límite lo ponen las conjunciones de Júpiter y Saturno (a ~24 unidades en 1921) y la Luna entre la
 * Tierra y Venus (a ~12). Júpiter mide 7,7 unidades (5,2 antes), la Tierra 2,9 (2,0) y el Sol 13 (9).
 * Las lunas se agrupan cerca de su planeta (`moonSpread` 0,5, antes 1,5): si no, al crecer los
 * planetas, sus sistemas crecerían con ellos y chocarían con los vecinos.
 */
export const DEFAULT_ILLUSTRATIVE_SCALE: IllustrativeScale = {
  unitsPerDecade: 100,
  referenceAu: 0.1,
  radiusFactor: 0.088,
  radiusExponent: 0.4,
  minRadius: 0.25,
  maxRadius: 13,
  moonSpread: 0.5,
};

export interface RealScale {
  /** Kilómetros por unidad de escena. */
  readonly kmPerUnit: number;
}

export const DEFAULT_REAL_SCALE: RealScale = { kmPerUnit: 1_000_000 };

/** Distancia ilustrativa (unidades de escena) para una distancia real en UA. Monótona creciente. */
export function illustrativeDistance(
  distanceAu: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  if (distanceAu < 0 || Number.isNaN(distanceAu)) throw new RangeError('Distancia no válida.');
  return params.unitsPerDecade * Math.log10(1 + distanceAu / params.referenceAu);
}

/** Inversa de {@link illustrativeDistance}. */
export function illustrativeDistanceToAu(
  units: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  return params.referenceAu * (10 ** (units / params.unitsPerDecade) - 1);
}

/** Cambia la longitud de un vector conservando su dirección. El vector nulo se queda nulo. */
function withLength(v: Vec3, newLength: number): Vec3 {
  const len = length(v);
  return len === 0 ? v : scale(v, newLength / len);
}

/** Posición heliocéntrica (UA) → posición ilustrativa (unidades de escena), misma dirección. */
export const illustrativePosition = (
  heliocentricAu: Vec3,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): Vec3 => withLength(heliocentricAu, illustrativeDistance(length(heliocentricAu), params));

/** Posición heliocéntrica (UA) → posición real (unidades de escena). */
export const realPosition = (heliocentricAu: Vec3, params: RealScale = DEFAULT_REAL_SCALE): Vec3 =>
  scale(heliocentricAu, KM_PER_AU / params.kmPerUnit);

/** Radio visible de un cuerpo en la escala ilustrativa. Monótono y acotado. */
export function illustrativeRadius(
  radiusKm: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  const raw = params.radiusFactor * radiusKm ** params.radiusExponent;
  return Math.min(Math.max(raw, params.minRadius), params.maxRadius);
}

export const realRadius = (radiusKm: number, params: RealScale = DEFAULT_REAL_SCALE): number =>
  radiusKm / params.kmPerUnit;

/**
 * Posición de una luna respecto a su planeta en la escala ilustrativa: misma dirección y una
 * distancia que crece con el logaritmo de la real, siempre fuera del planeta agrandado.
 */
export function illustrativeMoonOffset(
  offsetAu: Vec3,
  planetRadiusKm: number,
  planetVisibleRadius: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): Vec3 {
  const ratio = Math.max((length(offsetAu) * KM_PER_AU) / planetRadiusKm, 1);
  return withLength(offsetAu, planetVisibleRadius * (1 + params.moonSpread * Math.log10(ratio)));
}

/** Interpolación geométrica de dos magnitudes positivas: t = 0 da `a`, t = 1 da `b`. */
export function blendMagnitude(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (a <= 0 || b <= 0) return a + (b - a) * t;
  return a ** (1 - t) * b ** t;
}

/**
 * Transición entre dos posiciones de un mismo cuerpo (por ejemplo, ilustrativa → real con t de 0
 * a 1). La dirección gira a velocidad angular constante (interpolación esférica de los vectores
 * unitarios) y la distancia se interpola de forma geométrica. Las direcciones se normalizan antes
 * de interpolar: si una distancia es miles de veces la otra, interpolar los vectores tal cual haría
 * girar casi todo el ángulo en el primer instante.
 */
export function blendPosition(from: Vec3, to: Vec3, t: number): Vec3 {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const lengthFrom = length(from);
  const lengthTo = length(to);
  if (lengthFrom === 0 || lengthTo === 0) return lerp(from, to, t);
  const a = scale(from, 1 / lengthFrom);
  const b = scale(to, 1 / lengthTo);
  const angle = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));
  const sinAngle = Math.sin(angle);
  // Con direcciones casi iguales (o casi opuestas), la interpolación lineal normalizada es estable.
  const direction =
    sinAngle < 1e-6
      ? lerp(a, b, t)
      : vec3(
          (Math.sin((1 - t) * angle) * a.x + Math.sin(t * angle) * b.x) / sinAngle,
          (Math.sin((1 - t) * angle) * a.y + Math.sin(t * angle) * b.y) / sinAngle,
          (Math.sin((1 - t) * angle) * a.z + Math.sin(t * angle) * b.z) / sinAngle,
        );
  return withLength(direction, blendMagnitude(lengthFrom, lengthTo, t));
}

// --- Marcos de escala (D12, PLAN §4.4) --------------------------------------------------------

/**
 * Un marco de escala: cómo se colocan y se dimensionan los cuerpos en la escena.
 * - `illustrative`: la vista general (distancias logarítmicas, radios agrandados, sistemas de lunas
 *   compactos).
 * - `physical`: geometría real (distancias y radios en km) con `kmPerUnit` km por unidad de escena.
 *   Con {@link localPhysicalKmPerUnit} es el «sistema local físico» de un planeta; con
 *   {@link globalPhysicalKmPerUnit}, la «escala real global».
 */
export type FrameSpec =
  | { readonly kind: 'illustrative'; readonly params: IllustrativeScale }
  | { readonly kind: 'physical'; readonly kmPerUnit: number };

export const illustrativeFrame = (
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): FrameSpec => ({ kind: 'illustrative', params });

/**
 * Unidad del sistema local físico de un planeta: la que deja su radio igual que en la escala
 * ilustrativa. Así, al enfocarlo, el planeta no cambia de tamaño y lo que se reorganiza es lo demás:
 * sus lunas se colocan a su distancia real respecto a él y el resto del sistema, a la suya.
 */
export const localPhysicalKmPerUnit = (
  planetRadiusKm: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number => planetRadiusKm / illustrativeRadius(planetRadiusKm, params);

/**
 * Unidad de la escala real global: la que deja una distancia de referencia (por ejemplo, el semieje
 * de Neptuno) donde la pone la escala ilustrativa. El sistema conserva su extensión al cambiar de
 * escala y lo que cambia es la proporción entre distancias y tamaños.
 */
export function globalPhysicalKmPerUnit(
  referenceAu: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  if (!(referenceAu > 0)) throw new RangeError('Distancia de referencia no válida.');
  return (referenceAu * KM_PER_AU) / illustrativeDistance(referenceAu, params);
}

/**
 * Coloca un punto heliocéntrico (UA) como si fuera un planeta. Lo usan los planetas y los puntos de
 * sus órbitas: así las órbitas pasan exactamente por los cuerpos en cualquier marco.
 */
export function placeHeliocentricPoint(frame: FrameSpec, pointAu: Vec3): Vec3 {
  return frame.kind === 'illustrative'
    ? illustrativePosition(pointAu, frame.params)
    : scale(pointAu, KM_PER_AU / frame.kmPerUnit);
}

/** Planeta del que cuelga una luna, ya colocado en el marco. */
export interface PlacedParent {
  readonly position: Vec3;
  readonly radius: number;
  readonly radiusKm: number;
}

/**
 * Coloca una luna (o un punto de su órbita) a partir de su desplazamiento respecto a su planeta
 * (UA). En el marco ilustrativo se separa con {@link illustrativeMoonOffset}; en el físico, a su
 * distancia real.
 */
export function placeMoonPoint(frame: FrameSpec, parent: PlacedParent, offsetAu: Vec3): Vec3 {
  const offset =
    frame.kind === 'illustrative'
      ? illustrativeMoonOffset(offsetAu, parent.radiusKm, parent.radius, frame.params)
      : scale(offsetAu, KM_PER_AU / frame.kmPerUnit);
  return vec3(
    parent.position.x + offset.x,
    parent.position.y + offset.y,
    parent.position.z + offset.z,
  );
}

/** Radio visible de un cuerpo en un marco. */
export const placeRadius = (frame: FrameSpec, radiusKm: number): number =>
  frame.kind === 'illustrative'
    ? illustrativeRadius(radiusKm, frame.params)
    : radiusKm / frame.kmPerUnit;

/** Lo que hace falta para colocar todos los cuerpos (arrays en el orden del estado del sistema). */
export interface PlacementInput {
  /** x, y, z heliocéntricos (UA, ECL). */
  readonly heliocentric: Float64Array;
  /** x, y, z respecto al padre (UA, ECL). */
  readonly parentOffset: Float64Array;
  /** Índice del padre; −1 en la raíz (el Sol). */
  readonly parentIndex: Int16Array;
  /** Radio físico de cada cuerpo (km). */
  readonly radiusKm: Float64Array;
}

/** Posiciones (x, y, z) y radios en unidades de escena. */
export interface Placement {
  readonly position: Float64Array;
  readonly radius: Float64Array;
}

export const createPlacement = (count: number): Placement => ({
  position: new Float64Array(3 * count),
  radius: new Float64Array(count),
});

/** Lee el vector `k` de un array x, y, z intercalado. */
function at(array: Float64Array, k: number): Vec3 {
  const i = 3 * k;
  if (k < 0 || i + 2 >= array.length) throw new RangeError('Índice de cuerpo fuera de rango.');
  return vec3(array[i] as number, array[i + 1] as number, array[i + 2] as number);
}

/** Lee un elemento de un array tipado con comprobación de límites. */
function item(array: Float64Array | Int16Array, k: number): number {
  if (k < 0 || k >= array.length) throw new RangeError('Índice de cuerpo fuera de rango.');
  return array[k] as number;
}

function put(array: Float64Array, k: number, v: Vec3): void {
  array[3 * k] = v.x;
  array[3 * k + 1] = v.y;
  array[3 * k + 2] = v.z;
}

/**
 * Coloca todos los cuerpos en un marco, en coordenadas absolutas de escena (el Sol en el origen).
 * Los padres tienen que ir antes que sus lunas (como en `SystemLayout`).
 */
export function placeBodies(
  frame: FrameSpec,
  input: PlacementInput,
  out: Placement = createPlacement(input.radiusKm.length),
): Placement {
  const n = input.radiusKm.length;
  for (let k = 0; k < n; k++) {
    out.radius[k] = placeRadius(frame, item(input.radiusKm, k));
    const parent = item(input.parentIndex, k);
    if (parent < 0 || item(input.parentIndex, parent) < 0) {
      // El Sol y los planetas: posición heliocéntrica.
      put(out.position, k, placeHeliocentricPoint(frame, at(input.heliocentric, k)));
    } else {
      // Una luna: alrededor de su planeta ya colocado.
      const placedParent: PlacedParent = {
        position: at(out.position, parent),
        radius: item(out.radius, parent),
        radiusKm: item(input.radiusKm, parent),
      };
      put(out.position, k, placeMoonPoint(frame, placedParent, at(input.parentOffset, k)));
    }
  }
  return out;
}

/**
 * Posiciones relativas al foco (origen flotante) y radios a mitad de una transición entre dos
 * colocaciones (`t` de 0 a 1). Cada cuerpo interpola su posición RELATIVA AL FOCO con
 * {@link blendPosition} y su radio con {@link blendMagnitude}. Con `t = 0` o sin transición
 * (`from === to`) es simplemente la colocación relativa al foco.
 *
 * Propiedades (con tests): el foco se queda en el origen; un cuerpo que no toca al foco en los dos
 * extremos no lo toca en ningún momento (desigualdad de Hölder); y si dos cuerpos están en el mismo
 * orden de distancia al foco en los dos extremos, lo mantienen durante toda la transición.
 */
export function blendPlacements(
  from: Placement,
  to: Placement,
  focusIndex: number,
  t: number,
  out: Placement = createPlacement(from.radius.length),
): Placement {
  const n = from.radius.length;
  const focusFrom = at(from.position, focusIndex);
  const focusTo = at(to.position, focusIndex);
  for (let k = 0; k < n; k++) {
    const a = at(from.position, k);
    const relFrom = vec3(a.x - focusFrom.x, a.y - focusFrom.y, a.z - focusFrom.z);
    if (from === to || t <= 0) {
      put(out.position, k, relFrom);
      out.radius[k] = item(from.radius, k);
      continue;
    }
    const b = at(to.position, k);
    const relTo = vec3(b.x - focusTo.x, b.y - focusTo.y, b.z - focusTo.z);
    put(out.position, k, blendPosition(relFrom, relTo, t));
    out.radius[k] = blendMagnitude(item(from.radius, k), item(to.radius, k), t);
  }
  return out;
}
