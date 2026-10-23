import { formatPageTitle } from './site-title.strategy';

describe('formatPageTitle', () => {
  it('añade el nombre del sitio al título de la página', () => {
    expect(formatPageTitle('Marte')).toBe('Marte · Tierra Luna Sol');
  });

  it('usa solo el nombre del sitio si la ruta no tiene título', () => {
    expect(formatPageTitle(undefined)).toBe('Tierra Luna Sol');
    expect(formatPageTitle('')).toBe('Tierra Luna Sol');
  });
});
