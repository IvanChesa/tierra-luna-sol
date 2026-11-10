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

(Se completa al cerrar.)

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
```
