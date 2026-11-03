# Informe: Fase 9 (contenido y compartir)

- **Rama:** `fase-9-contenido`
- **Fecha:** 2026-11-03
- **Estado:** en curso (9.a)

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
