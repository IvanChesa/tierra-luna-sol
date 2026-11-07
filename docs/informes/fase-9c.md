# Informe: Fase 9c (la interfaz)

- **Rama:** `fase-9c-interfaz` (desde `main` en `0963b9f`), en el worktree `.claude/worktrees/fase-9c-interfaz-bf1527`
- **Fecha:** 2026-11-06
- **Estado:** en curso, por entregas. Hechas: la preparación, las herramientas con las medidas y capturas de antes, 9c.1 (los gestos), 9c.2 (el móvil) y lo principal de 9c.3 (un solo selector, el panel del Cielo, «Controles», las velocidades y las fechas). Siguen: el resto de 9c.3, 9c.4, 9c.5, 9c.6, 9c.7 y el cierre.

## 0. Plan

Lo que pidió Iván el 06-11: una interfaz más limpia y mejor en el móvil y en el PC. La adenda (`docs/decisiones/FASE-9c-INTERFAZ.md`, D47, recibida el 06-11) trae la crítica de `impeccable` (27/40), las tres decisiones de Iván (alcance completo; la navegación nueva, con el título que sigue al cuerpo; el recorrido de 30 s y la línea de autoría), las tareas 9c.1–9c.7 y los criterios. Se trabaja **por entregas, en el orden de la adenda**, cada una con sus commits, sus medidas y el informe al día:

| Entrega | Tareas | Qué |
|---|---|---|
| 9c.a | Herramientas y 9c.1 | `scripts/measure-ui.mjs` (zona útil, controles visibles, solapes, zonas táctiles, texto y la hoja del móvil) y `scripts/capture-interface.mjs` (antes y después); las medidas y capturas de antes; los gestos en todo el lienzo (`pointer-events`) y su e2e |
| 9c.b | 9c.2 | El móvil: la presentación que se pliega, las vistas Tierra y Luna sin la fila de planetas, el panel de cada vista en una fila, la cámara, la hoja del cuerpo de dos alturas con la pausa a mano, la franja de abajo y la barra plegada |
| 9c.c | 9c.3 y 9c.4 | Un solo selector (el Índice sustituye a las fichas), el panel del Cielo, «Controles», las velocidades y las formas de cambiar la fecha; nada se tapa (el script de solapes en los cuatro tamaños) |
| 9c.d | 9c.5 | Menos cajas, la navegación nueva (la cabecera, el menú, las pestañas y el título que sigue al cuerpo), los iconos y el pie |
| 9c.e | 9c.6 | El recorrido de la portada (en un chunk diferido) y la línea de autoría |
| 9c.f | 9c.7 | Las observaciones menores (zonas táctiles de las páginas, pistas de desplazamiento, texto, fichas completas, `/eclipses`) |
| Cierre | §5 de la adenda | `docs/DISENO.md`, capturas de después, el detector de impeccable, axe, `npm run check`, el informe completo, la revisión por subagente y **parar sin fusionar** |

**Cómo encaja con los números de la adenda** (§4: ≤ 24 controles en `/` en escritorio, ≤ 30 con un cuerpo elegido y ≤ 16 en el móvil). Contando como la crítica (todo lo que se puede pulsar y se ve, también cada ficha de cuerpo), hoy `/` tiene 7 de la cabecera, 4 pestañas, 4 de la cámara, 9 fichas, el Índice, 8 de la barra de tiempo y 4 enlaces del pie (37). Para bajar a 24 sin quitar ninguna función, el plan es:
- **la cabecera del explorador, compacta en todos los tamaños:** el nombre (a la portada) y «Menú», con Planetas, Lunas, Sol, Eclipses, Sobre el proyecto y lo legal dentro. En las páginas de lectura, la cabecera completa con «Explorar en 3D» (decisión 2 de Iván). Son 2 controles en lugar de 7;
- **la barra de tiempo:** reproducir, la fecha, la línea del año, la velocidad y «Controles» (el calendario, el año anterior y siguiente y «Hacia atrás», dentro de «Controles», que ya tiene la fecha);
- **la cámara en escritorio:** acercar y alejar, sin marco; «Vista general» la hace «‹ Sistema solar» (y está en «Controles»), y «Vista limpia», en «Controles». En el móvil, todo en «Controles»;
- **el pie:** los créditos y lo legal, al menú; queda la línea de autoría, con un enlace;
- **con un planeta con lunas elegido,** la fila de fichas pasa a ser la de su sistema (el planeta y sus lunas) y «‹ Sistema solar», en el título, vuelve a la de los planetas: con Saturno, 8 fichas en lugar de 16.

Queda así: `/`, 2 + 4 + 9 + 1 + 4 + 2 + 1 = 23; Saturno elegido, 2 + 4 + 1 + 8 + 1 + 4 + 2 + 2 (cerrar la ficha y «Ficha completa») = 24.

### 0.1 Cómo se trabaja en paralelo con el bloque S

La fase 9c se programa **a la vez** que la 9b (bloque S), que lleva otra sesión en la carpeta principal (`C:\Users\ivan\Ivan Chesa AI\tierra-luna-sol`, rama `fase-9b-sol-lunas`). Esta, en su worktree. El reparto es **por archivos**: ninguna sesión toca lo de la otra.

| | Archivos |
|---|---|
| **Fase 9c (esta)** | `src/app/features/**`; `src/app/pages/**` salvo `pages/credits/**` y `pages/about/**`; `src/app/app.*`; `src/styles.css`; los e2e de interfaz; `docs/informes/fase-9c.md` y `docs/informes/img/fase-9c/` |
| **Fase 9b (la otra; no se toca)** | `src/app/scene/**`, `src/app/ephemeris/**`, `src/app/data/**`, `public/**`; `scripts/**` y `scripts/content/**` (los textos de las fichas), salvo la excepción de los puertos (§0.2); `pages/credits/**` y `pages/about/**`; `docs/PLAN.md`, `docs/PENDIENTES.md`, `docs/informes/DIARIO.md`, `docs/FUENTES.md` y `docs/informes/fase-9b.md` |

Lo que haga falta del otro lado se apunta en §12 («Para la fusión») y no se edita aquí.

Reglas fijas de esta fase:
- **Ninguna medida de rendimiento (FPS, VRAM) vale de criterio** mientras la otra sesión cargue el equipo: se repiten al cerrar.
- **No se fusiona en `main`** hasta que la adenda lo diga.
- **Las capturas y los e2e, de uno en uno.**

### 0.2 Los puertos, configurables por entorno

Para que las dos sesiones no se pisen el servidor del build (commit `chore:` de esta preparación; la única excepción a `scripts/**`):

| Variable | Dónde | Por defecto (la 9b, el CI) | Esta sesión |
|---|---|---|---|
| `CAPTURE_PORT` | `scripts/capture-lib.mjs` (capturas y mediciones) y `scripts/serve-dist.mjs` (su puerto sin argumento y el de `startServer()`) | 4340 | **4350** |
| `E2E_PORT` | `playwright.config.ts` (el servidor de los e2e y su `baseURL`) | 4391 | **4401** |

Si la variable trae otra cosa que un puerto sin privilegios (un entero de 1024 a 65535), el script falla con un mensaje en vez de caer en silencio en el de por defecto: dos sesiones se repartirían mal los puertos sin enterarse. El argumento de `node scripts/serve-dist.mjs <puerto>` pasa por la misma validación.

Comprobación (no hay tests de `scripts/` en `npm test`, que solo mira `src/`):

```
$ node -e "import('./scripts/capture-lib.mjs').then(m => console.log(m.PORT, m.BASE))"
4340 http://127.0.0.1:4340
$ CAPTURE_PORT=4350 node -e "…lo mismo…"
4350 http://127.0.0.1:4350
$ CAPTURE_PORT=abc node -e "…"
ERROR: CAPTURE_PORT=abc no es un puerto válido (un entero de 1024 a 65535).
$ CAPTURE_PORT=80 node -e "import('./scripts/serve-dist.mjs')…"
ERROR: CAPTURE_PORT=80 no es un puerto válido (un entero de 1024 a 65535).
$ node -e "import('./playwright.config.ts').then(m => console.log(m.default.use.baseURL, '|', m.default.webServer.command))"
http://127.0.0.1:4391 | node scripts/serve-dist.mjs 4391
$ E2E_PORT=4401 node -e "…lo mismo…"
http://127.0.0.1:4401 | node scripts/serve-dist.mjs 4401
$ E2E_PORT=4401x node -e "…"
ERROR: E2E_PORT=4401x no es un puerto válido (un entero de 1024 a 65535).
```

Y con el servidor y los e2e de verdad, sobre el build de esta rama:

```
$ CAPTURE_PORT=4350 node scripts/serve-dist.mjs
Sirviendo dist en http://127.0.0.1:4350
$ curl … http://127.0.0.1:4350/            → 200
$ curl … http://127.0.0.1:4350/planetas/   → 308 http://127.0.0.1:4350/planetas
$ curl … http://127.0.0.1:4340/            → sin respuesta (el 4340 queda para la otra sesión)
$ npx tsc -p tsconfig.e2e.json             → sin errores
$ E2E_PORT=4401 npx playwright test e2e/publicacion.spec.ts --project=escritorio
  5 passed (4.2s)
```

Fuera del reparto y sin cambiar: `scripts/measure-pages.mjs` (4396) y `scripts/bench-ktx2.mjs` (4322) tienen su puerto fijo. Son mediciones, que esta fase no hace mientras trabajen las dos sesiones (§0.1).

## 1. Resumen

Preparación de la fase: la rama, los puertos por entorno (§0.2), la instalación, el punto de partida (§6) y la lectura del código de la interfaz (§5.1). Lo demás, cuando llegue la adenda.

## 2. Criterios de aceptación

Los de la adenda `docs/decisiones/FASE-9c-INTERFAZ.md`, cuando llegue.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| (pendientes de la adenda) | | |

## 3. Tareas

| Tarea | Estado | Notas |
|---|---|---|
| Preparación: la rama `fase-9c-interfaz` desde `main` | hecha | El worktree la creó como `claude/fase-9c-interfaz-bf1527`; renombrada |
| Preparación: los puertos por entorno | hecha | §0.2 |
| Preparación: `npm ci` y `npm run check` | hecha | §6 |
| Preparación: la lectura del código de la interfaz | hecha | §5.1 |
| 9c.a · Herramientas | hecha | `scripts/measure-ui.mjs` y `scripts/capture-interface.mjs`; las medidas de antes (§6.1) y 24 capturas de antes en `docs/informes/img/fase-9c/antes-*.webp` (`b41efc0`) |
| 9c.1 · Los gestos, en todo el lienzo | hecha | `pointer-events` en lo que flota sin ser control; filas de fichas del ancho de sus fichas; e2e `gestos.spec.ts` a 390 y 768 (`b714bf2`) |
| 9c.2 · El móvil: que el 3D mande | hecha | §5.2. La presentación se pliega también a los 8 s; Tierra y Luna sin fichas ni Índice, con «‹ Sistema solar»; sus paneles, en una fila con «Más»; la cámara, en «Controles»; la ficha, hoja de dos alturas (≤ 45 % en reposo) sobre la barra, que sigue a la vista; la franja de abajo, solo la barra con un fundido de 0,75 rem; la barra, en una fila, y plegada en Tierra y Luna |
| 9c.3 · Un solo selector y menos controles | en curso | Hecho: la fila de fichas pasa a ser la del sistema del planeta elegido; el Índice, abierto, sustituye a las fichas; el panel del Cielo (lugar, hora y resumen; «Esta noche» a demanda, la tabla en dos líneas por fila en el móvil); «Controles» (el foco al panel, sin atajos en táctil, no tapa la ficha); sin «10 días por segundo»; el calendario y los botones del año, fuera (la fecha, en «Controles») |

## 4. Desviaciones del plan y motivo

Ninguna por ahora.

## 5. Decisiones técnicas nuevas

Ninguna todavía.

### 5.1 Lo que hay hoy (la lectura del código)

Un mapa de la interfaz antes de cambiarla, para la adenda y para el plan de §0.

**La cabecera y el pie (`app.html`, en el bundle inicial).** El salto al contenido, el nombre del sitio, la navegación (Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto) y, en el móvil, el botón «Menú» con un `popover` que añade Créditos, lo legal, el autor y la nota de privacidad. El pie del sitio no sale en el explorador (`styles.css`), que tiene el suyo.

**El marco del explorador (`features/viewer/viewer-layout.*`, prerenderizado).** Una rejilla con el lienzo a sangre detrás y las áreas `lead` (arriba a la izquierda), `index`, `view`, `panel` (a la derecha) y, abajo, `chips`, `bar` y `foot`. Reserva desde el HTML el alto de la franja de abajo (escritorio: 4,5 rem de fichas + 4,5 rem de barra; móvil: 4,25 + 7 rem) para que nada salte al llegar la interfaz. En `lead`, el selector de vistas (`view-switcher`, enlaces normales), el texto de la vista (la página hija: H1 y una frase, que se pliega al interactuar) y la pista táctil. Al pie, las pistas de uso, la fuente de los datos y los créditos (ocultos en el móvil).

**La interfaz diferida (`features/explorer-ui/*`, en `@defer (on idle)`, 156,97 kB).** Su anfitrión es `display: contents`: cada pieza va a un área de la rejilla.

| Pieza | Componente | Qué tiene |
|---|---|---|
| Lienzo | `viewer/viewer-canvas` | El canvas (con teclado: flechas, +/−, Inicio, Espacio), la carga y el error con «Reintentar» |
| Cámara | `camera-controls` | Acercar, alejar, vista general y vista limpia, en columna (abajo a la derecha de la parte visible) |
| Ficha resumida | `body-panel` | Nombre, tipo, resumen, distancias, datos, fuentes y «Ficha completa»; a la derecha en escritorio, hoja inferior en el móvil |
| Índice | `index-panel` + `body-picker` | El botón «Índice» (en la fila de las fichas) y el árbol de los 30 cuerpos con su distancia |
| Fichas de cuerpos | `body-chips` | El Sol y los 8 planetas con miniatura, y la fila de lunas del sistema elegido |
| Barra de tiempo | `time-controls` (+ `timeline-slider`, `time-menu`) | Reproducir, la fecha (con su zona y, en el móvil, la velocidad), el calendario, la línea del año (‹ año ›), la velocidad y «Hacia atrás», y «Controles +»: fecha, hora, zona, «Ahora», velocidad (móvil), calidad, escala, vista limpia, atajos y la fuente |
| Panel de la vista | `earth-panel`, `moon-panel`, `sky-panel` | Tierra: 5 vistas guiadas, anterior/recorrer/siguiente y la hora del día. Luna: la fase, 4 vistas y el recorrido (3 botones). Cielo: el lugar, «Usar mi ubicación», la hora de la noche y «Esta noche» (textos, tabla con «Mirar» por fila, eclipses y constelaciones) |
| Otros | `notices`, `shortcuts-dialog` | Avisos, «Saltar el viaje», «Mostrar la interfaz» (vista limpia) y el diálogo de atajos (`?`) |

**El encuadre.** Cada pieza que tapa el lienzo lleva `data-chrome` y dice qué borde tapa con `--chrome-edge`; `explorer-ui.ts` las mide con `ResizeObserver` (`viewer/insets.ts`) y pasa los márgenes al motor (`session.setInsets`) y al CSS (`--view-*`). Cualquier cambio de disposición tiene que mantener esto bien, o el cuerpo enfocado quedará tapado.

**El estilo.** Un solo control, `.control` (`styles.css`): todo botón lleva borde de 1 px en `--color-control` y fondo `--color-surface`; los paneles, superficie, borde `--color-line`, radio de 4 px y sombra. De ahí el «mismo peso visual» de la crítica.

**Lo repetido** (el mismo trabajo en varios sitios):
- elegir un cuerpo: las fichas, el índice, las etiquetas del lienzo y, en el cielo, «Mirar» en la tabla;
- la vista limpia: en la cámara y en «Controles +»;
- la velocidad y «Hacia atrás»: en la barra y, en el móvil, en «Controles +»;
- la fecha: el calendario de la barra, la línea del año y los campos de «Controles +»;
- la fuente de los datos: en el pie y en «Controles +».

**Por qué el 3D se queda pequeño en el móvil:** arriba, el bloque `lead` (vistas, H1 y pista) tapa el lienzo por arriba; abajo, la franja (fichas y barra de tiempo de dos filas, ~11,25 rem) y, en las vistas Tierra, Luna y Cielo, su panel, que va al pie del lienzo encima de las fichas (`--chrome-edge: bottom`). Las cifras, en §6.1.

**Lo que hay que tener en cuenta al cambiarla:**
- **El código propio del bundle inicial está en 14,88 kB de 15** (§6). Lo prerenderizado (`app.*`, `viewer-layout`, `view-switcher` y las páginas de las vistas) cuenta; lo de `explorer-ui`, no. Lo nuevo de la interfaz, mejor en lo diferido.
- **Selectores que usan los scripts de la otra sesión** (`scripts/capture-ui.mjs`, `capture-sky.mjs`, `capture-pages.mjs`, `measure.mjs`, `measure-autoplay.mjs`): `.time__more`, `.index-toggle`, `button[data-body=…]`, `#time-scale`, `tls-time-controls`, `tls-viewer-canvas.is-ready`, `.site-menu-button`, `a[href="/planetas"]` y `.eclipses__note`. Si alguno cambia, va a §12.
- **Los e2e de interfaz** (`maquetacion`, `movil`, `indice-y-ficha`, `tiempo`, `camara`, `vistas`, `tierra`, `luna`, `cielo`, `accesibilidad`) dependen de esa disposición y de sus textos: se actualizan con cada cambio.
- **`styles.css` también tiene los estilos de las etiquetas de la escena y del cielo** (`.scene-label*`, `.sky-label*`, que crea `scene/labels.ts`, de la otra sesión). Son de este lado por archivo, pero no se tocan sin apuntarlo en §12.

### 5.2 Decisiones de las entregas 9c.1–9c.3

- **Qué captura el puntero (9c.1).** Una regla en `styles.css`: la presentación, el pie, las filas de fichas, la barra de tiempo, los grupos de botones y los paneles de vista no capturan el puntero; sí lo capturan sus controles (`a`, `button`, campos, `summary`, `label`, las barras de herramientas, el `popover` de «Controles») y los paneles opacos. Las filas de fichas, del ancho de sus fichas (`width: fit-content`).
- **La presentación se pliega sola a los 8 s** (`PRESENTATION_FOLD_MS`), además de al primer gesto; en el modo de captura, nunca. En el móvil, plegada, el título en una línea.
- **Las vistas Tierra y Luna no tienen fila de fichas ni botón «Índice»** (en ningún tamaño, por coherencia): su título lleva «‹ Sistema solar» (un enlace a `/`, con el nombre accesible «Volver al sistema solar», que contiene el texto visible). El Índice sigue con su atajo, `I`.
- **Los paneles de Tierra y Luna en el móvil, en una fila:** las vistas, desplazables y con un fundido en el borde mientras quede algo por ver (`.scroll-hint`, una animación ligada al desplazamiento; si la fila cabe, sin fundido), y «Más» («Más: la hora del día y el recorrido»; «Más: la fase y el recorrido»), que despliega lo demás.
- **La cámara:** en escritorio, solo acercar y alejar, sin marco hasta pasar el ratón o con el foco; en el móvil y la tableta, dentro de «Controles» (con la vista general y la vista limpia, que salen de la cámara en todos los tamaños). Cuando la vista limpia se pide desde «Controles», al salir de ella el foco vuelve al botón «Controles».
- **«Controles»** agrupa el tiempo (la fecha, la hora, la zona, «Ahora», «Hacia atrás» con su nombre y el icono ⇆ y, en el móvil, la velocidad), la cámara y la escena; sin los atajos con pantalla táctil (`pointer: coarse`). Al abrirse, el foco va al propio panel (no al campo de la fecha, que en Android abriría el calendario). En escritorio, con la ficha abierta, se abre a su izquierda; en el móvil, sube sobre la barra de tiempo, que sigue a la vista, y oculta lo que tapa.
- **La barra de tiempo:** reproducir, la fecha, la línea del año (con el año escrito, sin botones: el año cambia con Inicio y Fin en los extremos o con la fecha de «Controles»), la velocidad y «Controles». El calendario y «Hacia atrás» pasan a «Controles». En el móvil, en una fila (la lectura de tres líneas: la fecha, la zona y la velocidad); en Tierra y Luna, plegada a reproducir, la fecha y «Controles».
- **La franja de abajo:** solo detrás de la barra de tiempo, con un fundido de 0,75 rem por encima; las fichas flotan sobre el 3D con una sombra del color del fondo en el nombre.
- **La ficha del cuerpo en el móvil, de dos alturas:** en reposo, el nombre, el tipo, el resumen, «Ficha completa» y «Ver los datos» (como mucho el 45 % de la pantalla); subida (con «Ver los datos» o arrastrando el tirador hacia arriba), las distancias, los datos y las fuentes. Arrastrar hacia abajo la baja y, en reposo, la cierra. Va encima de la barra de tiempo, que no tapa: reproducir y pausar, siempre a mano. Con `/?cuerpo=saturno`, Saturno queda colocado en el hueco libre desde el primer segundo (comprobado con una imagen por segundo durante 10 s).
- **Un solo selector a la vista (9c.3):** en la vista del sistema solar, con un planeta con lunas elegido (o una de sus lunas), la fila de fichas pasa a ser la de su sistema («Saturno y sus lunas»: el planeta y sus siete lunas), en lugar de sumar una segunda fila; «‹ Sistema solar», en el título, vuelve a la de los planetas. En el cielo, las lunas siguen en una segunda fila (el cielo no tiene título de cuerpo). El Índice, abierto, sustituye a las fichas.
- **El título sigue al cuerpo elegido** (decisión 2 de Iván, adelantada de 9c.5 porque la fila del sistema la necesita para volver): un servicio de la raíz sin dependencias, `ExplorerFocus` (`features/explorer-ui/explorer-focus.ts`), que escribe la interfaz diferida y lee la portada. La portada se prerenderiza con «El sistema solar»; con un cuerpo, «‹ Sistema solar», su nombre (H1) y su tipo, y el título del documento, «Saturno · Tierra Luna Sol» (también después de que la URL recoja el cuerpo, que vuelve a pasar por la estrategia de títulos). Su código va en un chunk diferido de 0,26 kB: el código propio inicial queda en 14,75 kB de 15.
- **El panel del Cielo:** el lugar a lo ancho, con «Usar mi ubicación» como una opción del propio selector (así el nombre del lugar cabe entero; la ubicación se sigue pidiendo solo tras esa acción y nunca sale del navegador); la hora; una línea de resumen con la Luna y los planetas sobre el horizonte, los más altos primero («Ahora: Saturno, 37° SE · Luna, 12° E», con su lectura en palabras para el lector de pantalla; `skySummary`, con tests); y «Esta noche» a demanda, con la tabla recompuesta en dos líneas por fila en el móvil (sin barra horizontal; los papeles de tabla, explícitos). Zonas táctiles de 44 px en el selector, la hora, «Esta noche», «Mirar» y las constelaciones.
- **Las velocidades:** sin «10 días por segundo», casi igual que «1 semana por segundo»; quedan ocho escalones. Las de D33 (3 días/s y 1 h/s), igual.

## 6. Salida de los checks

Punto de partida: `npm ci` (Node 24.22.1, npm 11.19.1) y `npm run check` en `fase-9c-interfaz` con los puertos ya cambiados (es `main` en `0963b9f` más ese commit), en 1 min 34 s:

```
npm run check
- lint y Prettier: sin errores («All files pass linting.»)
- tests: 715 de 715 en 75 ficheros; cobertura de ephemeris/: 98,9 % de sentencias, 93,85 % de ramas,
  100 % de funciones y 99,76 % de líneas
- build: 40 rutas prerenderizadas
  JS inicial 305,90 kB (main) · 314,23 kB con los estilos (aviso a 320) · 86,78 kB comprimido
  diferidos: three 743,99 kB · interfaz del explorador (explorer-ui) 156,97 kB · astronomy-engine
  83,33 kB · eclipses 36,88 kB · «Sobre el proyecto» 19,60 kB · créditos 14,30 kB · ficha 13,42 kB ·
  viewer-layout 9,56 kB
- Pages: 266 ficheros; el mayor, textures/8k/moon (3,34 MiB de 25)
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor en su JS inicial; código propio inicial, 14,88 kB de 15 (app.ts 8,73,
  app.routes.ts 3,29, page-meta.ts 0,83, site-title.strategy.ts 0,80…)
- check-links: 1161 enlaces internos bien en las 40 páginas (108 externos sin comprobar)
```

### 6.1 La interfaz de hoy, medida

Con el build de arriba, `?captura=1`, el Chromium de Playwright con la GPU y `CAPTURE_PORT=4350` (un script de un solo uso, fuera del repositorio; no es una medida de rendimiento). **Controles a la vista:** los botones, enlaces, campos y filas del árbol que se ven en la ventana (dentro de ella, sin tapar y sin ocultar; el lienzo no cuenta). **Paradas del tabulador:** los de entre ellos que se alcanzan con el tabulador (las fichas de cuerpos van con tabulador itinerante: una parada por fila; el lienzo sí cuenta). **Área libre del 3D:** la parte del lienzo que no tapa ningún panel (los márgenes del encuadre, `--view-*`), sobre el área de la ventana. Escritorio, 1440 × 900; móvil, 390 × 844 (táctil).

| Tamaño | Vista | Controles a la vista | De la cabecera | Del explorador | Paradas del tabulador | Área libre del 3D |
|---|---|---|---|---|---|---|
| escritorio | Sistema solar | 37 | 7 | 30 | 30 | 75 % |
| escritorio | Saturno elegido | 46 | 7 | 39 | 33 | 52 % |
| escritorio | Tierra | 47 | 7 | 40 | 40 | 70 % |
| escritorio | Luna | 45 | 7 | 38 | 38 | 70 % |
| escritorio | Cielo | 41 | 7 | 34 | 34 | 75 % |
| móvil | Sistema solar | 22 | 2 | 20 | 19 | 40 % |
| móvil | Saturno elegido (la ficha, abierta) | 8 | 2 | 6 | 8 | 20 % |
| móvil | Tierra | 30 | 2 | 28 | 26 | 18 % |
| móvil | Luna | 30 | 2 | 28 | 26 | 21 % |
| móvil | Cielo | 26 | 2 | 24 | 23 | 21 % |

Coincide con la crítica: de 37 a 47 controles a la vista en escritorio, y en el móvil, del 18 al 21 % de la pantalla para el 3D en las vistas Tierra, Luna y Cielo (el 40 % en la del sistema solar).

## 7. Capturas

Las de la fase, en `docs/informes/img/fase-9c/`, con `CAPTURE_PORT=4350` y de una en una. Ninguna todavía.

## 8. Dependencias añadidas

Ninguna.

## 9. Pendientes y `TODO(ivan)`

Ninguno por ahora. `docs/PENDIENTES.md` es de la otra sesión: lo que haya que apuntar allí va a §12.

## 10. Propuestas de cambio al plan

Ninguna por ahora.

## 11. Cómo probarlo

```bash
CAPTURE_PORT=4350 node scripts/serve-dist.mjs   # el build de esta rama en http://127.0.0.1:4350
E2E_PORT=4401 npx playwright test e2e/<fichero>.spec.ts
```

## 12. Para la fusión

Lo que esta fase necesita del lado de la 9b (o lo que hay que repasar al juntar las dos ramas). No se edita aquí.

- **La 9b ya ha cambiado archivos que ahora son de este lado** (antes del reparto; comprobado con `git diff main...fase-9b-sol-lunas` el 06-11):
  - `app.html`, `app.ts` y `app.spec.ts` (tarea 0 de la 9b: el enlace del menú marcado con `current()` en lugar de `RouterLinkActive`, «Lunas» en `/luna`, y los efectos de la navegación pasados a `core/navigation-effects.ts`, diferido);
  - `features/explorer-ui/explorer-session.ts` y `features/viewer/viewer-params.ts` (+ su spec): los parámetros de captura `marco=ilustrativo` y `medida=limbo`;
  - `pages/body-detail/body-detail-page.ts` (las migas de `/luna`) y `e2e/contenido.spec.ts`.

  Para no chocar: esta fase no toca la navegación de `app.*` ni esos parámetros hasta tener los cambios de la 9b (cuando la 9b se fusione en `main`, se trae `main` a esta rama); si la adenda pide cambiar la cabecera antes, se parte de la versión de la 9b.
- **Lo que la 9b aún tiene que poner en la interfaz:** el botón «Bajo las nubes» de Venus (D44, entrega 9b.e) va en la interfaz del explorador (`features/**`, de este lado). Quién lo coloca y dónde (¿en la ficha resumida de Venus?) hay que decidirlo con la adenda, para que encaje en la disposición nueva.
- **Los parámetros de captura nuevos** que la 9b añada a `viewer-params.ts` y `explorer-session.ts` se juntan a mano al fusionar (son cambios pequeños en archivos de este lado).
- **Si cambian los selectores** que usan los scripts de captura y medida (§5.1), hay que actualizar esos scripts (de la otra sesión) al fusionar.
