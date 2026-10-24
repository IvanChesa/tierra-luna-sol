import { moonGeocentric, planetHeliocentric } from './ephemeris';
import { GALILEAN_IDS, PLANET_IDS } from './ids';
import { MeanElements, galileanMoons, meanElementsPosition } from './moons';
import { SolarSystemModel, SystemBodySpec } from './system-state';
import { add, length, sub } from './vec3';

const fmt = (value: number, digits: number) => value.toFixed(digits).replace('.', ',');

/** Luna de prueba con elementos medios (órbita circular en el ecuador EQJ alrededor de Marte). */
const testMoon: MeanElements = {
  referencePole: { raDeg: 270, decDeg: 90 },
  semiMajorAxisKm: 10_000,
  eccentricity: 0,
  inclinationDeg: 0,
  nodeDeg: 0,
  nodeRateDegPerDay: 0,
  argPeriapsisDeg: 0,
  argPeriapsisRateDegPerDay: 0,
  meanAnomalyDeg: 0,
  meanMotionDegPerDay: 1000,
};

const specs: SystemBodySpec[] = [
  { id: 'sol', source: { kind: 'sun' } },
  ...PLANET_IDS.map((id) => ({ id, source: { kind: 'planet' as const } })),
  { id: 'luna', source: { kind: 'earth-moon' } },
  ...GALILEAN_IDS.map((id) => ({ id, source: { kind: 'galilean' as const } })),
  { id: 'prueba', source: { kind: 'mean-elements', parent: 'marte', elements: testMoon } },
];

describe('system-state: posiciones de todo el sistema en una llamada', () => {
  const model = new SolarSystemModel(specs);
  const date = new Date('2026-10-24T00:00:00Z');
  const state = model.at(date);

  it('el Sol está en el origen y los planetas, en su posición heliocéntrica', () => {
    expect(length(state.heliocentricOf('sol'))).toBe(0);
    for (const id of PLANET_IDS) {
      expect(state.heliocentricOf(id)).toEqual(planetHeliocentric(id, date));
      expect(state.parentOffsetOf(id)).toEqual(planetHeliocentric(id, date));
    }
  });

  it('las lunas = su planeta + su desplazamiento, con el padre correcto', () => {
    const earth = state.heliocentricOf('tierra');
    expect(state.parentOffsetOf('luna')).toEqual(moonGeocentric(date));
    expect(length(sub(state.heliocentricOf('luna'), add(earth, moonGeocentric(date))))).toBe(0);
    const jupiter = state.heliocentricOf('jupiter');
    const galileans = galileanMoons(date);
    for (const id of GALILEAN_IDS) {
      expect(length(sub(state.heliocentricOf(id), add(jupiter, galileans[id])))).toBe(0);
    }
    const mars = state.heliocentricOf('marte');
    const offset = meanElementsPosition(testMoon, date);
    expect(length(sub(state.heliocentricOf('prueba'), add(mars, offset)))).toBe(0);
    const { layout } = state;
    expect(layout.parentIndex[layout.indexOf('luna')]).toBe(layout.indexOf('tierra'));
    expect(layout.parentIndex[layout.indexOf('io')]).toBe(layout.indexOf('jupiter'));
    expect(layout.parentIndex[layout.indexOf('prueba')]).toBe(layout.indexOf('marte'));
    expect(layout.parentIndex[layout.indexOf('sol')]).toBe(-1);
  });

  it('guarda en caché el último instante y descarta los más antiguos (LRU)', () => {
    const small = new SolarSystemModel(specs, 2);
    const a = small.at(0);
    expect(small.at(new Date(0))).toBe(a);
    small.at(1000);
    small.at(0); // a pasa a ser el más reciente
    small.at(2000); // sale 1000
    expect(small.at(0)).toBe(a);
    expect(small.at(1000)).not.toBe(a);
    expect(a.date.getTime()).toBe(0);
  });

  it('rechaza listas mal formadas', () => {
    const sun: SystemBodySpec = { id: 'sol', source: { kind: 'sun' } };
    expect(() => new SolarSystemModel([sun, sun])).toThrow(/repetidos/);
    expect(() => new SolarSystemModel([{ id: 'luna', source: { kind: 'earth-moon' } }])).toThrow(
      /Falta el cuerpo padre/,
    );
    expect(
      () =>
        new SolarSystemModel([
          sun,
          { id: 'luna', source: { kind: 'earth-moon' } },
          { id: 'tierra', source: { kind: 'planet' } },
        ]),
    ).toThrow(/antes/);
    expect(
      () =>
        new SolarSystemModel([
          sun,
          { id: 'jupiter', source: { kind: 'planet' } },
          { id: 'titan', source: { kind: 'galilean' } },
        ]),
    ).toThrow(/galileana/);
    expect(() => new SolarSystemModel([sun, { id: 'pluton', source: { kind: 'planet' } }])).toThrow(
      /no es un planeta/,
    );
    expect(() => state.heliocentricOf('pluton')).toThrow(RangeError);
  });

  // Presupuesto de §5: ≤ 2 ms por frame en escritorio con los 30 cuerpos. Aquí hay 15; el test de la
  // escena (scene/system.spec.ts) mide los 30 del catálogo.
  const start = Date.UTC(2026, 0, 1);
  const samples = 300;
  const t0 = performance.now();
  for (let k = 0; k < samples; k++) new SolarSystemModel(specs, 1).at(start + k * 3_600_000);
  const meanMs = (performance.now() - t0) / samples;
  it(`calcula 15 cuerpos en ${fmt(meanMs, 3)} ms de media (instantes distintos, sin caché)`, () => {
    expect(meanMs).toBeLessThan(2);
  });
});
