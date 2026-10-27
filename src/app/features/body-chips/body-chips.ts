import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import type { BodyId } from '../../data/body.model';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ROOT_NODES, TreeNode, systemOf, treeNode } from '../body-picker/body-tree';
import { distanceText, ofBody } from '../explorer-ui/describe';
import { ExplorerSession } from '../explorer-ui/explorer-session';

/** Teclas que mueven el foco dentro de una fila (barra de herramientas de WAI-ARIA, horizontal). */
const ROW_KEYS: ReadonlySet<string> = new Set(['ArrowRight', 'ArrowLeft', 'Home', 'End']);

/**
 * Fichas de cuerpos (fase 3c, tarea 1): el selector principal del explorador, sobre la barra de
 * tiempo. Una fila con el Sol y los ocho planetas y, si el cuerpo elegido es un planeta con lunas (o
 * una de ellas), una segunda fila con sus lunas, que flota encima. Cada ficha lleva su miniatura,
 * renderizada por el propio motor (`scripts/build-body-thumbnails.mjs`).
 *
 * Accesibilidad: cada fila es una barra de herramientas (una sola parada del tabulador) con botones
 * `aria-pressed`; las flechas, Inicio y Fin solo mueven el foco (recorrer la fila no lanza un vuelo
 * de cámara en cada paso) e Intro, Espacio o un clic eligen. La distancia de cada cuerpo llega como
 * descripción y, al reproducir, no cambia mientras el foco sigue en la ficha (como en el índice).
 */
@Component({
  selector: 'tls-body-chips',
  templateUrl: './body-chips.html',
  styleUrl: './body-chips.css',
})
export class BodyChips {
  private readonly sim = inject(SimulationStore);
  private readonly session = inject(ExplorerSession);
  private readonly positions = inject(SystemPositions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly planets = ROOT_NODES;
  protected readonly selected = this.sim.selectedBodyId;
  /** El planeta cuyas lunas se muestran: el elegido o el de la luna elegida. */
  protected readonly system = computed(() => systemOf(this.selected()));
  protected readonly moons = computed<readonly TreeNode[]>(() => {
    const system = this.system();
    return system ? treeNode(system).children.map((id) => treeNode(id)) : [];
  });
  /** «Lunas de Saturno»; la de la Tierra es la Luna, su satélite. */
  protected readonly moonsLabel = computed(() => {
    const system = this.system();
    if (!system) return '';
    return system === 'tierra' ? 'Satélite de la Tierra' : `Lunas ${ofBody(system)}`;
  });

  /** La ficha de cada fila que recibe el foco con el tabulador (tabindex itinerante). */
  protected readonly planetStop = linkedSignal<BodyId>(() => {
    const selected = this.selected();
    return selected && treeNode(selected).parent === null ? selected : 'sol';
  });
  protected readonly moonStop = linkedSignal<BodyId | null>(() => {
    const moons = this.moons();
    const selected = this.selected();
    return moons.find((moon) => moon.id === selected)?.id ?? moons[0]?.id ?? null;
  });

  /** La ficha con el foco: al llegar a otra, su descripción se pone al día. */
  private readonly focused = signal<BodyId | null>(null);
  /**
   * La distancia de cada ficha para el lector de pantalla («A 9,54 UA del Sol»). Al reproducir no
   * cambia mientras el foco sigue en la ficha: se pone al día al llegar a otra o al pausar.
   */
  protected readonly descriptions = computed(() => {
    this.focused();
    const texts = () =>
      [...this.planets, ...this.moons()].map((node) => ({
        id: node.id,
        text: distanceText(node.id, this.positions.distances(node.id)),
      }));
    return this.sim.playing() ? untracked(texts) : texts();
  });

  constructor() {
    // El cuerpo elegido (aquí, en el índice o en el lienzo) se desplaza a la vista dentro de su fila
    // (DOM: sistema externo), cuando ya está pintado.
    const injector = inject(Injector);
    effect(() => {
      const id = this.selected();
      if (!id) return;
      afterNextRender(() => this.reveal(this.chip(id)), { injector });
    });
  }

  protected thumbnail(id: BodyId): string {
    return `img/cuerpos/${id}.webp`;
  }

  protected choose(id: BodyId): void {
    if (treeNode(id).parent === null) this.planetStop.set(id);
    else this.moonStop.set(id);
    this.session.select(id);
  }

  protected onFocus(id: BodyId): void {
    if (this.focused() !== id) this.focused.set(id);
  }

  /** Flechas, Inicio y Fin: el foco a otra ficha de la misma fila (dando la vuelta en los extremos). */
  protected onKeydown(event: KeyboardEvent): void {
    if (!ROW_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const row = event.currentTarget as HTMLElement;
    const chips = [...row.querySelectorAll<HTMLElement>('button[data-body]')];
    const current = chips.indexOf(event.target as HTMLElement);
    if (current < 0 || chips.length === 0) return;
    event.preventDefault();
    const last = chips.length - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowRight'
            ? (current + 1) % chips.length
            : (current + last) % chips.length;
    const target = chips[next];
    const id = target?.dataset['body'] as BodyId | undefined;
    if (!target || !id) return;
    if (treeNode(id).parent === null) this.planetStop.set(id);
    else this.moonStop.set(id);
    target.focus({ preventScroll: true });
    this.reveal(target);
  }

  private chip(id: BodyId): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`button[data-body="${id}"]`);
  }

  /**
   * Desplaza solo su fila (horizontal) hasta la ficha: con `scrollIntoView` se moverían también los
   * contenedores de fuera, y en las pantallas bajas, donde se desplaza la página, la página entera.
   */
  private reveal(chip: HTMLElement | null): void {
    const row = chip?.parentElement;
    if (!chip || !row) return;
    const box = row.getBoundingClientRect();
    const target = chip.getBoundingClientRect();
    const left = box.left + row.clientLeft;
    const right = left + row.clientWidth;
    let dx = 0;
    if (target.left < left) dx = target.left - left;
    else if (target.right > right) dx = target.right - right;
    if (dx !== 0) row.scrollBy?.({ left: dx });
  }
}
