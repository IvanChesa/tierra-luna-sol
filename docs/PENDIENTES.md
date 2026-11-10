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

### Decisiones del 27-10 (revisión del bloque R, `docs/revisiones/bloque-R.md`)
- [x] **Propuestas de la fase 3c, aprobadas:** pintar a la frecuencia que pide el movimiento (fase 10), Lighthouse con `@lhci/cli` desde la fase 10 si se aprueba la dependencia y, hasta entonces, con las métricas de arranque (§5), y regenerar las miniaturas de las lunas con la latitud sobre la eclíptica (fase 7).
- [x] **Propuestas de la fase 3b:** la 2 (relación de brillo océano / tierra de EPIC) a la **fase 5** (R3); la 3, al **backlog**, salvo el anillo de luz del limbo de Saturno a contraluz, que pasa a la **fase 7** (R2).
- [x] **Licencia del código propio: MIT** (D32): `LICENSE` con «Copyright (c) 2026 Iván Chesa Lapena», y la nota de las licencias de terceros en el README y en `/creditos`.
- [x] **Primer push autorizado** a `https://github.com/IvanChesa/tierra-luna-sol` (público), al empezar la fase 4, sin `--force`, y push tras cada fusión.
- [x] **Hosting: Cloudflare Pages** (plan gratuito), en lugar de Banahosting por FTPS: despliegue desde GitHub Actions con `cloudflare/wrangler-action` fijado por SHA (el build del CI, sin builds de Cloudflare; proyecto `tierra-luna-sol`), vista previa por rama en lugar del staging de cPanel, `_headers` y `_redirects` en lugar de `.htaccess`, la barra final revisada con el comportamiento de Pages, ninguna textura de más de 25 MiB y sin Cloudflare Web Analytics (D9, D17, D23, D24 y D26). Los secrets `CLOUDFLARE_API_TOKEN` (solo con permiso de Pages) y `CLOUDFLARE_ACCOUNT_ID` ya están en el repo.
- [x] **El texto de las pistas:** «usa la rueda o pellizca para acercarte» (R4).
- [x] **Las capturas de la fase 3c, comparadas con la referencia** en la revisión del bloque R: misma estructura, con nuestro estilo.

### Decisiones del 27-10 (fase 4b, `docs/decisiones/FASE-4b-SISTEMA-SOLAR.md`)
- [x] **Fase 4b, antes de la 5:** la velocidad según el contexto (**D33**: 3 días/s en la vista general y 1 h/s al enfocar un cuerpo; sustituye a la de entrada de D31), las estelas de color de los planetas (**D34**) y planetas más visibles en la vista general.

### Decisiones del 27-10 (antes de la revisión)
- [x] **Velocidad de entrada (D31):** el explorador arranca reproduciendo a **3 horas por segundo**, no a 3 días; se añade el escalón de 3 h/s (quedan nueve). Con movimiento reducido o con `?fecha=`, sigue arrancando en pausa. En el plan (D31 y fase 3c), en `CLAUDE.md`, en `ESTILO.md` §3, en los tests y en los e2e.
- [x] **Bloom de la fase 3b (tarea 7):** pasa a la **fase 10 como opcional** (tarea 9 de la fase 10 en el plan). Solo en el nivel alto y con el fondo pintado dentro de la escena (informe de la fase 3b, §4.1). Antes estaba pendiente de decidir entre quitarlo, llevarlo al backlog o retomarlo.

## Bloque C (fase 4: Cloudflare Pages)
- [x] Primer push a `https://github.com/IvanChesa/tierra-luna-sol` (público): **autorizado** por Iván (revisión del bloque R). Si Git pide credenciales, Iván inicia sesión en la ventana que se abra.
- [x] Licencia del código propio: **MIT** (D32).
- [x] Secrets de Cloudflare en el repo: `CLOUDFLARE_API_TOKEN` (solo con permiso de Pages) y `CLOUDFLARE_ACCOUNT_ID` (27-10).
- [x] **Abrir la vista previa en tu móvil** (fase 4): Iván probó staging (https://staging.tierra-luna-sol.pages.dev, `main` con la fase 6) en su móvil el 31-10 y va bien.
- [ ] (Opcional) **Vistas previas privadas:** son públicas (con `noindex`). Si las quieres con acceso restringido, en el panel de Cloudflare: Pages → `tierra-luna-sol` → Settings → «Access policy» (Cloudflare Access, gratis hasta 50 usuarios).
- [x] **Web Analytics desactivado** en el proyecto de Cloudflare (D24): comprobado por Iván en el panel el 31-10.
- [x] **Network Error Logging de Cloudflare (D24).** Decidido el 30-10 (revisión del bloque C, C8): se **acepta como telemetría del propio alojamiento** (solo informa de las peticiones que fallan) y se explica en la privacidad (fase 9); en la fase 11, con el dominio propio, se mira si la zona permite desactivarlo. **Desactivado en el dominio propio** (fase 11, 10-11): lo apagó la sesión de ivanchesa.com y una regla de la zona quita `NEL` y `Report-To` en el subdominio; solo sale en las direcciones de pages.dev. `verify-pages` lo da como error en el dominio y como aviso en pages.dev; «Sobre el proyecto» lo cuenta.
- [ ] (Opcional) **Un entorno de GitHub para los secrets de Cloudflare**, que los limite al trabajo de despliegue (Settings → Environments). Hoy valen para todo el repositorio y solo los usan los pasos de wrangler.
- [ ] (Fase 11) **¿Explorador incrustable en ivanchesa.com?** Hoy `frame-ancestors 'none'` y `X-Frame-Options: DENY` impiden incrustarlo en otra web. Si quieres una demo incrustada en el portfolio: `frame-ancestors https://ivanchesa.com` y sin `X-Frame-Options`.

## Bloque C (fase 4b: la vista general del sistema solar)
- [x] **La vista general junto a tu captura de referencia:** decidido el 30-10 (revisión del bloque C, C2; D35): los planetas, **un 25 % más grandes** y sin solapes (solo esos dos encogen cuando se acercan). Hecho en la rama `revision-bloque-c`.
- [x] **Probar la vista general en tu móvil:** va bien (staging, 31-10). Desde la revisión del bloque C, ningún planeta mide menos de 2 px de radio (C3).
- [x] **Los planetas aún más grandes:** C2 (D35), sin solapes.
- [x] **La vista general en el móvil:** **tamaño mínimo en pantalla** (C3, opción b de la 4b; D35).
- [x] **De un cuerpo a otro se mantiene la velocidad elegida a mano** (D33): confirmado en la revisión del bloque C; el contexto «cuerpo enfocado» no cambia.

## Bloque C (fase 5: la Tierra)
- [x] **Probar la vista Tierra en tu móvil:** va bien (staging, 31-10).
- [x] **El panel de la Tierra en el móvil** (revisión del bloque C, C7): decidido el 31-10, tras probarlo en el móvil: **se queda como está** (no se pliega «Luz del Sol»).
- [x] **Las dos propuestas de la fase 5** (decididas el 30-10, revisión del bloque C):
  - las nubes del Himalaya: **atenuadas en los primeros planos ya** (C1), hecho en la rama `revision-bloque-c`;
  - la textura de día de 8K, más barata: en la **fase 10**.
- [ ] **Revisar los textos de las vistas guiadas** (`data/tours.ts`, `reviewed: false`; fase 9).
- [x] La altitud del Parque Astronómico del Montsec y de la Puerta del Sol, que sus fuentes no dan (`data/places.ts`): hecha en la fase 8, con el MDT02 del IGN (812 m y 649 m; abajo, «Bloque E»).

## Revisión del bloque C (30-10, `docs/revisiones/bloque-C.md`)
- [x] **Fusionar el PR 1 de Dependabot** (`typescript-eslint` 8.71.0 → 8.72.0). Lo cerró Dependabot y lo sustituyó por el **PR 4** (seis herramientas, con jsdom 31), que se fusiona al empezar el bloque F (revisión del bloque S, decisión 5; abajo, «Decisiones del 08-11»).
- [x] El PR 2 (`@types/node` 26), cerrado con un comentario, y `dependabot.yml` ya no propone versiones mayores de `@types/node` (C6).
- [x] **Los anillos de Saturno** (`docs/decisiones/ANILLOS-SATURNO.md`, D36): en la fase 7, junto a R2, con el realce moderado del brillo ya decidido.

## Bloque D (fase 6: la Luna)
- [ ] **Probar la vista Luna en tu móvil** (no bloquea), en la vista previa (`/explorar/luna`): los FPS, el tamaño del panel (como el de la Tierra, C7, ocupa buena parte de la pantalla), el «Polo sur» y el recorrido.
- [x] **Los casquetes polares de la Luna** (propuesta 1 de la fase 6): hechos ya en la revisión de la fase 6 (hallazgo 1, era un Bloqueante): las normales de los modelos polares del LOLA por encima de 76°, sin el «sol de rayas» del polo.
- [x] **La luz de la umbra** (propuesta 2 de la fase 6): en los eclipses, la Luna se ve rojiza y bastante clara, más de lo real, para que no salga negra con la exposición de su primer plano (ilustrativo, `VISUAL_CONFIG.moon.umbraLight`). **Se queda como está** (08-11, delegado por Iván en la sesión de revisión: revisión del bloque S, decisión 7): rojiza y visible, como en las fotos de un eclipse, ilustrativa y dicha.

## Bloque D (fase 7: lunas, sombras y escala real)
- [ ] **Probar en tu móvil** (no bloquea), en la vista previa: los sistemas de lunas (`/?cuerpo=europa`, `/?cuerpo=fobos`: los FPS con los mosaicos) y la escala real («Controles +» → «Escala»).
- [x] **Las propuestas de la fase 7** (`docs/informes/fase-7.md`, §10): decididas en la revisión del bloque D (01-11). El terminador de Titán, la dicotomía de Jápeto y pedir la textura del planeta al enfocar una luna, a la **fase 10** (tarea 10 del plan); las lunas de Urano con los mapas del JPL y el anillo A con un perfil de I/F, al **backlog** (12 y 13).

## Revisión del bloque D (01-11, `docs/revisiones/bloque-D.md`)
- [x] **D1–D5 aplicados** en `fase-7-lunas-escala-real` y fusionados (respuesta en `docs/informes/fase-7.md`): Ío con el mosaico en color del USGS; Tritón sin el corte del hueco; las órbitas casi rectas, desvanecidas; el realce de los anillos, solo en su cara iluminada; y el dominio, ivanchesa.com (D37).
- [x] **Fusionar el PR 1 de Dependabot** en GitHub (el de la revisión del bloque C, más arriba). Sustituido por el PR 4 (arriba).
- [x] **Los anillos a contraluz**: sin el realce de D36 ya no salen quemados, pero el anillo A sigue más claro que en PIA17172 (L* 90 frente a 32). No es el realce: la exposición del primer plano a 176° de fase y el lóbulo hacia delante de las partículas, el mismo en todos los anillos. **Siguen en el backlog (14)** (08-11, delegado por Iván en la sesión de revisión: revisión del bloque S, decisión 7). Cerrado.
- [ ] (Fuera del repo) `AGENTS.md`, tu copia local de `CLAUDE.md` para Codex, sigue con ivanchesa.es y «desarrollador web freelance»: no la he tocado.

## Bloque E (fase 8: el cielo desde España y los eclipses)
- [x] **La altitud del Montsec y de la Puerta del Sol** (pendiente desde la fase 5): del modelo digital del terreno del IGN (MDT02) en el mismo punto, con la URL de la consulta: 812 m y 649 m. El mismo servicio da 410 m en el Observatori Fabra, como su estación meteorológica.
- [x] **Constelaciones:** d3-celestial, con licencia BSD de 3 cláusulas (entra en tu lista). Las líneas siguen las cartas de la IAU.
- [x] **Los nombres de las constelaciones**, decidido el 03-11 (D38): **en español** (Osa Mayor, Géminis, Orión) y el **oficial de la IAU en latín como secundario**, cada uno comprobado con una fuente española publicada (en `FUENTES.md`) y la lista en `docs/revision-textos.md`, que revisa la sesión de revisión del bloque E. Se hace en la fase 9.
- [x] **La velocidad del cielo**, decidido el 03-11: **tiempo real**, como se proponía (D33). Ya era así en el código (`CONTEXT_SPEED.sky`); queda en el plan.
- [ ] **Probar el cielo en tu móvil** (no bloquea), en la vista previa: `/cielo` con el panel compacto, «Usar mi ubicación» (pide permiso solo al pulsarlo) y el deslizador de la hora; y `/eclipses` con «Ver en 3D».

## Bloque E (fase 9: contenido y compartir)
- [x] **Los enlaces legales y el del autor, a ivanchesa.com** (D37): `https://ivanchesa.com/aviso-legal/` y `/privacidad/`, en `site.config.ts`. **Hecho en la fase 11** (10-11): ivanchesa.com ya responde y las dos páginas dan 200 (sin la barra final, 308 a la URL con ella). Fuera el `TODO(ivan)` de `site.config.ts` y el trato de «pendiente» de `check-links.mjs`.
- [ ] **La vista previa del enlace en una app real** (WhatsApp, Telegram, Slack…): **ya se puede** (fase 11: `og:image` responde en el dominio, 200 `image/jpeg`). Hoy, simulada con las etiquetas del HTML (`scripts/preview-og.mjs`, capturas en `docs/informes/img/fase-9/compartir-*.webp`): la imagen es una URL absoluta del dominio y no se puede pedir desde fuera.
- [x] **Lighthouse**: medido en producción en la fase 11 (§12 de su informe): las fichas, de 0,99 a 1,00; el explorador, 0,84 (abajo, «Fase 10»). Lo de antes: Sus métricas, medidas con `scripts/measure-pages.mjs` en las condiciones de su móvil y con el PC sin otras tareas: 99 de nota estimada en las nueve páginas de la muestra (las cinco fichas, los índices, los créditos y «Sobre el proyecto»), con CLS 0. La definitiva, en la fase 10 (Lighthouse en el CI: `@lhci/cli`, abajo) y en producción, en la fase 11.
- [ ] (Fase 10) **La fuente en un móvil real**: con `font-display: optional`, en una primera visita con la red lenta el texto se queda en la fuente de reserva toda la visita (revisión de la fase 9, hallazgo 15): mirar si Public Sans llega a tiempo y, si no, valorar `swap` con `ascent-override`, `descent-override` y `line-gap-override`. Y las de reserva del mismo ancho son Arial y Georgia, que Android no tiene: medir allí el desplazamiento al cargar (en tu móvil).
- [ ] (Opcional) **«Sobre el proyecto» no cuenta cómo se ha hecho** (con Claude Code, en fases y con revisiones): si quieres que lo diga, dímelo y lo escribo para que lo revises.
- [x] **`/luna` en el menú y en las migas** (segunda ronda de la revisión de la fase 9, sugerencia 24): **aprobado por Iván el 04-11** (revisión del bloque E, E4): «Inicio › Lunas › Luna» y «Lunas» marcado también en `/luna`, con la misma URL. Va como tarea corta al principio de la fase 9b.

## Decisiones del 03-11 (durante la fase 9)
- [x] Las constelaciones en español con el latín como secundario (D38) y el cielo en tiempo real (D33): arriba, en «Bloque E (fase 8)», y en el plan.
- [x] **El menú**: «Cielo» (`/cielo`) en lugar de «Luna» (Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto), también en el móvil; y en `/lunas`, la Luna la primera y destacada (enlaza a `/luna`, que no cambia) y después las demás por planeta. Hecho en la fase 9 (tarea 9 del plan).
- [x] **La medida del rendimiento de la fase 9**: vale la limpia (el PC sin otras tareas: 99 en las nueve páginas de la muestra); las que se hicieron con otros procesos en marcha no son fiables y solo se apuntan en el informe (§4.1). La definitiva, la de la fase 10 (Lighthouse en el CI) y la de producción, la de la fase 11.
- [x] **Una fase propia antes de la fase 10**: preparada en la revisión del bloque E como la **fase 9b** (bloque S, `docs/decisiones/FASE-9b-SOL-LUNAS.md`, D39–D44): el Sol «real y luminoso» (D41, elegido por Iván el 03-11), acabar las lunas (D42), los sistemas de lunas de la vista general (D39, la prioridad de Iván del 03-11) y el lado nocturno de la Tierra (D40). En el plan (§1, §6 y la sección de la fase).
- [x] **La política de uso de imágenes del JPL, aceptada como licencia** (D43, 03-11), con el crédito «Courtesy NASA/JPL-Caltech». En `CLAUDE.md`, en la lista de licencias aceptadas.

## Decisiones del 04-11 (revisión del bloque E, `docs/revisiones/bloque-E.md`)
- [x] **Venus «Bajo las nubes»** (D44): en la fase 9b (entrega 9b.e).
- [x] **`/luna` en el menú y en las migas** (E4): aprobado; tarea corta al principio de la fase 9b.
- [x] **Los nombres de las 88 constelaciones** (D38): revisados por la sesión de revisión, **correctos** (los del Anuario del Real Observatorio de Madrid, IGN). Algunos son menos habituales que su variante (Hidra Hembra, Raposilla, Caballo Menor, Dorada, Buril, Horno Químico): se quedan, porque son los de la fuente oficial.
- [x] **Los PR 1 y 3 de Dependabot** (E5): el 3, fusionado el 08-11 por la sesión de revisión (`6db55df`), y el 5 (`tslib` 2.9.1), el 09-11 (`89e77f9`); el 1, sustituido por el 4, que se fusiona al empezar el bloque F (abajo, «Decisiones del 08-11»).

## Decisiones del 05-11 (durante la fase 9b)
- [ ] (Opcional; revisión del bloque S, decisión 3: Proteo, como esfera en la v1) **La forma de Proteo: bajarla a mano** (D42 y D45, entrega 9b.d). El 06-11, `assets-src/shapes/` existe pero está vacía: la 9b.d sigue con Proteo como esfera, como dijiste; si dejas el zip ahí, se usa en cuanto se regenere. El único modelo con una licencia de la lista es el de Stooke (CC0): «Stooke small bodies shape models V1.0», DOI 10.26033/yt84-5y91, https://sbn.psi.edu/pds/resource/doi/stkshape_1.0.html. El zip (`small_bodies.stooke.shape-models.zip`, unos 252 kB) solo está en sbnarchive.psi.edu, que pide una verificación anti-bots (403 desde la terminal). Bájalo desde el navegador y déjalo en `assets-src/shapes/`. Mientras tanto, Proteo sigue como ahora: una esfera con su radio medio (208 km).
- [x] **Las formas de Fobos y Deimos: ¿qué licencia aceptas?** (D42). **Decidido el 06-11: b), los DSK del NAIF, citando la fuente.** Sus reglas de uso de los datos SPICE, en la lista de licencias aceptadas de `CLAUDE.md` (y la malla reducida, como versión modificada, lo dice en su atribución). Ningún modelo científico declaraba CC0, CC BY, MIT, BSD ni dominio público.
  - **a) Los GLB de divulgación de la NASA** (https://science.nasa.gov/resource/deimos-mars-moon-3d-model/ y su par de Fobos; crédito «NASA/JPL-Caltech»; unos 16 000 vértices). Su licencia está clara: las pautas de la NASA dicen que los datos de polígonos de sus modelos «generally are not subject to copyright in the United States». Su origen no está documentado, y en el de Fobos el eje largo va en Z. **Recomendada**, si sus semiejes casan con los publicados (IAU: 13,0 × 11,4 × 9,1 km y 7,8 × 6,0 × 5,1 km).
  - **b) Los DSK del NAIF** (Gaskell para Fobos; Willner, DLR): sus reglas permiten cualquier uso, también comercial, pero no son ninguna de las licencias de la lista, y una versión modificada debe cambiar la atribución.
  - **c) Ernst et al. 2023** (SBMT, JHU/APL): sin licencia en los datos («All rights reserved» en la web).
  - **d) Dejar los elipsoides** de ahora.
- [x] **Pharos (Proteo): sin posición.** El Gazetteer no da su posición (latitud 0°, longitud 0° y diámetro 0: marcadores sin valor). Los valores de Wikipedia (10° S, 10° O; Thomas et al., 1995) no se han podido comprobar en la fuente. Sin una fuente comprobable no se pone, y se dice. **Cerrado** (08-11, delegado por Iván en la sesión de revisión: revisión del bloque S, decisión 3).
- [x] **Lo que nadie ha visto de las lunas** (D45, `docs/decisiones/FASE-9b-ADENDA-D45.md`; «Tritón se ve fatal», con tu captura de staging): de las tres opciones, la **recreación completa**, «así con las demás lunas también». Ninguna luna con zonas vacías o borrosas: lo que no se vio se recrea a partir del terreno real de la misma luna, lo real no se toca y se dice que es ilustrativo (fichas, `/creditos`, `/sobre-el-proyecto` y `FUENTES.md`). En la entrega 9b.d; en el plan (§1 y la sección de la fase 9b).

## Decisiones del 06-11 (durante la fase 9b)
- [x] **Las formas de Fobos y Deimos, con los DSK del NAIF** (D42), citando la fuente: su licencia, en `CLAUDE.md` (arriba, en «Decisiones del 05-11»). En la entrega 9b.d.
- [x] **D46, el Sol y la Tierra con el aspecto de la referencia** (`docs/decisiones/FASE-9b-ADENDA-D46.md`; tus dos capturas de `earth.ethanplus.ai/solar.html`: «quiero mejorar el sol, quiero uno más como el de la imagen» y «La tierra también se tiene que mejorar»): el Sol y la Tierra del explorador con **color realzado**, ilustrativo y avisado, medido frente a capturas propias de la referencia (solo para medir). Es la entrega nueva **9b.f**, entre la 9b.d y la 9b.e. Manda sobre D41 y sobre las comparativas con EPIC de la fase 5 donde se contradigan; `/cielo`, la Tierra de noche y la astronomía no cambian. En el plan (§1, el bloque S y la sección de la fase 9b).

## Entrega 9b.d (07-11): para revisar cuando puedas (no bloquea)
- [x] **Revisadas en la revisión del bloque S** (08-11): las lunas recreadas de Urano no cumplen los criterios de D45 (S1) y se rehacen en la entrega 10.a (D48); la línea sobre el mapa, en las doce, **se queda**; y Miranda, **en gris neutro** (cerrado). Delegado por Iván en la sesión de revisión (decisiones 1 y 3).
- [x] **Las lunas recreadas (D45), de un vistazo:** las seis vistas de cada luna, antes y después, en `docs/informes/img/fase-9b/d45-*-seis-vistas-*.webp`, y la rejilla de las 20 (`antes-` y `despues-lunas-rejilla.webp`). Lo que más ha cambiado: Tritón, las cinco de Urano (el norte, recreado), Deimos (lo que su mapa no cubría, recreado; se ven las uniones y el contorno de su carta, que son de lo real) y Proteo (cráteres generados). Una cosa a mirar: el norte recreado de Miranda tiene relieve, pero menos contraste que su sur, que la Voyager fotografió con el Sol bajo. Si lo quieres más marcado, se puede subir (es un ajuste de la receta).
- [x] **La línea sobre el mapa en las fichas** (D45): en Tritón, Proteo y las cinco de Urano, con una fuente de la NASA; en las otras doce (las que solo tienen zonas vistas de lejos), sin fuente externa y con un enlace a «Cómo se recrea» (`/creditos#lunas-recreadas`, con la tabla de lo medido). Si prefieres que esas doce no la lleven, se quita.
- [x] **Miranda, sin B−V publicado:** ninguna fuente libre da su índice de color (el Astronomical Almanac lo deja en blanco; Karkoschka, 1997, solo dice «Miranda is blue»), así que va en gris neutro. Si tienes una referencia con cifras, se usa.

## Fase 9b (08-11): para decidir (decidido el 08-11 en la revisión del bloque S, delegado por Iván)
- [x] **El criterio del borde de D45** (revisión de la fase 9b, hallazgo 1). → **Los dos criterios** (D48): la costura fina, relativa, y el brillo medio, absoluto, medido a una escala de varios grados; en la entrega 10.a. La adenda pide que en el borde con lo real no haya «ningún salto de brillo medio mayor que ΔL\* 2». El build lo mide frente a lo natural: un borde trazado al azar dentro de lo real ya salta de 2,4 a 9,8 L\* por el relieve (los cráteres), y el criterio pasó a «no más de 2 L\* por encima de eso». En valor absoluto, el percentil 95 llega a 7,98 en Dione, 6,91 en Miranda y 6,35 en Oberón (borde con lo no visto), y a 12,71 en Titania y 7,98 en Mimas (borde con lo visto de lejos). Las cifras, luna a luna, en `docs/datos/recreacion-lunas.md`. **¿Aceptas el criterio relativo?** Si no, la otra vía es medir el salto a una escala de brillo medio de varios grados (donde lo natural quede por debajo de 2) y ajustar la recreación hasta cumplirlo.
- [x] **El color del radar de Venus** (entrega 9b.e): en gris, el producto tal cual (ahora), o teñido con el de las fotos de las Venera 13 y 14, como las vistas de Magellan de la NASA (PIA00104). Es un valor de `VISUAL_CONFIG`, con su fuente. → **Con el color de las Venera** (D49), en la fase 10 (tarea 8).
- [x] **Las propuestas para la fase 10** del informe de la fase 9b (§10): el rótulo de Saturno junto al planeta, la precarga de texturas del recorrido, los nombres de los lugares de España, el bloom (quitarlo o cargarlo solo si se enciende), el Sol de cerca en el móvil y la máscara de los mosaicos de las lunas. → **A la fase 10** (tareas 4 y 8; el bloom, **fuera**; la máscara, en la 10.a), y el terminador de Titán, comprobado con otra foto de Cassini.

## Decisiones del 08-11 (revisión del bloque S, `docs/revisiones/bloque-S.md`), delegadas por Iván en la sesión de revisión
Iván dejó en la sesión de revisión lo que tenía pendiente de decidir: «decide tú autónomamente lo que sería más recomendable para el proyecto».
- [x] **D48, las lunas recreadas, segunda vuelta** (decisión 1): la entrega 10.a, en su propia sesión, con los dos criterios del borde, lo real con luz rasante sin proteger y cráteres de verdad en lo recreado. Antes de juntarla, la sesión de revisión mira sus capturas.
- [x] **D49, el radar de Venus con el color de las Venera 13 y 14** (decisión 2), con el aviso que dice también el color.
- [x] **Lo demás de las lunas** (decisión 3): la línea sobre el mapa, en las doce lunas vistas de lejos, se queda; Miranda, en gris neutro; Proteo, como esfera en la v1 (el zip de Stooke, opcional para Iván), y Pharos, sin posición.
- [x] **Los textos (540): una comprobación independiente en la fase 10** (decisión 4): un subagente sin el contexto de la sesión los compara con su fuente y con `docs/ESTILO.md`, corrige en su origen lo que esté claramente mal y deja lo dudoso en `docs/revisiones/textos.md` para Iván. Con el matiz del subtítulo de Shackleton.
- [x] **Dependabot** (decisión 5): el PR 3, fusionado el 08-11 (`6db55df`); el PR 4 (que sustituye al 1), con el test de las etiquetas arreglado en `main`, `@dependabot rebase`, su CI en verde y la fusión, al empezar el bloque F.
- [x] **`@lhci/cli`, aprobado** (decisión 5) para la tarea 7 de la fase 10, como dependencia de desarrollo, con tres condiciones: los informes, solo en el disco del CI (nunca `temporary-public-storage`); contra el build local; y con el Chromium de Playwright. En la lista cerrada del plan y en `CLAUDE.md`.
- [x] **La interfaz** (decisión 6): el año en la barra del teléfono, **no** (ya está en la fecha y en «Controles»); los defectos que dejó la crítica de la 9c, a la fase 10 (tarea 8); lo demás del backlog 15 sigue allí.
- [x] **Lo de antes que seguía abierto** (decisión 7): la luz de la umbra, como está; los anillos a contraluz, en el backlog (14).
- [x] **S8, S9 y S11**, peticiones de Iván del 08-11, en la fase 10 (tarea 8), de las primeras: el Sol del explorador sin girar; «‹ Sistema solar», un botón reconocible; y el margen de la nota bajo «Ver en 3D».

**Sigue siendo de Iván:**
- [ ] (Sin decidir; lo está pensando desde el 08-11) **¿El explorador arranca en tiempo real** en lugar de a 3 días/s en la vista general y 1 h/s con un cuerpo? Mientras, **D33 sigue y no se toca** (S10 de la revisión del bloque S, retirado).
- [ ] **La lista corta de textos dudosos** (`docs/revisiones/textos.md`, fase 10): **10 dudas**, cada una con su propuesta (el día de Venus frente al de su tabla, los albedos de Umbriel y Proteo, el radio de los anillos de Saturno, «su superficie real» en las lunas de Urano, y seis menores), y una frase sin fuente («las únicas en color» de las Venera, su §4). Las 8 correcciones claras ya están hechas. Con tu OK, todos los textos pasan a `reviewed: true`.
- [ ] **Tus pruebas en el móvil** (abajo, «Revisiones y pruebas de Iván»), el **zip de Proteo** (opcional, arriba) y **«Sobre el proyecto»** (opcional: si cuenta que se ha hecho con Claude Code; arriba, en «Bloque E»).

## Decisiones
- [x] **La revisión de los textos (fase 9)**, decidida al lanzar el bloque E (01-11): `docs/revision-textos.md` con cada texto, su fuente y un hueco para tus correcciones, agrupados por cuerpo y por vista. El bloque no te espera: la revisión queda apuntada abajo («Revisiones y pruebas de Iván») y se sigue.
- [x] **(Fase 6) `toktx` (KTX-Software): no hace falta.** Con WebP, la VRAM cabe en los 300 MB de §5 en el peor caso de las dos vistas (C4, con test): la vista Tierra, 278 MB, y la vista Luna, 265; y en el viaje entre las dos, como mucho 284 (revisión de la fase 6, hallazgo 4). La reevaluación de KTX2 queda para la fase 10 si hiciera falta en el móvil.
- [x] **Subdominio definitivo:** `tierra-luna-sol.ivanchesa.com` (decisión del 31-10: el dominio pasa de ivanchesa.es a ivanchesa.com; revisión del bloque D, D5, y D37). Ya en `src/app/core/site.config.ts`, con la URL del autor, `https://ivanchesa.com`.

## Revisiones y pruebas de Iván
- [ ] **Revisar los textos en `docs/revision-textos.md`** (fase 9; tu decisión al lanzar el bloque E): 360 textos, cada uno con su fuente y su línea «Corrección:», por cuerpo (los 120 de los cuerpos), por vista (las entradillas, las vistas guiadas de la Tierra, las vistas y el recorrido de la Luna), las páginas (los índices, los eclipses, «Sobre el proyecto», los créditos y la 404), los textos fijos de las fichas, del pie y del menú, y las descriptions de las 40 páginas. Las citas de los textos de los cuerpos, en `docs/datos/textos-cuerpos.md`. Lo regenera `node scripts/build-text-review.mjs` (no lo reescribe si ya tiene correcciones). Los nombres de las 88 constelaciones, al final: revisados por la sesión de revisión del bloque E (04-11), correctos.
- [x] Textos de los 30 cuerpos (120 textos con `reviewed: false`): ahora en `docs/revision-textos.md` (arriba), con las citas en `docs/datos/textos-cuerpos.md`. En la **fase 9** (decisión del 24-10; antes «al final de las fases 1 y 8»).
- [ ] Textos de las vistas guiadas y de los recorridos (fases 5 y 6; en el plan v1, 4 y 5), en `docs/revision-textos.md`. El matiz de Shackleton, hecho en la fase 10 (`7389119`): su subtítulo dice ahora que el explorador no dibuja las sombras del relieve y que por eso se ve iluminada la pared interior que mira al Sol.
- [ ] Pruebas en el móvil real: por la vista previa de Cloudflare Pages desde la fase 4 (`staging.tierra-luna-sol.pages.dev`, la de `main`) o por la red local (fases 4–10; en el plan v1, 4–9). La primera, el 31-10 en staging: va bien.
- [ ] Visto bueno final en el móvil (fase 10; en el plan v1, la 9).
- [ ] **La interfaz de la fase 9c en tu iPhone** (D47, fusionada el 08-11; no bloquea): que en Safari ya no quede la franja vacía bajo la barra de tiempo (con las barras recogidas) y que la barra no choque con la del inicio; el cielo (su barra y su panel), «ⓘ» (la ficha) y el salto entre un planeta y sus lunas. Y, cuando puedas, los textos nuevos de la interfaz (`reviewed: false`, en el informe de la fase 9c, §12). El año en la barra del teléfono: **no** (revisión del bloque S, decisión 6).

## Fase 10
- [ ] Conseguir un iPhone para probar (aunque sea prestado). No bloquea.
- [x] Decidir si se aprueba `@lhci/cli` (Lighthouse en el CI): **aprobado** el 08-11, con sus condiciones (arriba, «Decisiones del 08-11»; delegado por Iván en la sesión de revisión).
- [ ] **Decidir qué hacer con la nota de rendimiento del explorador en Lighthouse** (informe de la fase 10, §4.22 y §10; no bloquea). Con el arranque troceado da **0,76** (antes, 0,66; el plan pide 0,90), y las fichas y las demás páginas, de 0,96 a 1,00. Lo que falta es crear el contexto WebGL, unos 210 ms de una sola tarea que no se puede partir. Por ahora va **como aviso** en el CI. Las opciones: (1, la recomendada) dejarlo como aviso; (2) un suelo como error, por ejemplo 0,65, que en el CI, con WebGL por software, podría saltar sin una regresión de verdad; (3) pintar en un worker con `OffscreenCanvas`, un cambio de arquitectura grande, al backlog.
- [ ] **Saber** (no hace falta decidir nada): en el CI, el rendimiento de Lighthouse va **como aviso** en todas las páginas (fase 10, §4.24 del informe; decisión de la sesión de revisión). Los ejecutores gratuitos de GitHub no dan cifras estables: sin WebGL por software, siete de las nueve fichas dan 0,99–1,00, pero `/lunas/titan` se queda en 0,94 y `/planetas/marte` en 0,95 justos, frente a 0,98 y 0,99 en local. La accesibilidad y las buenas prácticas siguen como error. Las cifras de rendimiento que cuentan son las de `npm run lighthouse` en local, con el equipo libre (ahí, como error), y la definitiva, la de producción: **en la fase 11, Lighthouse contra `tierra-luna-sol.ivanchesa.com`**.
- [ ] **La prueba con un lector de pantalla de verdad** (NVDA o Narrador; tarea 3 de la fase 10): desde la sesión, axe en las 40 rutas y el teclado en los e2e; la prueba de oído no se puede hacer allí. No bloquea.
- [ ] **El Sol de cerca en tu móvil** (tareas 4 y 5 de la fase 10): sus FPS y la batería, con los 10 frames por segundo del nivel bajo y los hashes enteros. No bloquea.
- [ ] **Decidir sobre la hidratación incremental de las fichas** (tú o la sesión de revisión; informe de la fase 10, §5 y §10): no se hizo porque el código propio inicial ya está en 13,98 kB de 15; es lo que más bajaría la tarea del arranque que deja a `/lunas/titan` y `/planetas/marte` en 0,91–0,95 en el CI. Propuesta: al backlog, o a la fase 11 si el rendimiento de las fichas debe volver a ser error en el CI.

## Fase 11 (manual; era la fase 10 del plan v1)
- [x] El dominio propio (D37): en Cloudflare Pages → `tierra-luna-sol` → «Custom domains», `tierra-luna-sol.ivanchesa.com`. **Hecho** (activo el 10-11). La zona de ivanchesa.com está en la misma cuenta de Cloudflare: el propio panel crea el registro DNS. Los secrets de Cloudflare ya sirven (fase 4).
- [x] Dar el OK a `indexable: true`: **dado** (10-11). Desde la fase 11 el build publica `sitemap.xml` (generado, sin lista a mano) y lo cita en `robots.txt`.
- [ ] (Opcional) **Dar de alta el sitemap en Search Console**: `https://tierra-luna-sol.ivanchesa.com/sitemap.xml`. Ahora existe; el SEO es secundario (D25), así que no corre prisa.
- [ ] Añadir la ficha del proyecto en ivanchesa.com.
- [x] **ivanchesa.com, que exista** (revisión del bloque S, S6): publicada (10-11).
- [x] (Claude Code, a petición de Iván del 08-11; **hecho el 10-11** con `scripts/verify-browser.mjs` en las 10 rutas, informe de la fase 11, §12) **Comprobar en producción que no sale el panel de rendimiento** (FPS, CPU, llamadas, VRAM…). Solo se ve con `ng serve`, porque `viewer-canvas.ts` lo enseña con `isDevMode()`, y el build publicado no lo lleva. Iván lo vio en su PC con el servidor de desarrollo.

## Fase 11: para Iván (10-11; `v1.0.0` en https://tierra-luna-sol.ivanchesa.com)
- [ ] **La ficha del proyecto en ivanchesa.com** (en su propio repo; esta sesión no lo toca): el enlace al sitio, una imagen de `docs/img/readme/` (la animación o la portada) y el README como base del texto.
- [ ] **La difusión:** dónde y cuándo, tú decides (la vista previa del enlace, arriba, conviene mirarla antes).
- [ ] **Probar en tu móvil y en un iPhone, ya en el dominio:** la interfaz, «‹ Sistema solar», el Sol de cerca en el nivel bajo (FPS y batería) y, en Safari de iOS, la memoria, la pérdida de contexto y los gestos. No bloquea.
- [ ] **Decidir el Lighthouse del explorador** (arriba, «Fase 10»): en producción da **0,84** de rendimiento (la mediana de 5; en local, 0,76; el plan pide 0,90), con 1,00 en accesibilidad y buenas prácticas, LCP 1,81 s, CLS 0,006 y TBT 611 ms. La recomendación sigue siendo la opción 1 (dejarlo como aviso).
- [ ] **Saber:** `lhci assert` contra producción sale con error porque el explorador casa también con el patrón de las páginas de contenido (≥ 0,95); las medianas, en el §12 del informe. Se arregla con lo que salga de la revisión del bloque F (`v1.0.x`).
- [ ] **La revisión del bloque F** (fases 10 y 11): lo que salga se corrige y se publica con una etiqueta `v1.0.x` (`deploy-production.yml`).
