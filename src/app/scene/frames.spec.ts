import { KM_PER_AU } from '../ephemeris/constants';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  PlacementInput,
  illustrativeRadius,
  placeHeliocentricPoint,
} from '../ephemeris/scale';
import { Vec3, length, sub, vec3 } from '../ephemeris/vec3';
import { FRAME_TRANSITION_MS, FrameController, easeInOutCubic, frameFor } from './frames';
import {
  NEPTUNE_SEMI_MAJOR_AXIS_AU,
  RADII_KM,
  SCENE_BODIES,
  createSolarSystemModel,
  sceneBody,
} from './system';

const model = createSolarSystemModel();
const ix = (id: string) => model.layout.indexOf(id);
const inputAt = (iso: string): PlacementInput => {
  const state = model.at(new Date(iso));
  return {
    heliocentric: state.heliocentric,
    parentOffset: state.parentOffset,
    parentIndex: state.layout.parentIndex,
    radiusKm: RADII_KM,
  };
};
const at = (frames: FrameController, id: string): Vec3 => {
  const k = 3 * ix(id);
  const p = frames.output.position;
  return vec3(p[k] as number, p[k + 1] as number, p[k + 2] as number);
};

const illustrative = frameFor('illustrative', null, NEPTUNE_SEMI_MAJOR_AXIS_AU);
const real = frameFor('real', null, NEPTUNE_SEMI_MAJOR_AXIS_AU);
const localSaturn = frameFor(
  'illustrative',
  sceneBody('saturno').radiusKm,
  NEPTUNE_SEMI_MAJOR_AXIS_AU,
);

describe('frames: el marco de cada situación', () => {
  it('vista general ilustrativa o real; al enfocar un sistema, el sistema local físico', () => {
    expect(illustrative.kind).toBe('illustrative');
    expect(real.kind).toBe('physical');
    expect(localSaturn.kind).toBe('physical');
    // En la escala real, enfocar un planeta también usa su sistema local (es geometría real).
    expect(frameFor('real', 60_268, NEPTUNE_SEMI_MAJOR_AXIS_AU)).toEqual(localSaturn);
  });

  it('la curva de las transiciones va de 0 a 1 sin pasarse y es simétrica', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1, 12);
  });
});

describe('frames: origen flotante y transiciones', () => {
  const input = inputAt('2026-10-24T00:00:00Z');
  const sun = ix('sol');
  const saturn = ix('saturno');

  it('todo sale relativo al foco: el foco está en el origen', () => {
    const frames = new FrameController(illustrative, saturn, SCENE_BODIES.length);
    frames.update(input, 0);
    expect(length(at(frames, 'saturno'))).toBe(0);
    expect(length(at(frames, 'sol'))).toBeGreaterThan(100);
    expect(frames.animating).toBe(false);
  });

  it('una transición al sistema local de Saturno conserva su tamaño y aleja lo demás', () => {
    const frames = new FrameController(illustrative, saturn, SCENE_BODIES.length);
    frames.update(input, 0);
    const radiusBefore = frames.output.radius[saturn] as number;
    const titanBefore = length(at(frames, 'titan'));
    const sunBefore = length(at(frames, 'sol'));
    frames.transitionTo(localSaturn, saturn, 0, FRAME_TRANSITION_MS);
    expect(frames.animating).toBe(true);
    frames.update(input, FRAME_TRANSITION_MS / 2);
    const titanMid = length(at(frames, 'titan'));
    frames.update(input, FRAME_TRANSITION_MS);
    expect(frames.animating).toBe(false);
    expect(frames.output.radius[saturn]).toBeCloseTo(radiusBefore, 12);
    const titanAfter = length(at(frames, 'titan'));
    expect(titanMid).toBeGreaterThan(titanBefore);
    expect(titanAfter).toBeGreaterThan(titanMid);
    // Titán, a su distancia real en radios de Saturno.
    const real =
      (length(model.at(new Date('2026-10-24T00:00:00Z')).parentOffsetOf('titan')) * KM_PER_AU) /
      60_268;
    expect(titanAfter / radiusBefore).toBeCloseTo(real, 6);
    // El Sol queda a su distancia real: ~9,5 UA son decenas de miles de radios de Saturno.
    expect(length(at(frames, 'sol'))).toBeGreaterThan(sunBefore * 100);
  });

  it('cambiar el foco dentro del mismo marco no anima nada', () => {
    const frames = new FrameController(illustrative, sun, SCENE_BODIES.length);
    frames.transitionTo(illustrative, saturn, 0, FRAME_TRANSITION_MS);
    expect(frames.animating).toBe(false);
    frames.update(input, 0);
    expect(length(at(frames, 'saturno'))).toBe(0);
  });

  it('una transición interrumpida continúa sin saltos', () => {
    const frames = new FrameController(illustrative, sun, SCENE_BODIES.length);
    frames.update(input, 0);
    frames.transitionTo(real, sun, 0, FRAME_TRANSITION_MS);
    frames.update(input, 600);
    const before = at(frames, 'marte');
    // A mitad, se pide volver a la ilustrativa: el primer frame de la nueva sale del mismo sitio.
    frames.transitionTo(illustrative, sun, 600, FRAME_TRANSITION_MS);
    frames.update(input, 600);
    expect(length(sub(at(frames, 'marte'), before))).toBeLessThan(1e-9 * length(before));
    frames.update(input, 600 + FRAME_TRANSITION_MS);
    expect(frames.animating).toBe(false);
    expect(frames.targetSpec).toBe(illustrative);
  });

  it('con duración 0 (movimiento reducido) el cambio es directo', () => {
    const frames = new FrameController(illustrative, sun, SCENE_BODIES.length);
    frames.transitionTo(real, sun, 0, 0);
    expect(frames.animating).toBe(false);
    frames.update(input, 0);
    const mars = model.at(new Date('2026-10-24T00:00:00Z')).heliocentricOf('marte');
    expect(length(at(frames, 'marte'))).toBeCloseTo(length(placeHeliocentricPoint(real, mars)), 9);
  });

  it('los puntos de órbita se transforman igual que los cuerpos, también a mitad de transición', () => {
    const state = model.at(new Date('2026-10-24T00:00:00Z'));
    const frames = new FrameController(illustrative, ix('tierra'), SCENE_BODIES.length);
    frames.update(input, 0);
    frames.transitionTo(localSaturn, saturn, 0, FRAME_TRANSITION_MS);
    for (const t of [0, 300, 750, 1200, FRAME_TRANSITION_MS]) {
      frames.update(input, t);
      // Un punto de la órbita de Saturno en su posición actual coincide con Saturno…
      expect(length(frames.helioPoint(state.heliocentricOf('saturno')))).toBeLessThan(1e-9);
      // …y uno de la órbita de Titán en su posición actual, con Titán.
      const titan = frames.moonPoint(saturn, state.parentOffsetOf('titan'));
      const scale = Math.max(1, length(at(frames, 'titan')));
      expect(length(sub(titan, at(frames, 'titan'))) / scale).toBeLessThan(1e-9);
    }
  });

  it('pide update() antes de colocar puntos', () => {
    const frames = new FrameController(illustrative, sun, SCENE_BODIES.length);
    expect(() => frames.helioPoint(vec3(1, 0, 0))).toThrow(/update/);
  });

  it('el radio ilustrativo del foco es el de la fase 1', () => {
    const frames = new FrameController(illustrative, sun, SCENE_BODIES.length);
    frames.update(input, 0);
    expect(frames.output.radius[ix('tierra')]).toBe(
      illustrativeRadius(sceneBody('tierra').radiusKm, DEFAULT_ILLUSTRATIVE_SCALE),
    );
  });
});
