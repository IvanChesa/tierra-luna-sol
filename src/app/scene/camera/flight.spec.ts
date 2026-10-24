import { FOCUS_FLIGHT_MS, VIEW_TRIP_MS, flightFrame } from './flight';

const from = { distance: 1000, azimuth: 3, elevation: 0.4 };
const to = { distance: 2, azimuth: -3, elevation: -0.2 };
const flight = { startMs: 0, durationMs: 3000, from };

describe('flight: vuelos de cámara', () => {
  it('duran ~2 s al elegir un cuerpo y ~3 s entre vistas', () => {
    expect(FOCUS_FLIGHT_MS).toBe(2000);
    expect(VIEW_TRIP_MS).toBe(3000);
  });

  it('empieza exactamente donde estaba la cámara, mirando al foco anterior', () => {
    const start = flightFrame(flight, to, 0);
    expect(start.pose).toEqual(from);
    expect(start.lookWeight).toBe(1);
    expect(start.done).toBe(false);
  });

  it('acaba exactamente en la pose final, mirando al foco nuevo', () => {
    const end = flightFrame(flight, to, 3000);
    expect(end.pose.distance).toBeCloseTo(to.distance, 9);
    // 3 → −3 rad por el camino corto (cruzando ±π), no dando la vuelta.
    expect(end.pose.azimuth).toBeCloseTo(3 + (2 * Math.PI - 6), 9);
    expect(end.pose.elevation).toBeCloseTo(to.elevation, 9);
    expect(end.lookWeight).toBe(0);
    expect(end.done).toBe(true);
  });

  it('primero gira la mirada y después se acerca, en escala logarítmica y sin saltos', () => {
    // Paso máximo en escala logarítmica: la curva senoidal sube como mucho π/2 veces más rápido que
    // una recta, y el acercamiento dura el 80 % del vuelo.
    const maxStep = Math.exp(
      -((Math.log(from.distance / to.distance) * (Math.PI / 2) * 30) / 2400) * 1.01,
    );
    let previous = flightFrame(flight, to, 0);
    for (let t = 30; t <= 3000; t += 30) {
      const frame = flightFrame(flight, to, t);
      // La distancia baja siempre (nunca se pasa) y sin saltos.
      expect(frame.pose.distance).toBeLessThanOrEqual(previous.pose.distance + 1e-9);
      expect(frame.pose.distance / previous.pose.distance).toBeGreaterThan(maxStep);
      expect(frame.lookWeight).toBeLessThanOrEqual(previous.lookWeight);
      previous = frame;
    }
    // A mitad de vuelo la mirada ya está en el foco nuevo y la cámara aún no ha llegado.
    const half = flightFrame(flight, to, 1500);
    expect(half.lookWeight).toBe(0);
    expect(half.pose.distance).toBeGreaterThan(to.distance * 10);
    // Al 15 % todavía no ha empezado a acercarse.
    expect(flightFrame(flight, to, 450).pose.distance).toBe(from.distance);
  });

  it('sin duración (movimiento reducido o captura) es un corte directo', () => {
    const cut = flightFrame({ ...flight, durationMs: 0 }, to, 0);
    expect(cut.done).toBe(true);
    expect(cut.lookWeight).toBe(0);
    expect(cut.pose.distance).toBeCloseTo(to.distance, 9);
  });
});
