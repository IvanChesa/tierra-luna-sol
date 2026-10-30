import { MAX_DATE, MIN_DATE } from '../ephemeris/constants';
import { DayOf, GUIDED_VIEWS, atSolarHour, localDay, utcDay } from './tours';

/** El día de una zona fija de UTC+2 (Madrid en verano), sin depender de la del equipo. */
const madridSummer: DayOf = (date) => utcDay(new Date(date.getTime() + 2 * 3_600_000));

const view = (id: string) => {
  const found = GUIDED_VIEWS.find((v) => v.id === id);
  if (!found) throw new Error(`Falta la vista «${id}»`);
  return found;
};
const at = (id: string, from: string, day: DayOf) => {
  const v = view(id);
  return atSolarHour(new Date(from), v.lonDeg, v.solarHour, day).toISOString();
};

describe('vistas guiadas: la hora solar del punto sin cambiar el día que se ve', () => {
  it('en UTC, el mismo día UTC: mediodía en el Pacífico (160° O) a las 22:40', () => {
    expect(at('pacifico', '2026-10-24T10:00:00Z', utcDay)).toBe('2026-10-24T22:40:00.000Z');
    expect(at('espana', '2026-06-21T09:30:00Z', utcDay)).toBe('2026-06-21T12:28:00.000Z');
  });

  it('con la hora de España, «El Pacífico» y «Las luces de la noche» no pasan al día siguiente', () => {
    // El 24-10 a las 12:00 en España: las 22:40 UTC del 24 ya serían el 25 a las 00:40.
    expect(at('pacifico', '2026-10-24T10:00:00Z', madridSummer)).toBe('2026-10-23T22:40:00.000Z');
    // Medianoche solar a 10° E: las 23:20 UTC del día anterior, la 01:20 del mismo día en España.
    expect(at('luces-nocturnas', '2026-10-24T10:00:00Z', madridSummer)).toBe(
      '2026-10-23T23:20:00.000Z',
    );
  });

  it('entre las 00:00 y las 02:00 en España, las vistas de día no vuelven al día anterior', () => {
    // El 24-10 a la 01:30 en España (el 23 a las 23:30 UTC).
    const from = '2026-10-23T23:30:00Z';
    expect(madridSummer(new Date(at('tierra-completa', from, madridSummer)))).toBe('2026-10-24');
    expect(at('tierra-completa', from, madridSummer)).toBe('2026-10-24T11:20:00.000Z');
    expect(at('espana', from, madridSummer)).toBe('2026-10-24T12:28:00.000Z');
  });

  it('todas las vistas, en cualquier hora del día, conservan el día que se ve', () => {
    for (const day of [utcDay, madridSummer, localDay]) {
      for (let hour = 0; hour < 24; hour += 0.5) {
        const from = new Date(Date.UTC(2026, 5, 21) + hour * 3_600_000);
        for (const v of GUIDED_VIEWS) {
          const to = atSolarHour(from, v.lonDeg, v.solarHour, day);
          expect(day(to)).toBe(day(from));
        }
      }
    }
  });

  it('en los extremos de 1900–2100, no se sale del rango', () => {
    for (const from of [MIN_DATE, MAX_DATE]) {
      for (const day of [utcDay, madridSummer]) {
        for (const v of GUIDED_VIEWS) {
          const to = atSolarHour(from, v.lonDeg, v.solarHour, day).getTime();
          expect(to).toBeGreaterThanOrEqual(MIN_DATE.getTime());
          expect(to).toBeLessThanOrEqual(MAX_DATE.getTime());
        }
      }
    }
    // El 31-12-2100 a las 23:59 UTC ya es el 1-1-2101 en España: el mediodía de ese día no cabe, y se
    // queda el más cercano dentro del rango.
    expect(at('espana', MAX_DATE.toISOString(), madridSummer)).toBe('2100-12-31T12:28:00.000Z');
  });
});
