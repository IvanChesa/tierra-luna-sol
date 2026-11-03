import { Constellation } from 'astronomy-engine';
import constellationFile from '../../../public/data/constellations.json';
import spanishFile from '../../../scripts/content/constellations-es.json';
import {
  CONSTELLATIONS_SOURCE,
  CONSTELLATION_NAMES,
  CONSTELLATION_NAMES_ES,
  CONSTELLATION_NAMES_ES_SOURCE,
} from './constellations';

interface ConstellationFile {
  readonly generated: string;
  readonly constellations: readonly {
    readonly id: string;
    readonly name: string;
    readonly es: string;
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

  it('los nombres en español (D38): los 88, con la fuente del IGN y las mayúsculas de la RAE', () => {
    expect(Object.keys(CONSTELLATION_NAMES_ES).sort()).toEqual(
      Object.keys(CONSTELLATION_NAMES).sort(),
    );
    expect(CONSTELLATION_NAMES_ES['UMa']).toBe('Osa Mayor');
    expect(CONSTELLATION_NAMES_ES['Gem']).toBe('Géminis');
    expect(CONSTELLATION_NAMES_ES['Ori']).toBe('Orión');
    expect(CONSTELLATION_NAMES_ES['Cru']).toBe('Cruz del Sur');
    expect(CONSTELLATION_NAMES_ES['Aql']).toBe('Águila');
    expect(CONSTELLATION_NAMES_ES_SOURCE).toMatch(/Instituto Geográfico Nacional/);
    expect(CONSTELLATION_NAMES_ES_SOURCE).toMatch(/^Anuario del Real Observatorio de Madrid/);
    for (const [id, name] of Object.entries(CONSTELLATION_NAMES_ES)) {
      // Mayúscula en cada palabra con significado (Ortografía de la RAE): «Cabellera de Berenice».
      for (const word of name.split(' ')) {
        if (['de', 'del'].includes(word)) continue;
        expect(word.charAt(0), `${id}: «${name}»`).toBe(word.charAt(0).toLocaleUpperCase('es'));
      }
    }
  });

  it('cada nombre español que no es el de la tabla del IGN dice por qué (lo comprueba el script con los PDF)', () => {
    const reasons = new Set(['zodiaco', 'tilde', 'mayúsculas', 'forma corta']);
    expect(spanishFile.constellations).toHaveLength(88);
    for (const c of spanishFile.constellations as readonly {
      id: string;
      table: string;
      es: string;
      reason?: string;
      usage?: string[];
    }[]) {
      expect(CONSTELLATION_NAMES_ES[c.id], c.id).toBe(c.es);
      if (c.es === c.table) {
        expect(c.reason, c.id).toBeUndefined();
        continue;
      }
      expect(reasons.has(c.reason ?? ''), c.id).toBe(true);
      // En el zodiaco, el uso del Anuario que respalda el nombre (las «Constelaciones recorridas»).
      if (c.reason === 'zodiaco') {
        expect(c.usage?.length, c.id).toBeGreaterThan(0);
        for (const usage of c.usage ?? []) {
          expect((spanishFile.usages as Record<string, unknown>)[usage], c.id).toBeDefined();
        }
      }
    }
  });

  it('el fichero de las líneas: generado, 89 partes (la Serpiente en dos) y líneas válidas', () => {
    expect(file.generated).toMatch(/^GENERADO por scripts\/build-constellations\.mjs/);
    expect(file.constellations).toHaveLength(89);
    expect(file.constellations.filter((c) => c.id === 'Ser')).toHaveLength(2);
    for (const c of file.constellations) {
      expect(CONSTELLATION_NAMES[c.id], c.id).toBe(c.name);
      expect(CONSTELLATION_NAMES_ES[c.id], c.id).toBe(c.es);
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
