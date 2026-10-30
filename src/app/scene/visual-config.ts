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
    /**
     * Relleno de la vista general, en fracción de la luz del Sol. Con los planetas más grandes (fase
     * 4b), 0,3 en lugar de 0,16: un planeta visto por su cara nocturna (Venus o la Tierra en 2032) se
     * lee como un disco sin perder la fase; con 0,45 la fase casi desaparece. Mercurio, de albedo
     * 0,14 y unos 4 px, sigue oscuro con cualquier valor: se encuentra por su nombre y su estela.
     */
    overview: 0.3,
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
  /** El Sol (tarea 6). */
  sun: {
    /**
     * Intensidad de la fotosfera: por encima de 1 en la vista general (el Sol deslumbra) y cerca de 1
     * en primer plano, para que el tone mapping no aplane el oscurecimiento del limbo (el borde queda
     * al ~33 % del centro, cerca del 30 % de la ley de Allen). En la vista general bajó de 2,6 a 1,9
     * con el Sol más grande (fase 4b): así el disco no es un círculo blanco plano.
     */
    intensity: { overview: 1.9, closeUp: 0.85 },
    /**
     * Halo, en radios solares, y su intensidad: hace de resplandor (no hay bloom). En la vista general,
     * con el Sol de 13 unidades (fase 4b; antes 9), el halo mide algo más que antes (~31 unidades).
     */
    halo: { overview: { radii: 2.4, intensity: 1.3 }, closeUp: { radii: 1.7, intensity: 0.45 } },
    /** Granulación en primer plano: amplitud ilustrativa y ritmo (unidades de ruido por segundo). */
    granulation: { amplitude: 0.05, rate: 0.015 },
  },
  /**
   * La Tierra (fase 5). Valores de presentación, ajustados frente a las fotos de EPIC (DSCOVR;
   * `docs/realismo/referencias.md`); los dos primeros, medidos con `scripts/measure-earth-epic.mjs`
   * (nuestra Tierra con la geometría de las tres fotos del 21-06-2016; revisión de la fase 5,
   * hallazgo 5, y R3):
   * - `cloudAlbedo`: el de las nubes (el de la superficie lo pone su textura): con 1, el percentil 98
   *   de las nubes de las tres fotos queda a menos del 3 % del de EPIC (con 0,75, un 20–25 % por
   *   debajo);
   * - `arid`: las tierras áridas. La textura las tiene casi tan claras como las nubes; en las fotos de
   *   EPIC, un tercio. Su brillo se comprime, L / (1 + L / `knee`), en la tierra cálida ((R − B) / L
   *   de `warmFrom` a `warmTo`; los desiertos de la textura, 0,5–0,55): no toca el océano ni el hielo
   *   (neutros, ≈ 0) y apenas los bosques (oscuros). Con `knee` 0,55, la relación de brillo océano /
   *   desierto (el océano medio de las tres fotos entre el desierto medio de Arabia y el Sáhara
   *   occidental, como en la fase 3b) es 0,189, y en EPIC, 0,178 (sin comprimir, 0,076);
   * - `nightLights`: la intensidad de las luces de las ciudades (lineal);
   * - `glint`: el brillo del Sol reflejado en el océano;
   * - `cloudShadow`: cuánto oscurece la sombra de las nubes (0–1);
   * - `scatter`: la luz que dispersa la atmósfera sobre el lado diurno (color sRGB, intensidad en
   *   albedo y refuerzo hacia el limbo); azulada, aclara el océano respecto a la tierra como en EPIC;
   * - `twilight`: el tono de la luz junto al terminador (sRGB);
   * - `cloudDrift`: la deriva ilustrativa de las nubes (fracción de vuelta por segundo de los frames
   *   pintados; se para con movimiento reducido y en las capturas);
   * - `cloudFade`: las nubes se atenúan en los primeros planos, como en Google Earth (revisión del
   *   bloque C, C1: tapaban el Himalaya en su vista guiada). Va con lo que el disco de la Tierra
   *   desborda la parte visible del lienzo (su radio en pantalla entre la mitad del lado más corto de
   *   esa parte): opacidad completa hasta `from` (el disco entero a la vista: las comparativas con
   *   EPIC y la medida de R3 no cambian) y, al acercarse, baja suavemente hasta `min` en `to`. Su
   *   sombra, igual (`cloudOpacity`);
   * - `markers`: los marcadores de los lugares del cielo desde España (vista «España»): su color, el
   *   de su borde (sRGB; los separa del océano y de las nubes) y su diámetro en px CSS.
   */
  earth: {
    cloudAlbedo: 1,
    arid: { knee: 0.55, warmFrom: 0.25, warmTo: 0.4 },
    nightLights: 1.2,
    glint: 0.12,
    cloudShadow: 0.35,
    scatter: { color: '#5b8fe6', intensity: 0.035, limb: 1.5 },
    twilight: '#ffb488',
    cloudDrift: 0.0004,
    cloudFade: { from: 1, to: 2.2, min: 0.3 },
    markers: { color: '#e8c46f', edge: '#38455a', sizePx: 7 },
  },
  /**
   * Radio mínimo en pantalla de los planetas en la vista general (px CSS; revisión del bloque C, C3,
   * decisión de Iván): en un móvil en vertical, los rocosos medían 1–2 px y se veían como marcadores.
   * No cambia ni las posiciones ni las órbitas, y en escritorio casi nunca actúa.
   */
  overviewMinRadiusPx: 2,
  /** Por debajo de este radio en pantalla (px CSS), el halo de una atmósfera no se dibuja: no se vería. */
  atmosphereMinRadiusPx: 2,
  /** Por debajo de este radio en pantalla (px CSS), un cuerpo no aparta las órbitas de su disco. */
  orbitDiscMinRadiusPx: 3,
  /**
   * Un sistema de lunas se resuelve en pantalla cuando cada luna se separa del borde de su planeta
   * de `from` a `to` px (su distancia real en el espacio, en radios del planeta, a la escala de su
   * disco en pantalla). Hasta entonces, ni su disco ni su órbita se dibujan, ni tapan, ni se pueden
   * elegir con el puntero (fase 4b): en la vista general, los sistemas compactos no se ven como
   * bultos pegados a cada planeta, y aparecen al acercarse o al enfocar el planeta. Con los planetas
   * un 25 % más grandes (revisión del bloque C, C2), sus sistemas también lo son en pantalla: los
   * umbrales crecen igual (antes, 8 y 30 px), y en la vista general las lunas aparecen cuando antes
   * (en un sistema local físico, el planeta no ha crecido, y sus lunas aparecen algo más tarde).
   */
  moonResolutionPx: { from: 10, to: 37.5 },
  /** Opacidad de las órbitas de los planetas en la vista general (la de las estelas completas). */
  overviewOrbitOpacity: 0.85,
  /**
   * Estelas de los cuerpos (D34, fase 4b): un arco de su color sobre su órbita, detrás de él, que se
   * desvanece hasta fundirse con ella. La longitud va en fracción de vuelta (no en tiempo: se ven
   * igual a cualquier velocidad), la intensidad multiplica la opacidad de la órbita y el grosor (px
   * CSS) es el de junto al cuerpo, que adelgaza hasta el de la órbita. En las lunas, más cortas y
   * tenues. El desvanecimiento es (1 − s)^falloff, con s de 0 (el cuerpo) a 1 (el final). El grosor
   * completo es el de una órbita con la opacidad de la vista general (`overviewOrbitOpacity`); una
   * órbita más tenue (en segundo plano en las vistas Tierra y Luna, o la del planeta enfocado) lleva
   * una estela más fina en proporción.
   */
  trails: {
    planet: { fraction: 1 / 8, intensity: 0.9, widthPx: 3 },
    moon: { fraction: 1 / 12, intensity: 0.5, widthPx: 2 },
    falloff: 1.5,
  },
  /**
   * Vía Láctea (tarea 5b): sutil, por debajo de las estrellas. Intensidad del panorama y codo de la
   * compresión de sus zonas brillantes (luminancia lineal, L / (1 + L / codo)): el centro galáctico
   * queda en ~0,03 y la banda tenue apenas cambia. Como las estrellas y las órbitas, no sigue la
   * exposición del primer plano (`backgroundGain`): el fondo se ve igual en todas las vistas.
   */
  milkyWay: { intensity: 0.25, knee: 0.05 },
} as const;

/**
 * Ganancia del fondo (Vía Láctea, estrellas y órbitas) para una exposición: la base dividida por ella,
 * de modo que el fondo no cambie al ajustar la exposición al cuerpo de un primer plano (de 0,6 a 6).
 */
export function backgroundGain(exposure: number): number {
  return exposure > 0 ? VISUAL_CONFIG.exposure / exposure : 1;
}

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

/**
 * Presencia de una luna (0–1) según cuánto se separa en pantalla del borde de su planeta
 * (`moonResolutionPx`): `distance` es la distancia entre los dos en el espacio y `parentRadius` el
 * radio del planeta (unidades de escena), y `parentRadiusPx`, su radio en pantalla.
 */
export function moonPresence(
  distance: number,
  parentRadius: number,
  parentRadiusPx: number,
): number {
  if (!(parentRadius > 0) || !Number.isFinite(parentRadiusPx)) return 0;
  const separation = (distance / parentRadius - 1) * parentRadiusPx;
  const { from, to } = VISUAL_CONFIG.moonResolutionPx;
  const t = Math.min(Math.max((separation - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * Opacidad de las nubes de la Tierra (`VISUAL_CONFIG.earth.cloudFade`) según lo que su disco desborda
 * la parte visible del lienzo: `radiusPx`, su radio en pantalla, y `halfVisiblePx`, la mitad del lado
 * más corto de la parte visible (px CSS). 1 con el disco entero a la vista; `min` en los primeros
 * planos.
 */
export function cloudOpacity(radiusPx: number, halfVisiblePx: number): number {
  const { from, to, min } = VISUAL_CONFIG.earth.cloudFade;
  if (Number.isNaN(radiusPx) || !(halfVisiblePx > 0)) return 1;
  const t = Math.min(Math.max((radiusPx / halfVisiblePx - from) / (to - from), 0), 1);
  return 1 - (1 - min) * t * t * (3 - 2 * t);
}

/** Relleno ilustrativo para esa cantidad de primer plano. */
export function fillLight(closeUp: number): number {
  const { overview, closeUp: near } = VISUAL_CONFIG.fill;
  return overview + (near - overview) * closeUp;
}

/**
 * Exposición: la base y, en primer plano, la compensación del brillo del cuerpo enfocado: su albedo
 * (`null`, sin compensación: el Sol; la Tierra, hasta la fase 5, el efectivo de su textura) por el
 * brillo medio de su parte iluminada a la fase con la que se ve, respecto a fase llena
 * (`litBrightness`, de `litDiscBrightness`).
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
