# Informe: Fase 8 (el cielo desde España y los eclipses)

- **Rama:** `fase-8-cielo-eclipses`
- **Fecha:** 2026-11-01
- **Estado:** revisada y corregida (respuesta a la revisión, al final); sin fusionar

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
- **`ephemeris/eclipse-search.ts`**: los próximos eclipses de Sol (`NextLocalSolarEclipse`, visibles si el Sol está sobre el horizonte en alguna fase) y de Luna (`NextLunarEclipse`, visibles si la Luna está sobre el horizonte en alguna fase) desde un lugar, con su tipo allí, la hora local del máximo y el instante y la vista de «Ver en 3D».
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

## 1. Resumen
- **El cielo desde España** (`/cielo`, `?lugar=teide`): una vista más del explorador, en el mismo lienzo (D10), con su cámara (rumbo, altura y campo; arrastrar «agarra el cielo»), desde el Montsec por defecto, los otros seis lugares o tu ubicación (que no sale del navegador). La luz del cielo según la altura del Sol (día, crepúsculos y noche; ilustrativa), el suelo, los puntos cardinales, las 8920 estrellas HYG con la refracción de astronomy-engine y la extinción, la Vía Láctea, las constelaciones (d3-celestial, BSD), el Sol, la Luna con su fase, su orientación real y la sombra de la Tierra, y los planetas. En un eclipse total de Sol, el cielo se oscurece y se ve la corona.
- **«Esta noche»:** los crepúsculos, la Luna y su fase, qué planetas se ven y hacia dónde mirar, y la tabla equivalente con «Mirar», en la hora del lugar con su zona. Salidas, puestas y crepúsculos a ±2 min del USNO en el Montsec y el Teide (con la hora canaria).
- **Próximos eclipses** (`/eclipses`): los de los próximos diez años que se ven desde el lugar, prerenderizados y recalculados en el navegador, con «Ver en 3D» (la Tierra con la sombra de la Luna o la Luna eclipsada). Los 45 eclipses de 2026 a 2035, con la fecha y el tipo exactos de los catálogos de la NASA; en la línea central del 12-08-2026 en la Península, total, con el máximo a menos de 1 min y la duración a ±3 s.
- **Rendimiento:** la vista del cielo, a 59–60 FPS en los tres niveles con 0,6–0,8 ms de CPU por frame y 5–8 llamadas de dibujo; con 38–39 MB de VRAM (sus texturas son las del espacio, compartidas, y al entrar el espacio suelta las de su primer plano). La memoria no crece al entrar y salir del cielo (§6).

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Salidas, puestas y crepúsculos ±2 min frente al USNO; eclipses con fecha y tipo exactos | ✅ | `ephemeris/night.spec.ts`, frente a `usno-rise-set-spain.json` (el Montsec y el Teide, el 20-3, el 21-6 y el 21-12-2026): la puesta y la salida del Sol, el final y el comienzo de los crepúsculos civil, náutico y astronómico, y la salida, la culminación y la puesta de la Luna, todos a ≤ 2 min (18 tests). `ephemeris/eclipse-search.spec.ts`: los 45 eclipses de 2026 a 2035 de los catálogos de la NASA (Espenak y Meeus), en el mismo orden, con la fecha (en TD) y el tipo exactos y el máximo a < 2 min; en los dos puntos de la línea central del 12-08-2026 en la Península (Asturias y Burgos), total, con el máximo a < 1 min y la duración de la totalidad a ±3 s (109,3 s y 104,6 s) |
| La vista del cielo y la tabla dan la misma información | ✅ | Las dos salen de la misma función, `skyBodies(instante, lugar)` (`ephemeris/sky.ts`): la escena coloca con ella el Sol, la Luna y los planetas, y la tabla da su altura y su rumbo. Test de `engine.spec.ts` («el cielo y su tabla dicen lo mismo»): en dos instantes, para cada cuerpo sobre el horizonte, la cámara mira al rumbo y la altura de la tabla, y un clic en el centro de la imagen elige ese cuerpo. El test encontró una diferencia, ya corregida: de noche, Neptuno (magnitud 7,8) estaba en la tabla y no se dibujaba (§4.5). e2e (`cielo.spec.ts`): «Mirar a Saturno» anuncia «Saturno, a 48° de altura, hacia el sur.» y la cámara queda a 48°, a menos de 22,5° del sur |
| La geolocalización solo se pide tras una acción del usuario y todo funciona si se rechaza | ✅ | Solo la pide «Usar mi ubicación» (`ExplorerSession.useMyLocation`). Tests de la sesión: no se pide al entrar; rechazada, el lugar sigue (el Montsec); concedida, «Tu ubicación», que no va a la URL. e2e con un contexto sin permiso («No has dado permiso… Sigues viendo el cielo desde el Parque Astronómico del Montsec») y con permiso y una ubicación (Barcelona): el selector dice «Tu ubicación» y la URL no lleva ni el lugar ni las coordenadas. La zona horaria, la del navegador; nada va a `localStorage` |
| «Ver en 3D» muestra la sombra del eclipse correspondiente | ✅ | Los de Sol llevan a `/explorar/tierra?fecha=…&sombra=1`: al estar lista la Tierra, la cámara va al centro de la sombra (`moonShadowAim`; en un parcial, al punto de la Tierra más cercano a su eje). Test de la sesión: en el máximo del 12-08-2026, a 0,2° del punto de la NASA (65,2° N, 25,2° O). Tests de `moonShadowAim` (un central y un parcial). e2e: desde `/eclipses` del Teide, el enlace lleva a la vista Tierra con `sombra=1` en la URL y la vista queda lista (la puntería sobre la sombra la prueba el test de la sesión, no el e2e). Capturas `escritorio-ver-en-3d-sol` (el 12-08-2026 desde Fraga: la sombra sobre la Península al ponerse el Sol) y `escritorio-ver-en-3d-luna` (el total del 20-12-2029: la Luna enrojecida) |
| Cambiar de lugar recalcula el cielo y el panel «Esta noche», y la URL lo refleja (`?lugar=`) | ✅ | e2e: del Montsec al Teide, la URL lleva `lugar=teide`, la tabla dice «el Observatorio del Teide» y «Atlantic/Canary, UTC», y se anuncia «El cielo desde el Observatorio del Teide»; la URL con `lugar=teide` abre ese cielo. Tests: el motor repinta al cambiar de observador (`engine.spec.ts`) y la sesión pasa el lugar al motor y a la URL (sin escribir el Montsec, el de por defecto, ni «Mi ubicación») |
| En el Teide y el Roque de los Muchachos, las horas salen en la hora canaria (test con un fixture del USNO) | ✅ | `features/sky-panel/sky-text.spec.ts`: las horas de «Esta noche» en el Teide, escritas en su zona (`Atlantic/Canary`), salen como el reloj del USNO allí (`local` del fixture, con el horario de verano en junio) a ±2 min, y las del Montsec, en la de Madrid. El Roque lleva la misma zona (`places.spec.ts`) |
| Las coordenadas de cada lugar tienen fuente oficial (test de campos) | ✅ | `data/places.spec.ts`: cada lugar con su fuente (IGN, IAC, CAHA o el Parc Astronòmic) y, desde esta fase, todos con altitud y fuente: la del Montsec (812 m) y la de la Puerta del Sol (649 m), del MDT02 del IGN consultado justo en el punto del lugar (el test comprueba que la caja de la consulta está centrada en él) |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 8.1 Vista `/cielo` | hecha | Selector con los siete lugares (el Montsec por defecto) y «Usar mi ubicación»; `lleida` sigue en los datos, fuera del selector. `data/places.ts` con su fuente y su zona IANA. La cúpula: horizonte, puntos cardinales, estrellas, Vía Láctea, planetas, Luna y Sol con la refracción; el color del cielo por la altura del Sol; el deslizador de la noche en la hora del lugar con su zona; y las constelaciones (d3-celestial, BSD de 3 cláusulas: entra en la lista de licencias de Iván) |
| 8.2 «Esta noche» | hecha | Qué planetas se ven, su salida, culminación y puesta (`SearchRiseSet`, `SearchHourAngle`), los crepúsculos (`SearchAltitude` a −6°, −12° y −18°) y la fase de la Luna, «hacia dónde mirar» en frases y la tabla equivalente |
| 8.3 Eclipses | hecha | `SearchLocalSolarEclipse` y `SearchLunarEclipse` (y sus `Next…`) desde el lugar, con la parte que se ve. `/eclipses`: la lista prerenderizada «calculado el…» (`data/eclipses.ts`, generada) y recalculada en el navegador, con «Ver en 3D» |
| 8.4 Fixtures | hecha | USNO del Montsec y del Teide en tres fechas (las dos zonas horarias, con el verano); eclipses de la NASA con sus URL (los catálogos de 2001–2100 y la línea central del 12-08-2026) |
| 8.5 Textos | hecha | La vista se llama «El cielo desde España» y el panel nombra el lugar elegido («El cielo desde el Observatorio del Teide»). `ESTILO.md` §6, con los textos del cielo y de los eclipses. Los textos nuevos entran en la revisión de la fase 9 |

## 4. Desviaciones del plan y motivo
1. **La velocidad del cielo** (el plan no la fija; D33 habla de la vista general y de los cuerpos): en `/cielo`, **tiempo real**. Lo que se ve es lo que hay ahora; la noche se recorre con su deslizador, y el selector de velocidad sigue ahí (a 1 h/s, el cielo gira 15° por segundo). Con movimiento reducido o con `?fecha=`, en pausa, como siempre. Propuesta en §10.
2. **Los nombres de las constelaciones, los oficiales de la IAU en latín** (Gemini, Ursa Major). d3-celestial trae nombres en español, pero son traducciones del nombre inglés («Gemelos», «Carnero», «Toro»), no los de la astronomía en español: no se usan. Los de la IAU los da `Constellation` de astronomy-engine en la posición del nombre, lo que comprueba de paso cada símbolo. Donde astronomy-engine se aparta de la IAU («Antila», «Camelopardis», «Pisces Austrinus»), queda el de d3-celestial. Si Iván los quiere en español, hace falta una lista con licencia compatible (`PENDIENTES.md`).
3. **Entre el espacio y el cielo, un fundido** (el plan no lo detalla). Sin vuelo de cámara, porque se viene del suelo: un velo del color del fondo que se desvanece en 0,7 s, solo al cruzar entre el espacio y el cielo; con movimiento reducido, un corte.
4. **La luz del cielo, ilustrativa** (como la de D21): no es un modelo de dispersión, sino colores de referencia a siete alturas del Sol (`VISUAL_CONFIG.sky`, con el motivo de cada valor). Igual el límite de magnitud con cada luz, la extinción (0,25 mag por masa de aire), la corona (sin las serpentinas de cada eclipse) y el tamaño mínimo del Sol y de la Luna en pantalla (5 px de radio con el gran angular; con un campo estrecho, el real).
5. **De noche, todos los planetas, aunque no se vean a simple vista** (Neptuno, magnitud 7,8): tenues y con su nombre, porque la tabla los lista. Su frase lo dice: «Con prismáticos o telescopio».
6. **`/eclipses`, con el selector de los mismos lugares y sin «Usar mi ubicación»** (el plan pedía los visibles «desde España»). La lista prerenderizada lleva los siete lugares (43 kB sin comprimir, 4,9 kB comprimida en su chunk) y el navegador recalcula la del elegido. «Se ve» es con el astro sobre el horizonte en alguna parte de la fase principal, sin el relieve.

## 5. Decisiones técnicas nuevas
- **Una escena del cielo dentro del motor** (`scene/sky/`): con su propia `Scene` y su cámara, que el motor pinta en lugar del espacio en la vista `sky` (un solo renderer). Se crea la primera vez que se abre la vista y se conserva. Sus texturas (la Vía Láctea y el color de la Luna) son las del espacio, compartidas. Al entrar, el espacio suelta las texturas de su primer plano (`world.setFocus(null)`), como al salir de las vistas Tierra y Luna (C4).
- **El orden de pintado sigue a la luz:** primero lo de fuera de la atmósfera, sobre negro; después, la luz del cielo **sumada**, y por último el suelo, opaco. Así la cara oscura de la Luna se ve del color del cielo, de día no hay estrellas, la Luna tapa al Sol en un eclipse y el suelo tapa lo que queda bajo el horizonte.
- **La refracción de astronomy-engine en todas partes:** el Sol, la Luna y los planetas, con `Horizon(…, 'normal')`; las estrellas y las líneas, con la misma fórmula en el shader (`refractionDeg`, igual a `Refraction('normal')` en todo el rango: test).
- **Las conversiones al horizonte, en `ephemeris/coordinates.ts`** (regla permanente): `eclToHorizontal` (`Rotation_EQJ_HOR`), `eclThreeToSkyThree`, `horizontalToSkyThree` y su inversa. Tests: la rotación de las estrellas lleva el Sol a donde lo pone `skyBodies` (< 0,01°) y la Polar queda a la altura de la latitud.
- **El campo de la cámara del cielo, el vertical de la parte visible.** Aplicado al ancho, en un móvil vertical el vertical pasaba de 110° y la Luna salía como una elipse (la perspectiva estira lo que está lejos del eje). 65° por defecto, de 2° a 110°.
- **La Luna del cielo, con su orientación real:** la de `OrientationModel` (la IAU, con la libración) llevada al horizonte. Iluminada con Lommel–Seeliger (D29), apagada en el limbo rasante (si no, en un eclipse de Sol salía un anillo de puntos) y con la sombra de la Tierra de `earthShadow` (umbra rojiza y penumbra), la misma para cualquier observador.
- **«Esta noche», una vez por noche y lugar** (unos 8 ms en Node); la tabla, con cada tic del reloj (≤ 5 por segundo), con 9 posiciones (0,14 ms).
- **`/eclipses` sin astronomy-engine en su JS inicial:** la lista prerenderizada sale de `data/eclipses.ts`, generado por `scripts/build-eclipses.mjs` con las mismas funciones que la página. El navegador recalcula con un `import()` dinámico, un eclipse cada vez, cediendo el hilo entre uno y otro.
- **Los scripts de Node importan módulos TS de `src/`** con el compilador de TypeScript del proyecto (`scripts/lib/ts-resolve.mjs` y `ts-hooks.mjs`, sin dependencias nuevas): el «type stripping» de Node no sabe qué imports son solo de tipos.
- **`data/sky-place.ts`** (el lugar del cielo, de la lista o del navegador), en `data/` y no en `state/`: la página de eclipses lo usa en su JS inicial, y la comprobación del bundle no admite nada de `state/` ahí.

## 6. Salida de los checks
```
npm run check  → código 0
- lint y Prettier: limpios
- tests: 663/663 en 71 ficheros (cobertura de ephemeris/: 99,08 % de sentencias, 94,24 % de ramas, 100 % de funciones, 99,76 % de líneas)
- build: 19 rutas prerenderizadas (nuevas: /cielo y /eclipses); JS inicial 300,17 kB (aviso a 320), 82,72 kB comprimido
- check-initial-bundle: ninguna de las 19 páginas lleva three, astronomy-engine, los stores ni los controles del visor en su JS inicial; código propio inicial 12,62 kB de 15
- diferidos: three 743,27 kB (aviso a 900); interfaz del explorador 242,22 kB; astronomy-engine, en su propio chunk (84,46 kB); /eclipses, 36,78 kB (4,89 kB comprimido) con su lista
```

**e2e** (`npx playwright test`, Chromium con la GPU del equipo): 81 de 81, con los 7 nuevos de `cielo.spec.ts`, y `/cielo` y `/eclipses` en los de accesibilidad (axe) y de privacidad (0 cookies, 0 peticiones a terceros).

**Rendimiento (RTX 3060, `measure-views.mjs` y `measure.mjs`):**
| Vista | Alto: FPS mín/medio · CPU por frame · VRAM | Medio | Bajo | Descarga |
|---|---|---|---|---|
| Cielo, desde la vista Luna (con su arreglo) | 60/60 · 0,67 ms · 39 MB | — | — | 19 kB (las constelaciones) |
| Cielo (antes del arreglo de su VRAM) | 59/60 · 0,76 ms · 262 MB | 60/60 · 0,73 ms · 102 MB | 59/60 · 0,59 ms · 62 MB | 19 kB |
| Sistema solar (sin cambios) | 59–60/60 · 1,4 ms · 38 MB | 60/60 · 1,2 ms · 38 MB | 59/60 · 1,3 ms · 38 MB | 513 kB |
| Tierra / Luna (sin cambios) | 59–60/60 · 278 / 266 MB | 86 / 103 MB | 86 / 62 MB | — |

- La medida de cada vista reproduce a 1 día/s (el cielo gira entero cada segundo: el peor caso de la escena del cielo), con 5–8 llamadas de dibujo. La primera medida del cielo (fila de «antes») venía de la vista Luna y conservaba sus mapas de cerca (262 MB en alto): el espacio no los soltaba al entrar. Con `releaseCloseUps`, el cielo se queda con las texturas de la vista general (39 MB; test en `engine.spec.ts` desde las vistas Tierra y Luna). Entrando directamente en `/cielo`, 38–39 MB en los tres niveles (`measure.mjs`).
- **Memoria** (`measure.mjs`, con `/cielo` en los 10 cambios de vista): tras 10 idas y vueltas a una ficha, 7 geometrías, 12 texturas y 11 MB de heap; tras los 10 cambios de vista, 14 geometrías (las 7 de la escena del cielo, que se crea una vez y se conserva), 12 texturas y 11 MB; y así sigue tras 6 cambios de calidad y 10 vueltas por los sistemas de lunas. Un solo contexto WebGL y un lienzo.
- **Primera vista** (`/`, sin cambios): el LCP, el póster (192 ms en alto); una tarea larga de 84 ms en alto, ninguna en bajo.
- **Cálculo** (Node, `ephemeris/`): «Esta noche», unos 8 ms por noche; el cielo de un instante (`skyBodies`), 0,14 ms; diez años de eclipses de un lugar, 61 ms en Node (en el navegador, un eclipse cada vez, cediendo el hilo).

## 7. Capturas
En `docs/informes/img/fase-8/` (`node scripts/capture-sky.mjs docs/informes/img/fase-8`, con `?captura=1`):
- `escritorio-cielo-montsec-noche` y `movil-cielo-montsec-noche`: el Montsec el 1-11-2026 a las 22:00, con el panel (Saturno al sur, en su culminación); en el móvil, el panel compacto.
- `escritorio-cielo-via-lactea`: a las 21:00, hacia el noroeste: la Vía Láctea del Cisne al Águila, con el triángulo de verano.
- `escritorio-cielo-crepusculo`, `escritorio-cielo-nautico` y `escritorio-cielo-dia`: la puesta del Sol, el crepúsculo náutico y el mediodía.
- `escritorio-cielo-teide`: el Teide a la misma hora UTC: «Atlantic/Canary, UTC», una hora menos en el reloj.
- `escritorio-cielo-luna-cerca`: la Luna en cuarto menguante, con un campo de 2°: su fase y sus mares.
- `escritorio-cielo-eclipse-fraga` y `…-cerca`: el eclipse total del 12-08-2026 desde Fraga, en la franja de la totalidad (el Montsec y Madrid lo ven parcial, al 99,7 % y al 99,97 %): el cielo oscurecido, Júpiter y la corona.
- `escritorio-ver-en-3d-sol` y `escritorio-ver-en-3d-luna`: «Ver en 3D».
- `escritorio-eclipses` y `movil-eclipses`: `/eclipses`, recalculada en el navegador (repetida tras la revisión: en el móvil ya no se sale por la derecha).
- `escritorio-cielo-dia-etiquetas` y `movil-cielo-dia-etiquetas` (tras la revisión): la página del cielo de día, con la interfaz, a las 09:30 del 2-11-2026: los puntos cardinales y el nombre del Sol sobre su placa, la entradilla legible sobre el resplandor y, en el móvil, la zona junto al reloj y «Ahora es de día».
- Los pósters de `/cielo` (`public/img/poster-sky-*.webp`).

## 8. Dependencias añadidas
Ninguna. Las constelaciones son datos (d3-celestial, BSD de 3 cláusulas), descargados por `download-assets.mjs` y fijados a un commit, como las texturas.

## 9. Pendientes y `TODO(ivan)`
En `PENDIENTES.md`, «Bloque E (fase 8)»:
- los nombres de las constelaciones (en latín, o una fuente para los españoles);
- la velocidad del cielo (tiempo real, propuesta);
- probar `/cielo` y `/eclipses` en el móvil (no bloquea).

## 10. Propuestas de cambio al plan
1. **D33, con el cielo:** en `/cielo`, tiempo real (§4.1). Hoy, `CONTEXT_SPEED.sky` = 1 s/s.
2. **Los nombres de las constelaciones en español,** si Iván los quiere, con una fuente de licencia compatible (§4.2).
3. **Para la fase 10 (rendimiento y pulido), de la revisión** (sugerencias 13 a 15): en el cielo, pedir solo las texturas que usa (la Luna y la Vía Láctea; hoy, las de la vista general de los 30 cuerpos, unos 38 MB de VRAM, dentro de §5); de día, que el resplandor bajo un Sol alto no sature a blanco y que el disco del Sol enrojezca junto al horizonte; y en «Ver en 3D» de un eclipse de Sol con el máximo a la puesta, encuadrar la sombra con el terminador a un lado.

## 11. Cómo probarlo
- `npm start` y abrir `http://localhost:4200/cielo` (o la pestaña «Cielo», o la tecla 4). Arrastrar para mirar alrededor, la rueda para el campo y las flechas con el foco en el lienzo.
- Cambiar de lugar (el Teide: las horas, en la de Canarias), «Usar mi ubicación», mover la hora de la noche, abrir «Esta noche» y pulsar «Mirar».
- `/cielo?lugar=fraga&fecha=2026-08-12T18:29:29Z`, mirando al Sol (al oeste, bajo): el eclipse total.
- `/eclipses`: el selector, la lista y «Ver en 3D».

## Respuesta a la revisión
Revisión: `docs/revisiones/fase-8.md` (CAMBIOS NECESARIOS: 0 Bloqueantes, 2 Importantes, 9 Menores y 5 Sugerencias). Corregidos los dos Importantes y los nueve Menores, y hechas dos sugerencias y parte de una tercera, sin cambiar el alcance ni los criterios. Sin Bloqueantes, no hace falta una segunda ronda.

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 1 | Importante | **La noche del deslizador, una función del instante y del lugar** (`features/sky-panel/night-slider.ts`): `nightSky` del instante menos la media hora del margen, así que la media hora que sigue a la salida del Sol sigue siendo la misma noche. `nightSky` dice desde cuándo vale cada noche (`since`: la salida anterior, buscada hacia atrás), y el panel reutiliza la anterior (`linkedSignal`, sin estado mutable) solo mientras el instante cae en ese tramo: da lo mismo que recalcularla. El rango del deslizador queda siempre dentro de su noche: el último paso, antes de la salida más el margen; el primero, después de la salida anterior más el margen (con un día de 45 minutos, en Laponia en diciembre, se recorta). «Ahora es de día», solo antes del comienzo del deslizador. Tests: los extremos del deslizador dan la misma noche en el Montsec (otoño y la noche más corta), el Teide y Laponia; la salida + 29 min, la misma noche, y + 31 min, la siguiente; hacia atrás del mediodía del 21-12 al 20-12, cada 40 min, reutilizar da lo mismo que recalcular (a las 06:00 UT del 21, la noche del 20); `since` en `night.spec.ts`. e2e: Fin lleva a las 08:xx con el pulgar al final, sin «Ahora es de día» y con la misma noche; «←» resta 5 minutos; Inicio, al principio de esa misma noche; y de día se dice «Ahora es de día». |
| 2 | Importante | `/eclipses`: la rejilla con `minmax(0, 1fr)` y el selector a todo el ancho. e2e nuevo en el móvil: a 320 px de ancho, `/eclipses` (ya recalculada), `/creditos`, `/sobre-el-proyecto`, `/planetas` y `/sol` miden 320 px (sin desplazamiento horizontal). `movil-eclipses`, repetida. |
| 3 | Menor | En el móvil, la zona va junto al reloj («22:00 · Europe/Madrid, UTC+1») y el aviso «Ahora es de día: arrastra para ver la noche.» queda a la vista (un párrafo propio, también en escritorio). Capturas `movil-cielo-montsec-noche` y `movil-cielo-dia-etiquetas`. |
| 4 | Menor | «Mirar al Sol» (`lookLabel` en `sky-text.ts`, con test), también como `title` del botón (ESTILO §6: los iconos solos, con su texto) y en el e2e. |
| 5 | Menor | Comprobado en la página de la IAU (https://www.iau.org/IAU/IAU/Astronomy-FAQs/Constellations.aspx, 01-11-2026): las cartas se hicieron con Sky & Telescope (Roger Sinnott y Rick Fienberg), las figuras son de Alan MacRobert y «The images are released under the Creative Commons Attribution 4.0 International license». La atribución, con la licencia y los cambios, en `constellations.LICENSE.txt` (desde `build-constellations.mjs`, regenerado), en los campos `license` y `basis` del JSON, en `FUENTES.md` y en `/creditos`. CC BY 4.0 está en la lista de Iván. |
| 6 | Menor | Las etiquetas del cielo, solo en la parte visible (fuera de los márgenes de la interfaz, que el motor ya conocía para encuadrar): en el móvil, ninguna bajo la entradilla (test del motor con márgenes: sin ellos, alguna caería ahí; con ellos, ninguna). Los puntos cardinales y los nombres del Sol, la Luna y los planetas, sobre una placa del color del fondo al 85 % (al menos 4,9:1 con blanco detrás). El color de las constelaciones, en el token `--color-sky-constellation`. Y un fallo que no estaba en la revisión, encontrado al comprobar este: de día, la entradilla quedaba a unos 2:1 sobre el resplandor del Sol (el velo de las otras vistas se desvanece); en el cielo, el velo es casi opaco en toda su caja (92 %: más de 6:1). Capturas `*-cielo-dia-etiquetas`. |
| 7 | Menor | «Qué planetas se ven y hacia dónde mirar», un rótulo (`p`) en lugar de un `h3` que colgaba de «Lugar». |
| 8 | Menor | `sky-scene.ts` usa `horizontalToSkyThree` para la cámara y para los puntos cardinales. |
| 9 | Menor | Un solo criterio, el borde de arriba (`upperLimbAltitudeOf` en `sky.ts`: el centro con la refracción más el radio aparente), y la salida se busca desde 10 minutos antes del intervalo: si el borde ya ha asomado al empezar (con el criterio de `SearchRiseSet`, que usa 34′ fijos de refracción y difiere en menos de 0,1°), se ve desde el principio. `aboveHorizon`, exportada y con test: con el intervalo empezando 20 s después de la salida (el centro aún bajo el horizonte), se ve entero; diez minutos antes, desde la salida. Test de `upperLimbAltitudeOf`: en las salidas y puestas del Sol y de la Luna de `SearchRiseSet`, el borde a menos de 0,1° del horizonte y el centro, un radio aparente por debajo. La lista generada de `/eclipses` no cambia. |
| 10 | Menor | El comentario de los modelos de elevación, otra vez encima de su bloque. |
| 11 | Menor | El informe dice `eclipse-search.ts`, y que el e2e de «Ver en 3D» comprueba la URL con `sombra=1` y que la vista queda lista (la puntería, el test de la sesión). |
| 12 | Sugerencia | Hecha: al entrar en el cielo desde otra vista, sus sombreados se compilan con `compileAsync` y no se pinta hasta que están (se queda la última imagen, bajo el fundido); una sola vez. Test con una compilación que espera: sin pintar mientras dura, se pinta después y no se compila otra vez. |
| 13 | Sugerencia | Para la fase 10 (§10.3): cabe en §5 (38 MB). |
| 14 | Sugerencia | En parte: las líneas de las constelaciones, más tenues en el crepúsculo náutico (0,25 a −12° y 0,1 a −9°; antes, 0,35 y 0,2). El resplandor de día y el Sol rojizo junto al horizonte, para la fase 10 (§10.3). |
| 15 | Sugerencia | Para la fase 10 (§10.3). |
| 16 | Sugerencia | Hecha: en los selectores, «Observatorio del Teide, Tenerife» (`placeOptionLabel`: en las islas, solo la isla), con test y en ESTILO §6. |

Después de los cambios: `npm run check` en verde (678 tests en 72 ficheros; cobertura de `ephemeris/`: 98,9 % de sentencias, 93,85 % de ramas, 100 % de funciones y 99,76 % de líneas; JS inicial de 300,40 kB, con 12,62 kB de código propio; ninguna página con three ni astronomy-engine en su JS inicial). e2e, con el build final: en la ronda completa, 85 de 87; los dos que fallaron eran de los propios tests y están corregidos (una expresión regular nueva mal escrita y una comprobación de la URL de llegada de «Ver en 3D», que lleva `sombra=1` y el explorador la quita al apuntar: ahora se mira en el enlace), y `cielo.spec.ts` pasa entero (8 de 8). Las capturas, repetidas con el build final. **Sin fusionar:** la sesión se cerró aquí (`DIARIO.md`).
