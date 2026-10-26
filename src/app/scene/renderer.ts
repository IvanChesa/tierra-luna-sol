/**
 * El renderer: lo ÚNICO del motor que necesita WebGL. El motor lo recibe de una fábrica
 * (`RendererFactory`), así que la lógica se prueba en Vitest con uno falso (B10).
 *
 * Aquí se crea el único `WebGLRenderer` del explorador (D10: nunca un segundo renderer).
 */
import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  Camera,
  NeutralToneMapping,
  SRGBColorSpace,
  Scene,
  Texture,
  ToneMapping,
  WebGLRenderer,
} from 'three';
import type { DepthMode } from './types';
import type { ToneMappingMode } from './visual-config';

const TONE_MAPPING: Readonly<Record<ToneMappingMode, ToneMapping>> = {
  neutral: NeutralToneMapping,
  agx: AgXToneMapping,
  aces: ACESFilmicToneMapping,
};

export type ResolvedDepthMode = Exclude<DepthMode, 'auto'>;

export interface RendererCapabilities {
  readonly maxTextureSize: number;
  readonly maxAnisotropy: number;
  /** Profundidad que se está usando de verdad (la invertida cae a la estándar sin EXT_clip_control). */
  readonly depth: ResolvedDepthMode;
  /** ¿Admite el dispositivo el buffer invertido (EXT_clip_control)? */
  readonly reversedDepthSupported: boolean;
}

export interface RendererInfo {
  readonly calls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
}

export interface RendererPort {
  readonly capabilities: RendererCapabilities;
  /** Tamaño en píxeles CSS y densidad de píxeles (ya limitada por la calidad). */
  setSize(width: number, height: number, pixelRatio: number): void;
  /** Exposición del tone mapping (D21: por vista). */
  setExposure(exposure: number): void;
  render(scene: Scene, camera: Camera): void;
  /** Compila los shaders sin bloquear el hilo principal (KHR_parallel_shader_compile). */
  compile(scene: Scene, camera: Camera): Promise<void>;
  /** Sube una textura a la GPU ya (para repartir las subidas entre frames). */
  initTexture(texture: Texture): void;
  info(): RendererInfo;
  /** Imagen del último frame (llamar justo después de `render`, en la misma tarea). */
  toBlob(): Promise<Blob>;
  onContextLost(listener: () => void): () => void;
  onContextRestored(listener: () => void): () => void;
  dispose(): void;
}

export interface RendererOptions {
  readonly depth: ResolvedDepthMode;
  readonly antialias: boolean;
  /** Color de fondo (sRGB). */
  readonly clearColor: number;
  /** Tone mapping (configuración visual; en captura se puede cambiar para compararlos). */
  readonly toneMapping: ToneMappingMode;
}

export type RendererFactory = (canvas: HTMLCanvasElement, options: RendererOptions) => RendererPort;

/** El renderer de verdad: WebGL2 con three. */
export const createWebGLRenderer: RendererFactory = (canvas, options) => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: options.antialias,
    alpha: false,
    powerPreference: 'high-performance',
    logarithmicDepthBuffer: options.depth === 'logarithmic',
    reversedDepthBuffer: options.depth === 'reversed',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  // Tone mapping de la configuración visual (por defecto, el neutro de Khronos: conserva los colores
  // de las texturas hasta ~0,8 y comprime las luces altas, como el Sol, sin virarlas).
  renderer.toneMapping = TONE_MAPPING[options.toneMapping];
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(options.clearColor, 1);

  const reversedDepthSupported = renderer.extensions.has('EXT_clip_control');
  const depth: ResolvedDepthMode =
    options.depth === 'reversed' && !renderer.capabilities.reversedDepthBuffer
      ? 'standard'
      : options.depth;
  const capabilities: RendererCapabilities = {
    maxTextureSize: renderer.capabilities.maxTextureSize,
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    depth,
    reversedDepthSupported,
  };

  const listen = (type: 'webglcontextlost' | 'webglcontextrestored', listener: () => void) => {
    canvas.addEventListener(type, listener);
    return () => canvas.removeEventListener(type, listener);
  };
  // Al recuperar el contexto, three rehace su estado interno con el fondo por defecto (negro): se
  // vuelve a poner el del visor. Este listener va después del de three (se registra después).
  const restoreClearColor = () => renderer.setClearColor(options.clearColor, 1);
  canvas.addEventListener('webglcontextrestored', restoreClearColor);

  return {
    capabilities,
    setSize(width, height, pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    setExposure(exposure) {
      renderer.toneMappingExposure = exposure;
    },
    render(scene, camera) {
      renderer.render(scene, camera);
    },
    compile(scene, camera) {
      return renderer.compileAsync(scene, camera).then(() => undefined);
    },
    initTexture(texture) {
      renderer.initTexture(texture);
    },
    info() {
      const { render, memory } = renderer.info;
      return {
        calls: render.calls,
        triangles: render.triangles,
        geometries: memory.geometries,
        textures: memory.textures,
      };
    },
    toBlob() {
      return new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Lienzo vacío.'))),
          'image/png',
        ),
      );
    },
    onContextLost: (listener) => listen('webglcontextlost', listener),
    onContextRestored: (listener) => listen('webglcontextrestored', listener),
    dispose() {
      canvas.removeEventListener('webglcontextrestored', restoreClearColor);
      renderer.dispose();
      // Libera el contexto ya: los navegadores limitan los contextos WebGL vivos (~16). Quien
      // escucha la pérdida de contexto tiene que darse de baja antes.
      renderer.forceContextLoss();
    },
  };
};
