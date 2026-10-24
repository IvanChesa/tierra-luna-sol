import { PerspectiveCamera, Vector3 } from 'three';
import { NO_INSETS, approachInsets, sanitizeInsets, viewProjection } from './view-insets';

const W = 1600;
const H = 844;
const FOV = 40;

/** Cámara mirando a −Z con la proyección calculada; devuelve dónde cae un punto (px CSS). */
function project(insets: typeof NO_INSETS, point: Vector3) {
  const p = viewProjection(W, H, FOV, insets);
  const camera = new PerspectiveCamera(p.fovDeg, p.aspect, 0.1, 100);
  if (p.offset) {
    const o = p.offset;
    camera.setViewOffset(o.fullWidth, o.fullHeight, o.x, o.y, o.width, o.height);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * W, y: ((1 - ndc.y) / 2) * H };
}

describe('view-insets: encuadre que respeta los paneles (setViewOffset)', () => {
  it('sin paneles, la proyección es la normal', () => {
    const p = viewProjection(W, H, FOV, NO_INSETS);
    expect(p.offset).toBeNull();
    expect(p.fovDeg).toBe(FOV);
    expect(p.aspect).toBeCloseTo(W / H, 12);
  });

  it('el centro de la escena cae en el centro de la parte visible', () => {
    const insets = { top: 0, right: 336, bottom: 68, left: 296 };
    const center = project(insets, new Vector3(0, 0, -10));
    expect(center.x).toBeCloseTo(296 + (W - 296 - 336) / 2, 6);
    expect(center.y).toBeCloseTo((H - 68) / 2, 6);
  });

  it('un panel desplaza la escena pero no la acerca: un píxel mide el mismo ángulo', () => {
    const offAxis = new Vector3(1, 0.5, -10);
    const plain = project(NO_INSETS, offAxis);
    const plainCenter = project(NO_INSETS, new Vector3(0, 0, -10));
    const insets = { top: 120, right: 0, bottom: 200, left: 300 };
    const shifted = project(insets, offAxis);
    const shiftedCenter = project(insets, new Vector3(0, 0, -10));
    expect(shifted.x - shiftedCenter.x).toBeCloseTo(plain.x - plainCenter.x, 6);
    expect(shifted.y - shiftedCenter.y).toBeCloseTo(plain.y - plainCenter.y, 6);
  });

  it('la parte visible tiene su propio campo y su proporción (para encuadrar en ella)', () => {
    const p = viewProjection(W, H, FOV, { top: 0, right: 0, bottom: H / 2, left: 0 });
    const expected = (2 * Math.atan(Math.tan((FOV * Math.PI) / 360) / 2) * 180) / Math.PI;
    expect(p.visibleFovDeg).toBeCloseTo(expected, 9);
    expect(p.visibleAspect).toBeCloseTo(W / (H / 2), 9);
  });

  it('márgenes imposibles se recortan y siempre queda algo visible', () => {
    const s = sanitizeInsets({ top: Number.NaN, right: 2000, bottom: -5, left: 2000 }, W, H);
    expect(s.top).toBe(0);
    expect(s.bottom).toBe(0);
    expect(W - s.left - s.right).toBeCloseTo(48, 6);
  });

  it('los márgenes se acercan a su objetivo con suavidad y llegan exactos', () => {
    const target = { top: 0, right: 300, bottom: 0, left: 0 };
    let current = NO_INSETS;
    const first = approachInsets(current, target, 16, 120);
    expect(first.insets.right).toBeGreaterThan(0);
    expect(first.insets.right).toBeLessThan(300);
    for (let k = 0; k < 200 && !approachInsets(current, target, 16, 120).settled; k++) {
      current = approachInsets(current, target, 16, 120).insets;
    }
    expect(approachInsets(current, target, 16, 120).insets).toEqual(target);
    expect(approachInsets(NO_INSETS, target, 16, 0)).toEqual({ insets: target, settled: true });
  });
});
