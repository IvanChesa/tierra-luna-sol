# Tierra Luna Sol

Explorador 3D interactivo del Sol, los 8 planetas, 21 lunas, la Tierra y la Luna, en español, con posiciones y orientaciones reales para cualquier fecha entre 1900 y 2100. La versión 1 tiene **todas las funcionalidades del proyecto que lo inspira (`ethanplusai/earth-moon-solar`) y además mejoras propias**, sin copiar nada de él.
Es una pieza del portfolio de Iván Chesa Lapena (desarrollador web freelance, https://ivanchesa.es) y se publica en un subdominio de ivanchesa.es. **El SEO es secundario**; importan la calidad, el rigor, el rendimiento y la accesibilidad.
Es un proyecto **independiente** del repo de ivanchesa.es: sus reglas (Astro, cero JS…) **no aplican aquí**.

**Plan maestro: `docs/PLAN.md`.** Al empezar cada sesión, lee §0–§5, §7 y la sección de tu fase (el resto, si lo necesitas). Trabaja por fases, en orden, y solo en la fase actual.
Buenas prácticas oficiales de Angular: @docs/angular-buenas-practicas.md

## Cómo trabajamos (dos IAs + Iván)
- **Tú programas.** Otra sesión de Claude revisa el código y la estrategia (`docs/revisiones/`). **Iván decide.**
- Una fase cada vez, en la rama `fase-N-nombre` creada desde `main`.
- **Modo normal:** al empezar una fase, presenta tu plan y **espera el OK de Iván**; al terminar, `npm run check`, informe (`docs/informes/PLANTILLA.md`), commit y **PARA**. No fusiones sin el OK.
- **Modo autónomo por bloques** (el habitual): cuando el prompt de Iván nombra un bloque («Bloque B»), sigue el ciclo de la sección «Modo autónomo por bloques» de abajo, sin esperar OK entre pasos ni entre fases.
- **Fases grandes:** por entregas (N.a, N.b…), con el informe actualizado (estado «en curso») y commiteado al final de cada sesión.
- **Revisiones:** corrige en la misma rama y añade «Respuesta a la revisión» al informe.
- **No cambies el alcance ni los criterios de aceptación.** Propón los cambios en el informe; las ideas nuevas van al backlog (§9 del plan).
- **Si algo es decisión de Iván, pregúntale.** Si falta un dato: `TODO(ivan): …` + `docs/PENDIENTES.md`.

## Modo autónomo por bloques
Los bloques y sus fases están en `docs/PLAN.md` §6 y las ramas, en `docs/prompts/PROMPTS.md`. Cuando Iván escribe «Bloque X», ejecuta todas sus fases con este ciclo. Todas las demás reglas de este archivo siguen siendo obligatorias.

**Para cada fase N del bloque:**
1. Lee §0–§5 y §7 del plan, la sección de la fase y el informe y la revisión anteriores (también `docs/revisiones/bloque-*.md`, si los hay). Escribe tu plan al principio de `docs/informes/fase-N.md` y ejecútalo en su rama, con commits pequeños y por entregas si es grande, con el informe siempre actualizado.
2. Al terminar: `npm run check` e informe completo con evidencias de cada criterio de aceptación (cifras y capturas con `?captura=1` cuando haya cambios visuales).
3. **Revisión automática:** lanza un subagente `general-purpose` sin el contexto de esta sesión. Que lea `CLAUDE.md`, `docs/PLAN.md`, `docs/revisiones/README.md`, el informe y el diff `main...<rama>`; que ejecute él mismo `npm run check`; que mire las capturas; y que escriba `docs/revisiones/fase-N.md` con ese formato.
4. Corrige los Bloqueantes e Importantes (y los Menores rápidos) y añade «Respuesta a la revisión». Si quedaba algún Bloqueante, repite la revisión una vez más.
5. Si `npm run check` pasa y no quedan Bloqueantes: fusiona con `--no-ff` en `main` (y push si hay remoto), añade una línea a `docs/informes/DIARIO.md` (fase, fecha, veredicto y métricas clave) y sigue con la siguiente fase.

**Decisiones ya tomadas por Iván** (no preguntes por ellas):
- Vistas guiadas de la Tierra: Tierra completa, Pacífico, Himalaya, luces nocturnas y España / Bajo Cinca.
- Constelaciones: solo con licencia CC0, CC BY, MIT, BSD o de dominio público; si no, se omiten y se apuntan.
- Subdominio: el provisional de `site.config.ts`.
- Textos: con fuente y `reviewed: false`; Iván los revisa en la fase 9.
- Pruebas en el móvil: se recogen cuando Iván pueda; no bloquean.
- Si una fase depende de pasos manuales de Iván que no están hechos (fase 4: GitHub y staging), aplázala, apúntalo en `DIARIO.md` y sigue con la siguiente.
- Cuando el plan marque algo como opcional (Vía Láctea, KTX2, atmósferas), no es una condición de parada: decide, documenta y sigue.

**Condiciones de parada** (para, explícalo en `DIARIO.md` y en el chat, y espera a Iván):
- Un Bloqueante sin resolver tras dos rondas de revisión.
- Necesitas una dependencia fuera de la lista cerrada o una herramienta externa.
- Un dato o recurso imprescindible no existe o su licencia no es compatible.
- Un criterio de precisión o de rendimiento es imposible sin cambiar el plan.
- Cualquier acción destructiva fuera del proyecto, o que requiera credenciales.

**Al terminar el bloque:** para y deja en `DIARIO.md` un resumen (qué se ha hecho, métricas, desviaciones y pendientes para Iván). No empieces el bloque siguiente: antes lo revisa la sesión de revisión.

## Reglas permanentes
- **Idioma:** interfaz, textos, comentarios, commits y docs en español de España. Identificadores y nombres de archivo en inglés. URLs en español y sin barra final. Los textos visibles siguen `docs/ESTILO.md` (se crea en la fase 3).
- **Stack fijo:**
  - Angular 22: standalone, zoneless y signals. `OnPush` es el valor por defecto: **no se declara**.
  - TypeScript estricto, sin `any`.
  - Three.js 0.186 directo, sin `angular-three`.
  - astronomy-engine.
  - CSS propio con custom properties, dirección visual A (`docs/DISENO.md`).
  - Sin React, sin Tailwind, sin librerías de UI.
- **Dependencias:** solo la lista cerrada de `docs/PLAN.md` §1. Para cualquier otra, o para una herramienta externa, pregunta antes.
- **Angular:**
  - `input()`/`output()`/`model()`, `inject()`, `computed()`.
  - `effect()` solo para sincronizar con sistemas externos (motor 3D, URL).
  - `@if`/`@for`/`@defer`. Sin NgModules.
  - RxJS solo donde lo pida una API.
- **Capas** (`docs/PLAN.md` §4.2; el lint las vigila):
  - `ephemeris/` es TS puro.
  - `three` solo se importa en `scene/`.
  - `scene/` no conoce Angular.
  - Los componentes solo usan `scene/index.ts`.
- **Lienzo único:** el canvas y el `SceneEngine` viven en el layout del explorador y persisten entre sus vistas. Nunca se crea un segundo renderer.
- **Coordenadas y orientación:** toda conversión de sistema de referencia vive en `ephemeris/coordinates.ts`, y toda orientación de cuerpos en `ephemeris/orientation.ts`, con tests. Tiempo interno en UTC.
- **Marcos de escala:** posiciones en float64 en JS y relativas al foco (origen flotante) antes de pasar a la GPU. Nunca posiciones absolutas grandes en float32.
- **Shaders:** todo `ShaderMaterial` o `onBeforeCompile` incluye los chunks comunes de profundidad (`scene/materials/`), según la decisión D13. Las sombras son analíticas (D20).
- **Texturas:** solo a través del manifiesto (`scene/textures.ts`): `ImageBitmapLoader`, tope `maxTextureSize`, nivel de calidad y subida progresiva. Nada de cargas sueltas.
- **SSR/prerenderizado:** nada de `window`, `document` ni WebGL fuera de `afterNextRender` o de un bloque `@defer`.
- **Rendimiento:**
  - Bucle de render fuera de Angular. Signals ≤ ~5 actualizaciones/s; la URL no se actualiza durante la reproducción.
  - Render bajo demanda.
  - `three`, `astronomy-engine`, los stores y los controles del visor **nunca** van en el bundle inicial. En las fichas, los datos «de hoy» se calculan con un `import()` dinámico en `afterNextRender`.
  - Lo que el bundle inicial importe de `ephemeris/` o `data/` no puede arrastrar astronomy-engine: para eso están los módulos sin dependencias `ephemeris/ids.ts`, `ephemeris/constants.ts` y `data/body-index.ts` (fase 1).
  - Presupuestos (incluida la VRAM) en `docs/PLAN.md` §5.
- **Memoria:** todo lo que crea la escena se libera con `dispose()`, también al cambiar de vista o de nivel de calidad.
- **Accesibilidad WCAG 2.1 AA:**
  - Todo lo que se hace en el canvas tiene equivalente en HTML y teclado (listas, tablas, fichas, botones de zoom, control de cámara con el teclado).
  - `prefers-reduced-motion` en TODAS las animaciones: cámara, viajes, recorridos, rotaciones, transiciones de escala y de texto.
- **Privacidad:** 0 cookies, 0 analítica, 0 peticiones a dominios de terceros (todo autoalojado). `localStorage` solo para preferencias, siempre con `try/catch`. La geolocalización es opcional, se pide tras una acción del usuario y nunca sale del navegador.
- **Datos:**
  - No inventes cifras, fechas, coordenadas ni textos factuales.
  - Cada dato lleva `source` (URL). Cada fixture, su consulta o URL de origen.
  - Textos nuevos con `reviewed: false`.
  - Los ficheros generados por script (cabecera «GENERADO por…»: `data/body-data.ts`, `data/body-texts.ts`, `data/moon-elements.ts`, `public/data/stars.bin`, los fixtures) **no se editan a mano**: se cambia su origen y se regeneran. Los textos de los cuerpos viven en `scripts/content/body-texts.json`, y `scripts/build-body-texts.mjs` comprueba que cada cita está en su página.
- **Licencias:** toda imagen o dato de terceros, en `docs/FUENTES.md` (archivo a archivo) y en `/creditos`.
- **Capturas:** toda fase con cambios visuales aporta capturas deterministas (`?captura=1`) de escritorio y móvil en `docs/informes/img/fase-N/`.
- **Configuración del sitio:** en UN solo sitio, `src/app/core/site.config.ts`.
- **Seguridad:** nunca subas credenciales ni las pidas por chat; los secrets los introduce Iván.
- **Commits** pequeños en español: `feat:`, `fix:`, `test:`, `perf:`, `content:`, `docs:`, `chore:`.
- **No toques** el repo de ivanchesa.es (la carpeta hermana `ivan-chesa-es`, antes `ivan-chesa.es`), ni DNS, ni cPanel, ni el WordPress de producción.

## Skills disponibles (`.claude/skills/`)
Úsalas como referencia cuando toque, sin encadenarlas todas. Las reglas de este archivo mandan sobre cualquier skill.

| Para | Skills |
|---|---|
| Escena, geometría, materiales y luces | `threejs-scene`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-webgl` |
| Shaders (Tierra, atmósfera, relieve lunar, sombras analíticas) | `threejs-shaders`, `shader-glsl` |
| Texturas y carga de recursos | `threejs-assets` |
| Estrellas y partículas | `threejs-particles`, `particle-system` |
| Coordenadas, escalas y precisión | `threejs-spatial-data` |
| Interacción y cámara | `threejs-interaction`, `threejs-animation`, `iart-threejs-animation` |
| Rendimiento, memoria y depuración | `threejs-performance`, `threejs-debugging`, `60fps-animation` |
| Tests | `threejs-testing`, `webapp-testing` |
| Accesibilidad y movimiento reducido | `threejs-accessibility`, `accessible-animation`, `web-design-guidelines` |
| Diseño y pulido visual | `taste-skill`, `impeccable` (pregunta antes de cualquier descarga), `web-design-guidelines` |
| Despliegue | `threejs-deployment` |

Ojo: los ejemplos de las skills pueden usar React/R3F o versiones antiguas de three. **Adáptalos a Three.js puro 0.186 dentro de `scene/`.**

## Comandos
- `npm start` (añade `-- --host 0.0.0.0` para probar en el móvil por la red local)
- `npm test`, `npm run lint`, `npm run build`, `npm run e2e`
- `npm run check` (lint + Prettier, tests con el umbral de cobertura de `ephemeris/` ≥ 90 %, build y `scripts/check-initial-bundle.mjs`, que comprueba que ninguna página carga `three` ni `astronomy-engine` en su JS inicial; obligatorio antes de cerrar una fase o entrega)

## Definición de terminado (cada fase)
1. Criterios de aceptación cumplidos **y demostrados** en el informe (salidas, cifras, capturas).
2. `npm run check` sin errores ni avisos de presupuesto.
3. Informe completo y commit hecho. En modo normal, parado a la espera de revisión; en modo autónomo, revisión por subagente aplicada y fusión.
