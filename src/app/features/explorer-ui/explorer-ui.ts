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
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { formatPageTitle } from '../../core/site-title.strategy';
import { GUIDED_VIEWS } from '../../data/tours';
import type { ExplorerView, ViewInsets } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { BodyChips } from '../body-chips/body-chips';
import { systemOf, treeNode } from '../body-picker/body-tree';
import { BodyPanel } from '../body-panel/body-panel';
import { CameraControls, ZOOM_STEP } from '../camera-controls/camera-controls';
import { EarthPanel } from '../earth-panel/earth-panel';
import { MoonPanel } from '../moon-panel/moon-panel';
import { SkyPanel } from '../sky-panel/sky-panel';
import { ShortcutCommand, globalCommand, isTextField, repeats } from '../shortcuts/shortcuts';
import { ShortcutsDialog } from '../shortcuts/shortcuts-dialog';
import { closePopover, isPopoverOpen } from '../time-controls/popover';
import { TimeControls } from '../time-controls/time-controls';
import { VIEW_LINKS } from '../view-switcher/view-switcher';
import { insetsFromRects, parseChromeEdge } from '../viewer/insets';
import { Icon } from '../viewer/icon';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { bodyKindLabel } from './describe';
import { ExplorerFocus, type FocusTitle } from './explorer-focus';
import { ExplorerSession } from './explorer-session';
import { hasSeen, markSeen, safeStorage } from './first-visit';
import { IndexPanel } from './index-panel';
import { Notices } from './notices';

/** La vista de cada atajo de vista (1–4). */
const VIEW_OF_COMMAND: Readonly<
  Record<'view-system' | 'view-earth' | 'view-moon' | 'view-sky', ExplorerView>
> = {
  'view-system': 'system',
  'view-earth': 'earth',
  'view-moon': 'moon',
  'view-sky': 'sky',
};

/** Deslizar la ficha hacia abajo más que esto la baja o la cierra (móvil). */
const SWIPE_CLOSE_PX = 72;
/** Deslizarla hacia arriba más que esto la sube a su altura completa (móvil). */
const SWIPE_OPEN_PX = 40;
/**
 * A los pocos segundos de llegar a una vista, la presentación se pliega sola, aunque no se haya tocado
 * nada (fase 9c, 9c.2): queda el título. En el modo de captura, no (las capturas son deterministas).
 */
export const PRESENTATION_FOLD_MS = 8000;

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
    MoonPanel,
    SkyPanel,
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
    '[class.is-detail]': 'detail()',
    '[class.is-sheet-expanded]': 'sheetExpanded()',
    '[class.is-interacted]': 'interacted()',
    '[class.shows-hints]': 'showsHints',
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
  /**
   * Se ve la fila de lunas que flota sobre las fichas: solo en el cielo (en la vista del sistema solar,
   * la fila de fichas pasa a ser la del sistema del cuerpo elegido; en Tierra y Luna no hay fichas).
   */
  protected readonly hasMoons = computed(
    () => this.view() === 'sky' && systemOf(this.sim.selectedBodyId()) !== null,
  );
  /**
   * Las vistas Tierra y Luna: sin la fila de fichas ni el Índice (fase 9c, 9c.2); «‹ Sistema solar», en
   * su título, lleva a la vista general.
   */
  protected readonly detail = computed(() => this.view() === 'earth' || this.view() === 'moon');
  /**
   * La ficha del móvil, subida a su altura completa (con las distancias, los datos y sus fuentes). Al
   * abrirse, o al cambiar de cuerpo, en reposo: el nombre, el resumen y «Ficha completa».
   */
  protected readonly sheetExpanded = linkedSignal({
    source: this.panelBody,
    computation: () => false,
  });
  /** El 3D se ve: los controles de cámara aparecen (antes, y si falla, no harían nada). */
  protected readonly ready3d = signal(false);
  /**
   * Ya se ha usado el explorador (un clic, un toque o una tecla dentro de él). Al cambiar de vista
   * vuelve a `false`: se ve el texto de la vista nueva hasta la siguiente interacción.
   */
  protected readonly acted = linkedSignal({ source: this.view, computation: () => false });
  /** Han pasado unos segundos en la vista (`PRESENTATION_FOLD_MS`); al cambiar de vista, otra vez no. */
  private readonly settled = linkedSignal({ source: this.view, computation: () => false });
  /**
   * El texto de presentación se pliega al empezar a usar el explorador, al elegir un cuerpo (fase 3c,
   * tarea 5) o a los pocos segundos (fase 9c); el layout lo pliega por CSS con la clase del anfitrión.
   */
  protected readonly interacted = computed(
    () => this.acted() || this.settled() || this.panelBody() !== null,
  );
  /**
   * Las pistas de uso («Arrastra para girar…»), solo la primera vez (fase 9c, 9c.5): se pliegan con la
   * presentación y, desde entonces, no vuelven. Sin almacenamiento, siempre (se pliegan solas).
   */
  protected readonly showsHints: boolean;
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
  private readonly tourSkip = viewChild<ElementRef<HTMLElement>>('tourSkip');
  /** El recorrido de la portada, en marcha (fase 9c, 9c.6): «Saltar el recorrido» a la vista. */
  protected readonly touring = signal(false);
  /**
   * Con movimiento reducido, el recorrido no arranca solo: la primera vez, en su lugar, «Ver el
   * recorrido» (hasta empezar a usar el explorador; siempre, en «Controles»).
   */
  protected readonly offersTour = signal(false);
  private tour: { stop(): void } | null = null;
  /** El almacenamiento del navegador (las preferencias de la primera vez). */
  private readonly storage = safeStorage(this.host.nativeElement.ownerDocument.defaultView);
  /** El explorador se abrió en la portada, sin parámetros: el único sitio donde arranca el recorrido. */
  private readonly plainHome: boolean;
  /**
   * Un fundido por cada paso entre el espacio y el cielo (la pista del `@for`): cada uno crea el
   * velo de nuevo y su animación CSS lo desvanece. Con movimiento reducido, ninguno (un corte).
   */
  protected readonly skyFades = linkedSignal<ExplorerView, number[]>({
    source: this.view,
    computation: (view, previous) => {
      const crossed = previous !== undefined && (view === 'sky') !== (previous.source === 'sky');
      if (!crossed || this.session.reducedMotion || this.session.capture)
        return previous?.value ?? [];
      return [(previous.value[0] ?? 0) + 1];
    },
  });
  /** El último elemento con el foco que no es de quita y pon (la ficha, «Mostrar la interfaz»). */
  private lastFocus: HTMLElement | null = null;

  constructor() {
    this.explorer.connectView(this.view);
    afterNextRender(() => this.trackInsets());

    this.followFocus();

    const storage = this.storage;
    this.showsHints = hasSeen(storage, 'tls.pistas') !== true;
    const location = this.host.nativeElement.ownerDocument.defaultView?.location;
    this.plainHome = location?.pathname === '/' && !location.search;
    this.session.setTourHandler(() => this.startTour());
    this.destroyRef.onDestroy(() => {
      this.session.setTourHandler(null);
      this.tour?.stop();
    });
    if (this.showsHints && !this.session.capture) {
      effect(() => {
        if (this.interacted()) untracked(() => markSeen(storage, 'tls.pistas'));
      });
    }

    // La presentación se pliega sola a los pocos segundos de llegar a cada vista (un temporizador:
    // sistema externo). En captura, nunca.
    let foldTimer: ReturnType<typeof setTimeout> | null = null;
    if (!this.session.capture) {
      effect(() => {
        this.view();
        untracked(() => {
          if (foldTimer !== null) clearTimeout(foldTimer);
          foldTimer = setTimeout(() => this.settled.set(true), PRESENTATION_FOLD_MS);
        });
      });
    }
    this.destroyRef.onDestroy(() => {
      if (foldTimer !== null) clearTimeout(foldTimer);
    });

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
    this.maybeStartTour();
  }

  // --- El recorrido de la portada (fase 9c, 9c.6) -------------------------------------------------

  /**
   * La primera vez que alguien entra en `/` sin parámetros, con el 3D ya pintado: el recorrido. No
   * arranca en el modo de captura, con un enlace profundo (`?cuerpo=`, `?fecha=`, `/explorar/…`),
   * si ya se vio, ni sin almacenamiento (no se puede recordar: no insiste). Con movimiento reducido,
   * se ofrece «Ver el recorrido».
   */
  private maybeStartTour(): void {
    if (!this.plainHome || this.session.capture || this.view() !== 'system') return;
    if (hasSeen(this.storage, 'tls.recorrido') !== false) return;
    if (this.session.reducedMotion) this.offersTour.set(true);
    else this.startTour();
  }

  /**
   * Pone en marcha el recorrido (su código, en un chunk aparte que se pide ahora). Lo para «Saltar el
   * recorrido», `Esc` o cualquier toque, arrastre, rueda o tecla, y la escena se queda donde está.
   */
  protected startTour(): void {
    if (this.tour || this.touring()) return;
    this.offersTour.set(false);
    markSeen(this.storage, 'tls.recorrido');
    void import('../tour/home-tour').then(({ homeTourSteps, runTour }) => {
      const spain = GUIDED_VIEWS.find((view) => view.id === 'espana');
      if (!spain || this.tour) return;
      const doc = this.host.nativeElement.ownerDocument;
      const interrupt = (event: Event) => {
        if (event instanceof KeyboardEvent) {
          if (PASSIVE_KEYS.has(event.key)) return;
          // `Esc` solo para el recorrido: no salta el viaje en curso ni cierra nada.
          if (event.key === 'Escape') event.preventDefault();
        }
        this.tour?.stop();
      };
      const events = ['pointerdown', 'wheel', 'keydown'] as const;
      const listen = (on: boolean) => {
        for (const type of events) {
          if (on) doc.addEventListener(type, interrupt, { capture: true });
          else doc.removeEventListener(type, interrupt, { capture: true });
        }
      };
      this.tour = runTour(
        {
          select: (id) => this.session.select(id),
          closePanel: () => this.session.closePanel(),
          goTo: (view) => this.goTo(view, true),
          showGuidedView: (view) => this.session.showGuidedView(view),
          play: () => this.sim.setPlaying(true),
          announce: (text) => this.session.announce(text),
        },
        homeTourSteps(spain),
        (completed) => {
          listen(false);
          this.tour = null;
          this.touring.set(false);
          if (!completed) this.session.announce('Recorrido parado.');
        },
      );
      listen(true);
      if (this.view() !== 'system') this.goTo('system', true);
      this.touring.set(true);
      afterNextRender(() => this.tourSkip()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected stopTour(): void {
    this.tour?.stop();
  }

  protected closePanel(): void {
    this.session.closePanel();
  }

  /**
   * El título sigue al cuerpo elegido (fase 9c, decisión 2 de Iván): en la vista del sistema solar, la
   * portada dice «Saturno», con «‹ Sistema solar» para volver (`ExplorerFocus`), y el título del
   * documento también. El documento es un sistema externo: el título se pone al elegir y otra vez al
   * acabar cada navegación (la estrategia de títulos lo reescribe cuando la URL recoge el cuerpo).
   */
  private followFocus(): void {
    const focus = inject(ExplorerFocus);
    const title = inject(Title);
    const current = computed<FocusTitle | null>(() => {
      const id = this.sim.selectedBodyId();
      if (this.view() !== 'system' || id === null) return null;
      return { id, name: treeNode(id).name, kind: bodyKindLabel(id) };
    });
    const apply = (body: FocusTitle | null) => {
      if (body) title.setTitle(formatPageTitle(body.name));
    };
    effect(() => {
      const body = current();
      untracked(() => {
        focus.body.set(body);
        apply(body);
      });
    });
    focus.setBackHandler(() => this.session.overview());
    const navigation = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) apply(untracked(current));
    });
    this.destroyRef.onDestroy(() => {
      navigation.unsubscribe();
      focus.body.set(null);
      focus.setBackHandler(null);
    });
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
      case 'view-sky':
        this.goTo(VIEW_OF_COMMAND[command]);
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

  /** A otra vista. Las del recorrido sustituyen la entrada del historial (`replace`): no lo llenan. */
  private goTo(view: ExplorerView, replace = false): void {
    const link = VIEW_LINKS.find((candidate) => candidate.view === view);
    if (link && view !== this.view()) {
      void this.router.navigate(
        [link.path],
        replace
          ? { queryParamsHandling: 'preserve', replaceUrl: true }
          : { queryParamsHandling: 'preserve' },
      );
    }
  }

  // --- Ficha en móvil: una hoja de dos alturas --------------------------------------------------

  protected swipeDown(event: PointerEvent): void {
    this.swipeStart = event.clientY;
  }

  /**
   * Al soltar el tirador: hacia arriba, la hoja sube a su altura completa; hacia abajo, baja a la de
   * reposo o, si ya estaba en ella, se cierra. (El botón «Ver los datos» de la ficha hace lo mismo.)
   */
  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeStart !== null) {
      const dy = event.clientY - this.swipeStart;
      if (dy < -SWIPE_OPEN_PX) this.sheetExpanded.set(true);
      else if (dy > SWIPE_CLOSE_PX) {
        if (this.sheetExpanded()) this.sheetExpanded.set(false);
        else this.session.closePanel();
      }
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
    // Lo último con el foco estaba en «Controles» (la vista limpia se pide desde allí), que ya se ha
    // cerrado: el foco vuelve a su botón (fase 9c).
    const last = this.lastFocus?.closest('#time-menu')
      ? (root?.querySelector<HTMLElement>('.time__more') ?? this.lastFocus)
      : this.lastFocus;
    const candidates = entering
      ? [this.restoreButton()?.nativeElement]
      : now.panel !== null && now.panel !== before.panel
        ? [panel]
        : [
            indexClosed ? toggle : last,
            last,
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
