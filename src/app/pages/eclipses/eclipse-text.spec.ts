import type { EclipseEntry } from '../../data/eclipse-entry';
import { ECLIPSES_BY_PLACE, ECLIPSES_FROM } from '../../data/eclipses';
import { SKY_PLACES } from '../../data/places';
import { parseViewerParams } from '../../features/viewer/viewer-params';
import {
  amountText,
  eclipseDate,
  eclipseTitle,
  peakText,
  view3dLabel,
  view3dLink,
  visibilityText,
} from './eclipse-text';

const entry = (over: Partial<EclipseEntry>): EclipseEntry => ({
  kind: 'solar',
  type: 'partial',
  peak: '2026-08-12T18:28:36Z',
  visibleFrom: '2026-08-12T17:31:00Z',
  visibleTo: '2026-08-12T19:02:00Z',
  complete: false,
  centralVisible: false,
  obscuration: 0.997,
  altitudeDeg: 5.2,
  ...over,
});

describe('eclipse-text: los textos de /eclipses', () => {
  it('el título, el día y el máximo en la hora del lugar (con su zona)', () => {
    const e = entry({});
    expect(eclipseTitle(e)).toBe('Eclipse parcial de Sol');
    expect(eclipseTitle(entry({ kind: 'lunar', type: 'penumbral' }))).toBe(
      'Eclipse penumbral de Luna',
    );
    expect(eclipseDate(e, 'Europe/Madrid')).toBe('12 de agosto de 2026');
    expect(peakText(e, 'Europe/Madrid')).toBe('Máximo a las 20:28 (Europe/Madrid, UTC+2)');
    expect(peakText(e, 'Atlantic/Canary')).toBe('Máximo a las 19:28 (Atlantic/Canary, UTC+1)');
  });

  it('cuánto se tapa y lo que se ve', () => {
    expect(amountText(entry({}))).toBe('La Luna tapa el 100\u00a0% del Sol.');
    expect(amountText(entry({ obscuration: 0.791 }))).toBe('La Luna tapa el 79\u00a0% del Sol.');
    expect(amountText(entry({ type: 'total' }))).toBe('La Luna tapa el Sol del todo.');
    expect(amountText(entry({ kind: 'lunar', type: 'partial', obscuration: 0.47 }))).toBe(
      'La sombra de la Tierra cubre el 47\u00a0% de la Luna.',
    );
    expect(visibilityText(entry({}), 'Europe/Madrid')).toBe(
      'Se ve en parte: de 19:31 a 21:02, con el Sol sobre el horizonte.',
    );
    expect(visibilityText(entry({ complete: true, altitudeDeg: 43.7 }), 'Europe/Madrid')).toBe(
      'Se ve entero; en el máximo, el Sol a 44° de altura.',
    );
    expect(visibilityText(entry({ type: 'total' }), 'Europe/Madrid')).toContain(
      'La fase total ocurre con el Sol bajo el horizonte.',
    );
  });

  it('«Ver en 3D»: la vista Tierra con la sombra o la vista Luna, en el máximo (lo lee el explorador)', () => {
    const solar = view3dLink(entry({}));
    // Con qué eclipse es (fase 10: el explorador lo dice al llegar) y, si no es el Montsec, el lugar.
    expect(solar).toEqual({
      path: '/explorar/tierra',
      queryParams: { fecha: '2026-08-12T18:28:36Z', sombra: '1', eclipse: 'sol-parcial' },
    });
    const query = new URLSearchParams(solar.queryParams).toString();
    const params = parseViewerParams(`?${query}`);
    expect(params.time?.toISOString()).toBe('2026-08-12T18:28:36.000Z');
    expect(params.shadow).toBe(true);
    expect(params.eclipse).toEqual({ kind: 'solar', type: 'partial' });
    expect(view3dLink(entry({}), 'fraga').queryParams['lugar']).toBe('fraga');
    const lunar = view3dLink(entry({ kind: 'lunar', type: 'total' }));
    expect(lunar.path).toBe('/explorar/luna');
    expect(lunar.queryParams['eclipse']).toBe('luna-total');
    expect(view3dLabel(entry({ type: 'total' }), 'Europe/Madrid')).toBe(
      'Ver en 3D el eclipse total de Sol del 12 de agosto de 2026',
    );
  });

  it('la lista generada: los siete lugares, por orden y desde el día del cálculo', () => {
    expect(Object.keys(ECLIPSES_BY_PLACE).sort()).toEqual(SKY_PLACES.map((p) => p.id).sort());
    for (const [id, list] of Object.entries(ECLIPSES_BY_PLACE)) {
      expect(list.length, id).toBeGreaterThan(10);
      const peaks = list.map((e) => Date.parse(e.peak));
      expect(
        [...peaks].sort((a, b) => a - b),
        id,
      ).toEqual(peaks);
      expect(peaks[0] as number, id).toBeGreaterThanOrEqual(
        Date.parse(`${ECLIPSES_FROM}T00:00:00Z`),
      );
    }
  });
});
