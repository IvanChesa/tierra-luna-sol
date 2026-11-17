# Revisión: Bloque F (fases 10 y 11, con la entrega 10.a)

Veredicto: **CAMBIOS NECESARIOS, sin Bloqueantes.** El sitio ya está publicado (v1.0.0). Lo de aquí se corrige y se publica como **v1.0.1**.

- **Fecha:** 2026-11-17. Sesión de revisión.
- **Qué se ha revisado:** `main` en `55f78db` (diff `429526b..origin/main`, 174 archivos).
- **Cómo:** con un revisor de código independiente (subagente sin el contexto de la sesión) para `src/`, los workflows, `lighthouserc.js` y `public/_headers`. Las capturas de la 10.a y del bloque F las miró la sesión de revisión durante el bloque (09-11 y 10-11).

## Comprobado por la sesión de revisión

| Qué | Resultado |
|---|---|
| `npm run check` en `main` (`npm ci` y check, 17-11) | ✅ 835 tests en 85 archivos; el JS inicial de las 40 páginas, sin `three`, `astronomy-engine`, stores ni controles; código propio inicial, 13,98 kB de 15 |
| CI de `main` (`55f78db`) | ✅ en verde (10-11) |
| Producción (`curl`, 17-11) | ✅ `/`, `/sol` y `/creditos` responden 200, `/no-existe` responde 404 y `/explorar` redirige con 301. Sin `Set-Cookie`, NEL ni Report-To; HSTS y una CSP que solo admite lo propio |
| La 10.a (D48), con capturas antes y después, seis vistas y de cerca | ✅ visto bueno el 09-11 (antes de juntarla) |
| ivanchesa.com enlaza al proyecto | ✅ |
| Lighthouse del explorador | ⚠️ 0,84 en producción frente a 0,90: decisión de Iván, abajo |

## Hallazgos

| # | Severidad | Archivo:línea | Hallazgo | Qué hacer |
|---|---|---|---|---|
| F1 | Importante | `docs/informes/fase-11.md:118`; `.lighthouseci/lhr-1794344122774*` y `lhr-1794344146922*` | En producción, `/creditos` da **CLS 0,323 en 2 de 5 cargas** (rendimiento 0,84). Se mueve `main > tls-credits-page > section[aria-labelledby=texturas]`. El informe atribuye el error de `lhci assert` a que el patrón de las fichas casa con el explorador, y no es así: LHCI compara con `finalUrl`, y `^…/.+` no casa con `/`. El error es de `/creditos`. Comprobado por la sesión de revisión con los JSON | Encontrar la causa con la traza. Las sospechosas, sin confirmar: la hoja diferida de Beasties (`media="print"`) y el `swap` de Newsreader. Arreglarla y corregir el informe y `PENDIENTES.md` |
| F2 | Menor | `lighthouserc.js:64-66` y `:98-101` | El CI no vigila el CLS (el rendimiento va como aviso), así que F1 no salió en rojo. Además, el patrón del explorador depende de `finalUrl`: con `finalDisplayedUrl` (`/?cuerpo=saturno`) pasaría al patrón de contenido | Añadir `'cumulative-layout-shift': ['error', { maxNumericValue: 0.05, aggregationMethod: 'pessimistic' }]`. Las categorías, con `aggregationMethod: 'median'`. Patrones: explorador `` `^${escape(BASE)}/(?:[?#].*)?$` ``; contenido `` `^${escape(BASE)}/[^?#]+` ``. El explorador, con su criterio nuevo (decisión 1) |
| F3 | Menor | `deploy-production.yml:14`, `:29`, `:66-69` | Producción sale de cualquier etiqueta `v*` sobre cualquier commit con el CI en verde, aunque no esté en `main` | Etiquetas `v[0-9]+.[0-9]+.[0-9]+`; checkout con `fetch-depth: 0` y `git merge-base --is-ancestor "$sha" origin/main`; `--branch main` en `gh run list`. (El entorno `production` para los secrets y el ruleset de etiquetas quedan como opcionales para Iván, en `PENDIENTES.md`) |
| F4 | Menor | `ci.yml:15-17` | `cancel-in-progress: true` también en `main`: dos pushes seguidos cancelan el CI del primero, y etiquetar ese commit falla con «cancelled» | `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` |
| F5 | Menor | `features/explorer-ui/notices.ts:38` | El aviso de llegada desde un eclipse se pinta en el mismo render que su región `role="status"`, así que el lector de pantalla no lo anuncia (los avisos de la URL ya usan `mounted()`) | `@if (mounted() && session.eclipseArrival(); as arrival)`, con su test |
| F6 | Menor | `scene/engine.ts:912-915` y `:1925` | `setLabelsVisible(visible, places)` no guarda `places`, y `leaveSky` vuelve con `labelsWanted`. Con el recorrido lanzado desde `/cielo`, la parada de España se queda sin los nombres de los lugares | Guardar `placesWanted` y usarlo en `leaveSky`, con su test |
| F7 | Menor | `features/viewer/viewer-params.ts:206`; `explorer-ui/eclipse-arrival.ts:20` | `?eclipse=` no se contrasta con la fecha: `?fecha=2030-01-01&eclipse=sol-total` hace decir al sitio «Eclipse total de Sol del 1 de enero de 2030». Un enlace puede afirmar un dato falso en nombre de la web | Aceptarlo solo si esa fecha tiene ese eclipse (`ephemeris/eclipse.ts`); si no, se ignora. Con test |
| F8 | Sugerencia | `lighthouserc.js:87-89` | `--no-sandbox` va siempre, también al medir producción desde el PC de Iván | Solo con `process.env.CI` |
| F9 | Sugerencia | `scene/textures.ts:248-256`; `features/tour/home-tour.ts:74` | Al saltar el recorrido, la descarga anticipada de las texturas grandes de la Tierra y de la Luna sigue: varios MB en el móvil sin usar | Un `AbortSignal` en `prefetch`, que se aborta al acabar o al saltar |
| F10 | Sugerencia | `scripts/prepare-pages.mjs:108` | Si cambia la serialización del canonical, las páginas salen del `sitemap.xml` sin aviso | Comprobar que el sitemap tiene tantas URL como páginas, menos la 404 |
| F11 | Sugerencia | `scene/renderer.ts:145-179` | La compilación por partes usa internos de three y lanza varios `compileAsync` sin esperarlos (posible «Uncaught (in promise)») | Capturar cada promesa. Un test que avise si cambian esos internos al subir three |
| F12 | Menor | PR #6, #7 y #8 de Dependabot | Abiertos. El #7 (Prettier 3.10.1 y typescript-eslint) falla en el lint: el Prettier nuevo formatea distinto `src/app/features/body-panel/body-panel.html` | Fusionarlos con su CI en verde. En el #7, pasar Prettier en su rama |
| F13 | Menor | `.claude/worktrees/` y carpetas temporales | Quedan 7 worktrees ya fusionados (9b.e, 9b.f-sol-2, 9b.f-tierra, 9c, 10a y dos temporales) y sus ramas | Quitarlos con `git worktree remove` (comprobando antes que están limpios) y borrar las ramas fusionadas, locales y remotas |

## Decisiones de Iván (17-11: «Haz lo recomendado»)

1. **Lighthouse del explorador:** se acepta. El criterio de rendimiento del explorador pasa a **≥ 0,80** en §5 del plan, con su motivo (página 3D: lo que falta es crear el contexto WebGL, que no se trocea). La accesibilidad y las buenas prácticas siguen en ≥ 0,95. En el CI, el explorador, con su criterio.
2. **El arranque en tiempo real (S10):** no. **D33 se queda** y la duda se cierra.
3. **La hidratación incremental de las fichas:** no se hace (el código inicial cumple: 13,98 de 15 kB). Al backlog.
4. **Los 10 textos dudosos** (`docs/revisiones/textos.md` §3): se aplican las propuestas.
   - 1: la de Venus, con «más de 460 °C».
   - 3: «El sistema de anillos llega hasta 282.000 km del planeta».
   - 7: se deja «El rizo robado».
   - 8: «en el centro de una diana de unos 950 km».
   - 9: Lleida, fuera de los créditos y de `places.ts`, si no se usa.
   - 10: «Re Pág» y «Av Pág».
   - Además, «las únicas en color» de las Venera no tiene fuente: se quita «las únicas» y la frase dice solo lo comprobable.
5. **Todos los textos pasan a `reviewed: true`**: los de los cuerpos, las vistas guiadas y los recorridos, después de la comprobación de los 551 en la fase 10 y de estas correcciones. Se regenera `docs/revision-textos.md`.
6. **Los opcionales se cierran como «no»**, y se apunta en `PENDIENTES.md`:
   - Proteo con su forma (sigue siendo una esfera);
   - «Sobre el proyecto» contando cómo se hizo;
   - el explorador incrustable;
   - las vistas previas privadas.
   El entorno `production` de GitHub y el ruleset de etiquetas (F3) quedan como opcionales de Iván.

## Para aplicar esta revisión

Una sesión en `main`, en la rama `fase-11b-cierre`:
1. F12 primero: los PR de Dependabot.
2. Después, F1–F11, las decisiones 1–6 y F13.
3. `npm run check`, los e2e y una revisión por subagente.
4. Fusión `--no-ff` en `main`, la etiqueta `v1.0.1` y la verificación en producción: `curl`, y Lighthouse con la mediana de 5 y el CLS de `/creditos`.
5. El DIARIO y `PENDIENTES.md`, con solo lo que es de Iván. Después, para.

Lo que queda solo de Iván:
- las pruebas en su móvil y en un iPhone;
- la prueba con un lector de pantalla de verdad;
- la difusión y la vista previa del enlace en una app;
- opcional: el sitemap en Search Console, y el entorno y el ruleset de GitHub (F3).
