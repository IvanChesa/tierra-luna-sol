import starsBin from '../../../public/data/stars.bin' with { loader: 'binary' };
import { BackSide, FrontSide, Quaternion, Texture, Vector3, Vector4 } from 'three';
import { KM_PER_AU } from '../ephemeris/constants';
import { subsolarPoint } from '../ephemeris/coordinates';
import { moonShadowCenter } from '../ephemeris/eclipse';
import { NASA_ECLIPSE_2026_08_12 } from '../ephemeris/fixtures/fixtures';
import { MAX_DATE } from '../ephemeris/time';
import {
  EngineDeps,
  FRAMING_FILL,
  FrameScheduler,
  SceneEngine,
  capFitDistance,
  circleFitDistance,
  framingDistanceRadii,
} from './engine';
import { SCHEMATIC_COLORS } from './body-colors';
import { TEXTURE_META } from './texture-meta';
import type { TextureLevel } from './quality';
import type { LoadedTexture, TextureId } from './textures';
import { hasDepthChunks } from './materials/depth';
import { ORBIT_WIDTH_PX, trailColor } from './orbits';
import { VISUAL_CONFIG } from './visual-config';
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

async function createHarness(
  overrides: Partial<SceneEngineOptions> = {},
  depsOverrides: Partial<EngineDeps> = {},
): Promise<Harness> {
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
    ...depsOverrides,
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

  it('expone la vista general con la base y un primer plano para el brillo del cuerpo', async () => {
    const overview = await createHarness();
    settle(overview);
    expect(overview.renderer.exposure).toBe(1);
    overview.engine.dispose();
    // La Luna (albedo 0,12) en primer plano: más exposición. Venus (0,689): menos.
    const moon = await createHarness({ focus: 'luna' });
    settle(moon);
    expect(moon.renderer.exposure).toBeGreaterThan(1.5);
    moon.engine.dispose();
    const venus = await createHarness({ focus: 'venus' });
    settle(venus);
    expect(venus.renderer.exposure).toBeLessThan(1);
    venus.engine.dispose();
    // La Tierra (fase 5), con sus nubes, se compensa con su albedo geométrico (0,434, que las
    // incluye): casi como la referencia (0,4). Hasta la fase 5, sin nubes, con el de su textura.
    const earth = await createHarness({ focus: 'tierra' });
    settle(earth);
    expect(earth.renderer.exposure).toBeGreaterThan(0.8);
    expect(earth.renderer.exposure).toBeLessThan(1.3);
    earth.engine.dispose();
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

  it('el casquete de una vista guiada cabe en la parte visible: su borde, al semiángulo con margen (fase 5)', () => {
    const fov = 40;
    const alpha = (0.9 * ((fov / 2) * Math.PI)) / 180;
    // Un casquete pequeño: su borde se ve justo a α del eje.
    for (const extent of [5, 14, 30]) {
      const d = capFitDistance(extent, fov, 1.5);
      const theta = (extent * Math.PI) / 180;
      expect(Math.atan(Math.sin(theta) / (d - Math.cos(theta)))).toBeCloseTo(alpha, 9);
    }
    // El disco entero (o un casquete que llega al horizonte): su radio aparente, α.
    expect(Math.asin(1 / capFitDistance(90, fov, 1.5))).toBeCloseTo(alpha, 9);
    expect(capFitDistance(80, fov, 1.5)).toBeCloseTo(capFitDistance(90, fov, 1.5), 9);
    // Crece con el casquete, en vertical manda el ancho, y 0 no exige nada.
    expect(capFitDistance(20, fov, 1.5)).toBeGreaterThan(capFitDistance(10, fov, 1.5));
    expect(capFitDistance(14, fov, 390 / 844)).toBeGreaterThan(capFitDistance(14, fov, 1.5));
    expect(capFitDistance(0, fov, 1.5)).toBe(0);
  });

  it('una vista guiada se aleja lo justo si la parte visible no deja ver su región (fase 5)', async () => {
    const h = await createHarness({ view: 'earth', reducedMotion: true });
    settle(h);
    const radii = () =>
      (h.engine as unknown as { rig: { distance: number } }).rig.distance / position(h, 'tierra').r;
    // En el lienzo entero (1200 × 800), «España» se queda a 2 radios: su región (14°) ya se ve.
    h.engine.lookAtSurface(36, -7, 2, 14);
    settle(h);
    expect(radii()).toBeCloseTo(2, 3);
    // Con un panel que tapa los dos tercios de abajo, la cámara se aleja hasta que cabe.
    h.engine.setViewInsets({ top: 0, right: 0, bottom: (2 * HEIGHT) / 3, left: 0 });
    settle(h);
    h.engine.lookAtSurface(36, -7, 2, 14);
    settle(h);
    const visibleFov = (2 * Math.atan(Math.tan((20 * Math.PI) / 180) / 3) * 180) / Math.PI;
    const expected = capFitDistance(14, visibleFov, WIDTH / (HEIGHT / 3));
    expect(expected).toBeGreaterThan(2);
    expect(radii()).toBeCloseTo(expected, 3);
    h.engine.dispose();
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
  interface Internals {
    screen: { index: number; x: number; y: number; occluded: boolean }[];
    rig: { distance: number; azimuth: number; elevation: number };
    look: unknown;
    frames: { output: { position: Float64Array; radius: Float64Array } };
    world: {
      scene: { getObjectByName(name: string): { visible: boolean } | undefined };
      orbits: { colors: Float32Array; widths: Float32Array };
      orbitSources: readonly { bodyIndex: number; segments: number }[];
    };
    labels: { visibleLayer: boolean };
  }
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

  it('las texturas enormes (la 8K) esperan a que acabe el viaje de cámara para subir (fase 5)', async () => {
    const h = await createHarness();
    settle(h);
    const engine = h.engine as unknown as { queueUpload(texture: Texture): Promise<void> };
    const image = (width: number) => ({ width, height: width / 2 }) as unknown as HTMLImageElement;
    const huge = new Texture(image(8192));
    const small = new Texture(image(4096));
    h.engine.setView('earth');
    void engine.queueUpload(huge);
    void engine.queueUpload(small);
    h.frames(500);
    // A mitad del viaje sube la de 4K, no la de 8K.
    expect(h.events.travel).toHaveLength(1);
    expect(h.renderer.uploads).toContain(small);
    expect(h.renderer.uploads).not.toContain(huge);
    settle(h);
    expect(h.events.travel.at(-1)).toEqual({ active: false, kind: 'view' });
    expect(h.renderer.uploads).toContain(huge);
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

  it('con la cámara dentro del halo de Titán (1,2 radios), se pintan sus caras interiores', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'titan' });
    settle(h);
    const shell = () =>
      internals(h).world.scene.getObjectByName('titan-atmosphere') as unknown as {
        material: { side: number };
      };
    expect(shell().material.side).toBe(FrontSide);
    // Lo más cerca que deja la cámara (1,12 radios): dentro de la esfera del halo.
    for (let k = 0; k < 40; k++) h.engine.zoomBy(0.5);
    settle(h);
    expect(shell().material.side).toBe(BackSide);
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

  it('en las vistas Tierra y Luna solo se nombran la Tierra, la Luna y el Sol', async () => {
    const h = await createHarness({ view: 'earth' });
    settle(h);
    const named = () =>
      [...h.labels.querySelectorAll<HTMLElement>('.scene-label:not([hidden])')].map(
        (el) => el.dataset['body'],
      );
    expect(named().length).toBeGreaterThan(0);
    for (const id of named()) expect(['tierra', 'luna', 'sol']).toContain(id);
    h.engine.setView('system');
    settle(h);
    expect(named().length).toBeGreaterThan(3);
    h.engine.dispose();
  });

  it('aislado (solo en captura): el cuerpo enfocado, solo y centrado, sin etiquetas ni márgenes', async () => {
    interface WorldView {
      world: {
        scene: { getObjectByName(name: string): { visible: boolean } | undefined };
        orbits: { object: { visible: boolean } };
      };
    }
    const visible = (h: Harness, name: string) =>
      (h.engine as unknown as WorldView).world.scene.getObjectByName(name)?.visible;
    const h = await createHarness({ capture: true, isolate: true, focus: 'saturno' });
    settle(h);
    // Lo que hace la sesión al conectar el motor: no cambia nada.
    h.engine.setLabelsVisible(true);
    h.engine.setViewInsets({ top: 0, right: 320, bottom: 100, left: 0 });
    settle(h);
    expect(internals(h).labels.visibleLayer).toBe(false);
    expect(screenOf(h, 'saturno')?.x).toBeCloseTo(WIDTH / 2, 3);
    expect(screenOf(h, 'saturno')?.y).toBeCloseTo(HEIGHT / 2, 3);
    expect(visible(h, 'saturno')).toBe(true);
    expect(visible(h, 'saturn-rings')).toBe(true);
    for (const name of ['sol', 'jupiter', 'titan', 'sun-halo', 'milky-way']) {
      expect(visible(h, name), name).toBe(false);
    }
    expect((h.engine as unknown as WorldView).world.orbits.object.visible).toBe(false);
    h.engine.dispose();

    // Fuera del modo de captura no existe.
    const normal = await createHarness({ isolate: true, focus: 'saturno' });
    settle(normal);
    expect(visible(normal, 'jupiter')).toBe(true);
    expect(internals(normal).labels.visibleLayer).toBe(true);
    normal.engine.dispose();
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

  it('a tiempo real el reloj sigue al de pared: también con la pestaña oculta y al pausar', async () => {
    const h = await createHarness();
    settle(h);
    h.engine.setSpeed(1);
    h.engine.setPlaying(true);
    const start = h.engine.time.getTime();
    const wall = h.clock.now;
    h.frames(1000);
    h.page.hidden = true;
    h.page.notify();
    h.clock.now += 10_000; // diez segundos con la pestaña oculta
    h.page.hidden = false;
    h.page.notify();
    h.frames(600);
    // Lo simulado es lo que ha pasado de verdad, salvo lo que va desde el último frame (4 Hz).
    const behind = h.clock.now - wall - (h.engine.time.getTime() - start);
    expect(behind).toBeGreaterThanOrEqual(-1);
    expect(behind).toBeLessThan(300);
    // Al pausar, se pone al día con lo que ha pasado desde ese frame.
    h.clock.now += 200;
    h.engine.setPlaying(false);
    expect(Math.abs(h.clock.now - wall - (h.engine.time.getTime() - start))).toBeLessThanOrEqual(1);
    // Hacia atrás, igual.
    h.engine.setSpeed(-1);
    h.engine.setPlaying(true);
    const back = h.engine.time.getTime();
    h.clock.now += 5000;
    h.engine.setPlaying(false);
    expect(back - h.engine.time.getTime()).toBeCloseTo(5000, -1);
    h.engine.dispose();
  });

  it('la vista general encuadra la órbita entera, también el lado cercano (perspectiva)', () => {
    const radius = 100;
    for (const [elevation, tanH, tanV] of [
      [0.42, 0.55, 0.33], // escritorio: manda el lado cercano, abajo
      [0.42, 0.2, 0.45], // móvil vertical: manda el ancho
      [0.9, 0.4, 0.4],
    ] as const) {
      const d = circleFitDistance(radius, elevation, tanH, tanV);
      let x = 0;
      let y = 0;
      for (let k = 0; k < 3600; k++) {
        const theta = (k / 3600) * 2 * Math.PI;
        const depth = d - radius * Math.cos(elevation) * Math.sin(theta);
        x = Math.max(x, Math.abs(radius * Math.cos(theta)) / depth);
        y = Math.max(y, Math.abs(radius * Math.sin(elevation) * Math.sin(theta)) / depth);
      }
      expect(x).toBeLessThanOrEqual(tanH * (1 + 1e-9));
      expect(y).toBeLessThanOrEqual(tanV * (1 + 1e-9));
      // Ajustada: por un lado toca el borde.
      expect(Math.max(x / tanH, y / tanV)).toBeGreaterThan(0.9999);
    }
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
    expect(h.engine.stats().aliased).toEqual([]);
    h.engine.setSpeed(365.25 * 86_400);
    h.engine.setPlaying(true);
    h.frames(300);
    expect(fobos()?.visible).toBe(false);
    // Las cifras lo dicen también (los e2e lo miran ahí): Fobos y Deimos van como órbita.
    expect(h.engine.stats().aliased).toEqual(expect.arrayContaining(['fobos', 'deimos']));
    // A 1 día/s avanza 18,8° por frame a 60 FPS: por debajo de la entrada (20°) pero por encima de la
    // salida (15°), así que la histéresis lo deja como órbita (no parpadea en el umbral).
    h.engine.setSpeed(86_400);
    h.frames(300);
    expect(fobos()?.visible).toBe(false);
    // A 1 hora/s, 0,8° por frame: vuelve a verse.
    h.engine.setSpeed(3600);
    h.frames(300);
    expect(fobos()?.visible).toBe(true);
    expect(h.engine.stats().aliased).not.toContain('fobos');
    h.engine.setPlaying(false);
    h.engine.dispose();
  });

  it('cada cuerpo lleva detrás una estela de su color, también en pausa; hacia atrás, delante (D34)', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    const world = internals(h).world;
    // La primera órbita es la de Mercurio: su primer vértice está en el cuerpo y el último vuelve a
    // él por delante (tras sus n segmentos hacia atrás).
    const mercury = world.orbitSources[0];
    expect(mercury?.bodyIndex).toBe(sceneBody('mercurio').index);
    const last = 6 * (mercury?.segments ?? 0) + 3;
    const rgb = (o: number) => Array.from(world.orbits.colors.subarray(o, o + 3));
    const hue = ([r, , b]: number[]) => (r as number) / (b as number);
    const tint = trailColor(SCHEMATIC_COLORS.mercurio);
    // A media vuelta, solo la órbita (gris azulada: b > r).
    const orbitHue = hue(rgb(6 * Math.floor((mercury?.segments ?? 0) / 2)));
    expect(orbitHue).toBeLessThan(1);
    // En pausa, la estela ya está: junto al cuerpo, el color de Mercurio (r > b).
    expect(hue(rgb(0))).toBeCloseTo(tint.r / tint.b, 5);
    const ahead = rgb(last);
    expect(hue(ahead)).toBeLessThan(1);
    // Hacia atrás en el tiempo (también en pausa), la estela pasa delante del cuerpo.
    h.engine.setSpeed(-3600);
    settle(h);
    expect(hue(rgb(last))).toBeCloseTo(tint.r / tint.b, 5);
    expect(hue(rgb(0))).toBeCloseTo(orbitHue, 5);
    // Y vuelve detrás al reproducir hacia delante.
    h.engine.setSpeed(3 * 86_400);
    h.engine.setPlaying(true);
    h.frames(10);
    expect(hue(rgb(0))).toBeCloseTo(tint.r / tint.b, 5);
    h.engine.setPlaying(false);
    // Junto al cuerpo, la estela engorda hasta su grosor completo (en múltiplos del de la órbita), y
    // a media vuelta queda el de la órbita.
    const { widthPx } = VISUAL_CONFIG.trails.planet;
    expect(world.orbits.widths[0]).toBeCloseTo(widthPx / ORBIT_WIDTH_PX, 5);
    expect(world.orbits.widths[2 * Math.floor((mercury?.segments ?? 0) / 2)]).toBe(1);
    h.engine.dispose();
  });

  it('el punto subsolar que recibe el shader de la Tierra: +23,4° y 0° el 21-06-2026 a las 12:00 UTC (fase 5)', async () => {
    const date = new Date('2026-06-21T12:00:00Z');
    const h = await createHarness({ reducedMotion: true, focus: 'tierra', time: date });
    settle(h);
    interface EarthVisual {
      body: { id: string };
      mesh: { quaternion: Quaternion };
      uniforms: { uSunDirection: { value: Vector3 } };
    }
    const earth = (internals(h).world as unknown as { visuals: EarthVisual[] }).visuals.find(
      (visual) => visual.body.id === 'tierra',
    );
    // La dirección del Sol del material (mundo), en el sistema propio de la Tierra (Y, el polo;
    // el meridiano 0 en +X y la longitud este hacia −Z, como la esfera de three).
    const local = (earth?.uniforms.uSunDirection.value.clone() ?? new Vector3()).applyQuaternion(
      (earth?.mesh.quaternion.clone() ?? new Quaternion()).invert(),
    );
    const latDeg = (Math.asin(local.y) * 180) / Math.PI;
    const lonDeg = (Math.atan2(-local.z, local.x) * 180) / Math.PI;
    expect(Math.abs(latDeg - 23.4)).toBeLessThan(2);
    expect(Math.abs(lonDeg)).toBeLessThan(2);
    // Y coincide con el de `subsolarPoint` (la misma orientación de la Tierra), a menos de 0,05°.
    const expected = subsolarPoint(date);
    expect(Math.abs(latDeg - expected.latDeg)).toBeLessThan(0.05);
    expect(Math.abs(lonDeg - expected.lonDeg)).toBeLessThan(0.05);
    h.engine.dispose();
  });

  it('la sombra de la Luna que recibe el shader de la Tierra cae donde el catálogo de la NASA (fase 5)', async () => {
    const eclipse = NASA_ECLIPSE_2026_08_12;
    const date = new Date(eclipse.greatestEclipseUt);
    const h = await createHarness({ reducedMotion: true, focus: 'tierra', time: date });
    settle(h);
    interface EarthVisual {
      body: { id: string };
      earth: {
        uMoonLocal: { value: Vector4 };
        uSunLocal: { value: Vector4 };
        uArid: { value: Vector3 };
      } | null;
    }
    const earth = (internals(h).world as unknown as { visuals: EarthVisual[] }).visuals.find(
      (visual) => visual.body.id === 'tierra',
    )?.earth;
    if (!earth) throw new Error('Sin uniformes de la Tierra');
    // El eje de la sombra con lo que recibe el shader (sistema propio de la malla, en radios
    // ecuatoriales): desde la Luna, en la dirección del Sol a la Luna, hasta el elipsoide de la malla (el
    // polo, en Y, achatado como la Tierra), que es donde el shader mira cada punto.
    const squash = 1 - sceneBody('tierra').flattening;
    const moon = new Vector3().copy(earth.uMoonLocal.value as unknown as Vector3);
    const sun = new Vector3().copy(earth.uSunLocal.value as unknown as Vector3);
    const from = new Vector3(moon.x, moon.y / squash, moon.z);
    const direction = moon.clone().sub(sun);
    const axis = new Vector3(direction.x, direction.y / squash, direction.z).normalize();
    const b = from.dot(axis);
    const t = -b - Math.sqrt(b * b - (from.lengthSq() - 1));
    const hit = from.clone().addScaledVector(axis, t);
    hit.y *= squash;
    // Latitud geodésica (la de la normal del elipsoide) y longitud este (hacia −Z).
    const e2 = 1 - squash * squash;
    const latDeg = (Math.atan2(hit.y, (1 - e2) * Math.hypot(hit.x, hit.z)) * 180) / Math.PI;
    const lonDeg = (Math.atan2(-hit.z, hit.x) * 180) / Math.PI;
    // A ±0,1° de la ficha (el plan pide ±1°): el Sol que recibe, el aparente (con la aberración).
    expect(Math.abs(latDeg - eclipse.latitudeDeg)).toBeLessThan(0.1);
    expect(Math.abs(lonDeg - eclipse.longitudeDeg)).toBeLessThan(0.1);
    // Y con la función de efemérides (con el elipsoide WGS84: unas centésimas de grado).
    const center = moonShadowCenter(date);
    expect(Math.abs(latDeg - (center?.latDeg ?? 0))).toBeLessThan(0.1);
    expect(Math.abs(lonDeg - (center?.lonDeg ?? 0))).toBeLessThan(0.1);
    // El radio angular del Sol desde la Tierra (~0,26°) y el de la Luna en radios terrestres (~0,27).
    expect((Math.atan(earth.uSunLocal.value.w / sun.length()) * 180) / Math.PI).toBeCloseTo(
      0.263,
      2,
    );
    expect(earth.uMoonLocal.value.w).toBeCloseTo(0.272, 2);
    // Y las tierras áridas, con su compresión de la configuración visual (calibrada con EPIC).
    const { knee, warmFrom, warmTo } = VISUAL_CONFIG.earth.arid;
    expect(earth.uArid.value.toArray()).toEqual([knee, warmFrom, warmTo]);
    h.engine.dispose();
  });

  it('la Tierra pide sus nubes también en la vista general; la noche, la máscara y las normales, solo de cerca (fase 5)', async () => {
    // Una fuente de texturas falsa que apunta qué se pide (y lo sirve al momento). Los mapas de la
    // Tierra ocupan 1 MiB cada uno, y los demás, casi nada: la VRAM del motor tiene que contarlos.
    const withRequests = async (focus: SceneEngineOptions['focus']) => {
      const requests: string[] = [];
      const source = {
        load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> => {
          requests.push(id);
          return Promise.resolve({
            texture: new Texture(),
            file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
            vramBytes: id.startsWith('earth-') ? 1_048_576 : 32,
          });
        },
      };
      const h = await createHarness(
        { reducedMotion: true, focus },
        { textures: () => ({ source, meta: TEXTURE_META }) },
      );
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
      const { vramMB } = h.engine.stats();
      h.engine.dispose();
      return { requests, vramMB };
    };
    const overview = await withRequests(null);
    expect(overview.requests).toContain('earth-day');
    expect(overview.requests).toContain('earth-clouds');
    for (const id of ['earth-night', 'earth-specular', 'earth-normal']) {
      expect(overview.requests, id).not.toContain(id);
    }
    // En la vista general, el día y las nubes (revisión de la fase 5, hallazgo 2).
    expect(overview.vramMB).toBeGreaterThanOrEqual(2);
    expect(overview.vramMB).toBeLessThan(3);
    const earth = await withRequests('tierra');
    for (const id of ['earth-clouds', 'earth-night', 'earth-specular', 'earth-normal']) {
      expect(earth.requests, id).toContain(id);
    }
    // De cerca, los cinco: el día, las normales, las nubes, la noche y la máscara del océano.
    expect(earth.vramMB).toBeGreaterThanOrEqual(5);
    expect(earth.vramMB).toBeLessThan(6);
  });

  it('las nubes derivan con los frames pintados: sin pintar no se mueven, y al volver no saltan (fase 5)', async () => {
    const h = await createHarness({ focus: 'tierra' });
    h.engine.setPlaying(false);
    settle(h);
    interface EarthVisual {
      earth: { uCloudOffset: { value: number } } | null;
    }
    const offset = () =>
      (internals(h).world as unknown as { visuals: EarthVisual[] }).visuals.find(
        (visual) => visual.earth,
      )?.earth?.uCloudOffset.value ?? Number.NaN;
    const { cloudDrift } = VISUAL_CONFIG.earth;
    // Diez segundos reproduciendo: diez segundos de deriva (el primer frame cuenta 16 ms).
    h.engine.setPlaying(true);
    const start = offset();
    h.frames(10_000);
    expect((offset() - start) / cloudDrift).toBeGreaterThan(9.7);
    expect((offset() - start) / cloudDrift).toBeLessThan(10.1);
    // En pausa y sin mover la cámara no se pinta: un minuto después, un frame no la hace saltar
    // (con el reloj de pared, serían 60 s de golpe: 8,6° de longitud).
    h.engine.setPlaying(false);
    settle(h);
    const paused = offset();
    h.clock.now += 60_000;
    h.engine.zoomBy(0.999);
    settle(h);
    expect(offset() - paused).toBeGreaterThan(0);
    expect(offset() - paused).toBeLessThan(2 * cloudDrift);
    h.engine.dispose();
  });

  it('las lunas de un sistema que no se distingue no se dibujan; al enfocar su planeta, sí (fase 4b)', async () => {
    const visible = (h: Harness, id: string) =>
      internals(h).world.scene.getObjectByName(id)?.visible;
    // En la vista general, los sistemas compactos miden unos píxeles: sus lunas no se ven, ni se
    // nombran, ni tapan a su planeta.
    const overview = await createHarness({ reducedMotion: true });
    settle(overview);
    expect(visible(overview, 'jupiter')).toBe(true);
    for (const moon of ['luna', 'io', 'calisto', 'titan', 'triton']) {
      expect(visible(overview, moon), moon).toBe(false);
    }
    expect(screenOf(overview, 'saturno')?.occluded).toBe(false);
    overview.engine.dispose();
    // Al enfocar Júpiter (su sistema local físico), sus lunas aparecen.
    const jupiter = await createHarness({ reducedMotion: true, focus: 'jupiter' });
    settle(jupiter);
    for (const moon of ['io', 'europa', 'ganimedes', 'calisto']) {
      expect(visible(jupiter, moon), moon).toBe(true);
    }
    jupiter.engine.dispose();
  });

  it('la estela de una órbita en segundo plano es más fina (D34)', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'mercurio' });
    settle(h);
    // Con Mercurio enfocado, su órbita queda tenue (opacidad 0,3, `World.orbitOpacity`): su estela
    // engorda en proporción a esa opacidad respecto a la de la vista general.
    const head = internals(h).world.orbits.widths[0] as number;
    const widen = VISUAL_CONFIG.trails.planet.widthPx / ORBIT_WIDTH_PX - 1;
    expect(head).toBeCloseTo(1 + (widen * 0.3) / VISUAL_CONFIG.overviewOrbitOpacity, 5);
    h.engine.dispose();
  });
});
