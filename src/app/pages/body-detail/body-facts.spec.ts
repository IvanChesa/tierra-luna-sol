import { BODIES, getBody } from '../../data/bodies';
import { SOURCES } from '../../data/sources';
import { FactGroup, bodyFacts, citations, periodCells } from './body-facts';

const rowOf = (groups: readonly FactGroup[], key: string) =>
  groups.flatMap((group) => group.rows).find((row) => row.key === key);

describe('body-facts: las tablas de datos de las fichas (fase 9)', () => {
  it('en los 30 cuerpos, cada cifra tiene fuente, número y formato de ESTILO', () => {
    expect(BODIES).toHaveLength(30);
    for (const body of BODIES) {
      const groups = bodyFacts(body);
      const numbers = new Map(citations(groups).map((c) => [c.id, c.number]));
      for (const group of groups) {
        expect(group.rows.length, `${body.id} ${group.id}`).toBeGreaterThan(0);
        const labels = group.rows.map((row) => row.label);
        expect(new Set(labels).size, `${body.id} ${group.id}: etiquetas repetidas`).toBe(
          labels.length,
        );
        for (const row of group.rows) {
          const where = `${body.id} ${row.key}`;
          expect(SOURCES[row.source], where).toBeDefined();
          expect(numbers.get(row.source), where).toBeGreaterThan(0);
          expect(row.value.number, where).not.toMatch(/NaN|Infinity|—|undefined/);
          // Sin guion como signo menos ni punto decimal (ESTILO §3).
          expect(row.value.number, where).not.toMatch(/^-|\d\.\d{1,2}$/);
          expect(row.value.unit, where).not.toMatch(/\u00a0/);
        }
      }
    }
  });

  it('las cifras, con los decimales de su fuente; las masas, en notación científica', () => {
    const titan = bodyFacts(getBody('titan'));
    expect(rowOf(titan, 'radiusKm')?.value).toEqual({ number: '2574,76', unit: 'km' });
    expect(rowOf(titan, 'massKg')?.value).toEqual({
      number: '1,3455',
      exponent: '23',
      unit: 'kg',
      spoken: '1,3455 por 10 elevado a 23 kilogramos',
    });
    // Las distancias de las lunas, en km enteros; los periodos, en días (ESTILO §3).
    expect(rowOf(titan, 'semiMajorAxisKm')?.value).toEqual({ number: '1.221.870', unit: 'km' });
    expect(rowOf(titan, 'periodDays')?.value).toEqual({ number: '15,9', unit: 'días' });
    // El periodo, con un decimal (ESTILO §3) y, al lado, la cifra de la fuente con los suyos.
    expect(rowOf(titan, 'periodDays')?.detail).toBe('15,945421\u00a0días');
    expect(rowOf(titan, 'synchronousRotation')?.value.number).toBe('Síncrona');
  });

  it('las distancias de los planetas, en millones de km con las UA al lado', () => {
    const neptune = bodyFacts(getBody('neptuno'));
    const distance = rowOf(neptune, 'semiMajorAxisKm');
    expect(distance?.value).toEqual({ number: '4515', unit: 'millones de km' });
    expect(distance?.detail).toMatch(/^30,\d\d\u00a0UA$/);
    expect(rowOf(neptune, 'periapsisKm')?.label).toBe('Perihelio');
    // La Luna, alrededor de la Tierra: perigeo y apogeo, en km.
    const moon = bodyFacts(getBody('luna'));
    expect(rowOf(moon, 'periapsisKm')?.label).toBe('Perigeo');
    // Su órbita, de su propia ficha (la tabla comparada de la NASA la redondea a 384.000 km).
    expect(rowOf(moon, 'semiMajorAxisKm')?.value).toEqual({ number: '384.400', unit: 'km' });
    expect(rowOf(moon, 'semiMajorAxisKm')?.source).toBe('nssdc-moon');
    expect(rowOf(moon, 'periodDays')?.detail).toBe('27,3217 días');
    expect(moon.find((g) => g.id === 'orbita')?.title).toBe('Órbita alrededor de la Tierra');
    // Su presión, de noche, en notación científica (no «0 bar»).
    const pressure = rowOf(moon, 'surfacePressureBar');
    expect(pressure?.value).toMatchObject({ number: '3', unit: 'bar' });
    expect(pressure?.value.spoken).toMatch(/^3 por 10 elevado a .15 bares$/);
    expect(pressure?.note).toBe('De noche.');
  });

  it('la aclaración de cada dato, salvo si repite la etiqueta', () => {
    const titan = bodyFacts(getBody('titan'));
    expect(rowOf(titan, 'radiusKm')?.note).toBeUndefined();
    expect(rowOf(titan, 'inclinationDeg')?.note).toBe('Respecto al ecuador del planeta.');
    const mars = bodyFacts(getBody('marte'));
    expect(rowOf(mars, 'radiusKm')?.label).toBe('Radio ecuatorial');
    expect(rowOf(mars, 'radiusKm')?.note).toBe('La mitad del diámetro ecuatorial que da la NASA.');
    // En la Luna, «Respecto a la Tierra» ya lo dice el título de su órbita; la inclinación, no.
    const moon = bodyFacts(getBody('luna'));
    expect(rowOf(moon, 'semiMajorAxisKm')?.note).toBeUndefined();
    expect(rowOf(moon, 'periodDays')?.note).toBeUndefined();
    expect(rowOf(moon, 'inclinationDeg')?.note).toBe('Respecto a la eclíptica.');
    // Ninguna aclaración habla de «la ficha» (la de la NASA se confundiría con esta).
    for (const body of BODIES) {
      for (const row of bodyFacts(body).flatMap((g) => g.rows)) {
        expect(row.note ?? '', `${body.id} ${row.key}`).not.toMatch(/ficha/);
      }
    }
  });

  it('los sentidos retrógrados, dichos: Venus gira al revés y Tritón orbita al revés', () => {
    const venus = bodyFacts(getBody('venus'));
    expect(rowOf(venus, 'rotationPeriodH')?.value).toEqual({ number: '243,0', unit: 'días' });
    expect(rowOf(venus, 'rotationPeriodH')?.detail).toBe('5832,5\u00a0h · retrógrada');
    expect(rowOf(bodyFacts(getBody('triton')), 'retrograde')?.value.number).toBe('Retrógrado');
  });

  it('los periodos: con un decimal y la cifra de la fuente si cambia (365,2 días, no 365)', () => {
    const earth = bodyFacts(getBody('tierra'));
    expect(rowOf(earth, 'periodDays')?.value).toEqual({ number: '365,2', unit: 'días' });
    expect(rowOf(earth, 'periodDays')?.detail).toBeUndefined();
    expect(rowOf(earth, 'rotationPeriodH')?.value).toEqual({ number: '23,9', unit: 'h' });
    const jupiter = bodyFacts(getBody('jupiter'));
    expect(rowOf(jupiter, 'periodDays')?.value).toEqual({ number: '11,9', unit: 'años' });
    expect(rowOf(jupiter, 'periodDays')?.detail).toBe('4331\u00a0días');
    expect(periodCells(1407.6, 'h')).toEqual({
      value: { number: '58,7', unit: 'días' },
      source: '1407,6\u00a0h',
    });
  });

  it('los periodos: sin repetir la cifra de la fuente si solo le falta su cero («88.0» de la NASA)', () => {
    // El dato guarda 88 y la NASA da 88.0: «88,0 días», sin «88 días» al lado (segunda ronda, 23).
    const nbsp = String.fromCharCode(0xa0);
    const mercury = bodyFacts(getBody('mercurio'));
    expect(rowOf(mercury, 'periodDays')?.value).toEqual({ number: '88,0', unit: 'días' });
    expect(rowOf(mercury, 'periodDays')?.detail).toBeUndefined();
    expect(rowOf(bodyFacts(getBody('marte')), 'periodDays')?.detail).toBeUndefined();
    const earth = bodyFacts(getBody('tierra'));
    expect(rowOf(earth, 'lengthOfDayH')?.value).toEqual({ number: '24,0', unit: 'h' });
    expect(rowOf(earth, 'lengthOfDayH')?.detail).toBeUndefined();
    // Convertida o con más decimales, sí, y con todos los de la fuente (Mimas, siete).
    expect(rowOf(mercury, 'rotationPeriodH')?.detail).toBe(`1407,6${nbsp}h`);
    expect(rowOf(bodyFacts(getBody('luna')), 'periodDays')?.detail).toBe(`27,3217${nbsp}días`);
    const mimas = bodyFacts(getBody('mimas'));
    expect(rowOf(mimas, 'periodDays')?.value).toEqual({ number: '22,6', unit: 'h' });
    expect(rowOf(mimas, 'periodDays')?.detail).toBe(`0,9424218${nbsp}días`);
  });

  it('el Sol: sin órbita, con su luminosidad y su tipo espectral', () => {
    const sun = bodyFacts(getBody('sol'));
    expect(sun.map((g) => g.id)).toEqual(['fisicos']);
    expect(rowOf(sun, 'luminosityW')?.value).toMatchObject({ exponent: '26', unit: 'W' });
    expect(rowOf(sun, 'spectralType')?.value.number).toBe('G2 V');
    expect(rowOf(sun, 'effectiveTemperatureK')?.value).toEqual({ number: '5772', unit: 'K' });
  });

  it('Saturno, con sus anillos: los bordes en km y los intervalos de la ficha', () => {
    const saturn = bodyFacts(getBody('saturno'));
    const rings = saturn.find((g) => g.id === 'anillos');
    expect(rings?.rows).toHaveLength(13);
    expect(rowOf(saturn, 'outerRadiusKm')?.value).toEqual({ number: '136.780', unit: 'km' });
    expect(rowOf(saturn, 'b.opticalDepth')?.value.number).toBe('0,4–2,5');
    // Las etiquetas ya dicen lo que aclara la nota.
    expect(rowOf(saturn, 'innerRadiusKm')?.note).toBeUndefined();
    expect(rowOf(saturn, 'b.opticalDepth')?.note).toBeUndefined();
    expect(rowOf(saturn, 'b.albedo')?.note).toBeUndefined();
    for (const body of BODIES.filter((b) => b.id !== 'saturno')) {
      expect(
        bodyFacts(body).some((g) => g.id === 'anillos'),
        body.id,
      ).toBe(false);
    }
  });

  it('las fuentes, numeradas por orden de aparición y sin repetir', () => {
    const groups = bodyFacts(getBody('titan'));
    const list = citations(groups);
    expect(list.map((c) => c.number)).toEqual(list.map((_, k) => k + 1));
    expect(new Set(list.map((c) => c.id)).size).toBe(list.length);
    // La primera fila (el radio de las lunas) es del JPL.
    expect(list[0]?.id).toBe('jpl-satellite-physical-parameters');
  });
});
