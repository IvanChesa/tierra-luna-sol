# Informe: Fase 10 (pulido y calidad; bloque F)

- **Rama:** `fase-10-pulido` (desde `main` en `0eabe29`), en la carpeta del proyecto. La entrega **10.a** (las lunas recreadas, segunda vuelta, D48) la hace otra sesión en paralelo, en su worktree (`.claude/worktrees/fase-10a-lunas`, rama `fase-10a-lunas`), y esta la junta.
- **Fecha:** 2026-11-09 (en curso)
- **Estado:** en curso. Hecho: el paso previo, la 10.b, la 10.c entera (con la revisión final de diseño, `docs/revisiones/fase-10-critica.md`, y sus capturas antes y después), de la 10.d el zum al 200 %, de la 10.e los decimales, S5, Shackleton y Titán, de la 10.f el código (S2, el bloom fuera, el Sol en el móvil, el ritmo de pintado, la 8K y el arranque del 3D troceado) y la 10.g (Lighthouse en el CI: las fichas y las demás páginas, de 0,96 a 1,00; el explorador, 0,76, como aviso; §4.22). Los e2e, en verde (§4.21). Falta: las medidas de §5 con el equipo libre, juntar la 10.a, la comprobación de los textos, la 10.h y el cierre.
- **La regresión visual (10.h)**, sin referencias todavía: guardada aparte, en la rama local `fase-10h-regresion` (un commit sobre `3cb1b72` con `e2e/regresion.spec.ts` y el proyecto móvil de `playwright.config.ts`). Se junta en la 10.h, después de la 10.a.

## 0. Plan

Lo que trae la fase: las tareas 1–14 del plan (§6, «Fase 10»), con lo de la revisión del bloque S (`docs/revisiones/bloque-S.md`): S2, S3, S8, S9 y S11, las decisiones 4 (los textos) y 6 (los defectos de la 9c) y las propuestas de la 9b. Se trabaja **por entregas**, cada una con sus commits, sus medidas y este informe al día. El orden lo fija la revisión del bloque S: primero las peticiones de Iván; la regresión visual, al final, después de juntar la 10.a; y las medidas de rendimiento, con el equipo libre (cuando la sesión de la 10.a haya terminado).

| Entrega | Tareas | Qué |
|---|---|---|
| Paso previo, en `main` | Decisión 5 | El PR 4 de Dependabot (seis herramientas, con jsdom 31): el test de las etiquetas que comparaba el `transform` como texto, `@dependabot rebase`, el CI en verde y la fusión; después, `npm ci`. Los documentos, al día (el plan, `PROMPTS.md`, `PENDIENTES.md`, `CLAUDE.md` y el `DIARIO`) |
| **10.b** · Las peticiones de Iván | 8 (S8, S9 y S11) | El Sol sin girar; «‹ Sistema solar», un botón reconocible, y la pestaña «Sistema solar» que vuelve a la vista general; el margen de la nota bajo «Ver en 3D». Capturas antes y después |
| **10.c** · Diseño e interfaz | 8 (S3 y lo demás), 11 | El radar de Venus con el color de las Venera (D49); los defectos que dejó la crítica de la 9c (decisión 6); las propuestas de la 9b (el rótulo de Saturno, la precarga del recorrido y los nombres de España) y de la fase 8 (el cielo con solo sus texturas, el resplandor de día, el Sol rojo junto al horizonte y el encuadre de la sombra a la puesta); la revisión final con `impeccable` y `web-design-guidelines` |
| **10.d** · Accesibilidad y resiliencia | 1, 2 y 3 | Las zonas táctiles (≥ 44 px) y el móvil en todas las vistas; sin WebGL y con el contexto perdido; `prefers-reduced-motion` en todo; axe en todas las rutas, el contraste, el foco, el zoom al 200 % y el lector de pantalla (lo que se puede comprobar desde aquí, con notas) |
| **10.e** · Contenido | 12 (los ceros finales), 13 y 14 | Los decimales de las fuentes (`digits`); la comprobación de los 540 textos por un subagente sin el contexto de la sesión (decisión 4), con S5 y el subtítulo de Shackleton, **después de juntar la 10.a** (que toca los textos de las lunas); el terminador de Titán frente a otra foto de Cassini |
| **10.f** · Rendimiento | 4, 9 y 12 (el código propio inicial) | S2 (la Tierra sin la bola azul lisa), la 8K de la Tierra más barata, el bloom fuera, la frecuencia de pintado según el movimiento, la precarga de la fuente del H1, la hidratación incremental, el Sol de cerca en el móvil (10 fotogramas por segundo en el nivel bajo y un hash entero). **Las medidas (la tabla de §5), con el equipo libre** |
| **10.g** · Lighthouse en el CI | 7 y 12 | `@lhci/cli` con sus tres condiciones (los informes, solo en el disco del CI; contra el build local; con el Chromium de Playwright) y los presupuestos de §5, con la muestra de `scripts/measure-pages.mjs` |
| **Juntar la 10.a** | 0 | Cuando la sesión de revisión haya mirado sus capturas: `--no-ff`, como la 9b, con su nota de entrega en este informe |
| **10.h** · Regresión visual | 6 | `toHaveScreenshot` con `?captura=1` en las vistas clave, con las referencias generadas en el CI (Linux) y el Playwright del PR 4 |
| Cierre | — | `npm run check`, los e2e, el informe completo, la revisión por subagente, sus correcciones, la fusión y el resumen del bloque F en el `DIARIO` |

**Lo que no depende de esta sesión** (no bloquea; `PENDIENTES.md`): el visto bueno de Iván en su móvil y en un iPhone (tarea 5), la lista corta de textos dudosos y la prueba con un lector de pantalla de verdad, si la de aquí no basta.

### 0.1 El reparto con la sesión de la 10.a

Como en la 9b, por archivos (la lista, en la revisión del bloque S): **la 10.a** lleva `scripts/lib/moon-*`, la parte de las lunas de `scripts/build-textures.mjs` y de `scripts/measure-moon-maps.mjs`, `scripts/capture-moon-views.mjs`, las texturas de las lunas en `public/textures/`, `docs/datos/recreacion-lunas.md`, sus capturas (`docs/informes/img/fase-10/lunas-*`) y, de lo compartido (`FUENTES.md`, `/creditos`, las fichas de las lunas y `assets-src/`), solo las filas y los textos de las lunas. **Esta sesión** no los toca. Los puertos: los de por defecto aquí (`CAPTURE_PORT` 4340 y `E2E_PORT` 4391); la 10.a, 4360 y 4411.

## 1. Resumen

(En curso.)

## 2. Criterios de aceptación

(En curso.)

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| Paso previo: el PR 4 de Dependabot | hecha | El test de las etiquetas, en `main` (`0eabe29`): compara los números del `translate3d`, no el texto (jsdom 31 lo serializa como CSSOM, `translate3d(100px, 200px, 0px)`); comprobado con jsdom 30 (en el proyecto) y con jsdom 31 (en una carpeta aparte). `@dependabot rebase` (10:40 UTC) no se atendió en 45 minutos: la rama del PR se rebasó desde GitHub (`gh pr update-branch --rebase`). Con su CI en verde (lint, tests, build y e2e), fusionado (`3ac86d7`), y `npm ci` (jsdom 31.0.0, Playwright 1.65.0, Vitest 5.1.0; el Chromium de Playwright 1.65, instalado). Junto a la rama (`27a40b7`): 817 tests en verde |
| Paso previo: un e2e intermitente en `main` | hecha | El CI de `main` del 09-11 (`0eabe29`) falló dos veces seguidas en `fallos.spec.ts:38` («Reintentar»: el tiempo, 0 en 1,5 s). La causa, en la traza: tras «Reintentar», el motor nuevo estaba listo y reproduciendo, pero la página no pintó ningún fotograma en los 2 s siguientes (SwiftShader, con el motor nuevo compilando y subiendo texturas); a las velocidades rápidas el reloj del motor avanza con los fotogramas (a propósito). Se espera con `expect.poll` a que avance (`cfce0e5`, en `main`); su CI, en verde. `camara.spec.ts:34` no ha vuelto a fallar |
| Paso previo: los documentos | hecha | En `main` (`fa445ce`): D48 y D49 en §1; `@lhci/cli` en la lista cerrada y en `CLAUDE.md`; el bloque S ✅; la fase 10 con la 10.a, S2, S3, S8, S9, S11, las decisiones 4 y 6 y las propuestas de la 9b; el backlog 15 y 17; la fase 11 con S6 y el panel de rendimiento; `PROMPTS.md` y `PENDIENTES.md` |
| 10.b · S8, el Sol sin girar | hecha | §4.1 |
| 10.b · S9, «‹ Sistema solar» | hecha | §4.2 |
| 10.b · S11, el margen de la nota | hecha | §4.3 |
| 10.c · S3 y D49, el radar de Venus con el color de las Venera | hecha | §4.4 |
| 10.c · Los defectos de la crítica de la 9c (decisión 6) | hecha | §4.5 |
| 10.c · Las propuestas de la 9b: el rótulo de Saturno, los nombres de España y la precarga del recorrido | hecha | §4.6, §4.7 y §4.9 |
| 10.f · S2, la Tierra sin la bola azul lisa | hecha | §4.8 (adelantada: es un defecto que se ve, no una medida) |
| 10.c · Las propuestas de la fase 8: el cielo con solo sus texturas, el resplandor de día, el Sol rojo junto al horizonte y el encuadre de la sombra a la puesta | hecha | §4.10, §4.11 y §4.12 |
| 10.c · La revisión final de diseño (impeccable y las Web Interface Guidelines), con sus capturas | hecha | §4.13 y §7 |
| 10.e · Los decimales, S5, Shackleton y el terminador de Titán | hecha | §4.14, §4.15 y §4.20; la comprobación de los textos, después de la 10.a |
| 10.f · El bloom fuera, el Sol en el móvil, el ritmo de pintado y la 8K | hecha (el código) | §4.16–§4.19; las medidas de §5, con el equipo libre |
| Los e2e completos | hecha | §4.21: los tres que fallaban eran pruebas desfasadas |
| 10.g · Lighthouse en el CI, con el arranque del 3D troceado y el CLS de la entrada del recorrido | hecha | §4.22: el explorador, como aviso (0,76); propuesta en §10 |
| 10.d · El zum al 200 % | hecha | §4.23 |
| 10.g · Lighthouse en el CI: la causa y la decisión | hecha | §4.24: la causa, SwiftShader en las páginas de contenido; sin él, siete fichas de nueve a 0,99–1,00, pero Titán (0,94) y Marte (0,95) no cumplen de forma estable: el rendimiento, como aviso en el CI |
| Juntar la 10.a | hecha | §4.25 (`49676a2`) |
| 10.f · Las medidas de §5, con el equipo libre | hecha | §4.26: todo dentro de §5; Fobos en alto, el ritmo lento con su giro congelado por el aliasing, no falta de GPU |
| El aviso de presupuesto de `body-panel.css` | hecha | §4.27 |
| 10.e · La comprobación de los textos (decisión 4) | hecha | §4.28: 551 textos, 8 correcciones y 10 dudas para Iván (`docs/revisiones/textos.md`) |

## 4. Lo hecho, entrega a entrega

### 4.1 S8: el Sol del explorador, sin girar (`21f656f`)

Iván, el 08-11: «El sol está rotando, no debe rotar». El disco giraba con la rotación de la IAU (W = 84,176° + 14,1844°·d): a 3 días/s, unos 42° por segundo, y a 1 h/s, una vuelta en unos 10 minutos; y las manchas derivaban, además, con la rotación diferencial.

- **El disco, con su eje y sin girar sobre él:** `bodyFixedToEclWithoutSpin` (en `ephemeris/orientation.ts`, donde vive toda orientación) da el polo de la IAU del instante con el meridiano 0 quieto en el de J2000 (W₀ = 84,176°). La escena lo usa para el Sol con `VISUAL_CONFIG.sun.spins` en `false`, con su motivo; sin giro, el Sol tampoco tiene giro que «aliasar» (§4.5). Test: el mismo polo que con el giro, el meridiano igual tras 10 días (con el giro, 141,8°) y, en J2000, el de la IAU.
- **Las manchas, quietas:** sin la deriva de la rotación diferencial. Nacen y se apagan con su calendario (la misma fecha, las mismas manchas), en su sitio. La ley de Lößnitz et al. (2025) deja de usarse (queda en git): fuera del código y de `/creditos`; en `FUENTES.md`, «hasta la fase 10».
- **Los rayos del halo** no giraban con el disco: su ángulo es el del polo en pantalla, que no cambia con W.
- **Se queda el fluir lento de la superficie** (con el reloj de pared, como lo aprobó Iván en la segunda vuelta de la 9b.f).
- **Test del motor:** a 3 días/s en la vista general y a 1 h/s de cerca, durante 2 s, el cuaternión del Sol no cambia (a 10⁻¹²) y cada mancha de la misma vida sigue en su sitio; el de la Tierra, sí cambia.
- **Medido** con `scripts/capture-sun-motion.mjs --giro` (nuevo): el Sol de cerca, con movimiento reducido (el fluir y los bucles, quietos: lo que cambie es el giro) y el tiempo en marcha 6 s; la diferencia media en el disco (de 0 a 255):

  | | Antes | Después |
  |---|---|---|
  | 1 h/s | 7,82 | **0,01** |
  | 3 días/s | 18,22 | **0,41** |

  Lo que queda a 3 días/s son las manchas que nacen y se apagan en esos 18 días simulados, en su sitio (capturas `antes-sol-giro-3d-t0/t6` y `despues-sol-giro-3d-t0/t6`): antes, la superficie entera había cambiado de sitio. Fuera del disco, 0,12 en las dos (el fondo).
- **Los textos, al día:** «Lo que es ilustrativo» («No gira sobre su eje, para que se vea quieto (el de verdad da una vuelta en unos 25 días, como dice su ficha)»; la ficha da 609,12 h, de la NSSDCA), `/creditos`, `FUENTES.md` y `revision-textos.md` (regenerado). La ficha del Sol no habla del giro de las manchas.

### 4.2 S9: «‹ Sistema solar», un botón reconocible (`e7d52de`)

Iván, el 08-11, con una captura de escritorio con la Tierra elegida: «Haz más reconocible el botón de volver al sistema solar; recuerda, queremos una interfaz limpia y sencilla». Era un texto pequeño y gris sobre el título (`min-height` de 24 px, sin fondo), que se leía como una miga.

- **El botón, con el lenguaje de «Índice» y «Controles»** (`.control`): el fondo elevado (`--color-surface-raised`), una flecha (un trazo de 1,75 con extremos redondeados, como los iconos de ESTILO §6) y «Sistema solar», en el texto; **44 px de alto también en escritorio**; con el ratón encima, el fondo de `.control:hover`; y con el foco, el anillo de latón de siempre. En la portada, en la Tierra y en la Luna (es la misma clase). Sin controles nuevos.
- **La franja del móvil:** el mismo botón. En el teléfono (por debajo de 480 px), solo la flecha, como en la franja del cielo (la decisión de Iván del 08-11 para el cielo: «‹», su título y el lugar), con el nombre accesible «Volver al sistema solar» y su `title`: con el texto, el nombre del cuerpo no cabía (a 390 px, «Ti…»).
- **La pestaña «Sistema solar», con un cuerpo elegido, vuelve a la vista general** (antes no hacía nada; backlog 15): hace lo mismo que el botón (`ExplorerFocus.back()`: la vista general y el foco en la ficha del cuerpo) y su dirección es la de la vista general sin el cuerpo (abrirla en otra pestaña también vale). Desde la Tierra o la Luna, y sin cuerpo, es el enlace de siempre. Test (`view-switcher.spec.ts`).
- **Capturas** (`scripts/capture-requests.mjs`, nuevo; `antes-` y `despues-volver-*`): a 1280 y 1440, la pantalla y el detalle en reposo, con el ratón encima y con el foco; a 390, la pantalla y la franja.

### 4.3 S11: la nota bajo «Ver en 3D», con aire (`a2b6bf8`)

Iván, el 08-11, con una captura de `/sol`: «Corrige márgenes». La línea del color realzado (el Sol) o del mapa (las lunas recreadas) iba pegada al botón: `.body__note` no tenía margen y esta nota, a diferencia de las demás, va justo después del botón. Ahora, `.body__view + .body__note` lleva `margin-top: var(--space-4)` (16 px), el mismo aire que hay entre el resumen y el botón (el margen de los párrafos). Solo esa nota: las de «Hoy» no cambian. Capturas `antes-` y `despues-nota-sol-*` y `nota-oberon-*`, a 1280 y a 390.

### 4.4 S3 y D49: el radar de Venus, con el color de las Venera 13 y 14 (`965695c`)

En gris, Venus «Bajo las nubes» se confundía con la Luna. D49: el color de las fotos de las Venera 13 y 14, como el globo de Magellan de la NASA (PIA00104, cuyo pie dice «The simulated hues are based on color images recorded by the Soviet Venera 13 and 14 spacecraft»).
- **Medido, no inventado:** `scripts/measure-venera-tint.mjs` baja PIA00104 a una carpeta temporal del sistema (no entra en el repo; solo se mide) y mide su cromaticidad lineal (RGB / luminancia Rec. 709) en los percentiles 5, 50 y 95 de la luminancia del disco (el 60 % central): pardo rojizo en lo oscuro (2,934; 0,521; 0,049), naranja en el medio (2,184; 0,743; 0,056) y naranja amarillento en lo claro (1,571; 0,915; 0,158). Y los mismos percentiles de nuestro mosaico (el de 2k: 0,1384, 0,2195 y 0,3663; el de 1k y el de 4k, a menos de 0,006).
- **En el shader de Venus** (`TLS_RADAR`, solo en su material): cada valor del mosaico toma el tono de PIA00104 en su mismo percentil, **sin cambiar su brillo** (cada color de la rampa tiene luminancia 1; test). `VISUAL_CONFIG.venus.radar.venera`, con su fuente.
- **El aviso:** «Imagen de radar de la sonda Magellan, con el color de las fotos de las Venera 13 y 14: no es lo que verían tus ojos». Lo mismo en `/creditos` (con el enlace a PIA00104), «Lo que es ilustrativo» y `FUENTES.md`.
- **Capturas** antes y después, en escritorio y en el móvil (`antes-` y `despues-venus-*-radar.webp`): el tono de PIA00104; el nuestro, más claro, porque conserva el brillo de Venus calibrado.

### 4.5 Los defectos que dejó la crítica de la 9c (decisión 6 de la revisión del bloque S)

| Defecto | Arreglo | Commit |
|---|---|---|
| Al volver de «Ficha completa», la fecha vuelve a hoy | `ExplorerMemory` (en `core/`, sin dependencias; solo la usa la sesión diferida): al salir del explorador se guarda la fecha, si se reproducía y el sentido; al volver sin fecha en la URL, se sigue ahí (una sola vez). Un enlace con su fecha manda. Test | `0b3ee34` |
| El campo de la fecha acepta 2150 y avisa lejos del campo | El rango, «Entre 1900 y 2100.», siempre a la vista y en la descripción del campo; el aviso, justo debajo de la fecha y la hora (antes, al final de «Controles»). Sigue sin avisar a medio escribir (su test lo fija) | `f722580` |
| En la vista Tierra del móvil, «España» queda cortada | Las cinco vistas y «Más», sin desplazar: en dos filas a 390 px (tres por debajo de unos 380). El panel plegado pasa de una fila (60 px) a dos (108 px) | `fbdd0c1` |
| En la tableta, la ficha deja vacía la mitad derecha y la fila de lunas no se alinea | La hoja, en dos columnas (el resumen y, a su derecha, los datos, también en reposo); las pastillas de las lunas, algo más apretadas: con Saturno, la fila va de 170 a 718 px y la de planetas, de 170 a 715 (antes, de 128 a 760) | `99dbcd2` |
| «Cara visible» cambia la fecha y pausa sin avisar | Las vistas y las paradas de la Luna dicen lo que hacen con el tiempo: «La fecha pasa a la luna llena más cercana (24 de noviembre de 2026, 15:54) y el tiempo se pausa», a la vista en el panel (también plegado) y al lector. Tests y e2e | `7edb7dd` |
| El Índice del móvil tapa la barra | El Índice sube como la ficha, encima de la barra de tiempo, que queda a la vista y a mano. e2e | `a87ffd9` |
| En el móvil, la presentación muestra «Saturno» cuatro veces y se pliega al primer Tab | Durante el recorrido de la primera vez, sin los nombres del 3D (los dice su texto; vuelven al acabar). Tab ya no pliega la presentación: es una tecla pasiva desde la 9c (comprobado en escritorio y en el móvil, pulsando Tab hasta el lienzo); el plegado a los 8 s deja el texto en el árbol accesible | `f92fde1` |
| Falta contexto en «Escala», «Luz rasante» y «UA» | Una línea con las dos escalas en «Controles»; qué es una UA en la nota del Índice («1 UA, unos 150 millones de km, es la distancia media de la Tierra al Sol») y en la ficha (`<abbr>`); las vistas de la Luna, con su texto en el `title` | `d1b6a6f` |
| `/eclipses`: el aviso de no mirar el Sol sin filtro no destaca; la fecha, apretada en el título | El aviso, aparte, con su icono y el borde de acento; la fecha, con aire | `ccc00d8` |
| `/lunas`: el cuadrado oscuro de las miniaturas y los decimales dispares | Las miniaturas, redondas (como las fichas del explorador); el radio de las listas, con los mismos decimales (entero desde 100 km, uno por debajo; el exacto, en la ficha) | `ccc00d8` |
| `/planetas/marte`: las lunas, enlaces de texto; a 1440 px, un hueco a la derecha | Las lunas de su planeta, en tarjetas con miniatura (la de la página, marcada); la columna de la ficha, centrada | `ccc00d8` |
| El 404, seco | Lo que pasa («Esta dirección no está en el atlas…») y las secciones del sitio a mano | `ccc00d8` |
| (S9) La pestaña «Sistema solar» no hace nada con un cuerpo elegido | §4.2 | `e7d52de` |

Los e2e de las páginas, de accesibilidad (axe en las 40 rutas, en escritorio y en el móvil), del móvil, de la Luna y del recorrido, en verde con estos cambios.

### 4.6 El rótulo de Saturno, justo por encima de sus anillos (`925bcba`)

Propuesta de la 9b (§10 de su informe): el hueco de Saturno para su nombre era el radio del anillo A en todas direcciones (`LABEL_EXTENTS`), así que a su derecha el nombre quedaba más allá de los anillos, lejos del planeta.

- **Lo que suben los anillos en pantalla, frame a frame:** la elipse de un anillo de radio R con su polo n, vista con la cámara, tiene de alto R·√(sen²ψ + (n·dentro)²·cos²ψ) (ψ, lo que se aparta de la vertical el polo proyectado). El motor la calcula con el polo de Saturno del frame (`ringLabelExtents`) y la colocación sin solapes la usa (`verticalExtents`): los cuerpos con anillos prueban **primero arriba**, justo por encima de los anillos, y luego derecha, izquierda y abajo, como los demás. Test (`labels.spec.ts`): con los anillos casi de canto, el nombre va justo encima de ellos (a 1,2 radios del centro y no a 2,27, su radio) y, si arriba no cabe, a su derecha, como antes.
- **Capturas** (`capture-requests.mjs rotulo`), a 1440 y a 390, la pantalla y el detalle: antes, «Saturno» a la derecha de los anillos; ahora, encima, junto al planeta.

### 4.7 Los nombres de los lugares de la vista «España» (`2498e1d`)

Propuesta de la 9b: los puntos de los lugares del cielo desde España, en la vista guiada «España» de la Tierra, no decían qué eran.

- **Junto a cada punto, su nombre corto** (`placeMapLabel`, test): «Montsec», «Fabra», «Roque de los Muchachos», «Teide», «Calar Alto», «Puerta del Sol» (Madrid) y «Fraga». Usan la colocación sin solapes de los nombres de los cuerpos (una capa propia, `placeLabels`), con el Montsec primero (el lugar por defecto del cielo); sin los de la cara oculta de la Tierra; sin clic (`pointer-events: none`: los puntos no son botones y el cielo de cada lugar se elige en `/cielo`).
- Solo en la vista «España» (con los marcadores). Test del motor: con los marcadores salen sus nombres (el Montsec y el Teide, siempre), un clic en ellos no elige nada y sin los marcadores no queda ninguno.
- **Capturas** (`antes-` y `despues-espana-1440` y `-390`).

### 4.8 S2: la Tierra ya no entra como una bola azul (`52fdb23`)

Revisión del bloque S, S2: entrando directo en `/explorar/tierra`, la Tierra era una bola azul lisa durante unos segundos (a los 9 s seguía así; a los 17 s, con su mapa).

- **La causa:** al enfocar la Tierra se pide su 8K. La 1k de la vista general, si aún estaba en camino, se tiraba al llegar (ya no era la pedida) y, entrando directo, ni se pedía. Mientras, la Tierra tiene su color esquemático: azul, con las nubes y el contorno del mapa del océano.
- **El arreglo** (`world.ts`): una textura menor que la pedida que llega cuando el cuerpo aún no tiene ninguna **se usa de paso** hasta que llega la grande (y entonces se suelta), y entrando directo en una vista se pide también la de la vista general. Vale para cualquier cuerpo. Test del motor.
- **Medido** con `scripts/capture-earth-entry.mjs --serie --8k-lenta --escritorio` (nuevo): una medida por segundo durante 20 s desde que se va el póster, con la 1k 4 s más lenta y la 8K 12 s (sin depender de la red), en pausa y con una fecha fija; la métrica, la parte de píxeles de tierra en el centro del disco (el rojo por encima del azul). **La Tierra azul, sin su mapa de día: 11–12 s antes y 3 s ahora** (hasta que llega la 1k). Con la red de §5 y sin caché, el 3D tarda unos 20 s y llega ya con su mapa, antes y ahora. Capturas `antes-` y `despues-tierra-entrada-serie-{0,2,5,10}s`.

### 4.9 La precarga del recorrido de la primera vez (`72beade`)

Propuesta de la 9b: el recorrido llega a la Tierra y a la Luna a los pocos segundos y sus texturas grandes empezaban a bajar al enfocarlas.

- Al empezar el recorrido, mientras se ve Saturno, se traen **por la red y sin subirlas** las texturas de primer plano de la Tierra y de la Luna (`SceneEngine.prefetchCloseUps`, `World.prefetchCloseUp` y `TextureSource.prefetch`: `fetch` con prioridad baja y leída entera). Quedan en la caché del navegador (las texturas, con su hash en el nombre, son inmutables un año, `_headers`) y la carga de siempre las encuentra allí al enfocarlas. Sin VRAM de más: no se suben hasta entonces.
- Con S2 (§4.8), la Tierra ya no llegaba azul (la 1k está en memoria desde la vista general); con esto, nítida antes. Tests del motor, de la sesión y del recorrido. No hay medida de tiempo: depende de la red de cada uno; lo que se comprueba es que se piden al empezar y que no se suben.

### 4.10 El cielo desde España, solo con sus texturas (`3751ebe`)

Propuesta de la fase 8 (sugerencia 13 de su revisión): en el cielo se pedían las texturas de la vista general de los 30 cuerpos, que no se ven.

- `World.setSkyOnly`: en el cielo, solo la Vía Láctea y la Luna (las usa `SkyScene`; la Luna, con el nivel de la vista general); lo demás se suelta. Entrando por `/cielo`, el espacio no pide las suyas; al volver al espacio, se piden otra vez. Test del motor.
- **Medido** (escritorio, `/cielo?captura=1` el 1-11-2026 a las 22:00): **38,9 MB de VRAM y 12 texturas antes; 14,2 MB y 2 ahora** (la Vía Láctea de 2k y la Luna de 1k). Al pasar al espacio (tecla 1), 38,9 MB, como antes; de vuelta al cielo, 14,9 MB.

### 4.11 La luz del cielo de día y el Sol al ponerse (`b66a581`)

Propuesta de la fase 8 (sugerencia 14 de su revisión): de día, el resplandor bajo un Sol alto saturaba a blanco unos 600 px del horizonte, y el Sol, al ponerse, era un punto blanco. La luz del cielo de la fase 8 es **ilustrativa** (colores de referencia a varias alturas del Sol); los arreglos siguen ese criterio, en `VISUAL_CONFIG.sky`:

- **El resplandor del horizonte del lado del Sol** (`band`), según la altura del Sol (`glow.band`): entero en la puesta (hasta 3°) y poco con el Sol alto (0,25 a 20° y 0,15 desde 40°). Antes, de día, su color crema se sumaba al horizonte blanquecino: en el horizonte justo debajo del Sol, 1,47 en el rojo (blanco). Test: con el Sol a 20°, 33°, 45° y 71°, ese punto queda por debajo de 1 en los tres canales.
- **El disco del Sol, con un color según su altura** (`sunDisc`): blanco desde 20° y cada vez más naranja hacia el horizonte (pierde antes el azul que el verde; test). Para que se viera, hacía falta otra cosa: la cúpula se suma encima del disco y, junto al Sol, ya está saturada, así que cualquier color salía blanco. Ahora **la cúpula no suma su luz dentro del disco**, salvo donde lo tapa la Luna (el bocado de un eclipse sigue teniendo el color del cielo).
- **De rebote, los eclipses parciales con el Sol bajo se ven:** el del 12-08-2026 desde Fraga a las 18:20 UTC (el Sol a 6,6°) era blanco sobre blanco; ahora, un Sol creciente. La totalidad, igual.
- **Capturas** (`capture-requests.mjs cielo`, solo el lienzo a 1600 × 900): `cielo-dia` (el mediodía del 1-11 hacia el sur, la captura de día de la fase 8), `cielo-verano` (el Sol a 71°), `cielo-puesta` (el Sol a 1,4°), `cielo-puesta-cerca` (a 3,1°, con un campo de 8°) y `cielo-eclipse-parcial` y `-total` (Fraga), antes y después.

### 4.12 «Ver en 3D» de un eclipse de Sol a la puesta (`6f26518`)

Propuesta de la fase 8 (sugerencia 15 de su revisión): en el máximo del 12-08-2026 visto desde España, la sombra cae junto al terminador; vista desde encima, en el centro de la imagen, se confundía con la noche.

- `moonShadowView` (`ephemeris/eclipse.ts`, función pura con tests): si en el punto de la sombra el Sol está a menos de 20°, la cámara se va hacia el punto subsolar lo que le falta para tenerlo a 20°. El terminador queda a un lado y la sombra, sobre el lado de día. Desde Fraga (18:29:29 UTC), el Sol está a unos 8° en el centro de la sombra y la cámara se desplaza unos 12°. En el máximo global (el Sol a 26°), como antes: el test de la sesión sigue a menos de 0,2° del punto de la NASA.
- **Capturas** (`capture-requests.mjs sombra`): `sombra-fraga` antes y después y `sombra-maximo` (el máximo global, que no cambia), como pedía la revisión.

### 4.13 La revisión final de diseño (tarea 8): impeccable y las Web Interface Guidelines

En `docs/revisiones/fase-10-critica.md`. Como en la 9c, la crítica de impeccable con dos agentes independientes. A hizo la revisión de diseño y las heurísticas: **31/40**. B pasó el detector y midió en el navegador: axe sin violaciones en 57 estados, el foco visible en las 1272 paradas y nada desbordado ni tapado. Esta sesión repasó el código con las reglas de las Web Interface Guidelines. Lo arreglado:

- **Las Web Interface Guidelines** (`2e7fc84`, `e541841`):
  - `<meta name="theme-color">`: la barra del navegador del móvil salía clara sobre un sitio oscuro;
  - `touch-action: manipulation` en los controles: en iOS, dos toques rápidos en «+» o en los pasos del año ampliaban la página;
  - el resaltado del toque, en latón;
  - el nombre del sitio y el del autor, con `translate="no"`.
- **[P1] El cielo de día** se abría vacío en el móvil, con una línea que nombraba cuerpos que no se ven. El cielo va en tiempo real (D33), así que no se abre solo en la noche. Pero ahora la línea dice «Ahora es de día · noche cerrada desde las 19:12». Y el panel lleva el botón «Ver el cielo de esta noche», que lleva al final del crepúsculo astronómico, en pausa. Tests y e2e.
- **[P1] La llegada desde «Ver en 3D» de un eclipse** no decía qué se veía y no tenía vuelta.
  - El enlace lleva el tipo de eclipse y el lugar. Al llegar, un aviso dice «Eclipse total de Sol del 12 de agosto de 2026, en su máximo visto desde Fraga», con «Volver a los eclipses»; se anuncia y se puede cerrar.
  - La Luna eclipsada ya no dice «100 % iluminada», sino «eclipse total: en la sombra de la Tierra» (`lunarEclipsePhase`, probada con los tres eclipses de Luna de la NASA del fixture).
- **[P2] La parada de España del recorrido:** los nombres de los lugares se ven también durante el recorrido (los de los cuerpos, no, como decidió la 9c). Su rótulo, sin la lista: «España y los lugares del cielo».
- **El favicon era el escudo de Angular.** Ahora es una marca propia: el Sol en latón, su órbita y la Tierra con su Luna, sobre la tinta del sitio (`public/favicon.svg`). Lleva el ICO de 16, 32 y 48 px y el `apple-touch-icon` (`scripts/build-icons.mjs`).
- **Menores de A:**
  - «Hacia atrás» se ve en escritorio, junto a la zona («UTC · hacia atrás»; test);
  - el pie de las páginas ya no se corta a 1440;
  - la entradilla de la portada ya no repite la línea de autoría.
- **[B] El fallo de foco:** en la vista Luna del móvil, «Luz rasante» se enfocaba casi oculto, bajo el fundido de la fila (WCAG 2.4.7). `revealInRow` y la directiva `RevealFocus` desplazan la fila hasta verlo entero, fuera del fundido; la fila de fichas usa lo mismo, que arregla otro menor de B. Tests.
- **Menores de B:**
  - la entradilla de `/creditos`, con la medida de lectura (iba a 91 caracteres por línea);
  - `text-wrap: pretty` en los párrafos, contra las palabras sueltas en la última línea.
- **Propuestas** (§10): la portada del teléfono con la cámara más cenital, la fila de fichas fuera del cielo también en escritorio, el panel del cielo en los márgenes y las 25 reglas `:hover` dentro de `@media (hover: hover)`.

### 4.14 Los ceros finales de las fuentes (tarea 12; `4a94142`)

«5,0 km/s» de la NASA salía «5 km/s». `build-body-data.mjs` guarda los decimales con los que la fuente escribe cada cifra que copia tal cual (`digits`), solo si acaba en ceros que el número pierde: 31 cifras, sin cambiar ninguna. `formatExact` los usa. También los periodos, para decidir si la cifra de la fuente va al lado. Así:

- Marte escapa a 5,0 km/s y Saturno tiene 9,0 m/s²;
- la excentricidad de Neptuno es 0,010 y el día de Venus, 2802,0 h;
- el radio de Proteo es 208,00 km, como lo escribe el JPL («208.00 ± 8.00»).

Tests de `formatExact` y de las fichas.

### 4.15 Los textos: S5 y Shackleton (`de9365c`, `7389119`)

- **S5:** `body-texts.json` no lleva el tipo de cada cuerpo. El índice de `docs/revision-textos.md` filtraba por un `kind` que no había y decía «en 0 lunas»; ahora dice 19. Además, la línea del color del Sol salía como «Sobre su mapa». El tipo se toma ya de los datos.
- **La lista, regenerada** con lo nuevo de la fase: el 404, la nota de la UA, el rango de la fecha y la línea de las escalas. También el aviso de los eclipses, que ahora va aparte y se había caído de la lista. 551 textos.
- **El subtítulo de Shackleton** dice ahora por qué se ve iluminada la pared interior que mira al Sol: el explorador no dibuja las sombras del relieve (`PENDIENTES.md`).

### 4.16 El bloom del Sol, fuera (tareas 4 y 9; `044ce86`)

Llevaba apagado desde la segunda vuelta de la 9b.f, pero su código y sus pasadas seguían en el chunk del visor. Fuera:

- `sun-bloom.ts`, sus capas y su puerto en el renderer;
- su paso en el motor (compilarlo, pintarlo, soltarlo y su VRAM) y `sunOccluders`;
- `sunBloom` de los niveles y `VISUAL_CONFIG.sun.bloom`, con sus tests.

Queda en git. **El chunk de three, de 814,7 kB a 805,7 kB** en bruto (de 222,2 a 220,6 kB en gzip; build de `main` frente al de la fase): es el neto de toda la fase, con lo añadido.

### 4.17 El Sol de cerca en el móvil (tarea 4; `ddf345e`)

- **A 10 fotogramas por segundo en el nivel bajo.** Cada nivel lleva `sunFrameMs`: 50 ms en alto y medio y 100 en el bajo.
- **Hashes enteros de WebGL2** en lugar de fract(sin(x)·43758): PCG3D en la red del ruido de la superficie y PCG de un número en los rayos y los bucles (Jarzynski y Olano, 2020). Los rayos y los bucles hashean los bits del valor, que distinguen también los no enteros.

### 4.18 Pintar a la frecuencia que pide el movimiento (tarea 4; `cc05833`)

Por encima de 60 s/s se pintaba cada frame aunque casi nada se moviera (informe de la fase 3c, §10.1). Ahora, con el tiempo en marcha y nada más moviéndose, se pinta lo justo para que lo que más corre en pantalla avance medio píxel por frame, entre cada frame y 4 Hz (`frame-pacing.ts`). «Lo que más corre» es el movimiento de los cuerpos que se ven y el de la superficie de los que giran. Los FPS solo se miden a ritmo completo. Test del motor: la Luna de cerca a 1 h/s se pinta de 3 a 15 veces por segundo; la Tierra, cada frame.

### 4.19 La 8K de la Tierra, más barata (propuesta 2 de la fase 5, tarea 4; `af3a634`)

- **Sin el volteo en el decodificador:** la de día se decodifica sin `imageOrientation: 'flipY'` y el sombreado invierte v (`flipInShader`). El volteo de la 8K era una tarea de unos 105 ms en el hilo principal (informe de la fase 5, §6.1). El plan decía guardarla ya volteada: así se consigue lo mismo sin regenerar las texturas ni tocar `build-textures.mjs`, que comparte la 10.a.
- **Sin su `ImageBitmap` tras subirla:** las de 8K de la Tierra y de la Luna (128 MiB cada una) lo sueltan al subirse. Si se pierde el contexto, el mundo las vuelve a pedir. Test.

### 4.20 El terminador de Titán, con otra foto de Cassini (tarea 14; `4499f4a`)

La 9b ajustó el oscurecimiento hacia el terminador, min(1, μ₀/μ)^e con e = 1,15, con PIA06230 (fase de 56°). Ahora se comprueba con **PIA06183** («Hazy Days on Titan», 15-02-2005), en color natural y con el disco entero. Su pie dice: «Sun-Titan-spacecraft, or phase, angle of 20 degrees». La buscó un subagente entre los pies de las fotos de Titán del Photojournal. `measure-titan-terminator.mjs --foto=PIA06183` la baja a `assets-src/referencias/`, que no entra en el repo, con el disco medido en la foto.

| | PIA06230 (56°) | PIA06183 (20°) |
|---|---|---|
| Sin el oscurecimiento (e = 0) | 9,2 % | 10,7 % |
| Con el de la escena (e = 1,15) | **2,4 %** | **7,4 %** |
| El mejor para cada foto | e = 1,15: 2,4 % | e = 2,05: 6,8 % |
| La captura de la escena frente a la foto | 8,4 % | 13,4 % |

El modelo mejora también con otra fase y queda a 0,6 puntos del mejor exponente de esa foto: no se toca. Un exponente por fase sería ajustar de más con dos fotos. Lo que separa la captura de la foto a 20° no es el terminador: es la exposición del primer plano, el halo de la neblina y el tone mapping.

### 4.21 Los e2e completos (`6cc1f2a`, `ff3d5ca`)

Con el build de `3cb1b72`: 135 bien, 1 saltado y 3 fallos. `tiempo.spec.ts:101`, que falló en la tanda anterior, pasó. Los tres fallos eran **pruebas desfasadas**, no fallos del explorador:

- `camara.spec.ts:34`: desde los nombres de los lugares de España (§4.7) hay dos capas `.scene-labels`, y el modo estricto de Playwright fallaba con dos. La prueba mira la de los cuerpos.
- `cielo.spec.ts:279`: «Ver en 3D» lleva también el tipo de eclipse y el lugar (§4.13). La prueba lo espera y, además, comprueba el aviso de la llegada (qué eclipse es y desde dónde) y «Volver a los eclipses» con el mismo lugar, que no tenían e2e.
- `recorrido.spec.ts:125`: el rótulo de España ya no lleva la lista de lugares (§4.13). La prueba mira el rótulo nuevo y que los nombres se ven en el mapa.

Con los cambios del arranque del 3D (§4.22), la tanda completa otra vez: 137 bien, 1 saltado y 2 fallos.

- `movil.spec.ts:341` pide la franja fina del móvil (≤ 49 px), y el primer arreglo del CLS la había subido a 3.5rem. Se rehízo al revés (§4.22).
- `tiempo.spec.ts:101` volvió a fallar: es el intermitente. La causa, en la traza: el panel «Controles» se lleva el foco al abrirse, en su evento `toggle`, que llega en otra tarea. Si la prueba enfocaba la fecha antes, el panel se lo quitaba y las cifras tecleadas iban a los atajos («3», la vista Luna; «2», la Tierra). Esos atajos cerraban el panel y la fecha no cambiaba. `openControls` espera ahora a ese foco.

### 4.22 Lighthouse en el CI (10.g; `706b662`, `f702663` y `63dab9b`, `c641696`, `21797d1`)

**Lo de partida** (la tanda anterior, en local): las 9 páginas de contenido, ≥ 0,96; el explorador, **0,66**. Su LCP simulado era de 3,8 s, el SI de 5,1, el TBT de 860 ms y el CLS de 0,051. La sesión de revisión decidió trocear antes el arranque del 3D y mirar el CLS de la entrada del recorrido.

**Dónde se iba el tiempo.** Una traza con la CPU a ×4 (CDP), atribuida con los source maps del build (`ng build --source-map`, solo para medir), lista las tareas de 50 ms o más al cargar `/` sin nada guardado (con el recorrido):

| Tarea (×4) | Antes | Después |
|---|---|---|
| Crear el renderer y el mundo | 282 ms | 187 (el contexto WebGL) + 73 (el mundo) |
| El fotograma de preparación (posiciones y etiquetas) | 210 ms | 99 ms |
| Las estrellas y la compilación de los sombreados | 88 ms | ya no es larga |
| El primer fotograma, con lo que despierta | 103 ms | 60 ms |
| La primera parada del recorrido (Saturno) | 183 ms | 125 ms |
| **Suma de lo que pasa de 50 ms** | **1049 ms** | **692 ms** |

**Lo hecho:**

- **El contexto WebGL, en su propia tarea** (`createSceneEngine` cede el hilo antes de crear el mundo). `getContext` no se puede trocear: es el 82 % de esa tarea.
- **La compilación, por partes:** los hijos de la escena, con el hilo libre cada 10 ms, y lo que three hace la primera vez que usa un programa (leer sus uniformes y sus atributos), también. Además, el motor cede el hilo entre las estrellas y la compilación y entre el primer fotograma y lo que despierta: la interfaz, el recorrido y las peticiones de texturas.
- **Las etiquetas, medidas de una vez:** `LabelLayer.measure` destapaba, medía y tapaba cada etiqueta, 37 maquetaciones seguidas. Ahora es una sola. Test.
- **La tabla del brillo de la parte iluminada** (se calcula al enfocar un cuerpo, en un frame) integraba la fase llena en cada fila. Ahora lo hace una vez: la mitad de trabajo y el mismo resultado (test).
- **El CLS:** no era el recorrido. La franja del móvil (un cuerpo elegido o el cielo) medía 3rem y la cabecera, 3.5rem, así que todo el explorador saltaba 8 px al elegir un cuerpo o al volver. Lo hace también el recorrido, solo: 0,051 al entrar en Saturno y otro tanto al entrar en la Tierra. Ahora, en el explorador del móvil y la tableta, la cabecera mide también 3rem: la franja fina de la decisión de Iván se queda y las páginas de contenido no cambian. Primero se probó al revés, con la franja a 3.5rem, pero un e2e pide la franja fina. Queda **0,006**: el rótulo del recorrido al crecer.
- **El servidor local comprime como Cloudflare Pages** (Brotli o gzip; e2e en `publicacion.spec.ts`). Sin eso, Lighthouse simulaba la red con los tamaños sin comprimir: three, 806 kB en vez de 203. Era la mayor parte del SI de 5,1 s.
- **`lighthouserc.js`, con sus tres condiciones:** los informes, en el disco (`.lighthouseci/informes`; en el CI, también como artefacto del propio CI, 7 días); el build local, servido como en Pages; y el Chromium de Playwright. En el CI va con WebGL por software, como los e2e: sin GPU, el explorador no tendría 3D. `npm run lighthouse` tras `npm run build`.

**El resultado** (en local, con el equipo libre, sin ningún build ni captura de la 10.a en marcha; el móvil de Lighthouse 13.6 con su simulación; 3 cargas por página, en negrita la mediana):

| Página | Rendimiento (3 cargas) | Accesibilidad | Buenas prácticas | FCP | LCP | SI | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | **0,76** (0,72 · 0,76 · 0,77) | 1,00 | 1,00 | 0,7 s | 2,5 s | 2,8 s | 875 ms | 0,006 |
| `/planetas/marte` | **0,99** (0,99 · 0,99 · 0,99) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,3 s | 147 ms | 0,000 |
| `/planetas/saturno` | **0,98** (0,96 · 0,98 · 0,99) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,2 s | 153 ms | 0,000 |
| `/lunas/titan` | **0,98** (0,93 · 0,98 · 0,99) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,3 s | 154 ms | 0,000 |
| `/sol` | **0,96** (0,94 · 0,96 · 0,98) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,3 s | 235 ms | 0,000 |
| `/luna` | **0,99** (0,96 · 0,99 · 0,99) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,3 s | 142 ms | 0,000 |
| `/planetas` | **0,98** (0,97 · 0,98 · 1,00) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,3 s | 179 ms | 0,000 |
| `/lunas` | **1,00** (0,99 · 1,00 · 1,00) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,7 s | 88 ms | 0,000 |
| `/sobre-el-proyecto` | **0,99** (0,99 · 0,99 · 1,00) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,2 s | 125 ms | 0,000 |
| `/creditos` | **0,98** (0,97 · 0,98 · 1,00) | 1,00 | 1,00 | 0,7 s | 0,7 s | 1,0 s | 168 ms | 0,000 |

**El explorador no llega a 0,90**, así que su rendimiento va **como aviso** (`warn`) y su accesibilidad y sus buenas prácticas, como error, igual que las fichas. Con el LCP, el SI y el CLS ya en verde, lo que falta es el TBT: para 0,90 tendría que bajar de unos 300 ms. Casi todo es una sola tarea. En el Chrome recién abierto de cada carga de Lighthouse, crear el primer contexto WebGL tarda unos 210 ms observados (la traza de una carga con `--save-assets`), unos 850 ms con la CPU a ×4 de la simulación. En el arranque troceado de arriba, con un Chrome ya en marcha, son 187 ms a ×4. No se puede partir. Con WebGL por software, como en el CI, sale peor: 0,69, con un TBT de 1566 ms en una carga. La propuesta para Iván, en §10 y en `PENDIENTES.md`.

**Riesgos:**

- **Las páginas de contenido en el CI:** sus ejecutores son más lentos y el TBT simulado crece con ellos. `/sol` y `/lunas/titan` tuvieron una carga por debajo de 0,95 (0,94 y 0,93), aunque cuenta la mediana. Si el CI las deja por debajo, el trabajo sale en rojo, sin frenar la vista previa.
- **El LCP del explorador baila** de una carga a otra (2,5–5,0 s en las pruebas). Es el póster. En la carga real (local, sin limitar) se pinta a los 220–330 ms, y three termina de bajar unas veces antes y otras después. Cuando termina antes, la simulación lo cuenta como necesario para el LCP.

### 4.23 El zum al 200 % (10.d; `e027e30`)

`node scripts/check-zoom.mjs`: 1440 × 900 y 1280 × 800 al 200 % (720 × 450 y 640 × 400 px CSS, a densidad 2), en 11 rutas (las vistas del explorador, el cielo y las páginas de contenido). **Las 22, bien:** sin desborde horizontal, sin controles fuera de alcance y sin textos cortados. La primera pasada marcaba como cortados los textos de 1 × 1 px, ocultos a la vista a propósito para el lector: `.visually-hidden` (la descripción del lienzo), y las entradillas y los títulos que la franja del móvil deja solo para el lector. Ya no los cuenta.

### 4.24 Lighthouse en el CI: la causa y la decisión (10.g; `6adb2d4` y el commit del cierre)

El primer CI con el trabajo `lighthouse` (`a742e37`) salió en rojo: siete de las nueve páginas de contenido, por debajo de 0,95 de rendimiento (medianas de 0,90 a 0,93), aunque en local daban de 0,96 a 1,00. Lo pedido por la sesión de revisión, en orden:

- **El estrangulamiento de la CPU, calibrado con el `benchmarkIndex`** (la guía `docs/throttling.md` de Lighthouse): el ejecutor da **unas 2400** y el PC, **unas 2600**, las dos por encima de la franja de «sobremesa de gama alta» (de 1500 a 2000), para la que vale el ×4 de serie; y la guía pide un multiplicador más alto cuanto más arriba de su franja. Calibrar subiría el multiplicador en los dos, no lo bajaría en el CI: no es la causa. Con un índice casi igual, el hilo principal tardaba en el CI de un 25 a un 50 % más (en `/sol`, «other» 513–586 ms frente a 277–430; la evaluación de scripts, de 506 a 530 frente a 411–434).
- **La causa: SwiftShader en las páginas que no lo usan.** En el CI, Chrome iba con `--use-angle=swiftshader` en todas las páginas, para que el explorador tenga WebGL. Con él, la composición también va por software y le quita CPU al hilo principal en un ejecutor de 4 núcleos compartidos. Las páginas de contenido no usan WebGL: ahora van en su propia tanda, sin él (`LHCI_PAGES`), y el explorador, en la suya, con él.
- **La mediana de 5 cargas** en vez de 3 (la guía `docs/variability.md` de Lighthouse: la de 5 es el doble de estable que una sola; y los CI gratuitos son «bastante volátiles»).

| Página | CI de `a742e37` (con SwiftShader; mediana de 3) | CI de `6adb2d4` (sin él; mediana de 5 y las 5) | TBT (mediana) | Local (§4.22) |
|---|---|---|---|---|
| `/planetas/marte` | 0,92 | **0,95** (0,95 · 0,99 · 0,95 · 0,95 · 0,98) | 343 → 264 ms | 0,99 |
| `/planetas/saturno` | 0,92 | **0,99** (las 5, 0,99) | 348 → 141 ms | 0,98 |
| `/lunas/titan` | 0,90 | **0,94** (0,94 · 0,94 · 0,91 · 0,94 · 0,94) | 407 → 282 ms | 0,98 |
| `/sol` | 0,93 | **0,99** (las 5, 0,99) | 313 → 138 ms | 0,96 |
| `/luna` | 0,93 | **0,99** (las 5, 0,99) | 314 → 136 ms | 0,99 |
| `/planetas` | 0,92 | **0,99** | 341 → 149 ms | 0,98 |
| `/lunas` | 0,96 | **0,99** | 229 → 147 ms | 1,00 |
| `/sobre-el-proyecto` | 0,96 | **1,00** | 217 → 63 ms | 0,99 |
| `/creditos` | 0,95 | **0,99** | 255 → 127 ms | 0,98 |
| `/` (con SwiftShader en los dos) | 0,66 | 0,67 (aviso) | 2718 → 2608 ms | 0,76 |

La accesibilidad y las buenas prácticas, 1,00 en las 80 cargas.

**La decisión** (la de la sesión de revisión para este caso): sin SwiftShader, siete de las nueve fichas quedan en 0,99–1,00, pero **no cumplen §5 de forma estable en el CI**. `/lunas/titan` se queda en 0,94 de mediana y `/planetas/marte`, justo en 0,95, con tres de sus cinco cargas en el límite. En las dos, la tarea del arranque de Angular mide unos 280 ms simulados, frente a unos 150 en las demás fichas y en las mismas páginas en local; en Marte, una carga sí y otra no. Así que, **en el CI, el rendimiento va como aviso** en todas las páginas, y la accesibilidad y las buenas prácticas, como error. **En local** (`npm run lighthouse`, sin `CI`), el de las páginas de contenido sigue como error. Las cifras de rendimiento que cuentan son las de local con el equipo libre (§4.22), y la definitiva, la de producción (fase 11; `PENDIENTES.md`). Las páginas de contenido siguen sin SwiftShader: así dan cifras útiles también en el CI.

### 4.25 La 10.a, juntada (`49676a2`)

La rama `fase-10a-lunas` (hasta `8190911`, con su CI en verde), con `--no-ff`, después de que la sesión de revisión mirara sus capturas «después» rehechas y le diera el visto bueno. Sin conflictos: las texturas que no son de lunas salen iguales byte a byte, así que `texture-files.ts` solo cambia en las filas de las lunas. Tras juntarla, `npm run check` en verde (835 tests en 85 ficheros; el aviso de presupuesto de `body-panel.css` era de esta rama y se corrige en §4.27).

**La nota de entrega** (la entera, con sus criterios y sus cifras, en `docs/informes/fase-10-entrega-lunas.md`; su revisión por subagente, en `docs/revisiones/fase-10-entrega-lunas.md`, «cambios necesarios» sin Bloqueantes, corregida):

- **Lo real con luz rasante, una clase propia de la máscara** (del 0,5 % al 6,7 % de cada luna): la franja del terminador de la Voyager en las cinco de Urano (de 2,5° a 7,0°) y la unión de 180° de los mapas del JPL (las cinco de Urano y Deimos). Su brillo a gran escala, el de lo real vecino; sus sombras, fundidas hacia lo recreado; lo demás de lo real, igual byte a byte (`assertRealUnchanged` hace fallar el build).
- **Lo no visto de las lunas de Urano, con forma de terreno:** de 4332 a 8529 cráteres por luna con la población y el albedo de su real, y dos coronas ilustrativas en Miranda; su contraste a gran escala, del 89 al 90 % del de lo real (D48 pide del 70 al 130 %).
- **El casquete del norte de Tritón**, con el borde irregular, con la estadística del sur real.
- **Los bordes cumplen los dos criterios de D48:** el fino, relativo a lo natural, y el brillo medio, ΔL\* ≤ 2 en el p95 a 2,8° (de 0,25 a 1,82). La escala no se puede justificar como pide D48: lo natural no baja de 2 a ninguna escala (su §4).
- **Límites conocidos** (backlog, 16b): las costuras del mosaico original de Tritón, Deimos, Europa y Calisto; la línea fina del borde exterior de la luz rasante (Oberón, casi quitada; Umbriel), que de cerca no se ve; lo recreado de Ariel, casi liso; y las coronas de Miranda, ilustrativas.
- **Además:** la máscara de cobertura, umbralizada antes de reducir, y las miniaturas y las imágenes de las fichas de las 18 lunas, rehechas. Capturas: `docs/informes/img/fase-10/lunas-*` (las seis vistas de las 19 lunas con mapa, de cerca en el explorador en escritorio y en el móvil, la rejilla y las máscaras).

### 4.26 Las medidas de §5, con el equipo libre (10.f)

Con la 10.a ya junta y su build, sin ninguna otra sesión ni ningún build en marcha (comprobado con los procesos: lo que queda gasta menos del 17 % de un núcleo), en el Chromium de Playwright con la GPU del equipo (RTX 3060, ANGLE sobre D3D11).

**FPS, VRAM y peso por vista y nivel** (`node scripts/measure-views.mjs`; FPS mínimo / medio a 1 día/s, VRAM estimada y lo descargado en ese paso):

| Vista | Alta | Media | Baja |
|---|---|---|---|
| Sistema solar | 60/60 · 38 MB · 513 kB | 60/60 · 38 MB · 513 kB | 60/60 · 38 MB · 510 kB |
| Marte (primer plano) | 59/60 · 126 MB · 1854 kB | 60/60 · 62 MB · 664 kB | 60/60 · 62 MB · 664 kB |
| Saturno (primer plano) | 60/60 · 94 MB · 952 kB | 60/60 · 62 MB · 898 kB | 60/60 · 62 MB · 898 kB |
| Dione | 60/60 · 102 MB | 59/60 · 70 MB | 60/60 · 62 MB |
| Júpiter y sus lunas | 60/60 · 89 MB | 60/60 · 57 MB | 60/60 · 56 MB |
| Europa | 60/60 · 97 MB | 60/60 · 65 MB | 60/60 · 56 MB |
| Tritón | 60/60 · 52 MB | 59/60 · 51 MB | 60/60 · 43 MB |
| Fobos | **5–6/8–9** (el ritmo lento; abajo) · 52 MB | 60/60 · 51 MB | 59/60 · 43 MB |
| Urano y sus lunas | 60/60 · 60 MB | 60/60 · 59 MB | 60/60 · 59 MB |
| Miranda | 60/60 · 68 MB | 60/60 · 67 MB | 60/60 · 59 MB |
| Deimos | 60/60 · 52 MB | 59/60 · 51 MB | 60/60 · 43 MB |
| Sol (primer plano) | 60/60 · 38 MB | 60/60 · 38 MB | 60/60 · 38 MB |
| Vista Tierra | 59/60 · **278 MB** · 3235 kB | 60/60 · 86 MB · 727 kB | 59/60 · **86 MB** · 727 kB |
| Vista Luna | 59/60 · 266 MB · 5222 kB | 60/60 · 103 MB · 2005 kB | 60/60 · 62 MB · 1223 kB |
| Cielo | 59/60 · 15 MB | 60/60 · 15 MB | 60/60 · 14 MB |

Todo dentro de §5: ≥ 55 FPS en alto (salvo Fobos, que no es falta de GPU), la VRAM más alta, 278 MB de 300 en alto y 86 de 120 en bajo; las texturas de la vista Tierra, 3,2 MB de 6 adicionales en alto y 0,7 de 2 en bajo; las de la vista Luna, 5,2 de 10 y 1,2 de 3. El coste de CPU por frame, de 0,7 a 1,8 ms.

**Fobos en alto, a 5–9 FPS en las dos pasadas:** no es falta de GPU (0,96 ms de CPU por frame, y 60 FPS en medio y en bajo). A 1 día/s, Fobos gira 18,8° por frame a 60 Hz, justo bajo el umbral del aliasing (§4.5 del plan: entra a 20° y sale a 15°). Un frame lento al llegar (la subida de su textura de 2k) congela su giro, y la histéresis lo deja congelado, como está pensado. Con el giro quieto y casi nada moviéndose, el ritmo de pintado (§4.18) pinta lo justo. Comprobado en la página: a 1 día/s, el giro de Fobos congelado, 15 frames pintados por segundo y 60 llamadas a `requestAnimationFrame`. A 1 h/s, la velocidad con un cuerpo enfocado (D33), 60 FPS. Y al volver a 1 día/s desde ahí, también 60, con el giro en marcha. `measure-views.mjs` mide los FPS a 1 día/s en todas las vistas: en Fobos mide el ritmo lento, no lo que da la GPU.

**El resto** (`node scripts/measure.mjs`):
- **Arranque**, la primera vista: en alto, dos tareas largas de 144 y 137 ms (ninguna de más de 200) y el LCP, el póster, a 464 ms; en bajo, ninguna tarea larga.
- **Reposo:** 0 frames y 0 llamadas a `requestAnimationFrame` en 3 s.
- **Reproducción** a 1 día/s: 59,6 / 60 / 60 FPS (alto, medio y bajo), con 1,46 / 1,26 / 1,17 ms de CPU por frame y las efemérides en 0,17–0,19 ms (§5: ≤ 2).
- **El estado:** 4,8 actualizaciones del store por segundo y 0 cambios de la URL durante la reproducción.
- **El contexto WebGL**, perdido y recuperado: sin frames mientras falta y con la fecha intacta.
- **Memoria:** tras 10 idas y vueltas a una ficha, 7 geometrías, 12 texturas y 11 MB de heap; tras 10 cambios de vista, 14 (las 7 del cielo, que se crea una vez y se conserva, como en la fase 8); igual tras 6 cambios de calidad. Tras 10 vueltas por los sistemas de lunas, 16: las dos formas de Fobos y Deimos de la 9b, que se crean una vez y se guardan (`world.ts`, `shape.detailed ??=`), no una por vuelta. Un solo contexto WebGL y un lienzo.

**La tarea de la 8K** (§4.19): al entrar en `/explorar/tierra` en alto, sin el modo de captura (con la 8K de día), las tareas largas de 3 pasadas: **181 y 74 ms** (la primera, con la caché del navegador vacía), **113** y **98**. Ninguna de más de 200 (§5). En la fase 5, la decodificación con el volteo era una tarea de 105–109 ms, y la subida, otra de 61–69.

**El ritmo de pintado** (§4.18), en frames pintados por segundo a las velocidades de D33 (en alto): la vista general a 3 días/s, **60**; Saturno enfocado a 1 h/s, **60** (gira en 10,7 h); la vista Tierra a 1 h/s, **60**; Venus enfocado a 1 h/s, **4** (gira en 243 días); la vista Luna a 1 h/s, **5**. Lo que apenas se mueve se pinta a 4–5 Hz y lo demás, cada frame.

**El Sol con los hashes enteros** (§4.17): 60/60 FPS de cerca en los tres niveles, con 1,0–1,26 ms de CPU por frame. Lo que importa de ese cambio es el móvil (10 frames por segundo en el nivel bajo y la precisión de los hashes en las GPU de gama media), y eso queda para las pruebas de Iván en su móvil (`PENDIENTES.md`).

### 4.27 El aviso de presupuesto de `body-panel.css`

`npm run check` avisaba: el CSS de la ficha del explorador, 4,26 kB, 262 bytes por encima del aviso de 4 kB (lo había hecho crecer la hoja en dos columnas de la tableta, `99dbcd2`, decisión 6). Los cuatro `:host-context(.panel:not(.is-expanded))` se convertían cada uno en dos selectores largos. Ahora la ficha lleva su propia clase en reposo (`host: { '[class.is-resting]': '!expanded()' }`, el mismo estado que `.is-expanded` del panel, que le llega con `[(expanded)]`), y el CSS usa `:host(.is-resting)`. Además, las dos media queries de `(max-width: 63.99rem)` y las dos de `(pointer: coarse)`, en una. Lo que se ve no cambia (los e2e del móvil y de la tableta lo cubren).

### 4.28 La comprobación de los textos (decisión 4)

Un subagente sin el contexto de la sesión (`docs/revisiones/textos.md`) comparó los **551 textos** publicados (sin los nombres de las constelaciones, que ya revisó la sesión de revisión del bloque E) con sus fuentes y con `docs/ESTILO.md`: los 140 de los cuerpos frente a sus citas y a su página en caché, y los de las vistas, los recorridos, las páginas, las fichas, la interfaz y las descriptions frente a sus fuentes y a los datos del proyecto.

- **Corregido en su origen (8):**
  - tres textos de los cuerpos que decían algo distinto de su cita (Ío, las mareas; Titania, los valles; Oberón, el hielo y la roca);
  - «del división de Cassini» en la ficha de Saturno;
  - los textos alternativos de las imágenes de Deimos y de las cinco grandes lunas de Urano, que decían que no había mapa (lo hay desde la 9b);
  - la privacidad en «Sobre el proyecto»: lo que guarda el navegador (desde la 9c, también las pistas y el recorrido vistos);
  - las Venera 13 y 14: «las únicas en color» (las 9 y 10 también fotografiaron la superficie, en blanco y negro). Esta frase no tenía fuente, y sigue sin ella: apuntado en el §4 de `textos.md`, para Iván;
  - «pósters» → «pósteres» en los créditos.
  `scripts/build-body-texts.mjs`, sin errores (las citas, en sus páginas). `docs/revision-textos.md`, regenerado con el build nuevo.
- **La lista corta para Iván (10 dudas, no bloquea):** en `docs/revisiones/textos.md`, cada una con su propuesta (el día de Venus frente al de su tabla, los albedos de Umbriel y Proteo, el radio de los anillos de Saturno, «su superficie real» en las lunas con mucho recreado, y otras seis menores). Con el OK de Iván, todos los textos pasan a `reviewed: true` (`PENDIENTES.md`).

## 5. Desviaciones del plan y motivo

- **S9, en el teléfono, la flecha sola** (el texto, desde 480 px): ver §4.2.
- **S2, adelantado de la 10.f a la 10.c:** es un defecto que se ve (la Tierra azul), no una medida de rendimiento; su medida no necesita el equipo libre (las texturas se retrasan a propósito).
- **La luz del cielo (§4.11):** la revisión de la fase 8 proponía atenuar `band` y enrojecer el disco; para que el color del disco se viera, además, la cúpula deja de sumar su luz sobre él.
- **La 8K de la Tierra (§4.19), volteada en el sombreado** y no guardada ya volteada: el mismo ahorro, sin regenerar las texturas.
- **La precarga de la fuente del H1** ya estaba hecha (fase 9): Newsreader 500, el peso de los títulos, va precargada en `index.html` con las dos de Public Sans.
- **El rendimiento del explorador en Lighthouse, como aviso** (§5 del plan pide ≥ 90): da 0,76 con el arranque troceado. Lo que falta es crear el contexto WebGL, una tarea que no se puede partir (§4.22). La propuesta, en §10.
- **La cabecera del explorador en el móvil y la tableta, a 3rem** (antes 3.5rem), el alto de la franja fina de la decisión de Iván del 08-11: así el explorador no salta al elegir un cuerpo (§4.22). Las páginas de contenido siguen con 3.5rem.

## 6. Salida de los checks

(Los del cierre, al cerrar.) Los de la tanda del 09-11 por la tarde, con el build de `ff3d5ca`:

- **`npm run check`:** lint y Prettier, bien; **835 tests** en verde (85 ficheros); el build; el JS inicial de las 40 páginas, sin three, astronomy-engine, los stores ni los controles del visor, con **13,98 kB** de código propio de 15; y 1243 enlaces internos bien.
- **e2e completos:** **139 bien**, 1 saltado (`accesibilidad.spec.ts:106`, la de 320 px, que en escritorio se salta a propósito) y ningún fallo (7,0 min).
- **Lighthouse** (`npm run lighthouse`, con el equipo libre): las 9 páginas de contenido, de 0,96 a 1,00, y la accesibilidad y las buenas prácticas, 1,00 en todas; el explorador, 0,76, como aviso (§4.22). El CLS de la entrada, medido otra vez con la cabecera de 3rem: sin saltos de la cabecera ni del explorador.
- **El zum al 200 %:** las 22 comprobaciones, bien (§4.23).

## 7. Capturas

En `docs/informes/img/fase-10/` (las de la 10.a, `lunas-*`, son de la otra sesión).

- **La revisión final de diseño** (§4.13), `antes-critica-*` (build de `main`) y `despues-critica-*`: el cielo de día (390 y 1440); la llegada desde «Ver en 3D» de un eclipse de Sol (el aviso con «Volver a los eclipses») y de uno de Luna; el foco de «Luz rasante» en la fila del móvil (antes, casi oculto bajo el fundido); la entradilla de `/creditos`; y la portada (1440). `node scripts/capture-requests.mjs <antes|despues> critica`.

## 8. Dependencias añadidas

- **`@lhci/cli` 0.16.0**, de desarrollo (`21797d1`): aprobada en la revisión del bloque S (decisión 5, delegada por Iván), con sus tres condiciones (§4.22). `npm audit` da 9 avisos altos de su árbol, todos de desarrollo; la 0.15.1 tenía 13.

## 9. Pendientes y `TODO(ivan)`

(Al cerrar.)

## 10. Propuestas de cambio al plan

(Las demás, al cerrar.)

- **El rendimiento del explorador en Lighthouse** (§4.22; para Iván, en `PENDIENTES.md`). Con el arranque troceado, el explorador da **0,76** (antes, 0,66): el LCP baja a 2,5 s, el SI a 2,8 s y el CLS a 0,006, pero el TBT se queda en unos 875 ms. Casi todo es crear el contexto WebGL en el Chrome recién abierto de cada carga, una tarea de unos 210 ms que no se puede partir: para 0,90 haría falta bajar el TBT de unos 300 ms. Las opciones:
  1. **(Recomendada) Dejarlo como aviso**, como está. Las fichas y las demás páginas siguen como error (≥ 0,95), y la accesibilidad y las buenas prácticas del explorador también. El aviso deja ver la nota en cada CI sin pararlo.
  2. **Un suelo como error** (por ejemplo, 0,65): pararía una regresión grande. Pero en el CI va con WebGL por software, que da menos (0,69 en una carga local), y sus ejecutores varían: podría saltar sin una regresión de verdad.
  3. **Pintar en un worker con `OffscreenCanvas`:** el contexto y el pintado, fuera del hilo principal. Es un cambio de arquitectura grande (las etiquetas en el DOM, los eventos y el modo de captura): al backlog, no para esta fase.

## 11. Cómo probarlo

(Al cerrar.)
