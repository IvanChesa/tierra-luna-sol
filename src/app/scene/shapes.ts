/**
 * Las formas reales de las lunas irregulares (fase 9b, D42): Fobos y Deimos, de los DSK del servidor del
 * NAIF (`scripts/build-shapes.mjs`). Cada forma es una rejilla de radios por latitud y longitud
 * planetocéntricas (longitud este; `public/data/shapes/`), y la escena deforma con ella la esfera del
 * cuerpo: cada vértice, en su misma dirección, a su radio. Así el mapa se proyecta por la misma latitud y
 * la misma longitud planetocéntricas que el mosaico (las coordenadas de textura de la esfera no cambian).
 *
 * - Las normales salen de la propia rejilla (diferencias centradas en el plano tangente de cada
 *   vértice), no de los triángulos: son continuas en la costura de ±180° y en los polos.
 * - Los ejes, los de las esferas de la escena: Y, el polo norte; el meridiano 0 en +X y la longitud este
 *   hacia −Z.
 * - Las sombras analíticas (D20), la selección y la escala siguen con el radio medio del catálogo: la
 *   forma solo cambia lo que se dibuja.
 */
import { BufferAttribute, BufferGeometry } from 'three';

/** El fichero de una forma (`scene/shape-files.ts`, GENERADO). */
export interface ShapeFile {
  /** Ruta desde la raíz del sitio (con hash en el nombre). */
  readonly path: string;
  readonly bytes: number;
  /** Filas de latitud (de −90° a 90°, con los polos) y columnas de longitud (desde −180°, sin 180°). */
  readonly rows: number;
  readonly columns: number;
  /** El intervalo que cuantizan los radios (km). */
  readonly minKm: number;
  readonly maxKm: number;
  /** El elipsoide ajustado a la rejilla y los semiejes publicados (km; X, Y y Z del cuerpo). */
  readonly semiAxesKm: readonly [number, number, number];
  readonly publishedSemiAxesKm: readonly [number, number, number];
  /** El radio del volumen equivalente (km). */
  readonly meanRadiusKm: number;
}

/** Una forma decodificada: radios (km) en filas de latitud desde el sur. */
export interface ShapeGrid {
  readonly rows: number;
  readonly columns: number;
  readonly radiiKm: Float32Array;
}

const HEADER_BYTES = 20;

/** Decodifica el binario de `build-shapes.mjs` (falla si no lo es o si no cuadra con su manifiesto). */
export function decodeShape(buffer: ArrayBuffer, file?: ShapeFile): ShapeGrid {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)));
  if (buffer.byteLength < HEADER_BYTES || magic !== 'TLSF' || view.getUint16(4, true) !== 1) {
    throw new Error('No es una forma de build-shapes.mjs (versión 1)');
  }
  const rows = view.getUint16(6, true);
  const columns = view.getUint16(8, true);
  const min = view.getFloat32(12, true);
  const max = view.getFloat32(16, true);
  if (buffer.byteLength !== HEADER_BYTES + 2 * rows * columns || rows < 3 || columns < 4) {
    throw new Error('La forma tiene un tamaño que no cuadra con su rejilla');
  }
  if (file && (file.rows !== rows || file.columns !== columns)) {
    throw new Error('La forma no es la de su manifiesto');
  }
  const radiiKm = new Float32Array(rows * columns);
  for (let k = 0; k < radiiKm.length; k++) {
    radiiKm[k] = min + ((max - min) * view.getUint16(HEADER_BYTES + 2 * k, true)) / 65535;
  }
  return { rows, columns, radiiKm };
}

/**
 * El radio (km) de la forma en la latitud y la longitud este (radianes), con interpolación bilineal
 * (la longitud, con la vuelta; en los polos, la fila del polo).
 */
export function shapeRadiusKm(grid: ShapeGrid, latRad: number, lonRad: number): number {
  const { rows, columns, radiiKm } = grid;
  const y = Math.min(rows - 1, Math.max(0, (latRad / Math.PI + 0.5) * (rows - 1)));
  const x = ((((lonRad / (2 * Math.PI) + 0.5) * columns) % columns) + columns) % columns;
  const i = Math.min(rows - 2, Math.floor(y));
  const j = Math.floor(x) % columns;
  const ty = y - i;
  const tx = x - Math.floor(x);
  const j1 = (j + 1) % columns;
  const at = (row: number, column: number): number => radiiKm[row * columns + column] as number;
  return (
    (at(i, j) * (1 - tx) + at(i, j1) * tx) * (1 - ty) +
    (at(i + 1, j) * (1 - tx) + at(i + 1, j1) * tx) * ty
  );
}

/** El radio (en radios `radiusKm`) en la dirección unitaria (x, y, z) de los ejes de la escena. */
function radiusAt(grid: ShapeGrid, radiusKm: number, x: number, y: number, z: number): number {
  const lat = Math.asin(Math.max(-1, Math.min(1, y)));
  // En el polo, cualquier longitud vale: la fila del polo es la misma en todas.
  const lon = Math.abs(x) + Math.abs(z) > 1e-12 ? Math.atan2(-z, x) : 0;
  return shapeRadiusKm(grid, lat, lon) / radiusKm;
}

/**
 * La esfera `base` (unidad, con posiciones y coordenadas de textura; `SphereGeometry` o la esfera
 * cúbica) deformada con la forma: cada vértice, a su radio (en radios `radiusKm`, el del catálogo, con
 * el que la escena escala la malla), y su normal, de la rejilla. Con una copia del índice y de las
 * coordenadas de textura de la base.
 */
export function shapeGeometry(
  base: BufferGeometry,
  grid: ShapeGrid,
  radiusKm: number,
): BufferGeometry {
  const source = base.getAttribute('position');
  const count = source.count;
  const positions = new Float32Array(3 * count);
  const normals = new Float32Array(3 * count);
  // El paso de las diferencias: medio paso de la rejilla en latitud (radianes).
  const h = (0.5 * Math.PI) / (grid.rows - 1);
  const point = (x: number, y: number, z: number): [number, number, number] => {
    const length = Math.hypot(x, y, z);
    const r = radiusAt(grid, radiusKm, x / length, y / length, z / length);
    return [(r * x) / length, (r * y) / length, (r * z) / length];
  };
  for (let k = 0; k < count; k++) {
    let x = source.getX(k);
    let y = source.getY(k);
    let z = source.getZ(k);
    const length = Math.hypot(x, y, z) || 1;
    x /= length;
    y /= length;
    z /= length;
    const r = radiusAt(grid, radiusKm, x, y, z);
    positions[3 * k] = r * x;
    positions[3 * k + 1] = r * y;
    positions[3 * k + 2] = r * z;
    // El plano tangente: el este (sin definir en el polo: allí, cualquier perpendicular) y el norte.
    let ex = z;
    let ey = 0;
    let ez = -x;
    let e = Math.hypot(ex, ez);
    if (e < 1e-6) {
      ex = 1;
      ey = 0;
      ez = 0;
      e = 1;
    }
    ex /= e;
    ez /= e;
    // norte = d × este
    const nx = y * ez - z * ey;
    const ny = z * ex - x * ez;
    const nz = x * ey - y * ex;
    const pe = point(x + h * ex, y + h * ey, z + h * ez);
    const pw = point(x - h * ex, y - h * ey, z - h * ez);
    const pn = point(x + h * nx, y + h * ny, z + h * nz);
    const ps = point(x - h * nx, y - h * ny, z - h * nz);
    const ux = pe[0] - pw[0];
    const uy = pe[1] - pw[1];
    const uz = pe[2] - pw[2];
    const vx = pn[0] - ps[0];
    const vy = pn[1] - ps[1];
    const vz = pn[2] - ps[2];
    // este × norte apunta hacia fuera.
    let cx = uy * vz - uz * vy;
    let cy = uz * vx - ux * vz;
    let cz = ux * vy - uy * vx;
    const c = Math.hypot(cx, cy, cz) || 1;
    cx /= c;
    cy /= c;
    cz /= c;
    if (cx * x + cy * y + cz * z < 0) {
      cx = -cx;
      cy = -cy;
      cz = -cz;
    }
    normals[3 * k] = cx;
    normals[3 * k + 1] = cy;
    normals[3 * k + 2] = cz;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  // Copias: al liberar una geometría, three borra los búferes de todos sus atributos, y la base sigue
  // en uso.
  const uv = base.getAttribute('uv');
  if (uv) geometry.setAttribute('uv', uv.clone());
  const index = base.getIndex();
  if (index) geometry.setIndex(index.clone());
  geometry.computeBoundingSphere();
  return geometry;
}
