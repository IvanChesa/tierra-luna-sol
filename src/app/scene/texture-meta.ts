/**
 * Lo que la escena necesita saber de cada textura y no sale del fichero (D18): espacio de color,
 * alfa, proyección y alineación del meridiano 0. La alineación de los mapas de superficie la
 * comprueba `scripts/build-textures.mjs` con sondas en accidentes conocidos (falla si el mapa
 * estuviera girado), y la orientación del modelo la prueba `texture-meta.spec.ts`.
 */
import { SATURN_RING_STRIP_KM } from './texture-files';
import type { TextureId, TextureMeta } from './textures';

const surface = (alignment: string): TextureMeta => ({
  colorSpace: 'srgb',
  alpha: false,
  projection: 'equirectangular',
  primeMeridianU: 0.5,
  alignment,
});

/** Un mosaico en gris de una luna (fase 7): la escena lo tiñe con su color esquemático. */
const grayMosaic = (alignment: string): TextureMeta => ({ ...surface(alignment), grayscale: true });

const clouds = (alignment: string): TextureMeta => ({
  colorSpace: 'srgb',
  alpha: false,
  projection: 'equirectangular',
  primeMeridianU: null,
  alignment,
});

const earthData = (colorSpace: 'srgb' | 'data'): TextureMeta => ({
  colorSpace,
  alpha: false,
  projection: 'equirectangular',
  primeMeridianU: 0.5,
  alignment: 'Mismo encuadre que el mapa de día (Solar System Scope): Greenwich en el centro.',
});

export const TEXTURE_META: Readonly<Record<TextureId, TextureMeta>> = {
  mercury: surface(
    'Sondas: el cráter Kuiper (11,3° S, 31,5° O) brillante frente a la llanura vecina.',
  ),
  venus: clouds('Capa de nubes de Venus: sin accidentes fijos (la superficie no se ve).'),
  // Venus bajo las nubes (fase 9b, D44): el radar de Magellan, en gris, centrado en su longitud 0. La
  // escena lo pide solo al pulsar «Bajo las nubes» (scene/venus-radar.ts).
  'venus-radar': surface(
    'Mosaico C3-MIDR del radar de Magellan, con su georreferencia (de −180° a 180°, longitud este; usgs-mosaic.mjs). Sondas: Maat Mons (0,5° N, 194,6° E), Sapas Mons (8,5° N, 188,3° E) y Maxwell Montes (65,2° N, 3,3° E), más claros en el radar que lo que los rodea; girado 180° o reflejado, no pasan.',
  ),
  'earth-day': surface('Sondas: el Sáhara (23° N, 10° E) claro frente al Pacífico (0°, 150° O).'),
  'earth-night': earthData('srgb'),
  'earth-clouds': earthData('data'),
  'earth-normal': earthData('data'),
  'earth-specular': earthData('data'),
  moon: surface(
    'Mapa del CGI Moon Kit «centrado en 0° de longitud» (NASA SVS 4720). Sondas: Mare Imbrium y Mare Crisium oscuros frente a las tierras altas.',
  ),
  mars: surface(
    'Sondas: Syrtis Major (8° N, 70° E) y Acidalia (47° N, 30° O) oscuros frente a Hellas y Tharsis.',
  ),
  jupiter: clouds('Bandas de nubes: sin meridiano observable (el Sistema III es magnético).'),
  saturn: clouds('Bandas de nubes: sin meridiano observable.'),
  'saturn-rings': {
    colorSpace: 'srgb',
    alpha: true,
    projection: 'ring-strip',
    primeMeridianU: null,
    ringRadiiKm: SATURN_RING_STRIP_KM,
    alignment:
      'La τ de la ocultación de β Centauri de Cassini UVIS (COUVIS_8001) por radio, de 74 000 a 141 000 km: sus divisiones (Colombo, Maxwell, Huygens, Encke y Keeler) y los bordes de los anillos C, B y A y el núcleo del F, comprobados con sus radios publicados (PDS Ring-Moon Systems Node; data/saturn-rings.ts).',
  },
  uranus: clouds('Sin accidentes: color casi uniforme.'),
  neptune: clouds('Bandas de nubes: sin meridiano observable.'),
  'mercury-normal': {
    colorSpace: 'data',
    alpha: false,
    projection: 'equirectangular',
    primeMeridianU: 0.5,
    alignment:
      'Normales del modelo de elevación global de MESSENGER (USGS, 665 m v2): longitud del borde izquierdo de su georreferencia (proyección centrada en 180°). build-textures.mjs comprueba que sus pendientes coinciden con los bordes de la textura de color de Mercurio solo sin girar.',
  },
  'mars-normal': {
    colorSpace: 'data',
    alpha: false,
    projection: 'equirectangular',
    primeMeridianU: 0.5,
    alignment:
      'Normales del MOLA MEGDR (16 px/°), de 0–360° E desplazado para centrar el meridiano 0. Sondas: el punto más alto cae en Olympus Mons y el más bajo en Hellas; además, sus pendientes coinciden con los bordes de la textura de color de Marte solo sin girar.',
  },
  'moon-normal': {
    colorSpace: 'data',
    alpha: false,
    projection: 'equirectangular',
    primeMeridianU: 0.5,
    alignment:
      "Normales de la elevación del LOLA (CGI Moon Kit, NASA SVS 4720, «centrada en 0° de longitud»). Sondas: el punto más alto cae junto a Engel'gardt y el más bajo en Antoniadi (Gazetteer, IAU/USGS); las paredes de Copérnico se inclinan hacia su centro; y sus pendientes coinciden con los bordes de la textura de color solo sin girar.",
  },
  'moon-elevation': {
    colorSpace: 'data',
    alpha: false,
    projection: 'equirectangular',
    primeMeridianU: 0.5,
    mipmaps: false,
    alignment:
      'La misma elevación del LOLA que las normales de la Luna, en 16 bits empaquetados en R y G (D15) y sin pérdidas (build-textures.mjs comprueba que se decodifica igual byte a byte).',
  },
  'moon-normal-poles': {
    colorSpace: 'data',
    alpha: false,
    projection: 'polar-caps',
    primeMeridianU: null,
    alignment:
      'Normales de los modelos polares del LOLA (PDS, estereográfica de 75° al polo, 240 m por píxel), en los ejes de su plano. build-textures.mjs elige la orientación de cada modelo comparando su elevación con la equirrectangular entre 76° y 79° (correlación de 0,999 en el sur y 0,993 en el norte), comprueba que sus normales, llevadas al este–norte como en el shader, casan con las equirrectangulares allí y que Shackleton (Gazetteer, IAU/USGS) sale como un hoyo con las paredes hacia dentro.',
  },
  // Las lunas (fase 7): mosaicos globales del USGS Astrogeology, alineados con su georreferencia
  // (scripts/usgs-mosaic.mjs) y comprobados con rasgos con nombre del Gazetteer (IAU/USGS).
  phobos: grayMosaic(
    'Mosaico Viking de Fobos del USGS (40 px/°, control del DLR), con longitudes este de −180° a 180°: alineado con su georreferencia. Sus rasgos se ven por el sombreado, no por el brillo: sin sondas.',
  ),
  // Ío, en color (revisión del bloque D, D1): sin tinte.
  io: surface(
    'Mosaico en color de Ío del USGS (Galileo SSI y Voyager, «Color Merged», 1 km), alineado con su georreferencia. Sonda: Loki Patera (Gazetteer, Feature/3459), más oscura que su entorno; con el mapa girado 180° o reflejado, falla.',
  ),
  europa: grayMosaic(
    'Mosaico Voyager–Galileo SSI de Europa del USGS (500 m), alineado con su georreferencia. Sondas: Pwyll (Feature/4878), clara, y Thrace Macula (Feature/5984), oscura; con el mapa girado 180° o reflejado, falla alguna.',
  ),
  ganymede: grayMosaic(
    'Mosaico Voyager–Galileo SSI de Ganímedes del USGS (1 km), alineado con su georreferencia. Sondas: Osiris (Feature/4509) y Tros (Feature/6091), claras; con el mapa girado 180° o reflejado, falla alguna.',
  ),
  callisto: grayMosaic(
    'Mosaico Voyager–Galileo SSI de Calisto del USGS (1 km), alineado con su georreferencia. Sondas: Burr (Feature/927) y Lofn (Feature/3451), claras; con el mapa girado 180° o reflejado, falla alguna.',
  ),
  // Las de Saturno, normalizadas en brillo y dominadas por el sombreado: sondas de borde de cráteres.
  mimas: grayMosaic(
    'Mapa de Mimas del DLR (Cassini ISS, 16 px/°) en el PDS (COISS_3006), alineado con su etiqueta. Sondas de borde: Gareth (Feature/2106) e Iseult (Feature/2729); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  enceladus: grayMosaic(
    'Mosaico Cassini de Encélado del USGS (110 m), alineado con su georreferencia. Sondas de borde: Bahman (Feature/14604), Parwez (Feature/14615) y Marjanah (Feature/14235); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  tethys: grayMosaic(
    'Mosaico Cassini de Tetis del USGS (293 m), alineado con su georreferencia. Sondas de borde: Oenops (Feature/14427), Polyphemus (Feature/4788) y Philoetius (Feature/14429); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  dione: grayMosaic(
    'Mosaico Cassini–Voyager de Dione del USGS (154 m), alineado con su georreferencia. Sondas de borde: Catillus (Feature/1079), Halys (Feature/2335) y Eumelus (Feature/14352); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  rhea: grayMosaic(
    'Mosaico Cassini–Voyager de Rea del USGS (417 m), alineado con su georreferencia. Sondas de borde: Pachacamac (Feature/14683), Inmar (Feature/14672) y Pouliuli (Feature/14685); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  iapetus: grayMosaic(
    'Mosaico Cassini–Voyager de Jápeto del USGS (783 m), alineado con su georreferencia. Sondas de borde: Valdebron (Feature/14489) y Dapamort (Feature/14462); con el mapa girado 180° o reflejado, falla alguna.',
  ),
  triton: grayMosaic(
    'Canal naranja del mosaico Voyager 2 de Tritón del USGS (600 m), alineado con su georreferencia; el norte que no vio Voyager 2, recreado a partir de su propio terreno (D45, fase 9b). Sondas: Doro Macula (Feature/1583), Namazu Macula (Feature/4125) y Kikimora Maculae (Feature/3029), oscuras; con el mapa girado 180° o reflejado, fallan.',
  ),
  // Deimos y las cinco de Urano (fase 9b, D42 y D43): los mapas del JPL, sin georreferencia; su
  // longitud, la que dan por buena sus sondas (scripts/build-textures.mjs).
  deimos: grayMosaic(
    'Mapa del JPL de Deimos (de las imágenes de las Viking, procesadas por el USGS; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas (build-textures.mjs); lo que su carta no cartografía (su fondo claro), recreado, y lo visto de lejos, con detalle (D45).',
  ),
  miranda: grayMosaic(
    'Mapa del JPL de Miranda (del USGS, con las imágenes de la Voyager 2; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas del Gazetteer (build-textures.mjs); el norte que no se vio, recreado (D45).',
  ),
  ariel: grayMosaic(
    'Mapa del JPL de Ariel (del USGS, con las imágenes de la Voyager 2; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas del Gazetteer (build-textures.mjs); el norte que no se vio, recreado (D45).',
  ),
  umbriel: grayMosaic(
    'Mapa del JPL de Umbriel (del USGS, con las imágenes de la Voyager 2; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas del Gazetteer (build-textures.mjs); el norte que no se vio, recreado (D45).',
  ),
  titania: grayMosaic(
    'Mapa del JPL de Titania (del USGS, con las imágenes de la Voyager 2; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas del Gazetteer (build-textures.mjs); el norte que no se vio, recreado (D45).',
  ),
  oberon: grayMosaic(
    'Mapa del JPL de Oberón (del USGS, con las imágenes de la Voyager 2; 4 px/°), sin georreferencia: su longitud, la que eligen sus sondas del Gazetteer (build-textures.mjs); el norte que no se vio, recreado (D45).',
  ),
  // Proteo (fase 9b, D45): un campo de cráteres generado (ilustrativo), con su mapa de normales.
  proteus: grayMosaic(
    'Generado (scripts/lib/crater-field.mjs): un campo de cráteres sobre la esfera, ilustrativo; sin accidentes reales que alinear.',
  ),
  'proteus-normal': {
    colorSpace: 'data',
    alpha: false,
    projection: 'equirectangular',
    primeMeridianU: 0.5,
    alignment:
      'Normales de la elevación del mismo campo de cráteres que «proteus», en el mismo encuadre (la longitud 0 en el centro).',
  },
  'milky-way': {
    colorSpace: 'srgb',
    alpha: false,
    projection: 'galactic',
    primeMeridianU: null,
    alignment:
      'Panorama de ESO en coordenadas galácticas, con el centro galáctico en el centro y la longitud creciendo hacia la izquierda. build-textures.mjs comprueba el centro frente a los polos y al anticentro y la Gran Nube de Magallanes en sus coordenadas de SIMBAD (frente al punto simétrico).',
  },
};
