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
  sun: clouds(
    'Sin accidentes fijos: el Sol gira con su modelo IAU, pero la granulación es ilustrativa.',
  ),
  mercury: surface(
    'Sondas: el cráter Kuiper (11,3° S, 31,5° O) brillante frente a la llanura vecina.',
  ),
  venus: clouds('Capa de nubes de Venus: sin accidentes fijos (la superficie no se ve).'),
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
      'Radios calibrados con los bordes exteriores de los anillos B y A (ficha de la NASA); el borde interior del anillo C cae donde la textura empieza a ser opaca.',
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
  'milky-way': {
    colorSpace: 'srgb',
    alpha: false,
    projection: 'celestial',
    primeMeridianU: null,
    alignment:
      'Cielo ICRF/J2000 con la ascensión recta 0 en el centro y creciendo hacia la izquierda (comprobado con las Nubes de Magallanes y el centro galáctico).',
  },
};
