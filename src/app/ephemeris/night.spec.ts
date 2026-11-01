import { GeoObserver } from './coordinates';
import { USNO_RISE_SET_SPAIN, UsnoEvent } from './fixtures/fixtures';
import { NIGHT_BODY_IDS, VISIBLE_ALTITUDE_DEG, nightBody, nightSky } from './night';
import { horizontalOf } from './sky';

/** El plan pide ±2 min frente al USNO (que redondea al minuto). */
const TOLERANCE_MS = 2 * 60_000;

/** Los lugares de los fixtures, con la altitud de `data/places.ts`. */
const PLACES: Readonly<Record<string, GeoObserver>> = {
  montsec: { latDeg: 42.024637, lonDeg: 0.736936, altitudeM: 812 },
  teide: {
    latDeg: 28 + 18 / 60 + 4 / 3600,
    lonDeg: -(16 + 30 / 60 + 38 / 3600),
    altitudeM: 2390,
  },
};

const HOUR_MS = 3_600_000;

/** Un instante del día local del fixture (hora del reloj del lugar) en UT. */
const localTime = (date: string, hour: number, offsetHours: number): Date =>
  new Date(Date.parse(`${date}T00:00:00Z`) + (hour - offsetHours) * HOUR_MS);

function expectNear(
  actual: Date | null | undefined,
  expected: string | UsnoEvent | null,
  what: string,
) {
  const iso = typeof expected === 'string' || expected === null ? expected : expected.ut;
  if (iso === null) throw new Error(`Al fixture le falta ${what}`);
  expect(actual, what).toBeInstanceOf(Date);
  const error = Math.abs((actual as Date).getTime() - Date.parse(iso));
  expect(error, `${what}: ${(actual as Date).toISOString()} frente a ${iso}`).toBeLessThanOrEqual(
    TOLERANCE_MS,
  );
}

describe('night: «Esta noche» frente al USNO (±2 min)', () => {
  for (const series of USNO_RISE_SET_SPAIN.series) {
    const place = PLACES[series.place] as GeoObserver;
    const label = `${series.place} ${series.date}`;

    it(`${label}: la puesta del Sol y el final de los tres crepúsculos`, () => {
      // A mediodía, «esta noche» es la que viene: la de la tarde de ese día.
      const night = nightSky(localTime(series.date, 12, series.utcOffsetHours), place);
      if (night.kind !== 'night') throw new Error(night.kind);
      expectNear(night.sunset, series.sun.set, `${label}, puesta`);
      expectNear(night.dusk.civil, series.sun.civilDusk, `${label}, fin del civil`);
      expectNear(night.dusk.nautical, series.nautical.dusk, `${label}, fin del náutico`);
      expectNear(
        night.dusk.astronomical,
        series.astronomical.dusk,
        `${label}, fin del astronómico`,
      );
      expect(night.dark.start).toEqual(night.dusk.civil);
    });

    it(`${label}: el comienzo de los crepúsculos y la salida del Sol`, () => {
      // De madrugada, la noche en curso: la que acaba esa mañana.
      const night = nightSky(localTime(series.date, 1, series.utcOffsetHours), place);
      if (night.kind !== 'night') throw new Error(night.kind);
      expectNear(
        night.dawn.astronomical,
        series.astronomical.dawn,
        `${label}, comienzo del astronómico`,
      );
      expectNear(night.dawn.nautical, series.nautical.dawn, `${label}, comienzo del náutico`);
      expectNear(night.dawn.civil, series.sun.civilDawn, `${label}, comienzo del civil`);
      expectNear(night.sunrise, series.sun.rise, `${label}, salida`);
      expect(night.dark.end).toEqual(night.dawn.civil);
    });

    it(`${label}: la salida, la culminación y la puesta de la Luna`, () => {
      // El día local entero como marco: los sucesos de la Luna de la tabla del USNO.
      const start = localTime(series.date, 0, series.utcOffsetHours);
      const end = localTime(series.date, 24, series.utcOffsetHours);
      const moon = nightBody('luna', place, {
        sunset: start,
        sunrise: end,
        dark: { start, end },
      });
      if (series.moon.rise) expectNear(moon.rise, series.moon.rise, `${label}, salida de la Luna`);
      if (series.moon.set) expectNear(moon.set, series.moon.set, `${label}, puesta de la Luna`);
      if (series.moon.transit)
        expectNear(moon.transit?.time, series.moon.transit, `${label}, culminación de la Luna`);
    });
  }
});

describe('night: los planetas y la Luna esta noche', () => {
  const montsec = PLACES['montsec'] as GeoObserver;

  it('cada cuerpo, con su mejor momento con el cielo oscuro y su ventana a la vista', () => {
    const night = nightSky(new Date('2026-11-01T12:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    expect([night.moon, ...night.planets].map((b) => b.id)).toEqual([...NIGHT_BODY_IDS]);
    for (const body of [night.moon, ...night.planets]) {
      // El mejor momento, dentro del cielo oscuro y a la altura que da `horizontalOf`.
      expect(body.best.time.getTime()).toBeGreaterThanOrEqual(night.dark.start.getTime());
      expect(body.best.time.getTime()).toBeLessThanOrEqual(night.dark.end.getTime());
      const check = horizontalOf(body.id, body.best.time, montsec);
      expect(body.best.altitudeDeg).toBeCloseTo(check.altitudeDeg, 9);
      // Ninguna otra hora del cielo oscuro lo pone más alto (cada 10 minutos).
      for (let t = night.dark.start.getTime(); t <= night.dark.end.getTime(); t += 600_000) {
        expect(
          horizontalOf(body.id, new Date(t), montsec).altitudeDeg,
          body.id,
        ).toBeLessThanOrEqual(body.best.altitudeDeg + 1e-6);
      }
      expect(body.visible).toBe(body.best.altitudeDeg >= VISIBLE_ALTITUDE_DEG);
      if (body.window) {
        expect(body.window.from.getTime()).toBeLessThanOrEqual(body.window.to.getTime());
        // Dentro de la ventana, sobre el horizonte (con un margen por el borde de la Luna).
        const middle = new Date((body.window.from.getTime() + body.window.to.getTime()) / 2);
        expect(horizontalOf(body.id, middle, montsec).altitudeDeg, body.id).toBeGreaterThan(-0.6);
      } else {
        expect(body.best.altitudeDeg, body.id).toBeLessThan(0.6);
      }
      expect(body.constellation).toMatch(/^[A-Z][a-z]{2}$/);
    }
    // La fase de la Luna, a mitad de la noche.
    expect(night.moon.phase.illuminatedFraction).toBeGreaterThanOrEqual(0);
    expect(night.moon.phase.illuminatedFraction).toBeLessThanOrEqual(1);
  });

  it('la culminación, la del meridiano: al sur y en su altura máxima', () => {
    const night = nightSky(new Date('2026-11-01T12:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    const culminating = [night.moon, ...night.planets].filter((b) => b.transit);
    expect(culminating.length).toBeGreaterThan(0);
    for (const body of culminating) {
      const transit = body.transit as NonNullable<typeof body.transit>;
      // Al norte del ecuador, lo que culmina sobre el horizonte lo hace al sur (180°)...
      if (transit.altitudeDeg > 0)
        expect(Math.abs(transit.azimuthDeg - 180), body.id).toBeLessThan(1);
      // ...y es lo más alto del día: diez minutos antes y después, más bajo.
      for (const delta of [-600_000, 600_000]) {
        const near = horizontalOf(body.id, new Date(transit.time.getTime() + delta), montsec);
        expect(near.altitudeDeg, body.id).toBeLessThan(transit.altitudeDeg);
      }
    }
  });

  it('sin noche: el Sol de medianoche y la noche polar (con «usar mi ubicación» lejos de España)', () => {
    const tromso: GeoObserver = { latDeg: 69.65, lonDeg: 18.96, altitudeM: 0 };
    expect(nightSky(new Date('2026-06-21T12:00:00Z'), tromso).kind).toBe('midnight-sun');
    expect(nightSky(new Date('2026-12-21T12:00:00Z'), tromso).kind).toBe('polar-night');
  });

  it('noches blancas: el Sol se pone pero no hay noche astronómica (Oslo en junio)', () => {
    const oslo: GeoObserver = { latDeg: 59.91, lonDeg: 10.75, altitudeM: 0 };
    const night = nightSky(new Date('2026-06-21T12:00:00Z'), oslo);
    if (night.kind !== 'night') throw new Error(night.kind);
    expect(night.dusk.astronomical).toBeNull();
    expect(night.dawn.astronomical).toBeNull();
    expect(night.dusk.nautical).toBeNull();
    // El cielo oscuro, entonces, del final del civil al comienzo del civil (sí hay).
    expect(night.dusk.civil).toBeInstanceOf(Date);
    expect(night.dark.start).toEqual(night.dusk.civil);
  });

  it('«esta noche» es la misma desde la salida anterior del Sol hasta la siguiente (since)', () => {
    const night = nightSky(new Date('2026-11-01T21:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    const sunsetAt = (ms: number): number => {
      const other = nightSky(new Date(ms), montsec);
      if (other.kind !== 'night') throw new Error(other.kind);
      return other.sunset.getTime();
    };
    const sunset = night.sunset.getTime();
    // La misma puesta, salvo la precisión de la búsqueda (unas decenas de ms según desde dónde se busca).
    expect(Math.abs(sunsetAt(night.since.getTime()) - sunset)).toBeLessThan(1000);
    expect(Math.abs(sunsetAt(night.sunrise.getTime() - 1000) - sunset)).toBeLessThan(1000);
    // Justo antes de la salida anterior, la noche anterior; justo después de esta salida, la siguiente.
    expect(sunsetAt(night.since.getTime() - 2000)).toBeLessThan(sunset - 20 * HOUR_MS);
    expect(sunsetAt(night.sunrise.getTime() + 1000)).toBeGreaterThan(sunset + 20 * HOUR_MS);
  });

  it('en invierno, «esta noche» empieza con la salida del Sol, menos de 12 h antes de la puesta', () => {
    // A las 06:00 UT del 21-12 todavía no ha salido el Sol: es la noche del 20 al 21 (revisión de la
    // fase 8, hallazgo 1: una caché que valía desde la puesta menos 12 h daba la del 21).
    const night = nightSky(new Date('2026-12-21T06:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    expect(night.sunset.toISOString().slice(0, 10)).toBe('2026-12-20');
    const daylight = night.sunset.getTime() - night.since.getTime();
    expect(daylight).toBeGreaterThan(8 * HOUR_MS);
    expect(daylight).toBeLessThan(10 * HOUR_MS);
  });

  it('la última noche de 2100 se calcula aunque acabe en 2101', () => {
    const night = nightSky(new Date('2100-12-31T23:00:00Z'), montsec);
    if (night.kind !== 'night') throw new Error(night.kind);
    expect(night.sunrise.getUTCFullYear()).toBe(2101);
    expect(night.planets).toHaveLength(7);
  });
});
