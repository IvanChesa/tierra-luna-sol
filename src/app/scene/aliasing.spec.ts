import { BODY_DATA } from '../data/body-data';
import { BODY_INDEX } from '../data/body-index';
import { AliasingState, MotionBody, apparentPeriodDays, degreesPerFrame } from './aliasing';

const YEAR = 365.25;
const index = (id: string) => BODY_INDEX.findIndex((b) => b.id === id);

/** Los 30 cuerpos con sus periodos del catálogo (como los prepara el motor). */
const BODIES: MotionBody[] = BODY_INDEX.map((entry) => {
  const data = BODY_DATA[entry.id];
  const rotationH = data.physical.rotationPeriodH?.value;
  const orbitDays = data.orbit ? Math.abs(data.orbit.periodDays.value) : null;
  return {
    orbitDays,
    spinDays: data.physical.synchronousRotation?.value
      ? orbitDays
      : rotationH !== undefined
        ? Math.abs(rotationH) / 24
        : null,
    parentIndex: entry.parent ? index(entry.parent) : -1,
    isMoon: entry.kind === 'moon',
  };
});

describe('aliasing: velocidades altas (PLAN §4.5)', () => {
  it('a 1 año/s y 60 FPS, Fobos y Mercurio se sustituyen por su órbita; Venus y la Tierra no', () => {
    const state = new AliasingState(BODIES);
    state.update(YEAR, 1000 / 60, -1);
    expect(state.orbit[index('fobos')]).toBe(1);
    expect(state.orbit[index('luna')]).toBe(1);
    // Mercurio: 360 × 365,25 / 87,97 / 60 ≈ 24,9° por frame.
    expect(degreesPerFrame(87.969, YEAR, 1000 / 60)).toBeCloseTo(24.9, 1);
    expect(state.orbit[index('mercurio')]).toBe(1);
    expect(state.orbit[index('venus')]).toBe(0);
    expect(state.orbit[index('tierra')]).toBe(0);
    // La Tierra gira 365 veces por segundo: su rotación se congela.
    expect(state.spin[index('tierra')]).toBe(1);
    expect(state.any).toBe(true);
  });

  it('a 1 día/s nada está en aliasing salvo lo muy rápido; en pausa, nada', () => {
    const state = new AliasingState(BODIES);
    state.update(1, 1000 / 60, -1);
    expect(state.orbit[index('fobos')]).toBe(0); // 18,8° por frame: justo por debajo
    expect(state.spin[index('jupiter')]).toBe(0);
    state.update(0, 1000 / 60, -1);
    expect(state.any).toBe(false);
  });

  it('con FPS más bajos el salto por frame es mayor: a 30 FPS, Fobos ya es órbita a 1 día/s', () => {
    const state = new AliasingState(BODIES);
    state.update(1, 1000 / 30, -1);
    expect(state.orbit[index('fobos')]).toBe(1);
  });

  it('con histéresis: entra a 20° y no sale hasta bajar de 15°', () => {
    const fobos = index('fobos');
    const period = BODIES[fobos]?.orbitDays ?? 1;
    // Velocidad que da 17° por frame a 60 FPS.
    const speed = (17 * period) / (360 * (1 / 60));
    const state = new AliasingState(BODIES);
    state.update(speed, 1000 / 60, -1);
    expect(state.orbit[fobos]).toBe(0); // 17° < 20°: no entra
    state.update(speed * 1.3, 1000 / 60, -1); // 22°: entra
    expect(state.orbit[fobos]).toBe(1);
    state.update(speed, 1000 / 60, -1); // 17°: sigue (no baja de 15°)
    expect(state.orbit[fobos]).toBe(1);
    state.update(speed * 0.8, 1000 / 60, -1); // 13,6°: sale
    expect(state.orbit[fobos]).toBe(0);
  });

  it('con el foco en una luna, su planeta gira a su alrededor con el periodo de la luna', () => {
    const luna = index('luna');
    expect(apparentPeriodDays(BODIES, index('tierra'), luna)).toBe(BODIES[luna]?.orbitDays);
    expect(apparentPeriodDays(BODIES, luna, luna)).toBeNull();
    const io = index('io');
    const europa = index('europa');
    expect(apparentPeriodDays(BODIES, europa, io)).toBe(BODIES[io]?.orbitDays);
    expect(apparentPeriodDays(BODIES, index('saturno'), io)).toBe(
      BODIES[index('saturno')]?.orbitDays,
    );
  });
});
