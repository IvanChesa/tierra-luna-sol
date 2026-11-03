/**
 * Las descriptions de las páginas que no son fichas (fase 9, D25), en un chunk diferido: las pide el
 * resolver de cada ruta (`app.routes.ts`) con un `import()`, así que no van en el bundle inicial y
 * están al día al acabar cada navegación. La portada usa la del sitio (`SITE_CONFIG.description`) y
 * las fichas, la primera frase de su resumen (`data/body-description.ts`).
 */
export const DESCRIPTIONS: Readonly<Record<string, string>> = {
  'explorar-tierra':
    'La Tierra en 3D, orientada según la hora real y con la Luna a su distancia verdadera: su relieve, sus nubes, las luces de la noche y cinco vistas guiadas.',
  'explorar-luna':
    'La Luna en 3D con su relieve real y su libración: la cara visible y la oculta, el polo sur, la luz rasante y un recorrido por sus lugares.',
  cielo:
    'Lo que se ve esta noche desde el Montsec, los grandes observatorios de España y otros lugares, o desde donde estés: los planetas, la Luna, las estrellas y las constelaciones.',
  planetas:
    'Los ocho planetas del sistema solar, con sus datos y sus fuentes, tres curiosidades de cada uno y su distancia de hoy.',
  lunas:
    'La Luna y las veinte lunas de los demás planetas del explorador: sus datos con sus fuentes, tres curiosidades de cada una y su distancia de hoy.',
  eclipses:
    'Los eclipses de Sol y de Luna de los próximos diez años que se ven desde España, con la hora del lugar y «Ver en 3D».',
  creditos:
    'Las fuentes y las licencias de las texturas, los datos, los catálogos y el software del explorador, una a una.',
  'sobre-el-proyecto':
    'Cómo está hecho Tierra Luna Sol: Angular 22, Three.js y astronomy-engine, la arquitectura, los marcos de escala, la precisión y el rendimiento medidos, y la privacidad.',
  '404': 'La página que buscas no existe.',
};
