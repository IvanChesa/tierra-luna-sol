import { PerspectiveCamera, Vector3 } from 'three';
import { length, sub, vec3 } from '../../ephemeris/vec3';
import { CameraRig, MAX_ELEVATION } from './rig';

/** Avanza el rig con frames de `stepMs` hasta que se para o pasan `maxMs`. */
function settle(rig: CameraRig, stepMs = 16, maxMs = 20_000): number {
  let elapsed = 0;
  while (rig.update(stepMs) && elapsed < maxMs) elapsed += stepMs;
  return elapsed;
}

describe('CameraRig: cámara orbital alrededor del foco', () => {
  it('coloca la cámara en coordenadas esféricas con +Y hacia el norte de la eclíptica', () => {
    const rig = new CameraRig({ distance: 10, azimuth: 0, elevation: 0 });
    expect(rig.position).toEqual(vec3(0, 0, 10));
    rig.setTarget({ elevation: Math.PI / 2 }, true);
    expect(rig.elevation).toBe(MAX_ELEVATION); // nunca justo en el polo
    const camera = new PerspectiveCamera();
    rig.setTarget({ elevation: 0.3, azimuth: 1 }, true);
    rig.applyTo(camera);
    const forward = camera.getWorldDirection(new Vector3());
    const toFocus = camera.position.clone().negate().normalize();
    expect(forward.distanceTo(toFocus)).toBeLessThan(1e-9);
  });

  it('se acerca a la distancia objetivo en escala logarítmica, igual con 30 o con 144 FPS', () => {
    const slow = new CameraRig({ distance: 100_000, azimuth: 0, elevation: 0 });
    const fast = new CameraRig({ distance: 100_000, azimuth: 0, elevation: 0 });
    slow.setTarget({ distance: 1 });
    fast.setTarget({ distance: 1 });
    for (let k = 0; k < 15; k++) slow.update(1000 / 30);
    for (let k = 0; k < 72; k++) fast.update(1000 / 144);
    // Medio segundo: misma distancia con los dos ritmos (a menos del 1 % en escala logarítmica).
    expect(Math.abs(Math.log(slow.distance) - Math.log(fast.distance))).toBeLessThan(0.01 * 11.5);
    expect(settle(slow)).toBeLessThan(10_000);
    expect(slow.distance).toBe(1);
  });

  it('el azimut va por el camino más corto y se para del todo', () => {
    const rig = new CameraRig({ distance: 5, azimuth: 3, elevation: 0 });
    rig.setTarget({ azimuth: -3 }); // 0,28 rad hacia delante, no 6 hacia atrás
    let maxStep = 0;
    let previous = rig.azimuth;
    while (rig.update(16)) {
      maxStep = Math.max(maxStep, Math.abs(rig.azimuth - previous));
      previous = rig.azimuth;
    }
    expect(maxStep).toBeLessThan(0.1);
    expect(Math.abs(Math.sin(rig.azimuth) - Math.sin(-3))).toBeLessThan(1e-6);
    expect(rig.update(16)).toBe(false); // en reposo: no pide más frames
  });

  it('respeta los límites de distancia al hacer zoom', () => {
    const rig = new CameraRig({ distance: 10, azimuth: 0, elevation: 0 });
    rig.setLimits(2, 50);
    rig.zoom(0.01);
    expect(rig.target.distance).toBe(2);
    rig.zoom(1000);
    expect(rig.target.distance).toBe(50);
    rig.zoom(-1); // se ignora
    expect(rig.target.distance).toBe(50);
    rig.setLimits(60, 10); // el máximo nunca queda por debajo del mínimo
    expect(rig.distance).toBe(60);
  });

  it('el arrastre gira al momento y la inercia se frena hasta pararse', () => {
    const rig = new CameraRig({ distance: 10, azimuth: 0, elevation: 0 });
    rig.rotate(0.5, 0.2);
    expect(rig.azimuth).toBeCloseTo(0.5, 12);
    expect(rig.elevation).toBeCloseTo(0.2, 12);
    rig.fling(2, 0);
    expect(rig.update(16)).toBe(true);
    expect(settle(rig)).toBeLessThan(5000);
    expect(rig.azimuth).toBeGreaterThan(0.5);
  });

  it('al cambiar de foco no mueve la cámara en el mundo', () => {
    const rig = new CameraRig({ distance: 10, azimuth: 0.7, elevation: 0.2 });
    const before = rig.position;
    const offset = vec3(3, -1, 4); // el foco nuevo, respecto al anterior
    rig.reanchor(offset);
    const world = {
      x: rig.position.x + offset.x,
      y: rig.position.y + offset.y,
      z: rig.position.z + offset.z,
    };
    expect(length(sub(world, before))).toBeLessThan(1e-9);
    expect(rig.update(16)).toBe(false); // el objetivo es la pose actual
    rig.reanchor(rig.position); // la cámara justo en el foco nuevo: no hace nada
    expect(rig.distance).toBeGreaterThan(0);
  });
});
