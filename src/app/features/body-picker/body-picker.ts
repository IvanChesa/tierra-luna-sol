import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { BodyId } from '../../data/body.model';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { distanceText, distanceValue } from '../explorer-ui/describe';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { Icon } from '../viewer/icon';
import {
  BODY_TREE,
  ROOT_NODES,
  TreeKey,
  TreeNode,
  rowByInitial,
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

/**
 * Índice de cuerpos (PLAN 3.b.5): un árbol accesible (WAI-ARIA Tree View, una sola parada de
 * tabulación) con el Sol, los planetas y sus lunas. Se lee como una tabla de efemérides: cada cuerpo
 * lleva su distancia actual, al Sol los planetas y a su planeta las lunas, en cifras tabulares que
 * cambian al reproducir (como mucho 5 veces por segundo). Vive en el panel «Índice» (fase 3c), que
 * en móvil es una hoja inferior. Funciona sin WebGL: las distancias salen de `SystemPositions`, no
 * del motor.
 */
@Component({
  selector: 'tls-body-picker',
  imports: [Icon],
  templateUrl: './body-picker.html',
  styleUrl: './body-picker.css',
})
export class BodyPicker {
  /** Se ha elegido un cuerpo (Intro, Espacio o clic en una fila). */
  readonly chosen = output<BodyId>();

  private readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly session = inject(ExplorerSession);
  private readonly positions = inject(SystemPositions);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

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
  /** Distancias de cada cuerpo, ya formateadas (ESTILO §3). El Sol, el origen, lleva una raya. */
  protected readonly values = computed(
    () =>
      new Map<BodyId, string>(
        BODY_TREE.map((node) => [
          node.id,
          distanceValue(node.id, this.positions.distances(node.id)) ?? '—',
        ]),
      ),
  );
  /** La fila con el foco: al llegar a otra, su descripción se pone al día. */
  private readonly focusedRow = signal<BodyId | null>(null);
  /**
   * La distancia de cada fila para el lector de pantalla, como descripción («A 9,54 UA del Sol»):
   * la columna se ve, pero queda fuera del nombre accesible (informe, §4.3). Al reproducir no
   * cambia mientras el foco sigue en la fila, para que el lector no la repita: se pone al día al
   * llegar a otra fila o al pausar.
   */
  protected readonly descriptions = computed(() => {
    this.focusedRow();
    const texts = () =>
      BODY_TREE.map((node) => ({
        id: node.id,
        text: distanceText(node.id, this.positions.distances(node.id)),
      }));
    return this.sim.playing() ? untracked(texts) : texts();
  });

  constructor() {
    // El cuerpo elegido se desplaza a la vista dentro de la lista (DOM: sistema externo), cuando ya
    // está pintado.
    const injector = inject(Injector);
    effect(() => {
      const id = this.selected();
      if (!id) return;
      afterNextRender(() => this.revealRow(id), { injector });
    });
  }

  /**
   * Desplaza solo la lista hasta la fila: con `scrollIntoView` se moverían también los contenedores
   * de fuera, y en las pantallas bajas, donde se desplaza la página, la página entera.
   */
  private revealRow(id: BodyId): void {
    const tree = this.host.nativeElement.querySelector<HTMLElement>('.tree');
    const row = tree?.querySelector<HTMLElement>(`#tree-${id} > .row`);
    if (!tree || !row) return;
    const target = row.getBoundingClientRect();
    // La parte visible de la lista, sin su borde ni el margen de desplazamiento de abajo (el del
    // fundido).
    const style = tree.ownerDocument.defaultView?.getComputedStyle(tree);
    const padEnd = Number.parseFloat(style?.scrollPaddingBlockEnd ?? '') || 0;
    const top = tree.getBoundingClientRect().top + tree.clientTop;
    const bottom = top + tree.clientHeight - padEnd;
    let dy = 0;
    if (target.top < top) dy = target.top - top;
    else if (target.bottom > bottom) dy = target.bottom - bottom;
    if (dy !== 0) tree.scrollBy?.({ top: dy });
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
    this.chosen.emit(id);
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

  /** El foco llega a una fila: su descripción, ya al día antes de que el lector la lea. */
  protected onFocus(event: FocusEvent): void {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    const id = item?.dataset['body'] as BodyId | undefined;
    if (!id || id === this.focusedRow()) return;
    this.focusedRow.set(id);
    this.cdr.detectChanges();
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
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Con los atajos de una sola tecla desactivados, una letra lleva a la fila que empieza por ella.
    if (!this.explorer.singleKeyShortcuts() && /^\p{L}$/u.test(event.key)) {
      event.preventDefault();
      const next = rowByInitial(event.key, current, this.expanded());
      if (next) this.moveTo(next);
      return;
    }
    if (!TREE_KEYS.includes(event.key)) return;
    event.preventDefault();
    const move = treeKey(event.key as TreeKey, current, this.expanded());
    if (move.expand) this.setExpanded(move.expand, true);
    if (move.collapse) this.setExpanded(move.collapse, false);
    this.moveTo(move.focus);
  }

  private moveTo(id: BodyId): void {
    this.cursor.set(id);
    this.host.nativeElement.querySelector<HTMLElement>(`#tree-${id}`)?.focus();
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
