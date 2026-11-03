/**
 * Las etiquetas de la vista del cielo (fase 8): los puntos cardinales en el horizonte, el nombre del
 * Sol, la Luna y los planetas que están sobre él y, con las constelaciones a la vista, sus nombres.
 * Una capa HTML encima del lienzo, como las etiquetas del espacio (`labels.ts`), dentro de la misma capa
 * del motor; `aria-hidden`: la tabla del panel del cielo es su equivalente accesible. Un clic en el
 * nombre de un cuerpo lo elige.
 */
import type { SkyBodyId } from '../../ephemeris/sky';

export interface SkyLabelSpec {
  readonly key: string;
  readonly text: string;
  readonly kind: 'cardinal' | 'cardinal-minor' | 'body' | 'constellation';
  /**
   * Un nombre secundario, debajo y más pequeño: el oficial de la IAU, en latín, de las constelaciones
   * (D38). Va con `lang="la"`.
   */
  readonly secondary?: string;
  /** El cuerpo que elige un clic en la etiqueta. */
  readonly body?: SkyBodyId;
}

export interface SkyLabelPlacement {
  /** Posición en px CSS desde la esquina del lienzo, o `null` si no se ve. */
  readonly x: number;
  readonly y: number;
}

export class SkyLabels {
  private readonly root: HTMLDivElement;
  private readonly elements = new Map<string, HTMLDivElement>();
  private readonly shown = new Map<string, string>();
  private readonly onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-body]');
    const id = target?.dataset['body'];
    if (id) this.onPick(id as SkyBodyId);
  };

  constructor(
    host: HTMLElement,
    private readonly onPick: (id: SkyBodyId) => void,
  ) {
    const doc = host.ownerDocument;
    this.root = doc.createElement('div');
    this.root.className = 'sky-labels';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.hidden = true;
    this.root.addEventListener('click', this.onClick);
    host.append(this.root);
  }

  /** Crea las etiquetas que falten (las de las constelaciones llegan con sus datos). */
  define(specs: readonly SkyLabelSpec[]): void {
    const doc = this.root.ownerDocument;
    for (const spec of specs) {
      if (this.elements.has(spec.key)) continue;
      const el = doc.createElement('div');
      el.className = `sky-label sky-label--${spec.kind}`;
      if (spec.body) el.dataset['body'] = spec.body;
      el.textContent = spec.text;
      if (spec.secondary) {
        const secondary = doc.createElement('span');
        secondary.className = 'sky-label__secondary';
        secondary.lang = 'la';
        secondary.textContent = spec.secondary;
        el.append(secondary);
      }
      el.hidden = true;
      this.root.append(el);
      this.elements.set(spec.key, el);
    }
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  /** Coloca las etiquetas de `placements`; las demás se ocultan. Solo toca el DOM si algo cambia. */
  update(placements: ReadonlyMap<string, SkyLabelPlacement>): void {
    for (const [key, el] of this.elements) {
      const place = placements.get(key);
      const transform = place
        ? `translate(${place.x.toFixed(1)}px, ${place.y.toFixed(1)}px) translate(-50%, -50%)`
        : '';
      if (this.shown.get(key) === transform) continue;
      this.shown.set(key, transform);
      if (!place) {
        el.hidden = true;
        continue;
      }
      el.hidden = false;
      el.style.transform = transform;
    }
  }

  dispose(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
    this.elements.clear();
  }
}
