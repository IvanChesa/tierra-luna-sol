/**
 * Estado del sistema solar en un instante (PLAN, fase 2, 2.a): las posiciones de los 30 cuerpos
 * en una sola llamada, heliocéntricas, en ECL, en UA y en float64, con caché por instante.
 *
 * `ephemeris/` no puede importar `data/` (PLAN §4.2), así que la lista de cuerpos y los elementos
 * medios de las lunas llegan como parámetro: los pasa la escena desde el catálogo.
 */
import { moonGeocentric, planetHeliocentric } from './ephemeris';
import { GALILEAN_IDS, GalileanId, PlanetId, isPlanetId } from './ids';
import { MeanElements, galileanMoons, meanElementsPosition } from './moons';
import { Vec3, vec3 } from './vec3';

/** De dónde sale la posición de cada cuerpo. */
export type BodySource =
  | { readonly kind: 'sun' }
  | { readonly kind: 'planet' }
  | { readonly kind: 'earth-moon' }
  | { readonly kind: 'galilean' }
  | { readonly kind: 'mean-elements'; readonly parent: PlanetId; readonly elements: MeanElements };

export interface SystemBodySpec {
  /** Id del cuerpo. En los planetas es su `PlanetId`; en las galileanas, su `GalileanId`. */
  readonly id: string;
  readonly source: BodySource;
}

/** Orden fijo de los cuerpos y su jerarquía (índice del padre; −1 en el Sol). */
export interface SystemLayout {
  readonly ids: readonly string[];
  readonly parentIndex: Int16Array;
  readonly count: number;
  indexOf(id: string): number;
}

/** Posiciones de todos los cuerpos en un instante. Los arrays van en el orden de `layout`. */
export class SystemState {
  constructor(
    readonly timeMs: number,
    readonly layout: SystemLayout,
    /** x, y, z heliocéntricos de cada cuerpo (UA, ECL). */
    readonly heliocentric: Float64Array,
    /** x, y, z respecto a su padre (UA, ECL): las lunas, respecto a su planeta. */
    readonly parentOffset: Float64Array,
  ) {}

  get date(): Date {
    return new Date(this.timeMs);
  }

  heliocentricOf(id: string): Vec3 {
    return readVec(this.heliocentric, this.layout.indexOf(id));
  }

  parentOffsetOf(id: string): Vec3 {
    return readVec(this.parentOffset, this.layout.indexOf(id));
  }
}

function readVec(array: Float64Array, index: number): Vec3 {
  const i = 3 * index;
  if (index < 0 || i + 2 >= array.length) throw new RangeError('Cuerpo desconocido.');
  return vec3(array[i] as number, array[i + 1] as number, array[i + 2] as number);
}

function writeVec(array: Float64Array, index: number, v: Vec3): void {
  array[3 * index] = v.x;
  array[3 * index + 1] = v.y;
  array[3 * index + 2] = v.z;
}

const GALILEAN = new Set<string>(GALILEAN_IDS);

function parentId(spec: SystemBodySpec): string | null {
  switch (spec.source.kind) {
    case 'sun':
      return null;
    case 'planet':
      return 'sol';
    case 'earth-moon':
      return 'tierra';
    case 'galilean':
      return 'jupiter';
    case 'mean-elements':
      return spec.source.parent;
  }
}

function buildLayout(specs: readonly SystemBodySpec[]): SystemLayout {
  const ids = specs.map((s) => s.id);
  const index = new Map(ids.map((id, k) => [id, k]));
  if (index.size !== ids.length) throw new Error('Hay ids repetidos en el sistema.');
  const parentIndex = new Int16Array(specs.length);
  specs.forEach((spec, k) => {
    if (spec.source.kind === 'galilean' && !GALILEAN.has(spec.id)) {
      throw new Error(`«${spec.id}» no es una luna galileana.`);
    }
    if (spec.source.kind === 'planet' && !isPlanetId(spec.id)) {
      throw new Error(`«${spec.id}» no es un planeta.`);
    }
    const parent = parentId(spec);
    const p = parent === null ? -1 : (index.get(parent) ?? -2);
    if (p === -2) throw new Error(`Falta el cuerpo padre «${parent}» de «${spec.id}».`);
    if (p > k) throw new Error(`El padre de «${spec.id}» tiene que ir antes que él.`);
    parentIndex[k] = p;
  });
  return { ids, parentIndex, count: ids.length, indexOf: (id) => index.get(id) ?? -1 };
}

/**
 * Calcula el estado del sistema con caché LRU por instante (milisegundos UTC). Varias partes del
 * motor piden el mismo instante en un frame (cuerpos, órbitas, etiquetas): solo se calcula una vez.
 */
export class SolarSystemModel {
  readonly layout: SystemLayout;
  private readonly cache = new Map<number, SystemState>();

  constructor(
    private readonly specs: readonly SystemBodySpec[],
    private readonly cacheSize = 8,
  ) {
    this.layout = buildLayout(specs);
  }

  at(date: Date | number): SystemState {
    const timeMs = typeof date === 'number' ? date : date.getTime();
    const cached = this.cache.get(timeMs);
    if (cached) {
      this.cache.delete(timeMs);
      this.cache.set(timeMs, cached);
      return cached;
    }
    const state = this.compute(timeMs);
    this.cache.set(timeMs, state);
    if (this.cache.size > this.cacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return state;
  }

  private compute(timeMs: number): SystemState {
    const date = new Date(timeMs);
    const n = this.layout.count;
    const helio = new Float64Array(3 * n);
    const offset = new Float64Array(3 * n);
    let galileans: Record<GalileanId, Vec3> | null = null;
    // Los padres van antes que sus lunas (lo garantiza buildLayout), así que se calcula en orden.
    this.specs.forEach((spec, k) => {
      const parent = this.layout.parentIndex[k] as number;
      let local: Vec3;
      switch (spec.source.kind) {
        case 'sun':
          local = vec3(0, 0, 0);
          break;
        case 'planet':
          local = planetHeliocentric(spec.id as PlanetId, date);
          break;
        case 'earth-moon':
          local = moonGeocentric(date);
          break;
        case 'galilean':
          galileans ??= galileanMoons(date);
          local = galileans[spec.id as GalileanId];
          break;
        case 'mean-elements':
          local = meanElementsPosition(spec.source.elements, date);
          break;
      }
      writeVec(offset, k, local);
      const base = parent < 0 ? vec3(0, 0, 0) : readVec(helio, parent);
      writeVec(helio, k, vec3(base.x + local.x, base.y + local.y, base.z + local.z));
    });
    return new SystemState(timeMs, this.layout, helio, offset);
  }
}
