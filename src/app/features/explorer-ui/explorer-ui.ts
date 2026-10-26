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
import { BodyPanel } from '../body-panel/body-panel';
import { BodyPicker } from '../body-picker/body-picker';
import { CameraControls, ZOOM_STEP } from '../camera-controls/camera-controls';
import { ShortcutCommand, globalCommand, isTextField, repeats } from '../shortcuts/shortcuts';
import { ShortcutsDialog } from '../shortcuts/shortcuts-dialog';
import { TimeControls } from '../time-controls/time-controls';
import { VIEW_LINKS } from '../view-switcher/view-switcher';
import { insetsFromRects } from '../viewer/insets';
import { Icon } from '../viewer/icon';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { ExplorerSession } from './explorer-session';
import { Notices } from './notices';

/** Deslizar la ficha hacia abajo más que esto la cierra (móvil). */
const SWIPE_CLOSE_PX = 72;

/** Lo que la interfaz no recuerda como «el último foco»: lo que aparece y desaparece. */
const TRANSIENT = '.panel, .restore, .skip';

/** Lo que decide adónde va el foco: la vista limpia y el cuerpo de la ficha abierta. */
interface FocusState {
  readonly clean: boolean;
  readonly panel: string | null;
}

/** ¿Se ve el elemento? Sin `checkVisibility` (jsdom, navegadores antiguos), se supone que sí. */
function isShown(element: Element | null | undefined): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  return typeof element.checkVisibility === 'function'
    ? element.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })
    : true;
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
    BodyPicker,
    BodyPanel,
    TimeControls,
    CameraControls,
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
    '(document:keydown)': 'onKeydown($event)',
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

  /** Cuerpo de la ficha resumida, si está abierta. */
  protected readonly panelBody = computed(() =>
    this.explorer.panelOpen() ? this.sim.selectedBodyId() : null,
  );
  protected readonly panelBodies = computed(() => {
    const id = this.panelBody();
    return id ? [id] : [];
  });
  /** El 3D se ve: los controles de cámara aparecen (antes, y si falla, no harían nada). */
  protected readonly ready3d = signal(false);
  private swipeStart: number | null = null;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly restoreButton = viewChild<ElementRef<HTMLElement>>('restore');
  /** El último elemento con el foco que no es de quita y pon (la ficha, «Mostrar la interfaz»). */
  private lastFocus: HTMLElement | null = null;

  constructor() {
    this.explorer.connectView(this.view);
    afterNextRender(() => this.trackInsets());

    // Gestión del foco (WCAG 2.4.3): si la interfaz oculta o quita el elemento que tiene el foco
    // (la vista limpia, la ficha que se cierra o, en móvil, la hoja que tapa la tira, la barra y la
    // cámara), el foco pasa a donde se puede seguir. El DOM es un sistema externo: se mira cuando
    // ya está pintado.
    const injector = inject(Injector);
    let previous: FocusState = { clean: false, panel: null };
    effect(() => {
      const next: FocusState = { clean: this.explorer.cleanView(), panel: this.panelBody() };
      const before = previous;
      previous = next;
      untracked(() => afterNextRender(() => this.keepFocus(before, next), { injector }));
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

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || this.explorer.helpOpen()) return;
    // Los atajos no actúan mientras se escribe (PLAN 3.d.10).
    if (isTextField(event.target instanceof Element ? event.target : null)) return;
    const command = globalCommand(event, this.explorer.singleKeyShortcuts());
    if (!command || (event.repeat && !repeats(command)) || !this.run(command)) return;
    event.preventDefault();
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
      case 'escape':
        return this.escape();
    }
  }

  /** `Esc`: saltar el viaje, salir de la vista limpia o cerrar la ficha, en ese orden. */
  private escape(): boolean {
    if (this.explorer.travelling() === 'view') {
      this.session.skipTravel();
      return true;
    }
    if (this.explorer.cleanView()) {
      this.session.setCleanView(false);
      return true;
    }
    if (this.explorer.panelOpen()) {
      this.session.closePanel();
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
   * Tras un cambio de la vista limpia o de la ficha, si el foco se ha perdido (en `<body>` o en algo
   * que ya no se ve): al entrar en la vista limpia, a «Mostrar la interfaz»; al abrir la ficha (en
   * móvil tapa lo que tenía el foco), a la ficha; y al cerrar una u otra, a donde estaba antes (o a
   * la ficha, a la fila del índice o al lienzo). Si nunca ha habido foco en el explorador (al cargar
   * con `?cuerpo=`), no se mueve.
   */
  private keepFocus(before: FocusState, now: FocusState): void {
    const doc = this.host.nativeElement.ownerDocument;
    const active = doc.activeElement;
    if (active && active !== doc.body && isShown(active)) return;
    const entering = now.clean && !before.clean;
    if (!entering && this.lastFocus === null) return;
    const root = this.host.nativeElement.parentElement;
    const panel = this.panel().nativeElement;
    const candidates = entering
      ? [this.restoreButton()?.nativeElement]
      : now.panel !== null && now.panel !== before.panel
        ? [panel]
        : [
            this.lastFocus,
            panel,
            root?.querySelector('[role="treeitem"][tabindex="0"]'),
            root?.querySelector('canvas[tabindex="0"]'),
          ];
    candidates.find(isShown)?.focus();
  }

  // --- Márgenes del encuadre (PLAN 3.c.6) -------------------------------------------------------

  /**
   * Mide los paneles que tapan el lienzo (`[data-chrome]`, con su caja de maquetación, sin las
   * transformaciones de las animaciones) y se los pasa al motor; también como variables CSS, para
   * colocar los avisos del lienzo en la parte visible.
   */
  private trackInsets(): void {
    const explorer = this.host.nativeElement.parentElement;
    if (!explorer || typeof ResizeObserver === 'undefined') return;
    let last = '';
    const measure = () => {
      const chrome = [...explorer.querySelectorAll<HTMLElement>('[data-chrome]')];
      const stage = { left: 0, top: 0, right: explorer.clientWidth, bottom: explorer.clientHeight };
      const rects = chrome
        .filter((element) => element.offsetWidth > 0 && element.offsetHeight > 0)
        .map((element) => ({
          left: element.offsetLeft,
          top: element.offsetTop,
          right: element.offsetLeft + element.offsetWidth,
          bottom: element.offsetTop + element.offsetHeight,
        }));
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
    observer.observe(explorer);
    explorer.querySelectorAll('[data-chrome]').forEach((element) => observer.observe(element));
    measure();
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
