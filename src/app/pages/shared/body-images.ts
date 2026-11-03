import type { ImageLoaderConfig } from '@angular/common';

/**
 * La imagen de la ficha, renderizada por el propio motor (`scripts/render-body-images.mjs`, fase 9) en
 * dos tamaños: `ngSrc` es el id del cuerpo y el ancho pedido elige el fichero.
 */
export const bodyImageLoader = ({ src, width }: ImageLoaderConfig): string =>
  `/img/fichas/${src}-${width !== undefined && width > 360 ? 720 : 360}.webp`;

/**
 * Las imágenes de las tarjetas de los índices: las miniaturas del motor (fase 3c, `public/img/cuerpos/`,
 * 96 px) o, en la tarjeta destacada (`loaderParams.ficha`), la imagen de la ficha, que es más grande.
 */
export const cardImageLoader = (config: ImageLoaderConfig): string =>
  config.loaderParams?.['ficha'] ? bodyImageLoader(config) : `/img/cuerpos/${config.src}.webp`;
