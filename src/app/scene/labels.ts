/**
 * Etiquetas de los cuerpos (PLAN, fase 2, 2.c.16): una capa HTML encima del lienzo que gestiona la
 * escena, fuera de Angular. Se colocan con transformaciones CSS en cada frame pintado, se ocultan las
 * que se solapan (primero la seleccionada, después el Sol y los planetas) y son `aria-hidden`: la
 * lista accesible de cuerpos es HTML de la interfaz (fase 3). Un clic en una etiqueta elige el cuerpo.
 */
import type { ScreenBody } from './picking';

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
  /** Separación horizontal del nombre respecto al centro del cuerpo (px CSS). */
  readonly offset: number;
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
const GAP_PX = 6;
const PADDING_PX = 2;

function priority(info: LabelInfo, index: number, selected: number, focusSystem: number): number {
  if (index === selected) return 1000;
  if (info.kind === 'star') return 900;
  if (info.kind === 'planet') return 800;
  // Las lunas del sistema enfocado van antes que las demás.
  return info.parentIndex === focusSystem ? 600 : 400;
}

/**
 * Decide qué etiquetas se ven y dónde. Voraz por prioridad: una etiqueta se descarta si choca con
 * otra ya colocada, si su cuerpo está tapado o fuera de la pantalla, o si es una luna pegada a su
 * planeta en pantalla (los sistemas de lunas lejanos se ven como un solo punto).
 */
export function layoutLabels(
  bodies: readonly ScreenBody[],
  infos: readonly LabelInfo[],
  sizes: readonly { readonly width: number; readonly height: number }[],
  viewport: { readonly width: number; readonly height: number },
  selected: number,
  focusSystem: number,
): LabelBox[] {
  const order = bodies
    .filter((body) => body.onScreen && !body.occluded)
    .filter((body) => {
      const info = infos[body.index];
      if (!info || body.index === selected || info.kind !== 'moon') return true;
      const parent = bodies[info.parentIndex];
      if (!parent) return true;
      return Math.hypot(body.x - parent.x, body.y - parent.y) >= MOON_MIN_SEPARATION_PX;
    })
    .sort((a, b) => {
      const pa = priority(infos[a.index] as LabelInfo, a.index, selected, focusSystem);
      const pb = priority(infos[b.index] as LabelInfo, b.index, selected, focusSystem);
      return pb - pa || a.depth - b.depth;
    });
  const placed: LabelBox[] = [];
  for (const body of order) {
    const size = sizes[body.index] ?? { width: 0, height: 0 };
    const offset = Math.min(Math.max(body.radiusPx, 2), viewport.width) + GAP_PX;
    const box: LabelBox = {
      index: body.index,
      anchorX: body.x,
      anchorY: body.y,
      offset,
      x: body.x + offset,
      y: body.y - size.height / 2,
      width: size.width,
      height: size.height,
      marker: body.radiusPx < MARKER_RADIUS_PX,
    };
    const inside =
      box.x < viewport.width &&
      box.x + box.width > 0 &&
      box.y < viewport.height &&
      box.y + box.height > 0;
    if (!inside || placed.some((other) => overlaps(box, other))) continue;
    placed.push(box);
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
      el.style.setProperty('--label-offset', `${box.offset.toFixed(1)}px`);
      el.classList.toggle('scene-label--marker', box.marker);
      el.classList.toggle('scene-label--selected', k === selected);
    });
  }

  dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
  }
}
