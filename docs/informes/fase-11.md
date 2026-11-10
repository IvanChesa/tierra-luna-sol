# Informe: Fase 11 (lanzamiento)

- **Rama:** `fase-11-lanzamiento`
- **Fecha:** 2026-11-10
- **Estado:** en curso: hecho lo de la rama; falta la revisión, la publicación con `v1.0.0` y la verificación en producción

## 0. Plan

Instrucciones de Iván y de la sesión de revisión (10-11): se lanza ya, antes de la revisión del bloque F (lo que salga se corrige y se vuelve a publicar); el dominio ya está conectado en Pages; `indexable: true`, con su OK; el NEL ya lo quita la zona en el subdominio; ivanchesa.com ya publica las páginas legales. Sin tocar Cloudflare fuera del despliegue de Pages.

1. **Tareas 1, 3 y 4 de la fase:**
   - `deploy-production.yml`: con una etiqueta `v*` (o a mano), espera al CI de ese commit, exige que acabe en verde, baja su artefacto `build` y lo publica con `--branch=main` (la producción de Pages); después, `verify-pages.mjs` en la dirección del despliegue y en el dominio propio.
   - README de portfolio (capturas, animación corta, stack, arquitectura, precisión y rendimiento medidos), CHANGELOG y la versión 1.0.0 en `package.json`.
   - `indexable: true` y lo que depende de ello: `robots.txt` con el sitemap y `sitemap.xml`, generados desde `site.config.ts` por `prepare-pages.mjs`; `noindex` solo en la 404; canónicos con el dominio definitivo (ya lo eran).
   - La nota del NEL en «Sobre el proyecto»: en el dominio propio no se envía. Los enlaces legales del pie, comprobados.
2. `npm run check`, los e2e, este informe, la revisión por subagente y sus correcciones.
3. Fusión `--no-ff` en `main`, push, etiqueta `v1.0.0` y su push; esperar al despliegue de producción en verde.
4. **Tarea 2, verificación en producción**, con cifras: `curl` de las rutas, del 404 y de las cabeceras (sin Set-Cookie, sin NEL ni Report-To, X-Robots-Tag solo en pages.dev); Lighthouse frente a §5; el panel de rendimiento, ausente; ninguna petición a terceros. Si algo falla, corregir y publicar `v1.0.1`.
5. **Tarea 5**, la lista para Iván en `PENDIENTES.md`, y el DIARIO.

## 1. Resumen

El sitio pasa a indexable, con `robots.txt` y `sitemap.xml` generados desde `site.config.ts`, y la producción se publica por etiqueta con `deploy-production.yml`, que reutiliza el build que verificó el CI. «Sobre el proyecto» dice ya que en el dominio propio no se envía Network Error Logging. El README es ya de portfolio, con capturas y una animación, y hay CHANGELOG. La verificación en producción (`verify-pages.mjs`, `verify-browser.mjs` y Lighthouse con `LHCI_BASE`) se completa al publicar `v1.0.0` (§4).

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| `v1.0.0` publicada en producción con HTTPS, desplegada por etiqueta | pendiente | §4 |
| Las comprobaciones con `curl` y Lighthouse en producción cumplen §5 | pendiente | §4 |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 11.1 `deploy-production.yml` | hecha (sin estrenar) | `.github/workflows/deploy-production.yml` |
| 11.2 Verificación en producción | pendiente | §4 |
| 11.3 README, CHANGELOG y `v1.0.0` | README y CHANGELOG hechos; la etiqueta, al publicar | |
| 11.4 `indexable: true` | hecha | `robots.txt` y `sitemap.xml` (39 URLs) generados; `noindex` solo en la 404 |
| 11.5 Lista para Iván | pendiente | `PENDIENTES.md` |

## 4. Desviaciones del plan y motivo

- **El sitemap:** D25 decía «sin sitemap trabajado». Iván lo pide ahora como parte de `indexable: true`, y se genera solo (`prepare-pages.mjs`), sin lista a mano: el canónico de cada página prerenderizada que no lleva `noindex`. Así no hay que mantenerlo.
- **`robots.txt` sale del build y no de `public/`:** para citar el sitemap con el dominio de `site.config.ts` sin escribirlo en un segundo sitio (regla de la configuración única).
- **Lighthouse en producción:** la condición «contra el build local» de `@lhci/cli` es la del CI; la tarea 2 de esta fase pide medir el sitio publicado. Con `LHCI_BASE`, la misma muestra y los mismos presupuestos, con los informes solo en el disco y el Chromium de Playwright.

## 5. Decisiones técnicas nuevas

- **`deploy-production.yml` reutiliza el artefacto del CI por commit:** busca con `gh run list --commit` la ejecución del CI del push de ese commit, espera a que termine (hasta 45 min) y exige que acabe en verde; si no, no publica. Alternativas descartadas: volver a construir en el workflow de producción (no sería el build verificado, D26) o encadenarlo con `workflow_run` (no sabe de etiquetas). Límite: el artefacto dura 7 días; para volver a una versión más antigua, «Rollback» en el panel de Pages o relanzar su CI.
- **`verify-pages.mjs`, más estricto en el dominio propio:** el NEL y el X-Robots-Tag, como error (en pages.dev, el NEL sigue como aviso y el `noindex`, obligatorio); en todas las direcciones, sin `Set-Cookie`, `robots.txt` con el sitemap, `sitemap.xml` y `noindex` solo en la 404. El workflow de producción lo pasa en la dirección del despliegue y en el dominio.
- **`scripts/verify-browser.mjs`:** en el navegador (con la GPU), las cinco vistas del explorador y cinco páginas: ninguna petición a otro dominio, ninguna cookie, ningún error en la consola y sin el panel de rendimiento de desarrollo.
- **La versión 1.0.0 en `package.json`**, la de la etiqueta.

## 6. Salida de los checks

```
npm run check (10-11, rama fase-11-lanzamiento)
- ng lint: All files pass linting; Prettier, bien.
- Tests: 835 passed (85 ficheros); cobertura de ephemeris/: 98,87 % de líneas (umbral, 90 %).
- Build: sin avisos de presupuesto. Initial total 319,67 kB en bruto (90,23 kB transferidos).
- Pages: 39 rutas como ruta.html, 40 páginas, 386 rutas de recursos absolutas, 4 scripts en línea en
  la CSP, 39 URLs en sitemap.xml, 295 ficheros.
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor; código propio en los chunks iniciales, 13,98 kB de 15.
- check-links: 40 páginas, 1243 enlaces internos bien.

npx playwright test (sobre el mismo build, en local, Windows)
- 140 passed, 13 skipped (la regresión visual, que solo se compara en Linux, y la de 320 px), 7,6 min.
  Uno más que en la fase 10: el de sitemap.xml.
```

Enlaces legales del pie, comprobados el 10-11 con `curl`: `https://ivanchesa.com/aviso-legal/` y `https://ivanchesa.com/privacidad/`, **200** (sin la barra final, 308 a la URL con ella; el pie ya usa la de la barra).

## 7. Capturas

Sin cambios visuales en la interfaz (solo un texto de «Sobre el proyecto»). Las imágenes del README, en `docs/img/readme/` (`node scripts/capture-readme.mjs`, con la GPU y `?captura=1`): `portada`, `tierra`, `luna`, `saturno`, `cielo` y `ficha` (960 px, 25–33 kB) y `sistema-solar.webp`, la animación (24 fotogramas, uno cada 15 días de 2026, 800 px, 136 kB).

## 8. Dependencias añadidas

Ninguna.

## 9. Pendientes y `TODO(ivan)`

Se quita el `TODO(ivan)` de los enlaces legales (`site.config.ts`): ivanchesa.com ya responde. La lista para Iván, en `PENDIENTES.md` al cerrar (§0, paso 5).

## 11. Cómo probarlo

- `npm run build` y mirar `dist/tierra-luna-sol/browser/robots.txt` y `sitemap.xml`.
- `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-pages.mjs https://tierra-luna-sol.ivanchesa.com`
- `node scripts/verify-browser.mjs https://tierra-luna-sol.ivanchesa.com`
- `LHCI_BASE=https://tierra-luna-sol.ivanchesa.com npm run lighthouse`
