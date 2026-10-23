# Pendientes

Decisiones y tareas que dependen de Iván. Claude Code añade aquí cada `TODO(ivan):`.

## Antes de la fase 0
- [x] **Actualizar Node.** Hecho: v24.22.1 (Angular 22 pide ≥ 22.22.3 o ≥ 24.15).
- [x] **Recolocar el `.git` de ivanchesa.es** (hecho el 23-10). Al mover las carpetas, `C:\Users\ivan\Ivan Chesa AI\.git` se quedó fuera de `ivan-chesa.es\`. Mientras siga ahí, el proyecto ivanchesa.es aparece como «todo borrado» y este proyecto queda dentro de ese repo.
- [ ] Instalar GitHub CLI: `winget install --id GitHub.cli` y luego `gh auth login`.

## Decisiones
- [ ] **Subdominio definitivo.** Propuesto: `tierra-luna-sol.ivanchesa.es`. Si cambia, se edita solo `src/app/core/site.config.ts`.
- [ ] **Dirección visual:** elegir entre las 2 propuestas de `docs/DISENO.md` (fin de la fase 0). Aplicada provisionalmente la A.
- [ ] **Dependencias de lint:** ¿se aceptan `@eslint/js` y `typescript-eslint` (las instala `ng add angular-eslint`) dentro de la lista cerrada? Ver `docs/informes/fase-0.md` §9.
- [ ] **Propuestas de cambio al plan de la fase 0** (comando de `ng new`, `OnPush` por defecto y lista de dependencias): `docs/informes/fase-0.md` §10.
- [ ] **Licencia del código propio** cuando el repo pase a público (MIT u otra).
- [ ] **¿Repo público desde el principio o solo al lanzar?** Recomendado: privado hasta el lanzamiento.

## Revisiones de contenido
- [ ] Textos de las fichas de los 10 cuerpos (`reviewed: false`), al final de las fases 1 y 5.

## Fase 7 (manual)
- [ ] Crear el repo en GitHub.
- [ ] Crear el subdominio en cPanel y activar AutoSSL.
- [ ] Crear una cuenta FTP limitada a la carpeta del subdominio.
- [ ] `gh secret set FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` (la contraseña la escribe Iván).
- [ ] Dar de alta el sitemap en Search Console después del lanzamiento.
- [ ] Añadir la ficha del proyecto en ivanchesa.es.
