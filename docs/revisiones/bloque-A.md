# Revisión: Bloque A (fase 1)

- **Fecha:** 2026-10-24
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:** `main` tras la fusión `df1d0eb` (+ `bb695db`), `docs/informes/fase-1.md`, `docs/revisiones/fase-1.md` (subagente) y `docs/informes/DIARIO.md`
- **Veredicto: APROBADO.** Se puede seguir con el bloque B tras adoptar el plan v2, que ya recoge los cambios de abajo.

## Verificación independiente
- `npm run check` en `main` → código 0:
  - lint y Prettier limpios;
  - **141/141 tests** en 16 ficheros; cobertura de `ephemeris/` del 98,9 % de sentencias y del 100 % de líneas;
  - build con 15 rutas prerenderizadas y **274,17 kB** iniciales;
  - `check-initial-bundle` ✔ en las 16 páginas.
- Informe, tablas de precisión y revisión del subagente leídos completos.
- **Validación independiente del ajuste de las lunas** (lo que había que comprobar en este bloque): el subagente consultó Horizons en **6 instantes fuera de cualquier fixture y fuera de la rejilla del ajuste** (1957, 2026, 2042, 1905, 2063 y 2099) para 16 cuerpos. Peor error: 0,25° en Titania (2099, TT); Fobos 0,24° en 2042 UT, del que ~0,22° es ΔT. El ajuste generaliza: el resultado se sostiene.
- **Datos:** los radios están bien etiquetados (ecuatoriales en los planetas, medios en el resto, con `note`). Muestra de textos (Sol, Saturno, Urano): fieles a sus citas, bien redactados y con notas que evitan cifras caducables.

## Valoración
Fase de nivel muy alto:
- detectó antes de programar que la tabla de elementos medios del JPL no sirve para fechar posiciones, y lo resolvió con un ajuste reproducible;
- separa la dinámica (TT) de la convención del ΔT futuro;
- la precisión sale en el nombre de los tests;
- `Sourced<T>` con un test que recorre todo el catálogo;
- 332 citas verificadas por script;
- la comprobación del bundle se demostró con un fallo provocado.

La revisión del subagente fue rigurosa (consultas propias a Horizons, al IGN y a las páginas de la NASA) y todos sus hallazgos están atendidos.

## Hallazgos de esta revisión (no los recogía la del subagente)

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| A1 | **Importante** (para la fase 2) | `data/body.model.ts`, `scripts/build-body-data.mjs` | **No hay achatamiento de los planetas.** Con el radio ecuatorial y una esfera, Saturno (~10 % achatado) y Júpiter (~6,5 %) se verán redondos, un error visible a simple vista. | Fase 2 (2.a): añadir `flatteningRatio` (o radio polar) con fuente (fichas individuales de la NASA NSSDCA, campo «Ellipticity (Flattening)») y aplicarlo a la malla. Las sombras analíticas de los anillos deben usar el elipsoide (o el radio polar en la dirección del eje). |
| A2 | **Importante** (para la fase 2) | `scripts/check-initial-bundle.mjs` | La comprobación busca **cadenas** del código minificado. Una importación pequeña de three (por ejemplo, solo `Vector3`) no contiene `THREE.WebGLRenderer` y pasaría desapercibida. Hoy no hay riesgo porque nada importa three; en la fase 2, sí. | Fase 2 (2.d): basarla en el `stats.json` del build (`ng build --stats-json`, el metafile de esbuild), comprobando por **ruta de módulo** (`node_modules/three`, `node_modules/astronomy-engine`) qué entra en los chunks iniciales de cada página. Las cadenas pueden quedarse como segunda capa. |
| A3 | Menor | `src/app/data/moon-elements.spec.ts` | Los 6 instantes independientes del subagente no se han guardado como test. La cota de las décadas sigue siendo relativa (1,5 veces el máximo del ajuste). | Al adoptar el plan v2: guardar esos instantes como fixture de control (con su consulta de Horizons) y añadir la cota absoluta aprobada (§10.3: ≤ 0,5° en TT en 1900–2100; ≤ 0,5° en UT en 2020–2035). |
| A4 | Menor | `docs/PLAN.md` | Las 4 propuestas de §10 siguen pendientes y el plan dice aún «29 cuerpos» y «≤ 5°». | Se aprueban con el plan v2 (D11, 30 cuerpos y §5 con TT/UT; idea del ΔT del IERS al backlog). |
| A5 | Sugerencia | Textos | Los textos son divulgativos e impersonales («tal y como se conoce»). La guía `docs/ESTILO.md` (fase 3) pide tuteo para la **interfaz**, no para estos textos. | Que la guía distinga los textos de la interfaz (tuteo, instrucciones) de los textos divulgativos (impersonales). No hay que reescribir los 120. |
| A6 | Sugerencia (fase 7) | Lunas | Para las texturas de las lunas, el meridiano 0 IAU de las lunas síncronas mira, de forma aproximada, hacia su planeta. | Documentarlo en el manifiesto cuando lleguen las texturas del USGS y comprobarlo en un test. |

## Decisiones de Iván
- **Propuestas §10 del informe (1–4):** aprobadas, todas. La 3, con la escala de tiempo explícita; la 4, al backlog con prioridad baja.
- **Decisiones adelantadas del modo autónomo** (`PENDIENTES.md`): vienen del prompt que Iván envió (lo redactó la sesión de revisión y Iván lo lanzó). Confirmadas.
- **Revisión de los 120 textos:** queda para la fase 9, sin bloquear.
- **Repo en GitHub:** antes del bloque C (fase 4).

## Para cerrar el bloque
Adoptar el plan v2 (`../_plan-v2-tierra-luna-sol/ADOPTAR.md`), que integra A1–A6 y las decisiones de arriba. Después, el bloque B.
