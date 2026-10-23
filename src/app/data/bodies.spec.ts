import { BODY_INDEX } from './body-index';
import { BODY_TEXTS } from './body-texts';
import type { BodyId, SourcedText } from './body.model';
import { BODIES, getBody } from './bodies';

const texts = (id: BodyId): SourcedText[] => [BODY_TEXTS[id].summary, ...BODY_TEXTS[id].facts];

describe('bodies: catálogo completo', () => {
  it('une índice, datos y textos de los 30 cuerpos', () => {
    expect(BODIES).toHaveLength(30);
    const mars = getBody('marte');
    expect(mars.name).toBe('Marte');
    expect(mars.physical.radiusKm.value).toBeGreaterThan(3000);
    expect(mars.facts).toHaveLength(3);
    expect(() => getBody('pluton' as BodyId)).toThrow();
  });
});

describe('bodies: textos', () => {
  it('cada cuerpo tiene un resumen y 3 curiosidades, con fuente de la NASA y marca de revisión', () => {
    expect(Object.keys(BODY_TEXTS).sort()).toEqual(BODY_INDEX.map((body) => body.id).sort());
    for (const body of BODY_INDEX) {
      expect(BODY_TEXTS[body.id].facts).toHaveLength(3);
      for (const item of texts(body.id)) {
        expect(item.text.trim().length).toBeGreaterThan(30);
        expect(item.source).toMatch(/^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//);
        // Los textos nuevos llegan con `reviewed: false` (lo pone el JSON de origen) e Iván los
        // marca como revisados; aquí solo se exige que la marca exista.
        expect(typeof item.reviewed).toBe('boolean');
      }
    }
  });

  it('los resúmenes tienen 2 o 3 frases y ningún texto se pasa de largo', () => {
    for (const body of BODY_INDEX) {
      const { summary, facts } = BODY_TEXTS[body.id];
      const sentences = summary.text.split(/(?<=[.?])\s+(?=[A-ZÁÉÍÓÚÑ¿«])/).length;
      expect(sentences, `${body.id}: ${summary.text}`).toBeGreaterThanOrEqual(2);
      expect(sentences, `${body.id}: ${summary.text}`).toBeLessThanOrEqual(3);
      expect(summary.text.length).toBeLessThanOrEqual(380);
      for (const fact of facts) expect(fact.text.length).toBeLessThanOrEqual(240);
    }
  });

  it('están en español: sin exclamaciones y con los nombres en español', () => {
    const english =
      /\b(Jupiter|Saturn|Uranus|Neptune|Mercury|Earth|Moon|Sun|Phobos|Ganymede|Enceladus|Tethys|Rhea|Iapetus|Oberon|Triton|Proteus)\b/;
    for (const body of BODY_INDEX) {
      for (const item of texts(body.id)) {
        expect(item.text).not.toMatch(/!/);
        expect(item.text, `${body.id}: ${item.text}`).not.toMatch(english);
      }
    }
  });
});
