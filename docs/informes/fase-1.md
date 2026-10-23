# Informe: Fase 1 (Efemérides, catálogo y datos)

- **Rama:** `fase-1-efemerides`
- **Fecha:** 2026-10-23
- **Estado:** listo para revisión (modo autónomo por bloques, autorizado por Iván)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo. Lo que cambie durante la ejecución se explica en §4.

### Entregas
| Entrega | Contenido |
|---|---|
| 1.a | `astronomy-engine`; `ephemeris/coordinates.ts` (EQJ→ECL, ECL→Three, orientación de la Tierra, planos de referencia de las lunas); `ephemeris/ephemeris.ts` (Sol y planetas, Luna geocéntrica, rotación de la Tierra, punto subsolar, fase lunar en español, distancias); rango de fechas 1900–2100; fixtures de Horizons y del USNO con su consulta; cobertura con `@vitest/coverage-v8`. |
| 1.b | `ephemeris/moons.ts` (galileanas con `JupiterMoons`; las otras 16 con elementos medios y Kepler con precesión), `data/moon-elements.ts`, tabla de precisión de las 21 lunas; `ephemeris/scale.ts` y `ephemeris/orbits.ts`. |
| 1.c | `scripts/build-stars.mjs` (HYG v4.1 → `public/data/stars.bin` + licencia CC BY-SA 4.0), decodificador y test de integridad; `data/places.ts` (Fraga y Lleida, IGN). |
| 1.d | `data/body.model.ts`, `data/sources.ts`, índice ligero y catálogo completo de cuerpos con datos físicos con fuente y textos (`reviewed: false`); rutas de planetas desde el catálogo; `FUENTES.md`. |
| 1.e | `npm run check`, informe con evidencias, revisión automática, correcciones, fusión a `main` (autorizada por Iván en las instrucciones del modo autónomo si no quedan bloqueantes) y `DIARIO.md`. |

### Archivos
- Nuevos: `src/app/ephemeris/{time,coordinates,ephemeris,moons,scale,orbits,stars}.ts` (+ tests), `src/app/ephemeris/fixtures/*.json`, `src/app/data/{body.model,sources,body-index,bodies,moon-elements,places}.ts` (+ tests), `scripts/{fetch-horizons-fixtures,fit-moon-elements,build-stars}.mjs` (los fixtures del USNO acabaron en `fetch-horizons-fixtures.mjs`; durante la fase se añadieron `build-body-data`, `build-body-texts` y `check-initial-bundle`), `public/data/stars.bin` + licencia, `docs/informes/fase-1.md`.
- Tocados: `package.json`, `angular.json` (cobertura), `tsconfig.json` (JSON en los tests), `src/app/app.routes*.ts` y `pages/planets-index` (catálogo nuevo), `docs/FUENTES.md`, `docs/PENDIENTES.md`, `.gitignore` (`assets-src/`).

### Dependencias (todas de la lista cerrada)
- Producción: `astronomy-engine` `^2.1.19` (MIT).
- Desarrollo: `@vitest/coverage-v8` (misma versión que `vitest`, 5.0.5).

### Recursos que se descargan
| Recurso | Licencia | Uso |
|---|---|---|
| NASA/JPL Horizons API | Datos públicos de NASA/JPL | Fixtures de posiciones (y ajuste de elementos medios, ver riesgos) |
| JPL SSD, elementos medios y parámetros físicos de satélites | Datos públicos de NASA/JPL | Plano de referencia de cada luna, datos físicos |
| USNO, API de fases lunares | Dominio público (EE. UU.) | Fixtures de fases |
| HYG v4.1, fijado por commit | CC BY-SA 4.0 | Estrellas (el derivado mantiene la licencia) |
| NASA NSSDC, fichas de planetas, Sol y Luna | Material de la NASA | Datos físicos |
| NASA Science, páginas de cada cuerpo | Material de la NASA | Fuente de los textos |
| IGN, API OGC «Núcleos de población» | CC BY 4.0 | Coordenadas y altitud de Fraga y Lleida |

### Skills
- `threejs-spatial-data` solo como referencia de precisión float64/float32 para la API de escala (la fase no toca `three`).

### Riesgos y dudas
1. **La tabla de elementos medios del JPL no sirve para fechar posiciones.** Comprobado antes de empezar: el propio JPL avisa de que *«These mean orbital parameters are not intended for ephemeris computation»*; los periodos de Fobos, Deimos, Tritón y Proteo traen 4–5 cifras (deriva de vueltas enteras en 26 años) y la tabla no reproduce las posiciones de Horizons en la fecha de hoy. _Corrección tras la revisión: la medición previa usaba para Urano el polo norte IAU en vez del de su rotación (§4.5.4). Medido de nuevo, en J2000 solo fallan las lunas de Saturno (de 5,5° a 157°); las de Urano casi aciertan en J2000 (0–1,1°), las de Neptuno se quedan a 4,6° (Tritón) y 15,9° (Proteo), y todas derivan decenas de grados en pocos años por los periodos y las precesiones redondeados (tabla de §4.1)._ **Plan:** ajustar por mínimos cuadrados elipses con precesión (exactamente la definición de «elementos medios» del JPL) a las efemérides del JPL vía Horizons, con un script reproducible, y guardarlas en `data/moon-elements.ts` con la URL, el plano de referencia (polo de Laplace de la tabla del JPL) y la época de cada fila. Es una desviación de la letra de la tarea 4 («copiados de la tabla»), no del alcance ni de D11 (elementos medios del JPL + Kepler en el navegador, sin caducidad); se documenta en §4 con las cifras.
2. **Mimas** tiene una libración de unos ±44° en longitud (resonancia con Tetis, periodo de ~70 años) que ninguna elipse con precesión recoge. Si no cumple el objetivo, se documenta con causa y propuesta.
3. **Bundle inicial** (272 de 300 kB): las rutas solo importarán un índice ligero de cuerpos (ids y nombres); los datos y textos completos quedan fuera del bundle inicial. `astronomy-engine` no lo importa ningún código de la app en esta fase.
4. **Catálogo de 30 cuerpos, no 29:** Sol + 8 planetas + Luna + 20 lunas suman 30 (el «29» del plan cuenta 8 planetas + 21 lunas). Se propone corregir el texto del plan.
5. **Textos:** cada resumen y curiosidad se redacta a partir de una página de la NASA que lo respalda, con la cita en inglés guardada para la revisión de Iván.

### Estado de las entregas (se actualiza al cerrar cada una)
- 1.a ✅ coordenadas, tiempo, efemérides, fixtures y cobertura.
- 1.b ✅ lunas (galileanas + 16 con elementos medios ajustados), escala y órbitas.
- 1.c ✅ estrellas HYG y lugares del IGN.
- 1.d ✅ catálogo de 30 cuerpos: modelo, índice ligero, datos físicos con fuente y 120 textos con citas verificadas.
- 1.e ✅ check completo e informe; revisión automática a continuación.

---

## 1. Resumen
El «cerebro» astronómico está hecho y medido frente a fuentes oficiales, en TypeScript puro (`src/app/ephemeris/`) y sin entrar en el bundle inicial. Calcula posiciones del Sol, los 8 planetas, la Luna y 20 lunas más para cualquier fecha de 1900–2100, la orientación de la Tierra, el punto subsolar, la fase lunar en español, las escalas de la escena y las órbitas. Todas las cifras quedan muy por debajo de los objetivos de §5: planetas a ≤ 0,008° de Horizons, Luna a ≤ 0,02°, galileanas a ≤ 0,06° y las otras 16 lunas a ≤ 0,36° en todo el rango. Para estas 16, los elementos medios se han ajustado a las efemérides del JPL porque la tabla publicada no sirve para fechar posiciones (§4.1). Además hay un catálogo de **30 cuerpos** con datos físicos y orbitales con fuente, 120 textos en español con su cita de la NASA verificada, 8920 estrellas HYG y las coordenadas del IGN de Fraga y Lleida.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Todos los tests pasan; cobertura de `ephemeris/` ≥ 90 % | ✅ | `npm run check` tras `rm -rf node_modules dist .angular && npm ci`, código de salida 0. 141/141 tests en 16 ficheros (142 antes de la revisión, que pidió quitar una prueba que solo leía el fixture). Cobertura de `ephemeris/`: **98,9 % sentencias, 92,3 % ramas, 100 % funciones, 100 % líneas**. El umbral del 90 % está en `angular.json` (`coverageThresholds`), así que `npm test` falla si baja. Salida en §6. |
| Tabla de **error medido** por cuerpo frente a Horizons, incluidas las 21 lunas. Las que superen el objetivo, con causa y propuesta | ✅ | Tabla de abajo, con los 8 planetas, la Luna y las 20 lunas más. Ninguna supera su objetivo. Cada cifra sale del nombre de su test (`npx ng test --watch=false --reporters=verbose`), así que se reproduce con un comando. |
| Ningún dato sin fuente; textos listados para que Iván los revise | ✅ | `body-data.spec.ts` recorre todo el catálogo y falla si un número o un booleano no está dentro de un `Sourced` con una fuente registrada en `data/sources.ts`. Cada texto lleva la URL de su página de la NASA y `reviewed: false` (`bodies.spec.ts`). Lista de revisión con las citas en inglés: `docs/datos/textos-cuerpos.md` (120 textos, 332 citas comprobadas por script). Los fixtures llevan su consulta exacta. Las demás fuentes están en `docs/FUENTES.md`. |
| `astronomy-engine` fuera del bundle inicial (con salida del build) | ✅ | Bundle inicial de **274,17 kB** (aviso a los 300 kB), con `main` y el chunk de la portada. Ninguna cadena característica de astronomy-engine aparece en ningún JS de `dist` (salida abajo). Además, el nuevo `scripts/check-initial-bundle.mjs` lo comprueba en cada `npm run check` y en el CI: falla si una importación lo mete en el bundle inicial (demostrado y revertido). |

### Tabla de precisión frente a NASA/JPL Horizons
Error angular del vector de posición (heliocéntrico en los planetas, geocéntrico en la Luna, planetocéntrico en las lunas) y error relativo de la distancia. Instantes: las 3 fechas del plan a las 00:00 UT; el 1 de enero de cada década de 1900 a 2100, en TT (ver §4.4); y, para las lunas, el día 1 de cada trimestre de 2020 a 2035 a las 00:00 UT.

**Planetas y Luna** (24 instantes cada uno: 3 fechas del plan + 21 décadas)

| Cuerpo | Peor error angular | Peor error de distancia | Objetivo §5 |
|---|---|---|---|
| Mercurio | 0,0079° | 0,0042 % | ≤ 0,05° y ≤ 0,1 % |
| Venus | 0,0019° | 0,0011 % | ≤ 0,05° y ≤ 0,1 % |
| Tierra | 0,0005° | 0,0014 % | ≤ 0,05° y ≤ 0,1 % |
| Marte | 0,0009° | 0,0017 % | ≤ 0,05° y ≤ 0,1 % |
| Júpiter | 0,0025° | 0,0054 % | ≤ 0,05° y ≤ 0,1 % |
| Saturno | 0,0054° | 0,0061 % | ≤ 0,05° y ≤ 0,1 % |
| Urano | 0,0045° | 0,0040 % | ≤ 0,05° y ≤ 0,1 % |
| Neptuno | 0,0055° | 0,0040 % | ≤ 0,05° y ≤ 0,1 % |
| Luna | 0,0012° | 0,0036 % | ≤ 0,1° y ≤ 0,5 % |

**Galileanas** con `JupiterMoons` (88 instantes de 1900–2100 cada una), objetivo ≤ 0,5°: Ío 0,062° · Europa 0,018° · Ganímedes 0,019° · Calisto 0,019°.

**Las otras 16 lunas**, con elementos medios ajustados (objetivo ≤ 5° en 2020–2035). En la columna 2020–2035, entre paréntesis, la parte del error que viene del ΔT (§4.4):

| Luna | 3 fechas del plan | 2020–2035 (UT) | Décadas 1900–2100 (TT) |
|---|---|---|---|
| Fobos | 0,130° | 0,176° (0,162°) | 0,103° |
| Deimos | 0,059° | 0,081° (0,041°) | 0,162° |
| Mimas | 0,141° | 0,292° (0,055°) | 0,227° |
| Encélado | 0,030° | 0,051° (0,038°) | 0,024° |
| Tetis | 0,055° | 0,072° (0,027°) | 0,057° |
| Dione | 0,036° | 0,066° (0,019°) | 0,042° |
| Rea | 0,037° | 0,069° (0,011°) | 0,071° |
| Titán | 0,012° | 0,028° (0,003°) | 0,048° |
| Jápeto | 0,073° | 0,080° (0,001°) | 0,154° |
| Miranda | 0,019° | 0,063° (0,036°) | 0,250° |
| Ariel | 0,122° | 0,144° (0,020°) | 0,288° |
| Umbriel | 0,065° | 0,097° (0,012°) | 0,117° |
| Titania | 0,132° | 0,132° (0,006°) | 0,357° |
| Oberón | 0,042° | 0,164° (0,004°) | 0,188° |
| Tritón | 0,018° | 0,023° (0,009°) | 0,165° |
| Proteo | 0,085° | 0,098° (0,046°) | 0,114° |

**Otras comprobaciones frente a fuentes oficiales:**
- **Fases lunares** frente al USNO: las 50 fases de 1900, de 2026 y de 2100 caen a menos de 0,0131° de su ángulo, unos 1,6 minutos. La fracción iluminada coincide con Horizons con menos de 0,5 puntos de diferencia.
- **Tiempo sidéreo de Greenwich** (GAST) frente al USNO en 1900, J2000, 2026-10-23 y 2050: menos de 0,05 s de diferencia (en J2000, el USNO da GAST = 18 h 41 min 49,6974 s).
- **Punto subsolar:** el 21-06-2026 a las 12:00 UTC está a +23,4° de latitud y ≈ 0° de longitud. En los equinoccios y solsticios del USNO de 2026, la latitud subsolar es 0° o ±23,44° (±0,01°). Desde el punto subsolar, `Horizon` de astronomy-engine ve el Sol a más de 89,9° de altura.
- **Orientación de la Tierra:** el punto (0°, 0°) y el polo norte coinciden con `ObserverVector` de astronomy-engine con menos de 10⁻⁶°.

### Salida del build y del bundle inicial
```
Initial chunk files | Names              |  Raw size | Estimated transfer size
main-TNFU7NAR.js    | main               | 270.93 kB |                74.37 kB
styles-SOEJ2553.css | styles             |   3.24 kB |                 1.07 kB
                    | Initial total      | 274.17 kB |                75.44 kB
Prerendered 15 static routes.
✔ Bundle inicial (main-TNFU7NAR.js, chunk-BTktH0VH.js) sin astronomy-engine ni three.

'Invalid precess direction': astronomy-engine 2 · dist (todos los JS) 0
'Indeterminate sky coordinates': astronomy-engine 1 · dist (todos los JS) 0
'Cannot calculate': astronomy-engine 2 · dist (todos los JS) 0
'Unsupported body': astronomy-engine 2 · dist (todos los JS) 0
```
**Demostración de que la comprobación detecta el fallo.** Importé temporalmente `SearchMoonQuarter` en `src/main.ts`:
```
main-LQCQHTR2.js    | main               | 319.98 kB |                92.14 kB
                    | Initial total      | 323.22 kB |                93.22 kB
✖ astronomy-engine está en el bundle inicial (main-LQCQHTR2.js)
exit=1
```
Después lo revertí con `git checkout -- src/main.ts`, y el build volvió a 274,17 kB y a ✔. De paso se ve por qué la regla importa: una sola función de astronomy-engine añade 49 kB y supera el aviso de 300 kB.

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 1.1 `astronomy-engine` | hecha | `^2.1.19` (MIT). Solo lo importa `ephemeris/`. |
| 1.2 `coordinates.ts` con tests | hecha | EQJ↔ECL (`Rotation_EQJ_ECL` + `RotateVector`), ECL↔Three `(x, z, −y)` (vectores y rotaciones), planos de referencia de las lunas (polo → matriz), orientación de la Tierra (GAST + precesión y nutación), conversiones geográficas, punto subsolar y `KM_PER_AU` (IAU 2012). |
| 1.3 `ephemeris.ts` | hecha | Sol y planetas (heliocéntricos), Luna geocéntrica y distancias al Sol y a la Tierra. La fase lunar da el ángulo, la fracción iluminada, el nombre en español y si crece o mengua. La rotación de la Tierra y el punto subsolar están en `coordinates.ts`, como pide §4.3. |
| 1.4 `moons.ts` | hecha, con desviación | Galileanas con `JupiterMoons`. Las otras 16 se calculan con Kepler y precesión del nodo y del periapsis, más una aceleración secular y términos periódicos donde mejoran el ajuste. Los elementos medios no se copian de la tabla del JPL: se ajustan a Horizons (§4.1). |
| 1.5 `scale.ts` y `orbits.ts` | hecha | Escala ilustrativa `K·log10(1 + r/0,1 UA)`, escala real, radios agrandados y acotados, separación de los sistemas de lunas y transición geométrica entre escalas. Órbitas muestreadas con las mismas funciones de posición y caché LRU por tramos de validez. |
| 1.6 Fixtures | hecha, ampliada | `scripts/fetch-horizons-fixtures.mjs`: las 3 fechas del plan para los planetas, la Luna y las 20 lunas. Añade un barrido por décadas (1900–2100, en TT), uno trimestral para las lunas (2020–2035), la iluminación lunar, y del USNO las fases, el tiempo sidéreo y las estaciones. Cada serie lleva su consulta. |
| 1.7 Estrellas | hecha | `scripts/build-stars.mjs`: HYG v4.1 fijada por commit, 8920 estrellas con magnitud ≤ 6,5. `public/data/stars.bin` pesa 71 376 bytes (64 836 comprimido con gzip; el presupuesto es 250 kB), con su licencia CC BY-SA 4.0 en `public/data/stars.LICENSE.txt`. Hay decodificador y test de integridad. |
| 1.8 `bodies.ts` + `body.model.ts` | hecha, 30 cuerpos | Índice ligero, datos físicos y orbitales con fuente (generados por script desde la NASA y el JPL), y un resumen y 3 curiosidades por cuerpo, con fuente y `reviewed: false`. |
| 1.9 `places.ts` | hecha | Fraga y Lleida, con latitud, longitud y altitud de la API OGC del IGN («Núcleos de población»). |
| 1.10 Tests | hecha | Precisión de §5, escala monótona, transición continua y sin adelantamientos, tiempo sidéreo (J2000 y USNO), fases frente al USNO, fechas límite (1900 y 2100, y fuera de rango) y campos y fuentes completos. |

## 4. Desviaciones del plan y motivo

### 4.1 Elementos medios ajustados a Horizons en vez de copiados de la tabla del JPL (tarea 4, D11)
La tarea pide copiar a `data/moon-elements.ts` los elementos medios de https://ssd.jpl.nasa.gov/sats/elem/. Antes de programar lo medí, y esa tabla no sirve para fechar posiciones:
- La propia página avisa: *«These mean orbital parameters are not intended for ephemeris computation. Accurate ephemerides should be obtained from our Horizons system.»*
- Los periodos van redondeados (Fobos `0.3187`, Deimos `1.2625`, Tritón `5.8792`, Proteo `1.1229`), y también las precesiones (las de Fobos, a 2 cifras). En 26 años, ese redondeo deja a Fobos en una posición al azar.
- Con la mejor interpretación posible de la tabla (polos de Laplace de sus columnas, P como periodo de la anomalía media y precesión con los signos físicos), estos son los errores frente a Horizons:

| Luna | Error en J2000 (época de la tabla) | Error el 2026-01-01 | Con el ajuste (2020–2035) |
|---|---|---|---|
| Fobos | 0,1° | 13,1° | 0,18° |
| Deimos | 0,1° | 66,3° | 0,08° |
| Mimas | 50,3° | 155,3° | 0,29° |
| Encélado | 5,5° | 35,5° | 0,05° |
| Tetis | 61,3° | 20,4° | 0,07° |
| Dione | 151,1° | 128,9° | 0,07° |
| Rea | 157,4° | 171,7° | 0,07° |
| Titán | 156,7° | 168,9° | 0,03° |
| Jápeto | 139,9° | 146,8° | 0,08° |
| Miranda | 1,1° | 161,8° | 0,06° |
| Ariel | 0,2° | 36,0° | 0,14° |
| Umbriel | 0,0° | 74,2° | 0,10° |
| Titania | 0,1° | 10,7° | 0,13° |
| Oberón | 0,1° | 10,4° | 0,16° |
| Tritón | 4,6° | 116,1° | 0,02° |
| Proteo | 15,9° | 126,3° | 0,10° |

Para las lunas de Saturno, la tabla no reproduce Horizons ni en su propia época, y para el resto se desvía decenas de grados en pocos años. Por eso `scripts/fit-moon-elements.mjs` hace lo que la página dice que es un elemento medio (*«a precessing ellipse which has been fit in a least squares sense to the numerically integrated orbit»*), pero sin redondear:
- **Datos:** vectores de Horizons en tres ventanas (±15 días o ±2 periodos en torno a 2026; 2016–2036; 1900–2100).
- **Plano de referencia:** el polo de Laplace de la tabla del JPL; para Urano y Neptuno, el polo IAU 2015.
- **Ajuste:** Levenberg–Marquardt en variables sin singularidades, con las precesiones sembradas en los dos sentidos de giro.
- **Extras:** una aceleración secular de la longitud (en Fobos sale 0,00126 °/año², coherente con su caída en espiral hacia Marte) y términos periódicos (la libración de 73 años de Mimas y Tetis por su resonancia) solo si mejoran el ajuste.
- **Resultado:** `docs/datos/elementos-lunas.md`, con el método, todas las consultas y los residuos (radiales, a lo largo y fuera del plano).

Se mantienen el alcance y D11: elementos medios del JPL, Kepler en el navegador, sin datos que caduquen y con la precisión documentada. Solo cambia de dónde salen las cifras. **Propuesta de redacción en §10.**

### 4.2 30 cuerpos, no 29
El plan dice «29 cuerpos (Sol, 8 planetas, Luna y 20 lunas más)», pero esa lista suma 30. El 29 son los 8 planetas y las 21 lunas, sin contar el Sol. El catálogo tiene los 30 que enumera el plan. Las 21 lunas son las del original: la Luna; Fobos y Deimos; las 4 galileanas; Mimas, Encélado, Tetis, Dione, Rea, Titán y Jápeto; Miranda, Ariel, Umbriel, Titania y Oberón; Tritón y Proteo.

### 4.3 Fixtures ampliados
Además de las 3 fechas del plan hay cinco fixtures más:
- un barrido por décadas de 1900 a 2100, que demuestra la mejora «cualquier fecha»;
- un barrido trimestral de las lunas de 2020 a 2035, el intervalo del objetivo de §5;
- la iluminación de la Luna, de Horizons;
- el tiempo sidéreo, del USNO;
- las estaciones de 2026, del USNO.

La API de tiempo sidéreo del USNO solo admite 1800–2050, así que su último instante es 2050-12-31.

### 4.4 Barrido por décadas en TT
Para un mismo instante UT, Horizons y astronomy-engine suponen ΔT (TT − UT) distintos:
- **Fechas futuras:** Horizons mantiene TDB − UTC = 69,184 s, el último salto de segundo, y astronomy-engine extrapola su modelo. En 2100 la diferencia es de unos 130 s, y en ese tiempo Fobos recorre 1,7°.
- **Hoy:** el modelo de astronomy-engine da unos 6 s de más.

Para medir la dinámica sin mezclar una convención que nadie conoce (el ΔT futuro), el barrido por décadas va en TT y los tests calculan en el mismo TT. Las fechas del plan y el barrido 2020–2035 siguen en UT, que es el uso real. Los tests descuentan el efecto del ΔT, calculado a la velocidad de cada luna, y lo muestran en su nombre.

### 4.5 Otras desviaciones pequeñas
1. **Fuentes de los datos de las lunas.** Del JPL (`sats/phys_par`) se toman el radio medio y la densidad. Esa tabla no da masas ni órbitas, así que la masa, el albedo y la órbita salen de las fichas de satélites de la NASA (NSSDCA). Cada dato lleva su fuente.
2. **Regla de capas del lint.** Daba un falso positivo con `../../../public/data/stars.bin`, porque la ruta contiene `/data/`. Ahora ignora las rutas que pasan por `public/`, que son recursos y no una capa. Comprobé que `../data/places` dentro de `ephemeris/` sigue fallando.
3. **`npm run check`** ejecuta además `scripts/check-initial-bundle.mjs`, también en el CI (§2).
4. **Polo de Urano.** Urano gira en sentido retrógrado respecto a su polo norte IAU. El plano de sus lunas se define con el polo opuesto, el de su rotación; si no, salen inclinaciones de ~180°, donde el ajuste es singular. Es la convención con la que la tabla del JPL da Miranda a 4,4°.

## 5. Decisiones técnicas nuevas
- **Índice ligero y catálogo completo separados.** `data/body-index.ts` lleva los 30 ids, nombres, tipos y padres; es lo único que importan las rutas y suma 1,7 kB al bundle inicial. `data/bodies.ts` reúne datos y textos (unos 80 kB sin minificar) y lo usará solo código diferido. Alternativa descartada: un único `bodies.ts`, que habría metido unos 50 kB de textos en el bundle inicial.
- **`ephemeris/ids.ts` sin dependencias.** Los ids de planetas y galileanas viven aparte, para que el índice de cuerpos no arrastre astronomy-engine. Si `PLANET_IDS` estuviera en `ephemeris.ts`, importarlo cargaría el módulo entero, que tiene efectos secundarios.
- **`Sourced<T>` + registro de fuentes.** Cada dato es `{ value, source, note? }`, con `source` tipado como id de `data/sources.ts`, que es la fuente única para /creditos en la fase 8. Los textos llevan la URL de su página.
- **Datos y textos generados por script, no transcritos a mano:**
  - `scripts/build-body-data.mjs` lee las fichas de la NASA y del JPL y genera `body-data.ts`.
  - `scripts/build-body-texts.mjs` comprueba que cada cita está literalmente en su página (332 de 332) y genera `body-texts.ts` y la lista de revisión.
  - Para dar un texto por revisado, Iván cambia `reviewed` en `scripts/content/body-texts.json` y vuelve a ejecutar el script.
- **Redacción de los textos.** La hicieron 4 subagentes en paralelo, con la regla de que cada frase tuviera su cita literal. Comprobé las citas con mi propio script y apliqué 2 correcciones:
  - quité una altura de Ganímedes que la página de la NASA da de forma incoherente («2,000 feet (700 meters)»);
  - dejé el resumen de Oberón en 2 frases.

  Los subagentes descartaron cifras dudosas de la NASA y dejaron notas para el revisor en `docs/datos/textos-cuerpos.md`.
- **Orientación de la Tierra.** Usa la rotación EQD (con precesión y nutación de astronomy-engine) y el GAST. El plan pedía «EQJ→ECL y tiempo sidéreo»; sin la precesión, en 2026 habría un error de 0,36°. El punto subsolar usa la misma matriz que usará la escena.
- **API de vectores.** `Vec3` inmutable `{ x, y, z }` en float64 y `Mat3` en tuplas por filas, sin `three`. Las unidades son UA y ECL; las de escena, `scale.ts`.
- **Rango de fechas.** Va de 1900-01-01T00:00Z a 2100-12-31T23:59:59Z. Fuera de él, o con una fecha `NaN`, las efemérides lanzan `RangeError` en vez de devolver posiciones absurdas. `clampToSupportedRange` es para la interfaz.
- **Transición de escala.** Interpola geométricamente distancias y radios. Como la escala ilustrativa conserva las direcciones y el orden de las distancias, ningún cuerpo adelanta a otro a mitad de transición; está demostrado en un test. Los parámetros de `DEFAULT_ILLUSTRATIVE_SCALE` son de presentación y se ajustarán en las fases 2 y 6.
- **Nombres de las fases lunares.** Las fases principales (nueva, cuartos y llena) se nombran en un margen de ±7° de elongación, unas ±14 h. Es una convención de presentación documentada en el código.
- **Formato de `stars.bin`.** Cabecera de 16 bytes y 8 bytes por estrella (ascensión recta, declinación, magnitud y B−V en enteros de 16 bits), ordenadas por brillo para poder dibujar solo las N primeras. La resolución, de 0,0055° y 0,0027°, sobra para un cielo de fondo.
- **Oblicuidad.** astronomy-engine usa 84381,406″ (IAU 2006) y Horizons, 84381,448″ (IAU 1976). La diferencia es de 0,042″ y no influye en nada.

## 6. Salida de los checks
```
$ rm -rf node_modules dist .angular && npm ci
$ npm run check            (código de salida 0)
> ng lint && prettier --check .
All files pass linting.
All matched files use Prettier code style!
> ng test --watch=false
 Test Files  16 passed (16)
      Tests  141 passed (141)
=============================== Coverage summary ===============================
Statements   : 98.9% ( 271/274 )
Branches     : 92.3% ( 84/91 )
Functions    : 100% ( 64/64 )
Lines        : 100% ( 236/236 )
> ng build
Initial chunk files | Names              |  Raw size | Estimated transfer size
main-TNFU7NAR.js    | main               | 270.93 kB |                74.37 kB
styles-SOEJ2553.css | styles             |   3.24 kB |                 1.07 kB
                    | Initial total      | 274.17 kB |                75.44 kB
Prerendered 15 static routes.
> node scripts/check-initial-bundle.mjs
✔ El JS inicial de las 16 páginas (5 ficheros) no lleva astronomy-engine ni three.
```
- Sin avisos de presupuesto. El bundle inicial pasa de 272,45 kB a 274,17 kB, por el índice de los 30 cuerpos y las 8 fichas de planetas.
- Se prerenderizan 15 rutas (antes 8), porque ahora salen las 8 fichas de planetas desde el catálogo.

**Peso de los datos nuevos:**
- `stars.bin`: 71 376 bytes (64 836 con gzip).
- `moon-elements.ts`: 19,5 kB.
- `body-data.ts`: 39,7 kB.
- `body-texts.ts`: 43,4 kB.

Ninguno está en el bundle inicial; todos irán en chunks diferidos.

## 7. Capturas
No hay cambios visuales en esta fase: la única novedad de interfaz es que `/planetas` lista los 8 planetas.

## 8. Dependencias añadidas

| Paquete | Versión | Motivo | ¿Está en la lista permitida? |
|---|---|---|---|
| `astronomy-engine` | 2.1.19 (MIT) | Efemérides (D4) | ✅ |
| `@vitest/coverage-v8` | 5.0.5 | Cobertura de `ephemeris/` | ✅ |

`npm audit` sigue igual que en la fase 0: 2 vulnerabilidades del `vite` interno de `@angular/build` 22.2.4, que solo afectan al servidor de desarrollo.

## 9. Pendientes y `TODO(ivan)`
También están en `docs/PENDIENTES.md`.
- **Revisar los 120 textos** con sus citas: `docs/datos/textos-cuerpos.md`. Los subagentes dejaron dudas concretas en las notas, por ejemplo:
  - la traducción de «The Rape of the Lock» como «El rizo robado»;
  - «5 trillion» como «5 billones» (correcto en español).
- **Decidir las propuestas de §10.**
- Sigue pendiente de la fase 0 el repo en GitHub (no hay remoto: el CI no se ha ejecutado de verdad).

## 10. Propuestas de cambio al plan
No se aplican hasta que Iván las apruebe.
1. **D11 y fase 1, tarea 4:** cambiar «copiados a `data/moon-elements.ts`» por «elementos medios (elipse con precesión, más una aceleración secular y términos periódicos de la longitud cuando mejoran el ajuste) ajustados por mínimos cuadrados a Horizons en 1900–2100; la tabla del JPL solo aporta los planos de Laplace y los valores iniciales; script y residuos en `docs/datos/elementos-lunas.md`» (§4.1; redacción de la revisión).
2. **Fase 1 y §4.1 del plan:** «29 cuerpos» → «30 cuerpos (Sol, 8 planetas y 21 lunas)».
3. **§5, precisión de las otras lunas:** subir el objetivo de «≤ 5° entre 2020 y 2035» a «**≤ 0,5° en 1900–2100 medido en TT; en UT, ≤ 0,5° en 2020–2035; a partir de ~2055, el ΔT futuro puede añadir más de 0,5° en las lunas más rápidas y se documenta**» (redacción de la revisión). Medido: ≤ 0,36° en TT en todo el rango; en UT, el ΔT de 2100 añade hasta 1,74° en Fobos. Si se aprueba, el test añadirá esa cota absoluta.
4. **Backlog (§9), idea:** sustituir el ΔT de astronomy-engine (Espenak–Meeus) por uno con los valores medidos del IERS hasta hoy. Solo se nota en Fobos, que hoy está a ≈ 0,1° (§4.4).

## 11. Cómo probarlo
```bash
npm ci
npm run check                                  # lint + tests (con cobertura) + build + bundle inicial
npx ng test --watch=false --reporters=verbose  # las cifras de precisión salen en el nombre de cada test
node scripts/fetch-horizons-fixtures.mjs       # vuelve a descargar los fixtures (Horizons y USNO)
node scripts/fit-moon-elements.mjs             # vuelve a ajustar las 16 lunas → moon-elements.ts + informe
node scripts/build-stars.mjs                   # vuelve a generar public/data/stars.bin desde HYG v4.1
node scripts/build-body-data.mjs               # vuelve a generar los datos físicos desde la NASA y el JPL
node scripts/build-body-texts.mjs              # comprueba las citas y regenera textos y lista de revisión
```
- Lista de textos para revisar: `docs/datos/textos-cuerpos.md`.
- Ajuste de las lunas: `docs/datos/elementos-lunas.md`.
- `/planetas` en `npm start` lista los 8 planetas, cada uno con su ficha prerenderizada.

---

## Respuesta a la revisión

Revisión: `docs/revisiones/fase-1.md`. Veredicto: **APROBADA CON CAMBIOS MENORES**, sin bloqueantes. Hay 2 hallazgos importantes, 5 menores y 4 sugerencias; todos están atendidos.

| Hallazgo | Acción |
|---|---|
| 1 · Importante · la comprobación del bundle no detecta importaciones pequeñas | **Arreglado.** Nuevo marcador: el mensaje del constructor de `AstroTime`. Demostración repetida con una importación pequeña: `toAstroTime` en `main.ts` sube `main` a 275,01 kB (+4 kB), y el script responde «✖ astronomy-engine está en el JS inicial (main-AC3G3X4S.js), que cargan: index.html, …» con código de salida 1. Lo revertí y volvió a ✔. |
| 2 · Importante · `bodies.spec.ts` exige `reviewed: false` | **Arreglado.** Ahora solo se exige que la marca sea booleana. Los textos nuevos siguen llegando con `false` desde el JSON de origen. |
| 3 · Menor · faltan los textos en `FUENTES.md` | **Arreglado.** Nueva fila con el JSON, el TS y la lista de revisión: páginas de NASA Science, material de la NASA sin respaldo, traducción y resumen con las citas originales. |
| 4 · Menor · afirmaciones que no cuadran | **Arreglado.** En §0 queda una corrección explícita: en J2000 solo fallan las lunas de Saturno; las de Urano y Neptuno derivan por el redondeo. La medición previa usaba para Urano el polo IAU equivocado (§4.5.4). Se corrigió el comentario de `fit-moon-elements.mjs`, se quitó el script inexistente de §0 y se aclaró en 1.e que la fusión está autorizada por las instrucciones de Iván. |
| 5 · Menor · pruebas que no prueban el código | **Arreglado.** Fuera la aserción de relleno de `orbits.spec.ts` y el test que solo leía el GMST del fixture. El GAST de J2000 sigue probado contra el USNO en el `it.each`. |
| 6 · Menor · «no se usaron en el ajuste» | **Matizado** en `moon-elements.spec.ts`: son instantes distintos de las muestras del ajuste (salvo 1900-01-01), pero dentro de su intervalo. La cota absoluta de 0,5° en TT se añadirá si Iván aprueba la propuesta 3, como recomienda la revisión. |
| 7 · Menor · decisiones de `PENDIENTES.md` | **Aclarado.** Vienen de las instrucciones del modo autónomo por bloques que Iván dio para este bloque. Ahora `PENDIENTES.md` lo dice así. Iván puede confirmarlo al leer el `DIARIO.md`. |
| 8 · Sugerencia · `coordinates.ts` arrastra astronomy-engine | **Hecho.** `KM_PER_AU` vive en `ephemeris/constants.ts`, sin dependencias. `scale.ts` ya no depende de `coordinates.ts`. |
| 9 · Sugerencia · solo se revisa `/` | **Hecho.** El script revisa el JS inicial de las 16 páginas prerenderizadas. |
| 10 · Sugerencia · cuatro textos | **Aplicado.** <br>• Júpiter: «más grande que la Tierra», con su cita. <br>• Mimas: la curiosidad mitológica pasa a ser su descubrimiento en 1789 y su órbita de 22 h 36 min, con 2 citas nuevas verificadas. <br>• Urano: «la otra mitad del planeta». <br>• Umbriel y Proteo: nota para Iván sobre el albedo; él decide. <br>El script volvió a verificar las 120 entradas. |
| 11 · Sugerencia · `.gitignore` y README | **Hecho.** `.claude/settings.local.json` va en el `.gitignore` del repo, y el README describe el `check` completo. |
| Propuestas §10 | Las redacciones 1 y 3 de §10 son ahora las de la revisión: la 3 indica la escala de tiempo. Siguen pendientes de Iván, así que `PLAN.md` no se toca. |

**Check final** (`npm run check`, código de salida 0):
```
All files pass linting.
All matched files use Prettier code style!
 Test Files  16 passed (16)
      Tests  141 passed (141)
Statements   : 98.9% ( 271/274 )
Branches     : 92.3% ( 84/91 )
Functions    : 100% ( 64/64 )
Lines        : 100% ( 236/236 )
                    | Initial total      | 274.17 kB |                75.44 kB
Prerendered 15 static routes.
✔ El JS inicial de las 16 páginas (5 ficheros) no lleva astronomy-engine ni three.
```
