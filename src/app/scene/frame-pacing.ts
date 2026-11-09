/**
 * Cada cuánto pintar con el tiempo en marcha y nada más moviéndose (fase 10, tarea 4; informe de la
 * fase 3c, §10.1): a 1 h/s, la Luna de cerca o Venus se mueven una fracción de píxel por frame, y
 * pintarlos 60 veces por segundo gasta GPU y batería sin que se vea. Se pinta lo justo para que lo que
 * más corre en pantalla avance `PACE_STEP_PX` por frame, entre cada frame de la pantalla y 4 Hz (el
 * render lento de siempre, `SLOW_FRAME_MS`). Funciones puras, con tests.
 */
import type { ScreenBody } from './picking';

/** Lo que puede avanzar en pantalla lo que más corre entre dos frames (px CSS). */
export const PACE_STEP_PX = 0.5;
/** Por debajo de esta espera (ms), cada frame de la pantalla: no se ahorra nada que se note. */
export const PACE_FULL_RATE_MS = 20;

/**
 * Lo que más corre en pantalla (px CSS por segundo): lo que se han movido los cuerpos que se ven desde
 * el frame anterior (`before`, pintado hace `dtMs`) y lo que corre la superficie de los que giran
 * (su radio en pantalla por su giro, `spinRadPerS`, en rad/s; 0 para los que no giran o tienen el giro
 * congelado por el aliasing).
 */
export function fastestScreenSpeed(
  before: readonly ScreenBody[],
  after: readonly ScreenBody[],
  dtMs: number,
  spinRadPerS: (index: number) => number,
): number {
  let fastest = 0;
  for (const body of after) {
    if (!body.onScreen || body.radiusPx <= 0) continue;
    const previous = before[body.index];
    if (previous?.onScreen && dtMs > 0) {
      const moved = Math.hypot(body.x - previous.x, body.y - previous.y);
      fastest = Math.max(fastest, (1000 * moved) / dtMs);
    }
    fastest = Math.max(fastest, body.radiusPx * Math.abs(spinRadPerS(body.index)));
  }
  return fastest;
}

/**
 * La espera hasta el frame siguiente (ms) para que lo que corre a `speedPxPerS` avance `stepPx`: 0
 * (cada frame) si sale de menos de `PACE_FULL_RATE_MS`, y como mucho `maxMs`.
 */
export function paceDelayMs(speedPxPerS: number, maxMs: number, stepPx = PACE_STEP_PX): number {
  if (!(speedPxPerS > 0)) return maxMs;
  const ms = (1000 * stepPx) / speedPxPerS;
  return ms < PACE_FULL_RATE_MS ? 0 : Math.min(ms, maxMs);
}
