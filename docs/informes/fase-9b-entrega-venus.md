# Fase 9b, entrega 9b.e: Venus «Bajo las nubes» (D44), sesión C en paralelo

- **Rama:** `fase-9b-e-venus`, desde `fase-9b-sol-lunas` (`d765654`: la 9b.d cerrada y la 9b.f del Sol y de la Tierra juntas), con `origin/main` (la 9c, la interfaz nueva) traído a la rama (`940cc65`).
- **Fecha:** 2026-11-08
- **Estado:** hecha y comprobada, sin fusionar. La junta el cierre de la fase en `fase-9b-sol-lunas` y lleva esta nota al informe (`docs/decisiones/FASE-9b-REPARTO-PARALELO.md`).
- **Alcance:** las tareas 1–3 de la entrega 9b.e de `docs/decisiones/FASE-9b-SOL-LUNAS.md` (D44). Además, por el encargo de la sesión de revisión (decisión de Iván del 08-11, con la 9c ya en `main`): la interfaz nueva traída a la rama, la línea del Sol realzado en su ficha del explorador (pendiente de la 9c) y lo de la sección 12 del informe de la 9c que toca al juntarla.
- **Puertos:** `CAPTURE_PORT=4370` y `E2E_PORT=4421`.

## 1. Resumen
Con Venus enfocada, su ficha del explorador lleva un botón «Bajo las nubes»: al pulsarlo, las nubes dan paso, con un fundido, al mosaico global del radar de la sonda Magellan (en gris, con la luz del Sol de Venus), y la ficha lo avisa: «Imagen de radar de la sonda Magellan, no lo que verían tus ojos.». La textura se pide solo al pulsarlo y se suelta al apagarlo, al dejar Venus o al cerrar la ficha. Maat Mons cae en su sitio (sus sondas, en el build, y señalado en la captura). Accesible con el teclado, con `aria-pressed`, y con axe sin violaciones. §5, con el radar cargado, dentro de su presupuesto en los tres niveles.

## 2. Plan (el de la sesión)
1. Worktree propio, `npm ci`; en `assets-src/`, las fuentes que necesita el build de texturas, copiadas de la carpeta principal sin cambiarlas, y el mosaico de Magellan, bajado con `download-assets.mjs` (con su SHA-256).
2. El producto: comprobado en su ficha de Astropedia (resolución, proyección y licencia); sus sondas, con los centros del Gazetteer; el tipo `radar` en el build de texturas (1k, 2k y 4k).
3. La escena: la capa del radar en el material de Venus (`#define TLS_RADAR`), un módulo propio para su estado (`scene/venus-radar.ts`, con sus tests) y su API en el motor (`setVenusRadar`, el evento `venusRadar`), con el fundido (un corte con movimiento reducido), la carga al pedirla y la liberación al salir.
4. La interfaz nueva: `origin/main` traído a la rama, con los conflictos resueltos según la sección 12 del informe de la 9c; el botón en la ficha de Venus enfocada, con `aria-pressed` y el aviso visible; sus e2e (teclado, `aria-pressed`) y axe.
5. `FUENTES.md`, `/creditos` y «Lo que es ilustrativo»; capturas con el prefijo `venus-` y §5 con la textura cargada; `npm run check`, push y el CI.

## 3. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Captura de Venus con las nubes y «Bajo las nubes», con Maat Mons en su sitio (sonda) | ✅ | `venus-escritorio-nubes` y `-radar`, `venus-movil-nubes` y `-radar` (§8, con la interfaz; en el móvil, la ficha abierta con «ⓘ») y `venus-radar-maat-mons` (el lienzo, con Maat Mons señalado: el punto de 0,5° N y 194,6° E del Gazetteer, proyectado con la orientación de Venus y la cámara de la escena, cae sobre sus coladas, claras en el radar). La fecha, el 05-11-2026: Maat Mons de frente (coseno 0,89 con la cámara) y a pleno sol (0,998), elegida con `capture-venus.mjs --buscar`. Las sondas, en el build: Maat Mons 1,12, Sapas Mons 1,33 y Maxwell Montes 1,39 (disco / anillo; > 1,08); con el mapa girado 180°, 1,00 · 1,01 · 0,98, y reflejado, 1,01 · 1,03 · 1,15: no pasan. |
| e2e del botón (teclado y `aria-pressed`) y axe sin violaciones | ✅ | `e2e/venus.spec.ts` (escritorio): con Intro, `aria-pressed="true"`, la textura de 4k pedida una vez (y no antes), el aviso visible y axe (WCAG 2.1 A y AA) sin violaciones graves ni críticas; con espacio, otra vez las nubes; con otro cuerpo, sin botón, y de vuelta en Venus, apagado; `?radar=1` en captura. `e2e/movil.spec.ts`: en la hoja en reposo, el botón (44 px de alto) y, al tocarlo, el aviso a la vista; al cerrar la ficha, vuelven las nubes. |
| La licencia en `FUENTES.md` y en `/creditos` | ✅ | `FUENTES.md`: la fila de `venus-radar` (el producto, la URL, el SHA-256, la licencia de su ficha, «Access Constraints: public domain» y «Use Constraints: None», y lo que se le hace). `/creditos`: «Venus bajo las nubes», con el enlace a su ficha de Astropedia. «Lo que es ilustrativo»: el radar, en gris, con la luz del Sol y el brillo de sus nubes. |
| §5 con la textura cargada | ✅ (provisional) | §6: con el radar, en alto, 132 MB de VRAM (≤ 300) y las mismas 6 llamadas de dibujo; en medio y bajo, 68 y 56 MB (≤ 120 en bajo); FPS mínimo de 60, 59 y 59 a 1 día/s. Tras 10 encendidos y apagados, la misma VRAM; apagado, la de las nubes (90, 58 y 46 MB). |

## 4. El radar de Magellan
- **El producto:** «Venus Magellan Global C3-MDIR Mosaic 2025m» del USGS Astrogeology (https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_mosaic_2025m), el C3-MIDR del radar de apertura sintética: 18 775 × 9388 px, 8 bits en gris, equirrectangular de −180° a 180° en longitud este, 2025 m por píxel (52,15 px/°). Su ficha: «Access Constraints: public domain», «Use Constraints: None»; originador, el PDS Geosciences Node; referencia, Ford et al. (1993), *Guide to Magellan Image Interpretation*. Se eligió el mosaico en gris (el radar tal cual) frente al «Synthetic Color» y al «Colorized Topographic», que añaden color. A 2 km por píxel, de sobra para la textura de 4k (9,3 km por píxel). Bajado el 08-11 con `download-assets.mjs`: 176 335 453 bytes, SHA-256 `833d5368564b626a787b6d0a2b2432a0afaa89f72d4b46e5221a19b3a01ec380`. Sin verificación anti-bots.
- **Los huecos:** el 8,1 % del mapa vale 0: las franjas de las órbitas que no se cubrieron (rayas finas de unos 25 px del original) y parte de los polos. En el radar, todo 0 es un hueco (no hay valores de 1 a 12: es la marca de «sin datos»), así que no se aplica lo de las lunas que toma por sombra las motas a 0 (`restoreShadowSpecks`). Se rellenan como los huecos de las lunas: las rayas, con la media local de lo que hay a los lados; las zonas grandes, con el gris liso de la franja vecina. Sin inventar relieve y sin la recreación de D45, que es de las lunas.
- **Un fallo que salió al hacerlo (y su arreglo, solo en el radar):** sharp umbraliza después de reducir, así que la máscara de cobertura de `loadMosaic` salía binaria y un píxel mezclado con un hueco contaba como dato entero. En las lunas, con huecos grandes, lo tapa el fundido del borde; en las rayas finas del radar, quedaban líneas oscuras. Con `zerosAreGaps`, la máscara se umbraliza en el original y se reduce después, como la imagen. No se ha tocado el camino de las lunas: cambiaría sus texturas (D45: lo real no se toca). Queda como propuesta para la fase 10 (§9).
- **Las sondas:** Maat Mons (Feature/3550; con el radio de su ficha, 395 km de diámetro), Sapas Mons (Feature/5318) y Maxwell Montes (Feature/3766), más claros en el radar que lo que los rodea: los volcanes por sus coladas, y Maxwell porque en las cumbres de Venus el suelo devuelve mucho más eco. Una sonda oscura (Lakshmi Planum, el fondo de Mead o Atalanta Planitia) no se distingue de lo que la rodea a esta escala (de 0,93 a 1,03): no se usa.
- **Las texturas:** `venus-radar` en 1k (50 806 bytes), 2k (187 010) y 4k (653 204); su luminancia media, 0,2382. El build entero se repitió: las demás texturas, las máscaras y los generados de las lunas salen idénticos.

## 5. Decisiones (con su porqué)
- **En el material de Venus, con su `#define` (`TLS_RADAR`):** el albedo del radar sustituye al de las nubes según el fundido; ni mallas, ni pasadas, ni llamadas de dibujo nuevas, y ningún otro cuerpo cambia (la lección de la 9b.f: un uniforme neutro en un shader compartido movió píxeles de Marte y de Titán).
- **La tarea 3, con la luz de Venus:** el radar se pinta con la misma luz del Sol y la misma fotometría de Venus, con su terminador y su cara de noche. El radar no mide la luz visible (da el eco de cada punto), pero iluminado así se lee como una superficie y la cara de noche no se confunde con la de día. Se dice en «Lo que es ilustrativo».
- **El brillo, el de una textura de Venus** (`VISUAL_CONFIG.venus.radar.brightness`, 1): calibrado como su textura de nubes (su disco lleno, al albedo geométrico de Venus), para que se vea con la misma exposición; sin el contraste rebajado de las nubes (0,3) ni su color. **La neblina del limbo**, al 30 % (`haze`): la de las nubes taparía el borde del radar.
- **En gris, sin color:** el producto es en gris y el aviso dice que es una imagen de radar. Hay una alternativa con fuente: teñirlo con el color de las fotos de la superficie de las Venera 13 y 14, como hace la NASA en sus vistas de Magellan (PIA00104). **Propuesta para Iván** (§9).
- **El fundido, de 800 ms** (`fadeMs`); con movimiento reducido o en captura, un corte. Mientras llega la textura, siguen las nubes (el botón, ya pulsado, y la nota «Cargando la imagen de radar…»); si no llega, vuelven las nubes y se dice.
- **El botón, junto al resumen de la ficha:** en el móvil también está con la hoja en reposo (fuera de «Ver los datos»). Debajo, una nota con lo que enseña o el aviso, enlazada al botón (`aria-describedby`).
- **El aviso, siempre a la vista con el radar:** si la ficha deja de verse (se cierra, otro cuerpo, otra vista), vuelven las nubes. El motor, además, lo suelta al dejar Venus. En captura, `?radar=1` lo enciende sin la ficha (en el móvil no se abre sola).
- **En la ficha completa (`/planetas/venus`), sin botón:** es una página sin 3D. La tarea lo pedía «si encaja», y no encaja.
- **`venusRadarState`** (solo lectura) en la API del motor: los scripts y los e2e esperan a que el radar esté a la vista (mientras baja, el motor no pinta y podría parecer en reposo).
- **Al cambiar de calidad** con el radar encendido, se pide al nivel nuevo y el anterior se suelta cuando llega.

## 6. §5 (provisional)
Con la GPU del equipo (una RTX 3060 con ANGLE sobre D3D11), con otras sesiones en marcha. Venus enfocada el 05-11-2026, a 1600 × 900, con `scripts/capture-venus.mjs --medir`. Cada celda: VRAM (MB) · llamadas de dibujo.

| Nivel | Con las nubes | Con el radar | FPS mínimo con el radar (1 día/s) · CPU por frame | Tras 10 encendidos y apagados | Apagado |
|---|---|---|---|---|---|
| Alto | 90 · 6 | **132 · 6** | **60** · 1,03 ms | 132 | **90** |
| Medio | 58 · 6 | **68 · 6** | **59** · 0,92 ms | 68 | **58** |
| Bajo | 46 · 6 | **56 · 6** | **59** · 0,87 ms | 56 | **46** |

- **El peso de la textura,** solo al pulsar: 638 kB en alto (4k) y 183 kB en medio y bajo (2k, el nivel del primer plano en los dos).
- **La memoria:** la VRAM vuelve a la de las nubes al apagarlo, con una textura menos (13 frente a 14 en alto). Al dejar Venus (Marte enfocado), el estado pasa a «off» y el heap se queda en 13–14 MB.
- **Las llamadas de dibujo,** las mismas: el radar va en el material de Venus.

## 7. Lo de la 9c (sección 12 de su informe), al juntarla
- **Los conflictos** (11 ficheros, los que preveía): `app.*`, `app.spec.ts` y `e2e/contenido.spec.ts`, los de la 9c (ya llevan la tarea 0 de la 9b, traída con cherry-pick: `ad651ec` y `8b13b3f` son `d47c475` y `6e0edf2`); `scene/engine.ts`, `scene/types.ts` y `scripts/capture-moon-systems.mjs`, los de la 9b; `viewer-params.ts`, su spec y `explorer-session.ts`, con los parámetros de captura de las dos (`medida=limbo`; y ahora `radar=1`); el plan, con D45, D46 y D47.
- **`ExplorerFocus`, en `core/`:** nada de la 9b lo importaba.
- **Los selectores de los scripts:** `measure.mjs` abre «Menú» antes de pulsar `/planetas`. No queda ningún script con el calendario ni con los botones del año.
- **`tls.recorrido`:** `measure-autoplay.mjs` (abre `/` sin parámetros) marca el recorrido y las pistas como vistos. Los demás scripts abren el explorador con parámetros, y los e2e ya lo hacían.
- **Las zonas táctiles:** los enlaces de los informes en las tablas de «Sobre el proyecto» (16 px) y los de las licencias de `/creditos` (19 px), a 24 px de alto.
- **La lista de textos:** `build-text-review.mjs` saca ahora los textos de la interfaz del explorador de sus plantillas (lo que se lee, `aria-label` y `title`), la línea de autoría y los rótulos y el anuncio del recorrido. En `docs/revision-textos.md` hay 151 textos más, entre ellos los de la 9c y los de Venus.
- **Lo que queda para el cierre:**
  - **los pósters y la imagen para compartir:** se regeneran tras juntar todo (son binarios: la sesión del Sol también los cambia);
  - **lo de la escena de la crítica del 08-11:** las etiquetas sobre los discos, el rótulo de Saturno, la precarga de texturas del recorrido, los nombres de los lugares de España y el suelo del cielo en el móvil. No es de esta entrega.

## 8. Capturas
`docs/informes/img/fase-9b/`, con `scripts/capture-venus.mjs` (el 05-11-2026, con la interfaz):
- `venus-escritorio-nubes` y `venus-escritorio-radar`;
- `venus-movil-nubes` y `venus-movil-radar` (390 × 844 a 2×, con la ficha abierta con «ⓘ»: el botón y su nota en la hoja en reposo);
- `venus-radar-maat-mons`: el lienzo solo, con el radar y Maat Mons señalado.

## 9. Pendientes y propuestas para Iván
- **El color del radar:** en gris (el producto tal cual) o teñido con el de las fotos de las Venera 13 y 14 (como las vistas de Magellan de la NASA). Es un valor de `VISUAL_CONFIG`, con su fuente.
- **Propuesta para la fase 10:** la máscara de cobertura de los mosaicos de las lunas, umbralizada antes de reducir, como la del radar. Cambiaría los bordes de sus huecos, y con ellos las texturas y las medidas de D45: hay que rehacerlas y revisarlas.

## 10. `npm run check` y e2e
**Con el Sol de la segunda vuelta ya traído** (`origin/fase-9b-sol-lunas` en `7d07081`, fusionado en `d19d06a` sin conflictos), en verde (08-11):
- lint y Prettier, sin avisos;
- **807 tests** (81 ficheros), con la cobertura de `ephemeris/` al 98,93 %;
- el build;
- el JS inicial, en 315,18 kB (lo que trae la 9c), y el código propio inicial, en **13,81 kB de 15**;
- three, diferido, en 812,94 kB (antes del Sol de la segunda vuelta, 803,16; con la 9b.f de la primera, 798,65: el radar, +4,5);
- **1238 enlaces internos** bien.

**Los e2e** (`E2E_PORT=4421`, todos, con los tres proyectos): antes de traer el Sol, 135 de 136. El que falló, `vistas.spec.ts:19` («sistema → Tierra → Luna → sistema … sin fugas», 25 texturas en lugar de 15), no toca el radar. Repetido solo, pasa dos veces seguidas: es de tiempos, con la máquina cargada (cuatro workers con SwiftShader y otras sesiones en marcha), y el CI lo repite una vez si falla. Con el Sol traído: §10 bis.
