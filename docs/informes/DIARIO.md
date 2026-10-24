# Diario del modo autónomo

Una línea por cada fase cerrada en modo autónomo por bloques y, al terminar cada bloque, un resumen para Iván. El detalle de cada fase está en su informe (`docs/informes/fase-N.md`) y en su revisión (`docs/revisiones/fase-N.md`).

| Fase | Cierre | Veredicto de la revisión | Métricas clave |
|---|---|---|---|
| 1 · Efemérides, catálogo y datos | 2026-10-24 | APROBADA CON CAMBIOS MENORES: 0 bloqueantes, 2 importantes, 5 menores y 4 sugerencias, todos atendidos. Fusionada con `--no-ff` (`df1d0eb`) | 141 tests · cobertura de `ephemeris/` del 98,9 % · JS inicial de 274,17 kB (sin astronomy-engine) · error frente a Horizons: planetas ≤ 0,008°, Luna ≤ 0,002°, galileanas ≤ 0,06°, otras 16 lunas ≤ 0,38° (1900–2100, TT; 0,36° en los instantes de test, corregido el 24-10) y ≤ 0,25° en el control independiente · 30 cuerpos y 120 textos con 332 citas verificadas · 8920 estrellas en 71 kB |

---

## Resumen del bloque «fases 1 a 1» (2026-10-24)

**Paso 0.** La regla del WordPress de producción vuelve a estar en `CLAUDE.md`, en «No toques» (commit `97f2a43` en `main`).

### Qué se ha hecho
La fase 1 está completa, revisada, corregida y fusionada en `main`:
- **Efemérides en TS puro** (`src/app/ephemeris/`), para cualquier fecha de 1900–2100:
  - posiciones del Sol, los planetas, la Luna y las 20 lunas;
  - orientación de la Tierra y punto subsolar;
  - fase lunar en español;
  - escalas ilustrativa y real con transición continua;
  - órbitas con caché;
  - catálogo de estrellas.
- **Fixtures oficiales**, todos con su consulta exacta:
  - Horizons: 3 fechas del plan, décadas de 1900 a 2100 y trimestres de 2020 a 2035;
  - USNO: fases lunares, tiempo sidéreo y estaciones.
- **Catálogo de 30 cuerpos:**
  - índice ligero para las rutas;
  - datos físicos y orbitales generados por script desde la NASA y el JPL, cada uno con su fuente;
  - 120 textos en español (un resumen y 3 curiosidades por cuerpo) con su cita literal de la NASA, comprobada por script. Están sin revisar.
- **Estrellas:** HYG v4.1, en `public/data/stars.bin` con su licencia CC BY-SA 4.0.
- **Fraga y Lleida:** coordenadas y altitud del IGN.
- **Comprobación del bundle:** un script nuevo en `npm run check` y en el CI comprueba que astronomy-engine y three no entran en el JS inicial de ninguna página.

### Desviaciones importantes (detalle en el informe, §4)
1. **Elementos medios de las 16 lunas: ajustados a Horizons, no copiados de la tabla del JPL.** La tabla avisa de que no sirve para efemérides y, medida, da errores de 10° a 170° en 2026. Con el ajuste, ninguna pasa de 0,36°.
2. **30 cuerpos, no 29:** la lista del plan suma 30.
3. **El barrido por décadas se mide en TT:** el ΔT futuro es una convención desconocida, no un error de la dinámica.

### Condiciones de parada
No se activó ninguna:
- no hubo bloqueantes;
- no hizo falta ninguna dependencia fuera de la lista ni herramientas externas;
- todas las fuentes y licencias son compatibles;
- todos los criterios se cumplen.

### Pendiente para Iván
1. **Decidir las 4 propuestas de cambio al plan** (informe, §10). La revisión recomienda aprobarlas todas: redacción de D11, 30 cuerpos, nuevo objetivo de precisión de las lunas indicando la escala de tiempo y la idea del ΔT para el backlog.
2. **Revisar los 120 textos:** `docs/datos/textos-cuerpos.md`, con las citas y las notas de redacción.
3. **Confirmar las decisiones adelantadas** para el modo autónomo que recoge `docs/PENDIENTES.md` (vistas guiadas, constelaciones, subdominio y textos).
4. **Crear el repo en GitHub:** el CI todavía no se ha ejecutado en remoto. Ahora no hay remoto, así que no se ha hecho push.

El bloque termina aquí; no se ha empezado la fase 2.

## Bloque B (en curso; sesión cortada el 2026-10-24 por el límite de uso)
- **Fase 2:** terminada y commiteada en `fase-2-motor` (informe completo en `docs/informes/fase-2.md`, `npm run check` en verde). **Falta su revisión por subagente** (se paró a medias por el límite de uso; no llegó a escribir `docs/revisiones/fase-2.md`), las correcciones, la fusión en `main` y su línea en este diario.
- **Fase 3:** empezada en un worktree temporal (rama `wip-fase-3`, basada en `fase-2-motor`, en el scratchpad de la sesión): plan en borrador, `docs/ESTILO.md`, formato con `Intl`, stores, árbol de cuerpos, atajos, márgenes de encuadre, vuelos de cámara y aliasing, con sus tests (63 en verde). Al retomar: fusionar la fase 2, crear `fase-3-interfaz` desde `main` y traer esos commits (`git cherry-pick wip-fase-3`); después, `git worktree remove` del worktree temporal.
