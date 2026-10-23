# Revisión: Fase 1 (Efemérides, catálogo y datos)

- **Fecha:** 2026-10-24
- **Revisado:** `main...fase-1-efemerides` (25 commits, 66 ficheros) + `docs/informes/fase-1.md`
- **Veredicto: APROBADA CON CAMBIOS MENORES**

Veredicto: APROBADA CON CAMBIOS MENORES. Ningún bloqueante, 2 importantes (los dos se arreglan con una línea), 5 menores y 4 sugerencias.

## Verificación independiente
No me he fiado del informe; esto es lo que he ejecutado y lo que ha salido:

- **`npm run check` en la rama → código 0.** Lint y Prettier limpios. 142/142 tests en 16 ficheros. Cobertura de `ephemeris/`: 98,9 % de sentencias, 92,3 % de ramas, 100 % de funciones y 100 % de líneas. Build con 274,17 kB iniciales y sin avisos de presupuesto. 15 rutas prerenderizadas. `check-initial-bundle` ✔. Son las mismas cifras del informe.
- **`npx ng test --watch=false --reporters=verbose`.** Las cifras que llevan los nombres de los tests coinciden una a una con las tablas del informe.
- **Horizons, consultado por mí** en 6 instantes que no están en ningún fixture: 1957-10-04 19:28, 2026-10-24 00:00 y 2042-03-17 06:30 en UT, y 1905-07-14, 2063-04-05 12:00 y 2099-12-31 en TT. Comprobé 16 cuerpos (Mercurio, Marte, Neptuno, Luna, Ío, Fobos, Deimos, Mimas, Tetis, Titán, Jápeto, Miranda, Ariel, Titania, Tritón y Proteo), con el código de la rama compilado en un directorio temporal:

  | Grupo | Peor error |
  |---|---|
  | Planetas | 0,0049° y 0,004 % |
  | Luna | 0,0021° y 0,004 % |
  | Ío | 0,062° |
  | Las otras 13 lunas | 0,25° (Titania, 2099 TT). Fobos: 0,24° en 2042 UT, de los que ~0,22° vienen del ΔT |

  Todo está dentro de §5 y cuadra con el informe.
- **Los fixtures son auténticos.** Repetí la consulta de Marte de `horizons-plan-dates.json` y la del tiempo sidéreo del USNO del 2026-10-23: coinciden al dígito.
- **Tabla del JPL (§4.1 del informe).** Con la convención que documenta la propia página (nodo medido desde el nodo del plano sobre el ecuador ICRF), las filas de Titán, Mimas, Rea y Dione dan en J2000 errores de 156,7°, 50,3°, 157,4° y 151,1°, los mismos del informe. Además, la página avisa de que esos elementos no sirven para calcular efemérides, y solo da el periodo P redondeado (Fobos: `0.3187` d).
- **ΔT.** El modelo de astronomy-engine da 75,1 s en 2026 y 202,7 s en 2100, frente a los 69,184 s fijos de Horizons. En 2100 son 133,5 s, que equivalen a 1,74° en Fobos y 0,59° en Mimas. Confirma §4.4.
- **Datos.**
  - Fraga y Lleida: idénticos a la API del IGN.
  - Una muestra de más de 25 cifras de las fichas de la NASA y del JPL (Luna, Fobos, Deimos, Ío, Titán, Jápeto, Miranda, Umbriel, Tritón, Proteo, Tierra y Urano) es idéntica a las páginas actuales.
  - Textos: 120 textos y 332 citas, ninguno revisado. Comprobé 4 citas en las páginas en vivo. Repetí la comprobación de cifras del script sin regenerar nada: ninguna cifra en español queda sin respaldo en sus citas.
- **Capas.** Probé el lint pasándole código por la entrada estándar, sin escribir ficheros:
  - fallan `ephemeris/` → `data/`, `ephemeris/` → `scene/` y `ephemeris/` → `three`;
  - pasa `../../../public/data/...`;
  - fallan `data/` → `scene/` y `data/` → `@angular`;
  - falla `pages/` → `scene/engine`.
- **Bundle y dependencias.**
  - `main` solo lleva el índice de cuerpos: ningún dato, texto ni elemento orbital de las lunas.
  - Dependencias nuevas: solo `astronomy-engine` 2.1.19 (MIT) y `@vitest/coverage-v8` 5.0.5, más sus dependencias.
  - `stars.bin` pesa 71 376 B (64 836 con gzip). Su licencia CC BY-SA 4.0 está bien: atribución, cambios y la misma licencia.
- Para las pruebas del bundle usé copias del proyecto fuera del repo, que ya he borrado. El repo sigue limpio (`git status`).

**Lo mejor de la fase:**
- La desviación de §4.1: se detectó antes de programar, se midió y se resolvió con un ajuste reproducible y documentado.
- Las cifras de precisión salen en el nombre de los tests.
- Separar TT (la dinámica) de UT (el uso real).
- `Sourced<T>`, con un test que recorre todo el catálogo.
- Los textos: cada frase lleva su cita literal comprobada por script, y las notas de redacción evitan datos caducables.

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| 1 | **Importante** | `scripts/check-initial-bundle.mjs:10-17` | **La comprobación del bundle inicial no detecta importaciones pequeñas de astronomy-engine.** Los tres marcadores de la librería solo aparecen si se importa una parte grande. Lo probé en una copia del proyecto fuera del repo, añadiendo un import en `main.ts`: <br>• Con `toAstroTime` de `ephemeris/time`, `main` pasa de 270,93 a 275,02 kB (entran `AstroTime` y el ΔT) y el script responde «✔ … sin astronomy-engine». <br>• Con `illustrativeDistance` de `scale.ts`, `main` llega a 275,96 kB y el script vuelve a dar ✔. <br>• Importar solo `MIN_DATE` es seguro: el bundler descarta la librería. <br>El informe (§2) afirma que el script «falla si una importación lo mete en el bundle inicial». | Añadir a `MARKERS['astronomy-engine']` el mensaje del constructor de `AstroTime`: `'Argument must be a Date object, an AstroTime object, or a numeric UTC Julian date.'`. Aparece en los dos casos que probé y por él pasa casi cualquier uso de la librería. Repetir la demostración del informe con una importación pequeña. |
| 2 | **Importante** | `src/app/data/bodies.spec.ts:28` | `expect(item.reviewed).toBe(false)` exige que **ningún** texto esté revisado. El procedimiento documentado (§5 del informe y cabecera de `textos-cuerpos.md`) es poner `"reviewed": true` y regenerar. Si Iván lo sigue, `npm run check` y el CI fallan en cuanto marque el primer texto, que es justo el siguiente paso de esta fase. | Comprobar solo que `reviewed` es un booleano (y, si se quiere, que los `true` del TS coinciden con los del JSON). Que los textos nuevos lleguen con `reviewed: false` ya lo garantiza el script de generación. |
| 3 | Menor | `docs/FUENTES.md:26-40` | La tabla «Usadas» no registra los textos: `scripts/content/body-texts.json` (con 332 citas literales en inglés), `src/app/data/body-texts.ts` y `docs/datos/textos-cuerpos.md`. Salen de páginas de science.nasa.gov y nasa.gov, y CLAUDE.md pide registrar FUENTES.md «archivo a archivo». | Añadir una fila con el origen, la fecha, la licencia («material de la NASA, sin respaldo de la NASA») y las transformaciones (traducción y paráfrasis, con las citas originales para verificar). |
| 4 | Menor | `docs/informes/fase-1.md:18, 21, 43` · `scripts/fit-moon-elements.mjs:7-8` | Hay afirmaciones que no cuadran con lo medido o con lo hecho: <br>• El riesgo 1 de §0 y el comentario del script dicen que la tabla del JPL no reproduce Horizons «ni en su propia época» para las lunas de Saturno, Urano y Neptuno, con «errores de 50° a 165°». La propia tabla de §4.1, que he reproducido, da 0,0–1,1° en Urano, 4,6–15,9° en Neptuno y 5,5–157,4° en Saturno. <br>• §0 cita `fetch-usno-fixtures.mjs`, que no existe: el USNO está en `fetch-horizons-fixtures.mjs`. <br>• La entrega 1.e incluye «fusión y `DIARIO.md`» y figura como ✅. | En J2000 solo fallan las lunas de Saturno; las de Urano y Neptuno derivan por los periodos redondeados. Quitar el script inexistente y dejar claro que la fusión espera al OK de Iván. |
| 5 | Menor | `src/app/ephemeris/coordinates.spec.ts:106-109` · `src/app/ephemeris/orbits.spec.ts:103` | Dos pruebas que no prueban el código del proyecto: <br>• «En J2000 el GMST del USNO es 18,697375 h» solo comprueba el valor del fixture. <br>• `expect(length(vec3(1, 0, 0))).toBe(1)` es una aserción de relleno. <br>El GAST de J2000 sí está probado en el `it.each` anterior. | Quitar la aserción de relleno. El test del GMST se borra o se convierte en una prueba del código: GMST = GAST − ecuación de los equinoccios (el USNO la da en el campo `eqofeq`). |
| 6 | Menor | `src/app/data/moon-elements.spec.ts:63-64, 73` | El comentario dice que los instantes de prueba «no se usaron en el ajuste». No es exacto: <br>• 1900-01-01 00:00 TT es la primera muestra de la ventana larga (empieza el 1900-01-01 en TDB, prácticamente igual que TT). <br>• Los demás instantes caen dentro de las ventanas del ajuste. La comprobación es entre muestras: útil, porque la rejilla de 73 días cae en fases orbitales distintas, pero no independiente. <br>• Para las décadas solo hay una cota relativa (1,5 veces el máximo del propio ajuste), que crece si el ajuste empeora. <br>Mis 6 instantes nuevos dan ≤ 0,25°, así que el resultado se sostiene. | Matizar el comentario y el informe. Si se aprueba la propuesta 3, añadir la cota absoluta (0,5° en TT) y unos instantes de control fuera de la rejilla del ajuste (por ejemplo, los de esta revisión). |
| 7 | Menor | `docs/PENDIENTES.md:13` | Varias decisiones que estaban pendientes aparecen como tomadas por Iván «para el modo autónomo»: las vistas guiadas de la Tierra, la política de licencias de las constelaciones (CC0, CC BY, MIT o dominio público) y otras. El informe no lo menciona y desde el repo no se puede comprobar que las tomara Iván. | Que Iván confirme que esas decisiones son suyas y que el informe lo recoja. |
| 8 | Sugerencia | `src/app/ephemeris/coordinates.ts:24, 40` · `src/app/ephemeris/scale.ts:12` | `coordinates.ts` llama a astronomy-engine al cargarse (`EQJ_TO_ECL = fromAstronomyRotation(Rotation_EQJ_ECL())`). Por eso cualquier import de `scale.ts` o de `stars.ts`, o solo de `KM_PER_AU`, arrastra unos 5 kB de la librería (lo demostré en el hallazgo 1). Las fichas de la fase 8 querrán formatear distancias. | Mover `KM_PER_AU` y las demás constantes puras a un módulo sin dependencias, como se hizo con `ids.ts`, para que `scale.ts` no dependa de `coordinates.ts`. |
| 9 | Sugerencia | `scripts/check-initial-bundle.mjs:19-23` | Solo revisa los ficheros iniciales de `/` (su `index.html`). Una ficha cuyo componente importara astronomy-engine de forma estática lo cargaría al abrirse, y el script no lo vería. | Antes de la fase 8: revisar todos los HTML prerenderizados, o comprobar que los chunks con astronomy-engine solo se cargan mediante `import()` dinámico. |
| 10 | Sugerencia (para la revisión de textos de Iván) | `scripts/content/body-texts.json:247, 769, 1157, 1352, 339` | Los textos son fieles a sus citas, pero hay cuatro puntos que conviene mirar: <br>• **Júpiter:** «una tormenta el doble de ancha que la Tierra» está desfasado. La propia NASA ha publicado que la Mancha Roja se ha encogido: unas 10 250 millas (~16 500 km) en 2014 ([Hubble](https://science.nasa.gov/missions/hubble/nasas-hubble-shows-jupiters-great-red-spot-is-smaller-than-ever-measured/)). La misma página de datos dice también «bigger than Earth», que no caduca. <br>• **Mimas:** la página de la NASA confunde las guerras. Mimas era uno de los gigantes de la Gigantomaquia, no de la guerra entre titanes y dioses. <br>• **Umbriel y Proteo:** el «16 %» de Umbriel y el «seis por ciento» de Proteo chocarán en la misma ficha con el albedo de la tabla de datos (0,21 y 0,10). Es el mismo caso que ya se avisó con Venus. <br>• **Urano:** «la otra mitad» quedaría más clara como «la otra mitad del planeta». | • Júpiter: usar «más grande que la Tierra». <br>• Mimas: cambiar la curiosidad (corregir a la NASA dejaría el texto sin cita que lo respalde). <br>• Umbriel y Proteo: añadir una nota o elegir otra cifra. <br>• Urano: retoque de estilo. |
| 11 | Sugerencia | `.gitignore` · `README.md:13` | `.claude/settings.local.json` solo queda ignorado gracias al gitignore global de Iván; el `.prettierignore` del repo lo presenta como «no se versiona». El README sigue describiendo `npm run check` como «lint + test + build». | Añadir ese fichero al `.gitignore` del repo antes de hacerlo público y actualizar el README. |

## Desviaciones del plan (§4 del informe)
- **4.1, elementos medios ajustados en vez de copiados:** justificada y demostrada. La tabla del JPL avisa de que no sirve para efemérides, da los periodos redondeados y, con su propia convención, falla en J2000 para las lunas de Saturno (lo he reproducido). El ajuste se puede repetir con el script y guarda la efeméride de origen, el plano de referencia y las consultas. Se mantienen el alcance y D11. Solo hay que corregir las afirmaciones del hallazgo 4.
- **4.2, 30 cuerpos y no 29:** la cuenta es correcta.
- **4.3, más fixtures:** suman, y el barrido por décadas es lo que demuestra la mejora «cualquier fecha».
- **4.4, décadas en TT:** justificada. El ΔT futuro es una convención, no dinámica, y los tests muestran su efecto por separado.
- **4.5:** las cuatro son razonables. La regla del lint (4.5.2) la he comprobado yo.
- **No declaradas:** el cambio de `PENDIENTES.md` (hallazgo 7) y los restos de §0 (hallazgo 4). La orientación de la Tierra con precesión y nutación sí está explicada en §5 y está bien hecha: sin ella habría 0,36° de error en 2026.

## Propuestas de cambio al plan (§10 del informe)
1. ✅ **Aprobar.** Con una redacción precisa: «elementos medios (elipse con precesión, más una aceleración secular y términos periódicos de la longitud cuando mejoran el ajuste) ajustados por mínimos cuadrados a Horizons en 1900–2100. La tabla del JPL solo aporta los planos de Laplace y los valores iniciales; script y residuos en `docs/datos/elementos-lunas.md`».
2. ✅ **Aprobar**: «30 cuerpos (Sol, 8 planetas y 21 lunas)».
3. ✅ **Aprobar, pero diciendo la escala de tiempo.** «≤ 0,5° en 1900–2100» solo es cierto en TT. En UT, que es lo que usa la aplicación, el ΔT futuro (que nadie conoce) añade hasta 1,74° en Fobos, 0,59° en Mimas y 0,50° en Proteo en 2100, frente a la convención de Horizons. Propongo esta redacción: «≤ 0,5° en 1900–2100 medido en TT; en UT, ≤ 0,5° en 2020–2035; a partir de ~2055, el ΔT futuro puede añadir más de 0,5° en las lunas más rápidas y se documenta». Si se aprueba, el test debe comprobar esa cota absoluta (hallazgo 6).
4. ✅ **Al backlog, con prioridad baja.** Solo corrige unos 6 s de hoy (0,08° en Fobos); el ΔT futuro seguirá siendo desconocido.

## Otras notas
- **Proceso.** El plan de la entrega 1.e incluye «fusión». CLAUDE.md exige el OK de Iván para fusionar a `main`, y esta revisión no lo sustituye. El «modo autónomo» no consta en el repo: lo confirma Iván.
- **El bundle inicial está libre de astronomy-engine de momento porque ningún código de la app lo importa todavía.** La prueba de verdad llega en la fase 2; por eso conviene cerrar ya el hallazgo 1.
- **HYG (CC BY-SA 4.0).** Su atribución tiene que estar en `/creditos` antes de cualquier despliegue. El plan lo cubre (fase 8, antes de la 10).

## Para cerrar la fase
1. **Iván decide:**
   - las 4 propuestas del §10 (recomiendo aprobarlas todas, la 3 con la escala de tiempo explícita);
   - si confirma las decisiones de `PENDIENTES.md:13`;
   - la revisión de los textos, teniendo en cuenta el hallazgo 10.
2. **Claude Code:**
   - corrige los hallazgos 1 y 2 y los menores 3–7 (todos son rápidos);
   - si Iván aprueba la propuesta 3, añade la cota absoluta al test;
   - actualiza `PLAN.md` con lo aprobado;
   - pasa `npm run check`, completa «Respuesta a la revisión» en el informe y hace commit.
3. **Fusión a `main` con `--no-ff`**, solo con el OK de Iván.
