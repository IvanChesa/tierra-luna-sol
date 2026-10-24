/**
 * SceneEngine (D6): el motor 3D, una clase TS sin Angular. Orquesta el tiempo, el estado del sistema,
 * los marcos de escala, la cámara, la selección, la calidad y el bucle de render bajo demanda.
 *
 * Todo lo que depende del navegador entra por `EngineDeps` (renderer, `requestAnimationFrame`, reloj,
 * texturas, catálogo de estrellas, visibilidad de la página): en los tests se sustituye por versiones
 * falsas y la lógica se prueba sin WebGL (B10).
 *
 * El bucle solo pinta cuando hace falta (PLAN §4.5): reproducción, cámara en movimiento, transición
 * de marco o texturas por subir. En pausa y sin interacción no hay ningún frame.
 */
import type { Texture } from 'three';
import { decodeStarCatalog } from '../ephemeris/stars';
import type { SystemState } from '../ephemeris/system-state';
import type { PlacementInput } from '../ephemeris/scale';
import { CameraRig } from './camera/rig';
import { attachPointerControls } from './camera/pointer';
import { SimClock } from './clock';
import { FRAME_TRANSITION_MS, FrameController, frameFor } from './frames';
import { LabelInfo, LabelLayer, layoutLabels } from './labels';
import { ScreenBody, pickBody, projectBodies } from './picking';
import {
  AdaptiveQuality,
  DEFAULT_ADAPTIVE_OPTIONS,
  DeviceInfo,
  QUALITY_PROFILES,
  QualityProfile,
  detectQuality,
} from './quality';
import { OrientationModel } from './orientations';
import type { RendererFactory, RendererPort, ResolvedDepthMode } from './renderer';
import { StarField } from './stars';
import {
  NEPTUNE_SEMI_MAJOR_AXIS_AU,
  RADII_KM,
  SCENE_BODIES,
  createSolarSystemModel,
  offsetFunction,
  sceneBody,
  systemPlanetOf,
} from './system';
import type { TextureId, TextureMeta, TextureSource } from './textures';
import type {
  BodyId,
  DepthMode,
  ExplorerView,
  FrameStats,
  QualityLevel,
  QualitySetting,
  ScaleMode,
  SceneEngineApi,
  SceneEngineEventName,
  SceneEngineEvents,
  SceneEngineOptions,
} from './types';
import { OrbitSource } from './orbits';
import { World } from './world';
import { illustrativeDistance } from '../ephemeris/scale';
import { BODY_DATA } from '../data/body-data';

/** Profundidad elegida en la fase 2 (D13); ver docs/informes/fase-2.md. */
export const DEFAULT_DEPTH: ResolvedDepthMode = 'logarithmic';

/** Color del fondo del visor (`--color-bg` de docs/DISENO.md). */
export const BACKGROUND_COLOR = 0x0d1321;

/** Encuadres: distancia de la cámara en radios del cuerpo enfocado. */
/**
 * Encuadres: fracción del lado más corto de la vista que ocupa el cuerpo enfocado (así encaja igual
 * en un escritorio apaisado que en un móvil vertical).
 */
export const FRAMING_FILL = { body: 0.46, detail: 0.82 } as const;

/**
 * Distancia de la cámara, en radios del cuerpo, para que ocupe la fracción `fill` del lado más
 * corto de una vista con ese campo vertical (grados) y esa proporción ancho/alto.
 */
export function framingDistanceRadii(fill: number, verticalFovDeg: number, aspect: number): number {
  const halfVertical = (verticalFovDeg * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  const halfMin = Math.min(halfVertical, halfHorizontal);
  return 1 / Math.sin(Math.atan(fill * Math.tan(halfMin)));
}
/** Elevación de la vista general (rad): una vista oblicua de la eclíptica. */
const OVERVIEW_ELEVATION = 0.42;
const OVERVIEW_AZIMUTH = -0.55;
/** Exposición por vista (D21). */
const EXPOSURE: Readonly<Record<ExplorerView, number>> = { system: 1, earth: 1, moon: 1 };
/** La cámara no entra en el cuerpo enfocado. */
const MIN_DISTANCE_RADII = 1.12;
const MAX_FRAME_DT_MS = 100;
const TIME_EVENT_INTERVAL_MS = 200;
const STATS_INTERVAL_MS = 1000;

export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

export interface PageVisibility {
  hidden(): boolean;
  subscribe(listener: () => void): () => void;
}

export interface TextureSetup {
  readonly source: TextureSource;
  readonly meta: Readonly<Record<TextureId, TextureMeta>>;
}

export interface EngineDeps {
  readonly createRenderer: RendererFactory;
  readonly scheduler: FrameScheduler;
  /** Reloj en milisegundos (performance.now en el navegador). */
  readonly now: () => number;
  readonly device: () => Omit<DeviceInfo, 'maxTextureSize'>;
  readonly loadStars: () => Promise<ArrayBuffer | Uint8Array>;
  readonly textures: (context: {
    readonly maxTextureSize: number;
    readonly anisotropy: () => number;
    readonly upload: (texture: Texture) => Promise<void>;
  }) => TextureSetup | null;
  readonly visibility: PageVisibility;
  /** Cede el hilo principal entre pasos del arranque (PLAN §4.7). */
  readonly yieldToMain: () => Promise<void>;
}

type CameraFraming =
  | { readonly kind: 'overview'; distance: number }
  | { readonly kind: 'body'; readonly index: number; readonly fill: number; zoom: number };

type Listener<K extends SceneEngineEventName> = (event: SceneEngineEvents[K]) => void;

const SUN_INDEX = SCENE_BODIES.findIndex((body) => body.kind === 'star');
const NEPTUNE_INDEX = SCENE_BODIES.findIndex((body) => body.id === 'neptuno');

export class SceneEngine implements SceneEngineApi {
  private readonly clock: SimClock;
  private readonly system = createSolarSystemModel();
  private readonly orientations = new OrientationModel(SCENE_BODIES);
  private readonly frames: FrameController;
  private readonly rig: CameraRig;
  private readonly renderer: RendererPort;
  private readonly world: World;
  private readonly labels: LabelLayer;
  private readonly adaptive = new AdaptiveQuality(DEFAULT_ADAPTIVE_OPTIONS);
  private readonly listeners = new Map<SceneEngineEventName, Set<Listener<SceneEngineEventName>>>();
  private readonly unsubscribe: (() => void)[] = [];
  private readonly uploads: { texture: Texture; resolve: () => void }[] = [];
  private readonly reducedMotion: boolean;
  private readonly captureMode: boolean;
  private qualitySetting: QualitySetting;
  private level: QualityLevel;
  private profile: QualityProfile;
  private _view: ExplorerView;
  private _scale: ScaleMode;
  private focusIndex: number | null = null;
  private framing: CameraFraming;
  private viewport = { width: 1, height: 1, dpr: 1 };
  private handle: number | null = null;
  private lastFrameMs: number | null = null;
  private lastTimeEventMs = -Infinity;
  private lastStatsMs = -Infinity;
  private frameTimes: number[] = [];
  private renderedFrames = 0;
  private cpuMs = 0;
  private ephemerisMs = 0;
  private screen: ScreenBody[] = [];
  private screenThree = new Float64Array(3 * SCENE_BODIES.length);
  private contextLost = false;
  private readonly background: number | null;
  private ready = false;
  private disposed = false;
  private readonly startMs: number;

  constructor(
    options: SceneEngineOptions,
    private readonly deps: EngineDeps,
  ) {
    this.startMs = deps.now();
    this.reducedMotion = options.reducedMotion;
    this.captureMode = options.capture ?? false;
    this.clock = new SimClock(options.time);
    this._view = options.view;
    this._scale = options.scale ?? 'illustrative';
    this.renderer = deps.createRenderer(options.canvas, {
      depth: resolveDepth(options.depth ?? 'auto'),
      antialias: true,
      clearColor: BACKGROUND_COLOR,
    });
    const caps = this.renderer.capabilities;
    this.qualitySetting = options.quality;
    this.level =
      options.quality === 'auto'
        ? detectQuality({ ...deps.device(), maxTextureSize: caps.maxTextureSize })
        : options.quality;
    this.profile = QUALITY_PROFILES[this.level];

    const textures = deps.textures({
      maxTextureSize: caps.maxTextureSize,
      anisotropy: () => Math.min(this.profile.anisotropy, caps.maxAnisotropy),
      upload: (texture) => this.queueUpload(texture),
    });
    const rings = BODY_DATA.saturno.rings;
    this.world = new World({
      bodies: SCENE_BODIES,
      profile: this.profile,
      orbitSources,
      textures: textures?.source ?? null,
      textureMeta: textures?.meta ?? null,
      rings: {
        innerKm: rings?.innerRadiusKm.value ?? 0,
        outerKm: rings?.outerRadiusKm.value ?? 0,
      },
      invalidate: () => this.invalidate(),
    });

    const initial =
      options.focus !== undefined && options.focus !== null
        ? {
            focus: sceneBody(options.focus).index,
            framing: this.bodyFraming(sceneBody(options.focus).index, 'body'),
          }
        : this.viewSetup(options.view);
    this.focusIndex = initial.focus;
    this.background = options.background ? sceneBody(options.background).index : null;
    this.frames = new FrameController(
      this.frameSpec(initial.focus),
      initial.focus ?? SUN_INDEX,
      SCENE_BODIES.length,
    );
    this.framing = initial.framing;
    const angles = options.focus ? null : this.viewAngles(options.view);
    this.rig = new CameraRig({
      distance: 1,
      azimuth: angles?.azimuth ?? OVERVIEW_AZIMUTH,
      elevation: angles?.elevation ?? OVERVIEW_ELEVATION,
    });
    this.renderer.setExposure(EXPOSURE[options.view]);

    const infos: LabelInfo[] = SCENE_BODIES.map((body) => ({
      id: body.id,
      name: body.name,
      kind: body.kind,
      parentIndex: body.parent ? sceneBody(body.parent).index : -1,
    }));
    this.labels = new LabelLayer(options.labelLayer, infos, (id) =>
      this.emit('bodyPicked', { id: id as BodyId }),
    );

    this.unsubscribe.push(
      attachPointerControls(options.canvas, {
        rotate: (dAz, dEl) => {
          this.rig.rotate(dAz, dEl);
          this.invalidate();
        },
        fling: (vAz, vEl) => {
          if (this.reducedMotion || this.captureMode) return;
          this.rig.fling(vAz, vEl);
          this.invalidate();
        },
        zoom: (factor) => this.zoomBy(factor),
        pick: (x, y) => {
          const index = pickBody(this.screen, x, y);
          const body = index === null ? undefined : SCENE_BODIES[index];
          if (body) this.emit('bodyPicked', { id: body.id });
        },
      }),
      this.renderer.onContextLost(() => this.onContextLost()),
      this.renderer.onContextRestored(() => this.onContextRestored()),
      deps.visibility.subscribe(() => this.onVisibilityChange()),
    );

    void this.startup();
  }

  // --- Estado de solo lectura ---------------------------------------------------------------

  get time(): Date {
    return this.clock.time;
  }
  get playing(): boolean {
    return this.clock.playing;
  }
  get speed(): number {
    return this.clock.speed;
  }
  get focusedBody(): BodyId | null {
    return this.focusIndex === null ? null : (SCENE_BODIES[this.focusIndex]?.id ?? null);
  }
  get view(): ExplorerView {
    return this._view;
  }
  get scaleMode(): ScaleMode {
    return this._scale;
  }
  get qualityLevel(): QualityLevel {
    return this.level;
  }

  // --- Órdenes --------------------------------------------------------------------------------

  setTime(time: Date): void {
    if (this.disposed) return;
    this.clock.setTime(time);
    this.emitTime(true);
    this.invalidate();
  }

  setPlaying(playing: boolean): void {
    if (this.disposed) return;
    const limit = this.clock.setPlaying(playing);
    if (limit) this.emit('limitReached', { limit });
    this.lastFrameMs = null;
    this.emitTime(true);
    this.invalidate();
  }

  setSpeed(simSecondsPerSecond: number): void {
    if (this.disposed) return;
    this.clock.setSpeed(simSecondsPerSecond);
    this.emitTime(true);
  }

  focus(body: BodyId | null): void {
    if (this.disposed) return;
    const index = body === null ? null : sceneBody(body).index;
    this.changeFocus(
      index,
      index === null ? this.overviewFraming() : this.bodyFraming(index, 'body'),
    );
  }

  setScaleFrame(mode: ScaleMode): void {
    if (this.disposed || mode === this._scale) return;
    this._scale = mode;
    this.frames.transitionTo(
      this.frameSpec(this.focusIndex),
      this.frames.focus,
      this.deps.now(),
      this.transitionMs(),
    );
    this.invalidate();
  }

  setQuality(setting: QualitySetting): void {
    if (this.disposed) return;
    this.qualitySetting = setting;
    this.adaptive.reset(this.deps.now());
    if (setting !== 'auto') this.applyQuality(setting, 'manual');
    else this.emit('qualityChanged', { level: this.level, setting, reason: 'manual' });
  }

  setView(view: ExplorerView): void {
    if (this.disposed || view === this._view) return;
    this._view = view;
    this.renderer.setExposure(EXPOSURE[view]);
    const setup = this.viewSetup(view);
    this.changeFocus(setup.focus, setup.framing);
    const angles = this.viewAngles(view);
    if (angles) this.rig.setTarget(angles, this.reducedMotion || this.captureMode);
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    if (this.disposed) return;
    this.viewport = {
      width: Math.max(1, width),
      height: Math.max(1, height),
      dpr: devicePixelRatio,
    };
    this.applySize();
    if (this.framing.kind === 'overview') this.framing.distance = this.overviewDistance();
    this.invalidate();
  }

  async capture(): Promise<Blob> {
    this.renderFrame(this.deps.now());
    return this.renderer.toBlob();
  }

  stats(): FrameStats {
    const info = this.renderer.info();
    const now = this.deps.now();
    const recent = this.frameTimes.filter((t) => now - t <= 1000);
    return {
      fps: recent.length > 1 ? recent.length : 0,
      frameMs: this.cpuMs,
      ephemerisMs: this.ephemerisMs,
      drawCalls: info.calls,
      triangles: info.triangles,
      geometries: info.geometries,
      textures: info.textures,
      vramMB: this.world.vramBytes() / 1_048_576,
      renderedFrames: this.renderedFrames,
      quality: this.level,
      depth: this.renderer.capabilities.depth,
    };
  }

  on<K extends SceneEngineEventName>(type: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as Listener<SceneEngineEventName>);
    this.listeners.set(type, set);
    return () => set.delete(listener as Listener<SceneEngineEventName>);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.handle !== null) this.deps.scheduler.cancel(this.handle);
    this.handle = null;
    for (const off of this.unsubscribe.splice(0)) off();
    for (const upload of this.uploads.splice(0)) upload.resolve();
    this.labels.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }

  // --- Arranque troceado (PLAN §4.7) ---------------------------------------------------------

  private async startup(): Promise<void> {
    const total = 4;
    try {
      await this.deps.yieldToMain();
      if (this.disposed) return;
      this.emit('progress', { loaded: 0, total, step: 'Calculando posiciones' });
      this.emit('qualityChanged', {
        level: this.level,
        setting: this.qualitySetting,
        reason: 'initial',
      });
      this.renderFrame(this.deps.now(), false); // prepara el estado y la cámara sin pintar aún
      if (this.background !== null) this.alignBehind(this.background);
      await this.deps.yieldToMain();
      if (this.disposed) return;
      this.emit('progress', { loaded: 1, total, step: 'Cargando estrellas' });
      const stars = new StarField(decodeStarCatalog(await this.deps.loadStars()));
      if (this.disposed) {
        stars.dispose();
        return;
      }
      stars.setPixelRatio(this.pixelRatio());
      this.world.setStars(stars);
      this.emit('progress', { loaded: 2, total, step: 'Compilando sombreados' });
      await this.renderer.compile(this.world.scene, this.world.camera);
      if (this.disposed) return;
      this.emit('progress', { loaded: 3, total, step: 'Primer fotograma' });
      this.renderFrame(this.deps.now());
      this.ready = true;
      this.emit('progress', { loaded: total, total, step: 'Listo' });
      this.emit('ready', { startupMs: this.deps.now() - this.startMs });
      this.emitTime(true);
      this.world.setFocus(this.focusIndex);
      this.invalidate();
    } catch (error) {
      if (this.disposed) return;
      this.emit('error', {
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
    }
  }

  // --- Bucle ----------------------------------------------------------------------------------

  /** Pide un frame si no hay uno pedido (render bajo demanda). */
  private invalidate(): void {
    if (this.disposed || this.contextLost || !this.ready || this.handle !== null) return;
    if (this.deps.visibility.hidden()) return;
    this.handle = this.deps.scheduler.request((time) => {
      this.handle = null;
      this.tick(time);
    });
  }

  private tick(timeMs: number): void {
    if (this.disposed || this.contextLost) return;
    const dt =
      this.lastFrameMs === null ? 16 : Math.min(timeMs - this.lastFrameMs, MAX_FRAME_DT_MS);
    this.lastFrameMs = timeMs;
    const limit = this.clock.advance(dt);
    if (limit) {
      this.emit('limitReached', { limit });
      this.emitTime(true);
    } else if (this.clock.playing) {
      this.emitTime(false);
    }
    const moving = this.renderFrame(timeMs, true, dt);
    const uploading = this.processUpload();
    const animating = this.clock.playing || moving || this.frames.animating;
    if (this.qualitySetting === 'auto' && !this.captureMode) {
      const lower = this.adaptive.sample(this.deps.now(), animating, this.level);
      if (lower) this.applyQuality(lower, 'auto');
    }
    if (animating || uploading || this.uploads.length > 0) this.invalidate();
    else this.lastFrameMs = null;
  }

  /**
   * Calcula y (si `paint`) pinta un frame. Devuelve si la cámara sigue moviéndose.
   */
  private renderFrame(timeMs: number, paint = true, dtMs = 0): boolean {
    const cpuStart = this.deps.now();
    const state = this.system.at(this.clock.timeMsValue);
    const orientations = this.orientations.at(state);
    this.ephemerisMs = 0.9 * this.ephemerisMs + 0.1 * (this.deps.now() - cpuStart);
    this.frames.update(placementInput(state), this.deps.now());
    const moving = this.updateCamera(dtMs);
    const camera = this.world.camera;
    this.rig.applyTo(camera);
    this.world.update({
      frames: this.frames,
      state,
      orientations,
      focusIndex: this.frames.focus,
      highlighted: this.focusIndex ?? -1,
      speedDaysPerSecond: this.clock.playing ? this.clock.speed / 86_400 : 0,
      viewport: this.viewport,
      screen: this.screen,
      detail: this._view !== 'system',
    });
    camera.updateMatrixWorld();
    this.updateScreen();
    if (!paint) return moving;
    this.renderer.render(this.world.scene, camera);
    this.renderedFrames++;
    this.frameTimes.push(timeMs);
    if (this.frameTimes.length > 240) this.frameTimes.splice(0, this.frameTimes.length - 240);
    this.cpuMs = 0.9 * this.cpuMs + 0.1 * (this.deps.now() - cpuStart);
    if (timeMs - this.lastStatsMs >= STATS_INTERVAL_MS) {
      this.lastStatsMs = timeMs;
      this.emit('frameStats', this.stats());
    }
    return moving;
  }

  /** Objetivos de la cámara según el encuadre; avanza su amortiguación. */
  private updateCamera(dtMs: number): boolean {
    const radii = this.frames.output.radius;
    const focusRadius = radii[this.frames.focus] as number;
    if (this.framing.kind === 'body') {
      this.rig.setLimits(focusRadius * MIN_DISTANCE_RADII, Infinity);
      const radii = framingDistanceRadii(
        this.framing.fill,
        this.world.camera.fov,
        this.viewport.width / this.viewport.height,
      );
      this.rig.setTarget({ distance: focusRadius * radii * this.framing.zoom });
    } else {
      // La distancia de la vista general sigue la escala del marco que se ve: durante una
      // transición (por ejemplo, desde el sistema local de la Tierra) el sistema todavía es enorme
      // y la cámara no puede llegar antes que él.
      this.rig.setLimits(focusRadius * MIN_DISTANCE_RADII, Infinity);
      this.rig.setTarget({ distance: this.framing.distance * this.extentScale() });
    }
    if (this.reducedMotion || this.captureMode) {
      this.rig.snap();
      return false;
    }
    return this.rig.update(dtMs);
  }

  /**
   * Cuánto mide ahora el sistema (Neptuno respecto al foco) comparado con la escala ilustrativa, en
   * la que está calculada la distancia de la vista general. Fuera de las transiciones es ≈ 1.
   */
  private extentScale(): number {
    const p = this.frames.output.position;
    const k = 3 * NEPTUNE_INDEX;
    const now = Math.hypot(p[k] as number, p[k + 1] as number, p[k + 2] as number);
    const state = this.system.at(this.clock.timeMsValue);
    const helio = state.heliocentricOf('neptuno');
    const illustrative = illustrativeDistance(Math.hypot(helio.x, helio.y, helio.z));
    return now > 0 && illustrative > 0 ? now / illustrative : 1;
  }

  /** Proyecta los cuerpos y coloca las etiquetas. */
  private updateScreen(): void {
    const output = this.frames.output;
    const p = output.position;
    const t = this.screenThree;
    for (let k = 0; k < SCENE_BODIES.length; k++) {
      t[3 * k] = p[3 * k] as number;
      t[3 * k + 1] = p[3 * k + 2] as number;
      t[3 * k + 2] = -(p[3 * k + 1] as number);
    }
    const { width, height } = this.viewport;
    this.screen = projectBodies(this.world.camera, t, output.radius, width, height);
    const focusBody = this.focusIndex === null ? null : SCENE_BODIES[this.focusIndex];
    const planet = focusBody ? systemPlanetOf(focusBody.id) : null;
    const boxes = layoutLabels(
      this.screen,
      this.labelInfos(),
      this.labels.measure(),
      { width, height },
      this.focusIndex ?? -1,
      planet ? sceneBody(planet).index : -1,
    );
    this.labels.update(boxes, this.focusIndex ?? -1);
  }

  private labelInfoCache: LabelInfo[] | null = null;
  private labelInfos(): LabelInfo[] {
    this.labelInfoCache ??= SCENE_BODIES.map((body) => ({
      id: body.id,
      name: body.name,
      kind: body.kind,
      parentIndex: body.parent ? sceneBody(body.parent).index : -1,
    }));
    return this.labelInfoCache;
  }

  // --- Cámara, foco y vistas -----------------------------------------------------------------

  private changeFocus(index: number | null, framing: CameraFraming): void {
    const frameFocus = index ?? SUN_INDEX;
    if (this.frames.focus !== frameFocus) {
      // La cámara no se mueve en el mundo: se recoloca respecto al foco nuevo.
      const out = this.frames.output.position;
      const k = 3 * frameFocus;
      this.rig.reanchor({
        x: out[k] as number,
        y: out[k + 2] as number,
        z: -(out[k + 1] as number),
      });
    }
    this.focusIndex = index;
    this.framing = framing;
    this.frames.transitionTo(
      this.frameSpec(index),
      frameFocus,
      this.deps.now(),
      this.transitionMs(),
    );
    if (framing.kind === 'overview') {
      // La vista general vuelve siempre a su encuadre (todo el sistema a la vista).
      this.rig.setTarget(
        { azimuth: OVERVIEW_AZIMUTH, elevation: OVERVIEW_ELEVATION },
        this.reducedMotion || this.captureMode,
      );
    }
    if (this.ready) this.world.setFocus(index);
    this.lastFrameMs = null;
    this.invalidate();
  }

  /** Coloca la cámara de modo que `index` quede justo detrás del foco (modo de captura). */
  private alignBehind(index: number): void {
    const p = this.frames.output.position;
    const x = p[3 * index] as number;
    const y = p[3 * index + 2] as number;
    const z = -(p[3 * index + 1] as number);
    const length = Math.hypot(x, y, z);
    if (length === 0) return;
    // Un poco ladeada: el cuerpo de fondo asoma junto al borde del foco en vez de quedar tapado.
    const focusRadius = this.frames.output.radius[this.frames.focus] as number;
    const side =
      1.5 * Math.asin(Math.min(1, focusRadius / Math.max(this.rig.distance, focusRadius)));
    this.rig.setTarget(
      { azimuth: Math.atan2(-x, -z) + side, elevation: Math.asin(-y / length) },
      true,
    );
    this.renderFrame(this.deps.now(), false);
  }

  private zoomBy(factor: number): void {
    if (!(factor > 0)) return;
    if (this.framing.kind === 'body') {
      this.framing.zoom = Math.min(Math.max(this.framing.zoom * factor, 0.05), 2e5);
    } else {
      const base = this.overviewDistance();
      this.framing.distance = Math.min(
        Math.max(this.framing.distance * factor, base * 0.02),
        base * 4,
      );
    }
    this.invalidate();
  }

  private viewSetup(view: ExplorerView): { focus: number | null; framing: CameraFraming } {
    if (view === 'earth') {
      const index = sceneBody('tierra').index;
      return { focus: index, framing: this.bodyFraming(index, 'detail') };
    }
    if (view === 'moon') {
      const index = sceneBody('luna').index;
      return { focus: index, framing: this.bodyFraming(index, 'detail') };
    }
    return { focus: null, framing: this.overviewFraming() };
  }

  /**
   * Desde dónde se mira en las vistas de detalle: la Tierra, con el lado de día y el terminador a la
   * vista (la cámara, a 40° del Sol y un poco por encima de la eclíptica); la Luna, desde la Tierra
   * (su cara visible, con la libración del momento).
   */
  private viewAngles(view: ExplorerView): { azimuth: number; elevation: number } | null {
    if (view === 'system') return null;
    const state = this.system.at(this.clock.timeMsValue);
    let ecl;
    let lift = 0;
    if (view === 'earth') {
      const sun = state.heliocentricOf('tierra');
      const angle = (40 * Math.PI) / 180;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      // Hacia el Sol (−posición heliocéntrica), girado 40° alrededor del polo de la eclíptica.
      ecl = { x: -(sun.x * c - sun.y * s), y: -(sun.x * s + sun.y * c), z: -sun.z };
      lift = 0.3;
    } else {
      const offset = state.parentOffsetOf('luna');
      ecl = { x: -offset.x, y: -offset.y, z: -offset.z };
    }
    // ECL → Three (x, z, −y).
    const x = ecl.x;
    const y = ecl.z;
    const z = -ecl.y;
    const length = Math.hypot(x, y, z);
    return { azimuth: Math.atan2(x, z), elevation: Math.asin(y / length) + lift };
  }

  private bodyFraming(index: number, kind: keyof typeof FRAMING_FILL): CameraFraming {
    return { kind: 'body', index, fill: FRAMING_FILL[kind], zoom: 1 };
  }

  private overviewFraming(): CameraFraming {
    return { kind: 'overview', distance: this.overviewDistance() };
  }

  /** Distancia a la que la órbita de Neptuno cabe en pantalla (en la escala ilustrativa y la real). */
  private overviewDistance(): number {
    const extent = illustrativeDistance(NEPTUNE_SEMI_MAJOR_AXIS_AU * 1.012);
    const vertical = (this.world.camera.fov * Math.PI) / 360;
    const aspect = this.viewport.width / this.viewport.height;
    const horizontal = Math.atan(Math.tan(vertical) * aspect);
    // Con la vista oblicua, la órbita se ve como una elipse: el ancho es lo que manda.
    return (extent / Math.tan(Math.min(horizontal, vertical * 1.9))) * 1.06;
  }

  private frameSpec(focus: number | null) {
    const body = focus === null ? null : SCENE_BODIES[focus];
    const planet = body ? systemPlanetOf(body.id) : null;
    return frameFor(
      this._scale,
      planet ? sceneBody(planet).radiusKm : null,
      NEPTUNE_SEMI_MAJOR_AXIS_AU,
    );
  }

  private transitionMs(): number {
    return this.reducedMotion || this.captureMode ? 0 : FRAME_TRANSITION_MS;
  }

  // --- Calidad y tamaño ------------------------------------------------------------------------

  private applyQuality(level: QualityLevel, reason: 'auto' | 'manual'): void {
    if (level !== this.level) {
      this.level = level;
      this.profile = QUALITY_PROFILES[level];
      this.world.setQuality(this.profile);
      this.applySize();
      this.invalidate();
    }
    this.emit('qualityChanged', { level, setting: this.qualitySetting, reason });
  }

  /**
   * Densidad de píxeles del lienzo, con el tope de la calidad. En el modo de captura también: la
   * captura es determinista para un tamaño de ventana y una densidad dados (los fija el script).
   */
  private pixelRatio(): number {
    return Math.min(this.viewport.dpr, this.profile.maxPixelRatio);
  }

  private applySize(): void {
    const ratio = this.pixelRatio();
    this.renderer.setSize(this.viewport.width, this.viewport.height, ratio);
    this.world.setPixelRatio(ratio);
  }

  // --- Texturas: una subida a la GPU por frame (PLAN §4.7) -----------------------------------

  private queueUpload(texture: Texture): Promise<void> {
    return new Promise((resolve) => {
      this.uploads.push({ texture, resolve });
      this.invalidate();
    });
  }

  private processUpload(): boolean {
    const next = this.uploads.shift();
    if (!next) return false;
    this.renderer.initTexture(next.texture);
    next.resolve();
    return true;
  }

  // --- Eventos del navegador -----------------------------------------------------------------

  private onVisibilityChange(): void {
    if (this.deps.visibility.hidden()) {
      if (this.handle !== null) this.deps.scheduler.cancel(this.handle);
      this.handle = null;
      this.lastFrameMs = null;
      this.adaptive.reset(this.deps.now());
    } else {
      this.lastFrameMs = null;
      this.invalidate();
    }
  }

  private onContextLost(): void {
    this.contextLost = true;
    if (this.handle !== null) this.deps.scheduler.cancel(this.handle);
    this.handle = null;
    this.emit('contextLost', {});
  }

  private onContextRestored(): void {
    this.contextLost = false;
    this.lastFrameMs = null;
    this.applySize();
    this.emit('contextRestored', {});
    this.invalidate();
  }

  // --- Eventos del motor ---------------------------------------------------------------------

  private emit<K extends SceneEngineEventName>(type: K, event: SceneEngineEvents[K]): void {
    for (const listener of this.listeners.get(type) ?? []) (listener as Listener<K>)(event);
  }

  /** Tiempo al store: como mucho 5 veces por segundo durante la reproducción (PLAN §4.5). */
  private emitTime(force: boolean): void {
    const now = this.deps.now();
    if (!force && now - this.lastTimeEventMs < TIME_EVENT_INTERVAL_MS) return;
    this.lastTimeEventMs = now;
    this.emit('timeChanged', {
      time: this.clock.time,
      playing: this.clock.playing,
      speed: this.clock.speed,
    });
  }
}

function resolveDepth(mode: DepthMode): ResolvedDepthMode {
  return mode === 'auto' ? DEFAULT_DEPTH : mode;
}

function placementInput(state: SystemState): PlacementInput {
  return {
    heliocentric: state.heliocentric,
    parentOffset: state.parentOffset,
    parentIndex: state.layout.parentIndex,
    radiusKm: RADII_KM,
  };
}

/** Las 29 órbitas: los planetas alrededor del Sol y las lunas alrededor de su planeta. */
export function orbitSources(profile: QualityProfile): OrbitSource[] {
  return SCENE_BODIES.filter((body) => body.kind !== 'star').map((body) => {
    const orbit = BODY_DATA[body.id].orbit;
    if (!orbit) throw new Error(`Falta la órbita de «${body.id}».`);
    const isPlanet = body.kind === 'planet';
    const parentIndex = isPlanet || !body.parent ? -1 : sceneBody(body.parent).index;
    const periodDays = Math.abs(orbit.periodDays.value);
    return {
      bodyIndex: body.index,
      parentIndex,
      periodDays,
      // La forma de una órbita planetaria apenas cambia en una década; las de las lunas precesan
      // más deprisa (la de Fobos, 0,4° al día): se renuevan cada dos vueltas o cada mes.
      validityDays: isPlanet ? 3650 : Math.min(Math.max(2 * periodDays, 1), 30),
      segments: isPlanet ? profile.orbitSegments : Math.max(64, profile.orbitSegments / 2),
      position: offsetFunction(body.id),
    };
  });
}
