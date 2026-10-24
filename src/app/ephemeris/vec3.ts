/** Vector 3D inmutable en float64. Las unidades las indica quien lo devuelve. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Matriz 3×3 por filas: `[m00, m01, m02, m10, m11, m12, m20, m21, m22]`. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const add = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z);

export const sub = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z);

export const scale = (v: Vec3, k: number): Vec3 => vec3(v.x * k, v.y * k, v.z * k);

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a: Vec3, b: Vec3): Vec3 =>
  vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);

export const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

export const normalize = (v: Vec3): Vec3 => {
  const len = length(v);
  return len === 0 ? v : scale(v, 1 / len);
};

/** Interpolación lineal: `t = 0` da `a` y `t = 1` da `b`. */
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  vec3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

/** Ángulo entre dos vectores, en grados. Usa `atan2` para no perder precisión cerca de 0°. */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  return (Math.atan2(length(cross(a, b)), dot(a, b)) * 180) / Math.PI;
}

/** Columna `k` (0, 1 o 2) de una matriz: la imagen del eje X, Y o Z. */
export function columnOf(m: Mat3, k: 0 | 1 | 2): Vec3 {
  if (k === 0) return vec3(m[0], m[3], m[6]);
  if (k === 1) return vec3(m[1], m[4], m[7]);
  return vec3(m[2], m[5], m[8]);
}

/** Matriz cuyas columnas son `x`, `y` y `z`. */
export const fromColumns = (x: Vec3, y: Vec3, z: Vec3): Mat3 => [
  x.x,
  y.x,
  z.x,
  x.y,
  y.y,
  z.y,
  x.z,
  y.z,
  z.z,
];

export const mulMat3Vec = (m: Mat3, v: Vec3): Vec3 =>
  vec3(
    m[0] * v.x + m[1] * v.y + m[2] * v.z,
    m[3] * v.x + m[4] * v.y + m[5] * v.z,
    m[6] * v.x + m[7] * v.y + m[8] * v.z,
  );

export function mulMat3(a: Mat3, b: Mat3): Mat3 {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8] = b;
  return [
    a0 * b0 + a1 * b3 + a2 * b6,
    a0 * b1 + a1 * b4 + a2 * b7,
    a0 * b2 + a1 * b5 + a2 * b8,
    a3 * b0 + a4 * b3 + a5 * b6,
    a3 * b1 + a4 * b4 + a5 * b7,
    a3 * b2 + a4 * b5 + a5 * b8,
    a6 * b0 + a7 * b3 + a8 * b6,
    a6 * b1 + a7 * b4 + a8 * b7,
    a6 * b2 + a7 * b5 + a8 * b8,
  ];
}

/** La traspuesta de una rotación es su inversa. */
export const transposeMat3 = (m: Mat3): Mat3 => [
  m[0],
  m[3],
  m[6],
  m[1],
  m[4],
  m[7],
  m[2],
  m[5],
  m[8],
];

const DEG = Math.PI / 180;

/** Rotación activa de `deg` grados alrededor del eje X. */
export function rotationX(deg: number): Mat3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

/** Rotación activa de `deg` grados alrededor del eje Z. */
export function rotationZ(deg: number): Mat3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
