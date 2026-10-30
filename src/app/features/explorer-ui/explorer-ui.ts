import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { ExplorerView, ViewInsets } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { BodyChips } from '../body-chips/body-chips';
import { systemOf } from '../body-picker/body-tree';
import { BodyPanel } from '../body-panel/body-panel';
import { CameraControls, ZOOM_STEP } from '../camera-controls/camera-controls';
import { EarthPanel } from '../earth-panel/earth-panel';
import { ShortcutCommand, globalCommand, isTextField, repeats } from '../shortcuts/shortcuts';
import { ShortcutsDialog } from '../shortcuts/shortcuts-dialog';
import { closePopover, isPopoverOpen } from '../time-controls/popover';
import { TimeControls } from '../time-controls/time-controls';
import { VIEW_LINKS } from '../view-switcher/view-switcher';
import { insetsFromRects, parseChromeEdge } from '../viewer/insets';
import { Icon } from '../viewer/icon';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { ExplorerSession } from './explorer-session';
import { IndexPanel } from './index-panel';
import { Notices } from './notices';

/** Deslizar la ficha hacia abajo más que esto la cierra (móvil). */
const SWIPE_CLOSE_PX = 72;

/** Por debajo de este ancho, el índice y la ficha son hojas inferiores (viewer-layout.css). */
const SHEETS_MEDIA = '(max-width: 63.99rem)';

/** Lo que la interfaz no recuerda como «el último foco»: lo que aparece y desaparece. */
const TRANSIENT = '.panel, .restore, .skip';

/** Teclas que no cuentan como empezar a usar el explorador: moverse con el tabulador no lo es. */
const PASSIVE_KEYS: ReadonlySet<string> = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta']);

/** Lo que decide adónde va el foco: la vista limpia, el cuerpo de la ficha abierta y el índice. */
interface FocusState {
  readonly clean: boolean;
  readonly panel: string | null;
  readonly index: boolean;
}

/** ¿Se ve el elemento? Sin `checkVisibility` (jsdom, navegadores antiguos), se supone que sí. */
function isShown(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })
    : true;
}

/**
 * La posición de un elemento dentro de `root`, con su caja de maquetación (sin las transformaciones
 * de las animaciones): se suman los desplazamientos de sus contenedores posicionados hasta `root`.
 */
function offsetWithin(element: HTMLElement, root: HTMLElement): { left: number; top: number } {
  let left = 0;
  let top = 0;
  for (
    let node: HTMLElement | null = element;
    node && node !== root;
    node = node.offsetParent as HTMLElement | null
  ) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  return { left, top };
}

/**
 * La parte interactiva del explorador, diferida (`@defer` en el layout): el lienzo 3D y toda la
 * interfaz (índice, ficha, barra de tiempo, cámara, avisos, atajos y la región `aria-live`). Provee
 * los stores y la sesión, que viven lo que vive el explorador y nunca van en el bundle inicial.
 *
 * Su anfitrión no tiene caja (`display: contents`): cada pieza se coloca en un área de la rejilla
 * del layout. Mide los paneles (`[data-chrome]`) para que el motor encuadre en la parte visible.
 */
@Component({
  selector: 'tls-explorer-ui',
  imports: [
    ViewerCanvas,
    IndexPanel,
    BodyChips,
    BodyPanel,
    TimeControls,
    CameraControls,
    EarthPanel,
    Notices,
    ShortcutsDialog,
    Icon,
  ],
  providers: [SimulationStore, ExplorerStore, SystemPositions, ExplorerSession],
  templateUrl: './explorer-ui.html',
  styleUrl: './explorer-ui.css',
  host: {
    '[class.is-clean]': 'explorer.cleanView()',
    '[class.is-scene-ready]': 'ready3d()',
    '[class.has-panel]': 'panelBody() !== null',
    '[class.has-index]': 'explorer.indexOpen()',
    '[class.has-moons]': 'hasMoons()',
    '[class.is-interacted]': 'interacted()',
    '(document:keydown)': 'onKeydown($event)',
    '(pointerdown)': 'acted.set(true)',
    '(focusin)': 'rememberFocus($event)',
  },
})
export class ExplorerUi {
  readonly view = input.required<ExplorerView>();
  /** El 3D ya está pintado (el layout quita el póster). */
  readonly ready = output<void>();

  protected readonly sim = inject(SimulationStore);
  protected readonly explorer = inject(ExplorerStore);
  protected readonly session = inject(ExplorerSession);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /** Cuerpo de la ficha resumida, si está abierta. */
  protected readonly panelBody = computed(() =>
    this.explorer.panelOpen() ? this.sim.selectedBodyId() : null,
  );
  protected readonly panelBodies = computed(() => {
    const id = this.panelBody();
    return id ? [id] : [];
  });
  /** Se ve la fila de lunas de las fichas (el cuerpo elegido es un planeta con lunas o una luna). */
  protected readonly hasMoons = computed(() => systemOf(this.sim.selectedBodyId()) !== null);
  /** El 3D se ve: los controles de cámara aparecen (antes, y si falla, no harían nada). */
  protected readonly ready3d = signal(false);
  /**
   * Ya se ha usado el explorador (un clic, un toque o una tecla dentro de él). Al cambiar de vista
   * vuelve a `false`: se ve el texto de la vista nueva hasta la siguiente interacción.
   */
  protected readonly acted = linkedSignal({ source: this.view, computation: () => false });
  /**
   * El texto de presentación se pliega al empezar a usar el explorador o al elegir un cuerpo (fase
   * 3c, tarea 5); el layout lo pliega por CSS con la clase del anfitrión.
   */
  protected readonly interacted = computed(() => this.acted() || this.panelBody() !== null);
  private swipeStart: number | null = null;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly indexToggle = viewChild.required<ElementRef<HTMLElement>>('indexToggle');
  /** El anfitrión del panel «Índice» (es el panel). */
  private readonly indexPanel = viewChild.required<IndexPanel, ElementRef<HTMLElement>>(
    IndexPanel,
    {
      read: ElementRef,
    },
  );
  private readonly restoreButton = viewChild<ElementRef<HTMLElement>>('restore');
  /** El último elemento con el foco que no es de quita y pon (la ficha, «Mostrar la interfaz»). */
  private lastFocus: HTMLElement | null = null;

  constructor() {
    this.explorer.connectView(this.view);
    afterNextRender(() => this.trackInsets());

    // Gestión del foco (WCAG 2.4.3): si la interfaz oculta o quita el elemento que tiene el foco
    // (la vista limpia, la ficha o el índice que se cierran o, en móvil, la hoja que tapa la franja
    // de abajo y la cámara), el foco pasa a donde se puede seguir. El DOM es un sistema externo: se
    // mira cuando ya está pintado.
    let previous: FocusState = { clean: false, panel: null, index: false };
    effect(() => {
      const next: FocusState = {
        clean: this.explorer.cleanView(),
        panel: this.panelBody(),
        index: this.explorer.indexOpen(),
      };
      const before = previous;
      previous = next;
      untracked(() =>
        afterNextRender(() => this.keepFocus(before, next), { injector: this.injector }),
      );
    });
  }

  protected rememberFocus(event: FocusEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && !target.closest(TRANSIENT)) this.lastFocus = target;
  }

  protected sceneReady(): void {
    this.ready3d.set(true);
    this.ready.emit();
  }

  protected closePanel(): void {
    this.session.closePanel();
  }

  // --- Índice (fase 3c, tarea 4b) ----------------------------------------------------------------

  /** El botón «Índice» (y la tecla I): al abrirlo, el foco entra en el árbol. */
  protected toggleIndex(): void {
    if (this.explorer.indexOpen()) {
      this.explorer.indexOpen.set(false);
      return;
    }
    this.explorer.indexOpen.set(true);
    afterNextRender(() => this.focusTree(), { injector: this.injector });
  }

  /** Cierra el índice (su botón de cerrar o `Esc`): el foco vuelve al botón «Índice». */
  protected closeIndex(): void {
    this.explorer.indexOpen.set(false);
  }

  /**
   * Se ha elegido un cuerpo en el índice. En móvil el índice es una hoja que lo tapa casi todo: se
   * cierra y sube la ficha del cuerpo (el foco va a ella).
   */
  protected chosenInIndex(): void {
    const win = this.host.nativeElement.ownerDocument.defaultView;
    if (win?.matchMedia?.(SHEETS_MEDIA).matches) this.explorer.indexOpen.set(false);
  }

  private focusTree(): void {
    const panel = this.indexPanel().nativeElement;
    const row = panel.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]');
    (isShown(row) ? row : panel).focus();
  }

  // --- Teclado ----------------------------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    const doc = this.host.nativeElement.ownerDocument;
    if (!PASSIVE_KEYS.has(event.key) && (target === doc.body || this.insideExplorer(target))) {
      this.acted.set(true);
    }
    if (event.defaultPrevented || this.explorer.helpOpen()) return;
    // Los atajos no actúan mientras se escribe (PLAN 3.d.10).
    if (isTextField(target)) return;
    const command = globalCommand(event, this.explorer.singleKeyShortcuts());
    if (!command || (event.repeat && !repeats(command))) return;
    // Un atajo con «Controles +» abierto lo cierra antes (si no, lo que abre quedaría debajo).
    if (command !== 'escape') closePopover(this.timeMenu());
    if (this.run(command)) event.preventDefault();
  }

  /** El panel de «Controles +» (dentro de la barra de tiempo). */
  private timeMenu(): Element | null {
    return this.host.nativeElement.querySelector('#time-menu');
  }

  private insideExplorer(target: Element | null): boolean {
    const explorer = this.host.nativeElement.parentElement;
    return target !== null && explorer !== null && explorer.contains(target);
  }

  /** Ejecuta un atajo. Devuelve `false` si no había nada que hacer (`Esc` sin nada abierto). */
  private run(command: ShortcutCommand): boolean {
    switch (command) {
      case 'help':
        this.explorer.helpOpen.set(true);
        return true;
      case 'toggle-play':
        this.sim.togglePlaying();
        return true;
      case 'slower':
        this.sim.shiftSpeed(-1);
        return true;
      case 'faster':
        this.sim.shiftSpeed(1);
        return true;
      case 'reverse':
        this.sim.toggleReverse();
        return true;
      case 'now':
        this.sim.now();
        return true;
      case 'overview':
        this.session.overview();
        return true;
      case 'zoom-in':
        this.session.zoom(1 / ZOOM_STEP);
        return true;
      case 'zoom-out':
        this.session.zoom(ZOOM_STEP);
        return true;
      case 'view-system':
      case 'view-earth':
      case 'view-moon':
        this.goTo(
          command === 'view-system' ? 'system' : command === 'view-earth' ? 'earth' : 'moon',
        );
        return true;
      case 'clean-view':
        this.session.setCleanView(!this.explorer.cleanView());
        return true;
      case 'index':
        if (this.explorer.cleanView()) this.session.setCleanView(false);
        this.toggleIndex();
        return true;
      case 'escape':
        return this.escape();
    }
  }

  /**
   * `Esc`: saltar el viaje, salir de la vista limpia o cerrar lo abierto (el índice si tiene el
   * foco; si no, la ficha y después el índice), en ese orden. «Controles +», antes que nada.
   */
  private escape(): boolean {
    // «Controles +» es un `popover`: lo cierra el propio navegador (y devuelve el foco a su botón).
    if (isPopoverOpen(this.timeMenu())) return false;
    if (this.explorer.travelling() === 'view') {
      this.session.skipTravel();
      return true;
    }
    if (this.explorer.cleanView()) {
      this.session.setCleanView(false);
      return true;
    }
    const active = this.host.nativeElement.ownerDocument.activeElement;
    if (this.explorer.indexOpen() && this.indexPanel().nativeElement.contains(active)) {
      this.closeIndex();
      return true;
    }
    if (this.explorer.panelOpen()) {
      this.session.closePanel();
      return true;
    }
    if (this.explorer.indexOpen()) {
      this.closeIndex();
      return true;
    }
    if (this.explorer.travelling()) {
      this.session.skipTravel();
      return true;
    }
    return false;
  }

  private goTo(view: ExplorerView): void {
    const link = VIEW_LINKS.find((candidate) => candidate.view === view);
    if (link && view !== this.view()) {
      void this.router.navigate([link.path], { queryParamsHandling: 'preserve' });
    }
  }

  // --- Ficha en móvil: deslizar hacia abajo para cerrarla -------------------------------------

  protected swipeDown(event: PointerEvent): void {
    this.swipeStart = event.clientY;
  }

  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeStart !== null && event.clientY - this.swipeStart > SWIPE_CLOSE_PX) {
      this.session.closePanel();
    }
    this.swipeStart = null;
  }

  // --- Foco -----------------------------------------------------------------------------------------

  /**
   * Tras un cambio de la vista limpia, de la ficha o del índice, si el foco se ha perdido (en
   * `<body>` o en algo que ya no se ve): al entrar en la vista limpia, a «Mostrar la interfaz»; al
   * abrir la ficha (en móvil tapa lo que tenía el foco), a la ficha; al cerrar el índice, a su botón;
   * y al cerrar lo demás, a donde estaba antes (o a la ficha, al índice, a su botón o al lienzo). Si
   * nunca ha habido foco en el explorador (al cargar con `?cuerpo=`), no se mueve.
   */
  private keepFocus(before: FocusState, now: FocusState): void {
    const doc = this.host.nativeElement.ownerDocument;
    const active = doc.activeElement;
    if (active && active !== doc.body && isShown(active)) return;
    const entering = now.clean && !before.clean;
    if (!entering && this.lastFocus === null) return;
    const root = this.host.nativeElement.parentElement;
    const panel = this.panel().nativeElement;
    const toggle = this.indexToggle().nativeElement;
    const indexClosed = before.index && !now.index;
    const candidates = entering
      ? [this.restoreButton()?.nativeElement]
      : now.panel !== null && now.panel !== before.panel
        ? [panel]
        : [
            indexClosed ? toggle : this.lastFocus,
            this.lastFocus,
            panel,
            root?.querySelector('[role="treeitem"][tabindex="0"]'),
            toggle,
            root?.querySelector('canvas[tabindex="0"]'),
          ];
    candidates.find(isShown)?.focus();
  }

  // --- Márgenes del encuadre (PLAN 3.c.6 y fase 3c, tarea 8) --------------------------------------

  /**
   * Mide los paneles que tapan el lienzo (`[data-chrome]`, con su caja de maquetación, sin las
   * transformaciones de las animaciones, y el borde que declaran en `--chrome-edge`) y se los pasa
   * al motor; también como variables CSS, para colocar la cámara y los avisos en la parte visible.
   * Los paneles que aparecen después (el de la vista Tierra, al entrar en ella desde otra vista) se
   * miden también: la interfaz los añade como hijos suyos.
   */
  private trackInsets(): void {
    const host = this.host.nativeElement;
    const explorer = host.parentElement;
    const win = explorer?.ownerDocument.defaultView;
    if (!explorer || !win || typeof ResizeObserver === 'undefined') return;
    let last = '';
    const chrome = () => [...explorer.querySelectorAll<HTMLElement>('[data-chrome]')];
    const measure = () => {
      const stage = { left: 0, top: 0, right: explorer.clientWidth, bottom: explorer.clientHeight };
      const rects = chrome()
        .filter((element) => element.offsetWidth > 0 && element.offsetHeight > 0)
        .map((element) => {
          const { left, top } = offsetWithin(element, explorer);
          return {
            left,
            top,
            right: left + element.offsetWidth,
            bottom: top + element.offsetHeight,
            edge: parseChromeEdge(win.getComputedStyle(element).getPropertyValue('--chrome-edge')),
          };
        });
      const insets: ViewInsets = insetsFromRects(stage, rects);
      const key = `${insets.top},${insets.right},${insets.bottom},${insets.left}`;
      if (key === last) return;
      last = key;
      for (const [side, value] of Object.entries(insets)) {
        explorer.style.setProperty(`--view-${side}`, `${value}px`);
      }
      this.session.setInsets(insets);
    };
    const observer = new ResizeObserver(measure);
    const observed = new Set<HTMLElement>();
    /** Observa los paneles nuevos y deja de observar los que ya no están. */
    const follow = () => {
      const current = chrome();
      for (const element of observed) {
        if (current.includes(element)) continue;
        observer.unobserve(element);
        observed.delete(element);
      }
      for (const element of current) {
        if (observed.has(element)) continue;
        observer.observe(element);
        observed.add(element);
      }
    };
    observer.observe(explorer);
    follow();
    // Solo los hijos directos de la interfaz: los paneles condicionales (`@if`) entran y salen ahí.
    const children = new MutationObserver(() => {
      follow();
      measure();
    });
    children.observe(host, { childList: true });
    measure();
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      children.disconnect();
    });
  }
}
