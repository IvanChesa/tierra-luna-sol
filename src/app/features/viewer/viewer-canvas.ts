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
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import type {
  ExplorerView,
  FrameStats,
  QualitySetting,
  SceneEngineApi,
  SceneEngineOptions,
} from '../../scene';
import { readQualityPreference, writeQualityPreference } from './quality-preference';
import { viewerErrorText } from './viewer-errors';
import { CAPTURE_DATE, ViewerParams, parseViewerParams } from './viewer-params';
import { ViewerPoster } from './viewer-poster';

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

/**
 * El lienzo 3D (D10): crea el motor en `afterNextRender` con un `import()` dinámico, así three y
 * astronomy-engine nunca van en el bundle inicial ni se ejecutan al prerenderizar (PLAN §4.6). El
 * motor persiste mientras el layout del visor esté vivo, aunque cambie la vista.
 *
 * Robustez (revisión de la fase 2):
 * - cada intento usa un `<canvas>` nuevo: al liberar el motor se fuerza la pérdida del contexto del
 *   lienzo anterior (para no acumular contextos), así que no se puede reutilizar;
 * - después de cada `await` se comprueba que el componente y el intento siguen vivos: si no, no se
 *   crea ningún motor (no quedan contextos WebGL huérfanos);
 * - el póster sigue debajo hasta el primer frame, y también si hay un error.
 */
@Component({
  selector: 'tls-viewer-canvas',
  imports: [ViewerPoster],
  templateUrl: './viewer-canvas.html',
  styleUrl: './viewer-canvas.css',
  host: { '[class.is-ready]': "status() === 'ready'" },
})
export class ViewerCanvas {
  readonly view = input.required<ExplorerView>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelLayer = viewChild<ElementRef<HTMLElement>>('labels');
  private engine: SceneEngineApi | null = null;
  private observer: ResizeObserver | null = null;
  private storage: Storage | undefined;
  private params: ViewerParams | null = null;
  /** Intento en curso: uno nuevo (Reintentar) invalida los `await` del anterior. */
  private attemptToken = 0;
  private destroyed = false;

  /** Un elemento por intento: «Reintentar» crea un `<canvas>` nuevo. */
  protected readonly attempts = signal<readonly number[]>([0]);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly progress = signal(0);
  protected readonly errorMessage = signal('');
  protected readonly stats = signal<FrameStats | null>(null);
  protected readonly quality = signal<QualitySetting>('auto');
  protected readonly capture = signal(false);
  protected readonly showStats = computed(
    () => isDevMode() && !this.capture() && this.stats() !== null,
  );
  protected readonly label = computed(() => VIEW_LABELS[this.view()]);

  constructor() {
    afterNextRender(() => void this.start());
    // Sincroniza la vista con el motor (sistema externo): el único uso de effect() aquí.
    effect(() => {
      const view = this.view();
      this.engine?.setView(view);
    });
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

  protected changeQuality(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const setting = (['auto', 'high', 'medium', 'low'] as const).find((v) => v === value) ?? 'auto';
    this.quality.set(setting);
    writeQualityPreference(this.storage, setting);
    this.engine?.setQuality(setting);
  }

  protected formatNumber(value: number, digits = 1): string {
    return value.toLocaleString('es-ES', { maximumFractionDigits: digits });
  }

  private async start(): Promise<void> {
    const doc = this.host.nativeElement.ownerDocument;
    const win = doc.defaultView;
    const canvas = this.canvas()?.nativeElement;
    const labelLayer = this.labelLayer()?.nativeElement;
    if (!win || !canvas || !labelLayer || this.destroyed) return;
    const token = ++this.attemptToken;
    const alive = () => !this.destroyed && token === this.attemptToken;
    this.storage = safeLocalStorage(win);
    const params = parseViewerParams(win.location.search);
    this.params = params;
    this.capture.set(params.capture);
    const quality =
      params.quality ?? (params.capture ? 'high' : readQualityPreference(this.storage));
    this.quality.set(quality);
    this.status.set('loading');
    this.progress.set(0);
    if (params.capture) win.__tlsViewer = { ready: false, engine: null };
    try {
      const { createSceneEngine } = await import('../../scene');
      // Mientras bajaba el chunk se ha podido salir del explorador o pulsar «Reintentar».
      if (!alive()) return;
      const options: SceneEngineOptions = {
        canvas,
        labelLayer,
        time: params.time ?? (params.capture ? CAPTURE_DATE : new Date()),
        view: this.view(),
        focus: params.body,
        scale: params.scale ?? 'illustrative',
        quality,
        reducedMotion: win.matchMedia('(prefers-reduced-motion: reduce)').matches,
        capture: params.capture,
        depth: params.depth ?? 'auto',
        background: params.background ?? undefined,
      };
      const engine = createSceneEngine(options);
      this.engine = engine;
      if (win.__tlsViewer) win.__tlsViewer.engine = engine;
      engine.on('progress', ({ loaded, total }) => {
        if (alive()) this.progress.set(total > 0 ? loaded / total : 0);
      });
      engine.on('ready', () => {
        if (!alive()) return;
        this.status.set('ready');
        if (win.__tlsViewer) win.__tlsViewer.ready = true;
      });
      engine.on('error', ({ message }) => {
        if (alive()) this.fail(message);
      });
      engine.on('frameStats', (stats) => this.stats.set(stats));
      engine.on('bodyPicked', ({ id }) => engine.focus(id));
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
    this.engine?.dispose();
    this.engine = null;
    const win = this.host.nativeElement.ownerDocument.defaultView;
    if (win?.__tlsViewer && this.params?.capture) win.__tlsViewer = { ready: false, engine: null };
  }
}

function safeLocalStorage(win: Window): Storage | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}
