# Revisión: Fase 6
Veredicto: CAMBIOS NECESARIOS

- **Fecha:** 2026-10-31
- **Revisor:** subagente revisor automático (sin el contexto de la sesión que programó la fase)
- **Revisado:** la rama `fase-6-luna` (9 commits, de `5ff97ca` a `3488644`) frente a `main`, el informe `docs/informes/fase-6.md`, las 18 capturas de `docs/informes/img/fase-6/` y C4 de `docs/revisiones/bloque-C.md`.

## Comprobaciones

**`npm run check`** (lo he lanzado yo, código de salida 0):
- lint y Prettier, limpios;
- **546/546 tests** en 63 ficheros; cobertura de `ephemeris/`: 99,47 % de sentencias y 95,8 % de ramas;
- build: JS inicial de 298,66 kB, `three` de 689,53 kB e interfaz diferida (`explorer-ui`) de 284,53 kB, **con un aviso de presupuesto**: `explorer-ui.css exceeded maximum budget. Budget 4.00 kB was not met by 23 bytes with a total of 4.02 kB` (hallazgo 3);
- `check-initial-bundle.mjs`: sin `three` ni `astronomy-engine` en el JS inicial, y 12,13 kB de 15 de código propio.

**e2e:** `npx playwright test e2e/luna.spec.ts --project=escritorio --workers=1` → 3/3 (25,8 s). La batería completa no la he lanzado.

**Mis comprobaciones** (scripts en un directorio temporal, fuera del repositorio):
- **Recursos:**
  - el SHA-256 de `lroc_color_poles_8k.tif` y de `ldem_16_uint.tif` coincide con el manifiesto y con `FUENTES.md`;
  - la página de NASA SVS 4720 confirma lo que da por hecho `build-relief.mjs`: «units of half-meters relative to this radius» (1737,4 km), «offset by +20,000 (10 km)» en los TIFF sin signo y el mapa «centered on 0° longitude»;
  - la página dice también que el color de 2019 rellena las latitudes altas «with a lower resolution monochromatic albedo map», y que la versión de 2025 «adds greater detail in the polar regions».
- **La elevación publicada (D15):**
  - he decodificado los WebP de 2K y 1K y los he comparado con `loadElevation`: el error máximo es de 0,156 m (medio paso de 0,313 m);
  - ningún valor cae fuera de −9500…11 000 m (en 2K, de −8698 a 10 513 m);
  - sondas en 2K (`node scripts/build-relief.mjs moon` a una carpeta temporal): el punto más alto queda a 0,8° de Engel'gardt y el más bajo, a 1,1° de Antoniadi.
- **Datos de `tours.ts`, con sus fuentes:**
  - las coordenadas casan con el Gazetteer redondeadas a la centésima: Statio Tranquillitatis (0,67°; 23,47°), Copernicus (9,62°; −20,08°; 96,07 km), Tycho (−43,30°; −11,22°; 85,29 km), Mare Orientale (−19,87°; −94,67°), Shackleton (−89,67°; 129,78°; 20,92 km), Engel'gardt (5,39°; −159,47°) y Antoniadi (−69,30°; −173,06°);
  - los subtítulos están respaldados por sus páginas:
    - NASA Moon Facts: «Their rotations are so in sync we only see one side of the Moon», los mares como «impact basins that were filled with lava» y la cara oculta «"dark side", but that's misleading»;
    - el polo sur: el Sol «a few degrees above the horizon», y «Some deep craters haven't seen the light of day for billions of years»;
    - Orientale: «about 600 miles (950 kilometers) across», «extreme western edge», «ripples in the lunar crust» y «over 3 billion years old»;
    - Tycho: «the youngest large crater on the nearside» y «85 kilometers wide»;
    - Shackleton: su borde, casi siempre al sol, y su interior, «perpetually in shadow».
  - Nada inventado, y todo con `reviewed: false`.
- **Efemérides:**
  - la libración de las capturas (`Libration`): +6,65° el 6-1-2026 a las 06:00 UT y −6,60° el 21-11-2026 a las 18:00 UT;
  - las fases de las capturas (`MoonPhase`): nueva, 0,00°; cuarto, 90,00°; llena, 180,00°;
  - `nearestMoonPhase`, reproducida con la misma lógica y astronomy-engine, frente a la fase más cercana de verdad (hallazgo 2);
  - `nearestMoonSunElevation`: unas 370 evaluaciones de Sol, Luna y eje cuestan ≈ 5 ms en este PC, sin riesgo de tarea larga.
- **Capturas:**
  - he revisado las 18 en PNG;
  - en el meridiano 180° (`vista-cara-oculta`), la diferencia media de cada columna con sus vecinas, de x = 760 a 840, va de 4,0 a 7,4 y no destaca en el centro: no hay raya;
  - las zonas táctiles del panel en `movil-luna` miden 88 px a 2× (44 px);
  - **el polo, reproyectado** (hallazgo 1): he llevado a una vista azimutal del polo sur (±3,5°) la 8K de color, la `moon-normal` de 4K publicada y un sombreado calculado en la propia proyección polar a partir de `loadElevation(…, 4096)`, con `minCosLat` 0,02 y 0,001.
- **No comprobado:** los radios de la umbra y la penumbra de la ficha en PDF del 3-3-2026 (0,6983° y 1,2361°), porque se me acabó la cuota de descargas. Las magnitudes, gamma y la duración de las fases del catálogo sí casan con los tests.

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | **Bloqueante** | `docs/informes/fase-6.md:68`, `:90-94` · `docs/informes/img/fase-6/recorrido-shackleton.webp`, `vista-polo-sur.webp` · `src/app/data/tours.ts:327-340` · `scripts/build-relief.mjs:50-60` | **El polo sur, de cerca, sigue saliendo como un «sol de rayas», y el informe dice que está resuelto.** En `recorrido-shackleton`, un abanico de rayas radiales llena todo el lienzo y, en el centro, hay una mancha de ruido de unos 60 × 40 px. Shackleton no se reconoce. En `vista-polo-sur` (a 1,7 radios), el mismo abanico se ve en pequeño, de unos 35 px alrededor del polo. Aun así, el criterio «Sin costuras visibles… en los polos» se da por cumplido con esa captura como prueba, y el §4.4 dice que «queda un único píxel de ruido en el polo exacto». Lo he reproducido fuera del shader. La `moon-normal` de 4K publicada, reproyectada al polo y sombreada con el Sol a 1,5°, da el mismo abanico. También sale si el sombreado se calcula en la propia proyección polar a partir de la elevación de 4K, con `minCosLat` 0,02 o 0,001. La fila del polo de esa elevación va de 148 a 1442 m, con saltos de hasta 190 m entre columnas vecinas separadas 2 m. **Es el límite de los datos equirrectangulares de 16 px/° junto al polo** (unos 2 km por fila en latitud), no del shader. El color, reproyectado igual, solo tiene rayas leves. La esfera cúbica, el truco de Tarini y `textureGrad` hacen bien su parte; lo que falla es el dato. | **Opción buena:** adelantar la propuesta 1 del informe. Casquetes polares (por encima de unos 80–85°) en proyección azimutal, generados por `build-relief.mjs` / `build-textures.mjs`: la elevación y las normales, de los modelos de elevación polares del LOLA (estereográficos, del PDS; comprobar la cobertura y la licencia), y el color, de una fuente con más detalle polar (la versión de 2025 del CGI Moon Kit o los mosaicos polares del LROC WAC). Se mezclan en el shader por latitud. Con su peso y su VRAM en §6, y capturas antes y después de Shackleton y del «Polo sur». **Si no se hace en esta fase:** alejar y ladear la cámara de Shackleton y del polo hasta que el abanico no domine, corregir el informe (el criterio, parcial, con la captura que lo enseña) y llevar los casquetes a Iván como cambio de plan. |
| 2 | Importante | `src/app/ephemeris/moon-light.ts:42-60` · `src/app/ephemeris/moon-light.spec.ts:33-46` · `docs/informes/fase-6.md:87` | **`nearestMoonPhase` no da la fase más cercana poco después de ella: salta un mes.** La búsqueda «antes» empieza un mes sinódico medio atrás, y `SearchMoonPhase` devuelve la primera fase de esa ventana. Cuando la lunación anterior es más corta que la media, en la ventana caben dos fases, y se queda con la de hace un mes. Ejemplos en las fechas de la propia app: una hora después de la llena del 26-10-2026 (04:12 UT), «Cara visible» lleva al **24-11** (+29,4 días), no una hora atrás; y desde el 24-11 + 1 h, al 24-12. Desde el 14-10-2026, pulsar «Cara oculta» dos veces lleva al 10-10 y después al 11-09. En 2000–2030, a 0,05, 1, 3, 6, 9 y 12 h de cada llena o nueva, falla en 907 de 4614 instantes. El informe promete «a menos de medio mes», y el comentario de la función, «como mucho, un mes». El test solo prueba un caso que funciona. | Partir de t − 16 días: buscar la primera fase y la siguiente, y quedarse con la más cercana dentro de 1900–2100. Tests: el 26-10-2026 a las 05:12 UT para la llena (debe dar el 26-10 a las 04:12), dos pulsaciones seguidas y una fecha justo después de una fase con la lunación anterior corta. |
| 3 | Importante | `src/app/features/explorer-ui/explorer-ui.css:169-181`, `:258`, `:264` · `docs/informes/fase-6.md:109-117` | **El build da un aviso de presupuesto, y el informe dice que no.** `explorer-ui.css` pasa de 4 kB (4,02 kB) por los selectores de `.moon-panel` del último commit de código (`02e6e53`: de 7714 a 7834 bytes). La salida del §6 («build sin avisos de presupuesto»; interfaz diferida de 284,39 kB) es de antes de ese commit; hoy son 284,53 kB. La definición de terminado pide `npm run check` sin avisos de presupuesto. | Bajar ese CSS de 4 kB, por ejemplo con una clase común para los dos paneles (`view-panel`) en lugar de repetir `.earth-panel, .moon-panel` en cuatro selectores. Volver a pasar `npm run check` y los e2e de la fase con el código final, y poner al día el §6. |
| 4 | Menor | `src/app/scene/world.ts:533-535`, `:890-903` · `src/app/scene/engine.ts:1469-1472` · `src/app/scene/engine.spec.ts:1236-1286` | **C4: los tests de la VRAM solo miran las vistas ya asentadas, no el viaje Tierra ↔ Luna.** Los dos usan movimiento reducido, sin viaje. Con el viaje de 3 s, `setFocus` pide los mapas de la Luna al empezar, pero la Tierra conserva los suyos mientras mida 120 px o más (`large`). Las 8K esperan al final del viaje (`waitsForCamera`), así que no coinciden. Pero las normales de 4K y la elevación de 2K de la Luna (50,7 MiB) sí pueden subir con la Tierra aún completa: unos 329 MiB en alto durante un momento (278 + 50,7). A la vuelta pasa lo mismo, con los mapas de 2k de la Tierra sobre los 262 de la vista Luna. Tampoco hay test de la histéresis (160 / 120 px). | Añadir un test del motor sin movimiento reducido que recorra el viaje con la fuente realista y compruebe el máximo de `vramMB`. Si pasa de 300, soltar los mapas del primer plano del foco anterior al empezar un viaje de vista, o subir los del foco nuevo después. Añadir el test de la histéresis. |
| 5 | Menor | `src/app/scene/materials/body-material.ts:81-85`, `:153` · `src/app/scene/cube-sphere.ts:65-77` | **`atan(0, 0)` en el vértice del polo.** Con `segments` par (128, 72 y 48), la esfera cúbica tiene un vértice exactamente en (0, ±1, 0), y el vertex shader calcula su u con `atan(-d.z, d.x)`. GLSL ES deja `atan(0, 0)` sin definir. ANGLE sobre D3D11 da 0, pero una GPU que dé NaN leería la elevación con u = NaN, y el vértice del polo podría bajar hasta −9,5 km, el mínimo del intervalo. Le pasa lo mismo a `SphereGeometry` cuando la Luna se ve grande sin estar enfocada. Aún no se ha probado en un móvil. | Si `abs(d.x) + abs(d.z)` es casi 0, usar u = 0, porque en el polo cualquier u vale. Lo mismo en `tlsMoonUv`. |
| 6 | Menor | `src/app/ephemeris/constants.ts:10-18` | **El comentario dice que «un test de la escena» comprueba que `SUN_RADIUS_KM` y `MOON_RADIUS_KM` coinciden con el catálogo, pero ese test no existe**: ningún spec los importa. Hoy coinciden (695 700 y 1737,4 km). | Añadir el test (en `scene/` o en `data/`, que pueden importar los dos) o quitar la frase. |
| 7 | Menor | `src/app/scene/visual-config.ts:120-128` · `src/app/scene/materials/body-material.ts:354` · `docs/informes/fase-6.md:105` | **La luz de la umbra: una cifra sin fuente y un valor ilustrativo fuera de la configuración visual.** Se afirma que la luz real «ronda una diezmilésima» (≈ 1/10 000) de la del Sol, sin fuente (`CLAUDE.md`: no inventar cifras). Además, el oscurecimiento hacia el eje de la umbra (×0,35) está escrito en el shader, no en `VISUAL_CONFIG` con su motivo, como pide D21. | Citar una fuente (el brillo de la Luna eclipsada según la escala de Danjon, por ejemplo) o quitar la cifra. Llevar el 0,35 a `VISUAL_CONFIG.moon.umbraLight`, con su comentario. |
| 8 | Menor | `docs/PLAN.md:587` · `src/app/scene/quality.ts:36-41`, `:76` · `docs/informes/fase-6.md:86-98` | **El plan pide el mapa de normales «a resolución completa», y se publica como mucho en 4K**: menos que los 5760 px del LOLA de 16 px/° y la mitad que la 8K de color. Tiene sentido por la VRAM: unas normales de 8K añadirían unos 128 MiB, y la vista Luna pasaría de 300 MB. Pero el informe no lo cuenta como desviación; solo cuenta la elevación en 2K (§4.5). | Añadirlo a §4, con la cifra de VRAM que lo justifica. |
| 9 | Menor | `docs/PENDIENTES.md:70-84` · `docs/informes/fase-6.md:163-169` | **`PENDIENTES.md` no está al día.** Falta «Probar la vista Luna en tu móvil», con los FPS y el tamaño del panel (§9 del informe). La entrada de `toktx` (fase 6) sigue abierta, aunque el informe concluye que no hace falta. Y las propuestas del §10 (los casquetes polares y la luz de la umbra) no están para que Iván decida. | Añadirlas y cerrar la de `toktx` con la conclusión y sus cifras (278 y 262 MB de 300). |
| 10 | Menor | `src/app/features/moon-panel/moon-panel.ts:71-79`, `:122-128`, `:160-172` | **Con movimiento reducido hay dos botones con casi el mismo nombre que no hacen lo mismo:** «Parada siguiente» (el chevrón, que en la última parada no está disponible) y «Siguiente parada» (el botón grande, que en la última vuelve a la primera). Para un lector de pantalla son indistinguibles, y en el extremo se comportan distinto. | Diferenciarlos: que el botón grande no cambie a un nombre casi igual al del chevrón (por ejemplo, «Seguir el recorrido») o que no dé la vuelta. Anotarlo en `ESTILO.md`. |
| 11 | Menor | `src/app/scene/world.ts:319`, `:487`, `:972-978` · `src/app/scene/cube-sphere.ts:96` | **La esfera cúbica se crea siempre, aunque nunca se visite la Luna, y deja de contar en la VRAM al salir de su vista.** En alto son unos 5,6 MB de arrays en JS desde el arranque: posición, una copia de la posición como normal, uv e índices de 32 bits. Tras enfocar la Luna, sus búferes siguen en la GPU hasta `dispose()`, pero `vramBytes()` solo los suma con la Luna enfocada. | Crearla al enfocar la Luna por primera vez (o liberarla al salir de su vista) y contarla mientras exista. La normal puede salir de la posición en el shader, sin el segundo array. |
| 12 | Sugerencia | `src/app/scene/quality.ts:77` · `scripts/build-textures.mjs` (`moon-elevation`) | En alto, la elevación de 2K pesa 2,7 MiB de descarga y 8 MiB de VRAM, pero la malla tiene unos 512 vértices en el ecuador (0,7° entre vértices): la de 1K (0,35° por píxel) ya da dos muestras por vértice. | Usar la de 1K también en alto, o justificar la de 2K. |
| 13 | Sugerencia | `src/app/scene/world.ts:121-125`, `:375-377`, `:670-684` | `BodyMap.uniform` y `flag` pasan a ser `string` y `mapUniforms` sale de un `as unknown as`. Si hay una errata en el nombre de un uniforme, el `if` la oculta sin avisar. | Tiparlos con la unión de los nombres de `EARTH_MAPS` y `MOON_MAPS`. |
| 14 | Sugerencia | `src/app/features/moon-panel/moon-panel.css:58-61` | `.moon__label` no se usa en la plantilla. | Quitarla. |
| 15 | Sugerencia | `docs/informes/fase-6.md:30` | El plan del propio informe (6.b) promete comprobar en la escena el punto subterrestre de la malla. No se ha añadido. El criterio queda cubierto por `orientation.spec.ts` (fase 2) y las capturas. | Añadir ese test o quitar la frase del plan del informe. |
| 16 | Sugerencia | `src/app/features/moon-panel/moon-panel.ts:183-193` · `src/app/features/explorer-ui/explorer-ui.css:173` | Con el índice abierto, el panel se oculta, pero el recorrido sigue: mueve la cámara y anuncia subtítulos cada 12 s, sin un botón de pausa a mano. | Parar el recorrido al abrir el índice, o anotarlo como intencionado. |

## Lo que está bien
- **El relieve (D15):**
  - 16 bits en R y G, en WebP sin pérdidas, con una comprobación byte a byte en el build;
  - sin mipmaps (con su VRAM bien contada), `LinearFilter`, `NoColorSpace` y `colorSpaceConversion: 'none'`;
  - la lectura en el vertex shader es correcta: el filtrado lineal es lineal en los dos bytes, y `65280·R + 255·G` reconstruye el valor;
  - el desplazamiento, a escala física sobre la esfera de 1737,4 km (la Luna del catálogo no tiene achatamiento, así que no se cuenta dos veces);
  - las sondas de pendiente de Copérnico tienen los signos bien.
- **La esfera cúbica:**
  - sin grietas (6n² + 2 puntos distintos), con los triángulos hacia fuera, los mismos ejes que `SphereGeometry` y `dispose()` al cambiar de nivel y al liberar la escena;
  - las coordenadas por píxel (Tarini) no dejan raya en el meridiano 180°;
  - `textureGrad` con la derivada de u por cos φ es la solución correcta para el color.
- **La sombra de la Tierra:**
  - `earthShadow` es la regla de Danjon de la NASA (el radio a 45° de latitud por 1 + 1/85, con el Sol aparente);
  - casa con el catálogo en tres eclipses (gamma, magnitudes, máximo y duración de las fases);
  - `tlsShadow` deja igual la sombra de la Luna sobre la Tierra (mismas ramas en x, y su test de la fase 5 sigue pasando);
  - `updateEarthShadow` calca `updateEclipse`, en float64 y con su test frente a `earthShadow`;
  - la luz rojiza está documentada como ilustrativa (salvo lo del hallazgo 7).
- **C4:**
  - en la vista Luna, la Tierra pide su 1k y suelta la 8K y sus mapas de cerca (con test, y las texturas soltadas se liberan con `dispose()`);
  - la histéresis está bien implementada;
  - las 8K esperan al final del viaje;
  - las cifras de VRAM, peso y FPS de §6 se sostienen con los tamaños de los ficheros.
- **El panel:**
  - `aria-pressed` solo en las vistas;
  - `aria-disabled` sin perder el foco;
  - anuncios por la sesión, sin regiones vivas propias;
  - paso a paso con movimiento reducido;
  - temporizador limpiado con `DestroyRef`;
  - Public Sans 600 en los rótulos y zonas táctiles de 44 px: las lecciones de la fase 5, aplicadas.
- **Capas, tipos y textos:** capas respetadas, sin `any` en el código de producción, textos en español con fuente y `reviewed: false`, y `FUENTES.md`, `/creditos` y `ESTILO.md` al día.
