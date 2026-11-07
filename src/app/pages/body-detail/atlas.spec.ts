import { ATLAS, atlasNeighbors } from './atlas';

describe('El orden del atlas: la ficha anterior y la siguiente (fase 9c)', () => {
  it('los 30 cuerpos: el Sol y cada planeta seguido de sus lunas, de dentro afuera', () => {
    expect(ATLAS).toHaveLength(30);
    expect(new Set(ATLAS).size).toBe(30);
    expect(ATLAS.slice(0, 7)).toEqual([
      'sol',
      'mercurio',
      'venus',
      'tierra',
      'luna',
      'marte',
      'fobos',
    ]);
    // Neptuno: Proteo antes que Tritón (por su distancia, no por el orden del catálogo).
    expect(ATLAS.slice(-3)).toEqual(['neptuno', 'proteo', 'triton']);
  });

  it('en los extremos, sin anterior o sin siguiente; en medio, los dos', () => {
    expect(atlasNeighbors('sol')).toEqual({
      previous: null,
      next: { id: 'mercurio', name: 'Mercurio' },
    });
    expect(atlasNeighbors('triton')?.next).toBeNull();
    expect(atlasNeighbors('jupiter')).toEqual({
      previous: { id: 'deimos', name: 'Deimos' },
      next: { id: 'io', name: 'Ío' },
    });
  });
});
