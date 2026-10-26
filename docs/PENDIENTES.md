# Pendientes

Decisiones y tareas que dependen de Iván. Claude Code añade aquí cada `TODO(ivan):`.

## Ya hecho
- [x] Actualizar Node (v24.22.1).
- [x] Recolocar el `.git` de ivanchesa.es (23-10).
- [x] Dirección visual: **A, «Carta celeste»** (23-10).
- [x] Aceptar `@eslint/js` y `typescript-eslint` en la lista de dependencias (23-10).
- [x] Alcance: **versión 1 con paridad completa con el original + mejoras** (23-10).
- [x] Cambios al plan propuestos en el informe de la fase 0 (`ng new` desde la carpeta padre, `OnPush` sin declarar, dependencias de lint) (23-10).
- [x] `/404` siempre con `noindex` (hallazgo 5 de la revisión de la fase 0). Estaba en la fase 8 del plan v1; con el plan v2 pasa a la **fase 9** (D25, ya sin sitemap). Recordatorio `TODO(fase-9)` en `src/app/app.routes.ts`.
- [x] Decisiones que Iván adelantó en sus instrucciones del modo autónomo por bloques (bloque de la fase 1, 23-10): vistas guiadas de la Tierra (Tierra completa, Pacífico, Himalaya, luces nocturnas y España / Bajo Cinca; desde el 26-10, «España»); constelaciones solo con fuente CC0, CC BY, MIT o de dominio público (si no, se omiten y se apuntan aquí); subdominio provisional de `site.config.ts`; textos con fuente y `reviewed: false`, que Iván revisará al final; móvil y fase 10 (la de despliegue en el plan v1; ahora la 11) para Iván, sin bloquear. **Confirmadas por Iván** (24-10, `docs/revisiones/bloque-A.md`); en el plan v2 están en `CLAUDE.md`, con BSD añadida a las licencias de las constelaciones.
- [x] **Propuestas de cambio al plan de la fase 1** (`docs/informes/fase-1.md`, §10): elementos medios de las lunas ajustados a Horizons en vez de copiados de la tabla del JPL, catálogo de 30 cuerpos (no 29), objetivo de precisión de las lunas con la escala de tiempo explícita (TT/UT) y ΔT del IERS al backlog. **Aprobadas las 4 por Iván** (24-10, `docs/revisiones/bloque-A.md`) e integradas en el plan v2 (D11, §5 y §9).
- [x] Plan v2 adoptado (24-10): `docs/PLAN.md`, `CLAUDE.md`, `docs/prompts/PROMPTS.md` y `docs/revisiones/README.md`; auditoría en `docs/decisiones/auditoria-plan-v2.md`.

### Decisiones ya tomadas (24-10)
- [x] El SEO es secundario: sin JSON-LD ni sitemap trabajado; una imagen Open Graph global (D25).
- [x] Privacidad total: sin cookies, sin analítica y sin peticiones a terceros (D24).
- [x] La revisión de los 120 textos de los cuerpos queda para la fase 9, sin bloquear (`docs/revisiones/bloque-A.md`).
- [x] Repo en GitHub: antes del bloque C (fase 4) (`docs/revisiones/bloque-A.md`).

### Decisiones de la revisión del bloque B (26-10, `docs/revisiones/bloque-B.md`; integradas en el plan)
- [x] **Propuestas de cambio al plan de la fase 2** (`docs/informes/fase-2.md`, §10): **aprobadas las 4** (sistema local físico en §4.4, D13 con la profundidad logarítmica, D18 con KTX2 descartado por ahora y reevaluado en la fase 6, y §5 con las orientaciones en el coste de las efemérides).
- [x] **Propuesta de cambio al plan de la fase 3** (`docs/informes/fase-3.md`, §10): **aprobada**. Los atajos de una sola tecla se pueden desactivar en el diálogo (WCAG 2.1.4); en el plan, 3.d.10.
- [x] **Vía Láctea:** el panorama de ESO/S. Brunier (https://www.eso.org/public/images/eso0932a/), si su página confirma CC BY 4.0, alineado con el cielo real. Va en la **fase 3b** (tarea 5b). Antes estaba omitida por la licencia CC BY-NC 3.0 IGO de Gaia DR2 (NASA SVS 4851).
- [x] **H1 de la vista del sistema solar:** «El sistema solar», en paralelo a «La Tierra» y «La Luna». Hecho en `src/app/pages/home/home-page.ts` (con sus tests y e2e).
- [x] **El texto de la vista en los móviles bajos:** se resuelve en la **fase 3c** (texto de presentación plegable): se muestra solo el H1 compacto y la descripción se pliega.
- [x] **Presupuesto del JS inicial:** aviso general a **320 kB** (error a 400) y, en `check-initial-bundle.mjs`, el **código propio** (`src/`) de los chunks iniciales ≤ **15 kB** (hoy, 11,61 kB).
- [x] **Planetas más realistas:** fase nueva **3b** (`docs/decisiones/FASE-3b-REALISMO.md`, D29).
- [x] **Interfaz inmersiva del sistema solar:** fase nueva **3c** (`docs/decisiones/FASE-3c-INTERFAZ.md`, D30 y D31): fichas de cuerpos con miniaturas, barra de tiempo con línea deslizante, «Controles +», la barra lateral como panel «Índice» desplegable (cerrado al entrar) y arranque a 3 días/s, salvo con movimiento reducido o con `?fecha=`.
- [x] **«El cielo desde España»** en lugar de «El cielo desde el Bajo Cinca» (`docs/decisiones/CAMBIO-CIELO-ESPANA.md`): selector con el Montsec por defecto, el Observatori Fabra, el Roque de los Muchachos, el Teide, Calar Alto, Madrid y Fraga, más «usar mi ubicación», en la ruta `/cielo` y con la zona horaria de cada lugar. La vista guiada de la Tierra pasa a «España».
- [x] `.codex/` y `AGENTS.md` (configuración local de Codex) en `.gitignore`.

## Antes del bloque C (fase 4: staging)
- [ ] Conectar el repo local con `https://github.com/IvanChesa/tierra-luna-sol` (público) y hacer el primer push. **Lo hace Iván o lo autoriza explícitamente**, porque publica el código. Si se hace con GitHub CLI: `winget install --id GitHub.cli` y `gh auth login`.
- [ ] Como el repo es público, conviene decidir antes del primer push la **licencia del código propio** (ver «Decisiones»): sin `LICENSE`, el código queda con todos los derechos reservados. Las texturas y los datos de terceros ya llevan sus licencias en `FUENTES.md` y en `/creditos`.
- [ ] En cPanel: subdominio `staging-tierra-luna-sol.ivanchesa.es` con AutoSSL y protegido con contraseña («Privacidad de directorios»).
- [ ] En cPanel: cuenta FTP limitada a la carpeta del staging.
- [ ] `gh secret set FTP_SERVER`, `FTP_USERNAME_STAGING` y `FTP_PASSWORD_STAGING` (la contraseña la escribe Iván).

## Decisiones
- [ ] **(Fase 6) `toktx` (KTX-Software):** solo si la Luna en 8K no cabe en la VRAM de §5 con WebP (prueba de KTX2 de la fase 2, §5.2 del informe).
- [ ] **Subdominio definitivo.** Propuesto: `tierra-luna-sol.ivanchesa.es`. Si cambia, se edita solo `src/app/core/site.config.ts`.
- [ ] **Licencia del código propio** (MIT u otra). El plan la dejaba para la fase 11, cuando el repo pasara a público; el repo de GitHub ya es público, así que conviene tenerla antes del primer push.

## Revisiones y pruebas de Iván
- [ ] Textos de los 30 cuerpos (120 textos con `reviewed: false`): lista de revisión con las citas que los respaldan en `docs/datos/textos-cuerpos.md`. En la **fase 9** (decisión del 24-10; antes «al final de las fases 1 y 8»).
- [ ] Textos de las vistas guiadas y de los recorridos (fases 5 y 6; en el plan v1, 4 y 5).
- [ ] Pruebas en el móvil real: por la URL de staging desde la fase 4 o, si no hay staging, por la red local (fases 4–10; en el plan v1, 4–9).
- [ ] Visto bueno final en el móvil (fase 10; en el plan v1, la 9).

## Fase 10
- [ ] Conseguir un iPhone para probar (aunque sea prestado).
- [ ] Decidir si se aprueba `@lhci/cli` (Lighthouse en el CI).

## Fase 11 (manual; era la fase 10 del plan v1)
- [ ] Crear el subdominio de producción en cPanel y activar AutoSSL.
- [ ] Crear una cuenta FTP limitada a la carpeta del subdominio.
- [ ] `gh secret set FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` (la contraseña la escribe Iván).
- [ ] Dar el OK a `indexable: true` y dar de alta el sitemap en Search Console. Con el plan v2 (D25) ya no se trabaja el sitemap: basta con el OK a `indexable: true`.
- [ ] Añadir la ficha del proyecto en ivanchesa.es.
