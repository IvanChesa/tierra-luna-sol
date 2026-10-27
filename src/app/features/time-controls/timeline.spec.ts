import {
  dateAtDay,
  dayOfYear,
  daysInYear,
  isTimelineKey,
  shiftYears,
  stepDate,
  yearOf,
} from './timeline';

const utc = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

describe('timeline: la línea de tiempo del año de la fecha mostrada', () => {
  it('días del año: 365, o 366 en los bisiestos del calendario gregoriano', () => {
    expect(daysInYear(2026)).toBe(365);
    expect(daysInYear(2028)).toBe(366);
    expect(daysInYear(1900)).toBe(365); // múltiplo de 100: no
    expect(daysInYear(2000)).toBe(366); // múltiplo de 400: sí
    expect(daysInYear(2100)).toBe(365);
  });

  it('el año y el día del año, en la zona elegida', () => {
    const date = utc('2026-03-17T10:30:00Z');
    expect(yearOf(date, 'utc')).toBe(2026);
    expect(dayOfYear(date, 'utc')).toBe(75); // 31 + 28 + 16
    expect(dayOfYear(utc('2026-01-01T00:00:00Z'), 'utc')).toBe(0);
    expect(dayOfYear(utc('2028-12-31T23:59:59Z'), 'utc')).toBe(365);
  });

  it('un día del año lleva a esa fecha a la misma hora, sin salirse del año', () => {
    const date = utc('2026-10-24T14:05:09Z');
    expect(iso(dateAtDay(date, 75, 'utc'))).toBe('2026-03-17T14:05:09.000Z');
    expect(iso(dateAtDay(date, 0, 'utc'))).toBe('2026-01-01T14:05:09.000Z');
    expect(iso(dateAtDay(date, 400, 'utc'))).toBe('2026-12-31T14:05:09.000Z');
    expect(iso(dateAtDay(date, -3, 'utc'))).toBe('2026-01-01T14:05:09.000Z');
  });

  it('flechas: un día, también al pasar de un año a otro', () => {
    expect(iso(stepDate(utc('2026-03-17T10:00:00Z'), 'ArrowRight', 'utc'))).toBe(
      '2026-03-18T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-03-17T10:00:00Z'), 'ArrowDown', 'utc'))).toBe(
      '2026-03-16T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-12-31T22:00:00Z'), 'ArrowUp', 'utc'))).toBe(
      '2027-01-01T22:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-01-01T03:00:00Z'), 'ArrowLeft', 'utc'))).toBe(
      '2025-12-31T03:00:00.000Z',
    );
  });

  it('RePág y AvPág: un mes, hasta el último día si el mes es más corto', () => {
    expect(iso(stepDate(utc('2026-03-17T10:00:00Z'), 'PageUp', 'utc'))).toBe(
      '2026-04-17T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-01-31T10:00:00Z'), 'PageUp', 'utc'))).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2028-01-31T10:00:00Z'), 'PageUp', 'utc'))).toBe(
      '2028-02-29T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-12-15T10:00:00Z'), 'PageUp', 'utc'))).toBe(
      '2027-01-15T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-01-15T10:00:00Z'), 'PageDown', 'utc'))).toBe(
      '2025-12-15T10:00:00.000Z',
    );
  });

  it('Inicio y Fin: el 1 de enero y el 31 de diciembre de su año, a la misma hora', () => {
    expect(iso(stepDate(utc('2026-03-17T10:00:00Z'), 'Home', 'utc'))).toBe(
      '2026-01-01T10:00:00.000Z',
    );
    expect(iso(stepDate(utc('2026-03-17T10:00:00Z'), 'End', 'utc'))).toBe(
      '2026-12-31T10:00:00.000Z',
    );
  });

  it('un año antes o después, el mismo día (el 29 de febrero pasa al 28)', () => {
    expect(iso(shiftYears(utc('2026-03-17T10:00:00Z'), 1, 'utc'))).toBe('2027-03-17T10:00:00.000Z');
    expect(iso(shiftYears(utc('2028-02-29T10:00:00Z'), -1, 'utc'))).toBe(
      '2027-02-28T10:00:00.000Z',
    );
  });

  it('en la hora local se conserva la hora de reloj, también al cambiar de horario', () => {
    // Del 28 de marzo al 29 de marzo de 2026 (en Madrid, la noche del cambio de hora).
    const before = new Date(2026, 2, 28, 12, 0, 0);
    const after = stepDate(before, 'ArrowRight', 'local');
    expect(after.getDate()).toBe(29);
    expect(after.getHours()).toBe(12);
    expect(dayOfYear(after, 'local')).toBe(dayOfYear(before, 'local') + 1);
    expect(yearOf(new Date(2026, 0, 1, 0, 30), 'local')).toBe(2026);
  });

  it('solo las teclas de la línea de tiempo', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(isTimelineKey(key)).toBe(true);
    }
    expect(isTimelineKey('Enter')).toBe(false);
    expect(isTimelineKey('k')).toBe(false);
  });
});
