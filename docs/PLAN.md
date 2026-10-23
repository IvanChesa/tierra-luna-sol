# Tierra Luna Sol: plan de la versión 1 (paridad completa + mejoras)

> Documento maestro. Lo ejecuta Claude Code en el PC de Iván, fase a fase. Otra sesión de Claude revisa cada fase (`docs/revisiones/`).
> Si este plan y el código no coinciden, manda el plan. Los cambios se proponen en el informe de fase y los aprueba Iván.
> Versión 1 del plan: 23-10-2026. **Sustituye al plan del MVP**; incorpora lo aprobado en la revisión de la fase 0.

---

## 0. Qué es y para qué

Un **explorador 3D interactivo** del Sol, los 8 planetas, 21 lunas, la Tierra y la Luna, **en español**, con **posiciones reales para cualquier fecha** calculadas en el navegador. La versión 1 tiene **todas las funcionalidades** del proyecto que la inspira (`ethanplusai/earth-moon-solar`) y además una serie de **mejoras propias**. No se copia nada de él (ni código, ni textos, ni diseño): se escribe desde cero.

**Objetivo:** pieza de portfolio de Iván Chesa Lapena (desarrollador web freelance, ivanchesa.es). Tiene que demostrar Angular moderno, 3D web de calidad, rendimiento, SEO y accesibilidad.

**Dónde vive:** subdominio de ivanchesa.es en Banahosting (propuesto: `tierra-luna-sol.ivanchesa.es`, pendiente de confirmar). Proyecto y repositorio independientes.

### 0.1 Paridad con el original (todo esto entra en la v1)

| Funcionalidad del original | Fase |
|---|---|
| Tierra fotográfica: relieve, nubes, atmósfera, luces nocturnas, brillo de los océanos | 4 |
| Vistas guiadas de la Tierra y control de la luz solar | 4 |
| Luna con color de la NASA (LROC) y **relieve real** (altímetro LOLA) | 5 |
| Cara visible, cara oculta, polo sur y luz rasante sobre el terminador | 5 |
| **Recorrido de cámara guiado** por la Luna (reproducir/pausar) | 5 |
| Sistema solar: 8 planetas + **21 lunas** con movimiento datado | 2, 6 |
| Control de reproducción (fecha, velocidad) y **estelas de movimiento** | 3 |
| Modo **escala real** (tamaños y distancias físicos) | 6 |
| **Estrellas en su posición real** (catálogo HYG) | 1, 2 |
| **Transiciones cinemáticas** Tierra ↔ Luna ↔ Sistema Solar | 3 |
| Notas de fuentes y créditos | 8 |
| Diseño para móvil, controles etiquetados, táctil y movimiento reducido | 3–9 |

### 0.2 Mejoras sobre el original

| Mejora | Fase |
|---|---|
| **Cualquier fecha** (1900–2100): el original solo cubre 2026 y deja de funcionar en enero de 2027 | 1 |
| **Una sola aplicación con un lienzo 3D persistente**: viajes de cámara continuos, sin recargar la página | 3 |
| **Lunas principales con superficie fotográfica** (USGS); el original usa colores planos | 6 |
| **Transición suave entre escala ilustrativa y real**, animada | 6 |
| **El cielo desde el Bajo Cinca**: qué se ve esta noche desde Fraga/Lleida, a qué hora y hacia dónde mirar | 7 |
| **Próximos eclipses visibles desde España** | 7 |
| **Fichas HTML prerenderizadas e indexables** en español (planetas, lunas, Sol, Luna) | 8 |
| **Todo usable con teclado y sin 3D**: listas, tablas y fichas equivalentes | 3–9 |
| **Enlaces compartibles** con vista, fecha y cuerpo | 3 |
| Tests de precisión frente a JPL Horizons y USNO | 1, 6, 7 |

---

## 1. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Angular 22 + TypeScript estricto** | Elección de Iván (valor en el portfolio). |
| D2 | **Standalone + zoneless + signals.** `OnPush` es el valor por defecto en Angular 22: **no se declara** | Angular actual; lo indica la guía oficial (`docs/angular-buenas-practicas.md`). |
| D3 | **Three.js directo**, sin `angular-three` | `angular-three` no soporta Angular 22 ni three ≥ 0.183. |
| D4 | **astronomy-engine** para el Sol, los planetas, la Luna, las lunas de Júpiter, las fases, las salidas y puestas y los eclipses | Sin ficheros de efemérides que caduquen. |
| D5 | **Prerenderizado estático** (`outputMode: "static"`) | Hosting compartido sin Node; HTML real para Google. |
| D6 | **`SceneEngine`: clase TS sin Angular** | Testable, sin detección de cambios por frame, seguro en el prerenderizado. |
| D7 | **CSS propio con custom properties.** Dirección visual **A, «Carta celeste»** (elegida el 23-10) | `docs/DISENO.md`. |
| D8 | Idiomas: UI, textos, comentarios, commits y docs en **español de España**; identificadores y archivos en **inglés**; URLs en **español** | — |
| D9 | **URLs sin barra final** | Lo que genera el router de Angular; se configura en Apache (fase 10). |
| D10 | **Lienzo 3D único y persistente.** Las vistas del explorador (sistema solar, Tierra, Luna, cielo) son rutas hijas de un mismo layout que conserva el canvas y el `SceneEngine` al navegar entre ellas | Viajes de cámara continuos; es la gran mejora sobre el original. |
| D11 | **Las lunas, con dos métodos.** Las galileanas con `Astronomy.JupiterMoons` (precisas). Las otras 16, con los **elementos orbitales medios del JPL** y cálculo kepleriano en el navegador (sin caducidad; precisión documentada) | Cubre las 21 sin descargar datos que caduquen. |
| D12 | **Escala real sin errores de precisión**: coordenadas en float64 en JS, *origen flotante* (todo se dibuja relativo al cuerpo enfocado) y `logarithmicDepthBuffer` | Mezclar km y miles de millones de km rompe la precisión de float32 en la GPU. |
| D13 | **Estrellas reales del catálogo HYG** (magnitud ≤ 6,5), dibujadas como `Points` con tamaño por magnitud y color por índice B−V | Paridad con el original y base del cielo del Bajo Cinca. |
| D14 | **Relieve lunar:** la elevación del LOLA desplaza los vértices + un mapa de normales derivado para el detalle fino, con niveles por dispositivo | Paridad con el original, sin matar el móvil. |
| D15 | **Recorridos y vistas guiadas definidos como datos** (`data/tours.ts`), no como código | Se pueden añadir sin programar; los textos se revisan como contenido. |
| D16 | **Texturas:** Solar System Scope (CC BY 4.0) para el Sol, los planetas, la Tierra y los anillos; NASA CGI Moon Kit para la Luna; USGS Astrogeology (dominio público) para las lunas principales | Licencias libres y documentadas. |
| D17 | **Despliegue:** GitHub Actions → FTPS a Banahosting | El mismo método que ivanchesa.es; el SSH está bloqueado. |
| D18 | **Tests:** Vitest (unitarios) + Playwright (e2e) + axe (accesibilidad) | — |
| D19 | **Solo español en la v1**; el inglés queda para después (`@angular/localize`) | — |

### Dependencias permitidas (lista cerrada)
Cualquier otro paquete → **preguntar a Iván antes de instalarlo**.

- **Producción:** `@angular/*` 22.x · `three` `^0.186.0` · `astronomy-engine` `^2.1.19` · `@fontsource/newsreader` · `@fontsource/public-sans`
- **Desarrollo:** lo que genera `ng new` (incluidos Vitest y jsdom) · `@types/three` · `angular-eslint`, `eslint`, `@eslint/js` y `typescript-eslint` · `prettier` · `@playwright/test` · `@axe-core/playwright` · `sharp` · `@vitest/coverage-v8`
- **Herramientas que no son dependencias del proyecto** (se instalan aparte solo si hacen falta y con permiso): `toktx`/`basisu` para KTX2, en caso de que el peso de las texturas lo exija (fase 9).

---

## 2. Rutas

| Tipo | Ruta | Contenido |
|---|---|---|
| **Explorador** (layout con lienzo persistente) | `/` | Vista del sistema solar + texto introductorio prerenderizado |
| | `/explorar/tierra` | La Tierra en detalle y sus vistas guiadas |
| | `/explorar/luna` | La Luna en detalle, sus vistas y el recorrido |
| | `/cielo-bajo-cinca` | El cielo desde Fraga/Lleida |
| **Fichas** (HTML, sin 3D) | `/planetas`, `/planetas/:id` | Índice y 8 fichas |
| | `/lunas`, `/lunas/:id` | Índice y 20 fichas (las lunas que no son la nuestra) |
| | `/sol`, `/luna` | Fichas del Sol y de la Luna |
| | `/eclipses` | Próximos eclipses visibles desde España |
| **Otras** | `/creditos`, `/sobre-el-proyecto`, `/404` | — |

El explorador acepta parámetros: `?fecha=2030-01-01T00:00Z&cuerpo=titan&escala=real`.

---

## 3. Requisitos previos

| Requisito | Estado | Acción |
|---|---|---|
| Node ≥ 22.22.3 o ≥ 24.15 | ✅ v24.22.1 | — |
| Git | ✅ | — |
| Repo independiente | ✅ (fase 0) | — |
| GitHub CLI + repo en GitHub | ❌ | Iván: `winget install --id GitHub.cli`, `gh auth login` y crear el repo privado. **Ideal antes de la fase 1**, para que corra el CI |
| Móvil real para pruebas | Iván | Desde la fase 4 se prueba en el móvil por la red local (`ng serve --host 0.0.0.0`) |

---

## 4. Arquitectura

### 4.1 Estructura de carpetas

```
src/app/
├─ core/            site.config.ts (fuente única), seo.service.ts, json-ld.ts, site-title.strategy.ts
├─ ephemeris/       TS PURO: coordenadas, efemérides, lunas, escala, órbitas, cielo local, eclipses
│  └─ fixtures/     datos de referencia (JPL Horizons, USNO, NASA) con la consulta original
├─ data/            bodies.ts (29 cuerpos), moon-elements.ts (elementos JPL), tours.ts, places.ts, body.model.ts
├─ scene/           THREE.JS SIN ANGULAR
│  ├─ engine.ts           SceneEngine (API pública en index.ts)
│  ├─ bodies/             sol, planeta, tierra, luna, luna-genérica, anillos
│  ├─ materials/          shaders (Tierra día/noche, atmósfera, relieve lunar)
│  ├─ camera/             rig, vuelos, recorridos, viajes cinemáticos
│  ├─ stars.ts            estrellas HYG
│  ├─ trails.ts           estelas
│  ├─ scale.ts            transición ilustrativa ↔ real, origen flotante
│  ├─ sky/                cúpula del cielo local (fase 7)
│  └─ textures.ts         manifiesto y niveles de calidad
├─ state/           simulation.store.ts, explorer.store.ts (signals)
├─ features/        viewer-layout, time-controls, body-picker, body-panel, tour-player, view-switcher, sky-panel
└─ pages/           home, planets-index, moons-index, body-detail, eclipses, credits, about, not-found
scripts/            fetch-horizons-fixtures, download-assets, build-textures, build-moon-relief, build-stars, generate-sitemap
```

### 4.2 Capas (las vigila ESLint con `no-restricted-imports`; ya configurado en la fase 0)
- `ephemeris/`: ni Angular, ni `three`, ni RxJS, ni otras capas.
- `data/`: ni Angular ni `three`.
- `scene/`: ni Angular ni RxJS. **Es el único sitio donde se importa `three`.**
- `state/`, `features/` y `pages/` solo pueden usar `scene/index.ts`, la API pública.

### 4.3 Coordenadas (un único módulo: `ephemeris/coordinates.ts`, con tests)
- astronomy-engine devuelve vectores **EQJ** (ecuador J2000), en UA y geométricos. Se pasan a **ECL** con `Rotation_EQJ_ECL()` + `RotateVector()`.
- Three.js usa Y hacia arriba: ECL `(x, y, z)` → Three `(x, z, −y)`.
- La Tierra se orienta con la matriz EQJ→ECL y el tiempo sidéreo de Greenwich. Se valida con el punto subsolar.
- Lunas con elementos del JPL: se calculan en el plano de referencia que indica el JPL para cada luna (Laplace, ecuador del planeta o eclíptica) y se convierten a ECL **en `coordinates.ts`**.
- Cielo local: horizontales (azimut y altura) con `Astronomy.Horizon`, para el observador de `data/places.ts`.
- Tiempo interno siempre en **UTC**. La UI muestra la hora peninsular española con la zona indicada.

### 4.4 Escalas
- **Ilustrativa** (por defecto): se comprime el radio con `r_vis = K · log10(1 + r_UA / 0,1)` (monótona y testada), conservando la dirección real. Los tamaños se agrandan con mínimos y máximos. Los sistemas de lunas se expanden alrededor de su planeta para que se distingan.
- **Real**: radios y distancias físicos, en km, con origen flotante. Los cuerpos diminutos llevan un marcador de visibilidad.
- **Transición** entre las dos: animada (~1,5 s) interpolando posiciones y tamaños; directa con `prefers-reduced-motion`.
- Las órbitas y las estelas usan siempre la misma transformación que los cuerpos.

### 4.5 Estado y bucle
- `SimulationStore`: `simTime`, `playing`, `speed`, `selectedBodyId`, `scaleMode`, `quality`.
- `ExplorerStore`: `view` (sistema / tierra / luna / cielo), `tour` (paso y estado).
- El motor avanza el tiempo internamente y sincroniza el store **≤ 5 veces/s**. **Render bajo demanda** cuando no hay movimiento.
- El `ViewerLayoutComponent` vive en la ruta padre del explorador: crea el motor una vez en `afterNextRender` y lo destruye solo al salir del explorador (por ejemplo, al ir a una ficha).

### 4.6 SSR / prerenderizado
- El 3D **nunca** se ejecuta en el servidor: va en `@defer` con `@placeholder` (póster + texto) y el motor se crea en `afterNextRender`.
- `astronomy-engine`, los stores del simulador y los controles **nunca** van en el bundle inicial. En las fichas, los datos «de hoy» se calculan con `import()` dinámico en `afterNextRender`, con un texto alternativo en el HTML.
- `getPrerenderParams` para `planetas/:id` y `lunas/:id` desde `data/bodies.ts`.

---

## 5. Presupuestos de calidad

| Área | Objetivo |
|---|---|
| JS inicial | Aviso > 300 kB · error > 400 kB, en bruto. La base de Angular ya ocupa ~272 kB: **todo lo nuevo va diferido** |
| Chunk del visor (three + motor + stores + controles) | Aviso > 900 kB en bruto; informar del tamaño en cada fase |
| Texturas de la primera vista (`/`) | ≤ 2,5 MB (nivel alto) · ≤ 1,2 MB (nivel bajo) |
| Vista Tierra | ≤ 6 MB adicionales (alto) · ≤ 2 MB (bajo) |
| Vista Luna en detalle | ≤ 10 MB adicionales (alto) · ≤ 3 MB (bajo) |
| Lunas fotográficas | Se cargan al enfocar su sistema; ≤ 300 kB por luna en nivel bajo |
| Estrellas | ≤ 250 kB (comprimido en la transferencia) |
| Lighthouse móvil: fichas | ≥ 95 en las 4 categorías |
| Lighthouse móvil: explorador | Rendimiento ≥ 90 · resto ≥ 95 |
| LCP / CLS | ≤ 2,5 s · ≤ 0,05. El LCP nunca es el canvas |
| FPS | ≥ 55 en escritorio (alto) · ≥ 30 en móvil de gama media (bajo), **en todas las vistas** |
| Memoria | 10 idas y vueltas explorador ↔ ficha y 10 cambios de vista sin crecimiento de `renderer.info.memory` |
| Accesibilidad | axe: 0 violaciones graves o críticas · todo usable con teclado y sin canvas |
| Precisión | Planetas: ≤ 0,05° y ≤ 0,1 % · Luna: ≤ 0,1° y ≤ 0,5 % · Galileanas: ≤ 0,5° · Otras lunas (elementos medios): se mide y se documenta; objetivo ≤ 5° entre 2020 y 2035 · Salidas y puestas: ±2 min frente al USNO · Eclipses: fecha y tipo exactos frente a la NASA |
| Datos | 0 cifras sin fuente |

---

## 6. Fases

Cada fase: rama `fase-N-nombre` → plan y OK de Iván → trabajo → `npm run check` → informe → **parar** → revisión → correcciones → fusión a `main`.

**Fases grandes:** si una fase no cabe en una sesión, se trabaja en **entregas** (N.a, N.b…) dentro de la misma rama. Cada entrega deja el informe actualizado (estado «en curso») para poder retomarla en una sesión nueva.

| Fase | Esfuerzo recomendado |
|---|---|
| 1, 4, 5, 6 | `max` |
| 2, 3, 7 | `high` (`max` si hay problemas) |
| 8, 9, 10 | `high` |

### Fase 0: Cimientos ✅ (cerrada el 23-10)
Angular 22, prerenderizado estático, lint por capas, CI, estructura, dirección visual A. Detalles en `docs/informes/fase-0.md`.

### Fase 1: Efemérides, catálogo y datos

**Objetivo:** el «cerebro» astronómico completo, en TS puro y testado frente a fuentes oficiales. Catálogo de los 29 cuerpos.

Tareas:
1. `astronomy-engine`.
2. `coordinates.ts` (§4.3), con tests.
3. `ephemeris.ts`:
   - posiciones del Sol y los 8 planetas;
   - Luna geocéntrica;
   - rotación de la Tierra;
   - punto subsolar;
   - fase lunar (ángulo, % iluminado y nombre de la fase en español);
   - distancias al Sol y a la Tierra.
4. `moons.ts`:
   - galileanas con `JupiterMoons`;
   - las otras 16 con los elementos medios del JPL (https://ssd.jpl.nasa.gov/sats/elem/), copiados a `data/moon-elements.ts` con la URL, el plano de referencia y la época de cada fila;
   - resolver la ecuación de Kepler y aplicar la precesión de nodo y periapsis cuando el JPL dé las tasas.
5. `scale.ts` (ilustrativa, real e interpolación) y `orbits.ts` (muestreo de órbitas de planetas y lunas, con caché).
6. **Fixtures**: `scripts/fetch-horizons-fixtures.mjs` para planetas, Luna y 21 lunas, en 3 fechas: 2026-01-01, 2026-10-23 y 2030-06-15, a las 00:00 UT. Lunas respecto a su planeta (`CENTER=500@<planeta>`). Fases lunares del USNO. Todo con la consulta o URL exacta.
7. **Estrellas**: `scripts/build-stars.mjs` descarga HYG v4.x (https://github.com/astronexus/HYG-Database) → subconjunto con magnitud ≤ 6,5 (dirección, magnitud y B−V, redondeados) → `public/data/stars.bin` o `.json` compacto + test de integridad. **El fichero derivado mantiene CC BY-SA 4.0** (licencia en `public/data/`).
8. **`data/bodies.ts` + `body.model.ts`** con 29 cuerpos (Sol, 8 planetas, Luna y 20 lunas más):
   - id, nombre en español, tipo, cuerpo padre;
   - datos físicos con `source` (NASA Planetary Fact Sheet; parámetros físicos de satélites del JPL, https://ssd.jpl.nasa.gov/sats/phys_par/);
   - textos en español: resumen de 2–3 frases y 3 curiosidades, con fuente y `reviewed: false`.
9. **`data/places.ts`**: Fraga y Lleida, con latitud, longitud y altitud citadas (IGN u otra fuente oficial).
10. **Tests**: precisión de §5, escala monótona, transiciones de escala continuas, tiempo sidéreo en J2000, fases frente al USNO, fechas límite (1900/2100) y campos y fuentes completos.

Criterios de aceptación:
- [ ] Todos los tests pasan; cobertura de `ephemeris/` ≥ 90 %.
- [ ] Tabla de **error medido** por cuerpo frente a Horizons en el informe, incluidas las 21 lunas. Las que superen el objetivo se documentan con causa y propuesta.
- [ ] Ningún dato sin fuente; textos listados para que Iván los revise.
- [ ] `astronomy-engine` fuera del bundle inicial (con salida del build).

### Fase 2: Recursos gráficos y escena base

**Objetivo:** el sistema solar real de hoy, rápido y sin fugas, con estrellas reales.

Tareas:
1. **Texturas.**
   - `download-assets.mjs` (originales a `assets-src/`, en `.gitignore`) y `build-textures.mjs` (sharp → WebP 1k/2k/4k, con hash y manifiesto tipado).
   - Por ahora: Sol, planetas, Tierra (día, noche, nubes, normales, especular), Luna básica y anillos.
   - `FUENTES.md` completo.
2. **`SceneEngine`** con su API: tiempo, reproducción, velocidad, foco, calidad, tamaño, `dispose()` y eventos. Renderer en sRGB, con tone mapping y DPR limitado.
3. **Sol** (emisivo + luz puntual), **planetas** con su inclinación de eje, **anillos de Saturno** y **órbitas**.
4. **Estrellas HYG** (fase 1) como `Points`, en dirección real y con la traslación de la cámara anulada (cielo lejano).
5. **Niveles de calidad** (`low` / `medium` / `high`).
6. **`ViewerLayoutComponent`** en la ruta padre del explorador (D10), con `@defer`, póster y `afterNextRender`. El motor persiste entre las rutas hijas y se destruye al salir.
7. Bucle con `requestAnimationFrame`, pausa con `visibilitychange` y render bajo demanda. Indicador de FPS y de `renderer.info` solo en desarrollo.

Criterios de aceptación:
- [ ] El texto y el póster se pintan primero; después, Sol, planetas, órbitas y estrellas en las posiciones de hoy.
- [ ] `three` y `astronomy-engine` en el chunk diferido (con salida del build).
- [ ] Prerenderizado sin errores de `window`/`document`.
- [ ] Prueba de memoria, FPS y peso de la primera vista según §5, con cifras en el informe.
- [ ] En pausa y sin interacción: 0 frames por segundo.

### Fase 3: Tiempo, interacción, estelas y viajes de cámara

Tareas:
1. **Stores** (§4.5) con sus tests.
2. **`TimeControlsComponent`**: fecha y hora (1900–2100), «Ahora», reproducir/pausar, velocidades (1 h/s, 1 día/s, 1 semana/s, 1 mes/s, 1 año/s) e `Intl` en `es-ES`.
3. **`BodyPickerComponent`**: lista accesible + raycast con esferas de impacto agrandadas. **`BodyPanelComponent`** con la ficha resumida.
4. **Cámara**: vuelo al cuerpo que lo sigue mientras se mueve y «Vista general». Con `prefers-reduced-motion`, corte directo.
5. **Estelas** del movimiento reciente, con la misma transformación de escala que los cuerpos.
6. **`ViewSwitcherComponent`** + **viajes cinemáticos** entre vistas (sistema ↔ Tierra ↔ Luna):
   - trayectorias suaves de ~3 s que se pueden saltar con `Esc` o «Saltar»;
   - con `prefers-reduced-motion`, fundido o corte;
   - mientras tanto, la vista de destino solo carga en diferido las texturas que necesita.
7. **Estado en la URL** (vista, fecha, cuerpo y escala) con `replaceUrl` y *debounce*.
8. **Teclado** (`Espacio`, `Esc`, orden de tabulación y foco visible) y `aria-live` al seleccionar o cambiar de vista.
9. **Playwright** + primeros e2e: seleccionar, fecha, cambio de vista y enlace con parámetros.

Criterios de aceptación:
- [ ] Todo usable con teclado y sin canvas.
- [ ] Movimiento coherente (Mercurio da ~4 vueltas por cada vuelta de la Tierra).
- [ ] Los enlaces con parámetros abren el estado exacto.
- [ ] Store ≤ 5 actualizaciones/s durante la reproducción.
- [ ] El viaje sistema → Tierra → Luna → sistema no recrea el motor (comprobado) y no deja fugas.
- [ ] Con movimiento reducido no hay animaciones de cámara.

### Fase 4: La Tierra completa y sus vistas guiadas

Tareas:
1. **Material de la Tierra**:
   - día y noche con la dirección real del Sol y terminador suave;
   - luces nocturnas, especular en los océanos y mapa de normales;
   - nubes con deriva ilustrativa;
   - atmósfera con efecto Fresnel.
2. **Orientación real** según la hora (sidéreo + EQJ→ECL).
3. **Control de la luz solar**: cambia la hora del día de la simulación sin perder la fecha. Es la equivalencia honesta del deslizador del original.
4. **Vistas guiadas** como datos (`data/tours.ts`): Tierra completa, Pacífico, Himalaya, luces nocturnas y **España / Bajo Cinca**. Cada una con texto, encuadre (lat/lon/distancia) y hora sugerida. `TourPlayerComponent` con anterior/siguiente/reproducir y subtítulos accesibles.
5. Marcador de Fraga/Lleida en la vista cercana (`data/places.ts`).
6. Prueba en el móvil real por la red local (Iván) y ajuste de niveles.

Criterios de aceptación:
- [ ] Test: el punto subsolar del 21-06-2026 a las 12:00 UTC está a ≈ +23,4° de latitud y 0° de longitud (±2°), con la misma función que alimenta el shader.
- [ ] Capturas de mediodía y medianoche UTC y de cada vista guiada.
- [ ] FPS de la vista Tierra según §5, en escritorio y en el móvil de Iván.
- [ ] Textos de las vistas con fuente y `reviewed: false`.

### Fase 5: La Luna en detalle

Tareas:
1. **`build-moon-relief.mjs`**: el NASA CGI Moon Kit (color de la LROC y elevación del LOLA; https://svs.gsfc.nasa.gov/4720) → color WebP 2k/4k/8k, elevación cuantizada (documentando la resolución vertical resultante) y mapa de normales derivado de la elevación a resolución completa.
2. **Material lunar**: desplazamiento de vértices con la elevación a escala física (exageración opcional, documentada) + normales para el detalle fino. Malla con densidad por nivel de calidad.
3. **Orientación**: cara visible hacia la Tierra (rotación síncrona); el meridiano 0 alineado según el Moon Kit. La libración real es opcional, solo si sale barata con astronomy-engine (`Libration`).
4. **Vistas**: cara visible, cara oculta, polo sur y **luz rasante** (control de la dirección del Sol para ver cráteres en el terminador).
5. **Recorrido guiado por la Luna** (`data/tours.ts`), con reproducir/pausar, subtítulos y saltar.
6. Fase lunar coherente entre la ficha, la escena y los fixtures del USNO.

Criterios de aceptación:
- [ ] Capturas: cara visible, cara oculta, polo sur, luz rasante, luna llena y cuarto creciente.
- [ ] Peso y FPS según §5 en los tres niveles (cifras).
- [ ] Sin costuras visibles en el meridiano de 180° ni en los polos (capturas).
- [ ] Recorrido usable con teclado y con movimiento reducido (sin animación, paso a paso).

### Fase 6: Lunas de los planetas y escala real

Tareas:
1. **20 lunas** (las 21 menos la nuestra) en sus posiciones (fase 1):
   - las que tienen mosaico global del USGS (Ío, Europa, Ganímedes, Calisto, Titán, Encélado, Rea, Dione, Tetis, Jápeto, Mimas, Tritón, Miranda, Ariel, Umbriel, Titania, Oberón…, **lo que exista de verdad**), con textura fotográfica 1k/2k;
   - el resto, con color esquemático documentado;
   - carga diferida al enfocar el sistema de su planeta.
2. **Sistemas de lunas**: al enfocar un planeta se ven sus lunas con sus órbitas, en escala física local (como el original) y con su ficha resumida.
3. **Modo escala real** (D12): origen flotante, `logarithmicDepthBuffer`, marcadores de visibilidad para los cuerpos diminutos y transición animada desde y hacia la escala ilustrativa (§4.4).
4. Interruptor «Escala real» en los controles y en la URL (`escala=real`).
5. Tests de precisión de las lunas (§5) y de continuidad de la transición.

Criterios de aceptación:
- [ ] Sin parpadeos de profundidad (*z-fighting*) ni temblores de precisión en escala real, ni cerca de Fobos ni de Neptuno (capturas o vídeo corto).
- [ ] Tabla de precisión de las lunas actualizada.
- [ ] FPS y memoria con todos los sistemas cargados según §5.
- [ ] Licencias del USGS registradas una a una en `FUENTES.md`.

### Fase 7: El cielo desde el Bajo Cinca y los eclipses

Tareas:
1. **Vista `/cielo-bajo-cinca`**:
   - cúpula celeste desde el observador (Fraga por defecto; Lleida como alternativa; geolocalización **opcional** y solo en el navegador, sin enviarla a ningún sitio);
   - horizonte, puntos cardinales, estrellas HYG, planetas, Luna y Sol en coordenadas horizontales;
   - deslizador de la hora a lo largo de la noche;
   - líneas de constelaciones solo si se encuentra una fuente con licencia compatible (proponerla en el plan de la fase).
2. **«Esta noche»**: qué planetas se ven, salida/puesta/culminación (`SearchRiseSet`, `SearchHourAngle`), fase lunar y «hacia dónde mirar» (azimut y altura en lenguaje claro: «al sureste, a media altura»). **Versión en tabla accesible** equivalente.
3. **Eclipses** (`SearchLocalSolarEclipse`, `SearchLunarEclipse`): los próximos solares y lunares visibles desde España, con el tipo y la hora local. Página `/eclipses` (lista prerenderizada con «calculado el …» + recálculo en el cliente) y aviso en el explorador.
4. **Fixtures**: salidas y puestas del USNO para Fraga en 3 fechas, y eclipses de las tablas de la NASA (https://eclipse.gsfc.nasa.gov/) con URL.

Criterios de aceptación:
- [ ] Salidas y puestas ±2 min frente al USNO; eclipses con fecha y tipo exactos frente a la NASA.
- [ ] La vista del cielo y la tabla dan la misma información.
- [ ] La geolocalización solo se pide tras una acción del usuario y funciona igual si la rechaza.

### Fase 8: Contenido y SEO

Tareas:
1. **Fichas**: `/planetas`, `/planetas/:id`, `/lunas`, `/lunas/:id`, `/sol` y `/luna`.
   - H1, resumen, tabla de datos con fuentes, curiosidades, imagen, datos «de hoy» calculados en el cliente y «Ver en 3D» → explorador con parámetros.
   - **Sin Three.js.**
   - Migas de pan.
2. **`/creditos`** (todas las licencias, CC BY 4.0, CC BY-SA 4.0 del fichero de estrellas, NASA, USGS y JPL, y que no hay respaldo de la NASA) y **`/sobre-el-proyecto`** (stack, decisiones, escalas, precisión medida y autor con enlace a ivanchesa.es).
3. **`SeoService`**:
   - title ≤ 60, description ≤ 155, canonical sin barra final;
   - Open Graph/Twitter con `og:image` por página (generada por script a partir de capturas o texturas);
   - `noindex` mientras `indexable: false`, y **siempre** en `/404`.
4. **JSON-LD generado desde los datos**: `WebSite` + `Person` en todas las páginas; `WebPage` con `about` y `BreadcrumbList` en las fichas. `sameAs` solo con URLs verificadas.
5. `sitemap.xml` (sin `/404`) y `robots.txt`.
6. Lista de textos para que Iván los revise.

Criterios de aceptación:
- [ ] Metadatos y JSON-LD en el HTML estático de cada ruta (grep sobre `dist`).
- [ ] Lighthouse móvil ≥ 95 en las 4 categorías en una muestra de fichas.
- [ ] JSON-LD válido, sin enlaces rotos y sin cifras sin fuente.

### Fase 9: Pulido (móvil, accesibilidad, rendimiento, alternativa sin WebGL)

Tareas:
1. **Móvil**: panel inferior plegable, ficha como hoja inferior, carrusel de cuerpos, gestos y zonas táctiles ≥ 44 px, en todas las vistas.
2. **Sin WebGL o con el contexto perdido**: póster + listas + fichas + mensaje (y recargar). Con `prefers-reduced-motion`, en todas las vistas, recorridos y transiciones.
3. **Accesibilidad**: axe en todas las rutas, contraste, foco, zoom al 200 % y lectores de pantalla (comprobación manual básica con NVDA o Narrador).
4. **Rendimiento**:
   - medición por vista y nivel;
   - KTX2 solo si las WebP no cumplen §5 (pedir permiso para las herramientas);
   - precarga de la fuente del H1 y caché por hash.
5. **E2E completos** en escritorio y móvil emulado (WebGL con SwiftShader en CI).
6. Ajustes visuales finales con capturas.

Criterios de aceptación:
- [ ] Tabla con **todos** los presupuestos de §5 medidos y cumplidos.
- [ ] axe sin violaciones graves.
- [ ] E2E verdes en CI.
- [ ] Iván da el visto bueno en su móvil.

### Fase 10: Despliegue y lanzamiento

**Iván (manual):**
1. Repo en GitHub (si no existe).
2. Subdominio en cPanel con AutoSSL.
3. Cuenta FTP limitada a la carpeta del subdominio.
4. `gh secret set FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` (la contraseña la escribe Iván).

**Claude Code:**
1. **`public/.htaccess`**:
   - HTTPS;
   - `DirectorySlash Off` + `Options -Indexes` + reescritura interna de `/ruta` → `/ruta/index.html`, y 301 de `/ruta/` → `/ruta`;
   - `ErrorDocument 404`;
   - caché larga e `immutable` para los archivos con hash, las texturas y los datos;
   - compresión;
   - cabeceras de seguridad y una CSP compatible con el CSS crítico en línea de Angular (valorar `security.autoCsp`).
2. **`deploy.yml`**: push a `main` + CI en verde → build → `SamKirkland/FTP-Deploy-Action` (fijado por SHA, `ftps`, `local-dir` = `browser/`).
3. **Verificación en producción** con `curl` (200, 301, 404, cabeceras) y Lighthouse en producción.
4. `indexable: true` **solo con el OK de Iván**; sitemap en Search Console (Iván).
5. README de portfolio (capturas, vídeo o GIF corto, stack, decisiones y precisión medida) + LICENSE (lo decide Iván). Repo público.

Criterios de aceptación:
- [ ] El sitio está en el subdominio con HTTPS y se despliega solo al hacer push a `main`.
- [ ] Las comprobaciones con `curl` y Lighthouse en producción cumplen §5.

---

## 7. Flujo de trabajo entre las dos IAs

| Quién | Hace |
|---|---|
| **Claude Code (terminal)** | Programa una fase cada vez, en su rama. Plan → OK → trabajo → `npm run check` → informe → **parar**. En las fases grandes trabaja por entregas, con el informe actualizado al final de cada sesión. |
| **Claude (sesión de revisión)** | Revisa el informe y el diff `main...fase-N`, ejecuta él mismo los checks y escribe `docs/revisiones/fase-N.md`. |
| **Iván** | Aprueba los planes de fase, decide, revisa los textos, prueba en el móvil, hace los pasos manuales y da el OK a cada fusión. |

Reglas:
- **Una sesión de Claude Code por fase** (o por entrega). Al empezar, lee `CLAUDE.md`, el plan y el informe y la revisión anteriores.
- Si el contexto se llena a mitad de una fase: actualizar el informe (estado «en curso», qué falta), commit y seguir en una sesión nueva con el prompt «Retomar una fase».
- Nada fuera del alcance de la fase; las ideas nuevas van al backlog. Si falta un dato: `TODO(ivan):` + `docs/PENDIENTES.md`.

---

## 8. Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Errores de sistemas de coordenadas (planetas o lunas «girados») | Un único módulo `coordinates.ts` + fixtures de Horizons para los 30 cuerpos |
| Lunas con elementos medios imprecisas | Precisión medida y documentada; las galileanas con método preciso |
| Precisión de float32 en escala real | Origen flotante + `logarithmicDepthBuffer` + capturas como criterio |
| Peso de la Luna en 8K y de las lunas fotográficas | Niveles por dispositivo, carga por vista, presupuestos por vista, KTX2 como plan B |
| FPS en móvil con relieve lunar | Densidad de malla por nivel; normales en lugar de geometría en el nivel bajo |
| La IA se inventa cifras o textos | `source` obligatorio, tests de campos y revisión de Iván |
| Fugas de memoria al cambiar de vista | Motor persistente, `dispose()` por vista y prueba de 10 ciclos |
| El contexto de la sesión se llena en fases grandes | Entregas por fase, informe vivo y prompt «Retomar» |
| Licencias mezcladas (CC BY, CC BY-SA, dominio público) | `FUENTES.md` archivo a archivo + `/creditos`; el BY-SA solo afecta al fichero de estrellas |
| Código WebGL en el prerenderizado | `@defer` + `afterNextRender` + lint por capas |
| JS inicial al límite | Todo diferido; presupuesto vigilado por el build |
| Imunify360 bloquea el FTP desde GitHub | Plan B: subida manual del build |

---

## 9. Backlog (después de la v1; no se toca sin el OK de Iván)
1. Versión en inglés.
2. PWA / funcionamiento sin conexión.
3. Planetas enanos (Plutón, Ceres) y cometas.
4. Satélites artificiales / Estación Espacial (requiere datos en vivo).
5. Lighthouse CI en el pipeline.
6. Ficha del proyecto en ivanchesa.es (en el repo de ivanchesa.es).
