import {
  CONTEXT_SPEED,
  SPEED_STEPS,
  contextSpeed,
  nearestSpeedStep,
  shiftSpeed,
  speedContext,
  speedText,
} from './speeds';

describe('speeds: escalones de la reproducción', () => {
  it('son los nueve del plan, de tiempo real a 1 año por segundo (año juliano), en orden', () => {
    expect(SPEED_STEPS.map((s) => s.id)).toEqual([
      'real',
      'hour',
      'hours3',
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

  it('cada contexto tiene su velocidad, que es uno de los escalones (D33)', () => {
    expect(nearestSpeedStep(CONTEXT_SPEED.overview).id).toBe('days3');
    expect(nearestSpeedStep(CONTEXT_SPEED.overview).label).toBe('3 días por segundo');
    expect(nearestSpeedStep(CONTEXT_SPEED.body).id).toBe('hour');
    expect(nearestSpeedStep(CONTEXT_SPEED.body).label).toBe('1 hora por segundo');
    expect(nearestSpeedStep(10 * 86_400).label).toBe('10 días por segundo');
  });

  it('la vista general es la del sistema solar sin cuerpo; lo demás, un cuerpo (D33)', () => {
    expect(speedContext('system', null)).toBe('overview');
    expect(speedContext('system', 'marte')).toBe('body');
    expect(speedContext('system', 'titan')).toBe('body');
    // Las vistas Tierra y Luna cuentan como cuerpo enfocado, con o sin selección.
    expect(speedContext('earth', 'tierra')).toBe('body');
    expect(speedContext('earth', null)).toBe('body');
    expect(speedContext('moon', 'luna')).toBe('body');
  });

  it('la velocidad del contexto conserva el sentido de la actual', () => {
    expect(contextSpeed('body', 3 * 86_400)).toBe(3600);
    expect(contextSpeed('overview', 3600)).toBe(3 * 86_400);
    expect(contextSpeed('body', -3 * 86_400)).toBe(-3600);
    expect(contextSpeed('overview', -86_400)).toBe(-3 * 86_400);
    expect(contextSpeed('overview', 0)).toBe(3 * 86_400);
  });

  it('el texto de una velocidad dice el sentido si es hacia atrás (ESTILO §3)', () => {
    expect(speedText(3600)).toBe('1 hora por segundo');
    expect(speedText(-3 * 86_400)).toBe('3 días por segundo, hacia atrás');
  });

  it('el escalón más cercano ignora el sentido', () => {
    expect(nearestSpeedStep(-86_400).id).toBe('day');
    expect(nearestSpeedStep(5000).id).toBe('hour');
    expect(nearestSpeedStep(-7000).id).toBe('hours3');
    expect(nearestSpeedStep(0).id).toBe('real');
  });

  it('subir y bajar conserva el sentido y se queda en los extremos', () => {
    expect(shiftSpeed(86_400, 1)).toBe(3 * 86_400);
    expect(shiftSpeed(7 * 86_400, 1)).toBe(10 * 86_400);
    expect(shiftSpeed(-86_400, -1)).toBe(-3 * 3600);
    expect(shiftSpeed(3 * 3600, -1)).toBe(3600);
    expect(shiftSpeed(1, -1)).toBe(1);
    expect(shiftSpeed(365.25 * 86_400, 1)).toBe(365.25 * 86_400);
  });
});
