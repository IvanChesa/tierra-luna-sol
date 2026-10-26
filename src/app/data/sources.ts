/**
 * Registro de las fuentes de los datos numéricos del catálogo. Cada dato lleva el id de su fuente
 * (`Sourced.source`); los textos llevan directamente la URL de la página que los respalda.
 * También alimenta la página /creditos (fase 9).
 */
export interface Source {
  readonly title: string;
  readonly publisher: string;
  readonly url: string;
  /** Fecha de consulta (AAAA-MM-DD). */
  readonly accessed: string;
}

export const SOURCES = {
  'nssdc-planets': {
    title: 'Planetary Fact Sheet - Metric',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    accessed: '2026-10-23',
  },
  'nssdc-sun': {
    title: 'Sun Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html',
    accessed: '2026-10-23',
  },
  'nssdc-mars': {
    title: 'Mars Fact Sheet (satélites de Marte)',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    accessed: '2026-10-23',
  },
  'nssdc-jovian-satellites': {
    title: 'Jovian Satellite Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html',
    accessed: '2026-10-23',
  },
  'nssdc-saturnian-satellites': {
    title: 'Saturnian Satellite Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html',
    accessed: '2026-10-23',
  },
  'nssdc-uranian-satellites': {
    title: 'Uranian Satellite Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uraniansatfact.html',
    accessed: '2026-10-23',
  },
  'nssdc-neptunian-satellites': {
    title: 'Neptunian Satellite Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptuniansatfact.html',
    accessed: '2026-10-23',
  },
  'jpl-satellite-physical-parameters': {
    title: 'Planetary Satellite Physical Parameters',
    publisher: 'NASA/JPL, Solar System Dynamics',
    url: 'https://ssd.jpl.nasa.gov/sats/phys_par/',
    accessed: '2026-10-23',
  },
  'nssdc-mercury': {
    title: 'Mercury Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-venus': {
    title: 'Venus Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-earth': {
    title: 'Earth Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-jupiter': {
    title: 'Jupiter Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-saturn': {
    title: 'Saturn Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-uranus': {
    title: 'Uranus Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-neptune': {
    title: 'Neptune Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html',
    accessed: '2026-10-24',
  },
  'nssdc-saturn-rings': {
    title: 'Saturnian Rings Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html',
    accessed: '2026-10-24',
  },
  'nssdc-moon': {
    title: 'Moon Fact Sheet',
    publisher: 'NASA, NSSDCA (Goddard Space Flight Center)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    accessed: '2026-10-26',
  },
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
