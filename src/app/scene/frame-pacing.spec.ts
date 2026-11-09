import { PACE_FULL_RATE_MS, PACE_STEP_PX, fastestScreenSpeed, paceDelayMs } from './frame-pacing';
import type { ScreenBody } from './picking';

const body = (
  index: number,
  x: number,
  y: number,
  radiusPx: number,
  onScreen = true,
): ScreenBody => ({
  index,
  x,
  y,
  radiusPx,
  depth: 10,
  onScreen,
  occluded: false,
});
const still = () => 0;

describe('frame-pacing: pintar a la frecuencia que pide el movimiento (fase 10, tarea 4)', () => {
  it('lo que más corre: los cuerpos que se ven, entre dos frames', () => {
    const before = [body(0, 100, 100, 5), body(1, 200, 200, 3)];
    const after = [body(0, 101, 100, 5), body(1, 200, 204, 3)];
    // El segundo, 4 px en 100 ms: 40 px/s.
    expect(fastestScreenSpeed(before, after, 100, still)).toBeCloseTo(40, 9);
    // Los que no se ven no cuentan (ni antes ni ahora).
    const hidden = [body(0, 101, 100, 5), body(1, 200, 204, 3, false)];
    expect(fastestScreenSpeed(before, hidden, 100, still)).toBeCloseTo(10, 9);
    const appeared = [body(0, 100, 100, 5), body(1, 900, 900, 3)];
    const wasHidden = [body(0, 100, 100, 5), body(1, 0, 0, 3, false)];
    expect(fastestScreenSpeed(wasHidden, appeared, 100, still)).toBe(0);
  });

  it('y lo que corre la superficie de los que giran: su radio en pantalla por su giro', () => {
    const disc = [body(0, 100, 100, 300)];
    // La Tierra a 1 h/s: una vuelta en 23,93 h, 0,2625 rad/s; con 300 px de radio, unos 79 px/s.
    const earth = (2 * Math.PI) / 23.934;
    expect(fastestScreenSpeed(disc, disc, 16, () => earth)).toBeCloseTo(300 * earth, 9);
  });

  it('la espera: cada frame si corre deprisa; si no, lo justo para medio píxel, y 4 Hz como mucho', () => {
    // La Tierra de cerca a 1 h/s (79 px/s): medio píxel en 6 ms, cada frame.
    expect(paceDelayMs(79, 250)).toBe(0);
    // La Luna de cerca a 1 h/s: su giro (27,3 días) y su terminador, unos 3 px/s: cada 167 ms.
    expect(paceDelayMs(3, 250)).toBeCloseTo((1000 * PACE_STEP_PX) / 3, 9);
    // Nada se mueve: el render lento de siempre.
    expect(paceDelayMs(0, 250)).toBe(250);
    expect(paceDelayMs(0.1, 250)).toBe(250);
    // Justo por debajo del umbral, cada frame.
    expect(paceDelayMs((1000 * PACE_STEP_PX) / (PACE_FULL_RATE_MS - 1), 250)).toBe(0);
  });
});
