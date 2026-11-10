# Diario del modo autónomo

Una línea por cada fase cerrada en modo autónomo por bloques y, al terminar cada bloque, un resumen para Iván. El detalle de cada fase está en su informe (`docs/informes/fase-N.md`) y en su revisión (`docs/revisiones/fase-N.md`).

| Fase | Cierre | Veredicto de la revisión | Métricas clave |
|---|---|---|---|
| 1 · Efemérides, catálogo y datos | 2026-10-24 | APROBADA CON CAMBIOS MENORES: 0 bloqueantes, 2 importantes, 5 menores y 4 sugerencias, todos atendidos. Fusionada con `--no-ff` (`df1d0eb`) | 141 tests · cobertura de `ephemeris/` del 98,9 % · JS inicial de 274,17 kB (sin astronomy-engine) · error frente a Horizons: planetas ≤ 0,008°, Luna ≤ 0,002°, galileanas ≤ 0,06°, otras 16 lunas ≤ 0,38° (1900–2100, TT; 0,36° en los instantes de test, corregido el 24-10) y ≤ 0,25° en el control independiente · 30 cuerpos y 120 textos con 332 citas verificadas · 8920 estrellas en 71 kB |
| 2 · Motor 3D y escena base | 2026-10-24 | CAMBIOS NECESARIOS: 0 bloqueantes, 5 importantes, 12 menores y 7 sugerencias. Corregidos los 5 importantes («Reintentar» con lienzo nuevo, sin motores huérfanos, conclusión de la prueba de profundidad, Vía Láctea omitida por licencia CC BY-NC de Gaia, `ImageBitmap` liberados) y los 12 menores; 4 sugerencias hechas y 3 llevadas a la fase 3. Fusionada con `--no-ff` (`cfadc72`) | 251 tests · cobertura de `ephemeris/` del 99,57 % · JS inicial de 287,70 kB · chunk del visor de 729,38 kB · 60 FPS en los tres niveles (RTX 3060) · VRAM 27/67/107 MB en alta · 0 frames en reposo · 1 contexto WebGL vivo tras 10 idas y vueltas · libración ≤ 0,005° y anillos ≤ 0,004° frente a Horizons (comprobado por el revisor) |
| 3 · Interfaz del explorador e interacción | 2026-10-26 | **Código:** CAMBIOS NECESARIOS: 0 bloqueantes, 3 importantes (el tiempo se congelaba si el motor fallaba ya creado, el foco se perdía al ocultar lo que lo tenía y la ficha de las lunas citaba una sola fuente), 7 menores y 4 sugerencias, todos atendidos. **Diseño, dos rondas:** en la primera, 1 bloqueante, 6 importantes, 10 menores y 6 sugerencias; en la segunda, el bloqueante resuelto y 1 importante (el foco bajo la ficha en móvil), 6 menores y 1 sugerencia nuevos. Atendido todo menos 2 textos que decide Iván. Fusionada con `--no-ff` (`8fbc389`) | 357 tests · cobertura de `ephemeris/` del 99,57 % · 45 e2e con SwiftShader (axe en todas las páginas, sin WebGL, 0 peticiones a terceros) · JS inicial de 296,32 kB (aviso a 300) · interfaz diferida de 220,07 kB · motor de 636,67 kB · 60 FPS a 1 día/s en alta (≥ 59 en media y baja) · store a 4,8 por segundo · 0 cambios de URL al reproducir · 0 frames en reposo · VRAM 27/67/107 MB · memoria estable tras 10 idas y vueltas |
| Revisión del bloque B aplicada (en `main`) | 2026-10-26 | Bloque B **APROBADO** (`docs/revisiones/bloque-B.md`): 4 importantes y 2 menores. B1–B3 y B5 pasan a las fases nuevas 3b y 3c; B4 (presupuesto) y B6 (`.gitignore`), hechos. Plan con las fases 3b y 3c (bloque R), D29–D31, las propuestas aprobadas de las fases 2 y 3 y el cielo desde España; H1 «El sistema solar» | 357 tests · 45 e2e · JS inicial de 296,32 kB (aviso, ahora a 320) · código propio de los chunks iniciales: 11,61 kB de 15 (con un fallo provocado y revertido: 46,22 kB → ✖) |
| 3b · Realismo de los planetas | 2026-10-26 | CAMBIOS NECESARIOS: 0 bloqueantes, 3 importantes (la Tierra casi negra en primer plano, la Vía Láctea demasiado brillante y siguiendo la exposición, Venus ocre), 8 menores y 3 sugerencias, todos atendidos (el bloom queda para Iván en `PENDIENTES.md`). Fusionada con `--no-ff` (`46f1dc3`) | 417 tests · cobertura de `ephemeris/` del 99,65 % · 45 e2e · JS inicial de 296,32 kB · motor de 663,76 kB · 60 FPS en todas las vistas y niveles (RTX 3060) · VRAM ≤ 118 MB en alta y ≤ 54 MB en baja · primera vista 387 kB · leyes de fase: Luna 0,013 mag RMS, Mercurio 0,117 · anillos A y B con la I/F del Hubble · colores medidos reproducibles a ≤ 0,005 · 30 capturas comparables con fotos reales |
| 3c · Interfaz inmersiva del sistema solar | 2026-10-27 | **Código:** CAMBIOS NECESARIOS: 0 bloqueantes, 3 importantes (la línea de tiempo congelada tras un clic con el tiempo en marcha, la pista fuera de 1900–2100 en los extremos con la hora local y «Controles +» tapando controles que seguían en el orden del foco), 6 menores y 5 sugerencias. **Diseño:** CAMBIOS NECESARIOS: 0 bloqueantes, 7 importantes (pósters de la maquetación anterior, barra que cambiaba de tamaño al reproducir, cámara sobre el limbo en móvil, hoja de «Controles +» sin botón de cerrar, pausa fuera de la vista en las pantallas bajas, tarjeta e índice cortados sin pista e icono de «Controles» igual que «Acercar»), 6 menores y 8 sugerencias. Atendido todo menos 2 sugerencias, explicadas; quedan para Iván la comparación con su referencia y un texto. Fusionada con `--no-ff` (`a558e72`) | 450 tests · cobertura de `ephemeris/` del 99,65 % · 60 e2e · JS inicial de 298,00 kB (11,58 kB de código propio) · interfaz diferida de 251,61 kB · arranque a 3 h/s: 59,8–60 FPS en alta, media y baja con 1,3–1,9 ms de CPU por frame · CLS 0 en tres móviles y 0,0004 en escritorio · LCP del póster a 192 ms · pestaña oculta: 0 frames · 30 miniaturas en 25,9 kB · 36 capturas |
| Revisión del bloque R aplicada (en `main`) | 2026-10-27 | Bloque R **APROBADO** (`docs/revisiones/bloque-R.md`): R1 (anillos de Saturno gris lavanda y con bandas planas) y R4 (la pista de uso), corregidos; R2 a la fase 7 y R3 a la fase 5. Licencia MIT (D32), primer push autorizado y, por decisión de Iván, el hosting pasa a Cloudflare Pages (D9, D17, D23, D24, D26 y fases 4 y 11). Detalle y capturas antes y después en `docs/informes/revision-bloque-R.md` | 453 tests · 60 e2e · JS inicial de 298,00 kB · anillo B: contraste fino 0,016 → 0,197 (la foto, 0,178) y su perfil, el de la foto · brillo y opacidad de los anillos, los de la NASA y el Hubble (sin cambios) |
| 4 · Despliegue continuo en Cloudflare Pages | 2026-10-27 | CAMBIOS NECESARIOS: 0 bloqueantes, 2 importantes (las cabeceras `Link` de los Early Hints de Pages, relativas, pedían módulos que no existen en las páginas anidadas; Cloudflare añade Network Error Logging hacia un dominio suyo), 5 menores y 8 sugerencias. Corregido todo salvo NEL, que la red de Cloudflare pone después de Pages y no se puede quitar: decide Iván (`PENDIENTES.md`). Fusionada con `--no-ff` (`4a5841f`) y en GitHub | Primer push (sin secretos; el blob mayor, 1,8 MB) · 461 tests · 65 e2e en local y en el CI de GitHub · JS inicial de 298,23 kB (código propio 12,13 de 15 kB, +0,55 por el canonical) · build para Pages: 126 ficheros, el mayor de 1,76 MiB · vista previa por rama y `main` en https://staging.tierra-luna-sol.pages.dev, verificadas por el propio CI: 31 de 32 y el aviso de NEL, con el HTML servido idéntico al del build |
| 4b · Pulido de la vista del sistema solar | 2026-10-27 | CAMBIOS NECESARIOS: 0 bloqueantes, 4 importantes (el test de solapes no miraba las lunas frente a los anillos ni entre sistemas; los sistemas de lunas compactos, pegados a los discos e interpenetrados, con la etiqueta de Saturno tapada; el criterio de planetas visibles, sin demostrar en móvil ni con los anillos abiertos; el relleno sin cambios), 4 menores y 2 sugerencias. Corregido todo: cada luna solo se dibuja cuando su sistema se distingue (como su órbita), un clic en un disco elige ese cuerpo, una unidad de aire también frente a los anillos y relleno 0,3. En móvil, los rocosos siguen siendo marcadores: decide Iván (`PENDIENTES.md`). Fusionada con `--no-ff` (`3fa69d5`) | Velocidad: 3 días/s en la vista general y 1 h/s con un cuerpo (D33) · estelas de color, 1/8 de vuelta, también en pausa (D34) · Júpiter 5,25 → 7,34 u (de ~8 a 13–17 px en escritorio), sin solapes de 1900 a 2100 · 481 tests · 67 e2e · 60 FPS, 21 llamadas de dibujo (43 en la 3c) y 35 MB en la vista general · JS inicial de 298,23 kB |
| 5 · La Tierra | 2026-10-30 | CAMBIOS NECESARIOS: 0 bloqueantes, 6 importantes (las vistas guiadas cambiaban la fecha que se ve; la VRAM del motor no contaba los mapas de la Tierra; el reloj de «Luz del Sol» era una región viva; el relieve, con el norte y el sur cambiados; R3, sin medir; y «España», que no se veía en el móvil), 9 menores y 5 sugerencias. Corregido todo salvo parte de una sugerencia (las nubes del Himalaya, a §10 del informe), más 2 fallos propios (una franja de nubes estiradas que crecía con el tiempo y el panel de la Tierra fuera de los márgenes del encuadre al entrar en su vista). Fusionada con `--no-ff` (`5d9a5a2`) | 514 tests · cobertura de `ephemeris/` del 99,5 % · 70 e2e · JS inicial de 298,23 kB (código propio 12,13 de 15) · vista Tierra a 60 FPS en los tres niveles, con 278/86/85 MB de VRAM (de 300 y 120) y 3,34 MB de texturas en alto · R3 medido: océano / desierto 0,189 (EPIC, 0,178) y nubes a menos del 3 % · sombra del eclipse a 2,7 km del punto de la NASA · tareas largas ≤ 110 ms |
| Revisión del bloque C aplicada (rama `revision-bloque-c`) | 2026-10-30 | Bloque C **APROBADO** (`docs/revisiones/bloque-C.md`). Hecho: C1 (las nubes se atenúan en los primeros planos: el Himalaya se ve y EPIC sale idéntica), C2 (planetas un 25 % más grandes y sin solapes: solo encogen Júpiter y Saturno en sus conjunciones), C3 (2 px de radio mínimo en la vista general, sin anillo de marcador), C5 (e2e sin `networkidle`) y C6 (PR 2 cerrado e `ignore` de `@types/node`; el PR 1, rebasado y en verde, **sin fusionar**: el clasificador de permisos del modo automático bloqueó `gh pr merge`). Al plan: C4 (fase 6), C8 (D24, fases 9 y 11), la 8K más barata (fase 10), D35 y, por decisión nueva de Iván, los anillos de Saturno (D36, fase 7). Revisión por subagente (`docs/revisiones/revision-bloque-C.md`): CAMBIOS NECESARIOS, 0 bloqueantes, 1 importante (los rocosos del móvil seguían con su anillo de marcador), 4 menores y 3 sugerencias, todo corregido. Hallazgo propio: el póster de la vista Tierra era el de la fase 4b. Fusionada con `--no-ff` (`d9e2c89`) | 526 tests · cobertura de `ephemeris/` del 99,42 % · e2e en verde en el CI · JS inicial de 298,23 kB (código propio 12,13 de 15) · Júpiter, 16–21 px de radio en escritorio (13–17 antes) · en el móvil, ningún planeta por debajo de 2 px (Mercurio, 1,2 antes) · vista general a 60 FPS, 21 llamadas de dibujo y 38 MB de VRAM · nubes a 0,3 en «El Himalaya» y a 1 con el disco a la vista |
| 6 · La Luna | 2026-10-31 | Dos rondas. La primera, CAMBIOS NECESARIOS: 1 bloqueante (el polo sur, de cerca, salía como un «sol de rayas»: los datos equirrectangulares del LOLA no dan para el polo), 2 importantes (`nearestMoonPhase` saltaba un mes justo después de una fase; un aviso de presupuesto del CSS), 8 menores y 5 sugerencias. Corregido todo: casquetes polares con los modelos polares del LOLA (PDS, 240 m por píxel) por encima de 76°; las texturas del primer plano esperan al final de los viajes (el viaje Tierra → Luna llegaba a 337 MB) y un fallo propio (con el motor en reposo, la Luna conservaba su 8K en la vista general). La segunda, APROBADA CON CAMBIOS MENORES: 4 menores y 4 sugerencias, aplicados o anotados (la cola de subidas, para la fase 10; las sombras del relieve, al backlog). Fusionada con `--no-ff` (`e321a85`) | 555 tests · cobertura de `ephemeris/` del 99,47 % · JS inicial de 298,66 kB (código propio 12,13 de 15) · vista Luna a 59,8 FPS con 265 / 102 / 61 MB de VRAM (alto, medio y bajo) y 5,1 MiB de texturas en alto (de 10) · el viaje Tierra ↔ Luna, como mucho 284 MB · la sombra de la Tierra frente al catálogo de la NASA: gamma a ≤ 0,0010 y magnitudes a ≤ 0,001 en tres eclipses · la libración de la malla, a < 0,1° de `Libration` |
| 7 · Lunas, sombras y escala real | 2026-11-01 | La revisión del bloque D (`docs/revisiones/bloque-D.md`) hizo también de revisión de la fase: la sesión se paró por el límite de uso antes del subagente. APROBADA CON CAMBIOS MENORES: 0 bloqueantes, 3 importantes (Ío verde lima, D1; las órbitas y estelas que de cerca se ven como rectas que cruzan la pantalla, D3; el dominio pasa a ivanchesa.com, D5) y 2 menores (el corte duro del hueco de Tritón, D2; el realce de los anillos también a contraluz, D4), todos atendidos. Tres fallos propios encontrados al corregir, antes de llegar a `main`: dos sondas de Tritón que pasaban por el relleno del hueco, el albedo de los mosaicos calibrado con ese relleno y los dos primeros criterios de D3 (las esquinas entre rectas contaban como curva; el horizonte de una órbita vista desde dentro se quedaba). Fusionada con `--no-ff` (`d2a0c9e`) | 578 tests · cobertura de `ephemeris/` del 99,48 % · 74 e2e en el CI · JS inicial de 298,65 kB (código propio 12,12 de 15) · three 705,73 kB · 12 lunas con su mosaico (Ío en color, a ΔE\*ab 2,6 de PIA02308) · sistemas de lunas a 58–60 FPS en los tres niveles y VRAM ≤ 278 MB en alto y ≤ 86 en bajo · escala real sin temblor (0 px) · las sombras del tránsito triple del Hubble (24-1-2015) donde las fotografió · anillos (D36): B / disco 1,03, el B tostado y sin lavanda; a contraluz, nada quemado (antes, el 36 % de la división de Cassini) · en las cinco vistas de D3, ninguna recta, con 0,10 ms por frame en el peor caso |
| 8 · El cielo desde España y los eclipses | 2026-11-03 | CAMBIOS NECESARIOS: 0 bloqueantes, 2 importantes (el deslizador de la noche, que en su última media hora saltaba a la noche siguiente; `/eclipses`, que en el móvil se salía por la derecha, WCAG 1.4.10), 9 menores y 5 sugerencias. Corregidos los importantes y los menores; de las sugerencias, dos y media, y el resto, propuestas para la fase 10. Un fallo propio al comprobarlo (de día, la entradilla del cielo no se leía sobre el resplandor), corregido. Sin bloqueantes, sin segunda ronda. La sesión se cerró antes de fusionar; fusionada en la siguiente con `--no-ff` (`358ae6b`) | 678 tests · cobertura de `ephemeris/` del 98,9 % · 87 e2e en el CI · JS inicial de 300,40 kB (código propio 12,62 de 15) · three 743,27 kB · cielo a 59–60 FPS en los tres niveles, con 0,6–0,8 ms de CPU por frame y 39 MB de VRAM · salidas, puestas y crepúsculos a ≤ 2 min del USNO (el Montsec y el Teide, en tres fechas) · los 45 eclipses de 2026 a 2035 con la fecha y el tipo de la NASA · la sombra del 12-08-2026 a 0,2° del punto de la NASA · 743 segmentos de constelaciones (d3-celestial, BSD) |
| 9 · Contenido y compartir | 2026-11-04 | Dos rondas. La primera, CAMBIOS NECESARIOS: 1 bloqueante (con `<base href="/">`, las 386 notas numeradas de las fichas y «Saltar al contenido» llevaban a la portada, y `check-links.mjs` las daba por buenas), 2 importantes (la Luna, «Luna de Tierra»; la nota de privacidad, ausente en el explorador), 11 menores y 6 sugerencias; atendido todo, salvo dos propuestas para la fase 10. La segunda, CAMBIOS NECESARIOS sin bloqueantes: 2 importantes («Saltar al contenido» perdía la consulta de la URL y, al hidratar, apuntaba a la portada; el menú del móvil no cabía en horizontal), 1 menor (los periodos repetían la cifra de la fuente sin su cero) y 1 sugerencia (`/luna` en el menú y en las migas, para Iván); corregidos, con un fallo propio más (el periodo de Mimas, con 6 de los 7 decimales de su fuente). Fusionada con `--no-ff` (`04be17c`) | 715 tests · cobertura de `ephemeris/` del 98,9 % · 105 e2e, en local y en el CI · 40 rutas prerenderizadas; las 30 fichas, sin three ni astronomy-engine en su JS inicial · JS inicial de 314,23 kB con los estilos (código propio 14,88 de 15) · las métricas de Lighthouse sin Lighthouse (CPU ×4 y 4G lenta), con el PC libre: 99 de nota estimada en las nueve páginas de la muestra (en la revisión, de 97 a 99) y CLS 0 · 1161 enlaces internos y 108 externos bien (los 3 de ivanchesa.com, pendientes del dominio) · 0 cookies y 0 peticiones a terceros en las 40 rutas · 88 constelaciones en español, comprobadas con el Anuario del IGN · 360 textos con su fuente para Iván · la imagen para compartir, 34 kB |
| Revisión del bloque E aplicada (en `main`) | 2026-11-04 | Bloque E **APROBADO** (`docs/revisiones/bloque-E.md`): 2 importantes y 3 menores. E1 (la totalidad del cielo: la Luna del color del cielo, el cielo malva plano y la corona lisa) y E2 (las cinco mejoras que pidió Iván del 01-11 al 03-11 y Venus «Bajo las nubes» del 04-11), a la **fase 9b** (bloque S, `docs/decisiones/FASE-9b-SOL-LUNAS.md`, D39–D44, en §1 del plan: la revisión dice «§2», pero la tabla de decisiones es la §1); E3, en `CLAUDE.md` (las licencias aceptadas con la del JPL, D43; `check-links.mjs` en «Comandos»; los mensajes del chat, en español); E4 (`/luna` con «Inicio › Lunas › Luna»), aprobado por Iván, al principio de la 9b; E5 (los PR 1 y 3 de Dependabot), **sin hacer**: siguen abiertos y la 9b sale del `main` de hoy (PENDIENTES). Las 88 constelaciones, revisadas: correctas. A la fase 10, las propuestas de las fases 8 y 9; a la 9b, los puntos 3, 7 y 12 del backlog, el bloom (solo el Sol) y las lunas de su tarea 10 | Sin cambios de código: 715 tests y 105 e2e (el CI de la fase 9) · JS inicial de 314,23 kB (código propio 14,88 de 15) |
| 9c · La interfaz, más limpia (D47) | 2026-11-08 | En paralelo con el bloque S y en modo normal. **Código:** CAMBIOS NECESARIOS (`docs/revisiones/fase-9c.md`): 0 bloqueantes, 7 importantes, 9 menores y 4 sugerencias, atendidos, con la decisión de Iván del 07-11 (≤ 32 controles con un cuerpo elegido; los planetas y las lunas, en dos filas). **Diseño:** la crítica de impeccable, de 27/40 al empezar a 31/40 en la repetida (`docs/revisiones/fase-9c-critica.md`), con sus problemas 1 a 6 arreglados, y **33/40 en el repaso de la sesión de revisión** (objetivo ≥ 32), con dos decisiones de Iván del 08-11 sobre el móvil (la ficha a demanda con «ⓘ» y la fila del sistema al elegir un planeta; el cielo con su barra y su panel a demanda). Fusionada con `--no-ff` (`3ce0905`) con el OK de Iván | 743 tests · 133 e2e · JS inicial de 315,18 kB (314,23 antes) · código propio inicial de 13,81 kB de 15 (14,88 antes) · zona útil del 3D a 390: `/` 83,5 % (46,7), Tierra 86,0 % (25,2) y el Cielo en reposo 95,7 % (27,7) · controles a 1440: 23 en `/` (37) y 32 con Saturno (46) · 0 controles tapados (antes, hasta 26 con «Controles» abierto) · el velo de abajo, del 7,0 al 9,6 % (19–23 %) · axe sin violaciones |
| Revisión del bloque S aplicada (en `main`) | 2026-11-09 | Bloque S, CAMBIOS NECESARIOS sin Bloqueantes (`docs/revisiones/bloque-S.md`): S1 (las lunas recreadas de Urano), a la entrega 10.a, en su propia sesión (D48); S2, S3 (D49), S4, S5, S8, S9 y S11, a la fase 10 (S8, S9 y S11, de las primeras); S6, antes de la fase 11; S7, hecho: el plan (D48, D49, `@lhci/cli` en la lista cerrada, el bloque S ✅ y la fase 10), `PROMPTS.md`, `PENDIENTES.md` (lo decidido por delegación de Iván) y `CLAUDE.md` (`fa445ce`). El PR 4 de Dependabot (seis herramientas, con jsdom 31): el test de las etiquetas que comparaba el `transform` como texto, arreglado en `main` (`0eabe29`); `@dependabot rebase` no se atendió en 45 minutos y la rama se rebasó desde GitHub; con su CI en verde, fusionado (`3ac86d7`). Un e2e intermitente nuevo en el CI de `main` (`fallos.spec.ts:38`, «Reintentar»: ningún fotograma en 1,5 s con SwiftShader), arreglado en su causa (`cfce0e5`) | Sin cambios de la aplicación: 808 tests · el CI de `cfce0e5`, en verde (lint, tests, build, 138 e2e y staging) · el del PR 4, también (con Playwright 1.65 y jsdom 31) |
| 10 · Pulido y calidad, con la 10.a (D48) | 2026-11-10 | CAMBIOS NECESARIOS (`docs/revisiones/fase-10.md`): 0 bloqueantes, 3 importantes, 12 menores y 3 sugerencias. Corregidos los 3 importantes (el aviso del radar de Venus, entero en el móvil; el cielo de día, con su hora en la barra; el criterio de §5, marcado ⚠️ por el explorador en Lighthouse) y 8 menores; los demás, al backlog o para la sesión de revisión. Fusionada con `--no-ff` (`1109f05`) | 835 tests (`ephemeris/` 98,9 %); e2e 139 en local y 151 en el CI, con la regresión visual; código propio inicial 13,98 kB de 15; FPS 59–60 en los tres niveles (Fobos en alto a 1 día/s, el ritmo lento del aliasing); VRAM 278/86 MB; Lighthouse local, fichas 0,96–1,00 y explorador 0,76 (aviso); 551 textos comprobados |
---

## Resumen del bloque «fases 1 a 1» (2026-10-24)

**Paso 0.** La regla del WordPress de producción vuelve a estar en `CLAUDE.md`, en «No toques» (commit `97f2a43` en `main`).

### Qué se ha hecho
La fase 1 está completa, revisada, corregida y fusionada en `main`:
- **Efemérides en TS puro** (`src/app/ephemeris/`), para cualquier fecha de 1900–2100:
  - posiciones del Sol, los planetas, la Luna y las 20 lunas;
  - orientación de la Tierra y punto subsolar;
  - fase lunar en español;
  - escalas ilustrativa y real con transición continua;
  - órbitas con caché;
  - catálogo de estrellas.
- **Fixtures oficiales**, todos con su consulta exacta:
  - Horizons: 3 fechas del plan, décadas de 1900 a 2100 y trimestres de 2020 a 2035;
  - USNO: fases lunares, tiempo sidéreo y estaciones.
- **Catálogo de 30 cuerpos:**
  - índice ligero para las rutas;
  - datos físicos y orbitales generados por script desde la NASA y el JPL, cada uno con su fuente;
  - 120 textos en español (un resumen y 3 curiosidades por cuerpo) con su cita literal de la NASA, comprobada por script. Están sin revisar.
- **Estrellas:** HYG v4.1, en `public/data/stars.bin` con su licencia CC BY-SA 4.0.
- **Fraga y Lleida:** coordenadas y altitud del IGN.
- **Comprobación del bundle:** un script nuevo en `npm run check` y en el CI comprueba que astronomy-engine y three no entran en el JS inicial de ninguna página.

### Desviaciones importantes (detalle en el informe, §4)
1. **Elementos medios de las 16 lunas: ajustados a Horizons, no copiados de la tabla del JPL.** La tabla avisa de que no sirve para efemérides y, medida, da errores de 10° a 170° en 2026. Con el ajuste, ninguna pasa de 0,36°.
2. **30 cuerpos, no 29:** la lista del plan suma 30.
3. **El barrido por décadas se mide en TT:** el ΔT futuro es una convención desconocida, no un error de la dinámica.

### Condiciones de parada
No se activó ninguna:
- no hubo bloqueantes;
- no hizo falta ninguna dependencia fuera de la lista ni herramientas externas;
- todas las fuentes y licencias son compatibles;
- todos los criterios se cumplen.

### Pendiente para Iván
1. **Decidir las 4 propuestas de cambio al plan** (informe, §10). La revisión recomienda aprobarlas todas: redacción de D11, 30 cuerpos, nuevo objetivo de precisión de las lunas indicando la escala de tiempo y la idea del ΔT para el backlog.
2. **Revisar los 120 textos:** `docs/datos/textos-cuerpos.md`, con las citas y las notas de redacción.
3. **Confirmar las decisiones adelantadas** para el modo autónomo que recoge `docs/PENDIENTES.md` (vistas guiadas, constelaciones, subdominio y textos).
4. **Crear el repo en GitHub:** el CI todavía no se ha ejecutado en remoto. Ahora no hay remoto, así que no se ha hecho push.

El bloque termina aquí; no se ha empezado la fase 2.

## Resumen del bloque B, fases 2 y 3 (2026-10-26)

### Sesiones
1. **Sesión 1** (cortada por el límite de uso): fase 2 terminada; su revisión, a medias; fase 3 empezada en una rama temporal.
2. **Sesión 2** (24-10): revisión de la fase 2 por subagente, correcciones y fusión. La fase 3, rehecha sobre `main` en `fase-3-interfaz`.
3. **Sesión 3** (24-10, cortada por el límite de uso): fase 3 casi cerrada, con su revisión de diseño ya corregida.
4. **Sesión 4** (26-10): checks y mediciones sobre el código final. Revisión de código y segunda ronda de la de diseño, por dos subagentes en paralelo. Correcciones, respuesta, fusión y este resumen.

### Qué se ha hecho
**Fase 2 · Motor 3D y escena base:** el sistema solar de cualquier fecha entre 1900 y 2100, con la arquitectura definitiva del motor:
- **Motor:** `SceneEngine` sin Angular, con el renderer inyectado y la lógica probada sin WebGL.
- **Estado y orientación:** estado del sistema con caché por instante y orientación IAU (libración y anillos, a ≤ 0,005° de Horizons).
- **Escala y profundidad:** tres marcos de escala con origen flotante y profundidad logarítmica.
- **Cuerpos y luz:** planetas achatados, anillos de Saturno con sombras analíticas en los dos sentidos y luz sin atenuación.
- **Texturas:** por manifiesto, con `ImageBitmapLoader`, subida progresiva y VRAM estimada.
- **Escena:** estrellas HYG, órbitas con `Line2` y etiquetas HTML.
- **Arranque y robustez:** arranque troceado, «Reintentar», contexto WebGL recuperable, calidad adaptativa y pósters.
- **Bundle:** comprobación del bundle inicial por módulos.

**Fase 3 · Interfaz del explorador e interacción:** la interfaz completa sobre el lienzo 3D, en escritorio y en móvil:
- **Marco y encuadre:** paneles planos sobre un lienzo a sangre, con encuadre en la parte visible (`setViewOffset`).
- **Índice y ficha:** índice como árbol WAI-ARIA con las distancias de cada momento; ficha resumida con la fuente de cada dato.
- **Tiempo:** barra de tiempo con 6 velocidades, también hacia atrás, y «tiempo real» que sigue al reloj de pared.
- **Cámara y viajes:** vuelos y viajes de cámara con «Saltar» y `Esc`, estelas y velocidades altas sin aliasing.
- **URL:** sincronizada sin escribir nunca durante la reproducción.
- **Teclado:** teclado completo, también en el lienzo, y atajos desactivables (WCAG 2.1.4).
- **Accesibilidad:** gestión del foco; `aria-live` sin ruido; movimiento reducido en todo; sin WebGL, todo sigue funcionando.
- **Pruebas:** 45 e2e con SwiftShader y axe.

### Métricas al cerrar el bloque
- **Tests:** 357 unitarios, con cobertura de `ephemeris/` del 99,57 %, y 45 e2e.
- **Bundle:** JS inicial de 296,32 kB (sin three, astronomy-engine, stores ni controles; quedan 3,68 kB hasta el aviso de 300). Interfaz diferida de 220,07 kB y motor de 636,67 kB.
- **Rendimiento (RTX 3060):**
  - 60 FPS a 1 día/s en alta (mínimo de 59 en media y baja), con 1,2–1,7 ms de CPU por frame;
  - 0 frames en reposo y render a 4 Hz en tiempo real;
  - store a 4,8 actualizaciones por segundo;
  - VRAM de 27/67/107 MB (sistema, Tierra y Luna, en alta);
  - memoria estable y un solo contexto WebGL tras 10 idas y vueltas, 10 cambios de vista y 6 de calidad;
  - LCP: el póster, a 164 ms.

### Desviaciones importantes (detalle en los informes, §4)
- **Fase 2:**
  - el sistema local físico es geometría real alrededor del planeta enfocado;
  - la luz y las sombras salen de la geometría verdadera, no de la escena;
  - profundidad logarítmica (el buffer invertido de three falla en este equipo);
  - KTX2 descartado por ahora (se sigue con WebP);
  - Vía Láctea omitida: la fuente evaluada, de Gaia, es CC BY-NC.
- **Fase 3:**
  - la revisión de diseño llegó después de conectar la lógica, por el corte de sesión, y tuvo dos rondas;
  - atajos de una sola tecla desactivables (propuesta al plan);
  - en el índice, la distancia sale del nombre accesible y llega como descripción;
  - búsqueda por la inicial solo con los atajos desactivados;
  - en las vistas Tierra y Luna, elegir su cuerpo abre su ficha;
  - `calidad` se lee de la URL y sale;
  - «Ahora» va junto a «Reproducir».

### Incidencias
- **Tres sesiones cortadas por el límite de uso.** El informe vivo y el `DIARIO` bastaron para retomar cada vez.
- **Los e2e probaron otra web sin decirlo (26-10).** Otra sesión tenía en marcha servidores de Astro de ivanchesa.es en los puertos 4321, 4322 y 4330. Con `reuseExistingServer`, Playwright reutilizó el del 4330 y los e2e abrieron la web de ivanchesa.es. Fallaron todos, así que no dieron nada por bueno. Ahora el servidor del build escucha solo en 127.0.0.1 y falla si el puerto está ocupado; los e2e usan el 4391 sin reutilizar nada, y las capturas, el 4340. No se tocó nada de ivanchesa.es.

### Condiciones de parada
No se activó ninguna: no quedó ningún bloqueante, no hizo falta ninguna dependencia ni herramienta nueva y todos los criterios se cumplen.

### Pendiente para Iván (`PENDIENTES.md`)
1. **Decidir las propuestas de cambio al plan:**
   - de la fase 2 (§10 de su informe): el sistema local físico, D13, D18 y §5;
   - de la fase 3: los atajos de una sola tecla desactivables, que la revisión recomienda aprobar.
2. **Vía Láctea:** dejarla fuera, buscar un panorama CC BY como el de ESO o pedir permiso a ESA.
3. **Dos textos:**
   - el H1 de la vista del sistema solar («Tierra Luna Sol» o «El sistema solar»);
   - el texto de la vista en los móviles bajos.
4. **Antes del bloque C:** repo en GitHub, staging en cPanel y secrets (fase 4). Sin ellos, la fase 4 se aplaza.
5. **Cuando puedas:** probar en tu móvil la hoja inferior, los gestos y los 30 FPS en baja (`npm start -- --host 0.0.0.0`).

El bloque termina aquí. No se ha empezado el bloque C: antes lo revisa la sesión de revisión (`docs/revisiones/bloque-B.md`).

## Resumen del bloque R, fases 3b y 3c (2026-10-27)

### Sesiones
1. **Sesión 1** (26-10): fase 3b entera (plan, entregas, revisión, correcciones y fusión). Fase 3c empezada: su plan y la 3c.a (arranque en movimiento); el resto quedó apuntado en su informe.
2. **Sesión 2** (27-10): retomada desde el `DIARIO`, el informe y `git log`. Las dos decisiones de Iván (el bloom, a la fase 10; el arranque, a 3 horas por segundo). Fase 3c: entregas 3c.b–3c.e, dos revisiones en paralelo (código y diseño), correcciones, fusión y este resumen.

### Qué se ha hecho
- **Fase 3b, realismo de los planetas** (D29):
  - fotometría por tipo de cuerpo ajustada a las leyes de fase publicadas, con exposición por encuadre;
  - relieve de Mercurio y Marte con sus modelos de elevación, y el Sol con el oscurecimiento del limbo medido;
  - anillos de Saturno con la profundidad óptica y el albedo de la NASA, calibrados con el Hubble;
  - la Vía Láctea de ESO, alineada con el cielo real;
  - colores medidos en fotos reales y reproducibles con un script.
- **Fase 3c, interfaz inmersiva** (D30 y D31):
  - el lienzo a pantalla completa, con la interfaz flotando encima y el encuadre apartándose de cada panel;
  - fichas de los 30 cuerpos, con miniaturas renderizadas por el propio motor;
  - barra de tiempo compacta, con la línea de tiempo del año y «Controles +»;
  - la columna lateral pasa a un panel «Índice», cerrado al entrar;
  - arranque en movimiento a 3 horas por segundo, en pausa con movimiento reducido o con `?fecha=`.

### Métricas al cerrar el bloque
- **Tests:** 450 unitarios (cobertura de `ephemeris/` del 99,65 %) y 60 e2e con SwiftShader, axe incluido, también con el sistema en marcha.
- **Bundle:** JS inicial de 298,00 kB (sin three, astronomy-engine, stores ni controles), con 11,58 kB de código propio de los 15 permitidos. Interfaz diferida de 251,61 kB y motor de 664,29 kB.
- **Rendimiento (RTX 3060):**
  - al entrar, reproduciendo a 3 h/s: 59,8–60 FPS en alta, media y baja, con 1,3–1,9 ms de CPU por frame;
  - CLS 0 en Pixel 7, a 390 × 844 y a 360 × 640, y 0,0004 en escritorio (el cambio de fuente);
  - LCP: el póster, a 192 ms en escritorio;
  - la pestaña oculta no pinta;
  - VRAM ≤ 118 MB en alta y ≤ 54 MB en baja en todas las vistas (fase 3b).

### Desviaciones importantes (detalle en los informes, §4)
- **Fase 3b:**
  - el bloom, sin hacer: pasa a la fase 10 como opcional (decisión de Iván del 27-10);
  - lunar-Lambert en lugar de Lommel–Seeliger puro en los rocosos, más cerca de las leyes de fase publicadas;
  - la opacidad y el brillo de los anillos, y la Vía Láctea, salen de medidas, no de las texturas (la Vía Láctea, sin las estrellas del panorama);
  - relieve exagerado (Marte ×6 y Mercurio ×2) y mapas de normales con pérdidas.
- **Fase 3c:**
  - el arranque, a 3 horas por segundo (decisión de Iván del 27-10), con un escalón nuevo;
  - el botón «Índice», en la franja de abajo, a la izquierda de las fichas;
  - las fichas dicen la distancia como descripción, no en el nombre (como el índice);
  - «Controles +» es un `popover` del navegador (Chrome y Edge 114, Safari 17 y Firefox 125);
  - en móvil, la velocidad está en «Controles +» y no hay pie;
  - Lighthouse, sin ejecutar: se miden sus métricas de arranque con las APIs de rendimiento.

### Incidencias
- **Dos errores encontrados mientras se corregía, antes de llegar a `main`:** un manejador de Angular que devolvía `false` (y así impedía abrir «Controles +») y una regla global que perdía contra la del componente.
- **El e2e de la maquetación cazó un efecto de una corrección:** con la barra entera a la vista al llegar, a 640 × 360 solo quedaban 130 px de lienzo (pide 150). Ahora, al llegar, se ve solo la primera fila de la barra, con la pausa, y quedan 182 px.
- **El contexto de la sesión 2 se resumió una vez.** El informe vivo y el `DIARIO` bastaron para seguir.

### Condiciones de parada
No se activó ninguna: no quedó ningún bloqueante, no hizo falta ninguna dependencia ni herramienta nueva y todos los criterios se cumplen o están explicados (Lighthouse y la comparación con la referencia, abajo).

### Pendiente para Iván (`PENDIENTES.md`)
1. **Comparar las capturas de la fase 3c con tu referencia** (`docs/informes/img/fase-3c/` y la tabla de §7.1 del informe): la referencia no está en el repositorio.
2. **Un texto:** «rueda o pellizca para acercarte» (la revisión propone «usa la rueda o pellizca para acercarte»).
3. **Aprobar las desviaciones y propuestas de la fase 3c** (§4 y §10 de su informe): la distancia de las fichas como descripción, Lighthouse con `@lhci/cli` en la fase 10, pintar a la frecuencia que pide el movimiento y regenerar las miniaturas de las lunas en la fase 7.
4. **Antes del bloque C:** repo en GitHub, licencia del código, staging en cPanel y secrets (fase 4). Sin ellos, la fase 4 se aplaza.
5. **Cuando puedas, en tu móvil** (`npm start -- --host 0.0.0.0`): las hojas, la fila de fichas, la línea de tiempo al tacto y el gasto de batería con la reproducción automática.

El bloque termina aquí. No se ha empezado el bloque C: antes lo revisa la sesión de revisión.

## Resumen del bloque C, fases 4, 4b y 5 (2026-10-30)

### Sesiones
1. **Sesión 1** (27-10): fase 4 (Cloudflare Pages) y fase 4b (pulido de la vista general), cada una con su revisión, sus correcciones y su fusión. Fase 5 hecha en su rama, hasta el informe. La revisión de la fase 5 por subagente no llegó a terminar: límite de uso.
2. **Sesión 2** (30-10): retomada desde este diario, el informe de la fase 5 y `git log`. Revisión de la fase 5 por un subagente sin contexto, correcciones, fusión y este resumen.

### Qué se ha hecho
- **Fase 4, despliegue continuo en Cloudflare Pages** (D23 y D26):
  - el repo, en GitHub (primer push sin secretos ni ficheros grandes);
  - CI con lint, tests, build y e2e (SwiftShader);
  - despliegue con `wrangler-action` fijado por SHA: una vista previa por rama, y la de `main` en https://staging.tierra-luna-sol.pages.dev;
  - `_headers` y `_redirects`, CSP con hashes, `404.html` y URLs sin barra;
  - la vista previa, verificada por el propio CI tras cada despliegue;
  - Dependabot.
- **Fase 4b, la vista general del sistema solar:** velocidad según el contexto (D33: 3 días/s en la vista general y 1 h/s con un cuerpo), estelas de color sobre las órbitas (D34) y planetas más grandes sin solapes de 1900 a 2100. Las lunas solo aparecen cuando su sistema se distingue.
- **Fase 5, la Tierra:**
  - **El material:** nubes con deriva y sombra, reflejo del Sol en el océano, luces de las ciudades, crepúsculo y luz dispersada, calibrado con tres fotos de EPIC (R3).
  - **El relieve:** con el norte en G y comprobado por sondas.
  - **La sombra de la Luna:** analítica (D20), a 2,7 km del punto del máximo de la NASA.
  - **La «Luz del Sol»:** la hora del día sin cambiar la fecha que se ve, en la zona elegida.
  - **Las vistas guiadas:** cinco, con los siete lugares del cielo desde España, con coordenadas oficiales, y un recorrido automático. Encuadran su región también en el móvil.
  - **La textura de día de 8K:** solo en el nivel alto; sube a la GPU al acabar el viaje de cámara.

### Métricas al cerrar el bloque
- **Tests:** 514 unitarios (cobertura de `ephemeris/` del 99,5 %) y 70 e2e. Tras la fusión, el CI de GitHub (ejecución 41096556658) pasó lint, tests, build y los 70 e2e (Linux, SwiftShader, 8,1 min); desplegó `main` en staging y comprobó la publicación.
- **Bundle:**
  - JS inicial de 298,23 kB (aviso a 320), con 12,13 kB de código propio de 15;
  - chunk de three de 678,67 kB (aviso a 900);
  - interfaz diferida de 267,26 kB.
- **Rendimiento (RTX 3060):**
  - vista general a 3 días/s: 60 FPS, 21 llamadas de dibujo y 38 MB de VRAM;
  - vista Tierra a 1 h/s: 60 FPS en alto, medio y bajo, con 278 / 86 / 85 MB de VRAM (de 300 y 120);
  - texturas de la vista Tierra: 3,34 MB en alto (de 6) y 0,77 MB en bajo (de 2);
  - tareas largas: como mucho 110 ms (§5: 200).
- **Precisión:**
  - punto subsolar, a < 0,05° del de `subsolarPoint`;
  - centro de la sombra del eclipse del 12-08-2026, a 2,7 km del de la NASA (test a ±0,1°; el plan pide ±1°).
- **Realismo (R3):**
  - relación de brillo océano / desierto: 0,189, y en EPIC, 0,178 (antes, 0,076);
  - nubes, a menos del 3 % de las de EPIC.

### Desviaciones importantes (detalle en los informes, §4)
- **Fase 4:** sin `security.autoCsp` (CSP propia con hashes); el canonical llega ya, no en la fase 9; la verificación de la vista previa, con un script en el CI además de `curl`; `/explorar` redirige a `/`; el CI corre en todas las ramas.
- **Fase 4b:** los planetas, más grandes, pero no tanto como en la referencia de Iván (lo limitan las conjunciones de Júpiter y Saturno y la Luna). Los sistemas de lunas, compactos y visibles solo cuando se distinguen; el relleno de la vista general, 0,3.
- **Fase 5:**
  - el material de la Tierra es una variante del común (`TLS_EARTH`), no uno nuevo;
  - R3 se resuelve comprimiendo las tierras áridas y aclarando las nubes, con medida; el océano no vuelve a su color de superficie;
  - la sombra de la Luna, con el Sol aparente;
  - la noche, la máscara y las normales de la Tierra, en 2k para caber en la VRAM;
  - la altitud del Montsec y de la Puerta del Sol, sin fuente (`null`, para la fase 8);
  - el panel de la Tierra hace de `TourPlayerComponent`.

### Incidencias
- **La revisión de la fase 5, cortada por el límite de uso** (sesión 1). Se repitió entera en la sesión 2; el informe vivo y este diario bastaron para retomarla.
- **Dos fallos propios encontrados al corregir la revisión, antes de llegar a `main`:**
  - con `ClampToEdge`, la deriva de las nubes estiraba la última columna del mapa en una franja que crecía con el tiempo (43° a los 5 minutos). Las capturas no lo enseñaban: en ellas las nubes están quietas;
  - los márgenes del encuadre no medían el panel de la Tierra si se entraba en su vista desde el sistema solar. Los e2e y las capturas cargaban `/explorar/tierra` directamente; ahora hay un e2e en móvil.
- **El mapa de normales de la Tierra tenía el sur en G:** lo detectó la revisión midiendo laderas. El build lo comprueba desde ahora.

### Condiciones de parada
No se activó ninguna:
- no quedó ningún bloqueante;
- no hizo falta ninguna dependencia ni herramienta nueva;
- los datos y las licencias nuevas tienen fuente compatible: los lugares, de fuentes oficiales; el eclipse y EPIC, de la NASA, con su crédito;
- todos los criterios se cumplen. El del móvil de Iván no bloquea.

### Pendiente para Iván (`PENDIENTES.md`)
1. **Probar en tu móvil** la vista previa de `main` (https://staging.tierra-luna-sol.pages.dev): la vista general (fase 4b) y la vista Tierra (fase 5: FPS, las vistas guiadas, con los siete marcadores en «España», y el tamaño del panel).
2. **Fase 4:**
   - decidir sobre el Network Error Logging de Cloudflare (D24);
   - comprobar en el panel que Web Analytics sigue desactivado;
   - opcionales: vistas previas privadas y un entorno de GitHub para los secrets.
3. **Fase 4b:** mirar la vista general junto a tu referencia y decidir si quieres los planetas aún más grandes y qué hacer con la vista general en el móvil (informe de la 4b, §10). Confirmar que pasar de un cuerpo a otro mantiene la velocidad elegida a mano (D33).
4. **Fase 5:**
   - las dos propuestas del informe (§10): las nubes del Himalaya y la 8K más barata;
   - los textos de las vistas guiadas (fase 9);
   - la altitud del Montsec y de la Puerta del Sol (fase 8).
5. **Dependabot:** dos PR abiertos en GitHub desde el 27-10, sin fusionar:
   - el n.º 1, `typescript-eslint` 8.71.0 → 8.72.0 (grupo de herramientas);
   - el n.º 2, `@types/node` 24.19.2 → 26.6.5 (salto de versión mayor: el proyecto usa Node 24).

El bloque termina aquí. No se ha empezado el bloque D: antes lo revisa la sesión de revisión.

## Resumen del bloque D, fases 6 y 7 (2026-11-01)

### Sesiones
1. **Fase 6 y comienzo de la 7** (30-10 por la noche y 31-10 de madrugada): la fase 6 entera, con dos rondas de revisión por subagente, sus correcciones y su fusión; de la fase 7, su plan, la escala real, las sombras generalizadas y R2.
2. **Fase 7** (31-10 por la tarde): las lunas con su mosaico, los anillos (D36), las mediciones, las capturas y el informe, con los 74 e2e del CI en verde. La sesión se paró por el límite de uso antes de lanzar la revisión por subagente.
3. **Revisión del bloque D** (01-11, sesión de revisión): hizo también de revisión de la fase 7, para ahorrar el subagente. Aprobado el bloque; la fase 7, con cambios menores.
4. **Esta sesión** (01-11): la revisión aplicada en la rama de la fase 7 (D1–D5 y el plan), `npm run check` y e2e en verde, fusión y este resumen.

### Qué se ha hecho
- **Fase 6, la Luna** (detalle en su informe):
  - el color del LROC en 8K y el relieve del LOLA en 16 bits sin pérdidas, con una esfera cúbica sin costuras y los casquetes polares con los modelos polares del LOLA;
  - la libración real (a menos de 0,1° de `Libration`) y la sombra de la Tierra en los eclipses, frente al catálogo de la NASA (gamma a ≤ 0,0010);
  - las vistas (cara visible, cara oculta, polo sur y luz rasante) y el recorrido guiado, con teclado y paso a paso con movimiento reducido;
  - la VRAM del peor caso, la Tierra con la Luna, dentro de §5 (C4).
- **Fase 7, lunas, sombras y escala real** (detalle en su informe):
  - 12 de las 20 lunas con su mosaico global (USGS y, Mimas, el PDS), comprobados con rasgos del Gazetteer, cargados solo con su sistema enfocado; Titán, con el color y el halo de PIA06230;
  - las sombras analíticas generalizadas (D20): las lunas sobre su planeta y el planeta sobre sus lunas, comprobadas con el tránsito triple que fotografió el Hubble en 2015;
  - la escala real en «Controles +» y en la URL, sin temblores (medido);
  - los anillos de Saturno nuevos (D36): la τ de una ocultación de Cassini, comprobada con los radios del PDS, y el color de la reflectividad del Hubble; y el limbo a contraluz (R2).
- **La revisión del bloque D, aplicada** (respuesta en el informe de la fase 7):
  - **D1:** Ío con el mosaico en color del USGS y un balance calibrado con PIA02308 (ΔE\*ab 2,6): blancos, naranjas y manchas oscuras en lugar del verde lima;
  - **D2:** Tritón sin el corte del hueco: el gris de la franja vecina y el borde difuminado;
  - **D3:** las órbitas y estelas que se ven casi rectas se desvanecen, según lo que se ve: fuera las rectas de las cinco vistas señaladas; se quedan las órbitas curvas y las de las lunas vistas desde fuera;
  - **D4:** el realce de los anillos, solo en su cara iluminada: a contraluz ya no salen quemados;
  - **D5:** el dominio pasa a ivanchesa.com (D37): `tierra-luna-sol.ivanchesa.com`;
  - el plan, con las propuestas de la fase 7 (fase 10 y backlog) y la fase 11 con el dominio nuevo.

### Métricas al cerrar el bloque
- **Tests:** 578 unitarios (cobertura de `ephemeris/` del 99,48 %) y 74 e2e, en verde en el CI de la rama (ejecución 41338922899) y de `main` tras la fusión (ejecución 41340414237, que desplegó staging y lo comprobó).
- **Bundle:** JS inicial de 298,65 kB (aviso a 320), con 12,12 kB de código propio de 15; three, 705,73 kB (aviso a 900); interfaz diferida, 285,35 kB.
- **Rendimiento (RTX 3060):**
  - vista general a 1 día/s: 60 FPS en los tres niveles, con 1,3–1,4 ms de CPU por frame, 21 llamadas de dibujo y 38 MB de VRAM;
  - vista Tierra, 278 / 86 / 86 MB de VRAM, y vista Luna, 266 / 103 / 62 (alto, medio y bajo; de 300 y 120); el viaje Tierra ↔ Luna, como mucho 284;
  - sistemas de lunas: 58–60 FPS en los tres niveles, con 124 MB como mucho en alto (Marte) y 62 en bajo;
  - memoria estable tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas;
  - primera vista: el LCP, el póster (212 ms en alto); una tarea larga de 84 ms.
- **Precisión:**
  - la libración de la malla de la Luna, a menos de 0,1° de `Libration`;
  - la sombra de la Tierra en tres eclipses de Luna, con gamma a ≤ 0,0010 y las magnitudes a ≤ 0,001 del catálogo de la NASA;
  - las sombras de Ío, Europa y Calisto donde las fotografió el Hubble el 24-1-2015;
  - la escala real, sin temblor del cuerpo enfocado (0 px).
- **Realismo:**
  - anillos (D36): B / disco de 1,03, el B tostado (C\* 9,5, h 94°), sin lavanda (el C, C\* 2,7; la división de Cassini, 4,3; umbral, 4,6) y las divisiones en su radio publicado; a contraluz, nada quemado (antes del D4, el 36 % de la división de Cassini);
  - Ío, a ΔE\*ab 2,6 de PIA02308 en su geometría, con la variedad de color de su mosaico;
  - en las cinco vistas de D3, ninguna órbita recta, con 0,10 ms por frame en el peor caso.

### Desviaciones importantes (detalle en los informes, §4)
- **Fase 6:** los casquetes polares, con los modelos polares del LOLA (los equirrectangulares no dan para el polo); las texturas del primer plano esperan al final de los viajes; KTX2 sigue descartado (con WebP, la VRAM cabe).
- **Fase 7:**
  - Titán, sin superficie: en luz visible, su neblina la tapa;
  - Mimas, del PDS (Astropedia no la tiene); Deimos, Proteo y las de Urano, con su color esquemático (no hay mosaico global con licencia clara);
  - las predicciones del IMCCE, descartadas como fuente del tránsito por su aviso legal: la fuente es la foto del Hubble;
  - el detalle del brillo del anillo B, de la textura de antes, registrado con la ocultación.
- **Respuesta a la revisión:**
  - Ío ya no lleva el color medio de la foto como tinte, sino su mosaico en color con un balance por canal;
  - las órbitas: el criterio es lo que gira su parte visible, con dos matices medidos (las esquinas entre rectas no cuentan; con la cámara fuera de la órbita, se queda). Con Saturno enfocado en 2026, las órbitas de Dione, Rea, Titán y Jápeto se ven como el horizonte de su plano y se van;
  - a contraluz, el anillo A sigue más claro que en PIA17172: no es el realce, sino la exposición y la función de fase de las partículas (backlog 14).

### Incidencias
- **La revisión de la fase 7 no la hizo un subagente**: la sesión se paró por el límite de uso. La sesión de revisión la hizo dentro de la del bloque.
- **Tres fallos propios encontrados al aplicar la revisión, antes de llegar a `main`:**
  - dos de las tres sondas de Tritón (Kasu Patera y Ukupanio Cavus) pasaban gracias al relleno del hueco, no a los datos: ahora las sondas de brillo solo miden lo que hay, y Tritón tiene tres manchas oscuras del hemisferio sur;
  - con el relleno nuevo, la calibración del albedo habría aclarado Tritón un 24 %: el brillo de los mosaicos se mide ya solo sobre lo que hay;
  - el primer criterio de D3 (el giro total) contaba como curva las rectas que se juntan en esquina, y el segundo (la parte visible de la órbita) dejaba el horizonte de una órbita vista desde dentro: los tests lo enseñaron antes de las capturas.
- **Otra sesión en la máquina al medir:** la primera medición de esta respuesta dio 2,5 ms de CPU por frame y un mínimo de 41 FPS en medio, con la primera versión de D3 (que creaba objetos en cada tramo y medía también la vista general) y con un proyecto vecino (`torno`) pasando sus capturas a la vez. Con D3 reescrito y la máquina libre: 60 FPS y 1,3 ms.

### Condiciones de parada
No se activó ninguna:
- no quedó ningún bloqueante;
- no hizo falta ninguna dependencia ni herramienta nueva;
- los datos nuevos tienen licencia compatible: el mosaico de Ío en color es de dominio público (USGS); las fotos de referencia (PIA02308 y PIA17172) solo se enlazan y se miden en una carpeta temporal;
- todos los criterios se cumplen. Las pruebas en el móvil de Iván no bloquean.

### Pendiente para Iván (`PENDIENTES.md`)
1. **Antes del bloque E:** fusionar el PR 1 de Dependabot en GitHub (`typescript-eslint` 8.71.0 → 8.72.0) y reiniciar Claude Code para instalar su actualización.
2. **Probar en tu móvil** (no bloquea), en la vista previa: la vista Luna (fase 6), los sistemas de lunas y la escala real (fase 7), y Ío en color.
3. **Para decidir, sin prisa:** la luz de la umbra de la Luna en los eclipses (fase 6) y los anillos a contraluz (backlog 14, o la fase 10 si lo quieres antes).
4. **Fase 11:** el dominio personalizado en Pages, `tierra-luna-sol.ivanchesa.com` (la zona está en la misma cuenta: el panel crea el registro DNS).
5. `AGENTS.md`, tu copia local de `CLAUDE.md` para Codex (fuera del repo), sigue con el dominio y el oficio de antes.

El bloque D termina aquí, ya revisado y con su revisión aplicada. No se ha empezado el bloque E: antes, Iván fusiona el PR 1 de Dependabot y reinicia Claude Code.

## Bloque E, en curso: dónde se queda (2026-11-01, sesión cerrada por Iván)

Iván cerró la sesión con la fase 8 en su respuesta a la revisión. Se ha terminado ese paso, sin fusionar nada en `main`.

### Fase 8 (El cielo desde España y los eclipses): hecha y revisada, sin fusionar
- **Rama `fase-8-cielo-eclipses`**, en GitHub (push sin `--force`). Informe completo en `docs/informes/fase-8.md`, con su «Respuesta a la revisión».
- **Revisión por subagente** (`docs/revisiones/fase-8.md`): CAMBIOS NECESARIOS, con 0 bloqueantes, 2 importantes, 9 menores y 5 sugerencias. Corregidos los 2 importantes y los 9 menores:
  - el deslizador de la noche, que en su última media hora saltaba a la noche siguiente;
  - `/eclipses`, que en el móvil se salía por la derecha (WCAG 1.4.10).

  De las sugerencias, hechas dos y media; el resto, como propuestas para la fase 10. Sin bloqueantes, no hace falta una segunda ronda. Un fallo propio encontrado al comprobarlo: de día, la entradilla del cielo no se leía sobre el resplandor; corregido.
- **Métricas:**
  - `npm run check` en verde: 678 tests, cobertura de `ephemeris/` del 98,9 %, JS inicial de 300,40 kB y 12,62 kB de código propio.
  - e2e: en la ronda completa, 85 de 87. Los 2 que fallaron eran de los propios tests y están corregidos; `cielo.spec.ts` pasa entero (8 de 8).
  - Vista del cielo: 59–60 FPS en los tres niveles y 39 MB de VRAM.
  - Contra sus fuentes: salidas, puestas y crepúsculos a ±2 min del USNO; los 45 eclipses de 2026 a 2035, con la fecha y el tipo de la NASA.

### Lo que queda del bloque E
1. **Fusionar la fase 8** en `main` con `--no-ff`, hacer push y añadir su fila en la tabla de este diario. Ya está lista: el check está en verde y no quedan bloqueantes.
2. **La fase 9 entera** (Contenido y compartir), en `fase-9-contenido` desde `main`, con su plan al principio de `docs/informes/fase-9.md`. Hay que hacer:
   - el render de las imágenes de los cuerpos y la imagen Open Graph;
   - las fichas de los 30 cuerpos y sus índices (`/planetas`, `/lunas`, `/lunas/:id`, `/sol` y `/luna`), sin three y con los datos «de hoy» por `import()` dinámico;
   - `/creditos` completa y `/sobre-el-proyecto` como caso de estudio;
   - para compartir: el title y la description de cada página, `robots.txt` y `noindex` en `/404`;
   - el pie legal con los enlaces a ivanchesa.com y la nota del NEL;
   - el repaso de los textos con ESTILO;
   - **`docs/revision-textos.md`**, por tu decisión de este bloque: cada texto con su fuente y un hueco para tus correcciones, por cuerpo y por vista, y su entrada en `PENDIENTES.md`.

   Luego vienen la revisión, las correcciones y la fusión.

   Decisiones previstas, sin herramientas nuevas:
   - Lighthouse no se ejecuta (`@lhci/cli` espera tu decisión de la fase 10). Se miden sus métricas con Playwright (LCP, CLS, tareas largas, axe) y se dice así.
   - La vista previa del enlace se simula en local con las etiquetas del HTML. La de una app real, cuando el dominio exista.
   - Los enlaces legales, a `https://ivanchesa.com/aviso-legal/` y `/privacidad/`, con `TODO(ivan)` hasta que el dominio responda.
3. **Al terminar el bloque:** el resumen del bloque E en este diario, y parar. No se empieza el bloque F.

### Pendiente para Iván
Lo de la fase 8 está en `PENDIENTES.md`:
- los nombres de las constelaciones;
- la velocidad del cielo (se propone tiempo real);
- probar `/cielo` y `/eclipses` en tu móvil (no bloquea).

## Bloque E, en curso: dónde se queda (2026-11-03, sesión cerrada por Iván)

Iván tenía que apagar el PC. La segunda ronda de revisión de la fase 9 se ha parado antes de terminar, sin escribir nada. No se ha fusionado nada en `main`.

### Fase 8: fusionada
En `main` con `--no-ff` (`358ae6b`), con su fila en la tabla (`0e17571`).

### Fase 9 (Contenido y compartir): hecha y con su revisión aplicada, sin fusionar
- **Rama `fase-9-contenido`**, en GitHub (push sin `--force`; el último commit es el de esta nota). Informe completo en `docs/informes/fase-9.md`, con su «Respuesta a la revisión».
- **Primera ronda** (`docs/revisiones/fase-9.md`): CAMBIOS NECESARIOS, con 1 bloqueante, 2 importantes, 11 menores y 6 sugerencias.
  - El bloqueante: las notas numeradas de las fichas y «Saltar al contenido» llevaban a la portada, por `<base href="/">`. Ahora llevan la ruta de su página, `check-links.mjs` resuelve los enlaces como el navegador y un e2e los pulsa.
  - Los importantes: la Luna salía «Luna de Tierra», y la nota de privacidad no estaba en el explorador.
  - Corregidos todos, salvo dos propuestas para la fase 10: los ceros finales de las cifras de la fuente y la hidratación incremental de las fichas.
- **Los commits de la respuesta:** `671ca5e` (las correcciones), `039fd7a` (el menú), `169962b` (los documentos) y `a784c22` (las capturas).
- **Decisiones de Iván del 03-11, aplicadas en la fase:**
  - las constelaciones en español con el latín de la IAU (D38) y el cielo en tiempo real (D33);
  - la fase propia antes de la 10, apuntada en el plan;
  - el menú: «Cielo» en lugar de «Luna», y la Luna la primera y destacada en `/lunas`;
  - la medida del rendimiento: vale la limpia; la definitiva, en las fases 10 y 11.
- **Métricas** (el build final, en local):
  - `npm run check` en verde: 713 tests, cobertura de `ephemeris/` del 98,9 % y 40 rutas prerenderizadas; JS inicial de 305,73 kB (314,05 con los estilos), con 14,70 kB de código propio de 15;
  - e2e: 103 de 103;
  - las métricas de Lighthouse en su móvil, sin Lighthouse y con el PC libre: 99 de nota estimada en las nueve páginas de la muestra, con CLS 0;
  - enlaces: 1161 internos y 108 externos bien (los 3 de ivanchesa.com, pendientes del dominio); 0 cookies y 0 peticiones a terceros en las 40 rutas.
- **El CI de `a784c22`** (ejecución 41722077403) seguía en marcha al cerrar: mirarlo al retomar (`gh run list --branch fase-9-contenido`).

### Lo que queda del bloque E
1. **Repetir la segunda ronda de revisión** de la fase 9: la pide `CLAUDE.md` porque la primera tuvo un bloqueante.
   - Un subagente sin el contexto de la sesión. Lee `CLAUDE.md`, el plan, `docs/revisiones/README.md`, la primera ronda, el informe y `git diff 6279a89..fase-9-contenido` (`6279a89` es lo que revisó la primera ronda).
   - Ejecuta él mismo `npm run check` y los e2e, y mira las capturas.
   - Revisa también el menú nuevo, que es posterior a la primera ronda.
   - Añade `## Segunda ronda` al final de `docs/revisiones/fase-9.md`.
2. **Corregir lo que encuentre.** Si después de esa ronda quedara un bloqueante, es condición de parada.
3. **Fusionar** `fase-9-contenido` en `main` con `--no-ff`, hacer push y añadir la fila de la fase 9 en la tabla de este diario.
4. **Escribir el resumen del bloque E** en este diario, y **parar**: no se empieza el bloque F.

### Pendiente para Iván
Está en `PENDIENTES.md` («Bloque E (fase 9)», «Decisiones del 03-11» y «Revisiones y pruebas de Iván»):
- revisar los textos en `docs/revision-textos.md`;
- los enlaces a ivanchesa.com, cuando el dominio responda;
- confirmar `@lhci/cli` en la fase 10;
- probar en tu móvil (no bloquea);
- los PR 1 y 3 de Dependabot, que siguen abiertos.

## Resumen del bloque E, fases 8 y 9 (2026-11-04)

### Sesiones
1. **Fase 8** (01-11): la fase entera, con su revisión por subagente y sus correcciones. Iván cerró la sesión antes de fusionar.
2. **Fase 9** (03-11): la fusión de la fase 8, la fase 9 entera, su primera ronda de revisión con sus correcciones y las cinco decisiones de Iván de ese día. Iván cerró la sesión durante la segunda ronda, que se paró sin escribir nada.
3. **Esta sesión** (04-11): la segunda ronda, por un subagente sin el contexto de la sesión; sus correcciones, la fusión y este resumen.

### Qué se ha hecho
- **Fase 8, el cielo desde España y los eclipses** (detalle en su informe):
  - `/cielo`, con el Montsec por defecto, los otros seis lugares y «Usar mi ubicación» (solo al pulsarlo, y la ubicación no sale del navegador), cada lugar con su zona horaria;
  - la cúpula del cielo con la refracción, el color del cielo según la altura del Sol, el deslizador de la noche en la hora del lugar y las constelaciones de d3-celestial (BSD);
  - «Esta noche»: qué planetas se ven, sus salidas, puestas y culminaciones, los crepúsculos, la fase de la Luna y hacia dónde mirar, con su tabla accesible;
  - `/eclipses`: los próximos visibles desde los mismos lugares, con «Ver en 3D», que lleva a la sombra de la Luna en la vista Tierra o a la Luna en la sombra de la Tierra.
- **Fase 9, contenido y compartir** (detalle en su informe):
  - las fichas de los 30 cuerpos y sus índices (`/planetas` y `/lunas`, nueva), prerenderizadas y sin three: los datos con los decimales y la nota de su fuente, «Hoy» calculado en el navegador, las curiosidades y las lunas de cada sistema;
  - 60 imágenes del propio motor para las fichas y la imagen para compartir;
  - `/creditos`, recurso a recurso, y `/sobre-el-proyecto` como caso de estudio, con la privacidad y la frase del NEL de Cloudflare;
  - compartir: la description de cada página, Open Graph, `noindex` (siempre en `/404`) y `robots.txt`; el pie con los enlaces legales a ivanchesa.com y la nota «Sin cookies, sin analítica y sin peticiones a terceros», también en el explorador y en el menú del móvil;
  - los textos, repasados con ESTILO, y `docs/revision-textos.md` para Iván;
  - las decisiones de Iván del 03-11: las constelaciones en español con el latín de la IAU (D38), el cielo en tiempo real (D33), el menú con «Cielo» y la Luna la primera de `/lunas`, y la fase propia de antes de la 10, apuntada en el plan.

### Métricas al cerrar el bloque
- **Tests:** 715 unitarios (cobertura de `ephemeris/` del 98,9 %) y 105 e2e, en verde en local y en el CI de la rama (ejecución 41896083050: lint, tests, build, e2e y la vista previa en Cloudflare Pages). El de `main`, el de este push (despliega staging).
- **Bundle:** JS inicial de 314,23 kB con los estilos (aviso a 320), con 14,88 kB de código propio de 15; three, 743,99 kB (aviso a 900); la interfaz del explorador, diferida, 156,97 kB.
- **Rendimiento:**
  - el cielo, a 59–60 FPS en los tres niveles, con 0,6–0,8 ms de CPU por frame y 39 MB de VRAM;
  - las páginas de contenido, con las métricas de Lighthouse medidas sin Lighthouse (CPU ×4 y 4G lenta) y el PC libre: 99 de nota estimada en las nueve de la muestra (en la revisión, de 97 a 99), con CLS 0.
- **Precisión:** salidas, puestas y crepúsculos a ≤ 2 min del USNO (el Montsec y el Teide, en tres fechas); los 45 eclipses de 2026 a 2035, con la fecha y el tipo de la NASA; la sombra del 12-08-2026, a 0,2° del punto de la NASA.
- **Privacidad y enlaces:** 0 cookies y 0 peticiones a terceros en las 40 rutas; 1161 enlaces internos y 108 externos bien (los 3 de ivanchesa.com, pendientes del dominio).
- **Datos y textos:** ninguna cifra sin fuente en las fichas (test en los 30 cuerpos); las 88 constelaciones en español, comprobadas con el Anuario del IGN; 360 textos con su fuente, para Iván.

### Desviaciones importantes (detalle en los informes, §4)
- **Fase 8:**
  - el cielo, en tiempo real (después, decisión de Iván: D33);
  - las constelaciones, con el nombre latino de la IAU (después, en español: D38, en la fase 9);
  - la luz del cielo, ilustrativa, con colores de referencia a siete alturas del Sol;
  - de noche se dibujan todos los planetas, también los que no se ven a simple vista;
  - `/eclipses`, con el selector de los mismos lugares y sin «Usar mi ubicación».
- **Fase 9:**
  - **Lighthouse no se ha ejecutado** (`@lhci/cli`, por aprobar): sus métricas, medidas con Playwright y sus curvas; el criterio queda en ⚠️ hasta la fase 10;
  - la vista previa del enlace, simulada con las etiquetas del HTML; la de una app real, con el dominio (fase 11), también en ⚠️;
  - la imagen para compartir, una composición de tres renders del motor, en JPEG;
  - las fuentes, precargadas (adelantado de la fase 10), con `font-display: optional` en el texto;
  - el código propio inicial, casi en su presupuesto (14,88 kB de 15).

### Incidencias
- **Las dos sesiones anteriores las cerró Iván a medias:** la de la fase 8, antes de fusionar, y la de la fase 9, durante la segunda ronda de la revisión. Se retomaron desde este diario.
- **Una tarea mía olvidada en segundo plano** (un `python` que extraía el texto de un PDF del IGN: casi tres horas con un núcleo) falseó la primera medida de rendimiento de la fase 9 (de 95 a 97, con Marte en el límite). Con el PC libre, 99. Desde entonces, se miran los procesos antes de medir.
- **El bloqueante de la fase 9** (las notas y «Saltar al contenido», a la portada) se le escapaba a `check-links.mjs`, que resolvía las anclas contra la página y no contra `<base href>`, como el navegador. Corregido en la primera respuesta; la segunda ronda encontró lo que quedaba del salto (la consulta de la URL y la hidratación), corregido con tests que fallaban con el código de antes.

### Condiciones de parada
No se activó ninguna:
- no quedó ningún bloqueante tras la segunda ronda de la fase 9;
- no hizo falta ninguna dependencia ni herramienta nueva (Lighthouse no se ejecutó, porque `@lhci/cli` espera a Iván; los PDF del IGN se leen con un lector propio);
- los datos nuevos tienen una licencia compatible o solo se citan: d3-celestial (BSD), y los PDF del IGN, como fuente de los nombres;
- lo que aún no se puede demostrar (Lighthouse y la vista previa en una app real) queda en ⚠️ con su fase, sin cambiar el plan.

### Pendiente para Iván (`PENDIENTES.md`)
1. **Revisar los textos** en `docs/revision-textos.md` (360, cada uno con su fuente y su hueco). Las 88 constelaciones, la sesión de revisión del bloque E.
2. **Decidir** lo de `/luna` en el menú y en las migas (segunda ronda, sugerencia 24) y, sin prisa, si «Sobre el proyecto» cuenta cómo se ha hecho.
3. **La fase propia de antes de la 10** (el Sol, las lunas que faltan, los sistemas de lunas de la vista general y el lado nocturno de la Tierra): la prepara la sesión de revisión con la del bloque E.
4. **Fase 10:** confirmar `@lhci/cli` (Lighthouse en el CI).
5. **Cuando el dominio responda:** los enlaces a ivanchesa.com (`node scripts/check-links.mjs --externos`) y, en la fase 11, la vista previa en una app real.
6. **Probar en tu móvil** (no bloquea): `/cielo`, `/eclipses` y las fichas.
7. **GitHub:** los PR 1 y 3 de Dependabot siguen abiertos.

El bloque E termina aquí, con sus dos fases fusionadas en `main`. No se ha empezado el bloque F: antes, la revisión del bloque E.

## Bloque S, en curso: dónde se queda (2026-11-04, sesión parada por Iván)
Fase 9b en la rama `fase-9b-sol-lunas` (subida, sin fusionar): hechas y comprobadas la tarea 0 (`/luna` en Lunas), la 9b.a (los sistemas de lunas de la vista general, sin cruces) y la 9b.b (la Tierra de noche, negra y neutra); de la 9b.c (el Sol), su física en TS puro con tests, y el resto, sin verificar, en `git stash` («9b.c en curso»). El detalle y el siguiente paso, en `docs/informes/fase-9b.md`, «Dónde se queda». Retomar con «Retoma el bloque S donde se quedó».

## Bloque S, en curso: dónde se queda (2026-11-05, sesión parada por Iván)
Fase 9b en la rama `fase-9b-sol-lunas` (subida, sin fusionar). Hechas y comprobadas la tarea 0, la 9b.a, la 9b.b y la 9b.c (el Sol, con el limbo de cada canal medido a 0,003 de la ley publicada y un resplandor solo del Sol, y la totalidad del cielo). La 9b.d, empezada por D45: la medida de los mapas de 2k de las 12 lunas con mosaico (en Tritón, 30,6 % real, 36,1 % visto de lejos y 33,4 % sin datos) y la recreación de Tritón, que ya funciona como herramienta (aún fuera del build). Para Iván, en `PENDIENTES.md`: bajar a mano la forma de Proteo y decidir la licencia de las formas de Fobos y Deimos. El detalle y el siguiente paso, en `docs/informes/fase-9b.md` («Dónde se queda»). Retomar con «Retoma el bloque S donde se quedó».

## Bloque S, en curso: la entrega 9b.d (2026-11-07 y 08)
Fase 9b en la rama `fase-9b-sol-lunas` (subida, sin fusionar). **9b.d hecha y comprobada** (las lunas: formas y mapas, D42, D43 y D45), retomada del trabajo sin commit de D45 del 06-11; el 07-11 la cortó el límite de uso con el build de texturas a medias, y el 08-11 se repitió entero y se cerró. Ninguna luna es ya un disco de un color (salvo Titán, por su neblina, ahora con el terminador de PIA06230: el error del modelo, del 9,2 al 2,4 %). Fobos y Deimos con su forma de los DSK del NAIF (semiejes a menos de 0,5 km de los de la NASA; Stickney en su sitio); Deimos y las cinco de Urano con los mapas del JPL, con sus sondas; Proteo, con cráteres generados (sin el zip de Stooke, esfera). D45 en el build de texturas para 18 lunas: lo no visto (el norte de Tritón y de las de Urano, el fondo de la carta de Deimos) recreado con el terreno de cada luna y lo visto de lejos con detalle; el grano, de 0,93 a 1,26 del de lo real vecino; lo real, igual byte a byte; las sondas, otra vez sobre lo real. Jápeto con sus dos caras de los albedos de la NASA (0,073; la dicotomía, ahora después de recrear); las lunas en gris, con el color de su B−V. `npm run check` en verde (762 tests, la cobertura de `ephemeris/` al 98,93 %, el JS inicial en 310,81 kB y el código propio inicial en 14,86 kB de 15; three, diferido, 785,41 kB). §5, provisional (con la 9c en el mismo equipo): 59–60 FPS de mínimo en las 15 vistas de los tres niveles, la VRAM más alta 278 MB, la memoria estable tras las vueltas. Para Iván, en `PENDIENTES.md`: las lunas recreadas de un vistazo, la línea del mapa de las fichas y Miranda sin B−V. Sigue la 9b.f (D46: el Sol y la Tierra con color realzado), en una sesión nueva: lo empezado, sin verificar, en `git stash` («9b.f en curso…»); después, la 9b.e y el cierre.

## Bloque S, en curso: el Sol de la 9b.f (2026-11-08, sesión A)
Por decisión de Iván, la 9b.f y la 9b.e van en tres sesiones en paralelo (`docs/decisiones/FASE-9b-REPARTO-PARALELO.md`): A, el Sol, que integra y cierra la fase; B, la Tierra (`fase-9b-f-tierra`); C, Venus (`fase-9b-e-venus`). Base común en `43072d6` (las herramientas de D46 y los bloques `enhanced`); los puertos por entorno, traídos de la 9c (`0447eae`). **El Sol de la 9b.f, hecho (D46, tareas 1–5 y la parte del Sol de 13 y 14):** naranja, con la forma del limbo de la 9b.c, zonas claras y oscuras que cambian despacio, el resplandor naranja con rayos cortos y protuberancias de cerca. Medido frente a la referencia: el centro, h 83° y C\* 48,2 (81° y 51,5); el borde, h 79° y C\* 51,7 (76° y 53,4); σL\* 5,65 (4,13). `/cielo`, igual píxel a píxel; el limbo de D41 y la totalidad, con las mismas cifras. §5, provisional (tres sesiones en el PC): el Sol de cerca a 59 FPS en los tres niveles, con la misma VRAM y las mismas llamadas. Los textos, en su ficha, «Lo que es ilustrativo» y `/creditos`; la línea del panel, al juntar con la 9c. Sigue: juntar B y C cuando terminen y cerrar la fase cuando la 9c esté fusionada.

## Bloque S, en curso: la Tierra de la 9b.f, juntada (2026-11-08, sesión de integración)
Una sesión nueva sustituye a A (que paró tras el Sol, `31a7a19`). **El CI, otra vez en verde:** el e2e del móvil «/sol a 320 px» fallaba desde `08120db`, porque la dirección de la fuente del Sol realzado (`svs.gsfc.nasa.gov/…`) no tenía dónde partirse y ensanchaba la ficha hasta 533 px; arreglado en la causa, con `overflow-wrap: anywhere` en los enlaces de la nota de la ficha (`dfbc655`; `body-detail-page.css` también lo cambia la 9c, para la fusión). **La Tierra de la 9b.f (sesión B, `582e440`), juntada con `--no-ff` y sin conflictos:** el océano azul vivo (el Atlántico, h 275° y C\* 33,1 frente a 277° y 27,1 de la referencia), el reflejo cian sin quemar (243 de 255), las nubes del 9,8 % del disco al 1,5 % (0,7 % en la referencia), el desierto y la vegetación con más color, el relieve ×5 y el borde azul; la noche (D40), igual. Regenerados después: `docs/revision-textos.md`, los pósters de la vista general y de la vista Tierra y la imagen para compartir. `npm run check` en verde: 764 tests, JS inicial 310,81 kB, código propio inicial 14,86 kB de 15, three diferido 798,65 kB y 1184 enlaces internos. La nota de la Tierra, llevada al informe (la 9b.f del Sol y la Tierra, junta) y borrada. Sigue: juntar C (Venus) cuando termine y cerrar la fase cuando la 9c esté fusionada; las medidas de §5, al cerrar, con el equipo libre.

## Bloque S, en curso: el Sol de la 9b.f, segunda vuelta, juntada (2026-11-08)
A Iván no le gustó el Sol de la primera vuelta («Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo»). Se rehízo en una sesión aparte (`fase-9b-f-sol-2`, desde `d765654`), con criterios más estrictos: de cerca, el h a ±5° y el C\* ≥ 90 % de la referencia; y el disco naranja y sin lavar también en la vista general. **Iván la aprobó el 08-11 y se juntó con `--no-ff`, sin conflictos (`fb3d021`).** Lo que cambia:
- **El disco:** naranja saturado de cerca y de lejos. El centro, h 81° y C\* 51,4, frente a 81° y 51,5 de la referencia; en la vista general, L\* 79,8 · C\* 51,3 (antes, 98,3 · 21,3).
- **La superficie:** zonas claras y oscuras que fluyen despacio, también en pausa. σL\* de 4,66 a 5,57 en cinco minutos, frente a 4,13.
- **El resplandor:** un borde fino naranja rojizo, un resplandor suave y rayos cortos, sin la mancha pálida. El bloom y la corona de cerca, apagados; el limbo, × 0,55 (desviación con su motivo en el informe).
- **Las protuberancias:** tres bucles de plasma finos y translúcidos en lugar de los bultos.

`/cielo`, igual píxel a píxel. Al rehacer las imágenes salió un fallo del halo: puntos oscuros de un píxel en el borde del Sol pequeño, en la vista general del móvil y en la miniatura. Los causaba una derivada dentro de una rama, que el compilador de D3D no respeta; arreglado sin derivadas y con su test (`d881476`). Regenerados después: la miniatura y las imágenes de la ficha del Sol, la imagen para compartir y el póster de la vista general; `docs/revision-textos.md` sale igual. `npm run check` en verde: 767 tests, JS inicial 310,81 kB, código propio inicial 14,86 kB de 15, three diferido 808,43 kB y 1184 enlaces internos. La nota de entrega, llevada al informe y borrada. Para Iván o para el cierre: dos frases de «Lo que es ilustrativo» del Sol se han quedado atrás (§9 del informe). Sigue: juntar C (Venus) y cerrar la fase cuando la 9c esté fusionada; las medidas de §5, al cerrar, con el equipo libre.

## Fase 9b: fusionada en `main` (2026-11-08)
`32933c9`, con `--no-ff`. La revisión por subagente (`docs/revisiones/fase-9b.md`) dio **cambios necesarios, sin Bloqueantes**. Sus tres Importantes, corregidos:
- el criterio del borde de D45, llevado a Iván con ⚠️;
- los ocho pósters, regenerados;
- la tabla de `/creditos`, enfocable a 320 px, con un e2e de axe a ese ancho.

**Métricas:**
- 808 tests y 138 e2e (y 1 que se salta), en verde en local; el CI de la rama, 137 de 137 sin intermitentes.
- El JS inicial, 315,27 kB, con 13,81 kB de 15 de código propio; three, 813,58 kB.
- Las 15 vistas, a 59–60 FPS en los tres niveles; la VRAM más alta, 278 MB de 300.

## Resumen del bloque S, fase 9b (2026-11-08)

### Sesiones
1. **04-11:** la tarea 0, la 9b.a y la 9b.b. Iván la paró con la 9b.c empezada.
2. **05-11:** la 9b.c (el Sol y la totalidad) y el comienzo de D45. Iván la paró con la recreación de Tritón en curso. Un intento de sesión en paralelo para los mapas de D45 se paró y se borró: la principal no había recibido el aviso.
3. **Del 06-11 al 08-11:** la 9b.d. El 07-11 la cortó el límite de uso con el build de texturas a medias, y el 08-11 se repitió entero.
4. **08-11, en paralelo** (decisión de Iván; `docs/decisiones/FASE-9b-REPARTO-PARALELO.md`):
   - A, el Sol de la 9b.f;
   - B, la Tierra de la 9b.f;
   - C, Venus (9b.e);
   - una segunda vuelta del Sol, en su propia sesión (Iván no aprobó la primera);
   - una sesión de integración, que juntó la Tierra y el Sol de la segunda vuelta.
5. **08-11, el cierre** (la sesión que hizo la Tierra): Venus juntada, lo pendiente, los e2e intermitentes del CI, lo de la escena de la 9c, §5 con el equipo libre, la revisión por subagente, sus correcciones y la fusión.

### Qué se ha hecho (detalle en el informe de la fase 9b)
- **Tarea 0:** `/luna`, con «Inicio › Lunas › Luna» y «Lunas» marcado en el menú.
- **9b.a, los sistemas de lunas de la vista general (D39):** cada luna con su propia ley de tamaños y en una órbita ilustrativa sin cruces, fuera del planeta y de los anillos. Un sistema que se acerca a otro se comprime hacia su planeta.
- **9b.b, la Tierra de noche (D40):** negra y neutra, con las luces de Black Marble 2016.
- **9b.c, el Sol de la luz visible (D41) y la totalidad del cielo (E1):** el limbo por canal de una ley publicada, la granulación, las manchas con la rotación diferencial medida y la corona; en la totalidad, el cielo azul muy oscuro con el anillo del horizonte.
- **9b.d, las lunas (D42, D43 y D45):** ninguna es ya una bola lisa.
  - Fobos y Deimos tienen su forma de los DSK del NAIF.
  - Deimos y las cinco de Urano llevan los mapas del JPL.
  - Lo que nadie vio está recreado con el terreno real de cada luna.
  - Jápeto tiene sus dos caras, y Titán, su terminador.
- **9b.f, el Sol y la Tierra con color realzado (D46):** medidos frente a la referencia.
  - El Sol, naranja, con estructura que fluye, rayos cortos y bucles de plasma (en dos vueltas; la segunda, aprobada por Iván).
  - La Tierra: el océano azul vivo, el reflejo cian, nubes finas, el relieve ×5 y el borde azul.
  - `/cielo` y la noche no cambian.
- **9b.e, Venus «Bajo las nubes» (D44):** el radar de Magellan, con su aviso, accesible con el teclado.
- **El cierre:**
  - los e2e que fallaban a ratos en el CI, arreglados en su causa (seis causas; la principal, el `@defer (on idle)` sin tope);
  - las etiquetas del 3D, con placa;
  - el suelo del cielo, con un degradado;
  - las frases del Sol, al día.

### Métricas al cerrar el bloque
- **Tests:** 808 unitarios, con la cobertura de `ephemeris/` al 98,93 %, y 138 e2e (y 1 que se salta), en verde en local. El CI de la rama, 137 de 137 sin intermitentes (`1b28193`); el de `main`, el de este push (despliega staging).
- **Bundle:** el JS inicial, 315,27 kB (aviso a 320), con 13,81 kB de código propio de 15; three, 813,58 kB (aviso a 900).
- **Rendimiento,** con el equipo libre (una RTX 3060):
  - las 15 vistas, a 59–60 FPS de mínimo en los tres niveles;
  - la VRAM más alta, 278 MB de 300 en alto y 86 de 120 en bajo;
  - Venus con el radar, 121, 57 y 56 MB;
  - la vista general a 1 día/s, 59–60 FPS, con 1,38 ms de CPU por frame y 0,19 ms de efemérides;
  - la memoria, estable tras las vueltas (11 MB de heap, un contexto WebGL);
  - el arranque, con una tarea larga de 61 ms en alto.
- **Lo medido frente a fuentes y referencias:**
  - el limbo del Sol, a 0,003 de la ley en cada canal;
  - el Sol realzado, a 2° del tono de la referencia, y la Tierra, a 2–7°;
  - las nubes, el 1,5 % del disco;
  - la noche, L\* 0,2 · C\* 0,2.
- **Privacidad y enlaces:** 0 peticiones a terceros (e2e) y 1238 enlaces internos bien.

### Desviaciones importantes (detalle en el informe, §4)
- **9b.a:** el sistema de lunas se comprime hacia su planeta, en lugar de encoger el planeta con su sistema.
- **9b.c:** el bloom, sumado en luz lineal y solo en la vista general. Desde la segunda vuelta de la 9b.f, apagado.
- **9b.d:** el criterio del borde de D45, medido frente a lo natural (**⚠️, lo decide Iván**). Proteo sigue como esfera, sin el zip de Stooke.
- **9b.f:**
  - el Sol de la segunda vuelta lleva el limbo × 0,55 y no tiene bloom ni corona de cerca; de cerca se pinta cada 50 ms, también en pausa;
  - la cara nocturna de la Tierra, con el albedo y las nubes de la fase 5 (si no, dejaba de leerse en la vista general).
- **9b.e:** el radar, en gris y con la luz de Venus.
- **El cierre:** de lo de la escena de la 9c, el rótulo de Saturno, la precarga del recorrido y los nombres de España quedan propuestos para la fase 10.

### Incidencias
- **Cortes:** el límite de uso del 07-11, con el build de texturas a medias, y las sesiones que Iván paró el 04-11 y el 05-11.
- **El intento de sesión en paralelo del 05-11,** parado y borrado. La lección se aplicó el 08-11: el reparto, por escrito y por archivos, y los puertos, por entorno.
- **Con tres sesiones en el mismo equipo,** `measure.mjs` daba caídas falsas de FPS (26 ms por frame frente a 1,6). Se comparó con el build de partida en el mismo momento, y §5 se repitió al cerrar con el equipo libre.
- **El CI:**
  - estuvo en rojo por el e2e de `/sol` a 320 px (arreglado en `dfbc655`);
  - tenía intermitentes con seis causas, arregladas en el cierre: tras ellas, 137 de 137 sin reintentos.
- **Un uniforme neutro en un shader compartido** cambiaba píxeles de otros cuerpos (Marte y Titán). Desde entonces, lo de un solo cuerpo va con su `#define`.

### Condiciones de parada
No se activó ninguna:
- no quedó ningún Bloqueante tras la revisión;
- no hizo falta ninguna dependencia ni herramienta nueva;
- las licencias nuevas son compatibles: la política del JPL (D43), el NAIF (decisión de Iván del 06-11) y el dominio público del USGS y de la NASA;
- el criterio del borde de D45 queda en ⚠️, como decisión de Iván, sin cambiar el plan.

### Pendiente para Iván (`PENDIENTES.md`)
1. **El criterio del borde de D45:** ¿el relativo o el absoluto, medido más ancho?
2. **El color del radar de Venus:** en gris o como las fotos de las Venera.
3. **Las lunas recreadas, de un vistazo:** también la línea del mapa de las fichas y Miranda sin B−V.
4. **La forma de Proteo:** bajar el zip de Stooke a mano. Y Pharos, sin posición.
5. **Revisar los textos** de `docs/revision-textos.md` (540, cada uno con su fuente).
6. **Probar en el móvil y en el iPhone:** la interfaz de la 9c, el Sol y la Tierra realzados y Venus.
7. **GitHub:** los PR 1 y 3 de Dependabot siguen abiertos.
8. **La fase 10:** `@lhci/cli` y las propuestas de la 9b (§10 de su informe).

El bloque S termina aquí, con la fase 9b fusionada en `main`. No se ha empezado el bloque F (fase 10): antes, la revisión del bloque S.

## Resumen del bloque F, fase 10 (2026-11-10)

### Sesiones
- **La fase 10**, en la carpeta del proyecto (rama `fase-10-pulido`), en varias sesiones del 09 y el 10-11. **La 10.a** (las lunas recreadas, segunda vuelta, D48), en paralelo, en su worktree (`fase-10a-lunas`); junta con `--no-ff` después de que la sesión de revisión diera el visto bueno a sus capturas.
- La última sesión se cortó una vez a mitad del cierre (se cerró la ventana). Se retomó desde git y el informe, sin pérdidas: se repitieron el check y los e2e locales.

### Qué se ha hecho (detalle en el informe de la fase 10)
- **Las peticiones de Iván del 08-11:** el Sol sin girar (S8), «‹ Sistema solar» como botón reconocible (S9) y el margen de la nota bajo «Ver en 3D» (S11).
- **Diseño:** el radar de Venus con el color de las Venera (S3, D49), los defectos de la crítica de la 9c, las propuestas de la 9b y de la fase 8, y la revisión final con impeccable y las Web Interface Guidelines, con capturas antes y después.
- **Accesibilidad y resiliencia:** axe en las 40 rutas, sin WebGL, el contexto perdido y el movimiento reducido, en los e2e; el zum al 200 %, bien.
- **Contenido:** los decimales de las fuentes, S5, Shackleton, el terminador de Titán y **la comprobación de los 551 textos** por un subagente (8 correcciones; 10 dudas para Iván en `docs/revisiones/textos.md`).
- **Rendimiento:** la Tierra sin la bola azul (S2), el bloom fuera, el Sol del móvil (10 frames por segundo en bajo, hashes enteros), el ritmo de pintado según el movimiento, la 8K más barata y el arranque del 3D troceado. **Las medidas de §5, con el equipo libre.**
- **Lighthouse en el CI** con `@lhci/cli` (sus tres condiciones) y **la regresión visual** (seis vistas en escritorio y en el móvil) con las referencias generadas en el CI.
- **La 10.a:** lo real con luz rasante como clase propia, lo no visto de las lunas de Urano con cráteres de su población y el casquete de Tritón con el borde irregular.

### Métricas al cerrar el bloque
- **Tests:** 835 (la cobertura de `ephemeris/`, 98,9 %). **e2e:** 139 bien en local (13 saltados: la regresión visual, que solo se compara en Linux, y la de 320 px); 151 en el CI, con la regresión visual.
- **Bundle:** código propio inicial, 13,98 kB de 15; JS inicial, 317,81 kB (aviso a 320).
- **FPS:** 59–60 de mínimo en las 15 vistas y los tres niveles, salvo Fobos en alto a 1 día/s (el ritmo lento con su giro congelado por el aliasing; a 1 h/s, 60).
- **VRAM:** 278 MB de 300 (la vista Tierra en alto) y 86 de 120 (en bajo). **Arranque:** tareas largas de 144 y 137 ms; la 8K de la Tierra, de 98 a 181 ms. Efemérides, 0,17–0,19 ms por frame.
- **Lighthouse en local:** las páginas de contenido, de 0,96 a 1,00; el explorador, 0,76 (aviso). En el CI, la accesibilidad y las buenas prácticas, 1,00; el rendimiento, como aviso.

### Desviaciones importantes (detalle en el informe, §5)
- **El explorador en Lighthouse, 0,76 frente a 0,90:** el criterio 1 de la fase queda ⚠️. Crear el contexto WebGL es una tarea que no se puede partir; arreglarlo pide pintar en un worker. Va como aviso por la decisión de la sesión de revisión del 09-11, con la decisión para Iván.
- **Lighthouse en el CI, el rendimiento como aviso:** la causa de las notas bajas era SwiftShader en las páginas de contenido (ya no lo llevan). Sin él, las fichas siguen variando hasta 0,08 de una ejecución a otra (Titán, de 0,91 a 0,94), así que no cumplen §5 de forma estable allí. Cuentan las cifras de local y, la definitiva, la de producción (fase 11).
- **La hidratación incremental de las fichas, sin hacer:** el código propio inicial ya está en 13,98 kB. Para decidir (Iván o la sesión de revisión).

### Incidencias
- La sesión se cortó a mitad del cierre (la ventana se cerró); se retomó sin pérdidas.
- Una orden de shell con comillas invertidas estropeó texto del informe y de `PENDIENTES.md` antes del commit; se rehízo con el editor.

### Condiciones de parada
- Ninguna nueva. El explorador en Lighthouse (un criterio de rendimiento que no se cumple sin cambiar la arquitectura) ya lo había decidido la sesión de revisión: aviso, con la decisión para Iván.

### Pendiente para Iván (`PENDIENTES.md`)
1. **Probar en tu móvil y en un iPhone:** la interfaz, «‹ Sistema solar» y el Sol de cerca en el nivel bajo (FPS y batería).
2. **La lista corta de los textos** (`docs/revisiones/textos.md`): 10 dudas y una frase sin fuente. Con tu OK, todos pasan a `reviewed: true`.
3. **El explorador en Lighthouse** (0,76): las opciones, en §10 del informe (la recomendada, dejarlo como aviso).
4. **La hidratación incremental de las fichas:** al backlog o a la fase 11.
5. **La prueba con un lector de pantalla de verdad** (NVDA o Narrador).
6. **Saber:** en el CI, el rendimiento de Lighthouse va como aviso; la cifra definitiva, en producción (fase 11).

### Para la sesión de revisión
- El artefacto de Lighthouse en el CI (hallazgo 10 de la revisión de la fase 10): ¿vale como «solo en el disco del CI»?
- Un suelo de rendimiento como error en el CI (hallazgo 18) y lo que va al backlog (§10 del informe de la fase 10).

El bloque F termina aquí, con la fase 10 fusionada en `main`. La fase 11 (el lanzamiento, con Iván) espera a la revisión del bloque F.
