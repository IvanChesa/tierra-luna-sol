import { expect, type Page } from '@playwright/test';

/**
 * Lo que el modo de captura (`?captura=1`) expone del motor a los scripts: el mismo objeto que
 * `ViewerDebugHandle` (`features/viewer/viewer-canvas.ts`), con solo lo que miran los e2e.
 */
interface E2eEngine {
  readonly view: string;
  readonly focusedBody: string | null;
  readonly playing: boolean;
  readonly speed: number;
  stats(): {
    readonly renderedFrames: number;
    readonly geometries: number;
    readonly textures: number;
    readonly aliased: readonly string[];
  };
  capture(): Promise<Blob>;
}

declare global {
  interface Window {
    __tlsViewer?: { ready: boolean; engine: E2eEngine | null };
    /** El motor del principio, para comprobar que es el mismo después de cambiar de vista. */
    __e2eEngine?: E2eEngine | null;
    /** Cambios de la URL (pushState y replaceState) desde que se empezó a contar. */
    __e2eUrlChanges?: number;
    /** Cambios de la fecha de la barra de tiempo desde que se empezó a contar. */
    __e2eTimeChanges?: number;
  }
}

/** Errores de la página: excepciones, errores de consola y respuestas ≥ 400. */
export function trackProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`[console] ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`[${response.status()}] ${response.url()}`);
  });
  return problems;
}

/** Abre el explorador y espera al primer frame del 3D (y, en captura, a que el motor repose). */
export async function openExplorer(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('tls-viewer-canvas')).toHaveClass(/is-ready/, { timeout: 90_000 });
  // La interfaz llega en un @defer (on idle): sin ella no hay nada que probar.
  await expect(page.locator('tls-time-controls')).toBeVisible();
  if (path.includes('captura=1')) {
    await page.waitForFunction(() => window.__tlsViewer?.ready === true);
    await waitForIdle(page);
  }
}

/** Espera a que el motor lleve un rato sin pintar (texturas subidas, cámara quieta). */
export async function waitForIdle(page: Page, quietMs = 1200): Promise<void> {
  let last = -1;
  let since = Date.now();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const frames = await page.evaluate(
      () => window.__tlsViewer?.engine?.stats().renderedFrames ?? 0,
    );
    if (frames !== last) {
      last = frames;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) {
      return;
    }
    await page.waitForTimeout(150);
  }
  throw new Error('El motor no llega al reposo');
}

/** La imagen del lienzo (PNG en base64) en el modo de captura: sin la interfaz ni las etiquetas. */
export async function canvasImage(page: Page): Promise<string> {
  await waitForIdle(page);
  return page.evaluate(async () => {
    const engine = window.__tlsViewer?.engine;
    if (!engine) throw new Error('Sin motor');
    const bytes = new Uint8Array(await (await engine.capture()).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
}

/** El instante que muestra la barra de tiempo (el `datetime` de su `<time>`, en UTC). */
export async function simTime(page: Page): Promise<number> {
  const value = await page.locator('.time__readout time').getAttribute('datetime');
  return Date.parse(value ?? '');
}

/** Empieza a contar los cambios de la URL que hace la aplicación (pushState y replaceState). */
export async function countUrlChanges(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__e2eUrlChanges = 0;
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method].bind(history);
      history[method] = (...args: Parameters<History['pushState']>) => {
        window.__e2eUrlChanges = (window.__e2eUrlChanges ?? 0) + 1;
        original(...args);
      };
    }
  });
}

export const urlChanges = (page: Page): Promise<number> =>
  page.evaluate(() => window.__e2eUrlChanges ?? 0);

/** Una fila del índice de cuerpos (el elemento que se pulsa). */
export const treeRow = (page: Page, id: string) => page.locator(`#tree-${id} > .row`);

/** Abre «Controles +» (la fecha, la hora, la zona, «Ahora», la calidad y los atajos). */
export async function openControls(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Controles', exact: true });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await expect(page.locator('#time-date')).toBeVisible();
}

/** El botón «Índice» (exacto: el panel abierto tiene también «Cerrar el índice»). */
export const indexToggle = (page: Page) =>
  page.getByRole('button', { name: 'Índice', exact: true });

/** Abre el panel «Índice» (cerrado al entrar desde la fase 3c) si no está abierto. */
export async function openIndex(page: Page): Promise<void> {
  const toggle = indexToggle(page);
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(page.getByRole('tree', { name: 'Cuerpos del sistema solar' })).toBeVisible();
}
