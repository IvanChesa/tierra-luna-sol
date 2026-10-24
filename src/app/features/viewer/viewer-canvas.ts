import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  isDevMode,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { formatNumber } from '../../core/format';
import type { ExplorerView, FrameStats, SceneEngineApi } from '../../scene';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { canvasCommand } from '../shortcuts/shortcuts';
import { viewerErrorText } from './viewer-errors';

/** Lo que el modo de captura expone a los scripts de Playwright (capturas, póster y mediciones). */
export interface ViewerDebugHandle {
  ready: boolean;
  engine: SceneEngineApi | null;
}

declare global {
  interface Window {
    __tlsViewer?: ViewerDebugHandle;
  }
}

const VIEW_LABELS: Readonly<Record<ExplorerView, string>> = {
  system: 'Vista 3D del sistema solar',
  earth: 'Vista 3D de la Tierra',
  moon: 'Vista 3D de la Luna',
};

/** Giro por pulsación de una flecha en el lienzo (rad); con Mayús, el triple. */
const ORBIT_STEP = (6 * Math.PI) / 180;

/**
 * El lienzo 3D (D10): crea el motor en `afterNextRender` con un `import()` dinámico, así three y
 * astronomy-engine nunca van en el bundle inicial ni se ejecutan al prerenderizar (PLAN §4.6). El
 * motor persiste mientras el explorador esté vivo, aunque cambie la vista; la sesión lo conecta a
 * los stores. Con el foco, el lienzo se controla con el teclado (PLAN 3.c.6).
 *
 * Robustez (revisión de la fase 2): cada intento usa un `<canvas>` nuevo (al liberar el motor se
 * fuerza la pérdida del contexto del anterior) y después de cada `await` se comprueba que el
 * componente y el intento siguen vivos, así que nunca queda un contexto WebGL huérfano.
 */
@Component({
  selector: 'tls-viewer-canvas',
  templateUrl: './viewer-canvas.html',
  styleUrl: './viewer-canvas.css',
  host: { '[class.is-ready]': "status() === 'ready'" },
})
export class ViewerCanvas {
  readonly view = input.required<ExplorerView>();
  /** El primer frame completo ya está pintado. */
  readonly ready = output<void>();

  private readonly session = inject(ExplorerSession);
  private readonly sim = inject(SimulationStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelLayer = viewChild<ElementRef<HTMLElement>>('labels');
  private engine: SceneEngineApi | null = null;
  private observer: ResizeObserver | null = null;
  /** Intento en curso: uno nuevo («Reintentar») invalida los `await` del anterior. */
  private attemptToken = 0;
  private destroyed = false;

  /** Un elemento por intento: «Reintentar» crea un `<canvas>` nuevo. */
  protected readonly attempts = signal<readonly number[]>([0]);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly progress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly stats = signal<FrameStats | null>(null);
  protected readonly showStats = computed(
    () => isDevMode() && !this.session.capture && this.stats() !== null,
  );
  protected readonly label = computed(() => VIEW_LABELS[this.view()]);
  protected readonly percent = computed(() => formatNumber(this.progress() * 100, 0));

  constructor() {
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.stop();
    });
  }

  protected retry(): void {
    this.stop();
    this.status.set('loading');
    this.attempts.update(([attempt = 0]) => [attempt + 1]);
    // El lienzo nuevo existe después del siguiente render.
    afterNextRender(() => void this.start(), { injector: this.injector });
  }

  protected format(value: number, digits = 1): string {
    return formatNumber(value, digits);
  }

  /** Teclado con el foco en el lienzo: flechas para girar, Inicio y Espacio (los demás, globales). */
  protected onKeydown(event: KeyboardEvent): void {
    const command = canvasCommand(event);
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 3 * ORBIT_STEP : ORBIT_STEP;
    switch (command) {
      case 'orbit-left':
        this.session.orbit(-step, 0);
        break;
      case 'orbit-right':
        this.session.orbit(step, 0);
        break;
      case 'orbit-up':
        this.session.orbit(0, step);
        break;
      case 'orbit-down':
        this.session.orbit(0, -step);
        break;
      case 'overview':
        this.session.overview();
        break;
      case 'toggle-play':
        this.sim.togglePlaying();
        break;
    }
  }

  private async start(): Promise<void> {
    const win = this.host.nativeElement.ownerDocument.defaultView;
    const canvas = this.canvas()?.nativeElement;
    const labelLayer = this.labelLayer()?.nativeElement;
    if (!win || !canvas || !labelLayer || this.destroyed) return;
    const token = ++this.attemptToken;
    const alive = () => !this.destroyed && token === this.attemptToken;
    this.status.set('loading');
    this.progress.set(0);
    const capture = this.session.capture;
    if (capture) win.__tlsViewer = { ready: false, engine: null };
    try {
      const { createSceneEngine } = await import('../../scene');
      // Mientras bajaba el chunk se ha podido salir del explorador o pulsar «Reintentar».
      if (!alive()) return;
      const engine = createSceneEngine({ ...this.session.engineOptions(), canvas, labelLayer });
      this.engine = engine;
      if (win.__tlsViewer) win.__tlsViewer.engine = engine;
      engine.on('progress', ({ loaded, total }) => {
        if (alive()) this.progress.set(total > 0 ? loaded / total : 0);
      });
      engine.on('ready', () => {
        if (!alive()) return;
        this.status.set('ready');
        this.ready.emit();
        if (win.__tlsViewer) win.__tlsViewer.ready = true;
      });
      engine.on('error', ({ message }) => {
        if (alive()) this.fail(message);
      });
      engine.on('frameStats', (stats) => this.stats.set(stats));
      this.session.attachEngine(engine);
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.host.nativeElement);
      this.resize();
    } catch (error) {
      if (alive()) this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  private resize(): void {
    const element = this.host.nativeElement;
    const win = element.ownerDocument.defaultView;
    this.engine?.resize(element.clientWidth, element.clientHeight, win?.devicePixelRatio ?? 1);
  }

  private fail(message: string): void {
    // El detalle técnico, para quien depura; a la interfaz, un mensaje en español (ESTILO §2).
    console.error(`[visor 3D] ${message}`);
    this.errorMessage.set(viewerErrorText(message));
    this.status.set('error');
  }

  private stop(): void {
    this.attemptToken++;
    this.observer?.disconnect();
    this.observer = null;
    if (this.engine) this.session.detachEngine(this.engine);
    this.engine?.dispose();
    this.engine = null;
    const win = this.host.nativeElement.ownerDocument.defaultView;
    if (win?.__tlsViewer && this.session.capture) win.__tlsViewer = { ready: false, engine: null };
  }
}
