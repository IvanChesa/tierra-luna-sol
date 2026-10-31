# Informe: Fase 7 (lunas, sombras y escala real)

- **Rama:** `fase-7-lunas-escala-real`
- **Fecha:** 2026-10-31
- **Estado:** en curso (entregas 7.a, 7.b y 7.c hechas; 7.d, los anillos de D36)

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

## Avance (en curso)
- **7.a · Las lunas, con su superficie (hecho: `0abb56f`, `36a5c64`, `99844f2`, `bd62ef9`, `355c322`):**
  - comprobado luna a luna en Astropedia, en su bucket y en la tabla de productos del USGS (https://fdp.astrogeology.usgs.gov/fdp/saturn/ y …/uranus/): **12 lunas con mosaico global** (Fobos, las cuatro galileanas, Encélado, Tetis, Dione, Rea, Jápeto y Tritón, del USGS; Mimas, que Astropedia no tiene, del mapa final del DLR en el PDS, COISS_3006). Sin mosaico: Deimos, Proteo y las cinco de Urano (el USGS solo tiene sus mapas aerografiados en PDF, del hemisferio sur);
  - `scripts/usgs-mosaic.mjs` lleva cada mosaico a la convención de la escena con su georreferencia (GeoTIFF) o su etiqueta PDS3 (Mimas), rellena los huecos con el gris medio (Tritón: el 38,4 %, el norte que no vio Voyager 2) y comprueba **sondas del Gazetteer** que fallan con el mapa girado 180° o reflejado: de brillo donde hay manchas (Ío, Europa, Ganímedes, Calisto, Tritón) y, en las lunas de Saturno (normalizadas en brillo y dominadas por el sombreado), **de borde de cráter**, elegidas entre los cráteres del Gazetteer por cómo discriminan (con todos los cráteres grandes, el borde se detecta en el 63 % de los de Rea en su sitio frente al 5 % girado y el 3 % reflejado; Encélado 52/11/2 %, Dione 31/0/3 %, Tetis 23/5/0 %, Jápeto 22/6/12 %, Mimas 12/0/3 %);
  - test de que, con la orientación de la escena, la longitud 0 de cada mapa mira a su planeta (< 0,01°) y el hemisferio delantero cae a 90° O (a 90° E en Tritón, retrógrada: su polo IAU es el contrario a su momento angular);
  - carga solo con su sistema enfocado (test); en el nivel bajo, la luna más pesada pesa 170 kB (§5: ≤ 300);
  - **Titán, sin superficie:** su mosaico del USGS (ISS, 938 nm) es la superficie en una ventana del metano; en luz visible la neblina la oculta (PIA06230, color natural, fase de 56°: un globo naranja liso). Su color, el de esa foto; su halo, tenue y casi neutro, con la caída medida en ella (`scripts/measure-titan-halo.mjs`: a 1,02–1,05 radios, 0,0083 del brillo del borde del disco; en la foto, 0,010);
  - **Ío**, con el color de la foto en color real PIA02308 (1,154 · 1,026 · 0,284), no con el tinte esquemático; las demás, en gris con el tinte de su color esquemático (dicho como tal);
  - miniaturas regeneradas con sus mosaicos y desde 15° sobre la eclíptica; `FUENTES.md`, `/creditos` y `referencias.md`, al día.
- **7.c · Escala real (hecho: `b6de0a3`, `b517fc0`, `e47ddc9`):**
  - el selector «Escala» de «Controles +», con su anuncio y la URL (`escala=real`), con un e2e; la transición la anima el motor (directa con movimiento reducido; tests de continuidad de la fase 2);
  - medidas (`scripts/measure-real-scale.mjs`, RTX 3060): el cuerpo enfocado no se mueve en pantalla (temblor 0, salto 0, radio constante; Fobos y Neptuno, a 1 h/s y a 1 día/s o 30 días/s); un vecino en movimiento tiembla 0,035 px (Fobos con Marte) y 0,020 px (Tritón con Neptuno); el búfer de profundidad distingue superficies a 1,3 m junto a Fobos, 10 m en Marte detrás, 188 m en Neptuno y 500 m en Tritón;
  - capturas en escritorio y móvil: la vista general, Fobos con Marte detrás, Neptuno con Tritón detrás y el selector abierto.
- **7.b · Sombras generalizadas (hecho, `925533d`):**
  - la sombra del shader (D20) recibe como parámetros el cuerpo que tapa y el Sol;
  - con `TLS_SHADOWS`, cada planeta recibe las de sus cuatro lunas más grandes (en Júpiter, las galileanas) y cada luna, la de su planeta, con la geometría real del estado (float64);
  - `satelliteShadowPoint` (`ephemeris/eclipse.ts`) da la misma geometría y se comprueba con el **tránsito triple del 24-1-2015** que fotografió el Hubble (NASA, ESA y el Hubble Heritage Team, https://science.nasa.gov/asset/hubble/jupiter-january-24-2015/): a las 06:28 UT, las sombras de Europa, Calisto e Ío sobre Júpiter; a las 07:10 UT, ya no la de Ío;
  - test del motor: los uniformes reproducen esa geometría;
  - las predicciones del IMCCE se descartaron como fixture: su aviso legal pide autorización expresa para reproducir sus datos.
  - En la captura del tránsito, el encuadre deja a Calisto (a 26 radios de Júpiter) detrás de la cámara y a Ío casi encima. Es la perspectiva de una cámara a unos 6 radios, no la de un telescopio. Las sombras caen donde las vio el Hubble.

- **7.d · R2 (hecho, `ee6d9cb`):**
  - un lóbulo hacia delante estrecho e intenso en la neblina de Saturno (g = 0,9 y refuerzo 60, ajuste visual con PIA17172), con su test;
  - el halo de las atmósferas decide si está iluminado con la normal del limbo de un observador lejano, como el disco: antes, a pocos radios y a contraluz, caía en el lado nocturno. La vista Tierra y la captura de EPIC apenas cambian (diferencia media de 0,7 a 1 nivel, en el limbo).
- **Los anillos (D36):** investigando las fuentes (color de los anillos y perfil de τ del PDS).
