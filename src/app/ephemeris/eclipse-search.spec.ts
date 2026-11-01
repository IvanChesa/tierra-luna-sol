import { GeoObserver } from './coordinates';
import { Body, MakeTime, Observer, SearchRiseSet } from 'astronomy-engine';
import {
  aboveHorizon,
  eclipsesBetween,
  globalEclipsesBetween,
  nextLunarEclipse,
  nextSolarEclipse,
} from './eclipse-search';
import {
  NASA_ECLIPSES_2026_2035,
  NASA_ECLIPSE_2026_08_12_PATH,
  NASA_LUNAR_ECLIPSES,
} from './fixtures/fixtures';
import { horizontalOf } from './sky';

const MONTSEC: GeoObserver = { latDeg: 42.024637, lonDeg: 0.736936, altitudeM: 812 };
const TEIDE: GeoObserver = {
  latDeg: 28 + 18 / 60 + 4 / 3600,
  lonDeg: -(16 + 30 / 60 + 38 / 3600),
  altitudeM: 2390,
};

/** Los tipos de los catálogos de la NASA (la primera letra) en los de astronomy-engine. */
const NASA_TYPES: Readonly<Record<string, readonly string[]>> = {
  T: ['total'],
  A: ['annular'],
  P: ['partial'],
  N: ['penumbral'],
  // Híbrido: total en unos sitios y anular en otros; astronomy-engine da el del punto del máximo.
  H: ['total', 'annular'],
};

describe('eclipse-search: los eclipses de 2026 a 2035 frente a los catálogos de la NASA', () => {
  const computed = globalEclipsesBetween(
    new Date('2026-01-01T00:00:00Z'),
    new Date('2035-12-31T23:59:59Z'),
  );
  const catalog = NASA_ECLIPSES_2026_2035.eclipses;

  it('los mismos eclipses, en el mismo orden', () => {
    expect(computed.map((e) => e.kind)).toEqual(catalog.map((e) => e.kind));
  });

  it('con la fecha y el tipo exactos, y el máximo a menos de 2 minutos (en TD)', () => {
    computed.forEach((eclipse, k) => {
      const nasa = catalog[k];
      if (!nasa) throw new Error(`Falta el eclipse ${k} del catálogo`);
      const label = `${nasa.kind} ${nasa.date} (${nasa.type})`;
      expect(eclipse.peakTt.toISOString().slice(0, 10), label).toBe(nasa.date);
      expect(NASA_TYPES[nasa.type.charAt(0)], label).toContain(eclipse.type);
      const minutes =
        Math.abs(eclipse.peakTt.getTime() - Date.parse(nasa.greatestEclipseTd)) / 60_000;
      expect(minutes, label).toBeLessThan(2);
    });
  });
});

describe('eclipse-search: el eclipse total del 12-08-2026 en España', () => {
  for (const point of NASA_ECLIPSE_2026_08_12_PATH.points) {
    it(`en la línea central (${point.latitudeDeg.toFixed(2)}°, ${point.longitudeDeg.toFixed(2)}°), total y con el máximo y la duración de la NASA`, () => {
      const place: GeoObserver = {
        latDeg: point.latitudeDeg,
        lonDeg: point.longitudeDeg,
        altitudeM: 0,
      };
      const eclipse = nextSolarEclipse(
        new Date('2026-08-01T00:00:00Z'),
        new Date('2026-09-01T00:00:00Z'),
        place,
      );
      if (!eclipse) throw new Error('No se encuentra el eclipse');
      expect(eclipse.type).toBe('total');
      expect(eclipse.obscuration).toBe(1);
      // La tabla da el paso de la línea central al minuto: el máximo local, a menos de 1 minuto.
      expect(Math.abs(eclipse.peak.getTime() - Date.parse(point.ut))).toBeLessThan(60_000);
      // La duración de la totalidad en la línea central (1 min 49 s y 1 min 45 s), ±3 s.
      if (!eclipse.central) throw new Error('Sin fase total');
      const seconds = (eclipse.central.to.getTime() - eclipse.central.from.getTime()) / 1000;
      expect(Math.abs(seconds - point.centralDurationSeconds)).toBeLessThan(3);
      // Con el Sol bajo pero sobre el horizonte (lo dice la tabla: 10° y 8°).
      expect(eclipse.centralVisible).toBe(true);
      expect(eclipse.altitudeDeg).toBeGreaterThan(5);
    });
  }
});

describe('eclipse-search: los que se ven desde un lugar', () => {
  const from = new Date('2026-01-01T00:00:00Z');
  const until = new Date('2030-12-31T23:59:59Z');

  it('cada uno está en el catálogo de la NASA y con el astro sobre el horizonte en lo que se ve', () => {
    for (const place of [MONTSEC, TEIDE]) {
      const list = eclipsesBetween(from, until, place);
      expect(list.length).toBeGreaterThan(3);
      for (const eclipse of list) {
        const day = eclipse.peak.toISOString().slice(0, 10);
        const nasa = NASA_ECLIPSES_2026_2035.eclipses.find(
          (e) =>
            e.kind === eclipse.kind &&
            Math.abs(Date.parse(e.greatestEclipseTd) - eclipse.peak.getTime()) < 86_400_000,
        );
        expect(nasa, `${eclipse.kind} ${day}`).toBeDefined();
        const body = eclipse.kind === 'solar' ? 'sol' : 'luna';
        const middle = new Date(
          (eclipse.visible.from.getTime() + eclipse.visible.to.getTime()) / 2,
        );
        expect(
          horizontalOf(body, middle, place).altitudeDeg,
          `${eclipse.kind} ${day}`,
        ).toBeGreaterThan(-0.6);
        expect(eclipse.visible.from.getTime()).toBeLessThanOrEqual(eclipse.visible.to.getTime());
      }
      // Por orden.
      const peaks = list.map((e) => e.peak.getTime());
      expect([...peaks].sort((a, b) => a - b)).toEqual(peaks);
    }
  });

  it('el total de Luna del 3-3-2026 no se ve desde España: en su máximo la Luna está bajo el horizonte', () => {
    const nasa = NASA_LUNAR_ECLIPSES.eclipses.find((e) =>
      e.greatestEclipseTd.startsWith('2026-03-03'),
    );
    if (!nasa) throw new Error('Falta el fixture');
    const greatest = new Date(Date.parse(nasa.greatestEclipseTd) - nasa.deltaTSeconds * 1000);
    for (const place of [MONTSEC, TEIDE]) {
      expect(horizontalOf('luna', greatest, place).altitudeDeg).toBeLessThan(-10);
      const next = nextLunarEclipse(
        new Date('2026-02-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z'),
        place,
      );
      expect(next).toBeNull();
    }
  });

  it('el parcial de Luna del 28-8-2026 se ve desde el Montsec, antes de amanecer', () => {
    const eclipse = nextLunarEclipse(
      new Date('2026-08-20T00:00:00Z'),
      new Date('2026-09-10T00:00:00Z'),
      MONTSEC,
    );
    if (!eclipse) throw new Error('No se ve');
    expect(eclipse.type).toBe('partial');
    expect(eclipse.partial).not.toBeNull();
    expect(eclipse.total).toBeNull();
    // Con la Luna sobre el horizonte en su máximo (las 04:13 UT).
    expect(eclipse.altitudeDeg).toBeGreaterThan(0);
  });

  it('un eclipse de Sol que no se ve (el anular del 17-2-2026, en la Antártida) no sale', () => {
    const eclipse = nextSolarEclipse(
      new Date('2026-02-01T00:00:00Z'),
      new Date('2026-03-01T00:00:00Z'),
      MONTSEC,
    );
    expect(eclipse).toBeNull();
  });

  it('si el borde del Sol ya ha salido al empezar, se ve desde el principio (no la salida de mañana)', () => {
    // Revisión de la fase 8, hallazgo 9: con el centro bajo el horizonte y el borde ya fuera, se buscaba
    // la salida desde el comienzo, se encontraba la del día siguiente y el eclipse se descartaba.
    const observer = new Observer(MONTSEC.latDeg, MONTSEC.lonDeg, MONTSEC.altitudeM);
    const rise = SearchRiseSet(
      Body.Sun,
      observer,
      +1,
      MakeTime(new Date('2026-11-01T00:00:00Z')),
      1,
    );
    if (!rise) throw new Error('sin salida');
    const from = new Date(rise.date.getTime() + 20_000);
    const to = new Date(from.getTime() + 3_600_000);
    expect(horizontalOf('sol', from, MONTSEC).altitudeDeg).toBeLessThan(0);
    const sky = aboveHorizon('sol', { from, to }, MONTSEC);
    expect(sky?.visible.from).toEqual(from);
    expect(sky?.visible.to).toEqual(to);
    expect(sky?.complete).toBe(true);
    // Diez minutos antes de la salida, se ve desde la salida.
    const early = new Date(rise.date.getTime() - 600_000);
    const later = aboveHorizon('sol', { from: early, to }, MONTSEC);
    expect(Math.abs((later?.visible.from.getTime() ?? 0) - rise.date.getTime())).toBeLessThan(1000);
    expect(later?.complete).toBe(false);
  });
});
