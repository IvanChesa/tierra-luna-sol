# Tierra Luna Sol

Explorador 3D interactivo del Sol, los planetas, la Tierra y la Luna, en español, con posiciones reales calculadas en el navegador.
Es una pieza del portfolio de Iván Chesa Lapena (desarrollador web freelance, https://ivanchesa.es) y se publica en un subdominio de ivanchesa.es.
Es un proyecto **independiente** del repo de ivanchesa.es: sus reglas (Astro, cero JS…) **no aplican aquí**.

**Plan maestro: `docs/PLAN.md`. Léelo entero al empezar cada sesión.** Trabaja por fases, en orden, y solo en la fase actual.
Buenas prácticas oficiales de Angular (se crean en la fase 0): @docs/angular-buenas-practicas.md

## Cómo trabajamos (dos IAs + Iván)
- **Tú programas.** Otra sesión de Claude revisa el código y la estrategia; sus revisiones están en `docs/revisiones/fase-N.md`. **Iván decide.**
- Una fase cada vez, en la rama `fase-N-nombre` creada desde `main`.
- **Al empezar una fase:** presenta tu plan (pasos, archivos, comandos, dudas) y **espera el OK de Iván**.
- **Al terminar:**
  1. Ejecuta `npm run check`.
  2. Escribe `docs/informes/fase-N.md` con `docs/informes/PLANTILLA.md`.
  3. Haz commit y **PARA**.
  - No fusiones a `main` sin el OK de Iván.
- **Si una revisión pide cambios:** corrígelos en la misma rama y añade «Respuesta a la revisión» al informe (qué arreglaste, qué no y por qué).
- **No cambies el alcance ni los criterios de aceptación del plan.** Propón los cambios en el informe. Las ideas nuevas van al backlog (§9 del plan).
- **Si algo es decisión de Iván, pregúntale.** Si falta un dato, deja `TODO(ivan): …` y apúntalo en `docs/PENDIENTES.md`.

## Reglas permanentes
- **Idioma:** interfaz, textos, comentarios, commits y docs en español de España. Identificadores y nombres de archivo en inglés. URLs en español y sin barra final (`/planetas/marte`).
- **Stack fijo:**
  - Angular 22: standalone, zoneless, signals, `OnPush`.
  - TypeScript estricto, sin `any`.
  - Three.js directo, sin `angular-three`.
  - astronomy-engine.
  - CSS propio con custom properties.
  - Sin React, sin Tailwind, sin librerías de UI.
- **Dependencias:** solo la lista cerrada de `docs/PLAN.md` §1. Para cualquier otra, pregunta a Iván antes de instalarla.
- **Angular:**
  - `input()`/`output()`/`model()`, `inject()`, `computed()`.
  - `effect()` solo para sincronizar con sistemas externos (el motor 3D, la URL).
  - Control de flujo `@if`/`@for`/`@defer`. Sin NgModules.
  - RxJS solo donde lo pida una API (router, HttpClient).
- **Capas** (`docs/PLAN.md` §4.2; el lint las vigila):
  - `ephemeris/` es TS puro.
  - `three` solo se importa en `scene/`.
  - `scene/` no conoce Angular.
  - Los componentes solo usan la API pública de `SceneEngine`.
- **Coordenadas:** cualquier conversión de sistema de referencia vive en `ephemeris/coordinates.ts` y tiene test. Tiempo interno siempre en UTC.
- **SSR/prerenderizado:** nada de `window`, `document` ni WebGL fuera de `afterNextRender` o de un bloque `@defer`. El 3D nunca se ejecuta en el servidor.
- **Rendimiento:**
  - El bucle de render va fuera de Angular. No actualices signals en cada frame (máx. ~5 veces/s).
  - En pausa y sin interacción no se renderiza.
  - `three`, `astronomy-engine`, el store del simulador y los controles del visor nunca van en el bundle inicial: viven dentro del `@defer` del visor. En las fichas, la posición actual se calcula con un `import()` dinámico en `afterNextRender`.
  - Presupuestos en `docs/PLAN.md` §5.
- **Memoria:** todo lo que crea la escena se libera con `dispose()` al destruirla.
- **Accesibilidad WCAG 2.1 AA:**
  - Todo lo que se hace en el canvas se puede hacer con controles HTML y teclado.
  - Foco visible y contraste AA.
  - `prefers-reduced-motion` respetado en TODAS las animaciones (cámara, rotaciones, transiciones).
- **Datos:**
  - No inventes cifras, fechas ni textos factuales.
  - Cada dato numérico lleva `source` (URL).
  - Los textos nuevos llevan `reviewed: false` hasta que Iván los revise.
- **Licencias:** toda imagen o dato de terceros se registra en `docs/FUENTES.md` y aparece en la página `/creditos`.
- **Configuración del sitio** (nombre, URL base, autor, `indexable`): en UN solo sitio, `src/app/core/site.config.ts`.
- **Seguridad:** nunca subas credenciales al repo ni las pidas por chat. Los secrets van en GitHub Secrets y los introduce Iván.
- **Commits** pequeños y en español: `feat:`, `fix:`, `test:`, `perf:`, `content:`, `docs:`, `chore:`.
- **No toques** el repo de ivanchesa.es (`../ivan-chesa.es`), ni DNS, ni cPanel, ni el WordPress de producción.

## Comandos (se crean en la fase 0)
- `npm start`: servidor de desarrollo
- `npm test`: Vitest
- `npm run lint`: ESLint
- `npm run build`: build con prerenderizado
- `npm run e2e`: Playwright
- `npm run check`: lint + test + build (obligatorio antes de cerrar una fase)

## Definición de terminado (cada fase)
1. Criterios de aceptación de la fase cumplidos **y demostrados** en el informe (salidas, cifras, capturas).
2. `npm run check` sin errores ni avisos de presupuesto.
3. Informe completo, commit hecho y trabajo parado a la espera de revisión.
