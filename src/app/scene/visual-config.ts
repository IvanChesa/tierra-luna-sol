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
  /**
   * El Sol (fase 3b, tarea 6; fase 9b, D41: «real y luminoso», el de la luz visible del HMI del SDO; y
   * D46: en el explorador, realzado). Todo lo que no es la ley del limbo ni la rotación de las manchas
   * (`ephemeris/sun.ts`) es **ilustrativo**: la intensidad, el halo, la granulación, las manchas, las
   * fáculas, la corona, el bloom y todo el realzado.
   */
  sun: {
    /**
     * Intensidad de la fotosfera. Con el Sol realzado (D46, segunda vuelta, 08-11), 1 en la vista
     * general y en primer plano: así el disco no pasa de la compresión del tone mapping neutro, que lo
     * lavaba a amarillo crema (en la vista general era 2,2: el disco salía casi blanco), y se ve el mismo
     * naranja de cerca y de lejos. En la 9b.c (D41), 2,2 y 1,1: el centro casi blanco y el borde dorado.
     */
    intensity: { overview: 1, closeUp: 1 },
    /**
     * Solo en captura, para medir el limbo (`?medida=limbo`): la intensidad con la que todo el disco
     * queda por debajo de la compresión del tone mapping neutro (su pico, por debajo de 0,76): así la
     * captura da I(μ)/I(1) de cada canal sin deformar (`scripts/measure-sun.mjs`).
     */
    measureIntensity: 0.7,
    /**
     * El resplandor ancho del halo, en radios solares, y su intensidad. Con el Sol realzado (D46,
     * segunda vuelta), solo en la vista general y muy tenue (como la referencia, que tiene una luz
     * débil hasta unos 3 radios): el resplandor de verdad es el borde fino y los rayos
     * (`enhanced.rim` y `enhanced.rays`). De cerca, sin él (la referencia es negra a 1,2 radios). Antes,
     * 1,3 en la vista general: una mancha grande y pálida que lavaba el disco. `withBloom`, lo que se
     * atenúa si hay bloom (el factor).
     */
    halo: {
      overview: { radii: 2.4, intensity: 0.035 },
      closeUp: { radii: 1.8, intensity: 0 },
      withBloom: 0.55,
    },
    /**
     * Granulación en primer plano (ilustrativa): amplitud, ritmo (unidades de ruido por segundo) y
     * granos por radio del Sol. Con el Sol realzado, fina (ruido de gradiente en dos octavas, de unos
     * 2,5 px con el Sol de cerca): la amplitud, en unidades de la estructura (su ganancia en
     * `enhanced.structure.gain`). En la 9b.c, celdas de Worley de 40 por radio (un mosaico).
     */
    granulation: { amplitude: 1.7, rate: 0.04, scale: 80 },
    /**
     * Las manchas (ilustrativas, `sunspotsAt`): cuántas a la vez, su banda de latitud (grados), su vida
     * (días), el radio de su umbra (grados heliográficos) y lo que tardan en aparecer y en apagarse
     * (fracción de su vida); el brillo de la umbra y de la penumbra (en fracción de la fotosfera) y el
     * radio de la penumbra (en radios de la umbra). Sin una fuente del ciclo solar con licencia
     * compatible (las de SILSO son CC BY-NC), su número es fijo y moderado. Con el Sol realzado, la umbra
     * y la penumbra algo más oscuras (0,1 y 0,6; antes, 0,18 y 0,68), de bordes suaves y pardas
     * (`enhanced.spots`), como las de la referencia.
     */
    spots: {
      count: 8,
      latitudeDeg: [6, 32] as readonly [number, number],
      lifeDays: [14, 45] as readonly [number, number],
      umbraDeg: [0.5, 1.5] as readonly [number, number],
      fadeIn: 0.2,
      fadeOut: 0.3,
      umbra: 0.1,
      penumbra: 0.6,
      penumbraRatio: 2.4,
    },
    /**
     * Lo que aclaran las fáculas alrededor de las manchas, en el limbo (ilustrativo). Con el Sol
     * realzado, 0,25 (antes, 0,6: un anillo claro alrededor de cada mancha, como un ojo).
     */
    faculae: 0.25,
    /**
     * La corona en primer plano (ilustrativa: la real solo se ve en un eclipse): su brillo y su forma,
     * de 0 (la del mínimo del ciclo, con serpentinas) a 1 (la del máximo, redonda). Con el Sol realzado,
     * sin ella (D46, segunda vuelta: de cerca, más allá del borde fino y de los rayos, el fondo; la
     * corona era un velo pálido hasta 3 radios). La de la totalidad de `/cielo` es otra (`sky/`).
     */
    corona: { closeUp: 0, roundness: 0.35 },
    /**
     * El bloom, solo del Sol (fase 9b, D41; antes, opcional en la fase 10), en los niveles alto y medio, sobre
     * un render del Sol con los cuerpos que lo tapan en negro (`scene/sun-bloom.ts`), en la vista general
     * y en primer plano (se interpola con el primer plano del Sol): si está encendido (`enabled`), su
     * fuerza y el peso de cada capa de su desenfoque, de la más estrecha a la más ancha (sigmas de unos
     * 8, 28, 80, 210 y 515 px CSS).
     * - **Apagado con el Sol realzado** (D46, segunda vuelta, 08-11): Iván quiere «un halo fino naranja
     *   rojizo pegado al borde, con rayos cortos y finos, no una mancha grande y pálida». El bloom
     *   desenfoca el disco entero: su resplandor caía también sobre el disco (lo aclaraba hacia el
     *   amarillo y lo lavaba en la vista general) y, ancho y del color del disco, era la mancha pálida.
     *   El borde fino y los rayos los pinta el halo (`enhanced.rim` y `enhanced.rays`), igual en los
     *   tres niveles y sin sus 15 pasadas. Se queda aquí, apagado, por si se vuelve al Sol de D41.
     * - En la vista general, un núcleo fuerte junto al disco y unas alas débiles: el Sol deslumbra sin
     *   velar la pantalla.
     * - En primer plano, mucho menos y solo las capas estrechas: el resplandor de un disco crece con su
     *   área (con 400 px de diámetro, unas 20 veces el de la vista general) y, con la misma forma, las
     *   alas velaban todo el lienzo y el resplandor sobre el disco borraba su limbo.
     */
    bloom: {
      enabled: false as boolean,
      overview: { strength: 0.8, factors: [1, 0.5, 0.2, 0.05, 0.012] },
      closeUp: { strength: 0.1, factors: [1, 0.35, 0.04, 0, 0] },
    },
    /**
     * **El Sol realzado del explorador** (fase 9b, D46, decisión de Iván del 06-11: «quiero uno más como
     * el de la imagen»), ilustrativo y avisado: con luz visible normal el Sol es blanco (D41: el de
     * `/cielo`, otro shader, y el de `?medida=limbo`, que no cambian); aquí, naranja, como en las
     * imágenes con filtro de los observatorios y como la referencia (earth.ethanplus.ai). **Segunda
     * vuelta** (08-11, Iván: «las manchas estas que sobresalen parecen tumores… intentemos basarnos en el
     * sol del proyecto ejemplo»): medido frente a capturas propias de la referencia
     * (`scripts/measure-d46.mjs`, en CIELAB: de cerca, en la mediana del disco, L\* 77,8 · C\* 53,6 ·
     * h 80,5°, de L\* 68 a 84 del 5 al 95 %; lo claro, h 86° y C\* 45; lo oscuro, h 72° y C\* 60;
     * `docs/informes/fase-9b.md`, §2). Los colores, lineales (antes del tone mapping neutro, con
     * la intensidad de arriba).
     * - `palette`: el color del centro del disco y el del borde (más rojo: el borde, algo más oscuro y
     *   rojizo), mezclados de μ = `muEdges[0]` a `muEdges[1]`, con el brillo del oscurecimiento del limbo
     *   por canal de la 9b.c con sus exponentes por `limbSoftening` (la misma ley, más suave: con los de
     *   la 9b.c, a μ 0,44 el disco bajaba al 66 % y en la referencia baja al 83 %; con 0,55, al 80 %).
     *   Hasta el último 0,5 % del radio (μ < 0,1), el brillo de μ = 0,1: sin el borde negro y dentado.
     * - `structure`: las manchas claras y oscuras a escala media y grande, procedurales en el shader:
     *   ruido de gradiente propio en cinco octavas (`octaves`: la frecuencia de la primera, 2,2 ciclos
     *   por radio; el peso de cada una frente a la anterior; y la forma, que aplana algo lo intermedio
     *   para que queden manchas sueltas sobre un naranja casi uniforme), retorcido por un campo ancho que
     *   cambia con el tiempo (la superficie fluye). Su amplitud y lo que mueve cada canal por unidad
     *   (`gain`, exp(valor · ganancia)): en lo claro, más el verde y el azul (más amarillo, como lo claro
     *   de la referencia); en lo oscuro, más todavía (más rojo). Con un límite suave (`limits`, tanh) de
     *   lo que oscurece y aclara: sin él, en algunos instantes salían zonas pardas (el 5 % más oscuro del
     *   disco, hasta L\* 57) y el contraste bajaba de golpe al calmarse el ruido. Su ritmo, en unidades
     *   de ruido por segundo de reloj de pared mientras se pinta (quieta con movimiento reducido y en las
     *   capturas): en 6 s se ve cambiar, en un minuto cambia del todo. Con estas cifras, el contraste a
     *   gran escala (σL\* sin el perfil del limbo) queda de 4,9 a 5,8 en diez instantes de cinco minutos
     *   (la referencia, 4,13; antes del límite, de 4,1 a 6,3).
     * - `spots`: lo que oscurece cada canal la sombra de una mancha (la sombra elevada a cada valor): el
     *   verde y el azul, más, para que lo oscuro sea pardo rojizo y no oliva.
     * - `glow`: el color lineal del resplandor ancho (`halo`, en la vista general), el exponente de su
     *   caída ((1 − r)^exponente hasta el borde del cuadrado del halo), el resplandor suave naranja que
     *   envuelve el disco, algo más ancho que el borde (`soft`: su brillo, su color y su ancho, en radios;
     *   como en la referencia, un naranja suave alrededor del disco además del borde fino; de cerca, a
     *   0,1 radios del limbo ya casi no está, y no llega a los planetas) y el de la corona (sin ella
     *   ahora).
     * - `rim`: el borde fino naranja rojizo pegado al limbo, fuera del disco: su brillo, su color y su
     *   forma, dos caídas exponenciales (el peso de la ancha y los dos anchos, en radios del disco: de
     *   cerca, unos 2 y 7 px), con un ancho mínimo en píxeles para cuando el Sol se ve pequeño. Como el de
     *   la referencia: a 1,01 radios, L\* ≈ 25 y h ≈ 45°; a 1,05, L\* ≈ 15.
     * - `rays`: los rayos cortos y finos (dos capas, 283 y 157 por vuelta, cada uno con su longitud, su
     *   brillo y una ligera curva, que cambian despacio): su brillo, su color y su longitud media (en
     *   radios). Cuando una celda mide menos de 2 px (en la vista general), se funden en su media.
     * - `prominences`: los bucles de plasma del limbo, solo de cerca: pocos (3), cada uno un manojo de
     *   14 hilos finos (de ~1 px) y translúcidos en arco entre dos pies en el limbo, que se desvanecen
     *   con la altura, respiran, se mecen y se encienden y se apagan despacio, cada uno a su ritmo (en
     *   lugar de los bultos sólidos de la primera vuelta, «tumores»): su brillo, su color y su ritmo
     *   (segundos de tiempo de los bucles por segundo de reloj de pared). Su tiempo mueve también los
     *   rayos.
     */
    enhanced: {
      palette: {
        center: [0.957, 0.53, 0.14] as readonly [number, number, number],
        limb: [1.175, 0.52, 0.125] as readonly [number, number, number],
        muEdges: [0, 0.6] as readonly [number, number],
        limbSoftening: 0.55,
      },
      structure: {
        amplitude: 6,
        octaves: { frequency: 2.2, persistence: 0.62, shape: 0.5 },
        gain: {
          bright: [0.17, 0.33, 0.45] as readonly [number, number, number],
          dark: [0.2, 0.45, 0.7] as readonly [number, number, number],
        },
        limits: { dark: 1.1, bright: 2 },
        rate: 0.05,
      },
      spots: { warmth: [1, 1.6, 2.2] as readonly [number, number, number] },
      glow: {
        halo: [1, 0.6, 0.3] as readonly [number, number, number],
        exponent: 1.2,
        soft: {
          intensity: 0.05,
          color: [1, 0.42, 0.12] as readonly [number, number, number],
          widthRadii: 0.09,
        },
        corona: [1, 0.58, 0.28] as readonly [number, number, number],
      },
      rim: {
        intensity: 0.5,
        color: [1, 0.2, 0.04] as readonly [number, number, number],
        shape: { wide: 0.22, narrowRadii: 0.01, wideRadii: 0.035 },
        minPixels: 1.2,
      },
      rays: {
        intensity: 0.05,
        color: [1, 0.24, 0.05] as readonly [number, number, number],
        lengthRadii: 0.05,
      },
      prominences: {
        intensity: 1,
        color: [0.7, 0.15, 0.025] as readonly [number, number, number],
        rate: 1,
      },
    },
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
   * - `nightLights`: la intensidad de las luces de las ciudades (lineal), del mapa en gris de Black
   *   Marble 2016 (fase 9b, D40: negro fuera de las luces);
   * - `nightTint`: el tono de esas luces (rgb lineal de luminancia 1), el medio de las luces de la
   *   textura de noche de Solar System Scope que se usaba antes (sus píxeles de luminancia lineal de más
   *   de 0,1): un amarillo anaranjado, como el alumbrado en las fotos nocturnas desde la ISS. El suelo
   *   sin luces de esa textura tenía una base azul marino (de media, (7, 9, 22) en sRGB) que la
   *   exposición del primer plano destapaba;
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
   *   sombra, igual (`cloudOpacity`). Con la Tierra realzada (fase 9b, D46), `min` baja de 0,3 a
   *   0,15: de cerca, la textura de las nubes no da para el zoom y sus restos salían como velos
   *   borrosos;
   * - `markers`: los marcadores de los lugares del cielo desde España (vista «España»): su color, el
   *   de su borde (sRGB; los separa del océano y de las nubes) y su diámetro en px CSS.
   */
  earth: {
    cloudAlbedo: 1,
    arid: { knee: 0.55, warmFrom: 0.25, warmTo: 0.4 },
    nightLights: 1.2,
    nightTint: [1.2, 0.993, 0.485] as readonly [number, number, number],
    glint: 0.12,
    cloudShadow: 0.35,
    scatter: { color: '#5b8fe6', intensity: 0.035, limb: 1.5 },
    twilight: '#ffb488',
    cloudDrift: 0.0004,
    cloudFade: { from: 1, to: 2.2, min: 0.15 },
    markers: { color: '#e8c46f', edge: '#38455a', sizePx: 7 },
    /**
     * **La Tierra realzada del explorador** (fase 9b, D46, decisión de Iván del 06-11: «La tierra
     * también se tiene que mejorar»), ilustrativa y avisada, como la referencia (earth.ethanplus.ai, con
     * las mismas texturas de Solar System Scope): manda sobre los ajustes de EPIC de arriba donde se
     * contradicen (`scripts/measure-earth-epic.mjs` queda como registro). Calibrada frente a capturas
     * propias de la referencia (`scripts/measure-d46.mjs --solo=tierra`, en CIELAB: el 15-01-2026, con
     * África y Europa de día; `docs/informes/fase-9b.md`, §2). La cara nocturna (D40) y las
     * luces no cambian: su relleno de la vista general y las nubes que tapan las luces siguen con el
     * albedo y las nubes de la fase 5.
     * - `ocean`: el albedo lineal del océano (en la máscara de agua de siempre), un azul vivo, y lo que
     *   conserva de la variación de brillo de la textura (su luminancia en el agua, 0,0477 de mediana, y
     *   el exponente: 0, nada; 1, en proporción): el Atlántico sur y el Índico, en el tono de la
     *   referencia (h 275–280°, frente a 277–286°) y con más croma (33 frente a 21–27).
     * - `clouds`: la cobertura de la textura, llevada a smoothstep(`from`, `to`) × `max`: sin las nubes
     *   finas ni los velos (de cerca, la textura no da para ellos y salían borrosos) y con menos
     *   opacidad, sin borrar los grandes sistemas; los continentes se leen enteros (el 1,5 % del disco
     *   con nubes, frente al 9,8 % de antes y el 0,7 % de la referencia). Su sombra, igual.
     * - `glint`: el reflejo del Sol en el agua: un lóbulo ancho (`wide`, su peso; `exponent`: con 12, la
     *   mitad de su brillo a unos 19° de arco del punto del reflejo, un tercio del radio del disco) y de
     *   su tono (`tint`, lineal: el cian del agua que lo refleja, como en la referencia), además del
     *   núcleo de siempre (`core`, blanco), por Fresnel (Schlick con la F0 del agua, `f0`, relativo a la
     *   incidencia normal y hasta `fresnelMax` veces más hacia el borde), con su brillo en la incidencia
     *   normal (`intensity`, en lugar del `glint` de arriba): grande, suave y sin quemar a blanco.
     * - `land`: la saturación de la tierra (1: la de la textura), la rodilla de la compresión de lo
     *   árido (de día, en lugar de `arid.knee`, que sigue en la cara nocturna; más alta: el desierto,
     *   más claro, L\* 63 frente a 65 en la referencia) y el tinte lineal de lo árido (la misma zona cálida: más amarillo) y de la
     *   vegetación (donde el verde supera al rojo y al azul: más verde; ni la nieve ni las salinas).
     * - `relief`: la fuerza del mapa de normales de la Tierra (1: el relieve sin exagerar): las montañas
     *   se ven desde la Tierra completa. Con más de 6 salen los bloques de compresión del mapa.
     * - `rim`: el borde de la atmósfera, su tinte (lineal) sobre el halo: más azul y brillante.
     */
    enhanced: {
      ocean: {
        albedo: [0.006, 0.03, 0.11] as readonly [number, number, number],
        waterLuminance: 0.0477,
        detail: 0.5,
      },
      clouds: { from: 0.45, to: 0.95, max: 0.8 },
      glint: {
        intensity: 0.5,
        core: 1,
        wide: 1.4,
        exponent: 12,
        tint: [0.25, 0.6, 1] as readonly [number, number, number],
        f0: 0.02,
        fresnelMax: 4,
      },
      land: {
        saturation: 1.4,
        aridKnee: 2.5,
        aridTint: [0.97, 1, 0.86] as readonly [number, number, number],
        vegetationTint: [0.9, 1.08, 0.8] as readonly [number, number, number],
      },
      relief: 5,
      rim: [3, 4.5, 8] as readonly [number, number, number],
    },
  },
  /**
   * Radio mínimo en pantalla de los planetas en la vista general (px CSS; revisión del bloque C, C3,
   * decisión de Iván): en un móvil en vertical, los rocosos medían 1–2 px y se veían como marcadores.
   * No cambia ni las posiciones ni las órbitas, y en escritorio casi nunca actúa.
   */
  overviewMinRadiusPx: 2,
  /**
   * La Luna (fase 6): la exageración del relieve que desplaza su malla (1: la elevación del LOLA a
   * escala física; ±10 km sobre 1737 km). Las normales del relieve van sin exagerar
   * (`scripts/build-relief.mjs`).
   */
  moon: {
    reliefExaggeration: 1,
    /**
     * Dentro de la sombra de la Tierra, la luz del Sol que refracta su atmósfera: rojiza (la de un
     * eclipse de Danjon 2–3, cobriza) y, en fracción de la luz del Sol, mucho más de la real:
     * ilustrativa, para que la Luna eclipsada se vea roja y no negra con la exposición de su primer
     * plano, como en las fotos de larga exposición. Más tenue hacia el eje de la umbra (`axis`: la
     * fracción que queda en el eje), como en los eclipses en que la Luna pasa cerca de su centro:
     * también ilustrativo.
     */
    umbraLight: { color: '#b8502e', intensity: 0.18, axis: 0.35 },
  },
  /**
   * Venus «Bajo las nubes» (fase 9b, D44): el mosaico del radar de Magellan en lugar de las nubes,
   * con la misma luz del Sol y la misma fotometría de Venus (la tarea 3: su sombreado sigue con su
   * luz). El radar no mide la luz visible: lo que da es el eco de cada punto (lo rugoso y las cumbres,
   * claros), y se pinta en gris, sin color inventado. Su brillo, **ilustrativo**: el de una textura de
   * Venus, calibrado igual que la de las nubes (`brightness` × el albedo geométrico de Venus en el
   * disco lleno), para que se vea con la misma exposición. `haze`: la parte de la neblina del limbo
   * que queda con el radar (la de las nubes taparía su borde). `fadeMs`: el fundido entre las nubes y
   * el radar (un corte con movimiento reducido o en las capturas).
   */
  venus: {
    radar: { brightness: 1, haze: 0.3, fadeMs: 800 },
  },
  /**
   * Los anillos de Saturno (fase 7, D36; decisión de Iván del 30-10): un realce **ilustrativo** del
   * brillo que reflejan (no de su opacidad), como el relleno de D21. Con su albedo calibrado con el
   * Hubble, el anillo B brilla 0,8 veces el disco de Saturno en la geometría de la foto de 2019 (lo
   * físico); en las fotos de prensa, 1,44, procesadas. Se lleva a un punto medio, B / disco ≈ 1,05,
   * medido con `scripts/compare-rings.mjs`. No toca la fotometría ni sus tests. Solo en la cara
   * iluminada: a contraluz, con la luz que los atraviesa, el anillo A salía casi blanco y la división
   * de Cassini, quemada (revisión del bloque D, D4; `scripts/compare-rings-backlit.mjs`, frente a
   * PIA17172).
   */
  rings: { brightness: 1.3 },
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
  /**
   * En la vista general (fase 9b, D39), los sistemas de lunas ya no son compactos: todas sus lunas
   * quedan fuera del planeta y de los anillos, con aire entre ellas, y se separarían del borde mucho
   * antes que con `moonResolutionPx` (las de Saturno llegan a 4,8 radios: en la vista general por
   * defecto, Titán y su órbita se verían a 50 px de un Saturno de 18). Ahí, un sistema aparece cuando
   * su planeta mide de `system.from` a `system.to` px de radio en pantalla: la vista general por
   * defecto sigue sin lunas (Júpiter mide de 16 a 21 px en escritorio) y aparecen al acercarse. Y
   * cada luna, cuando su disco mide de `moon.from` a `moon.to` px: sin motas de medio píxel (Mimas).
   * En un sistema local físico, como siempre: cada luna a su tamaño real, con su etiqueta.
   */
  overviewMoonsPx: { system: { from: 20, to: 40 }, moon: { from: 0.5, to: 1.5 } },
  /** Opacidad de las órbitas de los planetas en la vista general (la de las estelas completas). */
  overviewOrbitOpacity: 0.85,
  /**
   * Órbitas casi rectas (revisión del bloque D, D3): de cerca, una órbita mucho mayor que el encuadre
   * se ve como una recta que cruza la pantalla. Se desvanece, con su estela, si lo que se ve de ella
   * gira menos de `fadeBelowRad` (unos 7°) y se ve entera a partir de `fullAboveRad` (unos 20°), con
   * un paso suave entre los dos; si se ven menos de `minLengthPx` px CSS de ella, no cambia. Una
   * órbita entera en pantalla gira 2π; la de una luna vista en su sistema, de decenas de grados en
   * adelante; la del propio planeta enfocado, nada (su tramo junto a él es recto). Un cambio de
   * dirección de más de `cornerRad` (25°) entre dos tramos seguidos es una esquina entre rectas, no
   * una curva (una órbita de 128 tramos gira 2,8° en cada uno; en perspectiva, hasta unos 15° en la
   * punta de una elipse muy aplastada): no cuenta. Con la cámara fuera de la órbita, a más de
   * `outsideTo` radios de su centro (y en parte desde `outsideFrom`), la órbita es una elipse entera,
   * aunque se vea de canto y casi recta (las de las lunas en su sistema): se queda. Las rectas que no
   * informan se ven desde dentro de la órbita o junto a ella: el trozo de una órbita enorme junto a su
   * cuerpo o el horizonte de su plano (la de la Luna vista desde la Tierra).
   */
  straightOrbits: {
    fadeBelowRad: 0.12,
    fullAboveRad: 0.35,
    minLengthPx: 40,
    cornerRad: 0.44,
    outsideFrom: 1.1,
    outsideTo: 1.4,
  },
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
  /**
   * El cielo desde un lugar (fase 8). **Ilustrativo**: no es un modelo de la dispersión en la
   * atmósfera, sino unos colores de referencia (sRGB) a varias alturas del Sol, entre los que se
   * interpola: el cénit, el horizonte y el resplandor del lado del Sol. Siguen el orden de las fotos
   * del crepúsculo: el día azul con el horizonte blanquecino; la puesta, con el horizonte anaranjado
   * hacia el Sol; el crepúsculo civil, azul con la franja roja; el náutico, azul profundo; y la noche,
   * casi negra (un azul muy oscuro, no negro: el resplandor natural del cielo).
   * - `keyframes`: [altura del Sol (°), cénit, horizonte, resplandor hacia el Sol].
   * - `glow`: lo concentrado que está el resplandor alrededor del Sol (exponente del coseno) y lo
   *   que sube sobre el horizonte (exponente de la altura).
   * - `ground`: el suelo, de noche y de día (una silueta, sin paisaje), con un degradado (`glow`):
   *   junto al horizonte toma algo de su color (`strength`, la fracción) y se apaga hacia abajo en
   *   `depthDeg` grados. Liso y casi negro, bajo el azul marino del horizonte de noche se leía como un
   *   hueco (en el móvil, una banda de unos 77 px; la 9c, segunda decisión de Iván del 08-11; cierre
   *   de la fase 9b).
   * - `starLimit`: la magnitud más débil que se ve según la altura del Sol: de día ninguna estrella;
   *   en el civil, las más brillantes y Venus; de noche cerrada, hasta la 6,5 (el catálogo). Los
   *   planetas siguen el mismo límite.
   * - `milkyWay`: la ganancia de la Vía Láctea, que solo se ve con el cielo ya oscuro, y su intensidad
   *   en el cielo (`milkyWayIntensity`): desde un lugar oscuro se ve bien, más que el fondo sutil del
   *   espacio (`VISUAL_CONFIG.milkyWay`).
   * - `constellations`: la opacidad de sus líneas según la altura del Sol: nada de día y del todo con
   *   el cielo oscuro; en el crepúsculo náutico, poca, para que no manden sobre las pocas estrellas que
   *   se ven (revisión de la fase 8, sugerencia 14).
   * - `extinction`: magnitudes que se pierden por masa de aire (≈ 0,25 en un buen observatorio; el
   *   valor típico en el visible): las estrellas se apagan junto al horizonte.
   * - `eclipse`: en un eclipse total de Sol el cielo se oscurece como en el crepúsculo civil tardío;
   *   el oscurecimiento empieza cuando el Sol está tapado casi del todo (`from`, la fracción del
   *   disco), no en los parciales poco profundos.
   * - `eclipse.totality` (fase 9b, E1 de la revisión del bloque E), con el Sol tapado del todo
   *   (`totalityOf`): sin el resplandor del lado del Sol ni el halo a su alrededor (no hay luz directa:
   *   antes, con ellos, el cielo era malva plano); un anillo en todo el horizonte (`ring`: el aire
   *   iluminado fuera de la sombra de la Luna, el «atardecer de 360°»), en dos partes que caen como
   *   e^(−altura / `heightDeg`): una naranja pegada al horizonte y otra amarilla algo más alta, para que
   *   al fundirse con el azul pase por un gris casi neutro (C* de 4 a 6) y no por el malva (con un solo
   *   anillo rojizo, C* de 10 a 15 con h de 300° a 360°, entre 3° y 5° de altura, donde está el Sol de
   *   Fraga el 12-08-2026; `scripts/measure-sun.mjs` lo mide en la captura); el disco de la Luna,
   *   más oscuro que el cielo que lo rodea (`moonVeil`: la parte de la luz del cielo que se le quita;
   *   en las fotos y a simple vista se ve como un disco negro, por el contraste con la corona); y la
   *   corona (`corona`: su brillo y su forma, la de `CORONA_GLSL`, de 0, la del mínimo del ciclo, con
   *   serpentinas, a 1, la del máximo, redonda; en 2026 el ciclo va bajando de su máximo).
   *   **Ilustrativo** todo ello.
   * - Los discos del Sol y de la Luna van a su tamaño real, con un mínimo en pantalla (`minDiscPx`,
   *   radio en px CSS) para que no sean un punto con el gran angular; con un campo estrecho, el real.
   */
  sky: {
    keyframes: [
      [-18, '#060913', '#0d1322', '#0d1322'],
      [-12, '#081024', '#121c33', '#18141f'],
      [-6, '#0d1a36', '#24314d', '#4a2a24'],
      [-3, '#1b2f5c', '#4a5470', '#a4532b'],
      [0, '#2b4b8a', '#8c7f80', '#e07b38'],
      [6, '#3b67b4', '#a7b6cb', '#f0c088'],
      [20, '#3a72c9', '#b6cbe3', '#fff0d2'],
    ] as readonly (readonly [number, string, string, string])[],
    glow: { power: 6, rise: 3 },
    ground: { night: '#020203', day: '#38372f', glow: { strength: 0.6, depthDeg: 14 } },
    starLimit: [
      [-18, 6.5],
      [-12, 5],
      [-9, 3.5],
      [-6, 2],
      [-3, 0.5],
      [0, -1.5],
      [3, -5],
    ] as readonly (readonly [number, number])[],
    milkyWay: [
      [-18, 1],
      [-15, 0.45],
      [-12, 0],
    ] as readonly (readonly [number, number])[],
    milkyWayIntensity: 0.75,
    milkyWayKnee: 0.12,
    constellations: [
      [-16, 0.5],
      [-12, 0.25],
      [-9, 0.1],
      [-6, 0],
    ] as readonly (readonly [number, number])[],
    extinction: 0.25,
    eclipse: {
      from: 0.96,
      altitudeDeg: -7,
      totality: {
        ring: {
          inner: { color: '#e48c45', intensity: 0.55, heightDeg: 0.9 },
          outer: { color: '#dcc47a', intensity: 0.3, heightDeg: 2 },
        },
        moonVeil: 0.6,
        corona: { strength: 0.9, roundness: 0.45 },
      },
    },
    minDiscPx: 5,
  },
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

/** Paso suave de 0 (en `from`) a 1 (en `to`). */
function smoothstep(value: number, from: number, to: number): number {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
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
  return smoothstep(separation, from, to);
}

/**
 * Presencia de una luna en la vista general (fase 9b, `overviewMoonsPx`): según lo que mide su planeta
 * en pantalla (`parentRadiusPx`) y lo que mide ella, con su radio y el del planeta en unidades de
 * escena.
 */
export function overviewMoonPresence(
  moonRadius: number,
  parentRadius: number,
  parentRadiusPx: number,
): number {
  if (!(parentRadius > 0) || !Number.isFinite(parentRadiusPx)) return 0;
  const { system, moon } = VISUAL_CONFIG.overviewMoonsPx;
  return (
    smoothstep(parentRadiusPx, system.from, system.to) *
    smoothstep((moonRadius / parentRadius) * parentRadiusPx, moon.from, moon.to)
  );
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
