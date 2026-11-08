import starsBin from '../../../public/data/stars.bin' with { loader: 'binary' };
import deimosBin from '../../../public/data/shapes/deimos.bin' with { loader: 'binary' };
import phobosBin from '../../../public/data/shapes/phobos.bin' with { loader: 'binary' };
import { Libration } from 'astronomy-engine';
import { BackSide, Color, FrontSide, Mesh, Quaternion, Texture, Vector3, Vector4 } from 'three';
import type { BodyId } from '../data/body.model';
import { BODY_PHOTOMETRY } from '../data/photometry';
import { KM_PER_AU } from '../ephemeris/constants';
import { subsolarPoint } from '../ephemeris/coordinates';
import { earthShadow, moonShadowCenter, satelliteShadowPoint } from '../ephemeris/eclipse';
import { NASA_ECLIPSE_2026_08_12, USNO_MOON_PHASES } from '../ephemeris/fixtures/fixtures';
import { moonPhase } from '../ephemeris/ephemeris';
import { albedoScale } from '../ephemeris/photometry';
import { illustrativeRadius } from '../ephemeris/scale';
import { MAX_DATE, toAstroTime } from '../ephemeris/time';
import { length, scale } from '../ephemeris/vec3';
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
import { QUALITY_PROFILES } from './quality';
import type { TextureLevel } from './quality';
import { chooseTextureFile, textureVramBytes } from './textures';
import type { LoadedTexture, TextureId } from './textures';
import { TEXTURE_ALBEDO_REFERENCE, TEXTURE_FILES } from './texture-files';
import { SHAPE_FILES } from './shape-files';
import { hasDepthChunks } from './materials/depth';
import { ORBIT_WIDTH_PX, trailColor } from './orbits';
import { VISUAL_CONFIG } from './visual-config';
import type {
  RendererCapabilities,
  RendererInfo,
  RendererPort,
  SunBloomOptions,
  SunBloomPort,
} from './renderer';
import { SCENE_BODIES, createSolarSystemModel, sceneBody } from './system';
import type { SceneEngineEventName, SceneEngineEvents, SceneEngineOptions } from './types';

const WIDTH = 1200;
const HEIGHT = 800;
const START = new Date('2026-10-24T00:00:00Z');
/** Distancias de encuadre (en radios) con la cámara de 40° y la vista de los tests. */
const BODY_RADII = framingDistanceRadii(FRAMING_FILL.body, 40, WIDTH / HEIGHT);
const DETAIL_RADII = framingDistanceRadii(FRAMING_FILL.detail, 40, WIDTH / HEIGHT);

/** El bloom del Sol falso (fase 9b): cuenta lo que se le pide; existe (y ocupa) desde que se usa. */
class FakeSunBloom implements SunBloomPort {
  compiles = 0;
  releases = 0;
  readonly renders: SunBloomOptions[] = [];
  private alive = false;
  compile(): Promise<void> {
    this.compiles++;
    this.alive = true;
    return Promise.resolve();
  }
  render(_scene: unknown, _camera: unknown, options: SunBloomOptions): void {
    this.renders.push(options);
    this.alive = true;
  }
  vramBytes(): number {
    return this.alive ? 7 * 1_048_576 : 0;
  }
  release(): void {
    this.releases++;
    this.alive = false;
  }
}

/** Renderer falso: cuenta lo que se le pide y permite simular la pérdida del contexto. */
class FakeRenderer implements RendererPort {
  readonly capabilities: RendererCapabilities = {
    maxTextureSize: 16_384,
    maxAnisotropy: 16,
    depth: 'logarithmic',
    reversedDepthSupported: false,
  };
  readonly sunBloom = new FakeSunBloom();
  renders = 0;
  compiles = 0;
  /** Si se pone, las compilaciones esperan a esta promesa (para ver qué pasa mientras compilan). */
  compileGate: Promise<void> | null = null;
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
    return this.compileGate ?? Promise.resolve();
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
    // La esfera cúbica de la Luna (unos 200 000 triángulos) se crea al entrar en su vista: con la suite
    // entera en paralelo, rozaba los 5 s por defecto.
  }, 20_000);
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

describe('SceneEngine: el bloom del Sol (fase 9b, D41)', () => {
  const SUN = sceneBody('sol').index;
  const sunOnScreen = (h: Harness) =>
    (h.engine as unknown as { screen: { onScreen: boolean }[] }).screen[SUN]?.onScreen;

  it('en el nivel alto se compila antes del primer frame y va en cada frame con el Sol en pantalla; su VRAM cuenta', async () => {
    const h = await createHarness();
    const bloom = h.renderer.sunBloom;
    // Antes del primer frame (en la vista general, el Sol se ve desde el primero).
    expect(bloom.compiles).toBe(1);
    settle(h);
    expect(sunOnScreen(h)).toBe(true);
    expect(bloom.renders.length).toBeGreaterThan(0);
    expect(bloom.renders.length).toBe(h.renderer.renders);
    // La VRAM de las estadísticas lleva la del bloom (7 MB en el falso).
    const withBloom = h.engine.stats().vramMB;
    bloom.release();
    expect(h.engine.stats().vramMB).toBeCloseTo(withBloom - 7, 6);
    h.engine.dispose();
  });

  it('en el medio también; en el bajo, solo el halo, y al bajar a él sus render targets se liberan', async () => {
    const medium = await createHarness({ quality: 'medium' });
    settle(medium);
    const bloom = medium.renderer.sunBloom;
    expect(bloom.compiles).toBe(1);
    expect(bloom.renders.length).toBeGreaterThan(0);
    medium.engine.setQuality('low');
    settle(medium);
    expect(bloom.releases).toBe(1);
    expect(bloom.vramBytes()).toBe(0);
    const before = bloom.renders.length;
    medium.engine.setTime(new Date('2030-01-01T00:00:00Z'));
    settle(medium);
    expect(bloom.renders.length).toBe(before);
    medium.engine.dispose();
    const low = await createHarness({ quality: 'low' });
    settle(low);
    expect(low.renderer.sunBloom.compiles).toBe(0);
    expect(low.renderer.sunBloom.renders).toEqual([]);
    low.engine.dispose();
  });

  it('su fuerza y su forma: las de la vista general y, con el Sol de cerca, las del primer plano', async () => {
    const { overview, closeUp } = VISUAL_CONFIG.sun.bloom;
    const far = await createHarness();
    settle(far);
    const wide = far.renderer.sunBloom.renders.at(-1);
    expect(wide?.strength).toBeCloseTo(overview.strength, 9);
    wide?.factors.forEach((f, k) => expect(f).toBeCloseTo(overview.factors[k] as number, 9));
    far.engine.dispose();
    const near = await createHarness({ focus: 'sol' });
    settle(near);
    const tight = near.renderer.sunBloom.renders.at(-1);
    expect(tight?.strength).toBeCloseTo(closeUp.strength, 9);
    tight?.factors.forEach((f, k) => expect(f).toBeCloseTo(closeUp.factors[k] as number, 9));
    near.engine.dispose();
  });

  it('en las vistas Tierra, Luna y cielo, sin bloom y sin su memoria; al volver al sistema solar, vuelve sin compilar otra vez', async () => {
    const h = await createHarness({ view: 'earth' });
    settle(h);
    const bloom = h.renderer.sunBloom;
    // Se compila al arrancar (para no hacerlo de golpe después), pero su memoria se suelta.
    expect(bloom.compiles).toBe(1);
    expect(bloom.releases).toBeGreaterThanOrEqual(1);
    expect(bloom.vramBytes()).toBe(0);
    expect(bloom.renders).toEqual([]);
    h.engine.setView('system');
    h.engine.skipTransition();
    settle(h);
    expect(sunOnScreen(h)).toBe(true);
    expect(bloom.renders.length).toBeGreaterThan(0);
    expect(bloom.compiles).toBe(1);
    const releases = bloom.releases;
    h.engine.setView('moon');
    settle(h);
    expect(bloom.releases).toBe(releases + 1);
    expect(bloom.vramBytes()).toBe(0);
    const renders = bloom.renders.length;
    h.engine.setTime(new Date('2030-01-01T00:00:00Z'));
    settle(h);
    expect(bloom.renders.length).toBe(renders);
    h.engine.dispose();
  });

  it('al subir a mano desde el nivel bajo, sus sombreados se compilan sin bloquear y después se pinta', async () => {
    const h = await createHarness({ quality: 'low' });
    settle(h);
    const bloom = h.renderer.sunBloom;
    expect(bloom.compiles).toBe(0);
    h.engine.setQuality('medium');
    for (let k = 0; k < 3; k++) await flush();
    expect(bloom.compiles).toBe(1);
    settle(h);
    expect(bloom.renders.length).toBeGreaterThan(0);
    h.engine.dispose();
  });

  it('sin bloom al medir el limbo (solo en captura) ni en la miniatura aislada de otro cuerpo', async () => {
    const measure = await createHarness({ capture: true, focus: 'sol', sunMeasure: true });
    settle(measure);
    expect(measure.renderer.sunBloom.compiles).toBe(0);
    expect(measure.renderer.sunBloom.renders).toEqual([]);
    measure.engine.dispose();
    // Fuera del modo de captura, la opción no hace nada.
    const normal = await createHarness({ focus: 'sol', sunMeasure: true });
    settle(normal);
    expect(normal.renderer.sunBloom.renders.length).toBeGreaterThan(0);
    normal.engine.dispose();
    const jupiter = await createHarness({ capture: true, focus: 'jupiter', isolate: true });
    settle(jupiter);
    expect(jupiter.renderer.sunBloom.renders).toEqual([]);
    jupiter.engine.dispose();
    // La miniatura del propio Sol, sí.
    const sun = await createHarness({ capture: true, focus: 'sol', isolate: true });
    settle(sun);
    expect(sun.renderer.sunBloom.renders.length).toBeGreaterThan(0);
    sun.engine.dispose();
  });

  interface SunInternals {
    world: {
      sun: { uniforms: { uTime: { value: number }; uGranulation: { value: number } } };
      haloMaterial: { uniforms: { uIntensity: { value: number } } };
    };
  }
  const sunOf = (h: Harness) => (h.engine as unknown as SunInternals).world;

  it('la granulación del Sol de cerca se mueve con el reloj de pared; con movimiento reducido y en las capturas, quieta', async () => {
    const moving = await createHarness({ focus: 'sol' });
    settle(moving);
    moving.engine.setSpeed(3600);
    moving.engine.setPlaying(true);
    moving.frames(500);
    const before = sunOf(moving).sun.uniforms.uTime.value;
    moving.frames(500);
    expect(sunOf(moving).sun.uniforms.uTime.value).toBeGreaterThan(before);
    expect(sunOf(moving).sun.uniforms.uGranulation.value).toBeGreaterThan(0);
    moving.engine.dispose();
    for (const options of [{ reducedMotion: true }, { capture: true }]) {
      const still = await createHarness({ focus: 'sol', ...options });
      settle(still);
      still.engine.setSpeed(3600);
      still.engine.setPlaying(true);
      still.frames(1000);
      expect(sunOf(still).sun.uniforms.uTime.value).toBe(0);
      still.engine.dispose();
    }
  });

  it('con bloom, el halo del Sol es más tenue: el resplandor lo pone el bloom', async () => {
    const withBloom = await createHarness();
    settle(withBloom);
    const dimmed = sunOf(withBloom).haloMaterial.uniforms.uIntensity.value;
    withBloom.engine.dispose();
    const low = await createHarness({ quality: 'low' });
    settle(low);
    const full = sunOf(low).haloMaterial.uniforms.uIntensity.value;
    low.engine.dispose();
    expect(full).toBeCloseTo(VISUAL_CONFIG.sun.halo.overview.intensity, 9);
    expect(dimmed).toBeCloseTo(full * VISUAL_CONFIG.sun.halo.withBloom, 9);
  });
});

describe('SceneEngine: interfaz de la fase 3 (encuadre, vuelos, teclado, estelas y aliasing)', () => {
  interface Internals {
    screen: {
      index: number;
      x: number;
      y: number;
      radiusPx: number;
      occluded: boolean;
      onScreen: boolean;
    }[];
    rig: { distance: number; azimuth: number; elevation: number };
    look: unknown;
    frames: { output: { position: Float64Array; radius: Float64Array } };
    world: {
      scene: { getObjectByName(name: string): { visible: boolean } | undefined };
      orbits: { colors: Float32Array; widths: Float32Array; drawnOpacity: readonly number[] };
      orbitSources: readonly { bodyIndex: number; segments: number }[];
    };
    labels: { visibleLayer: boolean };
    markerRadius: Float64Array;
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

  it('las texturas del primer plano (2k y más) esperan a que acabe el viaje de cámara para subir (fases 5 y 6)', async () => {
    const h = await createHarness();
    settle(h);
    const engine = h.engine as unknown as { queueUpload(texture: Texture): Promise<void> };
    const image = (width: number) => ({ width, height: width / 2 }) as unknown as HTMLImageElement;
    const huge = new Texture(image(8192));
    const near = new Texture(image(2048));
    const small = new Texture(image(1024));
    h.engine.setView('earth');
    void engine.queueUpload(huge);
    void engine.queueUpload(near);
    void engine.queueUpload(small);
    h.frames(500);
    // A mitad del viaje sube la de 1k, no las del primer plano.
    expect(h.events.travel).toHaveLength(1);
    expect(h.renderer.uploads).toContain(small);
    expect(h.renderer.uploads).not.toContain(near);
    expect(h.renderer.uploads).not.toContain(huge);
    settle(h);
    expect(h.events.travel.at(-1)).toEqual({ active: false, kind: 'view' });
    expect(h.renderer.uploads).toContain(near);
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

  it('el halo de Titán no desaparece al acercarse: con la cámara dentro de su esfera se pintarían sus caras interiores', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'titan' });
    settle(h);
    const shell = () =>
      internals(h).world.scene.getObjectByName('titan-atmosphere') as unknown as {
        material: { side: number };
        visible: boolean;
        scale: { x: number };
      };
    expect(shell().material.side).toBe(FrontSide);
    // Lo más cerca que deja la cámara (1,12 radios). Desde la fase 7 (el halo de PIA06230), la esfera
    // del halo mide 1,085 radios: la cámara se queda fuera y el halo, visible por delante.
    for (let k = 0; k < 40; k++) h.engine.zoomBy(0.5);
    settle(h);
    const titan = internals(h).world.scene.getObjectByName('titan') as unknown as {
      position: Vector3;
      scale: Vector3;
    };
    const world = internals(h).world as unknown as { camera: { position: Vector3 } };
    const distance = world.camera.position.distanceTo(titan.position);
    const inside = distance < titan.scale.x * shell().scale.x;
    expect(shell().visible).toBe(true);
    expect(shell().material.side).toBe(inside ? BackSide : FrontSide);
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

  it('en un móvil en vertical, ningún planeta mide menos de 2 px de radio en la vista general; enfocado, sí su tamaño (C3)', async () => {
    const h = await createHarness({ reducedMotion: true });
    h.engine.resize(390, 844, 2);
    settle(h);
    const planets = [
      'mercurio',
      'venus',
      'tierra',
      'marte',
      'jupiter',
      'saturno',
      'urano',
      'neptuno',
    ];
    for (const id of planets) {
      expect(screenOf(h, id)?.radiusPx, id).toBeGreaterThanOrEqual(2 - 1e-6);
    }
    // Se ven como discos: sin el anillo de marcador (revisión, hallazgo 1).
    const marked = () =>
      [...h.labels.querySelectorAll<HTMLElement>('.scene-label--marker')]
        .filter((label) => !label.hidden)
        .map((label) => label.dataset['body']);
    for (const id of planets) expect(marked(), id).not.toContain(id);
    // Los rocosos medirían menos sin el mínimo: Mercurio, en el móvil, ~1,5 px (fase 4b: 1,2).
    const mercury = internals(h).frames.output.radius[sceneBody('mercurio').index] as number;
    expect(mercury).toBeGreaterThan(illustrativeRadius(sceneBody('mercurio').radiusKm) * 1.1);
    // Con Júpiter enfocado (su sistema local físico), los demás vuelven a su tamaño: Mercurio, sin el
    // mínimo, a lo lejos.
    h.engine.focus('jupiter');
    settle(h);
    expect(screenOf(h, 'mercurio')?.radiusPx).toBeLessThan(1);
    // Ahí, los diminutos vuelven a llevar su marcador (si se nombran).
    expect(internals(h).markerRadius[sceneBody('mercurio').index]).toBe(3);
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

  it('la sombra de la Tierra que recibe el shader de la Luna: su centro, en la umbra en el eclipse del 3-3-2026, y fuera de ella en una luna llena (fase 6)', async () => {
    interface MoonVisual {
      body: { id: string };
      moon: {
        uOccluderLocal: { value: Vector4 };
        uSunLocal: { value: Vector4 };
        uUmbraLight: { value: { r: number; g: number; b: number } };
      } | null;
    }
    /** Desde el centro de la Luna: radios aparentes de la Tierra y del Sol y separación (grados). */
    const geometry = async (iso: string) => {
      const h = await createHarness({ reducedMotion: true, focus: 'luna', time: new Date(iso) });
      settle(h);
      const moon = (internals(h).world as unknown as { visuals: MoonVisual[] }).visuals.find(
        (visual) => visual.body.id === 'luna',
      )?.moon;
      if (!moon) throw new Error('Sin uniformes de la Luna');
      const earth = new Vector3().copy(moon.uOccluderLocal.value as unknown as Vector3);
      const sun = new Vector3().copy(moon.uSunLocal.value as unknown as Vector3);
      const deg = 180 / Math.PI;
      const result = {
        earthDeg: Math.asin(moon.uOccluderLocal.value.w / earth.length()) * deg,
        sunDeg: Math.asin(moon.uSunLocal.value.w / sun.length()) * deg,
        separationDeg: earth.angleTo(sun) * deg,
        umbraLight: moon.uUmbraLight.value,
      };
      h.engine.dispose();
      return result;
    };
    const iso = '2026-03-03T11:33:37Z';
    const eclipse = await geometry(iso);
    const shadow = earthShadow(new Date(iso));
    // El centro de la Luna, dentro de la umbra, con el margen de `earthShadow` (radio de la umbra menos
    // la distancia al eje, vistos desde la Tierra): las dos geometrías son la misma.
    const margin = eclipse.earthDeg - eclipse.sunDeg - eclipse.separationDeg;
    expect(margin).toBeGreaterThan(0);
    expect(Math.abs(margin - (shadow.umbraDeg - shadow.axisDeg))).toBeLessThan(0.01);
    // La luz de la umbra, rojiza.
    expect(eclipse.umbraLight.r).toBeGreaterThan(2 * eclipse.umbraLight.b);
    // En la luna llena de noviembre, la Tierra no tapa el Sol: separación mayor que la suma de radios.
    const full = await geometry('2026-11-24T14:54:00Z');
    expect(full.separationDeg).toBeGreaterThan(full.earthDeg + full.sunDeg);
  });

  it('la fase de la Luna en la escena es la de la ficha (moonPhase) y la del USNO en sus fases de 2026 (fase 6)', async () => {
    interface MoonVisual {
      body: { id: string };
      moon: { uOccluderLocal: { value: Vector4 }; uSunLocal: { value: Vector4 } } | null;
    }
    const phases = USNO_MOON_PHASES.series.find((series) => series.year === 2026)?.phases ?? [];
    const sample = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'].map(
      (name) => phases.find(([phase, iso]) => phase === name && iso >= '2026-10-01') ?? ['', ''],
    );
    const expected: Record<string, number> = {
      'New Moon': 0,
      'First Quarter': 0.5,
      'Full Moon': 1,
      'Last Quarter': 0.5,
    };
    for (const [name, iso] of sample) {
      const date = new Date(iso);
      const h = await createHarness({ reducedMotion: true, focus: 'luna', time: date });
      settle(h);
      const moon = (internals(h).world as unknown as { visuals: MoonVisual[] }).visuals.find(
        (visual) => visual.body.id === 'luna',
      )?.moon;
      if (!moon) throw new Error('Sin uniformes de la Luna');
      // Lo que ilumina el shader visto desde la Tierra: el ángulo de fase entre el Sol y la Tierra.
      const earth = new Vector3().copy(moon.uOccluderLocal.value as unknown as Vector3);
      const sun = new Vector3().copy(moon.uSunLocal.value as unknown as Vector3);
      const lit = (1 + Math.cos(earth.angleTo(sun))) / 2;
      expect(Math.abs(lit - moonPhase(date).illuminatedFraction), `${name} ${iso}`).toBeLessThan(
        0.005,
      );
      expect(Math.abs(lit - (expected[name] ?? Number.NaN)), `${name} ${iso}`).toBeLessThan(0.02);
      h.engine.dispose();
    }
  });

  it('la sombra de la Luna que recibe el shader de la Tierra cae donde el catálogo de la NASA (fase 5)', async () => {
    const eclipse = NASA_ECLIPSE_2026_08_12;
    const date = new Date(eclipse.greatestEclipseUt);
    const h = await createHarness({ reducedMotion: true, focus: 'tierra', time: date });
    settle(h);
    interface EarthVisual {
      body: { id: string };
      earth: {
        uOccluderLocal: { value: Vector4 };
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
    const moon = new Vector3().copy(earth.uOccluderLocal.value as unknown as Vector3);
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
    expect(earth.uOccluderLocal.value.w).toBeCloseTo(0.272, 2);
    // Y las tierras áridas, con su compresión de la configuración visual (calibrada con EPIC; de
    // noche, también con la Tierra realzada).
    const { knee, warmFrom, warmTo } = VISUAL_CONFIG.earth.arid;
    expect(earth.uArid.value.toArray()).toEqual([knee, warmFrom, warmTo]);
    h.engine.dispose();
  });

  it('la Tierra del explorador, realzada (fase 9b, D46): el océano, las nubes, la tierra, el reflejo y el borde de su atmósfera, con VISUAL_CONFIG.earth.enhanced; el halo de los demás, sin tinte', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'tierra' });
    settle(h);
    interface EnhancedVisual {
      body: { id: string };
      earth: {
        uOcean: { value: Vector4 };
        uOceanDetail: { value: { x: number; y: number } };
        uCloudShape: { value: Vector4 };
        uLand: { value: Vector4 };
        uVegetationTint: { value: Vector3 };
        uGlintShape: { value: Vector4 };
        uGlintFresnel: { value: { x: number; y: number } };
        uGlintTint: { value: Vector3 };
        uEarth: { value: Vector4 };
        uEnhancedAridKnee: { value: number };
      } | null;
      atmosphere: { uniforms: { uTint: { value: Vector3 } } } | null;
    }
    const visuals = (internals(h).world as unknown as { visuals: EnhancedVisual[] }).visuals;
    const visual = visuals.find((v) => v.body.id === 'tierra');
    const earth = visual?.earth;
    if (!earth) throw new Error('Sin uniformes de la Tierra');
    const { ocean, clouds, glint, land, rim } = VISUAL_CONFIG.earth.enhanced;
    expect(earth.uOcean.value.toArray()).toEqual([...ocean.albedo, 1]);
    expect(earth.uOceanDetail.value).toMatchObject({ x: ocean.waterLuminance, y: ocean.detail });
    expect(earth.uCloudShape.value.toArray()).toEqual([clouds.from, clouds.to, clouds.max, 1]);
    expect(earth.uLand.value.toArray()).toEqual([...land.aridTint, land.saturation]);
    expect(earth.uVegetationTint.value.toArray()).toEqual([...land.vegetationTint]);
    expect(earth.uGlintShape.value.toArray()).toEqual([glint.wide, glint.exponent, glint.core, 1]);
    expect(earth.uGlintFresnel.value).toMatchObject({ x: glint.f0, y: glint.fresnelMax });
    expect(earth.uGlintTint.value.toArray()).toEqual([...glint.tint]);
    expect(earth.uEarth.value.z).toBe(glint.intensity);
    expect(earth.uEnhancedAridKnee.value).toBe(land.aridKnee);
    // Los umbrales de las nubes, en orden, y su opacidad, sin pasar de la de la textura.
    expect(clouds.from).toBeLessThan(clouds.to);
    expect(clouds.max).toBeLessThanOrEqual(1);
    expect(visual?.atmosphere?.uniforms.uTint.value.toArray()).toEqual([...rim]);
    for (const other of visuals.filter((v) => v.body.id !== 'tierra' && v.atmosphere)) {
      expect(other.atmosphere?.uniforms.uTint.value.toArray(), other.body.id).toEqual([1, 1, 1]);
    }
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
      // Las texturas, sin los render targets del bloom del Sol (fase 9b), que se cuentan aparte.
      const vramMB = h.engine.stats().vramMB - h.renderer.sunBloom.vramBytes() / 1_048_576;
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

  /**
   * Una fuente de texturas con los tamaños de los ficheros de verdad (`TEXTURE_FILES`): apunta qué se
   * pide y qué se libera, y cuenta su VRAM como el cargador (C4).
   */
  const realisticTextures = (throughUpload = false) => {
    const requests: string[] = [];
    const released: string[] = [];
    const textures: EngineDeps['textures'] = (context) => ({
      meta: TEXTURE_META,
      source: {
        load: async (id: TextureId, level: TextureLevel): Promise<LoadedTexture> => {
          const file = chooseTextureFile(TEXTURE_FILES[id], level, 16_384);
          if (!file) throw new Error(`sin fichero de ${id}`);
          // Con sus medidas: las del primer plano esperan al final de los viajes para subir.
          const image = { width: file.width, height: file.height } as unknown as HTMLImageElement;
          const texture = new Texture(image);
          texture.name = `${id}@${file.level}`;
          texture.addEventListener('dispose', () => released.push(texture.name));
          requests.push(texture.name);
          // Como el cargador de verdad: la textura cuenta cuando ha subido a la GPU.
          if (throughUpload) await context.upload(texture);
          const mipmaps = TEXTURE_META[id].mipmaps !== false;
          return { texture, file, vramBytes: textureVramBytes(file.width, file.height, mipmaps) };
        },
      },
    });
    return { requests, released, textures };
  };

  it('C4: en la vista Luna, la Tierra (pequeña al fondo) no pide su 8K, y la 8K se libera al salir de la vista Tierra (fase 6)', async () => {
    const fake = realisticTextures();
    const h = await createHarness(
      { reducedMotion: true, focus: 'tierra', view: 'earth' },
      { textures: fake.textures },
    );
    settle(h);
    for (let k = 0; k < 5; k++) await flush();
    expect(fake.requests).toContain('earth-day@8k');
    h.engine.setView('moon');
    // La Tierra deja de verse grande con la proyección del frame: entonces pide su 1k.
    for (let round = 0; round < 3; round++) {
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
    }
    // La Luna, con sus mapas de cerca; la Tierra, con los de la vista general, y su 8K, liberada.
    expect(fake.requests).toContain('moon@8k');
    expect(fake.requests).toContain('moon-normal@4k');
    expect(fake.requests).toContain('moon-elevation@1k');
    expect(fake.requests).toContain('moon-normal-poles@2k');
    expect(fake.requests).toContain('earth-day@1k');
    expect(fake.released).toContain('earth-day@8k');
    expect(fake.released).toContain('earth-night@2k');
    h.engine.dispose();
  });

  it('C4 en el cielo (fase 8): al entrar desde las vistas Tierra o Luna se sueltan sus texturas de cerca', async () => {
    for (const view of ['earth', 'moon'] as const) {
      const fake = realisticTextures();
      const h = await createHarness(
        { reducedMotion: true, focus: view === 'earth' ? 'tierra' : 'luna', view },
        { textures: fake.textures },
      );
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
      const before = h.engine.stats().vramMB;
      h.engine.setView('sky');
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
      const close =
        view === 'earth' ? ['earth-day@8k', 'earth-night@2k'] : ['moon@8k', 'moon-normal@4k'];
      for (const name of close) expect(fake.released, `${view}: ${name}`).toContain(name);
      // El cielo, con las texturas de la vista general (la Luna del cielo usa la suya, de 1k).
      expect(h.engine.stats().vramMB, view).toBeLessThan(before / 3);
      expect(h.engine.stats().vramMB, view).toBeLessThan(60);
      h.engine.dispose();
    }
  });

  it('las sombras que recibe Júpiter (sus cuatro galileanas) y la que recibe Ío (Júpiter), con la geometría de satelliteShadowPoint (fase 7)', async () => {
    // Durante el tránsito triple del 24-1-2015 que fotografió el Hubble (un tiempo de luz antes de las
    // 06:28 UT, cuando salió de Júpiter la luz que vio): las sombras de Ío, Europa y Calisto caen sobre
    // Júpiter.
    const date = new Date('2015-01-24T05:52:00Z');
    const h = await createHarness({ reducedMotion: true, focus: 'jupiter', time: date });
    settle(h);
    interface ShadowVisual {
      body: { id: string; index: number; radiusKm: number };
      shadows: {
        uShadowCasters: { value: { x: number; y: number; z: number; w: number }[] };
        uShadowCount: { value: number };
        uShadowSun: { value: { x: number; y: number; z: number; w: number } };
      } | null;
      shadowCasters: readonly number[];
    }
    const visuals = (internals(h).world as unknown as { visuals: ShadowVisual[] }).visuals;
    const jupiter = visuals.find((v) => v.body.id === 'jupiter');
    if (!jupiter?.shadows) throw new Error('Júpiter sin sombras');
    expect(jupiter.shadows.uShadowCount.value).toBe(4);
    const casters = jupiter.shadowCasters.map((index) => SCENE_BODIES[index]?.id);
    expect([...casters].sort()).toEqual(['calisto', 'europa', 'ganimedes', 'io']);
    // Lo que no depende de la orientación de la malla (distancias y ángulos), frente a la geometría
    // del estado: la recta del Sol por cada luna corta el planeta si y solo si satelliteShadowPoint
    // da un punto, y las tres del tránsito lo cortan.
    const state = createSolarSystemModel().at(date.getTime());
    const sunFromJupiter = scale(state.heliocentricOf('jupiter'), -1);
    const sun = jupiter.shadows.uShadowSun.value;
    const radiusAu = jupiter.body.radiusKm / KM_PER_AU;
    expect(Math.hypot(sun.x, sun.y, sun.z)).toBeCloseTo(length(sunFromJupiter) / radiusAu, 3);
    const onPlanet: string[] = [];
    jupiter.shadowCasters.forEach((index, slot) => {
      const id = SCENE_BODIES[index]?.id ?? '';
      const caster = jupiter.shadows?.uShadowCasters.value[slot];
      if (!caster) throw new Error('falta un caster');
      const offset = state.parentOffsetOf(id);
      expect(Math.hypot(caster.x, caster.y, caster.z), id).toBeCloseTo(
        length(offset) / radiusAu,
        6,
      );
      expect(caster.w, id).toBeCloseTo(
        (SCENE_BODIES[index]?.radiusKm ?? 0) / jupiter.body.radiusKm,
        9,
      );
      // La recta del Sol por la luna, en la malla: ¿corta la esfera unidad por detrás de la luna?
      const dir = normalizeXyz(caster.x - sun.x, caster.y - sun.y, caster.z - sun.z);
      const b = caster.x * dir.x + caster.y * dir.y + caster.z * dir.z;
      const disc = b * b - (caster.x ** 2 + caster.y ** 2 + caster.z ** 2 - 1);
      const hits = disc >= 0 && -b - Math.sqrt(disc) >= 0;
      const expected = satelliteShadowPoint(offset, sunFromJupiter, jupiter.body.radiusKm) !== null;
      expect(hits, id).toBe(expected);
      if (hits) onPlanet.push(id);
    });
    expect(onPlanet.sort()).toEqual(['calisto', 'europa', 'io']);
    // Ío recibe la sombra de Júpiter, con el radio de Júpiter en radios de Ío.
    const io = visuals.find((v) => v.body.id === 'io');
    expect(io?.shadows?.uShadowCount.value).toBe(1);
    expect(io?.shadows?.uShadowCasters.value[0]?.w).toBeCloseTo(
      jupiter.body.radiusKm / (io?.body.radiusKm ?? 1),
      9,
    );
    // La Tierra y la Luna llevan las suyas (fases 5 y 6), y el Sol ninguna.
    for (const id of ['sol', 'tierra', 'luna']) {
      expect(visuals.find((v) => v.body.id === id)?.shadows ?? null, id).toBeNull();
    }
    h.engine.dispose();
  });

  it('en la vista Luna, el punto de la malla que mira a la Tierra es el de la libración de astronomy-engine (fase 6)', async () => {
    // Los extremos de la libración en longitud de 2026 con la Luna gibosa (los de las capturas).
    for (const iso of ['2026-01-06T06:00:00Z', '2026-11-21T18:00:00Z']) {
      const date = new Date(iso);
      const h = await createHarness({
        reducedMotion: true,
        view: 'moon',
        focus: 'luna',
        time: date,
      });
      settle(h);
      const scene = internals(h).world.scene as unknown as {
        getObjectByName(
          name: string,
        ): { position: Vector3; getWorldQuaternion(q: Quaternion): Quaternion } | undefined;
      };
      const moon = scene.getObjectByName('luna');
      const earth = scene.getObjectByName('tierra');
      if (!moon || !earth) throw new Error('Sin la Luna o la Tierra en la escena');
      // La dirección hacia la Tierra, en los ejes de la malla (Y, el polo; el meridiano 0 en +X y el
      // este hacia −Z).
      const toEarth = earth.position
        .clone()
        .sub(moon.position)
        .normalize()
        .applyQuaternion(moon.getWorldQuaternion(new Quaternion()).invert());
      const latDeg = (Math.asin(toEarth.y) * 180) / Math.PI;
      const lonDeg = (Math.atan2(-toEarth.z, toEarth.x) * 180) / Math.PI;
      const libration = Libration(toAstroTime(date));
      expect(
        Math.abs(lonDeg - libration.elon),
        `${iso}: ${lonDeg.toFixed(2)}° frente a ${libration.elon.toFixed(2)}°`,
      ).toBeLessThan(0.1);
      expect(
        Math.abs(latDeg - libration.elat),
        `${iso}: ${latDeg.toFixed(2)}° frente a ${libration.elat.toFixed(2)}°`,
      ).toBeLessThan(0.1);
      h.engine.dispose();
    }
  });

  it('las lunas con mosaico, solo con su sistema enfocado: a 1k con el planeta, a su nivel enfocadas y sueltas al salir, con su tinte (fase 7)', async () => {
    const requests: string[] = [];
    const released: string[] = [];
    const source = {
      load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> => {
        const texture = new Texture();
        texture.name = `${id}@${level}`;
        texture.addEventListener('dispose', () => released.push(texture.name));
        requests.push(texture.name);
        return Promise.resolve({
          texture,
          file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
          vramBytes: 32,
        });
      },
    };
    const h = await createHarness(
      { reducedMotion: true },
      { textures: () => ({ source, meta: TEXTURE_META }) },
    );
    const step = async () => {
      for (let round = 0; round < 2; round++) {
        settle(h);
        for (let k = 0; k < 5; k++) await flush();
      }
    };
    await step();
    // En la vista general, ninguna luna con mosaico; la Luna, sí (su 1k).
    expect(requests.filter((r) => r.startsWith('io@'))).toEqual([]);
    expect(requests).toContain('moon@1k');
    // Con Júpiter enfocado, sus galileanas a 1k; Fobos, no.
    h.engine.focus('jupiter');
    await step();
    for (const id of ['io', 'europa', 'ganymede', 'callisto'])
      expect(requests).toContain(`${id}@1k`);
    expect(requests.filter((r) => r.startsWith('phobos@'))).toEqual([]);
    interface TintVisual {
      body: { id: string };
      uniforms: { uHasMap: { value: number }; uChromaticity: { value: Vector4 } } | null;
    }
    const uniformsOf = (id: string) =>
      (internals(h).world as unknown as { visuals: TintVisual[] }).visuals.find(
        (v) => v.body.id === id,
      )?.uniforms;
    expect(uniformsOf('europa')?.uHasMap.value).toBe(1);
    // El tinte del color esquemático (el mosaico es gris): Europa, beis (más rojo que azul).
    const tint = uniformsOf('europa')?.uChromaticity.value;
    expect(tint?.w).toBe(1);
    expect(tint?.x ?? 0).toBeGreaterThan(tint?.z ?? 0);
    // Ío, sin tinte: su mosaico es en color (revisión del bloque D, D1).
    expect(uniformsOf('io')?.uHasMap.value).toBe(1);
    expect(uniformsOf('io')?.uChromaticity.value.w).toBe(0);
    expect(BODY_PHOTOMETRY.io.chromaticity).toBeUndefined();
    // Ío enfocada: su nivel del primer plano.
    h.engine.focus('io');
    await step();
    expect(requests).toContain(`io@${QUALITY_PROFILES.high.satelliteTexture}`);
    // De vuelta a la vista general: sueltas, con su color esquemático, sin tinte.
    h.engine.focus(null);
    await step();
    expect(released).toContain('io@1k');
    expect(released).toContain('callisto@1k');
    expect(uniformsOf('europa')?.uHasMap.value).toBe(0);
    expect(uniformsOf('europa')?.uChromaticity.value.w).toBe(0);
    expect(uniformsOf('io')?.uHasMap.value).toBe(0);
    expect(uniformsOf('io')?.uChromaticity.value.w).toBe(0);
    // Con Saturno, sus seis lunas heladas; Titán no lleva textura (la de su superficie no se ve en luz
    // visible): su color, el medido en PIA06230.
    h.engine.focus('saturno');
    await step();
    for (const id of ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'iapetus'])
      expect(requests).toContain(`${id}@1k`);
    expect(requests.filter((r) => r.startsWith('titan@'))).toEqual([]);
    h.engine.focus(null);
    await step();
    expect(released).toContain('rhea@1k');
    h.engine.dispose();
  });

  it('Jápeto, con su dicotomía: el cociente de sus dos caras, el de la NASA, y su brillo calibrado con el hemisferio trasero (fase 9b, D42)', async () => {
    const reference = TEXTURE_ALBEDO_REFERENCE.iapetus;
    // El material oscuro del hemisferio delantero frente al trasero: 0,04 / 0,55 (NASA), medido en el mapa.
    expect(reference?.albedo).toBe(0.55);
    expect(reference?.ratio ?? 0).toBeCloseTo(0.04 / 0.55, 2);
    const source = {
      load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> =>
        Promise.resolve({
          texture: new Texture(),
          file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
          vramBytes: 32,
        }),
    };
    const h = await createHarness(
      { reducedMotion: true },
      { textures: () => ({ source, meta: TEXTURE_META }) },
    );
    h.engine.focus('saturno');
    for (let round = 0; round < 2; round++) {
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
    }
    const visual = (
      internals(h).world as unknown as {
        visuals: { body: { id: string }; uniforms: { uAlbedoScale: { value: number } } | null }[];
      }
    ).visuals.find((v) => v.body.id === 'japeto');
    // Con su textura, el hemisferio trasero al 0,55; no la media del mapa al 0,05 del catálogo.
    expect(visual?.uniforms?.uAlbedoScale.value).toBeCloseTo(
      albedoScale(0.55, reference?.luminance ?? 0, BODY_PHOTOMETRY.japeto.photometry),
      9,
    );
    h.engine.dispose();
  });

  it('Fobos y Deimos, con su forma real cuando se ven con su mapa; rehecha al cambiar de calidad y liberada al cerrar (fase 9b, D42)', async () => {
    const source = {
      load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> =>
        Promise.resolve({
          texture: new Texture(),
          file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
          vramBytes: 32,
        }),
    };
    const files: Record<string, Uint8Array> = { phobos: phobosBin, deimos: deimosBin };
    const loadShape = vi.fn((path: string) => {
      const bytes = files[path.replace(/^data\/shapes\/(\w+)\.bin.*$/, '$1')];
      if (!bytes) return Promise.reject(new Error(path));
      return Promise.resolve(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      );
    });
    const h = await createHarness(
      { reducedMotion: true },
      { textures: () => ({ source, meta: TEXTURE_META }), loadShape },
    );
    const step = async () => {
      for (let round = 0; round < 2; round++) {
        settle(h);
        for (let k = 0; k < 5; k++) await flush();
      }
    };
    await step();
    // En la vista general, sin sus mapas: tampoco su forma.
    expect(loadShape).not.toHaveBeenCalled();
    const scene = internals(h).world.scene;
    const geometryOf = (id: string) => (scene.getObjectByName(id) as Mesh).geometry;
    const sphere = geometryOf('fobos');
    h.engine.focus('marte');
    await step();
    expect(loadShape.mock.calls.map(([path]) => path).sort()).toEqual(
      [SHAPE_FILES.deimos?.path, SHAPE_FILES.fobos?.path].sort(),
    );
    // La esfera deformada: con normales y más larga que la esfera (13,9 km de 11,08).
    const phobos = geometryOf('fobos');
    expect(phobos).not.toBe(sphere);
    expect(phobos.getAttribute('normal')).toBeDefined();
    expect(phobos.boundingSphere?.radius ?? 0).toBeGreaterThan(1.2);
    expect(geometryOf('deimos')).not.toBe(sphere);
    // Enfocada, sobre la esfera detallada; al cambiar de calidad, rehecha y la anterior liberada.
    h.engine.focus('fobos');
    await step();
    const focused = geometryOf('fobos');
    expect(focused).not.toBe(phobos);
    let disposed = false;
    focused.addEventListener('dispose', () => (disposed = true));
    h.engine.setQuality('low');
    await step();
    expect(disposed).toBe(true);
    expect(geometryOf('fobos')).not.toBe(focused);
    expect(geometryOf('fobos').getAttribute('normal')).toBeDefined();
    // Se pide una sola vez.
    expect(loadShape).toHaveBeenCalledTimes(2);
    const last = geometryOf('fobos');
    let released = false;
    last.addEventListener('dispose', () => (released = true));
    h.engine.dispose();
    expect(released).toBe(true);
  });

  it('el halo de Titán, con su propio color (casi neutro) y el disco, con el naranja de su neblina (fase 7)', async () => {
    const h = await createHarness({ reducedMotion: true });
    interface HaloVisual {
      body: { id: string };
      uniforms: { uHazeColor: { value: Vector4 }; uChromaticity: { value: Vector4 } } | null;
      atmosphere: { uniforms: { uHazeColor: { value: Vector4 } } } | null;
    }
    const visuals = (internals(h).world as unknown as { visuals: HaloVisual[] }).visuals;
    const titan = visuals.find((v) => v.body.id === 'titan');
    const venus = visuals.find((v) => v.body.id === 'venus');
    const halo = BODY_PHOTOMETRY.titan.halo;
    expect(halo).toBeDefined();
    const color = titan?.atmosphere?.uniforms.uHazeColor.value;
    expect(color?.x).toBeCloseTo((halo?.chromaticity[0] ?? 0) * (halo?.gain ?? 0), 6);
    expect(color?.z).toBeCloseTo((halo?.chromaticity[2] ?? 0) * (halo?.gain ?? 0), 6);
    // La neblina del disco sigue siendo naranja (más rojo que azul), y su color, el de la foto.
    const disk = titan?.uniforms?.uHazeColor.value;
    expect(disk?.x ?? 0).toBeGreaterThan(3 * (disk?.z ?? 0));
    expect(titan?.uniforms?.uChromaticity.value.w).toBe(1);
    // Los demás comparten el color de su neblina con el halo (el mismo uniforme).
    expect(venus?.atmosphere?.uniforms.uHazeColor).toBe(venus?.uniforms?.uHazeColor);
    h.engine.dispose();
  });

  it('C4: la VRAM de las vistas Tierra y Luna en su peor caso (cada una con la otra al fondo), dentro de §5 en alto y en bajo (fase 6)', async () => {
    const vram = async (view: 'earth' | 'moon', quality: 'high' | 'low') => {
      const fake = realisticTextures();
      const h = await createHarness(
        { reducedMotion: true, view, focus: view === 'earth' ? 'tierra' : 'luna', quality },
        { textures: fake.textures },
      );
      for (let round = 0; round < 3; round++) {
        settle(h);
        for (let k = 0; k < 5; k++) await flush();
      }
      const { vramMB } = h.engine.stats();
      h.engine.dispose();
      return vramMB;
    };
    const budgets = { high: 300, low: 120 } as const;
    for (const quality of ['high', 'low'] as const) {
      for (const view of ['earth', 'moon'] as const) {
        expect(await vram(view, quality), `${view} ${quality}`).toBeLessThanOrEqual(
          budgets[quality],
        );
      }
    }
  });

  it('la VRAM con cada sistema de lunas cargado (el planeta o una de sus lunas enfocados), dentro de §5 en alto y en bajo (fase 7)', async () => {
    const vram = async (focus: BodyId, quality: 'high' | 'low') => {
      const fake = realisticTextures();
      const h = await createHarness(
        { reducedMotion: true, focus, quality },
        { textures: fake.textures },
      );
      for (let round = 0; round < 3; round++) {
        settle(h);
        for (let k = 0; k < 5; k++) await flush();
      }
      const { vramMB } = h.engine.stats();
      h.engine.dispose();
      return vramMB;
    };
    const budgets = { high: 300, low: 120 } as const;
    // Los sistemas con más lunas con mosaico: Saturno (seis) y Júpiter (cuatro), con el planeta o con
    // la luna de mosaico más pesado enfocados; y Marte con Fobos, y Neptuno con Tritón.
    for (const quality of ['high', 'low'] as const) {
      for (const focus of ['saturno', 'dione', 'jupiter', 'europa', 'fobos', 'triton'] as const) {
        expect(await vram(focus, quality), `${focus} ${quality}`).toBeLessThanOrEqual(
          budgets[quality],
        );
      }
    }
  }, 60_000);

  it('C4: en el viaje entre las vistas Tierra y Luna, la VRAM no pasa de §5 en ningún frame (revisión de la fase 6)', async () => {
    const travel = async (from: 'earth' | 'moon', to: 'earth' | 'moon') => {
      const fake = realisticTextures(true);
      const h = await createHarness(
        { view: from, focus: from === 'earth' ? 'tierra' : 'luna' },
        { textures: fake.textures },
      );
      // Frame a frame, dejando que lleguen las texturas, hasta que el motor reposa: el máximo.
      const run = async (maxFrames: number) => {
        let max = 0;
        for (let k = 0; k < maxFrames; k++) {
          h.frames(16, 62.5);
          await flush();
          max = Math.max(max, h.engine.stats().vramMB);
          if (k > 30 && h.scheduler.waiting === 0) break;
        }
        return max;
      };
      await run(400);
      const start = h.engine.stats().vramMB;
      h.engine.setView(to);
      const peak = await run(800);
      const end = h.engine.stats().vramMB;
      const travelled = h.events.travel.some((event) => event.active && event.kind === 'view');
      h.engine.dispose();
      return { start, peak, end, travelled };
    };
    for (const [from, to] of [
      ['earth', 'moon'],
      ['moon', 'earth'],
    ] as const) {
      const { start, peak, end, travelled } = await travel(from, to);
      const label = `${from} → ${to}: ${start.toFixed(0)} → ${peak.toFixed(0)} → ${end.toFixed(0)} MB`;
      expect(travelled, label).toBe(true);
      // Las dos vistas, cada una con su primer plano entero, antes y después del viaje.
      expect(start, label).toBeGreaterThan(200);
      expect(end, label).toBeGreaterThan(200);
      expect(peak, label).toBeLessThanOrEqual(300);
    }
  }, 60_000);

  it('una luna que se ve grande lleva su mapa sin su sistema enfocado, y lo suelta al alejarse (fase 9b, D42)', async () => {
    const requests: string[] = [];
    const released: string[] = [];
    const source = {
      load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> => {
        const texture = new Texture();
        texture.name = `${id}@${level}`;
        texture.addEventListener('dispose', () => released.push(texture.name));
        requests.push(texture.name);
        return Promise.resolve({
          texture,
          file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
          vramBytes: 32,
        });
      },
    };
    const h = await createHarness(
      { reducedMotion: true },
      { textures: () => ({ source, meta: TEXTURE_META }) },
    );
    const step = async () => {
      for (let k = 0; k < 5; k++) await flush();
    };
    settle(h);
    await step();
    const world = internals(h).world as unknown as {
      seen: Uint8Array;
      updateLarge(screen: readonly { index: number; onScreen: boolean; radiusPx: number }[]): void;
    };
    const ganymede = sceneBody('ganimedes').index;
    const at = async (radiusPx: number, onScreen = true) => {
      world.updateLarge([{ index: ganymede, onScreen, radiusPx }]);
      await step();
      return world.seen[ganymede];
    };
    // En la vista general, sin su mapa: su disco de color.
    expect(requests.filter((r) => r.startsWith('ganymede@'))).toEqual([]);
    expect(await at(20)).toBe(0);
    // Desde 24 px, su mapa al nivel de la vista general (1k), sin enfocar Júpiter.
    expect(await at(24)).toBe(1);
    expect(requests).toEqual(expect.arrayContaining(['ganymede@1k']));
    // Entre 18 y 24 lo conserva; por debajo de 18 lo suelta (y vuelve a su color).
    expect(await at(20)).toBe(1);
    expect(released).not.toContain('ganymede@1k');
    expect(await at(17)).toBe(0);
    expect(released).toContain('ganymede@1k');
    // Fuera de la pantalla no lo pide; los planetas no cuentan (su regla es la de C4, 160 px).
    expect(await at(40, false)).toBe(0);
    world.updateLarge([{ index: sceneBody('marte').index, onScreen: true, radiusPx: 40 }]);
    expect(world.seen[sceneBody('marte').index]).toBe(0);
    h.engine.dispose();
  });

  it('con una luna enfocada, su planeta, que se ve grande detrás, lleva su textura del primer plano (fase 9b, D42; de la fase 10)', async () => {
    const requests: string[] = [];
    const source = {
      load: (id: TextureId, level: TextureLevel): Promise<LoadedTexture> => {
        const texture = new Texture();
        texture.name = `${id}@${level}`;
        requests.push(texture.name);
        return Promise.resolve({
          texture,
          file: { level, path: `${id}.webp`, width: 4, height: 2, bytes: 1 },
          vramBytes: 32,
        });
      },
    };
    // A esa hora, Júpiter queda detrás de Ío vista desde la cámara de su encuadre; a otras de su vuelta
    // (1,8 días), detrás de la cámara.
    const h = await createHarness(
      { reducedMotion: true, time: new Date('2026-10-24T18:00:00Z') },
      { textures: () => ({ source, meta: TEXTURE_META }) },
    );
    const step = async () => {
      for (let round = 0; round < 3; round++) {
        settle(h);
        for (let k = 0; k < 5; k++) await flush();
      }
    };
    await step();
    const focusLevel = QUALITY_PROFILES.high.focusTexture;
    expect(requests).not.toContain(`jupiter@${focusLevel}`);
    // Ío enfocada: Júpiter, a 5,9 de sus radios, ocupa buena parte del fondo.
    h.engine.focus('io');
    await step();
    const world = internals(h).world as unknown as { large: Uint8Array };
    expect(world.large[sceneBody('jupiter').index]).toBe(1);
    expect(requests).toContain(`jupiter@${focusLevel}`);
    h.engine.dispose();
  });

  it('C4: un cuerpo se ve grande desde 160 px y deja de verse grande por debajo de 120 (histéresis)', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    const world = internals(h).world as unknown as {
      large: Uint8Array;
      updateLarge(screen: readonly { index: number; onScreen: boolean; radiusPx: number }[]): void;
    };
    const index = sceneBody('marte').index;
    const at = (radiusPx: number, onScreen = true) => {
      world.updateLarge([{ index, onScreen, radiusPx }]);
      return world.large[index];
    };
    expect(at(150)).toBe(0);
    expect(at(160)).toBe(1);
    // Entre 120 y 160 sigue grande; por debajo de 120 deja de serlo, y no vuelve hasta 160.
    expect(at(130)).toBe(1);
    expect(at(119)).toBe(0);
    expect(at(130)).toBe(0);
    expect(at(170)).toBe(1);
    // Fuera de la pantalla no entra, aunque su radio sea enorme; el que ya se veía grande y sale del
    // encuadre sin alejarse lo conserva (fase 7: Marte, con Fobos enfocado) hasta que se aleja.
    expect(at(500, false)).toBe(1);
    expect(at(119, false)).toBe(0);
    expect(at(500, false)).toBe(0);
    expect(at(500)).toBe(1);
    h.engine.dispose();
  });

  it('la esfera cúbica de la Luna solo existe con la Luna enfocada, sin normales, y cuenta en la VRAM mientras existe (revisión de la fase 6)', async () => {
    const h = await createHarness({ reducedMotion: true });
    settle(h);
    const world = internals(h).world as unknown as {
      moonSphere: {
        attributes: Record<string, { array: ArrayLike<number> & { byteLength: number } }>;
        index: { array: { byteLength: number } } | null;
        addEventListener(type: 'dispose', listener: () => void): void;
      } | null;
    };
    expect(world.moonSphere).toBeNull();
    // Sin los render targets del bloom del Sol (fase 9b), que se sueltan al salir del sistema solar.
    const vram = () => h.engine.stats().vramMB - h.renderer.sunBloom.vramBytes() / 1_048_576;
    const overview = vram();
    h.engine.setView('moon');
    settle(h);
    const sphere = world.moonSphere;
    if (!sphere) throw new Error('Sin esfera cúbica con la Luna enfocada');
    expect(Object.keys(sphere.attributes).sort()).toEqual(['position', 'uv']);
    const bytes =
      Object.values(sphere.attributes).reduce((sum, a) => sum + a.array.byteLength, 0) +
      (sphere.index?.array.byteLength ?? 0);
    expect(vram() - overview).toBeCloseTo(bytes / 1_048_576, 1);
    // Al cambiar de calidad con la Luna enfocada, se rehace con los segmentos del nivel nuevo.
    let replaced = false;
    sphere.addEventListener('dispose', () => (replaced = true));
    h.engine.setQuality('low');
    settle(h);
    const low = world.moonSphere as unknown as {
      getAttribute(name: string): { count: number };
      addEventListener(type: 'dispose', listener: () => void): void;
    } | null;
    expect(replaced).toBe(true);
    const n = QUALITY_PROFILES.low.moonSegments;
    expect(low?.getAttribute('position').count).toBe(6 * (n + 1) ** 2);
    let disposed = false;
    low?.addEventListener('dispose', () => (disposed = true));
    h.engine.setView('system');
    settle(h);
    expect(world.moonSphere).toBeNull();
    expect(disposed).toBe(true);
    h.engine.dispose();
  });

  it('las normales de los casquetes polares llegan a la Luna enfocada y se sueltan al salir (revisión de la fase 6)', async () => {
    const fake = realisticTextures();
    const h = await createHarness(
      { reducedMotion: true, view: 'moon', focus: 'luna' },
      { textures: fake.textures },
    );
    for (let round = 0; round < 2; round++) {
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
    }
    interface MoonVisual {
      moon: {
        uHasPoleNormals: { value: number };
        uPoleNormalMap: { value: Texture | null };
      } | null;
    }
    const moon = () =>
      (internals(h).world as unknown as { visuals: MoonVisual[] }).visuals.find((v) => v.moon)
        ?.moon;
    expect(moon()?.uHasPoleNormals.value).toBe(1);
    expect(moon()?.uPoleNormalMap.value?.name).toBe('moon-normal-poles@2k');
    h.engine.setView('system');
    for (let round = 0; round < 2; round++) {
      settle(h);
      for (let k = 0; k < 5; k++) await flush();
    }
    expect(moon()?.uHasPoleNormals.value).toBe(0);
    expect(fake.released).toContain('moon-normal-poles@2k');
    h.engine.dispose();
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

  it('las nubes se atenúan en los primeros planos de la Tierra y no en la vista general (C1)', async () => {
    const h = await createHarness({ reducedMotion: true, focus: 'tierra' });
    settle(h);
    interface EarthVisual {
      earth: { uCloudOpacity: { value: number } } | null;
    }
    const opacity = () =>
      (internals(h).world as unknown as { visuals: EarthVisual[] }).visuals.find(
        (visual) => visual.earth,
      )?.earth?.uCloudOpacity.value ?? Number.NaN;
    // Enfocada, la Tierra cabe entera: las nubes, enteras.
    expect(opacity()).toBe(1);
    // El Himalaya, a 1,9 radios: la Tierra desborda la vista y las nubes se atenúan.
    h.engine.lookAtSurface(28, 86, 1.9);
    settle(h);
    expect(opacity()).toBeLessThan(0.6);
    expect(opacity()).toBeGreaterThanOrEqual(VISUAL_CONFIG.earth.cloudFade.min);
    // En la vista general, otra vez enteras.
    h.engine.focus(null);
    settle(h);
    expect(opacity()).toBe(1);
    h.engine.dispose();
  });

  it('la cara nocturna de la Tierra: el relleno de la vista general, en gris; en primer plano, nada, y las luces con su tono (fase 9b, D40)', async () => {
    interface EarthVisual {
      uniforms: { uFill: { value: number } } | null;
      earth: { uNightFill: { value: number }; uNightTint: { value: Color } } | null;
    }
    const earthOf = (h: Harness) =>
      (internals(h).world as unknown as { visuals: EarthVisual[] }).visuals.find(
        (visual) => visual.earth,
      );
    // En la vista general, el mismo relleno ilustrativo (la Tierra de noche se lee como un disco).
    const overview = await createHarness({ reducedMotion: true });
    settle(overview);
    const far = earthOf(overview);
    expect(far?.uniforms?.uFill.value).toBeCloseTo(VISUAL_CONFIG.fill.overview, 6);
    expect(far?.earth?.uNightFill.value).toBeCloseTo(VISUAL_CONFIG.fill.overview, 6);
    const [r, g, b] = VISUAL_CONFIG.earth.nightTint;
    expect(far?.earth?.uNightTint.value.r).toBeCloseTo(r, 6);
    expect(far?.earth?.uNightTint.value.g).toBeCloseTo(g, 6);
    expect(far?.earth?.uNightTint.value.b).toBeCloseTo(b, 6);
    // El tono, cálido y de luminancia 1 (el mapa en gris pone el brillo).
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(1, 2);
    expect(r).toBeGreaterThan(b);
    overview.engine.dispose();
    // En la vista Tierra (primer plano), el de la cara nocturna desaparece: solo las luces.
    const close = await createHarness({ reducedMotion: true, view: 'earth' });
    settle(close);
    const near = earthOf(close);
    expect(near?.uniforms?.uFill.value).toBeLessThan(0.01);
    expect(near?.earth?.uNightFill.value).toBeLessThan(1e-4);
    close.engine.dispose();
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
    // Con Mercurio enfocado, las órbitas de los planetas quedan tenues (`World.orbitOpacity`) y cada
    // estela engorda en proporción a la opacidad con la que se dibuja su órbita respecto a la de la
    // vista general. La primera órbita dibujada es la primera de los segmentos (la de Mercurio, de
    // cerca, es recta y no se dibuja: D3).
    const { orbits } = internals(h).world;
    const first = orbits.drawnOpacity.findIndex((alpha) => alpha > 0);
    const alpha = orbits.drawnOpacity[first] ?? 0;
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(VISUAL_CONFIG.overviewOrbitOpacity);
    const widen = VISUAL_CONFIG.trails.planet.widthPx / ORBIT_WIDTH_PX - 1;
    expect(orbits.widths[0] as number).toBeCloseTo(
      1 + (widen * alpha) / VISUAL_CONFIG.overviewOrbitOpacity,
      5,
    );
    h.engine.dispose();
  });

  it('las órbitas que se ven casi rectas se apagan con su estela; las curvas se quedan (revisión del bloque D, D3)', async () => {
    const drawn = (h: Harness, id: string): number => {
      const { orbits, orbitSources } = internals(h).world;
      const k = orbitSources.findIndex(
        (source) => source.bodyIndex === sceneBody(id as never).index,
      );
      return orbits.drawnOpacity[k] ?? 0;
    };
    // En la vista general, las de los planetas se ven enteras: ninguna se toca.
    const overview = await createHarness({ reducedMotion: true });
    settle(overview);
    for (const id of ['mercurio', 'tierra', 'jupiter', 'neptuno']) {
      expect(drawn(overview, id), id).toBeCloseTo(VISUAL_CONFIG.overviewOrbitOpacity, 6);
    }
    overview.engine.dispose();
    // Con Saturno enfocado: su órbita alrededor del Sol es la recta que lo atraviesa; las de las lunas
    // que la cámara ve desde fuera (elipses, aunque de canto con los anillos de 2026) se quedan
    // enteras. Las de Dione, Rea, Titán y Jápeto, con la cámara dentro y casi en su plano, son el
    // horizonte de ese plano: rectas (las capturas de la revisión del bloque D lo enseñan).
    const saturn = await createHarness({ reducedMotion: true, focus: 'saturno' });
    settle(saturn);
    expect(drawn(saturn, 'saturno')).toBe(0);
    // Enteras: la opacidad de las órbitas de las lunas (0,7, `World.orbitOpacity`) por su presencia.
    for (const id of ['mimas', 'encelado']) expect(drawn(saturn, id), id).toBeGreaterThan(0.6);
    saturn.engine.dispose();
    // En la vista Tierra, la órbita de la Tierra alrededor del Sol, que la atraviesa, es una recta. (La
    // de la Luna, vista desde cerca de su centro, también, cuando cae en el encuadre: lo prueban
    // `orbits.spec.ts` y las capturas; aquí queda fuera del lienzo del arnés.)
    const earth = await createHarness({ reducedMotion: true });
    earth.engine.setView('earth');
    settle(earth);
    expect(screenOf(earth, 'tierra')?.onScreen).toBe(true);
    expect(drawn(earth, 'tierra')).toBe(0);
    earth.engine.dispose();
  });
});

/** Un vector normalizado (para los tests de las sombras). */
function normalizeXyz(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const n = Math.hypot(x, y, z);
  return { x: x / n, y: y / n, z: z / n };
}

describe('SceneEngine: la vista del cielo (fase 8)', () => {
  const MONTSEC = { latDeg: 42.024637, lonDeg: 0.736936, altitudeM: 812 };
  const NIGHT = new Date('2026-11-02T04:00:00Z');

  it('entra por el cielo: compila su escena, la pinta sin el espacio y sin sus etiquetas', async () => {
    const h = await createHarness({ view: 'sky', time: NIGHT, observer: MONTSEC });
    expect(h.events.ready).toHaveLength(1);
    // Dos compilaciones: el espacio (por si se cambia de vista) y el cielo.
    expect(h.renderer.compiles).toBe(2);
    const spaceLabels = h.labels.querySelector<HTMLElement>('.scene-labels');
    const skyLabels = h.labels.querySelector<HTMLElement>('.sky-labels');
    expect(spaceLabels?.hidden).toBe(true);
    expect(skyLabels?.hidden).toBe(false);
    // Los puntos cardinales que caen en el campo (mirando al sur, a 25° de altura).
    settle(h);
    const shown = [...(skyLabels?.querySelectorAll<HTMLElement>('.sky-label') ?? [])].filter(
      (el) => !el.hidden,
    );
    expect(shown.map((el) => el.textContent)).toContain('S');
    // La exposición de la escena del cielo es la neutra.
    expect(h.renderer.exposure).toBe(1);
    h.engine.dispose();
  });

  it('las etiquetas del cielo, solo en la parte visible: ninguna bajo los márgenes de la interfaz', async () => {
    // Revisión de la fase 8, hallazgo 6: en el móvil, los nombres de las constelaciones pisaban el
    // texto de arriba, que es un margen del encuadre.
    const h = await createHarness({ view: 'sky', time: NIGHT, observer: MONTSEC });
    const placed = () =>
      [...h.labels.querySelectorAll<HTMLElement>('.sky-label')]
        .filter((el) => !el.hidden)
        .map((el) => {
          const [, x = 'NaN', y = 'NaN'] =
            /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform) ?? [];
          return { text: el.textContent ?? '', x: Number(x), y: Number(y) };
        });
    const insets = { top: 300, right: 0, bottom: 150, left: 250 };
    const covered = (label: { x: number; y: number }) =>
      label.x < insets.left || label.y < insets.top || label.y > HEIGHT - insets.bottom;
    settle(h);
    // Sin márgenes, alguna etiqueta cae donde luego habrá interfaz.
    expect(placed().some(covered)).toBe(true);
    h.engine.setViewInsets(insets);
    settle(h);
    const after = placed();
    expect(after.length).toBeGreaterThan(0);
    expect(after.filter(covered)).toEqual([]);
    h.engine.dispose();
  });

  it('del espacio al cielo: sus sombreados se compilan sin bloquear, una vez, y se pinta después', async () => {
    // Revisión de la fase 8, sugerencia 12: compilados en el primer render, eran una tarea larga.
    const h = await createHarness({ time: NIGHT });
    settle(h);
    let release: () => void = () => undefined;
    h.renderer.compileGate = new Promise((resolve) => (release = resolve));
    const compiles = h.renderer.compiles;
    h.engine.setView('sky');
    expect(h.renderer.compiles).toBe(compiles + 1);
    const before = h.renderer.renders;
    settle(h);
    // Mientras se compilan, no se pinta: se queda la última imagen (bajo el fundido de la interfaz).
    expect(h.renderer.renders).toBe(before);
    release();
    h.renderer.compileGate = null;
    for (let k = 0; k < 3; k++) await flush();
    settle(h);
    expect(h.renderer.renders).toBeGreaterThan(before);
    // Ya compilados: volver al cielo no los compila otra vez.
    h.engine.setView('system');
    settle(h);
    h.engine.setView('sky');
    expect(h.renderer.compiles).toBe(compiles + 1);
    h.engine.dispose();
  });

  it('del espacio al cielo y vuelta: sin vuelo ni motor nuevo, y las etiquetas de cada uno', async () => {
    const h = await createHarness({ time: NIGHT });
    settle(h);
    h.engine.setView('sky');
    expect(h.engine.view).toBe('sky');
    expect(h.events.travel.filter((t) => t.active)).toHaveLength(0);
    const before = h.renderer.renders;
    await flush();
    settle(h);
    expect(h.renderer.renders).toBeGreaterThan(before);
    expect(h.labels.querySelector<HTMLElement>('.scene-labels')?.hidden).toBe(true);
    h.engine.setView('earth');
    expect(h.engine.view).toBe('earth');
    expect(h.labels.querySelector<HTMLElement>('.sky-labels')?.hidden).toBe(true);
    expect(h.labels.querySelector<HTMLElement>('.scene-labels')?.hidden).toBe(false);
    // Desde el cielo se llega a la Tierra de un corte: ningún viaje en curso.
    expect(h.engine.focusedBody).toBe('tierra');
    h.engine.dispose();
  });

  it('en el cielo, el teclado y el zoom mueven la cámara del cielo, no la del espacio', async () => {
    const h = await createHarness({ view: 'sky', time: NIGHT, reducedMotion: true });
    const start = h.engine.skyView;
    h.engine.orbitBy((6 * Math.PI) / 180, 0);
    expect(h.engine.skyView.azimuthDeg).toBeCloseTo(start.azimuthDeg + 6, 6);
    h.engine.orbitBy(0, (6 * Math.PI) / 180);
    expect(h.engine.skyView.altitudeDeg).toBeCloseTo(start.altitudeDeg + 6, 6);
    h.engine.zoomBy(0.5);
    expect(h.engine.skyView.fovDeg).toBeCloseTo(start.fovDeg / 2, 6);
    // «Mirar a…»: directo con movimiento reducido.
    h.engine.lookAtSky(119, 51);
    expect(h.engine.skyView).toMatchObject({ azimuthDeg: 119, altitudeDeg: 51 });
    h.engine.dispose();
  });

  it('un clic sobre la Luna en el cielo la elige', async () => {
    const h = await createHarness({
      view: 'sky',
      time: NIGHT,
      observer: MONTSEC,
      capture: true,
      // La Luna a las 04:00 UTC del 2-11-2026, desde el Montsec (rumbo 119°, altura 51,4°).
      skyView: { azimuthDeg: 119.05, altitudeDeg: 51.42, fovDeg: 20 },
    });
    settle(h);
    // En el centro de la parte visible (sin márgenes, el del lienzo).
    h.canvas.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: WIDTH / 2, clientY: HEIGHT / 2, pointerId: 1 }),
    );
    h.canvas.dispatchEvent(
      new PointerEvent('pointerup', { clientX: WIDTH / 2, clientY: HEIGHT / 2, pointerId: 1 }),
    );
    expect(h.events.bodyPicked.map((e) => e.id)).toContain('luna');
    h.engine.dispose();
  });

  it('cambiar de lugar recalcula el cielo (otro frame), y un lugar imposible se ignora', async () => {
    const h = await createHarness({ view: 'sky', time: NIGHT, observer: MONTSEC });
    settle(h);
    const before = h.renderer.renders;
    h.engine.setObserver({ latDeg: 28.30111, lonDeg: -16.51056, altitudeM: 2390 });
    settle(h);
    expect(h.renderer.renders).toBeGreaterThan(before);
    const after = h.renderer.renders;
    h.engine.setObserver({ latDeg: 123, lonDeg: 0, altitudeM: 0 });
    settle(h);
    expect(h.renderer.renders).toBe(after);
    h.engine.dispose();
  });

  it('las constelaciones llegan al abrir el cielo y se pueden ocultar; su memoria se cuenta', async () => {
    const data = {
      constellations: [
        {
          id: 'Ori',
          name: 'Orion',
          es: 'Orión',
          label: [83.8, 5],
          lines: [[88.79, 7.41, 81.28, 6.35]],
        },
        // Mismo nombre en español y en latín: una vez.
        {
          id: 'Leo',
          name: 'Leo',
          es: 'Leo',
          label: [160, 15],
          lines: [[152.1, 11.97, 168.5, 20.52]],
        },
      ],
    };
    const loadConstellations = vi.fn(() => Promise.resolve(data as unknown));
    const h = await createHarness({ view: 'sky', time: NIGHT }, { loadConstellations });
    await flush();
    expect(loadConstellations).toHaveBeenCalledTimes(1);
    expect(h.engine.stats().vramMB).toBeGreaterThan(0);
    // El nombre en español y, debajo, el oficial de la IAU en latín (D38).
    const [label, leo] = h.labels.querySelectorAll<HTMLElement>('.sky-label--constellation');
    expect(label?.firstChild?.textContent).toBe('Orión');
    expect(label?.querySelector('.sky-label__secondary')?.textContent).toBe('Orion');
    expect(label?.querySelector('.sky-label__secondary')?.getAttribute('lang')).toBe('la');
    expect(leo?.textContent).toBe('Leo');
    expect(leo?.querySelector('.sky-label__secondary')).toBeNull();
    h.engine.setConstellationsVisible(false);
    settle(h);
    expect(
      [...h.labels.querySelectorAll<HTMLElement>('.sky-label--constellation')].every(
        (el) => el.hidden,
      ),
    ).toBe(true);
    h.engine.dispose();
    expect(h.labels.querySelector('.sky-labels')).toBeNull();
  });
});

describe('SceneEngine: el cielo y su tabla dicen lo mismo (fase 8)', () => {
  it('cada cuerpo sobre el horizonte está donde dice la tabla (`skyBodies`): mirando allí, es él', async () => {
    const MONTSEC = { latDeg: 42.024637, lonDeg: 0.736936, altitudeM: 812 };
    // La noche del 1 al 2 de noviembre de 2026, a las 05:00: la Luna, Marte y Júpiter, juntos al
    // sureste; Saturno, ya puesto. A las 22:00 del 1, Saturno, Urano y Neptuno.
    for (const iso of ['2026-11-02T04:00:00Z', '2026-11-01T21:00:00Z']) {
      const time = new Date(iso);
      const h = await createHarness({
        view: 'sky',
        time,
        observer: MONTSEC,
        capture: true,
        skyView: { fovDeg: 6 },
      });
      const { skyBodies } = await import('../ephemeris/sky');
      const above = skyBodies(time, MONTSEC).filter((body) => body.altitudeDeg > 1);
      expect(above.length, iso).toBeGreaterThan(2);
      for (const body of above) {
        h.engine.lookAtSky(body.azimuthDeg, body.altitudeDeg);
        settle(h);
        h.events.bodyPicked.length = 0;
        const at = { clientX: WIDTH / 2, clientY: HEIGHT / 2, pointerId: 1 };
        h.canvas.dispatchEvent(new PointerEvent('pointerdown', at));
        h.canvas.dispatchEvent(new PointerEvent('pointerup', at));
        expect(
          h.events.bodyPicked.map((e) => e.id),
          `${iso} ${body.id}`,
        ).toEqual([body.id]);
      }
      h.engine.dispose();
    }
  });
});
