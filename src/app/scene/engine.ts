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
import { Mat3, Vec3, columnOf, mulMat3Vec, normalize, vec3 } from '../ephemeris/vec3';
import { AliasingState, MotionBody } from './aliasing';
import { FOCUS_FLIGHT_MS, FRAME_START, Flight, VIEW_TRIP_MS, flightFrame } from './camera/flight';
import { ViewFrom, anglesFromEcl, phaseViewDirection } from './camera/view-from';
import { CameraRig, RigPose } from './camera/rig';
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
  ViewInsets,
} from './types';
import { OrbitSource } from './orbits';
import { SCHEMATIC_COLORS } from './body-colors';
import {
  NO_INSETS,
  ViewProjection,
  approachInsets,
  sanitizeInsets,
  viewProjection,
} from './view-insets';
import { BODY_TEXTURES, World } from './world';
import { TEXTURE_MEAN_LUMINANCE } from './texture-files';
import {
  VISUAL_CONFIG,
  backgroundGain,
  closeUpAmount,
  exposureFor,
  fillLight,
  moonPresence,
} from './visual-config';
import { illustrativeDistance } from '../ephemeris/scale';
import { BODY_DATA } from '../data/body-data';
import { BODY_PHOTOMETRY } from '../data/photometry';
import { discFactor, interpolateLitBrightness, litBrightnessTable } from '../ephemeris/photometry';

/** Profundidad elegida en la fase 2 (D13); ver docs/informes/fase-2.md. */
export const DEFAULT_DEPTH: ResolvedDepthMode = 'logarithmic';

/** Color del fondo del visor (`--color-bg` de docs/DISENO.md). */
export const BACKGROUND_COLOR = 0x0d1321;

/**
 * Encuadres: fracción del lado más corto de la parte visible que ocupa el cuerpo enfocado (así
 * encaja igual en un escritorio apaisado que en un móvil vertical, con o sin paneles).
 */
export const FRAMING_FILL = { body: 0.46, detail: 0.82 } as const;
/** Campo de visión vertical de la cámara con todo el lienzo visible (grados). */
export const BASE_FOV_DEG = 40;

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
/**
 * Distancia mínima de la cámara para que una circunferencia de radio `radius` en el plano de la
 * eclíptica, centrada en el punto al que mira, quepa entera en una vista con esas tangentes de los
 * semiángulos, vista desde esa elevación (rad). Con la perspectiva, el lado cercano se ve más
 * grande que el lejano: el ancho máximo proyectado es R/√(d² − R²·cos²e) (en sen θ = R·cos e/d) y
 * el borde de abajo, el del lado cercano, R·sen e/(d − R·cos e).
 */
export function circleFitDistance(
  radius: number,
  elevation: number,
  tanHalfHorizontal: number,
  tanHalfVertical: number,
): number {
  const cos = Math.cos(elevation);
  const sin = Math.sin(elevation);
  const width = radius * Math.sqrt(1 / tanHalfHorizontal ** 2 + cos * cos);
  const depth = radius * (cos + sin / tanHalfVertical);
  return Math.max(width, depth);
}

/** Elevación de la vista general (rad): una vista oblicua de la eclíptica. */
const OVERVIEW_ELEVATION = 0.42;
/** Margen de la vista general alrededor de la órbita de Neptuno. */
const OVERVIEW_MARGIN = 1.05;
const OVERVIEW_AZIMUTH = -0.55;
const OVERVIEW_ANGLES = { azimuth: OVERVIEW_AZIMUTH, elevation: OVERVIEW_ELEVATION } as const;
/** La cámara no entra en el cuerpo enfocado. */
const MIN_DISTANCE_RADII = 1.12;
/**
 * Paso máximo de tiempo entre frames a las velocidades rápidas: un tirón no da un salto (a las
 * lentas, el reloj sigue al de pared: `clockStep`). Los saltos de una pestaña oculta los evita
 * `visibilitychange`.
 */
const MAX_FRAME_DT_MS = 400;

/** Los únicos cuerpos con nombre en las vistas Tierra y Luna. */
const DETAIL_LABELS: readonly string[] = ['tierra', 'luna', 'sol'];
const TIME_EVENT_INTERVAL_MS = 200;
const STATS_INTERVAL_MS = 1000;
/** Suavizado del encuadre cuando cambian los márgenes de la interfaz (ms). */
const INSETS_SMOOTHING_MS = 180;
/**
 * Render bajo demanda también al reproducir: hasta esta velocidad (s simulados por s real) nada se
 * mueve un píxel en un frame (a tiempo real, la Tierra gira 0,004° por segundo) y se pinta a 4 Hz.
 */
export const SLOW_SPEED = 60;
export const SLOW_FRAME_MS = 250;

export interface FrameScheduler {
  /** Pide un frame; con `delayMs`, no antes de que pase ese tiempo (el render a 4 Hz). */
  request(callback: (timeMs: number) => void, delayMs?: number): number;
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
  | { readonly kind: 'overview'; zoom: number }
  | { readonly kind: 'body'; readonly index: number; readonly fill: number; zoom: number };

type TravelKind = SceneEngineEvents['travel']['kind'];
type Angles = Pick<RigPose, 'azimuth' | 'elevation'>;

/** Un vuelo de cámara en curso (PLAN 3.c.6 y 3.c.8). */
interface ActiveFlight extends Flight {
  readonly kind: TravelKind;
  /** Ángulos de llegada (`null`: los de salida, la cámara solo se acerca o se aleja). */
  readonly angles: Angles | null;
  /** Foco de partida: al despegar la cámara aún mira hacia él. */
  readonly fromIndex: number;
  /** El usuario ha tomado la cámara: solo termina el giro de la mirada. */
  userControl: boolean;
}

type Listener<K extends SceneEngineEventName> = (event: SceneEngineEvents[K]) => void;

const SUN_INDEX = SCENE_BODIES.findIndex((body) => body.kind === 'star');
/** Índice del planeta de cada luna (−1 en el Sol y los planetas). */
const MOON_PARENT = SCENE_BODIES.map((body) =>
  body.kind === 'moon' && body.parent ? sceneBody(body.parent).index : -1,
);
const NEPTUNE_INDEX = SCENE_BODIES.findIndex((body) => body.id === 'neptuno');
const EARTH_INDEX = SCENE_BODIES.findIndex((body) => body.id === 'tierra');

/**
 * Albedo con el que se compensa la exposición del primer plano de cada cuerpo (configuración visual),
 * o `null` (el Sol, que emite luz). Los que se calibran, el geométrico del catálogo. La Tierra, desde
 * la fase 5, también el geométrico del catálogo (0,434), que incluye las nubes: ya se dibujan (hasta
 * entonces, el efectivo de su textura, ≈ 0,08, porque sin nubes quedaba casi negra). Los demás, el
 * efectivo de su propia textura.
 */
const FOCUS_ALBEDO: readonly (number | null)[] = SCENE_BODIES.map((body) => {
  if (body.id === 'sol') return null;
  const photometry = BODY_PHOTOMETRY[body.id];
  if (photometry.calibrateAlbedo || body.id === 'tierra') {
    return BODY_DATA[body.id].physical.geometricAlbedo?.value ?? null;
  }
  const texture = BODY_TEXTURES[body.id];
  const luminance = texture ? TEXTURE_MEAN_LUMINANCE[texture] : undefined;
  return luminance ? luminance * discFactor(photometry.photometry) : null;
});

/**
 * Radio que ocupa cada cuerpo para las etiquetas, en radios de su disco: con anillos (Saturno), el
 * borde exterior del anillo A de la ficha de la NASA. Así su nombre no los tapa (fase 3b, tarea 8).
 */
const LABEL_EXTENTS: readonly number[] = SCENE_BODIES.map((body) => {
  const rings = BODY_DATA[body.id].rings;
  return rings ? rings.outerRadiusKm.value / body.radiusKm : 1;
});

/** Periodos de cada cuerpo para decidir el aliasing (§4.5), del catálogo. */
export const MOTION_BODIES: readonly MotionBody[] = SCENE_BODIES.map((body) => {
  const data = BODY_DATA[body.id];
  const orbitDays = data.orbit ? Math.abs(data.orbit.periodDays.value) : null;
  const rotationH = data.physical.rotationPeriodH?.value;
  return {
    orbitDays,
    spinDays: data.physical.synchronousRotation?.value
      ? orbitDays
      : rotationH !== undefined
        ? Math.abs(rotationH) / 24
        : null,
    parentIndex: body.parent ? sceneBody(body.parent).index : -1,
    isMoon: body.kind === 'moon',
  };
});

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
  private readonly aliasing = new AliasingState(MOTION_BODIES);
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
  /** Márgenes pedidos por la interfaz, tal cual: se recortan contra el tamaño actual del lienzo. */
  private insetsRequested: ViewInsets = NO_INSETS;
  private insetsTarget: ViewInsets = NO_INSETS;
  private insets: ViewInsets = NO_INSETS;
  private projection: ViewProjection = viewProjection(1, 1, BASE_FOV_DEG, NO_INSETS);
  private flight: ActiveFlight | null = null;
  /** Adónde mira la cámara durante un vuelo (relativo al foco; `null`: al foco). */
  private look: Vec3 | null = null;
  /** El próximo frame coloca la cámara directamente (el primero, sin animación de entrada). */
  private snapCamera = true;
  /** Intervalo real entre frames (suavizado), para el aliasing. */
  private frameIntervalMs = 1000 / 60;
  private handle: number | null = null;
  /** El frame pedido es uno del render lento (4 Hz): una orden con prisa lo adelanta. */
  private handleDelayed = false;
  private lastFrameMs: number | null = null;
  /** Hasta qué instante del reloj de pared (`deps.now`) ha avanzado ya el reloj de la simulación. */
  private wallMs: number | null = null;
  private lastTimeEventMs = -Infinity;
  private lastStatsMs = -Infinity;
  private frameTimes: number[] = [];
  private renderedFrames = 0;
  private cpuMs = 0;
  private ephemerisMs = 0;
  private screen: ScreenBody[] = [];
  private screenThree = new Float64Array(3 * SCENE_BODIES.length);
  /** Presencia de cada cuerpo (`moonPresence`): las lunas de un sistema que no se distingue, 0. */
  private readonly presence = new Float64Array(SCENE_BODIES.length).fill(1);
  /** Radios por la presencia: los que se proyectan (etiquetas, puntero y ocultación). */
  private readonly visibleRadius = new Float64Array(SCENE_BODIES.length);
  private contextLost = false;
  private readonly background: number | null;
  /** Solo en captura: geometría de una foto de referencia (fase 3b). */
  private readonly viewFrom: ViewFrom | null;
  /** Solo en captura: el cuerpo enfocado, solo y centrado (las miniaturas de las fichas). */
  private readonly isolated: boolean;
  /** Exposición que tiene ahora el renderer (configuración visual; −1: aún ninguna). */
  private exposure = -1;
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
      toneMapping: options.toneMapping ?? VISUAL_CONFIG.toneMapping,
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
    this.viewFrom = this.captureMode ? (options.viewFrom ?? null) : null;
    this.isolated = this.captureMode && (options.isolate ?? false) && initial.focus !== null;
    if (this.isolated) this.world.setIsolated(initial.focus);
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

    const infos: LabelInfo[] = SCENE_BODIES.map((body) => ({
      id: body.id,
      name: body.name,
      kind: body.kind,
      parentIndex: body.parent ? sceneBody(body.parent).index : -1,
    }));
    this.labels = new LabelLayer(options.labelLayer, infos, (id) =>
      this.emit('bodyPicked', { id: id as BodyId }),
    );
    if (this.isolated) this.labels.setVisible(false);

    this.unsubscribe.push(
      attachPointerControls(options.canvas, {
        rotate: (dAz, dEl) => {
          this.takeControl();
          this.rig.rotate(dAz, dEl);
          this.invalidate();
        },
        fling: (vAz, vEl) => {
          if (this.instant()) return;
          this.rig.fling(vAz, vEl);
          this.invalidate();
        },
        zoom: (factor) => this.zoomBy(factor),
        pick: (x, y) => {
          // Ni los cuerpos sustituidos por su órbita ni las lunas de un sistema que no se distingue.
          const visible = this.screen.filter(
            (body) =>
              this.aliasing.orbit[body.index] !== 1 && (this.presence[body.index] as number) >= 0.5,
          );
          const index = pickBody(visible, x, y);
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
    this.wallMs = this.deps.now();
    this.emitTime(true);
    this.invalidate();
  }

  setPlaying(playing: boolean): void {
    if (this.disposed) return;
    this.catchUp();
    const limit = this.clock.setPlaying(playing);
    if (limit) this.emit('limitReached', { limit });
    this.wallMs = this.deps.now();
    this.lastFrameMs = null;
    this.emitTime(true);
    this.invalidate();
  }

  setSpeed(simSecondsPerSecond: number): void {
    if (this.disposed) return;
    this.catchUp();
    const reversed = this.clock.speed < 0;
    this.clock.setSpeed(simSecondsPerSecond);
    this.wallMs = this.deps.now();
    this.emitTime(true);
    // Las estelas siguen el sentido también en pausa (D34): si cambia, se repintan.
    if (this.clock.speed < 0 !== reversed) this.invalidate();
  }

  focus(body: BodyId | null): void {
    if (this.disposed) return;
    const index = body === null ? null : sceneBody(body).index;
    this.changeFocus(
      index,
      index === null ? this.overviewFraming() : this.bodyFraming(index, 'body'),
      'focus',
      null,
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
    const setup = this.viewSetup(view);
    // Un viaje entre vistas (~3 s): la cámara gira hacia la pose de la vista mientras se acerca.
    this.changeFocus(setup.focus, setup.framing, 'view', this.viewAngles(view));
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    if (this.disposed) return;
    this.viewport = {
      width: Math.max(1, width),
      height: Math.max(1, height),
      dpr: devicePixelRatio,
    };
    this.applySize();
    const { width: w, height: h } = this.viewport;
    // Se recortan los pedidos, no los ya recortados: si llegan antes del primer tamaño (lienzo de 1 px),
    // se quedarían a cero.
    this.insetsTarget = sanitizeInsets(this.insetsRequested, w, h);
    this.insets = sanitizeInsets(this.instant() ? this.insetsTarget : this.insets, w, h);
    this.invalidate();
  }

  setViewInsets(insets: ViewInsets): void {
    // Aislado (miniaturas), el cuerpo va en el centro del lienzo, sin la interfaz.
    if (this.disposed || this.isolated) return;
    this.insetsRequested = insets;
    this.insetsTarget = sanitizeInsets(insets, this.viewport.width, this.viewport.height);
    if (this.instant()) this.insets = this.insetsTarget;
    this.invalidate();
  }

  orbitBy(deltaAzimuth: number, deltaElevation: number): void {
    if (this.disposed) return;
    this.takeControl();
    this.rig.nudge(deltaAzimuth, deltaElevation, this.instant());
    this.invalidate();
  }

  lookAtSurface(latDeg: number, lonDeg: number, distanceRadii: number): void {
    const focus = this.focusIndex;
    if (this.disposed || focus === null) return;
    this.takeControl();
    const state = this.system.at(this.clock.timeMsValue);
    // El punto, del sistema propio del cuerpo a la eclíptica con su orientación de este instante.
    const lat = (latDeg * Math.PI) / 180;
    const lon = (lonDeg * Math.PI) / 180;
    const local = vec3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    const direction = mulMat3Vec(this.orientations.at(state)[focus] as Mat3, local);
    // La distancia la pone el encuadre en cada frame: se fija su zoom para que sea la pedida.
    if (this.framing.kind === 'body') {
      const base = framingDistanceRadii(
        this.framing.fill,
        this.projection.visibleFovDeg,
        this.projection.visibleAspect,
      );
      this.framing.zoom = Math.min(Math.max(distanceRadii / base, 0.05), 2e5);
    }
    this.rig.setTarget(anglesFromEcl(direction), this.instant());
    this.invalidate();
  }

  setSurfaceMarkers(visible: boolean): void {
    if (this.disposed) return;
    this.world.setSurfaceMarkers(visible);
    this.invalidate();
  }

  zoomBy(factor: number): void {
    if (this.disposed || !(factor > 0)) return;
    this.takeControl();
    const [min, max] = this.framing.kind === 'body' ? [0.05, 2e5] : [0.02, 4];
    this.framing.zoom = Math.min(Math.max(this.framing.zoom * factor, min), max);
    this.invalidate();
  }

  skipTransition(): void {
    if (this.disposed) return;
    this.frames.finish();
    const flight = this.flight;
    // El siguiente frame ya cae al final del vuelo (pose de llegada, mirando al foco).
    if (flight) this.flight = { ...flight, startMs: this.deps.now() - flight.durationMs };
    this.insets = this.insetsTarget;
    this.invalidate();
  }

  setLabelsVisible(visible: boolean): void {
    if (this.disposed) return;
    this.labels.setVisible(visible && !this.isolated);
    this.invalidate();
  }

  async capture(): Promise<Blob> {
    if (this.disposed) throw new Error('El motor ya se ha liberado.');
    if (this.contextLost) throw new Error('Sin contexto WebGL: no se puede capturar.');
    if (!this.ready) throw new Error('La escena aún no está lista.');
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
      aliased: SCENE_BODIES.filter((body) => this.aliasing.orbit[body.index] === 1).map(
        (body) => body.id,
      ),
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
      if (this.viewFrom) this.alignViewFrom(this.viewFrom);
      this.snapCamera = true;
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

  /**
   * Pide un frame si no hay uno pedido (render bajo demanda). Con `delayMs`, uno del render lento;
   * una petición sin espera adelanta a una lenta pendiente (un arrastre no espera 250 ms).
   */
  private invalidate(delayMs = 0): void {
    if (this.disposed || this.contextLost || !this.ready) return;
    if (this.handle !== null) {
      if (!this.handleDelayed || delayMs > 0) return;
      this.deps.scheduler.cancel(this.handle);
      this.handle = null;
    }
    if (this.deps.visibility.hidden()) return;
    this.handleDelayed = delayMs > 0;
    this.handle = this.deps.scheduler.request((time) => {
      this.handle = null;
      this.handleDelayed = false;
      this.tick(time);
    }, delayMs);
  }

  private tick(timeMs: number): void {
    if (this.disposed || this.contextLost) return;
    const dt =
      this.lastFrameMs === null ? 16 : Math.min(timeMs - this.lastFrameMs, MAX_FRAME_DT_MS);
    const continuous = this.lastFrameMs !== null && dt < SLOW_FRAME_MS * 0.8;
    this.lastFrameMs = timeMs;
    if (continuous) this.frameIntervalMs = 0.8 * this.frameIntervalMs + 0.2 * dt;
    const limit = this.clock.advance(this.clockStep(dt));
    if (limit) {
      this.emit('limitReached', { limit });
      this.emitTime(true);
    } else if (this.clock.playing) {
      this.emitTime(false);
    }
    const moving = this.renderFrame(timeMs, true, dt);
    const uploading = this.processUpload();
    const animating = this.clock.playing || moving || this.frames.animating;
    // Reproducción lenta y nada más en marcha: 4 frames por segundo bastan (y no se miden FPS).
    const slow =
      this.clock.playing &&
      !moving &&
      !this.frames.animating &&
      !uploading &&
      this.uploads.length === 0 &&
      Math.abs(this.clock.speed) <= SLOW_SPEED;
    if (this.qualitySetting === 'auto' && !this.captureMode) {
      const lower = this.adaptive.sample(this.deps.now(), animating && !slow, this.level);
      if (lower) this.applyQuality(lower, 'auto');
    }
    if (animating || uploading || this.uploads.length > 0) {
      this.invalidate(slow ? SLOW_FRAME_MS : 0);
    } else {
      this.lastFrameMs = null;
    }
  }

  /**
   * Cuánto tiempo real avanza el reloj en este frame. A las velocidades lentas (hasta `SLOW_SPEED`),
   * el que ha pasado de verdad desde el último avance, sin tope y también con la pestaña oculta o
   * sin contexto: «tiempo real» no se retrasa del reloj. A las rápidas, el del frame, con su tope:
   * un tirón o una pestaña oculta no dan un salto de meses (el tiempo se detiene mientras tanto).
   */
  private clockStep(frameDtMs: number): number {
    const now = this.deps.now();
    const elapsed = this.wallMs === null ? frameDtMs : now - this.wallMs;
    this.wallMs = now;
    return Math.abs(this.clock.speed) <= SLOW_SPEED ? elapsed : frameDtMs;
  }

  /** Antes de pausar o de cambiar de velocidad, lo que ha pasado desde el último frame (lentas). */
  private catchUp(): void {
    if (!this.clock.playing || this.wallMs === null) return;
    if (Math.abs(this.clock.speed) > SLOW_SPEED) return;
    const now = this.deps.now();
    const limit = this.clock.advance(now - this.wallMs);
    this.wallMs = now;
    if (limit) this.emit('limitReached', { limit });
  }

  /**
   * Calcula y (si `paint`) pinta un frame. Devuelve si la cámara sigue moviéndose.
   */
  private renderFrame(timeMs: number, paint = true, dtMs = 0): boolean {
    const cpuStart = this.deps.now();
    const state = this.system.at(this.clock.timeMsValue);
    const orientations = this.orientations.at(state);
    this.ephemerisMs = 0.9 * this.ephemerisMs + 0.1 * (this.deps.now() - cpuStart);
    const nowMs = this.deps.now();
    this.frames.update(placementInput(state), nowMs);
    const insets = approachInsets(this.insets, this.insetsTarget, dtMs, INSETS_SMOOTHING_MS);
    this.insets = insets.insets;
    const { width, height } = this.viewport;
    this.projection = viewProjection(width, height, BASE_FOV_DEG, this.insets);
    const moving = this.updateCamera(dtMs, nowMs) || !insets.settled;
    const daysPerSecond = this.clock.playing ? this.clock.speed / 86_400 : 0;
    this.aliasing.update(daysPerSecond, this.frameIntervalMs, this.frames.focus);
    const aliased = this.aliasing.any;
    const camera = this.world.camera;
    this.rig.applyTo(camera, this.look);
    this.updatePresence();
    this.world.update({
      frames: this.frames,
      state,
      orientations,
      focusIndex: this.frames.focus,
      highlighted: this.focusIndex ?? -1,
      speedDaysPerSecond: daysPerSecond,
      viewport: this.viewport,
      screen: this.screen,
      detail: this._view !== 'system',
      projection: this.projection,
      trailDirection: this.clock.speed < 0 ? -1 : 1,
      presence: this.presence,
      aliasedOrbit: aliased ? this.aliasing.orbit : null,
      frozenSpin: aliased ? this.aliasing.spin : null,
    });
    camera.updateMatrixWorld();
    this.updateScreen();
    this.updateOrbitDiscs();
    this.applyLighting();
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

  /**
   * Coloca la cámara: en un vuelo, la pose del vuelo; si no, la amortiguación del rig hacia el
   * encuadre. Devuelve si sigue moviéndose.
   */
  private updateCamera(dtMs: number, nowMs: number): boolean {
    const focusRadius = this.frames.output.radius[this.frames.focus] as number;
    this.rig.setLimits(focusRadius * MIN_DISTANCE_RADII, Infinity);
    const distance = this.framingDistance(focusRadius);
    const flight = this.flight;
    if (flight && !flight.userControl) {
      const to = {
        distance,
        azimuth: flight.angles?.azimuth ?? flight.from.azimuth,
        elevation: flight.angles?.elevation ?? flight.from.elevation,
      };
      const frame = flightFrame(flight, to, nowMs);
      this.rig.setPose(frame.pose);
      this.look = this.lookAt(flight.fromIndex, frame.lookWeight);
      if (frame.done) this.endFlight();
      return !frame.done;
    }
    this.rig.setTarget({ distance });
    let moving = false;
    if (this.instant() || this.snapCamera) this.rig.snap();
    else moving = this.rig.update(dtMs);
    this.snapCamera = false;
    if (flight) {
      // El usuario lleva la cámara; la mirada termina de girar hacia el foco a su ritmo.
      const frame = flightFrame(flight, flight.from, nowMs);
      this.look = this.lookAt(flight.fromIndex, frame.lookWeight);
      if (frame.done) this.endFlight();
      else moving = true;
    } else {
      this.look = null;
    }
    return moving;
  }

  /** Distancia de la cámara que pide el encuadre, en la parte visible del lienzo. */
  private framingDistance(focusRadius: number): number {
    if (this.framing.kind === 'body') {
      const radii = framingDistanceRadii(
        this.framing.fill,
        this.projection.visibleFovDeg,
        this.projection.visibleAspect,
      );
      return focusRadius * radii * this.framing.zoom;
    }
    // La distancia de la vista general sigue la escala del marco que se ve: durante una transición
    // (por ejemplo, desde el sistema local de la Tierra) el sistema todavía es enorme y la cámara no
    // puede llegar antes que él.
    return this.overviewDistance() * this.framing.zoom * this.extentScale();
  }

  /** Punto al que mira la cámara en un vuelo: el foco de partida con ese peso (relativo al nuevo). */
  private lookAt(fromIndex: number, weight: number): Vec3 | null {
    if (weight <= 0 || fromIndex === this.frames.focus) return null;
    const p = this.frames.output.position;
    const k = 3 * fromIndex;
    // ECL → Three (x, z, −y).
    return vec3(
      (p[k] as number) * weight,
      (p[k + 2] as number) * weight,
      -(p[k + 1] as number) * weight,
    );
  }

  private endFlight(): void {
    const flight = this.flight;
    if (!flight) return;
    this.flight = null;
    this.look = null;
    this.emit('travel', { active: false, kind: flight.kind });
  }

  /** El usuario toma la cámara (arrastre, rueda, teclado): el vuelo deja de llevarla. */
  private takeControl(): void {
    if (this.flight) this.flight.userControl = true;
  }

  /** Sin animaciones de cámara: movimiento reducido o modo de captura. */
  private instant(): boolean {
    return this.reducedMotion || this.captureMode;
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

  /**
   * Presencia de las lunas (fase 4b): la de un sistema que aún no se distingue en pantalla, 0
   * (`moonPresence`). Se calcula en el mismo frame, con la cámara ya colocada: el radio en pantalla
   * del planeta sale de su distancia a la cámara y de la focal en píxeles, que con los márgenes de la
   * interfaz (`setViewOffset`) sigue siendo alto / (2 · tan(fov / 2)). El cuerpo enfocado se ve
   * siempre.
   */
  private updatePresence(): void {
    const { position, radius } = this.frames.output;
    const camera = this.world.camera.position;
    const focalPx = this.viewport.height / (2 * Math.tan((BASE_FOV_DEG * Math.PI) / 360));
    for (let k = 0; k < SCENE_BODIES.length; k++) {
      const p = MOON_PARENT[k] as number;
      if (p < 0 || k === this.focusIndex) {
        this.presence[k] = 1;
        continue;
      }
      const px = position[3 * p] as number;
      const py = position[3 * p + 1] as number;
      const pz = position[3 * p + 2] as number;
      const r = radius[p] as number;
      // La cámara está en ejes de three: ECL (x, y, z) → (x, z, −y).
      const depth = Math.hypot(px - camera.x, pz - camera.y, -py - camera.z);
      const radiusPx = depth > r ? (focalPx * r) / Math.sqrt(depth * depth - r * r) : Infinity;
      const distance = Math.hypot(
        (position[3 * k] as number) - px,
        (position[3 * k + 1] as number) - py,
        (position[3 * k + 2] as number) - pz,
      );
      this.presence[k] = moonPresence(distance, r, radiusPx);
    }
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
    for (let k = 0; k < SCENE_BODIES.length; k++) {
      this.visibleRadius[k] = (output.radius[k] as number) * (this.presence[k] as number);
    }
    this.screen = projectBodies(this.world.camera, t, this.visibleRadius, width, height);
    if (!this.labels.visibleLayer) return;
    const focusBody = this.focusIndex === null ? null : SCENE_BODIES[this.focusIndex];
    const planet = focusBody ? systemPlanetOf(focusBody.id) : null;
    const boxes = layoutLabels(
      this.screen,
      this.labelInfos(),
      this.labels.measure(),
      { width, height },
      this.focusIndex ?? -1,
      planet ? sceneBody(planet).index : -1,
      { insets: this.insets, hidden: this.hiddenLabels(), extents: LABEL_EXTENTS },
    );
    this.labels.update(boxes, this.focusIndex ?? -1);
  }

  /**
   * Relleno y exposición de la configuración visual (fase 3b, tarea 11), según lo grande que se vea
   * el cuerpo enfocado: en la vista general, relleno ilustrativo; en primer plano, la luz física con
   * la exposición compensada para el albedo del cuerpo.
   */
  private applyLighting(): void {
    const focus = this.focusIndex;
    const radiusPx = focus === null ? null : (this.screen[focus]?.radiusPx ?? null);
    const closeUp = closeUpAmount(radiusPx);
    this.world.setFill(fillLight(closeUp));
    const albedo = focus === null ? null : (FOCUS_ALBEDO[focus] ?? null);
    const lit =
      focus === null || albedo === null
        ? 1
        : this.litBrightness(focus, this.world.phaseAngleOf(focus));
    const exposure = exposureFor(closeUp, albedo, lit);
    // El Sol: halo y granulación según su primer plano; la granulación cambia con el reloj de pared
    // (quieta con movimiento reducido y en las capturas).
    this.world.setSunAppearance(
      focus === SUN_INDEX ? closeUp : 0,
      this.instant() ? 0 : this.deps.now() / 1000,
    );
    // Las nubes de la Tierra derivan con el reloj de pared (quietas con movimiento reducido y en las
    // capturas), no con el simulado: a 3 días por segundo darían vueltas a toda velocidad.
    this.world.setCloudDrift(
      this.instant() ? 0 : (this.deps.now() / 1000) * VISUAL_CONFIG.earth.cloudDrift,
    );
    if (this.exposure < 0 || Math.abs(exposure - this.exposure) > 1e-4) {
      this.exposure = exposure;
      this.renderer.setExposure(exposure);
      // El fondo no sigue la exposición del primer plano: se ve igual en todas las vistas.
      this.world.setBackgroundGain(backgroundGain(exposure));
    }
  }

  /**
   * Discos sobre los que se desvanecen las órbitas (fase 3b, tarea 8): los cuerpos que se ven, de
   * más de unos píxeles, del más grande al más pequeño.
   */
  private updateOrbitDiscs(): void {
    const discs = this.screen
      .filter(
        (body) =>
          body.onScreen &&
          !body.occluded &&
          Number.isFinite(body.radiusPx) &&
          body.radiusPx >= VISUAL_CONFIG.orbitDiscMinRadiusPx &&
          this.aliasing.orbit[body.index] !== 1,
      )
      .sort((a, b) => b.radiusPx - a.radiusPx);
    this.world.orbits.setDiscs(discs, this.viewport.height, this.pixelRatio());
  }

  /** Tablas del brillo de la parte iluminada de cada cuerpo según la fase (se calculan al enfocarlo). */
  private readonly litTables = new Map<number, Float64Array>();

  private litBrightness(index: number, phase: number): number {
    const body = SCENE_BODIES[index];
    const photometry = body && body.id !== 'sol' ? BODY_PHOTOMETRY[body.id] : null;
    if (!photometry) return 1;
    let table = this.litTables.get(index);
    if (!table) {
      table = litBrightnessTable(photometry.photometry);
      this.litTables.set(index, table);
    }
    return interpolateLitBrightness(table, phase);
  }

  private readonly labelMask = new Uint8Array(SCENE_BODIES.length);

  /**
   * Cuerpos sin nombre en pantalla: los que se dibujan como su órbita (velocidades altas) y, en las
   * vistas Tierra y Luna, todos menos la Tierra, la Luna y el Sol (los planetas lejanos competirían
   * con el protagonista).
   */
  private hiddenLabels(): Uint8Array {
    const aliased = this.aliasing.any ? this.aliasing.orbit : null;
    const detail = this._view !== 'system';
    const mask = this.labelMask;
    SCENE_BODIES.forEach((body, k) => {
      const named = !detail || DETAIL_LABELS.includes(body.id);
      // Sin nombre: los que no se nombran en la vista, los sustituidos por su órbita y las lunas de
      // un sistema que no se distingue.
      mask[k] = !named || aliased?.[k] === 1 || (this.presence[k] as number) < 0.5 ? 1 : 0;
    });
    return mask;
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

  /**
   * Cambia de foco con un vuelo de cámara (PLAN 3.c.6 y 3.c.8): la cámara no se mueve en el mundo
   * (se reancla al foco nuevo), mira primero del foco anterior al nuevo y después se acerca o se
   * aleja hasta el encuadre, con el cambio de marco solapado. Con movimiento reducido, un corte.
   */
  private changeFocus(
    index: number | null,
    framing: CameraFraming,
    kind: TravelKind,
    angles: Angles | null,
  ): void {
    const frameFocus = index ?? SUN_INDEX;
    const fromIndex = this.frames.focus;
    if (fromIndex !== frameFocus) {
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
    // La vista general vuelve siempre a su encuadre (todo el sistema a la vista).
    const arrival = framing.kind === 'overview' ? OVERVIEW_ANGLES : angles;
    const duration = this.instant() ? 0 : kind === 'view' ? VIEW_TRIP_MS : FOCUS_FLIGHT_MS;
    const now = this.deps.now();
    this.frames.transitionTo(
      this.frameSpec(index),
      frameFocus,
      now + FRAME_START * duration,
      (1 - FRAME_START) * duration,
    );
    if (duration === 0) {
      if (arrival) this.rig.setTarget(arrival, true);
      this.endFlight();
    } else {
      const replaced = this.flight !== null;
      this.flight = {
        startMs: now,
        durationMs: duration,
        from: {
          distance: this.rig.distance,
          azimuth: this.rig.azimuth,
          elevation: this.rig.elevation,
        },
        kind,
        angles: arrival,
        fromIndex,
        userControl: false,
      };
      if (!replaced || kind === 'view') this.emit('travel', { active: true, kind });
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

  /**
   * Coloca la cámara con la geometría de una foto de referencia (modo de captura, fase 3b): desde la
   * Tierra en la fecha, o con un ángulo de fase y una latitud sobre el ecuador del cuerpo.
   */
  private alignViewFrom(view: ViewFrom): void {
    const focus = this.focusIndex;
    if (focus === null) return;
    const state = this.system.at(this.clock.timeMsValue);
    const h = state.heliocentric;
    const k = 3 * focus;
    let direction;
    if (view.kind === 'earth') {
      const e = 3 * EARTH_INDEX;
      direction = vec3(
        (h[e] as number) - (h[k] as number),
        (h[e + 1] as number) - (h[k + 1] as number),
        (h[e + 2] as number) - (h[k + 2] as number),
      );
    } else {
      const toSun = normalize(
        vec3(-(h[k] as number), -(h[k + 1] as number), -(h[k + 2] as number)),
      );
      const pole = columnOf(this.orientations.at(state)[focus] as Mat3, 2);
      direction = phaseViewDirection(toSun, pole, view.phaseDeg, view.latitudeDeg);
    }
    this.rig.setTarget(anglesFromEcl(direction), true);
    this.renderFrame(this.deps.now(), false);
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
    return { kind: 'overview', zoom: 1 };
  }

  /**
   * Distancia a la que la órbita de Neptuno cabe entera en la parte visible, con su margen y con la
   * perspectiva de la vista oblicua (en la escala ilustrativa y la real, que conserva su extensión).
   */
  private overviewDistance(): number {
    const extent = illustrativeDistance(NEPTUNE_SEMI_MAJOR_AXIS_AU * 1.012);
    const tanVertical = Math.tan((this.projection.visibleFovDeg * Math.PI) / 360);
    const tanHorizontal = tanVertical * this.projection.visibleAspect;
    return circleFitDistance(
      extent,
      OVERVIEW_ELEVATION,
      tanHorizontal / OVERVIEW_MARGIN,
      tanVertical / OVERVIEW_MARGIN,
    );
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
    return this.instant() ? 0 : FRAME_TRANSITION_MS;
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
      color: SCHEMATIC_COLORS[body.id],
    };
  });
}
