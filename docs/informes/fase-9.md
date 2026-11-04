# Informe: Fase 9 (contenido y compartir)

- **Rama:** `fase-9-contenido`
- **Fecha:** 2026-11-03 (la segunda ronda de la revisión, el 04-11)
- **Estado:** terminada, con las dos rondas de la revisión aplicadas («Respuesta a la revisión» y «Respuesta a la segunda ronda», al final)

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
- **El menú**, al final de la fase: «Cielo» en lugar de «Luna» (Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto, también en el móvil) y, en `/lunas`, la Luna la primera y destacada (enlaza a `/luna`, que no cambia) y después las demás por planeta: hecho (§3, tarea 9).
- **La medida del rendimiento**: vale la limpia; las hechas con otros procesos en el PC, no, y se apunta su ruido; la definitiva, la de la fase 10 (Lighthouse en el CI) y la de producción, la de la fase 11 (§4.1).

## 1. Resumen
- **Las fichas de los 30 cuerpos** (`/planetas/:id`, `/lunas/:id`, `/sol` y `/luna`) y sus índices (`/planetas` y `/lunas`, nueva), prerenderizadas y sin `three` ni astronomy-engine en su JS inicial: las migas de pan, el tipo, el resumen, «Ver en 3D», la imagen del propio motor, «Hoy» (las distancias del día y la fase de la Luna, calculadas en el navegador con un `import()` después de pintar), las tablas de datos con los decimales de su fuente y una nota numerada a ella, las tres curiosidades con su fuente, las lunas del sistema (por su distancia al planeta) y la lista de fuentes.
- **Las imágenes del motor**: 60 en WebP (360 y 720 px, 1,4 MB) y la imagen para compartir, «Tierra Luna Sol» (el Sol, la Tierra y la Luna), en JPEG de 34 kB.
- **Compartir, legal y privacidad**: la description de cada página, Open Graph con la imagen global, la tarjeta grande, `noindex` en todas (y siempre en `/404`) y `robots.txt`; la nota «Sin cookies, sin analítica y sin peticiones a terceros» y el aviso legal y la privacidad de ivanchesa.com en el pie, en el pie del explorador y en el menú del móvil; la privacidad en detalle, con la frase del NEL de Cloudflare, en `/sobre-el-proyecto#privacidad`.
- **`/creditos`**, recurso a recurso y con las licencias una por una, y **`/sobre-el-proyecto`** como caso de estudio (el diagrama de las capas, la precisión y el rendimiento medidos con el enlace a su informe, las decisiones y lo que es ilustrativo).
- **Decisiones de Iván del 03-11**: las constelaciones en español con el latín de la IAU debajo (D38), comprobadas en el Anuario del Real Observatorio de Madrid (IGN); el cielo en tiempo real (D33); la fase propia de antes de la 10, apuntada; **el menú**, con «Cielo» en lugar de «Luna» (Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto, también en el móvil) y, en `/lunas`, la Luna la primera y destacada; y, sobre la medida del rendimiento, la limpia vale para esta fase: la definitiva es la de la fase 10 (Lighthouse en el CI) y la de producción, la de la fase 11 (§4.1).
- **Textos**: repasados con ESTILO y en `docs/revision-textos.md` para Iván (360 textos con su fuente y su hueco, también los fijos de las fichas, del pie y del menú, y las 88 constelaciones para la sesión de revisión).
- **La revisión** (`docs/revisiones/fase-9.md`, cambios necesarios): un bloqueante (las notas de las fichas y «Saltar al contenido» llevaban a la portada), dos importantes y diecisiete menores y sugerencias, aplicados salvo dos propuestas para la fase 10 («Respuesta a la revisión», al final).
- **La segunda ronda** (cambios necesarios, sin bloqueantes): dos importantes («Saltar al contenido» perdía la consulta de la URL y, al hidratar, apuntaba a la portada; el menú del móvil no cabía en horizontal ni con el zoom al 200 %), un menor (los periodos repetían la cifra de la fuente sin su cero) y una sugerencia. Corregidos los tres primeros; la sugerencia, para Iván («Respuesta a la segunda ronda»).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia (comando + salida, cifra, captura) |
|---|---|---|
| Lighthouse móvil ≥ 95 en rendimiento, accesibilidad y buenas prácticas en una muestra de fichas | ⚠️ pendiente: Lighthouse, en la fase 10 (en el CI) y en producción en la fase 11 | **Lighthouse no se ha ejecutado** (§4.1). Lo medido, `node scripts/measure-pages.mjs`: Playwright y el protocolo de DevTools con el estrangulamiento del móvil de Lighthouse (CPU ×4, 562,5 ms de RTT, 1,47 Mbit/s; 412 × 823 a 1,75x; sin caché), la mediana de 3 cargas. **Rendimiento**, estimado con las curvas y los pesos de Lighthouse 12 (el SI, que no se mide, tomado como el LCP: la estimación sale a la baja), en la pasada con el PC libre: **99 en las nueve páginas** (las cinco fichas de la muestra, los índices, los créditos y «Sobre el proyecto»; tabla de §6). Con otras sesiones en marcha en el PC, la cifra no es fiable (§4.1). **Accesibilidad**: axe sin violaciones graves ni críticas en las 40 rutas (`e2e/accesibilidad.spec.ts`, «todas las páginas del sitio», en escritorio y en móvil); la revisión, con todas las severidades en 11 páginas: 0. **Buenas prácticas**, lo que se puede medir: 0 errores de consola y todas las imágenes cargadas y a su proporción, en las 9 páginas medidas; HTTPS, la CSP y las cabeceras, las de la fase 4 |
| e2e de privacidad: 0 cookies y 0 peticiones a terceros en todas las rutas | ✅ | `e2e/privacidad.spec.ts` recorre ahora las 40 rutas prerenderizadas (antes, 11), después del recorrido con clics: 0 peticiones a otros dominios, 0 cookies y `localStorage` solo con claves `tls.*` (§6; lo repitió la revisión) |
| La vista previa del enlace (Open Graph) se ve bien | ⚠️ simulada; la de una app real, en la fase 11 | `node scripts/preview-og.mjs`: las etiquetas del HTML del build de cuatro páginas, pintadas como las tarjetas de una app (la grande y la compacta): `compartir-inicio`, `compartir-planetas-marte`, `compartir-lunas-titan` y `compartir-cielo` (§7). Es nuestro propio script, no un validador ni una app. `e2e/contenido.spec.ts`: en el HTML de las 40 rutas, title, description (distinta en cada una), `og:title`, `og:description`, `og:image` absoluta con su texto alternativo, `og:url` (salvo en la 404) y la tarjeta grande; al navegar en el cliente, también al reutilizarse la ficha (de Fobos a Deimos). **La de una app real**, cuando el dominio exista (fase 11; `PENDIENTES.md`): la imagen es una URL absoluta del dominio, que aún no resuelve |
| Sin cifras sin fuente y sin enlaces rotos | ✅ | **Cifras:** `body-facts.spec.ts`, en los 30 cuerpos, cada fila de datos con una fuente de `SOURCES` y su número en la lista del final; los textos, con su página (las 120 citas, verificadas otra vez por `build-body-texts.mjs`); las cifras de `/sobre-el-proyecto`, cada una con el enlace al informe (o a la revisión) donde se midió; los datos «de hoy», con «calculado con astronomy-engine». **Enlaces:** `node scripts/check-links.mjs` (en `npm run check` y en el CI) resuelve cada enlace contra el `<base href>` de su página, como el navegador, y da por roto un ancla que lleve a otra página: los **1161 internos** de las 40 páginas (rutas, ficheros y anclas), bien. Las notas de las fichas y «Saltar al contenido» llevaban a la portada (hallazgo 1 de la revisión): ahora llevan la ruta de su página (el salto, con la consulta de la URL desde el principio, también al hidratar: segunda ronda, hallazgo 21), y unos e2e los pulsan. Con `--externos`, los **108 externos**, bien, salvo los 3 de ivanchesa.com, pendientes del dominio (no resuelve; `TODO(ivan)`) |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 9.1 `render-body-images.mjs` | hecha | Con la luz y el recorte de las miniaturas (`scripts/lib/body-shots.mjs`, común a los dos scripts): el mismo estilo. La imagen para compartir, una composición de tres renders (§4.2) |
| 9.2 Fichas e índices | hecha | §1. «Hoy» con `resource()` (API pública de Angular 22) y la imagen con `NgOptimizedImage` (cargador propio, `srcset` 1x/2x, `priority`: en el HTML, su `preload` y `fetchpriority`). Las filas, en funciones puras con tests. `/lunas` y `/lunas/:id`, nuevas, y «Lunas» en la cabecera; desde el explorador, «Ficha completa» de las lunas. Las lunas, por su distancia al planeta (`pages/shared/moons.ts`) |
| 9.3 `/creditos` | hecha | Recurso a recurso (`FUENTES.md`), las licencias una por una y el aviso de la NASA (y del resto de instituciones) |
| 9.4 `/sobre-el-proyecto` | hecha | Caso de estudio: qué hace, cómo está hecho, el diagrama (SVG accesible y desplazable en el móvil), los marcos de escala, la precisión y el rendimiento con su informe, las decisiones, lo ilustrativo, la privacidad y el autor |
| 9.5 Compartir | hecha | La description, de un resolver en cada ruta, en un chunk diferido (§5.2). `robots.txt` sin bloquear el rastreo. `noindex`: todas mientras `indexable` sea `false`, y `/404` y `**` siempre |
| 9.6 Legal y privacidad | hecha | La nota y los enlaces legales en el pie, en el pie del explorador y en el menú del móvil (en el móvil, el explorador no tiene pie). Los enlaces, en `site.config.ts` (la fuente única): ivanchesa.com aún no resuelve (`TODO(ivan)`) |
| 9.7 Textos | hecha | Repaso con ESTILO: 8 cifras con el espacio de millares, ya con punto, en el JSON y regeneradas; las aclaraciones de los datos, para quien lee la ficha («la NASA», no «la ficha»), en su generador y regeneradas; los anglicismos de «Sobre el proyecto» («pintado bajo demanda», «bibliotecas», «pruebas»). `docs/revision-textos.md` (§1) |
| 9.8 Constelaciones en español (D38) y el cielo en tiempo real | hecha | §4.3. Si el nombre en español y el latino coinciden (Leo, Libra, Virgo…), una vez |
| 9.9 El menú (decisión de Iván del 03-11) | hecha | «Cielo» (`/cielo`) en lugar de «Luna», en la cabecera y en el menú del móvil (la misma lista, `app.ts`). En `/lunas`, la Luna la primera, en una tarjeta destacada (`featured` en `BodyCard`: «Satélite de la Tierra», la primera frase de su resumen y la imagen de su ficha, con `priority`), que enlaza a `/luna`; después, las demás por planeta. La entradilla y la description de `/lunas`, reescritas. Tests: el orden del menú (`app.spec.ts` y el menú del móvil), la tarjeta y el enlace al cielo (`contenido.spec.ts`), «Cielo» marcado en las dos navegaciones (`cielo.spec.ts`) |

## 4. Desviaciones del plan y motivo
### 4.1 Lighthouse, medido sin Lighthouse
El criterio pide Lighthouse. No se ha ejecutado: `@lhci/cli` espera la decisión de Iván (fase 10, §1 del plan) y usar otra herramienta (`npx lighthouse`) es una condición de parada. Se miden sus métricas con Playwright en sus condiciones de móvil (`scripts/measure-pages.mjs`) y se estima la nota con sus curvas públicas; la accesibilidad, con axe (el motor que usa Lighthouse), y de buenas prácticas, lo que se puede medir. Por eso el criterio queda en ⚠️: **la medida definitiva es la de la fase 10 (Lighthouse en el CI) y la de producción, la de la fase 11** (Iván, 03-11).

**Las condiciones y el ruido de la medida.** La CPU ×4 multiplica lo que haga el resto del PC: con otras tareas en marcha, el tiempo de bloqueo (TBT) se dispara y la nota estimada no es fiable.
- La primera medida de este informe (de 95 a 97, con un TBT de 144 a 274 ms) se hizo con una tarea mía olvidada en segundo plano: un `python` que extraía el texto de un PDF del IGN, casi tres horas con un núcleo entero. Es el proceso de Python que vio la revisión al 88 % de CPU, junto a `torno`.
- Parada esa tarea, y con el PC comprobado antes de medir (ningún proceso con más de 0,15 s de CPU en 3 s), las nueve páginas dan **99**, con un TBT de 95 a 135 ms (§6). Es la medida que vale (Iván, 03-11).
- En dos pasadas más del mismo build, con otras sesiones abiertas en el PC (en la lista de procesos, Codex, el `wrangler` de torno y un `ng serve`), el TBT fue de 119 a 570 ms y de 164 a 1181 ms, y la nota, de 86 a 99 y de 76 a 98 (Saturno, 86; `/planetas`, 76). No se usan.
- Lo que queda de TBT con el PC libre es una tarea de unos 145 ms con la CPU ×4: la evaluación del bundle y la hidratación. Para ganar margen, la hidratación incremental de la fase 10 (hallazgo 20, §10).

### 4.2 La imagen para compartir: una composición, en JPEG
El plan pide un render del motor. Las vistas del explorador encuadran dejando sitio a sus paneles: el cuerpo nunca queda centrado (la Tierra salía arriba y pequeña). Es una composición de tres renders del propio motor, los de las fichas: el Sol a la izquierda (de donde les llega la luz), la Tierra en el centro y la Luna a su escala respecto a la Tierra (no a su distancia), con el halo del Sol difuminado. En JPEG y no en WebP: todas las apps de mensajería leen JPEG; WebP, no todas. 34 kB (WhatsApp no enseña las de más de 300 kB).

### 4.3 Las constelaciones en español (D38): de dónde salen
Fuente: la tabla «Constelaciones» del **Anuario del Real Observatorio de Madrid para 2019** (IGN; «la traducción más habitual del nombre»), para las 88. La tabla traduce el zodiaco palabra por palabra («Gemelos», «Toro», «Carnero»), e Iván quería «Géminis»: en las nueve que cambian, el nombre que usa el propio Anuario para esas constelaciones cuando las recorren los planetas («Constelaciones recorridas», 2014–2019: «Geminis/Cancer», «Leo/Virgo», «Virgo/Libra», «Libra/Escorpio», «Sagitario/Escorpio», «Piscis/Aries») o en su texto («la constelación de Tauro», 2019). Además, dos tildes que faltan en la tabla («Aguila», «Ave del Paraiso»), una mayúscula de la Ortografía («Horno Químico») y dos formas cortas («Cisne», «Escultor»). Lo comprueba `scripts/check-constellation-names.mjs` con los PDF del IGN (con su SHA-256; un lector de texto de PDF propio, `scripts/lib/pdf-text.mjs`, sin dependencias: hace falta para leer la tabla). En el cielo, «Osa Mayor» con «Ursa Major» debajo, en cursiva y más pequeño (si coinciden, como Leo, una vez); en los textos, «en Géminis (Gemini)». La lista, en `docs/revision-textos.md`, para la sesión de revisión. El Diccionario de la RAE habría sido la otra fuente para el zodiaco, pero su web rechaza las peticiones automáticas.

### 4.4 Las fuentes tipográficas, precargadas (adelantado de la fase 10)
Al medir las páginas largas de esta fase con la red lenta, el CLS llegaba a 0,2 en `/creditos` (presupuesto, 0,05). La causa: el CSS crítico que el build mete en el HTML no lleva las `@font-face`, y la hoja entera llegaba a los 1,8 s; hasta entonces, el texto salía con la fuente del sistema y se recolocaba. Ahora: las `@font-face`, en `index.html`; los woff2 de Fontsource, copiados a `/fonts/` con su nombre (angular.json) y precargados; unas fuentes de reserva del mismo ancho medio (`size-adjust` sobre Arial y Georgia, medido en el navegador), y el texto con `font-display: optional` (los títulos, con `swap`). CLS de las 9 páginas medidas: 0. La fase 10 tenía «precarga de la fuente del H1»: hecha aquí.

El precio (hallazgo 15 de la revisión): con `optional`, el navegador solo usa Public Sans si llega en los primeros instantes; si no, la de reserva se queda toda esa visita (en la siguiente ya está en la caché, un día). Con la red lenta de la medida, la revisión vio Arial en todo el texto de `/creditos` y de `/planetas/marte` durante la primera visita; Newsreader, con `swap`, sí entra en los títulos. Las reservas tienen el mismo ancho (a menos de un 0,5 %), así que no se mueve nada, pero en un móvil con mala red la página puede verse sin su tipografía. En la fase 10, en un móvil real: si Public Sans no llega a tiempo, valorar `swap` con `ascent-override`, `descent-override` y `line-gap-override` además de `size-adjust`. Donde no hay Arial (Android), la de reserva es la del sistema: medirlo allí también (`PENDIENTES.md`).

### 4.5 El presupuesto del código propio inicial (15 kB)
Lo que va en el bundle inicial de esta fase (las etiquetas, el pie, la navegación y las rutas nuevas) lo llevó a 16,5 kB. Para bajarlo, sin tocar el presupuesto:
- el índice de cuerpos sale del bundle inicial: los guards y los títulos de las fichas lo cargan con `import()` (la página ya lo lleva en su chunk);
- la navegación de la cabecera, con un `@for`;
- el desplazamiento al navegar (cada página empieza arriba o en su ancla), con unas líneas en `app.ts` en lugar de `withInMemoryScrolling` (4 kB de Angular).

Las correcciones de la revisión (el salto al contenido con la ruta, el desplazamiento solo al cambiar de ruta y la description al reutilizarse la ficha) lo subieron a 15,23 kB. Las descriptions, en resolvers con su `import()` en lugar del registro de `core/page-meta.ts`, lo dejan en 14,70 kB. El salto al contenido con `Location` (segunda ronda, hallazgo 21), en **14,88 kB de 15**: poco margen (§10).

### 4.6 Otras
- **La privacidad, en `/sobre-el-proyecto#privacidad`**: el plan no tiene una ruta para ella; las notas de privacidad llevan a esa sección, que enlaza la política de ivanchesa.com.
- **`npm run check` comprueba también los enlaces internos** (`check-links.mjs`), y el CI: `CLAUDE.md` describe el `check` sin él (§10).
- **La ficha resume las fuentes de los textos** al final («Los textos, de science.nasa.gov/mars/facts…»), además de la de cada curiosidad.
- **La órbita y la presión de la Luna, de su propia ficha** (la Moon Fact Sheet de la NASA; hallazgo 18): la tabla comparada, de la que salen los datos de los planetas, las redondea (384.000 km, 1 km/s, 0 bar), y su curiosidad dice 384.400 km. Ahora, 384.400 km, 1,022 km/s, el perigeo y el apogeo medios con su aclaración y 3 × 10⁻¹⁵ bar de noche (se cambia el generador, `build-body-data.mjs`, y se regenera). Sus datos físicos siguen en la tabla comparada, como los de los planetas.
- **Los periodos, con la cifra de su fuente** (hallazgo 18): «15,9 días» con «15,945421 días» debajo; el año de la Tierra, «365,2 días» (antes, «365 días»). Las cifras de la fuente que acaban en cero siguen saliendo sin él («5 km/s» por «5,0»): propuesta en §10.

## 5. Decisiones técnicas nuevas
1. **«Hoy», con `resource()`**: sus parámetros son `undefined` hasta `afterNextRender` (en el servidor, no carga nada) y el cargador hace el `import()`; con `?captura=1`, en la fecha fija de las capturas (`core/capture.ts`). La nota del cálculo tiene la longitud de la de antes y el hueco de sus filas está reservado: no se mueve nada al llegar (CLS 0 medido). Sin `aria-live`: las cifras ya están en su sitio al leer la sección.
2. **La description, con un resolver en cada ruta**: `describe(clave)` importa `core/descriptions.ts` y, en las fichas, `bodyDescription` saca la primera frase de su resumen (`data/body-description.ts`); `SiteTitleStrategy` la lee de `route.data` al acabar la navegación. Así está al día también cuando el router reutiliza la ficha (de Fobos a Deimos) y en las vistas del explorador, que se crean después; y los textos van en chunks diferidos, no en el bundle inicial.
3. **Las cifras con los decimales de su fuente** (`formatExact` y `formatScientific`, en `core/format.ts`): «3396 km», «0,00589», «6,42 × 10²³ kg»; los periodos y las distancias, con las reglas de ESTILO §3, y la cifra de la fuente al lado si es otra.
4. **Las imágenes de las fichas con `NgOptimizedImage`** y un cargador propio (`ngSrc` es el id del cuerpo; el ancho pedido elige 360 o 720); las miniaturas de los índices, igual.
5. **`/404`**: `data.noindex` en la ruta, también en el cliente; mientras el sitio no sea indexable, todas llevan `noindex`.
6. **Los enlaces de una página a sí misma llevan su ruta** (`/planetas/marte#fuente-1`): con `<base href="/">`, un `#fuente-1` suelto se resuelve contra `/` y lleva a la portada. `check-links.mjs` los resuelve como el navegador. «Saltar al contenido» lleva la URL que se ve, con su consulta (`/cielo?lugar=teide#contenido`: sin ella, sería otro documento), de `Location`: desde el principio (al prerenderizar y al hidratar, sin esperar a la primera navegación) y en cada `NavigationEnd`, también cuando el explorador escribe su estado en la URL. Antes de que se ejecute el JavaScript, el HTML prerenderizado no conoce la consulta: si alguien sigue el salto en ese instante, carga la misma página sin ella (que aún no se había aplicado).
7. **El desplazamiento al navegar**: arriba, o a su ancla, solo si cambia la ruta o hay fragmento; si solo cambia la consulta (el lugar de `/eclipses`), la página no se mueve; al volver atrás, el navegador restaura la posición.

## 6. Salida de los checks
```
npm run check   → salida 0, sin avisos de presupuesto
- lint y Prettier: limpios
- tests: 715 de 715 en 75 ficheros (cobertura de ephemeris/: 98,9 % de sentencias, 93,85 % de ramas,
  100 % de funciones y 99,76 % de líneas)
- build: 40 rutas prerenderizadas (antes, 19: /lunas y las 20 fichas de las lunas, nuevas)
  JS inicial 305,90 kB (main) · 314,23 kB con los estilos (aviso a 320) · 86,78 kB comprimido
  diferidos: «Sobre el proyecto» 19,60 kB, los créditos 14,30, la ficha 13,42; los textos de los
  cuerpos (36,99) y sus datos con sus fuentes (31,48), en chunks que la ficha comparte con los índices
- check-initial-bundle: ninguna de las 40 páginas lleva three, astronomy-engine, los stores ni los
  controles del visor en su JS inicial; código propio inicial, 14,88 kB de 15
  three 743,99 kB · astronomy-engine 83,33 kB · interfaz del explorador 156,97 kB, diferidos
- check-links: 1161 enlaces internos bien (rutas, ficheros y anclas) en las 40 páginas
```

**e2e** (`npx playwright test`, Chromium con SwiftShader, en local): **105 de 105** (5,1 min), con el build de la respuesta a la segunda ronda (antes de ella, 103 de 103, en 6,1 min y en 5,2 la revisión). Los de la segunda ronda: «Saltar al contenido» no cambia de valor al hidratar y conserva la consulta en `/eclipses?lugar=teide` y en el cielo, y el menú del móvil, en horizontal; con el build de antes, los tres fallaban. Entre ellos, los 14 de `e2e/contenido.spec.ts`; los nuevos de la revisión: las notas y «Saltar al contenido» se quedan en la página, la Luna es «Satélite de la Tierra», la description cambia de Fobos a Deimos, la nota de privacidad está en el pie del explorador, el desplazamiento al navegar y, del menú del 03-11, la Luna destacada en `/lunas` y «Cielo» en el menú. También el de privacidad y el de axe en las 40 rutas (en escritorio y en móvil; axe, con su propio tiempo máximo: con las 30 fichas, más de 2 minutos) y los de antes. Una ronda anterior dio 102 y un fallo: el test de las notas de Marte esperaba aún `#fuente-1`; corregido. El CI de la rama, en verde con las entregas 9.a a 9.d; el de estas correcciones, al subirlas.

**Comprobaciones con la red** (a demanda): `node scripts/check-links.mjs --externos`, los 108 enlaces externos bien, salvo los 3 de ivanchesa.com (no resuelve: pendientes del dominio); `node scripts/check-constellation-names.mjs`, las 88 constelaciones en la tabla del IGN y los 14 cambios con su motivo comprobado en los PDF.

**Métricas de las páginas** (`node scripts/measure-pages.mjs`, en las condiciones del móvil de Lighthouse; la mediana de 3 cargas; el build final, en el PC de Iván comprobado sin otras tareas antes de medir: §4.1):

| Página | FCP | LCP | CLS | TBT | Tarea más larga | Nota estimada | Errores de consola | Imágenes |
|---|---|---|---|---|---|---|---|---|
| /planetas/marte | 0,98 s | 0,98 s | 0,000 | 124 ms | 141 ms | 99 | 0 | bien |
| /planetas/saturno | 0,96 s | 0,96 s | 0,000 | 132 ms | 143 ms | 99 | 0 | bien |
| /lunas/titan | 0,99 s | 0,99 s | 0,000 | 123 ms | 143 ms | 99 | 0 | bien |
| /sol | 0,97 s | 0,97 s | 0,000 | 126 ms | 153 ms | 99 | 0 | bien |
| /luna | 1,00 s | 1,00 s | 0,000 | 127 ms | 150 ms | 99 | 0 | bien |
| /planetas | 0,98 s | 0,98 s | 0,000 | 111 ms | 148 ms | 99 | 0 | bien |
| /lunas | 0,89 s | 0,89 s | 0,000 | 135 ms | 149 ms | 99 | 0 | bien |
| /sobre-el-proyecto | 1,00 s | 1,00 s | 0,000 | 98 ms | 148 ms | 99 | 0 | bien |
| /creditos | 0,98 s | 0,98 s | 0,000 | 95 ms | 145 ms | 99 | 0 | bien |

El ruido, en §4.1: con otras sesiones en el PC, el mismo build dio de 86 a 99 y de 76 a 98. Antes del arreglo de las fuentes (§4.4): CLS de 0,198 en `/creditos` y de 0,055 en `/sobre-el-proyecto`.

**Pesos**: cada ficha pide su imagen (de 2 a 35 kB la de 360 px y de 5 a 119 kB la de 720); las 60, 1,4 MB en el repositorio. Las tres fuentes, 53 kB. La imagen para compartir, 34 kB.

## 7. Capturas
En `docs/informes/img/fase-9/` (WebP; `node scripts/capture-pages.mjs`, `node scripts/preview-og.mjs` y `node scripts/capture-sky.mjs`), regeneradas del build final, con las correcciones de la revisión y el menú nuevo (Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto):
- **Fichas**: `escritorio-ficha-marte` y `movil-ficha-marte` (regeneradas con la segunda ronda: el año, «687,0 días», sin la cifra repetida debajo), `escritorio-ficha-saturno` (los anillos enteros y su tabla), `escritorio-ficha-titan` y `movil-ficha-titan`, `escritorio-ficha-sol` y `escritorio-ficha-luna` («Satélite de la Tierra», su fase y su órbita de la Moon Fact Sheet), a página entera y con los datos «de hoy» en la fecha de las capturas.
- **Índices**: `escritorio-planetas`, `movil-planetas`, `escritorio-lunas` y `movil-lunas` (la Luna, la primera y destacada; Proteo antes que Tritón).
- **Páginas**: `escritorio-creditos`, `escritorio-sobre-el-proyecto` y `movil-sobre-el-proyecto` (el diagrama, desplazable, con una flecha por línea), y `escritorio-404` (con el pie y su nota).
- **La vista previa del enlace**, simulada: `compartir-inicio`, `compartir-planetas-marte`, `compartir-lunas-titan` y `compartir-cielo`.
- **El cielo con las constelaciones en español** (D38): `escritorio-cielo-montsec-noche` (con el pie del explorador, su nota de privacidad y sus enlaces legales) y `movil-cielo-montsec-noche`, y `escritorio-cielo-via-lactea` (el lienzo).

## 8. Dependencias añadidas
Ninguna. Los PDF del IGN se descargan a `assets-src/anuarios/` (ignorado por git) y se leen con un lector propio.

## 9. Pendientes y `TODO(ivan)`
En `PENDIENTES.md`, «Bloque E (fase 9)» y «Revisiones y pruebas de Iván»:
- **revisar los textos** en `docs/revision-textos.md`;
- los enlaces a ivanchesa.com, cuando el dominio responda (`TODO(ivan)` en `site.config.ts`);
- la vista previa en una app real, con el dominio (fase 11);
- Lighthouse en el CI (fase 10; `@lhci/cli`, por aprobar) y la medida en producción (fase 11);
- la fuente en un móvil real: si Public Sans llega a tiempo con `optional` y la de reserva en Android (fase 10);
- (opcional) si «Sobre el proyecto» cuenta cómo se ha hecho.

## 10. Propuestas de cambio al plan
1. **`CLAUDE.md`, «Comandos»**: `npm run check` hace también `scripts/check-links.mjs` (los enlaces internos). Que la línea lo diga.
2. **El presupuesto del código propio inicial** (15 kB): queda en 14,88. Si la fase 10 necesita más en el bundle inicial, dos caminos: el pie y la cabecera en un bloque con hidratación incremental (su código saldría del bundle inicial) o subir el presupuesto (decisión de Iván).
3. **Fase 10**: medir con Lighthouse (si se aprueba `@lhci/cli`) la misma muestra de `measure-pages.mjs`, en el CI (sin otras tareas en la máquina), y el CLS y la fuente en Android.
4. **Fase 10, la hidratación incremental de las fichas** (hallazgo 20): `@defer (hydrate on viewport)` en las secciones que quedan bajo el pliegue (los datos, las curiosidades, las fuentes), para bajar la tarea larga de la hidratación y ganar margen de TBT.
5. **Los ceros finales de las fuentes** (hallazgo 18): el dato generado guarda el número, y «5.0 km/s» de la NASA sale «5 km/s» (la velocidad de escape de Marte; la gravedad de Saturno, «9 m/s²»; el día solar de Venus, «2802 h» por «2802.0»). Propuesta: que `build-body-data.mjs` guarde también los decimales de la fuente (`digits`) y que `formatExact` los use. Para el backlog (§9 del plan) o la fase 10.
6. **`/luna` en el menú y en las migas** (segunda ronda, sugerencia 24): con el menú nuevo, la Luna es la primera de `/lunas`, pero en `/luna` no se marca ningún enlace del menú y las migas dicen «Inicio › Luna». Propuesta: «Inicio › Lunas › Luna» y «Lunas» marcado también en `/luna`, con la misma URL. El plan dice que `/luna` «no cambia»: decide Iván (`PENDIENTES.md`).

## 11. Cómo probarlo
- `npm run build` y `node scripts/serve-dist.mjs`, y abrir `http://127.0.0.1:4340/planetas/marte`, `/lunas/titan`, `/sol`, `/luna`, `/planetas`, `/lunas`, `/creditos` y `/sobre-el-proyecto` (sin JavaScript, las fichas se leen enteras; «Hoy», con «—»). Pulsar una nota de una tabla: baja a su fuente, en la misma ficha.
- En el explorador, una luna y «Ficha completa»; en el cielo, las constelaciones en español.
- `node scripts/measure-pages.mjs` (con el PC sin otras tareas), `node scripts/check-links.mjs --externos`, `node scripts/check-constellation-names.mjs` y `node scripts/preview-og.mjs <carpeta>`.
- `node scripts/build-text-review.mjs` regenera `docs/revision-textos.md` (no lo hace si ya tiene correcciones).

## Respuesta a la revisión
Revisión: `docs/revisiones/fase-9.md` (cambios necesarios: 1 bloqueante, 2 importantes, 11 menores y 6 sugerencias).

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 1 | Bloqueante | **Hecho.** Las notas llevan la ruta de la ficha (`[href]="pagePath(bodyId()) + '#fuente-' + n"`: en el HTML, `/planetas/marte#fuente-1`, que funciona también sin JavaScript) y «Saltar al contenido», la de la página (`skipHref` en `app.ts`, al día en cada `NavigationEnd`, también en el servidor). `check-links.mjs` resuelve cada `href` contra el `<base href>` de la página y da por roto un ancla que lleve a otra página: con el código de antes, falla. Un e2e nuevo pulsa la nota 1 de Marte (sigue en la ficha, con la fuente a la vista) y, con el teclado, «Saltar al contenido» (sigue en la ficha) |
| 2 | Importante | **Hecho.** `kindLineOf` (`pages/body-detail/body-labels.ts`, con tests): la Luna, «Satélite de la Tierra», con el enlace a la Tierra; las demás, «Luna de Saturno». e2e en `/luna`; captura `escritorio-ficha-luna` |
| 3 | Importante | **Hecho.** La nota, en el pie del explorador («Un proyecto de Iván Chesa Lapena · Aviso legal · Sin cookies, sin analítica y sin peticiones a terceros · Créditos», con su enlace a `#privacidad`) y, en el móvil, donde el explorador no tiene pie, en el menú, con los dos enlaces legales. Un e2e en `/` y otro en el menú del móvil. El informe y ESTILO, corregidos; captura `escritorio-cielo-montsec-noche` |
| 4 | Menor | **Hecho, de otra forma**: en lugar de leer el id de `ActivatedRoute`, la description sale de un resolver de cada ruta (`route.data`), que ya está al día al acabar la navegación, también al reutilizarse la ficha. Fuera el registro de `page-meta.ts` (y su comentario). e2e de Fobos a Deimos: el título, la description y `og:description` de Deimos |
| 5 | Menor | **Hecho.** El desplazamiento, solo si cambia la ruta (sin la consulta ni el fragmento) o si hay fragmento; nunca al volver atrás. e2e: en `/eclipses`, cambiar el lugar no mueve la página; una página nueva empieza arriba |
| 6 | Menor | **Hecho.** Las lunas, por su semieje (`moonsByDistance`, `pages/shared/moons.ts`) en `/lunas` y en la familia de cada ficha: Proteo antes que Tritón. La description de `/lunas`, reescrita sin «de Fobos a Proteo» |
| 7 | Menor | **Hecho.** El latín, solo si es otro nombre; la caja de la etiqueta, de dos líneas solo entonces (test en `engine.spec.ts`: «Orión» con «Orion»; «Leo», una vez). ESTILO ya lo decía |
| 8 | Menor | **Hecho.** Un texto por lo que se ve (`imageAltOf`, con tests): «su superficie real», «sus nubes» (Venus y los gigantes), «sus nubes y sus anillos», «sus continentes, sus océanos y sus nubes», «su neblina» (Titán) o «su color esquemático (no hay un mapa de su superficie)». En ESTILO |
| 9 | Menor | **Hecho.** Las migas se quitan antes de contar los bloques (ya salen las entradillas de `/planetas` y de `/lunas`), y una sección nueva, «Los textos fijos de las fichas, del pie y del menú»: el tipo, los títulos, las etiquetas y sus aclaraciones, las notas de «Hoy», los textos alternativos, la nota de las fuentes, el pie, el pie del explorador y el menú. Regenerado: 360 textos |
| 10 | Menor | **Hecho.** Todas las capturas de la fase, regeneradas del build final (§7) |
| 11 | Menor | **Hecho.** Los dos criterios, en ⚠️ con la fase en la que se medirán (Lighthouse, en la fase 10, en el CI, y en producción en la 11; la vista previa real, en la 11). La nota de Marte, que estaba en el límite (94,5), salía de una medida con una tarea mía olvidada en segundo plano (el proceso de Python que vio la revisión); con el PC libre, 99. Las condiciones y el ruido, en §4.1. Iván (03-11): se queda la medida limpia |
| 12 | Menor | **Hecho.** Sin el espacio de la plantilla: «3396 km» con el espacio duro del `span`, como «6,42 × 10²³ kg» |
| 13 | Menor | **Hecho.** El mismo relleno en el enlace y en la página actual: en la misma línea de base |
| 14 | Menor | **Hecho.** La fila de la libración y los anillos enlaza a `docs/revisiones/fase-2.md`, donde se midieron esas cifras |
| 15 | Sugerencia | **Hecho en el informe** (§4.4) y en `PENDIENTES.md`: mirarlo en un móvil real en la fase 10 y, si hace falta, `swap` con los `*-override` |
| 16 | Sugerencia | **Hecho.** Fuera el `aria-live` de la nota de «Hoy» |
| 17 | Sugerencia | **Hecho.** «Pintado bajo demanda», «el análisis estático del código (ESLint)», «bibliotecas», «Pruebas con Vitest» |
| 18 | Sugerencia | **En parte.** Los periodos, con un decimal y la cifra de la fuente al lado (el año de la Tierra, «365,2 días»; Titán, «15,9 días» con «15,945421 días»). La órbita y la presión de la Luna, de su Moon Fact Sheet (384.400 km, 1,022 km/s, 3 × 10⁻¹⁵ bar). Los ceros finales («5,0 km/s»), propuesta 5 de §10. Y un arreglo que salió al comprobarlo: `formatExact` quita el ruido de la coma flotante (el periodo de la Luna salía «27,321700 días») |
| 19 | Sugerencia | **Hecho.** En «Hoy», las lunas a su planeta en km enteros, como en la tabla («1.221.870 km»); el Sol y los planetas, en UA |
| 20 | Sugerencia | **Para la fase 10** (propuesta 4 de §10): la hidratación incremental de las secciones de la ficha bajo el pliegue |

## Respuesta a la segunda ronda
Revisión: `docs/revisiones/fase-9.md`, «Segunda ronda» (cambios necesarios, sin bloqueantes: 2 importantes, 1 menor y 1 sugerencia; de los 20 de la primera ronda, 18 resueltos, dos de ellos con un resto, que son los hallazgos 21 y 22; 1 en parte, el 18, y 1 aplazado con motivo, el 20). Sin bloqueantes, no hace falta una tercera ronda (`CLAUDE.md`).

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 21 | Importante | **Hecho.** «Saltar al contenido» sale de `Location` (`prepareExternalUrl(location.path())`), con la consulta: en `/cielo?lugar=teide`, `/cielo?lugar=teide#contenido`, un salto dentro del mismo documento. Es el valor inicial del signal (al prerenderizar y al hidratar, ya la URL de la página, sin esperar a la primera navegación) y se recalcula en cada `NavigationEnd`, también cuando el explorador escribe su estado con el router. **Tests:** `app.spec.ts`, con el `Location` real sobre una URL con consulta (`MockPlatformLocation`), antes de la primera navegación y al navegar. **e2e:** en la ficha de Marte, un `MutationObserver` registra cada valor del enlace desde el HTML prerenderizado (con el código de antes, al hidratar tomaba `/#contenido`, también sin estrangular: el test fallaba); en `/eclipses?lugar=teide` y en el cielo (`/cielo?fecha=…&lugar=teide`), Intro en el salto deja el mismo documento, la misma URL y el Teide (con el código de antes, el enlace era `/eclipses#contenido`). Lo que queda, en §5.6: antes de que se ejecute el JavaScript, el HTML prerenderizado no conoce la consulta |
| 22 | Importante | **Hecho.** El menú abierto, con `max-height: calc(100dvh - 3.5rem - var(--space-2))`, `overflow-y: auto` y `overscroll-behavior: contain`. A 915 × 412, ocupa de 56 a 404 px y se desplaza por dentro hasta «tu privacidad»; en vertical (412 × 839), igual que antes (516 px, sin desplazamiento). e2e nuevo en horizontal: el panel cabe en la pantalla, se llega a los dos enlaces legales y a la nota, y «tu privacidad» lleva a la sección (con el CSS de antes, falla: el panel acababa en 574 px) |
| 23 | Menor | **Hecho.** `periodCells` ya no compara textos: en su unidad y con un decimal o ninguno, la cifra que se ve es la de la fuente y no se repite («88,0 días» en Mercurio, «687,0 días» en Marte y «24,0 h» en el día solar de la Tierra, como en la Planetary Fact Sheet). Test nuevo en `body-facts.spec.ts`; ESTILO, con el ejemplo. Al comprobarlo, un fallo propio: el detalle de Mimas salía «0,942422 días» por el tope de seis decimales de `formatExact`; ahora, «0,9424218 días», los siete de la fuente. Capturas `escritorio-ficha-marte` y `movil-ficha-marte`, regeneradas |
| 24 | Sugerencia | **Para Iván** (propuesta 6 de §10 y `PENDIENTES.md`): el plan dice que `/luna` «no cambia». La propuesta: las migas, «Inicio › Lunas › Luna», y «Lunas» marcado en el menú también en `/luna` |
