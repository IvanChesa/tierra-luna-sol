# Revisión: Fase 3 (Interfaz del explorador e interacción)

- **Fecha:** 2026-10-26
- **Revisado:** `main...fase-3-interfaz` (36 commits, 155 ficheros, +8585/−450; HEAD `145614c`), `docs/informes/fase-3.md`, las 26 capturas de `docs/informes/img/fase-3/` y las 10 de `diseno/`, `docs/DISENO.md`, `docs/ESTILO.md` y `docs/revisiones/fase-3-diseno.md` (otro subagente verifica sus 23 hallazgos; aquí no se repite ese trabajo)
- **Veredicto: CAMBIOS NECESARIOS**

Veredicto: CAMBIOS NECESARIOS. Ningún bloqueante, 3 importantes, 7 menores y 4 sugerencias.

La fase cumple sus siete criterios, y casi todo lo he comprobado por mi cuenta. Los enlaces abren el estado exacto (también de ida y vuelta: pausar, copiar la URL y reabrirla da el mismo instante) y la URL no cambia al reproducir. El store se actualiza 4,8 veces por segundo, el motor pinta a 4 Hz en tiempo real y no pinta nada en reposo. Los viajes de verdad no dejan fugas (he contado los objetos WebGL uno a uno), con movimiento reducido no hay vuelos y los 39 e2e pasan. El código es limpio, respeta las capas y los tests prueban comportamiento.

Antes de fusionar conviene corregir tres fallos, todos rápidos:
1. Si el motor falla después de crearse (por ejemplo, `stars.bin` con un 503), el aviso promete que «el tiempo sigue funcionando», pero el tiempo se queda congelado.
2. Al cerrar la ficha con su botón y al entrar o salir de la vista limpia, el foco se pierde en `<body>`.
3. La ficha de las 21 lunas atribuye a JPL la rotación y la órbita, que vienen de las fichas de la NSSDCA.

## Verificación independiente
No me he fiado del informe. Los scripts y sus salidas están en mi directorio temporal. Usé un servidor propio del build en el puerto 4377 y el Chromium de Playwright con la GPU (ANGLE sobre D3D11, RTX 3060). Esto es lo que he ejecutado y lo que ha salido:

### Checks y e2e
- **`npm run check` → código 0** (1 min 37 s):
  - Lint y Prettier, limpios. **349/349 tests** en 47 ficheros.
  - Cobertura de `ephemeris/`: 99,57 % de sentencias, 96,73 % de ramas y 100 % de funciones y de líneas.
  - Build sin avisos: `main` 289,28 kB, **inicial 296,25 kB** (81,90 kB transferidos), motor (three) 636,11 kB, interfaz diferida (astronomy-engine, stores y controles) 213,33 kB y layout 7,00 kB. 17 rutas prerenderizadas.
  - `check-initial-bundle`: «✔ El JS inicial de las 18 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor».

  Son las cifras del informe. Lo único de la aplicación que hay en el JS inicial de `/` es `app.ts`, `app.config.ts`, `app.routes.ts`, `body-index.ts`, `site.config.ts` y `site-title.strategy.ts`, más el chunk del layout que precarga el HTML (7 kB: layout, selector de vista y póster).
- **e2e** (`npx tsc -p tsconfig.e2e.json && npx playwright test` sobre ese build): **39 passed en 2,1 min**, a la primera y sin reintentos (33 de escritorio, 5 de móvil y 1 sin WebGL).

### En el navegador
- **Estado exacto.**
  - `/?captura=1&fecha=2030-06-01T12:00Z&cuerpo=jupiter&escala=real` deja el motor en 2030-06-01T12:00:00.000Z, en pausa, con Júpiter enfocado y en escala real.
  - Sin captura, la interfaz dice lo mismo (14:00:00 en Madrid, ficha de Júpiter) y la URL no cambia.
  - Ida y vuelta: a 1 día/s, reproducir 2,3 s y pausar deja `?cuerpo=saturno&fecha=2030-06-03T19:58:48Z`. Esa URL, en otra pestaña, abre el mismo instante (0 ms de diferencia) y con Saturno.
- **URL al reproducir** (con `pushState` y `replaceState` instrumentados):
  - al pulsar «Reproducir», 1 cambio (sale la fecha);
  - después, **0 cambios** en 4 s, aunque cambien la velocidad (`,`) y el sentido (`R`);
  - elegir Marte mientras se reproduce escribe `?cuerpo=marte` (es una selección: está permitido);
  - al pausar, vuelve la fecha.
  - La excepción es `calidad` (hallazgo 7).
- **Store:** **4,78 eventos `timeChanged` por segundo** a 1 año/s (en 5 s).
- **Render bajo demanda:**
  - en pausa, 0 frames y 0 `requestAnimationFrame` en 3 s;
  - en tiempo real, **4 frames/s** del motor (8 rAF/s en total: los otros 4 serán, probablemente, del planificador de Angular, uno por cada `timeChanged`);
  - a 1 día/s, 60 FPS, 1,6 ms de CPU, 0,17 ms de efemérides y 34 llamadas;
  - a 1 año/s, 60 FPS, 2,3 ms y 12 llamadas (los cuerpos en aliasing no se dibujan).
- **Aliasing a 1 año/s:**
  - en la vista general, `stats().aliased` incluye Mercurio (24,9° por frame a 60 FPS) y las 21 lunas;
  - con Marte enfocado, Fobos y Deimos (e2e);
  - con Fobos enfocado, también Marte (por el periodo aparente), sin nada raro en pantalla.
- **Viajes sin fugas** (sin captura, con viajes animados de verdad). Instrumenté los `create*` y `delete*` de WebGL e hice 4 ciclos de Tierra → Luna → sistema → Júpiter → Saturno → vista general:
  - tras el primero y tras el cuarto quedan los mismos objetos vivos: 15 texturas, 24 buffers, 7 programas, 7 VAO y 3 framebuffers;
  - 1 contexto vivo, 1 `<canvas>` y 10,7 MB de heap (tras `gc()`);
  - después, cuatro idas y vueltas explorador ↔ `/planetas/marte`: 1 contexto vivo y 10,7 MB.
- **Movimiento reducido** (sin captura):
  - elegir Júpiter cuesta 6 rAF (121 sin movimiento reducido) y pasar a la Tierra, 8 (183);
  - «Saltar el viaje» no llega a aparecer;
  - las transiciones de texto quedan en 0,01 ms (la regla global de `styles.css`; lo comprueba el e2e de `vistas`).
- **Teclado.** El orden de tabulación es: «Saltar al contenido», la cabecera, el selector de vista, el lienzo (con el anillo en la parte visible), la cámara, el índice (una sola parada) y la barra de tiempo. Espacio en el lienzo reproduce y pausa. Los problemas de foco están en el hallazgo 2.
- **`aria-live`.** Solo habla al elegir un cuerpo y al cambiar de vista: «Saturno, planeta. A 1410 millones de km del Sol y a 1270 millones de km de la Tierra.», «Vista de la Tierra.», «Vista del sistema solar.». En 3 s de reproducción, 0 cambios.
- **CLS y desplazamientos:**
  - CLS al cargar `/`: 0,0002 en escritorio y 0 en móvil (390 × 844, táctil);
  - en móvil, elegir en la tira solo desplaza la tira; ningún contenedor con `overflow: hidden` se mueve;
  - en escritorio, abrir `?cuerpo=titan` o `?cuerpo=proteo` a 1280 × 720 y a 1024 × 600 solo desplaza el índice.
- **Fallos provocados** (los resultados, en los hallazgos):
  - `stars.bin` con un 503 (hallazgo 1); «Reintentar» con la red ya bien sí recupera la escena: el arreglo de la fase 2 funciona;
  - sin WebGL, con `--disable-3d-apis` (hallazgo 8);
  - fechas escritas a mano (hallazgo 4), y 1900 y 2100 en la hora local (hallazgo 5);
  - pestaña oculta 10 s en «Tiempo real» (hallazgo 6);
  - `?calidad=baja` y `?calidad=xyz` (hallazgo 7).
- **Carga:**
  - sin limitar la red, la interfaz aparece a los 283 ms y el 3D a los 380 ms;
  - con un 4G lento (9 Mbps y 85 ms), a los 1,4 s y a los 2,3 s;
  - el chunk del motor no se pide hasta que llega el de la interfaz (van en serie). Cuesta algo más de un RTT: no lo cuento como hallazgo.
- **Carga de la máquina:** el verificador de diseño usaba la GPU a la vez que yo. Mis mediciones de FPS llegaron a 60, así que no se nota.

### Capturas y repo
- **Capturas:** he revisado las 26 de `img/fase-3/` (el informe dice 27) y las 10 de `diseno/`. Son coherentes entre sí y con `DISENO.md`:
  - paneles planos, y el latón solo en lo elegido y en lo interactivo;
  - cifras tabulares, y en la ficha las unidades en gris;
  - a 1 año/s, Fobos y Deimos como órbitas.

  Una nota de composición, en el hallazgo 11.
- **Repo:** mi único cambio es este fichero. `git status` muestra además `.codex/` y `AGENTS.md` (sin seguimiento, no son del proyecto) y `docs/revisiones/fase-3-diseno.md`, que no he tocado: lo está ampliando en paralelo el verificador de diseño.

## Criterios de aceptación

| Criterio | Estado | Comprobación |
|---|---|---|
| Capturas del diseño y de la implementación (escritorio y móvil) coherentes entre sí y con `DISENO.md` | ✅ | 26 + 10 capturas revisadas. Las correcciones de diseño las verifica el otro subagente. |
| Todo usable con teclado y sin canvas, incluido el control de cámara; el diálogo de atajos funciona | ✅ con matices | Teclado completo y e2e en verde. Pero el foco se pierde al cerrar la ficha y en la vista limpia (hallazgo 2) y, sin 3D, el lienzo sigue siendo una parada (hallazgo 8). Además, si el motor falla después de crearse, el tiempo no avanza (hallazgo 1). |
| Movimiento coherente (Mercurio ~4 vueltas por cada vuelta de la Tierra), también hacia atrás, y sin aliasing a 1 año/s | ✅ | Test del motor en los dos sentidos, e2e y `stats().aliased` (repetido). A 1 año/s, Mercurio también pasa a órbita (24,9° por frame, por encima de los 20° de §4.5): la razón 4:1 se ve a 1 mes/s. |
| Los enlaces con parámetros abren el estado exacto; la URL no cambia durante la reproducción; un parámetro no válido no rompe nada | ✅ con matiz | Repetido: estado del motor, ida y vuelta y 0 cambios de URL. `calidad` no se limpia ni se sincroniza (hallazgo 7). |
| Store ≤ 5 actualizaciones/s; el viaje sistema → Tierra → Luna → sistema no recrea el motor ni deja fugas | ✅ | 4,78 por segundo. Con viajes de verdad, los objetos WebGL no crecen y hay un solo contexto. El e2e de fugas usa `?captura=1`, donde los viajes son cortes; mi prueba cubre los viajes animados. |
| Con movimiento reducido no hay animaciones de cámara ni de texto | ✅ | De 6 a 8 rAF por orden (de 121 a 183 sin movimiento reducido) y transiciones de 0,01 ms (regla global y e2e). |
| e2e en verde en local (y en el CI, en la fase 4) | ✅ | 39/39 en 2,1 min. |

## Lo mejor de la fase
- **La interfaz no depende del 3D.** Las distancias salen de `data/solar-system.ts` (sin three) y, sin motor, el store lleva su propio reloj a 4 Hz. El e2e sin WebGL lo demuestra.
- **La disciplina de §4.5, medida y no solo afirmada.** ≤ 5 eventos por segundo, 0 cambios de URL al reproducir, 0 frames en reposo y render a 4 Hz en tiempo real (a 1 s/s nada se mueve ni un píxel por frame: un detalle fino).
- **Encuadre con `setViewOffset` y el campo de visión compensado.** La escala angular por píxel no cambia al abrir un panel. Los márgenes se miden clasificando los paneles por el borde que tapan, cambian con suavidad y valen también para las etiquetas y la selección.
- **Vuelos y viajes con una sola coreografía.** La mirada, los ángulos y la distancia (en escala logarítmica) se solapan. Son interrumpibles, emiten `travel`, tienen «Saltar» y `Esc`, y con movimiento reducido son un corte. Sin fugas con viajes de verdad.
- **Aliasing bien resuelto.** Histéresis, el intervalo real entre frames y el periodo aparente desde el foco; además, expuesto en `stats().aliased` para los e2e.
- **Accesibilidad trabajada.** Árbol de WAI-ARIA con tabindex itinerante, una región viva sin ruido (el espacio duro alternado repite un anuncio), atajos de una tecla desactivables y recordados (WCAG 2.1.4) y axe en todas las páginas.
- **Buenos tests.** Los e2e son deterministas, esperan a los eventos del motor y prueban la maquetación en pantallas bajas. Los unitarios usan un motor falso que se comporta como el real (nace en pausa y responde con `timeChanged`).
- **La robustez de la fase 2 sigue en su sitio.** Un lienzo nuevo por intento y guardas después de cada `await`: «Reintentar» recupera la escena tras un 503 de `stars.bin`.

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | **Importante** | `src/app/features/viewer/viewer-canvas.ts:175-177, 194-199` · `src/app/state/simulation.store.ts:240-245` · `src/app/scene/engine.ts:585-591, 601` | **Si el motor falla después de crearse, el tiempo se congela, aunque el aviso diga lo contrario.** El store se queda conectado al motor roto: `fail()` solo cambia el estado del lienzo y nadie llama a `session.detachEngine()`. Así, el reloj propio del store (el de «sin WebGL») no arranca, y el motor no avanza porque su bucle exige `ready`. **Reproducido** con `data/stars.bin` respondiendo 503 y sin fecha en la URL: sale «No se ha podido mostrar la escena 3D. No se han podido descargar los datos de la escena. Comprueba la conexión. El índice, la ficha y el tiempo siguen funcionando.». La barra dice «Pausar», pero el tiempo avanza **0 ms en 3 s** en tiempo real y 0 ms en 2 s a 1 día/s, también después de pausar y volver a reproducir. Con «Reintentar» y la red ya bien, vuelve a correr. El e2e sin WebGL no lo ve porque ahí el motor ni siquiera llega a crearse. Pasa con cualquier fallo del arranque (la red al bajar las estrellas, `compileAsync`, un catálogo corrupto) y, mientras dura, con la pérdida del contexto. | Al recibir `error`: `session.detachEngine(engine)`, `engine.dispose()` y `this.engine = null`. Así, el store arranca su reloj si estaba reproduciendo. Añadir un e2e: `stars.bin` con un 503 → el tiempo avanza → «Reintentar» con la red bien → el motor vuelve a llevar el tiempo. Valorar lo mismo con `contextLost`, o decir en la interfaz que el tiempo se detiene hasta que vuelve el contexto (el mensaje llega en la fase 10). |
| 2 | **Importante** | `src/app/features/camera-controls/camera-controls.ts:43` · `src/app/features/explorer-ui/explorer-ui.html:39` · `src/app/features/explorer-ui/explorer-ui.css:108-110` · `src/app/features/body-panel/body-panel.html:12` · `src/app/features/explorer-ui/explorer-session.ts:185-187, 204-207` | **El foco se pierde (queda en `<body>`) cuando la interfaz oculta el elemento que lo tiene.** Medido con `document.activeElement` en cinco casos: <br>• al pulsar «Vista limpia» (el botón pasa a `display: none`); <br>• al pulsar «Mostrar la interfaz» (el botón desaparece); <br>• con `V`, con el foco en el índice; <br>• con `Esc`, al salir de la vista limpia; <br>• al cerrar la ficha con «×» (el panel recibe `[hidden]`). <br>Con un lector de pantalla no se oye nada y el punto de lectura salta. Con el tabulador, se sigue desde donde estaba el elemento oculto. `docs/angular-buenas-practicas.md` exige la gestión del foco y WCAG 2.4.3, un orden que conserve la operabilidad. | Al entrar en la vista limpia, llevar el foco a «Mostrar la interfaz»; al salir, devolverlo a donde estaba (o a «Vista limpia»). Al cerrar la ficha con su botón, llevarlo a la fila del cuerpo en el índice (o al elemento que lo tenía antes de abrirla). Se puede hacer con `afterNextRender` en la sesión o en `ExplorerUi`. Comprobar `activeElement` en los e2e de `camara` y de `indice-y-ficha`. |
| 3 | **Importante** | `src/app/features/body-panel/body-panel.ts:51` · `src/app/features/body-panel/body-panel.html:60-61` | **La ficha atribuye a una sola fuente datos que vienen de dos.** «Datos de…» cita la fuente del radio para toda la tabla. En la Luna y las otras 20 lunas, el radio sale de NASA/JPL SSD (`jpl-satellite-physical-parameters`), pero la rotación y la órbita salen de las fichas de la NSSDCA (`nssdc-planets`, `nssdc-mars`, `nssdc-saturnian-satellites`…). Lo he comprobado en `data/body-data.ts`, cuerpo a cuerpo. En pantalla (`escritorio-luna-de-saturno.webp`), la «Rotación: Síncrona» y la «Órbita: 15,9 días» de Titán aparecen como «Datos de NASA/JPL, Solar System Dynamics». En los planetas y el Sol, las fuentes coinciden. CLAUDE.md: «Cada dato lleva `source`»; y el rigor es uno de los objetivos del proyecto. | Reunir las fuentes distintas de las filas que se muestran y citarlas todas («Radio: NASA/JPL SSD. Rotación y órbita: NASA, NSSDCA.»), o poner una nota en cada fila, como en las fichas completas (ESTILO §5). Añadir un test de componente que compruebe que cada fila tiene su fuente citada. |
| 4 | Menor | `src/app/features/time-controls/time-controls.html:60, 75, 116-118` · `src/app/features/time-controls/time-controls.ts:110-118` | **Escribir una fecha a mano dispara el error y salta a fechas intermedias.** Chromium lanza `change` en cuanto el campo forma una fecha, también a medio escribir. Tecleando «15032031» sobre el 01/06/2030, el tiempo salta al 15/06/2030 y después al 15/03/2030 (en pausa, cada salto se escribe además en la URL). El mes «0» y los años 0002, 0020 y 0203 hacen aparecer dos veces la alerta asertiva (`role="alert"`) «Esa fecha no existe o se sale del rango…», que el lector anuncia mientras escribes. El e2e no lo ve porque usa `fill()`. | Aplicar la fecha al confirmar (`blur` o `Intro`), no en cada `change` mientras el campo tiene el foco; o, como mínimo, mostrar el error solo al salir del campo. Añadir un e2e con `keyboard.type`. |
| 5 | Menor | `src/app/features/time-controls/time-controls.ts:38-39, 112-113` | **Los límites del campo de fecha están en UTC y se comparan con el año local.** `min` y `max` son 1900-01-01 y 2100-12-31, y `commit()` mira el año que pone el campo. En Madrid, el principio y el final del rango quedan fuera de esos límites: con `?fecha=1900-01-01T00:00Z`, el campo dice 31/12/1899 23:45:16 (`rangeUnderflow`: el campo queda `:invalid`); con `?fecha=2100-12-31T23:30Z`, 01/01/2101 00:30 (`rangeOverflow`). Además, rechaza instantes válidos: las 00:15 del 01/01/2101 (las 23:15 UTC del 31/12/2100) dan «Esa fecha no existe o se sale del rango» y no se aplican. | Poner `min` y `max` en la zona elegida (`toDateInputValue(MIN_DATE, zone)`…) y validar el instante (`MIN_MS ≤ ms ≤ MAX_MS`), no el año. Añadir un test en `time-controls.spec` en los dos extremos. |
| 6 | Menor | `src/app/scene/engine.ts:108, 618-619, 1060-1069` | **«Tiempo real» se queda atrás del reloj.** El motor no cuenta el tiempo con la pestaña oculta (`onVisibilityChange` pone `lastFrameMs = null` y el frame siguiente avanza 16 ms), tampoco el del arranque, y recorta cada frame a 400 ms. Medido sin fecha en la URL: 0,31 s de retraso nada más cargar y **10,5 s tras ocultar la pestaña 10 s**, mientras la barra sigue diciendo «Tiempo real». Sin WebGL no pasa (el reloj del store usa `Date.now()`), así que el comportamiento cambia según haya o no 3D. | A velocidades lentas (hasta `SLOW_SPEED`, 60 s/s, en los dos sentidos), avanzar con el tiempo real transcurrido, también el de la pestaña oculta y sin el tope de 400 ms; a velocidades altas, mantener la pausa. Si se prefiere que el tiempo se detenga con la pestaña oculta, decirlo en el informe y no llamarlo «tiempo real» en la interfaz. |
| 7 | Menor | `src/app/features/explorer-ui/explorer-session.ts:96, 261-282` · `src/app/features/viewer/viewer-params.ts:128-134` | **`calidad` se lee de la URL, pero nunca se escribe ni se quita.** <br>a) `?calidad=xyz` muestra el aviso y se queda en la URL, así que el aviso vuelve al recargar. El informe dice que «los parámetros malos desaparecen de la URL», pero el e2e solo lo prueba con `fecha`, `cuerpo` y `escala`. <br>b) Con `?calidad=baja`, elegir «Alta» guarda `tls.calidad=high`, pero la URL sigue diciendo `calidad=baja` y, al recargar, vuelve a «Baja»: la URL pisa la preferencia recordada. <br>Medido. | Quitar `calidad` de la URL después de leerla (`viewerQueryParams` devuelve `calidad: null`) o sincronizarla como `escala`. Ampliar el e2e de parámetros con `calidad=xyz`. |
| 8 | Menor | `src/app/features/viewer/viewer-canvas.html:6-9` | **Sin 3D, el lienzo invisible sigue siendo una parada del tabulador.** Sin WebGL (`--disable-3d-apis`), mientras carga y después de un error, el `<canvas>` tiene `opacity: 0`, pero conserva `tabindex="0"`, `role="application"`, el nombre «Vista 3D del sistema solar» y la ayuda de las flechas, que no hacen nada. Medido: el tabulador pasa por él antes de llegar a «Reintentar», y un lector de pantalla anunciaría una aplicación que no existe. | Poner `tabindex`, `role` y `aria-describedby` solo cuando `status() === 'ready'` (o dejarlo `inert` hasta entonces). |
| 9 | Menor | `docs/informes/fase-3.md:28, 77, 80, 231` | **Inexactitudes del informe:** <br>• son 26 capturas, no 27 (§2); <br>• §0.8 dice que en las vistas Tierra y Luna elegir otro cuerpo lleva al sistema solar y que elegir el de la vista no hace nada; el código (y su test) lleva la Tierra y la Luna a su propia vista y abre la ficha del cuerpo de la vista, y §4 no lo recoge; <br>• «Los parámetros malos desaparecen de la URL» no vale para `calidad` (hallazgo 7); <br>• §9 da por hecha la sugerencia 18 de la fase 2, y en escritorio no lo está del todo (hallazgo 11). | Corregirlo y anotar en §4 el cambio respecto a §0.8. |
| 10 | Menor | `src/app/core/format.ts:100, 104-112` · `src/app/state/simulation.store.ts:38, 48, 103` | **Restos:** <br>• `formatLongDate` no la usa nada fuera de su test; <br>• `SimulationStore.qualityLevel` se rellena con `qualityChanged`, pero nadie la lee (con «Automática», la interfaz no dice a qué nivel ha bajado); <br>• el comentario de `utcOffsetLabel` promete «UTC−0:14:44», pero sale «UTC−0:15»: `Math.round` redondea los minutos (el campo de la hora sí da 23:45:16, con la hora solar de Madrid de 1900). | Quitar lo que no se use, o usar `qualityLevel` («Automática (alta)»). Alinear el comentario con la salida, o dar también los segundos. |
| 11 | Sugerencia | `src/app/scene/engine.ts:988-997` · `escritorio-sistema.webp` | **La sugerencia 18 de la fase 2, a medias.** En móvil, la vista general ya llena el ancho. En escritorio (1600 × 900), la órbita exterior sigue saliéndose por la derecha (hay píxeles de órbita en el borde entre y = 477 e y = 703) y por abajo llega a la barra de tiempo. Y el comentario sigue diciendo que «la órbita de Neptuno cabe en la parte visible». | Ajustar los factores (`vertical * 1.9`, `1.06`) teniendo en cuenta la perspectiva del lado cercano, o corregir el comentario. |
| 12 | Sugerencia | `src/app/features/body-picker/body-picker.html:44, 64` · `src/app/features/body-picker/body-tree.ts:1-9` | **Las distancias del índice no llegan al lector de pantalla.** Están fuera del árbol accesible (desviación 4.3), así que quien usa lector solo puede comparar distancias eligiendo los cuerpos uno a uno, y cada elección mueve la cámara. Además, la nota «Planetas: distancia al Sol. Lunas: a su planeta.» habla de una columna que el lector no ve. Y no hay búsqueda por la primera letra (4.2) ni siquiera con los atajos desactivados. | Dar la distancia como descripción que solo cambie en pausa (o al enfocar la fila). Activar la búsqueda por letra cuando los atajos de una tecla estén desactivados. |
| 13 | Sugerencia | `src/app/features/explorer-ui/explorer-session.ts:162-168` · `src/app/features/explorer-ui/notices.ts:17-35` | **Dos cosas que la región viva no anuncia.** La vista general (`G`, `Inicio` o el botón) cierra la ficha y aleja la cámara sin que el lector diga nada. Y los avisos de la URL nacen dentro de la región `role="status"` a la vez que ella (en el `@defer`), así que probablemente no se anuncian. | Anunciar «Vista general del sistema solar.». Añadir los avisos de la URL un tick después de crear la región. |
| 14 | Sugerencia | `src/app/features/explorer-ui/explorer-ui.ts:100-107` | **Los atajos no miran `event.repeat`.** Si se deja pulsada `K` o `V`, alternan sin parar (y cada pausa escribe la URL). | Ignorar las repeticiones en las órdenes que alternan (`K`, `V`, `R`, `N`, `?`, `1`–`3`) y dejarlas en el zoom. |

## Desviaciones del plan (§4 del informe)
- **4.1, la revisión de diseño después de conectar la lógica:** justificada por el corte de la sesión. La revisión de diseño existe y su verificación está en curso. Sin objeción.
- **4.2, sin búsqueda por la primera letra:** razonable mientras las letras sean atajos globales. Con los atajos desactivados ya no hay conflicto (sugerencia 12).
- **4.3, árbol plano y distancias fuera del árbol accesible:** correcto para axe (WCAG 2.5.3) y para que el lector no hable 5 veces por segundo. A cambio, el lector pierde la tabla (sugerencia 12).
- **4.4, atajos desactivables:** bien visto (WCAG 2.1.4 es de nivel A) y bien hecho. La preferencia se recuerda, `Esc` y las teclas del lienzo siguen funcionando, y hay e2e.
- **4.5, JS inicial +8,6 kB:**
  - comprobado: de la aplicación, en `main` solo están `app.ts`, `app.config.ts`, `app.routes.ts`, `body-index.ts`, `site.config.ts` y `site-title.strategy.ts`; lo demás es el runtime de Angular;
  - quedan 3,75 kB hasta el aviso de 300 kB: conviene vigilarlo en cada informe, porque las fases siguientes añadirán rutas y fichas.
- **4.6, 4.7 y 4.10:** razonables. Lo añadido al contrato del motor (`setViewInsets`, `orbitBy`, `zoomBy`, `skipTransition`, `setLabelsVisible`, `travel` y `stats().aliased`) es poco, tiene nombres claros y sus tests.
- **4.8, los e2e fuera del CI:** correcto hasta la fase 4.
- **4.9, el reloj más lento con SwiftShader:** es cierto. Lo causa el mismo tope de 400 ms del hallazgo 6.
- **4.11, la barra de tiempo a 1024 px:** mejor solución que la del plan, y con e2e de maquetación.
- **No declaradas:**
  - el cambio de comportamiento respecto a §0.8 (hallazgo 9);
  - que `calidad` no se sincroniza (hallazgo 7);
  - que el aviso de error promete el tiempo también cuando el motor sí llega a crearse (hallazgo 1).

## Propuesta de cambio al plan (§10 del informe)
1. ✅ **Aprobar.** Que los atajos de una sola tecla se puedan desactivar es una exigencia de WCAG 2.1.4 (nivel A), no una mejora opcional, y ya está hecho y probado.

## Sugerencias de la fase 2 llevadas a esta fase (informe §9)
- **18, el encuadre de la vista general:** a medias. En móvil, bien; en escritorio, la órbita exterior se sale y el comentario no es cierto (hallazgo 11).
- **19, la caché de los puntos de las órbitas:** anotada. Con mis cifras (1,6 ms por frame a 1 día/s y 2,3 ms a 1 año/s en escritorio) todavía no hace falta, pero sigue pendiente para el móvil en la fase 10.
- **22, el orden del H1:** hecha. El H1 va antes del escenario en el DOM, solo detrás del póster, que es decorativo (`alt=""`). El póster en `<picture>` queda como una excepción justificada a `NgOptimizedImage`.
- **24, los stores en el bundle inicial:** hecha. Los stores y la sesión se proveen en `ExplorerUi` (diferido), y `check-initial-bundle` falla si entra en el JS inicial algo de `src/app/state/` o de los controles.

## Otras notas
- **Higiene:**
  - ningún `console.log` olvidado (un `console.error` en `fail()` y un `console.warn` de las texturas, a propósito), ningún `any` y ninguna dependencia fuera de la lista (`@axe-core/playwright` y su `axe-core`);
  - hay un commit grande, `770b52a` (39 ficheros, +3137 líneas), que explica la desviación 4.1: no pido nada.
- **`effect()`:** solo en la sesión (el motor y la URL), en el diálogo nativo y en el desplazamiento de la tira (el DOM). El de la vista también reescribe la selección y la ficha. Es aceptable (reacciona a la ruta, que es externa), pero, si crece, mejor un manejador del cambio de ruta.
- **Lo que no he podido comprobar:**
  - un móvil real y el iPhone (los pruebas tú);
  - un lector de pantalla de verdad (NVDA o Narrador): he mirado el árbol ARIA y el texto de la región viva, no lo que se oye;
  - las correcciones de diseño (las verifica el otro subagente);
  - `measure.mjs` completo: repetí sus cifras clave con mis propios scripts para no cargar más la GPU que usaba el otro verificador;
  - el CI: todavía no hay repo remoto.

## Para cerrar la fase
1. **Claude Code:**
   - corrige los importantes 1–3 con sus pruebas (el e2e del 503 de `stars.bin` y las comprobaciones de `activeElement`);
   - corrige los menores rápidos 4, 5, 7, 8, 9 y 10, y el 6 (o deja documentada la decisión);
   - repite `npm run check` y los e2e, y añade «Respuesta a la revisión» al informe.
2. **Iván decide:** la propuesta 1 de §10 (en mi opinión, aprobarla).
3. **Fusión a `main` con `--no-ff`** cuando no queden importantes abiertos. Como no hay bloqueantes, no hace falta otra ronda de revisión.
