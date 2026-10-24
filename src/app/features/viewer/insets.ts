/**
 * Márgenes que la interfaz tapa del lienzo (PLAN 3.c.6): se miden los paneles (`[data-chrome]`)
 * dentro del explorador y se clasifican por el borde que tocan. Un panel alto pegado a la izquierda
 * tapa por la izquierda; uno ancho pegado abajo, por abajo… Así sirve igual para la columna de
 * escritorio que para la hoja inferior del móvil, sin decirle a cada panel qué es.
 */
import type { ViewInsets } from '../../scene';

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Un panel cuenta si toca el borde (con esta tolerancia, en px) y ocupa al menos la mitad del lado. */
const EDGE_TOLERANCE_PX = 24;
const MIN_SPAN = 0.5;

export function insetsFromRects(stage: Rect, panels: readonly Rect[]): ViewInsets {
  const width = stage.right - stage.left;
  const height = stage.bottom - stage.top;
  let top = 0;
  let right = 0;
  let bottom = 0;
  let left = 0;
  if (width <= 0 || height <= 0) return { top, right, bottom, left };
  for (const panel of panels) {
    const w = Math.min(panel.right, stage.right) - Math.max(panel.left, stage.left);
    const h = Math.min(panel.bottom, stage.bottom) - Math.max(panel.top, stage.top);
    if (w <= 0 || h <= 0) continue;
    const tall = h >= height * MIN_SPAN;
    const wide = w >= width * MIN_SPAN;
    if (tall && panel.left - stage.left <= EDGE_TOLERANCE_PX && !wide)
      left = Math.max(left, panel.right - stage.left);
    else if (tall && stage.right - panel.right <= EDGE_TOLERANCE_PX && !wide)
      right = Math.max(right, stage.right - panel.left);
    else if (wide && stage.bottom - panel.bottom <= EDGE_TOLERANCE_PX)
      bottom = Math.max(bottom, stage.bottom - panel.top);
    else if (wide && panel.top - stage.top <= EDGE_TOLERANCE_PX)
      top = Math.max(top, panel.bottom - stage.top);
  }
  return { top, right, bottom, left };
}
