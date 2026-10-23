import { BODY_DATA } from './body-data';
import { BODY_INDEX, PLANETS, findBody } from './body-index';
import type { BodyId } from './body.model';
import { SOURCES } from './sources';

/** Recorre un objeto y devuelve la ruta de cada número o booleano que no esté en un `Sourced`. */
function unsourced(value: unknown, path: string): string[] {
  if (value === null || typeof value !== 'object') return [path];
  const record = value as Record<string, unknown>;
  if ('value' in record) {
    const source = record['source'];
    const ok = typeof source === 'string' && source in SOURCES;
    return ok ? [] : [`${path} (fuente «${String(source)}»)`];
  }
  return Object.entries(record).flatMap(([key, child]) => unsourced(child, `${path}.${key}`));
}

describe('body-data: datos físicos y orbitales', () => {
  it('cubre los 30 cuerpos del índice', () => {
    expect(Object.keys(BODY_DATA).sort()).toEqual(BODY_INDEX.map((body) => body.id).sort());
  });

  it('no tiene ninguna cifra sin fuente, y todas las fuentes son URLs HTTPS de la NASA o del JPL', () => {
    expect(unsourced(BODY_DATA, 'BODY_DATA')).toEqual([]);
    for (const source of Object.values(SOURCES)) {
      expect(source.url).toMatch(/^https:\/\/(nssdc\.gsfc\.nasa\.gov|ssd\.jpl\.nasa\.gov)\//);
      expect(source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('da radio, masa y densidad positivos a todos, y órbita a todos menos al Sol', () => {
    for (const [id, data] of Object.entries(BODY_DATA)) {
      expect(data.physical.radiusKm.value).toBeGreaterThan(0);
      expect(data.physical.massKg.value).toBeGreaterThan(0);
      expect(data.physical.densityKgM3.value).toBeGreaterThan(0);
      if (id === 'sol') {
        expect(data.orbit).toBeUndefined();
      } else {
        expect(data.orbit?.periodDays.value).toBeGreaterThan(0);
        const e = data.orbit?.eccentricity.value ?? NaN;
        expect(e >= 0 && e < 1).toBe(true);
      }
    }
  });

  it('ordena los planetas por distancia al Sol y pone cada luna fuera de su planeta', () => {
    const distances = PLANETS.map((p) => BODY_DATA[p.id].orbit?.semiMajorAxisKm.value ?? NaN);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    for (const body of BODY_INDEX.filter((b) => b.kind === 'moon')) {
      const parent = findBody(body.parent ?? '')?.id as BodyId;
      const orbit = BODY_DATA[body.id].orbit?.semiMajorAxisKm.value ?? NaN;
      expect(orbit).toBeGreaterThan(BODY_DATA[parent].physical.radiusKm.value);
    }
  });

  it('marca los casos especiales que dan las fichas', () => {
    expect(BODY_DATA.venus.physical.rotationPeriodH?.value).toBeLessThan(0); // rotación retrógrada
    expect(BODY_DATA.urano.physical.rotationPeriodH?.value).toBeLessThan(0);
    expect(BODY_DATA.triton.orbit?.retrograde?.value).toBe(true);
    expect(BODY_DATA.saturno.physical.ringSystem?.value).toBe(true);
    expect(BODY_DATA.marte.physical.ringSystem?.value).toBe(false);
    expect(BODY_DATA.japeto.physical.geometricAlbedo?.note).toContain('0,5');
  });
});
