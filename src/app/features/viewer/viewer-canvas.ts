import {
  Component,
  DestroyRef,
  ElementRef,
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
import { CAPTURE_DATE, ViewerParams, parseViewerParams } from './viewer-params';

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
 */
@Component({
  selector: 'tls-viewer-canvas',
  templateUrl: './viewer-canvas.html',
  styleUrl: './viewer-canvas.css',
})
export class ViewerCanvas {
  readonly view = input.required<ExplorerView>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly labelLayer = viewChild.required<ElementRef<HTMLElement>>('labels');
  private engine: SceneEngineApi | null = null;
  private observer: ResizeObserver | null = null;
  private storage: Storage | undefined;
  private params: ViewerParams | null = null;

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly step = signal('Preparando la escena');
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
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected retry(): void {
    this.stop();
    void this.start();
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
    if (!win) return;
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
      const options: SceneEngineOptions = {
        canvas: this.canvas().nativeElement,
        labelLayer: this.labelLayer().nativeElement,
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
      engine.on('progress', ({ loaded, total, step }) => {
        this.step.set(step);
        this.progress.set(total > 0 ? loaded / total : 0);
      });
      engine.on('ready', () => {
        this.status.set('ready');
        if (win.__tlsViewer) win.__tlsViewer.ready = true;
      });
      engine.on('error', ({ message }) => this.fail(message));
      engine.on('frameStats', (stats) => this.stats.set(stats));
      engine.on('bodyPicked', ({ id }) => engine.focus(id));
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.host.nativeElement);
      this.resize();
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  private resize(): void {
    const element = this.host.nativeElement;
    const win = element.ownerDocument.defaultView;
    this.engine?.resize(element.clientWidth, element.clientHeight, win?.devicePixelRatio ?? 1);
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.status.set('error');
  }

  private stop(): void {
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
