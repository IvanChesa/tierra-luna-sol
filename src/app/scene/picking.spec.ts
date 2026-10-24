import { PerspectiveCamera } from 'three';
import { MIN_HIT_RADIUS_PX, ScreenBody, pickBody, projectBodies } from './picking';

const WIDTH = 800;
const HEIGHT = 600;

function camera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1000);
  cam.position.set(0, 0, 10);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

describe('picking: proyección a la pantalla', () => {
  it('el foco cae en el centro y su radio aparente sale de la focal', () => {
    const [body] = projectBodies(
      camera(),
      new Float64Array([0, 0, 0]),
      new Float64Array([1]),
      WIDTH,
      HEIGHT,
    );
    expect(body?.x).toBeCloseTo(WIDTH / 2, 9);
    expect(body?.y).toBeCloseTo(HEIGHT / 2, 9);
    const focal = HEIGHT / 2 / Math.tan(Math.PI / 6);
    expect(body?.radiusPx).toBeCloseTo(focal / Math.sqrt(99), 9);
    expect(body?.onScreen).toBe(true);
    expect(body?.occluded).toBe(false);
  });

  it('+X va a la derecha y +Y hacia arriba; lo que está detrás de la cámara no está en pantalla', () => {
    const positions = new Float64Array([2, 0, 0, 0, 2, 0, 0, 0, 20]);
    const [right, up, behind] = projectBodies(
      camera(),
      positions,
      new Float64Array([0.1, 0.1, 0.1]),
      WIDTH,
      HEIGHT,
    );
    expect(right?.x).toBeGreaterThan(WIDTH / 2);
    expect(up?.y).toBeLessThan(HEIGHT / 2);
    expect(behind?.onScreen).toBe(false);
  });

  it('detecta un cuerpo tapado por otro más cercano', () => {
    // Una luna justo detrás del planeta (visto desde la cámara) y otra a un lado.
    const positions = new Float64Array([0, 0, 0, 0, 0, -5, 4, 0, -5]);
    const bodies = projectBodies(
      camera(),
      positions,
      new Float64Array([1, 0.2, 0.2]),
      WIDTH,
      HEIGHT,
    );
    expect(bodies[1]?.occluded).toBe(true);
    expect(bodies[2]?.occluded).toBe(false);
    expect(bodies[0]?.occluded).toBe(false); // lo que está detrás no tapa lo de delante
  });
});

describe('picking: selección con el puntero', () => {
  const body = (
    index: number,
    x: number,
    y: number,
    radiusPx: number,
    depth: number,
    extra: Partial<ScreenBody> = {},
  ): ScreenBody => ({
    index,
    x,
    y,
    radiusPx,
    depth,
    onScreen: true,
    occluded: false,
    ...extra,
  });

  it('un cuerpo diminuto se puede tocar dentro de la zona agrandada', () => {
    const tiny = body(3, 100, 100, 0.5, 50);
    expect(pickBody([tiny], 100 + MIN_HIT_RADIUS_PX - 1, 100)).toBe(3);
    expect(pickBody([tiny], 100 + MIN_HIT_RADIUS_PX + 1, 100)).toBeNull();
  });

  it('elige el más centrado respecto a su zona; a igualdad, el más cercano', () => {
    const planet = body(1, 400, 300, 200, 20);
    const moon = body(2, 520, 300, 3, 15);
    expect(pickBody([planet, moon], 522, 300)).toBe(2); // junto a la luna
    expect(pickBody([planet, moon], 380, 300)).toBe(1); // en el planeta, lejos de la luna
    const a = body(4, 50, 50, 10, 30);
    const b = body(5, 50, 50, 10, 10);
    expect(pickBody([a, b], 50, 50)).toBe(5);
  });

  it('ignora lo que está fuera de la pantalla o tapado', () => {
    expect(pickBody([body(1, 10, 10, 30, 5, { occluded: true })], 10, 10)).toBeNull();
    expect(pickBody([body(1, 10, 10, 30, 5, { onScreen: false })], 10, 10)).toBeNull();
  });
});
