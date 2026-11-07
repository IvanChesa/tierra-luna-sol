import { findPlace } from '../../data/places';
import { placeShortLabel } from './place-label';

describe('placeShortLabel: el lugar en los selectores, corto y entero (fase 9c)', () => {
  it('sin el tipo de lugar y con la provincia o la isla entre paréntesis', () => {
    const label = (id: string) => {
      const place = findPlace(id);
      if (!place) throw new Error(`Sin el lugar ${id}`);
      return placeShortLabel(place);
    };
    expect(label('montsec')).toBe('Montsec (Lleida)');
    expect(label('roque-de-los-muchachos')).toBe('Roque de los Muchachos (La Palma)');
    expect(label('teide')).toBe('Teide (Tenerife)');
    expect(label('calar-alto')).toBe('Calar Alto (Almería)');
    expect(label('observatori-fabra')).toBe('Observatori Fabra (Barcelona)');
    expect(label('madrid')).toBe('Puerta del Sol (Madrid)');
    expect(label('fraga')).toBe('Fraga (Huesca)');
    expect(placeShortLabel({ name: 'Lleida', province: 'Lleida' })).toBe('Lleida');
  });
});
