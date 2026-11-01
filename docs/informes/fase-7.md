# Informe: Fase 7 (lunas, sombras y escala real)

- **Rama:** `fase-7-lunas-escala-real`
- **Fecha:** 2026-10-31 · respuesta a la revisión: 2026-11-01
- **Estado:** revisada en la revisión del bloque D (aprobada con cambios menores), con la respuesta aplicada y fusionada en `main`

## Plan
La fase es grande: va por entregas, con este informe al día al final de cada una. Toca dos cosas que ya existen y hay que comprobar antes de rehacer nada:
- el **sistema local físico** (§4.4), con las órbitas de las lunas, desde la fase 2;
- la **escala real**, que el motor y la URL (`escala=real`) soportan desde la fase 2, pero sin interruptor en la interfaz.

**7.a · Las 20 lunas, con su superficie (tareas 1 y 8)**
- **Mosaicos globales del USGS, luna a luna** (Astropedia; `download-assets.mjs` con su SHA-256):
  - de cada uno, su página, el fichero, la proyección, la convención de longitudes, la resolución, si es en gris o en color, la cobertura y la licencia, en `FUENTES.md` uno a uno;
  - candidatas: las galileanas (Voyager–Galileo), las de Saturno (Cassini), las de Urano y Tritón (Voyager 2, con huecos) y Fobos y Deimos;
  - Proteo y las que no tengan mosaico global se quedan con su color esquemático, documentado.
- **`build-textures.mjs`:**
  - las de cada luna en 1k y 2k (≤ 300 kB por luna en el nivel bajo, §5), alineadas con su georreferencia;
  - comprobadas con accidentes con nombre del Gazetteer (IAU/USGS), como la Luna: si el mapa estuviera girado o reflejado, el build falla;
  - los huecos sin datos de Voyager 2, rellenos con el gris medio de la luna y señalados en el informe.
- **Color:**
  - el del mosaico si lo hay en color real;
  - si es en gris, un tinte documentado (la cromaticidad, con su fuente si la hay; si no, el color esquemático, dicho como tal).
- **La orientación:** rotación síncrona, con el meridiano 0 de cada mosaico (el de la IAU) frente al planeta. Test de que el punto subplanetario cae en la longitud 0 del mapa.
- **Carga:** solo con su sistema enfocado (el planeta o una de sus lunas), no en la vista general: el peso de la primera vista no cambia. Se liberan al salir.
- **Miniaturas de las lunas**, regeneradas con sus texturas y con la latitud sobre la eclíptica (informe de la fase 3c, §10.3).

**7.b · Sombras analíticas generalizadas (tarea 3)**
- La función común de la sombra (`tlsShadow`, D20) para varios cuerpos:
  - en Júpiter, las cuatro galileanas (tránsitos de sus sombras);
  - en cada luna, su planeta (eclipses de lunas: Ío entra en la sombra de Júpiter en cada vuelta).
- Geometría en float64 en JS, como la sombra de la Luna en la fase 5, con su test frente a una fuente independiente (las efemérides de los fenómenos de los satélites galileanos de una fuente citada).
- **Captura de la sombra de una galileana sobre Júpiter** en un tránsito real, con su fuente.

**7.c · Escala real y sistemas de lunas (tareas 2, 4 y 5)**
- **Escala real:**
  - interruptor en «Controles +» (accesible, con su estado anunciado) que cambia `escala=real` en la URL;
  - transición animada (directa con movimiento reducido);
  - sin parpadeos ni temblores, comprobado en Fobos y Neptuno con capturas o un vídeo corto y con el error de profundidad medido.
- **Sistemas de lunas:** comprobar el marco local físico con sus órbitas y la ficha resumida, y completar lo que falte.
- **Atmósferas:** Titán con su textura, si cabe en el presupuesto, y el halo ajustado.

**7.d · Saturno: anillos (D36, tarea 9) y limbo a contraluz (R2, tarea 7)**
- Color de los anillos A, B y C y de la división de Cassini, de espectrofotometría publicada, en `data/photometry.ts` con su fuente y un test. Si no hay valores de alguno, se dice y se usa el más cercano documentado.
- **Perfil radial de τ:**
  - de una ocultación del PDS Ring-Moon Systems Node, comprobando su licencia; UVIS (ultravioleta, más cerca del visible que el radio) si está, o RSS;
  - reducido por script a una textura 1D de unos 8–10 km por píxel, con su cabecera «GENERADO por…»;
  - con las divisiones (Cassini, Encke, Keeler…) en su radio publicado (test).
- **El material:**
  - τ(r) del perfil, con el color nuevo;
  - el realce moderado del brillo (B / disco ≈ 1,0–1,1), ilustrativo y documentado, en `visual-config.ts`;
  - sin tono lavanda (medido).
- **R2:** la luz que la atmósfera de Saturno dispersa hacia delante, como un anillo en el limbo a contraluz.
- **Capturas antes y después,** junto a fotos reales enlazadas:
  - la geometría del Hubble de 2019;
  - `saturno-cassini-2013`, a contraluz;
  - la sombra de los anillos sobre el disco;
  - Saturno enfocado en 2026, con los anillos casi de canto;
  - la vista general.

**7.e · Cierre**
- Tests:
  - la precisión de las lunas (§5; la de la fase 1 sigue en pie);
  - la continuidad de las transiciones de escala;
  - las sombras.
- FPS, VRAM y memoria con todos los sistemas cargados (§5), en los tres niveles.
- Capturas de escritorio y móvil (`?captura=1`), `npm run check`, informe completo, revisión por subagente, correcciones y fusión.
- Al terminar, el resumen del bloque D en `DIARIO.md`. **No se empieza el bloque E.**

Fuera de alcance, por el plan: formas reales de las lunas irregulares (backlog 3) y sombras del relieve (backlog 11).

## 1. Resumen
- **Las lunas, con su superficie:** 12 de las 20 llevan su mosaico global: Fobos, las cuatro galileanas, seis de Saturno y Tritón. Son del USGS, salvo Mimas, que sale de un mapa del DLR en el PDS. Se cargan al enfocar su sistema y el build las comprueba con rasgos del Gazetteer. Titán va sin superficie (en luz visible la tapa su neblina), con el color y el halo de una foto de Cassini.
- **Sombras generalizadas (D20):** las lunas sobre su planeta y el planeta sobre sus lunas. Se comprueban con el tránsito triple que fotografió el Hubble el 24-1-2015.
- **Escala real:** un selector en «Controles +» que va a la URL (`escala=real`). Sin temblores (medido).
- **Saturno:**
  - el limbo, a contraluz (R2);
  - los anillos nuevos (D36): τ de una ocultación de Cassini, a 8 km por píxel, con las divisiones en su radio publicado (test);
  - su color, de la reflectividad que midió el Hubble: el B, tostado;
  - B / disco de 1,03, con un realce ilustrativo, y sin tono lavanda (medido).
- **Rendimiento:**
  - todas las vistas, también los sistemas de lunas, van a 58–60 FPS en los tres niveles y caben en la VRAM de §5;
  - la memoria no crece tras 10 vueltas por los sistemas de lunas;
  - al medir, Fobos bajaba a 46–50 FPS: Marte entraba y salía del encuadre y volvía a subir sus texturas de 4K. Corregido.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Sin parpadeos ni temblores en escala real (Fobos y Neptuno; capturas o vídeo corto) | ✅ | `scripts/measure-real-scale.mjs` (RTX 3060). El cuerpo enfocado no se mueve en pantalla (temblor 0 px, salto 0, radio constante), con Fobos y con Neptuno, a 1 h/s y a 1 día/s o 30 días/s. Un vecino en movimiento tiembla 0,035 px (Marte, desde Fobos) y 0,020 px (Tritón, junto a Neptuno). El búfer de profundidad distingue superficies a 1,3 m junto a Fobos, a 10 m en Marte (detrás), a 188 m en Neptuno y a 500 m en Tritón. Capturas `escritorio-escala-real-*` y `movil-escala-real-*` (Fobos con Marte, Neptuno con Tritón, la vista general y el selector) |
| Captura de una sombra de luna galileana sobre Júpiter en una fecha de tránsito real (fuente citada) | ✅ | `jupiter-transito-2015-0628` y `jupiter-transito-2015-0710`: el tránsito triple del 24-1-2015 que fotografió el Hubble (NASA, ESA y el Hubble Heritage Team, https://science.nasa.gov/asset/hubble/jupiter-january-24-2015/). La escena va a la hora en Júpiter: la de la foto menos 36,37 min de tiempo de luz. A las 06:28 de la foto se ven las sombras de Calisto e Ío y la de Europa, que entra por el limbo (a 0,998 radios). A las 07:10, las de Europa y Calisto. Tests: `satelliteShadowPoint` (`eclipse.spec.ts`) y los uniformes del motor (`engine.spec.ts`) |
| FPS, VRAM y memoria con todos los sistemas cargados según §5 | ✅ | §6, `measure-views.mjs`: 11 vistas en los tres niveles, cinco de ellas sistemas de lunas. FPS mínimo ≥ 58 (§5: ≥ 55); VRAM ≤ 278 MB en alto (de 300) y ≤ 86 en bajo (de 120). `measure.mjs`: tras 10 vueltas por los sistemas de lunas, 7 geometrías, 12 texturas, 11 MB de heap y un contexto WebGL, igual que al empezar. Test de la VRAM con cada sistema cargado, en alto y en bajo (`engine.spec.ts`) |
| Licencias del USGS registradas una a una en `FUENTES.md` | ✅ | `FUENTES.md`, «Usadas»: una fila por luna (11 del USGS y Mimas, del PDS), con su página, el fichero, el SHA-256, la proyección, la convención de longitudes, la resolución, la cobertura y la licencia (dominio público), y otra para el Gazetteer, que da las sondas. También en `/creditos` |
| Captura `saturno-cassini-2013` con el limbo iluminado a contraluz (R2) | ✅ | `anillos-despues/escritorio-saturno-cassini-2013` y `movil-saturno-cassini-2013` (y sus `anillos-antes/`): la geometría de PIA17172 (fase de 176°, 17° bajo los anillos), con el anillo de luz del limbo. Test del lóbulo hacia delante (`ee6d9cb`) |
| Anillos (D36): el color de cada uno con fuente científica publicada y test, y el B crema o tostado, no azulado (medido en la captura) | ✅ | `RING_SPECTRA` (`data/photometry.ts`): la I/F del Hubble en cinco bandas, de Salo y French (2010), con las longitudes de onda de Cuzzi, French y Dones (2002). Se lleva a cromaticidad con `bandChromaticity`, el método de Venus: C 1,047 · 0,992 · 0,945; B 1,073 · 0,997 · 0,820; A 1,059 · 0,998 · 0,847. La división de Cassini no tiene valores publicados y toma el del C, el más cercano documentado. Tests en `photometry.spec.ts` (los dos). Medido en la captura (`compare-rings.mjs`, la geometría de heic1917a): el B, con C* de 9,5 y h de 94° en CIELAB, crema; en la foto de prensa, 4,0 y 250°, azulado |
| Anillos (D36): las divisiones de Cassini, Encke y Keeler, visibles en primer plano y en su radio publicado (test) | ✅ | El build (`checkRingFeatures`) y `texture-meta.spec.ts`, en la tira de 8K (8,2 km por píxel). Las divisiones de Colombo, Maxwell, Huygens, Encke y Keeler, vacías (τ 0) en su radio de la tabla del PDS. Los bordes, frente a los publicados: el interior del C, 74 491 km (74 491); el exterior del B, 117 478 (117 570: es excéntrico, ±100); el exterior del A, 136 772 (136 770); el núcleo del F, 140 203 (140 224). Con la tira desplazada 25 km (3 píxeles) hacia dentro o hacia fuera, o reflejada, la comprobación falla; un píxel cabe. Visibles en `anillos-despues/ansa-ampliada` |
| Anillos (D36): B / disco en el valor elegido con el realce, documentado como ilustrativo | ✅ | `VISUAL_CONFIG.rings.brightness` = 1,3, con un comentario que lo dice ilustrativo. Medido en la geometría del Hubble: B / disco de 1,03 (D36: 1,0–1,1). Sin el realce, unos 0,79; en la foto de prensa, 1,44 |
| Anillos (D36): sin tono lavanda en el anillo C ni en la división de Cassini (medido) | ✅ | `compare-rings.mjs`, CIELAB en la captura: el C, C* de 2,7 (h 316°), y la división de Cassini, 4,3 (h 303°). El umbral es 4,6: dos diferencias apenas perceptibles (ΔE 2,3; Sharma, 2003); por debajo, se lee como un gris neutro. En la foto de prensa, 4,6 y 5,4. El poco tono que queda es el fondo azul tinta, que se ve a través de los anillos tenues |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 7.1 20 lunas | hecha | Comprobado luna a luna en Astropedia, en su bucket y en la tabla de productos del USGS (https://fdp.astrogeology.usgs.gov/fdp/saturn/ y …/uranus/). **12 con mosaico global:** Fobos, Ío, Europa, Ganímedes, Calisto, Encélado, Tetis, Dione, Rea, Jápeto y Tritón, del USGS, y Mimas, del mapa final del DLR en el PDS (COISS_3006). **8 con su color esquemático:** Deimos, Proteo y las cinco de Urano (el USGS solo tiene sus mapas aerografiados en PDF, del hemisferio sur), y Titán (§4.1). En 1k y 2k (1k en bajo; la más pesada, Dione, 170 kB de 300). Rotación síncrona: la longitud 0 de cada mapa mira a su planeta (< 0,01°, test), y el hemisferio delantero cae a 90° O (a 90° E en Tritón, retrógrada). Carga solo con su sistema enfocado (test) |
| 7.2 Sistemas de lunas | hecha | Ya estaban: el marco local físico con sus órbitas (fase 2) y la ficha resumida, la tarjeta flotante (fase 4b). Comprobados en las capturas de la 7.a (Dione con Saturno, Europa con Júpiter, Tritón con Neptuno y Titán con Saturno). Lo nuevo son los mosaicos, las sombras y la escala real |
| 7.3 Sombras generalizadas | hecha | La sombra del shader (D20) recibe como parámetros el cuerpo que tapa y el Sol. Con `TLS_SHADOWS`, cada planeta recibe las de sus cuatro lunas más grandes y cada luna, la de su planeta, con la geometría del estado en float64. `satelliteShadowPoint` (`ephemeris/eclipse.ts`) da la misma geometría |
| 7.4 Escala real | hecha | El selector «Escala» de «Controles +», con su anuncio y la URL, y un e2e (`e2e/tiempo.spec.ts`). La transición la anima el motor: directa con movimiento reducido |
| 7.5 Atmósferas | hecha | Titán, con el color y el halo de PIA06230 y sin superficie (§4.1). Con R2, el halo de las atmósferas decide si está iluminado con la normal del limbo de un observador lejano, como el disco |
| 7.6 Tests | hecha | La precisión de las lunas frente a Horizons, de la fase 1 (`moons.spec.ts`: ≤ 0,5° en 1900–2100), sigue pasando. La continuidad de las transiciones de escala, de la fase 2 (`engine.spec.ts`). Las sombras: `eclipse.spec.ts` y `engine.spec.ts` |
| 7.7 R2 | hecha | Un lóbulo hacia delante estrecho e intenso en la neblina de Saturno (g = 0,9 y refuerzo 60), ajustado a ojo con PIA17172, con su test. La vista Tierra y la captura de EPIC apenas cambian (diferencia media de 0,7 a 1 nivel, en el limbo) |
| 7.8 Miniaturas de las lunas | hecha | Con sus mosaicos y desde 15° sobre la eclíptica (`sobre=ecliptica`). La de Saturno, desde el sur (§4.9) |
| 7.9 Anillos (D36) | hecha | Ver los criterios y §4.6–4.8 |

## 4. Desviaciones del plan y motivo
1. **Titán, sin textura de superficie** (el plan: «Titán con su textura, si cabe en el presupuesto»). El mosaico del USGS es de ISS a 938 nm, una ventana del metano en el infrarrojo cercano. En luz visible, la neblina tapa la superficie: en PIA06230 (color natural, fase de 56°) se ve un globo naranja liso. Con la textura, Titán salía con unos continentes que nadie puede ver. Su color, el de esa foto: 1,478 · 0,945 · 0,137. Su halo, tenue y casi neutro, con la caída medida en ella (`scripts/measure-titan-halo.mjs`): a 1,02–1,05 radios, 0,0083 del brillo del borde del disco, frente a 0,010 en la foto. El primer halo era unas 70 veces más brillante que el de la foto.
2. **Mimas, del PDS.** Astropedia no tiene Mimas. Es el mapa final del DLR (Roatsch et al., 2018) en el volumen cartográfico de Cassini del PDS (COISS_3006). Son datos de la NASA, de dominio público. `usgs-mosaic.mjs` lee su etiqueta PDS3.
3. **Sin mosaico: Deimos, Proteo y las cinco de Urano.** No hay un mosaico global del USGS. De las de Urano solo hay mapas aerografiados en PDF, del hemisferio sur. El JPL tiene mapas de textura de ellas, pero su licencia no está clara (§10.3). Se quedan con su color esquemático, como decía el plan.
4. **El color:**
   - Ío llevaba el de su foto en color real, PIA02308 (1,154 · 1,026 · 0,284), en lugar de un tinte (con el esquemático salía verdosa). Con él salía verde lima uniforme: desde la revisión del bloque D (D1), el mosaico del USGS en color, con un balance de color calibrado con esa foto;
   - las demás lunas con mosaico, en gris con el tinte de su color esquemático, dicho como tal. Tritón usa el canal naranja de Voyager 2; el norte que no vio, con un gris liso (desde la revisión del bloque D, D2, el de la franja vecina y sin corte duro).
5. **Las sondas de las lunas de Saturno, de borde de cráter.** Sus mosaicos van normalizados en brillo y los domina el sombreado: una sonda de brillo no distingue un mapa girado. Las sondas miran el escalón de brillo del borde de cráteres con nombre del Gazetteer, elegidos por cómo discriminan. Con todos los cráteres grandes, el borde se detecta en su sitio en el 63 % de los de Rea, frente al 5 % con el mapa girado 180° y el 3 % reflejado. Encélado: 52, 11 y 2 %; Dione: 31, 0 y 3 %; Tetis: 23, 5 y 0 %; Jápeto: 22, 6 y 12 %; Mimas: 12, 0 y 3 %. Las galileanas y Tritón usan sondas de brillo (manchas oscuras o claras). Fobos no lleva sondas: es irregular (los radios angulares de sus cráteres no valen) y sus rasgos se ven por el sombreado, no por su brillo. Lo alinea su georreferencia.
6. **El detalle del brillo de los anillos, de la textura de antes** (el plan lo permitía «si aporta algo que el perfil no tenga»). El B es casi opaco: τ satura y el perfil no da la variación de brillo de dentro del B. La luminancia de la textura de Solar System Scope sí la da. Para no inventar posiciones, se registra con la ocultación por correlación. Sale una escala de 8,749 km por píxel (r de 0,955). El ajuste fino por región desplaza el C 0 km, el B −10, la división de Cassini 0 y el A −10. El build falla si alguno pasa de 25 km. Estructura fina del B: 0,186 en la escena, frente a 0,178 en la foto del Hubble.
7. **El brillo de cada anillo (albedo)** sale de la I/F del Hubble en F555W (Salo y French, 2010), con el modelo de dispersión de la escena, dentro del intervalo de la ficha de la NASA: C 0,140 y B 0,533. El A pedía menos y queda en 0,400, el mínimo de la ficha (0,4–0,6). La división de Cassini, que el Hubble no midió, lleva el típico de la ficha: 0,283, la media geométrica de 0,2–0,4. El anillo A queda plano: estructura fina de 0,027, frente a 0,22 en la foto, que lleva el oscurecimiento hacia fuera y la zona de Encke. No es un criterio de la fase (§10.4).
8. **El umbral del tono lavanda.** El plan pedía medirlo, sin cifra. Es lavanda si el tono CIELAB cae entre 280° y 345° y C* pasa de 4,6: dos diferencias apenas perceptibles (ΔE 2,3; Sharma, 2003).
9. **La miniatura de Saturno, desde el sur.** Desde el equinoccio de 2025, el Sol ilumina la cara sur de los anillos. Desde el norte, la miniatura enseñaba su cara de sombra, oscura (y, antes de D36, lavanda).
10. **Las predicciones del IMCCE, descartadas como fuente del tránsito:** su aviso legal pide autorización expresa para reproducir sus datos. La fuente independiente es la foto del Hubble, con la hora corregida por el tiempo de luz (36,37 min): la escena pinta la posición geométrica.

## 5. Decisiones técnicas nuevas
- **Las texturas de las lunas, solo con su sistema enfocado** (`systemOf` en `world.ts`): el planeta o una de sus lunas. El nivel, `satelliteTexture` (2k, 2k y 1k). Al soltarlas, la luna vuelve a su color esquemático, sin el contraste ni el tinte del mosaico.
- **`scripts/usgs-mosaic.mjs`:** lleva cada mosaico a la convención de la escena (longitud 0 en el centro, longitudes al este) desde su GeoTIFF o su etiqueta PDS3. Rellena los huecos con un gris liso (Tritón: el 38,4 %, el norte que no vio Voyager 2; desde la revisión del bloque D, el de la franja vecina, con el borde difuminado) y comprueba las sondas.
- **La sombra (`tlsShadow`), con varios cuerpos que tapan** (`TLS_SHADOWS`): hasta cuatro por cuerpo, con la geometría en float64 en JS.
- **El halo de Titán, con su propio color** (`uHazeColor`): la cromaticidad del halo de PIA06230 por su ganancia.
- **La tira de los anillos, a su propio nivel** (`ringTexture`: 8k, 8k y 4k). Pesa poco y lleva la estructura radial fina.
- **`scripts/ring-profile.mjs`:**
  - reduce la ocultación a τ por píxel promediando la transmisión, no τ;
  - lo opaco, a τ 5; el ruido, por debajo de 0,005, a 0; y 0 más allá del F;
  - `checkRingFeatures` comprueba las divisiones y los bordes frente a la tabla del PDS (`data/saturn-rings.ts`).
- **`bandChromaticity` (`ephemeris/photometry.ts`):** la cromaticidad a partir de la reflectividad por bandas, interpolada a las longitudes de onda dominantes de los primarios sRGB (611, 549 y 464 nm). Reproduce la de Venus de la fase 3b (1,027 · 0,996 · 0,958).
- **El realce de los anillos** (`uBrightness` en su material, `VISUAL_CONFIG.rings.brightness`), ilustrativo.
- **«Se ve grande», con dos condiciones** (C4, fase 6): para entrar hay que estar en la pantalla; para salir, basta con alejarse. El que sale del encuadre sin alejarse conserva su primer plano. Con Fobos enfocado a 1 día/s, Marte entraba y salía del encuadre seis veces por segundo y cada vez se volvían a descodificar y a subir sus texturas de 4K: 24 cambios y 12 subidas de cada textura en 4 s, a 46–50 FPS. Ahora, un cambio y una subida, a 59–60 FPS. Test.
- **En captura, la latitud de la cámara también sobre la eclíptica** (`sobre=ecliptica`), para las miniaturas de las lunas: con su ecuador, las de Urano salían con un tercio del disco en sombra.

## 6. Salida de los checks
```
npm run check (con el código final de la entrega 7.e)
- lint y Prettier: limpios
- 567 tests (63 ficheros); cobertura de ephemeris/: 99,48 % de sentencias, 95,63 % de ramas,
  100 % de funciones y 99,85 % de líneas
- build sin avisos de presupuesto: JS inicial 298,66 kB (aviso a 320); three 703,49 kB (aviso a 900);
  interfaz diferida 285,35 kB
- JS inicial sin three ni astronomy-engine; código propio, 12,13 kB de 15
```
- **e2e:** la batería completa, en el CI de GitHub al subir la rama (§6.1).
- **Mediciones** (RTX 3060, modo de captura, `node scripts/measure-views.mjs`; el recorrido de cada nivel, sin recargar, y en cada paso los FPS durante 4 s a 1 día/s). El nivel bajo se repitió con la máquina libre: en la primera pasada, otra sesión pasaba sus e2e de Playwright a la vez (CPU al 96 %) y los FPS caían a partir de Europa.

| Vista | VRAM (MB): alto · medio · bajo | FPS mínimo: alto · medio · bajo | Descarga del paso (kB): alto · bajo |
|---|---|---|---|
| Vista general | 38 · 38 · 38 | 60 · 60 · 59 | 513 · 510 |
| Marte | 124 · 59 · 59 | 60 · 60 · 60 | 1673 · 482 |
| Saturno (con sus lunas) | 94 · 62 · 62 | 60 · 59 · 59 | 916 · 862 |
| Dione | 62 · 62 · 54 | 59 · 60 · 59 | 599 · 0 |
| Júpiter (con sus lunas) | 89 · 57 · 56 | 59 · 60 · 60 | 487 · 312 |
| Europa | 57 · 57 · 48 | 60 · 60 · 58 | 317 · 0 |
| Tritón | 49 · 49 · 40 | 60 · 60 · 60 | 107 · 33 |
| Fobos | 49 · 49 · 40 | 60 · 60 · 60 | 258 · 0 |
| Sol | 121 · 57 · 56 | 59 · 60 · 60 | 0 · 0 |
| Vista Tierra | 278 · 86 · 86 | 60 · 60 · 60 | 3258 · 750 |
| Vista Luna | 266 · 103 · 62 | 60 · 60 · 60 | 5222 · 1223 |

  En el nivel bajo, las lunas de un sistema se descargan al enfocar el planeta (su nivel de primer plano es el mismo, 1k). Por eso Dione, Europa y Fobos no descargan nada.
- **`node scripts/measure.mjs`:**
  - reposo: 0 frames y 0 llamadas a `requestAnimationFrame` en 3 s;
  - contexto WebGL perdido y recuperado: 0 frames mientras estaba perdido y uno al recuperarlo, en la misma fecha (`contexto-recuperado.webp`);
  - vista general a 1 día/s: 60 FPS en alto y medio, 59 en bajo, 1,2–1,4 ms de CPU por frame, 21 llamadas de dibujo;
  - memoria: al empezar y tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas, 7 geometrías, 12 texturas, 11 MB de heap y un contexto WebGL;
  - primera vista: 443 kB de texturas, 70 de estrellas, 31 de imágenes y 52 de tipografías. Elemento LCP: el póster, a los 232 ms. Una tarea larga de 51 ms (en alto);
  - el estado a 1 año/s: 4,8 actualizaciones por segundo, y ningún cambio de la URL en 5 s de reproducción.

### 6.1 e2e de la entrega 7.e
El CI de GitHub con `1b22fe0` (ejecución 41234386428): lint, tests y build en verde; los **74 e2e**, en verde (Linux, Chromium con SwiftShader, 12,3 min); y la vista previa de la rama, desplegada y comprobada. Entre ellos, el del selector de escala (`e2e/tiempo.spec.ts`) y el de las pantallas bajas con «Controles +» (`e2e/maquetacion.spec.ts`).

## 7. Capturas
En `docs/informes/img/fase-7/` (modo de captura; la escena, el 24-10-2026 si no se dice otra fecha). Las de las lunas, los anillos, las miniaturas y los pósters se regeneraron con la respuesta a la revisión del bloque D (Ío en color, Tritón sin el corte, los anillos a contraluz sin el realce y sin las órbitas casi rectas); las de esa respuesta, más abajo:
- **Lunas (7.a):** `escritorio-` y `movil-dione-saturno`, `-europa-jupiter`, `-titan-saturno` y `-triton-neptuno`; `lunas-mosaicos-antes` y `lunas-mosaicos-despues` (las 12, sin y con su mosaico); `titan-cassini-2005` (la geometría de PIA06230).
- **Sombras (7.b):** `jupiter-transito-2015-0628` y `jupiter-transito-2015-0710`. El encuadre deja a Calisto (a 26 radios de Júpiter) detrás de la cámara y a Ío casi encima: es la perspectiva de una cámara a unos 6 radios, no la de un telescopio. Las sombras caen donde las vio el Hubble.
- **Escala real (7.c):** `escritorio-` y `movil-escala-real-sistema`, `-fobos-marte`, `-neptuno-triton` y `-controles`.
- **Anillos y R2 (7.d):** `anillos-antes/` y `anillos-despues/`, cada una con `escritorio-` y `movil-saturno-hubble-2019` (heic1917a), `-saturno-cassini-2013` (PIA17172, a contraluz), `-saturno-sombra`, `-saturno-2026` (casi de canto) y `-sistema`, y `ansa-ampliada` (el ansa derecha, con las divisiones). Las fotos reales, enlazadas en `docs/realismo/referencias.md`.
- **Robustez:** `contexto-recuperado`.
- **Respuesta a la revisión del bloque D:** `rectas-antes/` y `rectas-despues/` (D3: el ansa ampliada y, en escritorio y móvil, Saturno con la geometría del Hubble de 2019, Europa delante de Júpiter, las vistas Tierra y Luna, y tres de control: la vista general y los sistemas de Saturno y de Júpiter); `revision-bloque-d/` con `io-galileo-1999-antes` y `-despues` (D1, la geometría de PIA02308), `triton-antes` y `-despues` (D2) y `saturno-cassini-2013-antes` y `-despues` (D4, la geometría de PIA17172).
- **Fuera de la carpeta:** las miniaturas de las fichas (`public/img/cuerpos/`) y los pósters (`public/img/poster-*`), regenerados (§9).

## 8. Dependencias añadidas
Ninguna. Datos nuevos (todos en `FUENTES.md` y en `/creditos`):
- los mosaicos de las lunas (USGS y, Mimas, el PDS);
- el Gazetteer (las sondas);
- la ocultación de β Centauri de Cassini UVIS (PDS Ring-Moon Systems Node; Colwell et al., 2020) y la tabla de radios de los anillos del PDS;
- la reflectividad de los anillos de Salo y French (2010) y de Cuzzi, French y Dones (2002).

Las fotos de referencia (Hubble y Cassini) solo se enlazan y se miden en una carpeta temporal: no entran en el repo.

## 9. Pendientes y `TODO(ivan)`
- **Probar en tu móvil** (no bloquea): los sistemas de lunas (Júpiter con sus lunas, Fobos) y la escala real («Controles +» → «Escala»).
- **Los pósters de la vista Luna estaban desfasados desde la fase 6** (hallazgo propio): eran de antes de su panel. En el móvil, el póster tenía la Luna grande y en medio, y el 3D la pone más pequeña, encima del panel: el fundido mostraba dos escenas. Regenerados todos (`1b22fe0`).
- Las propuestas de §10, para que decidas.

## 10. Propuestas de cambio al plan
1. **El terminador de Titán:** su neblina lo hace muy suave en las fotos, y en la escena es un escalón. Haría falta un parámetro de fotometría nuevo (una sombra suavizada por la atmósfera). Propuesta: la fase 10 o el backlog.
2. **La dicotomía de Jápeto, comprimida:** los mosaicos van normalizados en brillo y la cara oscura sale a 0,58 de la clara; la real es de un 10 % o menos. Habría que llevar el contraste de cada luna a su albedo medido (con su fuente). Propuesta: el backlog.
3. **Las lunas de Urano:** el JPL tiene mapas de textura de ellas, pero su licencia no está clara. Preguntarlo a la NASA o al JPL, o dejarlas con su color. Propuesta: el backlog.
4. **El anillo A, más plano que en las fotos:** su oscurecimiento hacia fuera y la zona de Encke saldrían de un perfil radial de I/F medido (por ejemplo, de Cassini ISS, en el PDS). Propuesta: el backlog.
5. **Que el motor espere a la textura de un vecino que se acerca** (fase 10): al enfocar Fobos, Marte pide su 4K la primera vez que entra en el encuadre, con un tirón al subirla. Se podría pedir al enfocar una luna, si su planeta se ve grande desde ella.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/?cuerpo=europa`. Júpiter y sus lunas cargan sus mosaicos; en la vista general siguen con su color.
2. Las sombras: `/?cuerpo=jupiter&fecha=2015-01-24T05:51:38Z` (el tránsito triple del Hubble a la hora en Júpiter).
3. La escala real: «Controles +» → «Escala» → «Real», o `/?cuerpo=fobos&escala=real`.
4. Los anillos, en el modo de captura (`desde`, `fase` y `latitud` solo valen en él): `/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra` (la geometría de la foto del Hubble de 2019). El limbo a contraluz: `/?captura=1&cuerpo=saturno&fecha=2013-07-19T21:30Z&fase=176&latitud=-17`. Fuera de él, `/?cuerpo=saturno` y la rueda para acercarse a un ansa.
5. Capturas y mediciones (tras `npm run build`):
   - `node scripts/capture-moons.mjs`, `capture-real-scale.mjs`, `capture-rings.mjs <carpeta>` y `capture-realism.mjs`;
   - `node scripts/compare-rings.mjs` (brillo, color y estructura de los anillos frente a la foto);
   - `node scripts/measure-views.mjs [alta|media|baja]`, `measure.mjs` y `measure-real-scale.mjs`.

---

## Respuesta a la revisión

La revisión del bloque D (`docs/revisiones/bloque-D.md`, 01-11) hace también de revisión de esta fase: **aprobada con cambios menores**. Se han atendido sus cinco hallazgos (D3 y D5, también en esta rama) y sus decisiones sobre las propuestas de §10.

| Hallazgo | Acción | Commit |
|---|---|---|
| **D1** (Importante): Ío sale verde lima | **El USGS sí publica Ío en color**: «Io Galileo SSI / Voyager Color Merged Global Mosaic 1km» (Astropedia; dominio público, «Use Constraints: None»), el mosaico en gris con el color de Galileo superpuesto por cocientes (756 nm, verde y violeta: los filtros de PIA02308). Sustituye al gris teñido, con su sonda (Loki Patera, 0,72; girado o reflejado, 0,98), su SHA-256 y el MD5 que publica el USGS. **Medida** (`scripts/compare-io.mjs`): Ío sola con la geometría de la foto (Horizons, Galileo como observador: el 2-7-1999 a las 05:00 UTC la veía centrada en 137,7° O y 0,4° N, a 126 000 km y con 4,4° de fase; el pie de foto dice 137,5° O y 0,3° N), en el 60 % central del disco, en CIELAB y con la luminancia de la foto. **Antes**, el tono medio ya era el de la foto (h 100,0° frente a 100,3°; ΔE\*ab 5,0), pero uniforme: la dispersión de a\* y b\* píxel a píxel era de 2,7, frente a 9,9 en la foto. De ahí el lima. **El mosaico en color, tal cual**: h 85°, C\* 34 (ΔE\*ab 17,3): su procesado es más rojizo que el de la foto. **Con un balance por canal** en RGB lineal (`IO_COLOR_GAIN`, 0,871 · 1,070 · 0,643, calibrado con esa medida): **ΔE\*ab 2,6, dentro de la tolerancia declarada de 4,6** (dos diferencias apenas perceptibles, el umbral del tono lavanda de los anillos), h 100,9°, C\* 50,3, y una dispersión de 7,5: blancos, ocres en los polos, el anillo rojo de Pele y las manchas oscuras. El 0,01 % de los canales se satura con la ganancia. En `FUENTES.md`, `referencias.md` y `/creditos` | `eeb1015` |
| **D2** (Menor): el hueco de Tritón acaba en un corte duro | **El relleno, sin corte** (`fillGaps`, `scripts/usgs-mosaic.mjs`): lejos del borde, el gris de la franja vecina (lo que hay a menos de 10° del hueco: 101 en el canal naranja, frente a una media de 152); junto al borde, la media local de lo que hay (una convolución normalizada de unos 5°), que se funde con ese gris; y lo que hay se funde con el relleno en su último grado y medio. **Dos fallos encontrados por el camino:** (1) dos de las tres sondas de Tritón, Kasu Patera y Ukupanio Cavus, a 3–4° del hueco, pasaban gracias al gris claro del relleno, que caía en su corona: sobre lo que hay no tienen contraste (1,00). Las sondas de brillo ya solo miden lo que hay, y las de Tritón son tres manchas oscuras del hemisferio que vio Voyager 2, del Gazetteer: Doro Macula (0,86), Namazu Macula (0,88) y Kikimora Maculae (0,88); giradas o reflejadas, 0,95–1,07. (2) Con el relleno más oscuro, la luminancia media del mapa bajaba de 0,319 a 0,257, y la calibración del albedo habría aclarado un 24 % los datos reales: la de los mosaicos se mide ya solo sobre lo que hay (Tritón, 0,3194, como antes). Las demás lunas cambian como mucho un 0,2 %. Sigue señalado en este informe (§4.3) y ahora también en `/creditos` | `eeb1015` |
| **D3** (Importante): rectas que cruzan la pantalla | **Cada órbita (y su estela, que va en ella) se mide en pantalla en cada frame** (`screenPath` y `straightOrbitFade`, `orbits.ts`): su polilínea, recortada por delante de la cámara y al lienzo en coordenadas homogéneas, y lo que gira su parte visible. Se apaga si gira menos de unos 7° y se ve entera a partir de 20°, con un paso suave (`VISUAL_CONFIG.straightOrbits`). Dos matices, salidos de las pruebas: un cambio de dirección de más de 25° entre dos tramos es una esquina entre rectas, no una curva (de cerca, la cuerda del cuerpo a su primera muestra, de millones de km, se junta en ángulo con lo lejano de la órbita); y con la cámara fuera de la órbita (a más de 1,4 radios de su centro), la órbita es una elipse entera, aunque se vea de canto: se queda. El criterio es lo que se ve: ninguna vista tiene reglas propias. **En las cinco vistas, sin rectas**: la naranja del ansa, la diagonal que acababa en el limbo de Europa, las rayas azules de las vistas Tierra y Luna y la órbita de Saturno con la geometría del Hubble. **Se quedan** la vista general entera, los arcos de Ío y Europa con Júpiter enfocado y las elipses de las lunas de Saturno en 2019. Con Saturno enfocado en 2026 (los anillos casi de canto), las de Mimas, Encélado y Tetis; las de Dione, Rea, Titán y Jápeto, con la cámara dentro de ellas y casi en su plano, se ven como el horizonte de ese plano, rectas, y se van. En la vista de Europa queda la de Ío, de canto y vista desde fuera. **Tests:** `orbits.spec.ts` (una vuelta entera, el trozo junto al cuerpo, la Luna desde la Tierra, una luna en su sistema, de canto desde fuera, sin NaN detrás de la cámara y el paso suave) y `engine.spec.ts` (la vista general intacta; con Saturno enfocado, su órbita a 0 y Mimas y Encélado enteras; en la vista Tierra, la de la Tierra a 0). **Coste:** con la cámara fuera de una órbita no se mide (la vista general entera; las lunas vistas desde fuera) y la medida, sin crear objetos, para en cuanto la órbita se ve curva: en el peor caso, 29 órbitas rectas vistas desde dentro, 0,10 ms de CPU por frame (una micromedida en V8); con órbitas curvas, 0,02 ms. `measure.mjs`, la vista general a 1 día/s: 60 FPS en alto, medio y bajo, con 1,37, 1,30 y 1,29 ms de CPU por frame (en la fase 7, 1,2–1,4); la memoria, igual tras las 10 vueltas por los sistemas de lunas (7 geometrías, 12 texturas, 11 MB de heap y un contexto); la VRAM, la de la fase 7 (278 MB en la vista Tierra en alto, 86 en bajo). La primera versión creaba arrays pequeños por tramo y medía también la vista general: la primera medición dio 2,5 ms por frame (con las capturas de otro proyecto a la vez en la máquina); por eso se reescribió. Los pósters de las vistas Tierra y Luna, regenerados sin las rayas | `4f8a5e4` |
| **D4** (Menor): el realce de los anillos también en su cara oscura | **Medido** con `scripts/compare-rings-backlit.mjs` (como `compare-rings.mjs`): la elipse del anillo F de PIA17172, ajustada a 226 puntos de sus ansas (apertura de 17,3°, la de la foto), y las mismas bandas en la escena, proyectadas con la cámara del motor. **Antes**: el A, L\* 93,8 y C\* 7,8 (casi blanco), y la división de Cassini, quemada en el 36,2 % de sus píxeles; en la foto, el A es tostado (L\* 32,4, C\* 11,9) y nada sale quemado. **Se pasan: el realce, solo en la cara iluminada**: el A, L\* 89,8 y nada quemado; Cassini, el 3,3 %; el C, de 70,3 a 62,7. Con luz de frente no cambia nada: B / disco, 1,03 en la geometría del Hubble (`compare-rings.mjs`). Lo que queda (el A, más claro que en la foto) no es el realce: la exposición del primer plano a 176° de fase y el lóbulo hacia delante de las partículas, el mismo en todos los anillos. Va al backlog (14). Test: `ring-material.spec.ts` | `8e28a24` |
| **D5** (Importante): el dominio pasa a ivanchesa.com | `site.config.ts`: la URL base, `https://tierra-luna-sol.ivanchesa.com`, y la del autor, `https://ivanchesa.com`, con sus tests (el canonical incluido; `verify-pages.mjs` y el e2e de publicación la leen de ahí). En el plan, **D37**, §0, D25, las fases 9 (enlaces legales y autor) y 11 (el dominio personalizado sobre la zona de ivanchesa.com: el panel de Pages crea el registro DNS; lo hace Iván) y el backlog; `CLAUDE.md` («desarrollador de software»), `PENDIENTES.md` (el subdominio, decidido) y `PROMPTS.md`. `AGENTS.md`, la copia local para Codex (fuera del repo), no se ha tocado | `b722ef0` |
| Propuestas de §10 | Las decide la revisión: 1 (el terminador de Titán), 2 (la dicotomía de Jápeto, que pasa a la fase 10, no al backlog) y 5 (pedir la textura del planeta al enfocar una luna), a la **fase 10** (tarea 10); 3 (las lunas de Urano con los mapas del JPL) y 4 (el anillo A con un perfil de I/F), al **backlog** (12 y 13). La 14 del backlog sale de D4 | con este informe |

**Checks** (con el código final de la respuesta):
```
npm run check
- lint y Prettier: limpios
- 578 tests (64 ficheros); cobertura de ephemeris/: 99,48 % de sentencias, 95,63 % de ramas,
  100 % de funciones y 99,85 % de líneas
- build sin avisos de presupuesto: JS inicial 298,65 kB (aviso a 320); three 705,73 kB (aviso a 900);
  interfaz diferida 285,35 kB
- JS inicial sin three ni astronomy-engine; código propio, 12,12 kB de 15
```
- **e2e:** en el CI de GitHub, al subir la rama (abajo).
- **`measure.mjs`** (RTX 3060): la vista general a 1 día/s, a 60 FPS en los tres niveles con 1,29–1,37 ms de CPU por frame; en reposo, 0 frames; el contexto WebGL, recuperado; la primera vista, una tarea larga de 84 ms y el LCP del póster a 212 ms; la VRAM y la memoria, como en la fase 7.
