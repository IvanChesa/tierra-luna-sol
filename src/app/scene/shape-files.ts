// GENERADO por scripts/build-shapes.mjs el 2026-11-07. No se edita a mano.
// Las formas de Fobos y Deimos (fase 9b, D42): rejillas de radios (public/data/shapes/) a partir de los
// DSK del servidor del NAIF (origen, autores y reglas de uso en docs/FUENTES.md).
import type { BodyId } from '../data/body.model';
import type { ShapeFile } from './shapes';

/**
 * Cada forma: su fichero, su rejilla (filas de latitud con los polos y columnas de longitud), el radio
 * mínimo y el máximo (km) que cuantiza, el elipsoide triaxial que mejor se le ajusta y los semiejes
 * publicados (NSSDC: hacia el planeta, a lo largo de la órbita y polar) y el radio del volumen
 * equivalente (km).
 */
export const SHAPE_FILES: Readonly<Partial<Record<BodyId, ShapeFile>>> = {
  fobos: {
    path: 'data/shapes/phobos.bin?v=20de2fa39b',
    bytes: 130340,
    rows: 181,
    columns: 360,
    minKm: 8.195056915283203,
    maxKm: 13.931865692138672,
    semiAxesKm: [13.114, 11.393, 9.273],
    publishedSemiAxesKm: [13, 11.4, 9.1],
    meanRadiusKm: 11.108,
  },
  deimos: {
    path: 'data/shapes/deimos.bin?v=fd9d0229a9',
    bytes: 32780,
    rows: 91,
    columns: 180,
    minKm: 3.5858376026153564,
    maxKm: 8.672192573547363,
    semiAxesKm: [7.779, 6.021, 5.35],
    publishedSemiAxesKm: [7.8, 6, 5.1],
    meanRadiusKm: 6.232,
  },
};
