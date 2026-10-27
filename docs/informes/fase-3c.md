# Informe: Fase 3c (Interfaz inmersiva del sistema solar)

- **Rama:** `fase-3c-interfaz`
- **Fecha:** 2026-10-26 · 2026-10-27
- **Estado:** listo para revisión (modo autónomo por bloques, bloque R)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo, a partir de `docs/PLAN.md` (fase 3c, D30 y D31), `docs/decisiones/FASE-3c-INTERFAZ.md`, `docs/DISENO.md`, `docs/ESTILO.md`, la revisión del bloque B (B5), el informe y la revisión de la fase 3b y el código de la interfaz (fase 3). Lo que cambie durante la ejecución se explica en §4.

La referencia del original (la captura de su barra inferior) no está en el repositorio: se sigue su descripción del documento de origen. Se toma la **estructura**; los estilos, las formas y los textos son nuestros (D30, dirección visual A «Carta celeste»).

### Entregas
| Entrega | Contenido |
|---|---|
| 3c.a | **Arranque en movimiento y velocidades (D31).** 3 días/s (por defecto) y 10 días/s en `state/speeds.ts`, en los dos sentidos; al entrar sin `?fecha=`, reproduciendo a 3 días/s desde «ahora»; con movimiento reducido o con `?fecha=`, en pausa. Tests unitarios y un e2e por caso. `ESTILO.md` §3 con las velocidades nuevas. **Cambio de Iván (27-10):** la entrada pasa a 3 horas/s, con su escalón nuevo. |
| 3c.b | **Lienzo a pantalla completa y panel «Índice».** El explorador deja la rejilla de columnas: el lienzo ocupa todo y la interfaz flota encima. La columna lateral pasa a un panel desplegable «Índice» (cerrado al entrar; botón siempre visible; `Esc`; foco que entra al abrir y vuelve al botón al cerrar) con el árbol de los 30 cuerpos tal como está (teclado, árbol plano, distancias y nota). Pestañas de vista flotantes arriba; texto de presentación arriba a la izquierda que se pliega al interactuar o al elegir un cuerpo (en los móviles bajos, solo el H1); pie con «Un proyecto de… · Créditos», las pistas de uso y la fuente de los datos en letra pequeña (ocultos en la vista limpia). La ficha resumida, como tarjeta flotante. Márgenes del encuadre (`setViewOffset`) recalculados con los paneles flotantes (`[data-chrome]`). |
| 3c.c | **Fichas de cuerpos.** Una fila con el Sol y los 8 planetas, cada uno con su miniatura redonda renderizada por nuestro motor (`scripts/build-body-thumbnails.mjs`: modo de captura con el cuerpo aislado, sin estrellas, órbitas ni otros cuerpos, recortado y en WebP pequeño en `public/img/cuerpos/`); al elegir un planeta con lunas, una segunda fila con ellas (sus miniaturas, también del motor: hasta la fase 7, con su color esquemático). Barra de herramientas con botones `aria-pressed` (el patrón que el plan admite junto al `radiogroup`): las flechas solo mueven el foco, una sola parada de tabulación por fila, e Intro, Espacio o clic eligen; así, recorrer la fila con el teclado no lanza un viaje de cámara en cada paso. Foco visible y nombre accesible con la distancia actual (como descripción, que no cambia mientras el foco sigue en la ficha, como en el índice). En móvil, filas desplazables con zonas táctiles ≥ 44 px. |
| 3c.d | **Barra de tiempo compacta y «Controles +».** Botón redondo de reproducir/pausar en latón (el primer control de la barra, WCAG 2.2.2); fecha legible con su rótulo «Fecha» e icono de calendario que abre el selector nativo; línea de tiempo del año de la fecha mostrada (`input type="range"` con `aria-valuetext` «17 de marzo de 2026»; flechas = 1 día, RePág/AvPág = 1 mes, Inicio/Fin = el año; marca de «hoy»; el año a la vista y paso al anterior o al siguiente en los extremos; rango total 1900–2100); selector de velocidad. «Controles +» despliega lo menos usado: hora y zona, «Ahora», calidad, vista limpia y atajos (en móvil, hoja inferior). |
| 3c.e | **Cierre.** Rendimiento con la reproducción automática (FPS, coste de CPU, Lighthouse y CLS), capturas en escritorio, portátil y móvil (también de que ningún cuerpo enfocado queda tapado), e2e y axe, informe, `npm run check`, revisión por subagente, correcciones y fusión. |

### Diseño (decisiones de partida)
1. **El motor y el lienzo no cambian** (lienzo único, D10). Solo cambia lo que flota encima y los márgenes del encuadre, que ya se miden de los paneles `[data-chrome]` (`insets.ts`): la clasificación por borde sirve igual para paneles flotantes.
2. **Accesibilidad primero:** el panel «Índice» sigue siendo la alternativa completa a las fichas y al canvas; las fichas son un `radiogroup` (una parada de tabulación, flechas); la línea de tiempo es un `input type="range"` nativo (ratón, táctil y teclado de serie) con `aria-valuetext`; la pausa es el primer control de la barra y `Espacio`/`K` pausan. axe sin violaciones en los nuevos estados (índice abierto, controles desplegados).
3. **Nada nuevo en el bundle inicial:** el marco prerenderizado (póster, pestañas, texto de presentación, pie) sigue siendo ligero; fichas, barra, índice y miniaturas llegan en el `@defer` de siempre. Las miniaturas son `<img>` con ancho y alto fijados (sin CLS) y `loading="lazy"` en la segunda fila.
4. **Sin saltos de maquetación:** el marco prerenderizado reserva el sitio de la barra y de las fichas (CLS ≤ 0,05).
5. **La URL** sigue sin cambiar durante la reproducción (§4.5): la reproducción automática no la toca.
6. **Rendimiento:** con la reproducción automática no hay render bajo demanda al llegar; se mide el coste (CPU por frame y FPS) y se comprueba que la pestaña oculta pausa. Lighthouse móvil del explorador ≥ 90.

### Archivos
- Nuevos: `features/body-chips/` (fichas, con test), `features/time-controls/timeline.ts` (lógica pura de la línea de tiempo, con test), `features/explorer-ui/index-panel` o equivalente, `scripts/build-body-thumbnails.mjs`, `public/img/cuerpos/*.webp`, `docs/informes/img/fase-3c/`.
- Tocados: `features/viewer/viewer-layout.{html,ts,css}`, `features/explorer-ui/*`, `features/time-controls/*`, `features/body-picker/*` (dentro del panel), `features/view-switcher/*`, `state/speeds.ts` (+ test), `explorer-session.ts` (arranque), `e2e/*`, `docs/ESTILO.md` (velocidades), `docs/FUENTES.md` (las miniaturas salen de texturas ya atribuidas; se anota su origen).

### Dependencias
Ninguna nueva.

### Riesgos y dudas
1. **Dos filas de fichas + la barra en un móvil bajo** pueden tapar mucho lienzo: la segunda fila solo aparece con un planeta con lunas elegido, y la hoja inferior se desplaza por dentro si no cabe (como ahora).
2. **La reproducción automática** gasta CPU y batería: se pausa con la pestaña oculta (ya existe) y se mide.
3. **Los e2e y las capturas** suponen hoy un arranque en pausa: el modo de captura sigue arrancando en pausa en su fecha fija; los e2e que dependan del arranque se adaptan.

### Estado de las entregas (se actualiza al cerrar cada una)
- **3c.a — hecha** (`ddfbf7e`, `17aec80`): 3 y 10 días por segundo en `state/speeds.ts`; arranque a 3 días por segundo desde «ahora», en pausa con movimiento reducido o con `?fecha=` (D31); tests unitarios y `e2e/arranque.spec.ts` (los tres casos); con la GPU, 3,01 días por segundo real. `ESTILO.md` §3 al día.
  - **Cambio de Iván (27-10):** el arranque pasa a **3 horas por segundo**, con un escalón nuevo de 3 h/s (nueve en total; 3 y 10 días por segundo se quedan). Las excepciones siguen igual. Actualizados D31 en el plan y en el documento de origen, `CLAUDE.md`, `ESTILO.md` §3, los tests, `e2e/arranque.spec.ts` y el script de capturas (`b2f873a`).
- **3c.b — hecha** (`11ad20f`): lienzo a pantalla completa, panel «Índice», tarjeta flotante, texto de presentación plegable y pie.
- **3c.c — hecha** (`dfd4c78`): fichas de cuerpos con sus miniaturas, renderizadas por el motor.
- **3c.d — hecha** (`0b291f6`): barra de tiempo compacta, línea de tiempo del año y «Controles +».
- **3c.e — hecha**: mediciones con la reproducción automática, capturas, e2e y axe, y este informe.

## 1. Resumen

El explorador del sistema solar tiene ya la disposición inmersiva de D30 con la dirección visual A:
- **Lienzo a pantalla completa.** Arriba a la izquierda flotan las vistas y el texto de presentación, que se pliega al usar el explorador.
- **Franja de abajo:** un velo que se funde hacia arriba, con las fichas de cuerpos, la barra de tiempo compacta y el pie.
- **Fichas de cuerpos:** el Sol y los 8 planetas, con miniaturas renderizadas por el propio motor. Al elegir un planeta con lunas, aparece una segunda fila con ellas.
- **Barra de tiempo:** reproducir en latón, la fecha legible con su calendario, la línea de tiempo del año y la velocidad. «Controles +» despliega el resto.
- **Índice:** la columna lateral pasa a un panel «Índice», cerrado al entrar.
- **Tarjeta del cuerpo:** flota a la derecha (en móvil, todo son hojas inferiores).
- **Arranque:** a 3 horas por segundo (decisión de Iván del 27-10), en pausa con movimiento reducido o con `?fecha=`.

El encuadre se aparta de cada panel y ningún cuerpo enfocado queda tapado. Al entrar no hay saltos de maquetación (CLS 0 en móvil y 0,0004 en escritorio, por el cambio de fuente). Se mantienen los 60 FPS y el bundle inicial no crece (297,66 kB, 11,58 kB de código propio).

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas en escritorio, portátil y móvil, junto a la referencia, con la misma **estructura** y **nuestro estilo**, coherente con `docs/DISENO.md` | ✅ | 34 capturas de la interfaz en `docs/informes/img/fase-3c/` (§7). La referencia del original no está en el repositorio: la tabla de §7.1 pone cada elemento de su estructura junto al nuestro, con su captura |
| Al entrar, el sistema se mueve a 3 h/s; con movimiento reducido o con `?fecha=`, en pausa (e2e) | ✅ | `e2e/arranque.spec.ts` (3 casos, en verde). Con la GPU, `scripts/measure-autoplay.mjs` mide 3,00 h/s en escritorio y 3,02 en móvil, con la lectura «Hora local, UTC+1 · 3 horas por segundo» y el botón en «Pausar» |
| La línea de tiempo funciona con ratón, táctil y teclado y anuncia la fecha (axe; prueba de teclado en el informe) | ✅ | Es un `input type="range"` nativo con `aria-valuetext`. Teclado, en `e2e/tiempo.spec.ts` (de 15-03-2031): → «16 de marzo de 2031», RePág «16 de abril de 2031», Fin «31 de diciembre de 2031», → «1 de enero de 2032» (cambia el año y el máximo pasa a 365), Inicio al día 0 y la URL al día. Ratón: clic en la mitad de la pista (junio–julio) y «Año siguiente». Táctil, en `e2e/movil.spec.ts`: un toque al 90 % (último trimestre). axe sin violaciones en todos los estados del explorador |
| Las fichas permiten elegir los 30 cuerpos (planetas en la primera fila, lunas en la segunda) | ✅ | `e2e/fichas.spec.ts`: elige los 9 de la primera fila y las 21 lunas de la segunda (cuenta 30). En cada uno comprueba la ficha, `aria-pressed` y el foco del motor |
| Panel «Índice» cerrado al entrar; se abre y cierra con ratón, teclado y `Esc`, con el foco gestionado; conserva el árbol con distancias y su accesibilidad (e2e + axe) | ✅ | `e2e/indice-y-ficha.spec.ts`: cerrado al entrar (`--view-left` = 0); con el ratón, el foco entra en `#tree-sol` y el encuadre se aparta (> 200 px); con `I`, las flechas y `Esc`, el foco vuelve a «Índice»; también con su botón de cerrar; las distancias, en la columna. axe con el índice abierto (escritorio y móvil). En móvil, una hoja (`e2e/movil.spec.ts`) |
| Ningún cuerpo enfocado queda tapado por la interfaz (capturas) | ✅ | `escritorio-indice-saturno` (índice, tarjeta y fila de lunas a la vez: Saturno, en el centro de lo que queda), `portatil-ficha-jupiter`, `estrecho-ficha-saturno`, `escritorio-luna-de-saturno`, `movil-ficha-saturno`, `movil-pequeno-ficha` y `movil-horizontal-ficha`. Tests: `insets.spec.ts` (bordes declarados) y el del motor con márgenes |
| FPS, Lighthouse y CLS dentro de §5 con la reproducción automática | ✅ FPS y CLS · ⚠️ Lighthouse | **FPS:** 60/60/59,8 a 3 h/s en alta, media y baja, con 1,41–1,85 ms de CPU por frame. **CLS:** 0 en móvil y 0,0004 en escritorio (≤ 0,05). **LCP:** el póster, a 176 ms y 40–80 ms. **Tareas largas:** como mucho una, de 83 ms en alta (< 200 ms). **Lighthouse:** no se ha ejecutado, porque no está entre las dependencias (`@lhci/cli` espera tu decisión, fase 10); se miden sus métricas de arranque (§4.10 y §6) |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 1. Fichas de cuerpos | hecha | `features/body-chips/`. Barras de herramientas con `aria-pressed` (una de las dos semánticas que admite el plan) y miniaturas del motor (`scripts/build-body-thumbnails.mjs`, `?aislado=1`). En móvil, filas que se desplazan, con zonas táctiles ≥ 44 px (e2e) |
| 2. Barra de tiempo compacta | hecha | `features/time-controls/`: la barra, `timeline-slider.ts` (con la lógica pura en `timeline.ts`, con tests) y `time-menu.ts` |
| 3. Velocidades (3 h/s por defecto, 3 y 10 días/s) | hecha | 9 escalones, en los dos sentidos (§4.1) |
| 4. «Controles +» | hecha | Un `popover` del navegador: en escritorio, encima de la barra; en móvil, una hoja. Sin escala, que llega en la fase 7 |
| 4b. Panel «Índice» | hecha | `explorer-ui/index-panel.ts`. Botón «Índice» en la fila de las fichas (§4.2) |
| 5. Texto de presentación | hecha | Se pliega al usar el explorador o al elegir un cuerpo. En los móviles bajos, solo el H1 compacto (resuelve la duda de la fase 3). La tarjeta, flotante |
| 6. Pistas de uso y pie de los datos | hecha | En escritorio, en el pie; ocultos en la vista limpia. En móvil, §4.8 |
| 7. Arranque en movimiento (e2e por caso) | hecha | 3c.a, con el cambio a 3 h/s (§4.1) |
| 8. Encuadre | hecha | Bordes declarados por CSS (§5.1). La cámara y «Saltar el viaje», en la parte visible |
| 9. Rendimiento | hecha | `scripts/measure-autoplay.mjs` (§6.2). La pestaña oculta no pinta: 0 frames en 2 s y 61 en 1 s al volver |

## 4. Desviaciones del plan y motivo

### 4.1 Velocidad de entrada: 3 horas por segundo (decisión de Iván, 27-10)
El plan decía 3 días/s y así se hizo en la 3c.a. Iván lo cambió a mitad del bloque: se añadió el escalón de 3 h/s y pasó a ser el de entrada. Se actualizaron el plan (D31 y la fase 3c), el documento de origen, `CLAUDE.md`, `ESTILO.md` §3, los tests, los e2e y el script de capturas.

### 4.2 El botón «Índice», en la franja de abajo, a la izquierda de las fichas
El plan pide un botón «siempre visible», sin decir dónde. Va al principio de la fila de las fichas por tres motivos:
- el panel se abre justo encima, a la izquierda, y se lee como un desplegable de su botón;
- en el DOM, el panel va justo detrás del botón (patrón de divulgación) y las fichas, después;
- arriba habría tenido que llegar con la interfaz diferida junto al texto prerenderizado, y lo habría movido (CLS).

En móvil, el índice sube como hoja y tapa su botón: lleva su propio botón de cerrar.

### 4.3 `Esc` cierra lo que tiene el foco
Con el foco en el índice, `Esc` cierra el índice aunque la ficha esté abierta. Si no, cierra antes la ficha y después el índice. «Controles +» lo cierra el propio navegador, sin cerrar nada más (e2e). Antes de esta fase, `Esc` cerraba siempre la ficha.

### 4.4 Miniaturas: tres ajustes de encuadre y las lunas, con su color esquemático
Todas salen a 30° de fase y desde 15° sobre el ecuador del cuerpo, con tres excepciones:
- **El Sol:** alejado, como en la vista general, y con su halo. Con el encuadre de primer plano salía un disco crema que se confundía con una luna.
- **Saturno:** a 1,7 radios, con los anillos cortados por el círculo. Con los anillos enteros, el planeta quedaba diminuto.
- **La Tierra:** a las 11:00 UTC, con Europa y África de cara. A las 00:00 se veía solo el Pacífico.

Titán se recorta por el disco: con el halo de su atmósfera parecía una estrella. Las lunas sin textura salen con su color esquemático, como prevé el plan hasta la fase 7. Total: 30 WebP de 96 px, 25,9 kB.

### 4.5 La franja de abajo es un velo, no una banda opaca
Las notas de diseño de la sesión anterior hablaban de una franja opaca. Es un degradado del color del fondo, opaco abajo (barra y pie) y transparente arriba: así el 3D se ve a través del borde de las fichas, como en la referencia. No es glassmorphism: sin desenfoques, y los controles de encima son opacos. El encuadre cuenta toda la franja.

### 4.6 «Controles +» es un `popover`
Un `popover` del navegador:
- está en la capa superior, sin problemas de `z-index`;
- se cierra con `Esc` o al pulsar fuera y devuelve el foco a su botón;
- funciona con `popovertarget`, también antes de que llegue el JS que lo enlaza.

Al abrirse, el foco va al campo de la fecha. En escritorio tapa por un momento la parte de abajo de la tarjeta y la cámara: es un panel transitorio y no aparta el encuadre.

### 4.7 En móvil, la velocidad está en «Controles +»
En la barra de un teléfono no cabe un selector con «3 horas por segundo». La lectura de la barra dice la velocidad y el sentido («Hora local, UTC+1 · 3 horas por segundo»), y el selector está en el panel (`#time-speed-menu`). En escritorio, en la barra (`#time-speed`). Son dos selectores, uno oculto en cada tamaño.

### 4.8 En móvil no hay pie
En un teléfono no caben las pistas de uso. La fuente de los datos va en «Controles +» y los créditos ya están en el menú del sitio.

### 4.9 La barra da la hora sin segundos
«24 oct 2026, 02:00»: a 3 h/s, los segundos cambian sin que se puedan leer. Los segundos siguen en el campo de la hora de «Controles +».

### 4.10 Lighthouse no se ha ejecutado
No está entre las dependencias permitidas: `@lhci/cli` espera tu decisión para la fase 10, y usar `lighthouse` sería una herramienta nueva. Como en las fases 3 y 3b, se miden con las APIs de rendimiento sus métricas de arranque: LCP, CLS y tareas largas con su tiempo de bloqueo (§6.2). Todas cumplen §5.

### 4.11 Dos e2e, ajustados a la carga de SwiftShader en paralelo
Con el sistema en marcha al entrar, la carga de SwiftShader con 4 trabajadores en paralelo sube. Dos pruebas fallaban por tiempo, no por un error:
- **axe de todas las páginas:** emula el movimiento reducido (el explorador arranca en pausa). axe con el sistema en marcha ya lo mira la otra prueba.
- **Las 5 actualizaciones por segundo:** espera a 4 cambios y comprueba la frecuencia sobre el tiempo transcurrido. El máximo sigue siendo el criterio.

### 4.12 Archivos distintos de los previstos
- **Nuevos:**
  - `features/body-chips/` y `features/explorer-ui/index-panel.ts`;
  - `features/time-controls/{timeline,timeline-slider,time-menu}.*`;
  - `scripts/build-body-thumbnails.mjs` y `scripts/measure-autoplay.mjs`;
  - `public/img/cuerpos/*.webp`.
- **Retirado:** `features/body-picker/` deja la tira del móvil (ahora el índice es una hoja con el árbol entero).
- **Se toca el motor**, pero solo en el modo de captura: `scene/{engine,world,types}.ts`, para `aislado`.

## 5. Decisiones técnicas nuevas

### 5.1 Los paneles declaran por CSS el borde que tapan
`insets.ts` clasificaba los paneles por su geometría: alto y pegado a un lado, o ancho y pegado abajo. Con paneles flotantes ya no basta: una tarjeta baja a la derecha, la fila de lunas sobre la franja o el texto de presentación que no debe apartar el encuadre. Ahora cada panel puede declarar el borde que tapa con `--chrome-edge` (`top`, `right`, `bottom`, `left` o `none`), en cada maquetación: la tarjeta tapa por la derecha en escritorio y por abajo en móvil. Los que no lo declaran siguen con la geometría. Además, las posiciones se miden con los desplazamientos de cada contenedor hasta el explorador, porque la fila de lunas va dentro de las fichas. Tests: `insets.spec.ts`.

### 5.2 Modo de captura `aislado=1` en el motor
Solo en captura y con un cuerpo enfocado: se ve el cuerpo solo y centrado, sin estrellas, Vía Láctea, órbitas, etiquetas ni márgenes de la interfaz; el Sol, con su halo y Saturno, con sus anillos. La API pública solo crece en una opción (`isolate`). Test en `engine.spec.ts`.

### 5.3 Las filas de la franja, reservadas desde el HTML prerenderizado
- **El tamaño:** el marco prerenderizado (`viewer-layout`) da a la fila de las fichas y a la de la barra un alto mínimo: 4,5 rem cada una en escritorio y 4,25 + 6,75 rem en móvil.
- **El resultado:** cuando llega la interfaz diferida, ocupa su sitio sin mover nada (CLS 0).
- **La fila de lunas:** flota encima, es `data-chrome` y aparta el encuadre.
- **La tarjeta y el índice:** con la fila de lunas, acaban por encima de ella (si no, en un escritorio estrecho se pisaban).

### 5.4 La línea de tiempo lleva su propio teclado
- **Las teclas:** se calculan desde el instante actual, no desde el valor del deslizador, así que también valen mientras el tiempo corre.
- **Mientras tiene el foco y el tiempo corre**, lo que muestra se queda quieto (`linkedSignal` que se reinicia al cambiar el foco o la reproducción): el lector no anuncia cada día, como pasa con las distancias del índice.
- **El ratón y el táctil** usan el `input` nativo.

### 5.5 Las distancias del índice y de las fichas salen de las mismas funciones
`distanceValue` y `distanceText`, en `describe.ts`, con tests: el índice y las fichas dicen siempre lo mismo.

### 5.6 La cámara y «Saltar el viaje» se colocan con los márgenes medidos
Usan las variables `--view-*`: se apartan de la tarjeta, de la franja y de la fila de lunas sin que cada pieza conozca a las demás.

### 5.7 El texto de presentación se pliega con `interpolate-size`
La altura se anima de su valor a 0 donde el navegador lo admite y, donde no, se pliega de golpe. Con movimiento reducido, sin animación. El texto sigue para los lectores de pantalla.

## 6. Salida de los checks

```
npm run check   (27-10, en la rama, tras la 3c.d)
ng lint: All files pass linting · prettier: All matched files use Prettier code style!
Test Files 54 passed (54) · Tests 442 passed (442) · cobertura de ephemeris/: 99,65 % (líneas 100 %)
Initial total 297.66 kB (main 290.25 kB + styles 6.95 kB) · sin avisos de presupuesto
Lazy: index (motor) 664.29 kB · explorer-ui 246.10 kB · viewer-layout 7.80 kB
✔ El JS inicial de las 18 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 11.58 kB de 15.00

npx playwright test   (Chromium con SwiftShader, 4 trabajadores)
56 passed: escritorio, móvil (Pixel 7) y sin WebGL
```

### 6.1 Mediciones generales (`node scripts/measure.mjs`, 27-10; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Medida | Resultado | §5 |
|---|---|---|
| Primera vista (`/`, alta) | JS 1181 kB, texturas 318 kB, estrellas 70 kB, imágenes 36 kB (el póster y las 9 miniaturas de los planetas), fuentes 52 kB · una tarea larga de 83 ms (ninguna en baja) · LCP: `img.poster` a 176 ms | texturas ≤ 2,5 MB ✅ · sin tareas > 200 ms ✅ · el LCP no es el lienzo ✅ |
| Reposo (captura, en pausa) | 0 frames y 0 rAF en 3 s | ✅ |
| Reproducción a 1 día/s | 60 / 59,8 / 59,8 FPS en alta, media y baja · 1,68 / 1,55 / 1,45 ms de CPU por frame | ≥ 55 ✅ |
| Store y URL | 4,8 actualizaciones por segundo a 1 año/s · 0 cambios de la URL en 5 s de reproducción | ≤ 5 ✅ |
| VRAM (alta / media / baja) | sistema 35 / 35 / 35 MB · Tierra 75 / 43 / 43 · Luna 115 / 51 / 51 | ≤ 300 y ≤ 120 ✅ |
| Memoria | 10 idas y vueltas explorador ↔ ficha, 10 cambios de vista y 6 de calidad: 7 geometrías, 11 texturas y 10 MB de heap siempre, 1 contexto WebGL y 1 lienzo | ✅ |
| Contexto WebGL | perdido y recuperado: 0 frames sin contexto y la escena vuelve en su instante | ✅ |

### 6.2 Con la reproducción automática (`node scripts/measure-autoplay.mjs`, 27-10, la misma GPU)
| Medida | Escritorio (1600 × 900) | Móvil (Pixel 7) |
|---|---|---|
| Estado al entrar | «Pausar» (reproduciendo) · «Hora local, UTC+1 · 3 horas por segundo» | igual |
| Velocidad real | 3,00 h/s | 3,02 h/s |
| CLS | 0,0004: el cambio de fuente a los 108 ms (menú del sitio y pestañas de vista; no la interfaz nueva). En otra ejecución, 0 | 0 |
| LCP | `img.poster`, 172–176 ms | `img.poster`, 40–80 ms |
| Tareas largas | ninguna o una de 82–83 ms (tiempo de bloqueo ≤ 33 ms) | ninguna |
| Frames por segundo (rAF) | 65 | 65 |

| A 3 horas por segundo (captura) | Alta | Media | Baja |
|---|---|---|---|
| FPS (mínimo / medio) | 60 / 60 | 60 / 60 | 59 / 59,8 |
| CPU por frame | 1,85 ms | 1,57 ms | 1,41 ms |
| Efemérides por frame | 0,22 ms | 0,17 ms | 0,24 ms |
| Llamadas de dibujo · VRAM | 43 · 35 MB | 43 · 35 MB | 43 · 35 MB |

**Pestaña oculta:** 121 frames en 2 s visible, 0 en 2 s oculta y 61 en 1 s al volver.

**Coste:** a 3 h/s el motor pinta de forma continua, porque el modo lento a 4 Hz solo vale hasta 60 s/s. En este equipo son unos 1,4–1,9 ms de CPU por frame, el 11 % del presupuesto de un frame. En móvil, el gasto de batería lo marca la GPU: queda pendiente la prueba en un teléfono real (§9) y hay una propuesta en §10.

## 7. Capturas

En `docs/informes/img/fase-3c/` (modo de captura, 24-10-2026 00:00 UTC, en pausa), con `node scripts/capture-ui.mjs docs/informes/img/fase-3c`:
- **Escritorio (1600 × 900):**
  - `escritorio-sistema`, `escritorio-ficha-saturno` (tarjeta y fila de lunas) e `escritorio-indice-saturno` (índice, tarjeta y lunas);
  - `escritorio-luna-de-saturno` (Titán), `escritorio-controles` («Controles +» abierto);
  - `escritorio-tierra` y `escritorio-luna`;
  - `escritorio-atajos`, `escritorio-vista-limpia`, `escritorio-aviso-url`, `escritorio-limite-2100` y `escritorio-aliasing-marte`;
  - `escritorio-carga` y `escritorio-error`.
- **Portátil (1280 × 720) y escritorio estrecho (1024 × 768):** `portatil-ficha-jupiter`, `portatil-indice`, `estrecho-ficha-saturno` y `estrecho-controles`.
- **Móvil (390 × 844):**
  - `movil-sistema`, `movil-ficha-saturno` (hoja), `movil-indice` (hoja) y `movil-controles` (hoja);
  - `movil-tierra` y `movil-luna`;
  - `movil-menu`, `movil-carga` y `movil-error`.
- **Móvil pequeño (360 × 640):** `movil-pequeno`, `movil-pequeno-ficha` y `movil-pequeno-controles` («Controles» se queda en su icono).
- **Horizontal (844 × 390) y zoom al 200 % (640 × 360):** `movil-horizontal`, `movil-horizontal-ficha`, `zoom-200` y `zoom-200-controles`; la página se desplaza.
- **Contexto WebGL recuperado:** `contexto-recuperado` (de `measure.mjs`).

### 7.1 La estructura de la referencia y la nuestra
| En la referencia (barra inferior del original) | Aquí | Captura |
|---|---|---|
| Fila de fichas de cuerpos con miniatura redonda (Sol, Mercurio… Neptuno) | Fila de fichas con miniatura renderizada por nuestro motor; anillo y nombre en latón en la elegida; segunda fila con las lunas | `escritorio-ficha-saturno` |
| Reproducir y pausar redondo | Redondo, en latón: lo primero de la barra | `escritorio-sistema` |
| Fecha con rótulo e icono de calendario | «Fecha», la fecha legible con su zona y el calendario nativo | `escritorio-controles` |
| Línea de tiempo deslizante a lo ancho | La línea del año de la fecha, con el año a la vista, sus pasos y la marca de «hoy» | `escritorio-sistema` |
| Selector de velocidad («10 days / sec») | Selector de 9 velocidades y «Hacia atrás» | `escritorio-sistema` |
| «Controls +» | «Controles +», con la fecha y la hora, la zona, «Ahora», la calidad, la vista limpia y los atajos | `escritorio-controles` |
| Pistas y fuente de los datos en letra pequeña | Pie: «Arrastra para girar · rueda o pellizca para acercarte · elige un cuerpo» y «1900–2100 · NASA/JPL · astronomy-engine», con el autor y los créditos | `escritorio-sistema` |
| Lienzo a pantalla completa con la interfaz flotando | El lienzo a sangre; la interfaz, encima (texto de presentación, tarjeta, índice y franja) | todas |

**Lo que es nuestro:** el latón sobre azul tinta, Newsreader y Public Sans, las líneas finas, los paneles planos y opacos y los textos en español (`docs/ESTILO.md`), además del índice y la tarjeta, que la referencia no tiene.

**Evaluación:**
- **La jerarquía es clara:** el 3D manda, la elección se lee por la forma (anillo y subrayado) y no solo por el color, y la barra queda contenida en una línea.
- **El punto más débil son las lunas sin textura:** sus miniaturas se parecen entre sí hasta la fase 7.

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- **Pruebas en el móvil real** (ya en `PENDIENTES.md`): las hojas, los gestos, la fila de fichas, la línea de tiempo al tacto y el gasto de batería con la reproducción automática.
- **Lighthouse:** con `@lhci/cli`, si lo apruebas para la fase 10 (§4.10).
- Ningún `TODO(ivan)` nuevo.

## 10. Propuestas de cambio al plan
1. **Rendimiento (fase 10 o backlog):** pintar a la frecuencia que pide el movimiento en pantalla.
   - **El problema:** a 3 h/s, en la vista general, Mercurio avanza unos 0,5° por segundo, una fracción de píxel por frame a 60 FPS. Bajar el ritmo cuando el movimiento en pantalla es pequeño ahorraría GPU y batería en móvil sin que se note.
   - **Cómo:** el motor ya tiene el render lento a 4 Hz para las velocidades bajas; se trataría de generalizarlo.
2. **§5 del plan:** que «Lighthouse móvil, explorador» se mida con `@lhci/cli` a partir de la fase 10 y, hasta entonces, con las métricas de §6.2. Es lo que se ha hecho en las fases 3, 3b y 3c.

## 11. Cómo probarlo
```
npm start                                  # http://localhost:4200
npm start -- --host 0.0.0.0                # en el móvil, por la red local
```
1. Al entrar, el sistema se mueve a 3 horas por segundo: el botón dorado pausa (también `K`, y `Espacio` con el lienzo enfocado). El texto de presentación se pliega al primer clic o tecla.
2. Las fichas de abajo eligen un cuerpo; con un planeta con lunas aparece su fila. Las flechas recorren la fila sin elegir; Intro elige.
3. «Índice» (o `I`) abre el árbol con las distancias; `Esc` lo cierra.
4. La línea de tiempo: arrastra o usa las flechas (un día), RePág y AvPág (un mes), Inicio y Fin (el año). El icono del calendario abre el selector de fechas.
5. «Controles +»: la fecha y la hora, la zona, «Ahora», la calidad, la vista limpia y los atajos.
6. Comprobaciones: `npm run check`, `npm run e2e`, `node scripts/measure-autoplay.mjs` y `node scripts/build-body-thumbnails.mjs` (regenera las miniaturas).
