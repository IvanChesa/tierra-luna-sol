import { BODY_DATA } from '../data/body-data';
import { northPoleEcl } from '../ephemeris/orientation';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  OverviewScreen,
  createPlacement,
  illustrativeFrame,
  illustrativeRadius,
  placeBodies,
} from '../ephemeris/scale';
import { length, scale, sub, vec3 } from '../ephemeris/vec3';
import { MOON_SYSTEMS, RADII_KM, SCENE_BODIES, createSolarSystemModel, sceneBody } from './system';

/** Distancia de Júpiter a Saturno (unidades) por debajo de la cual se cuentan sus conjunciones. */
const CONJUNCTION_UNITS = 40;

/**
 * La cámara de la vista general en un móvil de 390 px en vertical (C3), algo más pesimista que la
 * real: a 1600 unidades del Sol, con la vista oblicua del motor (azimut −0,55 y elevación 0,42 rad),
 * y 0,5 px por unidad a la distancia del Sol (en la fase 4b se midieron 0,62 en Júpiter). Con 2 px de
 * radio mínimo, los rocosos miden al menos 4 unidades: más que con la cámara real.
 */
const MOBILE: OverviewScreen = (() => {
  const azimuth = -0.55;
  const elevation = 0.42;
  const distance = 1600;
  // Ejes de three (x, y, z) → ECL (x, −z, y).
  const camera = vec3(
    distance * Math.cos(elevation) * Math.sin(azimuth),
    -distance * Math.cos(elevation) * Math.cos(azimuth),
    distance * Math.sin(elevation),
  );
  return { camera, focalPx: 0.5 * distance, minRadiusPx: 2 };
})();

interface Sweep {
  /** El peor margen (unidades de escena) de cada comprobación, con su fecha. */
  readonly worst: Map<string, { margin: number; date: string }>;
  /** Por cuerpo: en cuántas muestras encoge (C2) y su menor factor. */
  readonly shrunk: Map<string, { samples: number; min: number }>;
  /** Por planeta: en cuántas muestras se comprime su sistema de lunas (fase 9b) y la menor compresión. */
  readonly compressed: Map<string, { samples: number; min: number; inConjunction: number }>;
  /** Muestras en las que algún planeta mide menos de su mínimo en pantalla (C3; tiene que ser 0). */
  readonly belowMinimum: number;
  /** Lunas que no se dibujan (radio 0: su sistema, comprimido del todo), en muestras. */
  readonly hiddenMoons: number;
  readonly samples: number;
  readonly summary: string;
}

/**
 * La vista general de 1900 a 2100, cada 3 días, con los tamaños efectivos (C2, la compresión de los
 * sistemas de lunas de la fase 9b y, con `screen`, C3):
 * - los discos, entre sí y con los anillos de Saturno, con su margen;
 * - ninguna luna (de las que se dibujan: radio mayor que 0) toca su planeta, otro cuerpo, otra luna
 *   de su sistema o de otro, ni los anillos de Saturno (D39), también en las conjunciones de Júpiter
 *   y Saturno.
 */
function sweep(screen: OverviewScreen | null): Sweep {
  const model = createSolarSystemModel(2);
  const frame = illustrativeFrame(DEFAULT_ILLUSTRATIVE_SCALE);
  const out = createPlacement(SCENE_BODIES.length);
  const primaries = SCENE_BODIES.filter((body) => body.kind !== 'moon').map((b) => b.index);
  const moons = SCENE_BODIES.filter((body) => body.kind === 'moon').map((b) => b.index);
  const saturn = sceneBody('saturno').index;
  const jupiter = sceneBody('jupiter').index;
  const rings = BODY_DATA.saturno.rings;
  expect(rings).toBeDefined();
  const ringInner = (rings?.innerRadiusKm.value ?? 0) / (RADII_KM[saturn] as number);
  const ringOuter = (rings?.outerRadiusKm.value ?? 0) / (RADII_KM[saturn] as number);
  const worst = new Map<string, { margin: number; date: string }>();
  const note = (key: string, margin: number, timeMs: number) => {
    const current = worst.get(key);
    if (!current || margin < current.margin)
      worst.set(key, { margin, date: new Date(timeMs).toISOString().slice(0, 10) });
  };
  const shrunk = new Map<string, { samples: number; min: number }>();
  const compressed = new Map<string, { samples: number; min: number; inConjunction: number }>();
  let belowMinimum = 0;
  let hiddenMoons = 0;
  let samples = 0;
  const start = Date.UTC(1900, 0, 1);
  const end = Date.UTC(2100, 11, 31);
  for (let timeMs = start; timeMs <= end; timeMs += 3 * 86_400_000) {
    samples++;
    const state = model.at(timeMs);
    const parent = state.layout.parentIndex;
    const pole = northPoleEcl('saturno', new Date(timeMs));
    placeBodies(
      frame,
      {
        heliocentric: state.heliocentric,
        parentOffset: state.parentOffset,
        parentIndex: parent,
        radiusKm: RADII_KM,
        rings: { index: saturn, outer: ringOuter, pole },
        screen,
        moons: MOON_SYSTEMS,
      },
      out,
    );
    const p = out.position;
    const r = (k: number) => out.radius[k] as number;
    const position = (k: number) =>
      vec3(p[3 * k] as number, p[3 * k + 1] as number, p[3 * k + 2] as number);
    const gap = (a: number, b: number) => length(sub(position(a), position(b))) - r(a) - r(b);
    const conjunction = length(sub(position(jupiter), position(saturn))) < CONJUNCTION_UNITS;
    // Cuánto ha encogido cada planeta: su radio frente al que tendría sin vecinos (con el mínimo de C3).
    for (const k of primaries) {
      const body = SCENE_BODIES[k];
      if (!body) continue;
      let desired = illustrativeRadius(body.radiusKm);
      if (screen && body.kind === 'planet') {
        const depth = length(sub(position(k), screen.camera));
        desired = Math.max(desired, (screen.minRadiusPx * depth) / screen.focalPx);
        if ((r(k) * screen.focalPx) / depth < screen.minRadiusPx - 1e-9) belowMinimum++;
      }
      const factor = r(k) / desired;
      if (factor < 1 - 1e-9) {
        const entry = shrunk.get(body.id) ?? { samples: 0, min: 1 };
        shrunk.set(body.id, { samples: entry.samples + 1, min: Math.min(entry.min, factor) });
      }
      const c = out.compression[k] as number;
      if (c < 1 - 1e-9) {
        const entry = compressed.get(body.id) ?? { samples: 0, min: 1, inConjunction: 0 };
        compressed.set(body.id, {
          samples: entry.samples + 1,
          min: Math.min(entry.min, c),
          inConjunction: entry.inConjunction + (conjunction ? 1 : 0),
        });
      }
    }
    for (let i = 0; i < primaries.length; i++) {
      for (let j = i + 1; j < primaries.length; j++) {
        note('discos', gap(primaries[i] as number, primaries[j] as number), timeMs);
      }
    }
    const drawn = moons.filter((moon) => r(moon) > 0);
    hiddenMoons += moons.length - drawn.length;
    for (const moon of drawn) {
      note('luna y su planeta', gap(moon, parent[moon] as number), timeMs);
      for (const other of primaries) {
        if (other !== parent[moon]) note('luna y otro cuerpo', gap(moon, other), timeMs);
      }
      for (const other of drawn) {
        if (other <= moon) continue;
        note(
          parent[other] === parent[moon]
            ? 'lunas del mismo sistema'
            : 'lunas de sistemas distintos',
          gap(moon, other),
          timeMs,
        );
      }
    }
    // Los anillos: un anillo plano en el ecuador de Saturno. Una esfera de radio R a una altura h
    // del plano lo corta si h < R y su corte (un círculo de radio √(R² − h²)) llega al anillo. También
    // las lunas de Saturno (fase 9b: antes caían dentro).
    for (const body of SCENE_BODIES) {
      const k = body.index;
      if (k === saturn || (body.kind === 'moon' && r(k) === 0)) continue;
      const v = sub(position(k), position(saturn));
      const along = v.x * pole.x + v.y * pole.y + v.z * pole.z;
      const inPlane = Math.hypot(v.x - along * pole.x, v.y - along * pole.y, v.z - along * pole.z);
      const R = r(k);
      const reach = Math.sqrt(Math.max(R * R - along * along, 0));
      const margin = Math.max(
        Math.abs(along) - R,
        inPlane - reach - ringOuter * r(saturn),
        ringInner * r(saturn) - (inPlane + reach),
      );
      note(
        body.kind === 'moon' ? 'lunas y anillos de Saturno' : 'anillos de Saturno',
        margin,
        timeMs,
      );
    }
  }
  const summary = [
    ...[...worst.entries()].map(
      ([key, { margin, date }]) => `${key}: ${margin.toFixed(2)} (${date})`,
    ),
    ...[...shrunk.entries()].map(
      ([id, { samples: n, min }]) =>
        `${id} encoge en ${((100 * n) / samples).toFixed(1)} % de las muestras (hasta ×${min.toFixed(2)})`,
    ),
    ...[...compressed.entries()].map(
      ([id, { samples: n, min, inConjunction }]) =>
        `el sistema de ${id} se comprime en ${((100 * n) / samples).toFixed(1)} % (hasta ×${min.toFixed(2)}; ${((100 * inConjunction) / Math.max(n, 1)).toFixed(0)} % en las conjunciones de Júpiter y Saturno)`,
    ),
    `lunas sin dibujar: ${((100 * hiddenMoons) / (samples * moons.length)).toFixed(2)} %`,
  ].join('; ');
  return { worst, shrunk, compressed, belowMinimum, hiddenMoons, samples, summary };
}

/**
 * Lo que se comprueba en las dos vistas: los discos y los anillos, con su margen, y solo encogen
 * Júpiter y Saturno, en sus conjunciones (D35, sin cambios); y ninguna luna toca nada (D39).
 */
function expectNoOverlaps({ worst, shrunk, belowMinimum, samples, summary }: Sweep): void {
  expect(belowMinimum, summary).toBe(0);
  // Los discos y los anillos, con al menos una unidad de aire (unos 2 px en la vista general).
  expect(worst.get('discos')?.margin, summary).toBeGreaterThan(1);
  expect(worst.get('anillos de Saturno')?.margin, summary).toBeGreaterThan(1);
  // Solo encogen Júpiter y Saturno, en sus conjunciones: poco tiempo (a 3 días/s, decenas de
  // segundos cada vez) y como mucho una cuarta parte.
  expect([...shrunk.keys()].sort(), summary).toEqual(['jupiter', 'saturno']);
  for (const { samples: n, min } of shrunk.values()) {
    expect(n / samples, summary).toBeLessThan(0.05);
    expect(min, summary).toBeGreaterThan(0.75);
  }
  // Las lunas, nunca dentro de nada (D39): ni de su planeta, ni de otro cuerpo, ni de otra luna (de su
  // sistema o de otro), ni de los anillos.
  for (const key of [
    'luna y su planeta',
    'luna y otro cuerpo',
    'lunas del mismo sistema',
    'lunas de sistemas distintos',
    'lunas y anillos de Saturno',
  ]) {
    expect(worst.get(key)?.margin, `${key}. ${summary}`).toBeGreaterThan(0);
  }
}

describe('vista general: radios ilustrativos sin solapes (fase 4b; revisión del bloque C, C2 y C3; fase 9b, D39)', () => {
  it('de 1900 a 2100, en escritorio, ni discos ni lunas ni anillos se tocan, tampoco en las conjunciones', () => {
    const result = sweep(null);
    console.log(`[vista general, escritorio] ${result.summary}`);
    expectNoOverlaps(result);
    // Las lunas casi siempre se ven: solo desaparecen en las conjunciones más cerradas.
    expect(result.hiddenMoons / (result.samples * 21), result.summary).toBeLessThan(0.01);
  }, 180_000);

  it('en un móvil de 390 px (C3), con el tamaño mínimo en pantalla, tampoco', () => {
    const result = sweep(MOBILE);
    console.log(`[vista general, móvil] ${result.summary}`);
    expectNoOverlaps(result);
  }, 180_000);

  it('en el móvil, con la cámara 4 veces más lejos, el mínimo no se deshace: los discos de 4 px de los planetas interiores pueden tocarse', () => {
    const far: OverviewScreen = { ...MOBILE, camera: scale(MOBILE.camera, 4) };
    const result = sweep(far);
    console.log(`[vista general, móvil alejada] ${result.summary}`);
    expect(result.belowMinimum, result.summary).toBe(0);
    // Ahí todos los planetas miden su mínimo (Júpiter, 16 unidades frente a 9 propias), y los de
    // dentro, a unos píxeles unos de otros, se tocan: es lo que se acepta al alejarse tanto (D35).
    expect(result.worst.get('discos')?.margin ?? 0, result.summary).toBeLessThan(0);
    // Las lunas, en cambio, no: sus sistemas se comprimen (o desaparecen) antes de tocar nada.
    expect(result.worst.get('lunas de sistemas distintos')?.margin, result.summary).toBeGreaterThan(
      0,
    );
    expect(result.worst.get('luna y otro cuerpo')?.margin, result.summary).toBeGreaterThan(0);
  }, 180_000);

  it('Júpiter, un 25 % mayor que en la fase 4b; el Sol, el mayor; los rocosos, discos de varias unidades', () => {
    const radius = (id: Parameters<typeof sceneBody>[0]) =>
      illustrativeRadius(sceneBody(id).radiusKm);
    // En la fase 4b, Júpiter medía 7,3 unidades, la Tierra 2,8 y Mercurio 1,9.
    expect(radius('jupiter')).toBeGreaterThan(9);
    expect(radius('tierra')).toBeGreaterThan(3.4);
    expect(radius('mercurio')).toBeGreaterThan(2.3);
    expect(radius('sol')).toBeGreaterThan(radius('jupiter') * 1.4);
  });

  it('los sistemas del catálogo (D39): Ganímedes, del 10 al 15 % de Júpiter; la Luna, del 35 al 45 % de la Tierra; las de Saturno, fuera de los anillos', () => {
    const size = (id: Parameters<typeof sceneBody>[0]) =>
      MOON_SYSTEMS.size[sceneBody(id).index] as number;
    expect(size('ganimedes')).toBeGreaterThan(0.1);
    expect(size('ganimedes')).toBeLessThan(0.15);
    expect(size('luna')).toBeGreaterThan(0.35);
    expect(size('luna')).toBeLessThan(0.45);
    const saturn = sceneBody('saturno').index;
    const ringOuter =
      (BODY_DATA.saturno.rings?.outerRadiusKm.value ?? 0) / sceneBody('saturno').radiusKm;
    expect(MOON_SYSTEMS.core[saturn]).toBeCloseTo(ringOuter, 12);
    console.log(
      `[sistemas de lunas] ${SCENE_BODIES.filter(
        (b) => b.kind === 'planet' && (MOON_SYSTEMS.reach[b.index] as number) > 1,
      )
        .map((b) => `${b.id} llega a ${(MOON_SYSTEMS.reach[b.index] as number).toFixed(2)} radios`)
        .join('; ')}`,
    );
  });
});
