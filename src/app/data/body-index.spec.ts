import { GALILEAN_IDS, PLANET_IDS } from '../ephemeris/ids';
import { BODY_INDEX, OTHER_MOONS, PLANETS, findBody, findPlanet, isBodyId } from './body-index';
import { MOON_ELEMENTS } from './moon-elements';

describe('body-index: los 30 cuerpos', () => {
  it('son el Sol, los 8 planetas y 21 lunas, sin ids repetidos', () => {
    const ids = BODY_INDEX.map((body) => body.id);
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(BODY_INDEX.filter((body) => body.kind === 'star').map((body) => body.id)).toEqual([
      'sol',
    ]);
    expect(PLANETS.map((body) => body.id)).toEqual([...PLANET_IDS]);
    const moons = BODY_INDEX.filter((body) => body.kind === 'moon').map((body) => body.id);
    expect(new Set(moons)).toEqual(
      new Set(['luna', ...GALILEAN_IDS, ...Object.keys(MOON_ELEMENTS)]),
    );
    expect(OTHER_MOONS).toHaveLength(20);
  });

  it('cada cuerpo gira alrededor del que debe', () => {
    expect(findBody('sol')?.parent).toBeNull();
    for (const planet of PLANETS) expect(planet.parent).toBe('sol');
    expect(findBody('luna')?.parent).toBe('tierra');
    for (const id of GALILEAN_IDS) expect(findBody(id)?.parent).toBe('jupiter');
    for (const [id, entry] of Object.entries(MOON_ELEMENTS)) {
      expect(findBody(id)?.parent).toBe(entry.parent);
    }
  });

  it('usa los nombres en español, con sus tildes', () => {
    const names = Object.fromEntries(BODY_INDEX.map((body) => [body.id, body.name]));
    expect(names).toMatchObject({
      jupiter: 'Júpiter',
      io: 'Ío',
      ganimedes: 'Ganímedes',
      encelado: 'Encélado',
      titan: 'Titán',
      japeto: 'Jápeto',
      oberon: 'Oberón',
      triton: 'Tritón',
    });
    for (const body of BODY_INDEX) expect(body.id).toMatch(/^[a-z]+$/);
  });

  it('busca por id y distingue planetas', () => {
    expect(findPlanet('marte')?.name).toBe('Marte');
    expect(findPlanet('luna')).toBeUndefined();
    expect(findPlanet('pluton')).toBeUndefined();
    expect(isBodyId('titan')).toBe(true);
    expect(isBodyId('pluton')).toBe(false);
  });
});
