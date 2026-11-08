/** Lo que sobra en el selector: el tipo de lugar, que ya dice el nombre completo. */
const PLACE_PREFIXES = ['Parque Astronómico del ', 'Observatorio del ', 'Observatorio de '];

/**
 * El lugar en los selectores (el cielo y `/eclipses`), corto y entero en su ancho (fase 9c, revisión,
 * hallazgo 6): sin el tipo de lugar y con la provincia o la isla entre paréntesis, «Montsec
 * (Lleida)», «Roque de los Muchachos (La Palma)». El nombre completo, en el título de la tabla de «Esta
 * noche» y en la lista de los eclipses.
 *
 * Sin dependencias: lo importa también la página de los eclipses, que no carga astronomy-engine en su
 * JS inicial.
 */
export function placeShortLabel(place: {
  readonly name: string;
  readonly province: string;
}): string {
  const prefix = PLACE_PREFIXES.find((candidate) => place.name.startsWith(candidate));
  const name = prefix ? place.name.slice(prefix.length) : place.name;
  const area = place.province.split(' (')[0] ?? '';
  return !area || area === name ? name : `${name} (${area})`;
}
