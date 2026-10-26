import { fromInputValues, toDateInputValue, toTimeInputValue } from './time-input';

describe('time-input: inputs nativos de fecha y hora', () => {
  const instant = new Date('2026-10-24T19:40:05Z');

  it('en UTC, los valores son los del instante', () => {
    expect(toDateInputValue(instant, 'utc')).toBe('2026-10-24');
    expect(toTimeInputValue(instant, 'utc')).toBe('19:40:05');
    expect(fromInputValues('2026-10-24', '19:40:05', 'utc')).toEqual(instant);
  });

  it('en hora local, ida y vuelta sin perder el instante', () => {
    const date = toDateInputValue(instant, 'local');
    const time = toTimeInputValue(instant, 'local');
    expect(fromInputValues(date, time, 'local')).toEqual(instant);
  });

  it('la hora puede venir sin segundos o vacía (medianoche)', () => {
    expect(fromInputValues('1969-07-20', '20:17', 'utc')).toEqual(new Date('1969-07-20T20:17:00Z'));
    expect(fromInputValues('1900-01-01', '', 'utc')).toEqual(new Date('1900-01-01T00:00:00Z'));
  });

  it('rechaza lo que no es una fecha que exista', () => {
    expect(fromInputValues('2026-02-31', '00:00', 'utc')).toBeNull();
    expect(fromInputValues('2026-13-01', '00:00', 'utc')).toBeNull();
    expect(fromInputValues('', '10:00', 'utc')).toBeNull();
    expect(fromInputValues('2026-10-24', '25:00', 'utc')).toBeNull();
    expect(fromInputValues('2026-10-24', 'mediodía', 'utc')).toBeNull();
  });
});
