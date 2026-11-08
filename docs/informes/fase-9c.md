# Informe: Fase 9c (la interfaz)

- **Rama:** `fase-9c-interfaz` (desde `main` en `0963b9f`), en el worktree `.claude/worktrees/fase-9c-interfaz-bf1527`
- **Fecha:** 2026-11-06 (preparación) a 2026-11-08 (las siete tareas, el cierre, la revisión, la decisión de Iván del 07-11, la tanda de arreglos de la crítica repetida y la ficha del móvil, menos invasora: las dos, decisiones de Iván del 08-11)
- **Estado:** **lista para revisión, sin fusionar** (adenda, §5.3: la sesión de revisión repasa la fase y repite la crítica de impeccable antes de que Iván autorice la fusión). Hechas las tareas 9c.1–9c.7; la revisión por subagente (`docs/revisiones/fase-9c.md`), aplicada, con la decisión de Iván del 07-11 sobre el selector («Respuesta a la revisión», al final); la crítica repetida (`docs/revisiones/fase-9c-critica.md`, 31/40), con sus problemas 1 a 6 y los rápidos arreglados («Respuesta a la crítica», al final; lo demás, al backlog: §10); la ficha del móvil, una barra fina con la hoja a demanda y una sola franja arriba (decisión de Iván del 08-11, al final); `npm run check` y los e2e, en verde.

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

(Con la decisión de Iván del 07-11, en el PC vuelven las dos filas: con Saturno, 32, y el criterio con un cuerpo elegido pasa a ≤ 32; §4.)

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

La interfaz del explorador se retira para que mande el 3D (D47). **Los gestos llegan a todo el lienzo** (lo que flota sin ser un control deja pasar el puntero). **En el móvil**, la presentación se pliega sola, Tierra, Luna y el Cielo van sin fila de fichas (Tierra y Luna, con «‹ Sistema solar»; el Cielo, con su tabla de «Esta noche»), sus paneles caben en una fila, la cámara pasa a «Controles», la ficha es una hoja de dos alturas (en reposo, el 37 % de la pantalla) con la pausa siempre a mano y la barra de tiempo va en una fila. **Hay un solo selector a la vista:** las fichas, con los planetas redondos y las lunas en pastillas (decisión de Iván del 07-11): en el PC y la tableta, en dos filas, con las lunas del sistema elegido encima; en el móvil, en una, con el planeta, una raya y sus lunas. El título dice el cuerpo, con «‹ Sistema solar» para volver, y el Índice es la versión en tabla de las fichas. **Menos cajas** (el borde, solo en los campos), **la navegación nueva** (la cabecera de lectura con «Explorar en 3D»; la del explorador, compacta), **el recorrido de la portada** (unos 30 s, la primera vez, con «Saltar el recorrido») y **la línea de autoría**. Las fichas completas, con la anterior y la siguiente, lo técnico aparte y una medida de lectura de unos 68 caracteres.

Resultado, con el mismo script antes y después (§6.1 y §6.2):
- **la zona útil del 3D en el móvil** pasa del 25–47 % al 60,2–86,2 % (`/`, Tierra, Luna y Cielo; con la hoja de Saturno abierta, 54,0 %);
- **los controles a la vista en escritorio**, de 37–47 a 23–32 (con las lunas encima de los planetas, 32 con un cuerpo elegido);
- **ningún control tapado ni recortado**, también con «Controles», el Índice y «Más» abiertos, y **el velo de abajo, ≤ 10 % del lienzo**;
- **nada por debajo de 11 px**;
- **el código propio inicial baja de 14,88 a 10,96 kB** (de 15), sin subir el presupuesto.

**Con la crítica repetida del 08-11** (31/40; «Respuesta a la crítica», al final): ningún foco en algo que no se ve; el recorrido dice por dónde va, «Saltar» lleva a la vista general en marcha, la Luna se salta si está casi nueva y el final invita a seguir («Ahora tú: elige un cuerpo abajo»); las pistas, junto a la fila, al acabarlo; el año como mando de la barra («‹ 2026 ›»); los nombres de la fila, legibles sobre un planeta brillante; «Controles», contando en el encuadre y, en el móvil, como hoja baja; y los rápidos («Constelaciones», «Esta noche», `/eclipses` y las vistas de la Tierra).

## 2. Criterios de aceptación

Los de la adenda (`docs/decisiones/FASE-9c-INTERFAZ.md`, §4), medidos con `scripts/measure-ui.mjs` (`CAPTURE_PORT=4350`, `?captura=1`) sobre el build final; las tablas completas, antes y después, en §6.1 y §6.2.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| **Zona útil del 3D:** 390 × 844, ≥ 65 % en `/` y ≥ 50 % en Tierra, Luna y Cielo; 768 × 1024, ≥ 75 % y ≥ 65 %; 1440 × 900, ≥ 82 % y ≥ 75 % | ✅ | 390: `/` 83,5 % (antes 46,7); Tierra 86,0, Luna 86,2 y Cielo 60,2 % (antes 25,2, 27,4 y 27,7). 768: `/` 87,7 % (59,7); Tierra 84,4, Luna 84,4 y Cielo 69,6 % (40,0, 43,2 y 43,1). 1440: `/` 90,7 % (74,5); Tierra 82,2, Luna 85,9 y Cielo 78,0 % (63,6, 65,9 y 64,1) |
| **Controles visibles:** en escritorio, ≤ 24 en `/` y ≤ 32 con un cuerpo elegido (≤ 30 en la adenda; ≤ 32 por la decisión de Iván del 07-11, §4); en el móvil, ≤ 16 en cualquier vista | ✅ (la tableta, con el de escritorio: §4) | 1440: 23 en `/`; con un cuerpo, Saturno 32 (30 con la ficha cerrada), Tierra 32, Luna 30 y el Cielo con Saturno 32; el Cielo sin cuerpo, 25 (§4) (antes 37 en `/`, 46 con Saturno, 47 en Tierra, 45 en Luna y 41 en el Cielo). 1024: 23 en `/`; con un cuerpo, Saturno 32 (30 con la ficha cerrada), Tierra 32, Luna 30 y el Cielo con Saturno 32; el Cielo sin cuerpo, 25 (§4). Móvil (390): `/` 16, Saturno 12 (14 con la ficha cerrada), Tierra 13, Luna 14, Cielo 12 (12 con Saturno) y, con «Más» abierto, Tierra 17 y Luna 17 (antes 22, 8, 30, 30 y 26). Tableta (768): de 12 a 28, dentro de los de escritorio; en `/`, 20 Con los arreglos de la crítica (08-11), las mismas cifras: ninguno añade una parada. En el móvil y la tableta, con un cuerpo elegido y la barra fina (decisión del 08-11): 7 (antes 12); con la ficha cerrada, 9 a 390 (antes 14). |
| **La ficha del cuerpo en el móvil, en reposo** (cambio del 08-11, decisión de Iván, que sustituye a «la hoja ≤ 45 %»; adenda, §4): con un cuerpo elegido, la barra fina ≤ 12 % de la pantalla; la interfaz en reposo tapa ≤ 30 % (zona útil del 3D ≥ 70 %) a 390 y a 768; el cuerpo, centrado en el hueco libre; la pausa, a mano (e2e) | ✅ | La barra: 6,9 % a 390 y 5,7 % a 768 (la hoja en reposo de antes: 37,3 y 28,6 %; antes de la fase, 60,2 y 62,3 %). Con Saturno elegido, la zona útil: 90,3 % a 390 y 90,9 % a 768 (con la hoja en reposo, 54,0 y 65,2 %); por alto, la franja de arriba, la barra y la barra de tiempo tapan el 19,7 % y el 16,2 %. El centro del cuerpo en el hueco libre, en alto: +0,9 % a 390 y +1,8 % a 768 (en ancho, −4,5 y −4,6 %: el lado en sombra del planeta no brilla; en escritorio, igual, de −4,0 a −5,6 %). La hoja, abierta: 35,4 % a 390 y 27,1 % a 768, sin nada tapado. e2e `movil.spec.ts`: la barra (≤ 12 %, el encuadre hasta su borde y la pausa a mano), la hoja con un toque, con el dedo y con el teclado, el foco y la franja de arriba |
| **Los gestos:** el e2e de 9c.1 en verde a 390 y 768 | ✅ | `e2e/gestos.spec.ts`: 2 de 2 (arrastrar sobre el título gira la escena y no selecciona texto) |
| **Sin solapes:** el script de 9c.4 sin fallos en los cuatro tamaños | ✅ | 0 controles tapados en las 28 vistas (390, 768, 1024 y 1440, también con un cuerpo y la ficha cerrada) y 0 en los 30 estados con «Controles», el Índice o «Más» abiertos (antes, de 12 a 26 tapados con «Controles» abierto en el móvil y en la tableta). 0 recortes: ningún contenedor desbordado, ningún control recortado y ningún lugar del selector cortado (revisión, hallazgos 6, 7 y 18) Con los arreglos de la crítica, igual (el script ya no cuenta como desbordadas las capas de etiquetas de la escena, que recortan a propósito lo que sale del lienzo: §6.2). |
| **El velo de abajo** (9c.2): ≤ 10 % del lienzo | ✅ | 8,6 % a 390, 7,0 % a 768, 9,6 % a 1024 × 768 y 8,1 % a 1440 (antes, el 19–23 %; a 1024 × 768, el 10,7 % en la primera ronda: §5.5) |
| **Zonas táctiles:** 44 × 44 en el explorador en el móvil y ≥ 24 × 24 en todas las páginas; nada legible por debajo de 11 px | ✅ en esta fase; ❌ en dos páginas de la otra sesión (§12) | El explorador: ninguna zona pequeña en los cuatro tamaños. Las páginas de esta fase (`/planetas`, `/planetas/marte`, `/lunas`, `/lunas/titan`, `/luna`, `/sol`, `/eclipses`): ninguna (antes, las notas «Fuente N» de 24 × 22). «Sobre el proyecto» (los enlaces «Fase N», 16 px de alto) y los créditos (las licencias, 19 px) son de la 9b. Texto de menos de 11 px: ninguno (antes, los nombres latinos de las constelaciones, 9 px, y «hoy», 10) |
| **axe sin violaciones en todas las rutas;** el teclado y el lector de pantalla, como hoy o mejor (el orden de Tab, el foco visible y nunca tapado, las alternativas de un solo puntero) | ✅ | `e2e/accesibilidad.spec.ts` (las 40 rutas, los estados del explorador y el explorador en marcha): sin violaciones graves ni críticas. El Tab no se para en lo tapado (`movil.spec.ts`, con la ficha y con «Controles» abiertos); el foco vuelve a «Controles» tras la vista limpia (`camara.spec.ts`); el enlace de la autoría plegada vuelve a verse al recibir el foco; acercar y alejar, con botones en la cámara (escritorio) y en «Controles» (móvil) (`maquetacion.spec.ts`) |
| **El recorrido:** e2e de que arranca la primera vez; de que «Saltar», `Esc` y un toque lo paran; de que no arranca con movimiento reducido, con `?captura=1` ni con enlaces profundos | ✅ | `e2e/recorrido.spec.ts`: 6 de 6 (además, llega al final y no llena el historial; con una red lenta no arranca si ya se ha elegido un cuerpo; al saltarlo con Intro, el foco no se pierde). Con la crítica del 08-11: «Saltar» y `Esc` llevan a la vista general en marcha (sin «Saltar el viaje» ni anillo de foco tras el ratón), un clic o la rueda lo paran donde está, cada parada lleva su rótulo, la Luna solo si se ve y, al final, «Ahora tú: elige un cuerpo abajo…» |
| **El presupuesto:** `npm run check` en verde, con el JS inicial y el código propio inicial (15 kB) sin subirlo | ✅ | §6: JS inicial 312,64 kB (aviso a 320; 311,02 antes de la ficha del móvil y 310,14 antes de la crítica); código propio inicial 12,07 kB de 15 (10,96 antes de la ficha del móvil: la franja de la cabecera y `ExplorerFocus`; antes de la fase, 14,88). Sin avisos de presupuesto (tampoco de los estilos por componente) |
| **Capturas antes y después** a 390, 768 y 1440: la portada (también durante el recorrido), Saturno con la hoja en el móvil, la Tierra, la Luna y el Cielo, una ficha completa, `/lunas` y `/eclipses` | ✅ | §7: 24 de antes y 35 de después (rehechas el 08-11 con la crítica y con la ficha del móvil; nuevas: «Controles» abierto y, en el móvil y la tableta, la hoja abierta desde la barra) |
| **El detector de impeccable** (`detect --json src/app`), sin hallazgos reales nuevos | ✅ | 6 hallazgos `broken-image`, los mismos falsos positivos de la crítica: `<img>` con `[src]` o `[ngSrc]` de Angular, que el análisis estático lee como «sin src» (`body-chips.html` ×3, uno más que en la primera ronda porque la pastilla de la luna está en las dos filas; `body-detail-page.html`; `body-card.ts` ×2). Repetido el 08-11, tras los arreglos de la crítica: los mismos 6. El motor de la caché (0.1.16), sin descargas |
| **`docs/DISENO.md`:** los bocetos de escritorio y móvil y la navegación, al día | ✅ | Las reglas de la interfaz (fase 9c), la navegación y los bocetos del visor en escritorio y en el móvil y de la ficha completa; con la decisión de Iván del 07-11, las reglas del selector (planetas y lunas, distintos), el boceto de escritorio con las dos filas y uno del móvil con la fila del sistema y su raya; con la crítica del 08-11, el recorrido y las pistas, los avisos sobre el 3D, lo plegado que se despliega con el foco, el año como mando, «Controles» en el encuadre y como hoja baja (y en horizontal, a la derecha), la placa de los nombres y las migas |
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
| 9c.2 · El móvil: que el 3D mande | hecha | §5.2. La presentación se pliega también a los 8 s; Tierra y Luna sin fichas ni Índice, con «‹ Sistema solar» (desde el 07-11, con fichas en el PC y la tableta: §4); sus paneles, en una fila con «Más»; la cámara, en «Controles»; la ficha, hoja de dos alturas (≤ 45 % en reposo) sobre la barra, que sigue a la vista; la franja de abajo, solo la barra con un fundido de 0,75 rem (0,5 desde la revisión: §5.5); la barra, en una fila, y plegada en Tierra y Luna |
| 9c.3 · Un solo selector y menos controles | hecha | La fila de fichas pasa a ser la del sistema del planeta elegido (desde el 07-11, solo en el móvil: §4); el Índice, abierto, sustituye a las fichas; el panel del Cielo (lugar, hora y resumen; «Esta noche» a demanda, la tabla en dos líneas por fila en el móvil); «Controles» (el foco al panel, sin atajos en táctil, no tapa la ficha); sin «10 días por segundo»; el calendario y los botones del año, fuera (la fecha, en «Controles») (`ac19e21`) |
| 9c.4 · Nada se tapa | hecha | §5.3. Las fichas cuentan en el encuadre; «Controles», por encima de las fichas y a la izquierda de la ficha, sin llegar a las pestañas; los paneles de Tierra y Luna se desplazan dentro; el script de solapes, en los cuatro tamaños y con «Controles» y el Índice abiertos, sin tapados (§6.2). Las etiquetas del 3D que se solapan, para la otra sesión (§12) (`b680c07`) |
| 9c.5 · La jerarquía y la navegación | hecha | §5.3. Menos cajas; la cabecera y el menú nuevos (sus estilos, de `app.css` a `styles.css`); el título sigue al cuerpo (hecho en 9c.3); los iconos de la vista general y del sentido, con su nombre en «Controles»; el pie, con las pistas solo la primera vez (`b680c07`) |
| 9c.6 · El recorrido y la línea de autoría | hecha | §5.3. `features/tour/home-tour.ts` (con tests) y `e2e/recorrido.spec.ts`: arranca la primera vez; «Saltar», `Esc`, un clic y la rueda lo paran; llega al final; no arranca con movimiento reducido, en captura ni con enlaces profundos (`b680c07`) |
| 9c.7 · Las observaciones menores | hecha | §5.4. Zonas táctiles de las páginas; pistas de desplazamiento; texto ≥ 11 px; la rejilla de las vistas de la Tierra; la frase de la Luna casi nueva; las fichas completas (la anterior y la siguiente, lo técnico aparte y la medida); `/eclipses`; la fecha de la barra, estable |
| Cierre | hecha | `docs/DISENO.md` al día; capturas de después; el detector de impeccable; `npm run check` y los e2e; este informe; revisión por subagente; **parada sin fusionar** |
| Revisión y decisión de Iván del 07-11 | hecha | Los 20 hallazgos de `docs/revisiones/fase-9c.md` y el selector con planetas y lunas distintos, un commit por tarea («Respuesta a la revisión», al final); las medidas, las capturas de después, los e2e y `npm run check`, otra vez; **parada sin fusionar** |
| Crítica repetida (08-11) | hecha | Por decisión de Iván del 08-11: los problemas 1–6 y los rápidos de `docs/revisiones/fase-9c-critica.md`, un commit por arreglo («Respuesta a la crítica», al final); lo demás, al backlog (§10.1), y lo de la escena, a §12; las medidas, las capturas de después, los e2e y `npm run check`, otra vez; **parada sin fusionar** |

## 4. Desviaciones del plan y motivo

Todas para cumplir los criterios de la adenda sin quitar ninguna función; las decide la sesión de revisión con Iván.
- **La cabecera del explorador, compacta también en escritorio** (el nombre y «Menú»). La decisión 2 dice qué enlaces lleva la cabecera, no si se ven en línea en el explorador. Con los siete a la vista, `/` no baja de 24 controles.
- **El selector, como lo decidió Iván el 07-11:** planetas y lunas, distintos (los planetas, redondos con el nombre debajo; las lunas, pastillas con la miniatura y el nombre al lado); en el PC y la tableta, dos filas, también en Tierra y Luna (con la Luna); en el móvil, una sola, con el planeta, una raya y sus lunas, y «‹ Sistema solar» para volver. **El criterio de controles con un cuerpo elegido en escritorio pasa de ≤ 30 a ≤ 32** (decisión de Iván del 07-11; una línea en la adenda, §4): con Saturno, con la Tierra y con Saturno en el Cielo, 32 a 1440 y a 1024. Sustituye a la fila del sistema que 9c.3 ponía en lugar de la de los planetas.
- **El título que sigue al cuerpo, en 9c.3** (y no en 9c.5): la fila del sistema (en el móvil) necesita su «‹ Sistema solar» para volver.
- **En el Cielo, sin Índice** (su tabla es la de «Esta noche»); **en el móvil, además, sin fichas y con la barra plegada** (la noche tiene su propio deslizador). Su selector es la tabla de «Esta noche», con «Mirar» en cada cuerpo, y los cuerpos se eligen también en el 3D. Con las fichas, el Cielo del teléfono tenía 19 controles: «Usar mi ubicación» vuelve a ser un botón (revisión, hallazgo 5) y las fichas usan todo el ancho (hallazgo 14). Sin ellas, 12, y el 3D gana.
- **En el Cielo del escritorio, la columna de la izquierda pasa de 20 a 22 rem:** el lugar más largo del selector, «Roque de los Muchachos (La Palma)», necesita 271 px y el selector tenía 256. Los nombres del selector, cortos (el nombre completo, en el título de la tabla).
- **Con «Más» o «Controles» abiertos, más controles:** en el móvil, 17 con «Más» abierto en Tierra y Luna y 17 o 18 con «Controles» (23 antes de la crítica del 08-11, con la hoja más alta; la revisión lo vio con «Más», hallazgo 12). Son paneles que se abren a demanda, como un menú, y se cierran igual: el tope de 16 se cuenta sin abrir nada. Sí se miden con ellos abiertos los controles tapados (ninguno).
- **El Cielo sin cuerpo, en escritorio, con 25 controles:** el tope de 24 es el de `/`; en el Cielo, «Usar mi ubicación», otra vez un botón (hallazgo 5), suma uno a los 24 de antes.
- **La línea de autoría, solo en la portada**, la «primera pantalla» de la decisión 3. En todas las vistas, el Cielo del teléfono pasaba a 17 controles.
- **Lo técnico de las fichas, separado (no plegado):** después de lo esencial, bajo el rótulo «Datos técnicos». La adenda deja elegir («plegado o separado»), y así la ficha se sigue leyendo entera sin JavaScript.
- **La ficha del móvil, una barra fina (decisión de Iván del 08-11; una línea en la adenda, §4):** el criterio de la hoja en reposo (≤ 45 %) pasa a ser otro: con un cuerpo elegido, la barra fina, ≤ 12 % de la pantalla; la interfaz en reposo tapa como mucho el 30 % (zona útil del 3D ≥ 70 %) a 390 y a 768; y el cuerpo, centrado en el hueco libre. Arriba, con un cuerpo elegido, una sola franja («‹ Sistema solar», el nombre y «Menú») en lugar de la cabecera y las pestañas. Para que la cabecera del sitio sepa el cuerpo, `ExplorerFocus` (sin dependencias) pasa de `features/explorer-ui/` a `core/`: el JS inicial sube 1,62 kB y el código propio inicial, de 10,96 a 12,07 kB (de 15).
- **`--measure` pasa de 68ch a 30em.** Es el ancho de lectura de todo el sitio: también se estrechan los textos de «Sobre el proyecto» y de los créditos (§12).
- **768 × 1024 (la tableta) se mide con el criterio de escritorio en los controles,** y lleva el selector del PC (el mismo corte, 768 px): la adenda distingue «escritorio» y «móvil». En la portada son 20 controles: ≤ 24 de escritorio sí, ≤ 16 del móvil no (las nueve fichas caben a ese ancho). §2 lo dice en su fila.

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
- **La franja de abajo:** solo detrás de la barra de tiempo, con un fundido de 0,75 rem por encima (0,5 desde la revisión, para el 10 % a 1024 × 768: §5.5); las fichas flotan sobre el 3D con una sombra del color del fondo en el nombre.
- **La ficha del cuerpo en el móvil, de dos alturas:** en reposo, el nombre, el tipo, el resumen, «Ficha completa» y «Ver los datos» (como mucho el 45 % de la pantalla); subida (con «Ver los datos» o arrastrando el tirador hacia arriba), las distancias, los datos y las fuentes. Arrastrar hacia abajo la baja y, en reposo, la cierra. Va encima de la barra de tiempo, que no tapa: reproducir y pausar, siempre a mano. Al entrar, con un fundido, sube solo medio rem: no tapa la barra ni en su primer fotograma (lo vio el CI; «Respuesta a la revisión», al final). Con `/?cuerpo=saturno`, Saturno queda colocado en el hueco libre desde el primer segundo (comprobado con una imagen por segundo durante 10 s).
- **Un solo selector a la vista (9c.3):** las fichas; el Índice, abierto, las sustituye. Con un planeta con lunas elegido, la fila pasaba a ser la de su sistema («Saturno y sus lunas»), con «‹ Sistema solar» en el título para volver. La decisión de Iván del 07-11 lo cambia: dos filas en el PC y la tableta y la fila del sistema, con una raya, solo en el móvil (§5.5).
- **El título sigue al cuerpo elegido** (decisión 2 de Iván, adelantada de 9c.5 porque la fila del sistema la necesita para volver): un servicio de la raíz sin dependencias, `ExplorerFocus` (`features/explorer-ui/explorer-focus.ts`), que escribe la interfaz diferida y lee la portada. La portada se prerenderiza con «El sistema solar»; con un cuerpo, «‹ Sistema solar», su nombre (H1) y su tipo, y el título del documento, «Saturno · Tierra Luna Sol». Al principio se volvía a poner al acabar cada navegación, pero la estrategia de títulos lo reescribía justo después: la revisión lo vio (hallazgo 3) y ahora se pone en una microtarea, con su e2e (§5.5). Su código va en un chunk diferido de 0,26 kB: el código propio inicial queda en 14,75 kB de 15.
- **El panel del Cielo:** el lugar a lo ancho y, debajo, «Usar mi ubicación» (en 9c.3 fue una opción del selector; la revisión vio que, al recorrerlo con las flechas, pedía la ubicación y que el nombre seguía cortado: hallazgos 5 y 6, §5.5); la hora; una línea de resumen con la Luna y los planetas sobre el horizonte, los más altos primero («Ahora: Saturno, 37° SE · Luna, 12° E», con su lectura en palabras para el lector de pantalla; `skySummary`, con tests); y «Esta noche» a demanda, con la tabla recompuesta en dos líneas por fila cuando no cabe en su caja (en el móvil y, desde la revisión, también en la columna del escritorio; sin barra horizontal; los papeles de tabla, explícitos). Zonas táctiles de 44 px en el selector, la hora, «Esta noche», «Mirar» y las constelaciones.
- **Las velocidades:** sin «10 días por segundo», casi igual que «1 semana por segundo»; quedan ocho escalones. Las de D33 (3 días/s y 1 h/s), igual.

### 5.3 Decisiones de las entregas 9c.4–9c.6

- **Nada se tapa (9c.4).** La fila de fichas ya no va bajo el velo (9c.2): cuenta en el margen de abajo del encuadre (`data-chrome`), así que el cuerpo enfocado no queda detrás de ella ni la cámara encima (a 1024 × 768, «Alejar» quedaba bajo la fila del sistema de Saturno). «Controles», en escritorio, se abre por encima de la fila de fichas (y, con la ficha abierta, a su izquierda): con él abierto no tapa ninguna ficha. Los paneles de Tierra y Luna se desplazan dentro de su área. Los deslizadores de la hora, con 24 px de alto (medían 16).
- **El texto, nada por debajo de 11 px.** El nombre latino de las constelaciones pasa de 9 a 11 px y el español, de 11 a 12, para conservar la jerarquía (`styles.css`, donde están los estilos de las etiquetas de la escena: véase §12); la marca «hoy» de la línea del año, de 10 a 11.
- **Menos cajas (9c.5).** El borde, solo en los campos y los desplegables (`select.control`, `input.control`); los botones, con su fondo (`--color-surface-raised`) y sin borde; pulsado o abierto (`aria-pressed`, `aria-expanded`), el texto en latón con su subrayado, como la pestaña de la vista actual (una sola regla para el Índice, «Controles» y «Más»). Los paneles (Tierra, Luna, Cielo, la ficha, el Índice y «Controles»), sin contorno: el fondo y la sombra los separan del 3D. Las pestañas, sin marco, sobre un fondo traslúcido. Las lunas de la fila flotante del cielo, como las fichas (la miniatura y el nombre, sin caja); el 07-11, pastillas (§5.5). Reproducir sigue siendo lo único destacado.
- **La navegación (decisión 2 de Iván).** La cabecera de las páginas de lectura: Planetas, Lunas, Sol, Eclipses, Sobre el proyecto y «Explorar en 3D» (en latón), sin «Cielo» (es una pestaña del explorador). En el explorador, en todos los tamaños, la cabecera es compacta: el nombre (a la portada) y «Menú»; en el menú, lo mismo y, aparte y abajo, los créditos, lo legal, el autor y la nota de privacidad. «Explorar en 3D» se marca en las cuatro vistas del explorador.
- **Los estilos de la cabecera y del pie del sitio pasan de `app.css` a `styles.css`.** `app.css` se compila dentro de `app.ts` (8,58 kB de los 15 del código propio inicial: el CSS iba como texto en el JavaScript); en la hoja de estilos cuentan lo mismo para la primera pintura, y el menú del explorador se escribe una vez (su aspecto depende de `:popover-open`; cuándo se usa, del tamaño o de estar en el explorador, `tls-root:has(.explorer)`, sin JavaScript). El código propio inicial baja de 14,89 a unos 11 kB, sin subir el presupuesto, y el JS inicial total, de 310 a 309,5 kB.
- **El pie del explorador:** solo las pistas de uso, la primera vez (`tls.pistas` en `localStorage`, con try/catch, `features/explorer-ui/first-visit.ts`); las enseña la interfaz, así que el HTML prerenderizado no las pinta para luego quitarlas. (Desde la crítica del 08-11, ya no van al pie: salen junto a la fila, al acabar el recorrido; «Respuesta a la crítica».) Los créditos y lo legal, en el menú; la fuente de los datos, en «Controles».
- **La línea de autoría (decisión 3):** «Posiciones reales, calculadas en tu navegador. Un proyecto de Iván Chesa Lapena · Cómo se calcula» (el enlace, a la precisión medida de «Sobre el proyecto»), discreta, en la primera pantalla de la portada (§4); se pliega con la entradilla y, si su enlace recibe el foco, vuelve a verse al momento. El texto, en `features/viewer/authorship.ts`, con `reviewed: false`.
- **El recorrido de la portada (decisión 3; 9c.6).** Unos 29 s: Saturno (con el título «Saturno»), la Tierra con la vista guiada «España», la Luna y la vista general en reproducción (`features/tour/home-tour.ts`, con tests). Su código, en un chunk diferido que la interfaz pide solo cuando toca. Arranca la primera vez que se entra en `/` sin parámetros, con el 3D ya pintado; no arranca en captura, con un enlace profundo, si ya se vio (`tls.recorrido`) ni sin almacenamiento («no insiste»). Con movimiento reducido, «Ver el recorrido» en su lugar (hasta empezar a usar el explorador; con la revisión, sin plegarse a los 8 s: §5.5). «Ver el recorrido», siempre en «Controles». «Saltar el recorrido» (con `Esc` al lado, como «Saltar el viaje») a la vista y con el foco; `Esc`, cualquier toque, la rueda o una tecla (menos el tabulador y las teclas modificadoras) lo paran y la escena se queda donde está (`Esc` no salta el viaje en curso). Sus navegaciones sustituyen la entrada del historial: atrás no recorre sus vistas. Solo con la API pública (la sesión: elegir, vistas, vista guiada y reproducir).

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
- **`/eclipses`:** «Calculado el 1 de noviembre de 2026» era la fecha en que se generó la lista y parecía la de hoy. Ahora, en el HTML, «Lista calculada el 1 de noviembre de 2026 con astronomy-engine.» (con la revisión: «al publicar» no era verdad si se publica otro día, hallazgo 13); en el navegador, como antes, «Calculado en tu navegador el …».
- **La Luna casi nueva** (menos del 5 % iluminada): «La Luna está casi nueva: la cara que mira a la Tierra apenas recibe luz del Sol. «Cara visible» la enseña en luna llena.». Se ve también con el panel plegado del móvil, y «Cara visible» lleva la fecha a la luna llena. Texto nuevo, para la revisión de Iván.
- **Las vistas guiadas de la Tierra, en dos columnas en escritorio** («El Himalaya» ya no queda solo en su fila); la última, si sobra, a lo ancho.
- **La fecha de la barra, estable:** la más larga, «30 sept 2026, 23:59», mide 186,3 px, y el ancho mínimo reservado (18,5ch) es el mismo, 186,3 px. No baila con ningún mes.

### 5.5 Decisiones de la revisión y de la decisión de Iván del 07-11

- **El selector, en dos disposiciones** (`features/body-chips/`): una señal del ancho, `mediaQuery(PHONE_QUERY)` (`features/viewer/media.ts`, con `matchMedia` y su escucha; sin `matchMedia`, el PC), con el corte en 48 rem (768 px), el mismo con el que se cuentan los controles. En el PC y la tableta, la fila de los planetas abajo y la de las lunas encima, también en el cielo, en Tierra y en Luna (`has-moons` aparta la ficha y los paneles). En el móvil, en la vista del sistema solar, una sola barra de herramientas con el planeta, la raya (`aria-hidden`) y sus lunas: las flechas pasan del planeta a sus lunas. Las pastillas, como los botones de 9c.5: su fondo (`--color-surface-raised`), sin borde, y pulsadas, el nombre en latón con el subrayado de 2 px. La pastilla se repite en la plantilla: con `NgTemplateOutlet`, el JS inicial subía 2,75 kB (lo que se usa de `@angular/common` va al chunk compartido inicial).
- **Tierra, Luna y el Cielo sin Índice** (la clase `no-index`): en el móvil, también sin fichas. Sin Índice, las fichas usan todo el ancho (hallazgo 14).
- **El título del documento** se pone otra vez en una microtarea tras cada `NavigationEnd`, después de la estrategia de títulos; sin cuerpo, el de la página (`TitleStrategy.buildTitle`). `ExplorerFocus` recibe la señal del cuerpo (`connect`) en `ngOnInit`: la portada lo lee de un `computed` (el efecto, solo para `document.title`). Conectarla en el constructor rompía la portada (NG0950: la vista, una entrada obligatoria, aún sin valor), y ahora lo prueba un test.
- **El recorrido** arranca solo si nadie ha empezado a usar el explorador (la URL de llegada, sin consulta; sin interacción, sin cuerpo elegido y, sin movimiento reducido, en marcha), lo mira otra vez al llegar su código y se da por visto al arrancar de verdad (con movimiento reducido, al ofrecerlo). Al acabar, el foco vuelve a donde estaba o al lienzo; «‹ Sistema solar» deja el foco en la ficha del cuerpo en la fila de los planetas.
- **El panel del Cielo:** «Usar mi ubicación», un botón debajo del selector (a su lado si el panel mide 30 rem o más: la tableta; una consulta de contenedor); los lugares, con un nombre corto (`placeShortLabel`); el selector, con el aspecto de los desplegables (`select.control`); la tabla, en dos líneas por fila si su caja mide menos de 24 rem; el resumen, por altura, y nunca «−0°».
- **«Controles», en escritorio, por encima de todo lo que tapa el lienzo por abajo** (la barra, las fichas y la fila de lunas): su margen de abajo es el del encuadre, `--view-bottom`, que mide la interfaz. En el móvil, la velocidad, a lo ancho.
- **El velo de abajo, ≤ 10 % también a 1024 × 768:** la barra de escritorio pasa de 4 a 3,75 rem (su control más alto, la velocidad con su rótulo, mide unos 55 px) y el fundido, de 0,75 a 0,5 rem: 68 px de 712.
- **`scripts/measure-ui.mjs`** mide también Saturno y el Cielo con Saturno con la ficha cerrada y «Más» abierto en Tierra y Luna; el velo; los contenedores que se desbordan en horizontal (sin las filas hechas para desplazarse ni lo que solo leen los lectores de pantalla) y los controles recortados; y si cada opción de un `select` cabe entera en él. `hits()` ya no da por bueno un antecesor del control.
- **`scripts/capture-interface.mjs`** saca también el selector con Saturno y la ficha cerrada (`saturno-fichas`).

## 6. Salida de los checks

**Al cerrar** (el código final, con la revisión, la decisión de Iván del 07-11, los arreglos de la crítica y la ficha del móvil; 08-11):

```
npm run check
- lint y Prettier: «All files pass linting.»
- tests: 747 de 747 en 79 ficheros (antes de la fase, 715 en 75), sin avisos; cobertura de ephemeris/:
  98,9 % de sentencias, 93,85 % de ramas, 100 % de funciones y 99,76 % de líneas
- build: 40 rutas prerenderizadas, sin avisos de presupuesto (tampoco de los estilos por componente)
  JS inicial 312,64 kB, 88,85 kB comprimido (antes de la ficha del móvil, 311,02; antes de la crítica,
  310,14; antes de la fase, 314,23)
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor en su JS inicial; código propio inicial, 12,07 kB de 15 (10,96 antes de la
  ficha del móvil: la franja de la cabecera y ExplorerFocus; antes de la fase, 14,88)
- check-links: 1216 enlaces internos bien (antes 1161: la ficha anterior y la siguiente, y las migas
  de /eclipses)

npx playwright test (E2E_PORT=4401, SwiftShader): 130 de 130 en 7,1 min, con los dos proyectos (antes de la fase, 107)
impeccable detect --json src/app (el motor 0.1.16 de la caché): 6 «broken-image», falsos positivos (§2)
```

Antes de la ficha del móvil (con la tanda de la crítica, 08-11): 742 tests en 78 ficheros, JS inicial 311,02 kB y 128 de 128 e2e.

Tras la revisión (08-11, antes de la crítica): 738 tests en 78 ficheros, JS inicial 310,14 kB y 122 de 122 e2e.

En la primera ronda (07-11): 733 tests en 77 ficheros, JS inicial 310,12 kB y 113 de 113 e2e.

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

Con el mismo script y las mismas condiciones que §6.1 (`scripts/measure-ui.mjs`, `?captura=1`, 390 y 768 táctiles, 1024 y 1440 con ratón), sobre el build final (08-11, con la revisión, la decisión de Iván del 07-11, los arreglos de la crítica y la ficha del móvil). «La ficha en reposo»: en el móvil y la tableta, la barra fina (decisión del 08-11; antes de ella, la hoja en reposo, 37,3 y 28,6 %). «Centro del cuerpo»: el centroide de lo que brilla en una captura del hueco libre, respecto a su centro, en fracción de su ancho y de su alto (el lado en sombra no brilla: en ancho sale un −4 o −5 % en todos los tamaños). Entre paréntesis, antes (con este mismo script sobre el build de `main`; las dos vistas con la ficha cerrada no se midieron entonces). «Velo»: la parte del lienzo bajo el fondo de la barra de tiempo (9c.2, ≤ 10 %). «Recortes»: contenedores que se desbordan en horizontal, controles recortados y opciones del selector que no caben.

| Tamaño | Vista | Zona útil | Velo | Controles visibles | Tapados | Recortes | Zonas < objetivo | Textos < 11 px | Contraste de los nombres | La ficha en reposo (alto, la pausa) | Centro del cuerpo (Δx, Δy) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 390 | portada | 83,5 % (46,7) | 8,6 % | 16 (22) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 390 | Saturno | 90,3 % (24,8) | 8,5 % | 7 (8) | 0 | 0 | 0 | 0 (0) | — | 6,9 %, a mano (60,2 %, no) | −4,5 % / +0,9 % |
| 390 | Saturno, sin ficha | 89,7 % | 8,5 % | 9 | 0 | 0 | 0 | 0 | 6,2:1 | — | −4,5 % / +0,9 % |
| 390 | Tierra | 86,0 % (25,2) | 8,6 % | 13 (30) | 0 | 0 | 0 | 0 (1) | — | — | — |
| 390 | Luna | 86,2 % (27,4) | 8,6 % | 14 (30) | 0 | 0 | 0 | 0 (1) | — | — | — |
| 390 | Cielo | 60,2 % (27,7) | 8,6 % | 12 (26) | 0 | 0 | 0 (2) | 0 (4) | — | — | — |
| 390 | Cielo, Saturno sin ficha | 59,9 % | 8,6 % | 12 | 0 | 0 | 0 | 0 | — | — | — |
| 768 | portada | 87,7 % (59,7) | 7,0 % | 20 (26) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 768 | Saturno | 90,9 % (25,2) | 7,0 % | 7 (9) | 0 | 0 | 0 | 0 (0) | — | 5,7 %, a mano (62,3 %, no) | −4,6 % / +1,8 % |
| 768 | Saturno, sin ficha | 86,5 % | 7,0 % | 22 | 0 | 0 | 0 | 0 | 5,4:1 | — | −4,6 % / +2,1 % |
| 768 | Tierra | 84,4 % (40,0) | 7,0 % | 25 (36) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 768 | Luna | 84,4 % (43,2) | 7,0 % | 24 (34) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 768 | Cielo | 69,6 % (43,1) | 7,0 % | 21 (30) | 0 | 0 | 0 (2) | 0 (6) | 5,4:1 | — | — |
| 768 | Cielo, Saturno sin ficha | 65,3 % | 7,0 % | 28 | 0 | 0 | 0 | 0 | 5,4:1 | — | — |
| 1024 | portada | 87,1 % (63,9) | 9,6 % | 23 (37) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 1024 | Saturno | 59,5 % (42,4) | 9,6 % | 32 (46) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — (la tarjeta de la derecha) | −5,6 % / −0,2 % |
| 1024 | Saturno, sin ficha | 83,5 % | 9,6 % | 30 | 0 | 0 | 0 | 0 | 5,4:1 | — | −4,8 % / −0,1 % |
| 1024 | Tierra | 73,3 % (49,6) | 9,6 % | 32 (47) | 0 | 0 | 0 (1) | 0 (1) | 5,4:1 | — | — |
| 1024 | Luna | 78,9 % (52,4) | 9,6 % | 30 (45) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 1024 | Cielo | 72,1 % (52,9) | 9,6 % | 25 (41) | 0 | 0 | 0 (2) | 0 (7) | 5,4:1 | — | — |
| 1024 | Cielo, Saturno sin ficha | 65,2 % | 9,6 % | 32 | 0 | 0 | 0 | 0 | 5,4:1 | — | — |
| 1440 | portada | 90,7 % (74,5) | 8,1 % | 23 (37) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 1440 | Saturno | 70,6 % (55,3) | 8,1 % | 32 (46) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — (la tarjeta de la derecha) | −4,4 % / +0,6 % |
| 1440 | Saturno, sin ficha | 88,8 % | 8,1 % | 30 | 0 | 0 | 0 | 0 | 5,4:1 | — | −4,0 % / +0,6 % |
| 1440 | Tierra | 82,2 % (63,6) | 8,1 % | 32 (47) | 0 | 0 | 0 (1) | 0 (1) | 5,4:1 | — | — |
| 1440 | Luna | 85,9 % (65,9) | 8,1 % | 30 (45) | 0 | 0 | 0 | 0 (1) | 5,4:1 | — | — |
| 1440 | Cielo | 78,0 % (64,1) | 8,1 % | 25 (41) | 0 | 0 | 0 (2) | 0 (7) | 5,4:1 | — | — |
| 1440 | Cielo, Saturno sin ficha | 73,8 % | 8,1 % | 32 | 0 | 0 | 0 | 0 | 5,4:1 | — | — |

- **Con «Controles», el Índice, «Más» o la hoja de la ficha abiertos** (32 estados, en los cuatro tamaños): 0 controles tapados y 0 recortes (antes, con «Controles» abierto, 12 tapados en la portada del móvil, 20 en Tierra y Luna y 16 en el Cielo; en la tableta, de 16 a 26). En el móvil, 17 controles con «Más» abierto en Tierra y en Luna, y de 14 a 18 con «Controles» (23 antes de la crítica, con la hoja más alta). La hoja de la ficha, abierta desde la barra (decisión del 08-11): 35,4 % de la pantalla a 390 y 27,1 % a 768, con 9 controles y una zona útil del 60,3 y el 68,9 %.
- **«Contraste de los nombres»:** el de los nombres de la fila sobre su placa, en el peor caso (blanco o negro detrás; crítica de la 9c, ≥ 4,5:1). «—»: sin fichas a la vista (Tierra, Luna y el Cielo en el teléfono, o con la hoja de la ficha).
- **Las capas de etiquetas de la escena** (`.scene-labels` y `.sky-labels`, de `scene/labels.ts`) ya no cuentan como contenedores desbordados: recortan a propósito lo que sale del lienzo. Con esta tanda, a 768 en el Cielo con Saturno, un rótulo en el borde la hacía salir «desbordada» (778 > 768).
- **Las páginas** (390 y 1440, la página entera): ninguna zona de menos de 24 px, ningún texto de menos de 11 ni ningún recorte en `/planetas`, `/planetas/marte`, `/lunas`, `/lunas/titan`, `/luna`, `/sol` y `/eclipses` (antes, de 9 a 21 notas «Fuente N» de 24 × 22 en cada ficha). En «Sobre el proyecto» (390: 12, 1440: 14 enlaces «Fase N» de 16 px de alto; a 390, además, su diagrama y dos tablas, que se desplazan en horizontal) y en los créditos (390: 5, 1440: 5 licencias de 19 px): de la otra sesión (§12).
- **La zona útil «Saturno»** es menor porque la ficha (la tarjeta en escritorio, la hoja en el móvil) está abierta: no es un criterio. Sí lo es su alto en el móvil (arriba). Con la ficha cerrada, la fila «Saturno, sin ficha».

## 7. Capturas

En `docs/informes/img/fase-9c/`, con `scripts/capture-interface.mjs` (`CAPTURE_PORT=4350`, de una en una): `antes-<tamaño>-<vista>.webp` (24, del build de `main`) y `despues-<tamaño>-<vista>.webp` (35, rehechas el 08-11 sobre el build final, con los arreglos de la crítica y la ficha del móvil). Tamaños 390 (móvil, ×2), 768 (tableta) y 1440 (escritorio); vistas `portada`, `saturno` (en el móvil y la tableta, desde el 08-11, con la barra fina y la franja de arriba), `saturno-fichas` (solo después: el selector con Saturno elegido y la ficha cerrada, la decisión de Iván del 07-11: dos filas en la tableta y el PC, una con la raya en el móvil), `saturno-hoja` (solo después, a 390 y 768: la hoja de la ficha abierta desde la barra fina; decisión de Iván del 08-11), `saturno-controles` (solo después: «Controles» abierto con Saturno; en el PC, la cámara aparta el planeta a la izquierda del panel; en el móvil y la tableta, la hoja baja con el 3D encima), `tierra`, `luna`, `cielo` (las del explorador, con `?captura=1`), `ficha-marte`, `lunas` y `eclipses` (la página entera) y, solo después, `recorrido` (la portada a los 6 s del recorrido, con el rótulo de su parada y «Saltar el recorrido», junto a la fila).

## 8. Dependencias añadidas

Ninguna.

## 9. Pendientes y `TODO(ivan)`

`docs/PENDIENTES.md` es de la otra sesión mientras trabaja: lo que haya que apuntar allí va en §12.
- **Para Iván:** revisar los textos nuevos de la interfaz (§12, «Los textos nuevos» y «Los textos nuevos de la crítica»); probar en el móvil la barra fina de la ficha y su hoja (con el dedo: deslizarla hacia arriba y hacia abajo), la franja de arriba, las filas desplazables, el recorrido, las pistas y «Controles» como hoja baja (no bloquea); y decidir si quiere el año también en la barra del teléfono (§10).
- **La crítica de impeccable, otra vez:** la repitió la sesión de revisión el 08-11 (31/40, `docs/revisiones/fase-9c-critica.md`); tras esta tanda, repasa solo lo que cambia (su recomendación, punto 2). El rendimiento (FPS), al cerrar el bloque con el PC libre.
- **Para decidir con la sesión de revisión e Iván** (§4): el Cielo del móvil sin fichas (su selector es «Esta noche»); el Cielo de escritorio sin cuerpo, con 25 controles; «Más» y «Controles» abiertos en el móvil, por encima de 16; y las sugerencias 19a (la cabecera compacta del explorador también en escritorio) y 19c (la tableta, medida con el tope de escritorio).

## 10. Propuestas de cambio al plan y backlog

- **El año en la barra del teléfono** (crítica, problema 4): a 390 px, la línea del año apenas mide 100 px, y las flechas del año, de 44 px con el dedo, la dejarían en nada. En el teléfono, el año sigue en la fecha de la barra y en «Controles» (el campo de la fecha, con sus límites 1900–2100); en la tableta y el PC, «‹ 2026 ›». Si Iván lo quiere también en el teléfono, una variante es la barra en dos filas (la fecha y el año arriba, la línea abajo): resta zona útil, y el criterio del móvil (≥ 65 % en `/`) deja margen.

### 10.1 Al backlog: lo demás de la crítica del 08-11

Lo que la crítica (`docs/revisiones/fase-9c-critica.md`) deja para después de la fusión (su recomendación, punto 3), por tema. Lo de la escena, en §12.
- **La primera vez:**
  - que el recorrido sea la primera lección, con tres gestos guiados (elegir Saturno, arrastrar el tiempo y abrir la Luna): hoy no enseña ningún control;
  - en el móvil, la presentación pesa mucho los primeros segundos y «Saturno» se ve cuatro veces a la vez (el título, la ficha, la fila y el rótulo del 3D);
  - la presentación se pliega al primer Tab, antes de poder leerla.
- **El explorador:**
  - la pestaña «Sistema solar» no hace nada estando ya en ella, junto a «‹ Sistema solar»;
  - el Índice del móvil tapa la barra;
  - «Controles» es solo un icono en el móvil, y el rango 1900–2100 solo se lee dentro;
  - en «Controles», tres o cuatro saltos a fechas con historia (cada una con su fuente);
  - el campo de la fecha acepta 2150 y avisa solo al confirmar, y el aviso sale lejos del campo;
  - piden contexto «Escala: Ilustrativa/Real», «Luz rasante» y «UA»;
  - el menú resalta «Explorar en 3D» estando en el explorador, y la autoría se pliega a los 8 s;
  - en el móvil, para llegar a Saturno hay que desplazar la fila, y al volver de «Ficha completa» la fecha vuelve a hoy;
  - en la tableta, la ficha deja vacía la mitad derecha y la fila de lunas no se alinea con la de planetas;
  - en la vista Tierra del móvil, «España» queda fuera de la fila («El Hi…», cortado).
- **`/explorar/luna`:** «Cara visible» lleva la fecha al 26-10-2026 y pausa sin avisar.
- **`/cielo`:** de día, el cielo queda vacío, y de noche, en el móvil, el suelo parece un hueco. La pregunta de la crítica: la Luna nueva y el cielo de día, como momentos («luz cenicienta», «Saturno sale esta noche a las…») y no como avisos.
- **Las páginas:**
  - `/eclipses`: la fecha, apretada dentro del título; todas las tarjetas pesan igual; el aviso de no mirar el Sol sin filtro no destaca;
  - `/lunas`: las miniaturas llevan un cuadrado más oscuro y los decimales son dispares;
  - `/planetas/marte`: las lunas son enlaces de texto, y a 1440 sobran unos 450 px a la derecha;
  - el 404 es seco.
- **La oportunidad** que señala la crítica: que el «atlas impreso de noche» llegue a la composición (la barra como regla de efemérides con meses y eclipses, la fila como leyenda de lámina, las páginas como láminas con pie de figura).

## 11. Cómo probarlo

En la vista previa de la rama (Cloudflare Pages, `fase-9c-interfaz.tierra-luna-sol.pages.dev`), o en local:

```bash
npm run build && CAPTURE_PORT=4350 node scripts/serve-dist.mjs   # http://127.0.0.1:4350
```

Qué mirar:
- `/` en una ventana privada (la primera vez): el recorrido de unos 30 s, con su rótulo junto a la fila («1 de 4 · Saturno y sus anillos») y «Saltar el recorrido», que lleva a la vista general en marcha; al acabar, «Ahora tú: elige un cuerpo abajo…», 7 s; la línea de autoría se pliega a los 8 s.
- Elegir Saturno: el título (y el de la pestaña del navegador) dice «Saturno», con «‹ Sistema solar»; en el PC, sus lunas, en pastillas, encima de los planetas; en el móvil, arriba una sola franja («‹ Sistema solar», «Saturno» y «Menú») y abajo solo una barra fina («Ver ficha»): un toque, o deslizarla hacia arriba, abre la hoja (el resumen y «Ficha completa»), y «Ver los datos» la sube entera; deslizarla hacia abajo, o Esc, la devuelve a la barra; al cerrarla (×), la fila de su sistema, con la raya.
- Tierra, Luna y Cielo en el móvil: el panel en una fila con «Más»; el Cielo, con el resumen de lo que hay sobre el horizonte, «Usar mi ubicación» y «Esta noche». En el PC, Tierra y Luna con los planetas y la Luna encima.
- «Controles»: el tiempo, la cámara y la escena; «Ver el recorrido». En el PC, abierto, la cámara aparta el cuerpo; en el móvil, una hoja baja con el 3D encima.
- El año en la barra (PC y tableta): «‹ 2026 ›», y mantenido, por décadas; con el teclado, Mayús + Re Pág y Av Pág en la línea del año.
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

  La 9c sí acabó cambiando la navegación de `app.*` (la decisión 2 de Iván: la cabecera de lectura y el menú del explorador), partiendo de la versión de la 9b: su tarea 0 se trajo con cherry-pick (`d47c475`) y su arreglo de `DestroyRef`, igual (`6e0edf2`).
- **Lo que la 9b aún tiene que poner en la interfaz:** el botón «Bajo las nubes» de Venus (D44, entrega 9b.e) va en la interfaz del explorador (`features/**`, de este lado). Quién lo coloca y dónde (¿en la ficha resumida de Venus?) hay que decidirlo con la adenda, para que encaje en la disposición nueva.
- **Los parámetros de captura nuevos** que la 9b añada a `viewer-params.ts` y `explorer-session.ts` se juntan a mano al fusionar (son cambios pequeños en archivos de este lado).
- **Si cambian los selectores** que usan los scripts de captura y medida (§5.1), hay que actualizar esos scripts (de la otra sesión) al fusionar. Con la 9c: `.time__more`, `.index-toggle`, `button[data-body=…]`, `#time-scale` y `.site-menu-button` siguen; **`a[href="/planetas"]` (`capture-pages.mjs`), en el explorador de escritorio, va ahora dentro del menú** (hay que abrir «Menú» antes); **el calendario y los botones del año ya no existen**.
- **El recorrido de la portada arranca la primera vez en `/` sin parámetros.** Los scripts que abren `/` así (`scripts/measure-autoplay.mjs`) lo verían en marcha: que pongan `localStorage['tls.recorrido'] = 'visto'` (`addInitScript`) o abran la portada con un parámetro. Los e2e ya lo hacen (`storageState` en `playwright.config.ts`).
- **Las etiquetas de la escena bajo los controles (9c.4)** son de `scene/labels.ts`: la interfaz le pasa las zonas que tapa (los márgenes del encuadre, `setViewInsets`). Casos de la crítica para la otra sesión: «Tierra» bajo «Acercar» (en escritorio, la cámara no aparta el encuadre: `--chrome-edge: none`), las constelaciones bajo «Esta noche» y el cardinal «S» sobre «Mercurio» (entre etiquetas). Con los nombres de las constelaciones a 12 y 11 px (antes 11 y 9), alguna se solapará más: que la escena las esconda o las aparte si se pisan.
- **Los textos nuevos de la interfaz** (`reviewed: false`): la línea de autoría (`features/viewer/authorship.ts`), el anuncio del recorrido, «Recorrido parado.», el resumen del cielo («Ahora: Saturno, 37° SE · …», `skySummary`), «Más: la hora del día y el recorrido», «Más: la fase y el recorrido», «Ver los datos» / «Ocultar los datos», «Ver el recorrido» y «Saltar el recorrido». Van a la lista de `docs/revision-textos.md` (la genera `scripts/build-text-review.mjs`, de la otra sesión).
- **Los conflictos al fusionar** (`git merge-tree` de `fase-9b-sol-lunas` en `8165610` con esta rama, 07-11): 10 archivos, casi todos por el cherry-pick de `d47c475` (la 9b siguió cambiando `scene/`, los parámetros de captura y su script en `3d04ab6` y después). Cómo resolverlos:
  - `app.html`, `app.ts`, `app.spec.ts` y `e2e/contenido.spec.ts`: la versión de la 9c, que ya lleva la tarea 0 de la 9b; lo que la 9b haya añadido después, a mano;
  - `scene/engine.ts`, `scene/types.ts` y `scripts/capture-moon-systems.mjs`: la de la 9b (la 9c solo los tocó con el cherry-pick);
  - `features/explorer-ui/explorer-session.ts`, `features/viewer/viewer-params.ts` y su spec: los parámetros de captura de las dos.
- **`--measure` (30em) es un token global:** estrecha también «Sobre el proyecto», los créditos y el pie del sitio (a 1440, el pie pasa de 2 a 4 líneas). Si la 9b prefiere otra medida en sus páginas, que la ajuste en ellas.
- **Los textos nuevos de esta ronda** (`reviewed: false`): los nombres cortos de los lugares, en el selector del cielo y en el de `/eclipses` (`placeShortLabel`: «Montsec (Lleida)»…) y «Lista calculada el 1 de noviembre de 2026 con astronomy-engine.» (`/eclipses`).
- **De la crítica del 08-11, para la escena** (`scene/`, de la 9b; la recomendación de la crítica, punto 3):
  - **las etiquetas sobre los discos** (`scene/labels.ts`) bajan a un contraste de 1,0–3,9 cuando pisan un planeta brillante (Urano, la Tierra, el Sol): una placa o un halo, como los nombres de la fila (`.chip__name`, ≥ 4,5:1 medido);
  - **el rótulo 3D de Saturno** se coloca más allá de los anillos, lejos del planeta; y con «Controles» y la ficha abiertos a 1024, cae sobre el título de la presentación (la etiqueta no se aparta de esa zona);
  - **una precarga de texturas en la API de la escena** (`scene/index.ts`, `scene/textures.ts`), para que el recorrido pida la Tierra y la Luna durante la parada de Saturno: si la textura llega tarde, se ve una esfera azul lisa. La interfaz la llamaría desde `runTour` (`features/tour/home-tour.ts`);
  - **los nombres de los lugares sobre los puntos de España** (los marcadores de la vista guiada, `earth-markers`): hoy los dice el rótulo de la parada del recorrido.
- **Los textos nuevos de la crítica** (`reviewed: false`): los rótulos del recorrido («1 de 4 · Saturno y sus anillos», «La Tierra», «España y los lugares del cielo: el Montsec, Fabra, Calar Alto, Madrid, Fraga, el Teide y el Roque de los Muchachos», «La Luna», «El sistema solar, en marcha»; con la Luna casi nueva, «… de 3»), su anuncio («Recorrido de unos 30 segundos: Saturno, la Tierra y la Luna. Pulsa «Saltar» o cualquier tecla para pararlo.»), las pistas («Ahora tú: elige un cuerpo abajo · arrastra para girar · usa la rueda para acercarte», o «pellizca para acercarte»), las flechas del año («Año anterior (Mayús + Av Pág)», «Año siguiente (Mayús + Re Pág)»), la descripción de la línea del año («Flechas, un día; Re Pág y Av Pág, un mes; con Mayús, un año; Inicio y Fin, el principio o el final del año.») y las migas de `/eclipses` («Inicio › Eclipses»).
- **Los textos nuevos de la ficha del móvil** (`reviewed: false`; decisión de Iván del 08-11): «Ver ficha» y «Ver menos» (la barra fina), y su línea, que se compone con el tipo y el primer dato de la ficha («Planeta · Radio ecuatorial: 60.268 km»).
- **`ExplorerFocus` pasa a `core/explorer-focus.ts`** (decisión de Iván del 08-11: la cabecera del sitio lo lee para la franja del cuerpo elegido). Si la 9b lo importa desde `features/explorer-ui/`, al fusionar cambia la ruta.
- **Las pistas, junto a la fila:** los scripts que abren `/` sin `?captura=1` las verán 7 s al acabar o saltar el recorrido (o, sin recorrido, al pintarse el 3D), salvo con `localStorage['tls.pistas'] = 'visto'`.
- **Al fusionar** (adenda, §5.3): D47 en el plan (§2 y la fase), con el criterio de controles de la decisión de Iván del 07-11 (≤ 32 con un cuerpo elegido), una línea en `PENDIENTES.md` y otra en el `DIARIO`.

## Respuesta a la revisión (07-11 y 08-11)

La revisión (`docs/revisiones/fase-9c.md`, «CAMBIOS NECESARIOS») y la decisión de Iván del 07-11 (planetas y lunas, distintos en el selector), en la misma ronda y en la misma rama, sin fusionar. Un commit por tarea (hallazgo 16): los que van juntos en un archivo se separaron en el índice, sin tocar el árbol de trabajo. Los commits: `eca4e5a` (la revisión), `e3f5994` (el selector del 07-11), `a907e3c` («Controles», por encima de las lunas), `a5a1658` (1–3, 8–10 y 17), `68e3ccc` (4), `f8d65c9` (5–7 y 11), `c73bf87` (13), `02aac93` (16), `70f0bd1` (el velo, 15), `4ec9b43` (el script de medida, 12 y 18), `2c4cb7d` (el recorrido y la URL de llegada, 1) y el de las capturas y este informe.

| # | Severidad | Qué se ha hecho | Evidencia |
|---|---|---|---|
| 1 | Importante | El recorrido solo arranca si nadie ha empezado a usar el explorador: al pintar el 3D y otra vez al llegar su código se mira que no haya interacción (`acted`) ni cuerpo elegido y, sin movimiento reducido, que siga en marcha (si está en pausa, alguien la ha pausado); si ya no toca, no arranca ni se da por visto. El enlace profundo se sigue mirando en la URL de llegada: leerla al pintar el 3D, como proponía la revisión, tomaba por enlace profundo el `?fecha=` que escribe la propia interfaz al arrancar en pausa con movimiento reducido, y «Ver el recorrido» no salía (lo vio el e2e: `2c4cb7d`) | e2e `recorrido.spec.ts`, «con una red lenta…»: el código de three llega 8 s tarde, se elige Júpiter antes y no aparece «Saltar el recorrido»; el título sigue en Júpiter y `tls.recorrido` sigue vacío |
| 2 | Importante | (a) Al acabar o pararlo, si el foco se ha perdido (estaba en «Saltar el recorrido»), va a donde estaba antes de empezar o al lienzo. (b) «‹ Sistema solar» deja el foco en la ficha del cuerpo (o de su planeta) en la fila de los planetas, que pasa a ser la parada de la fila (`BodyChips.focusBody`); si no se ve (con el Índice abierto), en el lienzo | e2e «al pararlo con Intro, el foco no se pierde: va al lienzo» (`recorrido.spec.ts`) y «“‹ Sistema solar” vuelve a la vista general con el foco en la ficha del cuerpo» (desde Titán, el foco en Saturno; `fichas.spec.ts`) |
| 3 | Importante | El título del documento se pone otra vez en una microtarea tras cada `NavigationEnd` (la estrategia de títulos lo reescribe justo después). Sin cuerpo, el de la página (`TitleStrategy.buildTitle`), también si se vuelve a la vista general durante la reproducción, sin navegar | e2e «el título del documento sigue al cuerpo elegido» en `/` y en `/?fecha=…`: «Saturno · Tierra Luna Sol», también un segundo después, y «Tierra Luna Sol» al volver |
| 4 | Importante | `.site-nav .site-nav__extra { display: none }` (gana a `.site-nav ul`) | e2e «en escritorio, la cabecera de las páginas de lectura, en una fila y sin lo legal»: en `/planetas/marte` a 1440, los 7 enlaces de la cabecera y ≤ 60 px de alto |
| 5 | Importante | «Usar mi ubicación», otra vez un botón, debajo del selector y a lo ancho (en la tableta, a su lado: cabe); el selector, solo lugares | e2e «recorrer los lugares con las flechas no pide la ubicación…»: 9 flechas abajo y 1 arriba, 0 peticiones; el botón, 1 |
| 6 | Importante | Las etiquetas del selector, cortas (`placeShortLabel`, en `features/sky-panel/place-label.ts`, con tests; también en `/eclipses`): «Montsec (Lleida)», «Roque de los Muchachos (La Palma)»…; el nombre completo, en el título de la tabla. En el Cielo del escritorio, la columna de la izquierda pasa de 20 a 22 rem: el más largo necesita 271 px y el selector tenía 256 | `measure-ui.mjs` compara cada opción (una copia del `select` con solo ella, a su ancho natural) con el ancho del selector: ninguna cortada en los cuatro tamaños, ni en el Cielo ni en `/eclipses` (antes, «Parque Astronómico del Montsec, Lleida», el de por defecto, a 1024 y a 1440, y el Roque a 390, 1024 y 1440) |
| 7 | Importante | La tabla de «Esta noche» se recompone en dos líneas por fila cuando su caja mide menos de 24 rem (una consulta de contenedor), no solo en el móvil: en la columna del escritorio, también. «Mirar» queda dentro del panel | `measure-ui.mjs` avisa de los contenedores que se desbordan en horizontal (sin contar las filas hechas para desplazarse) y de los controles recortados: 0 en las 28 vistas y en los 30 estados (antes, la tabla medía 320 px en 256 y «Mirar» quedaba fuera) |
| 8 | Menor | «Ver el recorrido» se ve mientras no se ha usado el explorador ni hay un cuerpo elegido (no se pliega a los 8 s), y solo en la portada al llegar (al cambiar de vista, se va). Ofrecerlo cuenta como visto: después, en «Controles» | El e2e de movimiento reducido (`recorrido.spec.ts`) |
| 9 | Menor | Una marca `alive` con `DestroyRef`; al llegar el código se repiten las comprobaciones del #1; un `.catch` (si no llega, no se da por visto); `tls.recorrido` se guarda al arrancar de verdad | `explorer-ui.ts` (`startTour`) |
| 10 | Menor | `ExplorerFocus.connect(señal)`: la portada lee el cuerpo de un `computed`, sin copiarlo con un efecto; el efecto, solo para `document.title`. Se conecta en `ngOnInit`: antes, la portada leía la vista (una entrada obligatoria) sin valor (NG0950, visto en el navegador al hacerlo) | Los tests de `explorer-ui.spec.ts`; los e2e del título |
| 11 | Menor | El resumen se ordena por la altura numérica (`altitudeDeg`, que lleva la fila); `degreesText` no escribe «−0°» | Tests de `sky-text.spec.ts` (con −0,3° y 0,4°) |
| 12 | Menor | `measure-ui.mjs` mide también Saturno y el Cielo con Saturno con la ficha cerrada, y «Más» abierto en Tierra y Luna. En el móvil, el Cielo va sin fichas (como Tierra y Luna; §4) | §6.2: el Cielo del móvil, 12 controles, también con Saturno (con las fichas eran 19); Saturno con la ficha cerrada, 14; con «Más» abierto, 17 (§4) |
| 13 | Menor | «Lista calculada el 1 de noviembre de 2026 con astronomy-engine.» | e2e `cielo.spec.ts` (la lista sin JavaScript) |
| 14 | Menor | Sin Índice (Tierra, Luna y el Cielo: la clase `no-index`), las fichas usan todo el ancho | `explorer-ui.css`; en el móvil, el Cielo ya no lleva fichas |
| 15 | Menor | (a) La autoría, «en la primera pantalla de la portada» (§5.3). (b) `--measure`, en §12. (c) §12 dice que la 9c sí cambió la navegación de `app.*`. (d) §5.2, al día (el título del documento y el nombre del lugar, ya de verdad). (e) El velo, medido por el script (§6.2): a 1024 × 768 tapaba el 10,7 %; la barra de escritorio pasa de 4 a 3,75 rem y el fundido, de 0,75 a 0,5 rem: 8,6 % a 390, 7,0 % a 768, 9,6 % a 1024 × 768 y 8,1 % a 1440. (f) El resumen de §1, con las cifras de §6.2 | Este informe |
| 16 | Menor | Fuera `shiftYears` (y su test) y el icono `calendar` (`locate` vuelve a usarse en el botón); `AUTHORSHIP.source` (la ruta y el fragmento) en la plantilla; `window.scrollTo`, sustituido en `app.spec.ts` (la navegación lo llama en un `setTimeout`): `npm test` sin avisos. Desde aquí, un commit por tarea | §6 |
| 17 | Sugerencia | El `kbd` de `Esc`, oculto con el dedo (`pointer: coarse`) | `explorer-ui.css` |
| 18 | Sugerencia | `hits()` ya no da por bueno un antecesor; los controles recortados, aparte | `measure-ui.mjs` |
| 19 | Sugerencia | (a) y (c), para la sesión de revisión e Iván (§4). (b), resuelta por la decisión de Iván del 07-11: en el PC, los planetas siempre a la vista; en el móvil, «‹ Sistema solar» | §4 |
| 20 | Sugerencia | §12, con los 10 archivos en conflicto y cómo resolver cada uno | §12 |

**Lo nuevo de la decisión de Iván del 07-11** (§4 y §5.5): planetas redondos con el nombre debajo y lunas en pastillas con la miniatura y el nombre al lado; en el PC y la tableta, dos filas (también en Tierra y Luna, con la Luna); en el móvil, una sola fila con el planeta, una raya y sus lunas, y «‹ Sistema solar» para volver; el criterio de controles con un cuerpo elegido en escritorio, ≤ 32 (adenda, §4).

**Encontrado al rehacerlo** (con las comprobaciones nuevas del script y en el navegador):
- usar `NgTemplateOutlet` para no repetir la pastilla subía el JS inicial 2,75 kB (la parte de `@angular/common` que se usa va al chunk compartido inicial): la pastilla se repite en la plantilla;
- conectar el cuerpo del título en el constructor rompía la portada (NG0950): se conecta en `ngOnInit`, con un test;
- con la fila de lunas otra vez en el PC, «Controles», abierto con Saturno elegido, tapaba de 4 a 5 lunas a 1024 y a 1440: ahora se abre por encima de todo lo que tapa el lienzo por abajo (`--view-bottom`, el margen que mide la interfaz), con su e2e (`tiempo.spec.ts`);
- la comprobación de las opciones vio otros dos selectores cortados: el de la velocidad de «Controles» en el móvil («1 semana por segundo», 191 px en 173), que va ahora a lo ancho, y el de `/eclipses` («Observatorio del Roque de los Muchachos, La Palma», 426 en 358), que usa también el nombre corto (`placeShortLabel` pasa a `features/sky-panel/place-label.ts`, sin dependencias: `/eclipses` no lleva astronomy-engine en su JS inicial);
- sin dar por bueno un antecesor (hallazgo 18), un enlace partido en dos líneas salía «tapado» (el centro de su caja cae entre las líneas): el script mira el centro de cada línea;
- leer la consulta al pintar el 3D (hallazgo 1) dejaba sin «Ver el recorrido» a quien llega con movimiento reducido: la interfaz arranca en pausa y escribe `?fecha=` antes; el e2e lo vio y el enlace profundo se mira otra vez en la URL de llegada (`2c4cb7d`);
- **en el CI (08-11)**, el e2e del proyecto móvil «con la ficha abierta, el foco va a la ficha…» fallaba siempre en «Reproducir». Con SwiftShader casi no hay fotogramas y la animación de entrada de la hoja se quedaba al principio: 2 rem más abajo (y aún transparente), su borde tapaba reproducir, la línea de tiempo y «Controles». Se reprodujo en local congelando las animaciones (CDP). La hoja sube ahora medio rem, con su fundido, y en su primer fotograma no llega a los controles de la barra. Un e2e nuevo lo comprueba con las animaciones congeladas: con los 2 rem de antes, falla;
- el Cielo de la tableta (768) quedaba en el 65,1 % de zona útil con la fila nueva de «Usar mi ubicación»: si el panel mide 30 rem o más, el botón va al lado del selector.

## Respuesta a la crítica (08-11)

La crítica repetida (`docs/revisiones/fase-9c-critica.md`: 31/40, a un punto del objetivo de D47) y la decisión de Iván del 08-11: los problemas 1 a 6 y los rápidos, en esta rama y sin fusionar; lo demás, al backlog (§10.1), y lo de la escena, a §12. Un commit por arreglo: `b1f2004` (1, con la crítica), `c5a3926` y `9a149c7` (2 y 3), `8b7f881` y `34235a0` (4), `2d85fe5` (5), `52cbd2c` y `0d6f147` (6), `edd6e54` y `ffe4070` (los rápidos), `710a0d9` (los scripts de medida y de capturas), y el de `docs/DISENO.md`, las capturas y este informe.

| # | Lo que pedía | Qué se ha hecho | Evidencia |
|---|---|---|---|
| 1 | [P1] Con un cuerpo elegido, a 768 y a 390, dos paradas del Tab en elementos invisibles («Volver al sistema solar» y «Cómo se calcula») | Lo plegado se despliega al recibir el foco: las cuatro reglas que esconden la presentación y la autoría (`styles.css`) no se aplican a lo que tiene el foco dentro (`:not(:focus-within)`). Se prefirió a `inert`, que dejaría esos dos enlaces sin teclado con un cuerpo elegido en el móvil | e2e `movil.spec.ts`, «con un cuerpo elegido, el tabulador no se para en nada que no se vea», a 390 y a 768 (Saturno): del principio al lienzo, ninguna parada tapada ni recortada, y pasan las dos. Con el CSS de antes, falla |
| 2 | [P1] El recorrido: «Saltar», la Luna, la precarga, España y el final | **(a)** «Saltar el recorrido» y `Esc` llevan a la vista general en marcha: reproducir, la vista general y, desde Tierra, la vuelta a `/`, sin viaje de cámara (ni «Saltar el viaje»). El foco vuelve a donde estaba solo si se ha saltado con el teclado; con el ratón o un toque, sin anillo. **(b)** La Luna: si está iluminada menos del 20 % en la fecha de la simulación (`TOUR_MOON_MIN_LIT`), el recorrido se salta esa parada (tres paradas, unos 23 s), sin tocar la fecha. **(c)** **La precarga de la Tierra y la Luna no se puede hacer desde la interfaz:** la API de la escena no la tiene (`scene/textures.ts`, de la 9b). Va a §12. **(d)** España: en escritorio, los paneles de Tierra y Luna apartan el encuadre a su derecha (`--chrome-edge: left`), y la región de la vista guiada queda en la zona libre; sus lugares los nombra el rótulo de la parada; los nombres sobre los puntos del globo son de la escena (§12). **(e)** Cada parada, con su rótulo en una placa junto a la fila («1 de 4 · Saturno y sus anillos»): el recorrido dice por dónde va (heurística 1). **(f)** Al final, «Ahora tú: elige un cuerpo abajo · arrastra para girar · …» | `home-tour.spec.ts`: el plan con la Luna y sin ella, los rótulos y parar. e2e `recorrido.spec.ts`: «Saltar» deja «El sistema solar» en marcha («Pausar»), en `/`, sin «Saltar el viaje» ni el foco en el lienzo, y con «Ahora tú: elige un cuerpo abajo…»; `Esc`, la vista general; la rueda y un clic lo paran donde está («Recorrido parado.»); entero, nombra los lugares de España y acaba con la invitación; la parada de la Luna, según su fase |
| 3 | [P2] Las pistas se gastaban durante el recorrido | Salen al acabar o saltar el recorrido (sin recorrido, al verse el 3D), 7 s (`HINT_MS`) junto a la fila, en la misma placa que el rótulo. Solo se dan por vistas con una interacción de verdad: un clic, un toque, la rueda o una tecla que no sea el tabulador ni un modificador (no la que las hizo salir). Si se acaban sin usarlas, vuelven la próxima vez | `explorer-ui.spec.ts`: salen al pintarse el 3D, se van a los 7 s sin darse por vistas, y con un clic, sí; la tercera vez, ninguna. e2e `recorrido.spec.ts`: tras «Saltar», se van solas en menos de 12 s y `tls.pistas` sigue vacío |
| 4 | [P2] El año como mando en la barra, dentro de 1900–2100 y con teclado | «‹ 2026 ›» en la línea del año, en el PC y la tableta: un toque, un año; mantenido medio segundo, por décadas (cada 0,35 s), siempre dentro de 1900–2100. Con el teclado, Mayús + Re Pág y Av Pág en la línea del año, que lo dice en su descripción (`aria-describedby`). **Un solo mando:** las flechas son parte de la línea (`aria-hidden`, sin parada propia del tabulador), así que los controles visibles no suben (la variante que cabe en D47). Con el dedo (la tableta), de 44 px. En el teléfono, la línea apenas mide 100 px: el año, en la fecha y en «Controles» (propuesta para Iván, §10) | `timeline-slider.spec.ts` y `timeline.spec.ts`: los pasos, la pulsación larga y el tope de 2100 (también −10 años). e2e `tiempo.spec.ts`, «el año, como mando de la barra…»: ‹ y ›, la pulsación larga hasta 1976 o antes, Mayús + Re Pág y la descripción accesible. `measure-ui.mjs`: ninguna zona táctil pequeña a 768 |
| 5 | [P2, AA] Los nombres de la fila, sobre un planeta brillante, y las vistas guiadas, por encima de la fila | Una placa casi opaca (el color del fondo al 88 %) bajo el nombre de cada planeta. Las vistas guiadas: la fila cuenta en el encuadre, y «La Tierra completa» encuadra el planeta por encima de ella; en las vistas de cerca (España, el Himalaya), el globo llena el lienzo y pasa por detrás: para eso es la placa | `measure-ui.mjs` mide el contraste de los nombres en el peor caso (blanco o negro detrás): 5,4:1 en el peor caso, en todas las vistas con fichas (6,2:1 en la fila del sistema del móvil) (sin placa, con blanco detrás, el `#ABA593` de 12 px daba 2,4:1). Capturas de la vista Tierra (§7) |
| 6 | [P2] «Controles» tapaba lo que controla | En el móvil, una hoja baja: como mucho el 45 % de la pantalla, encima de la barra; lo demás se desplaza dentro, y el 3D se ve encima (Acercar y Alejar siguen dentro, como permite la decisión: el efecto se ve). En un teléfono bajo, la hoja deja al menos unos 150 px de 3D bajo el título; en horizontal (alto ≤ 30 rem, o el zoom al 200 %), es un panel a la derecha, de debajo de las pestañas a la barra. Abierto, cuenta en el encuadre (`data-chrome`; por la derecha en escritorio y en horizontal, por abajo en el móvil): la cámara aparta el cuerpo. El panel está en la capa superior (`popover`) y no cuelga del explorador: se mide por su caja en la ventana (`offsetWithin`) | e2e `movil.spec.ts` («Controles +»): la hoja, ≤ 45 % del alto, y el margen de abajo del encuadre llega a su borde. e2e `tiempo.spec.ts` (Saturno con sus lunas): el margen derecho crece y llega al borde del panel. e2e `maquetacion.spec.ts` (pantallas bajas con «Controles» abierto): ≥ 150 px de lienzo libre. Medido: a 390 × 844, la hoja, 380 px (45,0 %), y 231 px de 3D encima; a 360 × 640 y a 375 × 667, 161 px; a 640 × 360, el panel a la derecha y 184 px de alto libres; a 1440, el margen derecho pasa a 416 px (784 con la ficha abierta); a 1024 con la ficha y «Controles», quedan 240 px a la izquierda y Saturno se ve en ellos, pequeño |
| 7 | Los rápidos | «Constelaciones»: la casilla y su rótulo, 24 px de alto (44 con el dedo). «Esta noche»: el `summary` vuelve a ser `list-item` (con `display: flex`, el navegador quitaba su marcador), centrado con `align-content`. `/eclipses`: migas «Inicio › Eclipses» y los párrafos con la medida del sitio (`--measure`; con 42rem pasaban de 90 caracteres por línea); las tarjetas, de ese ancho. Las vistas de la Tierra: el relleno de los demás botones, 8 y 12 px (tenían 4) | e2e `cielo.spec.ts`: el marcador pasa de `disclosure-open` a `disclosure-closed` al plegar, y la casilla mide ≥ 24 px; `/eclipses`, con sus migas y la línea más larga entre 60 y 80 caracteres (medido: 65 a 1440 y a 768; 50 a 390). e2e `tierra.spec.ts`: el relleno de las vistas, 8 y 12 px |

**Los topes de D47** (≤ 32 controles en escritorio con un cuerpo elegido y ≤ 16 en el móvil) se mantienen: ningún arreglo añade una parada. La placa del recorrido reúne lo que antes iba en dos sitios (los botones «Saltar el recorrido» y «Ver el recorrido», y las pistas del pie), y el año es parte de la línea del año. §6.2: en escritorio, 23 en `/` y, con un cuerpo elegido, 32 (Saturno, la Tierra y el Cielo con Saturno) y 30 (la Luna); en el móvil, de 12 a 16.

**Encontrado al hacerlo:**
- con «Controles» contando en el encuadre, `maquetacion.spec.ts` (las pantallas bajas «con la barra desplegada») midió de verdad el lienzo que queda con el panel abierto: 133 px a 360 × 640, 148 a 375 × 667 y 22 con el zoom al 200 %. Antes pasaba porque la hoja, que tapaba casi todo, no contaba. De ahí la hoja más baja en los teléfonos bajos y el panel a la derecha en horizontal (`0d6f147`). El e2e, además, medía a 390 × 844 a media animación de la presentación: ahora espera a que se pliegue, sin tiempos fijos;
- `/eclipses` usaba `--space-5`, que no existe en la escala (1, 2, 3, 4, 6, 8…): el margen del selector y el de las fuentes se quedaban en 0. Ahora, `--space-6`. Una búsqueda de variables sin definir en `src/` no encuentra otra;
- la placa del recorrido proyecta su botón (`<ng-content>`): el JS inicial sube 0,88 kB (311,02 kB, con el aviso a 320), porque las instrucciones de proyección van al chunk compartido inicial. El código propio inicial no cambia (10,96 kB de 15);
- con la ficha y «Controles» abiertos a 1024, el encuadre libre queda en 240 px: Saturno se ve, pequeño, en vez de quedar tapado por el panel; y el rótulo 3D de «Saturno» cae sobre el título de la presentación (es de la escena: §12).

## Decisión de Iván del 08-11: la ficha del móvil, menos invasora

Iván, tras probar la vista previa: «sobre todo cuando clicas algún planeta… abajo salta, es muy invasor». La sesión de revisión lo midió a 375 × 812, con la Tierra y Saturno elegidos: la hoja en reposo ocupaba el 37 % de la pantalla y, con la cabecera y las pestañas (otro 14 %) y la barra de tiempo, casi el 60 % quedaba tapado, con el planeta apretado arriba y la descripción entera a la vista. Se ha hecho después de la tanda de la crítica, en esta rama y sin fusionar, solo en el móvil y la tableta (por debajo de 64 rem, el corte de las hojas). Los commits: `1b176b2` (la barra fina y la hoja a demanda), `edfb195` (la franja de arriba), `cc6f430` (las medidas y las capturas) y el de este informe, DISENO y la adenda.

| Lo que pedía | Qué se ha hecho | Evidencia |
|---|---|---|
| 1. Al elegir un cuerpo, solo una barra fina (≤ 12 %) | `tls-body-bar` (`features/body-panel/body-bar.ts`), encima de la barra de tiempo: el nombre, el tipo y un dato clave (el radio: «Planeta · Radio ecuatorial: 60.268 km»), «Ver ficha» y ×, sin la descripción. El dato es uno que no cambia: el nombre del botón no se mueve mientras corre la simulación. Las fichas de la fila, ocultas tras ella como antes tras la hoja | `measure-ui.mjs`: 6,9 % a 390 y 5,7 % a 768 |
| 2. La hoja a media pantalla, solo si se pide | Un toque o Intro en la barra (es «Ver ficha»), o deslizarla hacia arriba: la hoja, con el resumen, «Ficha completa» y «Ver los datos» (que la sube entera). Deslizarla hacia abajo (la barra o su tirador), o Esc, la devuelve a la barra; con la barra, deslizar hacia abajo cierra la ficha. Con movimiento reducido, sin animación (las duraciones, a 0) | e2e (un toque, el dedo y el teclado); `measure-ui.mjs`, estado «ficha»: la hoja, 35,4 % a 390 y 27,1 % a 768, sin nada tapado |
| 3. Arriba, una sola franja | La cabecera del sitio, de 3 rem, con «‹ Sistema solar», el nombre y «Menú», en lugar de la cabecera y las pestañas. Las pestañas, «‹ Sistema solar» de la presentación y la autoría salen; el H1 y su tipo quedan para el lector. La cabecera lee el cuerpo de `ExplorerFocus`, que pasa a `core/` | e2e «con un cuerpo elegido, arriba, una sola franja…»: la cabecera, ≤ 49 px; el menú, a mano; «‹ Sistema solar» la quita |
| 4. La pausa, siempre a mano | La barra fina y la hoja, encima de la barra de tiempo | e2e: reproducir se pulsa con la barra y con la hoja abierta (también con las animaciones congeladas) |
| 5. La accesibilidad, igual o mejor | La barra es un botón con `aria-expanded` y `aria-controls` (el resumen, `#card-body`); el foco va a la barra al elegir (también con el teclado, desde el índice), al abrir la hoja a su contenido (`tabindex="-1"`) y, con Esc, de vuelta a la barra; lo que no se ve no está en el orden del foco | e2e del teclado y del foco (a 390 y a 768, ninguna parada en algo que no se ve); axe sin violaciones con la barra y con la hoja abierta |

**Los criterios nuevos** (en §2, en lugar del de la hoja en reposo, y en la adenda, §4): con un cuerpo elegido, la barra fina, ≤ 12 % (6,9 y 5,7 %); la interfaz en reposo, ≤ 30 % (zona útil del 90,3 y el 90,9 %; por alto, el 19,7 y el 16,2 %); el cuerpo, centrado en el hueco libre (en alto, +0,9 y +1,8 %).

**Con «Controles» (el punto 6 de la crítica), no choca:** con «Controles» abierto, la barra y la hoja se ocultan, como antes la hoja, y las dos siguen el mismo patrón: suben sobre la barra de tiempo, no pasan de media pantalla, Esc las cierra y el foco vuelve a su botón.

**Encontrado al hacerlo:**
- el encuadre contaba lo que estaba oculto (las fichas tras la barra, `visibility: hidden`): con la barra fina, el cuerpo quedaba 6 px (a 390) y 34 px (a 768) por encima del centro del hueco. Ya no cuenta;
- el comprobador del bundle inicial no deja nada de `features/explorer-ui/` en el JS inicial: `ExplorerFocus`, que es una señal sin dependencias, pasa a `core/`. El JS inicial sube 1,62 kB (312,64) y el código propio inicial, a 12,07 kB de 15;
- en los e2e, un gesto emulado demasiado rápido es para Chrome un lanzamiento, y el toque siguiente solo lo para (sin clic): el gesto de los e2e lleva los tiempos de un dedo;
- con la barra hay menos paradas del tabulador: el e2e que buscaba lo último fuera de la ficha seis paradas más allá acababa en la cabecera, fuera del explorador; ahora, tres;
- el tirador captura el puntero, como la barra: con el ratón (en una tableta con ratón), soltar fuera de él también cuenta.
