# Informe: Fase 9c (la interfaz)

- **Rama:** `fase-9c-interfaz` (desde `main` en `0963b9f`), en el worktree `.claude/worktrees/fase-9c-interfaz-bf1527`
- **Fecha:** 2026-11-06 (preparación) a 2026-11-07 (las siete tareas y el cierre)
- **Estado:** **lista para revisión, sin fusionar** (adenda, §5.3: la sesión de revisión repasa la fase y repite la crítica de impeccable antes de que Iván autorice la fusión). Hechas las tareas 9c.1–9c.7, con `npm run check` y los e2e en verde; la revisión por subagente, en `docs/revisiones/fase-9c.md`.

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

La interfaz del explorador se retira para que mande el 3D (D47). **Los gestos llegan a todo el lienzo** (lo que flota sin ser un control deja pasar el puntero). **En el móvil**, la presentación se pliega sola, Tierra y Luna van sin fila de planetas (con «‹ Sistema solar»), sus paneles caben en una fila, la cámara pasa a «Controles», la ficha es una hoja de dos alturas (en reposo, el 37 % de la pantalla) con la pausa siempre a mano y la barra de tiempo va en una fila. **Hay un solo selector a la vista:** las fichas, que con un planeta con lunas elegido pasan a ser las de su sistema, mientras el título dice el cuerpo, con «‹ Sistema solar» para volver. El Índice es su versión en tabla. **Menos cajas** (el borde, solo en los campos), **la navegación nueva** (la cabecera de lectura con «Explorar en 3D»; la del explorador, compacta), **el recorrido de la portada** (unos 30 s, la primera vez, con «Saltar el recorrido») y **la línea de autoría**. Las fichas completas, con la anterior y la siguiente, lo técnico aparte y una medida de lectura de unos 68 caracteres.

Resultado, con el mismo script antes y después (§6.1 y §6.2):
- **la zona útil del 3D en el móvil** pasa del 25–47 % al 61–86 %;
- **los controles a la vista en escritorio**, de 37–47 a 21–25;
- **ningún control tapado**, también con «Controles» y el Índice abiertos;
- **nada por debajo de 11 px**;
- **el código propio inicial baja de 14,88 a 10,96 kB** (de 15), sin subir el presupuesto.

## 2. Criterios de aceptación

Los de la adenda (`docs/decisiones/FASE-9c-INTERFAZ.md`, §4), medidos con `scripts/measure-ui.mjs` (`CAPTURE_PORT=4350`, `?captura=1`) sobre el build final; las tablas completas, antes y después, en §6.1 y §6.2.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| **Zona útil del 3D:** 390 × 844, ≥ 65 % en `/` y ≥ 50 % en Tierra, Luna y Cielo; 768 × 1024, ≥ 75 % y ≥ 65 %; 1440 × 900, ≥ 82 % y ≥ 75 % | ✅ | 390: `/` 83,5 % (antes 46,7); Tierra 86,0, Luna 86,2 y Cielo 59,6 % (antes 25,2, 27,4 y 27,7). 768: `/` 87,6 % (59,7); Tierra 91,2, Luna 90,5 y Cielo 69,7 % (40,0, 43,2 y 43,1). 1440: `/` 91,5 % (74,5); Tierra 87,2, Luna 90,2 y Cielo 81,5 % (63,6, 65,9 y 64,1) |
| **Controles visibles:** en escritorio, ≤ 24 en `/` y ≤ 30 con un cuerpo elegido; en el móvil, ≤ 16 en cualquier vista | ✅ (la tableta, con el de escritorio: §4) | 1440: 23 en `/` y 24 con Saturno (antes 37 y 46); Tierra 22, Luna 20, Cielo 24 (antes 47, 45 y 41). 1024: 23 y 24. Móvil (390): `/` 16, Saturno 12, Tierra 13, Luna 14, Cielo 16 (antes 22, 8, 30, 30 y 26). Tableta (768): 12–20, dentro de los 24 de escritorio; en `/` y el Cielo, 20, por encima de los 16 del móvil |
| **La hoja del cuerpo en el móvil, en reposo:** ≤ 45 % de la pantalla, con el cuerpo visible y la pausa a mano (e2e) | ✅ | 37,3 % a 390 y 28,6 % a 768 (antes 60,2 y 62,3 %, sin la pausa). e2e `movil.spec.ts`, «la ficha, en reposo…»: ≤ 45 %, el encuadre por encima de la hoja (el cuerpo, en el hueco libre) y reproducir pulsable, también con la hoja subida |
| **Los gestos:** el e2e de 9c.1 en verde a 390 y 768 | ✅ | `e2e/gestos.spec.ts`: 2 de 2 (arrastrar sobre el título gira la escena y no selecciona texto) |
| **Sin solapes:** el script de 9c.4 sin fallos en los cuatro tamaños | ✅ | 0 controles tapados en las 20 vistas (390, 768, 1024 y 1440) y en los 26 estados con «Controles» o el Índice abiertos (antes, de 12 a 26 tapados con «Controles» abierto en el móvil y en la tableta) |
| **Zonas táctiles:** 44 × 44 en el explorador en el móvil y ≥ 24 × 24 en todas las páginas; nada legible por debajo de 11 px | ✅ en esta fase; ❌ en dos páginas de la otra sesión (§12) | El explorador: ninguna zona pequeña en los cuatro tamaños. Las páginas de esta fase (`/planetas`, `/planetas/marte`, `/lunas`, `/lunas/titan`, `/luna`, `/sol`, `/eclipses`): ninguna (antes, las notas «Fuente N» de 24 × 22). «Sobre el proyecto» (los enlaces «Fase N», 16 px de alto) y los créditos (las licencias, 19 px) son de la 9b. Texto de menos de 11 px: ninguno (antes, los nombres latinos de las constelaciones, 9 px, y «hoy», 10) |
| **axe sin violaciones en todas las rutas;** el teclado y el lector de pantalla, como hoy o mejor (el orden de Tab, el foco visible y nunca tapado, las alternativas de un solo puntero) | ✅ | `e2e/accesibilidad.spec.ts` (las 40 rutas, los estados del explorador y el explorador en marcha): sin violaciones graves ni críticas. El Tab no se para en lo tapado (`movil.spec.ts`, con la ficha y con «Controles» abiertos); el foco vuelve a «Controles» tras la vista limpia (`camara.spec.ts`); el enlace de la autoría plegada vuelve a verse al recibir el foco; acercar y alejar, con botones en la cámara (escritorio) y en «Controles» (móvil) (`maquetacion.spec.ts`) |
| **El recorrido:** e2e de que arranca la primera vez; de que «Saltar», `Esc` y un toque lo paran; de que no arranca con movimiento reducido, con `?captura=1` ni con enlaces profundos | ✅ | `e2e/recorrido.spec.ts`: 4 de 4 (además, llega al final y no llena el historial) |
| **El presupuesto:** `npm run check` en verde, con el JS inicial y el código propio inicial (15 kB) sin subirlo | ✅ | §6: JS inicial 310,12 kB (aviso a 320); código propio inicial 10,96 kB de 15 (antes 14,88). Sin avisos de presupuesto |
| **Capturas antes y después** a 390, 768 y 1440: la portada (también durante el recorrido), Saturno con la hoja en el móvil, la Tierra, la Luna y el Cielo, una ficha completa, `/lunas` y `/eclipses` | ✅ | §7: 24 de antes y 27 de después |
| **El detector de impeccable** (`detect --json src/app`), sin hallazgos reales nuevos | ✅ | 5 hallazgos `broken-image`, los mismos falsos positivos de la crítica: `<img>` con `[src]` o `[ngSrc]` de Angular, que el análisis estático lee como «sin src» (`body-chips.html` ×2, `body-detail-page.html`, `body-card.ts` ×2) |
| **`docs/DISENO.md`:** los bocetos de escritorio y móvil y la navegación, al día | ✅ | Las reglas de la interfaz (fase 9c), la navegación y los bocetos del visor en escritorio y en el móvil y de la ficha completa |
| **El rendimiento (FPS)** no se mide aquí | — | Se repite al cerrar el bloque, con el PC libre (la otra sesión lo carga) |

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
| 9c.3 · Un solo selector y menos controles | hecha | La fila de fichas pasa a ser la del sistema del planeta elegido; el Índice, abierto, sustituye a las fichas; el panel del Cielo (lugar, hora y resumen; «Esta noche» a demanda, la tabla en dos líneas por fila en el móvil); «Controles» (el foco al panel, sin atajos en táctil, no tapa la ficha); sin «10 días por segundo»; el calendario y los botones del año, fuera (la fecha, en «Controles») (`ac19e21`) |
| 9c.4 · Nada se tapa | hecha | §5.3. Las fichas cuentan en el encuadre; «Controles», por encima de las fichas y a la izquierda de la ficha, sin llegar a las pestañas; los paneles de Tierra y Luna se desplazan dentro; el script de solapes, en los cuatro tamaños y con «Controles» y el Índice abiertos, sin tapados (§6.2). Las etiquetas del 3D que se solapan, para la otra sesión (§12) (`b680c07`) |
| 9c.5 · La jerarquía y la navegación | hecha | §5.3. Menos cajas; la cabecera y el menú nuevos (sus estilos, de `app.css` a `styles.css`); el título sigue al cuerpo (hecho en 9c.3); los iconos de la vista general y del sentido, con su nombre en «Controles»; el pie, con las pistas solo la primera vez (`b680c07`) |
| 9c.6 · El recorrido y la línea de autoría | hecha | §5.3. `features/tour/home-tour.ts` (con tests) y `e2e/recorrido.spec.ts`: arranca la primera vez; «Saltar», `Esc`, un clic y la rueda lo paran; llega al final; no arranca con movimiento reducido, en captura ni con enlaces profundos (`b680c07`) |
| 9c.7 · Las observaciones menores | hecha | §5.4. Zonas táctiles de las páginas; pistas de desplazamiento; texto ≥ 11 px; la rejilla de las vistas de la Tierra; la frase de la Luna casi nueva; las fichas completas (la anterior y la siguiente, lo técnico aparte y la medida); `/eclipses`; la fecha de la barra, estable |
| Cierre | hecha | `docs/DISENO.md` al día; capturas de después; el detector de impeccable; `npm run check` y los e2e; este informe; revisión por subagente; **parada sin fusionar** |

## 4. Desviaciones del plan y motivo

Todas para cumplir los criterios de la adenda sin quitar ninguna función; las decide la sesión de revisión con Iván.
- **La cabecera del explorador, compacta también en escritorio** (el nombre y «Menú»). La decisión 2 dice qué enlaces lleva la cabecera, no si se ven en línea en el explorador. Con los siete a la vista, `/` no baja de 24 controles.
- **Con un planeta con lunas elegido, la fila de fichas pasa a ser la de su sistema** (en lugar de sumarle una segunda fila). Sin esto, «≤ 30 con un cuerpo elegido» no se cumple: con Saturno serían 32. Para ir de Saturno a Júpiter: «‹ Sistema solar» y Júpiter, o el Índice.
- **El título que sigue al cuerpo, en 9c.3** (y no en 9c.5): la fila del sistema necesita su «‹ Sistema solar» para volver.
- **En el Cielo, sin Índice** (su tabla es la de «Esta noche») **y con la barra plegada en el móvil** (la noche tiene su propio deslizador): con los dos, 16 controles en el teléfono.
- **«Usar mi ubicación», una opción del selector del lugar** (no un botón al lado): así el nombre del lugar cabe entero (9c.3), y se sigue pidiendo solo tras esa acción.
- **La línea de autoría, solo en la portada**, la «primera pantalla» de la decisión 3. En todas las vistas, el Cielo del teléfono pasaba a 17 controles.
- **Lo técnico de las fichas, separado (no plegado):** después de lo esencial, bajo el rótulo «Datos técnicos». La adenda deja elegir («plegado o separado»), y así la ficha se sigue leyendo entera sin JavaScript.
- **`--measure` pasa de 68ch a 30em.** Es el ancho de lectura de todo el sitio: también se estrechan los textos de «Sobre el proyecto» y de los créditos (§12).
- **768 × 1024 (la tableta) se mide con el criterio de escritorio en los controles:** la adenda distingue «escritorio» y «móvil». En la portada son 19 controles: ≤ 24 de escritorio sí, ≤ 16 del móvil no (las nueve fichas caben a ese ancho). §2 lo dice en su fila.

## 5. Decisiones técnicas nuevas

Las de cada entrega, en §5.2–§5.4; el mapa de la interfaz de antes, en §5.1.

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

### 5.3 Decisiones de las entregas 9c.4–9c.6

- **Nada se tapa (9c.4).** La fila de fichas ya no va bajo el velo (9c.2): cuenta en el margen de abajo del encuadre (`data-chrome`), así que el cuerpo enfocado no queda detrás de ella ni la cámara encima (a 1024 × 768, «Alejar» quedaba bajo la fila del sistema de Saturno). «Controles», en escritorio, se abre por encima de la fila de fichas (y, con la ficha abierta, a su izquierda): con él abierto no tapa ninguna ficha. Los paneles de Tierra y Luna se desplazan dentro de su área. Los deslizadores de la hora, con 24 px de alto (medían 16).
- **El texto, nada por debajo de 11 px.** El nombre latino de las constelaciones pasa de 9 a 11 px y el español, de 11 a 12, para conservar la jerarquía (`styles.css`, donde están los estilos de las etiquetas de la escena: véase §12); la marca «hoy» de la línea del año, de 10 a 11.
- **Menos cajas (9c.5).** El borde, solo en los campos y los desplegables (`select.control`, `input.control`); los botones, con su fondo (`--color-surface-raised`) y sin borde; pulsado o abierto (`aria-pressed`, `aria-expanded`), el texto en latón con su subrayado, como la pestaña de la vista actual (una sola regla para el Índice, «Controles» y «Más»). Los paneles (Tierra, Luna, Cielo, la ficha, el Índice y «Controles»), sin contorno: el fondo y la sombra los separan del 3D. Las pestañas, sin marco, sobre un fondo traslúcido. Las lunas de la fila flotante del cielo, como las fichas (la miniatura y el nombre, sin caja). Reproducir sigue siendo lo único destacado.
- **La navegación (decisión 2 de Iván).** La cabecera de las páginas de lectura: Planetas, Lunas, Sol, Eclipses, Sobre el proyecto y «Explorar en 3D» (en latón), sin «Cielo» (es una pestaña del explorador). En el explorador, en todos los tamaños, la cabecera es compacta: el nombre (a la portada) y «Menú»; en el menú, lo mismo y, aparte y abajo, los créditos, lo legal, el autor y la nota de privacidad. «Explorar en 3D» se marca en las cuatro vistas del explorador.
- **Los estilos de la cabecera y del pie del sitio pasan de `app.css` a `styles.css`.** `app.css` se compila dentro de `app.ts` (8,58 kB de los 15 del código propio inicial: el CSS iba como texto en el JavaScript); en la hoja de estilos cuentan lo mismo para la primera pintura, y el menú del explorador se escribe una vez (su aspecto depende de `:popover-open`; cuándo se usa, del tamaño o de estar en el explorador, `tls-root:has(.explorer)`, sin JavaScript). El código propio inicial baja de 14,89 a unos 11 kB, sin subir el presupuesto, y el JS inicial total, de 310 a 309,5 kB.
- **El pie del explorador:** solo las pistas de uso, la primera vez (`tls.pistas` en `localStorage`, con try/catch, `features/explorer-ui/first-visit.ts`); las enseña la interfaz, así que el HTML prerenderizado no las pinta para luego quitarlas. Los créditos y lo legal, en el menú; la fuente de los datos, en «Controles».
- **La línea de autoría (decisión 3):** «Posiciones reales, calculadas en tu navegador. Un proyecto de Iván Chesa Lapena · Cómo se calcula» (el enlace, a la precisión medida de «Sobre el proyecto»), discreta, en la primera pantalla de cada vista; se pliega con la entradilla y, si su enlace recibe el foco, vuelve a verse al momento. El texto, en `features/viewer/authorship.ts`, con `reviewed: false`.
- **El recorrido de la portada (decisión 3; 9c.6).** Unos 29 s: Saturno (con el título «Saturno»), la Tierra con la vista guiada «España», la Luna y la vista general en reproducción (`features/tour/home-tour.ts`, con tests). Su código, en un chunk diferido que la interfaz pide solo cuando toca. Arranca la primera vez que se entra en `/` sin parámetros, con el 3D ya pintado; no arranca en captura, con un enlace profundo, si ya se vio (`tls.recorrido`) ni sin almacenamiento («no insiste»). Con movimiento reducido, «Ver el recorrido» en su lugar (hasta empezar a usar el explorador). «Ver el recorrido», siempre en «Controles». «Saltar el recorrido» (con `Esc` al lado, como «Saltar el viaje») a la vista y con el foco; `Esc`, cualquier toque, la rueda o una tecla (menos el tabulador y las teclas modificadoras) lo paran y la escena se queda donde está (`Esc` no salta el viaje en curso). Sus navegaciones sustituyen la entrada del historial: atrás no recorre sus vistas. Solo con la API pública (la sesión: elegir, vistas, vista guiada y reproducir).

### 5.4 Decisiones de la entrega 9c.7

- **Zonas táctiles de las páginas** (≥ 24 × 24, WCAG 2.5.8; 44 con el dedo donde es un botón):
  - las notas «Fuente N», de 24 × 22 a 24 × 24;
  - «Ver en 3D» de `/eclipses`, 44 de alto con pantalla táctil;
  - el nombre de las tarjetas de `/lunas` (que ya llevaba a la ficha con toda la tarjeta), con su propia caja de 24 × 24;
  - el nombre del sitio, 44 de alto;
  - las migas (30 px) ya cumplían.
  - Lo que falla en «Sobre el proyecto» (los enlaces «Fase N» de sus tablas, de 16 px) y en los créditos (las licencias, de 19 px) es de la otra sesión (§12).
- **Las fichas completas:**
  - al final, la anterior y la siguiente en el orden del atlas: el Sol y cada planeta seguido de sus lunas por su distancia. `pages/body-detail/atlas.ts`, con tests; los nombres accesibles, «Anterior: Luna» y «Siguiente: Fobos»;
  - en cada tabla, lo esencial primero y lo técnico (la densidad, la velocidad de escape, el achatamiento, el albedo, el tipo espectral y, de la órbita, sus extremos, la inclinación y la excentricidad) después, bajo «Datos técnicos». Las fuentes, numeradas en el orden en que se ven.
- **La medida de lectura:** con `--measure: 68ch`, una línea de Marte a 1440 tenía unos 89 caracteres (el `ch` es el ancho de un «0», más ancho que la letra media de Public Sans). Con 30em, unos 68. Es un token global (§4).
- **`/eclipses`:** «Calculado el 1 de noviembre de 2026» era la fecha del build y parecía la de hoy. Ahora, en el HTML, «Calculado al publicar la web (el 1 de noviembre de 2026) con astronomy-engine.»; en el navegador, como antes, «Calculado en tu navegador el …».
- **La Luna casi nueva** (menos del 5 % iluminada): «La Luna está casi nueva: la cara que mira a la Tierra apenas recibe luz del Sol. «Cara visible» la enseña en luna llena.». Se ve también con el panel plegado del móvil, y «Cara visible» lleva la fecha a la luna llena. Texto nuevo, para la revisión de Iván.
- **Las vistas guiadas de la Tierra, en dos columnas en escritorio** («El Himalaya» ya no queda solo en su fila); la última, si sobra, a lo ancho.
- **La fecha de la barra, estable:** la más larga, «30 sept 2026, 23:59», mide 186,3 px, y el ancho mínimo reservado (18,5ch) es el mismo, 186,3 px. No baila con ningún mes.

## 6. Salida de los checks

**Al cerrar** (el código final, 07-11):

```
npm run check
- lint y Prettier: «All files pass linting.»
- tests: 733 de 733 en 77 ficheros (antes de la fase, 715 en 75); cobertura de ephemeris/: 98,9 % de
  sentencias, 93,85 % de ramas, 100 % de funciones y 99,76 % de líneas
- build: 40 rutas prerenderizadas, sin avisos de presupuesto (tampoco de los estilos por componente)
  JS inicial 310,12 kB (main 118,76 kB + otro inicial; estilos 13,29 kB), 88,10 kB comprimido (antes
  314,23 kB); interfaz del explorador (explorer-ui), 164,59 kB diferidos (antes 156,97)
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor en su JS inicial; código propio inicial, 10,96 kB de 15 (antes 14,88: los
  estilos de la cabecera, de app.css a styles.css)
- check-links: 1215 enlaces internos bien (antes 1161: la ficha anterior y la siguiente)

npx playwright test (E2E_PORT=4401, SwiftShader): 113 de 113 (antes de la fase, 107)
.claude/skills/impeccable/scripts/impeccable detect --json src/app: 5 «broken-image», falsos positivos (§2)
```

**El punto de partida** (06-11, antes de cambiar nada):

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

### 6.1 La interfaz antes, medida (la primera cuenta, del 06-11)

La primera cuenta, con un script de un solo uso, antes de recibir la adenda. Las cifras de antes con las que se comparan los criterios son las de `scripts/measure-ui.mjs` sobre el mismo build (entre paréntesis en §6.2): la zona útil se mide distinto (donde el puntero llega al lienzo, como en la crítica) y salen de 46,7, 25,2, 27,4 y 27,7 % en el móvil.

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

### 6.2 La interfaz después, medida

Con el mismo script y las mismas condiciones que §6.1 (`scripts/measure-ui.mjs`, `?captura=1`, 390 y 768 táctiles, 1024 y 1440 con ratón). Entre paréntesis, antes (con este mismo script sobre el build de `main`).

| Tamaño | Vista | Zona útil | Controles visibles | Tapados | Zonas < objetivo | Textos < 11 px | La hoja del cuerpo (alto, la pausa) |
|---|---|---|---|---|---|---|---|
| 390 | portada | 83,5 % (46,7) | 16 (22) | 0 | 0 | 0 (1) | — |
| 390 | Saturno | 54,0 % (24,8) | 12 (8) | 0 | 0 | 0 (0) | 37,3 %, a mano (60,2 %, no) |
| 390 | Tierra | 86,0 % (25,2) | 13 (30) | 0 | 0 | 0 (1) | — |
| 390 | Luna | 86,2 % (27,4) | 14 (30) | 0 | 0 | 0 (1) | — |
| 390 | Cielo | 59,6 % (27,7) | 16 (26) | 0 | 0 (2) | 0 (4) | — |
| 768 | portada | 87,6 % (59,7) | 20 (26) | 0 | 0 | 0 (1) | — |
| 768 | Saturno | 65,0 % (25,2) | 12 (9) | 0 | 0 | 0 (0) | 28,6 %, a mano (62,3 %, no) |
| 768 | Tierra | 91,2 % (40,0) | 15 (36) | 0 | 0 | 0 (1) | — |
| 768 | Luna | 90,5 % (43,2) | 14 (34) | 0 | 0 | 0 (1) | — |
| 768 | Cielo | 69,7 % (43,1) | 20 (30) | 0 | 0 (2) | 0 (6) | — |
| 1024 | portada | 87,2 % (63,9) | 23 (37) | 0 | 0 | 0 (1) | — |
| 1024 | Saturno | 63,5 % (42,4) | 24 (46) | 0 | 0 | 0 (1) | — (la tarjeta de la derecha) |
| 1024 | Tierra | 79,8 % (49,6) | 22 (47) | 0 | 0 (1) | 0 (1) | — |
| 1024 | Luna | 84,9 % (52,4) | 20 (45) | 0 | 0 | 0 (1) | — |
| 1024 | Cielo | 75,6 % (52,9) | 24 (41) | 0 | 0 (2) | 0 (7) | — |
| 1440 | portada | 91,5 % (74,5) | 23 (37) | 0 | 0 | 0 (1) | — |
| 1440 | Saturno | 73,4 % (55,3) | 24 (46) | 0 | 0 | 0 (1) | — (la tarjeta de la derecha) |
| 1440 | Tierra | 87,2 % (63,6) | 22 (47) | 0 | 0 (1) | 0 (1) | — |
| 1440 | Luna | 90,2 % (65,9) | 20 (45) | 0 | 0 | 0 (1) | — |
| 1440 | Cielo | 81,5 % (64,1) | 24 (41) | 0 | 0 (2) | 0 (7) | — |

- **Con «Controles» o el Índice abiertos** (26 estados, en los cuatro tamaños): 0 controles tapados (antes, con «Controles» abierto, 12 en la portada del móvil, 20 en Tierra y Luna y 16 en el Cielo; en la tableta, de 16 a 26).
- **Las páginas** (390 y 1440, la página entera): ninguna zona de menos de 24 px ni texto de menos de 11 en `/planetas`, `/planetas/marte`, `/lunas`, `/lunas/titan`, `/luna`, `/sol` y `/eclipses` (antes, de 9 a 21 notas «Fuente N» de 24 × 22 en cada ficha). En «Sobre el proyecto», 12–14 enlaces «Fase N» de 16 px de alto, y en los créditos, 5 licencias de 19 px: de la otra sesión (§12).
- **La zona útil «Saturno»** es menor porque la ficha (la tarjeta en escritorio, la hoja en el móvil) está abierta: no es un criterio. Sí lo es su alto en el móvil (arriba).

## 7. Capturas

En `docs/informes/img/fase-9c/`, con `scripts/capture-interface.mjs` (`CAPTURE_PORT=4350`, de una en una): `antes-<tamaño>-<vista>.webp` (24, del build de `main`) y `despues-<tamaño>-<vista>.webp` (27). Tamaños 390 (móvil, ×2), 768 (tableta) y 1440 (escritorio); vistas `portada`, `saturno` (con la hoja en el móvil), `tierra`, `luna`, `cielo` (las cinco con `?captura=1`), `ficha-marte`, `lunas` y `eclipses` (la página entera) y, solo después, `recorrido` (la portada a los 6 s del recorrido, con «Saltar el recorrido»).

## 8. Dependencias añadidas

Ninguna.

## 9. Pendientes y `TODO(ivan)`

`docs/PENDIENTES.md` es de la otra sesión mientras trabaja: lo que haya que apuntar allí va en §12.
- **Para Iván:** revisar los textos nuevos de la interfaz (§12, «Los textos nuevos»); probar en el móvil la hoja de dos alturas, las filas desplazables y el recorrido (no bloquea).
- **La crítica de impeccable, otra vez,** la hace la sesión de revisión (objetivo, ≥ 32/40), y el rendimiento (FPS), al cerrar el bloque con el PC libre.

## 10. Propuestas de cambio al plan

Ninguna por ahora.

## 11. Cómo probarlo

En la vista previa de la rama (Cloudflare Pages, `fase-9c-interfaz.tierra-luna-sol.pages.dev`), o en local:

```bash
npm run build && CAPTURE_PORT=4350 node scripts/serve-dist.mjs   # http://127.0.0.1:4350
```

Qué mirar:
- `/` en una ventana privada (la primera vez): el recorrido de unos 30 s, con «Saltar el recorrido»; después, la portada con la línea de autoría y las pistas, que se pliegan a los 8 s.
- Elegir Saturno: el título dice «Saturno», con «‹ Sistema solar»; la fila es la de su sistema; en el móvil, la ficha sube hasta la mitad, con la pausa debajo, y «Ver los datos» la sube entera.
- Tierra, Luna y Cielo en el móvil: el panel en una fila con «Más»; el Cielo, con el resumen de lo que hay sobre el horizonte y «Esta noche».
- «Controles»: el tiempo, la cámara y la escena; «Ver el recorrido».
- Una ficha (`/planetas/marte`): lo técnico, después de «Datos técnicos», y al final, «‹ Luna» y «Fobos ›».

```bash
E2E_PORT=4401 npm run e2e
CAPTURE_PORT=4350 node scripts/measure-ui.mjs
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
- **Si cambian los selectores** que usan los scripts de captura y medida (§5.1), hay que actualizar esos scripts (de la otra sesión) al fusionar. Con la 9c: `.time__more`, `.index-toggle`, `button[data-body=…]`, `#time-scale` y `.site-menu-button` siguen; **`a[href="/planetas"]` (`capture-pages.mjs`), en el explorador de escritorio, va ahora dentro del menú** (hay que abrir «Menú» antes); **el calendario y los botones del año ya no existen**.
- **El recorrido de la portada arranca la primera vez en `/` sin parámetros.** Los scripts que abren `/` así (`scripts/measure-autoplay.mjs`) lo verían en marcha: que pongan `localStorage['tls.recorrido'] = 'visto'` (`addInitScript`) o abran la portada con un parámetro. Los e2e ya lo hacen (`storageState` en `playwright.config.ts`).
- **Las etiquetas de la escena bajo los controles (9c.4)** son de `scene/labels.ts`: la interfaz le pasa las zonas que tapa (los márgenes del encuadre, `setViewInsets`). Casos de la crítica para la otra sesión: «Tierra» bajo «Acercar» (en escritorio, la cámara no aparta el encuadre: `--chrome-edge: none`), las constelaciones bajo «Esta noche» y el cardinal «S» sobre «Mercurio» (entre etiquetas). Con los nombres de las constelaciones a 12 y 11 px (antes 11 y 9), alguna se solapará más: que la escena las esconda o las aparte si se pisan.
- **Los textos nuevos de la interfaz** (`reviewed: false`): la línea de autoría (`features/viewer/authorship.ts`), el anuncio del recorrido, «Recorrido parado.», el resumen del cielo («Ahora: Saturno, 37° SE · …», `skySummary`), «Más: la hora del día y el recorrido», «Más: la fase y el recorrido», «Ver los datos» / «Ocultar los datos», «Ver el recorrido» y «Saltar el recorrido». Van a la lista de `docs/revision-textos.md` (la genera `scripts/build-text-review.mjs`, de la otra sesión).
- **Al fusionar** (adenda, §5.3): D47 en el plan (§2 y la fase), una línea en `PENDIENTES.md` y otra en el `DIARIO`.
