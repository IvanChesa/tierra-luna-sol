import { parseViewerParams } from '../viewer/viewer-params';
import { eclipseArrival } from './eclipse-arrival';

describe('eclipse-arrival: la llegada desde «Ver en 3D» de un eclipse (crítica de la fase 10)', () => {
  it('dice qué eclipse es, cuándo y desde dónde, y la vuelta lleva al lugar de la lista', () => {
    const solar = parseViewerParams(
      '?fecha=2026-08-12T18:29:29Z&sombra=1&eclipse=sol-total&lugar=fraga',
    );
    expect(solar.eclipse).toEqual({ kind: 'solar', type: 'total' });
    const arrival = eclipseArrival(solar);
    expect(arrival?.text).toMatch(
      /^Eclipse total de Sol del 12 de agosto de 2026, en su máximo visto desde .*Fraga.*\.$/,
    );
    expect(arrival?.queryParams).toEqual({ lugar: 'fraga' });
    // El de Luna, el mismo para todos; desde el Montsec (el de por defecto), la lista sin lugar.
    const lunar = eclipseArrival(
      parseViewerParams('?fecha=2029-12-20T22:41:55Z&eclipse=luna-total'),
    );
    expect(lunar).toEqual({
      text: 'Eclipse total de Luna del 20 de diciembre de 2029, en su máximo.',
      queryParams: {},
    });
  });

  it('sin fecha, o con un eclipse que no existe, nada', () => {
    expect(parseViewerParams('?eclipse=sol-total').eclipse).toBeNull();
    expect(parseViewerParams('?fecha=2026-08-12T18:29:29Z&eclipse=luna-anular').eclipse).toBeNull();
    expect(
      parseViewerParams('?fecha=2026-08-12T18:29:29Z&eclipse=sol-penumbral').eclipse,
    ).toBeNull();
    expect(parseViewerParams('?fecha=2026-08-12T18:29:29Z&eclipse=marte-total').eclipse).toBeNull();
    expect(eclipseArrival(parseViewerParams('?fecha=2026-08-12T18:29:29Z'))).toBeNull();
  });
});
