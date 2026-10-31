# Informe: Fase 6 (la Luna)

- **Rama:** `fase-6-luna`
- **Fecha:** 2026-10-30 · 2026-10-31
- **Estado:** revisado (`docs/revisiones/fase-6.md`, CAMBIOS NECESARIOS) y corregido; a la espera de la segunda revisión, porque había un Bloqueante

## Plan
La fase es grande: va por entregas, con este informe al día al final de cada una.

**6.a · Recursos y relieve (tarea 1)**
- `download-assets.mjs`: el color LROC en 8K (`lroc_color_poles_8k.tif`) y la elevación del LOLA (`ldem_16_uint.tif`, 16 px/°, medios metros con 10 km de desplazamiento) del CGI Moon Kit (NASA SVS 4720), con su SHA-256 en el manifiesto.
- `build-relief.mjs`, para la Luna:
  - la elevación, con sondas de alineación (sus puntos más alto y más bajo, junto a cráteres con nombre del Gazetteer de la IAU);
  - un mapa de normales derivado, con su exageración documentada y sondas de pendiente en las paredes de un cráter grande;
  - la elevación en 16 bits empaquetada en RG (D15), **sin pérdidas**, con la resolución vertical resultante.
- `build-textures.mjs`:
  - el color en 1k / 2k / 4k / 8k (la 8K, solo en el nivel alto);
  - las normales en 2k / 4k;
  - la elevación en 1k / 2k.

  Pesos frente a §5: ≤ 10 MB en alto y ≤ 3 MB en bajo.

**6.b · La malla y el material (tareas 2 y 3)**
- **Una esfera cúbica** (seis caras subdivididas y normalizadas), con la densidad de cada nivel de calidad. Sin el pellizco de los polos de `SphereGeometry`: la vista «Polo sur» lo pide.
- **Las coordenadas de textura, por píxel** a partir de la posición, con el truco de Tarini (dos juegos de longitud y el de derivada continua) para que no haya costura en el meridiano 180°.
- **El material lunar**, variante del común (`TLS_MOON`), como la Tierra:
  - desplazamiento de vértices con la elevación a escala física (exageración opcional y documentada);
  - normales del relieve;
  - Lommel–Seeliger (D29), que ya lleva.
- **La orientación y la libración:** la de `RotationAxis` ya se comprueba frente a `Libration` desde la fase 2. Aquí, además, en la escena (el punto subterrestre de la malla) y en capturas en dos fechas.

**6.c · La sombra de la Tierra (tarea 4) y la fase (tarea 7)**
- `ephemeris/`: la geometría de la sombra de la Tierra con la regla de Danjon (radio de la Tierra +1/85) y su achatamiento, que usa la NASA. Test frente a la ficha de la NASA del eclipse total del 3-3-2026 (radios de la umbra y la penumbra, distancia al eje y magnitud umbral; fixture con su URL).
- **El shader:** la fracción del disco del Sol que la Tierra deja ver desde cada punto (como la sombra de la Luna en la fase 5) y una luz rojiza ilustrativa en la umbra, documentada.
- **La fase:** la ficha de la Luna, la escena y el USNO, coherentes (tests con las fases del USNO y la iluminación de Horizons).

**6.d · Vistas, recorrido y panel (tareas 5 y 6)**
- `data/tours.ts`:
  - las vistas «Cara visible», «Cara oculta», «Polo sur» y «Luz rasante», cada una con la fecha más cercana que la ilumina (luna llena, luna nueva, el terminador sobre la región);
  - un recorrido por lugares con nombre del Gazetteer y la NASA, con subtítulos y fuentes y `reviewed: false`.
- **Un panel de la vista Luna** como el de la Tierra: «Reproducir», «Pausar», anterior, siguiente y «Saltar», con teclado. Con movimiento reducido, paso a paso y con cortes de cámara.

**6.e · VRAM con la Tierra y la Luna (tarea 8, C4) y cierre**
- Los mapas de alta resolución, solo del cuerpo enfocado o del que se ve grande. El planeta de una luna enfocada (la Tierra en la vista Luna) ya no pide su textura de máxima resolución.
- La 8K de la Tierra se libera al salir de su vista (test).
- Test del presupuesto con las dos vistas como peor caso.
- Capturas de los siete criterios (escritorio y móvil) y mediciones de peso, FPS y VRAM en los tres niveles.

Fuera de alcance, por el plan: KTX2 solo si la VRAM no cabe con WebP (necesitaría `toktx`, condición de parada).

## 1. Resumen
La Luna de cerca, con su relieve real y su luz:
- **Recursos:** el color LROC en 8K (solo en el nivel alto) y la elevación del LOLA del CGI Moon Kit de la NASA, con normales derivadas y la elevación en 16 bits sin pérdidas (D15).
- **La malla:** una esfera cúbica que se desplaza con esa elevación a escala física. Sin costuras ni en el meridiano 180° ni en los polos.
- **Los casquetes polares** (revisión de la fase 6): por encima de 76°, el relieve sale de los modelos polares del LOLA (240 m por píxel), sin el «sol de rayas» que dejaba el modelo equirrectangular junto al polo.
- **La sombra de la Tierra en los eclipses de Luna:** con la regla de Danjon de la NASA, comprobada con su catálogo, y la Luna enrojecida dentro de la umbra.
- **El panel de la vista Luna:**
  - la fase del día;
  - cuatro vistas (cara visible, cara oculta, polo sur y luz rasante), cada una en la fecha con su luz;
  - un recorrido por cinco lugares con nombre, con teclado y paso a paso con movimiento reducido.
- **C4:** las texturas del primer plano, solo para el cuerpo enfocado o el que se ve grande. En la vista Luna, la 8K de la Tierra se libera, y las dos vistas caben en la VRAM de §5, también durante el viaje de una a otra, con tests.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas: cara visible, cara oculta, polo sur, luz rasante, luna llena, cuarto creciente y un eclipse lunar total (Luna enrojecida, fecha de la NASA) | ✅ | En `docs/informes/img/fase-6/` (§7): `vista-cara-visible`, `vista-cara-oculta` y `luna-cara-oculta`, `vista-polo-sur` y `movil-vista-polo-sur`, `vista-luz-rasante` y `movil-vista-luz-rasante`, `luna-llena`, `luna-cuarto-creciente` y `luna-eclipse-2026` (el máximo del total del 3-3-2026, a las 11:33:37 UT, del catálogo de la NASA) |
| Peso, VRAM y FPS según §5 en los tres niveles | ✅ | §6: **texturas de la vista Luna**: 5,1 MiB en alto (de 10 MB), 2,0 en medio y 1,2 en bajo (de 3); **VRAM**: 265 / 102 / 61 MB (de 300 y 120); **FPS** (RTX 3060, 1 hora/s): 59,8 / 60 / 59,6 |
| Sin costuras visibles en el meridiano 180° ni en los polos | ✅ | `luna-cara-oculta` y `vista-cara-oculta` (el meridiano 180°, en el centro del disco), `vista-polo-sur`, `movil-vista-polo-sur` y `recorrido-shackleton` (el polo sur, en el centro; antes de la revisión, con el «sol de rayas»: las `antes-*`), y `cube-sphere.spec.ts` (las aristas de las seis caras, con las mismas coordenadas: 6n² + 2 puntos distintos). §4.4: los casquetes polares, con sus comprobaciones |
| Libración visible y coherente con `Libration` (test) | ✅ | `orientation.spec.ts` (desde la fase 2): el punto subterrestre de la orientación frente a `Libration`, a ≤ 0,005° en tres fechas (el criterio pide ±1°). `engine.spec.ts` (revisión de la fase 6): el punto de la malla de la escena que mira a la Tierra, a menos de 0,1° del de `Libration` en las dos fechas de las capturas. `luna-libracion-comparada`: +6,65° el 6-1-2026 y −6,60° el 21-11-2026 (los extremos de 2026 con la Luna gibosa), con Mare Crisium a distinta distancia del limbo |
| Recorrido usable con teclado y con movimiento reducido (paso a paso) | ✅ | `e2e/luna.spec.ts`: se reproduce, se salta y se pausa con el teclado; con movimiento reducido no avanza solo y el botón («Seguir el recorrido») da la parada siguiente. Tests unitarios del panel (`moon-panel.spec.ts`) |
| La VRAM de §5 también en el peor caso de las dos vistas, con test; la 8K de la Tierra se libera al salir de su vista (C4) | ✅ | `engine.spec.ts`, con los tamaños de los ficheros de verdad: en la vista Luna, la Tierra pide su 1k y suelta la 8K y sus mapas de cerca; las vistas Tierra y Luna caben en 300 MB (alto) y 120 MB (bajo); y, frame a frame, en el viaje de una a otra (como mucho 284 MB de la Tierra a la Luna y 278 de vuelta). Medido: 278 MB en la vista Tierra (con la Luna al fondo) y 265 en la vista Luna (con la Tierra al fondo, a 1k) |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 6.1 Relieve lunar | hecha | Color 1k–8k; normales 1k–4k; elevación en 16 bits en R y G, en 1k, sin pérdidas; normales de los casquetes polares en 1k–2k. Resolución vertical: 0,31 m (la del LOLA, 0,5 m). Sondas: el punto más alto, a 0,8° de Engel'gardt; el más bajo, a 1,1° de Antoniadi; las paredes de Copérnico, inclinadas hacia su centro; el relieve, alineado con el color; y Shackleton, un hoyo con las paredes hacia dentro en el casquete sur |
| 6.2 Material lunar | hecha | Desplazamiento a escala física (exageración 1, en la configuración visual) y normales. Esfera cúbica de 128/72/48 segmentos por cara. Coordenadas por píxel (Tarini) |
| 6.3 Orientación y libración | hecha | La de `RotationAxis` (desde la fase 2), con su test frente a `Libration`, el de la malla de la escena y las capturas |
| 6.4 Sombra de la Tierra | hecha | `earthShadow` (Danjon + achatamiento) frente al catálogo de la NASA; en el shader, la fracción del Sol visible y la luz rojiza de la umbra |
| 6.5 Vistas | hecha | Cara visible (luna llena), cara oculta (luna nueva), polo sur (sin cambiar la fecha) y luz rasante (el Sol a 4° sobre las tierras altas del sur) |
| 6.6 Recorrido | hecha | Base Tranquilidad, Copérnico, Tycho, Mare Orientale y Shackleton. Reproducir, pausar, anterior y siguiente (que hace de «saltar») y subtítulos |
| 6.7 Fase coherente | hecha | La fase del panel (`moonPhase`, la que usará la ficha) y la de la escena, frente al USNO (test del motor) |
| 6.8 VRAM (C4) | hecha | Ver los criterios |

## 4. Desviaciones del plan y motivo
1. **Las vistas y el recorrido cambian la fecha**, no solo la hora como en la Tierra. La luz de la Luna depende de su fase. La cara oculta solo se ve iluminada en luna nueva, y la cara visible entera, en luna llena. Cada vista lleva la fecha al instante más cercano con su luz, a menos de medio mes (`ephemeris/moon-light.ts`), y lo anuncia. Las paradas del recorrido llevan cada una la mañana lunar de su lugar, con el Sol a 15–20°. El polo sur y Shackleton no cambian la fecha: allí el Sol está siempre rasante.
2. **La ficha de la Luna (`/luna`) llega en la fase 9.** Hasta entonces, la fase del día la dice el panel de la vista Luna, con `moonPhase`, la función que usará la ficha. Lo que se prueba es que la escena, esa función y el USNO coinciden.
3. **KTX2 (D18; C4 pedía empezar por la 8K de la Tierra y los mapas de la Luna):** reevaluado y no hace falta. Con WebP, las dos vistas caben: 278 y 265 MB de 300 en alto (y 284 como mucho en el viaje entre las dos). KTX2 pesaría unas 4 veces más (fase 2) y necesitaría `toktx`, una herramienta externa (condición de parada). Queda para la fase 10 si el iPhone se queda corto de memoria.
4. **El polo, con casquetes polares propios** (revisión de la fase 6, hallazgo 1: era un Bloqueante). La primera versión pintaba el polo con rayas radiales, y `textureGrad` con la derivada de u por cos φ (que se queda: es lo correcto para el color) no bastaba. La causa era el dato: junto al polo, la elevación equirrectangular de 16 px/° salta hasta 190 m entre columnas vecinas separadas unos metros. Ahora, por encima de 76° de latitud, las normales salen de los **modelos polares del LOLA** (PDS, estereográfica de 75° al polo, 240 m por píxel), en un atlas de dos casquetes (`moon-normal-poles`: 2k en alto y medio, 893 m por píxel; 1k en bajo), mezclado con el mapa equirrectangular de 76° a 78°. Sus normales van en los ejes del plano, que no degeneran en el polo, y el shader las lleva al este–norte. El build comprueba la orientación de cada modelo (su elevación frente a la equirrectangular a 76–79°: correlación de 0,999 en el sur y 0,993 en el norte), que sus normales casan con las equirrectangulares donde se mezclan (0,92 y 0,87 en el sur; 0,87 y 0,83 en el norte, este y norte) y que Shackleton sale como un hoyo de 4 km con las paredes hacia dentro. El color y la elevación de los vértices no cambian: el color ya es la versión «poles» del CGI Moon Kit y, según la revisión, reproyectado solo tiene rayas leves; y los saltos de la elevación, con 21 km entre vértices, no se ven.
5. **La elevación, en 1K** (no en 4K u 8K; hasta la revisión, 2K en alto). Solo desplaza los vértices, que están a 0,7° en el ecuador en el nivel alto: la de 1K (0,35° por píxel, cada uno la media de su área) ya da dos muestras por vértice, y la de 2K pesaba 2,7 MiB y 8 MiB de VRAM más sin verse. El detalle fino lo dan las normales de 4K.
6. **Las normales, en 4K como mucho** (el plan pedía «a resolución completa»: los 5760 px del LOLA de 16 px/°). Unas normales de 8K costarían unos 128 MiB más de VRAM y la vista Luna pasaría de los 300 MB de §5. Los casquetes polares dan el detalle donde más falta hacía.
7. **«Saltar»** es «Parada siguiente»: salta a la siguiente parada y para el recorrido.
8. **Las vistas cercanas, algo más lejos.** A 1,3 radios, la textura de 8K se ampliaba unas 3,5 veces en Copérnico y Tycho. Ahora van a 1,6.
9. **El panel de la Luna, en el móvil, encima de la fila de lunas** (como el de la Tierra) y oculto con el índice y en la vista limpia. Tapaba la fila de lunas de las fichas («Luna»), que se superponía al botón del recorrido.

## 5. Decisiones técnicas nuevas
- **La esfera cúbica (`scene/cube-sphere.ts`)** solo con la Luna enfocada; si no, la esfera de siempre, con el mismo material. Se crea al enfocar la Luna y se libera al dejar de enfocarla, y cuenta en la VRAM mientras existe. Sin normales: el material saca la normal de la posición (revisión de la fase 6).
- **Los casquetes polares de la Luna:** un atlas de dos estereográficas polares (el sur a la izquierda y el norte a la derecha), con las normales en los ejes del plano (`scripts/lola-polar.mjs`); el shader lo mezcla de 76° a 78°.
- **Las texturas del primer plano (2k y más) esperan a que acabe el viaje de cámara** para subir, como ya hacía la 8K: el cuerpo que se deja conserva su primer plano mientras se ve grande, y con el del nuevo encima se pasaba de los 300 MB de §5 (337 MB de la Tierra a la Luna). «Se ve grande» se calcula con la proyección del frame que se acaba de pintar (antes, con la del anterior: tras un corte de vista con el motor en reposo, la Luna conservaba su primer plano en la vista general).
- **Las coordenadas de textura por píxel** con el truco de Tarini, y el marco este–norte del relieve, también por píxel, con el polo del cuerpo.
- **Los mapas de datos,** decodificados sin gestión de color (`colorSpaceConversion: 'none'`). La elevación, sin mipmaps: las medias de los mipmaps redondean cada byte por su lado.
- **La sombra (`tlsShadow`), común** a la Tierra (la Luna la tapa) y a la Luna (la Tierra la tapa).
- **La luz de la umbra** (configuración visual, `moon.umbraLight`), ilustrativa: el 18 % de la del Sol, cobriza, mucho más que la real; con la real, la Luna eclipsada saldría negra con la exposición de su primer plano. En el eje de la umbra queda el 35 % (`axis`, también en la configuración visual).
- **C4:** el umbral de «se ve grande», 160 px de radio en pantalla para entrar y 120 para salir (histéresis).
- **El intervalo de la elevación empaquetada** (`MOON_ELEVATION_RANGE_M`) lo genera `build-textures.mjs` en `texture-files.ts`: una sola fuente para el script y el shader.

## 6. Salida de los checks
```
npm run check (tras la revisión, con el código final)
- lint y Prettier: limpios
- 555 tests (63 ficheros); cobertura de ephemeris/: 99,47 % de sentencias y 95,48 % de ramas
- build sin avisos de presupuesto: JS inicial 298,66 kB (aviso a 320); three 692,71 kB (aviso a 900);
  interfaz diferida 284,39 kB
- JS inicial sin three ni astronomy-engine; código propio, 12,13 kB de 15
```
- **e2e:**
  - en local, con dos trabajadores, los de la fase: Luna, accesibilidad, vistas, Tierra y móvil, 23 de 23 (otra vez tras la revisión, con el código final);
  - la batería completa, en el CI de GitHub al subir la rama.
- **Mediciones** (RTX 3060, `node scripts/measure-system.mjs`, modo de captura):

| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista Luna a 1 h/s | alto | 59 / 59,8 | 1,01 ms | 8 | 250 674 | 265 MB |
| | medio | 60 / 60 | 1,09 ms | 8 | 89 106 | 102 MB |
| | bajo | 59 / 59,6 | 0,86 ms | 8 | 45 234 | 61 MB |
| Vista Tierra a 1 h/s | alto | 60 / 60 | 0,99 ms | 6 | 39 472 | 278 MB |

- **Texturas de la vista Luna:**

| Nivel | Color | Normales | Elevación | Casquetes polares | Total |
|---|---|---|---|---|---|
| Alto | 8K, 3425 KiB | 4K, 842 KiB | 1K, 742 KiB | 2K, 214 KiB | 5,1 MiB (de 10 MB) |
| Medio | 4K, 849 KiB | 2K, 201 KiB | 1K, 742 KiB | 2K, 214 KiB | 2,0 MiB |
| Bajo | 2K, 226 KiB | 2K, 201 KiB | 1K, 742 KiB | 1K, 55 KiB | 1,2 MiB (de 3 MB) |

- **La sombra de la Tierra frente al catálogo de la NASA** (`eclipse.spec.ts`):

| Eclipse | Máximo | Gamma | Magnitud umbral | Magnitud penumbral |
|---|---|---|---|---|
| Total del 3-3-2026 | +4 s | −0,3766 (NASA −0,3765) | 1,1511 (1,1507) | 2,1841 (2,1838) |
| Total del 7-9-2025 | −1 s | −0,2750 (−0,2752) | 1,3629 (1,3619) | 2,3449 (2,3440) |
| Parcial del 28-8-2026 | −1 s | 0,4966 (0,4964) | 0,9301 (0,9299) | 1,9646 (1,9645) |

  La duración de las fases penumbral, parcial y total coincide a menos de 0,6 min. En el máximo del 3-3-2026, los radios de la umbra y la penumbra (0,6985° y 1,2361°) son los de su ficha (0,6983° y 1,2361°).

## 7. Capturas
En `docs/informes/img/fase-6/` (modo de captura; la escena, el 24-10-2026 si no se dice otra fecha):
- `escritorio-luna` y `movil-luna`: la vista Luna.
- `vista-cara-visible`, `vista-cara-oculta`, `vista-polo-sur` y `vista-luz-rasante` (escritorio), y `movil-vista-luz-rasante` y `movil-vista-polo-sur`: las vistas, con el panel.
- `recorrido-copernico` y `recorrido-shackleton`: dos paradas del recorrido.
- `antes-vista-polo-sur`, `antes-movil-vista-polo-sur`, `antes-recorrido-shackleton` y `antes-luna-polo-sur`: el polo antes de los casquetes polares (con el «sol de rayas»), para compararlo con las de ahora.
- Sin interfaz:
  - `luna-llena` y `luna-cuarto-creciente`: desde la Tierra, el 24 y el 17-11-2026;
  - `luna-cara-oculta`: en la luna nueva del 9-11-2026;
  - `luna-polo-sur`;
  - `luna-eclipse-2026`: el máximo del 3-3-2026;
  - `luna-libracion-comparada`: este y oeste.

## 8. Dependencias añadidas
Ninguna. Los datos nuevos son el color y la elevación del CGI Moon Kit, los modelos polares del LOLA (PDS de la NASA), el Gazetteer y el catálogo de eclipses de la NASA (`FUENTES.md`).

## 9. Pendientes y `TODO(ivan)`
- Los textos de las vistas y del recorrido (`data/tours.ts`, `reviewed: false`): en la fase 9.
- Probar la vista Luna en el móvil: FPS y el tamaño del panel, que, como el de la Tierra (C7), ocupa buena parte de la pantalla.

## 10. Propuestas de cambio al plan
1. ~~**Casquetes polares propios**~~: hechos en la revisión de la fase 6 (§4.4), para las normales.
2. **La luz de la umbra** es ilustrativa. Si se prefiere más realista (la Luna eclipsada mucho más oscura), es un valor de la configuración visual.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/explorar/luna`. El panel dice la fase del día.
2. «Cara visible» y «Cara oculta» llevan la fecha a la luna llena y a la luna nueva más cercanas. «Polo sur» y «Luz rasante» enseñan el relieve con el Sol bajo.
3. «Recorrer la Luna» pasa por los cinco lugares cada 12 s. «Parada siguiente» salta. Con movimiento reducido (en el sistema), el recorrido va paso a paso: «Seguir el recorrido».
4. Los casquetes polares: «Polo sur» o la parada de Shackleton (5 de 5). Las capturas `antes-*` (§7) enseñan cómo era el polo antes.
5. El eclipse: `/?cuerpo=luna&fecha=2026-03-03T11:33Z` (la Luna, enrojecida).
6. Capturas y mediciones: `npm run build && node scripts/capture-moon.mjs <carpeta>` y `node scripts/measure-system.mjs`. El atlas polar, solo, con sus comprobaciones y un sombreado de prueba: `node scripts/lola-polar.mjs <carpeta>`.

## Respuesta a la revisión
Revisión: `docs/revisiones/fase-6.md` (CAMBIOS NECESARIOS: 1 Bloqueante, 2 Importantes, 8 Menores y 5 Sugerencias). Todo corregido en la rama, sin cambiar el alcance ni los criterios. Como había un Bloqueante, va a una segunda revisión.

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 1 | Bloqueante | **Casquetes polares con los modelos polares del LOLA** (la «opción buena» de la revisión, para las normales; §4.4): atlas `moon-normal-poles`, mezclado en el shader de 76° a 78°, con las comprobaciones del build (orientación de cada modelo, acuerdo con las normales equirrectangulares y Shackleton). Las capturas del polo, repetidas, junto a las de antes (`antes-*`). Comprobado también en el norte y en el anillo de la mezcla, con el mismo encuadre con el atlas y sin él: el sombreado coincide y desaparece el abanico. Peso: 214 KiB más en alto; VRAM: 10,7 MiB más. El color se queda como estaba: la revisión vio que, reproyectado, solo tiene rayas leves. |
| 2 | Importante | `nearestMoonPhase` busca desde 16 días antes la primera fase y la siguiente, y se queda con la más cercana. Tests: de 12 h antes a 12 h después de las 49 fases de 2026 del USNO, todas al minuto; una hora después de la llena del 26-10-2026 da esa llena; dos pulsaciones seguidas no cambian de mes; y «Cara oculta» desde el 14-10 da la nueva del 10-10 las dos veces. |
| 3 | Importante | Una clase común, `view-panel`, para los paneles de la Tierra y de la Luna: `explorer-ui.css` vuelve a caber en 4 kB y `npm run check` no da avisos (§6). |
| 4 | Menor | **El viaje Tierra ↔ Luna, con test**: sin movimiento reducido, frame a frame y con la subida de texturas. Con la regla de antes, llegaba a 337 MB a mitad del viaje de la Tierra a la Luna. Ahora las texturas del primer plano (2k y más) esperan al final del viaje, como la 8K, y no pasa de 284 MB (278 de vuelta). Test de la histéresis (160 y 120 px). Y un fallo encontrado al escribir los tests: «se ve grande» usaba la proyección del frame anterior. Tras un corte de vista con el motor en reposo (movimiento reducido), la Luna conservaba su 8K y sus mapas en la vista general. Ahora se calcula al proyectar los cuerpos del frame, con test. |
| 5 | Menor | Sin `atan(0, 0)`: en el polo, u = 0 en el vertex shader y en `tlsMoonUv`. |
| 6 | Menor | Test en `data/body-data.spec.ts`: `SUN_RADIUS_KM` y `MOON_RADIUS_KM` son los del catálogo. El comentario de `constants.ts` lo cita. |
| 7 | Menor | Sin la cifra sin fuente. El 0,35 del eje de la umbra pasa a `VISUAL_CONFIG.moon.umbraLight.axis` (`uUmbraAxis`), con su motivo. |
| 8 | Menor | Desviación añadida (§4.6): las normales, en 4K como mucho; en 8K costarían unos 128 MiB más de VRAM. |
| 9 | Menor | `PENDIENTES.md`: probar la vista Luna en tu móvil y decidir sobre la luz de la umbra (propuesta 2). Cerrados `toktx` (no hace falta: 278, 265 y 284 MB de 300) y los casquetes polares (hechos). |
| 10 | Menor | Con movimiento reducido, el botón grande dice «Seguir el recorrido» y, en la última parada, «Volver a empezar», que es lo que hace. `ESTILO.md`, el e2e y los tests, al día. |
| 11 | Menor | La esfera cúbica se crea al enfocar la Luna y se libera al dejar de enfocarla, y cuenta en la VRAM mientras existe. Sin el array de normales: el material saca la normal de la posición (1,2 MB menos en alto). Test. |
| 12 | Sugerencia | La elevación, en 1K también en alto: 2,7 MiB menos de descarga y 6 MiB menos de VRAM. La de 2K ya no se genera. |
| 13 | Sugerencia | `BodyMap`, tipado: los nombres de los uniformes y el nivel de cada mapa son uniones que comprueba el compilador, sin `as unknown as`. |
| 14 | Sugerencia | `.moon__label`, quitada. |
| 15 | Sugerencia | Test del motor: el punto de la malla que mira a la Tierra, frente a `Libration`, a menos de 0,1° en las dos fechas de las capturas. |
| 16 | Sugerencia | El recorrido se para al abrir el índice, que tapa el panel (test). |

Después de los cambios: `npm run check` en verde (555 tests y sin avisos de presupuesto); e2e de la fase, 23 de 23; mediciones y capturas repetidas con el build final (§6 y §7).
