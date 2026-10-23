/**
 * Catálogo de estrellas reales (D13): decodifica `public/data/stars.bin`, que genera
 * `scripts/build-stars.mjs` a partir de HYG v4.1 (CC BY-SA 4.0). El formato está documentado en
 * ese script. Las direcciones salen en ECL, como el resto de la escena.
 */
import { eqjToEcl, equatorialToVector } from './coordinates';

const MAGIC = 'TLSS';
const VERSION = 1;
const HEADER_BYTES = 16;
const RECORD_BYTES = 8;
const NO_COLOR = -32768;

export interface StarCatalog {
  readonly count: number;
  /** Ascensión recta J2000 en grados [0, 360). */
  readonly raDeg: Float64Array;
  /** Declinación J2000 en grados [−90, 90]. */
  readonly decDeg: Float64Array;
  /** Magnitud visual, de la estrella más brillante a la más débil. */
  readonly magnitude: Float32Array;
  /** Índice de color B−V; `NaN` si el catálogo no lo da. */
  readonly colorIndex: Float32Array;
}

/** Lee el binario. Falla si la cabecera o el tamaño no cuadran (fichero corrupto o de otra versión). */
export function decodeStarCatalog(data: ArrayBuffer | Uint8Array): StarCatalog {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < HEADER_BYTES) throw new Error('Catálogo de estrellas truncado.');
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  if (magic !== MAGIC) throw new Error('No es un catálogo de estrellas de Tierra Luna Sol.');
  const version = view.getUint16(4, true);
  if (version !== VERSION) throw new Error(`Versión de catálogo no admitida: ${version}.`);
  const count = view.getUint32(8, true);
  if (bytes.byteLength !== HEADER_BYTES + count * RECORD_BYTES) {
    throw new Error('El tamaño del catálogo no coincide con su cabecera.');
  }
  const raDeg = new Float64Array(count);
  const decDeg = new Float64Array(count);
  const magnitude = new Float32Array(count);
  const colorIndex = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    const offset = HEADER_BYTES + k * RECORD_BYTES;
    raDeg[k] = (view.getUint16(offset, true) / 65536) * 360;
    decDeg[k] = (view.getInt16(offset + 2, true) / 32767) * 90;
    magnitude[k] = view.getInt16(offset + 4, true) / 100;
    const color = view.getInt16(offset + 6, true);
    colorIndex[k] = color === NO_COLOR ? Number.NaN : color / 1000;
  }
  return { count, raDeg, decDeg, magnitude, colorIndex };
}

/** Direcciones unitarias ECL de todas las estrellas, intercaladas (x, y, z). */
export function starDirectionsEcl(catalog: StarCatalog): Float64Array {
  const out = new Float64Array(catalog.count * 3);
  for (let k = 0; k < catalog.count; k++) {
    const v = eqjToEcl(equatorialToVector(catalog.raDeg[k] ?? 0, catalog.decDeg[k] ?? 0));
    out[3 * k] = v.x;
    out[3 * k + 1] = v.y;
    out[3 * k + 2] = v.z;
  }
  return out;
}
