# Tierra Luna Sol

Explorador 3D interactivo del Sol, los 8 planetas, 21 lunas, la Tierra y la Luna, en español, con posiciones reales para cualquier fecha. La versión 1 tiene **todas las funcionalidades del proyecto que lo inspira (`ethanplusai/earth-moon-solar`) y además mejoras propias**, sin copiar nada de él.
Es una pieza del portfolio de Iván Chesa Lapena (desarrollador web freelance, https://ivanchesa.es) y se publica en un subdominio de ivanchesa.es.
Es un proyecto **independiente** del repo de ivanchesa.es: sus reglas (Astro, cero JS…) **no aplican aquí**.

**Plan maestro: `docs/PLAN.md`. Léelo entero al empezar cada sesión.** Trabaja por fases, en orden, y solo en la fase actual.
Buenas prácticas oficiales de Angular: @docs/angular-buenas-practicas.md

## Cómo trabajamos (dos IAs + Iván)
- **Tú programas.** Otra sesión de Claude revisa el código y la estrategia (`docs/revisiones/fase-N.md`). **Iván decide.**
- Una fase cada vez, en la rama `fase-N-nombre` creada desde `main`. **Una sesión por fase o por entrega.**
- **Al empezar:** lee este archivo, el plan, el informe y la revisión de la fase anterior. Presenta tu plan de la fase (pasos, archivos, dependencias, riesgos, dudas) y **espera el OK de Iván**.
- **Fases grandes:** divídelas en entregas (N.a, N.b…). Al final de cada sesión, el informe queda actualizado (estado «en curso», qué está hecho, qué falta) y commiteado, para poder retomarlo en una sesión nueva.
- **Al terminar:**
  1. Ejecuta `npm run check`.
  2. Escribe `docs/informes/fase-N.md` con `docs/informes/PLANTILLA.md`.
  3. Haz commit y **PARA**.
  - No fusiones a `main` sin el OK de Iván.
- **Si una revisión pide cambios:** corrígelos en la misma rama y añade «Respuesta a la revisión» al informe.
- **No cambies el alcance ni los criterios de aceptación del plan.** Propón los cambios en el informe. Las ideas nuevas van al backlog (§9 del plan).
- **Si algo es decisión de Iván, pregúntale.** Si falta un dato: `TODO(ivan): …` + `docs/PENDIENTES.md`.

## Reglas permanentes
- **Idioma:** interfaz, textos, comentarios, commits y docs en español de España. Identificadores y nombres de archivo en inglés. URLs en español y sin barra final.
- **Stack fijo:**
  - Angular 22: standalone, zoneless y signals. `OnPush` es el valor por defecto: **no se declara**.
  - TypeScript estricto, sin `any`.
  - Three.js directo, sin `angular-three`.
  - astronomy-engine.
  - CSS propio con custom properties, dirección visual A (`docs/DISENO.md`).
  - Sin React, sin Tailwind, sin librerías de UI.
- **Dependencias:** solo la lista cerrada de `docs/PLAN.md` §1. Para cualquier otra, pregunta antes.
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
- **Coordenadas:** toda conversión de sistema de referencia vive en `ephemeris/coordinates.ts` y tiene test. Tiempo interno en UTC.
- **SSR/prerenderizado:** nada de `window`, `document` ni WebGL fuera de `afterNextRender` o de un bloque `@defer`.
- **Rendimiento:**
  - Bucle de render fuera de Angular. Signals ≤ ~5 actualizaciones/s.
  - Render bajo demanda.
  - `three`, `astronomy-engine`, los stores y los controles del visor **nunca** van en el bundle inicial. En las fichas, los datos «de hoy» se calculan con un `import()` dinámico en `afterNextRender`.
  - Presupuestos por vista en `docs/PLAN.md` §5.
- **Memoria:** todo lo que crea la escena se libera con `dispose()` (también al cambiar de vista o de nivel de calidad).
- **Accesibilidad WCAG 2.1 AA:**
  - Todo lo que se hace en el canvas tiene equivalente en HTML y teclado (listas, tablas, fichas).
  - `prefers-reduced-motion` en TODAS las animaciones: cámara, viajes, recorridos, rotaciones y transiciones de escala.
- **Datos:**
  - No inventes cifras, fechas, coordenadas ni textos factuales.
  - Cada dato lleva `source` (URL). Cada fixture lleva su consulta o URL de origen.
  - Textos nuevos con `reviewed: false`.
- **Licencias:** toda imagen o dato de terceros, en `docs/FUENTES.md` (archivo a archivo) y en `/creditos`.
- **Configuración del sitio:** en UN solo sitio, `src/app/core/site.config.ts`.
- **Seguridad:**
  - Nunca subas credenciales ni las pidas por chat; los secrets los introduce Iván.
  - La geolocalización es opcional, se pide tras una acción del usuario y nunca sale del navegador.
- **Commits** pequeños en español: `feat:`, `fix:`, `test:`, `perf:`, `content:`, `docs:`, `chore:`.
- **No toques** el repo de ivanchesa.es (`../ivan-chesa.es`), ni DNS, ni cPanel, ni el WordPress de producción.

## Skills disponibles (`.claude/skills/`)
Úsalas como referencia cuando toque, sin encadenarlas todas. Las reglas de este archivo mandan sobre cualquier skill.

| Para | Skills |
|---|---|
| Escena, geometría, materiales y luces | `threejs-scene`, `threejs-geometry`, `threejs-materials`, `threejs-lighting`, `threejs-webgl` |
| Shaders (Tierra día/noche, atmósfera, relieve lunar) | `threejs-shaders`, `shader-glsl` |
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
- `npm run check` (lint + test + build; obligatorio antes de cerrar una fase o entrega)

## Definición de terminado (cada fase)
1. Criterios de aceptación cumplidos **y demostrados** en el informe (salidas, cifras, capturas).
2. `npm run check` sin errores ni avisos de presupuesto.
3. Informe completo, commit hecho y trabajo parado a la espera de revisión.
