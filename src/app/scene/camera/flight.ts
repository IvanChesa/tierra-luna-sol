/**
 * Vuelos de cámara (PLAN, fase 3, 3.c.6 y 3.c.8). Al cambiar de foco, la cámara no gira de golpe
 * hacia el cuerpo nuevo: primero vuelve la mirada del foco anterior al nuevo y después se acerca o
 * se aleja (distancia en escala logarítmica), con curvas de entrada y salida y los tramos solapados.
 * Los viajes entre vistas usan la misma coreografía, más larga (~3 s).
 *
 * Lógica pura: el motor da los extremos y el instante y aplica la pose que sale de aquí.
 */
import type { RigPose } from './rig';
import { easeInOutCubic } from '../frames';

/** Duración de un vuelo al elegir un cuerpo o la vista general. */
export const FOCUS_FLIGHT_MS = 2000;
/** Duración de un viaje entre vistas (sistema solar, Tierra, Luna): ~3 s (PLAN 3.c.8). */
export const VIEW_TRIP_MS = 3000;

/** Tramos de la coreografía, en fracciones de la duración. */
const LOOK_END = 0.5;
const ANGLES_START = 0.1;
const DISTANCE_START = 0.2;
/** El cambio de marco de escala empieza un poco después y acaba con el vuelo. */
export const FRAME_START = 0.25;

const TAU = 2 * Math.PI;
const wrapAngle = (a: number): number => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
/**
 * Curva de entrada y salida senoidal: su pendiente máxima es π/2 (la cúbica llega a 3), así que el
 * acercamiento, en escala logarítmica, no da tirones en el tramo central.
 */
export const easeInOutSine = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
/** Progreso suavizado de un tramo que va de `start` a `end` (fracciones de la duración). */
const phase = (u: number, start: number, end: number, ease = easeInOutSine): number =>
  ease(clamp01((u - start) / (end - start)));

export interface Flight {
  readonly startMs: number;
  readonly durationMs: number;
  /** Pose de partida, ya medida desde el foco nuevo. */
  readonly from: RigPose;
}

export interface FlightFrame {
  /** Pose de la cámara (alrededor del foco nuevo). */
  readonly pose: RigPose;
  /**
   * Cuánto de la mirada sigue en el punto de partida (1 al empezar, 0 al acabar): la cámara mira a
   * `lookWeight · puntoDePartida` (el foco anterior, relativo al nuevo).
   */
  readonly lookWeight: number;
  readonly done: boolean;
}

/**
 * La pose del vuelo en `nowMs`. `to` es la pose final y se pide en cada frame: la distancia de
 * encuadre cambia mientras cambia el marco (el radio de una luna no es el mismo en los dos).
 */
export function flightFrame(flight: Flight, to: RigPose, nowMs: number): FlightFrame {
  const u = flight.durationMs > 0 ? clamp01((nowMs - flight.startMs) / flight.durationMs) : 1;
  const angles = phase(u, ANGLES_START, 1);
  const distance = phase(u, DISTANCE_START, 1);
  const from = flight.from;
  const logFrom = Math.log(Math.max(from.distance, Number.MIN_VALUE));
  const logTo = Math.log(Math.max(to.distance, Number.MIN_VALUE));
  return {
    pose: {
      // En los extremos, exactos (exp(log(x)) no siempre da x).
      distance:
        distance <= 0
          ? from.distance
          : distance >= 1
            ? to.distance
            : Math.exp(logFrom + (logTo - logFrom) * distance),
      azimuth: from.azimuth + wrapAngle(to.azimuth - from.azimuth) * angles,
      elevation: from.elevation + (to.elevation - from.elevation) * angles,
    },
    lookWeight: 1 - phase(u, 0, LOOK_END, easeInOutCubic),
    done: u >= 1,
  };
}
