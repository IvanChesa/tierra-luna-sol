import { DOCUMENT, DestroyRef, Service, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { findBody } from '../../data/body-index';
import type {
  BodyId,
  ExplorerView,
  SceneEngineApi,
  SceneEngineOptions,
  ViewInsets,
} from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationEngine, SimulationStore } from '../../state/simulation.store';
import { DEFAULT_SPEED } from '../../state/speeds';
import { readSingleKeyShortcuts, writeSingleKeyShortcuts } from '../shortcuts/shortcut-preference';
import { readQualityPreference, writeQualityPreference } from '../viewer/quality-preference';
import {
  CAPTURE_DATE,
  ViewerParams,
  parseViewerParams,
  viewerQueryParams,
} from '../viewer/viewer-params';
import { describeBody, viewName } from './describe';

/** Lo que la sesión necesita del motor (un subconjunto de su API: en los tests, un doble). */
export type ExplorerEngine = SimulationEngine &
  Pick<
    SceneEngineApi,
    'setView' | 'setViewInsets' | 'orbitBy' | 'zoomBy' | 'skipTransition' | 'setLabelsVisible'
  >;

/** El cuerpo de cada vista de detalle y la vista propia de cada cuerpo que la tiene. */
const VIEW_BODY: Readonly<Partial<Record<ExplorerView, BodyId>>> = {
  earth: 'tierra',
  moon: 'luna',
};
const BODY_VIEW: Readonly<Partial<Record<BodyId, ExplorerView>>> = {
  tierra: 'earth',
  luna: 'moon',
};
const VIEW_PATH: Readonly<Record<ExplorerView, string>> = {
  system: '/',
  earth: '/explorar/tierra',
  moon: '/explorar/luna',
};

const NO_INSETS: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * La sesión del explorador: lee la URL una vez (PLAN 3.d.9), inicializa los stores, conecta el motor
 * cuando existe y sincroniza la URL (§4.5). Todas las órdenes de la interfaz que no son solo de
 * tiempo pasan por aquí: elegir un cuerpo, la vista general, el zoom, la vista limpia…
 *
 * Vive lo que vive el explorador (la provee `ExplorerUi`): al volver desde una ficha, se empieza de
 * nuevo con los parámetros de la URL nueva.
 */
@Service({ autoProvided: false })
export class ExplorerSession {
  private readonly sim = inject(SimulationStore);
  private readonly explorer = inject(ExplorerStore);
  private readonly positions = inject(SystemPositions);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  private readonly storage = safeLocalStorage(this.doc.defaultView);

  readonly params: ViewerParams;
  readonly capture: boolean;
  readonly reducedMotion: boolean;
  private readonly _warnings = signal<readonly string[]>([]);
  /** Avisos de los parámetros de la URL que se han ignorado. */
  readonly warnings = this._warnings.asReadonly();
  private readonly _announcement = signal('');
  /** La frase de la región `aria-live` (PLAN 3.d.11). */
  readonly announcement = this._announcement.asReadonly();

  private engine: ExplorerEngine | null = null;
  private engineOffs: (() => void)[] = [];
  private insets: ViewInsets = NO_INSETS;
  /** Cuerpo elegido desde una vista de detalle: se enfoca al llegar a la del sistema solar. */
  private pendingFocus: BodyId | null = null;
  private lastView: ExplorerView | null = null;

  constructor() {
    const win = this.doc.defaultView;
    this.params = parseViewerParams(win?.location.search ?? '');
    this.capture = this.params.capture;
    this.reducedMotion = win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this._warnings.set(this.params.warnings);
    // Arranque en movimiento (D31): sin fecha en la URL, «ahora» y reproduciendo a 3 horas por
    // segundo; con movimiento reducido, en pausa; con fecha (o en captura), en pausa en ella.
    const fixedTime = this.params.time !== null || this.capture;
    this.sim.init({
      time: this.params.time ?? (this.capture ? CAPTURE_DATE : new Date()),
      playing: !fixedTime && !this.reducedMotion,
      speed: DEFAULT_SPEED,
      selected: this.params.body,
      scale: this.params.scale ?? 'illustrative',
      quality: this.params.quality ?? (this.capture ? 'high' : readQualityPreference(this.storage)),
    });
    this.explorer.panelOpen.set(this.params.body !== null);
    this.explorer.singleKeyShortcuts.set(readSingleKeyShortcuts(this.storage));

    // La vista sale de la ruta: el motor y la selección la siguen (sistema externo).
    effect(() => {
      const view = this.explorer.view();
      untracked(() => this.applyView(view));
    });
    // La URL refleja el estado compartible, nunca durante la reproducción (§4.5). En captura no se
    // toca: los scripts abren URL exactas.
    if (!this.capture) effect(() => this.syncUrl());
    inject(DestroyRef).onDestroy(() => this.detachEngine());
  }

  // --- Motor ----------------------------------------------------------------------------------

  /** Opciones de arranque del motor según el estado actual (las completa el lienzo). */
  engineOptions(): Omit<SceneEngineOptions, 'canvas' | 'labelLayer'> {
    const view = this.explorer.view();
    return {
      time: this.sim.time(),
      view,
      focus: view === 'system' ? this.sim.selectedBodyId() : null,
      scale: this.sim.scaleFrame(),
      quality: this.sim.quality(),
      reducedMotion: this.reducedMotion,
      capture: this.capture,
      depth: this.params.depth ?? 'auto',
      background: this.params.background ?? undefined,
      viewFrom: this.params.viewFrom ?? undefined,
      toneMapping: this.params.toneMapping ?? undefined,
    };
  }

  attachEngine(engine: ExplorerEngine): void {
    this.detachEngine();
    this.engine = engine;
    // El estado se lee antes de dar la primera orden: cada orden hace que el motor emita
    // `timeChanged` con su propio estado (nace en pausa) y el store lo refleja.
    const speed = this.sim.speed();
    const playing = this.sim.playing();
    this.engineOffs = [
      this.sim.attach(engine),
      engine.on('bodyPicked', ({ id }) => this.select(id)),
      engine.on('travel', ({ active, kind }) => this.explorer.travelling.set(active ? kind : null)),
    ];
    engine.setSpeed(speed);
    engine.setPlaying(playing);
    engine.setViewInsets(this.insets);
    engine.setLabelsVisible(!this.explorer.cleanView());
  }

  detachEngine(engine?: ExplorerEngine): void {
    if (engine && engine !== this.engine) return;
    for (const off of this.engineOffs.splice(0)) off();
    this.engine = null;
    this.explorer.travelling.set(null);
  }

  // --- Órdenes --------------------------------------------------------------------------------

  /**
   * Elige un cuerpo (lista, etiqueta o lienzo) o la vista general (`null`). En la vista del sistema
   * solar lo enfoca; en las de detalle, el cuerpo de la vista abre su ficha, la Tierra y la Luna
   * llevan a su vista y cualquier otro lleva al sistema solar con él enfocado (un viaje).
   */
  select(id: BodyId | null): void {
    const view = this.explorer.view();
    if (view === 'system') {
      this.sim.select(id);
      this.explorer.panelOpen.set(id !== null);
      if (id) this.announceBody(id);
      else this.announce('Vista general del sistema solar.');
      return;
    }
    if (id !== null && id === VIEW_BODY[view]) {
      this.explorer.panelOpen.set(true);
      this.announceBody(id);
      return;
    }
    const target = id === null ? 'system' : (BODY_VIEW[id] ?? 'system');
    this.pendingFocus = target === 'system' ? id : null;
    void this.router.navigate([VIEW_PATH[target]], { queryParamsHandling: 'preserve' });
  }

  /** «Vista general»: todo el sistema solar a la vista. */
  overview(): void {
    this.select(null);
  }

  closePanel(): void {
    this.explorer.panelOpen.set(false);
  }

  /** Acerca (< 1) o aleja (> 1) la cámara. */
  zoom(factor: number): void {
    this.engine?.zoomBy(factor);
  }

  /** Gira la cámara alrededor del foco (radianes). */
  orbit(deltaAzimuth: number, deltaElevation: number): void {
    this.engine?.orbitBy(deltaAzimuth, deltaElevation);
  }

  /** «Saltar»: termina ya el viaje de cámara. */
  skipTravel(): void {
    this.engine?.skipTransition();
  }

  setCleanView(clean: boolean): void {
    this.explorer.cleanView.set(clean);
    this.engine?.setLabelsVisible(!clean);
  }

  /** Márgenes del lienzo que tapa la interfaz (los mide `ExplorerUi`). */
  setInsets(insets: ViewInsets): void {
    this.insets = insets;
    this.engine?.setViewInsets(insets);
  }

  setQuality(setting: Parameters<SimulationStore['setQuality']>[0]): void {
    this.sim.setQuality(setting);
    writeQualityPreference(this.storage, setting);
  }

  /** Activa o desactiva los atajos de una sola tecla (y lo recuerda). */
  setSingleKeyShortcuts(enabled: boolean): void {
    this.explorer.singleKeyShortcuts.set(enabled);
    writeSingleKeyShortcuts(this.storage, enabled);
  }

  /** Cierra el aviso de los parámetros de la URL (van todos en una caja). */
  dismissWarnings(): void {
    this._warnings.set([]);
  }

  /** Anuncia una frase en la región `aria-live` (también si se repite). */
  announce(text: string): void {
    // Una región viva no repite el mismo texto: se alterna un espacio duro al final.
    this._announcement.update((current) => (current === text ? `${text}\u00a0` : text));
  }

  // --- Sincronización ---------------------------------------------------------------------------

  private applyView(view: ExplorerView): void {
    const first = this.lastView === null;
    if (view === this.lastView) return;
    this.lastView = view;
    const viewBody = VIEW_BODY[view];
    if (viewBody) {
      this.sim.reflectSelection(viewBody);
      this.explorer.panelOpen.set(false);
    } else if (!first) {
      this.sim.reflectSelection(null);
      this.explorer.panelOpen.set(false);
    }
    this.engine?.setView(view);
    const pending = this.pendingFocus;
    this.pendingFocus = null;
    if (view === 'system' && pending) {
      this.select(pending);
      return;
    }
    if (!first) this.announce(`${viewName(view)}.`);
  }

  private syncUrl(): void {
    // Mientras el router navega, la URL todavía es la anterior: se espera a que termine.
    if (this.router.currentNavigation()) return;
    const view = this.explorer.view();
    const playing = this.sim.playing();
    const state = {
      time: playing ? null : this.sim.time(),
      body: view === 'system' ? this.sim.selectedBodyId() : null,
      scale: this.sim.scaleFrame(),
    };
    untracked(() => {
      const wanted = viewerQueryParams(state);
      const current = this.router.parseUrl(this.router.url).queryParams;
      const same = Object.entries(wanted).every(([key, value]) => (current[key] ?? null) === value);
      if (same) return;
      void this.router.navigate([], {
        queryParams: wanted,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  private announceBody(id: BodyId): void {
    if (!findBody(id)) return;
    this.announce(describeBody(id, this.positions.distances(id)));
  }
}

function safeLocalStorage(win: Window | null): Storage | undefined {
  try {
    return win?.localStorage;
  } catch {
    return undefined;
  }
}
