import { BODY_INDEX, findBody } from '../../data/body-index';
import { bodyDescription, firstSentence } from '../../data/body-description';
import { imageAltOf, kindLineOf, textSourceName, urlText } from './body-labels';

const entry = (id: string) => {
  const body = findBody(id);
  if (!body) throw new Error(id);
  return body;
};

describe('body-labels: los textos fijos de la ficha (fase 9)', () => {
  it('el tipo: la Luna es el satélite de la Tierra; las demás, lunas de su planeta', () => {
    expect(kindLineOf(entry('luna'))).toEqual({
      text: 'Satélite de',
      parent: { name: 'la Tierra', path: '/planetas/tierra' },
    });
    expect(kindLineOf(entry('titan'))).toEqual({
      text: 'Luna de',
      parent: { name: 'Saturno', path: '/planetas/saturno' },
    });
    expect(kindLineOf(entry('marte'))).toEqual({ text: 'Planeta' });
    expect(kindLineOf(entry('sol'))).toEqual({ text: 'Estrella' });
  });

  it('el texto alternativo dice lo que se ve: superficie, nubes, neblina o color esquemático', () => {
    expect(imageAltOf(entry('marte'))).toBe(
      'Marte, con la luz del Sol de lado y su superficie real: imagen del propio explorador.',
    );
    expect(imageAltOf(entry('venus'))).toMatch(/y sus nubes:/);
    expect(imageAltOf(entry('jupiter'))).toMatch(/y sus nubes:/);
    expect(imageAltOf(entry('saturno'))).toMatch(/sus nubes y sus anillos/);
    expect(imageAltOf(entry('titan'))).toMatch(/y su neblina:/);
    expect(imageAltOf(entry('tierra'))).toMatch(/^La Tierra, /);
    expect(imageAltOf(entry('luna'))).toMatch(/^La Luna, .*su superficie real/);
    expect(imageAltOf(entry('proteo'))).toMatch(/color esquemático/);
    // Ninguno en masculino o femenino («iluminado»): la frase no tiene género.
    for (const body of BODY_INDEX) expect(imageAltOf(body)).not.toMatch(/iluminad/);
  });

  it('las fuentes de los textos, por su nombre y por su dirección', () => {
    expect(textSourceName('https://science.nasa.gov/mars/facts/')).toBe('NASA Science');
    expect(textSourceName('https://www.nasa.gov/image-article/black-marble/')).toBe('NASA');
    expect(urlText('https://science.nasa.gov/mars/facts/')).toBe('science.nasa.gov/mars/facts');
  });

  it('la description de cada ficha: la primera frase de su resumen', () => {
    expect(firstSentence('Uno. Dos. Tres.')).toBe('Uno.');
    expect(firstSentence('Sin punto final')).toBe('Sin punto final');
    for (const body of BODY_INDEX) {
      const description = bodyDescription(body.id);
      expect(description.length, body.id).toBeGreaterThan(20);
      expect(description.endsWith('.'), body.id).toBe(true);
    }
    expect(bodyDescription('pluton')).toBe('');
  });
});
