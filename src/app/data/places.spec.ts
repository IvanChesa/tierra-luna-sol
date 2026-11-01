import {
  DEFAULT_PLACE_ID,
  PLACES,
  PLACES_LICENSE_URL,
  Place,
  SKY_PLACES,
  findPlace,
  placeOptionLabel,
} from './places';

/** Distancia por la superficie (km) con la fórmula del haversine y radio medio 6371 km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const place = (id: string) => {
  const found = findPlace(id);
  if (!found) throw new Error(`Falta ${id}`);
  return found;
};

describe('places', () => {
  it('los siete lugares del cielo desde España (decisión del 26-10) y Lleida, fuera del selector', () => {
    expect(SKY_PLACES.map((p) => p.id)).toEqual([
      'montsec',
      'observatori-fabra',
      'roque-de-los-muchachos',
      'teide',
      'calar-alto',
      'madrid',
      'fraga',
    ]);
    expect(place('lleida').sky).toBe(false);
    // El Montsec, por defecto (decisión de Iván del 26-10).
    expect(DEFAULT_PLACE_ID).toBe('montsec');
    expect(findPlace(DEFAULT_PLACE_ID)?.name).toBe('Parque Astronómico del Montsec');
    expect(findPlace('huesca')).toBeUndefined();
    expect(PLACES_LICENSE_URL).toMatch(/^https:\/\/www\.ign\.es\//);
  });

  it('cada lugar tiene su fuente oficial: el IGN o la web del observatorio', () => {
    const official =
      /^https:\/\/(api-features\.ign\.es\/collections\/(nuc|namedplace)\/items\/\d+\?f=json|www\.iac\.es\/|www\.caha\.es\/|parcastronomic\.cat\/)/;
    // La altitud que no da la fuente del lugar: la estación del Servei Meteorològic de Catalunya o
    // el modelo digital del terreno del IGN (MDT02), consultado en ese mismo punto.
    const altitudeOfficial =
      /^https:\/\/(www\.meteo\.cat\/|servicios\.idee\.es\/wms-inspire\/mdt\?.*REQUEST=GetFeatureInfo.*LAYERS=EL\.ElevationGridCoverage)/;
    for (const p of PLACES as readonly Place[]) {
      expect(p.source, p.id).toMatch(official);
      if (p.altitudeSource) expect(p.altitudeSource, p.id).toMatch(altitudeOfficial);
    }
  });

  it('todos tienen altitud con fuente; la del MDT02, consultada justo en el punto del lugar', () => {
    for (const p of PLACES as readonly Place[]) {
      expect(p.altitudeM, p.id).not.toBeNull();
      // Sin fuente propia de la altitud, la da la del lugar (el IGN o la web del observatorio).
      if (!p.altitudeSource) {
        expect(p.source, p.id).toMatch(/ign\.es|iac\.es|caha\.es/);
        continue;
      }
      if (!p.altitudeSource.includes('servicios.idee.es')) continue;
      // La caja de la consulta (EPSG:4326 en WMS 1.3.0: latitud y longitud), centrada en el lugar.
      const box = new URL(p.altitudeSource).searchParams.get('BBOX')?.split(',').map(Number) ?? [];
      expect(box, p.id).toHaveLength(4);
      const [lat1, lon1, lat2, lon2] = box as [number, number, number, number];
      expect((lat1 + lat2) / 2, p.id).toBeCloseTo(p.latitudeDeg, 8);
      expect((lon1 + lon2) / 2, p.id).toBeCloseTo(p.longitudeDeg, 8);
    }
    expect(place('montsec').altitudeM).toBe(812);
    expect(place('madrid').altitudeM).toBe(649);
  });

  it('las Canarias, una hora por detrás: su zona horaria; la Península, la de Madrid', () => {
    expect(place('teide').timeZone).toBe('Atlantic/Canary');
    expect(place('roque-de-los-muchachos').timeZone).toBe('Atlantic/Canary');
    for (const id of ['montsec', 'observatori-fabra', 'calar-alto', 'madrid', 'fraga']) {
      expect(place(id).timeZone, id).toBe('Europe/Madrid');
    }
    // Las dos zonas son válidas para Intl (y difieren en una hora).
    const hour = (timeZone: string) =>
      Number(
        new Intl.DateTimeFormat('es-ES', { timeZone, hour: 'numeric', hour12: false }).format(
          new Date('2026-01-15T12:00:00Z'),
        ),
      );
    expect(hour('Europe/Madrid') - hour('Atlantic/Canary')).toBe(1);
  });

  it('están donde se espera: en la Península, en La Palma y en Tenerife', () => {
    // Península e islas Baleares fuera: latitud 36–44° N y longitud 9° O a 3,5° E.
    for (const id of ['montsec', 'observatori-fabra', 'calar-alto', 'madrid', 'fraga', 'lleida']) {
      const p = place(id);
      expect(p.latitudeDeg, id).toBeGreaterThan(36);
      expect(p.latitudeDeg, id).toBeLessThan(44);
      expect(p.longitudeDeg, id).toBeGreaterThan(-9);
      expect(p.longitudeDeg, id).toBeLessThan(3.5);
    }
    // Los observatorios canarios, a unos 140 km entre sí (La Palma y Tenerife).
    const roque = place('roque-de-los-muchachos');
    const teide = place('teide');
    const km = haversineKm(
      roque.latitudeDeg,
      roque.longitudeDeg,
      teide.latitudeDeg,
      teide.longitudeDeg,
    );
    expect(km).toBeGreaterThan(120);
    expect(km).toBeLessThan(160);
    // Los observatorios, en lo alto; Fraga y Lleida, en el valle.
    expect(roque.altitudeM).toBe(2396);
    expect(teide.altitudeM).toBe(2390);
    expect(place('calar-alto').altitudeM).toBe(2168);
    expect(place('fraga').altitudeM).toBeLessThan(300);
  });

  it('en los selectores, el nombre y la provincia o, en las islas, la isla', () => {
    expect(placeOptionLabel(place('teide'))).toBe('Observatorio del Teide, Tenerife');
    expect(placeOptionLabel(place('roque-de-los-muchachos'))).toBe(
      'Observatorio del Roque de los Muchachos, La Palma',
    );
    expect(placeOptionLabel(place('montsec'))).toBe('Parque Astronómico del Montsec, Lleida');
    expect(placeOptionLabel(place('madrid'))).toBe('Puerta del Sol, Madrid');
  });

  it('Fraga y Lleida están a unos 25 km en línea recta', () => {
    const fraga = place('fraga');
    const lleida = place('lleida');
    const km = haversineKm(
      fraga.latitudeDeg,
      fraga.longitudeDeg,
      lleida.latitudeDeg,
      lleida.longitudeDeg,
    );
    expect(km).toBeGreaterThan(20);
    expect(km).toBeLessThan(30);
  });
});
