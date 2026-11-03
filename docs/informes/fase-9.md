# Informe: Fase 9 (contenido y compartir)

- **Rama:** `fase-9-contenido`
- **Fecha:** 2026-11-03
- **Estado:** lista para revisión (las cinco entregas y las decisiones de Iván del 03-11)

## Plan
Bloque E, modo autónomo; la fase 8 ya está en `main` (`358ae6b`). La fase es grande: va por entregas, con este informe al día al final de cada una. Lo que ya existe y se reutiliza:
- el catálogo de los 30 cuerpos (`data/bodies.ts`): sus datos con fuente (`body-data.ts`, generado) y sus 120 textos con su cita comprobada (`body-texts.ts`, generado desde `scripts/content/body-texts.json`);
- el formato de las cifras de `core/format.ts` (ESTILO §3) y la ficha resumida del explorador (`features/body-panel`), que ya cita sus fuentes;
- el modelo de efemérides sin `three` (`data/solar-system.ts`) que da las distancias del índice y de la ficha del explorador;
- el patrón de `/eclipses`: HTML prerenderizado y recálculo en el navegador con un `import()` dinámico en `afterNextRender`;
- las miniaturas del motor (`scripts/build-body-thumbnails.mjs`, `?captura=1&aislado=1`) y `/creditos`, que ya lista casi todo.

Hoy las fichas (`/planetas/:id`, `/sol`, `/luna`) son un H1 y «Ficha en preparación»; `/lunas` no existe; `/sobre-el-proyecto` es una línea; no hay description, Open Graph, `robots.txt` ni `noindex`.

**9.a · Las fichas de los 30 cuerpos y sus índices (tarea 2)**
- Rutas `/lunas` y `/lunas/:id` (las 20 lunas, con `canMatch` y `getPrerenderParams` desde el índice ligero, como los planetas). En la cabecera, «Lunas».
- **La ficha** (`pages/body-detail`), sin `three` ni astronomy-engine en su JS inicial:
  - migas de pan (Inicio › Planetas › Marte; Inicio › Lunas › Titán);
  - H1, el tipo («Luna de Saturno», con el enlace a la ficha del planeta), el resumen y **«Ver en 3D»** (el explorador con `?cuerpo=`; la Tierra y la Luna, en sus vistas);
  - la imagen del motor (9.b), con su ancho y su alto y `NgOptimizedImage`;
  - **«Datos»**: los físicos, los de la órbita y, en Saturno, los anillos; cada cifra con el formato de ESTILO §3 (las masas, en notación científica legible), su aclaración si la tiene y una nota numerada a su fuente;
  - **«Hoy»**: las distancias del día (al Sol y a la Tierra; las lunas, a su planeta; la Luna, también su fase), calculadas en el navegador con un `import()` dinámico en `afterNextRender`. En el HTML, el mismo hueco con un texto alternativo: no se mueve nada al llegar (CLS);
  - las tres curiosidades, cada una con su fuente; en los planetas, sus lunas con enlace;
  - «Fuentes», la lista numerada del final (ESTILO §5).
- Las filas de la ficha, en funciones puras con tests (que cada cifra tenga fuente y el formato de ESTILO).
- **Índices:** `/planetas` (los 8, con su miniatura y dos datos) y `/lunas` (las 20, por planeta, con el enlace a `/luna`).
- En el explorador, «Ficha completa» de las lunas lleva ya a `/lunas/:id` (el `TODO(fase-9)` de `describe.ts`).

**9.b · Imágenes del motor y la imagen Open Graph (tarea 1)**
- **`scripts/render-body-images.mjs`**: cada cuerpo renderizado por el propio motor (`?captura=1&aislado=1`, con la luz de las miniaturas, que comparten sus parámetros), en WebP de 360 y 720 px para las fichas (`public/img/fichas/`). Saturno, con los anillos enteros.
- **La imagen Open Graph**, global (D25): un render del motor de 1200 × 630, en JPEG (lo leen todas las apps de mensajería; WebP no) y de menos de 300 kB, con su texto alternativo.
- `FUENTES.md` y `/creditos`: obra propia derivada, con las atribuciones de sus texturas.

**9.c · Compartir, legal y privacidad (tareas 5 y 6)**
- Por página: el title de siempre y una **description** simple (`data.description` en la ruta; en las fichas, desde el índice ligero), canonical, Open Graph (`og:title`, `og:description`, `og:url`, `og:image` con su tamaño y su texto alternativo) y `twitter:card`. **`noindex`** en todas mientras `indexable` sea `false` y, siempre, en `/404` y en `**`; con tests, también al navegar en el cliente.
- **`robots.txt`** básico (sin bloquear el rastreo: si no, los buscadores no verían el `noindex`).
- **Pie:** los enlaces al aviso legal y a la privacidad de ivanchesa.com (`site.config.ts`, la fuente única; hoy ivanchesa.com no resuelve: `TODO(ivan)` hasta que exista, como el enlace del autor) y la nota visible «Sin cookies, sin analítica y sin peticiones a terceros», también en el pie del explorador.
- **Privacidad:** una sección en `/sobre-el-proyecto` (`#privacidad`), a la que lleva la nota: sin cookies ni analítica, `localStorage` solo para preferencias, la ubicación que no sale del navegador y la frase del NEL de Cloudflare (C8).

**9.d · Créditos y «Sobre el proyecto» (tareas 3 y 4)**
- **`/creditos`**: cada recurso publicado de `FUENTES.md`, uno por uno (autor, enlace, licencia con el enlace a su texto y los cambios), las licencias y el aviso de que la NASA no respalda el proyecto.
- **`/sobre-el-proyecto`** como caso de estudio del portfolio: qué es, el stack, un diagrama de la arquitectura (SVG accesible con su texto equivalente), los marcos de escala, la precisión medida (las tablas de la fase 1 y las de después), el rendimiento medido, las decisiones, lo que es ilustrativo (D21, D35, D36 y el color del cielo), la privacidad y el autor con el enlace a ivanchesa.com (D37). Cada cifra, con el informe donde se midió.

**9.e · Textos (tarea 7) y cierre**
- **Repaso de todos los textos visibles con ESTILO** (cifras, anglicismos, mayúsculas, comillas). Los de los cuerpos se corrigen en su JSON y se regeneran (`build-body-texts.mjs` vuelve a comprobar sus citas).
- **`docs/revision-textos.md`** (decisión de Iván al lanzar el bloque): cada texto con su fuente y un hueco para sus correcciones, por cuerpo y por vista, generado por un script desde los propios datos y páginas del build (que no se reescriba si ya tiene correcciones), y su entrada en `PENDIENTES.md`.
- **Criterios:**
  - **Lighthouse no se ejecuta**: `@lhci/cli` espera la decisión de Iván (fase 10) y otra herramienta sería una condición de parada. Se miden sus métricas con Playwright en una muestra de fichas, en las condiciones del móvil de Lighthouse (CPU ×4 y 4G lenta): FCP, LCP, CLS y el tiempo de bloqueo, con una estimación de la nota de rendimiento con las curvas públicas de Lighthouse; axe en todas las rutas; y de buenas prácticas, lo que se puede medir (0 errores de consola, imágenes a su tamaño). Se dice así.
  - **Privacidad:** el e2e recorre **todas** las rutas prerenderizadas (0 cookies y 0 peticiones a terceros).
  - **Vista previa del enlace:** simulada en local con las etiquetas del HTML (captura de una tarjeta hecha con `og:title`, `og:description` y `og:image`); la de una app real, cuando exista el dominio (fase 11, `PENDIENTES.md`).
  - **Sin cifras sin fuente y sin enlaces rotos:** el test de las filas de la ficha y `scripts/check-links.mjs` (los internos, con sus anclas, en `npm run check`; los externos, en el informe, y los de ivanchesa.com, pendientes del dominio).
- Capturas (`?captura=1`, escritorio y móvil): una ficha de planeta, de luna, del Sol y de la Luna, los índices, `/creditos`, `/sobre-el-proyecto`, el pie y la vista previa simulada.
- `FUENTES.md`, `PENDIENTES.md`, este informe, la revisión por subagente, las correcciones, la fusión, el diario y el resumen del bloque E. **Después, parar**: no se empieza el bloque F.

**Decisiones de Iván del 03-11, durante la fase** (en el plan y en `PENDIENTES.md`):
- **Las constelaciones, en español** con el oficial de la IAU en latín como secundario (D38), comprobadas con una fuente española publicada: hecho (§3, tarea 8).
- **El cielo, en tiempo real** (D33): ya era así en el código; queda en el plan y en ESTILO.
- **Una fase propia antes de la 10** (el Sol, las lunas que faltan, los sistemas de lunas de la vista general y el lado nocturno de la Tierra): no se hace aquí; la prepara la sesión de revisión con la del bloque E.

## 1. Resumen
- **Las fichas de los 30 cuerpos** (`/planetas/:id`, `/lunas/:id`, `/sol` y `/luna`) y sus índices (`/planetas` y `/lunas`, nueva), prerenderizadas y sin `three` ni astronomy-engine en su JS inicial: las migas de pan, el tipo, el resumen, «Ver en 3D», la imagen del propio motor, «Hoy» (las distancias del día y la fase de la Luna, calculadas en el navegador con un `import()` después de pintar), las tablas de datos con los decimales de su fuente y una nota numerada a ella, las tres curiosidades con su fuente, las lunas del sistema y la lista de fuentes.
- **Las imágenes del motor**: 60 en WebP (360 y 720 px, 1,4 MB) y la imagen para compartir, «Tierra Luna Sol» (el Sol, la Tierra y la Luna), en JPEG de 34 kB.
- **Compartir, legal y privacidad**: la description de cada página, Open Graph con la imagen global, la tarjeta grande, `noindex` en todas (y siempre en `/404`) y `robots.txt`; el pie con «Sin cookies, sin analítica y sin peticiones a terceros» y el aviso legal y la privacidad de ivanchesa.com; la privacidad en detalle, con la frase del NEL de Cloudflare, en `/sobre-el-proyecto#privacidad`.
- **`/creditos`**, recurso a recurso y con las licencias una por una, y **`/sobre-el-proyecto`** como caso de estudio (el diagrama de las capas, la precisión y el rendimiento medidos con el enlace a su informe, las decisiones y lo que es ilustrativo).
- **Decisiones de Iván del 03-11**: las constelaciones en español con el latín de la IAU debajo (D38), comprobadas en el Anuario del Real Observatorio de Madrid (IGN); el cielo en tiempo real (D33), y la fase propia de antes de la 10, apuntada.
- **Textos**: repasados con ESTILO y en `docs/revision-textos.md` para Iván (262 textos con su fuente y su hueco, y las 88 constelaciones para la sesión de revisión).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia (comando + salida, cifra, captura) |
|---|---|---|
| Lighthouse móvil ≥ 95 en rendimiento, accesibilidad y buenas prácticas en una muestra de fichas | ✅ en lo medido, sin Lighthouse | **Lighthouse no se ha ejecutado**: `@lhci/cli` espera la decisión de Iván (fase 10) y otra herramienta sería una condición de parada (§4.1). En su lugar, `node scripts/measure-pages.mjs`: Playwright y el protocolo de DevTools en las condiciones del móvil de Lighthouse con su estrangulamiento de DevTools (CPU ×4, 562,5 ms de RTT, 1,47 Mbit/s; 412 × 823 a 1,75x; sin caché), la mediana de 3 cargas. **Rendimiento**, con las curvas y los pesos públicos de Lighthouse 12 (el SI, que no se mide, tomado como el LCP: la estimación sale a la baja): las cinco fichas de la muestra, de **95 a 97** (tabla de §6). **Accesibilidad**: axe sin violaciones graves ni críticas en las 40 rutas (`e2e/accesibilidad.spec.ts`, «todas las páginas del sitio», también en su proyecto móvil). **Buenas prácticas**, lo que se puede medir: 0 errores de consola y todas las imágenes cargadas y a su proporción, en las 9 páginas medidas; HTTPS, la CSP y las cabeceras, las de la fase 4 |
| e2e de privacidad: 0 cookies y 0 peticiones a terceros en todas las rutas | ✅ | `e2e/privacidad.spec.ts` recorre ahora las 40 rutas prerenderizadas (antes, 11), después del recorrido con clics: 0 peticiones a otros dominios, 0 cookies y `localStorage` solo con claves `tls.*` (§6) |
| La vista previa del enlace (Open Graph) se ve bien | ✅ simulada | `node scripts/preview-og.mjs`: las etiquetas del HTML del build de cuatro páginas, pintadas como las tarjetas de una app (la grande y la compacta): `compartir-inicio`, `compartir-planetas-marte`, `compartir-lunas-titan` y `compartir-cielo` (§7). `e2e/contenido.spec.ts`: en el HTML de las 40 rutas, title, description (distinta en cada una), `og:title`, `og:description`, `og:image` absoluta con su texto alternativo, `og:url` (salvo en la 404) y la tarjeta grande. **La de una app real**, cuando el dominio exista (fase 11; `PENDIENTES.md`): la imagen es una URL absoluta del dominio, que aún no resuelve |
| Sin cifras sin fuente y sin enlaces rotos | ✅ | **Cifras:** `body-facts.spec.ts`, en los 30 cuerpos, cada fila de datos con una fuente de `SOURCES` y su número en la lista del final; los textos, con su página (las 120 citas, verificadas otra vez por `build-body-texts.mjs`); las cifras de `/sobre-el-proyecto`, cada una con el enlace al informe donde se midió; los datos «de hoy», con «calculado con astronomy-engine». **Enlaces:** `node scripts/check-links.mjs` (ahora en `npm run check` y en el CI): los **1121 internos** de las 40 páginas (rutas, ficheros y anclas), bien; con `--externos`, los **107 externos**, bien, salvo los 3 de ivanchesa.com, pendientes del dominio (no resuelve; `TODO(ivan)`) |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 9.1 `render-body-images.mjs` | hecha | Con la luz y el recorte de las miniaturas (`scripts/lib/body-shots.mjs`, común a los dos scripts): el mismo estilo. La imagen para compartir, una composición de tres renders (§4.2) |
| 9.2 Fichas e índices | hecha | §1. «Hoy» con `resource()` (API pública de Angular 22) y la imagen con `NgOptimizedImage` (cargador propio, `srcset` 1x/2x, `priority`: en el HTML, su `preload` y `fetchpriority`). Las filas, en funciones puras con tests. `/lunas` y `/lunas/:id`, nuevas, y «Lunas» en la cabecera; desde el explorador, «Ficha completa» de las lunas |
| 9.3 `/creditos` | hecha | Recurso a recurso (`FUENTES.md`), las licencias una por una y el aviso de la NASA (y del resto de instituciones) |
| 9.4 `/sobre-el-proyecto` | hecha | Caso de estudio: qué hace, cómo está hecho, el diagrama (SVG accesible y desplazable en el móvil), los marcos de escala, la precisión y el rendimiento con su informe, las decisiones, lo ilustrativo, la privacidad y el autor |
| 9.5 Compartir | hecha | La description, la registra cada página (en su chunk diferido); las vistas del explorador, en su ruta (§5.2). `robots.txt` sin bloquear el rastreo. `noindex`: todas mientras `indexable` sea `false`, y `/404` y `**` siempre |
| 9.6 Legal y privacidad | hecha | El pie, el pie del explorador y el menú del móvil. Los enlaces, en `site.config.ts` (la fuente única): ivanchesa.com aún no resuelve (`TODO(ivan)`) |
| 9.7 Textos | hecha | Repaso con ESTILO: 8 cifras con el espacio de millares, ya con punto, en el JSON y regeneradas; las aclaraciones de los datos, para quien lee la ficha («la NASA», no «la ficha»), en su generador y regeneradas (solo cambian las notas). `docs/revision-textos.md` (§1) |
| 9.8 Constelaciones en español (D38) y el cielo en tiempo real | hecha | §4.3 |

## 4. Desviaciones del plan y motivo
### 4.1 Lighthouse, medido sin Lighthouse
El criterio pide Lighthouse. No se ha ejecutado: `@lhci/cli` espera la decisión de Iván (fase 10, §1 del plan) y usar otra herramienta (`npx lighthouse`) es una condición de parada. Se miden sus métricas con Playwright en sus condiciones de móvil (`scripts/measure-pages.mjs`) y se estima la nota con sus curvas públicas; la accesibilidad, con axe (lo que usa Lighthouse), y de buenas prácticas, lo que se puede medir. La medida con Lighthouse queda para la fase 10.

### 4.2 La imagen para compartir: una composición, en JPEG
El plan pide un render del motor. Las vistas del explorador encuadran dejando sitio a sus paneles: el cuerpo nunca queda centrado (la Tierra salía arriba y pequeña). Es una composición de tres renders del propio motor, los de las fichas: el Sol a la izquierda (de donde les llega la luz), la Tierra en el centro y la Luna a su escala respecto a la Tierra (no a su distancia), con el halo del Sol difuminado. En JPEG y no en WebP: todas las apps de mensajería leen JPEG; WebP, no todas. 34 kB (WhatsApp no enseña las de más de 300 kB).

### 4.3 Las constelaciones en español (D38): de dónde salen
Fuente: la tabla «Constelaciones» del **Anuario del Real Observatorio de Madrid para 2019** (IGN; «la traducción más habitual del nombre»), para las 88. La tabla traduce el zodiaco palabra por palabra («Gemelos», «Toro», «Carnero»), e Iván quería «Géminis»: en las nueve que cambian, el nombre que usa el propio Anuario para esas constelaciones cuando las recorren los planetas («Constelaciones recorridas», 2014–2019: «Geminis/Cancer», «Leo/Virgo», «Virgo/Libra», «Libra/Escorpio», «Sagitario/Escorpio», «Piscis/Aries») o en su texto («la constelación de Tauro», 2019). Además, dos tildes que faltan en la tabla («Aguila», «Ave del Paraiso»), una mayúscula de la Ortografía («Horno Químico») y dos formas cortas («Cisne», «Escultor»). Lo comprueba `scripts/check-constellation-names.mjs` con los PDF del IGN (con su SHA-256; un lector de texto de PDF propio, `scripts/lib/pdf-text.mjs`, sin dependencias: hace falta para leer la tabla). En el cielo, «Osa Mayor» con «Ursa Major» debajo, en cursiva y más pequeño; en los textos, «en Géminis (Gemini)». La lista, en `docs/revision-textos.md`, para la sesión de revisión. El Diccionario de la RAE habría sido la otra fuente para el zodiaco, pero su web rechaza las peticiones automáticas.

### 4.4 Las fuentes tipográficas, precargadas (adelantado de la fase 10)
Al medir las páginas largas de esta fase con la red lenta, el CLS llegaba a 0,2 en `/creditos` (presupuesto, 0,05). La causa: el CSS crítico que el build mete en el HTML no lleva las `@font-face`, y la hoja entera llegaba a los 1,8 s; hasta entonces, el texto salía con la fuente del sistema y se recolocaba. Ahora: las `@font-face`, en `index.html`; los woff2 de Fontsource, copiados a `/fonts/` con su nombre (angular.json) y precargados; unas fuentes de reserva del mismo ancho medio (`size-adjust` sobre Arial y Georgia, medido en el navegador), y el texto con `font-display: optional` (los títulos, con `swap`). CLS de las 9 páginas medidas: 0. La fase 10 tenía «precarga de la fuente del H1»: hecha aquí. Donde no hay Arial (Android), la de reserva es la del sistema: medirlo allí (`PENDIENTES.md`).

### 4.5 El presupuesto del código propio inicial (15 kB)
Lo que va en el bundle inicial de esta fase (las etiquetas, el pie, la navegación y las rutas nuevas) lo llevó a 16,5 kB. Para bajarlo, sin tocar el presupuesto:
- el índice de cuerpos sale del bundle inicial: los guards y los títulos de las fichas lo cargan con `import()` (la página ya lo lleva en su chunk);
- la navegación de la cabecera, con un `@for`;
- el desplazamiento al navegar (cada página empieza arriba o en su ancla), con unas líneas en `app.ts` en lugar de `withInMemoryScrolling` (4 kB de Angular).

Queda en **14,32 kB de 15**: poco margen (§10).

### 4.6 Otras
- **La privacidad, en `/sobre-el-proyecto#privacidad`**: el plan no tiene una ruta para ella; el pie lleva a esa sección, que enlaza la política de ivanchesa.com.
- **`npm run check` comprueba también los enlaces internos** (`check-links.mjs`), y el CI: `CLAUDE.md` describe el `check` sin él (§10).
- **La ficha resume las fuentes de los textos** al final («Los textos, de science.nasa.gov/mars/facts…»), además de la de cada curiosidad.

## 5. Decisiones técnicas nuevas
1. **«Hoy», con `resource()`**: sus parámetros son `undefined` hasta `afterNextRender` (en el servidor, no carga nada) y el cargador hace el `import()`; con `?captura=1`, en la fecha fija de las capturas (`core/capture.ts`). La nota del cálculo tiene la longitud de la de antes y el hueco de sus filas está reservado: no se mueve nada al llegar (CLS 0 medido).
2. **La description**: la registra cada página en su constructor (`describePage`, `core/page-meta.ts`) y la lee `SiteTitleStrategy` al acabar la navegación, que es después de crear la página. Las vistas del explorador se crean después (su `router-outlet` aparece al pintar el layout): la suya va en `data.description`. Así los textos van en el chunk de cada página y no en el bundle inicial.
3. **Las cifras con los decimales de su fuente** (`formatExact` y `formatScientific`, en `core/format.ts`): «3396 km», «0,00589», «6,42 × 10²³ kg»; los periodos y las distancias, con las reglas de ESTILO §3.
4. **Las imágenes de las fichas con `NgOptimizedImage`** y un cargador propio (`ngSrc` es el id del cuerpo; el ancho pedido elige 360 o 720); las miniaturas de los índices, igual.
5. **`/404`**: `data.noindex` en la ruta, también en el cliente; mientras el sitio no sea indexable, todas llevan `noindex`.

## 6. Salida de los checks
```
npm run check   → salida 0, sin avisos de presupuesto
- lint y Prettier: limpios
- tests: 707 de 707 en 74 ficheros (cobertura de ephemeris/: 98,9 % de sentencias, 93,85 % de ramas,
  100 % de funciones y 99,76 % de líneas)
- build: 40 rutas prerenderizadas (antes, 19: /lunas y las 20 fichas de las lunas, nuevas)
  JS inicial 305,42 kB (main) · 313,74 kB con los estilos (aviso a 320) · 86,91 kB comprimido
  diferidos: la ficha 19,74 kB, «Sobre el proyecto» 19,67, los créditos 14,44, el índice de lunas 2,14
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor en su JS inicial; código propio inicial, 14,32 kB de 15
  three 743,94 kB · astronomy-engine 83,33 kB · interfaz del explorador 156,96 kB, diferidos
- check-links: 1121 enlaces internos bien (rutas, ficheros y anclas) en las 40 páginas
```

**e2e** (`npx playwright test`, Chromium con SwiftShader, en local): 97 de 97. En la ronda completa, la de axe en las 40 rutas se quedó sin tiempo (2 minutos por test: con las 30 fichas, más páginas que antes); con su propio tiempo máximo, pasa en escritorio y en móvil (44 y 39 s). Los 10 nuevos de `e2e/contenido.spec.ts`, el de privacidad en las 40 rutas y los de antes, en verde. El CI de la rama (lint, tests, build y e2e), en verde con las entregas 9.a a 9.d.

**Comprobaciones con la red** (a demanda): `node scripts/check-links.mjs --externos`, los 107 enlaces externos bien, salvo los 3 de ivanchesa.com (no resuelve: pendientes del dominio); `node scripts/check-constellation-names.mjs`, las 88 constelaciones en la tabla del IGN y los 14 cambios con su motivo comprobado en los PDF.

**Métricas de las páginas** (`node scripts/measure-pages.mjs`, en las condiciones del móvil de Lighthouse; la mediana de 3 cargas, en el PC de Iván):

| Página | FCP | LCP | CLS | TBT | Tarea más larga | Nota estimada | Errores de consola | Imágenes |
|---|---|---|---|---|---|---|---|---|
| /planetas/marte | 1,10 s | 1,10 s | 0,000 | 274 ms | 228 ms | 95 | 0 | bien |
| /planetas/saturno | 1,04 s | 1,04 s | 0,000 | 220 ms | 196 ms | 96 | 0 | bien |
| /lunas/titan | 1,04 s | 1,04 s | 0,000 | 236 ms | 225 ms | 96 | 0 | bien |
| /sol | 1,13 s | 1,13 s | 0,000 | 201 ms | 205 ms | 97 | 0 | bien |
| /luna | 1,04 s | 1,04 s | 0,000 | 208 ms | 205 ms | 97 | 0 | bien |
| /planetas | 1,05 s | 1,05 s | 0,000 | 214 ms | 235 ms | 97 | 0 | bien |
| /lunas | 0,95 s | 0,95 s | 0,000 | 225 ms | 197 ms | 96 | 0 | bien |
| /sobre-el-proyecto | 1,10 s | 1,10 s | 0,000 | 181 ms | 230 ms | 98 | 0 | bien |
| /creditos | 1,08 s | 1,08 s | 0,000 | 144 ms | 194 ms | 99 | 0 | bien |

Antes del arreglo de las fuentes (§4.4): CLS de 0,198 en `/creditos` y de 0,055 en `/sobre-el-proyecto`. El tiempo de bloqueo es sobre todo una tarea de unos 200 ms con la CPU ×4: la evaluación del bundle y la hidratación.

**Pesos**: cada ficha pide su imagen (de 2 a 35 kB la de 360 px y de 5 a 119 kB la de 720); las 60, 1,4 MB en el repositorio. Las tres fuentes, 53 kB. La imagen para compartir, 34 kB.

## 7. Capturas
En `docs/informes/img/fase-9/` (WebP; `node scripts/capture-pages.mjs`, `node scripts/preview-og.mjs` y `node scripts/capture-sky.mjs`):
- **Fichas**: `escritorio-ficha-marte` y `movil-ficha-marte`, `escritorio-ficha-saturno` (los anillos enteros y su tabla), `escritorio-ficha-titan` y `movil-ficha-titan`, `escritorio-ficha-sol` y `escritorio-ficha-luna` (con su fase), a página entera y con los datos «de hoy» en la fecha de las capturas.
- **Índices**: `escritorio-planetas`, `movil-planetas`, `escritorio-lunas` y `movil-lunas`.
- **Páginas**: `escritorio-creditos`, `escritorio-sobre-el-proyecto` y `movil-sobre-el-proyecto` (el diagrama, desplazable), y `escritorio-404` (con el pie y su nota).
- **La vista previa del enlace**, simulada: `compartir-inicio`, `compartir-planetas-marte`, `compartir-lunas-titan` y `compartir-cielo`.
- **El cielo con las constelaciones en español** (D38): `escritorio-cielo-montsec-noche` y `movil-cielo-montsec-noche` (con el pie del explorador y sus enlaces legales), y `escritorio-cielo-via-lactea` (el lienzo).

## 8. Dependencias añadidas
Ninguna. Los PDF del IGN se descargan a `assets-src/anuarios/` (ignorado por git) y se leen con un lector propio.

## 9. Pendientes y `TODO(ivan)`
En `PENDIENTES.md`, «Bloque E (fase 9)» y «Revisiones y pruebas de Iván»:
- **revisar los textos** en `docs/revision-textos.md`;
- los enlaces a ivanchesa.com, cuando el dominio responda (`TODO(ivan)` en `site.config.ts`);
- la vista previa en una app real, con el dominio (fase 11);
- Lighthouse, con `@lhci/cli` si lo apruebas (fase 10);
- la fuente de reserva en Android (fase 10);
- (opcional) si «Sobre el proyecto» cuenta cómo se ha hecho.

## 10. Propuestas de cambio al plan
1. **`CLAUDE.md`, «Comandos»**: `npm run check` hace también `scripts/check-links.mjs` (los enlaces internos). Que la línea lo diga.
2. **El presupuesto del código propio inicial** (15 kB): queda en 14,32. Si la fase 10 necesita más en el bundle inicial, dos caminos: el pie y la cabecera en un bloque con hidratación incremental (su código saldría del bundle inicial) o subir el presupuesto (decisión de Iván).
3. **Fase 10**: medir con Lighthouse (si se aprueba `@lhci/cli`) la misma muestra de `measure-pages.mjs`, y el CLS en Android.

## 11. Cómo probarlo
- `npm run build` y `node scripts/serve-dist.mjs`, y abrir `http://127.0.0.1:4340/planetas/marte`, `/lunas/titan`, `/sol`, `/luna`, `/planetas`, `/lunas`, `/creditos` y `/sobre-el-proyecto` (sin JavaScript, las fichas se leen enteras; «Hoy», con «—»).
- En el explorador, una luna y «Ficha completa»; en el cielo, las constelaciones en español.
- `node scripts/measure-pages.mjs`, `node scripts/check-links.mjs --externos`, `node scripts/check-constellation-names.mjs` y `node scripts/preview-og.mjs <carpeta>`.
- `node scripts/build-text-review.mjs` regenera `docs/revision-textos.md` (no lo hace si ya tiene correcciones).
