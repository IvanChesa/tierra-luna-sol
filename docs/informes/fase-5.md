# Informe: Fase 5 (La Tierra)

- **Rama:** `fase-5-tierra`
- **Fecha:** 2026-10-27
- **Estado:** listo para revisión (modo autónomo por bloques, bloque C)

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

## 1. Resumen
La Tierra deja de ser una esfera con la textura de día y un velo lechoso.

**El material (variante `TLS_EARTH` del material común):**
- nubes en su propia capa, con deriva ilustrativa y su sombra;
- el Sol reflejado en los océanos;
- luces de las ciudades que se encienden en el crepúsculo;
- un tono cálido junto al terminador;
- la luz azulada que dispersa la atmósfera sobre el lado diurno, que aclara el océano respecto a la tierra como en las fotos de EPIC (R3, sin el velo de la 3b).

**La sombra de la Luna** (umbra y penumbra analíticas, D20) cae en el eclipse del 12-08-2026 donde la sitúa el catálogo de la NASA (a menos de 1°).

**En la vista Tierra:**
- un panel con cinco vistas guiadas (con subtítulos, un recorrido automático y marcadores en los siete lugares del cielo desde España, con coordenadas oficiales);
- la «Luz del Sol», que cambia la hora del día sin cambiar la fecha;
- la textura de día de 8K en el nivel alto.

Todo dentro de §5: 59,8–60 FPS y 214 MB de VRAM en alto, y 53 MB en bajo.

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Test: el punto subsolar del 21-06-2026 a las 12:00 UTC está a ≈ +23,4° de latitud y 0° de longitud (±2°), con la misma función que alimenta el shader | ✅ | `coordinates.spec.ts` (`subsolarPoint`, desde la fase 1) y, nuevo, `engine.spec.ts`: la dirección del Sol del material de la Tierra, llevada al sistema propio de su malla, da +23,4° y 0° (±2°) y coincide con `subsolarPoint` a menos de 0,05° (la misma orientación de la Tierra). |
| Test: en el máximo del eclipse solar del 12-08-2026, el centro de la sombra calculada coincide con el de la NASA (±1°; fixture con URL). Captura del eclipse | ✅ | Fixture `nasa-eclipse-2026-08-12.json`, generado por `fetch-horizons-fixtures.mjs` desde https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+20260812: el máximo a las 17:45:51 UT, en 65,2° N y 25,2° O. `eclipse.spec.ts`: `moonShadowCenter` (eje Sol–Luna contra el elipsoide WGS84) a menos de 1°. Desde ese punto, astronomy-engine pone el Sol a 25,8° de altura (la de la ficha) y la Luna delante (a menos de 1′). `engine.spec.ts`: el eje reconstruido con lo que recibe el shader cae a menos de 0,1° de `moonShadowCenter` y a menos de 1° de la NASA. Captura `tierra-eclipse-2026`. |
| Capturas de mediodía y medianoche UTC y de cada vista guiada | ✅ | `tierra-mediodia-utc` y `tierra-medianoche-utc` (21-06-2026); `vista-tierra-completa`, `vista-pacifico`, `vista-himalaya`, `vista-luces` y `vista-espana` (con los marcadores), y `movil-vista-espana`. |
| FPS y VRAM de la vista Tierra según §5, en escritorio y en el móvil de Iván | ✅ en escritorio · pendiente en el móvil (no bloquea) | §6.1: 59,8 / 60 / 59,8 FPS en alto, medio y bajo; 214 / 54 / 53 MB de VRAM (≤ 300 y ≤ 120); 6 llamadas de dibujo. Texturas de la vista Tierra en alto: ~3,8 MB (≤ 6). El móvil de Iván, en `PENDIENTES.md`. |
| Textos de las vistas con fuente y `reviewed: false` | ✅ | `data/tours.ts`: cinco subtítulos, cada uno con `source` (EPIC de la NASA, NOAA, NASA Science, el Black Marble de la NASA y el IAC) y `reviewed: false`, comprobados en sus páginas. |
| `tierra-epic-2016` otra vez junto a la foto de EPIC: sin velo lechoso y con el océano a la relación de brillo medida (R3) | ✅ (visual) | `tierra-epic-2016-comparada`: nuestra Tierra en la geometría de la foto (fase 9,4°, latitud 22,3°), junto a la foto de EPIC del Pacífico (21-06-2016). Sin velo blanquecino, nubes con el reparto de la foto y océano azul oscuro. El término de luz dispersada (`VISUAL_CONFIG.earth.scatter`) suma lo mismo al océano y a la tierra: aclara el océano en proporción. No se mide la relación exacta, porque la curva de brillo de EPIC no está documentada (informe de la 3b, §4.7; riesgo 2). |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 1. Material de la Tierra | hecha | Día y noche con la dirección real del Sol; terminador con tono crepuscular; luces nocturnas que se apagan en el crepúsculo; especular en los océanos y normales; nubes con deriva ilustrativa; atmósfera (luz dispersada en el lado diurno y neblina del limbo). |
| 2. Orientación real según la hora | hecha (fase 1) | Con su test nuevo con lo que recibe el shader (5.b). |
| 3. Sombra de la Luna | hecha | Analítica (D20), con las posiciones reales de la Luna y del Sol. |
| 4. Control de la luz solar | hecha | «Luz del Sol»: la hora del día sin cambiar la fecha. |
| 5. Vistas guiadas | hecha | `data/tours.ts`, el panel de la Tierra (que hace de `TourPlayer`) y los marcadores de España. |
| 6. Textura de día de 8K | hecha | Solo en el nivel alto y si cabe en `maxTextureSize`. |
| 7. Prueba en móviles reales | pendiente de Iván | No bloquea (`PENDIENTES.md`). |
| 8. Color y brillo frente a EPIC (R3) | hecha (visual) | Ver el criterio y §4.2. |

## 4. Desviaciones del plan y motivo

### 4.1 El material de la Tierra es una variante del común, no uno nuevo
El plan nombraba `scene/materials/earth-material.ts`. El material común ya resolvía la luz con la dirección real, la exposición, el relieve, la neblina del limbo y los chunks de profundidad (D13). La Tierra lo extiende con `#define TLS_EARTH`: nubes, especular, luces, crepúsculo, luz dispersada y sombra de la Luna, sin duplicar el resto.

### 4.2 R3: luz dispersada en lugar de devolver el océano a su color de superficie
La propuesta 2 de la 3b planteaba integrar la dispersión y devolver el océano de la textura a su color de superficie, para no contar dos veces la atmósfera. Se hizo de la forma más barata:
- un término aditivo azulado sobre todo el lado diurno, más fuerte hacia el limbo;
- la neblina del limbo, más tenue y azulada;
- el océano de la textura, con el color medido en EPIC (como desde la 3b). Devolverlo a la superficie obligaría a regenerar la textura y a calibrar de nuevo el color sin una referencia de superficie.

La comparación con EPIC es visual, por el riesgo 2.

### 4.3 La sombra de la Luna usa la posición del Sol, no su dirección
Con la dirección del Sol desde el centro de la Tierra, su paralaje (8,8″) movía la sombra unos 16 km a la distancia de la Luna. Con el eje rasante del eclipse de 2026, eso eran ~0,7° de longitud a 65° N. El shader recibe la Luna y el Sol como esferas en su sitio, en radios terrestres. Lo comprueba el test del motor.

### 4.4 VRAM: la noche, la máscara y las normales de la Tierra, en 2k
Con el día en 8K (179 MB con sus mipmaps) y los demás mapas en 4K, la vista Tierra pasaba de 370 MB, por encima de los 300 de §5. Las luces nocturnas, la máscara del océano y las normales van en 2k (`earthMapsTexture`); las nubes, en 4K. Lo vigila el test del presupuesto, con la Tierra enfocada como peor caso. Medido: 214 MB.

### 4.5 Los lugares: altitud desconocida en dos, y Madrid en la Puerta del Sol
Coordenadas de fuentes oficiales:
- **IGN:** el Observatori Fabra (Nomenclátor), la Puerta del Sol (el punto del barrio de Sol, en la plaza) y Fraga.
- **IAC:** el Roque de los Muchachos y el Teide.
- **CAHA:** Calar Alto.
- **Parc Astronòmic Montsec:** el punto de su enlace al mapa, en Àger.

La altitud del Fabra es la de su estación del Servei Meteorològic de Catalunya. La del Montsec y la de la Puerta del Sol no las da su fuente: quedan en `null` para la fase 8, que es la que las usa (el horizonte del cielo).

### 4.6 Las vistas guiadas ponen su hora del día y pausan
Cada vista lleva el reloj a la hora solar media a la que su punto se ve de día (las luces, de noche), sin cambiar la fecha, y pausa la reproducción. Si no, a 1 hora por segundo la Tierra giraría 15° por segundo y la vista se perdería. Es la ecuación del tiempo sin corregir (unos minutos): basta para verlo.

### 4.7 El panel de la Tierra hace de `TourPlayerComponent`
Las vistas guiadas y la luz del Sol van en un mismo panel de la vista Tierra (`features/earth-panel`), no en dos componentes. Sus controles: la botonera de vistas (con `aria-pressed`), anterior y siguiente, «Recorrer las vistas» (cada 9 s, hasta la última) y el subtítulo escrito, que la sesión anuncia una vez. En escritorio va bajo la presentación, sin apartar el encuadre; en móvil, al pie del lienzo, compacto (las vistas en una fila que se desplaza). En móvil aún ocupa un tercio de la pantalla: queda para la prueba de Iván.

### 4.8 Las nubes derivan con el reloj de pared
Con el tiempo simulado, a 3 días por segundo darían vueltas a toda velocidad. Derivan con el reloj de pared, como la granulación del Sol: quietas con movimiento reducido y en las capturas.

## 5. Decisiones técnicas nuevas

### 5.1 Mapas de la Tierra con su propio nivel y su propio momento
Las nubes se cargan también en la vista general: son las que dan a la Tierra su brillo, y con ellas ya no se ve oscura. Las luces nocturnas, la máscara del océano y las normales, solo en primer plano. Mecanismo genérico (`BodyMap`), con su liberación al alejarse y al liberar la escena (test de qué se pide en cada caso).

### 5.2 La exposición de la Tierra, con su albedo geométrico
Con las nubes dibujadas, la Tierra se compensa con su albedo geométrico del catálogo (0,434, que las incluye). Hasta ahora se usaba el efectivo de su textura (≈ 0,08), que con nubes la sobreexponía.

### 5.3 `lookAtSurface` y `setSurfaceMarkers` en la API del motor
- `lookAtSurface` lleva la cámara sobre un punto de la superficie con la orientación real del cuerpo, fijando el zoom del encuadre: la distancia la impone el encuadre en cada frame.
- `setSurfaceMarkers` muestra los marcadores: puntos redondos con su borde (material propio con los chunks de profundidad), hijos de la malla de la Tierra, que giran con ella y se ocultan en la cara de atrás.

### 5.4 Las coordenadas de los observatorios, convertidas en el código
El IAC y el CAHA dan grados, minutos y segundos. `places.ts` los convierte con `dms()`, sin hacer la cuenta a mano.

## 6. Salida de los checks
```
npm run check (27-10)
ng lint: All files pass linting. · prettier --check: All matched files use Prettier code style!
Test Files 59 passed (59) · Tests 495 passed (495)
Cobertura de ephemeris/: 99,34 % de sentencias, 96,05 % de ramas
Initial total 298.23 kB (82.48 kB transferidos) · sin avisos de presupuesto
Chunk del visor (three): 679 kB en bruto (aviso a 900) · explorer-ui: 260 kB
✔ El JS inicial de las 17 páginas no lleva three, astronomy-engine, los stores ni los controles del visor
✔ Código propio en los chunks iniciales: 12.13 kB de 15.00
```
```
npm run e2e: 69 passed (4.0m)
(tras mover los estilos del panel: e2e/tierra.spec.ts y e2e/accesibilidad.spec.ts, 8 passed)
```

### 6.1 Mediciones (`node scripts/measure-system.mjs`, 27-10; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista Tierra a 1 h/s | alta (8K) | 59 / 59,8 | 1,03 ms | 6 | 39 472 | 214 MB |
| | media | 60 / 60 | 0,96 ms | 6 | 23 080 | 54 MB |
| | baja | 59 / 59,8 | 0,80 ms | 6 | 16 372 | 53 MB |
| Vista general a 3 días/s | alta | 60 / 60 | 1,36 ms | 21 | 175 854 | 35 MB |

Texturas de la vista Tierra en alto: día 8K 1,28 MB, nubes 4K 1,80 MB, noche 2k 0,06 MB, normales 2k 0,03 MB y máscara 2k 0,10 MB: ~3,3 MB, dentro de los 6 MB de §5.

## 7. Capturas
En `docs/informes/img/fase-5/` (modo de captura):
- `escritorio-tierra` y `movil-tierra`: la vista Tierra con su panel.
- `tierra-mediodia-utc` y `tierra-medianoche-utc`: el 21-06-2026 a las 12:00 y a las 00:00 UTC.
- `vista-tierra-completa`, `vista-pacifico`, `vista-himalaya`, `vista-luces` y `vista-espana` (con sus marcadores), y `movil-vista-espana`.
- `tierra-eclipse-2026`: el máximo del eclipse total del 12-08-2026.
- `tierra-epic-2016` y `tierra-epic-2016-comparada`: la geometría de la foto de EPIC y la foto al lado.
- `escritorio-sistema`: la vista general, con la Tierra y sus nubes.

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- Probar la vista Tierra en el móvil (FPS y VRAM, y el tamaño del panel), en `PENDIENTES.md`.
- Revisar los textos de las vistas guiadas (fase 9).
- La altitud del Montsec y de la Puerta del Sol (fase 8).

## 10. Propuestas de cambio al plan
Ninguna.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/explorar/tierra`: la Tierra con nubes, océanos y luces de noche en el lado oscuro.
2. En el panel, elegir «España»: la cámara va sobre España, se pausa a mediodía y aparecen los marcadores de los siete lugares. «Recorrer las vistas» las pasa solo.
3. Mover «Hora del día»: el día y la noche recorren la Tierra sin cambiar la fecha.
4. `/?cuerpo=tierra&fecha=2026-08-12T17:45:51Z`: la sombra de la Luna sobre el Atlántico norte.
5. Capturas y mediciones: `npm run build && node scripts/capture-earth.mjs docs/informes/img/fase-5 && node scripts/measure-system.mjs`.
