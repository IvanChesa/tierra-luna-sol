import { DEFAULT_PLACE_ID, PLACES, PLACES_LICENSE_URL, findPlace } from './places';

/** Distancia por la superficie (km) con la fórmula del haversine y radio medio 6371 km. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

describe('places', () => {
  it('tiene Fraga (por defecto) y Lleida, cada una con su fuente del IGN', () => {
    expect(PLACES.map((place) => place.id)).toEqual(['fraga', 'lleida']);
    expect(findPlace(DEFAULT_PLACE_ID)?.name).toBe('Fraga');
    expect(findPlace('huesca')).toBeUndefined();
    for (const place of PLACES) {
      expect(place.source).toMatch(
        /^https:\/\/api-features\.ign\.es\/collections\/nuc\/items\/\d+\?f=json$/,
      );
    }
    expect(PLACES_LICENSE_URL).toMatch(/^https:\/\/www\.ign\.es\//);
  });

  it('están en el valle del Segre y el Cinca: latitud ~41,5° N, longitud ~0,4° E, cerca del nivel del mar', () => {
    for (const place of PLACES) {
      expect(place.latitudeDeg).toBeGreaterThan(41.4);
      expect(place.latitudeDeg).toBeLessThan(41.7);
      expect(place.longitudeDeg).toBeGreaterThan(0.2);
      expect(place.longitudeDeg).toBeLessThan(0.8);
      expect(place.altitudeM).toBeGreaterThan(50);
      expect(place.altitudeM).toBeLessThan(300);
    }
  });

  it('Fraga y Lleida están a unos 25 km en línea recta', () => {
    const [fraga, lleida] = PLACES;
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
