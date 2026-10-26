/**
 * Etiquetas de los cuerpos (PLAN, fase 2, 2.c.16): una capa HTML encima del lienzo que gestiona la
 * escena, fuera de Angular. Se colocan con transformaciones CSS en cada frame pintado, se ocultan las
 * que se solapan (primero la seleccionada, después el Sol y los planetas) y son `aria-hidden`: la
 * lista accesible de cuerpos es HTML de la interfaz (fase 3). Un clic en una etiqueta elige el cuerpo.
 */
import type { ScreenBody } from './picking';
import type { ViewInsets } from './types';

export type LabelKind = 'star' | 'planet' | 'moon';

export interface LabelInfo {
  readonly id: string;
  readonly name: string;
  readonly kind: LabelKind;
  /** Índice del cuerpo padre (−1 si no tiene). */
  readonly parentIndex: number;
}

export interface LabelBox {
  readonly index: number;
  /** Centro del cuerpo en pantalla (px CSS): ahí va el marcador. */
  readonly anchorX: number;
  readonly anchorY: number;
  /** Esquina superior izquierda del nombre respecto al centro del cuerpo (px CSS). */
  readonly dx: number;
  readonly dy: number;
  /** Caja del nombre (px CSS): esquina superior izquierda y tamaño. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Marcador de visibilidad para los cuerpos que miden menos de unos píxeles. */
  readonly marker: boolean;
}

/** Por debajo de este radio aparente (px) se dibuja el marcador de visibilidad. */
export const MARKER_RADIUS_PX = 3;
/** Separación mínima en pantalla entre una luna y su planeta para mostrar su nombre (px). */
export const MOON_MIN_SEPARATION_PX = 14;
/** En los sistemas que no están enfocados, solo se nombran las lunas bien separadas (px). */
export const OTHER_MOON_MIN_SEPARATION_PX = 40;
const GAP_PX = 6;
const PADDING_PX = 2;
/** Radio mínimo de un cuerpo como obstáculo para los nombres (su marcador mide 8 px). */
const OBSTACLE_MIN_RADIUS_PX = 4;
/**
 * El halo del Sol (sun-material.ts: 3,2 radios y al menos 26 px de semilado) también tapa: se
 * reserva la parte brillante, unos dos tercios de su radio.
 */
const SUN_HALO_RADII = 3.2;
const SUN_HALO_MIN_PX = 26;
const SUN_HALO_VISIBLE = 0.65;

function priority(info: LabelInfo, index: number, selected: number, focusSystem: number): number {
  if (index === selected) return 1000;
  if (info.kind === 'star') return 900;
  // La Tierra es la referencia de quien mira: su nombre va antes que el de los demás planetas.
  if (info.id === 'tierra') return 850;
  if (info.kind === 'planet') return 800;
  // Las lunas del sistema enfocado van antes que las demás.
  return info.parentIndex === focusSystem ? 600 : 400;
}

export interface LabelLayoutOptions {
  /** Márgenes tapados por la interfaz: los nombres solo se colocan en la parte visible. */
  readonly insets?: ViewInsets;
  /** 1 para los cuerpos que no se dibujan (velocidades altas, §4.5): tampoco llevan nombre. */
  readonly hidden?: Uint8Array | null;
  /**
   * Radio que ocupa cada cuerpo en pantalla, en radios de su disco (1 si falta): los anillos de
   * Saturno. Su nombre va por fuera y los demás no se colocan encima (fase 3b, tarea 8).
   */
  readonly extents?: readonly number[];
}

interface Obstacle {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** ¿Toca la caja de un nombre el disco de un cuerpo (o el halo del Sol)? */
const hitsDisc = (box: LabelBox, disc: Obstacle): boolean => {
  const nx = Math.min(Math.max(disc.x, box.x), box.x + box.width);
  const ny = Math.min(Math.max(disc.y, box.y), box.y + box.height);
  return Math.hypot(disc.x - nx, disc.y - ny) < disc.r;
};

/**
 * Decide qué etiquetas se ven y dónde. Voraz por prioridad: cada nombre prueba cuatro posiciones
 * (derecha, izquierda, arriba y abajo del disco, o de sus anillos) y se descarta si en todas choca con otro nombre ya
 * colocado o con el disco de otro cuerpo visible (o el halo del Sol), si su cuerpo está tapado,
 * oculto o fuera de la parte visible, si es una luna pegada a su planeta en pantalla (los sistemas de
 * lunas lejanos se ven como un solo punto) o si es una luna de un planeta sin nombre visible. La
 * seleccionada se muestra siempre que esté en pantalla.
 */
export function layoutLabels(
  bodies: readonly ScreenBody[],
  infos: readonly LabelInfo[],
  sizes: readonly { readonly width: number; readonly height: number }[],
  viewport: { readonly width: number; readonly height: number },
  selected: number,
  focusSystem: number,
  options: LabelLayoutOptions = {},
): LabelBox[] {
  const insets = options.insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const hidden = options.hidden;
  const extent = (index: number) => options.extents?.[index] ?? 1;
  const minX = insets.left;
  const minY = insets.top;
  const maxX = viewport.width - insets.right;
  const maxY = viewport.height - insets.bottom;
  const byIndex = new Map(bodies.map((body) => [body.index, body]));
  const order = bodies
    .filter((body) => body.onScreen && !body.occluded && hidden?.[body.index] !== 1)
    .filter((body) => {
      const info = infos[body.index];
      if (!info || body.index === selected || info.kind !== 'moon') return true;
      const parent = byIndex.get(info.parentIndex);
      if (!parent) return true;
      const minimum =
        info.parentIndex === focusSystem ? MOON_MIN_SEPARATION_PX : OTHER_MOON_MIN_SEPARATION_PX;
      return Math.hypot(body.x - parent.x, body.y - parent.y) >= minimum;
    })
    .sort((a, b) => {
      const pa = priority(infos[a.index] as LabelInfo, a.index, selected, focusSystem);
      const pb = priority(infos[b.index] as LabelInfo, b.index, selected, focusSystem);
      return pb - pa || a.depth - b.depth;
    });
  // Los cuerpos que se ven (los de `order`) son obstáculos para los nombres de los demás.
  const obstacles: Obstacle[] = order.map((body) => {
    const disc = Math.max(body.radiusPx * extent(body.index), OBSTACLE_MIN_RADIUS_PX);
    const halo =
      infos[body.index]?.kind === 'star'
        ? Math.max(body.radiusPx * SUN_HALO_RADII, SUN_HALO_MIN_PX) * SUN_HALO_VISIBLE
        : 0;
    return { index: body.index, x: body.x, y: body.y, r: Math.max(disc, halo) };
  });
  const placed: LabelBox[] = [];
  const shown = new Set<number>();
  for (const body of order) {
    const info = infos[body.index];
    if (info?.kind === 'moon' && body.index !== selected && !shown.has(info.parentIndex)) continue;
    const size = sizes[body.index] ?? { width: 0, height: 0 };
    const gap = Math.min(Math.max(body.radiusPx * extent(body.index), 2), viewport.width) + GAP_PX;
    const { width: w, height: h } = size;
    const options: readonly (readonly [number, number])[] = [
      [gap, -h / 2], // derecha
      [-gap - w, -h / 2], // izquierda
      [-w / 2, -gap - h], // arriba
      [-w / 2, gap], // abajo
    ];
    const fit = (avoidDiscs: boolean): LabelBox | null => {
      for (const [dx, dy] of options) {
        const box: LabelBox = {
          index: body.index,
          anchorX: body.x,
          anchorY: body.y,
          dx,
          dy,
          x: body.x + dx,
          y: body.y + dy,
          width: w,
          height: h,
          marker: body.radiusPx < MARKER_RADIUS_PX,
        };
        const inside = box.x >= minX && box.x + w <= maxX && box.y >= minY && box.y + h <= maxY;
        if (!inside || placed.some((other) => overlaps(box, other))) continue;
        if (avoidDiscs && obstacles.some((d) => d.index !== body.index && hitsDisc(box, d))) {
          continue;
        }
        return box;
      }
      return null;
    };
    // El nombre del cuerpo elegido sale siempre, aunque tenga que tocar el disco de otro.
    const box = fit(true) ?? (body.index === selected ? fit(false) : null);
    if (!box) continue;
    placed.push(box);
    shown.add(body.index);
  }
  return placed;
}

const overlaps = (a: LabelBox, b: LabelBox): boolean =>
  a.x < b.x + b.width + PADDING_PX &&
  b.x < a.x + a.width + PADDING_PX &&
  a.y < b.y + b.height + PADDING_PX &&
  b.y < a.y + a.height + PADDING_PX;

/** La capa DOM de etiquetas. Solo escribe en el DOM lo que cambia. */
export class LabelLayer {
  private readonly root: HTMLDivElement;
  private readonly elements: HTMLDivElement[];
  private readonly sizes: { width: number; height: number }[];
  private readonly visible: boolean[];
  private readonly offsets: string[];
  private readonly onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-body]');
    const id = target?.dataset['body'];
    if (id) this.onPick(id);
  };

  constructor(
    host: HTMLElement,
    private readonly infos: readonly LabelInfo[],
    private readonly onPick: (id: string) => void,
  ) {
    const doc = host.ownerDocument;
    this.root = doc.createElement('div');
    this.root.className = 'scene-labels';
    this.root.setAttribute('aria-hidden', 'true');
    this.elements = infos.map((info) => {
      const el = doc.createElement('div');
      el.className = `scene-label scene-label--${info.kind}`;
      el.dataset['body'] = info.id;
      const marker = doc.createElement('span');
      marker.className = 'scene-label__marker';
      const name = doc.createElement('span');
      name.className = 'scene-label__name';
      name.textContent = info.name;
      el.append(marker, name);
      el.hidden = true;
      this.root.append(el);
      return el;
    });
    this.sizes = infos.map(() => ({ width: 0, height: 0 }));
    this.visible = infos.map(() => false);
    this.offsets = infos.map(() => '');
    this.root.addEventListener('click', this.onClick);
    host.append(this.root);
  }

  /**
   * Tamaños de las etiquetas (px CSS). Se miden una vez, al hacerse visibles por primera vez (el
   * texto no cambia); antes, una estimación por número de letras.
   */
  measure(): readonly { width: number; height: number }[] {
    this.elements.forEach((el, k) => {
      const size = this.sizes[k] as { width: number; height: number };
      if (size.width > 0) return;
      const wasHidden = el.hidden;
      el.hidden = false;
      const rect = (el.lastElementChild ?? el).getBoundingClientRect();
      el.hidden = wasHidden;
      const name = this.infos[k]?.name ?? '';
      size.width = rect.width || 7.5 * name.length + 14;
      size.height = rect.height || 18;
    });
    return this.sizes;
  }

  /** Muestra u oculta toda la capa (la vista limpia). */
  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  get visibleLayer(): boolean {
    return !this.root.hidden;
  }

  update(boxes: readonly LabelBox[], selected: number): void {
    const shown = new Map(boxes.map((box) => [box.index, box]));
    this.elements.forEach((el, k) => {
      const box = shown.get(k);
      if (!box) {
        if (this.visible[k]) el.hidden = true;
        this.visible[k] = false;
        return;
      }
      if (!this.visible[k]) el.hidden = false;
      this.visible[k] = true;
      el.style.transform = `translate3d(${box.anchorX.toFixed(1)}px, ${box.anchorY.toFixed(1)}px, 0)`;
      const offset = `translate(${box.dx.toFixed(1)}px, ${box.dy.toFixed(1)}px)`;
      if (this.offsets[k] !== offset) {
        this.offsets[k] = offset;
        (el.lastElementChild as HTMLElement | null)?.style.setProperty('transform', offset);
      }
      el.classList.toggle('scene-label--marker', box.marker);
      el.classList.toggle('scene-label--selected', k === selected);
    });
  }

  dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
  }
}
