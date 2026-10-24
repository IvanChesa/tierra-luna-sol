/**
 * Velocidades de la simulación (PLAN, fase 3, 3.b.4): segundos simulados por segundo real. El
 * sentido (hacia atrás) va aparte, en el signo de `speed`. El mes y el año son julianos (365,25 días),
 * el año de la astronomía.
 */
const DAY_S = 86_400;
const JULIAN_YEAR_S = 365.25 * DAY_S;

export interface SpeedStep {
  readonly id: 'real' | 'hour' | 'day' | 'week' | 'month' | 'year';
  /** Segundos simulados por segundo real. */
  readonly seconds: number;
  /** Texto de la interfaz (ESTILO §3). */
  readonly label: string;
}

export const SPEED_STEPS: readonly SpeedStep[] = [
  { id: 'real', seconds: 1, label: 'Tiempo real' },
  { id: 'hour', seconds: 3600, label: '1 hora por segundo' },
  { id: 'day', seconds: DAY_S, label: '1 día por segundo' },
  { id: 'week', seconds: 7 * DAY_S, label: '1 semana por segundo' },
  { id: 'month', seconds: JULIAN_YEAR_S / 12, label: '1 mes por segundo' },
  { id: 'year', seconds: JULIAN_YEAR_S, label: '1 año por segundo' },
];

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
