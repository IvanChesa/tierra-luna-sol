# Fase 9b: el Sol, las lunas y la Tierra de noche (añadida al plan el 04-11-2026)

> Pedida por Iván entre el 01-11 y el 03-11, mientras se hacía el bloque E, con capturas suyas de staging:
> - «las lunas se deben revisar, no están acabados los modelos de las lunas»;
> - «tenemos que mejorar el diseño del Sol»;
> - «las lunas de Júpiter parece que se estén chocando continuamente», «la relación de aspecto» y «en Saturno queda algo raro»;
> - «la parte oscura de la Tierra se ve en un tono azul»;
> - «volver a buscar el mapa de las lunas restantes, como Proteo o las lunas de Urano».
>
> Es el **bloque S** («Sol y satélites»), una sola fase: la **9b**, en la rama `fase-9b-sol-lunas`, **antes de la fase 10**. Así la regresión visual de la fase 10 parte de las imágenes buenas.
> Ciclo, el de siempre (`CLAUDE.md`). Va **por entregas, en el orden de abajo**, que es la prioridad de Iván: cada una cierra con `npm run check`, su informe y sus capturas, y la primera debe poder verse en staging cuanto antes.

## Decisiones (D39–D44; se copian a la tabla del plan)

| # | Decisión | Por qué |
|---|---|---|
| D39 | **Sistemas de lunas de la vista general:** las lunas, más pequeñas respecto a su planeta, con su propia ley de tamaños, y sus órbitas ilustrativas sin cruces: fuera del planeta y de los anillos, en su orden real y con hueco suficiente entre lunas vecinas | Hoy se atraviesan (ver el diagnóstico). Iván: «parece que se estén chocando continuamente». |
| D40 | **El lado nocturno de la Tierra, negro y neutro:** solo las luces de las ciudades, sin la base azul de la textura ni un relleno teñido | Como en las fotos nocturnas desde la ISS. La base azul es un retoque artístico de la textura, no algo real. |
| D41 | **El Sol, «real y luminoso»** (elección de Iván, 03-11): el de la luz visible (SDO/HMI), blanco cálido en el centro y dorado hacia el borde, que deslumbre, con resplandor (bloom), manchas, granulación que se mueve y una corona tenue. Sin el estilo «ardiente» de las ilustraciones ni el modo ultravioleta | Hoy, de cerca, es un disco beige apagado. |
| D42 | **Ninguna luna como bola lisa:** formas reales para Fobos, Deimos y Proteo; mapas para Deimos y las cinco de Urano; la dicotomía de Jápeto y el terminador de Titán (vienen de la fase 10); y el mapa de cada luna, cargado también cuando se ve grande, no solo con el foco | Iván: «no están acabados los modelos de las lunas». Titán sigue sin superficie, a propósito: su neblina la tapa en luz visible. |
| D43 | **La política de uso de imágenes del JPL es una licencia aceptada** (decisión de Iván, 03-11), como CC BY: «Unless otherwise noted, images and video on JPL public web sites (public sites ending with a jpl.nasa.gov address) may be used for any purpose without prior permission», con el crédito «Courtesy NASA/JPL-Caltech» (https://www.jpl.nasa.gov/jpl-image-use-policy/). Las excepciones de esa política (logotipos, respaldo, terceros con copyright en el pie) se respetan | La fase 7 descartó los mapas del JPL por no tener una licencia clara: esta política lo resuelve. |
| D44 | **Venus, «Bajo las nubes»:** al enfocar Venus, un botón que quita las nubes y enseña su superficie con el mosaico del radar de Magellan, avisando de que es una imagen de radar y no lo que verían los ojos. Por defecto, las nubes | Decisión de Iván, 04-11. En luz visible, su superficie no se puede ver de ninguna manera; por radar sí. |

## Entrega 9b.a · Los sistemas de lunas de la vista general (D39)

### Diagnóstico (medido con `ephemeris/scale.ts` en la sesión de revisión)
El radio ilustrativo es `0,105 · r_km^0,4` para todos los cuerpos, y la distancia de una luna a su planeta, `R_vis · (1 + 0,5 · log10(a / R))`.

| | Radio ilustrativo respecto a su planeta | Real |
|---|---|---|
| Ío / Júpiter | 23 % | 2,6 % |
| Ganímedes / Júpiter | 27 % | 3,8 % |
| Titán / Saturno | 29 % | 4,4 % |
| La Luna / la Tierra | 59 % | 27 % |

- **Júpiter:** las cuatro galileanas, de radio 2,0–2,5 unidades, caen entre 12,65 y 15,61 unidades del centro: menos de 1,2 unidades entre vecinas. Se atraviesan en cada conjunción (Ío y Europa, cada ~3,5 días: a 3 días/s, casi cada segundo).
- **Saturno:** de Mimas (10,59) a Titán (14,05), todas caen **dentro de los anillos** (el borde exterior del A, a 19,86 unidades). En la realidad orbitan por fuera. Titán cae sobre el anillo B y se ve como un disco oscuro con un aro dorado.
- **En la vista general, las lunas son discos de color plano**, sin su mapa (el mosaico solo se carga con su sistema enfocado). El color esquemático no siempre se parece a su mosaico: Ío sale mostaza uniforme.

### Tareas
1. **Tamaño de las lunas respecto a su planeta**, una función pura con test: por ejemplo, `r_vis_luna = R_vis_planeta · (r / R)^β` con β ≈ 0,5–0,6, con el tamaño mínimo en pantalla de D35 y ajustada con capturas. Objetivo: Ganímedes, entre el 10 y el 15 % del radio de Júpiter, y la Luna, entre el 35 y el 45 % del de la Tierra. Dentro de cada sistema se conserva el orden de tamaños real.
2. **Distancias ilustrativas sin cruces**, también una función pura con test: la primera luna, fuera del planeta y, en Saturno, del borde exterior del anillo A más un margen; cada luna, como mínimo a la distancia de la anterior más la suma de sus radios y un margen. Se conserva el orden real de las órbitas y la dirección real de cada luna. Con distancias así, dos lunas nunca se tocan, sea cual sea su inclinación.
3. **El alivio de D35 cuenta el tamaño de cada sistema**, no solo el del planeta: si los sistemas crecen, Júpiter y Saturno no se pueden meter el uno en el otro en sus conjunciones. Muestreo de 1900–2100, como el actual.
4. **El mapa de cada luna, cuando se ve grande en pantalla** (por ejemplo, con un radio de más de ~24 px), con el mismo criterio de «se ve grande» que ya usa `releaseCloseUps`, y liberado al dejar de verse. Dentro de §5 (VRAM).
5. **El color esquemático, igual a la media de su mosaico** (calculada por script, con su cabecera «GENERADO por…»), para que el cambio al cargar el mapa no se note.
6. Que una luna pase por delante de otra o de su planeta en pantalla es normal (también ocurre en el cielo real). Lo que no puede pasar es que se metan una dentro de otra o dentro de los anillos.

### Criterios de aceptación
- [ ] Test: de 1900 a 2100, ninguna luna toca a otra, a su planeta ni a los anillos de Saturno en la vista general (en 3D, con los tamaños efectivos), también en las conjunciones de Júpiter y Saturno y con el tamaño mínimo de un móvil de 390 px.
- [ ] Las proporciones del punto 1, medidas, y el orden de tamaños y de órbitas de cada sistema, con test.
- [ ] Capturas antes y después, como las de Iván: Júpiter y Saturno de cerca en la vista general, en escritorio y móvil; Saturno con todas sus lunas fuera de los anillos.
- [ ] Las lunas con su mapa al acercarse sin enfocarlas (captura), dentro de §5.

## Entrega 9b.b · La Tierra de noche (D40)

### Diagnóstico
1. **La textura de noche de Solar System Scope no es negra:** trae una base azul marino. Medido en la de 1k: (4, 6, 21) en el océano, (12, 14, 27) en el Sahara y una media sin las luces de (7, 9, 22), en el 99 % de los píxeles.
2. **`exposureFor` compensa la parte iluminada:** mirando la cara nocturna, la parte iluminada es casi nula y la exposición se multiplica por 6 (`closeUpExposure.max`). Eso destapa la base azul. Además, el relleno de primer plano (`fill.closeUp` 0,004, ×6) ilumina un poco la textura de día, con los océanos azules.

### Tareas
1. **Un mapa de solo luces:** quitar la base en el script de texturas (restando el fondo local, sin tocar las luces) o, mejor si la licencia lo permite, usar **Black Marble 2016 en gris** (NASA Earth Observatory, VIIRS; comprobar la licencia y la resolución), con un color cálido documentado para las luces. En `FUENTES.md` y `/creditos`.
2. **Sin relleno teñido en la cara nocturna de la Tierra:** el relleno de primer plano no ilumina la textura de día donde es de noche (o, si hace falta algo para leer la forma, que sea gris neutro).
3. **La exposición:** que la compensación no convierta la cara nocturna en otra cosa. Las luces pueden ganar con ella (como una foto de larga exposición), pero el suelo sin luces sigue negro.
4. **La forma del disco**, con el limbo de la atmósfera que ya existe y las estrellas que tapa.

### Criterios de aceptación
- [ ] Medido en CIELAB en la captura de la cara nocturna: el suelo sin luces, con L* ≤ 5 y C* ≤ 3 (negro y neutro); las luces conservan su tono cálido.
- [ ] Captura antes y después, junto a una foto nocturna de la ISS enlazada (no copiada), en escritorio y móvil; y la vista general con la Tierra de noche, que sigue leyéndose como un disco.
- [ ] La cara de día, el terminador y las comparativas con EPIC de la fase 5 no cambian (las mismas medidas).

## Entrega 9b.c · El Sol (D41)

### Diagnóstico
`scene/materials/sun-material.ts` y `VISUAL_CONFIG.sun`. La física es correcta (el oscurecimiento del limbo de Allen y el color de 5772 K), pero:
- en primer plano, la intensidad baja a 0,85 para que se vea el limbo, y el Sol queda como un disco beige apagado;
- la granulación es un moteado del 5 % que casi no se ve;
- no tiene manchas, el halo es tenue y el bloom quedó como opcional en la fase 10;
- el oscurecimiento del limbo es igual en los tres canales, así que el borde no se vuelve dorado (backlog 7);
- **la totalidad en el cielo** (`fase-8/escritorio-cielo-eclipse-fraga-cerca`), ver la revisión del bloque E (E1): el disco de la Luna tiene el mismo color malva que el cielo, el cielo es malva plano y la corona es un anillo liso.

### Tareas
1. **El oscurecimiento del limbo por canal** (backlog 7): coeficientes publicados por longitud de onda (por ejemplo, Neckel y Labs, 1994, o Pierce y Slaughter, 1977; con fuente y test). Así el borde sale más oscuro y más dorado, como en las fotos de luz blanca.
2. **Que deslumbre:** el centro casi blanco en todas las vistas; el **bloom solo para el Sol** (deja de ser opcional en la fase 10 y viene aquí), con `three/addons` y sin dependencias nuevas, en los niveles alto y medio (en el bajo, el halo), con el fondo pintado dentro de la escena como pedía la fase 3b. En la vista general, sin quemar los planetas cercanos.
3. **Granulación que se mueve**, más visible en primer plano, quieta con movimiento reducido y en las capturas. Es ilustrativa (los gránulos reales no se distinguirían en el disco entero), y se dice.
4. **Manchas solares ilustrativas que se comportan como las reales:**
   - en las bandas de latitud de las manchas (hasta unos ±35°), con umbra y penumbra;
   - con la rotación diferencial publicada (por ejemplo, Snodgrass y Ulrich, 1990: unos 25 días en el ecuador y más hacia los polos), con test;
   - su cantidad, según la fase del ciclo solar de la fecha, si hay una fuente con licencia compatible (ojo: los datos de SILSO son CC BY-NC, no valen). Si no, una cantidad fija moderada, documentada.
   - No pueden ser «las de ese día»: eso pediría datos en vivo (D24). Se dice en `/creditos` y en «Lo que es ilustrativo».
   - Fáculas claras cerca del limbo, si suman sin coste.
5. **Una corona tenue** alrededor del disco en primer plano (ilustrativa: la real solo se ve en un eclipse), integrada con el halo.
6. **La totalidad del cielo** (E1):
   - el disco de la Luna, oscuro: más que el cielo, con la luz cenicienta como mucho;
   - el cielo de la totalidad, azul muy oscuro con el resplandor del horizonte (el «atardecer de 360°»), no malva;
   - una corona con estructura (serpentinas ilustrativas, más redonda cerca del máximo del ciclo);
   - comparada con una foto real del eclipse de 2017 o de 2024 enlazada. El del 12-08-2026 se ve desde España: es el escaparate del proyecto.

### Criterios de aceptación
- [ ] El perfil del limbo por canal, medido en la captura (I(μ)/I(1) en R, G y B) y comparado con la ley publicada, con test.
- [ ] Capturas antes y después del Sol en primer plano y en la vista general, junto a una imagen de luz blanca de SDO/HMI enlazada; el centro casi blanco y el borde dorado, medidos.
- [ ] La rotación diferencial de las manchas, con test.
- [ ] La totalidad del 12-08-2026 desde Fraga: la Luna, más oscura que el cielo (medido); el cielo, azul y no malva (C* y h en CIELAB, medidos); la corona, con estructura.
- [ ] El bloom y la granulación, dentro de §5 en los tres niveles (FPS, VRAM y llamadas de dibujo); con movimiento reducido, todo quieto.

## Entrega 9b.d · Las lunas: formas y mapas (D42 y D43)

### Lo que hay (búsqueda de la sesión de revisión del 03-11; la terminal comprueba cada licencia y cada fichero antes de usarlo)
- **Las cinco de Urano** (Miranda, Ariel, Umbriel, Titania y Oberón): mapas globales en gris del JPL, «From the USGS, mosaicked with Voyager imagery», de 1440 × 720 (4 px/°). Creador y propietario, «Caltech/JPL/USGS» (https://space.jpl.nasa.gov/tmaps/uranus.html). Licencia: D43. La Voyager 2 solo vio el hemisferio sur (entre el 25 y el 45 % de la superficie). La alternativa de dominio público: las láminas aerografiadas del USGS I-1920 (https://pubs.usgs.gov/imap/1920/), en PDF.
- **Deimos:** el mapa global del JPL de las imágenes de la Viking procesadas por el USGS, de 1440 × 720 (https://space.jpl.nasa.gov/tmaps/mars.html; D43). También están los fotomosaicos de Stooke en el PDS («Stooke Small Bodies Maps V3.0», dominio público con crédito). Su archivo (sbnarchive.psi.edu) tiene una verificación anti-bots de Cloudflare: no se salta. Si hacen falta sus ficheros, se piden a Iván, que los descarga a mano, y se apunta en `PENDIENTES.md`.
- **Proteo:** no hay mosaico global (la Voyager 2 lo vio de lejos). Hay un modelo de forma de Stooke (PDS, «Stooke Small Body Shape Models», N8 Proteus) y su albedo geométrico en la tabla de parámetros físicos del JPL.
- **Formas de Fobos y Deimos:** los modelos de Ernst et al. (2023, *Earth, Planets and Space* 75, https://doi.org/10.1186/s40623-023-01814-7; en el Small Body Mapping Tool y, según el artículo, en el PDS), los de Thomas o Gaskell en el PDS, o los DSK de NAIF. El que tenga una licencia compatible y un tamaño razonable.

### Tareas
1. **Formas reales de Fobos, Deimos y Proteo:** la malla del modelo, reducida por script a un presupuesto de triángulos razonable (con su cabecera «GENERADO por…»), con el mapa proyectado por longitud y latitud planetocéntricas, la orientación de cada luna con su test y lo demás igual (selección, etiquetas, escala real). Las sombras analíticas (D20) pueden seguir con el elipsoide medio, y se dice.
2. **Las cinco de Urano, con su mapa:** teñido con el color publicado de cada una (por ejemplo, Buratti y Mosher, 1991, *Icarus* 90, 1) y con el norte que no vio la Voyager difuminado, como en Tritón. Sondas del Gazetteer (por ejemplo, Verona Rupes en Miranda) que hagan fallar el build si el mapa está girado o reflejado.
3. **Deimos, con su mapa y su forma;** Proteo, con su forma y su albedo, sin mapa inventado.
4. **La dicotomía de Jápeto** (de la fase 10): su contraste, llevado a los albedos medidos de cada hemisferio, con su fuente (hoy, la cara oscura sale a 0,58 de la clara, cuando la real es de 0,1 o menos).
5. **El terminador de Titán** (de la fase 10): suave por su neblina.
6. **La textura del planeta al enfocar una de sus lunas** (de la fase 10), si desde ella se ve grande.
7. `FUENTES.md` y `/creditos`, fichero a fichero, con la licencia de D43 donde toque; `CLAUDE.md`, con la licencia nueva.

### Criterios de aceptación
- [ ] Ninguna luna como bola lisa de color plano, salvo Titán (por su neblina, documentado): captura de las 20 lunas en rejilla, como `lunas-mosaicos-despues`.
- [ ] Fobos, Deimos y Proteo con su forma real y sus medidas (los semiejes de la malla frente a los publicados, con test).
- [ ] Los mapas nuevos, con sus sondas en el build, y la licencia de cada fichero en `FUENTES.md`.
- [ ] Jápeto: el contraste de sus dos caras, medido frente a los albedos publicados.
- [ ] §5 en las vistas de los sistemas de lunas (FPS, VRAM y memoria tras 10 vueltas).

## Entrega 9b.e · Venus «Bajo las nubes» (D44)

### Tareas
1. **Buscar el mosaico global del radar de Magellan** (el USGS lo publica en Astropedia; comprobar el producto, la resolución y su licencia de dominio público) y prepararlo con el script de texturas, con su manifiesto y sus sondas (por ejemplo, Maat Mons).
2. **Un botón «Bajo las nubes»** en el panel de Venus enfocado (y en su ficha, si encaja): con `aria-pressed`, accesible con el teclado, con el aviso visible «Imagen de radar de la sonda Magellan, no lo que verían tus ojos». Un fundido entre las dos capas, o un corte con movimiento reducido. La textura se pide solo al pulsarlo y se libera al salir.
3. En la superficie de radar, el sombreado de Venus sigue con su luz (o, si el radar no tiene sentido iluminado así, se explica la decisión).

### Criterios de aceptación
- [ ] Captura de Venus con las nubes y «Bajo las nubes», con Maat Mons en su sitio (sonda).
- [ ] e2e del botón (teclado y `aria-pressed`) y axe sin violaciones.
- [ ] La licencia en `FUENTES.md` y en `/creditos`; §5 con la textura cargada.

## Presupuestos y lo que no cambia
- §5 del plan, en todas las entregas: FPS, VRAM, llamadas de dibujo, memoria tras vueltas y el JS inicial (three y astronomy-engine, nunca en el bundle inicial).
- Lo que ya está medido y aprobado no cambia: la Tierra de día frente a EPIC, los anillos de D36, las sombras de D20 y las precisiones de las efemérides.
- Todo lo ilustrativo (la ley de tamaños de las lunas, la granulación, las manchas, la corona, el bloom) se documenta como tal en `visual-config.ts`, en `/creditos` y en «Lo que es ilustrativo» de `/sobre-el-proyecto`.
