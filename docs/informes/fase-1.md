# Informe: Fase 1 (Efemérides, catálogo y datos)

- **Rama:** `fase-1-efemerides`
- **Fecha:** 2026-10-23
- **Estado:** en curso (modo autónomo por bloques, autorizado por Iván)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo. Lo que cambie durante la ejecución se explica en §4.

### Entregas
| Entrega | Contenido |
|---|---|
| 1.a | `astronomy-engine`; `ephemeris/coordinates.ts` (EQJ→ECL, ECL→Three, orientación de la Tierra, planos de referencia de las lunas); `ephemeris/ephemeris.ts` (Sol y planetas, Luna geocéntrica, rotación de la Tierra, punto subsolar, fase lunar en español, distancias); rango de fechas 1900–2100; fixtures de Horizons y del USNO con su consulta; cobertura con `@vitest/coverage-v8`. |
| 1.b | `ephemeris/moons.ts` (galileanas con `JupiterMoons`; las otras 16 con elementos medios y Kepler con precesión), `data/moon-elements.ts`, tabla de precisión de las 21 lunas; `ephemeris/scale.ts` y `ephemeris/orbits.ts`. |
| 1.c | `scripts/build-stars.mjs` (HYG v4.1 → `public/data/stars.bin` + licencia CC BY-SA 4.0), decodificador y test de integridad; `data/places.ts` (Fraga y Lleida, IGN). |
| 1.d | `data/body.model.ts`, `data/sources.ts`, índice ligero y catálogo completo de cuerpos con datos físicos con fuente y textos (`reviewed: false`); rutas de planetas desde el catálogo; `FUENTES.md`. |
| 1.e | `npm run check`, informe con evidencias, revisión automática, correcciones, fusión y `DIARIO.md`. |

### Archivos
- Nuevos: `src/app/ephemeris/{time,coordinates,ephemeris,moons,scale,orbits,stars}.ts` (+ tests), `src/app/ephemeris/fixtures/*.json`, `src/app/data/{body.model,sources,body-index,bodies,moon-elements,places}.ts` (+ tests), `scripts/{fetch-horizons-fixtures,fetch-usno-fixtures,fit-moon-elements,build-stars}.mjs`, `public/data/stars.bin` + licencia, `docs/informes/fase-1.md`.
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
1. **La tabla de elementos medios del JPL no sirve para fechar posiciones.** Comprobado antes de empezar: el propio JPL avisa de que *«These mean orbital parameters are not intended for ephemeris computation»*; los periodos de Fobos, Deimos, Tritón y Proteo traen 4–5 cifras (deriva de vueltas enteras en 26 años) y, para las lunas de Saturno, Urano y Neptuno, la tabla no reproduce las posiciones de Horizons **ni en su propia época** (J2000): errores de 50° a 165°. **Plan:** ajustar por mínimos cuadrados elipses con precesión (exactamente la definición de «elementos medios» del JPL) a las efemérides del JPL vía Horizons, con un script reproducible, y guardarlas en `data/moon-elements.ts` con la URL, el plano de referencia (polo de Laplace de la tabla del JPL) y la época de cada fila. Es una desviación de la letra de la tarea 4 («copiados de la tabla»), no del alcance ni de D11 (elementos medios del JPL + Kepler en el navegador, sin caducidad); se documenta en §4 con las cifras.
2. **Mimas** tiene una libración de unos ±44° en longitud (resonancia con Tetis, periodo de ~70 años) que ninguna elipse con precesión recoge. Si no cumple el objetivo, se documenta con causa y propuesta.
3. **Bundle inicial** (272 de 300 kB): las rutas solo importarán un índice ligero de cuerpos (ids y nombres); los datos y textos completos quedan fuera del bundle inicial. `astronomy-engine` no lo importa ningún código de la app en esta fase.
4. **Catálogo de 30 cuerpos, no 29:** Sol + 8 planetas + Luna + 20 lunas suman 30 (el «29» del plan cuenta 8 planetas + 21 lunas). Se propone corregir el texto del plan.
5. **Textos:** cada resumen y curiosidad se redacta a partir de una página de la NASA que lo respalda, con la cita en inglés guardada para la revisión de Iván.

### Estado de las entregas (se actualiza al cerrar cada una)
- 1.a ✅ coordenadas, tiempo, efemérides, fixtures y cobertura.
- 1.b ✅ lunas (galileanas + 16 con elementos medios ajustados), escala y órbitas.
- 1.c ✅ estrellas HYG y lugares del IGN.
- 1.d en curso: modelo, índice, datos físicos y rutas hechos; faltan los textos (redacción con citas verificables).
- 1.e pendiente.
