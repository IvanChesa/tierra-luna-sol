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
- [x] **Network Error Logging de Cloudflare (D24).** Decidido el 30-10 (revisión del bloque C, C8): se **acepta como telemetría del propio alojamiento** (solo informa de las peticiones que fallan) y se explica en la privacidad (fase 9); en la fase 11, con el dominio propio, se mira si la zona permite desactivarlo. `verify-pages` lo sigue marcando como aviso.
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
- [ ] **Fusionar el PR 1 de Dependabot** (`typescript-eslint` 8.71.0 → 8.72.0). Pedido su rebase sobre el `main` actual: el CI está en verde (lint, tests, build y e2e). La revisión autorizaba fusionarlo, pero el clasificador de permisos del modo automático no me dejó hacerlo en GitHub: fusiónalo tú (un clic en GitHub) o dame permiso para `gh pr merge`.
- [x] El PR 2 (`@types/node` 26), cerrado con un comentario, y `dependabot.yml` ya no propone versiones mayores de `@types/node` (C6).
- [x] **Los anillos de Saturno** (`docs/decisiones/ANILLOS-SATURNO.md`, D36): en la fase 7, junto a R2, con el realce moderado del brillo ya decidido.

## Bloque D (fase 6: la Luna)
- [ ] **Probar la vista Luna en tu móvil** (no bloquea), en la vista previa (`/explorar/luna`): los FPS, el tamaño del panel (como el de la Tierra, C7, ocupa buena parte de la pantalla), el «Polo sur» y el recorrido.
- [x] **Los casquetes polares de la Luna** (propuesta 1 de la fase 6): hechos ya en la revisión de la fase 6 (hallazgo 1, era un Bloqueante): las normales de los modelos polares del LOLA por encima de 76°, sin el «sol de rayas» del polo.
- [ ] **La luz de la umbra** (propuesta 2 de la fase 6): en los eclipses, la Luna se ve rojiza y bastante clara, más de lo real, para que no salga negra con la exposición de su primer plano (ilustrativo, `VISUAL_CONFIG.moon.umbraLight`). Si la prefieres más oscura y realista, es cambiar ese valor: dime cuál.

## Bloque D (fase 7: lunas, sombras y escala real)
- [ ] **Probar en tu móvil** (no bloquea), en la vista previa: los sistemas de lunas (`/?cuerpo=europa`, `/?cuerpo=fobos`: los FPS con los mosaicos) y la escala real («Controles +» → «Escala»).
- [x] **Las propuestas de la fase 7** (`docs/informes/fase-7.md`, §10): decididas en la revisión del bloque D (01-11). El terminador de Titán, la dicotomía de Jápeto y pedir la textura del planeta al enfocar una luna, a la **fase 10** (tarea 10 del plan); las lunas de Urano con los mapas del JPL y el anillo A con un perfil de I/F, al **backlog** (12 y 13).

## Revisión del bloque D (01-11, `docs/revisiones/bloque-D.md`)
- [x] **D1–D5 aplicados** en `fase-7-lunas-escala-real` y fusionados (respuesta en `docs/informes/fase-7.md`): Ío con el mosaico en color del USGS; Tritón sin el corte del hueco; las órbitas casi rectas, desvanecidas; el realce de los anillos, solo en su cara iluminada; y el dominio, ivanchesa.com (D37).
- [ ] **Fusionar el PR 1 de Dependabot** en GitHub (el de la revisión del bloque C, más abajo) y **reiniciar Claude Code** para instalar su actualización, antes de lanzar el bloque E. Ahora, con el PR 3, en «Decisiones del 04-11» (E5).
- [ ] (Para decidir, sin prisa) **Los anillos a contraluz**: sin el realce de D36 ya no salen quemados, pero el anillo A sigue más claro que en PIA17172 (L* 90 frente a 32). No es el realce: la exposición del primer plano a 176° de fase y el lóbulo hacia delante de las partículas, el mismo en todos los anillos. Va al backlog (14); si lo quieres antes, en la fase 10.
- [ ] (Fuera del repo) `AGENTS.md`, tu copia local de `CLAUDE.md` para Codex, sigue con ivanchesa.es y «desarrollador web freelance»: no la he tocado.

## Bloque E (fase 8: el cielo desde España y los eclipses)
- [x] **La altitud del Montsec y de la Puerta del Sol** (pendiente desde la fase 5): del modelo digital del terreno del IGN (MDT02) en el mismo punto, con la URL de la consulta: 812 m y 649 m. El mismo servicio da 410 m en el Observatori Fabra, como su estación meteorológica.
- [x] **Constelaciones:** d3-celestial, con licencia BSD de 3 cláusulas (entra en tu lista). Las líneas siguen las cartas de la IAU.
- [x] **Los nombres de las constelaciones**, decidido el 03-11 (D38): **en español** (Osa Mayor, Géminis, Orión) y el **oficial de la IAU en latín como secundario**, cada uno comprobado con una fuente española publicada (en `FUENTES.md`) y la lista en `docs/revision-textos.md`, que revisa la sesión de revisión del bloque E. Se hace en la fase 9.
- [x] **La velocidad del cielo**, decidido el 03-11: **tiempo real**, como se proponía (D33). Ya era así en el código (`CONTEXT_SPEED.sky`); queda en el plan.
- [ ] **Probar el cielo en tu móvil** (no bloquea), en la vista previa: `/cielo` con el panel compacto, «Usar mi ubicación» (pide permiso solo al pulsarlo) y el deslizador de la hora; y `/eclipses` con «Ver en 3D».

## Bloque E (fase 9: contenido y compartir)
- [ ] **Los enlaces legales y el del autor, a ivanchesa.com** (D37): `https://ivanchesa.com/aviso-legal/` y `/privacidad/` (como en ivanchesa.es), en `site.config.ts`. Hoy ivanchesa.com no resuelve (NXDOMAIN, 03-11); cuando responda, comprobar que esas páginas existen: `node scripts/check-links.mjs --externos` (los marca como pendientes del dominio, no como rotos). `TODO(ivan)` en `site.config.ts`.
- [ ] **La vista previa del enlace en una app real** (WhatsApp, Telegram, Slack…): cuando exista el dominio (fase 11). Hoy, simulada con las etiquetas del HTML (`scripts/preview-og.mjs`, capturas en `docs/informes/img/fase-9/compartir-*.webp`): la imagen es una URL absoluta del dominio y no se puede pedir desde fuera.
- [ ] **Lighthouse**: no se ha ejecutado. Sus métricas, medidas con `scripts/measure-pages.mjs` en las condiciones de su móvil y con el PC sin otras tareas: 99 de nota estimada en las nueve páginas de la muestra (las cinco fichas, los índices, los créditos y «Sobre el proyecto»), con CLS 0. La definitiva, en la fase 10 (Lighthouse en el CI: `@lhci/cli`, abajo) y en producción, en la fase 11.
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
- [ ] **Los PR 1 y 3 de Dependabot** (E5): fusiona primero el 3 y, en el 1, comenta `@dependabot rebase`, espera al CI en verde y fusiónalo. El 04-11, al aplicar la revisión, seguían abiertos: la fase 9b empieza desde el `main` de entonces y, cuando los fusiones, se traen a la rama (son versiones de parche).

## Decisiones del 05-11 (durante la fase 9b)
- [x] **Lo que nadie ha visto de las lunas** (D45, `docs/decisiones/FASE-9b-ADENDA-D45.md`; «Tritón se ve fatal», con tu captura de staging): de las tres opciones, la **recreación completa**, «así con las demás lunas también». Ninguna luna con zonas vacías o borrosas: lo que no se vio se recrea a partir del terreno real de la misma luna, lo real no se toca y se dice que es ilustrativo (fichas, `/creditos`, `/sobre-el-proyecto` y `FUENTES.md`). En la entrega 9b.d; en el plan (§1 y la sección de la fase 9b).

## Decisiones
- [x] **La revisión de los textos (fase 9)**, decidida al lanzar el bloque E (01-11): `docs/revision-textos.md` con cada texto, su fuente y un hueco para tus correcciones, agrupados por cuerpo y por vista. El bloque no te espera: la revisión queda apuntada abajo («Revisiones y pruebas de Iván») y se sigue.
- [x] **(Fase 6) `toktx` (KTX-Software): no hace falta.** Con WebP, la VRAM cabe en los 300 MB de §5 en el peor caso de las dos vistas (C4, con test): la vista Tierra, 278 MB, y la vista Luna, 265; y en el viaje entre las dos, como mucho 284 (revisión de la fase 6, hallazgo 4). La reevaluación de KTX2 queda para la fase 10 si hiciera falta en el móvil.
- [x] **Subdominio definitivo:** `tierra-luna-sol.ivanchesa.com` (decisión del 31-10: el dominio pasa de ivanchesa.es a ivanchesa.com; revisión del bloque D, D5, y D37). Ya en `src/app/core/site.config.ts`, con la URL del autor, `https://ivanchesa.com`.

## Revisiones y pruebas de Iván
- [ ] **Revisar los textos en `docs/revision-textos.md`** (fase 9; tu decisión al lanzar el bloque E): 360 textos, cada uno con su fuente y su línea «Corrección:», por cuerpo (los 120 de los cuerpos), por vista (las entradillas, las vistas guiadas de la Tierra, las vistas y el recorrido de la Luna), las páginas (los índices, los eclipses, «Sobre el proyecto», los créditos y la 404), los textos fijos de las fichas, del pie y del menú, y las descriptions de las 40 páginas. Las citas de los textos de los cuerpos, en `docs/datos/textos-cuerpos.md`. Lo regenera `node scripts/build-text-review.mjs` (no lo reescribe si ya tiene correcciones). Los nombres de las 88 constelaciones, al final: revisados por la sesión de revisión del bloque E (04-11), correctos.
- [x] Textos de los 30 cuerpos (120 textos con `reviewed: false`): ahora en `docs/revision-textos.md` (arriba), con las citas en `docs/datos/textos-cuerpos.md`. En la **fase 9** (decisión del 24-10; antes «al final de las fases 1 y 8»).
- [ ] Textos de las vistas guiadas y de los recorridos (fases 5 y 6; en el plan v1, 4 y 5). En Shackleton, el subtítulo dice, como su fuente, que el interior está siempre en sombra, pero la escena no dibuja las sombras del relieve y se ve iluminada la pared interior que mira al Sol: matizarlo (segunda ronda de la revisión de la fase 6).
- [ ] Pruebas en el móvil real: por la vista previa de Cloudflare Pages desde la fase 4 (`staging.tierra-luna-sol.pages.dev`, la de `main`) o por la red local (fases 4–10; en el plan v1, 4–9). La primera, el 31-10 en staging: va bien.
- [ ] Visto bueno final en el móvil (fase 10; en el plan v1, la 9).

## Fase 10
- [ ] Conseguir un iPhone para probar (aunque sea prestado).
- [ ] Decidir si se aprueba `@lhci/cli` (Lighthouse en el CI). Tu mensaje del 03-11 dice que «la medición definitiva es la de la fase 10 (Lighthouse en el CI)»: lo confirmo contigo al empezar la fase 10 (es una dependencia fuera de la lista cerrada).

## Fase 11 (manual; era la fase 10 del plan v1)
- [ ] El dominio propio (D37): en Cloudflare Pages → `tierra-luna-sol` → «Custom domains», `tierra-luna-sol.ivanchesa.com`. La zona de ivanchesa.com está en la misma cuenta de Cloudflare: el propio panel crea el registro DNS. Los secrets de Cloudflare ya sirven (fase 4).
- [ ] Dar el OK a `indexable: true` y dar de alta el sitemap en Search Console. Con el plan v2 (D25) ya no se trabaja el sitemap: basta con el OK a `indexable: true`.
- [ ] Añadir la ficha del proyecto en ivanchesa.com.
