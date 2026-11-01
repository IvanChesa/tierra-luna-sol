# Informe: Fase 8 (el cielo desde España y los eclipses)

- **Rama:** `fase-8-cielo-eclipses`
- **Fecha:** 2026-11-01
- **Estado:** en curso (8.a)

## Plan
Bloque E, modo autónomo. La fase es grande: va por entregas, con este informe al día al final de cada una. Lo que ya existe y se reutiliza:
- `data/places.ts` (fase 1, con los siete lugares del selector desde la revisión del bloque B) y sus tests de campos;
- el catálogo de estrellas HYG, la Vía Láctea de ESO y su alineación (fases 2 y 3b), en ECL;
- la sombra de la Luna sobre la Tierra (fase 5) y la de la Tierra sobre la Luna (fase 6), con sus fixtures de la NASA;
- el lienzo único y el motor (D10): el cielo es una **vista más del explorador**, no un segundo renderer.

**8.a · Efemérides del cielo, con fixtures (tareas 1, 2, 4 y la base de la 3)**
- **Lugares** (`data/places.ts`): el Montsec, por defecto (`DEFAULT_PLACE_ID`); la altitud que faltaba (el Montsec y la Puerta del Sol), del modelo digital del terreno del IGN (MDT02, consulta puntual del servicio WMS oficial, con su URL), nunca estimada; el test de campos admite esa fuente.
- **`ephemeris/sky.ts`** (TS puro, con tests):
  - el Sol, la Luna y los siete planetas en coordenadas horizontales, topocéntricas y aparentes, con la refracción `normal` de astronomy-engine;
  - la rotación ECL → horizonte del lugar para las estrellas y la Vía Láctea, con `Rotation_EQJ_HOR` y la matriz ECL → EQJ de `coordinates.ts`, y la refracción de las estrellas con la misma fórmula (test: igual que `Refraction`);
  - la fase del cielo según la altura del Sol: día, crepúsculo civil, náutico y astronómico, y noche;
  - el rumbo en palabras (norte, noreste…) y la constelación de cada cuerpo (`Constellation`, IAU).
- **`ephemeris/night.ts`** («Esta noche»): la noche del instante (de la puesta a la salida del Sol), los crepúsculos (`SearchAltitude` a −6°, −12° y −18°), la salida, la puesta y la fase de la Luna, y de cada planeta su salida, culminación (`SearchHourAngle`) y puesta, si se ve de noche y «hacia dónde mirar» (rumbo y altura en su mejor momento de la noche). Las noches sin noche astronómica o sin puesta del Sol (con «usar mi ubicación» lejos de España) no rompen nada: se dicen.
- **`ephemeris/eclipses.ts`**: los próximos eclipses de Sol (`NextLocalSolarEclipse`, visibles si el Sol está sobre el horizonte en alguna fase) y de Luna (`NextLunarEclipse`, visibles si la Luna está sobre el horizonte en alguna fase) desde un lugar, con su tipo allí, la hora local del máximo y el instante y la vista de «Ver en 3D».
- **Fixtures** (`scripts/fetch-horizons-fixtures.mjs`, con cada consulta):
  - USNO, el Montsec y el Teide en tres fechas (equinoccio y los dos solsticios de 2026): salida, puesta y culminación del Sol y de la Luna y crepúsculo civil (API `rstt/oneday`, en la hora local con su zona y su horario de verano), y náutico y astronómico (tablas anuales del USNO);
  - NASA: los eclipses de Sol y de Luna de 2026 a 2035 (catálogos de Espenak y Meeus: fecha y tipo) y la línea central del eclipse total del 12-08-2026 a su paso por España (el tipo y la hora del máximo en un punto de ella).
- **Tests:** salidas, puestas y crepúsculos a ±2 min del USNO; en el Teide, las horas en la hora canaria (las del USNO con su zona); los eclipses con fecha y tipo exactos; las coordenadas con fuente oficial.

**8.b · El cielo en el motor (`scene/sky/`, tarea 1)**
- `ExplorerView` con `'sky'`. En esa vista el motor pinta otra escena con el mismo renderer: una cúpula vista desde el lugar, con su propia cámara (rumbo, altura y campo de visión).
- **La cúpula:** el color del cielo según la altura y el rumbo del Sol (día, crepúsculos y noche; los colores, ilustrativos y documentados en `visual-config.ts`); el suelo y el horizonte; los puntos cardinales (en la capa HTML de etiquetas, `aria-hidden`); las estrellas HYG (la misma geometría, girada al horizonte, con refracción, extinción cerca del horizonte y el límite de magnitud según el brillo del cielo); la Vía Láctea (la misma textura, girada y atenuada con la luz del cielo); el Sol; la Luna con su fase y su orientación real; los planetas, con el tamaño según su magnitud y su nombre; y las líneas de las **constelaciones** (d3-celestial, licencia BSD de 3 cláusulas, sobre las cartas de la IAU), que se pueden ocultar.
- **Interacción:** arrastrar mira alrededor; la rueda o pellizcar cambia el campo de visión; el teclado (flechas, `+`/`−`) y los botones de la cámara, igual; un clic en un cuerpo lo elige.
- **API del motor:** `setObserver` (el lugar) y `lookAtSky` (mirar a un rumbo y una altura); `orbitBy` y `zoomBy` valen también en el cielo. Render bajo demanda; sin texturas nuevas que pesen (las líneas de las constelaciones, unos kB).
- **Cambio de vista:** un fundido corto entre el espacio y el cielo (un corte con movimiento reducido), sin recrear el motor.
- FPS, VRAM y llamadas de dibujo en la vista del cielo, en los tres niveles.

**8.c · La vista `/cielo` y «Esta noche» (tareas 1, 2 y 5)**
- Ruta `/cielo`, hija del layout del explorador (`data.view = 'sky'`), con su texto prerenderizado (H1 «El cielo desde España»), su póster y la pestaña «Cielo» en el selector de vista.
- **`?lugar=`** en la URL (`montsec`, el de por defecto, no se escribe); un lugar que no existe se ignora con aviso. «Mi ubicación» **nunca** va a la URL (no sale del navegador).
- **Panel del cielo:**
  - el selector de lugar (los siete, con el Montsec por defecto) y «Usar mi ubicación» (geolocalización solo tras pulsarlo; si se rechaza o falla, un aviso y todo sigue con el lugar elegido; la zona horaria, la del navegador);
  - el deslizador de la hora a lo largo de la noche, en la **hora local del lugar** con su zona («22:40, hora de Canarias, UTC+0»);
  - «Esta noche»: los crepúsculos, la Luna y su fase, qué planetas se ven y hacia dónde mirar, en frases claras;
  - la **tabla** equivalente (el Sol, la Luna y los planetas: altura y rumbo ahora, salida, culminación y puesta, magnitud y constelación), con un botón «Mirar» por fila que lleva la cámara a ese cuerpo (o dice que está bajo el horizonte);
  - las constelaciones, con un interruptor.
- **Velocidad del cielo (D33):** el plan no la fija. Propuesta: en el cielo, **tiempo real** (lo que se ve es lo que hay ahora; para recorrer la noche, el deslizador). Con movimiento reducido o con `?fecha=`, en pausa, como siempre. Se documenta como propuesta en §10.
- Los textos que nombran la vista dicen «España» o el lugar elegido (tarea 5).

**8.d · Eclipses (`/eclipses`, tarea 3)**
- Página prerenderizada con los próximos eclipses visibles desde el lugar (el Montsec por defecto, con el mismo selector y `?lugar=`): la lista sale de `data/eclipses.ts` (GENERADO por `scripts/build-eclipses.mjs`, con la fecha del cálculo), para que la página no cargue astronomy-engine en su JS inicial, y el navegador la **recalcula** después (`import()` dinámico en `afterNextRender`) desde el día de hoy.
- Cada eclipse: el tipo (en el lugar y el global), la fecha y la hora local del máximo con la zona, la magnitud o la parte del Sol tapada, la altura del astro y **«Ver en 3D»**: los de Sol, en la vista Tierra en el máximo con la cámara sobre la sombra de la Luna (`?fecha=…&sombra=1`); los de Luna, en la vista Luna en el máximo (la Luna enrojecida).
- Tests: la lista de la NASA; e2e: «Ver en 3D» abre la vista con la sombra (captura).

**8.e · Cierre**
- Capturas (`?captura=1`, escritorio y móvil): el cielo del Montsec de noche, en el crepúsculo y de día, el del Teide, la tabla, las constelaciones, `/eclipses` y las sombras de «Ver en 3D».
- `FUENTES.md` y `/creditos` (las líneas de las constelaciones, el MDT02 del IGN y los fixtures), `ESTILO.md` (los textos del cielo), `PENDIENTES.md`, este informe y la revisión por subagente.
