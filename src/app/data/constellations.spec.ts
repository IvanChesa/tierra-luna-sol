import { Constellation } from 'astronomy-engine';
import constellationFile from '../../../public/data/constellations.json';
import { CONSTELLATIONS_SOURCE, CONSTELLATION_NAMES } from './constellations';

interface ConstellationFile {
  readonly generated: string;
  readonly constellations: readonly {
    readonly id: string;
    readonly name: string;
    readonly label: readonly [number, number];
    readonly lines: readonly (readonly number[])[];
  }[];
}

const file = constellationFile as unknown as ConstellationFile;

describe('constellations', () => {
  it('las 88 de la IAU, con su nombre oficial', () => {
    expect(Object.keys(CONSTELLATION_NAMES)).toHaveLength(88);
    expect(CONSTELLATION_NAMES['Gem']).toBe('Gemini');
    expect(CONSTELLATION_NAMES['Ori']).toBe('Orion');
    expect(CONSTELLATION_NAMES['UMa']).toBe('Ursa Major');
    expect(CONSTELLATION_NAMES['Boo']).toBe('Boötes');
    expect(CONSTELLATION_NAMES['CrA']).toBe('Corona Australis');
    expect(CONSTELLATIONS_SOURCE).toMatch(
      /^d3-celestial \(Olaf Frohn\), commit [0-9a-f]{40}, https:/,
    );
  });

  it('cualquier punto del cielo cae en una constelación con nombre (los símbolos de astronomy-engine)', () => {
    for (let ra = 0; ra < 24; ra += 0.5) {
      for (let dec = -88; dec <= 88; dec += 8) {
        const { symbol } = Constellation(ra, dec);
        expect(CONSTELLATION_NAMES[symbol], `${ra} h, ${dec}°`).toBeDefined();
      }
    }
  });

  it('el fichero de las líneas: generado, 89 partes (la Serpiente en dos) y líneas válidas', () => {
    expect(file.generated).toMatch(/^GENERADO por scripts\/build-constellations\.mjs/);
    expect(file.constellations).toHaveLength(89);
    expect(file.constellations.filter((c) => c.id === 'Ser')).toHaveLength(2);
    for (const c of file.constellations) {
      expect(CONSTELLATION_NAMES[c.id], c.id).toBe(c.name);
      // El nombre, dentro de su constelación (J2000).
      const [ra, dec] = c.label;
      expect(Constellation((((ra % 360) + 360) % 360) / 15, dec).symbol, c.id).toBe(c.id);
      for (const polyline of c.lines) {
        expect(polyline.length % 2, c.id).toBe(0);
        expect(polyline.length, c.id).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
