/**
 * Marcos de escala y origen flotante en la escena (D12, PLAN §4.4).
 *
 * Lo que se ve en pantalla es una expresión de marcos: un marco puro (`FrameSpec`) o una transición
 * entre dos expresiones, relativa al foco nuevo. Si una transición interrumpe a otra, la anterior
 * sigue avanzando dentro de la nueva: no hay saltos. Al terminar, la expresión se reduce al marco de
 * destino.
 *
 * Todo sale relativo al foco (origen flotante) y en float64; la escena lo pasa a float32 al final.
 * Los cuerpos y los puntos de las órbitas usan las mismas funciones de `ephemeris/scale.ts`.
 */
import type { ScaleMode } from './types';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  FrameSpec,
  IllustrativeScale,
  Placement,
  PlacementInput,
  blendPlacements,
  blendPosition,
  createPlacement,
  globalPhysicalKmPerUnit,
  localPhysicalKmPerUnit,
  placeBodies,
  placeHeliocentricPoint,
  placeMoonPoint,
} from '../ephemeris/scale';
import { Vec3, sub, vec3 } from '../ephemeris/vec3';

/** Duración de una transición de marco (PLAN §4.4: ~1,5 s). */
export const FRAME_TRANSITION_MS = 1500;

/** Curva suave de entrada y salida (cúbica). */
export const easeInOutCubic = (t: number): number =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

interface FrameLeaf {
  readonly kind: 'frame';
  readonly spec: FrameSpec;
  readonly placement: Placement;
}

interface FrameBlend {
  readonly kind: 'blend';
  readonly from: FrameNode;
  readonly to: FrameLeaf;
  /** Foco de la transición: sus posiciones salen relativas a él. */
  readonly focus: number;
  readonly startMs: number;
  readonly durationMs: number;
  /** Progreso con la curva aplicada, de 0 a 1 (se actualiza en cada frame). */
  eased: number;
  readonly placement: Placement;
}

type FrameNode = FrameLeaf | FrameBlend;

/** El marco que corresponde a una escala base y un foco. */
export function frameFor(
  mode: ScaleMode,
  focusSystemRadiusKm: number | null,
  globalReferenceAu: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): FrameSpec {
  if (focusSystemRadiusKm !== null) {
    // Un planeta o una de sus lunas: el sistema local físico de ese planeta.
    return { kind: 'physical', kmPerUnit: localPhysicalKmPerUnit(focusSystemRadiusKm, params) };
  }
  return mode === 'real'
    ? { kind: 'physical', kmPerUnit: globalPhysicalKmPerUnit(globalReferenceAu, params) }
    : { kind: 'illustrative', params };
}

const sameSpec = (a: FrameSpec, b: FrameSpec): boolean =>
  a.kind === 'illustrative'
    ? b.kind === 'illustrative' && a.params === b.params
    : b.kind === 'physical' && a.kmPerUnit === b.kmPerUnit;

export class FrameController {
  private root: FrameNode;
  private focusIndex: number;
  private input: PlacementInput | null = null;
  /** Posiciones relativas al foco y radios de todos los cuerpos tras `update()`. */
  readonly output: Placement;

  constructor(spec: FrameSpec, focusIndex: number, count: number) {
    this.root = { kind: 'frame', spec, placement: createPlacement(count) };
    this.focusIndex = focusIndex;
    this.output = createPlacement(count);
  }

  get focus(): number {
    return this.focusIndex;
  }

  /** El marco de destino (el que queda al acabar las transiciones). */
  get targetSpec(): FrameSpec {
    return this.root.kind === 'frame' ? this.root.spec : this.root.to.spec;
  }

  /** ¿Hay alguna transición en curso? */
  get animating(): boolean {
    return this.root.kind === 'blend';
  }

  /** Termina ya cualquier transición en curso: queda el marco de destino («Saltar»). */
  finish(): void {
    if (this.root.kind === 'blend') this.root = this.root.to;
  }

  /**
   * Cambia de marco y/o de foco. Con `durationMs = 0` (movimiento reducido o modo de captura) el
   * cambio es directo. `nowMs` puede estar en el futuro: la transición espera hasta entonces (los
   * vuelos de cámara empiezan a cambiar de marco un poco después de despegar).
   */
  transitionTo(spec: FrameSpec, focusIndex: number, nowMs: number, durationMs: number): void {
    const count = this.output.radius.length;
    const leaf: FrameLeaf = { kind: 'frame', spec, placement: createPlacement(count) };
    const specChanged = !sameSpec(spec, this.targetSpec);
    const focusChanged = focusIndex !== this.focusIndex;
    this.focusIndex = focusIndex;
    if (!specChanged && !focusChanged) return;
    if (durationMs <= 0) {
      this.root = leaf;
      return;
    }
    // Solo cambia el foco y no hay transición en curso: basta con medir desde el foco nuevo (la
    // cámara se reancla para que no se note).
    if (!specChanged && this.root.kind === 'frame') return;
    this.root = {
      kind: 'blend',
      from: this.root,
      to: leaf,
      focus: focusIndex,
      startMs: nowMs,
      durationMs,
      eased: 0,
      placement: createPlacement(count),
    };
  }

  /** Avanza las transiciones y coloca los cuerpos del estado actual. */
  update(input: PlacementInput, nowMs: number): void {
    this.input = input;
    this.root = this.prune(this.root, nowMs);
    this.evaluate(this.root, input, nowMs);
    if (this.root.kind === 'frame') {
      blendPlacements(this.root.placement, this.root.placement, this.focusIndex, 0, this.output);
    } else {
      this.output.position.set(this.root.placement.position);
      this.output.radius.set(this.root.placement.radius);
    }
  }

  /** Punto heliocéntrico (UA) colocado como un planeta, relativo al foco. */
  helioPoint(pointAu: Vec3): Vec3 {
    return this.relative(this.pointIn(this.root, { kind: 'helio', pointAu }));
  }

  /** Punto de la órbita de una luna (desplazamiento respecto a su planeta, UA), relativo al foco. */
  moonPoint(parentIndex: number, offsetAu: Vec3): Vec3 {
    return this.relative(this.pointIn(this.root, { kind: 'moon', parentIndex, offsetAu }));
  }

  private relative(p: Vec3): Vec3 {
    // Una transición ya sale relativa a su foco; un marco puro, en coordenadas absolutas.
    return this.root.kind === 'blend'
      ? p
      : sub(p, positionOf(this.root.placement, this.focusIndex));
  }

  private prune(node: FrameNode, nowMs: number): FrameNode {
    if (node.kind === 'frame') return node;
    if (nowMs - node.startMs >= node.durationMs) return node.to;
    return { ...node, from: this.prune(node.from, nowMs) };
  }

  private evaluate(node: FrameNode, input: PlacementInput, nowMs: number): void {
    if (node.kind === 'frame') {
      placeBodies(node.spec, input, node.placement);
      return;
    }
    this.evaluate(node.from, input, nowMs);
    this.evaluate(node.to, input, nowMs);
    node.eased = easeInOutCubic((nowMs - node.startMs) / node.durationMs);
    blendPlacements(node.from.placement, node.to.placement, node.focus, node.eased, node.placement);
  }

  private pointIn(node: FrameNode, point: PointSpec): Vec3 {
    if (node.kind === 'frame') return placePoint(node, point, this.requireInput());
    const a = sub(this.pointIn(node.from, point), positionOf(node.from.placement, node.focus));
    const b = sub(this.pointIn(node.to, point), positionOf(node.to.placement, node.focus));
    return blendPosition(a, b, node.eased);
  }

  private requireInput(): PlacementInput {
    if (!this.input) throw new Error('Llama a update() antes de colocar puntos.');
    return this.input;
  }
}

type PointSpec =
  | { readonly kind: 'helio'; readonly pointAu: Vec3 }
  | { readonly kind: 'moon'; readonly parentIndex: number; readonly offsetAu: Vec3 };

function placePoint(leaf: FrameLeaf, point: PointSpec, input: PlacementInput): Vec3 {
  if (point.kind === 'helio') return placeHeliocentricPoint(leaf.spec, point.pointAu);
  const parent = point.parentIndex;
  return placeMoonPoint(
    leaf.spec,
    {
      position: positionOf(leaf.placement, parent),
      radius: leaf.placement.radius[parent] as number,
      radiusKm: input.radiusKm[parent] as number,
    },
    point.offsetAu,
  );
}

function positionOf(placement: Placement, index: number): Vec3 {
  const p = placement.position;
  const k = 3 * index;
  if (index < 0 || k + 2 >= p.length) throw new RangeError('Índice de cuerpo fuera de rango.');
  return vec3(p[k] as number, p[k + 1] as number, p[k + 2] as number);
}
