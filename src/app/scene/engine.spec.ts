import starsBin from '../../../public/data/stars.bin' with { loader: 'binary' };
import { Texture } from 'three';
import { KM_PER_AU } from '../ephemeris/constants';
import { MAX_DATE } from '../ephemeris/time';
import {
  EngineDeps,
  FRAMING_FILL,
  FrameScheduler,
  SceneEngine,
  framingDistanceRadii,
} from './engine';
import { hasDepthChunks } from './materials/depth';
import type { RendererCapabilities, RendererInfo, RendererPort } from './renderer';
import { SCENE_BODIES, createSolarSystemModel, sceneBody } from './system';
import type { SceneEngineEventName, SceneEngineEvents, SceneEngineOptions } from './types';

const WIDTH = 1200;
const HEIGHT = 800;
const START = new Date('2026-10-24T00:00:00Z');
/** Distancias de encuadre (en radios) con la cámara de 40° y la vista de los tests. */
const BODY_RADII = framingDistanceRadii(FRAMING_FILL.body, 40, WIDTH / HEIGHT);
const DETAIL_RADII = framingDistanceRadii(FRAMING_FILL.detail, 40, WIDTH / HEIGHT);

/** Renderer falso: cuenta lo que se le pide y permite simular la pérdida del contexto. */
class FakeRenderer implements RendererPort {
  readonly capabilities: RendererCapabilities = {
    maxTextureSize: 16_384,
    maxAnisotropy: 16,
    depth: 'logarithmic',
    reversedDepthSupported: false,
  };
  renders = 0;
  compiles = 0;
  uploads: Texture[] = [];
  exposure = 1;
  size = { width: 0, height: 0, pixelRatio: 0 };
  disposed = false;
  private readonly lost = new Set<() => void>();
  private readonly restored = new Set<() => void>();
  setSize(width: number, height: number, pixelRatio: number): void {
    this.size = { width, height, pixelRatio };
  }
  setExposure(exposure: number): void {
    this.exposure = exposure;
  }
  render(): void {
    this.renders++;
  }
  compile(): Promise<void> {
    this.compiles++;
    return Promise.resolve();
  }
  initTexture(texture: Texture): void {
    this.uploads.push(texture);
  }
  info(): RendererInfo {
    return { calls: 40, triangles: 1000, geometries: 5, textures: this.uploads.length };
  }
  toBlob(): Promise<Blob> {
    return Promise.resolve(new Blob([new Uint8Array([1])], { type: 'image/png' }));
  }
  onContextLost(listener: () => void): () => void {
    this.lost.add(listener);
    return () => this.lost.delete(listener);
  }
  onContextRestored(listener: () => void): () => void {
    this.restored.add(listener);
    return () => this.restored.delete(listener);
  }
  loseContext(): void {
    this.lost.forEach((l) => l());
  }
  restoreContext(): void {
    this.restored.forEach((l) => l());
  }
  dispose(): void {
    this.disposed = true;
  }
}

/** `requestAnimationFrame` manual: los frames solo corren cuando el test lo dice. */
class ManualScheduler implements FrameScheduler {
  private next = 1;
  private readonly pending = new Map<number, { callback: (time: number) => void; due: number }>();
  /** Peticiones con espera (render lento a 4 Hz) hechas hasta ahora. */
  delayed = 0;
  constructor(private readonly now: () => number) {}
  request(callback: (time: number) => void, delayMs = 0): number {
    const handle = this.next++;
    if (delayMs > 0) this.delayed++;
    this.pending.set(handle, { callback, due: this.now() + delayMs });
    return handle;
  }
  cancel(handle: number): void {
    this.pending.delete(handle);
  }
  get waiting(): number {
    return this.pending.size;
  }
  /** Corre los frames pedidos que ya tocan (los que llevan espera, cuando ha pasado). */
  run(time: number): void {
    const ready = [...this.pending].filter(([, entry]) => entry.due <= time);
    for (const [handle] of ready) this.pending.delete(handle);
    ready.forEach(([, entry]) => entry.callback(time));
  }
}

interface Harness {
  readonly engine: SceneEngine;
  readonly renderer: FakeRenderer;
  readonly scheduler: ManualScheduler;
  readonly canvas: HTMLCanvasElement;
  readonly labels: HTMLElement;
  readonly clock: { now: number };
  readonly page: { hidden: boolean; notify: () => void };
  readonly events: { [K in SceneEngineEventName]: SceneEngineEvents[K][] };
  /** Corre frames a `fps` durante `ms` milisegundos (reloj falso). */
  frames(ms: number, fps?: number): void;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function createHarness(overrides: Partial<SceneEngineOptions> = {}): Promise<Harness> {
  const renderer = new FakeRenderer();
  const clock = { now: 1000 };
  const scheduler = new ManualScheduler(() => clock.now);
  const visibilityListeners = new Set<() => void>();
  const page = { hidden: false, notify: () => visibilityListeners.forEach((l) => l()) };
  const canvas = document.createElement('canvas');
  const labels = document.createElement('div');
  document.body.append(canvas, labels);
  const deps: EngineDeps = {
    createRenderer: () => renderer,
    scheduler,
    now: () => clock.now,
    device: () => ({
      coarsePointer: false,
      screenPixels: WIDTH * HEIGHT,
      deviceMemoryGB: 8,
      hardwareConcurrency: 8,
    }),
    loadStars: () => Promise.resolve(starsBin),
    textures: () => null,
    visibility: {
      hidden: () => page.hidden,
      subscribe: (listener) => {
        visibilityListeners.add(listener);
        return () => visibilityListeners.delete(listener);
      },
    },
    yieldToMain: () => Promise.resolve(),
  };
  const engine = new SceneEngine(
    {
      canvas,
      labelLayer: labels,
      time: START,
      view: 'system',
      quality: 'high',
      reducedMotion: false,
      ...overrides,
    },
    deps,
  );
  const events = {
    ready: [],
    progress: [],
    bodyPicked: [],
    frameStats: [],
    error: [],
    contextLost: [],
    contextRestored: [],
    qualityChanged: [],
    timeChanged: [],
    limitReached: [],
    travel: [],
  } as unknown as Harness['events'];
  for (const name of Object.keys(events) as SceneEngineEventName[]) {
    engine.on(name, (event) => (events[name] as unknown[]).push(event));
  }
  engine.resize(WIDTH, HEIGHT, 1);
  for (let k = 0; k < 5; k++) await flush();
  const harness: Harness = {
    engine,
    renderer,
    scheduler,
    canvas,
    labels,
    clock,
    page,
    events,
    frames(ms: number, fps = 60) {
      const step = 1000 / fps;
      for (let t = 0; t < ms; t += step) {
        clock.now += step;
        scheduler.run(clock.now);
      }
    },
  };
  return harness;
}

/** Corre frames hasta que el motor deja de pedirlos (o pasan 10 s). */
function settle(h: Harness): number {
  let elapsed = 0;
  while (h.scheduler.waiting > 0 && elapsed < 10_000) {
    h.frames(16, 62.5);
    elapsed += 16;
  }
  return elapsed;
}

describe('SceneEngine: arranque y render bajo demanda', () => {
  it('arranca por pasos, compila los shaders y avisa cuando ha pintado el primer frame', async () => {
    const h = await createHarness();
    expect(h.events.progress.map((p) => p.loaded)).toEqual([0, 1, 2, 3, 4]);
    expect(h.renderer.compiles).toBe(1);
    expect(h.events.ready).toHaveLength(1);
    expect(h.renderer.renders).toBeGreaterThanOrEqual(1);
    expect(h.events.qualityChanged[0]).toEqual({
      level: 'high',
      setting: 'high',
      reason: 'initial',
    });
    expect(h.events.error).toEqual([]);
    h.engine.dispose();
  });

  it('en pausa y sin interacción no pinta ningún frame', async () => {
    const h = await createHarness();
    settle(h);
    const before = h.renderer.renders;
    h.frames(2000);
    expect(h.scheduler.waiting).toBe(0);
    expect(h.renderer.renders).toBe(before);
    expect(h.engine.stats().fps).toBe(0);
    // Una orden (por ejemplo, saltar de fecha) pinta lo justo y vuelve al reposo.
    h.engine.setTime(new Date('2030-01-01T00:00:00Z'));
    settle(h);
    expect(h.renderer.renders).toBe(before + 1);
    h.engine.dispose();
  });

  it('todos los ShaderMaterial de la escena llevan los chunks de profundidad (D13)', async () => {
    const h = await createHarness();
    const world = (
      h.engine as unknown as {
        world: {
          shaderMaterials(): { name: string; vertexShader: string; fragmentShader: string }[];
        };
      }
    ).world;
    const materials = world.shaderMaterials();
    expect(materials.length).toBeGreaterThanOrEqual(6); // cuerpos, Sol, halo, anillos, órbitas, estrellas
    for (const material of materials) expect(hasDepthChunks(material)).toBe(true);
    h.engine.dispose();
  });
});

describe('SceneEngine: tiempo', () => {
  it('reproduce a la velocidad pedida y avisa al store como mucho 5 veces por segundo', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setSpeed(86_400); // 1 día/s
    h.engine.setPlaying(true);
    const eventsBefore = h.events.timeChanged.length;
    h.frames(2000);
    const advancedDays = (h.engine.time.getTime() - START.getTime()) / 86_400_000;
    expect(advancedDays).toBeGreaterThan(1.9);
    expect(advancedDays).toBeLessThan(2.1);
    const during = h.events.timeChanged.length - eventsBefore;
    expect(during).toBeLessThanOrEqual(11); // 2 s × 5/s (+1 al arrancar)
    expect(during).toBeGreaterThanOrEqual(8);
    h.engine.setPlaying(false);
    expect(h.events.timeChanged.at(-1)?.playing).toBe(false);
    settle(h);
    expect(h.scheduler.waiting).toBe(0);
    h.engine.dispose();
  });

  it('hacia atrás también, y al llegar a 2100 se para y lo dice', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setSpeed(-3600);
    h.engine.setPlaying(true);
    h.frames(1000);
    expect(h.engine.time.getTime()).toBeLessThan(START.getTime() - 3_500_000);
    h.engine.setTime(new Date(MAX_DATE.getTime() - 86_400_000));
    h.engine.setSpeed(365.25 * 86_400); // 1 año/s
    h.engine.setPlaying(true);
    h.frames(500);
    expect(h.events.limitReached).toEqual([{ limit: 'max' }]);
    expect(h.engine.playing).toBe(false);
    expect(h.engine.time).toEqual(MAX_DATE);
    settle(h);
    expect(h.scheduler.waiting).toBe(0);
    h.engine.dispose();
  });

  it('con la pestaña oculta no pinta y al volver no da un salto de tiempo', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setSpeed(3600);
    h.engine.setPlaying(true);
    h.frames(500);
    h.page.hidden = true;
    h.page.notify();
    expect(h.scheduler.waiting).toBe(0);
    const frozen = h.engine.time.getTime();
    h.clock.now += 60_000; // un minuto con la pestaña oculta
    h.page.hidden = false;
    h.page.notify();
    h.frames(100);
    // Como mucho un frame de 100 ms de avance (no 60 s).
    expect(h.engine.time.getTime() - frozen).toBeLessThan(3600 * 1000 * 0.25);
    h.engine.dispose();
  });
});

describe('SceneEngine: foco, marcos y selección', () => {
  const position = (h: Harness, id: string) => {
    const frames = (
      h.engine as unknown as {
        frames: { output: { position: Float64Array; radius: Float64Array } };
      }
    ).frames;
    const k = sceneBody(id as never).index;
    const p = frames.output.position;
    return {
      x: p[3 * k] as number,
      y: p[3 * k + 1] as number,
      z: p[3 * k + 2] as number,
      r: frames.output.radius[k] as number,
    };
  };
  const length = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

  it('al enfocar Saturno vuela hacia él, pasa a su sistema local físico y Titán queda a su distancia real', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.focus('saturno');
    expect(h.engine.focusedBody).toBe('saturno');
    const elapsed = settle(h);
    expect(elapsed).toBeGreaterThan(1000); // hay animación (transición de ~1,5 s)
    expect(length(position(h, 'saturno'))).toBe(0); // origen flotante: el foco en el origen
    const saturn = position(h, 'saturno');
    const titan = position(h, 'titan');
    const state = createSolarSystemModel().at(h.engine.time);
    const realRadii =
      (length(state.parentOffsetOf('titan')) * KM_PER_AU) / sceneBody('saturno').radiusKm;
    expect(length(titan) / saturn.r).toBeCloseTo(realRadii, 3);
    // La cámara acaba a la distancia de encuadre de un cuerpo enfocado.
    const rig = (h.engine as unknown as { rig: { distance: number } }).rig;
    expect(rig.distance / saturn.r).toBeCloseTo(BODY_RADII, 3);
    h.engine.dispose();
  });

  it('cambiar de foco no mueve la cámara en el mundo (se reancla)', async () => {
    const h = await createHarness();
    settle(h);
    const internals = h.engine as unknown as {
      rig: { position: { x: number; y: number; z: number } };
    };
    const camera = internals.rig.position;
    const mars = position(h, 'marte');
    h.engine.focus('marte');
    const after = internals.rig.position;
    // Antes: cámara respecto al Sol. Después: respecto a Marte. En el mundo, el mismo punto.
    expect(after.x).toBeCloseTo(camera.x - mars.x, 6);
    expect(after.y).toBeCloseTo(camera.y - mars.z, 6);
    expect(after.z).toBeCloseTo(camera.z + mars.y, 6);
    h.engine.dispose();
  });

  it('la escala real global cambia los tamaños con una transición y deja la extensión del sistema', async () => {
    const h = await createHarness();
    settle(h);
    const sunBefore = position(h, 'sol').r;
    const neptuneBefore = length(position(h, 'neptuno'));
    h.engine.setScaleFrame('real');
    h.frames(700);
    const sunMid = position(h, 'sol').r;
    settle(h);
    const sunAfter = position(h, 'sol').r;
    expect(sunMid).toBeLessThan(sunBefore);
    expect(sunAfter).toBeLessThan(sunMid);
    expect(sunAfter / sunBefore).toBeLessThan(0.01);
    // Neptuno a una distancia del mismo orden (la escala real conserva el semieje de Neptuno).
    expect(length(position(h, 'neptuno')) / neptuneBefore).toBeGreaterThan(0.85);
    expect(length(position(h, 'neptuno')) / neptuneBefore).toBeLessThan(1.15);
    h.engine.dispose();
  });

  it('con movimiento reducido los cambios son directos (sin frames de transición)', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    h.engine.focus('jupiter');
    const elapsed = settle(h);
    expect(elapsed).toBeLessThanOrEqual(32);
    const rig = (h.engine as unknown as { rig: { distance: number } }).rig;
    expect(rig.distance / position(h, 'jupiter').r).toBeCloseTo(BODY_RADII, 6);
    h.engine.dispose();
  });

  it('al volver de la Luna a la vista general, la cámara nunca se echa encima del Sol', async () => {
    const h = await createHarness({ view: 'moon' });
    settle(h);
    h.engine.setView('system');
    const rig = (h.engine as unknown as { rig: { distance: number; azimuth: number } }).rig;
    let closest = Infinity;
    for (let t = 0; t < 4000; t += 16) {
      h.frames(16, 62.5);
      closest = Math.min(closest, rig.distance / position(h, 'sol').r);
    }
    // En la vista general, la cámara está a ~80 radios solares; nunca a menos de 30 por el camino.
    expect(closest).toBeGreaterThan(30);
    expect(Math.abs(Math.sin(rig.azimuth - -0.55))).toBeLessThan(1e-3); // acimut de la vista general
    h.engine.dispose();
  });

  it('un clic sobre un cuerpo (o su etiqueta) lo elige', async () => {
    const h = await createHarness();
    settle(h);
    const screen = (
      h.engine as unknown as {
        screen: { index: number; x: number; y: number; onScreen: boolean; occluded: boolean }[];
      }
    ).screen;
    const jupiter = screen[sceneBody('jupiter').index];
    expect(jupiter?.onScreen).toBe(true);
    h.canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
      right: WIDTH,
      bottom: HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const at = { clientX: jupiter?.x ?? 0, clientY: jupiter?.y ?? 0, pointerId: 1, bubbles: true };
    h.canvas.dispatchEvent(
      new PointerEvent('pointerdown', { ...at, button: 0, pointerType: 'mouse' }),
    );
    h.canvas.dispatchEvent(
      new PointerEvent('pointerup', { ...at, button: 0, pointerType: 'mouse' }),
    );
    expect(h.events.bodyPicked).toEqual([{ id: 'jupiter' }]);
    // La etiqueta del Sol está visible en la vista general y también se puede pulsar.
    const label = h.labels.querySelector<HTMLElement>('[data-body="sol"]');
    expect(label?.hidden).toBe(false);
    label?.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.events.bodyPicked.at(-1)).toEqual({ id: 'sol' });
    h.engine.dispose();
  });

  it('el encuadre ocupa la misma fracción del lado corto en apaisado y en vertical', () => {
    // En vertical manda el campo horizontal: la cámara se aleja para que el cuerpo quepa a lo ancho.
    expect(framingDistanceRadii(0.82, 40, 390 / 844)).toBeGreaterThan(DETAIL_RADII * 1.8);
    expect(framingDistanceRadii(0.82, 40, 1)).toBeCloseTo(DETAIL_RADII, 9);
  });

  it('las vistas Tierra y Luna encuadran su cuerpo de cerca', async () => {
    const h = await createHarness({ view: 'earth' });
    settle(h);
    expect(h.engine.focusedBody).toBe('tierra');
    const rig = (h.engine as unknown as { rig: { distance: number } }).rig;
    expect(rig.distance / position(h, 'tierra').r).toBeCloseTo(DETAIL_RADII, 3);
    h.engine.setView('moon');
    settle(h);
    expect(h.engine.focusedBody).toBe('luna');
    expect(rig.distance / position(h, 'luna').r).toBeCloseTo(DETAIL_RADII, 3);
    h.engine.setView('system');
    settle(h);
    expect(h.engine.focusedBody).toBeNull();
    h.engine.dispose();
  });
});

describe('SceneEngine: calidad adaptativa, contexto WebGL y limpieza', () => {
  it('con FPS bajos mientras reproduce, baja una vez y no oscila (reloj falso)', async () => {
    const h = await createHarness({ quality: 'auto' });
    expect(h.engine.qualityLevel).toBe('high');
    settle(h);
    h.engine.setSpeed(3600);
    h.engine.setPlaying(true);
    h.frames(12_000, 40); // 40 FPS: por debajo de 50 (alto), por encima de 30 (medio)
    expect(h.events.qualityChanged.filter((e) => e.reason === 'auto')).toEqual([
      { level: 'medium', setting: 'auto', reason: 'auto' },
    ]);
    h.frames(12_000, 60);
    expect(h.engine.qualityLevel).toBe('medium');
    expect(h.renderer.size.pixelRatio).toBeLessThanOrEqual(1.5);
    h.engine.dispose();
  }, 30_000);

  it('pierde y recupera el contexto WebGL sin perder el estado', async () => {
    const h = await createHarness();
    settle(h);
    h.renderer.loseContext();
    expect(h.events.contextLost).toHaveLength(1);
    h.engine.setTime(new Date('2027-01-01T00:00:00Z'));
    expect(h.scheduler.waiting).toBe(0); // sin contexto no se pinta
    const before = h.renderer.renders;
    h.renderer.restoreContext();
    expect(h.events.contextRestored).toHaveLength(1);
    settle(h);
    expect(h.renderer.renders).toBeGreaterThan(before);
    expect(h.engine.time.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    h.engine.dispose();
  });

  it('dispose() lo libera todo y deja el motor inerte', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setPlaying(true);
    h.engine.dispose();
    expect(h.renderer.disposed).toBe(true);
    expect(h.scheduler.waiting).toBe(0);
    expect(h.labels.querySelector('.scene-labels')).toBeNull();
    h.engine.setTime(new Date('2030-01-01T00:00:00Z'));
    h.engine.focus('marte');
    expect(h.scheduler.waiting).toBe(0);
    expect(SCENE_BODIES).toHaveLength(30);
  });
});

describe('SceneEngine: interfaz de la fase 3 (encuadre, vuelos, teclado, estelas y aliasing)', () => {
  type Internals = {
    screen: { index: number; x: number; y: number }[];
    rig: { distance: number; azimuth: number; elevation: number };
    look: unknown;
    frames: { output: { position: Float64Array; radius: Float64Array } };
    world: {
      scene: { getObjectByName(name: string): { visible: boolean } | undefined };
      orbits: { colors: Float32Array };
    };
    labels: { visibleLayer: boolean };
  };
  const internals = (h: Harness) => h.engine as unknown as Internals;
  const screenOf = (h: Harness, id: string) => internals(h).screen[sceneBody(id as never).index];

  it('con márgenes, el cuerpo enfocado queda en el centro de la parte visible', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'saturno' });
    settle(h);
    expect(screenOf(h, 'saturno')?.x).toBeCloseTo(WIDTH / 2, 3);
    h.engine.setViewInsets({ top: 0, right: 0, bottom: 100, left: 300 });
    settle(h);
    expect(screenOf(h, 'saturno')?.x).toBeCloseTo(300 + (WIDTH - 300) / 2, 3);
    expect(screenOf(h, 'saturno')?.y).toBeCloseTo((HEIGHT - 100) / 2, 3);
    h.engine.dispose();
  });

  it('los márgenes que llegan antes del primer tamaño del lienzo no se pierden', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'jupiter' });
    h.engine.resize(1, 1, 1);
    h.engine.setViewInsets({ top: 0, right: 320, bottom: 0, left: 0 });
    h.engine.resize(WIDTH, HEIGHT, 1);
    settle(h);
    expect(screenOf(h, 'jupiter')?.x).toBeCloseTo((WIDTH - 320) / 2, 3);
    h.engine.dispose();
  });

  it('elegir un cuerpo es un vuelo: avisa del viaje, mira primero al foco anterior y acaba enfocado', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.focus('marte');
    expect(h.events.travel).toEqual([{ active: true, kind: 'focus' }]);
    h.frames(16);
    // Al despegar, la cámara aún mira hacia el Sol (el foco anterior), no hacia Marte.
    expect(internals(h).look).not.toBeNull();
    const elapsed = settle(h);
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(h.events.travel.at(-1)).toEqual({ active: false, kind: 'focus' });
    expect(internals(h).look).toBeNull();
    h.engine.dispose();
  });

  it('cambiar de vista es un viaje de ~3 s que se puede saltar', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setView('earth');
    expect(h.events.travel).toEqual([{ active: true, kind: 'view' }]);
    h.frames(1000);
    expect(h.events.travel).toHaveLength(1); // sigue viajando
    h.engine.skipTransition();
    h.frames(32);
    expect(h.events.travel.at(-1)).toEqual({ active: false, kind: 'view' });
    const earthRadius = internals(h).frames.output.radius[sceneBody('tierra').index] as number;
    expect(internals(h).rig.distance / earthRadius).toBeCloseTo(DETAIL_RADII, 2);
    h.engine.dispose();
  });

  it('con movimiento reducido no hay viajes: el cambio de vista es un corte', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    h.engine.setView('moon');
    expect(h.events.travel).toEqual([]);
    expect(settle(h)).toBeLessThanOrEqual(32);
    h.engine.dispose();
  });

  it('el teclado gira la cámara y los botones acercan y alejan', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'jupiter' });
    settle(h);
    const before = { ...internals(h).rig };
    h.engine.orbitBy(0.2, 0.1);
    settle(h);
    expect(internals(h).rig.azimuth - before.azimuth).toBeCloseTo(0.2, 6);
    expect(internals(h).rig.elevation - before.elevation).toBeCloseTo(0.1, 6);
    h.engine.zoomBy(0.5);
    settle(h);
    expect(internals(h).rig.distance / before.distance).toBeCloseTo(0.5, 6);
    h.engine.dispose();
  });

  it('la vista limpia oculta las etiquetas', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setLabelsVisible(false);
    expect(internals(h).labels.visibleLayer).toBe(false);
    expect(h.labels.querySelector<HTMLElement>('.scene-labels')?.hidden).toBe(true);
    h.engine.setLabelsVisible(true);
    expect(internals(h).labels.visibleLayer).toBe(true);
    h.engine.dispose();
  });

  it('a tiempo real pinta a 4 Hz, no a 60, y sigue avisando al store (≤ 5 por segundo)', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setSpeed(1);
    h.engine.setPlaying(true);
    h.frames(100);
    const renders = h.renderer.renders;
    const events = h.events.timeChanged.length;
    const start = h.engine.time.getTime();
    h.frames(2000);
    expect(h.renderer.renders - renders).toBeGreaterThanOrEqual(7);
    expect(h.renderer.renders - renders).toBeLessThanOrEqual(9);
    expect(h.scheduler.delayed).toBeGreaterThan(0);
    expect(h.events.timeChanged.length - events).toBeLessThanOrEqual(10);
    // El reloj no se retrasa por pintar menos: 2 s reales son ~2 s simulados.
    expect((h.engine.time.getTime() - start) / 1000).toBeGreaterThan(1.7);
    h.engine.setPlaying(false);
    h.engine.dispose();
  });

  it('movimiento coherente: Mercurio da ~4 vueltas por cada vuelta de la Tierra, también hacia atrás', async () => {
    for (const direction of [1, -1]) {
      const h = await createHarness({ reducedMotion: true });
      settle(h);
      const angle = (id: string) => {
        const p = internals(h).frames.output.position;
        const k = 3 * sceneBody(id as never).index;
        return Math.atan2(p[k + 1] as number, p[k] as number);
      };
      const ids = ['mercurio', 'tierra'] as const;
      const turns = { mercurio: 0, tierra: 0 };
      const last = { mercurio: angle('mercurio'), tierra: angle('tierra') };
      h.engine.setSpeed(direction * 365.25 * 86_400); // 1 año/s
      h.engine.setPlaying(true);
      for (let t = 0; t < 1000; t += 1000 / 60) {
        h.frames(1000 / 60);
        for (const id of ids) {
          const now = angle(id);
          let delta = now - last[id];
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;
          turns[id] += delta / (2 * Math.PI);
          last[id] = now;
        }
      }
      h.engine.setPlaying(false);
      // En un año (algo más por el último frame), la Tierra da ~1 vuelta y Mercurio ~4,15.
      expect(direction * turns.tierra).toBeGreaterThan(0.95);
      expect(direction * turns.tierra).toBeLessThan(1.1);
      expect(turns.mercurio / turns.tierra).toBeGreaterThan(4);
      expect(turns.mercurio / turns.tierra).toBeLessThan(4.3);
      h.engine.dispose();
    }
  });

  it('a 1 año/s, Fobos (con Marte enfocado) se sustituye por su órbita; a 1 hora/s, no', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'marte' });
    settle(h);
    const fobos = () => internals(h).world.scene.getObjectByName('fobos');
    expect(fobos()?.visible).toBe(true);
    h.engine.setSpeed(365.25 * 86_400);
    h.engine.setPlaying(true);
    h.frames(300);
    expect(fobos()?.visible).toBe(false);
    // A 1 día/s avanza 18,8° por frame a 60 FPS: por debajo de la entrada (20°) pero por encima de la
    // salida (15°), así que la histéresis lo deja como órbita (no parpadea en el umbral).
    h.engine.setSpeed(86_400);
    h.frames(300);
    expect(fobos()?.visible).toBe(false);
    // A 1 hora/s, 0,8° por frame: vuelve a verse.
    h.engine.setSpeed(3600);
    h.frames(300);
    expect(fobos()?.visible).toBe(true);
    h.engine.setPlaying(false);
    h.engine.dispose();
  });

  it('al reproducir, la estela del último segundo hace más brillante la órbita junto al cuerpo', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    // El primer segmento de las órbitas es el de Mercurio, justo detrás del cuerpo.
    const head = () => internals(h).world.orbits.colors[0] as number;
    const paused = head();
    h.engine.setSpeed(86_400 * 7); // 1 semana/s: la estela cubre 7 días de los 88 de su año
    h.engine.setPlaying(true);
    h.frames(200);
    expect(head()).toBeGreaterThan(paused * 1.1);
    h.engine.setPlaying(false);
    settle(h);
    expect(head()).toBeCloseTo(paused, 6);
    h.engine.dispose();
  });
});
