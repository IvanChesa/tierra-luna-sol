import { KM_PER_AU } from './constants';
import { planetHeliocentric } from './ephemeris';
import { GALILEAN_IDS, PLANET_IDS } from './ids';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  OverviewScreen,
  Placement,
  PlacementInput,
  RELIEF_SOFTNESS,
  RingReach,
  blendMagnitude,
  blendPlacements,
  blendPosition,
  compressSystems,
  createMoonSystems,
  globalPhysicalKmPerUnit,
  illustrativeDistance,
  illustrativeDistanceToAu,
  illustrativeFrame,
  illustrativeMoonOffset,
  illustrativePosition,
  illustrativeRadius,
  localPhysicalKmPerUnit,
  moonSystemLayout,
  placeBodies,
  placeHeliocentricPoint,
  placeMoonPoint,
  placeRadius,
  realPosition,
  realRadius,
  reliefFactor,
  relieveOverlaps,
} from './scale';
import { SolarSystemModel, SystemBodySpec } from './system-state';
import { angleBetweenDeg, length, sub, vec3 } from './vec3';

describe('scale: escala ilustrativa', () => {
  it('sigue la fórmula r = K · log10(1 + r / 0,1 UA) del plan', () => {
    expect(illustrativeDistance(0)).toBe(0);
    expect(illustrativeDistance(0.9)).toBeCloseTo(100, 12); // log10(10) = 1
    expect(illustrativeDistance(30)).toBeCloseTo(100 * Math.log10(301), 12);
  });

  it('es estrictamente monótona de 0 a 50 UA y su inversa la deshace', () => {
    let previous = -Infinity;
    for (let au = 0; au <= 50; au += 0.01) {
      const units = illustrativeDistance(au);
      expect(units).toBeGreaterThan(previous);
      expect(illustrativeDistanceToAu(units)).toBeCloseTo(au, 9);
      previous = units;
    }
  });

  it('rechaza distancias negativas o NaN', () => {
    expect(() => illustrativeDistance(-1)).toThrow(RangeError);
    expect(() => illustrativeDistance(Number.NaN)).toThrow(RangeError);
  });

  it('conserva la dirección real de los planetas y su orden de distancias', () => {
    const date = new Date('2026-10-23T00:00:00Z');
    const distances = PLANET_IDS.map((id) => {
      const helio = planetHeliocentric(id, date);
      const vis = illustrativePosition(helio);
      expect(angleBetweenDeg(helio, vis)).toBeLessThan(1e-9);
      return length(vis);
    });
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(illustrativePosition(vec3(0, 0, 0))).toEqual(vec3(0, 0, 0));
  });

  it('agranda los radios con una curva monótona y acotada', () => {
    const p = DEFAULT_ILLUSTRATIVE_SCALE;
    expect(illustrativeRadius(1)).toBe(p.minRadius);
    expect(illustrativeRadius(696_000)).toBeLessThanOrEqual(p.maxRadius);
    let previous = 0;
    for (const km of [11, 1000, 2440, 6371, 24_764, 71_492, 696_000]) {
      const r = illustrativeRadius(km);
      expect(r).toBeGreaterThanOrEqual(previous);
      previous = r;
    }
  });
});

describe('scale: sistemas de lunas de la vista general (fase 9b, D39)', () => {
  // Del catálogo (data/body-data.ts, NASA y JPL), redondeado: radio (km), semieje (km), excentricidad.
  const GALILEANS = [
    { radiusKm: 1821.5, semiMajorAxisKm: 421_800, eccentricity: 0.004 },
    { radiusKm: 1560.8, semiMajorAxisKm: 671_100, eccentricity: 0.009 },
    { radiusKm: 2631.2, semiMajorAxisKm: 1_070_400, eccentricity: 0.001 },
    { radiusKm: 2410.3, semiMajorAxisKm: 1_882_700, eccentricity: 0.007 },
  ];
  const SATURNIANS = [
    { radiusKm: 198.2, semiMajorAxisKm: 185_520, eccentricity: 0.0202 },
    { radiusKm: 252.1, semiMajorAxisKm: 238_020, eccentricity: 0.0045 },
    { radiusKm: 531.1, semiMajorAxisKm: 294_660, eccentricity: 0 },
    { radiusKm: 561.4, semiMajorAxisKm: 377_400, eccentricity: 0.0022 },
    { radiusKm: 763.5, semiMajorAxisKm: 527_040, eccentricity: 0.001 },
    { radiusKm: 2574.8, semiMajorAxisKm: 1_221_870, eccentricity: 0.0292 },
    { radiusKm: 734.3, semiMajorAxisKm: 3_560_850, eccentricity: 0.0283 },
  ];
  const SATURN_RINGS = 136_775 / 60_268;
  const moonParams = DEFAULT_ILLUSTRATIVE_SCALE.moons;
  type Moons = readonly { radiusKm: number; semiMajorAxisKm: number; eccentricity: number }[];

  /** El aire, de superficie a superficie y en el peor caso: con el planeta y entre lunas vecinas. */
  function worstGaps(
    layout: ReturnType<typeof moonSystemLayout>,
    moons: Moons,
  ): { planet: number; neighbours: number[] } {
    const order = moons
      .map((_, k) => k)
      .sort((a, b) => (moons[a]?.semiMajorAxisKm ?? 0) - (moons[b]?.semiMajorAxisKm ?? 0));
    const peri = (k: number) => (layout.axis[k] ?? 0) * (1 - (moons[k]?.eccentricity ?? 0));
    const apo = (k: number) => (layout.axis[k] ?? 0) * (1 + (moons[k]?.eccentricity ?? 0));
    const first = order[0] ?? 0;
    return {
      planet: peri(first) - (layout.size[first] ?? 0) - layout.core,
      neighbours: order.slice(1).map((k, j) => {
        const inner = order[j] ?? 0;
        return peri(k) - (layout.size[k] ?? 0) - apo(inner) - (layout.size[inner] ?? 0);
      }),
    };
  }

  it('las lunas, más pequeñas respecto a su planeta: Ganímedes, del 10 al 15 % de Júpiter, y la Luna, del 35 al 45 % de la Tierra', () => {
    const jupiter = moonSystemLayout(71_492, 1, GALILEANS);
    expect(jupiter.size[2]).toBeGreaterThan(0.1);
    expect(jupiter.size[2]).toBeLessThan(0.15);
    const earth = moonSystemLayout(6378, 1, [
      { radiusKm: 1737.4, semiMajorAxisKm: 384_400, eccentricity: 0.0549 },
    ]);
    expect(earth.size[0]).toBeGreaterThan(0.35);
    expect(earth.size[0]).toBeLessThan(0.45);
    // La ley, (r / R)^β: Titán, el 12,9 % de Saturno.
    const saturn = moonSystemLayout(60_268, SATURN_RINGS, SATURNIANS);
    expect(saturn.size[5]).toBeCloseTo((2574.8 / 60_268) ** moonParams.sizeExponent, 12);
    expect(saturn.size[5]).toBeCloseTo(0.129, 3);
  });

  it('en cada sistema, el orden de tamaños y el de las órbitas son los reales', () => {
    const systems: readonly (readonly [number, number, Moons])[] = [
      [71_492, 1, GALILEANS],
      [60_268, SATURN_RINGS, SATURNIANS],
    ];
    for (const [radius, core, moons] of systems) {
      const layout = moonSystemLayout(radius, core, moons);
      const rank = (values: readonly number[]) =>
        values.map((_, k) => k).sort((a, b) => (values[a] ?? 0) - (values[b] ?? 0));
      expect(rank(layout.size)).toEqual(rank(moons.map((m) => m.radiusKm)));
      expect(rank(layout.axis)).toEqual(rank(moons.map((m) => m.semiMajorAxisKm)));
    }
    // Aunque lleguen desordenadas (Tritón va antes que Proteo en el catálogo).
    const neptune = moonSystemLayout(24_764, 1, [
      { radiusKm: 1352.6, semiMajorAxisKm: 354_760, eccentricity: 0.000016 },
      { radiusKm: 208, semiMajorAxisKm: 117_647, eccentricity: 0.0004 },
    ]);
    expect(neptune.axis[1]).toBeLessThan(neptune.axis[0] ?? 0);
  });

  it('sin cruces: la primera, fuera del planeta (o de los anillos), y cada una, a un hueco de la anterior', () => {
    const systems: readonly (readonly [number, number, Moons])[] = [
      [71_492, 1, GALILEANS],
      [60_268, SATURN_RINGS, SATURNIANS],
    ];
    for (const [radius, core, moons] of systems) {
      const layout = moonSystemLayout(radius, core, moons);
      const { planet, neighbours } = worstGaps(layout, moons);
      expect(planet).toBeCloseTo(moonParams.clearance, 9);
      for (const gap of neighbours) expect(gap).toBeGreaterThan(moonParams.gapMin);
      // Lo que ocupa el sistema: la luna más lejana en su apoapsis, con su radio.
      const last = moons.length - 1;
      expect(layout.reach).toBeCloseTo(
        (layout.axis[last] ?? 0) * (1 + (moons[last]?.eccentricity ?? 0)) +
          (layout.size[last] ?? 0),
        12,
      );
    }
    // Las de Saturno, todas por fuera del anillo A (en la realidad, también).
    const saturn = moonSystemLayout(60_268, SATURN_RINGS, SATURNIANS);
    for (const axis of saturn.axis) expect(axis).toBeGreaterThan(SATURN_RINGS);
    expect(saturn.core).toBe(SATURN_RINGS);
  });

  it('los saltos grandes de la distancia real se notan (la parte logarítmica)', () => {
    const saturn = moonSystemLayout(60_268, SATURN_RINGS, SATURNIANS);
    const titan = saturn.axis[5] ?? 0;
    const iapetus = saturn.axis[6] ?? 0;
    expect(iapetus - titan).toBeGreaterThanOrEqual(
      moonParams.spread * Math.log10(3_560_850 / 1_221_870) - 1e-9,
    );
  });

  it('rechaza planetas y lunas que no valen', () => {
    expect(() => moonSystemLayout(0, 1, GALILEANS)).toThrow(RangeError);
    expect(() => moonSystemLayout(71_492, 0.5, GALILEANS)).toThrow(RangeError);
    expect(() =>
      moonSystemLayout(71_492, 1, [{ radiusKm: 10, semiMajorAxisKm: 1e5, eccentricity: 1 }]),
    ).toThrow(RangeError);
    expect(moonSystemLayout(71_492, 1, []).reach).toBe(1);
  });

  it('la posición ilustrativa: la órbita real escalada, en la misma dirección, y comprimida hacia el planeta', () => {
    const offset = vec3(0.001, 0.002, -0.0005);
    const scale = 1000;
    const parent = { radius: 3, core: 2, compression: 1 };
    const full = illustrativeMoonOffset(offset, scale, parent);
    expect(angleBetweenDeg(full, offset)).toBeLessThan(1e-9);
    expect(length(full)).toBeCloseTo(3 * length(offset) * scale, 9);
    const half = illustrativeMoonOffset(offset, scale, { ...parent, compression: 0.5 });
    expect(length(half)).toBeCloseTo(3 * (2 + 0.5 * (length(offset) * scale - 2)), 9);
    const none = illustrativeMoonOffset(offset, scale, { ...parent, compression: 0 });
    expect(length(none)).toBeCloseTo(6, 9);
  });

  it('la compresión: nada lejos, lo justo para dejar el aire de cerca y 0 si los planetas no dejan sitio', () => {
    // Dos planetas de radio 2 con sistemas que llegan a 3 radios (lo que ocupan: 1).
    const systems = {
      size: new Float64Array(2),
      scale: new Float64Array(2),
      core: Float64Array.from([1, 1]),
      reach: Float64Array.from([3, 3]),
    };
    const radius = Float64Array.from([2, 2]);
    const at = (d: number, which = systems) =>
      compressSystems(
        Float64Array.from([0, 0, 0, d, 0, 0]),
        radius,
        [0, 1],
        which,
        0.5,
        new Float64Array(2),
      );
    expect([...at(100)]).toEqual([1, 1]);
    // A 8,5 unidades: los planetas ocupan 4 y el aire 0,5; para los sistemas quedan 4 de 8.
    const close = at(8.5);
    expect(close[0]).toBeLessThanOrEqual(0.5 + 1e-12);
    expect(close[0]).toBe(close[1]);
    // Con la compresión, las dos esferas dejan al menos el aire pedido.
    const c = close[0] ?? 0;
    expect(8.5 - 2 * (2 * (1 + c * 2))).toBeGreaterThanOrEqual(0.5 - 1e-9);
    expect([...at(3)]).toEqual([0, 0]);
    // Un cuerpo sin lunas junto a un sistema: solo cuenta lo que se puede comprimir.
    const bare = { ...systems, reach: Float64Array.from([3, 1]) };
    expect(at(9, bare)[0]).toBeLessThan(1);
    expect(at(20, bare)[0]).toBe(1);
  });
});

describe('scale: escala real', () => {
  it('usa distancias y radios físicos', () => {
    expect(length(realPosition(vec3(1, 0, 0), { kmPerUnit: 1000 }))).toBeCloseTo(
      KM_PER_AU / 1000,
      6,
    );
    expect(realRadius(6371, { kmPerUnit: 1000 })).toBeCloseTo(6.371, 12);
  });
});

describe('scale: transición ilustrativa ↔ real', () => {
  const date = new Date('2026-10-23T00:00:00Z');
  const helio = PLANET_IDS.map((id) => planetHeliocentric(id, date));
  const from = helio.map((v) => illustrativePosition(v));
  const to = helio.map((v) => realPosition(v));

  it('empieza y acaba exactamente en cada escala', () => {
    from.forEach((v, k) => {
      expect(blendPosition(v, to[k] ?? v, 0)).toEqual(v);
      expect(blendPosition(v, to[k] ?? v, 1)).toEqual(to[k]);
    });
    expect(blendMagnitude(2, 8, 0.5)).toBeCloseTo(4, 12);
  });

  it('es continua: 1000 pasos sin saltos mayores que el 1,5 % de la distancia', () => {
    from.forEach((start, k) => {
      const end = to[k] ?? start;
      let previous = start;
      for (let step = 1; step <= 1000; step++) {
        const current = blendPosition(start, end, step / 1000);
        const jump = length(sub(current, previous));
        expect(jump).toBeLessThan(0.015 * Math.max(length(previous), length(current)));
        previous = current;
      }
    });
  });

  it('ningún planeta adelanta a otro a mitad de la transición y la dirección no cambia', () => {
    for (let step = 0; step <= 100; step++) {
      const t = step / 100;
      const distances = from.map((v, k) => length(blendPosition(v, to[k] ?? v, t)));
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
      from.forEach((v, k) => {
        expect(angleBetweenDeg(blendPosition(v, to[k] ?? v, t), v)).toBeLessThan(1e-9);
      });
    }
  });

  it('interpola linealmente si alguna magnitud es cero o negativa', () => {
    expect(blendMagnitude(0, 10, 0.25)).toBe(2.5);
    expect(blendPosition(vec3(0, 0, 0), vec3(4, 0, 0), 0.5)).toEqual(vec3(2, 0, 0));
  });
});

describe('scale: marcos de escala y transiciones relativas al foco (D12)', () => {
  const specs: SystemBodySpec[] = [
    { id: 'sol', source: { kind: 'sun' } },
    ...PLANET_IDS.map((id) => ({ id, source: { kind: 'planet' as const } })),
    { id: 'luna', source: { kind: 'earth-moon' } },
    ...GALILEAN_IDS.map((id) => ({ id, source: { kind: 'galilean' as const } })),
  ];
  // Radios de prueba (km): ecuatoriales de los planetas y medios de las lunas, redondeados.
  const RADII: Record<string, number> = {
    sol: 695_700,
    mercurio: 2440,
    venus: 6052,
    tierra: 6378,
    marte: 3396,
    jupiter: 71_492,
    saturno: 60_268,
    urano: 25_559,
    neptuno: 24_764,
    luna: 1737,
    io: 1822,
    europa: 1561,
    ganimedes: 2634,
    calisto: 2410,
  };
  const radius = (id: string) => RADII[id] ?? 1;
  // Semieje (km) y excentricidad de prueba de las lunas, del catálogo, redondeados.
  const ORBITS: Record<string, readonly [number, number]> = {
    luna: [384_400, 0.0549],
    io: [421_800, 0.004],
    europa: [671_100, 0.009],
    ganimedes: [1_070_400, 0.001],
    calisto: [1_882_700, 0.007],
  };
  const state = new SolarSystemModel(specs).at(new Date('2026-10-24T00:00:00Z'));
  const { layout } = state;
  const radiusKm = Float64Array.from(layout.ids, radius);
  const moons = createMoonSystems(
    radiusKm,
    layout.parentIndex,
    Float64Array.from(layout.ids, (id) => ORBITS[id]?.[0] ?? 0),
    Float64Array.from(layout.ids, (id) => ORBITS[id]?.[1] ?? 0),
    new Float64Array(layout.ids.length).fill(1),
  );
  const input: PlacementInput = {
    heliocentric: state.heliocentric,
    parentOffset: state.parentOffset,
    parentIndex: layout.parentIndex,
    radiusKm,
    moons,
  };
  const ix = (id: string) => layout.indexOf(id);
  const pos = (p: Placement, id: string) => {
    const k = 3 * ix(id);
    return vec3(p.position[k] ?? 0, p.position[k + 1] ?? 0, p.position[k + 2] ?? 0);
  };
  const illustrative = placeBodies(illustrativeFrame(), input);
  const localJupiter = placeBodies(
    { kind: 'physical', kmPerUnit: localPhysicalKmPerUnit(radius('jupiter')) },
    input,
  );
  const globalReal = placeBodies(
    { kind: 'physical', kmPerUnit: globalPhysicalKmPerUnit(30.07) },
    input,
  );

  it('el marco ilustrativo coloca planetas y lunas con las funciones de la fase 1', () => {
    expect(pos(illustrative, 'marte')).toEqual(illustrativePosition(state.heliocentricOf('marte')));
    const earth = illustrativeRadius(radius('tierra'));
    const compression = illustrative.compression[ix('tierra')] ?? 1;
    const moonOffset = illustrativeMoonOffset(
      state.parentOffsetOf('luna'),
      moons.scale[ix('luna')] ?? 0,
      { radius: earth, core: 1, compression },
    );
    const earthToMoon = sub(pos(illustrative, 'luna'), pos(illustrative, 'tierra'));
    expect(length(earthToMoon)).toBeCloseTo(length(moonOffset), 9);
    expect(illustrative.radius[ix('tierra')]).toBe(earth);
    // La Luna, con su ley de tamaños (D39) y la compresión de su sistema.
    expect(illustrative.radius[ix('luna')]).toBeCloseTo(
      compression * (moons.size[ix('luna')] ?? 0) * earth,
      12,
    );
  });

  it('el sistema local físico conserva el radio del planeta y pone sus lunas a escala real', () => {
    const j = ix('jupiter');
    expect(localJupiter.radius[j]).toBeCloseTo(illustrative.radius[j] ?? 0, 12);
    const jupiterUnits = localJupiter.radius[j] ?? 0;
    for (const id of GALILEAN_IDS) {
      const realRatio = (length(state.parentOffsetOf(id)) * KM_PER_AU) / radius('jupiter');
      const offset = sub(pos(localJupiter, id), pos(localJupiter, 'jupiter'));
      expect(length(offset) / jupiterUnits).toBeCloseTo(realRatio, 9);
      const sizeRatio = (localJupiter.radius[ix(id)] ?? 0) / jupiterUnits;
      expect(sizeRatio).toBeCloseTo(radius(id) / radius('jupiter'), 12);
    }
  });

  it('la escala real global deja la extensión del sistema como en la ilustrativa', () => {
    const kmPerUnit = globalPhysicalKmPerUnit(30.07);
    expect((30.07 * KM_PER_AU) / kmPerUnit).toBeCloseTo(illustrativeDistance(30.07), 9);
    expect(() => globalPhysicalKmPerUnit(0)).toThrow(RangeError);
    // Tamaños reales: el Sol mide 109 Tierras también en la escena.
    const sunToEarth = (globalReal.radius[ix('sol')] ?? 0) / (globalReal.radius[ix('tierra')] ?? 1);
    expect(sunToEarth).toBeCloseTo(695_700 / 6378, 9);
  });

  it('una órbita se transforma igual que su cuerpo (planetas y lunas)', () => {
    const frame = illustrativeFrame();
    expect(placeHeliocentricPoint(frame, state.heliocentricOf('saturno'))).toEqual(
      pos(illustrative, 'saturno'),
    );
    const parent = {
      position: pos(illustrative, 'jupiter'),
      radius: illustrative.radius[ix('jupiter')] ?? 0,
      core: moons.core[ix('jupiter')] ?? 1,
      compression: illustrative.compression[ix('jupiter')] ?? 1,
    };
    const io = placeMoonPoint(
      frame,
      parent,
      state.parentOffsetOf('io'),
      moons.scale[ix('io')] ?? 0,
    );
    expect(io).toEqual(pos(illustrative, 'io'));
    expect(placeRadius(frame, 1)).toBe(DEFAULT_ILLUSTRATIVE_SCALE.minRadius);
  });

  const focus = ix('jupiter');
  const steps = 200;
  const blendAt = (t: number) => blendPlacements(illustrative, localJupiter, focus, t);

  it('la transición empieza y acaba exactamente en cada marco, relativa al foco', () => {
    const start = blendAt(0);
    const end = blendAt(1);
    for (const id of layout.ids) {
      const relFrom = sub(pos(illustrative, id), pos(illustrative, 'jupiter'));
      const relTo = sub(pos(localJupiter, id), pos(localJupiter, 'jupiter'));
      expect(length(sub(pos(start, id), relFrom))).toBe(0);
      expect(length(sub(pos(end, id), relTo))).toBeLessThan(1e-9 * Math.max(1, length(relTo)));
    }
    expect(length(pos(blendAt(0.37), 'jupiter'))).toBe(0);
    // Sin transición (el mismo marco en los dos extremos), es la colocación relativa al foco.
    const same = blendPlacements(illustrative, illustrative, focus, 0.5);
    const ioFromJupiter = sub(pos(illustrative, 'io'), pos(illustrative, 'jupiter'));
    expect(length(sub(pos(same, 'io'), ioFromJupiter))).toBe(0);
  });

  it(`es continua: ${steps} pasos sin saltos mayores que el 6 % de la distancia al foco`, () => {
    let previous = blendAt(0);
    for (let step = 1; step <= steps; step++) {
      const current = blendAt(step / steps);
      for (const id of layout.ids) {
        if (id === 'jupiter') continue;
        const jump = length(sub(pos(current, id), pos(previous, id)));
        const size = Math.max(length(pos(previous, id)), length(pos(current, id)));
        expect(jump).toBeLessThan(0.06 * size);
      }
      previous = current;
    }
  });

  it('ningún cuerpo atraviesa el planeta enfocado y sus lunas no se adelantan', () => {
    const realOrder = [...GALILEAN_IDS].sort(
      (a, b) => length(state.parentOffsetOf(a)) - length(state.parentOffsetOf(b)),
    );
    for (let step = 0; step <= steps; step++) {
      const p = blendAt(step / steps);
      const focusRadius = p.radius[focus] ?? 0;
      for (const id of layout.ids) {
        if (id === 'jupiter') continue;
        expect(length(pos(p, id))).toBeGreaterThan(focusRadius + (p.radius[ix(id)] ?? 0));
      }
      const distances = realOrder.map((id) => length(pos(p, id)));
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    }
  });

  it('falla con índices fuera de rango en vez de colocar cuerpos en el origen', () => {
    expect(() => blendPlacements(illustrative, localJupiter, 99, 0.5)).toThrow(RangeError);
    expect(() =>
      placeBodies(illustrativeFrame(), { ...input, parentIndex: new Int16Array([-1, 40]) }),
    ).toThrow(RangeError);
  });

  it('entre la escala ilustrativa y la real global, con el foco en el Sol, nadie adelanta a nadie', () => {
    for (let step = 0; step <= steps; step++) {
      const p = blendPlacements(illustrative, globalReal, ix('sol'), step / steps);
      const distances = PLANET_IDS.map((id) => length(pos(p, id)));
      expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    }
  });

  describe('scale: tamaños sin solapes en la escala ilustrativa (revisión del bloque C, C2 y C3)', () => {
    /** Posiciones x, y, z de una lista de puntos. */
    const positions = (...points: [number, number, number][]) => Float64Array.from(points.flat());
    const factors = (
      position: Float64Array,
      radius: number[],
      margin = 1,
      ring: RingReach | null = null,
    ) =>
      relieveOverlaps(
        position,
        Float64Array.from(radius),
        radius.map((_, k) => k),
        margin,
        ring,
        new Float64Array(radius.length),
      );

    it('el paso suave: nada lejos, lo justo de cerca y, entre medias, sin esquinas ni pasarse', () => {
      const w = RELIEF_SOFTNESS;
      expect(reliefFactor(1 + w)).toBe(1);
      expect(reliefFactor(3)).toBe(1);
      expect(reliefFactor(1 - w)).toBeCloseTo(1 - w, 12);
      expect(reliefFactor(0.5)).toBe(0.5);
      expect(reliefFactor(-0.2)).toBe(0);
      let previous = reliefFactor(0.5);
      for (let needed = 0.5; needed <= 1.3; needed += 0.001) {
        const f = reliefFactor(needed);
        // Nunca más de lo que deja no tocarse; monótono y sin saltos (pendiente entre 0 y 1).
        expect(f).toBeLessThanOrEqual(needed + 1e-12);
        expect(f).toBeGreaterThanOrEqual(previous - 1e-12);
        expect(f - previous).toBeLessThanOrEqual(0.001 + 1e-12);
        previous = f;
      }
    });

    it('solo encogen los dos que se acercan, lo justo para dejar el margen', () => {
      // Dos cuerpos de radio 2 a 4,5 unidades (se tocarían) y un tercero lejos.
      const out = factors(positions([0, 0, 0], [4.5, 0, 0], [50, 0, 0]), [2, 2, 3], 1);
      const f = out[0] as number;
      expect(out[1]).toBe(f);
      expect(out[2]).toBe(1);
      // Quedan a 1 unidad (el margen) o más: (4,5 − 1) / 4 = 0,875 como mucho.
      expect(f).toBeLessThanOrEqual(0.875);
      expect(4.5 - 4 * f).toBeGreaterThanOrEqual(1 - 1e-12);
      // Lejos (a más de 1,15 veces lo necesario), nadie encoge.
      expect([...factors(positions([0, 0, 0], [6, 0, 0]), [2, 2], 1)]).toEqual([1, 1]);
    });

    it('recuperan el tamaño al separarse, sin saltos', () => {
      const at = (d: number) => factors(positions([0, 0, 0], [d, 0, 0]), [2, 2], 1)[0] as number;
      let previous = at(3);
      expect(previous).toBeCloseTo(0.5, 12);
      for (let d = 3; d <= 8; d += 0.01) {
        const f = at(d);
        expect(f).toBeGreaterThanOrEqual(previous);
        expect(f - previous).toBeLessThan(0.005);
        previous = f;
      }
      expect(previous).toBe(1);
    });

    it('con anillos: nada los atraviesa, y un cuerpo lejos de su plano no encoge por ellos', () => {
      // Un planeta de radio 2 con anillos hasta 2,3 radios (4,6 unidades) en el plano XY.
      const ring: RingReach = { index: 0, outer: 2.3, pole: vec3(0, 0, 1) };
      // En el plano de los anillos, a 7 unidades del centro: el disco (radio 1,5) los tocaría.
      const inPlane = factors(positions([0, 0, 0], [7, 0, 0]), [2, 1.5], 1, ring);
      const f = inPlane[0] as number;
      expect(inPlane[1]).toBe(f);
      expect(7 - 2.3 * 2 * f - 1.5 * f).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(f).toBeLessThan(1);
      // Encima del polo, a la misma distancia: solo cuentan los dos discos, y no se acercan.
      expect([...factors(positions([0, 0, 0], [0, 0, 7]), [2, 1.5], 1, ring)]).toEqual([1, 1]);
      // Muy cerca, el factor llega a 0 (el caso límite) sin dar valores negativos.
      expect([...factors(positions([0, 0, 0], [0.5, 0, 0]), [2, 1.5], 1, ring)]).toEqual([0, 0]);
      // El anillo también cuenta si el planeta que lo lleva es el segundo del par.
      const swapped = factors(positions([7, 0, 0], [0, 0, 0]), [1.5, 2], 1, { ...ring, index: 1 });
      expect(swapped[0]).toBeCloseTo(f, 9);
    });

    it('en la escala ilustrativa: el tamaño mínimo en pantalla (C3), solo en los planetas y sin cambiar las posiciones', () => {
      const camera = vec3(0, -1500, 600);
      const screen: OverviewScreen = { camera, focalPx: 800, minRadiusPx: 2 };
      const plain = placeBodies(illustrativeFrame(), input);
      const enlarged = placeBodies(illustrativeFrame(), { ...input, screen });
      expect([...enlarged.position.slice(0, 3 * 9)]).toEqual([...plain.position.slice(0, 3 * 9)]);
      for (const id of PLANET_IDS) {
        const k = ix(id);
        const depth = length(sub(pos(enlarged, id), camera));
        const radiusPx = ((enlarged.radius[k] as number) * screen.focalPx) / depth;
        expect(radiusPx, id).toBeGreaterThanOrEqual(2 - 1e-9);
        expect(enlarged.radius[k], id).toBeGreaterThanOrEqual(plain.radius[k] as number);
      }
      // El Sol no cambia.
      expect(enlarged.radius[ix('sol')]).toBe(plain.radius[ix('sol')]);
      // Las lunas siguen a su planeta: fuera de él, y su sistema crece con él.
      const earthToMoon = length(sub(pos(enlarged, 'luna'), pos(enlarged, 'tierra')));
      expect(earthToMoon).toBeGreaterThan(enlarged.radius[ix('tierra')] as number);
      // Los marcos físicos no lo usan.
      const physical = { kind: 'physical' as const, kmPerUnit: 1e6 };
      expect([...placeBodies(physical, { ...input, screen }).radius]).toEqual([
        ...placeBodies(physical, input).radius,
      ]);
    });

    it('en la escala ilustrativa, un sistema de lunas encoge con su planeta', () => {
      // Júpiter, al lado de Marte (un caso imposible, para forzar que encoja).
      const forced = Float64Array.from(input.heliocentric);
      const j = ix('jupiter');
      const m = ix('marte');
      for (let i = 0; i < 3; i++) forced[3 * j + i] = (forced[3 * m + i] as number) * 1.0001;
      const placed = placeBodies(illustrativeFrame(), { ...input, heliocentric: forced });
      const factor = (placed.radius[j] as number) / illustrativeRadius(radius('jupiter'));
      expect(factor).toBeLessThan(1);
      expect(placed.radius[m]).toBeLessThan(illustrativeRadius(radius('marte')));
      // Io, a la misma distancia relativa del planeta encogido, y encogida con él.
      const free = placeBodies(illustrativeFrame(), input);
      const offset = (p: Placement) => length(sub(pos(p, 'io'), pos(p, 'jupiter')));
      expect(offset(placed) / offset(free)).toBeCloseTo(factor, 9);
      expect((placed.radius[ix('io')] as number) / (free.radius[ix('io')] as number)).toBeCloseTo(
        factor,
        9,
      );
    });
  });
});
