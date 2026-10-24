/**
 * Colores esquemáticos de los cuerpos: los usa la escena mientras cargan las texturas y en las lunas
 * que aún no tienen superficie fotográfica (la fase 7 añade los mosaicos globales del USGS donde
 * existan). Son una decisión de presentación, no datos: se eligen para que cada cuerpo se distinga
 * y se parezca a su aspecto en las imágenes de la NASA, sin pretender ser medidas de color.
 */
import type { BodyId } from '../data/body.model';

export const SCHEMATIC_COLORS: Readonly<Record<BodyId, string>> = {
  sol: '#ffb34d',
  mercurio: '#9a948c',
  venus: '#d9c39a',
  tierra: '#4f7cc4',
  marte: '#c1663c',
  jupiter: '#c9a77f',
  saturno: '#d8c18e',
  urano: '#9ad3dc',
  neptuno: '#4a6fd1',
  luna: '#a8a8a8',
  fobos: '#8a7a6a',
  deimos: '#9a8a7a',
  io: '#d8c25a',
  europa: '#c9b79a',
  ganimedes: '#a39a8c',
  calisto: '#6f665c',
  mimas: '#b9b5ad',
  encelado: '#ececec',
  tetis: '#d5d2cb',
  dione: '#c9c6bf',
  rea: '#c4c1ba',
  titan: '#d5a35a',
  japeto: '#8f7f6a',
  miranda: '#a9aaa9',
  ariel: '#b9b8b4',
  umbriel: '#6f6e6b',
  titania: '#a9a49c',
  oberon: '#8f8a83',
  triton: '#c9b8a8',
  proteo: '#6f6a64',
};
