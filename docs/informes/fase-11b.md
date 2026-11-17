# Informe: Fase 11b (el cierre: la revisión del bloque F y la v1.0.1)

- **Rama:** `fase-11b-cierre` (desde `main` en `166ec37`)
- **Fecha:** 2026-11-17
- **Estado:** en curso

## 0. Plan

Instrucciones de la sesión de revisión (17-11): aplicar `docs/revisiones/bloque-F.md` con las decisiones de Iván («Haz lo recomendado») y publicar la **v1.0.1**. Es la última sesión del proyecto: después solo quedan las pruebas de Iván. Sin tocar Cloudflare fuera del despliegue de Pages.

1. **F12:** los PR de Dependabot #6, #8 y #7 (el #7, con Prettier en su rama), cada uno con su CI en verde; después, `main` en la rama y `npm ci`.
2. **F1:** el CLS de `/creditos` en producción: la causa, con la traza; el arreglo; y Lighthouse contra el build local (la mediana de 5 y el CLS de cada carga, en 0 en todas).
3. **F2–F11 y las decisiones 1–6:** §5 del plan con el explorador en ≥ 0,80; los textos de la decisión 4, en su origen y regenerados; todos con `reviewed: true` y `docs/revision-textos.md` regenerado; `PENDIENTES.md`, con solo lo de Iván.
4. **F13:** los worktrees y las ramas ya fusionadas, solo si cada uno está limpio.
5. `npm run check`, los e2e, este informe, la revisión por subagente y sus correcciones.
6. Fusión `--no-ff` en `main`, push, `v1.0.1`; Producción en verde; `curl` y Lighthouse en el dominio, con las cifras aquí.
7. CHANGELOG (v1.0.1) y DIARIO: el proyecto, cerrado.

## 1. Resumen

(En curso.)

## 2. Hallazgos de la revisión del bloque F

| # | Qué se ha hecho | Evidencia | Commit |
|---|---|---|---|
| F1 | **La causa:** el CSS crítico que Beasties mete en cada página escribía los dos `@property` de `styles.css` con un `;` de más (`…initial-value:0px;};.page{…}`). Para el navegador, `;.page{…}` es una regla con un selector no válido y la descarta: la página se pintaba sin el relleno ni el ancho de `.page` (16 px a los lados y 32 arriba, a 412 px). La hoja entera se aplica con el script del final del `<body>` y no bloquea el pintado: si llegaba después del primer pintado, todo se recolocaba (0,32 en 2 de 5 cargas en producción; en las otras 3, la hoja llegaba antes). **El arreglo:** los `@property`, en el `<style>` en línea de `index.html`, que el build no reescribe; y `prepare-pages.mjs` falla si el CSS en línea de alguna página lleva `};` | §4.1 | `ece0a9e` |
| F2 | `lighthouserc.js`: el CLS ≤ 0,05 como error, en la peor de las 5 cargas (`pessimistic`); las categorías, con la mediana; los patrones, `/` y `/?…` para el explorador y `/algo` para el contenido; el explorador, con su criterio (≥ 0,80) | §4.2 | `b97ecb2` |
| F3 | `deploy-production.yml`: etiquetas `v[0-9]+.[0-9]+.[0-9]+`; un paso que exige `vX.Y.Z` (también a mano) y que el commit esté en `main` (`git merge-base --is-ancestor`, con `fetch-depth: 0`); el CI buscado con `--branch main`. El entorno `production` y el ruleset de etiquetas, opcionales para Iván (`PENDIENTES.md`) | el workflow, en la publicación (§6) | `b97ecb2` |
| F4 | `ci.yml`: `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` | | `b97ecb2` |
| F5 | El aviso de llegada desde un eclipse, con `mounted()`, un render después de su región `role="status"`, como los de la URL | test en `notices.spec.ts`: el primer render (sin los `afterNextRender`), la región vacía; después, el aviso | `0dc495e` |
| F6 | `scene/engine.ts`: `placesWanted`, que guarda `setLabelsVisible` y usa `leaveSky` | test en `engine.spec.ts`: del cielo a la Tierra con `setLabelsVisible(false, true)`, los lugares vuelven y los demás nombres no | `6f228d6` |
| F7 | `isEclipsePeak` (`ephemeris/eclipse-search.ts`): la fecha es el máximo (±1 min) de un eclipse de ese tipo visto desde el lugar. Si no, `eclipseArrival` da `null` y el explorador avisa: «El eclipse «sol-total» no es el de esa fecha y se ha ignorado.» | tests en `eclipse-search.spec.ts`, `eclipse-arrival.spec.ts` y `notices.spec.ts` (`?fecha=2030-01-01T00:00:00Z&eclipse=sol-total`, otro tipo, una hora antes) | `0dc495e` |
| F8 | `--no-sandbox`, solo con `process.env.CI` | | `b97ecb2` |
| F9 | Un `AbortSignal` de `runTour` a `fetch`: el recorrido aborta su descarga anticipada al acabar o al saltarlo (`TourHost.prefetch` → `prefetchCloseUps` → `prefetchCloseUp` → `TextureSource.prefetch`) | tests en `home-tour.spec.ts` (abortada al parar y al acabar) y `engine.spec.ts` (la señal llega a la descarga) | `6f228d6` |
| F10 | `prepare-pages.mjs`: con el sitio indexable, fuera de `sitemap.xml` solo puede quedar `404.html`; si no, el build falla | `npm run build`: «39 URLs en sitemap.xml» de 40 páginas | `ece0a9e` |
| F11 | `renderer.ts`: cada `compileAsync` con su rechazo recogido al momento, y el primero se lanza al final. `renderer.spec.ts` comprueba en las fuentes de three los internos que usa (`compileAsync(scene, camera, targetScene)`, `currentProgram`, `getUniforms` y `getAttributes`): si un three nuevo los cambia, falla al subirlo | `renderer.spec.ts` | `1f303f2` |
| F12 | Los PR #6, #8 y #7, fusionados con su CI en verde (el #7, con Prettier 3.10.1 pasado en su rama: dos plantillas, sin cambio en el HTML) | §4.3 | |
| F13 | Los worktrees y las ramas fusionadas | §4.4 | |

## 3. Decisiones de Iván (17-11)

| # | Qué | Dónde |
|---|---|---|
| 1 | El explorador, **≥ 0,80** de rendimiento en Lighthouse, con su motivo; la accesibilidad y las buenas prácticas, ≥ 0,95; en el CI, con su criterio | `docs/PLAN.md` §5 (también «Arranque» y el CLS en cada carga), `lighthouserc.js` |
| 2 | D33 se queda: el arranque en tiempo real, descartado | `PENDIENTES.md` |
| 3 | La hidratación incremental de las fichas, al backlog | `docs/PLAN.md` §9.18 |
| 4 | Los textos dudosos, con las propuestas | §4.5 |
| 5 | Todos los textos, `reviewed: true` | los 140 de los cuerpos (`body-texts.json`), las 14 vistas y paradas de `tours.ts` y la línea de autoría; `docs/revision-textos.md`, regenerado |
| 6 | Los opcionales, cerrados como «no» (Proteo con su forma, «Sobre el proyecto» contando cómo se hizo, el explorador incrustable, las vistas previas privadas) | `PENDIENTES.md` y `docs/PLAN.md` §9.19; el entorno de GitHub y el ruleset, opcionales de Iván |

## 4. Evidencias

### 4.1 F1: el CLS de `/creditos`

- **Los JSON de producción de la fase 11** (`.lighthouseci/lhr-1794344122774-848700.json` y `lhr-1794344146922-267000.json`): CLS 0,3226 en las dos, un solo desplazamiento, el de `section[aria-labelledby=texturas]` (arriba en 332 px y 3669 de alto); en las otras tres cargas, 0. La hoja `styles-2UU55EJ4.css` llegaba a los 210 ms y el primer pintado era a los 231: una carrera.
- **No se reproduce a voluntad contra producción** (17-11, `lighthouse` 13.6 con el Chromium de Playwright): 6 cargas con la simulación de serie y 5 con `--throttling-method=devtools`, todas con CLS 0. Por eso se buscó la causa en el propio HTML.
- **La causa, en el CSS crítico de producción** (`curl` de `/creditos`): `@property --more-below{…;};@property --scroll-fade{…;};.page{display:block;width:100%;max-width:72rem;margin:0 auto;padding:…}`. Con la hoja entera bloqueada (Playwright, 412 × 823), el `h1` sale a 0 px del borde y a 56 px de arriba; con ella, a 16 y a 88; y la sección de las texturas, de 269 a 332 px (también es más alta: el texto, más estrecho, ocupa más líneas). Es justo el movimiento que mide Lighthouse.
- **Con el arreglo** (build local, `serve-dist.mjs`): el CSS crítico de `/creditos` ya no lleva `};`, sí `.page{` y los dos `@property` (en el `<style>` de `index.html`). La maqueta, con la hoja bloqueada y sin bloquear, **idéntica** en `/creditos`, `/sobre-el-proyecto` y `/planetas/marte` (`h1` a 16 px y 88 px; la sección, a 332 px).
- **Lighthouse contra el build local:** (pendiente: la mediana de 5 y el CLS de cada carga).

### 4.2 Lighthouse (local)

(Pendiente.)

### 4.3 F12: Dependabot

- **#6** (Angular, 11 paquetes: 22.2.4 → 22.2.6 y las herramientas a 22.2.7): con su CI en verde (lint, tests y build; e2e; Lighthouse), fusionado (`a063abc`).
- **#8** (`@lhci/cli` 0.16.0 → 0.16.1): `main` llevado a su rama (sin conflictos; `npm install --package-lock-only` no cambia el `package-lock.json`), su CI…
- **#7** (Prettier 3.8.1 → 3.10.1 y `typescript-eslint` 8.72.1 → 8.72.2): `main` llevado a su rama y Prettier pasado (`body-panel.html` y `body-detail-page.html`: el `>` de cierre de un enlace, que Prettier 3.8 dejaba en la línea siguiente; el HTML que sale es el mismo), `ng lint` sin errores; su CI…

### 4.4 F13: los worktrees

(Pendiente.)

### 4.5 Los textos (decisión 4)

| Duda | Antes → después | Origen |
|---|---|---|
| 1 Venus | Curiosidad 1: «Un día en Venus dura 243 días terrestres, más incluso que su año, que dura 225.» → «Venus tarda 243 días terrestres en girar sobre sí mismo, más incluso que en dar la vuelta al Sol, que le lleva 225.» Resumen: «unos 467 °C» → «más de 460 °C» | `scripts/content/body-texts.json` |
| 2 Umbriel y Proteo | «solo refleja el 16 % de la luz que recibe» y «el seis por ciento» → «solo refleja una pequeña parte de la luz (solar) que recibe» | `body-texts.json` |
| 3 Saturno | «Los anillos se extienden hasta 282.000 km del planeta» → «El sistema de anillos llega hasta 282.000 km del planeta» | `body-texts.json` |
| 4 Lunas recreadas | Las siete con mucho recreado ya decían «su superficie, en parte recreada» (fase 10); Proteo: «su color esquemático (no hay un mapa de su superficie)» → «sus cráteres recreados (no hay un mapa de su superficie)»; las variantes, en ESTILO §6 | `pages/body-detail/body-labels.ts`, `docs/ESTILO.md` |
| 5 Recorrido | «Pulsa «Saltar» o cualquier tecla…» → «Pulsa «Saltar el recorrido» o cualquier tecla…» | `features/tour/home-tour.ts` |
| 6 Créditos | «de páginas de NASA Science» → «de páginas de la NASA (casi todas, de NASA Science)» | `pages/credits/credits-page.html` |
| 7 Pope | «El rizo robado» se queda; la nota, al día | `body-texts.json` |
| 8 Mare Orientale | «una diana de unos 950 km» → «en el centro de una diana de unos 950 km» | `data/tours.ts` |
| 9 Lleida | Fuera de los créditos y de `places.ts` (no se usaba), con sus tests y `FUENTES.md` | `data/places.ts`, `credits-page.html` |
| 10 Teclas | «RePág» y «AvPág» del diálogo de los atajos → «Re Pág» y «Av Pág», como la línea de tiempo (y los comentarios y los tests) | `features/shortcuts/shortcuts.ts` |
| Venera | «las únicas» ya no estaba en «Sobre el proyecto» (fase 10, `fd37f7c`); quedaba en un comentario de `visual-config.ts`, quitado | `scene/visual-config.ts` |

- **`node scripts/build-body-texts.mjs`:** «30 cuerpos y 140 textos verificados» (cada cita, en su página); un aviso, esperado: «venus, resumen: la cifra 460 no aparece en las citas». «Más de 460 °C» es la redacción que eligió Iván: vale para los 467 °C de NASA Science (la cita) y los 464 °C de la tabla (NSSDCA), y la nota de Venus lo explica.
- **`reviewed: true`:** los 140 de `body-texts.json` (regenerados en `data/body-texts.ts` y `docs/datos/textos-cuerpos.md`, «Revisados: 140 de 140»), las 14 de `tours.ts` y la línea de autoría (`authorship.ts`); los tests que pedían `false` piden ahora `true`.
- **`docs/revision-textos.md`:** (pendiente: se regenera con el build final).

## 5. Desviaciones del plan y motivo

- **F5, el test:** `fixture.detectChanges()` ya ejecuta los `afterNextRender` y vuelve a pintar en la misma llamada, así que el test pinta primero solo la vista (`fixture.changeDetectorRef.detectChanges()`) y comprueba ahí que la región está vacía.
- **F7, un aviso:** la revisión dice «se ignora»; además se avisa, como con los demás parámetros que no valen (PLAN 3.d.9).
- **F11, el test lee las fuentes de three:** el renderer de WebGL no se puede crear en jsdom, así que el test busca en `node_modules/three/src` las firmas que se usan.

## 6. Salida de los checks

(Pendiente.)

## 7. Capturas

Sin cambios visuales salvo los textos (y, en `/creditos`, nada se mueve al cargar). Sin capturas nuevas.

## 8. Dependencias

Solo las versiones de Dependabot (F12): Angular 22.2.6/22.2.7, `@lhci/cli` 0.16.1, Prettier 3.10.1 y `typescript-eslint` 8.72.2. Ninguna nueva.

## 9. Pendientes

Solo los de Iván, en `docs/PENDIENTES.md` («Lo que queda de Iván»).
