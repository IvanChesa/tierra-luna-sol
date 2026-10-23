# Pendientes

Decisiones y tareas que dependen de Iván. Claude Code añade aquí cada `TODO(ivan):`.

## Ya hecho
- [x] Actualizar Node (v24.22.1).
- [x] Recolocar el `.git` de ivanchesa.es (23-10).
- [x] Dirección visual: **A, «Carta celeste»** (23-10).
- [x] Aceptar `@eslint/js` y `typescript-eslint` en la lista de dependencias (23-10).
- [x] Alcance: **versión 1 con paridad completa con el original + mejoras** (23-10).
- [x] Cambios al plan propuestos en el informe de la fase 0 (`ng new` desde la carpeta padre, `OnPush` sin declarar, dependencias de lint) (23-10).
- [x] `/404` siempre con `noindex` y fuera del sitemap (hallazgo 5 de la revisión de la fase 0): incluido en la fase 8 del plan v1; recordatorio `TODO(fase-8)` en `src/app/app.routes.ts`.

## Cuanto antes (ideal antes de la fase 1)
- [ ] Instalar GitHub CLI: `winget install --id GitHub.cli`, luego `gh auth login`.
- [ ] Crear el repo privado en GitHub y hacer el primer push, para que corra el CI.

## Decisiones
- [ ] **Subdominio definitivo.** Propuesto: `tierra-luna-sol.ivanchesa.es`. Si cambia, se edita solo `src/app/core/site.config.ts`.
- [ ] **Licencia del código propio** cuando el repo pase a público (MIT u otra).
- [ ] **Vistas guiadas de la Tierra** (fase 4). Propuesta: Tierra completa, Pacífico, Himalaya, luces nocturnas y España / Bajo Cinca.
- [ ] **Líneas de constelaciones** en el cielo del Bajo Cinca (fase 7): solo si hay una fuente con licencia compatible.

## Revisiones y pruebas de Iván
- [ ] Textos de los 29 cuerpos (`reviewed: false`), al final de las fases 1 y 8.
- [ ] Textos de las vistas guiadas y de los recorridos (fases 4 y 5).
- [ ] Pruebas en el móvil real por la red local (fases 4–9).
- [ ] Visto bueno final en el móvil (fase 9).

## Fase 10 (manual)
- [ ] Crear el subdominio en cPanel y activar AutoSSL.
- [ ] Crear una cuenta FTP limitada a la carpeta del subdominio.
- [ ] `gh secret set FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` (la contraseña la escribe Iván).
- [ ] Dar el OK a `indexable: true` y dar de alta el sitemap en Search Console.
- [ ] Añadir la ficha del proyecto en ivanchesa.es.
