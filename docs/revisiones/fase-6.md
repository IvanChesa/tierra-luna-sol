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

## Segunda ronda
Veredicto (segunda ronda): APROBADA CON CAMBIOS MENORES

- **Fecha:** 2026-10-31
- **Revisor:** subagente revisor automático (sin el contexto de la sesión que programó la fase)
- **Revisado:** los cinco commits de corrección (`a52c4ba` a `70c4ccb`; `git diff 3488644..fase-6-luna`: 54 ficheros, +1120 −191), la «Respuesta a la revisión» y los §1–§7 de `docs/informes/fase-6.md`, las capturas nuevas y las `antes-*`, `scripts/lola-polar.mjs`, los WebP publicados del atlas, `docs/FUENTES.md`, `/creditos`, `PENDIENTES.md` y el CI de la rama.

### Comprobaciones

**`npm run check`** (lanzado por mí; código de salida 0, en 1 min 8 s):
- lint y Prettier, limpios;
- **555/555 tests** en 63 ficheros; cobertura de `ephemeris/`: 99,47 % de sentencias y 95,48 % de ramas;
- build **sin avisos de presupuesto** (el de `explorer-ui.css` ya no sale): JS inicial de 298,66 kB, `three` de 692,71 kB e interfaz diferida de 284,39 kB;
- `check-initial-bundle.mjs`: sin `three` ni `astronomy-engine` en el JS inicial, y 12,13 kB de 15 de código propio.

**e2e** (con ese build y un trabajador; el árbol de trabajo, limpio antes y después):
- `luna.spec.ts` en escritorio: 3/3 (25,7 s);
- `movil.spec.ts` y `accesibilidad.spec.ts` en el proyecto `movil`: 11/11 (1,1 min);
- `tierra.spec.ts` y `maquetacion.spec.ts` en escritorio: 13/13 (28,2 s), por la clase nueva de los paneles.
- El CI de GitHub del último commit (`70c4ccb`, ejecución 41157355776), en verde: lint, tests y build; la batería e2e completa (73 en 11,9 min); y la vista previa en Cloudflare Pages.

**El Bloqueante (los casquetes polares):**
- **Las matemáticas, revisadas a mano:**
  - **La proyección.** La estereográfica del GLSL, `p = (−z, s·x) / ((1 + |y|)·tan 7,5°)`, es la del script (r = tan(c/2) / T; x = r·sen λ, y = ±r·cos λ), con λ = atan2(−z, x), la longitud de la malla.
  - **El atlas.** Su disposición (el sur en u ∈ [0; 0,5], el norte en [0,5; 1] y v = 0,5 + 0,5·y) casa con la carga: con `imageOrientation: 'flipY'` y `texture.flipY = false`, la fila 0 (y = +1) va a v = 1. Casa también con `ClampToEdge`, porque `polar-caps` no repite en u, y con los mipmaps.
  - **El paso al este–norte.** En el sur, el este del plano es (y, −x)/r y el norte, (x, y)/r: las derivadas de la proyección respecto a λ y a φ. En el norte cambian los dos de signo. Las componentes son productos escalares, que valen aunque la proyección invierta la orientación.
  - **El suelo.** La estereográfica es conforme, con escala sec²(c/2). `ground = 1/(1 + (r·T)²) = cos²(c/2)` pasa las diferencias del plano a metros del suelo. El píxel mide 4·R·T/n: 893 m en 2k y 1,79 km en 1k, con 4 × 4 y 8 × 8 muestras de los 240 m del modelo.
  - **Las convenciones del PDS.** Las que elige el script por correlación (en el sur, y = ρ·cos λ; en el norte, y = −ρ·cos λ; un desfase de 1905,5, el centro de 3812 px contando desde 0) son las de las etiquetas PDS, que he leído, y las de su disposición simétrica.
  - **Las derivadas.** Las de `textureGrad` se calculan antes del `if (w <= 0.0)`, que es flujo no uniforme. `reliefNormal` solo se llama con una condición uniforme (`uNormalStrength > 0.0`), y así también las derivadas de `tlsSurface`. El salto de casquete del ecuador (cambia `s`) cae donde w = 0.
  - **Sin casos raros.** No hay `atan`, r tiene un mínimo de 1e−6 y la mezcla de 76° a 78° usa el seno de la latitud, con los bordes de `smoothstep` en orden.
- **`node scripts/lola-polar.mjs`, a una carpeta temporal.** Reproduce las cifras del informe:
  - la elevación frente a la equirrectangular: 0,999 en el sur y 0,993 en el norte;
  - las normales donde se mezclan: este 0,92 y norte 0,87 en el sur, y 0,87 y 0,83 en el norte;
  - Shackleton: fondo a −2786 m, borde a 1208 m de media y paredes hacia dentro (0,48).

  El sombreado de prueba (`moon-poles-shade.png`) no tiene rayas. Shackleton sale como un hoyo a unos 11 px del centro del casquete sur, donde le toca (a 0,33° del polo).
- **Lo publicado, comprobado por mi cuenta** (script propio):
  - Leo `2k/moon-normal-poles.6841cfd741.webp` y `4k/moon-normal.b1102eeaa5.webp` como el shader (bilineal y con flipY), y llevo el atlas al este–norte con las fórmulas del GLSL.
  - **Contra las normales equirrectangulares**, de 76° a 78°, el atlas correlaciona 0,93 en el este y 0,88 en el norte en el sur, y 0,90 y 0,83 en el norte.
  - **El ángulo entre las dos normales:** mediana de 2,1° a 2,6° y percentil 90 de 5° a 6°, también a 80–82° y a 85–87°. En la mezcla no puede quedar costura.
  - **Shackleton**, por la tubería del shader: su normal apunta hacia el centro (0,48).
  - **Control negativo:** con el atlas leído sin flipY, las correlaciones van de −0,01 a 0,07. La prueba distingue la orientación.
  - **Nivel bajo** (atlas de 1k y normales de 2k): 0,91 y 0,85 en el sur, y 0,87 y 0,78 en el norte.
- **Las capturas:**
  - En `recorrido-shackleton` ya no están el abanico ni la mancha de ruido de `antes-recorrido-shackleton`: se ven cráteres y, junto al polo, un hoyo con el borde iluminado.
  - `vista-polo-sur` y `movil-vista-polo-sur`, ampliadas: el abanico centrado en el polo ha desaparecido, y no se ve el anillo de la mezcla.
  - `luna-polo-sur` y `antes-luna-polo-sur`, desde esa distancia, son casi iguales.
  - He repetido `luna-polo-sur` con el build actual: coincide con la publicada (diferencia media de 0,64 por canal), con 265,3 MB de VRAM.
- **El polo norte**, que no tiene captura en el informe: en las mías, con `latitud=75` y `latitud=88` (el encuadre de `luna-polo-sur`), no hay abanico ni costura.
- **Fuentes y licencia:**
  - el SHA-256 de `ldem_75{s,n}_240m.img` y de sus `.lbl` coincide con el manifiesto y con `FUENTES.md`;
  - el pie de la página del PDS (`lola.htm`) enlaza «Copyright/Image Use Policy» con la política de JPL, que dice «may be used for any purpose without prior permission» (con crédito y sin dar a entender respaldo), como cita `FUENTES.md`;
  - `/creditos` nombra los modelos polares, con enlace.

**Hallazgo 2.** Copio la lógica nueva de `nearestMoonPhase` en un script con astronomy-engine y la comparo con la fase más cercana de verdad:
- **0 fallos en 21 080 instantes** de 1900–2100, con una diferencia máxima de 0,1 s. Son lunas nuevas y llenas, de 14,5 días antes a 14,5 días después de cada fase: todas las de 1900–1902 y 2098–2100, y una de cada tres en medio.
- En ese periodo, las lunaciones duran de 29,274 a 29,830 días. La ventana de ±16 días siempre contiene la fase más cercana, y en 32 días caben como mucho dos.
- Los ejemplos de la primera ronda ya salen bien. El 26-10-2026 a las 05:12 UT da la llena de las 04:12. «Cara oculta» desde el 14-10, pulsado dos veces, da el 10-10 las dos.

**`WAIT_FOR_CAMERA_PX`:**
- **Qué espera ahora.** Mira `texture.image.width ≥ 2048`. Esperan al final de los viajes (`flight`, de 2 a 3 s) o de las transiciones de marco (`frames.animating`, finitas) todas las texturas del primer plano de cualquier cuerpo:
  - las de 4k (alto) o 2k (medio y bajo) de los planetas;
  - los anillos de Saturno de 2k y 4k;
  - las nubes, la noche, el océano y las normales de la Tierra;
  - y la Vía Láctea de 2k, si se pide durante un viaje.
- **Dónde no cambia nada.** En la vista general todo es de 1k. Los recorridos y las vistas guiadas de la Tierra y de la Luna mueven la cámara con el rig (`lookAtSurface` → `setTarget`), no con `flight`, así que no retienen subidas.
- **Sin subidas a destiempo.** Sube una por frame, y la textura solo se asigna tras `initTexture`, así que esperar no provoca subidas perezosas a mitad del viaje.
- **Lo que se ve.** Durante el viaje, el nivel anterior; al aterrizar, el primer plano, como ya pasaba con la 8K.
- **Veredicto:** correcto y documentado (el comentario y el §5 del informe). Lo único que empeora es el caso de la sugerencia 6.
- **El test del viaje** (`engine.spec.ts:1336`) mide de verdad frame a frame: `h.frames(16, 62.5)` es un solo frame.

**`updateLarge`, tras proyectar:**
- Se llama en `renderFrame` después de `updateScreen()` (`engine.ts:895`), también en los frames que no se pintan, que usan la misma proyección.
- El test de los casquetes (`engine.spec.ts:1432`) pasa de la vista Luna a la del sistema con movimiento reducido. Exige `uHasPoleNormals = 0` y que el atlas se libere. Con la llamada de antes, tras un corte con el motor en reposo, no se cumpliría.

**La esfera cúbica:**
- **Su vida.** Se crea en `setFocus` con la Luna enfocada y se libera al dejar de enfocarla, después de reasignar las mallas. Al cambiar de calidad, `setQuality` la libera y el `setFocus` con el que acaba la rehace con los segmentos nuevos. El `dispose()` de la escena la libera si existe, y `vramBytes()` la cuenta mientras existe.
- **Lo que cuesta crearla** (en V8, en este PC): con 128 segmentos, de 10 a 35 ms; con 72, unos 5; con 48, unos 2. No hay riesgo de tarea larga.

**La normal, desde la posición:**
- Todas las mallas con el material común son `SphereGeometry(1, …)` o la esfera cúbica, centradas.
- El achatamiento va en la escala de la malla (`world.ts:856`), que `normalMatrix` ya tiene en cuenta: el resultado es el mismo que con `normal`.
- El vertex shader ya no lee el atributo `normal`: solo aparece en un comentario.

**Cifras del informe:**
- **El peso** de las texturas de la vista Luna, con los tamaños de `texture-files.ts`: 5,10, 1,96 y 1,19 MiB en alto, medio y bajo, como en el §6.
- **La VRAM** de la vista Luna en alto, 265 MB: la he medido en mi captura.
- **La subida del atlas:** 214 KiB más de descarga y 10,7 MiB más de VRAM. Cuadra.

### Hallazgos de la primera ronda

| # | Severidad | Estado | Evidencia |
|---|---|---|---|
| 1 | Bloqueante | **Resuelto** | **Casquetes polares:**<br>- el atlas `moon-normal-poles` y `tlsPolarRelief` (`body-material.ts:191-204`), mezclados de 76° a 78°;<br>- las matemáticas y lo publicado, comprobados arriba;<br>- sin el abanico en `recorrido-shackleton`, `vista-polo-sur` y `movil-vista-polo-sur`, frente a las `antes-*`;<br>- el norte, en capturas mías.<br>El color y la elevación de los vértices siguen sin casquete, como justifica el §4.4, y en las capturas no se nota. Falta la captura del norte: hallazgo nuevo 1 |
| 2 | Importante | Resuelto | `moon-light.ts:46` y `:55-70` (±16 días: la primera fase y la siguiente). 0 fallos en 21 080 instantes de 1900–2100 (script mío). Tests nuevos (`moon-light.spec.ts:48` y `:67`): las 49 fases de 2026 a ±12 h, la llena del 26-10 y dos pulsaciones |
| 3 | Importante | Resuelto | `npm run check`, sin avisos de presupuesto. La clase común `view-panel` (`explorer-ui.css:173`, `:178`, `:257` y `:263`; `explorer-ui.html:59` y `:64`) tiene la misma especificidad que el `:is()` de antes, y no quedan referencias a `.earth-panel` ni a `.moon-panel`. Los e2e de móvil, maquetación y Tierra, en verde |
| 4 | Menor | Resuelto | `engine.ts:174` y `:1480`. Tests: `engine.spec.ts:1336` (el viaje, frame a frame y con la subida de verdad: ≤ 300 MB en los dos sentidos), `:1377` (la histéresis de 160 y 120 px) y `:664` (la de 2k espera; la de 1k, no). El fallo de «se ve grande» con la proyección anterior queda cubierto por `:1432` |
| 5 | Menor | Resuelto | `body-material.ts:99` y `:173`: u = 0 si \|x\| + \|z\| ≤ 1e−7. `tlsPolarRelief` no usa `atan` |
| 6 | Menor | Resuelto | `body-data.spec.ts:47`; el comentario de `constants.ts` lo cita |
| 7 | Menor | Resuelto | La cifra «≈ 1/10 000» ya no está ni en el código ni en el informe. El 0,35 pasa a `visual-config.ts:130` (`axis`, con su motivo) y llega al shader en `uUmbraAxis` (`configureMoon`) |
| 8 | Menor | Resuelto | `docs/informes/fase-6.md:93` (§4.6), con los 128 MiB |
| 9 | Menor | Resuelto | `PENDIENTES.md:84` (el móvil), `:86` (la luz de la umbra) y `:89` (`toktx`, cerrado con sus cifras); los casquetes, cerrados |
| 10 | Menor | Resuelto | `moon-panel.ts:129-134`: «Seguir el recorrido» y, en la última parada, «Volver a empezar», que es lo que hace `toggleTour` en los dos modos. Al día: `ESTILO.md`, `moon-panel.spec.ts:81` y `:124` y `e2e/luna.spec.ts:66`, que pasa |
| 11 | Menor | Resuelto | `world.ts:537`, `:552`, `:562` y `:1059`; `vramBytes()` la cuenta mientras existe. Sin el atributo `normal`: 1,2 MB menos. Test `engine.spec.ts:1401`, con el evento `dispose`. El cambio de calidad no tiene test: sugerencia 8 |
| 12 | Sugerencia | Resuelto | La elevación, de 1K también en alto (`quality.ts:79`; `maxWidth: 1024`). La de 2K ya no está en `public/` ni en `texture-files.ts`. Quedan una cifra mal en el informe (hallazgo nuevo 2) y un comentario desfasado (hallazgo nuevo 3) |
| 13 | Sugerencia | Resuelto | `world.ts:110-127`: los uniformes, las banderas y los niveles, con uniones de sus nombres y sin `as unknown as`; `this.profile[map.level]` |
| 14 | Sugerencia | Resuelto | `.moon__label` ya no está en `moon-panel.css` |
| 15 | Sugerencia | Resuelto | `engine.spec.ts:1270`: el punto de la malla que mira a la Tierra está a menos de 0,1° del de `Libration` en las dos fechas de las capturas |
| 16 | Sugerencia | Resuelto | `moon-panel.ts:194`: si el índice está abierto, el recorrido se para en el siguiente paso del temporizador (como mucho, 12 s después). Test en `moon-panel.spec.ts:110` |

### Hallazgos nuevos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | Menor | `docs/informes/fase-6.md:69` y `:185` · `docs/informes/img/fase-6/` · `scripts/capture-moon.mjs:76` | **El polo norte no tiene captura.** El criterio dice «ni en los polos», y la respuesta al hallazgo 1 dice que se comprobó «también en el norte». Pero las capturas (también las del antes y el después) son solo del sur. El norte lo cubren las comprobaciones numéricas del build y está bien: en mis capturas, con el encuadre de `luna-polo-sur` y `latitud=75`, no hay abanico ni costura | Añadir `luna-polo-norte` (`latitud=75`) a `capture-moon.mjs`, al §7 y al criterio del §2 |
| 2 | Menor | `docs/informes/fase-6.md:196` y `:92` · `scripts/build-textures.mjs:106` | **Una cifra del ahorro de la elevación no cuadra.** Dice «2,7 MiB menos de descarga». Pero la de 2K pesaba 2 849 256 bytes (2,72 MiB) y la de 1K pesa 759 462 (0,72 MiB): el ahorro es de 2,0 MiB. Además, «pesaba 2,7 MiB y 8 MiB de VRAM más» se entiende como 8 MiB de más, y eran 8 MiB en total, 6 más que la de 1K (como dice bien la misma fila 12) | Poner «2,0 MiB menos de descarga» y «8 MiB de VRAM (6 más que la de 1K)» |
| 3 | Menor | `src/app/scene/quality.ts:49` | **Un comentario desfasado:** «con unos 512 vértices en su ecuador para la elevación de 2K». La elevación ya es de 1K en todos los niveles | Cambiarlo por «para la elevación de 1K (dos muestras por vértice)» |
| 4 | Menor | `docs/FUENTES.md:75` | **La versión de los modelos polares está mal en uno de los dos.** Pone «versión 2.0 de 2017» para los dos. Pero la etiqueta del norte (`ldem_75n_240m.lbl`) dice `PRODUCT_VERSION_ID = "V2.1"`, del 2016-09-15, con datos hasta `LRO_ES_45`. La V2.0, del 2017-06-15 y hasta `LRO_ES_54`, es la del sur | Poner: «sur, V2.0 (2017-06-15); norte, V2.1 (2016-09-15)» |
| 5 | Sugerencia | `scripts/lola-polar.mjs:24-25` · `src/app/scene/materials/body-material.ts:62-63` | **El borde de los casquetes está escrito dos veces.** Los 75° y su `T` están en el script y en el shader. Si el script cambiara el borde, el shader colocaría mal el atlas y nada fallaría, porque las comprobaciones del build usan las funciones del script, no el GLSL | Generarlos en `texture-files.ts`, como `MOON_ELEVATION_RANGE_M` («una sola fuente para el script y el shader»), o comprobar con un test que coinciden |
| 6 | Sugerencia | `src/app/scene/engine.ts:1461-1469` · `src/app/scene/world.ts:665`, `:714` y `:1116` | **Subidas que ya no hacen falta.** Con `WAIT_FOR_CAMERA_PX = 2048`, en la cola esperan más texturas. Si se va y se vuelve antes de que acabe el viaje (Tierra → Luna → Tierra), las de la Luna siguen en la cola. Suben al aterrizar y se liberan en cuanto acaba su subida, porque `requested !== level`. Es una subida inútil: con la 8K de la Luna, 171 MiB y un tirón de unos 100–200 ms | Que `processUpload` descarte y libere lo que ya no se pide, por ejemplo con una función `wanted()` en cada entrada de la cola |
| 7 | Sugerencia | `src/app/data/tours.ts:329` · `docs/informes/img/fase-6/recorrido-shackleton.webp` | **El subtítulo de Shackleton y la imagen no dicen lo mismo.** El subtítulo dice que «su interior está siempre en sombra». Pero la escena no dibuja las sombras que proyecta el relieve (D20: solo esferas y anillos), así que en la captura de la parada sale iluminada la pared interior que mira al Sol | Para la revisión de textos de la fase 9: el texto es fiel a su fuente, la imagen no. Matizarlo o anotar en el backlog las sombras del relieve (mapas de horizonte) |
| 8 | Sugerencia | `src/app/scene/world.ts:530-543` · `src/app/scene/engine.spec.ts:1401` | **El cambio de calidad con la Luna enfocada no tiene test.** El de la esfera cúbica cubre enfocar la Luna y dejarla, pero no ese caso. El código está bien: la esfera se libera y `setFocus` la rehace con los segmentos nuevos | Añadirlo al test: tras `setQuality`, la esfera de antes recibe `dispose` y la nueva tiene los 6·(n + 1)² vértices del nivel nuevo |
