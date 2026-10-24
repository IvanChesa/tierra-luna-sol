import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import { formatAu, formatNumber } from '../../core/format';
import type { BodyId } from '../../data/body.model';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import {
  ROOT_NODES,
  TreeKey,
  TreeNode,
  systemOf,
  treeKey,
  treeNode,
  visibleRows,
} from './body-tree';

const TREE_KEYS: readonly string[] = [
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
];
/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = ' ';

/**
 * Índice de cuerpos (PLAN 3.b.5): un árbol accesible (WAI-ARIA Tree View, una sola parada de
 * tabulación) con el Sol, los planetas y sus lunas. Se lee como una tabla de efemérides: cada cuerpo
 * lleva su distancia actual, al Sol los planetas y a su planeta las lunas, en cifras tabulares que
 * cambian al reproducir (como mucho 5 veces por segundo). En móvil es la tira horizontal de la hoja
 * inferior. Funciona sin WebGL: las distancias salen de `SystemPositions`, no del motor.
 */
@Component({
  selector: 'tls-body-picker',
  imports: [Icon],
  templateUrl: './body-picker.html',
  styleUrl: './body-picker.css',
})
export class BodyPicker {
  private readonly sim = inject(SimulationStore);
  private readonly session = inject(ExplorerSession);
  private readonly positions = inject(SystemPositions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly roots = ROOT_NODES;
  protected readonly selected = this.sim.selectedBodyId;
  /** Planetas abiertos: el del cuerpo elegido se abre solo; el usuario abre y cierra los demás. */
  protected readonly expanded = linkedSignal<BodyId | null, ReadonlySet<BodyId>>({
    source: () => systemOf(this.selected()),
    computation: (system, previous) => {
      const next = new Set(previous?.value ?? []);
      if (system) next.add(system);
      return next;
    },
  });
  /** La fila que recibe el foco con el tabulador (patrón de tabindex itinerante). */
  private readonly cursor = linkedSignal<BodyId>(() => this.selected() ?? 'sol');
  protected readonly tabStop = computed(() => {
    const cursor = this.cursor();
    const rows = visibleRows(this.expanded());
    return rows.includes(cursor) ? cursor : (treeNode(cursor).parent ?? 'sol');
  });
  /** Distancias de cada cuerpo, ya formateadas (ESTILO §3). */
  protected readonly values = computed(() => {
    // El Sol no tiene distancia en esta columna (es el origen de las de los planetas).
    const values = new Map<BodyId, string>([['sol', '—']]);
    for (const root of ROOT_NODES) {
      const toSun = this.positions.distances(root.id).toSunKm;
      if (root.kind === 'planet' && toSun !== null) values.set(root.id, formatAu(toSun));
      for (const child of root.children) {
        const km = this.positions.distances(child).toParentKm;
        if (km !== null) values.set(child, `${formatNumber(km, 0)}${NBSP}km`);
      }
    }
    return values;
  });

  constructor() {
    // En la tira horizontal del móvil, el cuerpo elegido se desplaza a la vista (DOM: sistema
    // externo), cuando ya está pintado.
    const injector = inject(Injector);
    effect(() => {
      const id = this.selected();
      if (!id) return;
      afterNextRender(
        () => {
          const row = this.host.nativeElement.querySelector<HTMLElement>(`#tree-${id} > .row`);
          row?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        },
        { injector },
      );
    });
  }

  protected children(node: TreeNode): readonly TreeNode[] {
    return node.children.map((id) => treeNode(id));
  }

  protected isExpanded(id: BodyId): boolean {
    return this.expanded().has(id);
  }

  protected choose(id: BodyId): void {
    this.cursor.set(id);
    this.session.select(id);
  }

  /** Un clic en una fila la elige; en el triángulo de un planeta, abre o cierra sus lunas. */
  protected onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[role="treeitem"]');
    const id = item?.dataset['body'] as BodyId | undefined;
    if (!id || !target.closest('.row')) return;
    if (target.closest('.row__toggle:not(.row__toggle--none)')) {
      this.cursor.set(id);
      this.setExpanded(id, !this.isExpanded(id));
      return;
    }
    this.choose(id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const current = item?.dataset['body'] as BodyId | undefined;
    if (!current) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(current);
      return;
    }
    if (!TREE_KEYS.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const move = treeKey(event.key as TreeKey, current, this.expanded());
    if (move.expand) this.setExpanded(move.expand, true);
    if (move.collapse) this.setExpanded(move.collapse, false);
    this.cursor.set(move.focus);
    this.host.nativeElement.querySelector<HTMLElement>(`#tree-${move.focus}`)?.focus();
  }

  private setExpanded(id: BodyId, open: boolean): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
