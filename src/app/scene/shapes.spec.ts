import deimosBin from '../../../public/data/shapes/deimos.bin' with { loader: 'binary' };
import phobosBin from '../../../public/data/shapes/phobos.bin' with { loader: 'binary' };
import { BufferGeometry, SphereGeometry } from 'three';
import { BODY_DATA } from '../data/body-data';
import { createCubeSphere } from './cube-sphere';
import { SHAPE_FILES } from './shape-files';
import { ShapeGrid, decodeShape, shapeGeometry, shapeRadiusKm } from './shapes';

const DEG = Math.PI / 180;

/** Un búfer con el formato de build-shapes.mjs a partir de una función de la latitud y la longitud. */
function encodeGrid(rows: number, columns: number, radius: (lat: number, lon: number) => number) {
  const values: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      values.push(radius(-90 + (180 * i) / (rows - 1), -180 + (360 * j) / columns));
    }
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const buffer = new ArrayBuffer(20 + 2 * values.length);
  const view = new DataView(buffer);
  'TLSF'.split('').forEach((c, k) => view.setUint8(k, c.charCodeAt(0)));
  view.setUint16(4, 1, true);
  view.setUint16(6, rows, true);
  view.setUint16(8, columns, true);
  view.setFloat32(12, min, true);
  view.setFloat32(16, max, true);
  const minF = view.getFloat32(12, true);
  const maxF = view.getFloat32(16, true);
  values.forEach((r, k) =>
    view.setUint16(20 + 2 * k, Math.round((65535 * (r - minF)) / (maxF - minF || 1)), true),
  );
  return buffer;
}

/** El radio de un elipsoide de semiejes (a, b, c), en el sistema del cuerpo (Z, el polo). */
const ellipsoid =
  (a: number, b: number, c: number) =>
  (latDeg: number, lonDeg: number): number => {
    const x = Math.cos(latDeg * DEG) * Math.cos(lonDeg * DEG);
    const y = Math.cos(latDeg * DEG) * Math.sin(lonDeg * DEG);
    const z = Math.sin(latDeg * DEG);
    return 1 / Math.sqrt((x / a) ** 2 + (y / b) ** 2 + (z / c) ** 2);
  };

/** Los semiejes (X, Y y Z del cuerpo) del elipsoide alineado que mejor se ajusta a una rejilla. */
function fitAxes(grid: ShapeGrid): [number, number, number] {
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rhs = [0, 0, 0];
  for (let i = 0; i < grid.rows; i++) {
    const lat = -90 + (180 * i) / (grid.rows - 1);
    const w = Math.max(Math.cos(lat * DEG), 1e-6);
    for (let j = 0; j < grid.columns; j++) {
      const lon = -180 + (360 * j) / grid.columns;
      const r = grid.radiiKm[i * grid.columns + j] as number;
      const f = [
        (r * Math.cos(lat * DEG) * Math.cos(lon * DEG)) ** 2,
        (r * Math.cos(lat * DEG) * Math.sin(lon * DEG)) ** 2,
        (r * Math.sin(lat * DEG)) ** 2,
      ];
      for (let a = 0; a < 3; a++) {
        rhs[a] = (rhs[a] as number) + w * (f[a] as number);
        for (let b = 0; b < 3; b++) {
          (M[a] as number[])[b] =
            ((M[a] as number[])[b] as number) + w * (f[a] as number) * (f[b] as number);
        }
      }
    }
  }
  const det = (m: number[][]): number =>
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const d = det(M);
  const solution = [0, 1, 2].map(
    (k) => det(M.map((row, i) => row.map((v, j) => (j === k ? (rhs[i] as number) : v)))) / d,
  );
  return solution.map((q) => 1 / Math.sqrt(q)) as [number, number, number];
}

/** La dirección unitaria de la escena (Y, el polo; la longitud este hacia −Z) de una latitud y longitud. */
const sceneDirection = (latDeg: number, lonDeg: number): [number, number, number] => [
  Math.cos(latDeg * DEG) * Math.cos(lonDeg * DEG),
  Math.sin(latDeg * DEG),
  -Math.cos(latDeg * DEG) * Math.sin(lonDeg * DEG),
];

/** El radio (en radios) del vértice de `geometry` más cercano a una dirección. */
function vertexRadiusToward(geometry: BufferGeometry, d: [number, number, number]): number {
  const position = geometry.getAttribute('position');
  let best = -Infinity;
  let radius = 0;
  for (let k = 0; k < position.count; k++) {
    const x = position.getX(k);
    const y = position.getY(k);
    const z = position.getZ(k);
    const r = Math.hypot(x, y, z);
    const cos = (x * d[0] + y * d[1] + z * d[2]) / r;
    if (cos > best) {
      best = cos;
      radius = r;
    }
  }
  return radius;
}

describe('shapes: decodificación', () => {
  it('decodifica una rejilla y rechaza lo que no lo es', () => {
    const grid = decodeShape(encodeGrid(5, 8, (lat) => 10 + lat / 90));
    expect(grid.rows).toBe(5);
    expect(grid.columns).toBe(8);
    expect(grid.radiiKm[0]).toBeCloseTo(9, 4);
    expect(grid.radiiKm[4 * 8]).toBeCloseTo(11, 4);
    expect(() => decodeShape(new ArrayBuffer(8))).toThrow();
    const bad = encodeGrid(5, 8, () => 1);
    new DataView(bad).setUint8(0, 0x58);
    expect(() => decodeShape(bad)).toThrow();
    expect(() => decodeShape(encodeGrid(5, 8, () => 1).slice(0, 40))).toThrow();
  });

  it('comprueba la rejilla con su manifiesto', () => {
    const file = SHAPE_FILES.fobos;
    expect(file).toBeDefined();
    expect(() =>
      decodeShape(
        encodeGrid(5, 8, () => 1),
        file,
      ),
    ).toThrow();
  });
});

describe('shapes: el radio interpolado', () => {
  const grid = decodeShape(encodeGrid(19, 36, ellipsoid(13, 11, 9)));

  it('en los nodos, el de la rejilla; entre ellos, intermedio; con la vuelta en ±180°', () => {
    expect(shapeRadiusKm(grid, 0, 0)).toBeCloseTo(13, 3);
    expect(shapeRadiusKm(grid, 0, 90 * DEG)).toBeCloseTo(11, 3);
    expect(shapeRadiusKm(grid, 90 * DEG, 0)).toBeCloseTo(9, 3);
    expect(shapeRadiusKm(grid, -90 * DEG, 1)).toBeCloseTo(9, 3);
    expect(shapeRadiusKm(grid, 0, Math.PI)).toBeCloseTo(13, 3);
    expect(shapeRadiusKm(grid, 0, -Math.PI)).toBeCloseTo(13, 3);
    expect(shapeRadiusKm(grid, 0, 179.9 * DEG)).toBeCloseTo(
      shapeRadiusKm(grid, 0, -179.9 * DEG),
      6,
    );
    const mid = shapeRadiusKm(grid, 0, 5 * DEG);
    expect(mid).toBeLessThan(13);
    expect(mid).toBeGreaterThan(shapeRadiusKm(grid, 0, 10 * DEG));
  });
});

describe('shapes: la esfera deformada', () => {
  const R = 11;
  const shape = ellipsoid(13, 11.5, 9);
  const grid = decodeShape(encodeGrid(181, 360, shape));

  it('lleva cada vértice a su radio, con la longitud este hacia −Z y el polo en Y', () => {
    const geometry = shapeGeometry(new SphereGeometry(1, 64, 32), grid, R);
    expect(vertexRadiusToward(geometry, sceneDirection(0, 0))).toBeCloseTo(13 / R, 2);
    expect(vertexRadiusToward(geometry, sceneDirection(0, 90))).toBeCloseTo(11.5 / R, 2);
    expect(vertexRadiusToward(geometry, sceneDirection(90, 0))).toBeCloseTo(9 / R, 2);
    // El radio de cada vértice, el del elipsoide en su dirección.
    const position = geometry.getAttribute('position');
    let worst = 0;
    for (let k = 0; k < position.count; k++) {
      const x = position.getX(k);
      const y = position.getY(k);
      const z = position.getZ(k);
      const r = Math.hypot(x, y, z);
      const lat = Math.asin(y / r) / DEG;
      const lon = Math.atan2(-z, x) / DEG;
      worst = Math.max(worst, Math.abs(r * R - shape(lat, lon)));
    }
    expect(worst).toBeLessThan(0.01);
    geometry.dispose();
  });

  it('sus normales son las del elipsoide (también en los polos y en la costura de ±180°)', () => {
    for (const base of [new SphereGeometry(1, 64, 32), createCubeSphere(24)]) {
      const geometry = shapeGeometry(base, grid, R);
      const position = geometry.getAttribute('position');
      const normal = geometry.getAttribute('normal');
      let worstDeg = 0;
      for (let k = 0; k < position.count; k++) {
        // En el sistema del cuerpo (Z, el polo): (x, −z, y) de la escena.
        const p = [position.getX(k) * R, -position.getZ(k) * R, position.getY(k) * R];
        const g = [
          (p[0] as number) / 13 ** 2,
          (p[1] as number) / 11.5 ** 2,
          (p[2] as number) / 9 ** 2,
        ];
        const gl = Math.hypot(...g);
        const expected = [(g[0] as number) / gl, (g[2] as number) / gl, -(g[1] as number) / gl];
        const cos =
          normal.getX(k) * (expected[0] as number) +
          normal.getY(k) * (expected[1] as number) +
          normal.getZ(k) * (expected[2] as number);
        worstDeg = Math.max(worstDeg, Math.acos(Math.min(1, cos)) / DEG);
      }
      expect(worstDeg).toBeLessThan(1);
      geometry.dispose();
      base.dispose();
    }
  });

  it('copia las coordenadas de textura y el índice de la base (liberarla no toca la base)', () => {
    const base = new SphereGeometry(1, 16, 8);
    const geometry = shapeGeometry(base, grid, R);
    expect(geometry.getAttribute('uv')).not.toBe(base.getAttribute('uv'));
    expect(Array.from(geometry.getAttribute('uv').array)).toEqual(
      Array.from(base.getAttribute('uv').array),
    );
    expect(geometry.getIndex()).not.toBe(base.getIndex());
    expect(geometry.boundingSphere?.radius).toBeGreaterThan(13 / R - 0.01);
  });
});

describe('shapes: Fobos y Deimos (los DSK del NAIF, scripts/build-shapes.mjs)', () => {
  const cases = [
    { id: 'fobos' as const, buffer: phobosBin },
    { id: 'deimos' as const, buffer: deimosBin },
  ];

  for (const { id, buffer } of cases) {
    const file = SHAPE_FILES[id];
    const bytes = buffer as Uint8Array;
    const grid = decodeShape(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      file,
    );

    it(`${id}: los semiejes de su forma, a 0,5 km de los publicados y en su orden`, () => {
      expect(file).toBeDefined();
      const axes = fitAxes(grid);
      file?.publishedSemiAxesKm.forEach((published, k) => {
        expect(Math.abs((axes[k] as number) - published)).toBeLessThan(0.5);
      });
      expect(axes[0]).toBeGreaterThan(axes[1]);
      expect(axes[1]).toBeGreaterThan(axes[2]);
    });

    it(`${id}: su volumen, el de una esfera con el radio del catálogo (±2 %)`, () => {
      const catalog = BODY_DATA[id].physical.radiusKm.value;
      expect(Math.abs((file?.meanRadiusKm ?? 0) / catalog - 1)).toBeLessThan(0.02);
    });

    it(`${id}: su eje largo apunta al meridiano 0 (la cara hacia Marte)`, () => {
      // En la escena, la luna gira con el meridiano 0 (X) hacia su planeta (rotación síncrona).
      const geometry = shapeGeometry(new SphereGeometry(1, 96, 48), grid, file?.meanRadiusKm ?? 1);
      const position = geometry.getAttribute('position');
      let farthest = { r: 0, x: 0, y: 0, z: 0 };
      for (let k = 0; k < position.count; k++) {
        const x = position.getX(k);
        const y = position.getY(k);
        const z = position.getZ(k);
        const r = Math.hypot(x, y, z);
        if (r > farthest.r) farthest = { r, x, y, z };
      }
      // El punto más lejano del centro, a menos de 40° del eje X (hacia Marte o en la cara opuesta).
      expect(Math.abs(farthest.x) / farthest.r).toBeGreaterThan(Math.cos(40 * DEG));
      geometry.dispose();
    });
  }

  it('fobos: Stickney (Gazetteer, F5707: 1° N, 49° O) es una depresión en su sitio', () => {
    const file = SHAPE_FILES.fobos;
    const bytes = phobosBin as Uint8Array;
    const grid = decodeShape(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      file,
    );
    // Lo que la forma se aparta del elipsoide ajustado, en su centro y en su borde (a 1,1 radios del
    // cráter: 9 km de diámetro, unos 23° de radio).
    const [a, b, c] = fitAxes(grid);
    const residual = (lat: number, lon: number): number =>
      shapeRadiusKm(grid, lat * DEG, lon * DEG) - ellipsoid(a, b, c)(lat, lon);
    const depth = (lat: number, lon: number): number => {
      let rim = 0;
      for (let k = 0; k < 16; k++) {
        const angle = (2 * Math.PI * k) / 16;
        rim += residual(
          lat + 25 * Math.sin(angle),
          lon + (25 * Math.cos(angle)) / Math.cos(lat * DEG),
        );
      }
      return rim / 16 - residual(lat, lon);
    };
    const stickney = depth(1, -49);
    expect(stickney).toBeGreaterThan(0.5);
    expect(stickney).toBeGreaterThan(depth(1, 131) + 0.5);
    expect(stickney).toBeGreaterThan(depth(1, 49) + 0.5);
  });
});
