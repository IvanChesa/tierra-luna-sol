import { DEFAULT_SPEED, SPEED_STEPS, nearestSpeedStep, shiftSpeed } from './speeds';

describe('speeds: escalones de la reproducción', () => {
  it('son los ocho del plan, de tiempo real a 1 año por segundo (año juliano), en orden', () => {
    expect(SPEED_STEPS.map((s) => s.id)).toEqual([
      'real',
      'hour',
      'day',
      'days3',
      'week',
      'days10',
      'month',
      'year',
    ]);
    expect(SPEED_STEPS.at(-1)?.seconds).toBe(365.25 * 86_400);
    expect(SPEED_STEPS.find((s) => s.id === 'month')?.seconds).toBe((365.25 * 86_400) / 12);
    for (let k = 1; k < SPEED_STEPS.length; k++) {
      expect(SPEED_STEPS[k]!.seconds).toBeGreaterThan(SPEED_STEPS[k - 1]!.seconds);
    }
  });

  it('al entrar, 3 días por segundo (D31), que es uno de los escalones', () => {
    expect(DEFAULT_SPEED).toBe(3 * 86_400);
    expect(nearestSpeedStep(DEFAULT_SPEED).id).toBe('days3');
    expect(nearestSpeedStep(10 * 86_400).label).toBe('10 días por segundo');
  });

  it('el escalón más cercano ignora el sentido', () => {
    expect(nearestSpeedStep(-86_400).id).toBe('day');
    expect(nearestSpeedStep(5000).id).toBe('hour');
    expect(nearestSpeedStep(0).id).toBe('real');
  });

  it('subir y bajar conserva el sentido y se queda en los extremos', () => {
    expect(shiftSpeed(86_400, 1)).toBe(3 * 86_400);
    expect(shiftSpeed(7 * 86_400, 1)).toBe(10 * 86_400);
    expect(shiftSpeed(-86_400, -1)).toBe(-3600);
    expect(shiftSpeed(1, -1)).toBe(1);
    expect(shiftSpeed(365.25 * 86_400, 1)).toBe(365.25 * 86_400);
  });
});
