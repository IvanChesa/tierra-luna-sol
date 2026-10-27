# Informe: Fase 4 (Despliegue continuo en Cloudflare Pages)

- **Rama:** `fase-4-staging`
- **Fecha:** 2026-10-27
- **Estado:** en curso (modo autónomo por bloques, bloque C)

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
