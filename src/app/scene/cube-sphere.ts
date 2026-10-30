/**
 * Esfera cúbica (fase 6): las seis caras de un cubo subdivididas y llevadas a la esfera unidad. A
 * diferencia de `SphereGeometry`, no tiene polos pellizcados (allí sus triángulos degeneran y la
 * textura se arremolina), y sus vértices se reparten casi por igual: la Luna se ve de cerca también
 * desde los polos («Polo sur», Shackleton).
 *
 * - Cada cara se subdivide en `segments` × `segments` con el reparto equiangular (s → tan(π/4 · s)),
 *   que iguala el tamaño de los triángulos del centro y de los bordes de la cara.
 * - Las aristas comunes a dos caras salen con las mismas coordenadas exactas (los extremos ±1 no pasan
 *   por la tangente): sin grietas, también con el relieve desplazado.
 * - Los mismos ejes que `SphereGeometry`: Y, el polo norte; el meridiano 0 en +X y la longitud este
 *   hacia −Z. Las coordenadas de textura (u, v) son la longitud y la latitud equirrectangulares del
 *   vértice (u = 0,5 en el meridiano 0); el material de la Luna las calcula por píxel.
 */
import { BufferAttribute, BufferGeometry } from 'three';

/** Reparto equiangular de un lado de la cara (de −1 a 1), con los extremos exactos. */
const warp = (s: number): number => (s <= -1 ? -1 : s >= 1 ? 1 : Math.tan((Math.PI / 4) * s));

/** Las seis caras: su normal y dos ejes del plano, con la orientación que deja los triángulos hacia fuera. */
const FACES: readonly (readonly [readonly number[], readonly number[], readonly number[]])[] = [
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [-1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, -1],
    [-1, 0, 0],
    [0, 1, 0],
  ],
];

export function createCubeSphere(segments: number): BufferGeometry {
  const n = Math.max(1, Math.round(segments));
  const perFace = (n + 1) * (n + 1);
  const positions = new Float32Array(6 * perFace * 3);
  const uvs = new Float32Array(6 * perFace * 2);
  const indices = new Uint32Array(6 * n * n * 6);
  let p = 0;
  let t = 0;
  FACES.forEach(([normal, a, b], face) => {
    const base = face * perFace;
    for (let j = 0; j <= n; j++) {
      const sb = warp((2 * j) / n - 1);
      for (let i = 0; i <= n; i++) {
        const sa = warp((2 * i) / n - 1);
        const x = (normal[0] as number) + sa * (a[0] as number) + sb * (b[0] as number);
        const y = (normal[1] as number) + sa * (a[1] as number) + sb * (b[1] as number);
        const z = (normal[2] as number) + sa * (a[2] as number) + sb * (b[2] as number);
        const length = Math.hypot(x, y, z);
        const k = base + j * (n + 1) + i;
        positions[3 * k] = x / length;
        positions[3 * k + 1] = y / length;
        positions[3 * k + 2] = z / length;
        uvs[2 * k] = 0.5 + Math.atan2(-z, x) / (2 * Math.PI);
        uvs[2 * k + 1] = 0.5 + Math.asin(Math.max(-1, Math.min(1, y / length))) / Math.PI;
        p++;
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = base + j * (n + 1) + i;
        indices[t++] = k;
        indices[t++] = k + 1;
        indices[t++] = k + n + 1;
        indices[t++] = k + 1;
        indices[t++] = k + n + 2;
        indices[t++] = k + n + 1;
      }
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  // En la esfera unidad, la normal es la posición.
  geometry.setAttribute('normal', new BufferAttribute(positions.slice(0, 3 * p), 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
