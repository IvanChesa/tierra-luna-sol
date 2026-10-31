# Informe: Fase 7 (lunas, sombras y escala real)

- **Rama:** `fase-7-lunas-escala-real`
- **Fecha:** 2026-10-31
- **Estado:** en curso (entrega 7.a)

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
- **7.b · Sombras generalizadas (hecho, `925533d`):**
  - la sombra del shader (D20) recibe como parámetros el cuerpo que tapa y el Sol;
  - con `TLS_SHADOWS`, cada planeta recibe las de sus cuatro lunas más grandes (en Júpiter, las galileanas) y cada luna, la de su planeta, con la geometría real del estado (float64);
  - `satelliteShadowPoint` (`ephemeris/eclipse.ts`) da la misma geometría y se comprueba con el **tránsito triple del 24-1-2015** que fotografió el Hubble (NASA, ESA y el Hubble Heritage Team, https://science.nasa.gov/asset/hubble/jupiter-january-24-2015/): a las 06:28 UT, las sombras de Europa, Calisto e Ío sobre Júpiter; a las 07:10 UT, ya no la de Ío;
  - test del motor: los uniformes reproducen esa geometría;
  - las predicciones del IMCCE se descartaron como fixture: su aviso legal pide autorización expresa para reproducir sus datos.
  - En la captura del tránsito, el encuadre deja a Calisto (a 26 radios de Júpiter) detrás de la cámara y a Ío casi encima. Es la perspectiva de una cámara a unos 6 radios, no la de un telescopio. Las sombras caen donde las vio el Hubble.
- **7.c · Escala real (en curso, `b6de0a3`):** un selector «Escala» (Ilustrativa / Real) en «Controles +», con su anuncio, que cambia la escala y la URL (`escala=real`).
- **7.d · R2 (hecho, `ee6d9cb`):**
  - un lóbulo hacia delante estrecho e intenso en la neblina de Saturno (g = 0,9 y refuerzo 60, ajuste visual con PIA17172), con su test;
  - el halo de las atmósferas decide si está iluminado con la normal del limbo de un observador lejano, como el disco: antes, a pocos radios y a contraluz, caía en el lado nocturno. La vista Tierra y la captura de EPIC apenas cambian (diferencia media de 0,7 a 1 nivel, en el limbo).
- **7.a y los anillos (D36):** investigando las fuentes (mosaicos del USGS luna a luna; color de los anillos y perfil de τ del PDS).
