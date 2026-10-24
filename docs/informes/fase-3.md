# Informe: Fase 3 (Interfaz del explorador e interacción)

- **Rama:** `fase-3-interfaz`
- **Fecha:** 2026-10-24
- **Estado:** en curso (modo autónomo por bloques, bloque B)

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
- 3.a ⏳
- 3.b ⏳
- 3.c ⏳
- 3.d ⏳
- 3.e ⏳
