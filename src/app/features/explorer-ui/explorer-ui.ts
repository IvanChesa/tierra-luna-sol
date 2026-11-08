import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
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
import { NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { formatPageTitle } from '../../core/site-title.strategy';
import { GUIDED_VIEWS } from '../../data/tours';
import type { ExplorerView, ViewInsets } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { moonPhase } from '../../ephemeris/ephemeris';
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
import { skyPlaceShortLabel } from '../sky-panel/sky-place-label';
import { PHONE_QUERY, SHEETS_QUERY, mediaQuery } from '../viewer/media';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { Callout } from './callout';
import { bodyKindLabel } from './describe';
import { ExplorerFocus, type FocusTitle, type SkyTitle } from '../../core/explorer-focus';
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
/** Lo que se ven las pistas de la primera vez (crítica de la 9c: 6–8 s), si nadie las usa antes. */
export const HINT_MS = 7000;

/** Por debajo de este ancho, el índice y la ficha son hojas inferiores (viewer-layout.css). */

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

/** La portada, sin parámetros (sin consulta). */
function isPlainHome(location: Location | undefined): boolean {
  return location?.pathname === '/' && !location.search;
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
  let node: HTMLElement | null = element;
  for (; node && node !== root; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  if (node === root) return { left, top };
  // Lo que está en la capa superior del navegador («Controles», un `popover` fijo) no cuelga de `root`:
  // su caja en la ventana, respecto a la de `root`.
  const box = element.getBoundingClientRect();
  const base = root.getBoundingClientRect();
  return { left: box.left - base.left, top: box.top - base.top };
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
    Callout,
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
    '[class.no-index]': 'detail() || view() === "sky"',
    '[class.is-sheet-expanded]': 'sheetExpanded()',
    '[class.is-interacted]': 'interacted()',
    '(document:keydown)': 'onKeydown($event)',
    '(pointerdown)': 'onInteraction($event)',
    '(wheel)': 'onInteraction($event)',
    '(focusin)': 'rememberFocus($event)',
  },
})
export class ExplorerUi implements OnInit {
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
  /** El teléfono: una sola fila de fichas (en la tableta y el PC, dos; body-chips.ts). */
  private readonly phone = mediaQuery(PHONE_QUERY);
  /**
   * Se ve la fila de lunas que flota sobre las fichas: en la tableta y el PC, con un planeta con lunas
   * (o una de ellas) elegido, en todas las vistas (decisión de Iván del 07-11). En el móvil no la hay.
   */
  protected readonly hasMoons = computed(
    () => !this.phone() && systemOf(this.sim.selectedBodyId()) !== null,
  );
  /**
   * Las vistas Tierra y Luna: sin el Índice (fase 9c, 9c.2) y, en el móvil, sin la fila de fichas
   * (como el cielo: `no-index`); «‹ Sistema solar», en su título, lleva a la vista general.
   */
  protected readonly detail = computed(() => this.view() === 'earth' || this.view() === 'moon');
  /**
   * La ficha del móvil, subida a su altura completa (con las distancias, los datos y sus fuentes). Al
   * abrirse, o al cambiar de cuerpo, a media pantalla: el nombre, el resumen y «Ficha completa».
   */
  protected readonly sheetExpanded = linkedSignal({
    source: this.panelBody,
    computation: () => false,
  });
  /** Las hojas del móvil y la tableta (la ficha, el índice y «Controles» suben desde abajo). */
  private readonly sheets = mediaQuery(SHEETS_QUERY);
  /** El 3D se ve: los controles de cámara aparecen (antes, y si falla, no harían nada). */
  protected readonly ready3d = signal(false);
  /**
   * Venus «Bajo las nubes» (fase 9b, D44): el estado del radar para la ficha de Venus, en la vista del
   * sistema solar y con el 3D a la vista; `null` (sin botón) en las demás.
   */
  protected readonly venusRadar = computed(() =>
    this.panelBody() === 'venus' && this.view() === 'system' && this.ready3d()
      ? this.session.radar()
      : null,
  );
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
   * Las pistas de uso de la primera vez (fase 9c, 9c.5; crítica de la 9c), junto a la fila de fichas
   * mientras se ven: «Elige un cuerpo abajo · arrastra para girar · …». Salen al acabar el recorrido (o
   * al saltarlo) o, sin recorrido, al verse el 3D; se van a los `HINT_MS` o con la primera interacción
   * de verdad, y solo entonces se dan por vistas. Sin almacenamiento, cada vez.
   */
  protected readonly hint = signal<string | null>(null);
  /** Cuándo salieron (la hora de los eventos): lo que pasa antes, como el gesto que para el recorrido, no cuenta. */
  private hintShownAt = 0;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  /** Las pistas, aún por ver. */
  private hintsPending = false;
  /** El puntero es el dedo: «pellizca» en lugar de «usa la rueda». */
  private readonly touch = mediaQuery('(pointer: coarse)');
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
  private readonly chips = viewChild.required(BodyChips);
  /** El recorrido de la portada, en marcha (fase 9c, 9c.6): «Saltar el recorrido» a la vista. */
  protected readonly touring = signal(false);
  /** El rótulo de la parada en la que está («1 de 4 · Saturno y sus anillos»). */
  protected readonly tourCaption = signal<string | null>(null);
  /** Cómo se ha parado (lo mira su final): saltado o parado, con el teclado o con el puntero. */
  private tourEnd: { how: 'skip' | 'stop'; input: 'keyboard' | 'pointer' } | null = null;
  /**
   * Con movimiento reducido, el recorrido no arranca solo: la primera vez, en su lugar, «Ver el
   * recorrido» (en la portada, al llegar; siempre, en «Controles»).
   */
  private readonly offersTour = linkedSignal({ source: this.view, computation: () => false });
  /** «Ver el recorrido», hasta empezar a usar el explorador o elegir un cuerpo. */
  protected readonly showsTourOffer = computed(
    () => this.offersTour() && !this.acted() && this.sim.selectedBodyId() === null,
  );
  private tour: { stop(): void } | null = null;
  /** El código del recorrido, pedido y aún sin llegar. */
  private tourLoading = false;
  /** La interfaz sigue viva (lo que llega después, como el código del recorrido, lo mira). */
  private alive = true;
  /** El almacenamiento del navegador (las preferencias de la primera vez). */
  private readonly storage = safeStorage(this.host.nativeElement.ownerDocument.defaultView);
  /**
   * Se llegó a la portada sin parámetros (la URL de llegada, antes de que la interfaz la cambie sola:
   * con movimiento reducido arranca en pausa y escribe `?fecha=`). Un enlace profundo no tiene recorrido.
   */
  private readonly arrivedPlain = isPlainHome(
    this.host.nativeElement.ownerDocument.defaultView?.location,
  );
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
  private readonly focus = inject(ExplorerFocus);
  /** Lo que dice el título de la portada: el cuerpo elegido en la vista del sistema solar. */
  /** En la vista del cielo, su lugar, para la franja de arriba del móvil (decisión de Iván del 08-11). */
  private readonly skyTitle = computed<SkyTitle | null>(() =>
    this.view() === 'sky' ? { place: skyPlaceShortLabel(this.explorer.skyPlace()) } : null,
  );
  private readonly focusTitle = computed<FocusTitle | null>(() => {
    const id = this.sim.selectedBodyId();
    if (this.view() !== 'system' || id === null) return null;
    return { id, name: treeNode(id).name, kind: bodyKindLabel(id) };
  });

  constructor() {
    this.explorer.connectView(this.view);
    afterNextRender(() => this.trackInsets());

    this.destroyRef.onDestroy(() => {
      this.alive = false;
      this.session.setTourHandler(null);
      this.tour?.stop();
    });
    this.followFocus();
    // El radar de Venus, solo con su ficha a la vista (donde está su aviso): si se cierra, si cambia el
    // cuerpo o la vista, vuelven las nubes (el motor, un sistema externo). Con `?radar=1` (solo en
    // captura), lo decide la URL: en el móvil, la ficha no se abre sola.
    effect(() => {
      const offered = this.venusRadar() !== null || this.session.params.venusRadar;
      const state = this.session.radar();
      if (!offered && (state === 'on' || state === 'loading')) {
        untracked(() => this.session.setVenusRadar(false));
      }
    });

    this.hintsPending = hasSeen(this.storage, 'tls.pistas') !== true && !this.session.capture;
    this.session.setTourHandler(() => this.startTour());
    this.destroyRef.onDestroy(() => {
      if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    });

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

  /**
   * El título de la portada lee el cuerpo de aquí: se conecta cuando la vista (`view`, una entrada
   * obligatoria) ya tiene valor; antes, leerla daría el error NG0950.
   */
  ngOnInit(): void {
    this.focus.connect(this.focusTitle);
    this.focus.connectSky(this.skyTitle);
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
   * se ofrece «Ver el recorrido» (y ofrecerlo cuenta como visto: después, en «Controles»).
   */
  private maybeStartTour(): void {
    if (!this.tourStillFits() || hasSeen(this.storage, 'tls.recorrido') !== false) {
      this.showHints(false);
      return;
    }
    if (this.session.reducedMotion) {
      this.offersTour.set(true);
      markSeen(this.storage, 'tls.recorrido');
      this.showHints(false);
    } else this.startTour(true);
  }

  /**
   * El recorrido que arranca solo, ahora: se llegó a la portada sin parámetros y nadie ha empezado a
   * usar el explorador. Las fichas, la barra y el Índice funcionan antes que el 3D: con una red lenta,
   * quien llega por primera vez puede haber elegido (`?cuerpo=`), tocado algo o pausado ya. Sin
   * movimiento reducido, el explorador arranca en marcha (D31): en pausa, alguien lo ha pausado.
   */
  private tourStillFits(): boolean {
    return (
      this.arrivedPlain &&
      !this.session.capture &&
      this.view() === 'system' &&
      !this.acted() &&
      this.sim.selectedBodyId() === null &&
      (this.session.reducedMotion || this.sim.playing())
    );
  }

  /**
   * Pone en marcha el recorrido (su código, en un chunk aparte que se pide ahora). «Saltar el
   * recorrido» (o `Esc`) lleva a la vista general en marcha; cualquier otro toque, arrastre, rueda o
   * tecla lo para y la escena se queda donde está (crítica de la 9c). La parada de la Luna, solo si se ve
   * iluminada (`TOUR_MOON_MIN_LIT`), sin tocar la fecha. Si arranca solo (`auto`), lo que se mira antes
   * se mira otra vez al llegar su código; si el código no llega (sin conexión), no se da por visto.
   */
  protected startTour(auto = false): void {
    if (this.tour || this.touring() || this.tourLoading) return;
    this.offersTour.set(false);
    this.hint.set(null);
    this.tourLoading = true;
    import('../tour/home-tour')
      .then(({ homeTourSteps, runTour, TOUR_MOON_MIN_LIT }) => {
        this.tourLoading = false;
        const spain = GUIDED_VIEWS.find((view) => view.id === 'espana');
        if (!this.alive || !spain || this.tour || (auto && !this.tourStillFits())) {
          if (this.alive && !this.tour) this.showHints(false);
          return;
        }
        markSeen(this.storage, 'tls.recorrido');
        const doc = this.host.nativeElement.ownerDocument;
        // Al acabar, el foco vuelve a donde estaba (o al lienzo): «Saltar el recorrido» se quita.
        const before = doc.activeElement !== doc.body ? doc.activeElement : null;
        const interrupt = (event: Event) => {
          const onSkip =
            event.target instanceof Element && event.target.closest('.callout__skip') !== null;
          if (event instanceof KeyboardEvent) {
            if (PASSIVE_KEYS.has(event.key)) return;
            const skip =
              event.key === 'Escape' || (onSkip && (event.key === 'Enter' || event.key === ' '));
            // `Esc` (e Intro en «Saltar») solo para el recorrido: no salta el viaje ni cierra nada.
            if (skip) event.preventDefault();
            this.endTour(skip ? 'skip' : 'stop', 'keyboard');
            return;
          }
          this.endTour(onSkip ? 'skip' : 'stop', 'pointer');
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
            goTo: (view) => void this.goTo(view, true),
            showGuidedView: (view) => this.session.showGuidedView(view),
            play: () => this.sim.setPlaying(true),
            announce: (text) => this.session.announce(text),
            caption: (text) => this.tourCaption.set(text),
          },
          homeTourSteps(spain, {
            moon: moonPhase(this.sim.time()).illuminatedFraction >= TOUR_MOON_MIN_LIT,
          }),
          (completed) => {
            listen(false);
            this.tour = null;
            const end = completed ? null : (this.tourEnd ?? { how: 'stop', input: 'pointer' });
            this.tourEnd = null;
            if (!this.alive) return;
            this.touring.set(false);
            this.tourCaption.set(null);
            if (end?.how === 'skip') this.toOverviewInMotion();
            else if (end) {
              // Parado donde está, sin viajes a medias ni «Saltar el viaje» detrás.
              this.session.skipTravel();
              this.session.announce('Recorrido parado.');
            }
            this.showHints(true);
            // «Saltar el recorrido», con el foco, se quita. Con el puntero, el foco no se mueve (sin
            // marco sobre el lienzo); con el teclado, a donde estaba o al lienzo; si acaba solo, al
            // lienzo, sin marco.
            if (end?.input !== 'pointer') {
              const visible = end?.input === 'keyboard';
              afterNextRender(() => this.restoreFocus(before, visible), {
                injector: this.injector,
              });
            }
          },
        );
        listen(true);
        if (this.view() !== 'system') void this.goTo('system', true);
        this.touring.set(true);
        afterNextRender(() => this.tourSkip()?.nativeElement.focus(), { injector: this.injector });
      })
      .catch(() => {
        this.tourLoading = false;
        this.showHints(false);
      });
  }

  /** «Saltar el recorrido» sin puntero (un lector de pantalla): como con el teclado. */
  protected skipTour(): void {
    this.endTour('skip', 'keyboard');
  }

  private endTour(how: 'skip' | 'stop', input: 'keyboard' | 'pointer'): void {
    if (!this.tour) return;
    this.tourEnd = { how, input };
    this.tour.stop();
  }

  /**
   * «Saltar»: la vista general del sistema solar, en marcha, sin viajes a medias (crítica de la 9c:
   * no te deja en Saturno ni en la Tierra con «Saltar el viaje»). Desde la Tierra o la Luna, al llegar a
   * la vista del sistema solar la sesión ya pone la vista general; su viaje se salta al empezar.
   */
  private toOverviewInMotion(): void {
    this.sim.setPlaying(true);
    if (this.view() === 'system') {
      this.session.overview();
      this.session.skipTravel();
      return;
    }
    void this.goTo('system', true)?.then(() =>
      afterNextRender(() => this.session.skipTravel(), { injector: this.injector }),
    );
  }

  /**
   * Las pistas de la primera vez, junto a la fila, `HINT_MS`: desde el final del recorrido (con «Ahora
   * tú:»), desde que se salta o, sin recorrido, desde que se ve el 3D (crítica de la 9c). «Elige un
   * cuerpo abajo», donde hay fichas.
   */
  private showHints(afterTour: boolean): void {
    if (!this.hintsPending || !this.alive) return;
    const parts = [
      ...(this.view() === 'system' || !this.phone() ? ['elige un cuerpo abajo'] : []),
      'arrastra para girar',
      this.touch() ? 'pellizca para acercarte' : 'usa la rueda para acercarte',
    ];
    const text = parts.join(' · ');
    this.hint.set(afterTour ? `Ahora tú: ${text}` : text.charAt(0).toUpperCase() + text.slice(1));
    this.hintShownAt = performance.now();
    if (this.hintTimer !== null) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.set(null), HINT_MS);
  }

  /**
   * Un clic, un toque o la rueda dentro del explorador (las teclas, en `onKeydown`): ya se ha usado. Con
   * las pistas a la vista, se van y se dan por vistas (no el gesto que las hizo salir, el de antes).
   */
  protected onInteraction(event: Event): void {
    this.acted.set(true);
    if (this.hint() === null || event.timeStamp <= this.hintShownAt) return;
    this.hint.set(null);
    this.hintsPending = false;
    markSeen(this.storage, 'tls.pistas');
  }

  protected closePanel(): void {
    this.session.closePanel();
  }

  /**
   * El título sigue al cuerpo elegido (fase 9c, decisión 2 de Iván): en la vista del sistema solar, la
   * portada dice «Saturno», con «‹ Sistema solar» para volver (`ExplorerFocus`), y el título del
   * documento también.
   */
  private followFocus(): void {
    const focus = this.focus;
    const title = inject(Title);
    const strategy = inject(TitleStrategy);
    const current = this.focusTitle;
    // El título del documento (un sistema externo): el del cuerpo o, sin él, el de la página.
    const apply = () => {
      const body = untracked(current);
      const page = body ? body.name : strategy.buildTitle(this.router.routerState.snapshot);
      title.setTitle(formatPageTitle(page));
    };
    effect(() => {
      current();
      untracked(apply);
    });
    // La estrategia de títulos lo reescribe al acabar cada navegación (justo después de emitir
    // `NavigationEnd`; al elegir, la URL recoge el cuerpo): se pone otra vez después, en una microtarea.
    const navigation = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        queueMicrotask(() => {
          if (this.alive) apply();
        });
      }
    });
    // «‹ Sistema solar»: con un cuerpo, la vista general; desde el cielo (su franja), el sistema solar.
    focus.setBackHandler(() => {
      if (this.view() === 'sky') void this.goTo('system');
      else this.backToOverview();
    });
    focus.connectSheet(
      computed(() => this.panelBody() !== null),
      () => this.toggleSheet(),
    );
    this.destroyRef.onDestroy(() => {
      navigation.unsubscribe();
      focus.connect(null);
      focus.setBackHandler(null);
      focus.connectSheet(null, null);
      focus.connectSky(null);
    });
  }

  /**
   * «‹ Sistema solar» (en el título de la portada): la vista general. El botón desaparece con el cuerpo:
   * el foco pasa a la ficha del cuerpo (o de su planeta) en la fila de los planetas o, si no se ve, al
   * lienzo (WCAG 2.4.3).
   */
  private backToOverview(): void {
    const selected = this.sim.selectedBodyId();
    const chip = selected ? (systemOf(selected) ?? selected) : null;
    this.session.overview();
    afterNextRender(
      () => {
        if (this.hasFocus()) return;
        if (chip && this.chips().focusBody(chip)) return;
        this.canvas()?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * Al acabar el recorrido, si el foco se ha perdido (estaba en «Saltar el recorrido»): a donde estaba
   * antes de empezar o al lienzo. Sin el teclado de por medio, sin marco de foco (`focusVisible`).
   */
  private restoreFocus(before: Element | null, visible = true): void {
    if (this.hasFocus()) return;
    [before, this.canvas()].find(isShown)?.focus({ focusVisible: visible });
  }

  /** ¿Hay un elemento con el foco, a la vista? (`<body>` no cuenta: el foco se ha perdido.) */
  private hasFocus(): boolean {
    const doc = this.host.nativeElement.ownerDocument;
    const active = doc.activeElement;
    return active !== null && active !== doc.body && isShown(active);
  }

  /** El lienzo, si se puede enfocar (con el 3D pintado). */
  private canvas(): HTMLElement | null {
    return (
      this.host.nativeElement.parentElement?.querySelector<HTMLElement>('canvas[tabindex="0"]') ??
      null
    );
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
    if (win?.matchMedia?.(SHEETS_QUERY).matches) this.explorer.indexOpen.set(false);
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
      this.onInteraction(event);
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
        void this.goTo(VIEW_OF_COMMAND[command]);
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
  private goTo(view: ExplorerView, replace = false): Promise<boolean> | null {
    const link = VIEW_LINKS.find((candidate) => candidate.view === view);
    if (!link || view === this.view()) return null;
    return this.router.navigate(
      [link.path],
      replace
        ? { queryParamsHandling: 'preserve', replaceUrl: true }
        : { queryParamsHandling: 'preserve' },
    );
  }

  // --- Ficha en móvil: una hoja de dos alturas, que se abre con «ⓘ» (decisión del 08-11) -------

  protected swipeDown(event: PointerEvent): void {
    this.swipeStart = event.clientY;
    // Soltar fuera del tirador también cuenta (con el ratón no hay captura implícita, como con el dedo).
    (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
  }

  /**
   * Al soltar el tirador: hacia arriba, la hoja sube a su altura completa; hacia abajo, baja a la de
   * media pantalla o, si ya estaba en ella, se cierra. (El botón «Ver los datos» de la ficha hace lo
   * mismo.)
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

  /**
   * «ⓘ», en la franja de arriba del móvil: abre la ficha del cuerpo elegido, con el foco en su
   * contenido (el resumen), o la cierra (el foco sigue en «ⓘ»). Al cerrarla de otra forma (Esc, ×, el
   * tirador), el foco vuelve a «ⓘ» (`keepFocus`).
   */
  private toggleSheet(): void {
    if (this.panelBody() !== null) {
      this.session.closePanel();
      return;
    }
    this.session.openPanel();
    afterNextRender(
      () => {
        const body = this.panel().nativeElement.querySelector<HTMLElement>('.card__body');
        if (isShown(body)) body.focus();
      },
      { injector: this.injector },
    );
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
    // En el móvil, al cerrar la ficha, el foco vuelve a «ⓘ», en la franja de arriba, que la abre
    // (aunque el explorador no haya tenido el foco antes: «ⓘ» está en la cabecera).
    const info =
      this.sheets() && before.panel !== null && now.panel === null
        ? doc.querySelector<HTMLElement>('.site-focus__info')
        : null;
    if (!entering && this.lastFocus === null && !isShown(info)) return;
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
            info,
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
      // Lo que no se ve (`visibility: hidden`: en el móvil, las fichas tras la ficha) no aparta el
      // encuadre: con la barra fina, el cuerpo, en el centro del hueco que queda (decisión del 08-11).
      const rects = chrome()
        .filter(
          (element) =>
            element.offsetWidth > 0 &&
            element.offsetHeight > 0 &&
            win.getComputedStyle(element).visibility !== 'hidden',
        )
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
