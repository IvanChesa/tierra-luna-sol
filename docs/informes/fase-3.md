# Informe: Fase 3 (Interfaz del explorador e interacción)

- **Rama:** `fase-3-interfaz`
- **Fecha:** 2026-10-24 (cierre: 2026-10-26)
- **Estado:** revisada y corregida (modo autónomo por bloques, bloque B); ver «Respuesta a la revisión» al final

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo, a partir del borrador de la sesión anterior (cortada por el límite de uso). Lo que cambie durante la ejecución se explica en §4.

### Entregas
| Entrega | Contenido |
|---|---|
| 3.a | `docs/ESTILO.md`. Diseño de alta fidelidad directamente en los componentes, con los datos reales del catálogo y el 3D en modo captura: marco del explorador en escritorio (columna de índice a la izquierda, ficha resumida a la derecha, barra de tiempo abajo, controles de cámara y selector de vista) y en móvil (cabecera con «Menú», hoja inferior con el tiempo y la tira de cuerpos, ficha en hoja inferior); estados de carga, error y aviso. Capturas del diseño y **revisión de diseño por subagente antes de conectar la lógica**. |
| 3.b | `SimulationStore` y `ExplorerStore` (§4.5) con tests; `TimeControlsComponent`; `BodyPickerComponent` (árbol accesible + selección en el lienzo) y `BodyPanelComponent` (dato clave, distancias actuales al Sol y a la Tierra, enlace a la ficha). |
| 3.c | `CameraControlsComponent` (vuelo y seguimiento, «Vista general», zoom ±, teclado en el lienzo, encuadre con `setViewOffset`, vista limpia); estelas y velocidades altas sin aliasing; `ViewSwitcherComponent` y viajes cinemáticos de ~3 s con «Saltar» y `Esc`. |
| 3.d | URL validada y sincronizada (aviso discreto si un parámetro no vale); teclado completo y diálogo de atajos (`?`); `aria-live` sin ruido; transiciones de los textos; Playwright con SwiftShader, e2e deterministas y axe. |
| 3.e | `npm run check`, informe con evidencias y capturas, revisión por subagente, correcciones, fusión y `DIARIO.md`. |

### Diseño (decisiones de partida)
1. **Paneles sobre un lienzo a sangre y encuadre con `setViewOffset`.** El lienzo ocupa todo el explorador y la interfaz va encima, en paneles planos y opacos (sin cristal, sin degradados ni sombras en reposo, `docs/DISENO.md`). El motor recibe los márgenes que tapan los paneles (`setViewInsets`, medidos con `ResizeObserver`) y desplaza el centro de proyección con `camera.setViewOffset`, con el campo de visión compensado para que la escala angular por píxel no cambie; el encuadre usa la parte visible. Abrir o cerrar un panel no redimensiona el renderer. Los márgenes cambian con suavidad (directos con movimiento reducido).
2. **Escritorio (≥ 64 rem).** Como el boceto de `DISENO.md`: a la izquierda, una columna de «lámina de atlas» con el selector de vista, el texto de la vista (prerenderizado) y el índice de cuerpos; a la derecha, la ficha resumida del cuerpo elegido (solo cuando hay uno: sin él, el lienzo gana ese ancho y la escena se recentra); abajo, la barra de tiempo, la única franja fija. **Elemento propio:** el índice se lee como una tabla de efemérides: cada cuerpo lleva su distancia actual (al Sol los planetas, a su planeta las lunas) en cifras tabulares alineadas a la derecha, que cambian al reproducir (como mucho 5 veces por segundo). **Móvil (< 64 rem):** cabecera con «Menú» (Popover API, funciona sin JS), lienzo a pantalla completa, hoja inferior con el tiempo y una tira horizontal de cuerpos (botones de ≥ 44 px; el mismo árbol, dispuesto en horizontal) y la ficha en una hoja inferior que se cierra con «Cerrar».
3. **Nada de la interfaz en el bundle inicial.** El layout (prerenderizado) solo lleva el lienzo diferido, el póster, el selector de vista (enlaces normales) y el texto de la vista. Toda la interfaz (stores, controles, índice, ficha, atajos) llega en un `@defer (on idle)` propio y funciona aunque no haya WebGL. La vista sale de los datos de la ruta hija (`data.view`, leída en el `activate` del `router-outlet`), así que las páginas ya no inyectan ningún estado. `check-initial-bundle.mjs` pasa a vigilar también `src/app/state/` y los controles del visor.
4. **Estado (§4.5).** `SimulationStore` (`time`, `playing`, `speed`, `selectedBodyId`, `scaleFrame`, `quality`, nivel real y aviso de límite) y `ExplorerStore` (`view`, `cleanView`, `travelling`, `panelOpen`, `tour` para la fase 6) con signals. Las órdenes del usuario pasan por los stores, que se las mandan al motor; el motor devuelve el estado por eventos (`timeChanged` ≤ 5/s). `effect()` solo para sincronizar el motor y la URL. Una sesión (`ExplorerSession`, diferida) lee la URL una vez, inicializa los stores, conecta el motor cuando existe y sincroniza la URL. Sin motor (sin WebGL), el store avanza el tiempo con su propio reloj a 4 Hz y el índice, la ficha y las distancias siguen funcionando.
5. **Distancias sin el motor.** El modelo de efemérides de los 30 cuerpos (`createSolarSystemModel`, `offsetFunction`) pasa de `scene/system.ts` a `data/solar-system.ts` (sin three), para que la interfaz calcule distancias aunque no haya WebGL; `scene/` lo reutiliza.
6. **Tiempo.** Sin `fecha` en la URL, el explorador abre en «ahora» y en tiempo real; con `fecha` (o en el modo de captura), en pausa en ese instante. Velocidades: tiempo real, 1 hora/s, 1 día/s, 1 semana/s, 1 mes/s (1/12 de año juliano) y 1 año/s (año juliano), con «Hacia atrás». Los inputs nativos (`date` y `time`) van en la hora local con su zona o en UTC y no se actualizan mientras tienen el foco. **Render bajo demanda también al reproducir:** a tiempo real (y hasta 1 min/s) nada se mueve un píxel por frame y el motor pinta a 4 Hz con un temporizador, no a 60 (la calidad adaptativa no mide esos frames).
7. **Cámara.** Elegir un cuerpo es un **vuelo continuo**: la mirada pasa del foco anterior al nuevo y después la cámara se acerca o se aleja (distancia en escala logarítmica), con el cambio de marco solapado; luego lo sigue (el foco es el origen flotante). Los **viajes** entre vistas usan la misma coreografía en ~3 s, con un evento `travel` para la interfaz, «Saltar» y `Esc`, y corte directo con `prefers-reduced-motion`. Las texturas del destino se piden al empezar el viaje y suben de una en una durante él. **Teclado en el lienzo** (foco visible, `role="application"` con instrucciones): flechas para girar (Mayús: más deprisa), `+`/`−` para acercar y alejar, `Inicio` para la vista general. Botones de zoom, «Vista general» y «Vista limpia» (oculta la interfaz y las etiquetas; vuelve con un botón o `Esc`).
8. **Selección en las vistas de detalle.** En las vistas Tierra y Luna, elegir otro cuerpo en el índice lleva a la vista del sistema solar con ese cuerpo enfocado (un viaje); elegir el cuerpo de la vista no hace nada.
9. **Estelas y aliasing (§4.5).** Al reproducir, cada órbita lleva una estela más brillante con el camino recorrido en el último segundo real (hacia atrás, por delante del cuerpo). Si un cuerpo avanza más de 20° por frame (con histéresis a 15° y el intervalo real entre frames), su malla y su etiqueta se ocultan y su órbita se resalta entera; si su rotación avanza más de 20° por frame, se congela. Con el foco en una luna, su planeta y sus lunas hermanas usan el periodo aparente.
10. **URL (§4.5).** `fecha`, `cuerpo` y `escala`, validados; lo no válido se ignora y se avisa con un mensaje discreto que se puede cerrar. Se escriben con `replaceUrl` al pausar, al elegir un cuerpo, al cambiar de vista o de escala; nunca durante la reproducción (entonces no se escribe `fecha`).
11. **Teclado global y atajos.** Diálogo nativo (`<dialog>`, `?`). Atajos de una tecla sin modificadores, que no actúan con el foco en un campo de texto (`input`, `select`, `textarea`, `contenteditable`): `K` reproducir/pausar, `,`/`.` más lento/más rápido, `R` sentido, `N` ahora, `G` vista general, `+`/`−` zoom, `1`/`2`/`3` vistas, `V` vista limpia, `Esc` (saltar el viaje, salir de la vista limpia, cerrar la ficha, en ese orden).
12. **Accesibilidad.** Índice con el patrón de árbol de WAI-ARIA (una parada de tabulación, flechas, `Intro` elige, `→`/`←` abren y cierran las lunas, búsqueda por la primera letra). Región `aria-live="polite"` con una frase al elegir un cuerpo o cambiar de vista («Saturno, planeta. A 1430 millones de km del Sol…»), nunca por cada tic del tiempo; las cifras que cambian al reproducir quedan fuera del nombre accesible. Transiciones de los textos con CSS (`@starting-style`), anuladas con movimiento reducido. Iconos SVG propios del mismo trazo.
13. **Playwright.** `playwright.config.ts` con Chromium y SwiftShader (`--use-angle=swiftshader`, `--enable-unsafe-swiftshader`), `locale: es-ES` y `timezoneId: Europe/Madrid`, sobre el build servido por `scripts/serve-dist.mjs`. E2e deterministas con `?captura=1` para todo lo que pide el plan, axe (0 violaciones graves o críticas) y 0 peticiones a otros dominios. Los e2e esperan a eventos del motor, no a tiempos fijos.

### Archivos
- Nuevos:
  - `src/app/state/{simulation.store,explorer.store,explorer-session}.ts` y `speeds.ts` (+ tests; sustituyen a `state/explorer-view.ts`);
  - `src/app/data/solar-system.ts` (+ test);
  - `src/app/core/format.ts` (+ tests);
  - `src/app/features/{explorer-ui,time-controls,body-picker,body-panel,camera-controls,view-switcher,shortcuts}/` y, en `features/viewer/`, los márgenes del encuadre, el anunciador y los iconos;
  - `src/app/scene/{aliasing,view-insets}.ts` y `scene/camera/flight.ts` (+ tests);
  - `e2e/*.spec.ts`, `playwright.config.ts`;
  - `docs/ESTILO.md`, `docs/informes/img/fase-3/`.
- Tocados: `scene/{types,index,engine,world,orbits,labels,camera/rig,camera/pointer,system}.ts`, `features/viewer/{viewer-layout,viewer-canvas,viewer-params}`, las tres páginas del explorador, `app.routes.ts`, `app.html`/`app.css`/`styles.css` (cabecera con menú en móvil, explorador a pantalla completa), `scripts/{capture,check-initial-bundle}.mjs`, `package.json` (`e2e`), `.github/workflows/ci.yml` si el e2e cabe ya, `docs/PENDIENTES.md`.

### Dependencias (todas de la lista cerrada)
- Desarrollo: `@axe-core/playwright` (D27). `@playwright/test` ya está.

### Skills
`taste-skill` (pantallas de aplicación, `references/app-screens.md`) e `impeccable` (modo Operate y `craft-floor`) como referencia de diseño, sin descargas: el lanzador de `impeccable` descargaría un binario y no se ejecuta. `threejs-interaction`, `threejs-accessibility`, `accessible-animation` y `webapp-testing` como referencia puntual.

### Riesgos y dudas
1. **SwiftShader es lento** (CPU): los e2e esperan a eventos del motor y usan el modo de captura.
2. **Densidad de la barra de tiempo a 1024 px:** si no cabe en una fila, la zona y la calidad pasan a un grupo de «Ajustes».
3. **Fichas de las lunas:** `/lunas/:id` llega en la fase 9; hasta entonces, la ficha resumida solo enlaza las que existen (planetas, `/sol` y `/luna`).
4. **La interfaz de la escala real es de la fase 7:** aquí solo se sincronizan `escala` en la URL y en el store.

### Estado de las entregas (se actualiza al cerrar cada una)
- 3.a ✅ `docs/ESTILO.md`, diseño en los componentes, capturas y revisión de diseño por subagente (`docs/revisiones/fase-3-diseno.md`; ver §4.1 sobre el orden).
- 3.b ✅ Stores, barra de tiempo, índice de cuerpos y ficha resumida.
- 3.c ✅ Cámara, encuadre con `setViewOffset`, vista limpia, estelas, aliasing, selector de vista y viajes.
- 3.d ✅ URL, teclado y atajos (desactivables), `aria-live`, transiciones de texto, Playwright con SwiftShader, axe y privacidad.
- 3.e ✅ Checks, informe, revisión de código por subagente (`docs/revisiones/fase-3.md`), segunda ronda de la revisión de diseño (`docs/revisiones/fase-3-diseno.md`, al final), correcciones y respuesta a las dos (al final de este informe).

## 1. Resumen
El explorador tiene ya su interfaz completa sobre el lienzo 3D, en escritorio y en móvil, y todo se puede hacer sin el lienzo y con el teclado:
- **Marco del explorador:** columna con el selector de vista, el texto de la vista y el índice de cuerpos, ficha resumida a la derecha y barra de tiempo abajo. En móvil, cabecera con «Menú», hoja inferior con la tira de cuerpos y el tiempo, y la ficha en una hoja que se cierra. El motor encuadra en la parte que dejan libre los paneles (`camera.setViewOffset`) sin redimensionar el renderer.
- **Estado:** `SimulationStore` y `ExplorerStore` con signals y una sesión que lee y escribe la URL (nunca durante la reproducción). Hay vuelos a cada cuerpo, viajes de ~3 s entre vistas («Saltar» y `Esc`; corte con movimiento reducido), estelas y velocidades altas sin aliasing. A velocidades lentas, el motor pinta a 4 Hz.
- **Accesibilidad:** árbol WAI-ARIA, teclado en el lienzo y atajos globales con su diálogo (se pueden desactivar, WCAG 2.1.4). La región `aria-live` solo habla al elegir un cuerpo o cambiar de vista, y las transiciones de texto se anulan con movimiento reducido. Sin WebGL, el índice, la ficha y el tiempo siguen funcionando.
- **Pruebas:** 357 tests unitarios y 45 e2e con Playwright y SwiftShader (escritorio, móvil y sin WebGL), con axe en todas las páginas y 0 peticiones a terceros.
- **Revisión de diseño por subagente:** 1 bloqueante (en pantallas bajas el lienzo desaparecía y quedaban controles inalcanzables), 6 importantes y 10 menores, corregidos. La segunda ronda, por otro subagente, confirmó el bloqueante resuelto y encontró un importante nuevo (el foco se perdía bajo la ficha en móvil) y 6 menores, también corregidos (§12 y «Respuesta a la revisión»). Antes, al revisar las capturas, a 1024 px la barra de tiempo no cabía.
- **Revisión de código por subagente:** sin bloqueantes, 3 importantes (el tiempo se congelaba si el motor fallaba ya creado; el foco se perdía al ocultar lo que lo tenía; la ficha de las lunas citaba una sola fuente), 7 menores y 4 sugerencias, todos atendidos.
- **Arreglado por el camino:** sin fecha en la URL, el explorador se quedaba en pausa al conectar el motor. Y los e2e reutilizaban en silencio cualquier servidor que respondiera en su puerto: un día probaron la web de ivanchesa.es (§5.14).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia (comando + salida, cifra, captura) |
|---|---|---|
| Capturas del diseño y de la implementación (escritorio y móvil) coherentes entre sí y con `docs/DISENO.md` | ✅ | Primera iteración del diseño en `img/fase-3/diseno/` (10 capturas). Implementación en `img/fase-3/` (28 capturas: 1600 × 900, 1280 × 720, 1024 × 768 y teléfonos táctiles de 390 × 844, 360 × 640 y 844 × 390, más 640 × 360 a 2× para el zoom al 200 %), regeneradas tras las revisiones. Revisión de diseño por subagente en `docs/revisiones/fase-3-diseno.md`, con una segunda ronda que verificó las correcciones (§12). |
| Todo usable con teclado y sin canvas, incluido el control de cámara; el diálogo de atajos funciona | ✅ | e2e `indice-y-ficha` (del principio de la página al árbol con Tab, flechas, Intro, → para entrar en las lunas y una sola parada de tabulación; al cerrar la ficha, el foco vuelve a su fila) · `camara` (flechas y Mayús+flecha en el lienzo con foco, Inicio para la vista general, `+`/`−` y botones de zoom, vista limpia con `V`, `Esc` y botón, sin perder el foco; diálogo con `?`, foco dentro, `Esc` y atajos desactivados que siguen así tras recargar) · `movil` (con la ficha abierta, el foco pasa a ella y el tabulador no se para en nada tapado) · `fallos` (si el motor falla ya creado, el tiempo sigue y «Reintentar» lo recupera; sin 3D, el lienzo no es una parada) · proyecto `sin-webgl` (Chromium con `--disable-3d-apis`: caja de error, índice, ficha con distancias y el tiempo avanzando con el reloj propio de la interfaz) · unitarios `body-picker.spec`, `body-tree.spec`, `explorer-ui.spec` y `shortcuts.spec`. |
| Movimiento coherente (Mercurio da ~4 vueltas por cada vuelta de la Tierra), también hacia atrás, y sin aliasing a 1 año/s (Fobos se muestra como órbita) | ✅ | `engine.spec` «movimiento coherente…»: en un año simulado a 1 año/s, la Tierra da entre 0,95 y 1,1 vueltas y la razón Mercurio/Tierra queda entre 4 y 4,3, en los dos sentidos. «a 1 año/s, Fobos…»: Fobos se oculta y su órbita se resalta; a 1 día/s sigue así por la histéresis (18,8° por frame, entre 15° y 20°); a 1 hora/s vuelve. e2e `movimiento`: con Marte enfocado y a 1 año/s, `stats().aliased` contiene `fobos` y `deimos`, y queda vacío al pausar. Captura `escritorio-aliasing-marte.webp`. |
| Los enlaces con parámetros abren el estado exacto; la URL no cambia durante la reproducción; un parámetro no válido no rompe nada | ✅ | e2e `tiempo`: `/?fecha=2030-06-01T12:00Z&cuerpo=jupiter` abre en pausa en ese instante, con 14:00:00 en los campos (Madrid, UTC+2), la ficha de Júpiter abierta y la URL intacta. Al reproducir, la fecha sale de la URL una vez y en 3 s hay 0 cambios de URL; al pausar, vuelve con el instante exacto. `measure.mjs`: 0 cambios de URL en 5 s a 1 año/s. e2e `parametros`: con una fecha imposible, un cuerpo, una escala y una calidad que no existen, salen 4 avisos en una caja que se puede cerrar y el explorador abre en «ahora» y en tiempo real. Los parámetros malos desaparecen de la URL (y `calidad` siempre, §4.13), todo sigue funcionando y no hay ningún error de consola. e2e `tiempo`: al escribir una fecha a mano, un solo salto y una sola URL, sin avisos a medio escribir. |
| Store ≤ 5 actualizaciones/s; el viaje sistema → Tierra → Luna → sistema no recrea el motor ni deja fugas | ✅ | `measure.mjs`: **4,8 eventos `timeChanged` por segundo** a 1 año/s. e2e: ≤ 16 cambios de la barra de tiempo en 3 s. `engine.spec`: ≤ 10 en 2 s a tiempo real. e2e `vistas`: tres ciclos sistema → Tierra → Luna → sistema con el mismo objeto motor, el mismo `<canvas>` y un solo lienzo; geometrías y texturas iguales tras el segundo y el tercer ciclo. `measure.mjs`, tras 10 cambios de vista: 6 geometrías, 11 texturas, 10 MB de heap y 1 contexto WebGL vivo, como al principio. |
| Con movimiento reducido no hay animaciones de cámara ni de texto | ✅ | `engine.spec` «con movimiento reducido no hay viajes: el cambio de vista es un corte» y «…los cambios son directos». e2e `vistas` con `reducedMotion: 'reduce'`: «Saltar el viaje» no llega a aparecer y la `transition-duration` de los textos es < 1 ms (regla global de `styles.css` y duraciones a 0). |
| e2e en verde en local (y en el CI cuando exista, fase 4) | ✅ | `npx playwright test`: **45 passed (1,7 min)** con SwiftShader: 37 de escritorio (entre ellos, 11 de maquetación en anchos de escritorio y pantallas bajas), 7 de móvil (Pixel 7) y 1 sin WebGL. Varias pasadas seguidas sin fallos. En el CI, en la fase 4 (§4.8). |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 3.a.1 Diseño en los componentes, escritorio y móvil, capturas y revisión de diseño | hecha | En los componentes, con los datos reales y la escena en modo captura. La revisión de diseño, al final (§4.1). |
| 3.a.2 `docs/ESTILO.md` | hecha | Tuteo, frases, cifras con `Intl` es-ES, unidades, fechas y horas, fuentes, aria-live e iconos; una excepción anotada (§4.7). |
| 3.b.3 Stores con tests | hecha | `SimulationStore` (tiempo, reproducción, velocidad, selección, escala, calidad, límite y reloj propio sin motor) y `ExplorerStore` (vista desde la ruta, vista limpia, viaje, ficha, ayuda, atajos y recorrido); `simulation.store.spec` y `explorer-session.spec`. |
| 3.b.4 `TimeControlsComponent` | hecha | Inputs nativos de fecha y hora en hora local o UTC, que no cambian mientras tienen el foco. Lo escrito a mano se aplica al dejar de teclear, con Intro o al salir del campo, y los límites van en la zona elegida. «Ahora», reproducir/pausar, 6 velocidades y «Hacia atrás». Al llegar a 1900 o 2100, pausa con aviso. En móvil, una fila plegable; en el escritorio estrecho, más compacta (§4.11). |
| 3.b.5 `BodyPickerComponent` y `BodyPanelComponent` | hecha | El índice es un árbol con las distancias de cada momento (también para el lector de pantalla, como descripción). Se elige también en el lienzo (raycast con zonas agrandadas y clic en la etiqueta, de la fase 2). La ficha da el tipo, el resumen, las distancias al Sol y a la Tierra (a su planeta las lunas), el radio, la rotación, el año, la fuente de cada dato y el enlace a la ficha completa. |
| 3.c.6 `CameraControlsComponent` | hecha | Acercar, alejar, vista general y vista limpia. Teclado en el lienzo. Encuadre con `setViewOffset` y FOV compensado, con márgenes que cambian con suavidad. |
| 3.c.7 Estelas y aliasing | hecha | Estela del último segundo real (por delante del cuerpo hacia atrás). Aliasing con histéresis (20°/15°) medido con el intervalo real entre frames; la rotación se congela. |
| 3.c.8 `ViewSwitcherComponent` y viajes | hecha | Enlaces normales (prerenderizados). Viaje de ~3 s con evento `travel`, «Saltar» y `Esc`, corte con movimiento reducido y texturas del destino pedidas al empezar. El motor no se recrea. |
| 3.d.9 URL validada y sincronizada | hecha | `fecha`, `cuerpo` y `escala`, más `calidad`, que se lee al abrir y sale (§4.13). Lo no válido se ignora y se avisa. Se escribe con `replaceUrl` en pausa, al elegir, al cambiar de vista o de escala, nunca durante la reproducción. |
| 3.d.10 Teclado completo y diálogo de atajos | hecha | `<dialog>` nativo. Los atajos no actúan en campos de texto ni con Ctrl, Cmd o Alt, y se pueden desactivar (§4.4). |
| 3.d.11 `aria-live` y transiciones de texto | hecha | Una frase al elegir o cambiar de vista («Saturno, planeta. A 1430 millones de km del Sol…»), nunca por el tiempo. `@starting-style` en el texto de la vista y en la ficha. |
| 3.d.12 Playwright con SwiftShader y e2e | hecha | `playwright.config.ts` con 3 proyectos; 45 e2e deterministas (`?captura=1` o `fecha` fija) que esperan a eventos del motor o al reposo, no a tiempos fijos (salvo para medir el paso del tiempo). |

## 4. Desviaciones del plan y motivo
### 4.1 La revisión de diseño llegó después de conectar la lógica
El plan pedía revisar las capturas del diseño antes de conectar la lógica. La sesión anterior se cortó con la fase a medias en una rama temporal, y al rehacerla sobre `main` el diseño y la lógica entraron en los mismos commits. Para no saltarse el control, la revisión de diseño se hizo con las capturas finales, por un subagente sin contexto (`docs/revisiones/fase-3-diseno.md`). Sus hallazgos se corrigieron antes de la revisión de código. La primera iteración del diseño está en `img/fase-3/diseno/` y apenas difiere de la final (centrado del encuadre en la parte visible y ajustes de la hoja en móvil).

### 4.2 Búsqueda por la primera letra en el índice, solo con los atajos desactivados
El plan de la fase (§0.12) la incluía, pero las letras son atajos globales del explorador (`K`, `R`, `N`, `G`, `V`) y se pisarían con «Neptuno», «Rea»… La guía de WAI-ARIA la recomienda pero no la exige; el árbol tiene flechas, Inicio y Fin. Tras la revisión de código (sugerencia 12), la búsqueda existe cuando los atajos de una sola tecla están desactivados: entonces no hay conflicto (`rowByInitial` en `body-tree.ts`, sin mayúsculas ni tildes, con test).

### 4.3 Árbol plano y distancias fuera del árbol accesible
- **Antes:** las lunas iban dentro de su planeta (`role="group"`), el nombre de cada fila salía de `aria-labelledby` y la distancia era la descripción.
- **Problema (axe):** axe marcó `label-content-name-mismatch` (WCAG 2.5.3) en todas las filas con distancia y en los planetas abiertos: el texto visible no estaba dentro del nombre accesible.
- **Ruido:** además, la descripción cambia hasta 5 veces por segundo al reproducir, y los lectores anuncian los cambios de descripción del elemento con el foco.
- **Ahora:** el árbol es plano. Las lunas van detrás de su planeta, con `aria-level`, `aria-setsize` y `aria-posinset`; el nombre sale del contenido y la distancia queda `aria-hidden`.
- **Dónde está la distancia para el lector:** en la ficha (que no tiene foco y no habla), en el anuncio al elegir y, tras la revisión de código (sugerencia 12), como descripción de cada fila («A 9,54 UA del Sol», `aria-describedby`). La descripción se pone al día al llegar a la fila o al pausar, no mientras el foco sigue en ella, así que el lector no la repite al reproducir.
- **Plan:** §0.12 decía «las cifras que cambian al reproducir quedan fuera del nombre accesible»; ahora quedan fuera del nombre y van en la descripción, congelada mientras el foco está en la fila.

### 4.4 Atajos de una sola tecla desactivables (añadido)
WCAG 2.1.4 (nivel A) exige que los atajos de un solo carácter se puedan desactivar o reasignar, o que solo actúen con el foco. Una casilla en el diálogo de atajos los desactiva, y se recuerda en `localStorage` (`tls.atajos`, con try/catch). Desactivados, solo queda `Esc`. El botón de ayuda de la barra de tiempo sigue abriendo el diálogo. Se propone añadirlo al plan (§10).

### 4.5 JS inicial: +8,6 kB (287,70 → 296,32 kB), por debajo del aviso de 300 kB
No entra ningún código de la aplicación nuevo: `check-initial-bundle.mjs` vigila ahora también `src/app/state/` y los controles del visor, y el `main` solo lleva `app.ts`, `app.routes.ts`, `body-index.ts`, el título y la configuración.

El aumento es de `@angular/core`, `@angular/router` y `@angular/common`. esbuild no parte un módulo entre chunks, así que las piezas de Angular que solo usa el código diferido acaban en el chunk compartido con `main`. Esas piezas son el runtime de `@defer`, `linkedSignal`, `effect`, `afterNextRender`, `@Service` y los inputs de señal. Se probó a quitar `afterRenderEffect` (se sustituyó por `effect` + `afterNextRender`). El chunk inicial de 464 bytes son los ayudantes de esbuild para la propagación de objetos (`__spreadValues`), compartidos por `main`, la interfaz y el motor. Los CSS globales suben de 5,82 a 6,57 kB con las correcciones de diseño. Margen hasta el aviso: 3,68 kB. La revisión de código pide vigilarlo en cada informe: las fases siguientes añadirán rutas y fichas.

### 4.6 Archivos distintos de los previstos
- La sesión está en `features/explorer-ui/explorer-session.ts`, no en `state/`: depende del router y de la interfaz.
- El diálogo de atajos está en `features/shortcuts/`.
- Los márgenes del encuadre se miden en `ExplorerUi`, con `features/viewer/insets.ts`.
- `state/explorer-view.ts` se ha retirado: lo sustituye `ExplorerStore`.
- No hay `features/viewer/` «anunciador»: la región `aria-live` está en `explorer-ui.html` y la frase la compone `describe.ts`.

### 4.7 Excepción de `ESTILO.md`
En el índice, las distancias de todas las lunas van en km (también la de Titán, más de un millón): es una columna de tabla y se comparan mejor con la misma unidad. Está anotada en `ESTILO.md`.

### 4.8 Los e2e todavía no corren en el CI
El plan los admitía en `ci.yml` «si el e2e cabe ya», pero el CI aún no se ha ejecutado nunca: no hay repo remoto (fase 4). Con Linux harán falta `npx playwright install --with-deps chromium` y el build antes de `playwright test`. Se añade en la fase 4, junto con el primer CI real.

### 4.9 Con SwiftShader, el reloj corre algo más despacio a las velocidades rápidas
A las velocidades rápidas (más de 60 s/s), el motor no deja avanzar el reloj más de 400 ms por frame (`MAX_FRAME_DT_MS`) para no dar saltos. Con SwiftShader, un frame de la escena a 1 hora/s puede tardar más, así que el tiempo simulado avanza menos de lo nominal. Con la GPU no pasa: 60 FPS. El e2e de «hacia atrás» lo tiene en cuenta: pide un retroceso de al menos 10 minutos en 2 s, no de 2 horas. A las velocidades lentas, desde la revisión, el reloj sigue al de pared (§5.11).

### 4.10 Añadidos al contrato de `SceneEngine`
- Órdenes: `setViewInsets`, `orbitBy`, `zoomBy`, `skipTransition` y `setLabelsVisible`.
- Evento: `travel`.
- Cifras: `stats().aliased`, la lista de cuerpos que se dibujan como órbita. La usan los e2e y sirve para depurar.

### 4.11 La barra de tiempo a 1024 px (riesgo 2 del plan), resuelta de otra forma
- **El fallo:** al revisar las capturas a 1024 × 768 aparecieron controles solapados («Hacia atrás» quedaba debajo de la fecha). La fila completa necesita unos 1146 px.
- **El plan:** preveía pasar la zona y la calidad a un grupo de «Ajustes».
- **La solución:** basta con algo menos invasivo. Entre 64 y 72 rem, «Reproducir» se queda en su icono (con el nombre accesible y el título) y la fila pierde algo de aire. Además, la opción local de la zona se llama «Local (UTC+2)» en todas las anchuras: la etiqueta ya dice «Zona».
- **La prueba:** `e2e/maquetacion.spec.ts` comprueba que ningún control se solapa ni se sale a 1024, 1100, 1280 y 1600 px. Sin el arreglo, falla a 1024. Captura: `estrecho-ficha-saturno.webp`.
- **Tras la revisión de diseño (segunda ronda, hallazgo 29):** «Ahora» va en el DOM justo después de «Reproducir», para que el orden del foco siga la fila del móvil (reproducir, la lectura, «Ahora», desplegar). En el escritorio también queda al lado de «Reproducir», antes de la velocidad y la fecha: los dos controles del tiempo, juntos. El boceto de `DISENO.md` lo ponía al final de la fila.

### 4.12 Elegir un cuerpo en las vistas Tierra y Luna (cambio respecto a §0.8, sin anotar hasta la revisión)
§0.8 decía que, en las vistas de detalle, elegir otro cuerpo lleva al sistema solar con él enfocado y que elegir el cuerpo de la vista no hace nada. El código (con su test) hace algo más útil:
- **el cuerpo de la vista** (la Tierra en su vista, la Luna en la suya) abre su ficha;
- **la Tierra o la Luna desde la otra vista de detalle** llevan a su propia vista;
- **cualquier otro cuerpo** lleva al sistema solar con él enfocado, como decía el plan.

### 4.13 `calidad` en la URL: se lee al abrir y sale
`calidad` no es estado que se comparta, sino del dispositivo: el selector se recuerda en `localStorage`. Antes se leía de la URL y no se tocaba nunca, así que un valor no válido volvía a avisar al recargar y uno válido pisaba la preferencia guardada (revisión de código, hallazgo 7). Ahora se lee al abrir y la URL lo quita (`viewerQueryParams` devuelve `calidad: null`). En el modo de captura la URL no se toca, así que los scripts siguen pudiendo usar `?calidad=baja`.

## 5. Decisiones técnicas nuevas
1. **Encuadre en la parte visible.** `viewProjection` desplaza el centro de proyección con `camera.setViewOffset` y compensa el FOV, para que la escala angular por píxel no cambie al abrir un panel. `approachInsets` suaviza el cambio (directo con movimiento reducido). Los márgenes que llegan antes del primer `resize` se guardan y se vuelven a validar con cada tamaño (`ecf7576`).
2. **Render a 4 Hz en la reproducción lenta.** Con |velocidad| ≤ 60 s/s, nada se mueve un píxel por frame: un temporizador de 250 ms sustituye a `requestAnimationFrame` (`BrowserFrameScheduler` con peticiones diferidas). Esos frames no cuentan para la calidad adaptativa. En pausa, 0 frames (`measure.mjs`).
3. **Vuelos y viajes.** Primero gira la mirada hacia el foco nuevo y después la cámara se acerca o se aleja en escala logarítmica, con el cambio de marco solapado (`camera/flight.ts`). Un vuelo a un cuerpo dura 2 s y un viaje entre vistas 3 s, con evento `travel` al empezar y al acabar.
4. **La vista sale de la ruta** (`data.view`, leída en el `activate` del `router-outlet`). Las páginas no inyectan estado. El layout prerenderizado solo lleva el póster, los fondos de los paneles, el selector de vista y el texto; los stores, la sesión y los controles llegan en el `@defer (on idle)` de `ExplorerUi`.
5. **Reloj propio sin motor.** Si no hay WebGL o el motor aún no está, `SimulationStore` avanza el tiempo a 4 Hz con `setInterval`, y el índice, la ficha y las distancias siguen vivos. Las distancias salen de `data/solar-system.ts` (sin three).
6. **Orden al conectar el motor.** La sesión lee el estado antes de mandar órdenes: cada orden hace que el motor emita `timeChanged` con su propio estado, y nace en pausa (`4f609bb`). El doble del motor de los tests se comporta ya como el real.
7. **Pósters desde el lienzo.** `build-poster.mjs` usa `engine.capture()`: solo los píxeles, con la composición de la fase 3 (encuadre a la derecha de la columna en escritorio y encima de la hoja en móvil) y sin etiquetas ni interfaz. Las etiquetas no se ven hasta el primer frame ni con el error.
8. **Acceso de los scripts solo en captura.** `window.__tlsViewer` solo existe con `?captura=1`, y es nuevo en cada intento.
9. **`+` y `−` también son teclas del lienzo.** Son globales, pero con el foco en el visor las atiende el lienzo, como las flechas. Así siguen valiendo con los atajos de una sola tecla desactivados (solo actúan con el foco, como permite WCAG 2.1.4) y la ayuda del lienzo no miente.
10. **Playwright.** Tres proyectos (`escritorio` 1280 × 800, `movil` con Pixel 7 y `sin-webgl`), el build servido por `serve-dist.mjs` en `127.0.0.1:4391` (§5.14), `es-ES` y `Europe/Madrid`. Los e2e están en TypeScript: `tsconfig.e2e.json` comprueba sus tipos en `npm run e2e` y entran en `ng lint`. axe con las reglas WCAG 2.1 A y AA: falla con cualquier violación grave o crítica.
11. **«Tiempo real» sigue al reloj de pared** (revisión de código, hallazgo 6). A las velocidades lentas (hasta `SLOW_SPEED`, 60 s/s, en los dos sentidos), el motor avanza el reloj con el tiempo real transcurrido desde el último avance (`clockStep`), sin tope y también con la pestaña oculta o sin contexto WebGL; al pausar o cambiar de velocidad, se pone al día (`catchUp`). A las rápidas, como antes: el tiempo del frame con el tope de 400 ms, así que una pestaña oculta o un tirón no dan un salto de meses. Test con reloj falso: 10 s con la pestaña oculta a tiempo real son 10 s simulados.
12. **Gestión del foco** (revisión de código, hallazgo 2; diseño, 24). `ExplorerUi` recuerda el último elemento con el foco que no es de quita y pon (`focusin`). Tras cada cambio de la vista limpia o de la ficha, si el foco se ha perdido (en `<body>` o en algo que ya no se ve, con `checkVisibility`), lo lleva: al entrar en la vista limpia, a «Mostrar la interfaz»; al abrir la ficha, a la ficha (`<aside tabindex="-1">`); al cerrar una u otra, a donde estaba (o a la ficha, a la fila del índice o al lienzo). Si nunca ha habido foco en el explorador (al cargar con `?cuerpo=`), no lo mueve. En móvil, la hoja de la ficha saca del orden del foco lo que tapa (`visibility: hidden` en la tira, la barra y la cámara).
13. **Encuadre exacto de la vista general** (revisión de código, sugerencia 11, la 18 de la fase 2). `circleFitDistance`: para una circunferencia de radio R en la eclíptica vista desde la elevación e, el ancho máximo proyectado es R/√(d² − R²·cos²e) (en sen θ = R·cos e/d) y el borde de abajo, el del lado cercano, R·sen e/(d − R·cos e). La distancia es la mayor de las dos que despejan esos límites con un margen del 5 %. Test con 3600 puntos: la órbita cabe entera y toca el borde por un lado.
14. **Servidores locales en 127.0.0.1 y en puertos propios.** En este equipo pueden estar en marcha los `astro dev` y `preview` de ivanchesa.es (4321, 4322, 4330). Con `reuseExistingServer`, Playwright reutilizaba cualquier servidor que respondiera en su puerto: el 26-10, los e2e abrieron la web de ivanchesa.es y fallaron todos (por suerte, no pasaron). Ahora `serve-dist.mjs` escucha solo en 127.0.0.1 y falla si el puerto está ocupado; los e2e usan el 4391 sin reutilizar nada, y las capturas y las mediciones, el 4340.

## 6. Salida de los checks
Repetidos el 26-10 sobre el código final, con las correcciones de las dos revisiones.
```
npm run check                                   (código 0)
> ng lint && prettier --check .
All files pass linting.
All matched files use Prettier code style!
> ng test --watch=false
 Test Files  47 passed (47)
      Tests  357 passed (357)
All files (ephemeris/)  |   99.57 |    96.73 |     100 |     100
> ng build
Initial chunk files | Names    |  Raw size | Estimated transfer size
main-…js            | main     | 289.29 kB |                79.64 kB
styles-…css         | styles   |   6.57 kB |                 1.82 kB
chunk-…js           | -        | 464 bytes |               464 bytes
                    | Initial total | 296.32 kB |            81.93 kB
Lazy chunk files
chunk-…js           | index        | 636.67 kB | 137.88 kB   (three + motor)
chunk-…js           | explorer-ui  | 220.07 kB |  57.89 kB   (astronomy-engine, stores e interfaz)
chunk-…js           | viewer-layout|   7.00 kB |   2.25 kB
Prerendered 17 static routes.
> node scripts/check-initial-bundle.mjs
✔ El JS inicial de las 18 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine
  ni de los stores ni de los controles del visor.
```
Sin avisos de presupuesto. El chunk del visor (three y el motor) pesa 636,67 kB (aviso de §5 a 900 kB). La interfaz diferida, con astronomy-engine, 220,07 kB (+6,7 kB con las correcciones de las revisiones). JS inicial: 296,32 kB; quedan 3,68 kB hasta el aviso (§4.5).

```
npx tsc -p tsconfig.e2e.json && npx playwright test
  45 passed (1.7m)
```

### Mediciones (`node scripts/measure.mjs`, 26-10, tras las correcciones; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Medida | Resultado | Objetivo (§5) |
|---|---|---|
| Reproducción a 1 día/s (alta, media y baja) | 60 / 59,8 / 59,8 FPS de media (mín. 60 / 59 / 59) · 1,68 / 1,50 / 1,22 ms de CPU por frame · 0,15–0,20 ms de efemérides · 34 llamadas | ≥ 55 ✅ · ≤ 2 ms ✅ |
| Reposo (3 s en pausa) | 0 frames · 0 `requestAnimationFrame` | ✅ |
| Store a 1 año/s | 4,8 actualizaciones por segundo | ≤ 5 ✅ |
| URL durante 5 s de reproducción | 0 cambios; al pausar, `?cuerpo=marte&fecha=2036-06-25T00:48:10Z` | ✅ |
| VRAM alta (sistema / Tierra / Luna) | 27 / 67 / 107 MB (media y baja: 27 / 35 / 43) | ≤ 300 / ≤ 120 ✅ |
| Memoria tras 10 idas y vueltas explorador ↔ `/planetas` | 6 geometrías · 11 texturas · 10 MB de heap · 1 contexto WebGL vivo · 1 lienzo | sin crecimiento ✅ |
| Memoria tras 10 cambios de vista y 6 de calidad | 6 geometrías · 11 texturas · 10 MB · 1 contexto | sin crecimiento ✅ |
| Contexto WebGL perdido y recuperado | `contextLost` → `contextRestored`, 0 frames mientras está perdido y la fecha cambiada se conserva (captura `contexto-recuperado.webp`) | ✅ |
| Primera vista (`/`, alta) | JS 1127 kB, texturas 378 kB, estrellas 70 kB, póster 26 kB, fuentes 52 kB · una tarea larga de 83 ms (ninguna en baja) · LCP: `img.poster` a 164 ms | texturas ≤ 2,5 MB ✅ · sin tareas > 200 ms ✅ · el LCP no es el lienzo ✅ |

## 7. Capturas
En `docs/informes/img/fase-3/`, deterministas (`?captura=1`, 2026-10-24 00:00 UTC, `es-ES`, `Europe/Madrid`), con `node scripts/capture-ui.mjs docs/informes/img/fase-3`:
- **Escritorio (1600 × 900):** `escritorio-sistema`, `escritorio-ficha-saturno`, `escritorio-luna-de-saturno` (Titán), `escritorio-tierra`, `escritorio-luna`, `escritorio-atajos`, `escritorio-vista-limpia`, `escritorio-aviso-url`, `escritorio-limite-2100`, `escritorio-aliasing-marte`, `escritorio-carga` y `escritorio-error`.
- **Portátil (1280 × 720):** `portatil-ficha-jupiter`. **Escritorio estrecho (1024 × 768):** `estrecho-ficha-saturno`.
- **Pantallas bajas:** `movil-pequeno-desplegado` (360 × 640 táctil, con la barra desplegada), `movil-pequeno-ficha` (360 × 640 con la ficha), `movil-horizontal` y `movil-horizontal-ficha` (844 × 390 táctil, sin y con la ficha) y `zoom-200-desplegado` (1280 × 720 con el zoom al 200 %: 640 × 360 a 2×).
- **Móvil (390 × 844 a 2×, como teléfono táctil):** `movil-sistema`, `movil-ficha-saturno`, `movil-tierra`, `movil-luna`, `movil-tiempo-desplegado`, `movil-menu`, `movil-carga` y `movil-error`.
- **Contexto WebGL recuperado:** `contexto-recuperado`.
- **Primera iteración del diseño:** `diseno/` (10 capturas).

Regeneradas el 26-10, tras las correcciones de las dos revisiones. Los pósters de `public/img/` se han regenerado con `node scripts/build-poster.mjs`: cambian los dos de la vista general (el encuadre nuevo, §5.13).

## 8. Dependencias añadidas
| Paquete | Versión | Motivo | ¿Está en la lista permitida? |
|---|---|---|---|
| `@axe-core/playwright` (desarrollo; arrastra `axe-core`) | 4.14.0 | axe en los e2e (D27) | Sí (§1, desarrollo) |

## 9. Pendientes y `TODO(ivan)`
- **Probar en un móvil real** la hoja inferior, los gestos y los 30 FPS en baja, por la red local (`npm start -- --host 0.0.0.0`) o en el staging. No bloquea.
- **Fase 4:** los e2e en el CI (§4.8).
- **Decisiones de Iván** (`PENDIENTES.md`): las propuestas de cambio al plan de la fase 2; la de esta fase (§10); `TODO(ivan)` el H1 de la vista del sistema solar («Tierra Luna Sol» o «El sistema solar»; revisión de diseño, sugerencia 18); `TODO(ivan)` el texto de la vista en los móviles bajos (segunda ronda, sugerencia 31).
- **Sugerencias de la fase 2 llevadas a la fase 3:**
  - el H1 va ya antes del escenario en el DOM (sugerencia 22);
  - la vista general se encuadra en la parte visible, también en móvil vertical, y desde la revisión con la perspectiva exacta: la órbita de Neptuno cabe entera en escritorio (sugerencia 18; §5.13);
  - los stores van en el `@defer` (sugerencia 24);
  - la caché de los puntos de las órbitas (sugerencia 19) sigue anotada para la fase 10 (móvil): en escritorio el frame entero cuesta 1,7 ms a 1 día/s.
- **Con el contexto WebGL perdido, el tiempo se detiene** hasta que vuelve (a las velocidades lentas, al volver se pone al día, §5.11). El mensaje para ese estado llega en la fase 10 (tarea 10.2).
- **El nivel real de la calidad automática** («Automática (baja)») no se muestra: `qualityLevel` salió del store porque nadie lo leía (revisión de código, hallazgo 10). Una idea para el pulido de la fase 10, si cabe en la barra a 1024 px.

## 10. Propuestas de cambio al plan
No se aplican hasta que Iván las apruebe.
1. **3.d.10:** «Teclado completo y diálogo de atajos (`?`). Los atajos no actúan con el foco en un campo de texto **y los de una sola tecla se pueden desactivar en el diálogo (WCAG 2.1.4)**».

## 11. Cómo probarlo
```bash
npm ci
npm run check                                   # lint + tests + build + bundle por módulos
npm run e2e                                     # tipos de los e2e + build + 45 e2e con SwiftShader
npm run build && node scripts/serve-dist.mjs    # el build prerenderizado en http://127.0.0.1:4340
```
- Elige un cuerpo en el índice, en el lienzo o en su etiqueta; cierra la ficha con «×» o `Esc`.
- Reproduce con `K` o el botón, cambia la velocidad con `,`/`.` o el desplegable, invierte con `R` y vuelve a ahora con `N`.
- Con el foco en el lienzo: flechas para girar (Mayús, más deprisa), `+`/`−` para el zoom e `Inicio` para la vista general. `V` oculta la interfaz y `?` muestra los atajos (y la casilla para desactivarlos).
- Vistas con `1`/`2`/`3` o el selector; durante el viaje, «Saltar el viaje» o `Esc`.
- `/?fecha=2030-06-01T12:00Z&cuerpo=jupiter`: un enlace exacto. `/?fecha=2030-02-31T00:00Z&cuerpo=pluton`: avisos.
- `/?captura=1&cuerpo=marte` y 1 año/s: Fobos y Deimos como órbitas.
- Capturas: `node scripts/capture-ui.mjs <carpeta>` · pósters: `node scripts/build-poster.mjs` · mediciones: `node scripts/measure.mjs [--img=<carpeta>]`.

## 12. Revisión de diseño (3.a)
- **Primera ronda** (subagente, sobre `c97efcc`): CAMBIOS NECESARIOS, con 1 bloqueante, 6 importantes, 10 menores y 6 sugerencias. Se corrigieron en los commits `15f8f0b`–`6380652`, salvo la sugerencia 18 (el H1 «Tierra Luna Sol» es un texto: decide Iván). La 23 se resolvió con una regla en `ESTILO.md` §1 (tuteo en los textos de las vistas; «nuestro» solo para lo que es de todos), que los dos textos ya cumplen.
- **Segunda ronda** (`CLAUDE.md`: «si quedaba algún Bloqueante, repite la revisión una vez más»). La hizo otro subagente sin contexto, porque el de la primera ya no existía (la sesión se cortó por el límite de uso), sobre `145614c` y una copia congelada del build. Veredicto: CAMBIOS NECESARIOS.
  - **Bloqueante resuelto:** en ningún tamaño probado desaparece el lienzo ni queda un control fuera de alcance.
  - 18 hallazgos resueltos, 4 a medias (2, 4, 13 y 19) y 1 que decide Iván (18).
  - 8 hallazgos nuevos: 1 importante (24: el foco se perdía bajo la ficha en móvil), 6 menores (25–30; tres de ellos, regresiones de las correcciones) y 1 sugerencia (31).
- **Correcciones de la segunda ronda:** todas, salvo las dos decisiones de Iván (18 y 31, en `PENDIENTES.md`). Detalle en «Respuesta a la revisión». Como ya no queda ningún bloqueante, no hace falta una tercera ronda; las correcciones se han comprobado con e2e y con mediciones propias en el navegador.

## Respuesta a la revisión
Dos revisiones por subagente, sin el contexto de la sesión y en paralelo:
- **Revisión de código** (`docs/revisiones/fase-3.md`): CAMBIOS NECESARIOS, sin bloqueantes, con 3 importantes, 7 menores y 4 sugerencias.
- **Segunda ronda de la revisión de diseño** (al final de `docs/revisiones/fase-3-diseno.md`): CAMBIOS NECESARIOS por el importante nuevo 24. El bloqueante de la primera ronda está resuelto.

Corregido todo, salvo dos decisiones que son de Iván y están en `PENDIENTES.md`: el H1 (diseño, 18) y el texto de la vista en los móviles bajos (diseño, 31). No queda ningún bloqueante, así que, según `CLAUDE.md`, no hace falta otra ronda. Después de las correcciones:
- `npm run check` pasa: 357 tests;
- los 45 e2e pasan;
- las mediciones (§6) y las capturas (§7) están repetidas.

Las cifras de diseño de abajo son mediciones propias en el navegador: Chromium con la GPU, teléfonos táctiles reales (`isMobile` y `hasTouch`) y el build final.

### Revisión de código
| Hallazgo | Acción | Commit |
|---|---|---|
| 1 · El tiempo se congelaba si el motor fallaba ya creado (Importante) | `fail()` suelta el motor (lo desconecta de la sesión y lo libera): el store vuelve a llevar el tiempo con su reloj. e2e `fallos`: con `stars.bin` en 503, a 1 día/s el tiempo avanza más de 12 h en 1,5 s; con la red bien, «Reintentar» crea un motor que sigue reproduciendo. Con el contexto perdido, el tiempo se detiene hasta que vuelve y entonces se pone al día a las velocidades lentas; el mensaje de ese estado es de la fase 10 (§9) | `d73b215` |
| 2 · El foco se perdía al ocultar lo que lo tenía (Importante) | Gestión del foco en `ExplorerUi` (§5.12). e2e: «Vista limpia» → el foco en «Mostrar la interfaz» → al salir, otra vez en «Vista limpia»; `V` desde el índice y `Esc` → vuelve a la fila; cerrar la ficha con «×» (Intro) o `Esc` → el foco en la fila del cuerpo | `b0eab2d` |
| 3 · La ficha citaba una sola fuente para todo (Importante) | Cada dato lleva su fuente; si son varias, cada una dice qué respalda: «Radio: NASA/JPL, Solar System Dynamics. Rotación y órbita: NASA, NSSDCA…». Test con la fuente de cada fila (Titán, la Luna, Saturno, el Sol y Fobos); captura `escritorio-luna-de-saturno` | `f66a4f4` |
| 4 · La fecha escrita a mano saltaba por fechas intermedias y avisaba a medio escribir (Menor) | Con el foco en el campo, la fecha se aplica al dejar de teclear (700 ms), con Intro o al salir; el error solo se dice al confirmar. e2e con `keyboard.type('15032031')`: un solo salto, una sola URL y ninguna alerta. Test con temporizadores falsos | `bb5af4a` |
| 5 · Los límites del campo, en UTC frente al año local (Menor) | `min` y `max` en la zona elegida y validación por el instante. Tests: en UTC, el 31-12-2100 a las 23:59:59 vale y el 01-01-2101 a las 00:00 no; el 01-01-1900 a las 00:00, sí | `bb5af4a` |
| 6 · «Tiempo real» se quedaba atrás del reloj (Menor) | A las velocidades lentas, el reloj sigue al de pared (§5.11). Test: 10 s con la pestaña oculta son 10 s simulados (salvo el último cuarto de segundo, el del render a 4 Hz); al pausar, exacto; hacia atrás, igual | `984eea1` |
| 7 · `calidad` no salía de la URL (Menor) | Se lee al abrir y sale (§4.13). e2e `parametros` con `calidad=maxima`: aviso y fuera de la URL | `7a7d134` |
| 8 · Sin 3D, el lienzo invisible era una parada del tabulador (Menor) | `tabindex`, `role`, nombre y ayuda solo cuando la escena está lista; antes, `aria-hidden`. e2e `fallos`: en el error no hay ninguna «aplicación» ni `tabindex` | `d73b215` |
| 9 · Inexactitudes del informe (Menor) | Son 28 capturas (las 26 de entonces y 2 nuevas). §4.12 explica el cambio respecto a §0.8. «Los parámetros malos desaparecen de la URL» ya vale también para `calidad`. §9 corrige la sugerencia 18 de la fase 2, ya hecha del todo | este commit |
| 10 · Restos (Menor) | `formatLongDate` pasa a `formatLongDateTime` y la usa el aviso del límite. `qualityLevel` sale del store (mostrar el nivel real queda como idea para la fase 10, §9). El desfase sale de los campos locales con sus segundos: «UTC−0:14:44» en el Madrid de 1900, como el campo de la hora; tiene test en esa zona | `7a7d134` |
| 11 · La órbita de Neptuno se salía de la vista general (Sugerencia) | Encuadre exacto con la perspectiva (§5.13); el comentario ya es cierto. Capturas `escritorio-sistema` y `escritorio-limite-2100` y pósters de la vista general regenerados | `984eea1` |
| 12 · Las distancias del índice no llegaban al lector; sin búsqueda por la inicial (Sugerencia) | Cada fila lleva su distancia como descripción, que no cambia mientras el foco sigue en ella (§4.3). La búsqueda por la inicial funciona con los atajos de una tecla desactivados (§4.2) | `85b9334` |
| 13 · La región viva no anunciaba la vista general ni los avisos de la URL (Sugerencia) | «Vista general del sistema solar.» (test de la sesión). Los avisos de la URL llegan un render después de su región `role="status"` | `b0eab2d`, `7a7d134` |
| 14 · Los atajos no miraban `event.repeat` (Sugerencia) | Con la tecla pulsada, solo se repiten el zoom, la velocidad y el giro; lo que alterna, no (también Espacio e Inicio en el lienzo). Test de `repeats` | `18f1abd`, `d73b215` |

**Propuesta 1 de §10:** la revisión recomienda aprobarla (WCAG 2.1.4 es de nivel A). Queda para Iván (`PENDIENTES.md`).

### Segunda ronda de la revisión de diseño
| Hallazgo | Acción | Commit |
|---|---|---|
| 2 · La cámara cortaba etiquetas con la barra desplegada (a medias) | En los móviles de 45 rem de alto o menos, con la barra desplegada, la cámara se queda en + y − (`G` y `V` siguen). Medido a 360 × 640 y 375 × 667: dos botones y 44 px de alto (antes, 92) en un lienzo de 192 px. Captura `movil-pequeno-desplegado`: «Mercurio» ya no se corta | `b0eab2d` |
| 4 · Sin pista de que el índice desborda con barras superpuestas (a medias) | Si la lista no cabe, su borde de abajo se funde (2 rem) mientras quede algo por ver. Es una animación ligada al desplazamiento, sin JS; donde no se admite, queda la barra. La fila elegida queda por encima del fundido (`scroll-padding`). Medido con Saturno abierto a 1180 × 820 (táctil), 1024 × 768 y 1600 × 900: fundido de 32 px arriba del todo y de 0 px al final | `85b9334` |
| 13 · Los avisos de la URL, estrechos y altos en móvil (a medias) | Ocupan el ancho del lienzo y acaban encima de la cámara. Con un aviso: 351 px de ancho y el 37 % del lienzo a 375 × 667 (antes, 232–247 px y el 49 %); 336 px y el 42 % a 360 × 640 (antes, el 62 %). Con tres, se desplazan dentro de su caja, que acaba 12 px por encima de la cámara | `b0eab2d` |
| 19 · La nota de «Distancia», lejos de la lista (a medias) | La lista ya no se estira: la nota va 8 px debajo de la última fila (antes, unos 160 px a 1600 × 900) | `85b9334` |
| 18 · El H1 repite la marca (decide Iván) | `TODO(ivan)` en `home-page.ts` y en `PENDIENTES.md` | `e5b3f48` |
| 24 · El foco se perdía bajo la ficha en móvil (Importante) | Con la ficha abierta en móvil, la tira, la barra de tiempo y la cámara salen del orden del foco (`visibility: hidden`) y el foco pasa a la ficha (§5.12). e2e `movil`: elegir en la tira con el teclado → la ficha tiene el foco; 6 tabulaciones sin pararse en nada tapado; al cerrar desde la ficha, el foco vuelve a la fila de la tira | `b0eab2d` |
| 25 · Elegir un cuerpo desplazaba la página en las pantallas bajas (Menor) | Solo se desplaza la lista (`revealRow`, sin `scrollIntoView`). e2e a 844 × 390 táctil y a 640 × 360: con `?cuerpo=saturno`, `scrollY` sigue en 0 | `85b9334` |
| 26 · La cámara asomaba sobre la ficha (Menor) | Se oculta con la ficha abierta (la regla del 24); comprobado en el mismo e2e | `b0eab2d` |
| 27 · Sin WebGL y con la ficha, el error quedaba bajo el selector (Menor) | La caja de estado ya no reserva la columna de la cámara (no se ve sin escena) y tiene alto máximo en la parte visible. Medido a 360 × 640 y 375 × 667: el título se ve (caja entre y = 146 y 257, en una parte visible de 130 a 273) | `d73b215` |
| 28 · «Saltar el viaje» encima de la ficha (Menor) | Se coloca en la parte visible (`--view-bottom`). e2e `movil`: en el viaje de la vista de la Tierra a Saturno, el botón acaba encima de la ficha | `b0eab2d` |
| 29 · El orden del foco en la barra del móvil (Menor) | «Ahora» va en el DOM justo después de «Reproducir» (§4.11) | `bb5af4a` |
| 30 · A 320 px, la fecha pisaba la hora (Menor) | Por debajo de 22 rem, una debajo de otra. Medido a 320 × 256 a 4× (zoom al 400 %), sin pantalla táctil: 288 px de ancho cada una, sin solaparse | `bb5af4a` |
| 31 · El texto de la vista en los móviles bajos (decide Iván) | `TODO(ivan)` en `PENDIENTES.md`, con las tres opciones | `e5b3f48` |
| Pulidos del 1, 14 y 15 | La barra desplegada que se desplaza conserva su margen de abajo. El aviso del límite va en formato largo y con el nombre de la zona («…el 31 de diciembre de 2100 a las 23:59 UTC, que en tu hora local (Europe/Madrid, UTC+1) es el 1 de enero de 2101 a las 0:59…»). La lectura plegada solo se parte entre trozos: a 360 px, la fecha ocupa 2 líneas sin cortarse por dentro, y lo mismo la zona y la velocidad | `bb5af4a`, `7a7d134` |
| Capturas con la ficha abierta en pantallas bajas (del 7) | `movil-pequeno-ficha` y `movil-horizontal-ficha` | `020cd21`, `a83bfac` |
