/**
 * La cámara de la vista del cielo (fase 8): de pie en el lugar, mira hacia un rumbo (desde el norte,
 * hacia el este) y una altura, con un campo de visión. Lógica pura, sin three: el motor la aplica a su
 * cámara (`horizontalToSkyThree`) y la prueba Vitest.
 *
 * - Arrastrar «agarra el cielo»: lo que hay bajo el dedo se queda bajo el dedo (el giro, en grados por
 *   píxel, es el campo de visión entre el alto de la parte visible).
 * - El teclado, los botones y «Mirar a…» llevan la cámara con un giro suave (directo con movimiento
 *   reducido), por el camino más corto en rumbo.
 * - El campo de visión es el del lado más corto de la parte visible del lienzo: igual en un escritorio
 *   apaisado que en un móvil vertical.
 */
import { ViewProjection, sanitizeInsets, viewProjection } from '../view-insets';
import type { ViewInsets } from '../types';

export interface SkyPose {
  /** Rumbo desde el norte hacia el este, en [0, 360). */
  readonly azimuthDeg: number;
  /** Altura sobre el horizonte. */
  readonly altitudeDeg: number;
  /** Campo de visión del lado más corto de la parte visible. */
  readonly fovDeg: number;
}

/** Al entrar: mirando al sur, algo por encima del horizonte, con un gran angular. */
export const DEFAULT_SKY_POSE: SkyPose = { azimuthDeg: 180, altitudeDeg: 25, fovDeg: 75 };

/** Del teleobjetivo (la Luna llena ocupa un cuarto del campo) al ojo de pez. */
export const SKY_FOV_LIMITS = { min: 2, max: 110 } as const;
/** Un poco por debajo del horizonte (para ver el suelo) y casi el cénit (sin el giro del polo). */
export const SKY_ALTITUDE_LIMITS = { min: -10, max: 89.5 } as const;
/** Tiempo característico del giro suave (ms). */
const SMOOTHING_MS = 140;

const wrap = (deg: number): number => ((deg % 360) + 360) % 360;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
/** La diferencia de rumbo más corta, en (−180, 180]. */
const shortest = (from: number, to: number): number => {
  const d = wrap(to - from);
  return d > 180 ? d - 360 : d;
};

export class SkyRig {
  private azimuth: number;
  private altitude: number;
  private fov: number;
  private targetAzimuth: number;
  private targetAltitude: number;
  private targetFov: number;

  constructor(pose: SkyPose = DEFAULT_SKY_POSE) {
    this.azimuth = this.targetAzimuth = wrap(pose.azimuthDeg);
    this.altitude = this.targetAltitude = clamp(
      pose.altitudeDeg,
      SKY_ALTITUDE_LIMITS.min,
      SKY_ALTITUDE_LIMITS.max,
    );
    this.fov = this.targetFov = clamp(pose.fovDeg, SKY_FOV_LIMITS.min, SKY_FOV_LIMITS.max);
  }

  get pose(): SkyPose {
    return { azimuthDeg: wrap(this.azimuth), altitudeDeg: this.altitude, fovDeg: this.fov };
  }

  /** Arrastre del usuario: gira ya, sin suavizado (grados). */
  rotate(deltaAzimuthDeg: number, deltaAltitudeDeg: number): void {
    this.azimuth = this.targetAzimuth = wrap(this.azimuth + deltaAzimuthDeg);
    this.altitude = this.targetAltitude = clamp(
      this.altitude + deltaAltitudeDeg,
      SKY_ALTITUDE_LIMITS.min,
      SKY_ALTITUDE_LIMITS.max,
    );
  }

  /** Teclado y botones: un paso, con giro suave (o directo). */
  nudge(deltaAzimuthDeg: number, deltaAltitudeDeg: number, immediate = false): void {
    this.targetAzimuth += deltaAzimuthDeg;
    this.targetAltitude = clamp(
      this.targetAltitude + deltaAltitudeDeg,
      SKY_ALTITUDE_LIMITS.min,
      SKY_ALTITUDE_LIMITS.max,
    );
    if (immediate) this.snap();
  }

  /** Acerca (`factor` < 1, campo más estrecho) o aleja (> 1). */
  zoom(factor: number, immediate = false): void {
    if (!(factor > 0)) return;
    this.targetFov = clamp(this.targetFov * factor, SKY_FOV_LIMITS.min, SKY_FOV_LIMITS.max);
    if (immediate) this.fov = this.targetFov;
  }

  /** Mira hacia un rumbo y una altura, por el camino más corto. */
  lookAt(azimuthDeg: number, altitudeDeg: number, immediate = false): void {
    this.targetAzimuth = this.azimuth + shortest(this.azimuth, azimuthDeg);
    this.targetAltitude = clamp(altitudeDeg, SKY_ALTITUDE_LIMITS.min, SKY_ALTITUDE_LIMITS.max);
    if (immediate) this.snap();
  }

  setPose(pose: SkyPose): void {
    this.targetAzimuth = this.azimuth = wrap(pose.azimuthDeg);
    this.targetAltitude = this.altitude = clamp(
      pose.altitudeDeg,
      SKY_ALTITUDE_LIMITS.min,
      SKY_ALTITUDE_LIMITS.max,
    );
    this.targetFov = this.fov = clamp(pose.fovDeg, SKY_FOV_LIMITS.min, SKY_FOV_LIMITS.max);
  }

  /** Lleva la pose a su destino ya. */
  snap(): void {
    this.azimuth = wrap(this.targetAzimuth);
    this.targetAzimuth = this.azimuth;
    this.altitude = this.targetAltitude;
    this.fov = this.targetFov;
  }

  /** Avanza el giro suave. Devuelve si sigue moviéndose. */
  update(dtMs: number): boolean {
    const k = 1 - Math.exp(-Math.max(dtMs, 0) / SMOOTHING_MS);
    const da = this.targetAzimuth - this.azimuth;
    const dh = this.targetAltitude - this.altitude;
    // El campo, en escala logarítmica: acercarse y alejarse se ven igual de rápidos.
    const df = Math.log(this.targetFov / this.fov);
    if (Math.abs(da) < 1e-3 && Math.abs(dh) < 1e-3 && Math.abs(df) < 1e-4) {
      this.snap();
      return false;
    }
    this.azimuth += da * k;
    this.altitude += dh * k;
    this.fov *= Math.exp(df * k);
    return true;
  }

  /** Grados que gira un arrastre de un píxel con este campo y esta parte visible (px). */
  degreesPerPixel(visibleWidth: number, visibleHeight: number): number {
    return this.fov / Math.max(1, Math.min(visibleWidth, visibleHeight));
  }
}

/**
 * La proyección de la cámara del cielo: el campo del lado más corto de la parte visible (`fovDeg`),
 * con los márgenes de la interfaz (`setViewOffset`, como en el espacio: el centro de la vista queda en
 * el centro de la parte visible).
 */
export function skyProjection(
  width: number,
  height: number,
  insets: ViewInsets,
  fovDeg: number,
): ViewProjection {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const clean = sanitizeInsets(insets, w, h);
  const visibleWidth = Math.max(1, w - clean.left - clean.right);
  const visibleHeight = Math.max(1, h - clean.top - clean.bottom);
  const half = (fovDeg * Math.PI) / 360;
  // El campo vertical de la parte visible: el pedido si es apaisada; si no, el que da ese horizontal.
  const tanVisible =
    visibleWidth >= visibleHeight
      ? Math.tan(half)
      : (Math.tan(half) * visibleHeight) / visibleWidth;
  // `viewProjection` pide el campo vertical del lienzo entero.
  const baseFovDeg = (2 * Math.atan((tanVisible * h) / visibleHeight) * 180) / Math.PI;
  return viewProjection(w, h, baseFovDeg, clean);
}
