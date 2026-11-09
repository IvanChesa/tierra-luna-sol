# Informe: Fase 10 (pulido y calidad; bloque F)

- **Rama:** `fase-10-pulido` (desde `main` en `0eabe29`), en la carpeta del proyecto. La entrega **10.a** (las lunas recreadas, segunda vuelta, D48) la hace otra sesión en paralelo, en su worktree (`.claude/worktrees/fase-10a-lunas`, rama `fase-10a-lunas`), y esta la junta.
- **Fecha:** 2026-11-09 (en curso)
- **Estado:** en curso (sesión cortada por el límite de uso el 09-11 hacia las 15:40). Hecho: el paso previo, la 10.b, la 10.c entera (con la revisión final de diseño, `docs/revisiones/fase-10-critica.md`), de la 10.e los decimales, S5, Shackleton y Titán, y de la 10.f el código (S2, el bloom fuera, el Sol en el móvil, el ritmo de pintado y la 8K). Sin commit, a la espera: Lighthouse en el CI (`@lhci/cli` 0.16, `lighthouserc.js`; el explorador da 0,66 y las fichas, ≥ 0,96) y la regresión visual (`e2e/regresion.spec.ts`, sin referencias). Falta: los e2e completos, las capturas de la crítica, las medidas de §5 con el equipo libre, juntar la 10.a, la 10.h, la comprobación de los textos y el cierre.
- **e2e completos (build de las 15:2x, antes de los últimos commits):** 134 bien, 1 saltado y **4 fallos por arreglar**, lo primero al retomar: `[escritorio] › e2e\camara.spec.ts:34:3 › Cámara, vista limpia y atajos › vista limpia: V oculta la interfaz y las etiquetas; Esc y el botón la recuperan`; `[escritorio] › e2e\cielo.spec.ts:279:3 › Próximos eclipses (fase 8) › se recalcula en el navegador, cambia de lugar y «Ver en 3D» lleva a la sombra`; `[escritorio] › e2e\recorrido.spec.ts:125:3 › El recorrido de la portada (fase 9c) › llega hasta el final: la Tierra con España, la Luna si se ve y la vista general en marcha`; `[escritorio] › e2e\tiempo.spec.ts:101:3 › Tiempo y URL › al escribir una fecha a mano no pasa por fechas intermedias ni avisa a medio escribir`. Lighthouse (`@lhci/cli` 0.16 y `lighthouserc.js`) y la regresión visual (`e2e/regresion.spec.ts`) siguen sin commit: ver la nota de traspaso y §0.

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

## 5. Desviaciones del plan y motivo

- **S9, en el teléfono, la flecha sola** (el texto, desde 480 px): ver §4.2.
- **S2, adelantado de la 10.f a la 10.c:** es un defecto que se ve (la Tierra azul), no una medida de rendimiento; su medida no necesita el equipo libre (las texturas se retrasan a propósito).
- **La luz del cielo (§4.11):** la revisión de la fase 8 proponía atenuar `band` y enrojecer el disco; para que el color del disco se viera, además, la cúpula deja de sumar su luz sobre él.
- **La 8K de la Tierra (§4.19), volteada en el sombreado** y no guardada ya volteada: el mismo ahorro, sin regenerar las texturas.
- **La precarga de la fuente del H1** ya estaba hecha (fase 9): Newsreader 500, el peso de los títulos, va precargada en `index.html` con las dos de Public Sans.

## 6. Salida de los checks

(Al cerrar.)

## 7. Capturas

En `docs/informes/img/fase-10/` (las de la 10.a, `lunas-*`, son de la otra sesión).

## 8. Dependencias añadidas

(Al cerrar: `@lhci/cli`, aprobado.)

## 9. Pendientes y `TODO(ivan)`

(Al cerrar.)

## 10. Propuestas de cambio al plan

(Al cerrar.)

## 11. Cómo probarlo

(Al cerrar.)
