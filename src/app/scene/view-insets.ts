/**
 * Encuadre que respeta los paneles (PLAN, fase 3, 3.c.6): la interfaz tapa partes del lienzo y el
 * centro de proyección se lleva al centro de la parte visible con `camera.setViewOffset`, sin
 * redimensionar el renderer. El campo de visión se compensa para que la escala angular por píxel no
 * cambie: abrir un panel desplaza la escena, no la acerca ni la aleja.
 */
import type { ViewInsets } from './types';

export type { ViewInsets } from './types';

export const NO_INSETS: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Lo que se le pasa a la cámara: `fov` vertical (grados), `aspect` y el `setViewOffset`. */
export interface ViewProjection {
  readonly fovDeg: number;
  readonly aspect: number;
  /** `null`: sin desplazamiento (`clearViewOffset`). */
  readonly offset: {
    readonly fullWidth: number;
    readonly fullHeight: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  } | null;
  /** La parte visible: su campo de visión vertical y su proporción (para encuadrar). */
  readonly visibleFovDeg: number;
  readonly visibleAspect: number;
}

const DEG = Math.PI / 180;
/** Parte visible mínima: con paneles que lo tapan casi todo, se encuadra en esto. */
const MIN_VISIBLE_PX = 48;

/** Márgenes saneados: números finitos, no negativos y que dejen una parte visible. */
export function sanitizeInsets(insets: ViewInsets, width: number, height: number): ViewInsets {
  const clean = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  let { top, right, bottom, left } = {
    top: clean(insets.top),
    right: clean(insets.right),
    bottom: clean(insets.bottom),
    left: clean(insets.left),
  };
  const excessX = left + right - (width - MIN_VISIBLE_PX);
  if (excessX > 0) {
    const k = Math.max(0, width - MIN_VISIBLE_PX) / (left + right);
    left *= k;
    right *= k;
  }
  const excessY = top + bottom - (height - MIN_VISIBLE_PX);
  if (excessY > 0) {
    const k = Math.max(0, height - MIN_VISIBLE_PX) / (top + bottom);
    top *= k;
    bottom *= k;
  }
  return { top, right, bottom, left };
}

/**
 * Proyección para un lienzo de `width` × `height` con `baseFovDeg` de campo vertical (el de todo el
 * lienzo sin paneles) y los márgenes `insets`.
 *
 * La vista completa virtual crece lo justo para que su centro caiga en el centro de la parte
 * visible; el lienzo es una ventana de ella. Su campo vertical se amplía en la misma proporción que
 * su altura, así que un píxel sigue midiendo el mismo ángulo.
 */
export function viewProjection(
  width: number,
  height: number,
  baseFovDeg: number,
  insets: ViewInsets,
): ViewProjection {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const { top, right, bottom, left } = sanitizeInsets(insets, w, h);
  const visibleWidth = Math.max(1, w - left - right);
  const visibleHeight = Math.max(1, h - top - bottom);
  const tanHalf = Math.tan((baseFovDeg * DEG) / 2);
  const visibleFovDeg = (2 * Math.atan((tanHalf * visibleHeight) / h)) / DEG;
  const visibleAspect = visibleWidth / visibleHeight;
  const dx = left + visibleWidth / 2 - w / 2;
  const dy = top + visibleHeight / 2 - h / 2;
  if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
    return { fovDeg: baseFovDeg, aspect: w / h, offset: null, visibleFovDeg, visibleAspect };
  }
  const fullWidth = w + 2 * Math.abs(dx);
  const fullHeight = h + 2 * Math.abs(dy);
  return {
    fovDeg: (2 * Math.atan((tanHalf * fullHeight) / h)) / DEG,
    aspect: fullWidth / fullHeight,
    offset: {
      fullWidth,
      fullHeight,
      x: Math.abs(dx) - dx,
      y: Math.abs(dy) - dy,
      width: w,
      height: h,
    },
    visibleFovDeg,
    visibleAspect,
  };
}

/** Acerca unos márgenes a otros (amortiguación exponencial, independiente de los FPS). */
export function approachInsets(
  current: ViewInsets,
  target: ViewInsets,
  dtMs: number,
  smoothingMs: number,
): { insets: ViewInsets; settled: boolean } {
  const k = smoothingMs <= 0 ? 1 : 1 - Math.exp(-Math.max(0, dtMs) / smoothingMs);
  const step = (a: number, b: number) => (Math.abs(b - a) < 0.25 ? b : a + (b - a) * k);
  const insets = {
    top: step(current.top, target.top),
    right: step(current.right, target.right),
    bottom: step(current.bottom, target.bottom),
    left: step(current.left, target.left),
  };
  const settled =
    insets.top === target.top &&
    insets.right === target.right &&
    insets.bottom === target.bottom &&
    insets.left === target.left;
  return { insets, settled };
}
