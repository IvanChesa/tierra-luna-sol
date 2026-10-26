# Diario del modo autónomo

Una línea por cada fase cerrada en modo autónomo por bloques y, al terminar cada bloque, un resumen para Iván. El detalle de cada fase está en su informe (`docs/informes/fase-N.md`) y en su revisión (`docs/revisiones/fase-N.md`).

| Fase | Cierre | Veredicto de la revisión | Métricas clave |
|---|---|---|---|
| 1 · Efemérides, catálogo y datos | 2026-10-24 | APROBADA CON CAMBIOS MENORES: 0 bloqueantes, 2 importantes, 5 menores y 4 sugerencias, todos atendidos. Fusionada con `--no-ff` (`df1d0eb`) | 141 tests · cobertura de `ephemeris/` del 98,9 % · JS inicial de 274,17 kB (sin astronomy-engine) · error frente a Horizons: planetas ≤ 0,008°, Luna ≤ 0,002°, galileanas ≤ 0,06°, otras 16 lunas ≤ 0,38° (1900–2100, TT; 0,36° en los instantes de test, corregido el 24-10) y ≤ 0,25° en el control independiente · 30 cuerpos y 120 textos con 332 citas verificadas · 8920 estrellas en 71 kB |
| 2 · Motor 3D y escena base | 2026-10-24 | CAMBIOS NECESARIOS: 0 bloqueantes, 5 importantes, 12 menores y 7 sugerencias. Corregidos los 5 importantes («Reintentar» con lienzo nuevo, sin motores huérfanos, conclusión de la prueba de profundidad, Vía Láctea omitida por licencia CC BY-NC de Gaia, `ImageBitmap` liberados) y los 12 menores; 4 sugerencias hechas y 3 llevadas a la fase 3. Fusionada con `--no-ff` (`cfadc72`) | 251 tests · cobertura de `ephemeris/` del 99,57 % · JS inicial de 287,70 kB · chunk del visor de 729,38 kB · 60 FPS en los tres niveles (RTX 3060) · VRAM 27/67/107 MB en alta · 0 frames en reposo · 1 contexto WebGL vivo tras 10 idas y vueltas · libración ≤ 0,005° y anillos ≤ 0,004° frente a Horizons (comprobado por el revisor) |
| 3 · Interfaz del explorador e interacción | 2026-10-26 | **Código:** CAMBIOS NECESARIOS: 0 bloqueantes, 3 importantes (el tiempo se congelaba si el motor fallaba ya creado, el foco se perdía al ocultar lo que lo tenía y la ficha de las lunas citaba una sola fuente), 7 menores y 4 sugerencias, todos atendidos. **Diseño, dos rondas:** en la primera, 1 bloqueante, 6 importantes, 10 menores y 6 sugerencias; en la segunda, el bloqueante resuelto y 1 importante (el foco bajo la ficha en móvil), 6 menores y 1 sugerencia nuevos. Atendido todo menos 2 textos que decide Iván. Fusionada con `--no-ff` (`8fbc389`) | 357 tests · cobertura de `ephemeris/` del 99,57 % · 45 e2e con SwiftShader (axe en todas las páginas, sin WebGL, 0 peticiones a terceros) · JS inicial de 296,32 kB (aviso a 300) · interfaz diferida de 220,07 kB · motor de 636,67 kB · 60 FPS a 1 día/s en alta (≥ 59 en media y baja) · store a 4,8 por segundo · 0 cambios de URL al reproducir · 0 frames en reposo · VRAM 27/67/107 MB · memoria estable tras 10 idas y vueltas |
| Revisión del bloque B aplicada (en `main`) | 2026-10-26 | Bloque B **APROBADO** (`docs/revisiones/bloque-B.md`): 4 importantes y 2 menores. B1–B3 y B5 pasan a las fases nuevas 3b y 3c; B4 (presupuesto) y B6 (`.gitignore`), hechos. Plan con las fases 3b y 3c (bloque R), D29–D31, las propuestas aprobadas de las fases 2 y 3 y el cielo desde España; H1 «El sistema solar» | 357 tests · 45 e2e · JS inicial de 296,32 kB (aviso, ahora a 320) · código propio de los chunks iniciales: 11,61 kB de 15 (con un fallo provocado y revertido: 46,22 kB → ✖) |
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
