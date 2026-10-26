import { SPEED_STEPS, nearestSpeedStep, shiftSpeed } from './speeds';

describe('speeds: escalones de la reproducción', () => {
  it('son los seis del plan, de tiempo real a 1 año por segundo (año juliano)', () => {
    expect(SPEED_STEPS.map((s) => s.id)).toEqual(['real', 'hour', 'day', 'week', 'month', 'year']);
    expect(SPEED_STEPS.at(-1)?.seconds).toBe(365.25 * 86_400);
    expect(SPEED_STEPS[4]?.seconds).toBe((365.25 * 86_400) / 12);
  });

  it('el escalón más cercano ignora el sentido', () => {
    expect(nearestSpeedStep(-86_400).id).toBe('day');
    expect(nearestSpeedStep(5000).id).toBe('hour');
    expect(nearestSpeedStep(0).id).toBe('real');
  });

  it('subir y bajar conserva el sentido y se queda en los extremos', () => {
    expect(shiftSpeed(86_400, 1)).toBe(7 * 86_400);
    expect(shiftSpeed(-86_400, -1)).toBe(-3600);
    expect(shiftSpeed(1, -1)).toBe(1);
    expect(shiftSpeed(365.25 * 86_400, 1)).toBe(365.25 * 86_400);
  });
});
