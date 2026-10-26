/**
 * Manifiesto de texturas y su carga (D17, D18). TODA textura de la escena pasa por aquí: nada de
 * cargas sueltas.
 *
 * - Los ficheros (WebP por niveles, con hash) los genera `scripts/build-textures.mjs` en
 *   `scene/texture-files.ts`; aquí está lo que no se deduce del fichero: el espacio de color, si
 *   lleva alfa, cómo se proyecta y dónde está el meridiano 0.
 * - La carga decodifica fuera del hilo principal (`ImageBitmapLoader`, con `imageOrientation: 'flipY'`
 *   y `premultiplyAlpha: 'none'`: sin eso, las UV salen invertidas y los alfas, mal), limita el tamaño
 *   a `maxTextureSize` y sube a la GPU de una en una, cuando el motor se lo pide en un frame. three
 *   decodifica siempre sin conversión de perfiles de color (`colorSpaceConversion: 'none'`), que es
 *   lo que conviene a los mapas de datos y no cambia los de color (sRGB).
 * - Navegadores: `createImageBitmap` con `imageOrientation` necesita Safari 17 o Firefox 98 en
 *   adelante (para versiones anteriores, el GLTFLoader de three usa otro cargador). Se comprueba en
 *   el iPhone de la fase 10.
 * - Una textura que se desecha se libera entera con `releaseTexture`: la GPU y su `ImageBitmap` (three
 *   no cierra los bitmaps). Mientras está en uso, el bitmap se conserva: si se pierde el contexto,
 *   three lo vuelve a subir desde él.
 */
import {
  ImageBitmapLoader,
  LinearMipmapLinearFilter,
  LinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  Texture,
} from 'three';
import type { TextureLevel } from './quality';

export type TextureId =
  | 'mercury'
  | 'venus'
  | 'earth-day'
  | 'earth-night'
  | 'earth-clouds'
  | 'earth-normal'
  | 'earth-specular'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'saturn-rings'
  | 'uranus'
  | 'neptune'
  | 'mercury-normal'
  | 'mars-normal'
  | 'milky-way';

export interface TextureMeta {
  /** `srgb`: mapas de color. `data`: datos (normales, especular, máscaras): sin espacio de color. */
  readonly colorSpace: 'srgb' | 'data';
  readonly alpha: boolean;
  /**
   * - `equirectangular`: longitud en u (de −180° a 180°) y latitud en v.
   * - `ring-strip`: tira radial de los anillos (u = radio, de `innerKm` a `outerKm`).
   * - `celestial`: cielo en ascensión recta y declinación (ICRF/J2000).
   */
  readonly projection: 'equirectangular' | 'ring-strip' | 'celestial';
  /**
   * u del meridiano 0 en los mapas de superficie (0,5: centrado), o `null` si no tiene sentido
   * (Sol, nubes de Venus y de los gigantes gaseosos, que no tienen accidentes fijos). La escena lo
   * convierte en un desplazamiento de u (el meridiano 0 del modelo está en u = 0,5).
   */
  readonly primeMeridianU: number | null;
  /** Radios que cubre una tira de anillos (km desde el centro del planeta). */
  readonly ringRadiiKm?: { readonly inner: number; readonly outer: number };
  /** Cómo se ha comprobado la alineación (FUENTES.md tiene el origen de cada fichero). */
  readonly alignment: string;
}

export interface TextureFile {
  readonly level: TextureLevel;
  /** Ruta desde la raíz del sitio (con hash en el nombre). */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}

export type TextureFiles = Readonly<Partial<Record<TextureId, readonly TextureFile[]>>>;

const LEVEL_ORDER: readonly TextureLevel[] = ['1k', '2k', '4k'];

/**
 * El fichero que se carga: el nivel pedido o, si no existe o no cabe en `maxTextureSize`, el mayor
 * que haya por debajo. `null` si no hay ninguno utilizable.
 */
export function chooseTextureFile(
  files: readonly TextureFile[] | undefined,
  desired: TextureLevel,
  maxTextureSize: number,
): TextureFile | null {
  if (!files) return null;
  const limit = LEVEL_ORDER.indexOf(desired);
  const candidates = files
    .filter((file) => LEVEL_ORDER.indexOf(file.level) <= limit)
    .filter((file) => Math.max(file.width, file.height) <= maxTextureSize)
    .sort((a, b) => b.width - a.width);
  return candidates[0] ?? null;
}

/** Memoria de vídeo de una textura RGBA8 con mipmaps (4/3 del nivel base), en bytes. */
export const textureVramBytes = (width: number, height: number, mipmaps = true): number =>
  width * height * 4 * (mipmaps ? 4 / 3 : 1);

/** Lo que el motor necesita del cargador (en los tests, uno falso). */
export interface TextureSource {
  /** Carga, decodifica y sube a la GPU (cuando el motor dé paso) la mejor versión disponible. */
  load(id: TextureId, level: TextureLevel): Promise<LoadedTexture | null>;
}

export interface LoadedTexture {
  readonly texture: Texture;
  readonly file: TextureFile;
  readonly vramBytes: number;
}

export interface TextureLoaderOptions {
  readonly files: TextureFiles;
  readonly meta: Readonly<Record<TextureId, TextureMeta>>;
  readonly baseUrl: string;
  readonly maxTextureSize: number;
  readonly anisotropy: () => number;
  /** Sube la textura a la GPU en un frame (lo programa el motor: una subida por frame). */
  readonly upload: (texture: Texture) => Promise<void>;
}

/** Cargador de producción: `ImageBitmapLoader` + subida progresiva. */
export class ManifestTextureSource implements TextureSource {
  constructor(private readonly options: TextureLoaderOptions) {}

  async load(id: TextureId, level: TextureLevel): Promise<LoadedTexture | null> {
    const { files, meta, baseUrl, maxTextureSize } = this.options;
    const file = chooseTextureFile(files[id], level, maxTextureSize);
    if (!file) return null;
    const info = meta[id];
    const loader = new ImageBitmapLoader();
    loader.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    const bitmap = await loader.loadAsync(new URL(file.path, baseUrl).href);
    const texture = new Texture(bitmap);
    texture.name = `${id}@${file.level}`;
    texture.flipY = false; // ya viene girada del decodificador
    texture.colorSpace = info.colorSpace === 'srgb' ? SRGBColorSpace : NoColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = this.options.anisotropy();
    texture.needsUpdate = true;
    await this.options.upload(texture);
    return { texture, file, vramBytes: textureVramBytes(file.width, file.height) };
  }
}

/** Libera una textura que ya no se usa: la memoria de vídeo y el `ImageBitmap` del que salió. */
export function releaseTexture(texture: Texture): void {
  texture.dispose();
  const image = texture.image as { close?: () => void } | null;
  image?.close?.();
}

/** Desplazamiento de u para que el meridiano 0 de la textura caiga en el del modelo (u = 0,5). */
export const meridianOffset = (meta: TextureMeta): number =>
  meta.primeMeridianU === null ? 0 : meta.primeMeridianU - 0.5;
