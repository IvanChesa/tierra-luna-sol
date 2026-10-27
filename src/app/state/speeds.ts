/**
 * Velocidades de la simulación (PLAN, fase 3, 3.b.4; fase 3c, tarea 3: 3 horas, 3 días y 10 días por
 * segundo): segundos simulados por segundo real. El sentido (hacia atrás) va aparte, en el signo de
 * `speed`. El mes y el año son julianos (365,25 días), el año de la astronomía.
 *
 * La velocidad depende del contexto (D33, fase 4b): la vista general del sistema solar va a 3 días por
 * segundo y un cuerpo enfocado (también en las vistas Tierra y Luna), a 1 hora por segundo.
 */
import type { BodyId } from '../data/body.model';
import type { ExplorerView } from '../scene';

const HOUR_S = 3600;
const DAY_S = 24 * HOUR_S;
const JULIAN_YEAR_S = 365.25 * DAY_S;

export interface SpeedStep {
  readonly id: 'real' | 'hour' | 'hours3' | 'day' | 'days3' | 'week' | 'days10' | 'month' | 'year';
  /** Segundos simulados por segundo real. */
  readonly seconds: number;
  /** Texto de la interfaz (ESTILO §3). */
  readonly label: string;
}

export const SPEED_STEPS: readonly SpeedStep[] = [
  { id: 'real', seconds: 1, label: 'Tiempo real' },
  { id: 'hour', seconds: HOUR_S, label: '1 hora por segundo' },
  { id: 'hours3', seconds: 3 * HOUR_S, label: '3 horas por segundo' },
  { id: 'day', seconds: DAY_S, label: '1 día por segundo' },
  { id: 'days3', seconds: 3 * DAY_S, label: '3 días por segundo' },
  { id: 'week', seconds: 7 * DAY_S, label: '1 semana por segundo' },
  { id: 'days10', seconds: 10 * DAY_S, label: '10 días por segundo' },
  { id: 'month', seconds: JULIAN_YEAR_S / 12, label: '1 mes por segundo' },
  { id: 'year', seconds: JULIAN_YEAR_S, label: '1 año por segundo' },
];

/** El contexto de la velocidad (D33): la vista general del sistema solar o un cuerpo. */
export type SpeedContext = 'overview' | 'body';

/** Velocidad de cada contexto (D33): 3 días por segundo en la vista general y 1 hora con un cuerpo. */
export const CONTEXT_SPEED: Readonly<Record<SpeedContext, number>> = {
  overview: 3 * DAY_S,
  body: HOUR_S,
};

/**
 * El contexto de una vista y su cuerpo elegido: la vista general es la del sistema solar sin cuerpo
 * enfocado; un cuerpo enfocado, o las vistas Tierra y Luna, son «cuerpo». Pasar de un cuerpo a otro
 * no cambia el contexto (respeta una velocidad elegida a mano).
 */
export function speedContext(view: ExplorerView, selected: BodyId | null): SpeedContext {
  return view === 'system' && selected === null ? 'overview' : 'body';
}

/** La velocidad de un contexto, con el sentido de la actual (D33: el sentido se conserva). */
export const contextSpeed = (context: SpeedContext, current: number): number =>
  Math.sign(current || 1) * CONTEXT_SPEED[context];

/** «1 hora por segundo», o «1 hora por segundo, hacia atrás» (ESTILO §3). */
export function speedText(speed: number): string {
  const label = nearestSpeedStep(speed).label;
  return speed < 0 ? `${label}, hacia atrás` : label;
}

/** El escalón más cercano a una velocidad (en valor absoluto, en escala logarítmica). */
export function nearestSpeedStep(speed: number): SpeedStep {
  const magnitude = Math.max(Math.abs(speed), 1);
  let best = SPEED_STEPS[0] as SpeedStep;
  for (const step of SPEED_STEPS) {
    if (Math.abs(Math.log(step.seconds / magnitude)) < Math.abs(Math.log(best.seconds / magnitude)))
      best = step;
  }
  return best;
}

/** Sube o baja un escalón conservando el sentido. */
export function shiftSpeed(speed: number, steps: number): number {
  const index = SPEED_STEPS.indexOf(nearestSpeedStep(speed));
  const next = SPEED_STEPS[
    Math.min(Math.max(index + steps, 0), SPEED_STEPS.length - 1)
  ] as SpeedStep;
  return Math.sign(speed || 1) * next.seconds;
}
