/**
 * Sistemas de referencia (PLAN §4.3). TODA conversión de coordenadas del proyecto vive aquí.
 *
 * - EQJ: ecuador medio y equinoccio J2000 (ICRF). Es lo que devuelve astronomy-engine.
 * - EQD: ecuador verdadero y equinoccio de la fecha (incluye precesión y nutación).
 * - ECL: eclíptica media J2000. Es el sistema común de la escena.
 * - Three: Y hacia arriba. ECL (x, y, z) → Three (x, z, −y).
 * - Terrestre: fijo a la Tierra. X hacia el meridiano de Greenwich en el ecuador, Z hacia el polo norte.
 * - Galácticas (fase 3b, Vía Láctea): X hacia el centro galáctico, Z hacia el polo norte galáctico.
 */
import {
  Body,
  GeoVector,
  RotateVector,
  Rotation_EQD_EQJ,
  Rotation_EQJ_ECL,
  RotationMatrix,
  SiderealTime,
  Vector,
} from 'astronomy-engine';
import { toAstroTime } from './time';
import {
  Mat3,
  Vec3,
  cross,
  dot,
  mulMat3,
  mulMat3Vec,
  normalize,
  rotationX,
  rotationZ,
  scale,
  sub,
  transposeMat3,
  vec3,
} from './vec3';

const DEG = Math.PI / 180;

/** Convierte una matriz de astronomy-engine en una `Mat3` por filas, girando la base. */
function fromAstronomyRotation(rotation: RotationMatrix): Mat3 {
  const column = (x: number, y: number, z: number) =>
    RotateVector(rotation, new Vector(x, y, z, toAstroTime(new Date(Date.UTC(2000, 0, 1)))));
  const c0 = column(1, 0, 0);
  const c1 = column(0, 1, 0);
  const c2 = column(0, 0, 1);
  return [c0.x, c1.x, c2.x, c0.y, c1.y, c2.y, c0.z, c1.z, c2.z];
}

/** EQJ → ECL: un giro fijo de la oblicuidad media J2000 alrededor del eje X. */
export const EQJ_TO_ECL: Mat3 = fromAstronomyRotation(Rotation_EQJ_ECL());
export const ECL_TO_EQJ: Mat3 = transposeMat3(EQJ_TO_ECL);

export const eqjToEcl = (v: Vec3): Vec3 => mulMat3Vec(EQJ_TO_ECL, v);
export const eclToEqj = (v: Vec3): Vec3 => mulMat3Vec(ECL_TO_EQJ, v);

/** ECL (x, y, z) → Three (x, z, −y): el polo norte de la eclíptica queda hacia +Y. */
export const eclToThree = (v: Vec3): Vec3 => vec3(v.x, v.z, -v.y);
/** Inversa de {@link eclToThree}. */
export const threeToEcl = (v: Vec3): Vec3 => vec3(v.x, -v.z, v.y);

/** La misma conversión como matriz (un giro de −90° alrededor de X). */
export const ECL_TO_THREE: Mat3 = [1, 0, 0, 0, 0, 1, 0, -1, 0];

/**
 * Expresa en Three una rotación definida en ECL. Si `m` lleva los ejes propios de un cuerpo
 * (Z = su polo norte) a ECL, el resultado lleva sus ejes «a lo Three» (Y = polo norte) al mundo.
 */
export const eclRotationToThree = (m: Mat3): Mat3 =>
  mulMat3(mulMat3(ECL_TO_THREE, m), transposeMat3(ECL_TO_THREE));

/** Vector unitario EQJ a partir de ascensión recta y declinación (grados). */
export function equatorialToVector(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  return vec3(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
}

/**
 * Sistema galáctico de Hipparcos (ESA, 1997, The Hipparcos and Tycho Catalogues, ESA SP-1200, vol. 1,
 * §1.5.3): el polo norte galáctico en el ICRS y la longitud galáctica del polo norte celeste. Con
 * ellos, el centro galáctico (l = 0°, b = 0°) cae en α = 266,40510°, δ = −28,936175°.
 */
export const GALACTIC_NORTH_POLE = { raDeg: 192.85948, decDeg: 27.12825 } as const;
export const CELESTIAL_POLE_GALACTIC_LONGITUDE_DEG = 122.93192;

/** EQJ → galácticas: las filas son los ejes galácticos expresados en EQJ. */
function eqjToGalacticMatrix(): Mat3 {
  const z = equatorialToVector(GALACTIC_NORTH_POLE.raDeg, GALACTIC_NORTH_POLE.decDeg);
  // El polo norte celeste, proyectado en el plano galáctico, está a la longitud l del polo: el eje X
  // (l = 0) es esa dirección girada −l alrededor del polo galáctico.
  const celestialPole = vec3(0, 0, 1);
  const p = normalize(sub(celestialPole, scale(z, dot(celestialPole, z))));
  const l = CELESTIAL_POLE_GALACTIC_LONGITUDE_DEG * DEG;
  const q = cross(z, p);
  const x = vec3(
    p.x * Math.cos(l) - q.x * Math.sin(l),
    p.y * Math.cos(l) - q.y * Math.sin(l),
    p.z * Math.cos(l) - q.z * Math.sin(l),
  );
  const y = cross(z, x);
  return [x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z];
}

export const EQJ_TO_GALACTIC: Mat3 = eqjToGalacticMatrix();
export const GALACTIC_TO_EQJ: Mat3 = transposeMat3(EQJ_TO_GALACTIC);
/** ECL → galácticas (para la Vía Láctea, que se muestrea desde la escena). */
export const ECL_TO_GALACTIC: Mat3 = mulMat3(EQJ_TO_GALACTIC, ECL_TO_EQJ);

/** Vector unitario galáctico a partir de la longitud y la latitud galácticas (grados). */
export function galacticToVector(lDeg: number, bDeg: number): Vec3 {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  return vec3(Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b));
}

/** Longitud (0–360°) y latitud galácticas de un vector EQJ. */
export function eqjToGalactic(v: Vec3): { lDeg: number; bDeg: number } {
  const g = normalize(mulMat3Vec(EQJ_TO_GALACTIC, v));
  const lDeg = (Math.atan2(g.y, g.x) / DEG + 360) % 360;
  return { lDeg, bDeg: Math.asin(Math.min(Math.max(g.z, -1), 1)) / DEG };
}

/**
 * Plano de referencia de una órbita a partir de su polo (ascensión recta y declinación EQJ).
 * El eje X apunta al nodo ascendente del plano sobre el ecuador EQJ (ascensión recta = polo + 90°)
 * y el eje Z al polo. Es la convención de los elementos medios del JPL
 * (https://ssd.jpl.nasa.gov/sats/elem/): planos de Laplace y ecuadores planetarios.
 */
export const referencePlaneToEqj = (poleRaDeg: number, poleDecDeg: number): Mat3 =>
  mulMat3(rotationZ(poleRaDeg + 90), rotationX(90 - poleDecDeg));

export const referencePlaneToEcl = (poleRaDeg: number, poleDecDeg: number): Mat3 =>
  mulMat3(EQJ_TO_ECL, referencePlaneToEqj(poleRaDeg, poleDecDeg));

/** Tiempo sidéreo aparente de Greenwich (GAST), en horas sidéreas [0, 24). */
export const greenwichSiderealTimeHours = (date: Date): number => SiderealTime(toAstroTime(date));

/**
 * Orientación de la Tierra: lleva un vector terrestre a ECL.
 * Terrestre → EQD (giro del tiempo sidéreo) → EQJ (precesión y nutación) → ECL.
 * Sin movimiento del polo (décimas de segundo de arco).
 */
export function earthFixedToEcl(date: Date): Mat3 {
  const time = toAstroTime(date);
  const eqdToEqj = fromAstronomyRotation(Rotation_EQD_EQJ(time));
  const gastDeg = SiderealTime(time) * 15;
  return mulMat3(EQJ_TO_ECL, mulMat3(eqdToEqj, rotationZ(gastDeg)));
}

export const eclToEarthFixed = (date: Date): Mat3 => transposeMat3(earthFixedToEcl(date));

/** Vector unitario terrestre a partir de latitud y longitud geográficas (grados, este positivo). */
export const geographicToEarthFixed = (latDeg: number, lonDeg: number): Vec3 =>
  equatorialToVector(lonDeg, latDeg);

/** Latitud y longitud (grados, longitud en (−180, 180]) de un vector terrestre. */
export function earthFixedToGeographic(v: Vec3): { latDeg: number; lonDeg: number } {
  const latDeg = Math.atan2(v.z, Math.hypot(v.x, v.y)) / DEG;
  let lonDeg = Math.atan2(v.y, v.x) / DEG;
  if (lonDeg <= -180) lonDeg += 360;
  return { latDeg, lonDeg };
}

/** Vector geocéntrico ECL (UA) del Sol, sin aberración. */
export function sunGeocentricEcl(date: Date): Vec3 {
  return eqjToEcl(GeoVector(Body.Sun, toAstroTime(date), false));
}

/**
 * Punto subsolar: dónde está el Sol en el cénit. Usa la MISMA orientación de la Tierra que la
 * escena ({@link earthFixedToEcl}), así que sirve para alimentar el sombreado día/noche.
 */
export function subsolarPoint(date: Date): { latDeg: number; lonDeg: number } {
  return earthFixedToGeographic(mulMat3Vec(eclToEarthFixed(date), sunGeocentricEcl(date)));
}
