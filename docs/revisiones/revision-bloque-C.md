# Revisión: la revisión del bloque C aplicada (rama `revision-bloque-c`)
Veredicto: CAMBIOS NECESARIOS

- **Fecha:** 2026-10-30.
- **Revisor:** subagente revisor, sin el contexto de la sesión que lo ha programado.
- **Revisado:**
  - `git diff main...revision-bloque-c`: 8 commits y 56 ficheros;
  - el informe `docs/informes/revision-bloque-C.md`;
  - las capturas antes y después;
  - `docs/revisiones/bloque-C.md` y `docs/decisiones/ANILLOS-SATURNO.md`;
  - las secciones del plan que cambian.

No hay ningún bloqueante. Hay un hallazgo importante: en el móvil, C3 no consigue lo que pretendía (hallazgo 1). Lo demás son menores y sugerencias. Con el 1 corregido o decidido por Iván, y los menores rápidos hechos, se puede fusionar sin otra ronda.

## Qué he ejecutado y comprobado

- **`npm run check` → código 0** (30-10, en la rama, con el árbol limpio):
  - `ng lint` y Prettier, limpios y sin avisos.
  - **524 de 524 tests** en 60 ficheros (antes, 514).
  - Cobertura de `ephemeris/`: 99,56 % de sentencias, 96,96 % de ramas y 100 % de funciones y de líneas. En `scale.ts`, 99,38 % de sentencias y 98,95 % de ramas.
  - Build sin avisos de presupuesto:
    - JS inicial de 298,23 kB (82,45 kB transferidos);
    - el chunk de three pesa 681,29 kB y el de `explorer-ui`, 267,26 kB;
    - 17 rutas prerenderizadas;
    - `prepare-pages`: 127 ficheros; el mayor es `earth-clouds` 4k, con 1,76 MiB.
  - `check-initial-bundle`: ninguna página carga three, astronomy-engine, los stores ni los controles. El código propio inicial ocupa 12,13 kB de 15.
  - Coincide con «Comprobaciones» del informe. El informe aún pone «(se completa tras la revisión)» en `npm run check`: sirven estas cifras. Falta también la línea del `DIARIO`, que va con la fusión.
- **e2e:** he pasado los tres ficheros que cambia C5 (`privacidad`, `publicacion` y `accesibilidad`) en el proyecto de escritorio: **9 de 9**, en 1,2 min. `--list` da 70 tests, los mismos que el informe.
- **Capturas** (`docs/informes/img/revision-bloque-c/`):
  - `tierra-epic-2016` y `tierra-epic-2016-comparada`: antes y después son el mismo fichero (el MD5 es idéntico). Las comparativas con EPIC y la medida de R3 no cambian.
  - `vista-himalaya`, en escritorio y en móvil: la cordillera nevada se ve entera, y antes la tapaba una banda de nubes. Queda una bruma gris tenue, que es el 30 % de las nubes.
  - `vista-espana`, en escritorio y en móvil: la Península y Canarias se ven con sus siete marcadores.
  - `vista-luces`: diferencia media de 0,71 sobre 255 (el informe dice 0,7).
  - Vista general: en escritorio y en el portátil, los planetas son más grandes. En la conjunción de 2040, Júpiter y Saturno encogen y no se tocan. Lo del móvil está en el hallazgo 1.
- **Código revisado sin problemas:**
  - **C1:**
    - La curva `cloudOpacity` da 1 hasta 1, sube con smoothstep hasta 2,2 y queda en 0,3 desde ahí. Con NaN da 1, y con ∞, 0,3.
    - En el shader, `uCloudOpacity` multiplica la cobertura y su sombra. De `cloud` dependen el brillo del océano, las luces de las ciudades, la mezcla con las nubes y el relleno (`composite`). El uniforme solo existe con `TLS_EARTH`.
    - El motor la calcula en `applyLighting`, después de `updateScreen` y en el mismo frame. Mira el disco de la Tierra, no el cuerpo enfocado.
    - Casos límite:
      - con la cámara dentro de la esfera, el radio es ∞ y las nubes quedan al mínimo;
      - en la vista general y en la vista Luna, la Tierra mide pocos px y la opacidad es 1;
      - detrás de la cámara, la Tierra no se dibuja.
  - **C2:**
    - `reliefFactor` nunca pasa de `needed` ni de 1, y es continua y con derivada continua.
    - En `ringFactor`, `gap(f)` es estrictamente decreciente, porque al crecer f crecen el disco y el cuerpo. Por eso vale la bisección: 40 pasos que se quedan con el lado factible.
    - Cada cuerpo toma el menor factor de sus pares, y los dos factores de un par son menores o iguales que el del par. Así no queda ningún solape, tampoco con los anillos: su malla es hija de Saturno y escala con él.
    - El borde exterior que se usa (136 780 km, `LABEL_EXTENTS`) es el que se ve. La tira llega a 141 048 km, pero más allá del anillo A su alfa no pasa de 8/255 (es el anillo F; lo he medido en el WebP de 2k).
    - El alivio solo actúa entre el Sol y los planetas. Las lunas usan el radio final del planeta en `placeMoonPoint`, y su tamaño se multiplica por el alivio del padre.
    - Los búferes de módulo no dan problemas de reentrada: `placeBodies` es síncrona, y `FrameController.evaluate` coloca las hojas una tras otra. `relief` crece con `n`.
  - **Mi muestreo**, el mismo de `illustrative-layout.spec.ts` pero con un script fuera del repositorio:
    - en escritorio, aire mínimo de 5,30 unidades; solo encogen Júpiter y Saturno, en el 3,24 % de las muestras, hasta ×0,787;
    - con la cámara del test del móvil, 3,80;
    - el radio cambia como mucho entre el 0,75 y el 0,96 % entre muestras (3 días): a 3 días/s, el cambio es suave.

    Coincide con el informe.
  - **C3:**
    - `updateOverviewScreen` solo actúa en la vista general con el Sol de foco. Con un cuerpo enfocado se conserva, y la colocación ilustrativa se desvanece en la transición sin saltos.
    - En el modo de captura y con movimiento reducido, la segunda colocación entra en el mismo frame.
    - La escala real y los sistemas locales no lo usan.
    - La focal coincide con la de `projectBodies` también con márgenes, porque `setViewOffset` conserva `elements[5]`.
  - **C5:** cada una de las 17 páginas prerenderizadas tiene un solo `h1`, así que el localizador estricto vale. El explorador tiene un único `@defer`: con la barra de tiempo visible ya está toda la interfaz.
  - **C6:** `dependabot.yml` es válido. `.nvmrc` dice 24, y el CI usa `node-version-file`.
  - **Plan:** está al día:
    - C4 va en la tarea 8 y en un criterio de la fase 6;
    - C8, en D24, en la tarea 6 de la fase 9 y en la parte manual de la fase 11;
    - la 8K, en la tarea 4 de la fase 10;
    - D35 y §4.4;
    - D36, en la tarea 9 y cuatro criterios de la fase 7, fieles a las tareas y criterios de `ANILLOS-SATURNO.md`. Su criterio de presupuestos ya lo cubre el de la fase;
    - `PENDIENTES.md` deja C7 abierto y el PR 1 para Iván;
    - `PROMPTS.md` marca R y C con ✅.

    Ningún criterio cambia sin que se haya pedido.
  - **Reglas de `CLAUDE.md`:**
    - `ephemeris/scale.ts` solo importa `constants` y `vec3`, y three solo se importa en `scene/`;
    - no hay `any`, y los comentarios están en español;
    - no hay dependencias nuevas: `package.json` y el lock no cambian;
    - no hay secretos;
    - los commits son pequeños y llevan prefijo.

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | Importante | `src/app/scene/labels.ts:39`, `:168` · `src/app/scene/visual-config.ts:109-114` · `docs/PLAN.md:107` · `docs/informes/revision-bloque-C.md:113` | **C3 no consigue en el móvil lo que pretendía: los rocosos se siguen viendo como marcadores.** El marcador de visibilidad (un anillo) se dibuja por debajo de 3 px de radio (`MARKER_RADIUS_PX`), y el mínimo es de 2 px. Con la cámara de entrada en 390 × 844, Mercurio, Venus, la Tierra y Marte miden de 2,0 a 2,1 px (tabla del informe), así que los cuatro conservan el anillo. Lo he comprobado ampliando 4 veces la zona del Sol en `movil-sistema`, antes y después: el mismo anillo, con un punto algo mayor dentro. Con la cámara de entrada, el mínimo solo añade de 0,4 a 0,5 px a Mercurio y a Marte. El resto del cambio es el 25 % de C2, que sí quita el anillo a Urano y Neptuno (de 2,7–2,8 a 3,4–3,5 px). En la 4b, las opciones para Iván eran «un tamaño mínimo en pantalla» o «aceptar los marcadores», y eligió el mínimo. D35 da como motivo «que en el móvil no se vieran como marcadores», como si ya estuviera conseguido, y el informe solo lo menciona de pasada. | Quitar el anillo de marcador a los planetas de la vista general que el mínimo ya deja en 2 px o más. Por ejemplo, el umbral del marcador sería `overviewMinRadiusPx` para los planetas en la escala ilustrativa; las lunas y la escala real seguirían con 3 px. Añadir un test: en 390 × 844, ningún planeta de la vista general lleva `marker`. Hacer capturas del móvil antes y después, con un recorte ampliado, para que Iván lo vea. Si Iván prefiere un mínimo de 3 px de radio, que tampoco lleva anillo, preguntárselo: con la cámara de entrada, Venus y la Tierra empezarían a encoger, y habría que repetir el muestreo. En los dos casos, ajustar el motivo de D35 y el informe. |
| 2 | Menor | `src/app/ephemeris/scale.ts:355-365` · `src/app/scene/engine.ts:639` · `src/app/scene/illustrative-layout.spec.ts:17-34`, `:205-209` · `docs/PLAN.md:107` · `docs/informes/revision-bloque-C.md:90` | **Al alejar la cámara en el móvil, el alivio de solapes deshace el mínimo y los planetas interiores «laten».** El mínimo se aplica antes del alivio, y en unidades crece con la distancia de la cámara. La vista general admite un alejamiento de ×4, también con el pellizco. He repetido el muestreo del spec (1900–2100, cada 3 días) con la cámara real del móvil: focal de 844 / (2 · tan 20°) y el Sol a 8,2 px, es decir, d ≈ 1838. Con zoom 1, solo encogen Júpiter y Saturno. Con ×2, Venus y la Tierra encogen en el 3,0–3,9 % de las muestras, hasta ×0,83 (1,65 px), y Marte, en el 0,9 %. Con ×4 encogen los ocho; Venus y la Tierra, entre el 16 y el 18 % del tiempo y hasta ×0,42 (0,84 px). Entre dos muestras, el radio cambia hasta un 19 %: a 3 días/s, en un segundo. En escritorio (1600 × 900) no pasa ni con ×4. En un portátil de 1280 × 720 con ×4, Venus y la Tierra bajan a ×0,94 (1,87 px). El spec solo prueba una cámara. Aun así, D35 lo da por general («De 1900 a 2100 solo encogen Júpiter y Saturno» y «un radio mínimo de 2 px»), y el informe también («los rocosos, con el mínimo, nunca se acercan»). | Decidir qué manda, el mínimo o el alivio, y documentarlo. Propuesta: calcular el alivio con los radios sin mínimo, para que no dependa de la cámara, y aplicar el mínimo después, sin encoger nunca. Con mucho zoom de alejamiento, dos puntos de 2 px pueden tocarse, y a esa escala es inevitable. La otra opción es limitar cuánto puede crecer un planeta por el mínimo. Añadir al spec una cámara del móvil con ×4 y la expectativa elegida, y precisar en D35 que las cifras son con la cámara de entrada. |
| 3 | Menor | `src/app/scene/engine.ts:988-996`, `:1004-1023` · `docs/informes/revision-bloque-C.md:150`, `:159` | **Con la cámara quieta, la segunda colocación se repite en muchos frames.** `updateOverviewScreen` compara la cámara con igualdad exacta, pero la calcula como `rig.position / extentScale()`. En el marco ilustrativo puro, `extentScale()` vale 1 ± 4,4·10⁻¹⁶: de 816 fechas muestreadas, en 444 no da 1 exacto (el `hypot` de `illustrativePosition` frente a `illustrativeDistance`). Ese mismo valor entra en la distancia del rig. He simulado la cadena a 3 días/s y 60 FPS durante 60 s, con la cámara quieta. La cámara «cambia» en 1341 de 3600 frames con la distancia de escritorio, y en 2252 con la del móvil. En esos frames, los 30 cuerpos se colocan dos veces. Cuesta poco: `placeBodies` tarda 35 µs en la conjunción de 2040, con anillos y mínimo, y 11 µs sin ellos. Pero el informe dice: «Con la cámara quieta, los cuerpos se colocan una sola vez por frame». | Comparar con una tolerancia relativa, por ejemplo 10⁻⁹ de la distancia. Quitar `extentScale()` solo en `updateOverviewScreen` no basta, porque también entra en `framingDistance`. Corregir el informe. |
| 4 | Menor | `e2e/privacidad.spec.ts:33-39` | **La prueba de privacidad ya no espera a las peticiones tardías de las páginas intermedias.** Los 2 s de escucha van solo tras la última página (`/sobre-el-proyecto`). En `/planetas`, `/sol`, `/luna` y `/creditos`, la prueba sale en cuanto están el `h1` y las fuentes. Una petición tardía de esas páginas, como el `import()` de los datos «de hoy» de la fase 9 en `afterNextRender`, no llegaría a salir. Con `networkidle`, cada página esperaba 500 ms sin red. Hoy no se pierde nada, porque esas fichas aún no hacen peticiones diferidas. | Una ventana fija corta en cada página (por ejemplo, 1 s después de `settlePage`) o una señal concreta por página. En la fase 9, `settlePage` tiene que esperar también a los datos «de hoy», que también sirve para axe. |
| 5 | Menor | `docs/FUENTES.md:75` · `docs/informes/img/revision-bloque-c/antes/tierra-epic-2016-comparada.webp` y `…/despues/tierra-epic-2016-comparada.webp` | **Dos copias nuevas de la foto de EPIC, sin registrar.** En las dos comparativas nuevas, la mitad derecha es la foto de EPIC. `FUENTES.md` la registra archivo a archivo, como pide `CLAUDE.md`, pero solo con la ruta de la fase 5. | Añadir las dos rutas a esa entrada. |
| 6 | Sugerencia | `src/app/scene/visual-config.ts:119-128` · `src/app/ephemeris/scale.ts:190-194` | **Dos comentarios han dejado de ser exactos.** «Las lunas aparecen exactamente cuando antes» vale en la vista general, donde el sistema crece con el planeta. En los marcos físicos (un planeta enfocado, la escala real), el radio en pantalla del planeta no crece. Con los umbrales nuevos, al alejarse, las lunas aparecen o se apagan con un 25 % más de separación. Tampoco es exacto ya «al enfocarlo, el planeta no cambia de tamaño» (`localPhysicalKmPerUnit`): si actúan el alivio o el mínimo, el tamaño se interpola durante la transición. | Precisar los dos comentarios («en la vista general»), o aplicar los umbrales nuevos solo en el marco ilustrativo. |
| 7 | Sugerencia | `docs/PLAN.md:90` · `docs/PENDIENTES.md:84` | **D18 y `PENDIENTES.md` no recogen C4.** D18 sigue diciendo que KTX2 se reevalúa en la fase 6 «para la Luna en 8K», y `PENDIENTES.md` condiciona `toktx` a «si la Luna en 8K no cabe». Pero la tarea 8 nueva de la fase 6 (C4) empieza esa reevaluación por la 8K de la Tierra y los mapas de la Luna. Además, `ANILLOS-SATURNO.md` pide la fuente del color de los anillos también en `FUENTES.md`, y la tarea 9 de la fase 7 solo nombra `data/photometry.ts`. Ya lo cubre la regla general de `CLAUDE.md`. | Alinear D18 y la línea de `toktx` con C4. Opcional: nombrar `FUENTES.md` en la tarea 9. |
| 8 | Sugerencia | `src/app/ephemeris/scale.ts:327-329`, `:404-479` | **El comentario de los búferes promete más de lo que cumple.** «Sin reservar memoria en cada frame» solo vale para `primaries` y `relief`. En cada colocación, `relieveOverlaps` crea unos 120 objetos pequeños: tres `Vec3` en cada uno de los 36 pares, más un `scale` y un cierre en los 8 pares con Saturno. El mínimo añade otros 16, y cada frame hace de 1 a 4 colocaciones. Es el patrón que ya seguía el módulo, y el coste es pequeño (hallazgo 3). | Si se quiere, trabajar con componentes escalares en el bucle de pares. Precisar el comentario. |

## Para cerrar
- Corregir el 1, o llevarlo a Iván con los recortes, y los menores rápidos: el 3, el 4 y el 5. Para el 2, decidir y documentar.
- Añadir al informe la «Respuesta a la revisión» y la salida de `npm run check`, y escribir la línea del `DIARIO` al fusionar.
