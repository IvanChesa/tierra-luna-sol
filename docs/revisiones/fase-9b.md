# Revisión: Fase 9b
Veredicto: CAMBIOS NECESARIOS

Revisada el 08-11 en la rama `fase-9b-sol-lunas` (`1b28193`, con la 9c ya traída), sin el contexto de las sesiones que la hicieron. He leído `CLAUDE.md`, `docs/revisiones/README.md`, el plan (§0–§5, §7 y la fase 9b), `FASE-9b-SOL-LUNAS.md` con sus adendas D45 y D46 y el reparto en paralelo, el informe entero y el diff `main...fase-9b-sol-lunas` (464 ficheros; 72 de `src/`, 37 de `scripts/` y 6 de `e2e/`).

La fase está bien hecha y bien medida. `npm run check` pasa sin avisos, los 137 e2e pasan en esta máquina y las medidas que he repetido con los scripts del proyecto salen cifra a cifra (el limbo del Sol por canal, la totalidad desde Fraga, el Sol y la Tierra de D46 frente a la referencia y la Tierra de noche). Los shaders nuevos de la escena llevan sus chunks de profundidad (pasan por `sceneShaderMaterial`), el radar de Venus pide y suelta su textura como dice D44, las formas de Fobos y Deimos se liberan al cambiar de calidad y al cerrar, y lo ilustrativo está dicho en `visual-config.ts`, `/creditos` y «Lo que es ilustrativo».

Quedan tres cosas que corregir ya:
- **un criterio de D45 cambiado sin el OK de Iván** (el salto de brillo en el borde con lo real), que el informe da por cumplido;
- **los pósters del explorador, que ya no casan con el 3D** desde que se trajo la 9c: en cada carga, el fundido enseña dos escenas;
- **la tabla nueva de `/creditos`**, con una violación grave de axe a 320 px que los e2e no miran.

No hay Bloqueantes.

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | Importante | `docs/informes/fase-9b.md:184` y `:499`; `scripts/lib/moon-map-build.mjs:21-29` y `:93-112`; `docs/datos/recreacion-lunas.md` | **El criterio del borde de D45 se ha cambiado y se da por cumplido.** La adenda pide «en el borde con lo real, ningún salto de brillo medio mayor que ΔL\* 2». El build y el informe lo sustituyen por «como mucho 2 L\* por encima de lo natural» (bordes ficticios dentro de lo real) o «del salto que ya tenía el mosaico», y la fila lleva ✅. En valor absoluto, con su propia medida (σ = 4 texeles, por teselas de 64), el salto llega en el percentil 95 a 7,98 (Dione), 6,91 (Miranda) y 6,35 (Oberón) en el borde con lo no visto, y a 12,71 (Titania) y 7,98 (Mimas) en el borde con lo visto de lejos. El motivo técnico es razonable: a esa escala, un borde trazado al azar dentro de lo real ya salta de 2,4 a 9,8. Pero es un cambio de criterio, que `CLAUDE.md` reserva a Iván, y no está en `PENDIENTES.md`. Además, la escala de unos 0,7° la elige el propio script: a una escala de «brillo medio» más ancha, el umbral absoluto quizá sí se podría medir. | Llevarlo a Iván como cambio de criterio (en `PENDIENTES.md` y en §9) y marcar la fila con ⚠️ hasta su OK. O medir el salto a una escala de brillo medio de varios grados, donde lo natural quede por debajo de 2, y dar las dos cifras. |
| 2 | Importante | `public/img/poster-{earth,moon,sky}-{escritorio,movil}.webp` (y `poster-system-*`); `scripts/build-poster.mjs:10-11`; `docs/informes/fase-9b.md:516` | **Los pósters ya no casan con el 3D.** Los de la vista general y la Tierra se regeneraron el 08-11, antes de traer la 9c (`bdacb27`); los de la Luna y el cielo son del 01-11. La 9c movió el encuadre y el cierre cambió el suelo del cielo. Lo he medido con la ventana de `build-poster.mjs` (1600 × 900 y 360 × 760 a 2×) frente a `engine.capture()` del build de la rama: una diferencia media de 10,9 y 15,0 niveles en la Tierra (escritorio y móvil), de 15,3 y 22,5 en la Luna (del 14 al 21 % de los canales, a más de 40 niveles), de 4,8 y 9,9 en el cielo y de 2,9 y 3,7 en la vista general. En el móvil, la Luna del póster es pequeña y está arriba a la izquierda, y la del 3D es grande y está centrada. En el cielo, el horizonte pasa del 42 % al 86 % de la altura y el suelo, de negro al degradado del cierre; su lienzo mide ahora 720 × 1424. El propio script lo avisa: el 3D entra con un fundido sobre el póster y se ven dos escenas a la vez. El informe dejaba los de la Luna y el cielo «hasta la interfaz de la 9c», que ya está. | Regenerar los ocho pósters con el build final (`node scripts/build-poster.mjs`, con `CAPTURE_PORT`) y comprobarlos con el 3D, como en la revisión de diseño de la fase 3c (su hallazgo 1, el mismo caso). |
| 3 | Importante | `src/app/pages/credits/credits-page.css:49-56`; `src/app/pages/credits/credits-page.html:105` | **La tabla nueva de `/creditos` tiene una violación grave de axe a 320 px.** La de lo recreado de las lunas (`display: block; overflow-x: auto`) mide 299 px en un hueco de 264 a 320 px de ancho: se desplaza, pero sin `tabindex` ni nada enfocable dentro. axe (WCAG 2.1 A y AA) da `scrollable-region-focusable` (serious) en `table`, y §5 pide 0 violaciones graves. Lo he pasado con un script en las páginas que toca la fase (`/creditos`, `/sobre-el-proyecto`, `/sol`, `/planetas/venus`, `/lunas/triton` y `/lunas/deimos`, a 320 y a 412 px), y solo sale esta. El e2e de axe corre a 1280 y a 412 px (el Pixel 7), y el de 320 px solo mira que la página no se desborde: por eso no lo ve. | Envolver la tabla en un contenedor desplazable enfocable (`tabindex="0"`, `role="region"` y el nombre de su `caption`), como el diagrama de «Sobre el proyecto», o hacer que quepa a 320 px (la cabecera «De lejos (con detalle recreado)», más corta). Pasar axe a 320 px en las páginas de lectura. |
| 4 | Menor | `docs/PLAN.md:719` y `:748`; `src/app/scene/visual-config.ts:139-143`; `src/app/scene/renderer.ts:19`; `src/app/scene/materials/sun-material.ts:21-24`; `src/app/scene/quality.ts:74-79` | **El plan no recoge lo que cambió la segunda vuelta del Sol, y el bloom apagado se sigue publicando.** Desde la segunda vuelta, aprobada por Iván, el bloom está apagado (`enabled: false`) y el Sol de cerca se pinta cada 50 ms también en pausa (`SUN_FRAME_MS`, una excepción a «Render bajo demanda» de `CLAUDE.md`). El plan sigue diciendo que el bloom va «en los niveles alto y medio» y «ya no opcional», y no menciona la excepción: la fase 10 partiría de un plan que no casa con el código, y según el propio plan, cuando no casan, manda el plan. Además, el `UnrealBloomPass` y `sun-bloom.ts` (unos 16 kB minificados; su sombreador está en `chunk-CISUKZ5M.js`, el del visor) se cargan siempre sin usarse, y hay comentarios que lo dan por activo. | Apuntar en el plan (§6: la 9b.c y la tarea 9 de la fase 10; §4.5) el bloom apagado y los 50 ms del Sol de cerca como decisiones de la segunda vuelta. Quitar el bloom (queda en git) o cargarlo con `import()` solo si `enabled`. Poner al día los comentarios. |
| 5 | Menor | `docs/FUENTES.md:101-103` | **Las filas de los pósters, las miniaturas y las imágenes de las fichas se han quedado atrás.** Dicen «2026-11-05 … con el Sol de la fase 9b» y «cambian el Sol, con su bloom», pero se regeneraron el 08-11 con el Sol de la segunda vuelta (sin bloom), la Tierra realzada y las lunas de la 9b.d. Su columna de licencia no nombra el crédito del JPL («Courtesy NASA/JPL-Caltech», D43), y ya lo necesitan las miniaturas y las fichas de Deimos y de las cinco de Urano. Tampoco nombra el NAIF, del que salen las formas de Fobos y Deimos que se ven en esas imágenes. | Poner al día las fechas y lo que cambia, y añadir a esas filas las atribuciones del JPL y del NAIF. |
| 6 | Menor | `docs/informes/fase-9b.md:68`, `:83`, `:251` y `:512`; `src/app/scene/visual-config.ts:171` | **El informe se contradice en lo que ya está hecho.** §1 dice «Hechas … 9b.a, 9b.b, 9b.c, 9b.d y 9b.f» y falta la 9b.e. La fila de los textos del Sol (§2) sigue con «⏳ el panel» y con «dos frases … se han quedado atrás (§9)». «Dónde se queda» y §4 dicen que la línea del panel «va al juntar». En cambio, §3 (9b.f.13) y el cierre la dan por puesta, y lo está: `body-panel.html`, con su test. El contraste del Sol a lo largo del tiempo sale «de 4,9 a 5,8» en `visual-config.ts` y «de 4,66 a 5,57» en el informe (§2 y §5). | Poner el informe al día y dejar una sola cifra del contraste, la del build final. |
| 7 | Menor | `docs/informes/fase-9b.md:768`; `docs/PENDIENTES.md` (secciones de la 9b) | **Una decisión de Iván, solo en el informe.** El color del radar de Venus (en gris o teñido como las fotos de las Venera) está en §9 «para Iván», pero no en `PENDIENTES.md`, que no tiene nada de la 9b.f, de la 9b.e ni del cierre. Según `CLAUDE.md`, lo que decide Iván va ahí. | Añadirla a `PENDIENTES.md`, junto con el criterio de D45 del hallazgo 1. |
| 8 | Sugerencia | `src/styles.css:937-954`; `docs/informes/img/fase-9b/cierre-*-etiquetas-*.webp` | **El arreglo de las etiquetas no se ve en sus capturas.** En `escritorio-etiquetas-tierra`, la etiqueta cae fuera del disco: el antes y el después son iguales en ese recorte. Y el contraste no se mide. Lo he calculado: la placa (el 88 % de `--color-bg`) sobre blanco puro deja `--color-text` a 10,6:1, el acento a 7,0:1 y `--color-text-muted` (las lunas) a 5,5:1. Cumple. | Dar esas cifras en el informe y, si se quiere, una captura con una etiqueta sobre un disco claro (una luna de Urano delante del planeta). |
| 9 | Sugerencia | `src/app/scene/engine.ts:1088-1106`; `src/app/scene/materials/sun-material.ts:118-130` y `:176-198` | **El Sol de cerca en el móvil, sin medir.** Con el Sol de cerca, el motor pinta 20 veces por segundo sin fin, también en pausa: unas diez evaluaciones de ruido por píxel en el disco y 3 × 14 hilos en el halo. Solo se ha medido con una RTX 3060. El tiempo de la superficie crece sin tope desde que se carga la página y entra en `fract(sin(x)·43758)`. En las GPU de móvil, `sin` pierde precisión con argumentos grandes, y tras decenas de minutos pueden salir patrones. | En la fase 10, medirlo en un móvil (FPS y batería), y valorar un ritmo menor en el nivel bajo. Un hash entero (WebGL2 lo permite) o un tiempo acotado con fundido evitaría lo de la precisión. |
| 10 | Sugerencia | `src/app/data/photometry.ts` (Titán, `terminatorExponent`); `scripts/measure-titan-terminator.mjs` | El terminador de Titán (e = 1,15) se ajusta a PIA06230 y se valida con la misma foto (del 9,2 % al 2,4 %, y un 8,4 % en la escena). El README pide comparar con fuentes independientes. | Comprobarlo con otra foto de Cassini con otra fase. |
| 11 | Sugerencia | `src/app/scene/engine.spec.ts:2471` | La pregunta abierta del test de las nubes: no he encontrado una causa determinista (detalle abajo). | Si vuelve a fallar, guardar la salida completa (¿aserción o tiempo agotado?). Si fue el tiempo, darle un timeout explícito, como a sus vecinos pesados (`:604`, `:622`). |

## Lo comprobado

### `npm run check` (08-11, 19:39, con el equipo libre)
```
All files pass linting.
All matched files use Prettier code style!
Test Files  81 passed (81) · Tests  808 passed (808) · 47,5 s
Statements 98.93 % · Branches 94.18 % · Functions 100 % · Lines 99.69 % (ephemeris/)
Initial total 315.27 kB (89.34 kB transferidos) · chunk del visor (three) 813.58 kB
Prerendered 40 static routes · el mayor fichero publicado, textures/8k/moon.69fa90142f.webp: 3.34 MiB de 25
✔ El JS inicial de las 40 páginas (20 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 13.81 kB de 15.00
✔ Enlaces de las 40 páginas: 1238 internos bien (rutas, ficheros y anclas); 120 externos sin comprobar
EXIT=0
```
Sin avisos de presupuesto. Es lo que da el informe (§6, «El cierre»).

### Más ejecuciones
- **e2e completos** (`E2E_PORT=4393 npx playwright test`, sobre el build del check, tres proyectos y cuatro workers): **137 passed (7,6 min)**. Entre ellos, el nuevo de `arranque.spec.ts` (el explorador carga aunque `requestIdleCallback` solo llame por su `timeout`), los de `venus.spec.ts`, el del radar en `movil.spec.ts` y axe en las 40 rutas, en escritorio y en móvil.
- **Las medidas del informe, repetidas** con `CAPTURE_PORT=4341` y la GPU del equipo:
  - `measure-sun.mjs limbo totalidad`. Los exponentes del limbo: **α R 0,429 · G 0,511 · B 0,629** (la ley: 0,426 · 0,508 · 0,626). En la totalidad, la Luna sale a **L\* 12,0**, el cielo lejos de la corona a L\* 19,2 · C\* 14,8 · h 283°, y de 5° a 33° de altura, h de 282° a 285°. A 0,5° de altura, h 65° y C\* 26,3.
  - `measure-d46.mjs` (las dos partes). El Sol de cerca, en escritorio: el centro, **L\* 79,7 · C\* 51,4 · h 81°**; el borde, **69,8 · 56,1 · 75°**; σL\*, **4,75** (la referencia: 78,6 · 51,5 · 81°, 71,8 · 53,4 · 76° y 4,13). En la vista general, 79,8 · 51,3 · 81°. La Tierra: el Atlántico sur a h 274° y C\* 33,1, y el Índico a h 280° y C\* 32,6. Las nubes cubren el 1,4 % del disco en escritorio (el informe, 1,5 %) y el 1,0 % en el móvil. El reflejo llega a 243 de 255.
  - `measure-earth-night.mjs`. El suelo sin luces queda a **L\* 0,2 · C\* 0,2** en escritorio y a 0,1 · 0,2 en el móvil, y las luces a h 94°. En la vista general, ΔL\* 8,0 y 9,6.
  - `measure-views.mjs`, con una RTX 3060 sobre ANGLE/D3D11 y el equipo libre. Las 15 vistas en los tres niveles dan **59–60 FPS** de mínimo. La VRAM más alta, la de la vista Tierra en alto, es de **278 MB de 300**; en bajo, como mucho 86 de 120. Las llamadas de dibujo van de 5 a 21: la vista general, 38 MB y 21 llamadas, sin el bloom, y el Sol de cerca, 38 MB y 8. La primera vista pesa 513 kB. Es la tabla del cierre del informe (§2).
  - Un script mío, en el scratchpad y sin escribir en el repo, para los pósters (hallazgo 2): la ventana de `build-poster.mjs` frente a `engine.capture()`.
- **axe a 320 y a 412 px** en `/creditos`, `/sobre-el-proyecto`, `/sol`, `/planetas/venus`, `/lunas/triton` y `/lunas/deimos`, con otro script mío (WCAG 2.1 A y AA). Solo falla `/creditos` a 320 px (hallazgo 3): su tabla mide 299 px en un hueco de 264. A 360 y a 412 px cabe.
- **Bajo carga** (dos `npm test` completos a la vez): pasan los 808 tests en las dos ejecuciones.

### Criterios de aceptación mirados
- **Tarea 0.** Hecha, y ahora con la versión de la 9c, que la trae.
- **9b.a.**
  - El muestreo de `illustrative-layout.spec.ts` imprime los márgenes. Ninguna luna toca nada: en escritorio, luna y otro cuerpo 0,77, lunas de sistemas distintos 1,56 y lunas del mismo sistema 0,05.
  - «luna y su planeta 0,00» sale con los sistemas comprimidos casi del todo: radios casi nulos, que no se dibujan. Lo cubre el umbral de presencia de `overviewMoonPresence`, y el test solo cuenta las lunas con radio mayor que 0.
  - Las proporciones cuadran con β = 0,65 y el radio ecuatorial: Ganímedes, el 11,7 %, y la Luna, el 42,9 %.
  - En las capturas, Saturno desde arriba en 2029 tiene todas sus lunas fuera de los anillos.
- **9b.b.** Repetida y cumplida (arriba). `antes-` y `despues-tierra-vista-luces`: un suelo negro y luces cálidas.
- **9b.c.**
  - El limbo y la totalidad, repetidos.
  - La rotación diferencial (Lößnitz et al., 2025) y el calendario de manchas, deterministas y con test.
  - El bloom ya no está (hallazgo 4).
- **9b.d.**
  - Las formas, frente a los semiejes publicados, con test.
  - Los mapas nuevos tienen sus sondas en el build y su licencia en `FUENTES.md`.
  - La dicotomía de Jápeto sigue a los albedos de la NASA.
  - Lo real de cada luna queda igual byte a byte (`assertRealUnchanged`).
  - Los porcentajes están en el informe, en `FUENTES.md` y en `/creditos`.
  - El grano, de 0,93 a 1,26, cumple.
  - El borde no cumple como está escrito (hallazgo 1).
  - Proteo sigue siendo una esfera, por decisión de Iván.
- **9b.f.**
  - Repetida y cumplida (arriba), con los criterios más estrictos de la segunda vuelta.
  - En `/cielo`, la totalidad mide lo mismo que en la 9b.c (arriba). Sí cambia su suelo, por el backlog 17.
  - Los textos de «realzado» están en sus tres sitios: la ficha (`body-texts.json`, con sus citas), el panel (`body-panel.spec.ts`) y «Lo que es ilustrativo» y `/creditos`.
- **9b.e.**
  - El botón tiene `aria-pressed`, va con el teclado y se describe con el aviso (`aria-describedby`).
  - La textura se pide al pulsarlo y se suelta al apagarlo, al dejar Venus o la vista, y al cerrar la ficha.
  - El fundido es un corte con movimiento reducido.
  - En la capa (`venus-radar.ts`), cada petición nueva (o el apagado) descarta las cargas que aún no han llegado, y un cambio de calidad pide el nivel nuevo sin quitar el que se ve.
  - La licencia está en `FUENTES.md` y en `/creditos`.
  - Maat Mons cae en su sitio en `venus-radar-maat-mons`.
- **El cierre.**
  - `@defer (on idle(3s))`: Angular 22 pasa el `timeout` a `requestIdleCallback`. Lo he visto en `ɵɵdeferOnIdle` y en `RequestIdleCallbackService`.
  - `stats().texturesLoading` envuelve la fuente de texturas. `load` es `async`, así que no puede lanzar sin pasar por `finally`. Lo usan `e2e/support.ts:85-103` y `scripts/capture-lib.mjs`.
  - El hover del índice queda cubierto: la fila elegida no cae bajo la sombra, por `scroll-padding`, y el foco solo pone contorno.
  - El suelo del cielo se ve en `cierre-despues-movil-cielo-noche`.

### Capturas vistas
- **9b.a:** `antes-` y `despues-escritorio-saturno-arriba`.
- **9b.b:** `antes-` y `despues-tierra-vista-luces`.
- **9b.c:** `despues-escritorio-cielo-eclipse-fraga-cerca`.
- **El Sol de la segunda vuelta:** `sol2-despues-d46-escritorio-sol-cerca`, `-escritorio-sol-sistema` y `-movil-sol-sistema`.
- **La Tierra realzada:** `antes-` y `despues-d46-escritorio-tierra-completa`.
- **Venus:** `venus-escritorio-radar`, `venus-movil-radar` y `venus-radar-maat-mons`.
- **D45:** `d45-triton-seis-vistas-antes` y `-despues`, con el polo norte ampliado: un casquete con textura, sin costuras ni zona lisa. Y `despues-lunas-rejilla`.
- **El cierre:** `cierre-antes-` y `cierre-despues-movil-cielo-noche`, `-movil-etiquetas-sistema` y `-escritorio-etiquetas-tierra`, este con el rótulo ampliado.
- **Los pósters:** los ocho de `public/img/`, frente al 3D de hoy.

### El test de las nubes (la pregunta abierta del informe)
«Las nubes derivan con los frames pintados…» (`engine.spec.ts:2471`): **no he encontrado una causa**.
- **Sin azar ni reloj real.** Con su arnés, el motor es determinista: el reloj y el planificador son falsos, y en `scene/` no hay `Math.random` ni más reloj que `deps.now()` (el de `browser-deps.ts`, que el arnés sustituye). El arranque son solo microtareas, que acaban dentro del primer `flush()`. Por eso el resultado no puede cambiar de una ejecución a otra salvo por el tiempo real.
- **Muy lejos del tiempo límite.** En reposo tarda 119 ms. Con dos `npm test` completos a la vez, 167 ms. El límite de Vitest por defecto es de 5 s, y este test no lo cambia.
- **Estado compartido, sin culpable.** El builder de Angular corre Vitest con `isolate: false`: los ficheros de un mismo worker comparten módulos. Pero ningún spec cambia nada que use este test. El único que toca `VISUAL_CONFIG` es el interruptor del bloom, y lo restaura en `afterEach`. Los relojes falsos de Vitest también se restauran en todos los specs que los usan.

Lo que queda es el entorno: un tiempo agotado o un worker caído, con el equipo saturado por tres sesiones con e2e en SwiftShader. Sin el mensaje del fallo no se puede distinguir. De ahí la sugerencia 11.
