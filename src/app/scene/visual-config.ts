/**
 * Dirección de arte de la luz (fase 3b, tarea 11; D21): todos los valores visuales del motor en un
 * solo sitio, cada uno con su motivo. La física (D29) dice cómo devuelve la luz cada cuerpo; esto,
 * cómo se expone la imagen, como haría quien hace la foto.
 *
 * - En la **vista general**, los planetas miden unos píxeles y la mitad de ellos se ven por su lado
 *   nocturno: un relleno ilustrativo moderado, desde la cámara, hace que todos se lean.
 * - En **primer plano**, la luz física con un relleno mínimo: el lado nocturno casi negro, como en
 *   las fotos de Cassini o de Juno.
 * - Entre los dos, la mezcla sigue al tamaño del cuerpo enfocado en pantalla: un vuelo la anima solo
 *   y un corte (movimiento reducido) la cambia de golpe.
 * - **Exposición del primer plano**: con el brillo calibrado con el albedo, Mercurio (0,142) o la
 *   Luna (0,12) salen oscuros al lado de Venus (0,689), que es lo real a la misma luz. En un primer
 *   plano, la exposición se ajusta al cuerpo que hay delante, como hace quien hace la foto:
 *   (referencia / brillo)^fuerza, entre un mínimo y un máximo, con el brillo de la parte iluminada:
 *   el albedo por lo que se oscurece esa parte con la fase (una fase creciente se expone más, como
 *   en las fotos). Así los claros (Júpiter, Venus) no se queman y los oscuros no se pierden; en la
 *   vista general, la exposición es la misma para todos.
 */
export type ToneMappingMode = 'neutral' | 'agx' | 'aces';

export const VISUAL_CONFIG = {
  /** Tone mapping: elegido con capturas comparadas (informe de la fase 3b). */
  toneMapping: 'neutral' as ToneMappingMode,
  /** Exposición base (D21). */
  exposure: 1,
  fill: {
    /** Relleno de la vista general, en fracción de la luz del Sol. */
    overview: 0.16,
    /** Relleno del primer plano: deja intuir la forma del lado nocturno sin falsear el terminador. */
    closeUp: 0.004,
  },
  /** Radio en pantalla (px CSS) del cuerpo enfocado entre los que se pasa de vista general a primer plano. */
  closeUpRadiusPx: { from: 8, to: 90 },
  closeUpExposure: {
    /** Albedo geométrico que se expone sin compensación. */
    referenceAlbedo: 0.4,
    /** Cuánto se compensa (0: nada; 1: todo). */
    strength: 0.8,
    /** Exposición mínima (cuerpos claros, como Venus) y máxima (oscuros o en fase creciente). */
    min: 0.6,
    max: 6,
  },
} as const;

/** Cuánto de primer plano hay (0: vista general; 1: primer plano), según el radio del foco en pantalla. */
export function closeUpAmount(focusRadiusPx: number | null): number {
  if (focusRadiusPx === null || !Number.isFinite(focusRadiusPx))
    return focusRadiusPx === null ? 0 : 1;
  const { from, to } = VISUAL_CONFIG.closeUpRadiusPx;
  const t = Math.min(
    Math.max((Math.log(focusRadiusPx) - Math.log(from)) / (Math.log(to) - Math.log(from)), 0),
    1,
  );
  return t * t * (3 - 2 * t);
}

/** Relleno ilustrativo para esa cantidad de primer plano. */
export function fillLight(closeUp: number): number {
  const { overview, closeUp: near } = VISUAL_CONFIG.fill;
  return overview + (near - overview) * closeUp;
}

/**
 * Exposición: la base y, en primer plano, la compensación del brillo del cuerpo enfocado: su albedo
 * geométrico (`null`: sin compensación, como la Tierra hasta la fase 5) por el brillo medio de su
 * parte iluminada a la fase con la que se ve, respecto a fase llena (`litBrightness`, de
 * `litDiscBrightness`).
 */
export function exposureFor(
  closeUp: number,
  focusAlbedo: number | null,
  litBrightness = 1,
): number {
  const base = VISUAL_CONFIG.exposure;
  if (focusAlbedo === null || !(focusAlbedo > 0)) return base;
  const { referenceAlbedo, strength, min, max } = VISUAL_CONFIG.closeUpExposure;
  const brightness = focusAlbedo * Math.max(litBrightness, 1e-3);
  const compensation = Math.min(Math.max((referenceAlbedo / brightness) ** strength, min), max);
  return base * (1 + (compensation - 1) * closeUp);
}
