import starsBin from '../../../public/data/stars.bin' with { loader: 'binary' };
import { eqjToEcl } from './coordinates';
import reference from './fixtures/hyg-reference-stars.json';
import { decodeStarCatalog, starDirectionsEcl } from './stars';
import { angleBetweenDeg, length, vec3 } from './vec3';

const catalog = decodeStarCatalog(starsBin);

/** Diferencia angular de ascensión recta en (−180, 180]. */
const raDelta = (a: number, b: number) => ((a - b + 540) % 360) - 180;

describe('stars: integridad de public/data/stars.bin', () => {
  it(`tiene las ${reference.count} estrellas de HYG v4.1 con magnitud ≤ ${String(reference.maxMagnitude).replace('.', ',')} y pesa menos de 250 kB`, () => {
    expect(catalog.count).toBe(reference.count);
    expect(starsBin.byteLength).toBe(16 + 8 * reference.count);
    expect(starsBin.byteLength).toBeLessThan(250_000);
  });

  it('va de la estrella más brillante a la más débil, sin pasar de la magnitud 6,5', () => {
    for (let k = 1; k < catalog.count; k++) {
      expect(catalog.magnitude[k] ?? NaN).toBeGreaterThanOrEqual(catalog.magnitude[k - 1] ?? NaN);
    }
    expect(catalog.magnitude[catalog.count - 1]).toBeLessThanOrEqual(reference.maxMagnitude);
    expect(catalog.magnitude[0]).toBeCloseTo(-1.44, 2); // Sirio
  });

  it('tiene todas las coordenadas en rango y los colores conocidos en un intervalo físico', () => {
    let withoutColor = 0;
    for (let k = 0; k < catalog.count; k++) {
      const ra = catalog.raDeg[k] ?? NaN;
      const dec = catalog.decDeg[k] ?? NaN;
      expect(ra >= 0 && ra < 360).toBe(true);
      expect(Math.abs(dec)).toBeLessThanOrEqual(90);
      const color = catalog.colorIndex[k] ?? NaN;
      if (Number.isNaN(color)) withoutColor++;
      else expect(color > -0.5 && color < 3.5).toBe(true);
    }
    expect(withoutColor).toBe(reference.withoutColor);
  });

  it.each(reference.stars.map((star) => [star.proper, star]))(
    'contiene %s con su posición, magnitud y color de HYG (dentro de la cuantización)',
    (_name, star) => {
      let found = -1;
      for (let k = 0; k < catalog.count && found < 0; k++) {
        const close =
          Math.abs(raDelta(catalog.raDeg[k] ?? NaN, star.raDeg)) < 0.006 &&
          Math.abs((catalog.decDeg[k] ?? NaN) - star.decDeg) < 0.003;
        if (close) found = k;
      }
      expect(found).toBeGreaterThanOrEqual(0);
      expect(catalog.magnitude[found]).toBeCloseTo(star.mag, 2);
      expect(Math.abs((catalog.colorIndex[found] ?? NaN) - (star.ci ?? NaN))).toBeLessThan(0.001);
    },
  );
});

describe('stars: direcciones', () => {
  it('son unitarias y la Polar queda a menos de 0,75° del polo celeste norte', () => {
    const directions = starDirectionsEcl(catalog);
    expect(directions).toHaveLength(3 * catalog.count);
    const polaris = reference.stars.find((star) => star.proper === 'Polaris');
    let best = Infinity;
    for (let k = 0; k < catalog.count; k++) {
      const v = vec3(
        directions[3 * k] ?? NaN,
        directions[3 * k + 1] ?? NaN,
        directions[3 * k + 2] ?? NaN,
      );
      expect(length(v)).toBeCloseTo(1, 6);
      if (Math.abs((catalog.magnitude[k] ?? NaN) - (polaris?.mag ?? NaN)) < 0.005) {
        best = Math.min(best, angleBetweenDeg(v, eqjToEcl(vec3(0, 0, 1))));
      }
    }
    expect(best).toBeLessThan(0.75);
  });
});

describe('stars: ficheros corruptos', () => {
  it('rechaza una cabecera ajena, una versión desconocida o un tamaño que no cuadra', () => {
    const copy = () => new Uint8Array(starsBin);
    const wrongMagic = copy();
    wrongMagic[0] = 0x58;
    expect(() => decodeStarCatalog(wrongMagic)).toThrow();
    const wrongVersion = copy();
    wrongVersion[4] = 9;
    expect(() => decodeStarCatalog(wrongVersion)).toThrow();
    expect(() => decodeStarCatalog(starsBin.subarray(0, starsBin.byteLength - 1))).toThrow();
    expect(() => decodeStarCatalog(new Uint8Array(4))).toThrow();
    expect(decodeStarCatalog(copy().buffer).count).toBe(reference.count);
  });
});
