import {
  bodyKindLabel,
  bodyPagePath,
  describeBody,
  distanceText,
  distanceValue,
  ofBody,
  toBodyLabel,
  viewName,
} from './describe';

/** `Intl` separa con espacios duros: para comparar, espacios normales. */
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('describe: textos de la interfaz sobre los cuerpos y las vistas', () => {
  it('el tipo de cada cuerpo, con su planeta en las lunas', () => {
    expect(bodyKindLabel('sol')).toBe('Estrella');
    expect(bodyKindLabel('saturno')).toBe('Planeta');
    expect(bodyKindLabel('luna')).toBe('Satélite de la Tierra');
    expect(bodyKindLabel('titan')).toBe('Luna de Saturno');
  });

  it('enlaza solo las fichas que existen (las de las lunas llegan en la fase 9)', () => {
    expect(bodyPagePath('marte')).toBe('/planetas/marte');
    expect(bodyPagePath('sol')).toBe('/sol');
    expect(bodyPagePath('luna')).toBe('/luna');
    expect(bodyPagePath('titan')).toBeNull();
  });

  it('los artículos de cada nombre: «del Sol», «a la Tierra», «a Saturno»', () => {
    expect(ofBody('sol')).toBe('del Sol');
    expect(ofBody('tierra')).toBe('de la Tierra');
    expect(ofBody('jupiter')).toBe('de Júpiter');
    expect(toBodyLabel('sol')).toBe('Al Sol');
    expect(toBodyLabel('tierra')).toBe('A la Tierra');
    expect(toBodyLabel('saturno')).toBe('A Saturno');
  });

  it('la distancia como en una tabla de efemérides: UA al Sol los planetas, km a su planeta las lunas', () => {
    const saturn = { toSunKm: 9.54 * 149_597_870.7, toEarthKm: 1.32e9, toParentKm: null };
    const titan = { toSunKm: 1.43e9, toEarthKm: 1.32e9, toParentKm: 1_221_870 };
    expect(plain(distanceValue('saturno', saturn) ?? '')).toBe('9,54 UA');
    expect(plain(distanceText('saturno', saturn))).toBe('A 9,54 UA del Sol');
    expect(plain(distanceValue('titan', titan) ?? '')).toBe('1.221.870 km');
    expect(plain(distanceText('titan', titan))).toBe('A 1.221.870 km de Saturno');
    expect(plain(distanceText('luna', { ...titan, toParentKm: 384_400 }))).toBe(
      'A 384.400 km de la Tierra',
    );
    // El Sol es el origen; sin dato, nada.
    expect(distanceValue('sol', saturn)).toBeNull();
    expect(distanceText('sol', saturn)).toBe('');
    expect(distanceText('marte', { toSunKm: null, toEarthKm: null, toParentKm: null })).toBe('');
  });

  it('la frase que se anuncia al elegir un cuerpo (ESTILO §6)', () => {
    expect(
      plain(
        describeBody('saturno', {
          toSunKm: 1.43e9,
          toEarthKm: 1.32e9,
          toParentKm: null,
        }),
      ),
    ).toBe('Saturno, planeta. A 1430 millones de km del Sol y a 1320 millones de km de la Tierra.');
    // Una luna dice la distancia a su planeta; la Luna no repite la de la Tierra.
    expect(
      plain(describeBody('titan', { toSunKm: 1.43e9, toEarthKm: 1.32e9, toParentKm: 1_221_870 })),
    ).toBe(
      'Titán, luna de Saturno. A 1,2 millones de km de Saturno y a 1320 millones de km de la Tierra.',
    );
    expect(
      plain(describeBody('luna', { toSunKm: 1.5e8, toEarthKm: 384_400, toParentKm: 384_400 })),
    ).toBe('Luna, satélite de la Tierra. A 384.400 km de la Tierra.');
    expect(
      plain(describeBody('sol', { toSunKm: null, toEarthKm: 149_600_000, toParentKm: null })),
    ).toBe('Sol, estrella. A 149,6 millones de km de la Tierra.');
  });

  it('el nombre de cada vista', () => {
    expect(viewName('system')).toBe('Vista del sistema solar');
    expect(viewName('earth')).toBe('Vista de la Tierra');
    expect(viewName('moon')).toBe('Vista de la Luna');
  });
});
