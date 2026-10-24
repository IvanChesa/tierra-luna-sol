/**
 * Orientación de los cuerpos (D19, PLAN §4.3). TODA orientación del proyecto vive aquí.
 *
 * Cada función devuelve la matriz que lleva el sistema propio del cuerpo a ECL. En ese sistema,
 * Z apunta al polo norte, X al meridiano 0 (en el ecuador) e Y a 90° de longitud este, como en
 * `earthFixedToEcl` de la fase 1. La escena lo convierte a Three con `eclRotationToThree`.
 *
 * - El Sol, los planetas y la Luna: modelo IAU (polo y ángulo del meridiano principal W) de
 *   `RotationAxis` de astronomy-engine. En la Luna incluye la libración física.
 * - La Tierra: precesión, nutación y tiempo sidéreo (`earthFixedToEcl`, fase 1).
 * - Las demás lunas: rotación síncrona, con el meridiano 0 hacia su planeta.
 */
import { Body, JupiterMoons, RotationAxis } from 'astronomy-engine';
import {
  EQJ_TO_ECL,
  earthFixedToEcl,
  eqjToEcl,
  referencePlaneToEcl,
  referencePlaneToEqj,
} from './coordinates';
import { GalileanId, PlanetId } from './ids';
import { MeanElements } from './moons';
import { toAstroTime } from './time';
import {
  Mat3,
  Vec3,
  columnOf,
  cross,
  dot,
  fromColumns,
  mulMat3,
  mulMat3Vec,
  normalize,
  rotationZ,
  scale,
  sub,
  transposeMat3,
  vec3,
} from './vec3';

const DEG = Math.PI / 180;

/** Cuerpos con modelo de rotación IAU en astronomy-engine. */
export type IauBodyId = 'sol' | PlanetId | 'luna';

const IAU_BODIES: Record<IauBodyId, Body> = {
  sol: Body.Sun,
  mercurio: Body.Mercury,
  venus: Body.Venus,
  tierra: Body.Earth,
  marte: Body.Mars,
  jupiter: Body.Jupiter,
  saturno: Body.Saturn,
  urano: Body.Uranus,
  neptuno: Body.Neptune,
  luna: Body.Moon,
};

/**
 * Sistema propio → ECL con el modelo IAU: Rz(α₀ + 90°) · Rx(90° − δ₀) · Rz(W), en EQJ, y después
 * a ECL. (α₀, δ₀) es el polo norte y W el ángulo del meridiano 0 medido desde el nodo ascendente
 * del ecuador del cuerpo sobre el ecuador EQJ. La Tierra usa la orientación de la fase 1.
 */
export function bodyFixedToEcl(body: IauBodyId, date: Date): Mat3 {
  if (body === 'tierra') return earthFixedToEcl(date);
  const axis = RotationAxis(IAU_BODIES[body], toAstroTime(date));
  return mulMat3(
    EQJ_TO_ECL,
    mulMat3(referencePlaneToEqj(axis.ra * 15, axis.dec), rotationZ(axis.spin)),
  );
}

/** Polo norte (unitario, ECL) de un cuerpo con modelo IAU. */
export const northPoleEcl = (body: IauBodyId, date: Date): Vec3 =>
  columnOf(bodyFixedToEcl(body, date), 2);

/**
 * Latitud y longitud (grados, longitud este en (−180, 180]) de una dirección vista desde el centro
 * de un cuerpo, en su sistema propio. Con la dirección hacia la Tierra da el punto subterrestre
 * (en la Luna, la libración); con la del Sol, el punto subsolar.
 */
export function bodyCentricLatLon(
  bodyToEcl: Mat3,
  directionEcl: Vec3,
): { latDeg: number; lonDeg: number } {
  const v = mulMat3Vec(transposeMat3(bodyToEcl), directionEcl);
  const latDeg = Math.atan2(v.z, Math.hypot(v.x, v.y)) / DEG;
  let lonDeg = Math.atan2(v.y, v.x) / DEG;
  if (lonDeg <= -180) lonDeg += 360;
  return { latDeg, lonDeg };
}

/**
 * Elevación (grados) de una dirección sobre el plano ecuatorial de un cuerpo. Con el polo de
 * Saturno y la dirección Saturno → Tierra es la apertura de los anillos vista desde la Tierra
 * (positiva si se ve su cara norte).
 */
export const equatorialElevationDeg = (poleEcl: Vec3, directionEcl: Vec3): number =>
  Math.asin(Math.max(-1, Math.min(1, dot(normalize(poleEcl), normalize(directionEcl))))) / DEG;

/** Polo de la eclíptica en ECL: el lado norte del plano invariable, a efectos del proyecto. */
const ECLIPTIC_NORTH = vec3(0, 0, 1);

/**
 * Rotación síncrona: el meridiano 0 (X) mira al planeta y el polo (Z) es el de la órbita, elegido
 * en el lado norte de la eclíptica como hace la IAU con los polos de los cuerpos del sistema solar.
 * En una órbita retrógrada (Tritón), ese polo es el opuesto al momento angular y la luna gira en
 * sentido retrógrado respecto a él, como en el modelo IAU de Tritón.
 *
 * Es una aproximación: no recoge la libración óptica de las lunas reales (en una órbita
 * excéntrica, la cara que mira al planeta oscila unos grados).
 *
 * @param offsetFromPlanet posición de la luna respecto al centro de su planeta (ECL).
 * @param orbitNormal momento angular de la órbita (unitario o no, ECL).
 */
export function synchronousBodyFixedToEcl(offsetFromPlanet: Vec3, orbitNormal: Vec3): Mat3 {
  let pole = normalize(orbitNormal);
  if (dot(pole, ECLIPTIC_NORTH) < 0) pole = scale(pole, -1);
  const towardPlanet = scale(offsetFromPlanet, -1);
  // X: dirección al planeta proyectada sobre el ecuador de la luna.
  const x = normalize(sub(towardPlanet, scale(pole, dot(towardPlanet, pole))));
  const y = cross(pole, x);
  return fromColumns(x, y, pole);
}

/**
 * Normal de la órbita (momento angular, unitario, ECL) de una luna con elementos medios en un
 * instante: Rz(nodo) · Rx(inclinación) · (0, 0, 1) en su plano de referencia, llevado a ECL.
 */
export function meanElementsOrbitNormal(elements: MeanElements, date: Date): Vec3 {
  const t = toAstroTime(date).tt;
  const node = (elements.nodeDeg + elements.nodeRateDegPerDay * t) * DEG;
  const inc = elements.inclinationDeg * DEG;
  const inPlane = vec3(
    Math.sin(node) * Math.sin(inc),
    -Math.cos(node) * Math.sin(inc),
    Math.cos(inc),
  );
  const toEcl = referencePlaneToEcl(elements.referencePole.raDeg, elements.referencePole.decDeg);
  return mulMat3Vec(toEcl, inPlane);
}

/** Normales de las órbitas de las galileanas (r × v de `JupiterMoons`, unitarias, ECL). */
export function galileanOrbitNormals(date: Date): Record<GalileanId, Vec3> {
  const moons = JupiterMoons(toAstroTime(date));
  const normal = (s: { x: number; y: number; z: number; vx: number; vy: number; vz: number }) =>
    normalize(eqjToEcl(cross(vec3(s.x, s.y, s.z), vec3(s.vx, s.vy, s.vz))));
  return {
    io: normal(moons.io),
    europa: normal(moons.europa),
    ganimedes: normal(moons.ganymede),
    calisto: normal(moons.callisto),
  };
}

/** ¿Es `m` una rotación (ortonormal y con determinante +1)? Para tests y aserciones. */
export function isRotation(m: Mat3, tolerance = 1e-9): boolean {
  const product = mulMat3(transposeMat3(m), m);
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const error = Math.max(...product.map((value, k) => Math.abs(value - (identity[k] as number))));
  const determinant = dot(cross(columnOf(m, 0), columnOf(m, 1)), columnOf(m, 2));
  return error < tolerance && determinant > 0;
}
