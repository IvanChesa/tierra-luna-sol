/**
 * Tipos públicos del motor 3D. Los reexporta `scene/index.ts`; los módulos internos los importan de
 * aquí para no depender del punto de entrada (que carga el motor).
 */
import type { BodyId } from '../data/body.model';

export type { BodyId } from '../data/body.model';

/** Vistas del explorador (D10). El cielo del Bajo Cinca llega en la fase 8. */
export type ExplorerView = 'system' | 'earth' | 'moon';

/** Escala base: la ilustrativa o la real global (D12). El sistema local físico es automático. */
export type ScaleMode = 'illustrative' | 'real';

export type QualityLevel = 'low' | 'medium' | 'high';

/**
 * Márgenes del lienzo que tapa la interfaz, en píxeles CSS (PLAN 3.c.6). El motor centra y encuadra
 * la escena en la parte que queda visible (`camera.setViewOffset`).
 */
export interface ViewInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
/** `auto`: detección inicial y bajada automática si los FPS no llegan (D22). */
export type QualitySetting = QualityLevel | 'auto';

/**
 * Buffer de profundidad (D13). `auto` usa la opción elegida en la fase 2; las demás existen para
 * las pruebas con capturas (`?profundidad=` en el modo de captura).
 */
export type DepthMode = 'auto' | 'logarithmic' | 'reversed' | 'standard';

export interface SceneEngineOptions {
  /** Lienzo donde se pinta. Lo crea el componente; el motor no lo saca del DOM. */
  readonly canvas: HTMLCanvasElement;
  /** Capa HTML encima del lienzo donde el motor coloca las etiquetas de los cuerpos. */
  readonly labelLayer: HTMLElement;
  /** Instante inicial de la simulación (UTC). Se lleva al rango 1900–2100. */
  readonly time: Date;
  readonly view: ExplorerView;
  /** Cuerpo enfocado al empezar (por ejemplo, de la URL); si no se da, el de la vista. */
  readonly focus?: BodyId | null;
  readonly scale?: ScaleMode;
  readonly quality: QualitySetting;
  /** `prefers-reduced-motion`: sin animaciones de cámara ni transiciones (cortes directos). */
  readonly reducedMotion: boolean;
  /**
   * Modo de captura (`?captura=1`): fecha, cámara y calidad fijas, sin calidad adaptativa ni
   * animaciones. Las capturas de los informes y el póster salen de aquí.
   */
  readonly capture?: boolean;
  readonly depth?: DepthMode;
  /**
   * Solo en captura: cuerpo que debe quedar justo detrás del enfocado, visto desde la cámara (las
   * pruebas de profundidad de D13: «Neptuno con la Tierra en primer plano»).
   */
  readonly background?: BodyId;
  /** Base de las URL de los recursos (por defecto, la raíz del sitio). */
  readonly assetsBaseUrl?: string;
}

/** Cifras de rendimiento para el indicador de desarrollo y las mediciones de los informes. */
export interface FrameStats {
  /** Fotogramas por segundo medidos mientras hay animación (0 si el motor está en reposo). */
  readonly fps: number;
  /** Duración media de un frame en la CPU (ms). */
  readonly frameMs: number;
  /** Coste de las efemérides del frame (ms). */
  readonly ephemerisMs: number;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  /** Estimación de la memoria de vídeo (texturas + geometría), en MB. */
  readonly vramMB: number;
  /** Frames pintados desde el arranque (para comprobar el render bajo demanda). */
  readonly renderedFrames: number;
  readonly quality: QualityLevel;
  readonly depth: Exclude<DepthMode, 'auto'>;
}

export interface SceneEngineEvents {
  /** Primer frame completo pintado (cuerpos, órbitas, estrellas y etiquetas). */
  readonly ready: { readonly startupMs: number };
  /**
   * Progreso del arranque (cálculo, estrellas, sombreados y primer frame). Las texturas llegan después,
   * de una en una, y no cuentan aquí: el cuerpo se ve con su color esquemático hasta que suben.
   */
  readonly progress: { readonly loaded: number; readonly total: number; readonly step: string };
  /** El usuario ha elegido un cuerpo en la escena (etiqueta o lienzo). */
  readonly bodyPicked: { readonly id: BodyId };
  /** Cifras de rendimiento, como mucho una vez por segundo. */
  readonly frameStats: FrameStats;
  readonly error: { readonly message: string; readonly recoverable: boolean };
  readonly contextLost: Record<string, never>;
  readonly contextRestored: Record<string, never>;
  readonly qualityChanged: {
    readonly level: QualityLevel;
    readonly setting: QualitySetting;
    readonly reason: 'initial' | 'auto' | 'manual';
  };
  /**
   * El tiempo de la simulación. Como mucho 5 veces por segundo durante la reproducción (PLAN §4.5)
   * y siempre al pausar, al saltar a una fecha o al cambiar la velocidad.
   */
  readonly timeChanged: {
    readonly time: Date;
    readonly playing: boolean;
    readonly speed: number;
  };
  /** La reproducción ha llegado a 1900 o a 2100 y se ha pausado. */
  readonly limitReached: { readonly limit: 'min' | 'max' };
  /**
   * Empieza o termina un viaje de cámara: un vuelo a un cuerpo (`focus`) o un viaje entre vistas
   * (`view`, ~3 s, con «Saltar»). Con movimiento reducido no hay viajes: los cambios son directos.
   */
  readonly travel: { readonly active: boolean; readonly kind: 'focus' | 'view' };
}

export type SceneEngineEventName = keyof SceneEngineEvents;

export interface SceneEngineApi {
  // --- Órdenes ---
  /** Salta a un instante (UTC). Fuera de 1900–2100 se lleva al límite. */
  setTime(time: Date): void;
  setPlaying(playing: boolean): void;
  /** Velocidad en segundos simulados por segundo real; negativa = hacia atrás. */
  setSpeed(simSecondsPerSecond: number): void;
  /** Enfoca un cuerpo (vuelo de cámara y, si hace falta, cambio de marco) o la vista general (`null`). */
  focus(body: BodyId | null): void;
  setScaleFrame(mode: ScaleMode): void;
  setQuality(setting: QualitySetting): void;
  setView(view: ExplorerView): void;
  /** Tamaño del lienzo en píxeles CSS y densidad de píxeles del dispositivo. */
  resize(width: number, height: number, devicePixelRatio: number): void;
  /**
   * Márgenes del lienzo que tapa la interfaz (px CSS): la escena se centra y se encuadra en la parte
   * visible (`camera.setViewOffset`), sin redimensionar el renderer (PLAN 3.c.6).
   */
  setViewInsets(insets: ViewInsets): void;
  /** Gira la cámara alrededor del foco (radianes): el teclado en el lienzo. */
  orbitBy(deltaAzimuth: number, deltaElevation: number): void;
  /** Acerca (`factor` < 1) o aleja (> 1) la cámara: los botones y las teclas de zoom. */
  zoomBy(factor: number): void;
  /** Termina ya el viaje de cámara o la transición de marco en curso («Saltar», `Esc`). */
  skipTransition(): void;
  /** Muestra u oculta las etiquetas de los cuerpos (la vista limpia las oculta). */
  setLabelsVisible(visible: boolean): void;
  /** Pinta un frame y devuelve la imagen del lienzo (PNG). */
  capture(): Promise<Blob>;
  /** Libera la GPU, los listeners y el DOM de las etiquetas. El motor no se puede reutilizar. */
  dispose(): void;
  /** Cifras de rendimiento del momento (el indicador de desarrollo y las mediciones). */
  stats(): FrameStats;

  // --- Eventos ---
  /** Se suscribe a un evento; devuelve la función para darse de baja. */
  on<K extends SceneEngineEventName>(
    type: K,
    listener: (event: SceneEngineEvents[K]) => void,
  ): () => void;

  // --- Estado de solo lectura ---
  readonly time: Date;
  readonly playing: boolean;
  readonly speed: number;
  readonly focusedBody: BodyId | null;
  readonly view: ExplorerView;
  readonly scaleMode: ScaleMode;
  readonly qualityLevel: QualityLevel;
}
