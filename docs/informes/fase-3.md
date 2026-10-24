# Informe: Fase 3 (Interfaz del explorador e interacción)

- **Rama:** `fase-3-interfaz`
- **Fecha:** 2026-10-24
- **Estado:** en revisión (modo autónomo por bloques, bloque B)

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
- 3.e ✅ Checks, informe, revisión de código por subagente y fusión (ver «Respuesta a la revisión»).

## 1. Resumen
El explorador tiene ya su interfaz completa sobre el lienzo 3D, en escritorio y en móvil, y todo se puede hacer sin el lienzo y con el teclado:
- **Marco del explorador:** columna con el selector de vista, el texto de la vista y el índice de cuerpos, ficha resumida a la derecha y barra de tiempo abajo. En móvil, cabecera con «Menú», hoja inferior con la tira de cuerpos y el tiempo, y la ficha en una hoja que se cierra. El motor encuadra en la parte que dejan libre los paneles (`camera.setViewOffset`) sin redimensionar el renderer.
- **Estado:** `SimulationStore` y `ExplorerStore` con signals y una sesión que lee y escribe la URL (nunca durante la reproducción). Hay vuelos a cada cuerpo, viajes de ~3 s entre vistas («Saltar» y `Esc`; corte con movimiento reducido), estelas y velocidades altas sin aliasing. A velocidades lentas, el motor pinta a 4 Hz.
- **Accesibilidad:** árbol WAI-ARIA, teclado en el lienzo y atajos globales con su diálogo (se pueden desactivar, WCAG 2.1.4). La región `aria-live` solo habla al elegir un cuerpo o cambiar de vista, y las transiciones de texto se anulan con movimiento reducido. Sin WebGL, el índice, la ficha y el tiempo siguen funcionando.
- **Pruebas:** 349 tests unitarios y 39 e2e con Playwright y SwiftShader (escritorio, móvil y sin WebGL), con axe en todas las páginas y 0 peticiones a terceros.
- **Revisión de diseño por subagente:** 1 bloqueante (en pantallas bajas el lienzo desaparecía y quedaban controles inalcanzables), 6 importantes y 10 menores, corregidos (§12). Antes, al revisar las capturas, a 1024 px la barra de tiempo no cabía.
- **Arreglado por el camino:** sin fecha en la URL, el explorador se quedaba en pausa al conectar el motor.

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia (comando + salida, cifra, captura) |
|---|---|---|
| Capturas del diseño y de la implementación (escritorio y móvil) coherentes entre sí y con `docs/DISENO.md` | ✅ | Primera iteración del diseño en `img/fase-3/diseno/` (10 capturas). Implementación en `img/fase-3/` (27 capturas: 1600 × 900, 1280 × 720, 1024 × 768 y teléfonos táctiles de 390 × 844, 360 × 640 y 844 × 390, más 640 × 360 a 2× para el zoom al 200 %). Revisión de diseño por subagente en `docs/revisiones/fase-3-diseno.md`, con sus hallazgos corregidos y verificados (§12). |
| Todo usable con teclado y sin canvas, incluido el control de cámara; el diálogo de atajos funciona | ✅ | e2e `indice-y-ficha` (del principio de la página al árbol con Tab, flechas, Intro, → para entrar en las lunas y una sola parada de tabulación) · `camara` (flechas y Mayús+flecha en el lienzo con foco, Inicio para la vista general, `+`/`−` y botones de zoom, vista limpia con `V`, `Esc` y botón; diálogo con `?`, foco dentro, `Esc` y atajos desactivados que siguen así tras recargar) · proyecto `sin-webgl` (Chromium con `--disable-3d-apis`: caja de error, índice, ficha con distancias y el tiempo avanzando con el reloj propio de la interfaz) · unitarios `body-picker.spec`, `body-tree.spec`, `explorer-ui.spec` y `shortcuts.spec`. |
| Movimiento coherente (Mercurio da ~4 vueltas por cada vuelta de la Tierra), también hacia atrás, y sin aliasing a 1 año/s (Fobos se muestra como órbita) | ✅ | `engine.spec` «movimiento coherente…»: en un año simulado a 1 año/s, la Tierra da entre 0,95 y 1,1 vueltas y la razón Mercurio/Tierra queda entre 4 y 4,3, en los dos sentidos. «a 1 año/s, Fobos…»: Fobos se oculta y su órbita se resalta; a 1 día/s sigue así por la histéresis (18,8° por frame, entre 15° y 20°); a 1 hora/s vuelve. e2e `movimiento`: con Marte enfocado y a 1 año/s, `stats().aliased` contiene `fobos` y `deimos`, y queda vacío al pausar. Captura `escritorio-aliasing-marte.webp`. |
| Los enlaces con parámetros abren el estado exacto; la URL no cambia durante la reproducción; un parámetro no válido no rompe nada | ✅ | e2e `tiempo`: `/?fecha=2030-06-01T12:00Z&cuerpo=jupiter` abre en pausa en ese instante, con 14:00:00 en los campos (Madrid, UTC+2), la ficha de Júpiter abierta y la URL intacta. Al reproducir, la fecha sale de la URL una vez y en 3 s hay 0 cambios de URL; al pausar, vuelve con el instante exacto. `measure.mjs`: 0 cambios de URL en 5 s a 1 año/s. e2e `parametros`: con una fecha imposible, un cuerpo y una escala que no existen, salen 3 avisos que se pueden cerrar y el explorador abre en «ahora» y en tiempo real. Los parámetros malos desaparecen de la URL, todo sigue funcionando y no hay ningún error de consola. |
| Store ≤ 5 actualizaciones/s; el viaje sistema → Tierra → Luna → sistema no recrea el motor ni deja fugas | ✅ | `measure.mjs`: **4,8 eventos `timeChanged` por segundo** a 1 año/s. e2e: ≤ 16 cambios de la barra de tiempo en 3 s. `engine.spec`: ≤ 10 en 2 s a tiempo real. e2e `vistas`: tres ciclos sistema → Tierra → Luna → sistema con el mismo objeto motor, el mismo `<canvas>` y un solo lienzo; geometrías y texturas iguales tras el segundo y el tercer ciclo. `measure.mjs`, tras 10 cambios de vista: 6 geometrías, 11 texturas, 10 MB de heap y 1 contexto WebGL vivo, como al principio. |
| Con movimiento reducido no hay animaciones de cámara ni de texto | ✅ | `engine.spec` «con movimiento reducido no hay viajes: el cambio de vista es un corte» y «…los cambios son directos». e2e `vistas` con `reducedMotion: 'reduce'`: «Saltar el viaje» no llega a aparecer y la `transition-duration` de los textos es < 1 ms (regla global de `styles.css` y duraciones a 0). |
| e2e en verde en local (y en el CI cuando exista, fase 4) | ✅ | `npx playwright test`: **39 passed (unos 2 min)** con SwiftShader: 33 de escritorio (entre ellos, 9 de maquetación en anchos de escritorio y pantallas bajas), 5 de móvil (Pixel 7) y 1 sin WebGL. Varias pasadas seguidas sin fallos. En el CI, en la fase 4 (§4.8). |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 3.a.1 Diseño en los componentes, escritorio y móvil, capturas y revisión de diseño | hecha | En los componentes, con los datos reales y la escena en modo captura. La revisión de diseño, al final (§4.1). |
| 3.a.2 `docs/ESTILO.md` | hecha | Tuteo, frases, cifras con `Intl` es-ES, unidades, fechas y horas, fuentes, aria-live e iconos; una excepción anotada (§4.7). |
| 3.b.3 Stores con tests | hecha | `SimulationStore` (tiempo, reproducción, velocidad, selección, escala, calidad, límite y reloj propio sin motor) y `ExplorerStore` (vista desde la ruta, vista limpia, viaje, ficha, ayuda, atajos y recorrido); `simulation.store.spec` y `explorer-session.spec`. |
| 3.b.4 `TimeControlsComponent` | hecha | Inputs nativos de fecha y hora en hora local o UTC, que no cambian mientras tienen el foco. «Ahora», reproducir/pausar, 6 velocidades y «Hacia atrás». Al llegar a 1900 o 2100, pausa con aviso. En móvil, una fila plegable; en el escritorio estrecho, más compacta (§4.11). |
| 3.b.5 `BodyPickerComponent` y `BodyPanelComponent` | hecha | El índice es un árbol con las distancias de cada momento. Se elige también en el lienzo (raycast con zonas agrandadas y clic en la etiqueta, de la fase 2). La ficha da el tipo, el resumen, las distancias al Sol y a la Tierra (a su planeta las lunas), el radio, la rotación, el año y el enlace a la ficha completa. |
| 3.c.6 `CameraControlsComponent` | hecha | Acercar, alejar, vista general y vista limpia. Teclado en el lienzo. Encuadre con `setViewOffset` y FOV compensado, con márgenes que cambian con suavidad. |
| 3.c.7 Estelas y aliasing | hecha | Estela del último segundo real (por delante del cuerpo hacia atrás). Aliasing con histéresis (20°/15°) medido con el intervalo real entre frames; la rotación se congela. |
| 3.c.8 `ViewSwitcherComponent` y viajes | hecha | Enlaces normales (prerenderizados). Viaje de ~3 s con evento `travel`, «Saltar» y `Esc`, corte con movimiento reducido y texturas del destino pedidas al empezar. El motor no se recrea. |
| 3.d.9 URL validada y sincronizada | hecha | `fecha`, `cuerpo`, `escala` y `calidad`. Lo no válido se ignora y se avisa. Se escribe con `replaceUrl` en pausa, al elegir, al cambiar de vista o de escala, nunca durante la reproducción. |
| 3.d.10 Teclado completo y diálogo de atajos | hecha | `<dialog>` nativo. Los atajos no actúan en campos de texto ni con Ctrl, Cmd o Alt, y se pueden desactivar (§4.4). |
| 3.d.11 `aria-live` y transiciones de texto | hecha | Una frase al elegir o cambiar de vista («Saturno, planeta. A 1430 millones de km del Sol…»), nunca por el tiempo. `@starting-style` en el texto de la vista y en la ficha. |
| 3.d.12 Playwright con SwiftShader y e2e | hecha | `playwright.config.ts` con 3 proyectos; 39 e2e deterministas (`?captura=1` o `fecha` fija) que esperan a eventos del motor o al reposo, no a tiempos fijos (salvo para medir el paso del tiempo). |

## 4. Desviaciones del plan y motivo
### 4.1 La revisión de diseño llegó después de conectar la lógica
El plan pedía revisar las capturas del diseño antes de conectar la lógica. La sesión anterior se cortó con la fase a medias en una rama temporal, y al rehacerla sobre `main` el diseño y la lógica entraron en los mismos commits. Para no saltarse el control, la revisión de diseño se hizo con las capturas finales, por un subagente sin contexto (`docs/revisiones/fase-3-diseno.md`). Sus hallazgos se corrigieron antes de la revisión de código. La primera iteración del diseño está en `img/fase-3/diseno/` y apenas difiere de la final (centrado del encuadre en la parte visible y ajustes de la hoja en móvil).

### 4.2 Sin búsqueda por la primera letra en el índice
El plan de la fase (§0.12) la incluía, pero las letras son atajos globales del explorador (`K`, `R`, `N`, `G`, `V`) y se pisarían con «Neptuno», «Rea»… La guía de WAI-ARIA la recomienda pero no la exige; el árbol tiene flechas, Inicio y Fin. Explicado en `body-tree.ts`.

### 4.3 Árbol plano y distancias fuera del árbol accesible
- **Antes:** las lunas iban dentro de su planeta (`role="group"`), el nombre de cada fila salía de `aria-labelledby` y la distancia era la descripción.
- **Problema (axe):** axe marcó `label-content-name-mismatch` (WCAG 2.5.3) en todas las filas con distancia y en los planetas abiertos: el texto visible no estaba dentro del nombre accesible.
- **Ruido:** además, la descripción cambia hasta 5 veces por segundo al reproducir, y los lectores anuncian los cambios de descripción del elemento con el foco.
- **Ahora:** el árbol es plano. Las lunas van detrás de su planeta, con `aria-level`, `aria-setsize` y `aria-posinset`; el nombre sale del contenido y la distancia queda `aria-hidden`.
- **Dónde está la distancia para el lector:** en la ficha (que no tiene foco y no habla) y en el anuncio al elegir.
- **Plan:** §0.12 decía «las cifras que cambian al reproducir quedan fuera del nombre accesible»; ahora quedan fuera del árbol accesible entero.

### 4.4 Atajos de una sola tecla desactivables (añadido)
WCAG 2.1.4 (nivel A) exige que los atajos de un solo carácter se puedan desactivar o reasignar, o que solo actúen con el foco. Una casilla en el diálogo de atajos los desactiva, y se recuerda en `localStorage` (`tls.atajos`, con try/catch). Desactivados, solo queda `Esc`. El botón de ayuda de la barra de tiempo sigue abriendo el diálogo. Se propone añadirlo al plan (§10).

### 4.5 JS inicial: +7,8 kB (287,70 → 295,46 kB), por debajo del aviso de 300 kB
No entra ningún código de la aplicación nuevo: `check-initial-bundle.mjs` vigila ahora también `src/app/state/` y los controles del visor, y el `main` solo lleva `app.ts`, `app.routes.ts`, `body-index.ts`, el título y la configuración.

El aumento es de `@angular/core`, `@angular/router` y `@angular/common`. esbuild no parte un módulo entre chunks, así que las piezas de Angular que solo usa el código diferido acaban en el chunk compartido con `main`. Esas piezas son el runtime de `@defer`, `linkedSignal`, `effect`, `afterNextRender`, `@Service` y los inputs de señal. Se probó a quitar `afterRenderEffect` (se sustituyó por `effect` + `afterNextRender`). Margen hasta el aviso: 4,5 kB.

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

### 4.9 Con SwiftShader, el reloj de la simulación corre algo más despacio
El motor no deja avanzar el reloj más de 400 ms por frame (`MAX_FRAME_DT_MS`) para no dar saltos. Con SwiftShader, un frame de la escena a 1 hora/s puede tardar más, así que el tiempo simulado avanza menos de lo nominal. Con la GPU no pasa: 60 FPS. El e2e de «hacia atrás» lo tiene en cuenta: pide un retroceso de al menos 10 minutos en 2 s, no de 2 horas.

### 4.10 Añadidos al contrato de `SceneEngine`
- Órdenes: `setViewInsets`, `orbitBy`, `zoomBy`, `skipTransition` y `setLabelsVisible`.
- Evento: `travel`.
- Cifras: `stats().aliased`, la lista de cuerpos que se dibujan como órbita. La usan los e2e y sirve para depurar.

### 4.11 La barra de tiempo a 1024 px (riesgo 2 del plan), resuelta de otra forma
- **El fallo:** al revisar las capturas a 1024 × 768 aparecieron controles solapados («Hacia atrás» quedaba debajo de la fecha). La fila completa necesita unos 1146 px.
- **El plan:** preveía pasar la zona y la calidad a un grupo de «Ajustes».
- **La solución:** basta con algo menos invasivo. Entre 64 y 72 rem, «Reproducir» se queda en su icono (con el nombre accesible y el título) y la fila pierde algo de aire. Además, la opción local de la zona se llama «Local (UTC+2)» en todas las anchuras: la etiqueta ya dice «Zona».
- **La prueba:** `e2e/maquetacion.spec.ts` comprueba que ningún control se solapa ni se sale a 1024, 1100, 1280 y 1600 px. Sin el arreglo, falla a 1024. Captura: `estrecho-ficha-saturno.webp`.

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
10. **Playwright.** Tres proyectos (`escritorio` 1280 × 800, `movil` con Pixel 7 y `sin-webgl`), el build servido por `serve-dist.mjs` en el puerto 4330, `es-ES` y `Europe/Madrid`. Los e2e están en TypeScript: `tsconfig.e2e.json` comprueba sus tipos en `npm run e2e` y entran en `ng lint`. axe con las reglas WCAG 2.1 A y AA: falla con cualquier violación grave o crítica.

## 6. Salida de los checks
```
npm run check
> ng lint && prettier --check .
All files pass linting.
All matched files use Prettier code style!
> ng test --watch=false
 Test Files  45 passed (45)
      Tests  344 passed (344)
All files (ephemeris/)  |   99.57 |    96.73 |     100 |     100
> ng build
Initial chunk files | Names    |  Raw size | Estimated transfer size
main-…js            | main     | 289.18 kB |                79.59 kB
styles-…css         | styles   |   5.82 kB |                 1.72 kB
                    | Initial total | 295.46 kB |            81.79 kB
Lazy chunk files
chunk-…js           | index        | 635.80 kB | 137.64 kB   (three + motor)
chunk-…js           | explorer-ui  | 209.69 kB |  55.27 kB   (astronomy-engine, stores e interfaz)
chunk-…js           | viewer-layout|   6.80 kB |   2.18 kB
Prerendered 17 static routes.
> node scripts/check-initial-bundle.mjs
✔ El JS inicial de las 18 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine
  ni de los stores ni de los controles del visor.
```
Sin avisos de presupuesto. El chunk del visor (three y el motor) pesa 635,80 kB (aviso de §5 a 900 kB). La interfaz diferida, con astronomy-engine, 209,69 kB.

```
npx playwright test
  39 passed (2.0m)
```

### Mediciones (`node scripts/measure.mjs`, Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Medida | Resultado | Objetivo (§5) |
|---|---|---|
| Reproducción a 1 día/s (alta, media y baja) | 60 FPS (mín. 60) · 1,55 / 1,36 / 1,23 ms de CPU por frame · 0,17–0,19 ms de efemérides · 34 llamadas | ≥ 55 ✅ · ≤ 2 ms ✅ |
| Reposo (3 s en pausa) | 0 frames · 0 `requestAnimationFrame` | ✅ |
| Store a 1 año/s | 4,8 actualizaciones por segundo | ≤ 5 ✅ |
| URL durante 5 s de reproducción | 0 cambios; al pausar, `?cuerpo=marte&fecha=2036-06-18T22:24:38Z` | ✅ |
| VRAM alta (sistema / Tierra / Luna) | 27 / 67 / 107 MB (media y baja: 27 / 35 / 43) | ≤ 300 / ≤ 120 ✅ |
| Memoria tras 10 idas y vueltas explorador ↔ `/planetas` | 6 geometrías · 11 texturas · 10 MB de heap · 1 contexto WebGL vivo · 1 lienzo | sin crecimiento ✅ |
| Memoria tras 10 cambios de vista y 6 de calidad | 6 geometrías · 11 texturas · 10 MB · 1 contexto | sin crecimiento ✅ |
| Contexto WebGL perdido y recuperado | `contextLost` → `contextRestored`, 0 frames mientras está perdido y la fecha cambiada se conserva (captura `contexto-recuperado.webp`) | ✅ |
| Primera vista (`/`, alta) | JS 1116 kB, texturas 378 kB, estrellas 70 kB, póster 28 kB, fuentes 52 kB · una tarea larga de 108 ms · LCP: `img.poster` a 148 ms | texturas ≤ 2,5 MB ✅ · sin tareas > 200 ms ✅ · el LCP no es el lienzo ✅ |

## 7. Capturas
En `docs/informes/img/fase-3/`, deterministas (`?captura=1`, 2026-10-24 00:00 UTC, `es-ES`, `Europe/Madrid`), con `node scripts/capture-ui.mjs docs/informes/img/fase-3`:
- **Escritorio (1600 × 900):** `escritorio-sistema`, `escritorio-ficha-saturno`, `escritorio-luna-de-saturno` (Titán), `escritorio-tierra`, `escritorio-luna`, `escritorio-atajos`, `escritorio-vista-limpia`, `escritorio-aviso-url`, `escritorio-limite-2100`, `escritorio-aliasing-marte`, `escritorio-carga` y `escritorio-error`.
- **Portátil (1280 × 720):** `portatil-ficha-jupiter`. **Escritorio estrecho (1024 × 768):** `estrecho-ficha-saturno`.
- **Pantallas bajas:** `movil-pequeno-desplegado` (360 × 640 táctil, con la barra desplegada), `movil-horizontal` (844 × 390 táctil) y `zoom-200-desplegado` (1280 × 720 con el zoom al 200 %: 640 × 360 a 2×).
- **Móvil (390 × 844 a 2×, como teléfono táctil):** `movil-sistema`, `movil-ficha-saturno`, `movil-tierra`, `movil-luna`, `movil-tiempo-desplegado`, `movil-menu`, `movil-carga` y `movil-error`.
- **Contexto WebGL recuperado:** `contexto-recuperado`.
- **Primera iteración del diseño:** `diseno/` (10 capturas).

Los pósters de `public/img/` se han regenerado con `node scripts/build-poster.mjs`.

## 8. Dependencias añadidas
| Paquete | Versión | Motivo | ¿Está en la lista permitida? |
|---|---|---|---|
| `@axe-core/playwright` (desarrollo; arrastra `axe-core`) | 4.14.0 | axe en los e2e (D27) | Sí (§1, desarrollo) |

## 9. Pendientes y `TODO(ivan)`
- **Probar en un móvil real** la hoja inferior, los gestos y los 30 FPS en baja, por la red local (`npm start -- --host 0.0.0.0`) o en el staging. No bloquea.
- **Fase 4:** los e2e en el CI (§4.8).
- **Decisiones de Iván:** las propuestas de cambio al plan de la fase 2 siguen pendientes (`PENDIENTES.md`) y la de esta fase está en §10.
- **Sugerencias de la fase 2 llevadas a la fase 3:**
  - el H1 va ya antes del escenario en el DOM (sugerencia 22);
  - la vista general se encuadra en la parte visible, también en móvil vertical (sugerencia 18);
  - los stores van en el `@defer` (sugerencia 24);
  - la caché de los puntos de las órbitas (sugerencia 19) sigue anotada: a 60 FPS no hace falta.

## 10. Propuestas de cambio al plan
No se aplican hasta que Iván las apruebe.
1. **3.d.10:** «Teclado completo y diálogo de atajos (`?`). Los atajos no actúan con el foco en un campo de texto **y los de una sola tecla se pueden desactivar en el diálogo (WCAG 2.1.4)**».

## 11. Cómo probarlo
```bash
npm ci
npm run check                                   # lint + tests + build + bundle por módulos
npm run e2e                                     # tipos de los e2e + build + 39 e2e con SwiftShader
npm run build && node scripts/serve-dist.mjs    # el build prerenderizado en http://localhost:4321
```
- Elige un cuerpo en el índice, en el lienzo o en su etiqueta; cierra la ficha con «×» o `Esc`.
- Reproduce con `K` o el botón, cambia la velocidad con `,`/`.` o el desplegable, invierte con `R` y vuelve a ahora con `N`.
- Con el foco en el lienzo: flechas para girar (Mayús, más deprisa), `+`/`−` para el zoom e `Inicio` para la vista general. `V` oculta la interfaz y `?` muestra los atajos (y la casilla para desactivarlos).
- Vistas con `1`/`2`/`3` o el selector; durante el viaje, «Saltar el viaje» o `Esc`.
- `/?fecha=2030-06-01T12:00Z&cuerpo=jupiter`: un enlace exacto. `/?fecha=2030-02-31T00:00Z&cuerpo=pluton`: avisos.
- `/?captura=1&cuerpo=marte` y 1 año/s: Fobos y Deimos como órbitas.
- Capturas: `node scripts/capture-ui.mjs <carpeta>` · pósters: `node scripts/build-poster.mjs` · mediciones: `node scripts/measure.mjs [--img=<carpeta>]`.

## 12. Revisión de diseño (3.a)
Revisión por subagente en `docs/revisiones/fase-3-diseno.md`. Veredicto: CAMBIOS NECESARIOS, con 1 bloqueante, 6 importantes, 10 menores y 6 sugerencias. Todos corregidos en los commits `15f8f0b`–`6380652`, salvo las sugerencias 18 y 23 (textos), que quedan para Iván. **Verificación por el mismo subagente: pendiente** (se cortó la sesión por el límite de uso).
