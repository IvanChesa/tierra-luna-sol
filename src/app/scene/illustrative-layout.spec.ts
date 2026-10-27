import { BODY_DATA } from '../data/body-data';
import { northPoleEcl } from '../ephemeris/orientation';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  createPlacement,
  illustrativeFrame,
  illustrativeRadius,
  placeBodies,
} from '../ephemeris/scale';
import { RADII_KM, SCENE_BODIES, createSolarSystemModel, sceneBody } from './system';

/** Distancia de Júpiter a Saturno (unidades) por debajo de la cual sus sistemas pueden tocarse. */
const CONJUNCTION_UNITS = 32;

/**
 * La vista general con los radios de la fase 4b, de 1900 a 2100, cada 3 días:
 * - ningún disco toca el Sol ni otro planeta, ni los anillos de Saturno, con 1 unidad de aire;
 * - ninguna luna toca su planeta, ni otro planeta, ni el Sol;
 * - las lunas de un planeta solo tocan los anillos de Saturno o las lunas de otro sistema en las
 *   conjunciones de Júpiter y Saturno (cada ~20 años), y poco. Entonces no se dibujan en la vista
 *   general: sus sistemas miden unos píxeles y no se distinguen (`moonPresence`). Solo se verían
 *   ampliando la vista general sin enfocar ningún planeta, en esas fechas.
 */
describe('vista general: radios ilustrativos sin solapes (fase 4b)', () => {
  it('de 1900 a 2100, ni discos ni lunas ni anillos se tocan (salvo lunas en las conjunciones)', () => {
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
    // El peor margen (unidades de escena) de cada comprobación, con su fecha.
    const worst = new Map<string, { margin: number; date: string }>();
    const note = (key: string, margin: number, timeMs: number) => {
      const current = worst.get(key);
      if (!current || margin < current.margin)
        worst.set(key, { margin, date: new Date(timeMs).toISOString().slice(0, 10) });
    };
    // Solapes de lunas fuera de las conjunciones de Júpiter y Saturno (tiene que quedar vacío).
    const outsideConjunctions: string[] = [];
    const start = Date.UTC(1900, 0, 1);
    const end = Date.UTC(2100, 11, 31);
    for (let timeMs = start; timeMs <= end; timeMs += 3 * 86_400_000) {
      const state = model.at(timeMs);
      const parent = state.layout.parentIndex;
      placeBodies(
        frame,
        {
          heliocentric: state.heliocentric,
          parentOffset: state.parentOffset,
          parentIndex: parent,
          radiusKm: RADII_KM,
        },
        out,
      );
      const p = out.position;
      const r = (k: number) => out.radius[k] as number;
      const delta = (a: number, b: number) =>
        [0, 1, 2].map((i) => (p[3 * a + i] as number) - (p[3 * b + i] as number));
      const gap = (a: number, b: number) => Math.hypot(...delta(a, b)) - r(a) - r(b);
      const conjunction = Math.hypot(...delta(jupiter, saturn)) < CONJUNCTION_UNITS;
      const moonOverlap = (what: string, margin: number) => {
        note(what, margin, timeMs);
        if (margin < 0 && !conjunction) {
          outsideConjunctions.push(`${what} ${new Date(timeMs).toISOString().slice(0, 10)}`);
        }
      };
      for (let i = 0; i < primaries.length; i++) {
        for (let j = i + 1; j < primaries.length; j++) {
          note('discos', gap(primaries[i] as number, primaries[j] as number), timeMs);
        }
      }
      for (const moon of moons) {
        note('luna y su planeta', gap(moon, parent[moon] as number), timeMs);
        for (const other of primaries) {
          if (other !== parent[moon]) note('luna y otro cuerpo', gap(moon, other), timeMs);
        }
        for (const other of moons) {
          if (other > moon && parent[other] !== parent[moon]) {
            moonOverlap('lunas de sistemas distintos', gap(moon, other));
          }
        }
      }
      // Los anillos: un anillo plano en el ecuador de Saturno. Una esfera de radio R a una altura h
      // del plano lo corta si h < R y su corte (un círculo de radio √(R² − h²)) llega al anillo.
      const pole = northPoleEcl('saturno', new Date(timeMs));
      for (const body of SCENE_BODIES) {
        const k = body.index;
        if (k === saturn || parent[k] === saturn) continue;
        const [x, y, z] = delta(k, saturn) as [number, number, number];
        const along = x * pole.x + y * pole.y + z * pole.z;
        const inPlane = Math.hypot(x - along * pole.x, y - along * pole.y, z - along * pole.z);
        const R = r(k);
        const reach = Math.sqrt(Math.max(R * R - along * along, 0));
        const margin = Math.max(
          Math.abs(along) - R,
          inPlane - reach - ringOuter * r(saturn),
          ringInner * r(saturn) - (inPlane + reach),
        );
        if (body.kind === 'moon') moonOverlap('lunas en los anillos de Saturno', margin);
        else note('anillos de Saturno', margin, timeMs);
      }
    }
    const summary = [...worst.entries()]
      .map(([key, { margin, date }]) => `${key}: ${margin.toFixed(2)} (${date})`)
      .join('; ');
    // Los discos y los anillos, con al menos una unidad de aire (unos 2 px en la vista general).
    expect(worst.get('discos')?.margin, summary).toBeGreaterThan(1);
    expect(worst.get('anillos de Saturno')?.margin, summary).toBeGreaterThan(1);
    expect(worst.get('luna y su planeta')?.margin, summary).toBeGreaterThan(0);
    expect(worst.get('luna y otro cuerpo')?.margin, summary).toBeGreaterThan(0);
    // Las lunas de sistemas distintos y los anillos: solo en las conjunciones, y poco.
    expect(outsideConjunctions, summary).toEqual([]);
    expect(worst.get('lunas en los anillos de Saturno')?.margin, summary).toBeGreaterThan(-2.5);
    expect(worst.get('lunas de sistemas distintos')?.margin, summary).toBeGreaterThan(-2.5);
  }, 120_000);

  it('Júpiter, mayor que antes; el Sol, el mayor; los rocosos, discos de varias unidades', () => {
    const radius = (id: Parameters<typeof sceneBody>[0]) =>
      illustrativeRadius(sceneBody(id).radiusKm);
    // Antes de la fase 4b, Júpiter medía 5,25 unidades, la Tierra 2,0 y Mercurio 1,4.
    expect(radius('jupiter')).toBeGreaterThan(7.2);
    expect(radius('tierra')).toBeGreaterThan(2.7);
    expect(radius('mercurio')).toBeGreaterThan(1.85);
    expect(radius('sol')).toBeGreaterThan(radius('jupiter') * 1.5);
  });
});
