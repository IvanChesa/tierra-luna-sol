/**
 * Dependencias del motor en el navegador: el renderer WebGL, `requestAnimationFrame`, el reloj,
 * la visibilidad de la página y la carga de recursos (estrellas y texturas por el manifiesto).
 * Solo se ejecuta en el cliente: el motor se crea en `afterNextRender` (PLAN §4.6).
 */
import type { EngineDeps } from './engine';
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

export function browserEngineDeps(options: SceneEngineOptions): EngineDeps {
  const view = options.canvas.ownerDocument.defaultView ?? window;
  const doc = options.canvas.ownerDocument;
  const base = options.assetsBaseUrl ?? doc.baseURI;
  return {
    createRenderer: createWebGLRenderer,
    scheduler: {
      request: (callback) => view.requestAnimationFrame(callback),
      cancel: (handle) => view.cancelAnimationFrame(handle),
    },
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
