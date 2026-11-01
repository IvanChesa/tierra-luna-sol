/**
 * La noche del deslizador del cielo (fase 8; revisión de la fase 8, hallazgo 1). El deslizador abarca
 * la noche y media hora de luz a cada lado, así que su noche es la que acaba media hora después de la
 * salida del Sol: `nightSky` del instante menos ese margen. Es una función del instante y del lugar, no
 * de lo que se haya hecho antes, y los dos extremos del deslizador dan siempre la misma noche.
 */
import type { GeoObserver } from '../../ephemeris/coordinates';
import { NightSky, nightSky } from '../../ephemeris/night';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Media hora de luz a cada lado de la noche: los crepúsculos se ven enteros. */
export const NIGHT_MARGIN_MS = 30 * MINUTE_MS;
/** Paso del deslizador (minutos): cada paso cae en una hora redonda (22:00, 22:05…). */
export const STEP_MINUTES = 5;
const STEP_MS = STEP_MINUTES * MINUTE_MS;

/** La noche del deslizador en un instante (ms) y un lugar. */
export function sliderNight(time: number, place: GeoObserver): NightSky {
  return nightSky(new Date(time - NIGHT_MARGIN_MS), place);
}

/**
 * Si `night` (la de este mismo lugar) es también la noche del deslizador en `time`: así no se recalcula
 * (unos 8 ms) con cada tic del reloj. Sin noche (el Sol de medianoche o la noche polar), siempre se
 * recalcula.
 */
export function sliderNightHolds(night: NightSky, time: number): boolean {
  if (night.kind !== 'night') return false;
  const shifted = time - NIGHT_MARGIN_MS;
  return shifted >= night.since.getTime() && shifted < night.sunrise.getTime();
}

/** El deslizador: su comienzo (ms) y su recorrido en minutos (de `STEP_MINUTES` en `STEP_MINUTES`). */
export interface SliderRange {
  readonly start: number;
  readonly max: number;
}

/**
 * De la puesta menos media hora a la salida más media hora, alineado a 5 minutos, y siempre dentro de
 * la noche del deslizador: el último paso, antes de que empiece la siguiente; el primero, después de que
 * empiece esta (con un día de menos de una hora, cerca de la noche polar, el comienzo se recorta). Sin
 * noche, doce horas a cada lado del instante.
 */
export function sliderRange(night: NightSky, time: number): SliderRange {
  if (night.kind !== 'night') {
    return { start: Math.floor((time - 12 * HOUR_MS) / STEP_MS) * STEP_MS, max: 24 * 60 };
  }
  const first = Math.ceil((night.since.getTime() + NIGHT_MARGIN_MS) / STEP_MS) * STEP_MS;
  const start = Math.max(
    Math.floor((night.sunset.getTime() - NIGHT_MARGIN_MS) / STEP_MS) * STEP_MS,
    first,
  );
  const last = night.sunrise.getTime() + NIGHT_MARGIN_MS - 1;
  return { start, max: Math.max(0, Math.floor((last - start) / STEP_MS) * STEP_MINUTES) };
}
