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
  /**
   * Aire mínimo entre dos discos, o entre un disco y los anillos de Saturno (unidades): si dos cuerpos
   * se acercan más, encogen los dos ({@link relieveOverlaps}; revisión del bloque C, C2).
   */
  readonly minGap: number;
}

/**
 * Valores de presentación, sin significado físico: Neptuno queda a ~248 unidades, la Tierra a ~104 y
 * Mercurio a ~69.
 *
 * Los radios: en la fase 4b, los mayores con los que, de 1900 a 2100, ningún disco tocaba el Sol, otro
 * planeta ni los anillos de Saturno (`radiusFactor` 0,084: Júpiter, 7,3 unidades). Los limitaban unas
 * pocas conjunciones de Júpiter y Saturno en 200 años. Desde la revisión del bloque C (C2, decisión de
 * Iván), un 25 % más grandes (0,105: Júpiter, 9,1 unidades; la Tierra, 3,5; el Sol, el mayor, sigue
 * en 13) y, cuando dos cuerpos se acercan más que sus radios (o los anillos de Saturno) más
 * `minGap`, solo esos dos encogen suavemente y recuperan el tamaño al separarse
 * ({@link relieveOverlaps}): en las conjunciones de Júpiter y Saturno. Lo comprueba el muestreo de
 * `scene/illustrative-layout.spec.ts`.
 *
 * Las lunas se agrupan cerca de su planeta (`moonSpread` 0,5, antes 1,5): si no, al crecer los
 * planetas, sus sistemas crecerían con ellos y chocarían con los vecinos. Un sistema encoge con su
 * planeta. En esas conjunciones, las lunas de Júpiter llegan a los anillos y a las lunas de Saturno,
 * pero en la vista general no se dibujan: sus sistemas no se distinguen.
 */
export const DEFAULT_ILLUSTRATIVE_SCALE: IllustrativeScale = {
  unitsPerDecade: 100,
  referenceAu: 0.1,
  radiusFactor: 0.105,
  radiusExponent: 0.4,
  minRadius: 0.25,
  maxRadius: 13,
  moonSpread: 0.5,
  minGap: 1.5,
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
 * sus lunas se colocan a su distancia real respecto a él y el resto del sistema, a la suya. (Salvo
 * si en la vista general estaba encogido junto a otro cuerpo o agrandado hasta su tamaño mínimo en
 * pantalla, D35: entonces la transición lo lleva con suavidad a este tamaño.)
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

/** Anillos planos en el ecuador de un cuerpo (Saturno): nada los atraviesa en la vista general. */
export interface RingReach {
  /** Índice del cuerpo que los lleva. */
  readonly index: number;
  /** Borde exterior, en radios del cuerpo. */
  readonly outer: number;
  /** Polo del cuerpo (unitario, ECL): el eje de los anillos. */
  readonly pole: Vec3;
}

/**
 * La cámara de la vista general, para el tamaño mínimo en pantalla de los planetas (revisión del
 * bloque C, C3): un cuerpo de radio r a una distancia d de la cámara mide r · focalPx / d px.
 */
export interface OverviewScreen {
  /** Posición de la cámara respecto al Sol, en unidades ilustrativas (ECL). */
  readonly camera: Vec3;
  readonly focalPx: number;
  /** Radio mínimo en pantalla de los planetas (px). */
  readonly minRadiusPx: number;
}

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
  /** Los anillos de Saturno: en la escala ilustrativa, ningún disco los toca. */
  readonly rings?: RingReach | null;
  /** La cámara de la vista general (solo la usa la escala ilustrativa): el tamaño mínimo de C3. */
  readonly screen?: OverviewScreen | null;
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

/** El Sol o un planeta (no una luna): su padre es la raíz, o no tiene. */
function isPrimary(parentIndex: Int16Array, k: number): boolean {
  const parent = item(parentIndex, k);
  return parent < 0 || item(parentIndex, parent) < 0;
}

/** Búferes de trabajo de {@link placeBodies}: no crecen en cada frame. */
const primaries: number[] = [];
let relief = new Float64Array(0);

/**
 * Coloca todos los cuerpos en un marco, en coordenadas absolutas de escena (el Sol en el origen).
 * Primero el Sol y los planetas; en la escala ilustrativa, sin solapes con sus radios propios (C2) y
 * después con su tamaño mínimo en pantalla (C3), que así nunca se deshace: con la cámara muy lejos,
 * los discos mínimos de los planetas interiores, de unos píxeles, pueden tocarse. Y después las
 * lunas, alrededor de su planeta con el tamaño final de este: un sistema de lunas encoge con su
 * planeta, y sus órbitas (`placeMoonPoint`, con el radio colocado del planeta) siguen pasando por
 * ellas.
 */
export function placeBodies(
  frame: FrameSpec,
  input: PlacementInput,
  out: Placement = createPlacement(input.radiusKm.length),
): Placement {
  const n = input.radiusKm.length;
  primaries.length = 0;
  for (let k = 0; k < n; k++) {
    out.radius[k] = placeRadius(frame, item(input.radiusKm, k));
    if (!isPrimary(input.parentIndex, k)) continue;
    primaries.push(k);
    put(out.position, k, placeHeliocentricPoint(frame, at(input.heliocentric, k)));
  }
  if (relief.length < n) relief = new Float64Array(n);
  relief.fill(1, 0, n);
  if (frame.kind === 'illustrative') {
    relieveOverlaps(out.position, out.radius, primaries, frame.params.minGap, input.rings, relief);
    for (const k of primaries) out.radius[k] = item(out.radius, k) * item(relief, k);
    const screen = input.screen;
    if (screen) {
      // C3: ningún planeta mide menos de `minRadiusPx` en pantalla (el Sol no lo necesita).
      const p = out.position;
      const c = screen.camera;
      for (const k of primaries) {
        if (item(input.parentIndex, k) < 0) continue;
        const depth = Math.hypot(
          (p[3 * k] as number) - c.x,
          (p[3 * k + 1] as number) - c.y,
          (p[3 * k + 2] as number) - c.z,
        );
        const minRadius = (screen.minRadiusPx * depth) / screen.focalPx;
        out.radius[k] = Math.max(item(out.radius, k), minRadius);
      }
    }
  }
  for (let k = 0; k < n; k++) {
    if (isPrimary(input.parentIndex, k)) continue;
    const parent = item(input.parentIndex, k);
    const placedParent: PlacedParent = {
      position: at(out.position, parent),
      radius: item(out.radius, parent),
      radiusKm: item(input.radiusKm, parent),
    };
    put(out.position, k, placeMoonPoint(frame, placedParent, at(input.parentOffset, k)));
    out.radius[k] = item(out.radius, k) * item(relief, parent);
  }
  return out;
}

// --- Tamaños sin solapes (revisión del bloque C, C2) -------------------------------------------

/** Ancho del paso suave de {@link reliefFactor}, en fracción del tamaño. */
export const RELIEF_SOFTNESS = 0.15;

/**
 * Cuánto encoge una pareja de cuerpos que necesitaría el factor `needed` para no tocarse: nada por
 * encima de 1 + `softness`, `needed` por debajo de 1 − `softness` y, entre medias, una parábola
 * tangente a las dos (sin esquinas: el tamaño cambia con suavidad) que nunca pasa de `needed`.
 */
export function reliefFactor(needed: number, softness = RELIEF_SOFTNESS): number {
  if (needed >= 1 + softness) return 1;
  const start = 1 - softness;
  if (needed <= start) return Math.max(needed, 0);
  return needed - (needed - start) ** 2 / (4 * softness);
}

/**
 * El mayor factor f (hasta 1 + `RELIEF_SOFTNESS`) con el que un cuerpo de radio `radius`·f, en
 * (dx, dy, dz) respecto al centro de un planeta con anillos de radio exterior `outer`·f, queda a
 * `margin` del disco de los anillos. El disco se toma lleno (la parte de dentro la ocupa el planeta):
 * así la distancia baja al crecer f y basta una bisección.
 */
function ringFactor(
  dx: number,
  dy: number,
  dz: number,
  radius: number,
  outer: number,
  pole: Vec3,
  margin: number,
): number {
  const height = dx * pole.x + dy * pole.y + dz * pole.z;
  const inPlane = Math.hypot(dx - height * pole.x, dy - height * pole.y, dz - height * pole.z);
  const gap = (f: number): number =>
    (inPlane > outer * f ? Math.hypot(height, inPlane - outer * f) : Math.abs(height)) -
    radius * f -
    margin;
  const top = 1 + RELIEF_SOFTNESS;
  if (gap(top) >= 0) return top;
  if (gap(0) < 0) return 0;
  let low = 0;
  let high = top;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (gap(mid) >= 0) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * Factores de tamaño para que ningún par de `members` se toque (revisión del bloque C, C2). Para cada
 * par, el factor que deja `margin` entre sus discos, f = (d − margin) / (r₁ + r₂), y, si uno lleva
 * `ring`, también entre el otro disco y sus anillos (que crecen con él). Los dos encogen por igual,
 * con {@link reliefFactor}, y cada cuerpo se queda con el menor de sus pares: solo encogen los que se
 * acercan, y recuperan el tamaño al separarse. Como las posiciones cambian de forma continua con el
 * tiempo, los tamaños también. Escribe el factor de cada miembro en `out` (sin reservar memoria:
 * se llama en cada frame).
 */
export function relieveOverlaps(
  position: Float64Array,
  radius: Float64Array,
  members: readonly number[],
  margin: number,
  ring: RingReach | null | undefined,
  out: Float64Array,
): Float64Array {
  for (const k of members) out[k] = 1;
  for (let a = 0; a < members.length; a++) {
    const i = members[a] as number;
    for (let b = a + 1; b < members.length; b++) {
      const j = members[b] as number;
      if (3 * Math.max(i, j) + 2 >= position.length) {
        throw new RangeError('Índice de cuerpo fuera de rango.');
      }
      const dx = (position[3 * j] as number) - (position[3 * i] as number);
      const dy = (position[3 * j + 1] as number) - (position[3 * i + 1] as number);
      const dz = (position[3 * j + 2] as number) - (position[3 * i + 2] as number);
      const ri = item(radius, i);
      const rj = item(radius, j);
      let needed = (Math.hypot(dx, dy, dz) - margin) / (ri + rj);
      if (ring && (ring.index === i || ring.index === j)) {
        // Del planeta con anillos al otro cuerpo.
        const sign = ring.index === i ? 1 : -1;
        const ringed = ring.index === i ? ri : rj;
        const other = ring.index === i ? rj : ri;
        needed = Math.min(
          needed,
          ringFactor(
            sign * dx,
            sign * dy,
            sign * dz,
            other,
            ring.outer * ringed,
            ring.pole,
            margin,
          ),
        );
      }
      if (needed >= 1 + RELIEF_SOFTNESS) continue;
      const factor = reliefFactor(needed);
      out[i] = Math.min(item(out, i), factor);
      out[j] = Math.min(item(out, j), factor);
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
