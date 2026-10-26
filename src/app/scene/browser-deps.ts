/**
 * Dependencias del motor en el navegador: el renderer WebGL, `requestAnimationFrame`, el reloj,
 * la visibilidad de la página y la carga de recursos (estrellas y texturas por el manifiesto).
 * Solo se ejecuta en el cliente: el motor se crea en `afterNextRender` (PLAN §4.6).
 */
import type { EngineDeps, FrameScheduler } from './engine';
import { createWebGLRenderer } from './renderer';
import { TEXTURE_FILES } from './texture-files';
import { TEXTURE_META } from './texture-meta';
import { ManifestTextureSource } from './textures';
import type { SceneEngineOptions } from './types';

interface NavigatorWithMemory extends Navigator {
  readonly deviceMemory?: number;
}

interface SchedulerWithYield {
  readonly scheduler?: { yield?: () => Promise<void> };
}

/**
 * `requestAnimationFrame`, y para el render lento (4 Hz) un temporizador antes del frame: así la
 * página no se despierta 60 veces por segundo para no pintar nada. Los frames con espera llevan
 * identificadores negativos (los de `requestAnimationFrame` son positivos).
 */
class BrowserFrameScheduler implements FrameScheduler {
  private next = -1;
  private readonly delayed = new Map<number, { timeout: number; frame: number | null }>();

  constructor(private readonly view: Window) {}

  request(callback: (timeMs: number) => void, delayMs = 0): number {
    if (delayMs <= 0) return this.view.requestAnimationFrame(callback);
    const handle = this.next--;
    const entry: { timeout: number; frame: number | null } = { timeout: 0, frame: null };
    entry.timeout = this.view.setTimeout(() => {
      entry.frame = this.view.requestAnimationFrame((time) => {
        this.delayed.delete(handle);
        callback(time);
      });
    }, delayMs);
    this.delayed.set(handle, entry);
    return handle;
  }

  cancel(handle: number): void {
    const entry = this.delayed.get(handle);
    if (!entry) {
      this.view.cancelAnimationFrame(handle);
      return;
    }
    this.view.clearTimeout(entry.timeout);
    if (entry.frame !== null) this.view.cancelAnimationFrame(entry.frame);
    this.delayed.delete(handle);
  }
}

export function browserEngineDeps(options: SceneEngineOptions): EngineDeps {
  const view = options.canvas.ownerDocument.defaultView ?? window;
  const doc = options.canvas.ownerDocument;
  const base = options.assetsBaseUrl ?? doc.baseURI;
  return {
    createRenderer: createWebGLRenderer,
    scheduler: new BrowserFrameScheduler(view),
    now: () => view.performance.now(),
    device: () => {
      const nav = view.navigator as NavigatorWithMemory;
      const ratio = view.devicePixelRatio || 1;
      return {
        coarsePointer: view.matchMedia('(pointer: coarse)').matches,
        screenPixels: view.screen.width * view.screen.height * ratio * ratio,
        deviceMemoryGB: nav.deviceMemory,
        hardwareConcurrency: nav.hardwareConcurrency,
      };
    },
    loadStars: async () => {
      const response = await view.fetch(new URL('data/stars.bin', base));
      if (!response.ok)
        throw new Error(`No se ha podido cargar el catálogo de estrellas (${response.status}).`);
      return response.arrayBuffer();
    },
    textures: ({ maxTextureSize, anisotropy, upload }) => ({
      source: new ManifestTextureSource({
        files: TEXTURE_FILES,
        meta: TEXTURE_META,
        baseUrl: base,
        maxTextureSize,
        anisotropy,
        upload,
      }),
      meta: TEXTURE_META,
    }),
    visibility: {
      hidden: () => doc.hidden,
      subscribe: (listener) => {
        doc.addEventListener('visibilitychange', listener);
        return () => doc.removeEventListener('visibilitychange', listener);
      },
    },
    yieldToMain: () => {
      const yielder = (view as unknown as SchedulerWithYield).scheduler?.yield;
      return yielder
        ? yielder.call((view as unknown as SchedulerWithYield).scheduler)
        : new Promise((resolve) => view.setTimeout(resolve, 0));
    },
  };
}
