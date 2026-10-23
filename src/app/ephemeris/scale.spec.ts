import { KM_PER_AU } from './constants';
import { planetHeliocentric } from './ephemeris';
import { PLANET_IDS } from './ids';
import {
  DEFAULT_ILLUSTRATIVE_SCALE,
  blendMagnitude,
  blendPosition,
  illustrativeDistance,
  illustrativeDistanceToAu,
  illustrativeMoonOffset,
  illustrativePosition,
  illustrativeRadius,
  realPosition,
  realRadius,
} from './scale';
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

  it('separa las lunas de su planeta sin meterlas dentro y en orden de distancia', () => {
    const earthRadiusKm = 6371;
    const visible = illustrativeRadius(earthRadiusKm);
    const near = illustrativeMoonOffset(vec3(9378 / KM_PER_AU, 0, 0), earthRadiusKm, visible);
    const far = illustrativeMoonOffset(vec3(384_400 / KM_PER_AU, 0, 0), earthRadiusKm, visible);
    expect(length(near)).toBeGreaterThan(visible);
    expect(length(far)).toBeGreaterThan(length(near));
    const tilted = illustrativeMoonOffset(vec3(0.001, 0.002, -0.0005), earthRadiusKm, visible);
    expect(angleBetweenDeg(tilted, vec3(0.001, 0.002, -0.0005))).toBeLessThan(1e-9);
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
