# Informe: Fase 6 (la Luna)

- **Rama:** `fase-6-luna`
- **Fecha:** 2026-10-30 · 2026-10-31
- **Estado:** listo para revisión (las cinco entregas hechas)

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
- **La sombra de la Tierra en los eclipses de Luna:** con la regla de Danjon de la NASA, comprobada con su catálogo, y la Luna enrojecida dentro de la umbra.
- **El panel de la vista Luna:**
  - la fase del día;
  - cuatro vistas (cara visible, cara oculta, polo sur y luz rasante), cada una en la fecha con su luz;
  - un recorrido por cinco lugares con nombre, con teclado y paso a paso con movimiento reducido.
- **C4:** las texturas del primer plano, solo para el cuerpo enfocado o el que se ve grande. En la vista Luna, la 8K de la Tierra se libera, y las dos vistas caben en la VRAM de §5, con test.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas: cara visible, cara oculta, polo sur, luz rasante, luna llena, cuarto creciente y un eclipse lunar total (Luna enrojecida, fecha de la NASA) | ✅ | En `docs/informes/img/fase-6/` (§7): `vista-cara-visible`, `vista-cara-oculta` y `luna-cara-oculta`, `vista-polo-sur` y `movil-vista-polo-sur`, `vista-luz-rasante` y `movil-vista-luz-rasante`, `luna-llena`, `luna-cuarto-creciente` y `luna-eclipse-2026` (el máximo del total del 3-3-2026, a las 11:33:37 UT, del catálogo de la NASA) |
| Peso, VRAM y FPS según §5 en los tres niveles | ✅ | §6: **texturas de la vista Luna**: 6,9 MiB en alto (de 10 MB), 1,8 en medio y 1,1 en bajo (de 3); **VRAM**: 262 / 92 / 59 MB (de 300 y 120); **FPS** (RTX 3060, 1 hora/s): 59,8 / 59,6 / 59,8 |
| Sin costuras visibles en el meridiano 180° ni en los polos | ✅ | `luna-cara-oculta` y `vista-cara-oculta` (el meridiano 180°, en el centro del disco), `vista-polo-sur` y `recorrido-shackleton` (el polo sur, en el centro), y `cube-sphere.spec.ts` (las aristas de las seis caras, con las mismas coordenadas: 6n² + 2 puntos distintos). §4.4: el polo salía con un sol de rayas y se corrigió |
| Libración visible y coherente con `Libration` (test) | ✅ | `orientation.spec.ts` (desde la fase 2): el punto subterrestre de la orientación de la escena frente a `Libration`, a ≤ 0,005° en tres fechas (el criterio pide ±1°). `luna-libracion-comparada`: +6,65° el 6-1-2026 y −6,60° el 21-11-2026 (los extremos de 2026 con la Luna gibosa), con Mare Crisium a distinta distancia del limbo |
| Recorrido usable con teclado y con movimiento reducido (paso a paso) | ✅ | `e2e/luna.spec.ts`: se reproduce, se salta y se pausa con el teclado; con movimiento reducido no avanza solo y el botón da la parada siguiente. Tests unitarios del panel (`moon-panel.spec.ts`) |
| La VRAM de §5 también en el peor caso de las dos vistas, con test; la 8K de la Tierra se libera al salir de su vista (C4) | ✅ | `engine.spec.ts`, con los tamaños de los ficheros de verdad: en la vista Luna, la Tierra pide su 1k y suelta la 8K y sus mapas de cerca; y las vistas Tierra y Luna caben en 300 MB (alto) y 120 MB (bajo). Medido: 278 MB en la vista Tierra (con la Luna al fondo) y 262 en la vista Luna (con la Tierra al fondo, a 1k) |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 6.1 Relieve lunar | hecha | Color 1k–8k; normales 1k–4k; elevación en 16 bits en R y G, 1k–2k, sin pérdidas. Resolución vertical: 0,31 m (la del LOLA, 0,5 m). Sondas: el punto más alto, a 0,8° de Engel'gardt; el más bajo, a 1,1° de Antoniadi; las paredes de Copérnico, inclinadas hacia su centro; y el relieve, alineado con el color |
| 6.2 Material lunar | hecha | Desplazamiento a escala física (exageración 1, en la configuración visual) y normales. Esfera cúbica de 128/72/48 segmentos por cara. Coordenadas por píxel (Tarini) |
| 6.3 Orientación y libración | hecha | La de `RotationAxis` (desde la fase 2), con su test frente a `Libration` y las capturas |
| 6.4 Sombra de la Tierra | hecha | `earthShadow` (Danjon + achatamiento) frente al catálogo de la NASA; en el shader, la fracción del Sol visible y la luz rojiza de la umbra |
| 6.5 Vistas | hecha | Cara visible (luna llena), cara oculta (luna nueva), polo sur (sin cambiar la fecha) y luz rasante (el Sol a 4° sobre las tierras altas del sur) |
| 6.6 Recorrido | hecha | Base Tranquilidad, Copérnico, Tycho, Mare Orientale y Shackleton. Reproducir, pausar, anterior y siguiente (que hace de «saltar») y subtítulos |
| 6.7 Fase coherente | hecha | La fase del panel (`moonPhase`, la que usará la ficha) y la de la escena, frente al USNO (test del motor) |
| 6.8 VRAM (C4) | hecha | Ver los criterios |

## 4. Desviaciones del plan y motivo
1. **Las vistas y el recorrido cambian la fecha**, no solo la hora como en la Tierra. La luz de la Luna depende de su fase. La cara oculta solo se ve iluminada en luna nueva, y la cara visible entera, en luna llena. Cada vista lleva la fecha al instante más cercano con su luz, a menos de medio mes (`ephemeris/moon-light.ts`), y lo anuncia. Las paradas del recorrido llevan cada una la mañana lunar de su lugar, con el Sol a 15–20°. El polo sur y Shackleton no cambian la fecha: allí el Sol está siempre rasante.
2. **La ficha de la Luna (`/luna`) llega en la fase 9.** Hasta entonces, la fase del día la dice el panel de la vista Luna, con `moonPhase`, la función que usará la ficha. Lo que se prueba es que la escena, esa función y el USNO coinciden.
3. **KTX2 (D18; C4 pedía empezar por la 8K de la Tierra y los mapas de la Luna):** reevaluado y no hace falta. Con WebP, las dos vistas caben: 278 y 262 MB de 300 en alto. KTX2 pesaría unas 4 veces más (fase 2) y necesitaría `toktx`, una herramienta externa (condición de parada). Queda para la fase 10 si el iPhone se queda corto de memoria.
4. **El polo, sin el «sol de rayas».** La primera versión lo pintaba con rayas radiales. Dos causas:
   - cerca del polo, la u equirrectangular cambia mucho de un píxel a otro, y el mipmap que se elegía por esa derivada difuminaba en latitud;
   - las normales de los dos últimos grados eran solo radiales, porque el mapa de normales se calculaba con cos φ ≥ 0,02.

   El material lunar muestrea con `textureGrad` y la derivada de u por cos φ, y el mapa de normales de la Luna usa la distancia este–oeste real. Queda un único píxel de ruido en el polo exacto. Unas texturas propias de los casquetes polares, en proyección azimutal, lo arreglarían del todo (§10).
5. **La elevación, en 2K** (no en 4K u 8K). Solo desplaza los vértices: unos 512 en el ecuador en el nivel alto. En WebP sin pérdidas pesa 2,7 MiB. El detalle fino lo dan las normales de 4K.
6. **«Saltar»** es «Parada siguiente»: salta a la siguiente parada y para el recorrido.
7. **Las vistas cercanas, algo más lejos.** A 1,3 radios, la textura de 8K se ampliaba unas 3,5 veces en Copérnico y Tycho. Ahora van a 1,6.
8. **El panel de la Luna, en el móvil, encima de la fila de lunas** (como el de la Tierra) y oculto con el índice y en la vista limpia. Tapaba la fila de lunas de las fichas («Luna»), que se superponía al botón del recorrido.

## 5. Decisiones técnicas nuevas
- **La esfera cúbica (`scene/cube-sphere.ts`)** solo con la Luna enfocada; si no, la esfera de siempre, con el mismo material.
- **Las coordenadas de textura por píxel** con el truco de Tarini, y el marco este–norte del relieve, también por píxel, con el polo del cuerpo.
- **Los mapas de datos,** decodificados sin gestión de color (`colorSpaceConversion: 'none'`). La elevación, sin mipmaps: las medias de los mipmaps redondean cada byte por su lado.
- **La sombra (`tlsShadow`), común** a la Tierra (la Luna la tapa) y a la Luna (la Tierra la tapa).
- **La luz de la umbra** (configuración visual, `moon.umbraLight`), ilustrativa: el 18 % de la del Sol, cobriza. La real ronda una diezmilésima; con ella, la Luna eclipsada saldría negra con la exposición de su primer plano.
- **C4:** el umbral de «se ve grande», 160 px de radio en pantalla para entrar y 120 para salir (histéresis).
- **El intervalo de la elevación empaquetada** (`MOON_ELEVATION_RANGE_M`) lo genera `build-textures.mjs` en `texture-files.ts`: una sola fuente para el script y el shader.

## 6. Salida de los checks
```
npm run check
- lint y Prettier: limpios
- 546 tests (63 ficheros); cobertura de ephemeris/: 99,47 % de sentencias y 95,8 % de ramas
- build sin avisos de presupuesto: JS inicial 298,66 kB (aviso a 320); three 689,53 kB (aviso a 900);
  interfaz diferida 284,39 kB
- JS inicial sin three ni astronomy-engine; código propio, 12,13 kB de 15
```
- **e2e:**
  - en local, con dos trabajadores, los de la fase: Luna, accesibilidad, vistas, Tierra y móvil, 23 de 23;
  - la batería completa, en el CI de GitHub al subir la rama.
- **Mediciones** (RTX 3060, `node scripts/measure-system.mjs`, modo de captura):

| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista Luna a 1 h/s | alto | 59 / 59,8 | 1,08 ms | 8 | 250 674 | 262 MB |
| | medio | 59 / 59,6 | 1,09 ms | 8 | 89 106 | 92 MB |
| | bajo | 59 / 59,8 | 1,07 ms | 8 | 45 234 | 59 MB |
| Vista Tierra a 1 h/s | alto | 59 / 59,8 | 1,14 ms | 6 | 39 472 | 278 MB |

- **Texturas de la vista Luna:**

| Nivel | Color | Normales | Elevación | Total |
|---|---|---|---|---|
| Alto | 8K, 3425 KiB | 4K, 842 KiB | 2K, 2782 KiB | 6,9 MiB (de 10 MB) |
| Medio | 4K, 849 KiB | 2K, 201 KiB | 1K, 742 KiB | 1,8 MiB |
| Bajo | 2K, 226 KiB | 2K, 201 KiB | 1K, 742 KiB | 1,1 MiB (de 3 MB) |

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
- Sin interfaz:
  - `luna-llena` y `luna-cuarto-creciente`: desde la Tierra, el 24 y el 17-11-2026;
  - `luna-cara-oculta`: en la luna nueva del 9-11-2026;
  - `luna-polo-sur`;
  - `luna-eclipse-2026`: el máximo del 3-3-2026;
  - `luna-libracion-comparada`: este y oeste.

## 8. Dependencias añadidas
Ninguna. Los datos nuevos son el color y la elevación del CGI Moon Kit, el Gazetteer y el catálogo de eclipses de la NASA (`FUENTES.md`).

## 9. Pendientes y `TODO(ivan)`
- Los textos de las vistas y del recorrido (`data/tours.ts`, `reviewed: false`): en la fase 9.
- Probar la vista Luna en el móvil: FPS y el tamaño del panel, que, como el de la Tierra (C7), ocupa buena parte de la pantalla.

## 10. Propuestas de cambio al plan
1. **Casquetes polares propios** (fase 10, opcional): las regiones de más de 80° en proyección azimutal, para el color y las normales, mezcladas en el shader. Quitarían el último píxel de ruido del polo y darían el detalle de los datos polares del LOLA. Unos 2 MB más de VRAM en alto.
2. **La luz de la umbra** es ilustrativa. Si se prefiere más realista (la Luna eclipsada mucho más oscura), es un valor de la configuración visual.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/explorar/luna`. El panel dice la fase del día.
2. «Cara visible» y «Cara oculta» llevan la fecha a la luna llena y a la luna nueva más cercanas. «Polo sur» y «Luz rasante» enseñan el relieve con el Sol bajo.
3. «Recorrer la Luna» pasa por los cinco lugares cada 12 s. «Parada siguiente» salta. Con movimiento reducido (en el sistema), el recorrido va paso a paso.
4. El eclipse: `/?cuerpo=luna&fecha=2026-03-03T11:33Z` (la Luna, enrojecida).
5. Capturas y mediciones: `npm run build && node scripts/capture-moon.mjs <carpeta>` y `node scripts/measure-system.mjs`.
