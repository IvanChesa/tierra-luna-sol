import { parseViewerParams } from '../viewer/viewer-params';
import { eclipseArrival, eclipseIgnoredWarning } from './eclipse-arrival';

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

  it('solo si la fecha es el máximo de ese eclipse desde ese lugar (fase 11b, F7)', () => {
    // Un día sin eclipse: la web no puede decir que lo hay.
    const invented = parseViewerParams('?fecha=2030-01-01T00:00:00Z&eclipse=sol-total');
    expect(invented.eclipse).toEqual({ kind: 'solar', type: 'total' });
    expect(eclipseArrival(invented)).toBeNull();
    // El día del eclipse, pero con otro tipo, o lejos de su máximo (una hora antes).
    expect(
      eclipseArrival(
        parseViewerParams('?fecha=2026-08-12T18:29:29Z&eclipse=sol-anular&lugar=fraga'),
      ),
    ).toBeNull();
    expect(
      eclipseArrival(
        parseViewerParams('?fecha=2026-08-12T17:29:29Z&eclipse=sol-total&lugar=fraga'),
      ),
    ).toBeNull();
    expect(
      eclipseArrival(parseViewerParams('?fecha=2029-12-20T22:41:55Z&eclipse=luna-parcial')),
    ).toBeNull();
    // Al segundo de la lista, con un minuto de margen.
    expect(
      eclipseArrival(parseViewerParams('?fecha=2029-12-20T22:42:40Z&eclipse=luna-total')),
    ).not.toBeNull();
    expect(eclipseIgnoredWarning({ kind: 'solar', type: 'total' })).toBe(
      'El eclipse «sol-total» no es el de esa fecha y ese lugar, y se ha ignorado. Los que se ven desde España están en «Eclipses».',
    );
  });
});
