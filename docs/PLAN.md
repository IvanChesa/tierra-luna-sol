# Tierra Luna Sol: plan del MVP

> Documento maestro del proyecto. Lo ejecuta Claude Code en el PC de Iván, fase a fase.
> Otra sesión de Claude revisa cada fase (`docs/revisiones/`). Si este plan y el código no coinciden, manda el plan. Los cambios al plan se proponen en el informe de fase y los aprueba Iván.
> Creado el 23-10-2026. Actualizado el 23-10-2026 con los cambios aprobados en la revisión de la fase 0 (`docs/informes/fase-0.md`, «Respuesta a la revisión»).

---

## 0. Qué es y para qué

Un **explorador 3D interactivo** del Sol, los 8 planetas, la Tierra y la Luna, en **español**, con las **posiciones reales** para cualquier fecha, calculadas en el navegador. Las fichas de cada cuerpo son HTML real, indexable.

**Objetivo:** pieza de portfolio de Iván Chesa Lapena (desarrollador web freelance, ivanchesa.es). Tiene que demostrar:
1. **Angular moderno**: standalone, signals, zoneless, prerenderizado.
2. **3D en la web bien hecho**: Three.js rápido, sin fugas de memoria, que funcione en móvil.
3. **Rendimiento, SEO y accesibilidad**, que son el terreno profesional de Iván.

**Dónde vive:** un subdominio de ivanchesa.es en Banahosting (propuesto: `tierra-luna-sol.ivanchesa.es`, pendiente de confirmar). Es un proyecto y un repositorio **independientes** de la web ivanchesa.es.

**Inspiración:** existe un proyecto parecido en inglés (`ethanplusai/earth-moon-solar`, MIT). **No se copia nada de él**: ni código, ni textos, ni diseño. Este proyecto se escribe desde cero.

---

## 1. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Angular 22 + TypeScript estricto** | Elección de Iván: Angular tiene valor en el portfolio. |
| D2 | **Standalone + zoneless + signals + `OnPush`** (por defecto en Angular 22: no se declara) | Angular actual, menos JS, rendimiento predecible. |
| D3 | **Three.js usado directamente**, sin `angular-three` | `angular-three` 4.2.4 solo soporta Angular < 22 y three < 0.183. Ir directos evita depender de su calendario. |
| D4 | **astronomy-engine (MIT)** calcula las posiciones en el navegador | Sin ficheros de efemérides que caduquen y con cualquier fecha. Precisión de sobra para divulgación. |
| D5 | **Prerenderizado estático** (`outputMode: "static"`) | Banahosting es hosting compartido sin Node: solo archivos estáticos. Google recibe HTML real. |
| D6 | **Motor 3D como clase TS sin Angular** (`SceneEngine`) | Testable, sin detección de cambios por frame, seguro en el prerenderizado. Angular solo le da órdenes. |
| D7 | **CSS propio con custom properties** (sin Tailwind ni librerías de UI) | Control total, poco peso, misma filosofía que ivanchesa.es. |
| D8 | **Idiomas**: UI, textos, comentarios, commits y docs en español de España. **Identificadores y nombres de archivo en inglés.** **URLs en español** | Convención de Angular en el código; el usuario final y Google, en español. |
| D9 | **URLs canónicas sin barra final** (`/planetas/marte`) | Es lo que genera el router de Angular. Apache se configura para no redirigir a la versión con barra (fase 7). |
| D10 | **Texturas de Solar System Scope (CC BY 4.0)** como fuente principal | Una sola fuente y una sola licencia para todos los cuerpos (incluida la Tierra día/noche/nubes y el fondo de estrellas). |
| D11 | **Despliegue: GitHub Actions → FTPS a Banahosting** | El mismo método que ivanchesa.es. Banahosting bloquea SSH desde GitHub. |
| D12 | **Tests: Vitest (unitarios) + Playwright (e2e) + axe (accesibilidad)** | Vitest viene de serie en Angular 22. |
| D13 | **Sin i18n en el MVP** (solo español) | Se puede añadir después con `@angular/localize`. |

### Dependencias permitidas (lista cerrada)
Cualquier paquete que no esté aquí → **preguntar a Iván antes de instalarlo**.

- **Producción:** `@angular/*` 22.x · `three` `^0.186.0` · `astronomy-engine` `^2.1.19` · `@fontsource/*` (máx. 2 familias, se eligen en la fase 0)
- **Desarrollo:** lo que genera `ng new` (incluido Vitest) · `@types/three` (a juego con three) · `angular-eslint` + `eslint` (+ `@eslint/js` y `typescript-eslint`, que instala `ng add angular-eslint`) · `prettier` · `@playwright/test` · `@axe-core/playwright` · `sharp` (script de texturas) · `@vitest/coverage-v8`

---

## 2. Alcance del MVP

### Dentro
1. **Vista del sistema solar**: el Sol y los 8 planetas en sus posiciones reales para la fecha elegida, con órbitas y fondo de estrellas, en escala ilustrativa (§4.4).
2. **Control del tiempo**: fecha y hora, botón «Ahora», reproducir/pausar y varias velocidades.
3. **Selección de cuerpos** en el canvas o en una lista accesible: la cámara vuela al cuerpo y se abre su ficha resumida.
4. **La Tierra en detalle**: día/noche según la posición real del Sol, luces de ciudades, nubes, atmósfera, océanos con brillo y rotación real según la hora.
5. **La Luna**: posición real respecto a la Tierra, cara visible orientada hacia la Tierra y fase actual (nombre y % iluminado).
6. **Páginas HTML prerenderizadas**: inicio, `/planetas`, `/planetas/:id` (los 8), `/sol`, `/luna`, `/creditos`, `/sobre-el-proyecto` y la 404.
7. **SEO técnico**: title/description/canonical por página, Open Graph, JSON-LD, `sitemap.xml` y `robots.txt`.
8. **Móvil, accesibilidad (WCAG 2.1 AA), `prefers-reduced-motion` y alternativa sin WebGL.**
9. **Despliegue automático** en el subdominio.

### Fuera del MVP (backlog §9; no se toca hasta que Iván lo apruebe)
Relieve lunar real, lunas de otros planetas, escala real, «El cielo desde el Bajo Cinca», eclipses, inglés, PWA/offline.

---

## 3. Requisitos previos (antes de la fase 0)

| Requisito | Estado (23-10) | Acción |
|---|---|---|
| **Node ≥ 22.22.3 o ≥ 24.15** (lo exige Angular 22) | ❌ Hay **22.18.0** | Iván instala Node LTS: `winget install OpenJS.NodeJS.LTS` y comprueba con `node -v` |
| Git | ✅ 2.55 | — |
| GitHub CLI (para el repo y los secrets) | ❌ No instalado | `winget install --id GitHub.cli` y luego `gh auth login` (antes de la fase 7; ideal antes de la fase 0 para que corra el CI) |
| Carpeta del proyecto **fuera de cualquier otro repo git** | ⚠️ Comprobar | Ver tarea 0.1 |

---

## 4. Arquitectura

### 4.1 Estructura de carpetas (objetivo)

```
tierra-luna-sol/
├─ CLAUDE.md                      # reglas permanentes (lee también docs/angular-buenas-practicas.md)
├─ docs/                          # plan, diseño, fuentes, informes, revisiones, pendientes
├─ scripts/
│  ├─ fetch-horizons-fixtures.mjs # datos de referencia de JPL para los tests (se ejecuta una vez)
│  ├─ download-textures.mjs       # descarga los originales listados en docs/FUENTES.md → assets-src/ (gitignored)
│  ├─ build-textures.mjs          # sharp: originales → WebP por niveles (1k/2k/4k) + manifiesto
│  └─ generate-sitemap.mjs        # post-build: sitemap.xml desde las rutas prerenderizadas
├─ public/
│  ├─ textures/{1k,2k,4k}/…       # texturas procesadas (con hash en el nombre)
│  ├─ img/                        # póster del visor, imágenes OG
│  └─ .htaccess                   # fase 7
├─ src/
│  ├─ styles.css                  # tokens de diseño (custom properties) y base
│  └─ app/
│     ├─ core/                    # site.config.ts (ÚNICA fuente de nombre/URL/autor/indexable), seo.service.ts, json-ld.ts
│     ├─ ephemeris/               # TS PURO: posiciones, coordenadas, escala, fases. Ni Angular ni Three.
│     │  └─ fixtures/             # datos de referencia de JPL Horizons y USNO (con la consulta original)
│     ├─ data/                    # bodies.ts: catálogo de cuerpos (datos con fuente + textos)
│     ├─ scene/                   # THREE.JS SIN ANGULAR: SceneEngine y piezas (cuerpos, materiales, cámara, texturas)
│     ├─ state/                   # simulation.store.ts (signals)
│     ├─ features/
│     │  ├─ viewer/               # componente que aloja el canvas y une store ↔ SceneEngine
│     │  ├─ time-controls/
│     │  ├─ body-picker/
│     │  └─ body-panel/
│     └─ pages/                   # home, planets-index, body-detail, credits, about, not-found
└─ e2e/                           # Playwright
```

### 4.2 Capas y reglas de dependencia (las vigila ESLint con `no-restricted-imports`)

```
pages / features (Angular)  ──►  state (signals)  ──►  SceneEngine (API pública)
          │                                                │
          └──────────────►  data  ◄────────────────────────┤
                                                            ▼
                                                     ephemeris (TS puro)
```

- `ephemeris/` no importa nada de Angular ni de `three`.
- `three` **solo** se importa dentro de `scene/`.
- `scene/` no importa nada de Angular.
- Los componentes nunca tocan objetos de Three: llaman a la API de `SceneEngine`.

### 4.3 Coordenadas (fuente típica de errores: se hace una sola vez, en `ephemeris/coordinates.ts`, con tests)

- `Astronomy.HelioVector(body, time)` y `Astronomy.GeoMoon(time)` devuelven vectores **EQJ** (ecuador medio J2000), en UA, geométricos (sin corrección de tiempo de luz).
- Se pasan a **eclíptica J2000 (ECL)** con `Astronomy.Rotation_EQJ_ECL()` + `Astronomy.RotateVector()`.
- Three.js usa **Y hacia arriba**: ECL `(x, y, z)` → Three `(x, z, −y)`. El plano de la eclíptica es el plano XZ de la escena.
- **Orientación de la Tierra**: se construye con la matriz EQJ→ECL (no con «23,44° a ojo») y se gira sobre su eje según el **tiempo sidéreo de Greenwich** (`Astronomy.SiderealTime`). Se valida con el punto subsolar (fase 4).
- Todo el tiempo interno es **UTC** (`Date`). La UI muestra hora peninsular española con la zona indicada.

### 4.4 Escala ilustrativa (documentada en la web, en /sobre-el-proyecto)

- **Distancias**: solo se comprime el radio y se mantiene la dirección real. Punto de partida: `r_vis = K · log10(1 + r_UA / 0,1)`. Debe ser monótona y estar testada; los parámetros se ajustan para que Mercurio no se pegue al Sol y Neptuno quepa en pantalla.
- **Tamaños**: agrandados (por ejemplo, con la raíz del radio real) con mínimo y máximo para que todos se vean.
- **Órbitas**: se muestrean con astronomy-engine a lo largo de un periodo orbital y se les aplica la misma compresión, punto a punto.
- **Luna**: dirección real (GeoMoon); distancia comprimida respecto al radio visual de la Tierra.
- Escala real: fuera del MVP.

### 4.5 Flujo de estado (sin detección de cambios por frame)

- `SimulationStore` (signals): `simTime`, `playing`, `speed` (días/s), `selectedBodyId`, `quality`.
- El `ViewerComponent` traslada los cambios del store a `SceneEngine` con `effect()`.
- Mientras se reproduce, **el motor avanza el tiempo internamente** y sincroniza `simTime` en el store **como mucho unas 4–5 veces por segundo** (para el texto de la fecha).
- `SceneEngine` emite eventos (`bodyPicked`, `ready`, `error`, `contextLost`) que el componente vuelca al store.
- **Render bajo demanda**: en pausa y sin interacción no se pintan frames.

### 4.6 SSR / prerenderizado

- El 3D **nunca** se ejecuta en el servidor. El visor va dentro de `@defer`, con un `@placeholder` (póster estático + texto), y el motor se crea en `afterNextRender`.
- Prohibido `window`, `document` o WebGL fuera de esos puntos.
- `app.routes.server.ts`: `RenderMode.Prerender` en todas las rutas. `planetas/:id` usa `getPrerenderParams`, que lee los ids de `data/bodies.ts`.

---

## 5. Presupuestos de calidad (se miden desde la fase 2 y se cierran en la 6)

| Área | Objetivo |
|---|---|
| JS inicial (sin el chunk 3D) | Aviso > 300 kB · error > 400 kB (en bruto, `budgets` de angular.json) |
| `three` | **Nunca** en el bundle inicial; solo en el chunk diferido del visor |
| `astronomy-engine`, el store del simulador y los controles del visor (`time-controls`, `body-picker`, `body-panel`) | **Nunca** en el bundle inicial: viven dentro del `@defer` del visor. En las fichas (fase 5), la posición actual se calcula con un `import()` dinámico en `afterNextRender` |
| Texturas de la primera vista | ≤ 2,5 MB (nivel alto) · ≤ 1,2 MB (nivel bajo/móvil) |
| Texturas totales del MVP | ≤ 10 MB |
| Lighthouse móvil, páginas de contenido | ≥ 95 en las 4 categorías |
| Lighthouse móvil, inicio (visor 3D) | Rendimiento ≥ 90 · resto ≥ 95 |
| LCP (inicio, móvil simulado) | ≤ 2,5 s. El LCP es el texto o el póster, **nunca** el canvas |
| CLS | ≤ 0,05 (el canvas tiene su hueco reservado) |
| FPS | ≥ 55 en escritorio (nivel alto) · ≥ 30 en móvil de gama media (nivel bajo) |
| Memoria | Ir y volver del visor 10 veces no aumenta `renderer.info.memory` |
| Accesibilidad | axe: 0 violaciones graves o críticas · todo usable con teclado y sin canvas |
| Precisión | Planetas: dirección ≤ 0,05° y distancia ≤ 0,1 % frente a JPL Horizons · Luna: ≤ 0,1° y ≤ 0,5 % |
| Datos | 0 cifras sin fuente |

> **Margen del JS inicial (medido en la fase 0):** la base de Angular (router, hidratación y repetición de eventos) ya ocupa ~272 kB de los 300 kB del aviso. Por eso se mantiene el presupuesto y todo lo nuevo va diferido (ver la fila de `astronomy-engine`).

---

## 6. Fases del MVP

Cada fase: rama `fase-N-nombre` → plan de la fase y OK de Iván → trabajo → `npm run check` → informe (`docs/informes/fase-N.md`) → **parar** → revisión (`docs/revisiones/fase-N.md`) → correcciones → OK → fusión a `main`.

### Fase 0: Cimientos

**Objetivo:** proyecto Angular 22 limpio, con herramientas, estructura, CI y dirección visual aprobada.

Tareas:
1. **Comprobar el entorno.**
   - `node -v` debe dar ≥ 22.22.3 o ≥ 24.15.
   - `git rev-parse --show-toplevel` dentro de la carpeta del proyecto **no debe devolver una carpeta padre**: si lo hace, el proyecto está dentro de otro repo.
   - Si falla cualquiera de las dos, **parar y avisar a Iván**.
2. **`git init -b main`** y primer commit en `main` solo con `CLAUDE.md` y `docs/` (`docs: plan inicial`). Después, crear la rama `fase-0-cimientos`.
3. **Generar el proyecto en una carpeta temporal**, porque `ng new` crea su propio `CLAUDE.md` y chocaría con el nuestro. Se lanza **desde la carpeta padre**, porque la CLI 22 no admite `--directory` fuera de la carpeta actual:
   ```
   cd ..
   npx -y @angular/cli@22 new tierra-luna-sol --directory=tls-scaffold --style=css --ssr --zoneless --routing --prefix=tls --test-runner=vitest --ai-config=claude-code --skip-git --skip-install
   ```
4. **Mover el contenido a la carpeta del proyecto** sin pisar `docs/` ni nuestro `CLAUDE.md`:
   - El `CLAUDE.md` que genera Angular se guarda como `docs/angular-buenas-practicas.md` (nuestro CLAUDE.md lo importa).
   - El `.mcp.json` (servidor MCP de Angular CLI) se conserva.
   - Borrar `../tls-scaffold` y ejecutar `npm install`.
5. **Configuración.**
   - `outputMode: "static"`; prerenderizado en todas las rutas.
   - Comprobar que no hay zone.js.
   - `budgets` según §5.
   - TS estricto (viene de serie). Añadir `noUncheckedIndexedAccess` si no da guerra; si la da, justificarlo en el informe.
6. **Calidad de código.**
   - `ng add angular-eslint` + Prettier.
   - Reglas `no-restricted-imports` de §4.2.
   - Scripts de npm: `start`, `build`, `test`, `lint`, `e2e` (vacío por ahora) y `check` (lint + test + build).
7. **Estructura de §4.1** con archivos mínimos.
   - `core/site.config.ts` lleva nombre, `baseUrl` (provisional `https://tierra-luna-sol.ivanchesa.es`), autor (Iván Chesa Lapena, https://ivanchesa.es), idioma e `indexable: false`.
8. **Rutas vacías** con su `<title>`: `/`, `/planetas`, `/planetas/:id` (con 1 id de prueba), `/sol`, `/luna`, `/creditos`, `/sobre-el-proyecto` y la 404. `<html lang="es">`.
9. **Dirección visual.** Escribir `docs/DISENO.md` con:
   - **2 propuestas**, cada una con paleta (tokens + contraste AA comprobado) y tipografía (máx. 2 familias self-hosted con Fontsource, cifras tabulares para los datos).
   - Un **boceto en texto** de la disposición del visor (escritorio y móvil) y de una ficha.
   - Línea de diseño: *atlas científico / observatorio editorial*, sobria y precisa. Evitar el «espacio genérico» (degradados neón, glassmorphism por todas partes, estética de plantilla de IA).
   - Aplicar los tokens de la propuesta recomendada en `styles.css`; **Iván elige en la revisión**.
10. **CI**: `.github/workflows/ci.yml` (push y PR: `npm ci` → lint → test → build). Acciones con versión fijada.

Criterios de aceptación:
- [ ] `npm run check` pasa sin errores ni avisos de presupuesto.
- [ ] `dist/…/browser/` contiene el HTML prerenderizado de todas las rutas, cada una con su `<title>` dentro del HTML estático.
- [ ] Sin `zone.js` en el build.
- [ ] Una importación de `three` fuera de `scene/` hace fallar el lint (demostrarlo en el informe y revertir).
- [ ] `docs/DISENO.md` tiene las 2 propuestas.
- [ ] El repo git es independiente (`git rev-parse --show-toplevel` = carpeta del proyecto).

### Fase 1: Efemérides y datos

**Objetivo:** el «cerebro» astronómico en TS puro, con tests frente a fuentes oficiales, y el catálogo de cuerpos con datos verificables.

Tareas:
1. Instalar `astronomy-engine`.
2. `ephemeris/coordinates.ts`: EQJ→ECL y ECL→Three (§4.3).
3. `ephemeris/ephemeris.ts` (funciones puras):
   - posiciones heliocéntricas ECL del Sol y los 8 planetas para una fecha;
   - posición geocéntrica de la Luna;
   - ángulo de rotación de la Tierra (tiempo sidéreo);
   - punto subsolar (lat/lon);
   - fase lunar (ángulo, % iluminado, nombre de la fase en español);
   - distancias actuales de cada cuerpo al Sol y a la Tierra.
4. `ephemeris/scale.ts`: escala ilustrativa (§4.4).
5. `ephemeris/orbits.ts`: muestreo de órbitas (por ejemplo, 360 puntos por periodo, con caché).
6. **Datos de referencia (fixtures).**
   - `scripts/fetch-horizons-fixtures.mjs` consulta la API de JPL Horizons (`EPHEM_TYPE=VECTORS`, `REF_PLANE=ECLIPTIC`, `VEC_CORR=NONE`, centro `500@10` para planetas y `500@399` para la Luna) en 3 fechas: 2026-01-01, 2026-10-23 y 2030-06-15, a las 00:00 UT.
   - Guarda la respuesta **con la consulta exacta** en `ephemeris/fixtures/horizons.json`.
   - Fases lunares: 2 lunas llenas y 2 lunas nuevas publicadas por el USNO (Observatorio Naval de EE. UU.), guardadas con la URL de origen.
   - Se ejecuta una vez y se commitea el resultado.
7. **Tests con Vitest.**
   - Precisión frente a los fixtures (§5).
   - Escala monótona.
   - La rotación de coordenadas conserva longitudes.
   - Tiempo sidéreo en la época J2000 ≈ 18,697 h.
   - Fases frente al USNO (±12 h).
   - Fechas límite de la UI (1900 y 2100).
8. **`data/bodies.ts` + `body.model.ts`** con los 10 cuerpos (sol, mercurio, venus, tierra, luna, marte, jupiter, saturno, urano, neptuno):
   - id (slug en español), nombre visible, tipo y enum de astronomy-engine;
   - datos físicos: radio medio, masa, gravedad, duración del día y del año, temperatura media, inclinación del eje y nº de lunas **con fecha**; **cada dato con `source` (URL)**, sobre todo de la NASA Planetary Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/) y NASA Science;
   - textos en español: resumen de 2–3 frases y 3 curiosidades, cada una con fuente y `reviewed: false`.
9. Test que valida que todos los cuerpos tienen todos los campos y todas las fuentes.

Criterios de aceptación:
- [ ] Todos los tests pasan; cobertura de `ephemeris/` ≥ 90 % de líneas.
- [ ] Ni Angular ni `three` en `ephemeris/` (el lint lo garantiza).
- [ ] Ningún dato sin fuente. Los textos van en el informe para que Iván los revise.
- [ ] El informe incluye una tabla con el error medido frente a Horizons, por cuerpo.

### Fase 2: Recursos gráficos y escena base

**Objetivo:** ver el sistema solar real del día de hoy, rápido y sin fugas.

Tareas:
1. **Texturas.**
   - `download-textures.mjs` → `assets-src/` (en `.gitignore`).
   - `build-textures.mjs` (sharp) → WebP por niveles: 1k para todos; 2k para todos; 4k solo para la Tierra (día, noche y nubes). Hash en el nombre y manifiesto tipado.
   - Completar `docs/FUENTES.md` con archivo, URL, fecha de descarga y licencia.
2. **`scene/engine.ts` (`SceneEngine`).**
   - API: `constructor(canvas, opts)`, `setTime(date)`, `setPlaying(bool)`, `setSpeed(n)`, `focus(id | null)`, `setQuality(tier)`, `resize()`, `dispose()` y eventos.
   - Renderer con `outputColorSpace` sRGB, tone mapping y DPR limitado (2 en el nivel alto, 1,5 en el bajo).
3. **Sol** (material emisivo con brillo sencillo) con una `PointLight` en el origen, intensidad ajustada para las luces físicas de three r155+.
4. **Planetas** con sus texturas e inclinación del eje (de `data/`), rotación ilustrativa y anillos de Saturno (`RingGeometry` con UV radial y textura alfa).
5. **Órbitas** (de `ephemeris/orbits.ts`) y **fondo de estrellas** (esfera con la textura de la Vía Láctea, `BackSide`).
6. **Niveles de calidad** (`low` / `medium` / `high`) según DPR, tamaño de pantalla, `hardwareConcurrency` y si es táctil. Afectan a la resolución de las texturas, los segmentos de las esferas y el DPR.
7. **Integración en Angular.**
   - `ViewerComponent` dentro de `@defer (on idle)` con `@placeholder` (póster `public/img/poster-*.webp` con `width`/`height` y `fetchpriority="high"`, más un texto).
   - Motor creado en `afterNextRender` y destruido en `DestroyRef.onDestroy`, que llama a `dispose()` (geometrías, materiales, texturas, renderer).
8. **Bucle:** `requestAnimationFrame`, pausa con `visibilitychange` y render bajo demanda.
9. Contador de FPS y de `renderer.info` **solo en desarrollo**.

Criterios de aceptación:
- [ ] Inicio: primero se pinta el texto/póster; después aparecen el Sol, los 8 planetas en sus posiciones de hoy, las órbitas y las estrellas.
- [ ] `three` no está en el bundle inicial (informe con la salida de `ng build`).
- [ ] Sin errores de `window`/`document` en el prerenderizado.
- [ ] Prueba de memoria de §5 superada (con cifras de antes y después en el informe).
- [ ] FPS y peso de texturas de la primera vista medidos según §5 (con cifras en el informe).
- [ ] En pausa y sin interacción: 0 frames pintados por segundo.

### Fase 3: Tiempo e interacción

**Objetivo:** que se pueda jugar con el tiempo y explorar los cuerpos, también sin ratón.

Tareas:
1. **`state/simulation.store.ts`** con signals (§4.5) y sus tests.
2. **`TimeControlsComponent`**:
   - fecha y hora (inputs nativos accesibles, rango 1900–2100), botón «Ahora», reproducir/pausar;
   - velocidades: 1 h/s, 1 día/s, 1 semana/s, 1 mes/s y 1 año/s;
   - fechas formateadas con `Intl.DateTimeFormat('es-ES')`.
3. **`BodyPickerComponent`**: lista de botones (funciona aunque no haya canvas) + selección en el canvas por raycast, con esferas de impacto invisibles más grandes para el móvil.
4. **Cámara.**
   - Vuelo suave al cuerpo (~1,2 s con easing); el objetivo de la cámara sigue al cuerpo mientras se mueve.
   - Botón «Vista general».
   - Con `prefers-reduced-motion`: cambio directo, sin vuelo.
5. **`BodyPanelComponent`**: nombre, resumen, 4–6 datos, distancia actual al Sol y a la Tierra para la fecha elegida, y enlace a la ficha completa.
6. **Estado en la URL**: `/?fecha=2030-01-01T00:00Z&cuerpo=jupiter` se puede compartir. Sincronización con `replaceUrl` y con *debounce*.
7. **Teclado**:
   - `Espacio`: reproducir/pausar, salvo si el foco está en un input.
   - `Esc`: cerrar la ficha o volver a la vista general.
   - Orden de tabulación lógico y foco visible.
8. **Anuncios para lector de pantalla** (`aria-live="polite"`) al seleccionar un cuerpo. **No** en cada tic de la fecha.
9. **E2E (Playwright)**: elegir Marte, cambiar la fecha y abrir un enlace con parámetros.

Criterios de aceptación:
- [ ] Todo se puede hacer con teclado y sin canvas.
- [ ] Al reproducir, el movimiento es coherente: Mercurio da unas 4 vueltas por cada vuelta de la Tierra.
- [ ] `/?fecha=…&cuerpo=jupiter` abre esa fecha con Júpiter enfocado.
- [ ] Durante la reproducción, el store se actualiza ≤ 5 veces/s (medido).
- [ ] Con `prefers-reduced-motion`: sin vuelos animados y reproducción en pausa al cargar.

### Fase 4: La Tierra y la Luna

**Objetivo:** la pieza «guau» del proyecto, con rigor.

Tareas:
1. **Material de la Tierra** (`ShaderMaterial` u `onBeforeCompile`):
   - mezcla de día y noche según la dirección real del Sol, con un terminador suave;
   - luces de ciudades solo en el lado nocturno;
   - brillo especular en los océanos y relieve con el mapa de normales;
   - nubes en una esfera algo mayor, con deriva lenta ilustrativa;
   - atmósfera con efecto Fresnel (borde iluminado), con mezcla aditiva.
2. **Orientación real** (§4.3): la Tierra gira según la hora y la cara iluminada coincide con la realidad.
3. **Luna**:
   - textura y dirección real;
   - cara visible siempre hacia la Tierra (la libración queda fuera del MVP);
   - fase en la ficha, coherente con la iluminación de la escena.
4. **Vista predefinida «Tierra y Luna»** que encuadra las dos.
5. **Opcional:** marcador discreto en Fraga/Lleida en la vista cercana (prepara la sección del Bajo Cinca). Coordenadas tomadas de una fuente citada.

Criterios de aceptación:
- [ ] Test: el 21-06-2026 a las 12:00 UTC, el punto subsolar está a ≈ +23,4° de latitud y ≈ 0° de longitud (±2°). La misma función que alimenta el shader es la que se testea.
- [ ] Capturas en el informe: luna llena, cuarto creciente y la Tierra a mediodía y a medianoche UTC.
- [ ] La fase lunar mostrada coincide con los fixtures del USNO.
- [ ] FPS con la Tierra de cerca dentro del presupuesto de §5.

### Fase 5: Contenido y SEO

**Objetivo:** páginas que posicionen y que se lean bien sin 3D.

Tareas:
1. **Páginas.**
   - `/planetas`: índice con tarjetas.
   - `/planetas/:id`, `/sol` y `/luna`: ficha completa con H1, resumen, tabla de datos con fuentes, curiosidades, imagen, posición actual calculada en el cliente (con texto alternativo en el prerenderizado) y botón «Ver en 3D» → `/?cuerpo=…`. **Sin Three.js en estas páginas.**
   - `/creditos`: todas las fuentes y licencias. Atribución CC BY 4.0 de Solar System Scope, astronomy-engine y three (MIT), y aviso de que no hay respaldo de la NASA.
   - `/sobre-el-proyecto`: qué es, por qué, stack y decisiones técnicas (escala ilustrativa, precisión), y autor con enlace a ivanchesa.es.
   - 404.
2. **`SeoService`**:
   - title ≤ 60 caracteres, description ≤ 155, canonical desde `site.config` (sin barra final);
   - Open Graph y Twitter, con `og:image` 1200×630 (genérica y por cuerpo);
   - `noindex` mientras `indexable: false`.
3. **JSON-LD generado desde los datos** (nunca escrito a mano por página): `WebSite` + `Person` (autor) en todas, y `WebPage` con `about` en las fichas. Los `sameAs` solo con URLs reales y comprobadas.
4. **`sitemap.xml`** generado en el post-build desde las rutas indexables, y **`robots.txt`** con la URL del sitemap.
5. Repasar los textos de la fase 1 → lista en `docs/PENDIENTES.md` para que Iván los revise.

Criterios de aceptación:
- [ ] Cada ruta lleva en el HTML estático su title, description, canonical y JSON-LD (comprobado con grep sobre `dist`).
- [ ] Lighthouse móvil ≥ 95 en las 4 categorías en `/planetas/marte`, `/luna` y `/creditos`.
- [ ] JSON-LD válido, sin enlaces internos rotos y sin cifras sin fuente.

### Fase 6: Pulido (móvil, accesibilidad, rendimiento, alternativa sin WebGL)

Tareas:
1. **Móvil**:
   - controles en un panel inferior plegable y ficha como hoja inferior;
   - gestos táctiles y zonas táctiles ≥ 44 px.
2. **Sin WebGL o con el contexto perdido**: se queda el póster, la lista de cuerpos, las fichas y un mensaje claro (con «recargar» si se pierde el contexto).
3. **Accesibilidad**:
   - axe con Playwright y contraste AA;
   - foco visible, zoom al 200 % y `prefers-reduced-motion` en **todas** las animaciones.
4. **Rendimiento**: ajustar los niveles de calidad, precargar la fuente del H1, caché de las texturas por hash, y contar draw calls y peso.
5. **E2E** en escritorio y móvil emulado: inicio, canvas, seleccionar, fecha, ficha y 404. WebGL en Chromium headless (SwiftShader).
6. **Capturas finales** (escritorio y móvil) en el informe y checklist manual en Chrome, Firefox y Safari (Iván lo prueba en el móvil).

Criterios de aceptación:
- [ ] Todos los presupuestos de §5 se cumplen y se demuestran (tabla en el informe).
- [ ] axe: 0 violaciones graves o críticas.
- [ ] E2E verdes en CI.

### Fase 7: Despliegue

**Iván (manual):**
1. Crear el repo en GitHub (privado hasta el lanzamiento).
2. Crear el subdominio en cPanel con AutoSSL.
3. Crear una cuenta FTP limitada a la carpeta del subdominio.
4. Meter los secrets con `gh secret set` (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`). La contraseña la escribe Iván; nunca va en el chat ni en el repo.

**Claude Code:**
1. **`public/.htaccess`**:
   - HTTPS obligatorio;
   - `DirectorySlash Off` + `Options -Indexes` + reescritura interna de `/ruta` → `/ruta/index.html` cuando exista;
   - 301 de `/ruta/` → `/ruta`;
   - `ErrorDocument 404` con la 404 prerenderizada;
   - caché larga e `immutable` para los archivos con hash y las texturas, y corta para el HTML;
   - compresión;
   - cabeceras de seguridad, con una CSP compatible con el CSS crítico en línea de Angular (valorar `security.autoCsp` o desactivar `inlineCritical`). Sin errores de CSP en consola.
2. **`.github/workflows/deploy.yml`**: en push a `main`, si el CI pasa → build → `SamKirkland/FTP-Deploy-Action` (versión fijada, `protocol: ftps`, `local-dir` = carpeta `browser/` del build). Mismo enfoque que ivanchesa.es (§12 de su plan).
3. **Verificación en producción** (con `curl`): 200 en todas las rutas, 301 de las URLs con barra, 404 real, cabeceras de caché y seguridad, y Lighthouse en producción según §5.
4. `indexable: true` **solo con el OK de Iván**; después, Iván da de alta el sitemap en Search Console.
5. README de portfolio (capturas, stack, decisiones, cómo ejecutarlo) y LICENSE (lo decide Iván). Repo público al lanzar.

Criterios de aceptación:
- [ ] El sitio está en https://(subdominio) con HTTPS válido y se despliega solo al hacer push a `main`.
- [ ] Las comprobaciones con `curl` pasan (salida en el informe).
- [ ] Lighthouse en producción cumple §5.

---

## 7. Flujo de trabajo entre las dos IAs

| Quién | Hace |
|---|---|
| **Claude Code (terminal, PC de Iván)** | Programa. Una fase cada vez, en su rama. Presenta el plan de la fase, espera el OK, ejecuta, pasa `npm run check`, escribe el informe y **para**. |
| **Claude (sesión de revisión)** | Lee el informe y el diff `main...fase-N`, comprueba los criterios de aceptación y escribe `docs/revisiones/fase-N.md` con hallazgos clasificados (Bloqueante / Importante / Menor / Sugerencia). |
| **Iván** | Decide: aprueba el plan de cada fase, elige las opciones de diseño, revisa los textos, da el OK a la fusión y hace los pasos manuales (Node, GitHub, cPanel, secrets). |

Ciclo de una fase:
1. Iván pega en la terminal el prompt de `docs/prompts/`.
2. Claude Code presenta el plan de la fase → Iván aprueba.
3. Claude Code ejecuta, escribe el informe, hace commit y para.
4. Iván escribe en el chat de revisión: «revisa la fase N».
5. La revisión queda en `docs/revisiones/fase-N.md`.
6. Iván le dice a Claude Code: «aplica la revisión de la fase N». Las correcciones van en la misma rama y se añade «Respuesta a la revisión» al informe.
7. Segunda revisión, si hacía falta → Iván da el OK → fusión a `main` (`--no-ff`) → siguiente fase.

Reglas:
- Claude Code **no cambia** los criterios de aceptación ni el alcance: lo propone en el informe.
- Las ideas nuevas van al backlog (§9), no al código.
- Si falta un dato: `TODO(ivan):` + `docs/PENDIENTES.md`. Nunca se inventa.

---

## 8. Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Node demasiado antiguo para Angular 22 | Requisito previo (§3) y comprobación en la tarea 0.1 |
| `ng new` pisa nuestro `CLAUDE.md` | Se genera en una carpeta temporal (tareas 0.3–0.4) |
| El proyecto acaba dentro de otro repo git | Comprobación con `git rev-parse` (tarea 0.1) |
| Código WebGL ejecutado en el prerenderizado (`window is not defined`) | `@defer` + `afterNextRender` + regla de lint: `three` solo en `scene/` |
| Errores de sistema de coordenadas (planetas «girados») | Un único módulo `coordinates.ts` y tests frente a JPL Horizons |
| La IA se inventa cifras o textos | `source` obligatorio, test de campos, `reviewed: false` y revisión de Iván |
| Peso o FPS malos en móvil | Niveles de calidad, presupuestos medidos desde la fase 2 y render bajo demanda |
| Fugas de memoria de WebGL | `dispose()` obligatorio y prueba de 10 navegaciones |
| Cambios incompatibles en `three` (versiones 0.x) | `^0.186.0` fija la versión menor; actualizar solo a propósito |
| URLs duplicadas con y sin barra | D9 + reglas de `.htaccess` + canonical |
| CSP frente al CSS crítico en línea de Angular | Tarea específica en la fase 7 |
| Imunify360 de Banahosting bloquea el FTP desde GitHub | Ya conocido en ivanchesa.es; plan B: subida manual del build |
| El alcance se desborda | MVP cerrado (§2), backlog (§9) y una fase cada vez |

---

## 9. Backlog post-MVP (no se toca sin el OK de Iván)

1. **El cielo desde el Bajo Cinca**: qué planetas se ven esta noche desde Fraga/Lleida, horas de salida y puesta, fase lunar y hacia dónde mirar (astronomy-engine). Es el elemento diferenciador.
2. Relieve lunar real (NASA CGI Moon Kit, desplazamiento por altura).
3. Lunas galileanas (`Astronomy.JupiterMoons`) y otras lunas principales.
4. Modo «escala real».
5. Próximos eclipses visibles desde España (`SearchLunarEclipse` / `SearchGlobalSolarEclipse`; contrastar las fechas con NASA).
6. Versión en inglés (`@angular/localize`).
7. PWA / funcionamiento sin conexión.
8. Lighthouse CI con presupuestos en el pipeline.
9. Ficha del proyecto en ivanchesa.es (en el repo de ivanchesa.es).
