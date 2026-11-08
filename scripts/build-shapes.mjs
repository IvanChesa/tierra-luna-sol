// Genera las formas de Fobos y Deimos (fase 9b, D42): de los DSK del servidor del NAIF (su exportación
// OBJ, en assets-src/shapes/; scripts/download-assets.mjs), una rejilla de radios por latitud y longitud
// planetocéntricas (longitud este) que la escena usa para deformar la esfera de cada luna
// (`scene/shapes.ts`). Escribe public/data/shapes/{luna}.bin y su manifiesto (con el hash en la URL),
// src/app/scene/shape-files.ts (GENERADO: no se edita a mano).
// Uso: node scripts/download-assets.mjs && node scripts/build-shapes.mjs
//
// - Cada nodo de la rejilla es el radio de la superficie en esa dirección desde el centro del modelo
//   (el más lejano si un rayo la cortara más de una vez): la malla «reducida» es la esfera de la
//   escena con sus vértices llevados a ese radio, con el mapa proyectado por la misma latitud y la misma
//   longitud planetocéntricas que el mosaico. Es una versión modificada del modelo (las reglas del NAIF
//   piden decirlo en su atribución: FUENTES.md y /creditos).
// - Comprueba lo que no se puede dar por supuesto: que cada rayo corta la malla, el elipsoide triaxial
//   que mejor se ajusta a la rejilla frente a los semiejes publicados (NSSDC: el eje hacia Marte, el de
//   la órbita y el polar) y que el eje largo apunta al meridiano 0 (la cara hacia Marte, IAU).
//
// El binario (little-endian): «TLSF», versión (uint16), filas de latitud (uint16, de −90° a 90° con los
// polos), columnas de longitud (uint16, de −180° hacia el este, sin repetir 180°), 0 (uint16), el radio
// mínimo y el máximo (float32, km) y los radios en uint16 (de mínimo a máximo), fila a fila desde el sur.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets-src/shapes/', ROOT);
const OUT = new URL('public/data/shapes/', ROOT);

/**
 * Las formas: el fichero, el paso de la rejilla (grados) y los semiejes publicados (km; NSSDC, Mars
 * Fact Sheet: «Subplanetary axis radius», «Along-orbit axis radius» y «Polar axis radius»,
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html, consultada el 07-11-2026). El paso: el
 * de Fobos, 1° (unos 200 m en su ecuador; el modelo del DLR tiene 275 000 triángulos); el de Deimos, 2°
 * (su modelo es una rejilla de 5°).
 */
const SHAPES = {
  fobos: {
    file: 'PHOBOS_K275_DLR_V02.OBJ',
    name: 'phobos',
    stepDeg: 1,
    published: [13.0, 11.4, 9.1],
  },
  deimos: {
    file: 'DEIMOS_K005_THO_V02.OBJ',
    name: 'deimos',
    stepDeg: 2,
    published: [7.8, 6.0, 5.1],
  },
};

/** El elipsoide ajustado puede apartarse de los semiejes publicados como mucho esto (km). */
const AXIS_TOLERANCE_KM = 0.5;
/**
 * Y sus ejes, de los del sistema del cuerpo, como mucho esto (grados): lo justo para cazar un error
 * grande (ejes cambiados o girados 90°). Los ejes principales de un modelo no coinciden del todo con los
 * del sistema de la IAU: en el de Deimos, a 3–5°.
 */
const MAX_TILT_DEG = 8;

/**
 * Sondas de la forma: cráteres grandes del Gazetteer of Planetary Nomenclature (IAU/USGS; su número
 * de `Feature`), con su latitud y su longitud ESTE (el Gazetteer de Fobos da longitudes oeste, de 0 a
 * 360). El radio medio en el cráter (en un disco de `radiusDeg`) queda por debajo del elipsoide ajustado
 * * más que en el punto girado 180° alrededor del polo y que en el reflejado (la longitud cambiada de
 * signo): así se ve un giro de 180°, que el elipsoide no distingue. Deimos no lleva: no tiene un
 * cráter que destaque así en su forma (la gran depresión de su polo sur no distingue el giro).
 */
const SHAPE_PROBES = {
  fobos: [{ name: 'Stickney', feature: 5707, lat: 1, lon: -49, diameterKm: 9 }],
};

/** Lee los vértices (km) y los triángulos (índices desde 0) de un OBJ de DSKEXP. */
function parseObj(text) {
  const vertices = [];
  const faces = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      vertices.push(Number(x), Number(y), Number(z));
    } else if (line.startsWith('f ')) {
      const [, a, b, c] = line.split(/\s+/);
      faces.push(Number(a) - 1, Number(b) - 1, Number(c) - 1);
    }
  }
  if (vertices.some((v) => !Number.isFinite(v)) || faces.some((f) => !Number.isInteger(f))) {
    throw new Error('OBJ con valores que no son números');
  }
  return { vertices: Float64Array.from(vertices), faces: Uint32Array.from(faces) };
}

const DEG = Math.PI / 180;

/** Latitud y longitud este (grados) de la dirección de un vector (sistema del cuerpo: Z, el polo). */
function latLon(x, y, z) {
  const r = Math.hypot(x, y, z);
  return [Math.asin(z / r) / DEG, Math.atan2(y, x) / DEG];
}

/**
 * Una rejilla angular de 1° con los triángulos que caen en cada celda (por las direcciones de sus
 * vértices, con un margen de la mitad de su lado angular más largo; cerca de los polos, toda la vuelta).
 */
function angularBins(vertices, faces) {
  const bins = Array.from({ length: 180 * 360 }, () => []);
  const lat = new Float64Array(vertices.length / 3);
  const lon = new Float64Array(vertices.length / 3);
  for (let v = 0; v < lat.length; v++) {
    [lat[v], lon[v]] = latLon(vertices[3 * v], vertices[3 * v + 1], vertices[3 * v + 2]);
  }
  const angle = (a, b) => {
    const [ax, ay, az] = [vertices[3 * a], vertices[3 * a + 1], vertices[3 * a + 2]];
    const [bx, by, bz] = [vertices[3 * b], vertices[3 * b + 1], vertices[3 * b + 2]];
    const dot = (ax * bx + ay * by + az * bz) / (Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz));
    return Math.acos(Math.min(1, Math.max(-1, dot))) / DEG;
  };
  for (let f = 0; f < faces.length / 3; f++) {
    const [a, b, c] = [faces[3 * f], faces[3 * f + 1], faces[3 * f + 2]];
    const margin = 0.5 * Math.max(angle(a, b), angle(b, c), angle(c, a)) + 0.05;
    const lats = [lat[a], lat[b], lat[c]];
    let lons = [lon[a], lon[b], lon[c]];
    const latMin = Math.min(...lats) - margin;
    const latMax = Math.max(...lats) + margin;
    if (Math.max(...lons) - Math.min(...lons) > 180) lons = lons.map((l) => (l < 0 ? l + 360 : l));
    const i0 = Math.max(0, Math.floor(latMin + 90));
    const i1 = Math.min(179, Math.floor(latMax + 90));
    // Cerca de un polo (o tocándolo), un triángulo cubre cualquier longitud.
    const allLon = latMax >= 88 || latMin <= -88;
    const j0 = allLon ? 0 : Math.floor(Math.min(...lons) - margin + 180);
    const j1 = allLon ? 359 : Math.floor(Math.max(...lons) + margin + 180);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) bins[i * 360 + (((j % 360) + 360) % 360)].push(f);
    }
  }
  return bins;
}

/**
 * El radio (km) donde el rayo desde el origen en la dirección unitaria `d` corta la malla (el corte más
 * lejano), o −1 si no la corta (Möller y Trumbore, 1997).
 */
function castRay(d, candidates, vertices, faces) {
  let best = -1;
  for (const f of candidates) {
    const a = 3 * faces[3 * f];
    const b = 3 * faces[3 * f + 1];
    const c = 3 * faces[3 * f + 2];
    const e1x = vertices[b] - vertices[a];
    const e1y = vertices[b + 1] - vertices[a + 1];
    const e1z = vertices[b + 2] - vertices[a + 2];
    const e2x = vertices[c] - vertices[a];
    const e2y = vertices[c + 1] - vertices[a + 1];
    const e2z = vertices[c + 2] - vertices[a + 2];
    const px = d[1] * e2z - d[2] * e2y;
    const py = d[2] * e2x - d[0] * e2z;
    const pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det;
    // El origen del rayo es el centro (0, 0, 0): s = −a.
    const sx = -vertices[a];
    const sy = -vertices[a + 1];
    const sz = -vertices[a + 2];
    const u = (sx * px + sy * py + sz * pz) * inv;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (t > best) best = t;
  }
  return best;
}

/** La rejilla de radios (km): filas de −90° a 90° (con los polos) y columnas desde −180° (sin 180°). */
function radiusGrid({ vertices, faces }, stepDeg) {
  const bins = angularBins(vertices, faces);
  const rows = Math.round(180 / stepDeg) + 1;
  const columns = Math.round(360 / stepDeg);
  const radii = new Float64Array(rows * columns);
  for (let i = 0; i < rows; i++) {
    const lat = -90 + i * stepDeg;
    for (let j = 0; j < columns; j++) {
      const lon = -180 + j * stepDeg;
      const d = [
        Math.cos(lat * DEG) * Math.cos(lon * DEG),
        Math.cos(lat * DEG) * Math.sin(lon * DEG),
      ];
      d.push(Math.sin(lat * DEG));
      const bi = Math.min(179, Math.max(0, Math.floor(lat + 90)));
      const bj = ((Math.floor(lon + 180) % 360) + 360) % 360;
      const r = castRay(d, bins[bi * 360 + bj], vertices, faces);
      if (!(r > 0)) throw new Error(`El rayo de ${lat}°, ${lon}° no corta la malla`);
      radii[i * columns + j] = r;
    }
  }
  return { rows, columns, radii };
}

/**
 * El elipsoide centrado que mejor se ajusta a la rejilla: los mínimos cuadrados de la cuádrica
 * A x² + B y² + C z² + D xy + E xz + F yz = 1 con los puntos de la superficie (cada uno con el peso de
 * su área, cos φ). Sus semiejes (km) y sus direcciones son los valores y los vectores propios de la
 * matriz de la cuádrica, ordenados por el eje (de cada semieje, el eje del sistema del cuerpo más
 * cercano: X, Y o Z). También, el radio del volumen equivalente.
 */
function fitEllipsoid({ rows, columns, radii }, stepDeg) {
  const n = 6;
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  const rhs = new Array(n).fill(0);
  let volume = 0;
  for (let i = 0; i < rows; i++) {
    const lat = -90 + i * stepDeg;
    const w = Math.max(Math.cos(lat * DEG), 1e-6);
    for (let j = 0; j < columns; j++) {
      const lon = -180 + j * stepDeg;
      const r = radii[i * columns + j];
      const [x, y, z] = [
        r * Math.cos(lat * DEG) * Math.cos(lon * DEG),
        r * Math.cos(lat * DEG) * Math.sin(lon * DEG),
        r * Math.sin(lat * DEG),
      ];
      const f = [x * x, y * y, z * z, x * y, x * z, y * z];
      for (let a = 0; a < n; a++) {
        rhs[a] += w * f[a];
        for (let b = 0; b < n; b++) M[a][b] += w * f[a] * f[b];
      }
      // El volumen, ∫ r³/3 dΩ, con el área de cada nodo (cos φ · paso²; en los polos, su casquete).
      const cell =
        i === 0 || i === rows - 1
          ? (2 * Math.PI * (1 - Math.cos((stepDeg / 2) * DEG))) / columns
          : w * (stepDeg * DEG) ** 2;
      volume += (r ** 3 / 3) * cell;
    }
  }
  const [A, B, C, D, E, F] = solve(M, rhs);
  const Q = [
    [A, D / 2, E / 2],
    [D / 2, B, F / 2],
    [E / 2, F / 2, C],
  ];
  const { values, vectors } = jacobi(Q);
  // Cada semieje, con el eje del cuerpo al que más se parece su dirección.
  const axes = [0, 0, 0];
  const directions = [null, null, null];
  for (let k = 0; k < 3; k++) {
    const v = vectors.map((row) => row[k]);
    const axis = v.map(Math.abs).indexOf(Math.max(...v.map(Math.abs)));
    axes[axis] = 1 / Math.sqrt(values[k]);
    directions[axis] = v[axis] < 0 ? v.map((c) => -c) : v;
  }
  if (directions.some((d) => d === null)) throw new Error('El elipsoide ajustado no es triaxial');
  // Lo que se aparta cada eje del eje del cuerpo (grados).
  const tilt = directions.map((d, axis) => Math.acos(Math.min(1, Math.abs(d[axis]))) / DEG);
  return { axes, tilt, Q, meanRadius: Math.cbrt((3 * volume) / (4 * Math.PI)) };
}

/** El radio (km) de la rejilla en una dirección (interpolación bilineal en latitud y longitud). */
function gridRadius({ rows, columns, radii }, stepDeg, lat, lon) {
  const y = Math.min(rows - 1 - 1e-9, Math.max(0, (lat + 90) / stepDeg));
  const x = ((((lon + 180) / stepDeg) % columns) + columns) % columns;
  const i = Math.floor(y);
  const j = Math.floor(x);
  const ty = y - i;
  const tx = x - j;
  const at = (ii, jj) => radii[ii * columns + (jj % columns)];
  return (
    (at(i, j) * (1 - tx) + at(i, j + 1) * tx) * (1 - ty) +
    (at(i + 1, j) * (1 - tx) + at(i + 1, j + 1) * tx) * ty
  );
}

/** El radio (km) del elipsoide de la cuádrica `Q` en una dirección. */
function ellipsoidRadius(Q, lat, lon) {
  const d = [
    Math.cos(lat * DEG) * Math.cos(lon * DEG),
    Math.cos(lat * DEG) * Math.sin(lon * DEG),
    Math.sin(lat * DEG),
  ];
  let q = 0;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) q += d[a] * Q[a][b] * d[b];
  return 1 / Math.sqrt(q);
}

/**
 * La profundidad (km) de un cráter en la forma: la media del residuo frente al elipsoide (la forma
 * menos el elipsoide) en su borde (de 1 a 1,4 radios del cráter) menos la de su centro (hasta 0,5),
 * con los puntos repartidos por igual sobre la esfera. `radiusDeg`: el radio angular del cráter.
 */
function craterDepth(grid, stepDeg, Q, lat, lon, radiusDeg) {
  const center = [
    Math.cos(lat * DEG) * Math.cos(lon * DEG),
    Math.cos(lat * DEG) * Math.sin(lon * DEG),
    Math.sin(lat * DEG),
  ];
  const sums = { inner: [0, 0], rim: [0, 0] };
  for (let la = -90; la <= 90; la += 0.5) {
    for (let lo = -180; lo < 180; lo += 0.5 / Math.max(Math.cos(la * DEG), 0.01)) {
      const p = [
        Math.cos(la * DEG) * Math.cos(lo * DEG),
        Math.cos(la * DEG) * Math.sin(lo * DEG),
        Math.sin(la * DEG),
      ];
      const dot = p[0] * center[0] + p[1] * center[1] + p[2] * center[2];
      const s = Math.acos(Math.min(1, dot)) / DEG / radiusDeg;
      const key = s <= 0.5 ? 'inner' : s >= 1 && s <= 1.4 ? 'rim' : null;
      if (!key) continue;
      sums[key][0] += gridRadius(grid, stepDeg, la, lo) - ellipsoidRadius(Q, la, lo);
      sums[key][1]++;
    }
  }
  return sums.rim[0] / sums.rim[1] - sums.inner[0] / sums.inner[1];
}

/** Comprueba las sondas de una forma y devuelve su informe; falla si alguna no distingue el giro. */
function checkShapeProbes(id, grid, stepDeg, Q, meanRadiusKm) {
  const probes = SHAPE_PROBES[id];
  if (!probes) return `${id}: sin sondas de la forma (ver SHAPE_PROBES)`;
  const km = (x) => x.toFixed(2).replace('.', ',');
  const parts = probes.map((probe) => {
    const radiusDeg = probe.diameterKm / 2 / meanRadiusKm / DEG;
    const depth = (lon) => craterDepth(grid, stepDeg, Q, probe.lat, lon, radiusDeg);
    const here = depth(probe.lon);
    const turned = depth(probe.lon + 180);
    const mirrored = depth(-probe.lon);
    if (!(here > MIN_PROBE_DEPTH_KM && here > 2 * turned && here > 2 * mirrored)) {
      throw new Error(
        `${id}: la sonda ${probe.name} no distingue la orientación (profundidad ${km(here)} km; girada 180°, ${km(turned)}; reflejada, ${km(mirrored)})`,
      );
    }
    return `${probe.name} (F${probe.feature}), ${km(here)} km de profundidad (girada 180°, ${km(turned)}; reflejada, ${km(mirrored)})`;
  });
  return `${id}: sondas de la forma: ${parts.join('; ')}`;
}

/** La profundidad mínima de una sonda de la forma (km), y el doble de la del punto girado o reflejado. */
const MIN_PROBE_DEPTH_KM = 0.3;

/** Resuelve un sistema lineal (eliminación de Gauss con pivote parcial). */
function solve(M, b) {
  const n = b.length;
  const a = M.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = c + 1; r < n; r++) {
      const k = a[r][c] / a[c][c];
      for (let j = c; j <= n; j++) a[r][j] -= k * a[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = a[r][n];
    for (let j = r + 1; j < n; j++) s -= a[r][j] * x[j];
    x[r] = s / a[r][r];
  }
  return x;
}

/** Valores y vectores propios (en columnas) de una matriz simétrica de 3 × 3 (método de Jacobi). */
function jacobi(S) {
  const a = S.map((row) => [...row]);
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
}

/** El binario de una rejilla (ver la cabecera de este fichero). */
function encode({ rows, columns, radii }) {
  let min = Infinity;
  let max = -Infinity;
  for (const r of radii) {
    min = Math.min(min, r);
    max = Math.max(max, r);
  }
  const header = 4 + 2 * 4 + 4 * 2;
  const buffer = Buffer.alloc(header + 2 * radii.length);
  buffer.write('TLSF', 0, 'ascii');
  buffer.writeUInt16LE(1, 4);
  buffer.writeUInt16LE(rows, 6);
  buffer.writeUInt16LE(columns, 8);
  buffer.writeUInt16LE(0, 10);
  buffer.writeFloatLE(min, 12);
  buffer.writeFloatLE(max, 16);
  const minF = buffer.readFloatLE(12);
  const maxF = buffer.readFloatLE(16);
  for (let k = 0; k < radii.length; k++) {
    const q = Math.round((65535 * (radii[k] - minF)) / (maxF - minF));
    buffer.writeUInt16LE(Math.min(65535, Math.max(0, q)), header + 2 * k);
  }
  return { buffer, min: minF, max: maxF };
}

// --- Generación ----------------------------------------------------------------------------------
await mkdir(OUT, { recursive: true });
for (const name of await readdir(OUT)) if (name.endsWith('.bin')) await rm(new URL(name, OUT));

const entries = [];
const reports = [];
for (const [id, spec] of Object.entries(SHAPES)) {
  const started = Date.now();
  const mesh = parseObj(await readFile(new URL(spec.file, SRC), 'utf8'));
  const grid = radiusGrid(mesh, spec.stepDeg);
  const fit = fitEllipsoid(grid, spec.stepDeg);
  const off = fit.axes.map((a, k) => a - spec.published[k]);
  const km = (x) => x.toFixed(2).replace('.', ',');
  if (off.some((x) => Math.abs(x) > AXIS_TOLERANCE_KM)) {
    throw new Error(
      `${id}: el elipsoide ajustado (${fit.axes.map(km).join(' × ')} km) se aparta de los semiejes publicados (${spec.published.map(km).join(' × ')}) más de ${AXIS_TOLERANCE_KM} km`,
    );
  }
  // Los ejes del elipsoide, con los del cuerpo: el largo, hacia Marte (el meridiano 0 de la IAU), y el
  // corto, el polo (como mucho, a `MAX_TILT_DEG`).
  if (!(fit.axes[0] > fit.axes[1] && fit.axes[1] > fit.axes[2])) {
    throw new Error(`${id}: los semiejes no van de mayor a menor en X, Y y Z`);
  }
  if (fit.tilt.some((t) => t > MAX_TILT_DEG)) {
    throw new Error(
      `${id}: los ejes del elipsoide se apartan de los del cuerpo ${fit.tilt.map((t) => t.toFixed(1)).join('°, ')}°`,
    );
  }
  reports.push(checkShapeProbes(id, grid, spec.stepDeg, fit.Q, fit.meanRadius));
  const { buffer, min, max } = encode(grid);
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 10);
  // Nombre fijo (los tests lo leen) y el hash en la consulta: un fichero nuevo, una URL nueva.
  const name = `${spec.name}.bin`;
  await writeFile(new URL(name, OUT), buffer);
  entries.push(
    `  ${id}: { path: 'data/shapes/${name}?v=${hash}', bytes: ${buffer.byteLength}, rows: ${grid.rows}, columns: ${grid.columns}, minKm: ${min}, maxKm: ${max}, semiAxesKm: [${fit.axes.map((a) => a.toFixed(3)).join(', ')}], publishedSemiAxesKm: [${spec.published.join(', ')}], meanRadiusKm: ${fit.meanRadius.toFixed(3)} },`,
  );
  reports.push(
    `${id}: ${mesh.vertices.length / 3} vértices y ${mesh.faces.length / 3} triángulos → rejilla de ${grid.rows} × ${grid.columns} (${spec.stepDeg}°), ${(buffer.byteLength / 1024).toFixed(0)} kB, en ${((Date.now() - started) / 1000).toFixed(0)} s; elipsoide ajustado ${fit.axes.map(km).join(' × ')} km (publicado ${spec.published.map(km).join(' × ')}; diferencia ${off.map(km).join(' · ')}), con sus ejes a ${fit.tilt.map((t) => t.toFixed(1).replace('.', ',')).join('°, ')}° de los del cuerpo; radio del volumen equivalente ${km(fit.meanRadius)} km; radio de ${km(min)} a ${km(max)} km`,
  );
}

const today = new Date().toISOString().slice(0, 10);
const ts = `// GENERADO por scripts/build-shapes.mjs el ${today}. No se edita a mano.
// Las formas de Fobos y Deimos (fase 9b, D42): rejillas de radios (public/data/shapes/) a partir de los
// DSK del servidor del NAIF (origen, autores y reglas de uso en docs/FUENTES.md).
import type { BodyId } from '../data/body.model';
import type { ShapeFile } from './shapes';

/**
 * Cada forma: su fichero, su rejilla (filas de latitud con los polos y columnas de longitud), el radio
 * mínimo y el máximo (km) que cuantiza, el elipsoide triaxial que mejor se le ajusta y los semiejes
 * publicados (NSSDC: hacia el planeta, a lo largo de la órbita y polar) y el radio del volumen
 * equivalente (km).
 */
export const SHAPE_FILES: Readonly<Partial<Record<BodyId, ShapeFile>>> = {
${entries.join('\n')}
};
`;
await writeFile(new URL('src/app/scene/shape-files.ts', ROOT), ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/scene/shape-files.ts'],
  { cwd: ROOT, stdio: 'inherit' },
);
console.log('\nComprobaciones:\n' + reports.map((r) => `- ${r}`).join('\n'));
