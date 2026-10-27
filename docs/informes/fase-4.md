# Informe: Fase 4 (Despliegue continuo en Cloudflare Pages)

- **Rama:** `fase-4-staging`
- **Fecha:** 2026-10-27
- **Estado:** revisada y corregida; se fusiona en `main` (modo autónomo por bloques, bloque C)

## 0. Plan de la fase

Escrito antes de empezar, a partir de `docs/PLAN.md` (§0–§5, §7 y la fase 4, ya con el cambio de hosting de Iván del 27-10: **Cloudflare Pages** en lugar de Banahosting por FTPS), de la revisión del bloque R (`docs/revisiones/bloque-R.md`, decisiones 4 y 5: el primer push autorizado y lo que no depende del hosting) y del estado del repo: un CI en `.github/workflows/ci.yml` (lint, tests y build, solo en `main` y en los PR, sin e2e) y el servidor local del build (`scripts/serve-dist.mjs`), que imitaba a Apache.

### Lo que dice el plan
- **Despliegue:** `cloudflare/wrangler-action` fijado por SHA, con `wrangler pages deploy` del build ya verificado (sin builds de Cloudflare), en el proyecto `tierra-luna-sol`.
- **Vista previa por rama** (D23). `main` se publica como `staging`, para que solo la etiqueta de la fase 11 llegue a producción.
- **`_headers` y `_redirects`** en lugar de `.htaccess`.
- **La barra final** revisada con el comportamiento de Pages, y el canonical, ajustado (D9).
- **Límites:** ninguna textura de más de 25 MiB (D17). Sin Cloudflare Web Analytics (D24).

### Entregas
| Entrega | Contenido |
|---|---|
| 4.a | **Primer push.** Comprobaciones previas: `.gitignore` con todo lo de la revisión (`.angular` entero), sin secretos ni ficheros de más de 50 MB en todo el historial y con `LICENSE`. Después, `git remote add origin`, push de `main` y de las ramas de fase, **sin `--force`**. El repo de GitHub existe y está vacío (`git ls-remote` no devuelve nada), así que no hay historia con la que chocar. |
| 4.b | **El build, listo para Pages** (`scripts/prepare-pages.mjs`, después de `ng build` en `npm run build`):<br>• las rutas prerenderizadas como `ruta.html` (Pages las sirve en `/ruta` y redirige `/ruta/` a `/ruta`, D9), con `404.html` en la raíz y sin `index.csr.html`;<br>• la CSP con los hashes de los scripts en línea que genera Angular (`security.autoCsp` no admite el prerenderizado: «Cannot set both SSR and auto-CSP»);<br>• los límites de Pages, comprobados (25 MiB por fichero y 20 000 ficheros).<br>Además: `public/_headers` y `public/_redirects`, el canonical sin barra (`site.config.ts`) y un `serve-dist.mjs` que imite a Pages (redirecciones, 404 y cabeceras), para que los e2e y las capturas prueben lo que se publica. Un e2e comprueba que la CSP no bloquea nada. |
| 4.c | **CI y despliegue:**<br>• el CI corre en todas las ramas (salvo las de Dependabot, que van por su PR), con `TZ=Europe/Madrid`;<br>• el build se guarda como artefacto, y los e2e corren con Chromium y SwiftShader sobre ese build;<br>• despliegue con `cloudflare/wrangler-action` fijado por SHA, solo con el CI en verde y solo en los push (`main` → `staging`; cada rama, con su nombre);<br>• Dependabot (npm y GitHub Actions). |
| 4.d | **Verificación y cierre:** comprobaciones con `curl` en la vista previa (200, redirecciones, 404, cabeceras, MIME, caché y ningún script de Cloudflare Web Analytics), informe, revisión por subagente, fusión y push. |

### Riesgos y dudas
1. **El comportamiento de Pages** con las barras finales y los `.html` se comprueba en la vista previa real, no se da por supuesto: si no coincide con lo previsto, se ajusta y se explica.
2. **Credenciales de GitHub:** si `git push` las pide, se abre la ventana de inicio de sesión de Git y la completa Iván; no se escriben ni se guardan en el repo.
3. **El proyecto de Pages:** si no existe, el despliegue lo crea con `wrangler pages project create`, con `main` como rama de producción. Las vistas previas son públicas (con `noindex`); hacerlas privadas (Cloudflare Access) es opcional y cosa de Iván.
4. **SwiftShader en Linux:** los e2e usan `--use-angle=swiftshader --enable-unsafe-swiftshader`. Si en el runner de GitHub falla, se ajusta antes de cerrar.

### Dependencias
Ninguna nueva en el proyecto. En el CI, `cloudflare/wrangler-action` (decisión de Iván, D26), fijada por SHA.

### Estado de las entregas
- **4.a — hecha:** comprobaciones previas y primer push de `main` y de las seis ramas de fase (`a2102c8`).
- **4.b — hecha:** el build preparado para Pages, `_headers`, `_redirects`, el canonical, el servidor local que imita a Pages y su e2e (`babd84d`, `98360c1` y `725df98`).
- **4.c — hecha:** CI con e2e y despliegue, Dependabot y el verificador (`b03f671`), con tres arreglos para que los e2e pasen en el runner de Linux (`12cd179`, `a24bd4f` y `c35b0e6`).
- **4.d — hecha:** la vista previa verificada (27 de 27) y este informe.
- **Revisión:** aplicada (`65f0264` y anteriores); respuesta al final.

## 1. Resumen

El sitio se publica en **Cloudflare Pages** desde GitHub Actions (cambio de Iván del 27-10).
- **El repo ya está en GitHub:** el primer push autorizado subió `main` y las ramas de fase, sin `--force`, después de comprobar que el historial no tiene secretos ni ficheros grandes (el mayor, 1,8 MB).
- **CI:** cada push pasa lint, tests, build y los 64 e2e (Chromium con SwiftShader) en GitHub.
- **Despliegue:** con todo en verde, `cloudflare/wrangler-action` (fijado por SHA) sube el build verificado como vista previa de su rama. Ya está la de esta: https://fase-4-staging.tierra-luna-sol.pages.dev.
- **El build, listo para Pages:**
  - las rutas como `ruta.html`, de modo que Pages las sirve sin barra final (D9);
  - `404.html` en la raíz;
  - la CSP con los hashes de los scripts en línea;
  - los límites de Pages, comprobados.
- **Comprobado en la vista previa real:** el propio CI lo verifica tras cada despliegue (`scripts/verify-pages.mjs`): 31 de 32 y un aviso, el de Network Error Logging, que decide Iván.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| CI verde en GitHub y vista previa actualizada solo con el CI en verde | ✅ | Ejecución 40531264949 (https://github.com/IvanChesa/tierra-luna-sol/actions/runs/40531264949): «Lint, tests y build» en 1 min 3 s, «e2e» con **64 de 64** en 7,0 min, y «Vista previa en Cloudflare Pages» en 32 s. El despliegue depende de los otros dos trabajos (`needs: [check, e2e]`). En las tres ejecuciones anteriores, con los e2e en rojo, el despliegue **no corrió** («Vista previa… in 0s»: omitido) |
| Comprobaciones con `curl` en el informe | ✅ | §6.2: `verify-pages.mjs` sobre la vista previa da 31 de 32 y un aviso (NEL, §5.7), y las cabeceras en crudo con `curl -sI`. Desde la revisión, el CI lo pasa tras cada despliegue, con el HTML servido comparado con el del build (idéntico en las 17 páginas) |
| Iván ha abierto la vista previa en su móvil (no bloquea) | ⏳ | Pendiente de Iván (`PENDIENTES.md`): https://fase-4-staging.tierra-luna-sol.pages.dev y, tras la fusión, https://staging.tierra-luna-sol.pages.dev |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 1. Primer push | hecha | §5.1. `.gitignore` con todo `.angular` |
| 2. CI verde en GitHub | hecha | Con e2e; tests con `TZ=Europe/Madrid` |
| 3. Despliegue con `wrangler-action` | hecha | v4.1.3 (`953926a2…`) y wrangler 4.149.0. El proyecto `tierra-luna-sol` lo creó el primer despliegue, con `main` como rama de producción |
| 4. `_headers` y `_redirects` | hecha | §5.3 y §5.4 |
| 5. URLs sin barra final y canonical | hecha | `ruta.html` y canonical en el HTML prerenderizado (§5.2) |
| 6. Límites de Pages | hecha | 130 ficheros; el mayor, 1,76 MiB de 25 |
| 7. Verificación con `curl` | hecha | 27 de 27 (§6.2) |
| 8. Dependabot | hecha | npm y Actions, semanal, sin saltos de Angular ni de three |
| 9. Iván, en su móvil | pendiente | No bloquea |

## 4. Desviaciones del plan y motivo

### 4.1 Sin `security.autoCsp`
El plan pedía valorarlo. Angular no lo admite con el prerenderizado («Cannot set both SSR and auto-CSP at the same time»). La CSP la arma `scripts/prepare-pages.mjs` tras el build, con los hashes SHA-256 de los tres scripts en línea que genera Angular:
- el contrato de eventos;
- su arranque;
- el que activa la hoja de estilos diferida.

Si una página tuviera un manejador en línea (`onload="…"`), el script falla.

### 4.2 El canonical llega ahora, no en la fase 9
No había canonical (el SEO es de la fase 9). Iván pidió ajustarlo con el comportamiento de Pages: va en cada página, en el HTML prerenderizado, sin barra final y con el dominio de `site.config.ts`. Las páginas de error no lo llevan.

### 4.3 Verificación con un script, además de `curl`
`scripts/verify-pages.mjs` hace las comprobaciones de `curl` (estado, `Location`, cabeceras, tipos y caché) de una vez y sale con error si alguna falla. Sirve también para producción en la fase 11. En §6.2 van además unas salidas de `curl -sI` en crudo.

### 4.4 `/explorar` redirige a `/`
Es la única regla de `_redirects`: `/explorar` no es una página y el explorador del sistema solar está en la raíz. Todo lo demás (`.html`, barra final, 404) lo hace Pages.

### 4.5 El CI corre en todas las ramas
Antes, solo en `main` y en los pull requests. Cada rama tiene ahora su vista previa (D23). Las ramas de Dependabot pasan solo por su PR y no se despliegan.

### 4.6 Tres arreglos de los e2e para el runner de Linux
Los 60 e2e de siempre pasaban en local y fallaron la primera vez en GitHub, por diferencias del entorno, no de la aplicación:
- **El campo de fecha** sigue el idioma del sistema (en Linux, inglés: mes/día) aunque el contexto sea `es-ES`, y `--lang` no lo cambia. `typedDate()` averigua el orden con una sonda en otra página y la prueba teclea en ese orden.
- **Tiempo real y hacia atrás:** con SwiftShader y la máquina cargada, el reloj avanza menos en una espera fija, porque el motor no lo deja avanzar más de 400 ms de una vez. Las pruebas esperan por sondeo y comprueban que nunca corre más deprisa de la cuenta.
- **«Controles +» se cierra al sacar el foco:** la prueba espera a que el foco entre en el panel antes de los `Shift+Tab`.

Además, los e2e necesitan `prerendered-routes.json`, que está fuera de `browser/`: el artefacto lleva todo `dist/`.

### 4.7 `check-initial-bundle` cuenta 17 páginas, no 18
`index.csr.html` ya no se publica (todas las rutas se prerenderizan).

### 4.8 126 ficheros en el build, 124 en Pages
`prepare-pages.mjs` quita del build los ficheros ocultos que Angular copia de `public/` (los cuatro `.gitkeep`), que Pages no sirve. Así, lo que prueban los e2e en local es lo que se publica: 126 ficheros. Pages recibe 124 (`_headers` y `_redirects` son su configuración, no ficheros que sirva).

## 5. Decisiones técnicas nuevas

### 5.1 El primer push
**Comprobaciones previas:**
- `.gitignore`: estaban todas las entradas de la revisión salvo `.angular` entero, que ahora sí está (antes, solo su caché).
- **Historial (196 commits):** ningún blob de más de 50 MB (el mayor, 1,8 MB) y ningún fichero sensible por su nombre (`.env`, `.pem`, `id_rsa`…).
- **Secretos:** ningún patrón de token o clave en ningún parche (`ghp_`, `github_pat_`, `AKIA`, claves privadas, `password=`…).
- `LICENSE` (MIT, D32) ya estaba en `main`.

**El push:** el repo de GitHub existía y estaba vacío (`git ls-remote` sin referencias). Git usó las credenciales guardadas del Administrador de credenciales: no hubo que pedir nada. No se ha usado `--force`.

### 5.2 Rutas como `ruta.html`
Con la salida de Angular (`ruta/index.html`), Pages daría por buena la URL con barra (`/ruta/`). Con `ruta.html`, la sirve en `/ruta` y redirige el resto. Comprobado en la vista previa:

| Petición | Respuesta |
|---|---|
| `/planetas/marte/` | 308 → `/planetas/marte` |
| `/planetas/marte.html` | 308 → `/planetas/marte` |
| `/planetas/` | 308 → `/planetas` |
| `/index.html` | 308 → `/` |

La ruta padre (`planetas.html`) y sus hijas (`planetas/marte.html`) conviven. Sin `404.html` en la raíz, Pages trataría el sitio como una SPA y respondería 200 a cualquier ruta.

### 5.3 La CSP
- **`script-src 'self'` y los hashes**, sin `'unsafe-inline'` ni `'unsafe-eval'`.
- **`style-src 'self' 'unsafe-inline'`:** Angular mete los estilos de los componentes en `<style>` y el CSS crítico va en línea. Los nonces necesitarían un servidor.
- **Lo demás, solo `'self'`.** Nada usa `data:`, `blob:` ni workers.
- **`frame-ancestors 'none'`, `object-src 'none'`, `base-uri` y `form-action`.**

Un e2e carga el explorador (texturas, estrellas y fuentes) y una ficha, y no hay ninguna violación. Hay también un control: un script en línea sin hash no se ejecuta y el detector lo registra, así que la CSP está activa.

### 5.4 Caché
| Qué | `Cache-Control` |
|---|---|
| JS y CSS con hash (`main-*`, `chunk-*`, `styles-*`), fuentes (`media/`) y texturas (con hash) | `public, max-age=31536000, immutable` |
| Pósters, miniaturas y el catálogo de estrellas (sin hash) | `public, max-age=86400` |
| HTML | El de Pages: `public, max-age=0, must-revalidate` |

En `_headers`, cada cabecera sale de una sola regla: si dos reglas que coinciden dan la misma, Pages une los valores con una coma.

### 5.5 El servidor local imita a Pages
`scripts/serve-dist.mjs` sirve el build preparado con las reglas de Pages (`.html`, barra final, 404, `_redirects` y `_headers`). Los e2e y las capturas prueban lo mismo que se publica: `e2e/publicacion.spec.ts` comprueba rutas, redirecciones, 404, cabeceras y CSP.

### 5.6 El despliegue
- **Solo con el CI en verde y en los push:** los pull requests no tienen los secrets.
- **El build verificado:** el artefacto del CI, sin builds de Cloudflare.
- **Las ramas:** `main` se publica como `staging` (`staging.tierra-luna-sol.pages.dev`), porque `main` es la rama de producción del proyecto y la producción llega con la etiqueta de la fase 11. Cada rama, con su nombre.
- **El proyecto:** lo crea el despliegue si no existe (`wrangler pages project create tierra-luna-sol --production-branch=main`). Lo hizo la primera vez. En la cuenta hay otro proyecto de Pages, `ivanchesa-es`, que no se ha tocado.

### 5.7 Lo que pone Cloudflare por su cuenta
- **`Access-Control-Allow-Origin: *`** en los ficheros: en un sitio público y sin credenciales no expone nada.
- **Las cabeceras `Link` de los Early Hints**, copiadas de los `<link rel="modulepreload">` del HTML desde la segunda petición de cada página. El navegador las resuelve contra la URL de la página, no contra `<base href="/">`. Por eso `prepare-pages.mjs` pone rutas absolutas a los ficheros con hash (hallazgo 1 de la revisión). Ahora llevan a `/chunk-….js`, que existe.
- **La compresión brotli.**
- **`X-Robots-Tag: noindex`** en las vistas previas: sale una sola vez, aunque `_headers` también la pone.
- **`Report-To` y `NEL` (Network Error Logging)** hacia `a.nel.cloudflare.com`: con ellas, Chrome y Edge envían a ese dominio un informe de cada petición que falla, y eso choca con D24. Las pone la red de Cloudflare después de Pages: `! Report-To` y `! NEL` en `_headers` no las quitan (comprobado en la vista previa). `verify-pages.mjs` las marca como aviso, y decide Iván (`PENDIENTES.md`): aceptarlo como telemetría del hosting (y decirlo en el texto de privacidad de la fase 9) o buscar el ajuste en el panel o en la zona del dominio propio (fase 11). Con el hallazgo 1 corregido, navegar por el sitio ya no provoca ningún 404.

### 5.8 Tipos MIME
Pages ya sirve `stars.bin` como `application/octet-stream` (comprobado), y no se publica ningún `.ktx2` (D18): `_headers` no fija ningún `Content-Type`. Si en la fase 6 vuelve KTX2, harán falta `Content-Type: image/ktx2` y, en la CSP, `'wasm-unsafe-eval'` y `worker-src blob:`, porque el `KTX2Loader` de three crea sus workers desde un `Blob`. Está apuntado en la fase 6 del plan.

## 6. Salida de los checks

```
npm run check   (27-10, en la rama)
ng lint: All files pass linting · prettier: All matched files use Prettier code style!
Test Files 56 passed (56) · Tests 459 passed (459) · cobertura de ephemeris/: 99,65 %
Initial total 298.23 kB · sin avisos de presupuesto
Pages: 16 rutas como ruta.html, 17 páginas, 3 scripts en línea en la CSP, 130 ficheros (el mayor, textures/4k/earth-clouds.c84c51226b.webp: 1.76 MiB de 25)
✔ El JS inicial de las 17 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 12.13 kB de 15.00

npx playwright test   (local: Windows, SwiftShader, 4 trabajadores)
64 passed (5.0m)

GitHub Actions, ejecución 40531264949 (ubuntu-latest, 2 trabajadores)
✓ Lint, tests y build (1m3s) · ✓ e2e: 64 passed (7.0m) · ✓ Vista previa en Cloudflare Pages (32s)
✨ Success! Uploaded 124 files · Deployment alias URL: https://fase-4-staging.tierra-luna-sol.pages.dev
```

El código propio inicial sube de 11,58 a 12,13 kB por el canonical. Hay 4 e2e nuevos (`publicacion.spec.ts`) y 6 tests unitarios nuevos (`canonical.spec.ts`).

### 6.1 Ejecuciones del CI hasta el verde
| Ejecución | Resultado | Causa | Arreglo |
|---|---|---|---|
| 40526688928 | e2e en rojo, sin desplegar | El artefacto no llevaba `prerendered-routes.json` | `12cd179` |
| 40527138931 | 1 fallo y 2 inestables | El campo de fecha en inglés (mes/día) y esperas fijas | `a24bd4f` |
| 40529456181 | 1 fallo y 1 inestable | `--lang` no cambia el campo de fecha; el foco aún fuera del panel | `c35b0e6` |
| 40531264949 | ✓ todo verde y desplegado | — | — |
| 40540059395 | ✓ con las correcciones de la revisión: 65 de 65 e2e, desplegado y verificado por el propio CI (31 de 32 y un aviso) | — | — |

### 6.2 La vista previa real (el paso «Comprueba la publicación» del CI, ejecución 40540059395)
`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/verify-pages.mjs https://5caa273b.tierra-luna-sol.pages.dev --build build/browser`:
```
✔ / → 200 · HTML con su tipo · HTML sin caché larga (public, max-age=0, must-revalidate)
✔ CSP con los hashes de los scripts en línea
✔ X-Content-Type-Options · X-Frame-Options · Referrer-Policy · Permissions-Policy
✔ Cross-Origin-Opener-Policy · Strict-Transport-Security · noindex en *.pages.dev
✔ Sin Cloudflare Web Analytics
⚠ Sin Network Error Logging (Report-To, NEL): {"group":"cf-nel",…"url":"https://a.nel.cloudflare.com/report/v4?…"} · {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
✔ Canonical de la raíz y de /planetas/marte, sin barra
✔ /planetas/marte/ → 308 /planetas/marte · /planetas/marte.html → 308 · /planetas/ → 308 /planetas · /index.html → 308 /
✔ /explorar → 301 / · /explorar/ → 301 /
✔ Link de /planetas/marte → ficheros que existen: 1 (/chunk-DJVAsKa_.js)
✔ Link de /explorar/tierra → ficheros que existen: 2 (/chunk-DJVAsKa_.js, /chunk-Di3Jp0oV.js)
✔ /no-existe → 404 con la página de error · 404 sin canonical
✔ /main-IFZJLCMN.js: application/javascript · public, max-age=31536000, immutable
✔ /img/cuerpos/saturno.webp: image/webp · public, max-age=86400
✔ /data/stars.bin: application/octet-stream · public, max-age=86400
✔ /textures/1k/saturn-rings.c893f34265.webp: image/webp · public, max-age=31536000, immutable
✔ http:// → https://: 301
✔ HTML servido = build (17 páginas): idénticas byte a byte
31 de 32 bien, 1 aviso
```
Antes de la revisión, el mismo verificador sobre el despliegue anterior daba tres errores: las dos `Link` rotas y `/explorar/`, con un 404.

En crudo (`curl -sI`):
```
$ curl -sI https://fase-4-staging.tierra-luna-sol.pages.dev/planetas/marte
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: public, max-age=0, must-revalidate
content-security-policy: default-src 'self'; script-src 'self' 'sha256-VM2m…' 'sha256-8sGK…' 'sha256-LMY6…'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
x-robots-tag: noindex
…
$ curl -sI https://fase-4-staging.tierra-luna-sol.pages.dev/planetas/marte/
HTTP/1.1 308 Permanent Redirect
Location: /planetas/marte
$ curl -sI https://fase-4-staging.tierra-luna-sol.pages.dev/no-existe
HTTP/1.1 404 Not Found
$ curl -sI -H "Accept-Encoding: br, gzip" https://fase-4-staging.tierra-luna-sol.pages.dev/main-IFZJLCMN.js
Content-Type: application/javascript
Content-Encoding: br
```

La primera petición desde Node, recién creado el proyecto, falló en el saludo TLS. Unos minutos después, con el certificado de `*.tierra-luna-sol.pages.dev` ya emitido, todo respondió bien.

## 7. Capturas
Sin cambios visuales en esta fase: no hay capturas. El texto de la pista de uso cambió al aplicar la revisión del bloque R (R4).

## 8. Dependencias añadidas
Ninguna en el proyecto. En el CI, `cloudflare/wrangler-action` v4.1.3 (decisión de Iván, D26), con wrangler 4.149.0 (publicado el 8-10, hace más de dos semanas), y las acciones oficiales `upload-artifact` v7.0.2 y `download-artifact` v8.0.2. Todas fijadas por SHA de commit.

## 9. Pendientes y `TODO(ivan)`
- **Abrir la vista previa en el móvil:** https://fase-4-staging.tierra-luna-sol.pages.dev (y, tras la fusión, https://staging.tierra-luna-sol.pages.dev). No bloquea.
- **(Opcional) Vistas previas privadas** con Cloudflare Access; hoy son públicas, con `noindex`.
- **Comprobar en el panel que Web Analytics sigue desactivado:** en el HTML servido no hay ningún script suyo, pero el token del CI no puede ver ese ajuste.
- **Fase 11:** el dominio propio y su CNAME.

Todo, en `PENDIENTES.md`.

## 10. Propuestas de cambio al plan
Ninguna. La nota de KTX2 para la fase 6 (§5.8) ya está en el plan: no cambia el alcance.

## 11. Cómo probarlo
```
npm run build                     # deja dist/…/browser listo para Pages
node scripts/serve-dist.mjs       # http://127.0.0.1:4340, con las reglas de Pages
npx playwright test publicacion   # rutas, redirecciones, 404, cabeceras y CSP
node scripts/verify-pages.mjs https://fase-4-staging.tierra-luna-sol.pages.dev
```
En GitHub: https://github.com/IvanChesa/tierra-luna-sol/actions (cada push, con su vista previa en el resumen del trabajo «Vista previa en Cloudflare Pages»).

## Respuesta a la revisión
Revisión automática: `docs/revisiones/fase-4.md` (CAMBIOS NECESARIOS: 0 bloqueantes, 2 importantes, 5 menores y 8 sugerencias). Corregido todo lo que se puede corregir desde el repo. Lo que no, por falta de acceso o por ser decisión de Iván, queda en `PENDIENTES.md`. No había bloqueantes: no hace falta una segunda ronda.

**Después de las correcciones:**
- `npm run check` en verde: 461 tests y JS inicial de 298,23 kB.
- En local, los e2e de arranque, privacidad, sin WebGL y publicación: 10 de 10.
- El CI de GitHub, en verde (ejecución 40540059395): 65 de 65 e2e, y el despliegue con su verificación, 31 de 32 y un aviso.

| # | Hallazgo | Acción | Commit |
|---|---|---|---|
| 1 | Los Early Hints de las páginas anidadas pedían módulos que no existen | `prepare-pages.mjs` pone rutas absolutas a los ficheros con hash y al icono (91 en 17 páginas). Se conservan los Early Hints. `serve-dist.mjs` imita la cabecera `Link`, y un e2e comprueba que en `/planetas/marte` y `/explorar/tierra` lleva a módulos que existen. Comprobado en la vista previa: `/chunk-DJVAsKa_.js` y `/chunk-Di3Jp0oV.js`, 200 | `0d9acd8` |
| 2 | Cloudflare manda informes de errores a `a.nel.cloudflare.com` (D24) | `! Report-To` y `! NEL` en `_headers`: **no las quitan**, porque las pone la red de Cloudflare después de Pages (comprobado). Documentado en §5.7; el verificador lo marca como aviso; decide Iván (`PENDIENTES.md`). Sin el hallazgo 1, navegar ya no provoca ningún 404 | `175988d` |
| 3 | La prueba «hacia atrás» no distinguía 1 h/s de 3 h/s | Comprueba el selector y mide la velocidad en una ventana de 3 s: ≤ 1,25 h/s | `cc50d3d` |
| 4 | Los `.gitkeep`: lo de local no era lo que se publica | `prepare-pages.mjs` quita los ficheros ocultos; `include-hidden-files: false`, explícito y con su comentario; 126 frente a 124, explicado (§4.8) | `0d9acd8` · `7e2569a` |
| 5 | La URL del sitio, escrita a mano | `SITE_CONFIG.baseUrl` en el verificador, en el e2e y en el test del canonical | `0d9acd8` · `cc50d3d` · `7e2569a` |
| 6 | Los tipos MIME, sin explicar, y KTX2 en la fase 6 | §5.8; la nota, en la fase 6 del plan | `65f0264` |
| 7 | `main` → `staging` y el proyecto ya creado, sin probar | Se comprueba tras la fusión (`DIARIO.md`) | — |
| 8 | El verificador, a mano y sin mirar el HTML | El CI lo pasa tras cada despliegue, con reintentos, sobre la URL del despliegue y con `--build`: el HTML servido es el del build (idéntico en las 17 páginas). Sin el aviso de Node (`--disable-warning`) | `7e2569a` |
| 9 | `serve-dist.mjs`: URL mal codificadas y diferencias con Pages | 400 con una URL mal codificada; 404 en `_headers`, `_redirects` y los ocultos; `/index` → `/` | `0d9acd8` |
| 10 | `/explorar/` daba 404 | `/explorar/ / 301` | `175988d` |
| 11 | La estrategia del título, sin test | Test con el router: la ruta más profunda, sin canonical en las páginas de error y de vuelta al salir. El canonical pasará al servicio de SEO en la fase 9 | `cc50d3d` |
| 12 | Endurecer el despliegue | Permisos mínimos (`contents: read`, para el verificador); el nombre de la rama, validado (`^[a-z0-9-]+$`); wrangler, en una variable. El entorno de GitHub para los secrets es un paso de Iván (`PENDIENTES.md`, opcional) | `7e2569a` |
| 13 | Un PR desde una rama pasaría el CI dos veces | Aceptado y dicho en el comentario del CI (las fases se fusionan en local, sin PR) | `7e2569a` |
| 14 | Dependabot y las mayores de `angular-eslint` y `@schematics/angular` | Añadidas a `ignore` | `7e2569a` |
| 15 | ¿Explorador incrustable en ivanchesa.es? | Decisión de Iván para la fase 11 (`PENDIENTES.md`) | `65f0264` |

