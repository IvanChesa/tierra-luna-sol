# Informe: Fase 5 (La Tierra)

- **Rama:** `fase-5-tierra`
- **Fecha:** 2026-10-27 (revisión aplicada el 2026-10-30)
- **Estado:** cerrado: revisión del subagente aplicada (§12), listo para fusionar (modo autónomo por bloques, bloque C)

## 0. Plan de la fase

Escrito antes de empezar, a partir de `docs/PLAN.md` (§0–§5, §7, D13, D20, D21, D29 y la fase 5), la revisión del bloque R (R3: velo lechoso y océanos frente a EPIC), el informe de la fase 3b (§4.7 y la propuesta 2 de §10: relación de brillo océano/tierra de EPIC sin contar dos veces la atmósfera), `docs/decisiones/CAMBIO-CIELO-ESPANA.md` (los lugares de la vista «España») y el código: `scene/materials/body-material.ts` y `atmosphere-material.ts` (la Tierra se dibuja hoy con el material común y solo la textura de día), `ephemeris/coordinates.ts` (`subsolarPoint`), `ephemeris/orientation.ts` (orientación de la Tierra de la fase 1), `scene/textures.ts` (ya hay día, noche, nubes, normales y especular en 1K/2K/4K) y `data/places.ts` (Fraga y Lleida).

### Entregas
| Entrega | Contenido |
|---|---|
| 5.a | **Material de la Tierra** (`scene/materials/earth-material.ts`, con los chunks de profundidad, D13): día y noche con la dirección real del Sol; terminador con tono crepuscular; luces nocturnas que se apagan gradualmente en el crepúsculo; especular en los océanos (máscara) y mapa de normales; nubes en una capa propia con deriva ilustrativa (quieta con movimiento reducido y en las capturas); atmósfera (Fresnel + tono del lado diurno) sin el velo lechoso (R3). Color y brillo frente a EPIC (propuesta 2 de la 3b): relación de brillo océano/tierra de las fotos de EPIC, sin contar dos veces la atmósfera; con las nubes, la exposición de la Tierra pasa a su albedo geométrico (0,434). Las texturas, por el manifiesto (noche, nubes, normales y especular solo en primer plano). Captura `tierra-epic-2016` junto a la foto de EPIC. |
| 5.b | **Orientación y Sol.** Test del punto subsolar del 21-06-2026 a las 12:00 UTC (≈ +23,4°, 0°, ±2°) con la misma función que da al shader la dirección del Sol en el sistema propio de la Tierra. **Control de la luz solar** en la vista Tierra: cambia la hora del día sin perder la fecha (control accesible con teclado y anuncio). |
| 5.c | **Sombra de la Luna** sobre la Tierra (umbra y penumbra analíticas, D20). Test: en el máximo del eclipse del 12-08-2026, el centro de la sombra calculada coincide con el de la NASA (±1°; fixture con URL). Captura del eclipse. |
| 5.d | **Vistas guiadas** (`data/tours.ts`): Tierra completa, Pacífico, Himalaya, luces nocturnas y España, con marcadores discretos en los lugares del cielo desde España (Montsec, Observatori Fabra, Roque de los Muchachos, Teide, Calar Alto, Madrid y Fraga). Sus coordenadas, de fuentes oficiales (IGN o la web de cada observatorio), con su zona horaria en `data/places.ts`. `TourPlayerComponent` con anterior, siguiente, reproducir y subtítulos accesibles; movimiento reducido. Textos con fuente y `reviewed: false`. |
| 5.e | **Textura de día de 8K** solo en el nivel alto y si cabe en `maxTextureSize`; presupuestos de §5 (vista Tierra ≤ 6 MB adicionales en alto y ≤ 2 MB en bajo; VRAM). |
| 5.f | **Cierre:** capturas de mediodía y medianoche UTC, de cada vista guiada, del eclipse y de EPIC, en escritorio y móvil; FPS y VRAM de la vista Tierra; `npm run check`, e2e, informe, revisión por subagente, correcciones y fusión. Al terminar, resumen del bloque C en `DIARIO.md` y **parada**. |

### Riesgos y dudas
1. **Coordenadas de los observatorios:** tienen que venir de fuentes oficiales citadas. Si alguna no se encuentra, el marcador se omite y se apunta (no se inventa).
2. **Calibración frente a EPIC:** las fotos de EPIC tienen una curva de brillo no documentada (informe de la 3b, §4.7). Se calibra la relación océano/tierra y el color, no el brillo absoluto.
3. **La prueba en el móvil de Iván** (criterio de FPS y VRAM en su móvil) no bloquea: se recoge cuando pueda.

### Dependencias
Ninguna nueva.

### Estado de las entregas (se actualiza al cerrar cada una)
| Entrega | Estado | Commits | Notas |
|---|---|---|---|
| 5.a | ✅ (falta la textura de 8K, en 5.e) | `2705fc6`, `296fbf5`, `5bb36a8` | Variante `TLS_EARTH` del material común: nubes con deriva (reloj de pared) y su sombra, reflejo del Sol en el océano, luces nocturnas en el crepúsculo, tono crepuscular y luz azulada dispersada sobre el lado diurno; la neblina del limbo, azulada y más tenue (R3). Las nubes, también en la vista general (allí la Tierra ya no se ve oscura); la noche, la máscara y las normales, solo en primer plano (test). Exposición con el albedo geométrico (0,434). Captura junto a EPIC: `scripts/capture-earth.mjs`. |
| 5.b | ✅ | `3b13188`, `727d278` | Test del punto subsolar con lo que recibe el shader (a menos de 0,05° de `subsolarPoint`). Panel «Luz del Sol» en la vista Tierra (hora del día sin cambiar la fecha), con su spec. |
| 5.c | ✅ | `072ee70`, `776e8c6` | `moonShadowCenter` (eje Sol–Luna contra el elipsoide WGS84) a menos de 1° del máximo del catálogo de la NASA (fixture generado con su URL), con el Sol a la altura de la ficha. En el shader, umbra y penumbra analíticas con las posiciones reales de la Luna y del Sol (no su dirección: su paralaje movía la sombra ~0,7°); test: el eje con lo que recibe el shader, a menos de 0,1° de `moonShadowCenter`. Captura `tierra-eclipse-2026`. |
| 5.d | ✅ | `e8a61de`, `d99e1b9` | Los siete lugares del cielo desde España con fuente oficial (IGN, IAC, CAHA, web del Parque del Montsec; altitud del Fabra de Meteocat) y zona horaria. Cinco vistas guiadas (`data/tours.ts`) con subtítulo, fuente y `reviewed: false`: pausa, hora solar del punto sin cambiar la fecha, cámara sobre el punto (`lookAtSurface`) y anuncio. Panel con la botonera, anterior/siguiente y «Recorrer las vistas». Marcadores en la vista «España» (puntos que giran con la Tierra). Specs de la sesión y del panel. |
| 5.e | ✅ | `f87cdd9` | Nivel 8k solo para la textura de día (1,28 MB), en el nivel alto y si cabe en `maxTextureSize`. Para caber en los 300 MB de VRAM (§5), la noche, la máscara y las normales de la Tierra van en 2k (`earthMapsTexture`; con ellas en 4k, más de 370 MB). Texturas de la vista Tierra en alto: ~3,3 MB (≤ 6). Test del presupuesto con la Tierra enfocada como peor caso. |
| 5.f | ✅ | `5a91bdf`, `c2312c4`, `63c617a` y este informe | e2e de la vista Tierra, mediciones, capturas, `npm run check` y revisión. |
| Revisión | ✅ | `082d496` (revisión), `3bdd626`, `586d502`, `22af995`, `3520b40`, `fc6c595`, `97f21ee`, `dbd487f`, `bafbcb7`, `929c8e5`, `2fe4241` y este informe | 0 bloqueantes, 6 importantes, 9 menores y 5 sugerencias: corregidos los importantes y los menores, y 4 sugerencias, más 2 fallos propios (§12). |

## 1. Resumen
La Tierra deja de ser una esfera con la textura de día y un velo lechoso.

**El material (variante `TLS_EARTH` del material común):**
- nubes en su propia capa, con deriva ilustrativa y su sombra;
- el Sol reflejado en los océanos;
- luces de las ciudades que se encienden en el crepúsculo;
- un tono cálido junto al terminador;
- la luz azulada que dispersa la atmósfera sobre el lado diurno;
- calibrado con las fotos de EPIC (R3): océano, desiertos y nubes con la geometría de tres fotos, sin el velo de la 3b. La relación de brillo océano / desierto es de 0,189 (EPIC, 0,178), y las nubes quedan a menos del 3 % de las de EPIC.

**La sombra de la Luna** (umbra y penumbra analíticas, D20) cae en el eclipse del 12-08-2026 donde la sitúa el catálogo de la NASA: a unos 3 km, con el Sol aparente (con la aberración).

**En la vista Tierra:**
- un panel con cinco vistas guiadas: subtítulos, un recorrido automático y marcadores en los siete lugares del cielo desde España, con coordenadas oficiales; también en el móvil, donde la cámara se aleja lo justo para que se vea la región;
- la «Luz del Sol», que cambia la hora del día sin cambiar la fecha que se ve, en la hora local o en UTC;
- la textura de día de 8K en el nivel alto, que sube a la GPU al acabar el viaje de cámara.

Todo dentro de §5: 60 FPS en los tres niveles y 278 MB de VRAM en alto (de 300) y 85 MB en bajo (de 120).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Test: el punto subsolar del 21-06-2026 a las 12:00 UTC está a ≈ +23,4° de latitud y 0° de longitud (±2°), con la misma función que alimenta el shader | ✅ | `coordinates.spec.ts` (`subsolarPoint`, desde la fase 1) y `engine.spec.ts`: la dirección del Sol del material de la Tierra, llevada al sistema propio de su malla, da +23,4° y 0° (±2°) y coincide con `subsolarPoint` a menos de 0,05° (la misma orientación de la Tierra). |
| Test: en el máximo del eclipse solar del 12-08-2026, el centro de la sombra calculada coincide con el de la NASA (±1°; fixture con URL). Captura del eclipse | ✅ | Fixture `nasa-eclipse-2026-08-12.json`, generado por `fetch-horizons-fixtures.mjs` desde https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+20260812: el máximo a las 17:45:51 UT, en 65,2° N y 25,2° O, con el Sol a 25,8°. `eclipse.spec.ts`: `moonShadowCenter`, con el Sol aparente, a menos de **0,1°** (−0,020° de latitud y −0,034° de longitud: 2,7 km); desde allí, el Sol a la altura de la ficha (±0,2°) y la Luna delante (a menos de 6″). `engine.spec.ts`: el eje con lo que recibe el shader, a menos de 0,1° de la NASA y de `moonShadowCenter`. Captura `tierra-eclipse-2026`. |
| Capturas de mediodía y medianoche UTC y de cada vista guiada | ✅ | `tierra-mediodia-utc` y `tierra-medianoche-utc` (21-06-2026); `vista-tierra-completa`, `vista-pacifico`, `vista-himalaya`, `vista-luces` y `vista-espana` (con los marcadores), y `movil-vista-espana` (los siete marcadores a la vista). |
| FPS y VRAM de la vista Tierra según §5, en escritorio y en el móvil de Iván | ✅ en escritorio · pendiente en el móvil (no bloquea) | §6.1: 60 / 60 / 60 FPS en alto, medio y bajo; **278 / 86 / 85 MB** de VRAM (≤ 300 y ≤ 120), ahora con las nubes, la noche y la máscara contadas; 6 llamadas de dibujo. Texturas de la vista Tierra en alto: 3,34 MB (≤ 6); en bajo, 0,77 MB (≤ 2). El móvil de Iván, en `PENDIENTES.md`. |
| Textos de las vistas con fuente y `reviewed: false` | ✅ | `data/tours.ts`: cinco subtítulos, cada uno con sus fuentes y `reviewed: false` (test): EPIC (`/about/epic`), NOAA, NASA Earth Observatory, el Black Marble de la NASA y, en «España», las fuentes oficiales de sus siete lugares. |
| `tierra-epic-2016` otra vez junto a la foto de EPIC: sin velo lechoso y con el océano a la relación de brillo medida (R3) | ✅ (medido) | `scripts/measure-earth-epic.mjs` (§5.10): nuestra Tierra con la geometría de las tres fotos de EPIC del 21-06-2016, medida igual que las fotos. Relación océano / desierto: 0,189, y en EPIC, 0,178 (antes de la revisión, 0,076). Nubes (percentil 98): a menos del 3 % de las de EPIC en las tres. Comparativas: `tierra-epic-2016-comparada` y `tierra-epic-{indico,atlantico,pacifico}`. |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 1. Material de la Tierra | hecha | Día y noche con la dirección real del Sol; terminador con tono crepuscular; luces nocturnas que se apagan en el crepúsculo; especular en los océanos y normales (con el norte en G desde la revisión); nubes con deriva ilustrativa; atmósfera (luz dispersada en el lado diurno y neblina del limbo). |
| 2. Orientación real según la hora | hecha (fase 1) | Con su test nuevo con lo que recibe el shader (5.b). |
| 3. Sombra de la Luna | hecha | Analítica (D20), con las posiciones reales de la Luna y del Sol aparente. |
| 4. Control de la luz solar | hecha | «Luz del Sol»: la hora del día sin cambiar la fecha que se ve, en la zona de la barra de tiempo. |
| 5. Vistas guiadas | hecha | `data/tours.ts`, el panel de la Tierra (que hace de `TourPlayer`) y los marcadores de España. |
| 6. Textura de día de 8K | hecha | Solo en el nivel alto y si cabe en `maxTextureSize`. |
| 7. Prueba en móviles reales | pendiente de Iván | No bloquea (`PENDIENTES.md`). |
| 8. Color y brillo frente a EPIC (R3) | hecha (medida) | Ver el criterio y §4.2. |

## 4. Desviaciones del plan y motivo

### 4.1 El material de la Tierra es una variante del común, no uno nuevo
El plan nombraba `scene/materials/earth-material.ts`. El material común ya resolvía la luz con la dirección real, la exposición, el relieve, la neblina del limbo y los chunks de profundidad (D13). La Tierra lo extiende con `#define TLS_EARTH`: nubes, especular, luces, crepúsculo, luz dispersada, tierras áridas y sombra de la Luna, sin duplicar el resto.

### 4.2 R3: medido y calibrado, sin devolver el océano a su color de superficie
La propuesta 2 de la 3b planteaba integrar la dispersión y devolver el océano de la textura a su color de superficie, para no contar dos veces la atmósfera. Al medirlo (revisión, hallazgo 5), el océano ya tenía el brillo de EPIC; lo que fallaba eran los desiertos de la textura, casi tan claros como las nubes (en EPIC, un tercio). Se ha hecho así:
- un término aditivo azulado sobre todo el lado diurno, más fuerte hacia el limbo, y la neblina del limbo, más tenue y azulada (sin el velo de la 3b);
- las tierras áridas comprimen su brillo, L / (1 + L / 0,55), solo en la tierra cálida: ni el océano ni el hielo, y apenas los bosques;
- las nubes, con albedo 1 (antes 0,75);
- el océano de la textura conserva el color medido en EPIC (desde la 3b).

Los dos valores calibrados están en `VISUAL_CONFIG.earth`, con su medida. El brillo absoluto de EPIC sigue sin documentar: se calibran relaciones (océano / desierto y nubes / resto) en las mismas condiciones.

### 4.3 La sombra de la Luna usa la posición del Sol aparente, no su dirección
Con la dirección del Sol desde el centro de la Tierra, su paralaje (8,8″) movía la sombra unos 16 km a la distancia de la Luna. El shader recibe la Luna y el Sol como esferas en su sitio, en radios terrestres. Desde la revisión (hallazgo 7), el Sol es el aparente, con la aberración anual (20,5″): sin ella, la sombra se apartaba 36 km del punto de la NASA; con ella, 2,7 km. Lo comprueban los tests del motor y de las efemérides, ahora a ±0,1°.

### 4.4 VRAM: la noche, la máscara y las normales de la Tierra, en 2k
Con el día en 8K (179 MB con sus mipmaps) y los demás mapas en 4K, la vista Tierra pasaba de 370 MB, por encima de los 300 de §5. Las luces nocturnas, la máscara del océano y las normales van en 2k (`earthMapsTexture`); las nubes, en 4K. Lo vigila el test del presupuesto, con la Tierra enfocada como peor caso. Medido, ya con todos los mapas contados (revisión, hallazgo 2): **278 MB**, el 93 % del presupuesto del nivel alto. El informe decía 214 MB porque el motor no contaba las nubes, la noche ni la máscara.

### 4.5 Los lugares: altitud desconocida en dos, y Madrid en la Puerta del Sol
Coordenadas de fuentes oficiales:
- **IGN:** el Observatori Fabra (Nomenclátor), la Puerta del Sol (el punto del barrio de Sol, que cae en la plaza; el Nomenclátor no tiene el km 0 como lugar) y Fraga.
- **IAC:** el Roque de los Muchachos y el Teide.
- **CAHA:** Calar Alto.
- **Parc Astronòmic Montsec:** el punto de su enlace al mapa, en Àger.

La altitud del Fabra es la de su estación del Servei Meteorològic de Catalunya. La del Montsec y la de la Puerta del Sol no las da su fuente: quedan en `null` para la fase 8, que es la que las usa (el horizonte del cielo).

### 4.6 Las vistas guiadas ponen su hora del día y pausan
Cada vista lleva el reloj a la hora solar media a la que su punto se ve de día (las luces, de noche) y pausa la reproducción. Si no, a 1 hora por segundo la Tierra giraría 15° por segundo y la vista se perdería. Es la ecuación del tiempo sin corregir (unos minutos): basta para verlo. **Sin cambiar la fecha que se ve** (revisión, hallazgo 1): de los tres instantes con esa hora solar (el del día UTC y los de los días vecinos), el que cae en el día que enseña la barra de tiempo, en la hora local o en UTC, y dentro de 1900–2100. Antes conservaba el día UTC, y en España «El Pacífico» y «Las luces de la noche» pasaban al día siguiente.

### 4.7 El panel de la Tierra hace de `TourPlayerComponent`
Las vistas guiadas y la luz del Sol van en un mismo panel de la vista Tierra (`features/earth-panel`), no en dos componentes. Sus controles: la botonera de vistas (con `aria-pressed`), anterior y siguiente (no disponibles en los extremos), «Recorrer las vistas» (cada 9 s, hasta la última) y el subtítulo escrito, que la sesión anuncia una vez. En escritorio va bajo la presentación, sin apartar el encuadre. En el móvil va al pie del lienzo, más bajo desde la revisión (los rótulos, solo para los lectores de pantalla, y la «Luz del Sol» en una fila); el encuadre sube por encima de él y cada vista guiada se aleja lo justo para que se vea su región (hallazgo 6). Aun así ocupa algo más de un tercio de la pantalla: queda para la prueba de Iván.

### 4.8 Las nubes derivan con el tiempo de los frames pintados
Con el tiempo simulado, a 3 días por segundo darían vueltas a toda velocidad. Derivan con el tiempo real de los frames que se pintan (con su tope): quietas con movimiento reducido, en las capturas y mientras no se pinta; al volver a pintar, no saltan (revisión, hallazgo 8).

## 5. Decisiones técnicas nuevas

### 5.1 Mapas de la Tierra con su propio nivel y su propio momento
Las nubes se cargan también en la vista general: son las que dan a la Tierra su brillo, y con ellas ya no se ve oscura. Las luces nocturnas, la máscara del océano y las normales, solo en primer plano. Mecanismo genérico (`BodyMap`), con su liberación al alejarse y al liberar la escena (test de qué se pide en cada caso y de la VRAM que suman).

### 5.2 La exposición de la Tierra, con su albedo geométrico
Con las nubes dibujadas, la Tierra se compensa con su albedo geométrico del catálogo (0,434, que las incluye). Hasta ahora se usaba el efectivo de su textura (≈ 0,08), que con nubes la sobreexponía. El brillo de cada parte (nubes, desiertos y océano) lo fija la calibración con EPIC (§4.2).

### 5.3 `lookAtSurface` y `setSurfaceMarkers` en la API del motor
- `lookAtSurface` lleva la cámara sobre un punto de la superficie con la orientación real del cuerpo, fijando el zoom del encuadre: la distancia la impone el encuadre en cada frame. Desde la revisión recibe también la región de la vista (`extentDeg`) y se aleja lo justo si la parte visible del lienzo no la deja ver (`capFitDistance`, §5.6).
- `setSurfaceMarkers` muestra los marcadores: puntos redondos con su borde (material propio con los chunks de profundidad; color y tamaño en `VISUAL_CONFIG.earth.markers`), hijos de la malla de la Tierra, que giran con ella y se ocultan en la cara de atrás.

### 5.4 Las coordenadas de los observatorios, convertidas en el código
El IAC y el CAHA dan grados, minutos y segundos. `places.ts` los convierte con `dms()`, sin hacer la cuenta a mano.

### 5.5 La zona de las fechas, compartida
La zona en la que la interfaz dice las fechas (la local o UTC, que se elige en «Controles +») pasa de la barra de tiempo al `ExplorerStore`: la usan también la «Luz del Sol» (su hora, su nota y su texto accesible) y las vistas guiadas (el día que conservan).

### 5.6 El encuadre de una región de la superficie
`capFitDistance(extentDeg, fov, aspecto)`: la distancia a la que un casquete de ese radio angular alrededor del punto al que se mira cabe en la parte visible, con un margen. Un punto del borde, a θ, se ve a atan(sen θ / (d − cos θ)) del eje; si el casquete llega al horizonte, cabe el disco entero (d = 1 / sen α). En escritorio no cambia nada (las distancias de cada vista ya dejan ver su región); en un móvil de 390 × 844, «España» pasa de 2 a unos 3 radios.

### 5.7 Los mapas de superficie dan la vuelta en longitud
Las texturas equirrectangulares se cargan con `RepeatWrapping` en u. Con `ClampToEdge` (el de three), la deriva de las nubes estiraba la última columna del mapa en una franja que crecía con el tiempo (43° a los 5 minutos). Lo encontré al repasar el código para la revisión; las capturas no lo enseñaban porque en ellas las nubes están quietas.

### 5.8 Las texturas enormes suben al acabar el viaje
Las de más de 4096 px (la de 8K de la Tierra: 61–69 ms de `texSubImage2D`) esperan a que acabe el vuelo o la transición de marco. Mientras, se ve el nivel anterior.

### 5.9 El relieve de la Tierra, con el norte en G
El mapa de normales de Solar System Scope guarda el sur en G (revisión, hallazgo 4). `build-textures.mjs` lo invierte y comprueba siete laderas conocidas respecto al llano del mismo mapa (en 2k: sur del Himalaya −5,3; sur de los Alpes −3,4; sur de los Pirineos −3,9; norte de los Alpes +2,7; norte de los Pirineos +7,4; oeste de los Andes −4,4 y este +2,4, en R). Si un canal se inclina al revés, el build falla.

### 5.10 La medida frente a EPIC, reproducible
`scripts/measure-earth-epic.mjs` pinta la Tierra con la geometría de las tres fotos del 21-06-2016 (fecha, fase y latitud de los metadatos de la API de EPIC) y lleva cada píxel de las dos imágenes a su latitud y su longitud: en la foto, con la ortográfica desde su centroide; en la nuestra, con la cámara y la malla de la escena. Mide, a menos de 0,6 radios del centro, el océano despejado, los desiertos de Arabia y del Sáhara occidental y las nubes más claras. Método y cifras, en `docs/realismo/referencias.md`.

## 6. Salida de los checks
```
npm run check (30-10, tras la revisión)
ng lint: All files pass linting. · prettier --check: All matched files use Prettier code style!
Test Files 60 passed (60) · Tests 514 passed (514)
Cobertura de ephemeris/: 99,5 % de sentencias, 96,49 % de ramas
Initial total 298.23 kB (82.45 kB transferidos) · sin avisos de presupuesto
Chunk del visor (three): 678,67 kB en bruto (aviso a 900) · explorer-ui: 267,26 kB
✔ El JS inicial de las 17 páginas no lleva three, astronomy-engine, los stores ni los controles del visor
✔ Código propio en los chunks iniciales: 12.13 kB de 15.00
```
```
npm run e2e (30-10): 70 passed (3.9m), con el e2e nuevo en móvil de los márgenes del encuadre al
entrar en la vista Tierra desde el sistema solar. (En una pasada anterior, 69 y 1 rojo: esperaba el
texto accesible anterior de «Hora del día»; ahora dice la zona, «09:40, hora local, UTC+2».)
```

### 6.1 Mediciones (`node scripts/measure-system.mjs`, 30-10; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista Tierra a 1 h/s | alta (8K) | 60 / 60 | 1,08 ms | 6 | 39 472 | 278 MB |
| | media | 60 / 60 | 1,03 ms | 6 | 23 080 | 86 MB |
| | baja | 60 / 60 | 0,79 ms | 6 | 16 372 | 85 MB |
| Vista general a 3 días/s | alta | 60 / 60 | 1,39 ms | 21 | 175 854 | 38 MB |

La VRAM cuenta ya todos los mapas de la Tierra (revisión, hallazgo 2): en alto, el día en 8K (171 MiB con sus mipmaps), las nubes en 4K (42,7 MiB) y la noche, la máscara y las normales en 2k (10,7 MiB cada una), más los demás cuerpos y la Vía Láctea. Texturas de la vista Tierra en alto: día 8K 1,31 MB, nubes 4K 1,84 MB, noche 2k 0,06 MB, normales 2k 0,02 MB y máscara 2k 0,10 MB: 3,34 MB, dentro de los 6 MB de §5. En bajo (todo en 2k): 0,77 MB, dentro de los 2 MB.

**Tareas largas** (revisión, hallazgo 15; `PerformanceObserver` de `longtask` y `long-animation-frame`, en alto, sin modo de captura):
- **Entrada directa** en `/explorar/tierra` (4 pasadas): como mucho 102–106 ms; ninguna de más de 200 ms.
- **Viaje del sistema solar a la Tierra** (4 pasadas):
  - una tarea de 105–109 ms a los 0,3 s del clic. No es de ningún script (8 ms de los 108), y coincide con la llegada de la textura de 8K: es la decodificación y el volteo de su `ImageBitmap` en el navegador;
  - la subida de la 8K (`texSubImage2D`, 61–69 ms), a los 3,05 s, al acabar el viaje (§5.8). Antes de la revisión caía a mitad del viaje.

No he reproducido las tareas de 181–364 ms que vio la revisión en una de sus sesiones. El `ImageBitmap` de la 8K (128 MiB de memoria del sistema) se conserva mientras la textura está en uso: si se pierde el contexto, three la vuelve a subir desde él (`scene/textures.ts`). Propuesta en §10.

## 7. Capturas
En `docs/informes/img/fase-5/` (modo de captura), regeneradas tras la revisión:
- `escritorio-tierra` y `movil-tierra`: la vista Tierra con su panel.
- `tierra-mediodia-utc` y `tierra-medianoche-utc`: el 21-06-2026 a las 12:00 y a las 00:00 UTC.
- `vista-tierra-completa`, `vista-pacifico`, `vista-himalaya`, `vista-luces` y `vista-espana` (con sus marcadores), y `movil-vista-espana` (los siete marcadores a la vista, con el panel más bajo).
- `tierra-eclipse-2026`: el máximo del eclipse total del 12-08-2026.
- `tierra-epic-2016` y `tierra-epic-2016-comparada`: la geometría de la foto de EPIC del Pacífico y la foto al lado.
- `tierra-epic-indico`, `tierra-epic-atlantico` y `tierra-epic-pacifico`: nuestra Tierra con la geometría de cada foto de EPIC del 21-06-2016, junto a ella (`scripts/measure-earth-epic.mjs --guardar=…`).
- `escritorio-sistema`: la vista general, con la Tierra y sus nubes.

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- Probar la vista Tierra en el móvil (FPS y VRAM, las vistas guiadas y el tamaño del panel), en `PENDIENTES.md`. La vista previa de `main` (https://staging.tierra-luna-sol.pages.dev) la tendrá en cuanto se fusione.
- Revisar los textos de las vistas guiadas (fase 9).
- La altitud del Montsec y de la Puerta del Sol (fase 8).

## 10. Propuestas de cambio al plan
Para que Iván decida (ninguna cambia el alcance de esta fase):
1. **Las nubes del Himalaya** (sugerencia 19d de la revisión): las nubes son las de un día de la textura y en la vista «El Himalaya» tapan buena parte de la cordillera; con las nubes calibradas con EPIC, se nota más. Propuesta para la fase 10: una deriva inicial de las nubes por vista guiada (ilustrativa, como la deriva) o atenuarlas en los primeros planos.
2. **La 8K, más barata** (fase 10): guardar la textura de día ya volteada y decodificarla sin `imageOrientation`, para quitar los ~105 ms de decodificación, y liberar su `ImageBitmap` tras subirla (128 MiB), recargándola si se pierde el contexto.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/explorar/tierra`: la Tierra con nubes, océanos y luces de noche en el lado oscuro.
2. En el panel, elegir «España»: la cámara va sobre España, se pausa a mediodía y aparecen los marcadores de los siete lugares. «Recorrer las vistas» las pasa solo. En el móvil (o con la ventana estrecha), la cámara se aleja hasta que se ven los siete.
3. Mover «Hora del día»: el día y la noche recorren la Tierra sin cambiar la fecha. Con «UTC» en «Controles +», la hora y la nota pasan a UTC.
4. `/?cuerpo=tierra&fecha=2026-08-12T17:45:51Z`: la sombra de la Luna sobre el Atlántico norte.
5. Capturas y mediciones: `npm run build && node scripts/capture-earth.mjs docs/informes/img/fase-5 && node scripts/measure-system.mjs && node scripts/measure-earth-epic.mjs`.

## 12. Respuesta a la revisión
Revisión del subagente (`docs/revisiones/fase-5.md`, 30-10): **CAMBIOS NECESARIOS**, con 0 bloqueantes, 6 importantes, 9 menores y 5 sugerencias. Se han corregido los 6 importantes, los 9 menores (uno, el 15, con una medida y una mejora parcial) y 4 sugerencias. Quedan una sugerencia, la 19, en parte (§10.1), y un hallazgo propio más.

| # | Severidad | Respuesta | Commit |
|---|---|---|---|
| 1 | Importante | **Corregido.** `atSolarHour` conserva el día que se ve (local o UTC) y no sale de 1900–2100 (§4.6). Tests con un día fijo de UTC+2 (como Madrid en verano) para «El Pacífico», «Las luces de la noche» y una hora entre las 00:00 y las 02:00, todas las vistas a cualquier hora y los extremos; e2e en Madrid (el 21-06: 22:40 y 23:20 UTC del 20, el mismo día local). Comentarios del test corregidos. | `3bdd626` |
| 2 | Importante | **Corregido.** `vramBytes()` suma los mapas de la Tierra (test con una fuente falsa: 5 mapas de cerca, 2 en la vista general). Tabla de §6.1 medida de nuevo: 278 / 86 / 85 MB; §1, §2 y §4.4, corregidos; las texturas, 3,34 MB en todas partes. | `22af995` |
| 3 | Importante | **Corregido.** El reloj es un `<span>`, no un `<output>`: el valor lo da el control. Test: el panel no tiene regiones vivas. | `3bdd626` |
| 4 | Importante | **Corregido.** G invertido en `build-textures.mjs` y siete sondas de pendiente que fallan si un canal se inclina al revés (§5.9). Solo cambian los tres `earth-normal`. | `3520b40` |
| 5 | Importante | **Corregido y medido.** `scripts/measure-earth-epic.mjs` (§5.10). El océano ya tenía el brillo de EPIC; los desiertos estaban 2,5 veces más claros. Las tierras áridas, comprimidas, y las nubes, con albedo 1: océano / desierto 0,189 (EPIC, 0,178), y nubes a menos del 3 %. Además, «nubes con el reparto de la foto» no era exacto (son las de la textura): ya no se dice. | `fc6c595` |
| 6 | Importante | **Corregido.** La vista guiada se aleja hasta que su región cabe en la parte visible (§5.6), y el panel es más bajo en el móvil. También un fallo que lo agravaba: los márgenes del encuadre no medían el panel de la Tierra si se entraba en su vista desde el sistema solar (hallazgo propio; e2e en móvil). Captura `movil-vista-espana` con los siete marcadores. | `97f21ee`, `bafbcb7` (e2e) |
| 7 | Menor | **Corregido.** Sol aparente (`sunApparentGeocentricEcl`) en `moonShadowCenter` y en el shader: 2,7 km de la NASA. Tests a ±0,1°. | `586d502`, `22af995` |
| 8 | Menor | **Corregido.** La deriva avanza con los frames pintados, con su tope (§4.8); test: tras un minuto sin pintar, no salta. | `22af995` |
| 9 | Menor | **Corregido.** La «Luz del Sol» trabaja en la zona elegida (§5.5): hora, día, nota («Hora local, UTC+2» o «UTC») y texto accesible; en el primer y el último día del rango, el deslizador se corta en los límites (tests). | `3bdd626` |
| 10 | Menor | **Corregido.** Los rótulos, en Public Sans 600 (como los de la tarjeta). | `3bdd626` |
| 11 | Menor | **Corregido.** Con puntero grueso, las vistas miden 44 px y el deslizador, 44 px de alto. | `3bdd626` |
| 12 | Menor | **Corregido.** El botón del recorrido cambia de texto, sin `aria-pressed` (test). | `3bdd626` |
| 13 | Menor | **Corregido.** Las vistas llevan una lista de fuentes: EPIC cita `/about/epic` (comprobado: «located at the Earth-Sun Lagrange-1 (L-1) point» y «entire sunlit face of Earth»), y «España», las fuentes oficiales de sus siete lugares (test). | `97f21ee` |
| 14 | Menor | **Corregido.** `/creditos` cita las fuentes de los siete lugares (IGN, IAC, CAHA, Parc Astronòmic Montsec y Meteocat). `FUENTES.md` registra las comparativas con EPIC (NASA EPIC Team, reutilización libre citándolo) y el fixture del eclipse (con su acknowledgment). | `dbd487f` |
| 15 | Menor | **Medido y mejorado en parte** (§6.1): en 8 pasadas, ninguna tarea de más de 110 ms. La subida de la 8K espera a que acabe el viaje (§5.8). La decodificación (≈ 105 ms) y el `ImageBitmap` conservado, en §10.2. | `bafbcb7` |
| 16 | Sugerencia | **Hecho.** `1.0 − smoothstep(...)` con los bordes en orden, en la Tierra y en las estrellas. | `22af995` |
| 17 | Sugerencia | **Hecho en parte.** La altura del Sol, en el fixture (regenerado con su script); test de la rama de la Luna detrás de la Tierra (el eclipse de Luna del 3-3-2026). La fracción de Sol visible sigue solo en GLSL: sus tests son los del eje y la sombra que recibe el shader. | `586d502` |
| 18 | Sugerencia | **Hecho.** Comentario desfasado, JSDoc huérfano y marcadores en `VISUAL_CONFIG.earth.markers`. | `22af995`, `3bdd626` |
| 19 | Sugerencia | **(b) hecho** (anterior y siguiente, no disponibles en los extremos, sin perder el foco). **(a) y (c), no:** el motor no avisa de que el usuario toma la cámara, y añadir ese evento queda fuera del alcance de la revisión. **(d), a §10.1.** | `3bdd626` |
| 20 | Sugerencia | **Hecho.** Comentario en `places.ts`: el punto es el del barrio de Sol (el Nomenclátor no tiene el km 0; su API no admite buscar por nombre). | `dbd487f` |
| — | Propio | **La franja de nubes estiradas** (§5.7): `RepeatWrapping` en los mapas equirrectangulares, con su test. | `22af995` |
| — | Propio | **Los márgenes del encuadre** no medían los paneles que aparecen después de arrancar (el de la Tierra): ahora sí (hallazgo 6). | `97f21ee` |
