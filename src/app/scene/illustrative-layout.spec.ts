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

/**
 * La vista general con los radios de la fase 4b: de 1900 a 2100, cada 3 días, ningún disco toca el
 * Sol ni otro planeta, ninguna luna sale de su sistema (toca su planeta u otro cuerpo principal) y
 * Júpiter (ni ningún otro cuerpo principal) entra en los anillos de Saturno. Los momentos críticos son
 * las conjunciones de Júpiter y Saturno (cada ~20 años) y las de la Tierra con Venus y Marte.
 */
describe('vista general: radios ilustrativos sin solapes (fase 4b)', () => {
  it('de 1900 a 2100, ni discos ni lunas ni anillos se tocan', () => {
    const model = createSolarSystemModel(2);
    const frame = illustrativeFrame(DEFAULT_ILLUSTRATIVE_SCALE);
    const out = createPlacement(SCENE_BODIES.length);
    const primaries = SCENE_BODIES.filter((body) => body.kind !== 'moon').map((b) => b.index);
    const moons = SCENE_BODIES.filter((body) => body.kind === 'moon').map((b) => b.index);
    const saturn = sceneBody('saturno').index;
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
    const start = Date.UTC(1900, 0, 1);
    const end = Date.UTC(2100, 11, 31);
    for (let timeMs = start; timeMs <= end; timeMs += 3 * 86_400_000) {
      const state = model.at(timeMs);
      placeBodies(
        frame,
        {
          heliocentric: state.heliocentric,
          parentOffset: state.parentOffset,
          parentIndex: state.layout.parentIndex,
          radiusKm: RADII_KM,
        },
        out,
      );
      const p = out.position;
      const r = (k: number) => out.radius[k] as number;
      const delta = (a: number, b: number) =>
        [0, 1, 2].map((i) => (p[3 * a + i] as number) - (p[3 * b + i] as number));
      const gap = (a: number, b: number) => Math.hypot(...delta(a, b)) - r(a) - r(b);
      for (let i = 0; i < primaries.length; i++) {
        for (let j = i + 1; j < primaries.length; j++) {
          note('discos', gap(primaries[i] as number, primaries[j] as number), timeMs);
        }
      }
      for (const moon of moons) {
        const parent = state.layout.parentIndex[moon] as number;
        note('luna y su planeta', gap(moon, parent), timeMs);
        for (const other of primaries) {
          if (other !== parent) note('luna y otro cuerpo', gap(moon, other), timeMs);
        }
      }
      // Los anillos: un anillo plano en el ecuador de Saturno. Una esfera de radio R a una altura h
      // del plano lo corta si h < R y su corte (un círculo de radio √(R² − h²)) llega al anillo.
      const pole = northPoleEcl('saturno', new Date(timeMs));
      for (const other of primaries) {
        if (other === saturn) continue;
        const [x, y, z] = delta(other, saturn) as [number, number, number];
        const along = x * pole.x + y * pole.y + z * pole.z;
        const inPlane = Math.hypot(x - along * pole.x, y - along * pole.y, z - along * pole.z);
        const R = r(other);
        const reach = Math.sqrt(Math.max(R * R - along * along, 0));
        note(
          'anillos de Saturno',
          Math.max(
            Math.abs(along) - R,
            inPlane - reach - ringOuter * r(saturn),
            ringInner * r(saturn) - (inPlane + reach),
          ),
          timeMs,
        );
      }
    }
    const summary = [...worst.entries()]
      .map(([key, { margin, date }]) => `${key}: ${margin.toFixed(2)} (${date})`)
      .join('; ');
    // Los discos, con al menos una unidad de aire (unos 2 px en la vista general de escritorio).
    expect(worst.get('discos')?.margin, summary).toBeGreaterThan(1);
    expect(worst.get('luna y su planeta')?.margin, summary).toBeGreaterThan(0);
    expect(worst.get('luna y otro cuerpo')?.margin, summary).toBeGreaterThan(0);
    expect(worst.get('anillos de Saturno')?.margin, summary).toBeGreaterThan(0);
  }, 120_000);

  it('Júpiter, mayor que antes; el Sol, el mayor; los rocosos, discos de varias unidades', () => {
    const radius = (id: Parameters<typeof sceneBody>[0]) =>
      illustrativeRadius(sceneBody(id).radiusKm);
    // Antes de la fase 4b, Júpiter medía 5,25 unidades, la Tierra 2,0 y Mercurio 1,4.
    expect(radius('jupiter')).toBeGreaterThan(7.5);
    expect(radius('tierra')).toBeGreaterThan(2.8);
    expect(radius('mercurio')).toBeGreaterThan(1.9);
    expect(radius('sol')).toBeGreaterThan(radius('jupiter') * 1.5);
  });
});
