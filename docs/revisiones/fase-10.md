# Revisión: Fase 10 (pulido y calidad; bloque F)

Veredicto: **CAMBIOS NECESARIOS** (sin Bloqueantes)

- **Fecha:** 2026-11-10
- **Revisor:** subagente de revisión, sin el contexto de la sesión que hizo la fase.
- **Revisado:** la rama `fase-10-pulido` en `c1ae8d2` frente a `main` (83 commits): el código de `src/`, `e2e/`, `scripts/` (los de la fase; los de las lunas, solo su integración), `lighthouserc.js`, `.github/workflows/ci.yml` y `playwright.config.ts`; el informe (`docs/informes/fase-10.md`), la nota de la 10.a y su revisión, la crítica de diseño (`docs/revisiones/fase-10-critica.md`) y la revisión de textos (`docs/revisiones/textos.md`).
- **Comprobado por mí:**
  - **`npm run check`, en verde:** lint y Prettier bien; **835 tests** en 85 ficheros; la cobertura de `ephemeris/`, 98,87 % de sentencias y 94,16 % de ramas; el build, sin avisos de presupuesto; el JS inicial, **317,81 kB** (89,69 kB comprimido), sin three ni astronomy-engine, con **13,98 kB** de código propio de 15; el chunk de three, 806,55 kB (aviso a 900); 1243 enlaces internos bien. La única salida ruidosa es un «Not implemented: navigation to another Document» de jsdom (hallazgo 17).
  - **El CI de `c00618f`** (`gh run view 42699701902`): verde. 151 e2e (con las 12 de la regresión visual) y 1 saltado; Lighthouse con avisos de rendimiento en 4 URL; el log confirma el destino `filesystem` («Dumping 50 reports to disk at …/.lighthouseci/informes»). El de `[referencias]` (`42698687243`) se canceló por el push siguiente, pero su trabajo «Referencias» terminó antes (3 min 34 s).
  - **Capturas:** S9 (`despues-volver-1440`, `-1440-foco`, `-390`), S11 (`despues-nota-sol-390`), S8 (`despues-sol-giro-3d-t6`), S3 (`antes-` y `despues-venus-movil-radar`), S2 (`despues-tierra-entrada-serie-5s`), la crítica (`despues-critica-cielo-dia-390`, `-eclipse-sol-1440`, `-luna-foco-390`), el rótulo de Saturno, España a 390, dos de la 10.a (Oberón de cerca y las seis vistas de Tritón) y las referencias de la regresión (`portada-movil`, `luna-escritorio`, `cielo-movil`).
  - **Medidas propias:** el tamaño de las referencias (1280 × 800 y 412 × 839) y el peso de las texturas que precarga el recorrido (de `texture-files.ts`).

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | **Importante** | `docs/informes/fase-10.md:47`; `lighthouserc.js:88` | **El primer criterio de aceptación se da por cumplido (✅) y no lo está.**<br>• §5 pide para el explorador rendimiento ≥ 0,90 en Lighthouse móvil, LCP ≤ 2,5 s y un arranque «compatible con Lighthouse ≥ 90».<br>• El informe mide 0,76 en local (0,64–0,67 en el CI) y un LCP simulado que «baila» de 2,5 a 5,0 s (§4.22).<br>• Concluye que lo que falta (crear el contexto WebGL, una tarea que no se puede partir) solo se arregla con un cambio de arquitectura (`OffscreenCanvas`, §10). Eso es la condición de parada de `CLAUDE.md`: «un criterio de rendimiento es imposible sin cambiar el plan».<br>• «✅ (con dos avisos)» contradice la definición de terminado. | • Cambiar el estado a «⚠️ no cumplido: el explorador en Lighthouse (0,76; LCP simulado de 2,5 a 5,0 s), pendiente de Iván».<br>• Tratarlo como condición de parada: explicarlo en `DIARIO.md` y en el chat al cerrar el bloque. Ya está en `PENDIENTES.md`, con las opciones.<br>• Si se fusiona antes de que Iván decida, que sea con el criterio marcado así, no como cumplido. |
| 2 | **Importante** | `src/app/features/body-panel/body-panel.html:34-41`; `e2e/movil.spec.ts:99`; captura `despues-venus-movil-radar.webp` | **El aviso del radar de Venus no cabe en la ficha del móvil en reposo.**<br>• Con el texto de D49 pasa de dos líneas a tres, y la tercera («ojos.») queda cortada bajo el pie de la hoja y la sombra de «hay más». En la captura «antes» cabía entero.<br>• Es el aviso que D44 y D49 piden a la vista con el radar puesto («no es lo que verían tus ojos»).<br>• El e2e no lo ve: `toBeInViewport()` pasa con un solo píxel visible. | • Que el aviso se vea entero en reposo a 390 px. Por ejemplo, desplazar el cuerpo de la ficha hasta el aviso al encender el radar, o dejar crecer la hoja en reposo mientras el radar esté puesto.<br>• Endurecer el e2e a `toBeInViewport({ ratio: 1 })`.<br>• Captura nueva a 390. |
| 3 | **Importante** | `src/app/features/sky-panel/sky-text.ts:230`; `src/app/features/sky-panel/sky-bar.css:41-42`; captura `despues-critica-cielo-dia-390.webp` | **El arreglo [P1] del cielo de día no llega al móvil.**<br>• A 390 px, la barra del cielo dice «Ahora es de día · noche cerrada desde la…». La hora, que es lo que aporta el arreglo, queda cortada por la elipsis.<br>• El botón «Ver el cielo de esta noche» está dentro del panel plegado.<br>• La crítica señalaba justo ese caso: «la clave del cielo de día está dentro de la hoja cerrada» y «no hay ayuda donde más falta: el cielo de día en el móvil».<br>• El e2e mira el texto, no si se ve. | • Un texto que quepa en la barra a 360–390 px, o dos líneas. Por ejemplo, «De día · noche cerrada a las 19:12», o la hora delante.<br>• Comprobarlo con capturas a 360 y a 390.<br>• Añadir un e2e que compruebe que la hora no queda cortada (`scrollWidth <= clientWidth`). |
| 4 | Menor | `src/app/scene/engine.ts:1096-1098`, `:1147-1153` y `:1208` | **El ritmo de pintado y el aliasing se realimentan.** Tres piezas:<br>• (a) Los frames con espera de 20 a 199 ms entran en `frameIntervalMs` (`continuous` es `dt < 200`), y el aliasing calcula los grados por frame con ese intervalo.<br>• (b) Los giros congelados no cuentan en `screenSpeed`.<br>• (c) Los frames de 250 ms no actualizan `frameIntervalMs`.<br>**El efecto:** un par de frames lentos (una subida de textura) congela un giro que a 60 Hz no se congelaba, y el ritmo lento ya no deja que se descongele: sigue congelado hasta que algo mueve la cámara.<br>**Fobos en alto es este caso** (§4.26: de 5 a 9 FPS con el giro congelado, y 60 FPS si se llega desde 1 h/s). A 1 día/s cae además en la histéresis (18,8° por frame, entre 15 y 20), pero el mecanismo vale para cualquier cuerpo que avance entre unos 6° y 15° por frame. | • Alimentar `frameIntervalMs` solo con los frames pedidos sin espera, o calcular el aliasing con el intervalo de la pantalla.<br>• Contar en `screenSpeed` lo que correría un giro congelado si se descongelara.<br>• Test: tras un frame lento seguido del ritmo lento, ningún giro queda congelado.<br>• En la tabla de §5, Fobos a la velocidad de D33 (1 h/s), como propone §10. |
| 5 | Menor | `e2e/regresion.spec.ts:36` | **El margen de la regresión visual es amplio.**<br>• `maxDiffPixelRatio: 0.01` son 10.240 píxeles a 1280 × 800 y 3.457 a 412 × 839 (medido en las referencias).<br>• Un rótulo (el de Saturno, unos 1000 px), una ficha de la fila o el botón «Índice» podrían desaparecer sin que falle.<br>• Además, el umbral por píxel de serie (0,2) ya absorbe el suavizado de los bordes. | • Medir la diferencia real entre ejecutores: una ejecución del CI con margen 0 la da en el mensaje de error.<br>• Bajar el margen a lo medido, con holgura (`maxDiffPixels` de unos cientos), o enmascarar solo lo que varíe. |
| 6 | Menor | `docs/informes/fase-10.md:121-139` (§4.5) y `:156-162` (§4.8) | **Faltan pruebas visuales de parte de lo que cambia a la vista.**<br>• **La decisión 6:** sus arreglos de maquetación no tienen capturas antes y después en `img/fase-10/`, como pide la regla permanente de las capturas. Son la hoja de la tableta en dos columnas, las vistas de la Tierra del móvil en dos filas, el Índice sobre la barra, el aviso de `/eclipses`, las miniaturas de `/lunas`, las tarjetas de `/planetas/marte` y el 404.<br>• **S2:** se midió con retrasos simulados y solo en escritorio, no con la red móvil de §5 que pide el plan. Con esa red, «antes y ahora» llegan igual. No está en §5, «Desviaciones». | • Capturas antes y después de esos arreglos, en escritorio y en el móvil (la tableta, a 768 px).<br>• La desviación de S2, en §5 del informe. |
| 7 | Menor | `docs/PENDIENTES.md` (sección «Fase 10»); `docs/informes/fase-10.md:477-481` | **El informe dice que están en `PENDIENTES.md` dos cosas que no están:**<br>• la prueba con un lector de pantalla (tarea 3: «prueba manual básica con NVDA o Narrador, con notas en el informe»; tampoco hay notas en el informe);<br>• la medida del Sol de cerca en el móvil de Iván: FPS y batería, con los 10 fotogramas por segundo del nivel bajo (tareas 4 y 5).<br>Tampoco está la decisión sobre la hidratación incremental (hallazgo 8). | • Añadirlas a `PENDIENTES.md`, para Iván y sin bloquear.<br>• En el informe, las notas de lo que sí se ha comprobado del árbol accesible, o quitar la afirmación. |
| 8 | Menor | `docs/informes/fase-10.md:450` y `:485`; `docs/PLAN.md:771` | **La hidratación incremental no se ha hecho, y la justificación solo cubre la mitad.**<br>• La tarea 12 la pedía «primero» por dos motivos: el presupuesto del código propio y que «además baja la tarea larga de la hidratación».<br>• El informe la deja porque el código propio está en 13,98 kB. Pero él mismo culpa a esa tarea (unos 280 ms simulados) de que `/lunas/titan` y `/planetas/marte` no lleguen a 0,95 en el CI, que es por lo que el rendimiento va allí como aviso.<br>• Es un cambio de alcance: está propuesto en §10, pero sin la decisión de Iván ni de la sesión de revisión. | • Que lo decidan la sesión de revisión o Iván, apuntado en `PENDIENTES.md`.<br>• Si va al backlog, decirlo así en el plan. |
| 9 | Menor | `src/app/features/tour/home-tour.ts:76`; `src/app/scene/textures.ts:244-256`; informe §4.9 | **La precarga del recorrido no se ha medido en red y no se cancela al saltarlo.**<br>• En la primera visita, mientras se ve Saturno, en alto se bajan la 8K de día de la Tierra (1.307.490 B) y la 8K de la Luna (3.507.364 B): unos 4,8 MB, además de los 513 kB de la primera vista (§5: ≤ 2,5 MB). En medio, unos 1,0 MB; en bajo, unos 0,36 MB.<br>• Si se pulsa «Saltar» al primer segundo, la descarga sigue.<br>• Ninguna medida pasa por el recorrido: los scripts entran con `?captura=1` o con parámetros. | • Medir la red de la primera visita con el recorrido.<br>• Cancelar las descargas al saltarlo (`AbortController`).<br>• Dejar dicho en el informe a qué presupuesto se cargan: el de las vistas Tierra y Luna, que el recorrido visita. |
| 10 | Menor | `.github/workflows/ci.yml:170-177` | **Los informes de Lighthouse salen también como artefacto del CI**, y la condición 1 de `@lhci/cli` dice «solo en el disco del CI».<br>• El destino `filesystem` está bien, como confirma el log.<br>• Subirlos como artefacto (7 días) va más allá de la letra de la condición. El informe lo dice, pero no como desviación. | Que la sesión de revisión confirme que vale el artefacto del propio CI (como el del build y los `test-results`), o quitar ese paso. |
| 11 | Menor | `src/app/features/explorer-ui/notices.ts:38-55`; `src/app/features/explorer-ui/explorer-session.ts:151` | **El aviso de la llegada desde un eclipse no caduca.**<br>• «Eclipse total de Sol del 12 de agosto de 2026, en su máximo visto desde Fraga» sigue en pantalla al reproducir, al cambiar la fecha o al pasar a otra vista, hasta que se cierra a mano.<br>• Deja de ser verdad («en su máximo»), y está en una región `role="status"`. | Quitarlo al cambiar de vista y cuando el tiempo se aleje del máximo (o al reproducir), con su test. |
| 12 | Menor | `src/app/pages/body-detail/body-labels.ts:30-34` y `:52`; `docs/revisiones/textos.md` (corrección 5 y duda 4); `src/app/pages/about/about-page.html:388-389` | **Dos correcciones de los textos cambian una imprecisión por otra.**<br>• (a) El texto alternativo de las imágenes de Miranda, Ariel, Umbriel, Titania, Oberón y Deimos dice ahora «su superficie real». En las cinco de Urano, del 60,7 al 68,9 % es recreado, y sus imágenes, con el norte iluminado, enseñan sobre todo eso. D45 pide decir lo recreado en la ficha de cada luna. El propio revisor de los textos lo deja como duda 4.<br>• (b) «Las únicas en color hechas bajo las nubes» (las Venera 13 y 14) sigue sin fuente (§4 de `textos.md`). | • (a) Aplicar ya la propuesta de la duda 4 («su superficie, en parte recreada») u otra equivalente, y llevarla a ESTILO §6. No es cuestión de gusto: lo decidió D45.<br>• (b) Quitar el inciso o citar una fuente.<br>• Lo demás de la lista corta, para Iván. |
| 13 | Menor | `src/app/features/moon-panel/moon-panel.ts:162`; referencia `e2e/regresion.spec.ts-snapshots/luna-escritorio-linux.png` | **«94 % iluminada», con un espacio normal.**<br>• La referencia de la regresión lo enseña partido en dos líneas («94» / «% iluminada»).<br>• ESTILO §3 pide el espacio duro, y `sky-text.ts:125` y `today-text.ts:125` ya lo usan.<br>• La fase tocó esta misma función. | `NBSP` antes del `%`, y rehacer las referencias de la Luna. |
| 14 | Menor | `src/app/pages/about/about-page.html:264-293` | **«Rendimiento medido», en «Sobre el proyecto», no está al día con la fase 10**, que según el plan es la medida definitiva:<br>• «58–60» imágenes por segundo «en todas las vistas y niveles» (de la fase 7);<br>• «278 y 85 MB» (la fase 10 mide 278 y 86);<br>• «0,16 ms» (ahora, de 0,17 a 0,19);<br>• el CLS.<br>El revisor de los textos lo señaló (§4) y no se ha cambiado. | Pasar la tabla a las cifras de §4.26 y enlazar el informe de la fase 10. |
| 15 | Menor | `docs/revisiones/fase-10-critica.md:88-99`; `src/app/features/sky-panel/sky-text.ts:207-216`; `src/app/features/sky-panel/sky-panel.ts:225-226`; `src/styles.css:692-695` | **Higiene de documentos y comentarios.**<br>• La «Respuesta a la crítica» sigue con «(pendiente)» en los commits, y la parada de España, como «Propuesta», aunque se hizo (`8319868`).<br>• El JSDoc de `skySummary` quedó encima de `darkStart`, que tiene dos, y `skySummary`, sin el suyo.<br>• `summary` lleva dos JSDoc seguidos.<br>• En `styles.css` sigue el comentario viejo de «‹ Sistema solar» («Discreta, en el color secundario»), encima del nuevo. | Poner en la crítica los commits y el estado real, y recolocar o quitar esos comentarios. |
| 16 | Sugerencia | `lighthouserc.js:31` | `require('playwright-core')` es una dependencia transitiva (de `playwright`, que lo es de `@playwright/test`). Funciona solo porque npm la sube a la raíz. | `require('@playwright/test').chromium`, que es una dependencia directa. |
| 17 | Sugerencia | `src/app/features/view-switcher/view-switcher.spec.ts:38-40` | El clic con Ctrl del test deja en la salida de `npm run check` un «Not implemented: navigation to another Document» de jsdom. | `preventDefault()` en un listener del test, para que la salida quede limpia. |
| 18 | Sugerencia | informe, §2 y §6; `angular.json:52` | **Dos márgenes sin vigilar.**<br>• El JS inicial total, **317,81 kB**, está a 2,19 kB del aviso de 320, y no sale en el informe (solo el código propio).<br>• Con el rendimiento de Lighthouse como aviso en el CI y la medida local hecha a mano, nada automático para una regresión grande de las fichas. | • Dar la cifra en la tabla de §5.<br>• Valorar un suelo como error en el CI (por ejemplo, 0,85 en las fichas): pararía una regresión grande sin saltar por el ruido. |

## Las desviaciones, una a una

- **Lighthouse en el CI, con el rendimiento como aviso (§4.24): justificado.**
  - El diagnóstico es bueno: SwiftShader en páginas que no lo usan, y el `benchmarkIndex` descartado como causa.
  - La mediana es de 5 cargas.
  - Dos ejecuciones del CI con el mismo código lo prueban: la misma página cambia hasta 0,08.
  - La decisión es la de la sesión de revisión. La accesibilidad y las buenas prácticas siguen como error, con 1,00 en todas las cargas.
  - Queda el hueco del hallazgo 18.
- **La hidratación incremental (§5 del informe): no basta.** Hallazgo 8.
- **Fobos de 5 a 9 FPS en alto (§4.26).** Como medida de la GPU, se acepta: a 1 h/s da 60 FPS, y en medio y en bajo, 60. La causa de fondo es lógica y está en el hallazgo 4.
- **El explorador en 0,76: es una condición de parada, no un aviso** (hallazgo 1). El análisis convence: el TBT lo domina `getContext`, unos 210 ms observados y unos 850 ms simulados. Por eso mismo hace falta la decisión de Iván.
- **Justificadas y bien hechas:**
  - **La 8K volteada en el sombreado** y no guardada ya volteada: el mismo ahorro sin regenerar las texturas. Ninguna tarea larga pasa de 200 ms (181 y 74 ms en la primera pasada).
  - **La flecha sola de S9 en el teléfono**, con el nombre accesible «Volver al sistema solar».
  - **La cabecera del explorador a 3rem en el móvil y en la tableta:** el CLS baja de 0,051 a 0,006.
  - **La cúpula del cielo, sin sumar su luz sobre el disco del Sol:** hace falta para que el disco enrojezca.

## Lo que está bien

- **S8, el Sol sin girar**, en su sitio:
  - `bodyFixedToEclWithoutSpin`, en `ephemeris/orientation.ts`, con un test del polo, del meridiano quieto y de J2000;
  - el Sol, fuera del aliasing y del ritmo (`spinDays` nulo);
  - las manchas, quietas, con el calendario determinista;
  - la medida antes y después, de 18,22 a 0,41 a 3 días/s;
  - Lößnitz, fuera del código y de `/creditos`, y «Lo que es ilustrativo» al día.
- **S2 resuelve bien las carreras:**
  - una textura menor que llega sin ninguna puesta se usa de paso;
  - si llega tarde, se suelta;
  - la grande que llega cuando ya no se pide, también se suelta.
  Con su test.
- **La 8K, más barata:** solo las dos texturas de más de 16 Mpx (la de día de la Tierra y la de la Luna) sueltan su `ImageBitmap`, y al recuperar el contexto se vuelven a pedir antes del siguiente frame. Nada vuelve a subir texturas desde un bitmap cerrado (no hay `needsUpdate` sobre texturas ya cargadas).
- **El arranque troceado:**
  - el contexto WebGL, en su propia tarea, y el motor se suelta si se sale mientras tanto (`viewer-canvas.ts`);
  - la compilación, por partes, con `compileAsync(part, camera, scene)`, que respeta las luces de la escena;
  - las etiquetas, medidas de una vez;
  - la tabla del brillo, con la fase llena integrada una sola vez.
  Todo con tests.
- **El bloom, fuera de verdad:** su módulo, sus capas, su puerto, su configuración y sus tests. El chunk de three baja a 806,55 kB.
- **D49, el color de las Venera:**
  - medido en PIA00104;
  - la rampa conserva la luminancia, con un test;
  - la fuente, en `VISUAL_CONFIG`, en `FUENTES.md` y en `/creditos`.
- **Los cálculos nuevos, con tests contra datos independientes:** `moonShadowView` contra el punto de la NASA y su geometría, y `lunarEclipsePhase` contra los eclipses de Luna del fixture de la NASA.
- **Los decimales de las fuentes (`digits`):** salen del script, y `body-data.ts` se ha regenerado, no editado a mano.
- **Las tres correcciones de los textos de los cuerpos** (Ío, Titania y Oberón) dicen lo que dicen sus citas: lo he comprobado en `body-texts.json`.
- **Las reglas permanentes:**
  - three, solo en `scene/`;
  - sin `any`, sin `console.log` y sin `effect()` nuevos;
  - `@Service()` para `ExplorerMemory`, `host` en lugar de decoradores e `input`/`model`;
  - `dispose()` de la capa de los lugares;
  - la precarga, al mismo origen (CSP `connect-src 'self'`);
  - nada de terceros en la aplicación.
- **El CI:**
  - `--grep-invert @regresion` solo en el push de referencias;
  - el mensaje del commit no se interpola en el script, solo el resultado de `contains`;
  - las referencias salen como artefacto y el CI no escribe en el repositorio;
  - Lighthouse con sus tres condiciones (la del artefacto, en el hallazgo 10).
- **La 10.a, bien integrada:**
  - una fusión `--no-ff` con dos padres (`49676a2`);
  - en `public/textures` solo cambian las lunas (72 ficheros: 18 lunas, en 1k y 2k, el viejo y el nuevo);
  - los generados, con su cabecera;
  - el CI, en verde después de juntarla.
- **A la vista:**
  - «‹ Sistema solar» se reconoce como botón y tiene el foco de latón;
  - el nombre de Saturno va sobre sus anillos;
  - los lugares de España, con su nombre;
  - el aviso de la llegada desde un eclipse;
  - «Luz rasante» se ve entero con el foco;
  - las referencias de la regresión, completas y sin estados de carga.
