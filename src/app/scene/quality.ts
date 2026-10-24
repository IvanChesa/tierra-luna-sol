/**
 * Niveles de calidad (D22): qué cambia en cada uno, la detección inicial y la bajada automática.
 *
 * - La calidad solo BAJA sola, nunca sube: si el usuario quiere más, la elige a mano.
 * - Histéresis: hacen falta `windowMs` de animación seguida por debajo del umbral, y tras bajar se
 *   espera `cooldownMs` antes de volver a medir. Sin animación (render bajo demanda) no se mide.
 */
import type { QualityLevel } from './types';

export type TextureLevel = '1k' | '2k' | '4k';

export interface QualityProfile {
  readonly level: QualityLevel;
  /** Tope de la densidad de píxeles del lienzo. */
  readonly maxPixelRatio: number;
  /** Segmentos de las esferas (a lo ancho; a lo alto, la mitad). */
  readonly sphereSegments: number;
  /** Magnitud límite de las estrellas (D14: hasta 6,5). */
  readonly starMagnitudeLimit: number;
  /** Filtro anisótropo máximo (se limita a lo que admita el dispositivo). */
  readonly anisotropy: number;
  /** Nivel de textura de los cuerpos en la vista general y del cuerpo enfocado. */
  readonly overviewTexture: TextureLevel;
  readonly focusTexture: TextureLevel;
  /**
   * Vía Láctea, o `null` para no cargarla. Ahora es `null` en todos los niveles: la única fuente
   * evaluada (NASA SVS 4851, derivada de Gaia DR2) tiene licencia CC BY-NC (docs/PENDIENTES.md).
   */
  readonly milkyWayTexture: TextureLevel | null;
  /** Puntos por vuelta de las órbitas de los planetas (las lunas usan la mitad). */
  readonly orbitSegments: number;
  /** Presupuesto de memoria de vídeo (§5), en MB. */
  readonly vramBudgetMB: number;
  /** FPS mínimos (media de la ventana) para mantenerse en este nivel. */
  readonly minFps: number;
}

export const QUALITY_PROFILES: Readonly<Record<QualityLevel, QualityProfile>> = {
  high: {
    level: 'high',
    maxPixelRatio: 2,
    sphereSegments: 128,
    starMagnitudeLimit: 6.5,
    anisotropy: 8,
    overviewTexture: '1k',
    focusTexture: '4k',
    milkyWayTexture: null,
    orbitSegments: 360,
    vramBudgetMB: 300,
    // §5 pide ≥ 55 FPS en escritorio (alto): con 50 de media en 5 s de animación, ya no llega.
    minFps: 50,
  },
  medium: {
    level: 'medium',
    maxPixelRatio: 1.5,
    sphereSegments: 72,
    starMagnitudeLimit: 6,
    anisotropy: 4,
    overviewTexture: '1k',
    focusTexture: '2k',
    milkyWayTexture: null,
    orbitSegments: 256,
    vramBudgetMB: 200,
    // §5 pide ≥ 30 FPS en móvil: por debajo, mejor el nivel bajo.
    minFps: 30,
  },
  low: {
    level: 'low',
    maxPixelRatio: 1,
    sphereSegments: 48,
    starMagnitudeLimit: 5.5,
    anisotropy: 1,
    overviewTexture: '1k',
    focusTexture: '2k',
    milkyWayTexture: null,
    orbitSegments: 180,
    vramBudgetMB: 120,
    minFps: 0,
  },
};

const ORDER: readonly QualityLevel[] = ['low', 'medium', 'high'];

/** El nivel inmediatamente inferior, o `null` si ya es el más bajo. */
export function lowerLevel(level: QualityLevel): QualityLevel | null {
  const k = ORDER.indexOf(level);
  return k > 0 ? (ORDER[k - 1] ?? null) : null;
}

/** Lo que se sabe del dispositivo al arrancar. */
export interface DeviceInfo {
  readonly maxTextureSize: number;
  /** `navigator.deviceMemory` (GB), si el navegador lo da. */
  readonly deviceMemoryGB?: number;
  readonly hardwareConcurrency?: number;
  /** Puntero grueso (táctil): casi siempre, un móvil o una tableta. */
  readonly coarsePointer: boolean;
  /** Píxeles físicos de la pantalla (ancho × alto × DPR²). */
  readonly screenPixels: number;
}

/**
 * Nivel inicial con heurísticas sencillas y documentadas. Si se equivoca por arriba, la bajada
 * automática lo corrige en unos segundos de animación.
 * - Bajo: poca memoria (≤ 2 GB), pocos núcleos (≤ 2) o texturas de 2048 como mucho.
 * - Medio: táctil (móviles y tabletas) o memoria ≤ 4 GB.
 * - Alto: el resto (escritorio).
 */
export function detectQuality(device: DeviceInfo): QualityLevel {
  const memory = device.deviceMemoryGB ?? 8;
  const cores = device.hardwareConcurrency ?? 4;
  if (memory <= 2 || cores <= 2 || device.maxTextureSize <= 2048) return 'low';
  if (device.coarsePointer || memory <= 4) return 'medium';
  return 'high';
}

export interface AdaptiveQualityOptions {
  /** Animación seguida que hay que medir antes de decidir (ms). */
  readonly windowMs: number;
  /** Espera tras una bajada antes de volver a medir (ms). */
  readonly cooldownMs: number;
}

export const DEFAULT_ADAPTIVE_OPTIONS: AdaptiveQualityOptions = {
  windowMs: 5000,
  cooldownMs: 8000,
};

/** Bajada automática de calidad. Se alimenta con los frames pintados; el reloj lo pone quien llama. */
export class AdaptiveQuality {
  private windowStartMs: number | null = null;
  private frames = 0;
  private lastFrameMs: number | null = null;
  private quietUntilMs = -Infinity;

  constructor(private readonly options: AdaptiveQualityOptions = DEFAULT_ADAPTIVE_OPTIONS) {}

  /** Olvida lo medido (al cambiar de nivel a mano o al volver a una pestaña oculta). */
  reset(nowMs: number, quietMs = 0): void {
    this.windowStartMs = null;
    this.frames = 0;
    this.lastFrameMs = null;
    this.quietUntilMs = nowMs + quietMs;
  }

  /**
   * Registra un frame pintado en `nowMs`. `animating` indica si hay animación continua (si no, el
   * render es bajo demanda y los FPS no significan nada). Devuelve el nivel al que bajar, o `null`.
   */
  sample(nowMs: number, animating: boolean, current: QualityLevel): QualityLevel | null {
    if (!animating || nowMs < this.quietUntilMs) {
      this.windowStartMs = null;
      this.frames = 0;
      this.lastFrameMs = null;
      return null;
    }
    // Un hueco largo entre frames (pestaña oculta, depurador) corta la ventana.
    if (this.lastFrameMs !== null && nowMs - this.lastFrameMs > 1000) this.windowStartMs = null;
    this.lastFrameMs = nowMs;
    if (this.windowStartMs === null) {
      this.windowStartMs = nowMs;
      this.frames = 0;
      return null;
    }
    this.frames++;
    const elapsed = nowMs - this.windowStartMs;
    if (elapsed < this.options.windowMs) return null;
    const fps = (this.frames * 1000) / elapsed;
    this.windowStartMs = nowMs;
    this.frames = 0;
    const lower = lowerLevel(current);
    if (fps >= QUALITY_PROFILES[current].minFps || lower === null) return null;
    this.reset(nowMs, this.options.cooldownMs);
    return lower;
  }
}
