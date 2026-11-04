import {
  decimalsOf,
  formatAu,
  formatDateTime,
  formatExact,
  formatScientific,
  formatDistanceKm,
  formatLongDate,
  formatLongDateTime,
  localZoneName,
  formatNumber,
  formatPeriodHours,
  utcOffsetLabel,
} from './format';

/** `Intl` separa con espacios duros (U+00A0 y U+202F): para comparar, espacios normales. */
const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('format: cifras con Intl es-ES (ESTILO §3)', () => {
  it('coma decimal, punto de millares desde cinco cifras y signo menos tipográfico', () => {
    expect(formatNumber(1430)).toBe('1430');
    expect(formatNumber(14_300)).toBe('14.300');
    expect(formatNumber(9.634, 2)).toBe('9,63');
    expect(formatNumber(9.6, 2, true)).toBe('9,60');
    expect(formatNumber(-173)).toBe('\u2212173');
    expect(formatNumber(Number.NaN)).toBe('—');
  });

  it('distancias: km, millones con un decimal y millones sin decimales', () => {
    expect(plain(formatDistanceKm(384_399.6))).toBe('384.400 km');
    expect(plain(formatDistanceKm(149_597_870.7))).toBe('149,6 millones de km');
    // El decimal se escribe también si es cero: la cifra no cambia de ancho al reproducir.
    expect(plain(formatDistanceKm(795_012_000))).toBe('795,0 millones de km');
    expect(plain(formatDistanceKm(1_433_530_000))).toBe('1434 millones de km');
    expect(plain(formatDistanceKm(Number.POSITIVE_INFINITY))).toBe('—');
  });

  it('unidades astronómicas con dos decimales', () => {
    expect(plain(formatAu(149_597_870.7))).toBe('1,00 UA');
    expect(plain(formatAu(1_440_000_000))).toBe('9,63 UA');
  });

  it('periodos en horas, días o años según su duración', () => {
    expect(plain(formatPeriodHours(10.656))).toBe('10,7 h');
    expect(plain(formatPeriodHours(-17.24))).toBe('17,2 h'); // retrógrado: el signo lo dice el texto
    expect(plain(formatPeriodHours(27.3217 * 24))).toBe('27,3 días');
    expect(plain(formatPeriodHours(365.256 * 24))).toBe('365 días');
    expect(plain(formatPeriodHours(10_755.7 * 24))).toBe('29,4 años');
  });
});

describe('format: las cifras de las fichas, con los decimales de su fuente (fase 9)', () => {
  it('cuántos decimales tiene una cifra, también en notación exponencial', () => {
    expect(decimalsOf(1407.6)).toBe(1);
    expect(decimalsOf(0.0009)).toBe(4);
    expect(decimalsOf(6e-5)).toBe(5);
    expect(decimalsOf(695700)).toBe(0);
    expect(decimalsOf(-65)).toBe(0);
    expect(decimalsOf(Number.NaN)).toBe(0);
  });

  it('sin redondear ni añadir decimales', () => {
    expect(formatExact(3396.2)).toBe('3396,2');
    expect(formatExact(0.0009)).toBe('0,0009');
    expect(formatExact(1221870)).toBe('1.221.870');
    expect(formatExact(-173)).toBe('−173');
    expect(formatExact(15.945421)).toBe('15,945421');
    // Sin el ruido de la coma flotante de pasar de días a horas y volver.
    expect(formatExact((27.3217 * 24) / 24)).toBe('27,3217');
  });

  it('notación científica: mantisa con los decimales de la fuente y su lectura', () => {
    expect(formatScientific(6.4171e23)).toEqual({
      mantissa: '6,4171',
      exponent: '23',
      spoken: '6,4171 por 10 elevado a 23',
    });
    expect(formatScientific(1.9884e30).mantissa).toBe('1,9884');
    expect(formatScientific(3.3e23)).toMatchObject({ mantissa: '3,3', exponent: '23' });
    expect(formatScientific(3.828e26)).toMatchObject({ mantissa: '3,828', exponent: '26' });
    // Una mantisa que, con el redondeo, llega a 10.
    expect(formatScientific(9.99999999999999e5)).toMatchObject({ mantissa: '1', exponent: '6' });
    expect(formatScientific(2.5e-5)).toMatchObject({ mantissa: '2,5', exponent: '−5' });
  });
});

describe('format: fechas', () => {
  const instant = new Date('2026-10-24T19:40:05Z');

  it('en UTC, con día, mes abreviado, año y hora de 24 h', () => {
    expect(plain(formatDateTime(instant, 'utc'))).toBe('24 oct 2026, 19:40:05');
    expect(plain(formatDateTime(instant, 'utc', false))).toBe('24 oct 2026, 19:40');
    expect(plain(formatLongDateTime(instant, 'utc'))).toBe('24 de octubre de 2026 a las 19:40');
    // La de la línea de tiempo (aria-valuetext): sin la hora.
    expect(plain(formatLongDate(new Date('2031-03-17T10:00:00Z'), 'utc'))).toBe(
      '17 de marzo de 2031',
    );
  });

  it('el desfase de la zona local se escribe como UTC±h (o UTC si no hay)', () => {
    const label = utcOffsetLabel(instant);
    expect(label).toMatch(/^UTC([+−]\d{1,2}(:\d{2}){0,2})?$/);
    expect(localZoneName()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  // La hora solar de Madrid (UTC−0:14:44) hasta 1901: el desfase lleva sus segundos, como el campo
  // de la hora (23:45:16 a las 00:00 UTC). Solo se puede comprobar con esa zona.
  it.runIf(localZoneName() === 'Europe/Madrid')(
    'en Madrid, en 1900, el desfase de la hora solar con sus segundos',
    () => {
      expect(utcOffsetLabel(new Date('1900-01-01T00:00:00Z'))).toBe('UTC−0:14:44');
      expect(utcOffsetLabel(new Date('2026-07-01T00:00:00Z'))).toBe('UTC+2');
      expect(utcOffsetLabel(new Date('2026-01-01T00:00:00Z'))).toBe('UTC+1');
    },
  );
});
