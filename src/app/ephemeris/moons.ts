/**
 * Posiciones de las lunas respecto al centro de su planeta, en ECL y UA (D11).
 * - Las 4 galileanas, con `JupiterMoons` de astronomy-engine (teoría precisa).
 * - El resto, con elementos medios: una elipse con precesión del nodo y del periapsis, más los
 *   términos de longitud que haga falta, resuelta con la ecuación de Kepler.
 */
import { JupiterMoons } from 'astronomy-engine';
import { KM_PER_AU } from './constants';
import { eqjToEcl, referencePlaneToEcl } from './coordinates';
import { GalileanId } from './ids';
import { toAstroTime } from './time';
import { Mat3, Vec3, mulMat3Vec, vec3 } from './vec3';

/** Posiciones jovicéntricas de las cuatro galileanas (ECL, UA). */
export function galileanMoons(date: Date): Record<GalileanId, Vec3> {
  const moons = JupiterMoons(toAstroTime(date));
  return {
    io: eqjToEcl(moons.io),
    europa: eqjToEcl(moons.europa),
    ganimedes: eqjToEcl(moons.ganymede),
    calisto: eqjToEcl(moons.callisto),
  };
}

/** Término periódico de la longitud media: `amplitud · sen(360° · t / periodo + fase)`. */
export interface LongitudeTerm {
  readonly amplitudeDeg: number;
  readonly periodDays: number;
  readonly phaseDeg: number;
}

/**
 * Elementos medios de una órbita con precesión. Ángulos en grados; el tiempo `t` son días TT
 * desde J2000 (2000-01-01 12:00 TT), que es la época de todos los elementos.
 */
export interface MeanElements {
  /** Polo del plano de referencia (ascensión recta y declinación EQJ, grados). */
  readonly referencePole: { readonly raDeg: number; readonly decDeg: number };
  readonly semiMajorAxisKm: number;
  readonly eccentricity: number;
  readonly inclinationDeg: number;
  /** Longitud del nodo ascendente, medida desde el nodo del plano sobre el ecuador EQJ. */
  readonly nodeDeg: number;
  readonly nodeRateDegPerDay: number;
  readonly argPeriapsisDeg: number;
  readonly argPeriapsisRateDegPerDay: number;
  readonly meanAnomalyDeg: number;
  readonly meanMotionDegPerDay: number;
  /** Aceleración secular de la anomalía media (deg/día²), p. ej. por la marea de Fobos. */
  readonly meanMotionRateDegPerDay2?: number;
  readonly longitudeTerms?: readonly LongitudeTerm[];
}

const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;

/** Resuelve la ecuación de Kepler `E − e·sen E = M` (radianes) por Newton. Válida para e < 1. */
export function solveKepler(meanAnomalyRad: number, eccentricity: number): number {
  const m = ((meanAnomalyRad % TAU) + TAU) % TAU;
  let e = eccentricity < 0.8 ? m : Math.PI;
  for (let k = 0; k < 30; k++) {
    const delta = (e - eccentricity * Math.sin(e) - m) / (1 - eccentricity * Math.cos(e));
    e -= delta;
    if (Math.abs(delta) < 1e-14) break;
  }
  return e;
}

/** Anomalía media (grados) en el instante `t` (días TT desde J2000). */
export function meanAnomalyAt(elements: MeanElements, t: number): number {
  let m =
    elements.meanAnomalyDeg +
    elements.meanMotionDegPerDay * t +
    0.5 * (elements.meanMotionRateDegPerDay2 ?? 0) * t * t;
  for (const term of elements.longitudeTerms ?? []) {
    m += term.amplitudeDeg * Math.sin(TAU * (t / term.periodDays) + term.phaseDeg * DEG);
  }
  return m;
}

/** Posición en el plano de referencia de la órbita (km). */
export function positionInReferencePlane(elements: MeanElements, t: number): Vec3 {
  const e = elements.eccentricity;
  const a = elements.semiMajorAxisKm;
  const anomaly = solveKepler(meanAnomalyAt(elements, t) * DEG, e);
  const xp = a * (Math.cos(anomaly) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(anomaly);
  const node = (elements.nodeDeg + elements.nodeRateDegPerDay * t) * DEG;
  const arg = (elements.argPeriapsisDeg + elements.argPeriapsisRateDegPerDay * t) * DEG;
  const inc = elements.inclinationDeg * DEG;
  // Rz(nodo) · Rx(inclinación) · Rz(argumento del periapsis) aplicado a (xp, yp, 0).
  const cw = Math.cos(arg);
  const sw = Math.sin(arg);
  const x1 = xp * cw - yp * sw;
  const y1 = xp * sw + yp * cw;
  const ci = Math.cos(inc);
  const si = Math.sin(inc);
  const y2 = y1 * ci;
  const z2 = y1 * si;
  const cn = Math.cos(node);
  const sn = Math.sin(node);
  return vec3(x1 * cn - y2 * sn, x1 * sn + y2 * cn, z2);
}

const planeCache = new WeakMap<MeanElements, Mat3>();

function planeToEcl(elements: MeanElements): Mat3 {
  let matrix = planeCache.get(elements);
  if (!matrix) {
    matrix = referencePlaneToEcl(elements.referencePole.raDeg, elements.referencePole.decDeg);
    planeCache.set(elements, matrix);
  }
  return matrix;
}

/** Posición de una luna respecto al centro de su planeta (ECL, UA). */
export function meanElementsPosition(elements: MeanElements, date: Date): Vec3 {
  const t = toAstroTime(date).tt;
  const km = mulMat3Vec(planeToEcl(elements), positionInReferencePlane(elements, t));
  return vec3(km.x / KM_PER_AU, km.y / KM_PER_AU, km.z / KM_PER_AU);
}
