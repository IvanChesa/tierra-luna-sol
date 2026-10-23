# Informe: Fase 0 (Cimientos)

- **Rama:** `fase-0-cimientos`
- **Fecha:** 2026-10-23
- **Estado:** revisada (APROBADA CON CAMBIOS MENORES); correcciones aplicadas y fusión a `main` aprobada por Iván

## 1. Resumen
Proyecto Angular 22.2 (standalone, zoneless, OnPush por defecto, Vitest) en un repo git independiente, con salida estática y las 8 rutas prerenderizadas, cada una con su `<title>` en el HTML. ESLint (angular-eslint) vigila las capas de §4.2 con `no-restricted-imports`; Prettier vigila el formato. Hay estructura de §4.1, `site.config.ts`, CI de GitHub Actions con acciones fijadas por SHA y `docs/DISENO.md` con 2 propuestas visuales. Los tokens de la recomendada (A, «Carta celeste») están aplicados. `npm run check` pasa sin avisos.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| `npm run check` pasa sin errores ni avisos de presupuesto | ✅ | Después de `rm -rf node_modules dist .angular && npm ci`: código de salida 0. Lint limpio, 18/18 tests y build sin avisos (inicial 272,45 kB frente al aviso de 300 kB). Ver §6. |
| `dist/…/browser/` contiene el HTML prerenderizado de todas las rutas, cada una con su `<title>` | ✅ | `Prerendered 8 static routes.` y grep sobre `dist` (abajo). |
| Sin `zone.js` en el build | ✅ | Ver «Comprobación de zone.js» abajo. |
| Un import de `three` fuera de `scene/` hace fallar el lint (demostrado y revertido) | ✅ | Ver «Demostración del lint» abajo. |
| `docs/DISENO.md` tiene las 2 propuestas | ✅ | A «Carta celeste» (recomendada) y B «Instrumento». Cada una lleva paleta en tokens, contraste AA calculado, tipografía con `tnum` comprobado en el archivo de fuente y bocetos. |
| El repo git es independiente | ✅ | `git rev-parse --show-toplevel` → `C:/Users/ivan/Ivan Chesa AI/tierra-luna-sol` |

**HTML prerenderizado** (`grep -o '<title>…</title>'` en cada `index.html` de `dist/tierra-luna-sol/browser`):
```
/index.html                    <title>Tierra Luna Sol</title>
/planetas/index.html           <title>Planetas · Tierra Luna Sol</title>
/planetas/marte/index.html     <title>Marte · Tierra Luna Sol</title>
/sol/index.html                <title>Sol · Tierra Luna Sol</title>
/luna/index.html               <title>Luna · Tierra Luna Sol</title>
/creditos/index.html           <title>Créditos · Tierra Luna Sol</title>
/sobre-el-proyecto/index.html  <title>Sobre el proyecto · Tierra Luna Sol</title>
/404/index.html                <title>Página no encontrada · Tierra Luna Sol</title>
```
Todas llevan además su `<h1>` en el HTML estático y `<html lang="es">`.

**Comprobación de zone.js:**
```
grep -c '"zone.js"' package.json          → 0
ls node_modules/zone.js                   → No such file or directory
grep "__zone_symbol__|__load_patch" *.js  → 0 archivos
grep -c polyfills angular.json            → 0
```
- `package-lock.json` solo lo nombra como `peerDependency` **opcional** de `@angular/core`, así que no se instala.
- La palabra «Zone» que aparece en `main.js` es la clase `NgZone` de `@angular/core`, que comprueba si existe `Zone`; no es zone.js.

**Demostración del lint.** Archivo temporal `src/app/pages/home/lint-demo.ts` con `import { WebGLRenderer } from 'three';`:
```
src\app\pages\home\lint-demo.ts
  1:1  error  'three' import is restricted from being used by a pattern. `three` solo se importa dentro de src/app/scene/ (PLAN §4.2)  no-restricted-imports
✖ 1 problem (1 error, 0 warnings)
exit=1
```
Después se borró el archivo; `git status` quedó limpio y `ng lint` → `All files pass linting.`

Además de esto, con archivos temporales comprobé que también fallan:
- `@angular/core` y `../data/…` dentro de `ephemeris/`;
- `rxjs` dentro de `data/`;
- `@angular/core` dentro de `scene/`;
- `three/addons/…` dentro de `core/`;
- `../scene/engine` dentro de `pages/`.

Y que **no** fallan:
- `three` dentro de `scene/`;
- `../scene` (la API pública) dentro de `pages/`;
- `@angular/core` en `core/`. Este caso tenía un falso positivo que se corrigió en `a243cc0`.

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 0.1 Comprobar el entorno | hecha | Node v24.22.1 y npm 11.19.1. Primero falló (Node 22.18.0 y `.git` de ivanchesa.es en la carpeta padre); Iván lo corrigió y la segunda comprobación pasó. |
| 0.2 `git init -b main` + primer commit | hecha | `2d78d0e docs: plan inicial` (solo `CLAUDE.md` y `docs/`) en `main`; el resto, en `fase-0-cimientos`. |
| 0.3 `ng new` en una carpeta temporal | hecha | Con una variación (ver §4.1). |
| 0.4 Mover al proyecto | hecha | El `CLAUDE.md` de Angular → `docs/angular-buenas-practicas.md`; `.mcp.json` conservado; `README.md` sustituido por uno breve en español; carpeta temporal borrada; `npm install`. |
| 0.5 Configuración | hecha | `outputMode: "static"`, prerenderizado en todas las rutas, sin `server.ts`/`ssr.entry`/Express y presupuesto inicial de 300/400 kB. `strict`, `noUncheckedIndexedAccess` y `strictTemplates` explícitos. `noUncheckedIndexedAccess` no ha dado guerra. |
| 0.6 Calidad de código | hecha | `ng add angular-eslint@22` + Prettier, reglas de capas y scripts `start`, `build`, `test`, `lint`, `format`, `e2e` (aviso) y `check`. |
| 0.7 Estructura de §4.1 | hecha | `.gitkeep` en las carpetas vacías; `core/site.config.ts` (+ test); `scene/index.ts` (API pública vacía); `data/bodies.ts` con el cuerpo de prueba. |
| 0.8 Rutas vacías con `<title>` | hecha | 8 rutas prerenderizadas; `**` muestra la 404 en el cliente (con test). |
| 0.9 Dirección visual | hecha | `docs/DISENO.md` y tokens de A en `src/styles.css`. Iván elige. |
| 0.10 CI | hecha | `.github/workflows/ci.yml`. Sin remoto todavía: verificado en local con los mismos pasos (§6). |

## 4. Desviaciones del plan y motivo

1. **`ng new --directory=../tls-scaffold` falla** con la CLI 22.2.4: `Path "/../tls-scaffold" is invalid.` (no admite rutas fuera de la carpeta actual). Lo ejecuté desde la carpeta padre con `--directory=tls-scaffold` y el resto de opciones idénticas, así que el resultado es el mismo. También añadí `NG_CLI_ANALYTICS=false` para evitar la pregunta interactiva. **Propuesta:** corregir el comando en el PLAN (§10, punto 1).
2. **`OnPush` no se declara en cada componente.**
   - En Angular 22 es el valor por defecto. Lo comprobé en los tipos de `@angular/core` 22.2.3: «NOTE: OnPush is enabled by default.»
   - La guía oficial (`docs/angular-buenas-practicas.md`) pide expresamente no ponerlo.
   - La regla de `CLAUDE.md` («`OnPush`») se cumple igualmente. **Propuesta:** aclararlo en `CLAUDE.md` (§10, punto 2).
3. **`ng add angular-eslint` instaló además `@eslint/js` y `typescript-eslint`.** Son la configuración base que usa angular-eslint (`eslint.config.js` las importa), aunque la lista cerrada solo nombra «`angular-eslint` + `eslint`». Los he dejado; **Iván decide** (§9).
4. **Prettier dentro de `npm run lint`** (`ng lint && prettier --check .`), acordado en el plan de la fase. Los `.md` quedan fuera de Prettier, porque reformatearía las tablas de la documentación.
5. **Fuentes:** al comprobar el GSUB descarté **IBM Plex Sans**, que estaba en el boceto inicial de la propuesta, porque **no tiene `tnum`**. Quedan Newsreader + Public Sans (A) y Archivo + IBM Plex Mono (B).
6. **Saltos de línea:** `.gitattributes` con `* text=auto eol=lf` y `core.autocrlf=false` en la configuración **local** del repo (en el sistema estaba en `true`). La copia de trabajo se normalizó a LF justo después del commit del proyecto generado.

## 5. Decisiones técnicas nuevas

- **Títulos:** `TitleStrategy` propia (`core/site-title.strategy.ts`) con el formato «Página · Tierra Luna Sol». El nombre sale de `site.config`, y el inicio lleva solo el nombre del sitio. Así el `<title>` queda en el HTML prerenderizado sin código por página. Alternativa descartada: `Title.setTitle` en cada componente (duplica la lógica). En la fase 5 lo absorberá `SeoService`.
- **Ids de planeta:** un `canMatch` con el catálogo hace que `/planetas/pluton` caiga en la 404 en el cliente. El título y el nombre llegan por un resolver, con `withComponentInputBinding()`, que lo pasa al `input.required()` de la ficha.
- **404 doble:** la ruta `/404` se prerenderiza (es la que usará el `ErrorDocument` de Apache en la fase 7) y `**` carga el mismo componente en el cliente. Tests: `/no-existe`, `/planetas/pluton` y `/planetas/marte/extra` → H1 y título de la 404.
- **`index.csr.html`:** el build lo genera junto a las rutas prerenderizadas; es el armazón para las rutas que no tengan HTML propio. Cómo encaja con el `.htaccess` se decide en la fase 7.
- **Páginas con carga diferida** (`loadComponent`), cada una en su propio chunk de menos de 1 kB.
- **Reglas de capas por imports relativos:** las expresiones solo miran rutas que empiezan por `./` o `../` (evitan el falso positivo de `@angular/core` con la carpeta `core/`). La regla de «API pública» deja importar `../scene` o `../scene/index` y nada más de `scene/`. En `eslint.config.js` hay un comentario: en la configuración plana, una regla repetida en un bloque posterior **sustituye** a la anterior, y por eso cada capa repite sus prohibiciones.
- **`tsconfig.app.json` sin tipos de Node** (`types: []`). Al quitar `server.ts`, el código de la app no necesita `process` ni `Buffer`, y así no los tiene disponibles por error.
- **`provideClientHydration(withEventReplay())`:** se añade la repetición de eventos para que los clics anteriores a la hidratación no se pierdan.
- **Armazón accesible:** enlace «Saltar al contenido», `<nav aria-label="Principal">` con `aria-current="page"`, `<main id="contenido" tabindex="-1">` y zonas táctiles de 44 px en la navegación.
- **Acciones del CI fijadas por SHA de commit:**
  - `actions/checkout@3d3c42e…` (v7.0.1), con `persist-credentials: false`;
  - `actions/setup-node@949feb2…` (v7.1.0), con Node desde `.nvmrc` (24) y caché de npm;
  - `permissions: contents: read`.

## 6. Salida de los checks

```
$ rm -rf node_modules dist .angular && npm ci
added 416 packages, and audited 417 packages in 1m

$ npm run check            (código de salida 0)
> ng lint && prettier --check .
All files pass linting.
All matched files use Prettier code style!

> ng test --watch=false
 Test Files  4 passed (4)
      Tests  18 passed (18)

> ng build
Initial chunk files | Names              |  Raw size | Estimated transfer size
main-UKH4FFTE.js    | main               | 269.21 kB |                73.98 kB
styles-SOEJ2553.css | styles             |   3.24 kB |                 1.07 kB
                    | Initial total      | 272.45 kB |                75.06 kB

Lazy chunk files    | Names              |  Raw size | Estimated transfer size
chunk-DIvJ2uUA.js   | planets-index-page | 679 bytes |               679 bytes
chunk-BwsvgbJE.js   | not-found-page     | 480 bytes |               480 bytes
chunk-CXtVSplV.js   | body-detail-page   | 445 bytes |               445 bytes
chunk-Bd7M-M6K.js   | about-page         | 387 bytes |               387 bytes
chunk-D6FYJpd8.js   | credits-page       | 378 bytes |               378 bytes
chunk-tAtZ0mWR.js   | home-page          | 376 bytes |               376 bytes

Prerendered 8 static routes.
```
- Sin avisos de presupuesto.
- **Ojo para las fases siguientes:** el JS inicial ya está en 272 kB en bruto (Angular, router e hidratación), con un margen de solo 28 kB hasta el aviso de 300 kB. Todo lo nuevo (store, controles, `astronomy-engine`) debe ir en chunks diferidos o vigilarse.
- Fuentes: 3 `woff2` que suman 52,8 kB (Newsreader 500: 23,6 kB; Public Sans 400 y 600: 14,6 kB cada una). Además, Fontsource incluye una versión `.woff` de respaldo que los navegadores actuales no descargan.

Tests (18): `site.config` (3), `formatPageTitle` (2), armazón de la app (2) y rutas (11: las 8 rutas con su H1 y su título, más 3 URLs que deben dar la 404 en el cliente).

## 7. Capturas
En `docs/informes/img/fase-0/` (build de producción servido en local):
- `escritorio-planetas.png` (1280×720) y `escritorio-marte.png` (1280×720).
- `movil-planetas.png`: 390×844 a 2x, con emulación de dispositivo por el protocolo de DevTools, porque el Chrome sin interfaz no baja de 500 px de ancho. Medido: `scrollWidth=390`, sin desbordamiento horizontal.

## 8. Dependencias añadidas

| Paquete | Versión | Motivo | ¿Está en la lista permitida? |
|---|---|---|---|
| `@angular/*` (core, common, router, forms, platform-*, ssr, build, cli, compiler-cli) | 22.2.3 / 22.2.4 | `ng new` | ✅ |
| `vitest`, `jsdom`, `typescript`, `@types/node`, `rxjs`, `tslib`, `prettier` | 5.0.5, 30.1.3, 6.0.3, 22.20.5, 7.8.2, 2.8.1, 3.9.10 | `ng new` | ✅ (lo que genera `ng new`) |
| `angular-eslint` | 22.6.0 | Lint | ✅ |
| `eslint` | 10.13.0 | Lint | ✅ |
| `@eslint/js`, `typescript-eslint` | 10.0.1, 8.71.0 | Configuración base que instala `ng add angular-eslint` | ⚠️ No aparecen por su nombre; **Iván decide** (§9) |
| `@fontsource/newsreader` | 5.3.0 (OFL-1.1) | Tipografía de A (titulares) | ✅ (`@fontsource/*`, 1 de 2) |
| `@fontsource/public-sans` | 5.3.0 (OFL-1.1) | Tipografía de A (interfaz y datos) | ✅ (`@fontsource/*`, 2 de 2) |
| ~~`express`, `@types/express`~~ | — | **Eliminadas** (salida estática) | — |

`npm audit`: 2 vulnerabilidades (1 alta, 1 baja), las dos en el `vite` interno de `@angular/build` 22.2.4. Solo afectan al **servidor de desarrollo**, no al build publicado. La única solución que ofrece npm (`audit fix --force`) baja `@angular/build` a 22.1.9, así que no la aplico. Se resolverá al actualizar `@angular/build`.

npm 11 avisa de que hay 4 paquetes con scripts de instalación sin aprobar (`esbuild`, `lmdb`, `msgpackr-extract`, `@parcel/watcher`). No los he aprobado: el build, los tests y el lint funcionan sin ellos.

## 9. Pendientes y `TODO(ivan)`
También están en `docs/PENDIENTES.md`.
- **Elegir la dirección visual A o B** (`docs/DISENO.md`).
- **`@eslint/js` y `typescript-eslint`:** ¿se aceptan dentro de «`angular-eslint` + `eslint`» en la lista cerrada?
- `TODO(ivan)` en `src/app/core/site.config.ts`: confirmar el subdominio (ya estaba en Pendientes).
- Instalar GitHub CLI y crear el repo para que el CI se ejecute de verdad (ya estaba en Pendientes).

## 10. Propuestas de cambio al plan
No se aplican hasta que Iván las apruebe.
1. **PLAN §6, fase 0, tarea 3:** cambiar el comando por `cd ..` y `npx -y @angular/cli@22 new tierra-luna-sol --directory=tls-scaffold …`, porque la CLI 22 rechaza `../tls-scaffold`.
2. **`CLAUDE.md`, reglas de Angular:** precisar «`OnPush` (por defecto en Angular 22: no se declara)».
3. **PLAN §1, dependencias de desarrollo:** añadir `@eslint/js` y `typescript-eslint` (o «lo que instala `ng add angular-eslint`»).

## 11. Cómo probarlo
```bash
npm ci
npm run check       # lint + test + build
npm start           # http://localhost:4200
```
- Navega a `/planetas`, `/planetas/marte`, `/sol`, `/luna`, `/creditos`, `/sobre-el-proyecto` y una URL inventada (debe salir la 404).
- Pulsa `Tab` al cargar: el primer foco es «Saltar al contenido».
- HTML estático: `dist/tierra-luna-sol/browser/**/index.html`.
- Demostración del lint: crea un `.ts` en `src/app/pages/` con `import 'three';` y ejecuta `npm run lint`.

---

## Respuesta a la revisión (se añade tras cada revisión)

Revisión: `docs/revisiones/fase-0.md` (veredicto: APROBADA CON CAMBIOS MENORES). Decisiones de Iván:
- **Dirección visual A**, «Carta celeste».
- **Aprobadas** las 3 propuestas de cambio al plan (§10) y el cambio de estrategia del hallazgo 2.
- Corregir los hallazgos 1–4 (y el 6 si es rápido) y dejar un `TODO` para el 5.

| Hallazgo | Acción | Commit |
|---|---|---|
| 1 · Importante · `.mcp.json` sin versión | **Arreglado, con una variante de la propuesta.** El servidor arranca con `node node_modules/@angular/cli/bin/ng.js mcp`, es decir, la CLI **local** (22.2.4, fijada con integridad en `package-lock.json`): sin red y siempre alineada con el proyecto. Motivos y pruebas en la nota 1. | `fce5a65` |
| 2 · Importante · Estrategia del presupuesto inicial | **Aplicado** (aprobado por Iván). En `PLAN.md` §5: fila nueva (`astronomy-engine`, el store del simulador y los controles del visor nunca van en el bundle inicial, sino dentro del `@defer` del visor; en las fichas, `import()` dinámico en `afterNextRender`) y nota con el margen medido (~272 de 300 kB). En `CLAUDE.md` > Rendimiento: la misma regla. | `8e5a779` |
| 3 · Menor · CI duplicado en las PR | **Arreglado:** `push: { branches: [main] }` + `pull_request`, con un comentario del motivo. | `994a768` |
| 4 · Menor · `@types/node` en ^22 | **Arreglado:** `@types/node` `^24.19.2` (arrastra `undici-types` 7.24.6). `npm ls @types/node` muestra una sola copia, deduplicada también para `vitest` y `vite`. | `5ca4c1a` |
| 5 · Menor · `/404` con 200 | **`TODO(fase-5)`** junto a la ruta `/404` en `src/app/app.routes.ts`: llevar siempre `noindex` y quedar fuera del sitemap. Para que no dependa de que alguien lea el `TODO`, propongo llevarlo al plan de la fase 5 (apuntado en `PENDIENTES.md`, pendiente de Iván). | `12d6853` |
| 6 · Sugerencia · `lang` en dos sitios | **Hecho, con un test.** `site.config.spec.ts` importa `index.html` como texto y comprueba que su `<html lang>` coincide con `SITE_CONFIG.lang`. Comprobé que el test **falla** si se cambia `index.html` a `lang="en"` (`AssertionError: expected 'en' to be 'es'`); después lo revertí. | `4709175` |
| 7 · Sugerencia · Margen lateral (`--gutter`) | **Sin cambios en esta ronda:** como dice la revisión, puede esperar a la fase 6 (pulido), y no estaba en lo que pidió Iván. | — |
| Decisión · Propuestas del §10 | **Aplicadas:** comando de `ng new` desde la carpeta padre (PLAN, fase 0, tarea 3); `OnPush` por defecto sin declararlo (`CLAUDE.md` y PLAN D2); `@eslint/js` y `typescript-eslint` en la lista de PLAN §1. Una línea en la cabecera del PLAN remite a esta respuesta. | `2de447c` |
| Decisión · Dirección visual A | **Registrada:** `DISENO.md` (A elegida, B descartada), comentario de `styles.css` y `PENDIENTES.md`. | `ddbc732` |
| La revisión en el repo | `docs/revisiones/fase-0.md`, sin cambios. | `887b515` |

**Nota 1: por qué no `npx ng mcp` ni `npx -y @angular/cli@22.2.4 mcp`.**
- **`npx ng mcp`** es seguro mientras exista `node_modules`. Pero en un clon recién hecho, sin `npm install`, `npx` buscaría `ng` en el registro y lo instalaría sin preguntar, porque un cliente MCP lo lanza sin terminal interactiva. Lo dice la documentación de `npm exec` incluida en npm 11: *«When standard input is not a TTY or a CI environment is detected, `--yes` is assumed.»* El paquete `ng` de npm es de un tercero, no de Angular: `ng@0.0.0`, publicado en 2013 y sin ejecutable. Hoy no haría nada, pero nada garantiza que siga así.
- **`npx -y @angular/cli@22.2.4`** fija la CLI, pero no sus dependencias transitivas, que el lockfile no cubre. Además habría que subir la versión a mano en cada actualización.
- **Con `node`** no se usa `npx` y no hay red. Tampoco depende de cómo resuelva el cliente `npx.cmd` en Windows: aquí, `spawn('npx')` sin shell da `ENOENT`.
- **Pruebas**, con el mismo arranque por stdio que haría Claude Code (script en el scratchpad, no versionado):
  ```
  .mcp.json → {"command":"node","args":["node_modules/@angular/cli/bin/ng.js","mcp"]}
  initialize → {"name":"angular-cli-server","version":"22.2.4"} protocolo 2025-06-18
  tools/list → 9 herramientas: ai_tutor, get_best_practices, search_documentation, list_projects,
               onpush_zoneless_migration, run_target, devserver_start, devserver_stop, devserver_wait_for_build
  (en una carpeta sin node_modules) → el servidor termina con código 1 al instante, sin descargar nada
  ```
- **Para Iván:** al reiniciar Claude Code puede que pida aprobar otra vez el servidor `angular-cli` del proyecto. Se comprueba con `/mcp`.

**Check final** (`rm -rf node_modules dist .angular && npm ci && npm run check`, código de salida 0):
```
All files pass linting.
All matched files use Prettier code style!
 Test Files  4 passed (4)
      Tests  19 passed (19)
Initial chunk files | Names              |  Raw size | Estimated transfer size
main-UKH4FFTE.js    | main               | 269.21 kB |                73.98 kB
styles-SOEJ2553.css | styles             |   3.24 kB |                 1.07 kB
                    | Initial total      | 272.45 kB |                75.06 kB
Prerendered 8 static routes.
```
- Sin avisos de presupuesto.
- El bundle no ha cambiado: el comentario nuevo de `styles.css` desaparece al minificar.
- `npm audit` sigue igual: las 2 vulnerabilidades del `vite` interno de `@angular/build`. Como acordamos en la revisión, se vuelve a mirar en cada actualización de `@angular/build`.

**Propuesta nueva para el plan** (no aplicada; pendiente de Iván en `PENDIENTES.md`): en la fase 5, tareas 2 y 4, indicar que `/404` lleva siempre `noindex` y queda fuera del sitemap (hallazgo 5).
