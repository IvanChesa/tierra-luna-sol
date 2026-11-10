# Informe: Fase 11 (lanzamiento)

- **Rama:** `fase-11-lanzamiento`
- **Fecha:** 2026-11-10
- **Estado:** terminada: `v1.0.0` en producción (10-11), con un criterio ⚠️ (el rendimiento del explorador en Lighthouse, decisión de Iván)

## 0. Plan

Instrucciones de Iván y de la sesión de revisión (10-11): se lanza ya, antes de la revisión del bloque F (lo que salga se corrige y se vuelve a publicar); el dominio ya está conectado en Pages; `indexable: true`, con su OK; el NEL ya lo quita la zona en el subdominio; ivanchesa.com ya publica las páginas legales. Sin tocar Cloudflare fuera del despliegue de Pages.

1. **Tareas 1, 3 y 4 de la fase:**
   - `deploy-production.yml`: con una etiqueta `v*` (o a mano), espera al CI de ese commit, exige que acabe en verde, baja su artefacto `build` y lo publica con `--branch=main` (la producción de Pages); después, `verify-pages.mjs` en la dirección del despliegue y en el dominio propio.
   - README de portfolio (capturas, animación corta, stack, arquitectura, precisión y rendimiento medidos), CHANGELOG y la versión 1.0.0 en `package.json`.
   - `indexable: true` y lo que depende de ello: `robots.txt` con el sitemap y `sitemap.xml`, generados desde `site.config.ts` por `prepare-pages.mjs`; `noindex` solo en la 404; canónicos con el dominio definitivo (ya lo eran).
   - La nota del NEL en «Sobre el proyecto»: en el dominio propio no se envía. Los enlaces legales del pie, comprobados.
2. `npm run check`, los e2e, este informe, la revisión por subagente y sus correcciones.
3. Fusión `--no-ff` en `main`, push, etiqueta `v1.0.0` y su push; esperar al despliegue de producción en verde.
4. **Tarea 2, verificación en producción**, con cifras: `curl` de las rutas, del 404 y de las cabeceras (sin Set-Cookie, sin NEL ni Report-To, X-Robots-Tag solo en pages.dev); Lighthouse frente a §5; el panel de rendimiento, ausente; ninguna petición a terceros; `og:image`, una imagen del dominio que responde. Si algo falla, corregir y publicar `v1.0.1`.
   - **Cómo se juzga Lighthouse** (revisión, hallazgo 1): con el equipo libre, la mediana de 5 cargas de cada URL de la muestra (rendimiento, accesibilidad, buenas prácticas, LCP, CLS y TBT), comparada con §5 una a una, con ⚠️ o ❌ donde no llegue; no basta con `lhci assert` en verde, porque el rendimiento del explorador va como aviso. **Se sabe ya que el explorador no llega a 0,90** (0,76 en local en la fase 10): ese criterio no se cumple salvo que Iván elija la opción 1 de `PENDIENTES.md` (dejarlo como aviso).
   - **Si algo falla en el dominio y no en pages.dev** (revisión, sugerencia 15), la causa estará en la zona: el `robots.txt` gestionado de Cloudflare, Bot Fight Mode y su cookie `__cf_bm`, Rocket Loader, Zaraz o Web Analytics automático. El arreglo sería de Iván, en la zona.
5. **Tarea 5**, la lista para Iván en `PENDIENTES.md`, y el DIARIO.

## 1. Resumen

El sitio pasa a indexable, con `robots.txt` y `sitemap.xml` generados desde `site.config.ts`, y la producción se publica por etiqueta con `deploy-production.yml`, que reutiliza el build que verificó el CI. «Sobre el proyecto» dice ya que en el dominio propio no se envía Network Error Logging. El README es ya de portfolio, con capturas y una animación, y hay CHANGELOG. La verificación en producción (`verify-pages.mjs`, `verify-browser.mjs` y Lighthouse con `LHCI_BASE`) se completa al publicar `v1.0.0` (§12).

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| `v1.0.0` publicada en producción con HTTPS, desplegada por etiqueta | ✅ | La etiqueta `v1.0.0` (sobre `d271e40`) lanzó Producción (ejecución 42893254214): esperó al CI de ese commit (42893248484, en verde), publicó su artefacto con `--branch=main` y lo comprobó en tres direcciones. HTTPS en el dominio; `http://`, 301 a https (§12) |
| Las comprobaciones con `curl` y Lighthouse en producción cumplen §5 | ✅ `curl`; ⚠️ Lighthouse | `curl` y `verify-pages.mjs`, todo bien (39 de 39 en el workflow). Lighthouse: las 9 páginas de contenido, de 0,99 a 1,00 en rendimiento y 1,00 en accesibilidad y buenas prácticas; **el explorador, 0,84 de rendimiento** (§5 pide 0,90; 1,00 en lo demás, LCP 1,81 s y CLS 0,006): no se cumple, como se sabía; la decisión es de Iván (`PENDIENTES.md`, opción 1 recomendada) (§12) |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 11.1 `deploy-production.yml` | hecha (sin estrenar) | `.github/workflows/deploy-production.yml` |
| 11.2 Verificación en producción | hecha | §12 |
| 11.3 README, CHANGELOG y `v1.0.0` | hecha | La etiqueta `v1.0.0`, anotada, en GitHub |
| 11.4 `indexable: true` | hecha | `robots.txt` y `sitemap.xml` (39 URLs) generados; `noindex` solo en la 404 |
| 11.5 Lista para Iván | hecha | `PENDIENTES.md`, «Fase 11» |

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
- Tests: 835 passed (85 ficheros); cobertura de ephemeris/: 98,87 % de sentencias y 99,69 % de
  líneas (umbral, 90 %).
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

## 12. Verificación en producción (10-11, `v1.0.0`)

- **El workflow de Producción** (ejecución 42893254214, desde la etiqueta): «CI de d271e40 en verde: ejecución 42893248484 (main)»; `verify-pages.mjs` con el build del CI: la dirección del despliegue (`e67b4988.tierra-luna-sol.pages.dev`) y `tierra-luna-sol.pages.dev`, **38 de 39 y 1 aviso** cada una (el NEL, que en pages.dev se espera; las dos con su `noindex`); **`tierra-luna-sol.ivanchesa.com`, 39 de 39**, con el HTML servido idéntico al del build.
- **`curl -sI` en el dominio** (20:44 UTC): `/`, `/explorar/tierra`, `/explorar/luna`, `/cielo`, `/planetas`, `/planetas/marte`, `/lunas`, `/lunas/titan`, `/sol`, `/luna`, `/eclipses`, `/creditos` y `/sobre-el-proyecto`, 200 `text/html`; `/robots.txt`, 200 `text/plain`; `/sitemap.xml`, 200 `application/xml`; `/img/og.jpg`, 200 `image/jpeg`; `/no-existe`, **404**. En las 17 respuestas: **0 `Set-Cookie`, 0 `NEL`, 0 `Report-To` y 0 `X-Robots-Tag`** (también con GET en la portada). `http://` → 301 a `https://tierra-luna-sol.ivanchesa.com/`. `https://tierra-luna-sol.pages.dev/`: 200 con `x-robots-tag: noindex` (y su NEL).
- **`verify-pages.mjs` desde el PC**, en el dominio: 38 de 38 (sin `--build`); el NEL, en ninguna respuesta; og:image, 200 `image/jpeg`; `robots.txt` con el sitemap; `sitemap.xml` con 39 URLs.
- **`verify-browser.mjs`** (Chromium con la GPU): las cinco vistas del explorador y cinco páginas, **sin el panel de rendimiento**; **372 peticiones, todas al dominio, 0 a otros dominios**; 0 cookies; sin errores en la consola.
- **Lighthouse en producción** (`LHCI_BASE`, móvil de Lighthouse, la mediana de 5 cargas por URL; los informes, solo en el disco):

| URL | Rendimiento | Accesibilidad | Buenas prácticas | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` (explorador) | **0,84** ⚠️ (§5: ≥ 0,90) | 1,00 | 1,00 | 1,81 s | 0,006 | 611 ms |
| `/planetas/marte` | 1,00 | 1,00 | 1,00 | 0,84 s | 0 | 79 ms |
| `/planetas/saturno` | 1,00 | 1,00 | 1,00 | 0,85 s | 0 | 82 ms |
| `/lunas/titan` | 0,99 | 1,00 | 1,00 | 0,84 s | 0 | 81 ms |
| `/sol` | 1,00 | 1,00 | 1,00 | 0,83 s | 0 | 73 ms |
| `/luna` | 1,00 | 1,00 | 1,00 | 0,83 s | 0 | 79 ms |
| `/planetas` | 0,99 | 1,00 | 1,00 | 0,83 s | 0 | 93 ms |
| `/lunas` | 1,00 | 1,00 | 1,00 | 0,84 s | 0 | 86 ms |
| `/sobre-el-proyecto` | 1,00 | 1,00 | 1,00 | 0,85 s | 0 | 77 ms |
| `/creditos` | 1,00 | 1,00 | 1,00 | 0,86 s | 0 | 80 ms |

  Frente a §5: las fichas y las demás páginas cumplen (≥ 0,95 en las tres categorías, LCP ≤ 2,5 s, CLS ≤ 0,05). El explorador cumple la accesibilidad, las buenas prácticas, el LCP y el CLS, pero **no el rendimiento (0,84 frente a 0,90)**: el TBT de crear el contexto WebGL (fase 10, §4.22). Mejor que en local (0,76), y pendiente de la decisión de Iván. `lhci assert` sale con error por esa URL: el explorador casa también con el patrón de las páginas de contenido (≥ 0,95) contra producción, y no se ha investigado por qué (en local no pasa); va a `PENDIENTES.md`. Medido con otras sesiones de Claude abiertas en el PC (procesos con CPU acumulada): las fichas, en el techo, no lo notan; la cifra del explorador puede variar algo.
- **Sin `v1.0.1`:** nada del sitio ha fallado; lo único que no llega es el rendimiento del explorador, que no es un arreglo de esta fase.

---

## Respuesta a la revisión

Revisión del subagente: **APROBADA CON CAMBIOS MENORES** (`docs/revisiones/fase-11.md`): 0 Bloqueantes, 1 Importante, 13 Menores y 2 Sugerencias. Corregidos todos menos lo que va a producción (la verificación se hace tras publicar, §12).

| Hallazgo | Acción | Commit |
|---|---|---|
| 1 (Importante) Cómo se juzga Lighthouse frente a §5 | §0, paso 4, y §2: la mediana de 5 cargas por URL, comparada con §5 una a una (rendimiento, accesibilidad, buenas prácticas, LCP, CLS y TBT); el explorador, ya sabido que no llega a 0,90 (decisión de Iván) | este |
| 2 `workflow_dispatch` con cualquier ref | `if: startsWith(github.ref, 'refs/tags/v')` en el trabajo | este |
| 3 Un fallo pasajero de `gh run list` cortaba la espera | Si falla, un aviso y `run=''`: se vuelve a mirar a los 30 s | este |
| 4 El dominio repetido en el workflow | Se lee de `site.config.ts` en un paso («El dominio») | este |
| 5 Sin comprobar `tierra-luna-sol.pages.dev` | Añadida a la verificación del workflow (tres direcciones) | este |
| 6 El NEL solo en `/` y peticiones fuera del registro | `record()`: `Set-Cookie`, `NEL` y `Report-To` en todas las respuestas, también las de los `Link` y la de `http://` | este |
| 7 La nota del NEL, con cuatro complementos e inexacta | Reescrita como propone la revisión; e2e ajustado y `docs/revision-textos.md` regenerado | este |
| 8 e2e 151/152 y Lighthouse en las vistas previas | «153 e2e» en el README y el CHANGELOG; las vistas previas, «lint, tests, build y e2e»; la producción, con todo el CI | este |
| 9 Cifras más redondas que su fuente | Fobos en alto a 1 día/s (5–9 FPS, a propósito), CLS ≤ 0,006, el JS inicial con aviso y error, axe «sin violaciones graves ni críticas» | este |
| 10 «98,87 % de líneas» | 98,87 % de sentencias y 99,69 % de líneas | este |
| 11 `PENDIENTES.md` desfasado | El NEL, los enlaces legales, el dominio, `indexable` e ivanchesa.com, cerrados; Search Console, opcional | este |
| 12 `og:image` con el dominio real | `verify-pages.mjs` comprueba que responde 200 y es una imagen; la vista previa en una app real, para Iván (`PENDIENTES.md`) | este |
| 13 La captura de la Tierra, casi solo el Pacífico | Rehecha a las 17:00 UTC (Sudamérica de día y África al anochecer), con su texto alternativo | este |
| 14 (Sugerencia) La espera de 45 min | El `::error::` dice que se relance Producción desde la etiqueta; el comentario, que relanzar el CI vuelve a publicar la vista previa | este |
| 15 (Sugerencia) Diagnóstico si falla solo el dominio | Apuntado en §0, paso 4 | este |

Tras las correcciones: `npm run check` en verde (835 tests; build sin avisos de presupuesto), las imágenes del README rehechas y `e2e/contenido.spec.ts`, 18 en verde.
