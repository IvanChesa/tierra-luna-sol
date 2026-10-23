/**
 * Muestreo de órbitas (planetas alrededor del Sol, lunas alrededor de su planeta) con caché.
 * La órbita se dibuja con las mismas funciones de posición que los cuerpos, así que pasa
 * exactamente por ellos; la transformación de escala la aplica después la escena, punto a punto.
 */
import { MAX_DATE, MIN_DATE } from './time';
import { Vec3 } from './vec3';

const MS_PER_DAY = 86_400_000;

/**
 * Muestrea una vuelta completa a partir de `start`: `segments` puntos equiespaciados en el tiempo
 * (sin repetir el primero; la escena cierra la línea). Devuelve x, y, z intercalados.
 */
export function sampleOrbit(
  position: (date: Date) => Vec3,
  start: Date,
  periodDays: number,
  segments: number,
): Float64Array {
  if (!(periodDays > 0) || !Number.isInteger(segments) || segments < 3) {
    throw new RangeError('Periodo o número de segmentos no válidos.');
  }
  const points = new Float64Array(segments * 3);
  const stepMs = (periodDays * MS_PER_DAY) / segments;
  for (let k = 0; k < segments; k++) {
    const p = position(new Date(start.getTime() + k * stepMs));
    points[3 * k] = p.x;
    points[3 * k + 1] = p.y;
    points[3 * k + 2] = p.z;
  }
  return points;
}

export interface OrbitRequest {
  /** Id del cuerpo (forma parte de la clave de la caché). */
  readonly id: string;
  readonly date: Date;
  readonly periodDays: number;
  readonly segments: number;
  /**
   * Durante cuántos días sirve una órbita ya muestreada. La forma de una órbita cambia con la
   * precesión (años), no con cada vuelta, así que se reaprovecha dentro de cada tramo.
   */
  readonly validityDays: number;
  readonly position: (date: Date) => Vec3;
}

/** Caché LRU de órbitas muestreadas, por cuerpo, tramo de validez y resolución. */
export class OrbitCache {
  private readonly entries = new Map<string, Float64Array>();

  constructor(private readonly maxEntries = 128) {}

  get size(): number {
    return this.entries.size;
  }

  get(request: OrbitRequest): Float64Array {
    if (!(request.validityDays > 0)) throw new RangeError('Validez no válida.');
    const bucket = Math.floor(request.date.getTime() / (request.validityDays * MS_PER_DAY));
    const key = `${request.id}|${bucket}|${request.segments}|${request.periodDays}`;
    const cached = this.entries.get(key);
    if (cached) {
      // Se reinserta para que cuente como la más reciente.
      this.entries.delete(key);
      this.entries.set(key, cached);
      return cached;
    }
    // La vuelta muestreada tiene que caber en el rango de fechas admitido (1900–2100).
    const periodMs = request.periodDays * MS_PER_DAY;
    const startMs = Math.min(
      Math.max(bucket * request.validityDays * MS_PER_DAY, MIN_DATE.getTime()),
      MAX_DATE.getTime() - periodMs,
    );
    const start = new Date(startMs);
    const points = sampleOrbit(request.position, start, request.periodDays, request.segments);
    this.entries.set(key, points);
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    return points;
  }

  clear(): void {
    this.entries.clear();
  }
}
