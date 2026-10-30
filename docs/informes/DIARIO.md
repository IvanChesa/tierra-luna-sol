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
