# Tierra Luna Sol: plan de la versión 1 (revisión 2)

> Documento maestro. Lo ejecuta Claude Code en el PC de Iván, por fases y en bloques autónomos. Otra sesión de Claude revisa cada bloque (`docs/revisiones/`).
> Si este plan y el código no coinciden, manda el plan. Los cambios se proponen en el informe de fase y los aprueba Iván.
> Revisión 2 del plan: 24-10-2026. Sustituye a la revisión 1. Incorpora la auditoría de las fases 2–10 (`docs/decisiones/auditoria-plan-v2.md`), lo aprendido en la fase 1 y la decisión de Iván de que el SEO sea secundario.
> Actualizada el 30-10-2026 con la revisión del bloque C (`docs/revisiones/bloque-C.md`): los tamaños de la vista general (**D35**: un 25 % más grandes, sin solapes y con un mínimo en pantalla), la VRAM de la fase 6 con la Tierra y la Luna juntas (C4), el NEL de Cloudflare en D24 y en las fases 9 y 11 (C8) y la 8K de la Tierra, más barata, en la fase 10; y con la mejora de los anillos de Saturno que pidió Iván (**D36**, `docs/decisiones/ANILLOS-SATURNO.md`), en la fase 7 junto a R2.
> Actualizada el 27-10-2026 con la fase nueva **4b** (pulido de la vista del sistema solar, `docs/decisiones/FASE-4b-SISTEMA-SOLAR.md`): la velocidad según el contexto (D33, sustituye a la de entrada de D31), las estelas de color (D34) y planetas más visibles en la vista general, en el bloque **C**, antes de la fase 5.
> Actualizada el 27-10-2026 con la revisión del bloque R (`docs/revisiones/bloque-R.md`): las propuestas aprobadas de las fases 3b y 3c (fases 5, 7 y 10, §5 y el backlog), la licencia MIT (D32) y el primer push autorizado; y con el cambio de hosting de Iván: **Cloudflare Pages** (plan gratuito) en lugar de Banahosting por FTPS (D9, D17, D23, D24, D26 y fases 4 y 11).
> Actualizada el 27-10-2026 con dos decisiones de Iván: el arranque a 3 horas/s (D31) y el bloom de la fase 3b, opcional en la fase 10.
> Actualizada el 26-10-2026 con la revisión del bloque B (`docs/revisiones/bloque-B.md`): las propuestas aprobadas de las fases 2 y 3, las fases nuevas **3b** (realismo de los planetas) y **3c** (interfaz inmersiva) en el bloque **R**, las decisiones D29–D31 y «El cielo desde España» (`docs/decisiones/`).

---

## 0. Qué es y para qué

Un **explorador 3D interactivo** del Sol, los 8 planetas, 21 lunas, la Tierra y la Luna, **en español**, con **posiciones y orientaciones reales para cualquier fecha entre 1900 y 2100**, calculadas en el navegador. Tiene **todas las funcionalidades** del proyecto que lo inspira (`ethanplusai/earth-moon-solar`) y **mejoras propias**. No se copia nada de él (ni código, ni textos, ni diseño): se escribe desde cero.

**Objetivo:** pieza de portfolio de Iván Chesa Lapena (desarrollador web freelance, ivanchesa.es). Tiene que demostrar Angular moderno, 3D web de calidad profesional, rigor científico, rendimiento y accesibilidad. **El SEO es secundario**: se publica como subdominio de ivanchesa.es y lo que importa es que impresione al abrirla y se comparta bien.

**Dónde vive:** en **Cloudflare Pages** (plan gratuito; decisión de Iván del 27-10, antes Banahosting), con un subdominio de ivanchesa.es como dominio propio en la fase 11 (propuesto: `tierra-luna-sol.ivanchesa.es`). Desde la fase 4, una vista previa por rama en `*.tierra-luna-sol.pages.dev` (la de `main`, en `staging.tierra-luna-sol.pages.dev`). Proyecto y repositorio independientes.

### 0.1 Paridad con el original (todo esto entra en la v1)

| Funcionalidad del original | Fase |
|---|---|
| Tierra fotográfica: relieve, nubes, atmósfera, luces nocturnas, brillo de los océanos | 5 |
| Vistas guiadas de la Tierra y control de la luz solar | 5 |
| Luna con color de la NASA (LROC) y **relieve real** (altímetro LOLA) | 6 |
| Cara visible, cara oculta, polo sur y luz rasante sobre el terminador | 6 |
| **Recorrido de cámara guiado** por la Luna (reproducir/pausar) | 6 |
| Sistema solar: 8 planetas + **21 lunas** con movimiento datado | 2, 7 |
| **Sombras analíticas de los anillos de Saturno** (anillos sobre el planeta y planeta sobre los anillos) | 2 |
| Control de reproducción (fecha, velocidad) y **estelas de movimiento** | 3 |
| Modo **escala real** con transición desde la escala ilustrativa | 2 (motor), 7 (interfaz) |
| **Estrellas en su posición real** (catálogo HYG) | 1, 2 |
| **Transiciones cinemáticas** Tierra ↔ Luna ↔ Sistema Solar | 3 |
| Botones de zoom, **vista limpia** (ocultar la interfaz), encuadre que respeta los paneles en móvil | 3 |
| Transiciones de los textos al cambiar de vista | 3 |
| **Interfaz inmersiva**: lienzo a pantalla completa, fichas de cuerpos con miniatura, barra de tiempo con línea deslizante y «Controles +», y el sistema en movimiento al entrar (con nuestro estilo, D30 y D31) | 3c |
| **Vista general del sistema solar como la del original**: planetas que se reconocen, estelas de color sobre las órbitas y una velocidad que cambia con el contexto (3 días/s en la vista general, 1 h/s al enfocar un cuerpo) (D33 y D34) | 4b |
| Planetas con buena **dirección de arte de la luz** (relleno, tone mapping y exposición por vista) | 3b |
| Notas de fuentes y créditos | 9 |
| Diseño para móvil, controles etiquetados, táctil y movimiento reducido | 3–10 |

### 0.2 Mejoras sobre el original

| Mejora | Fase |
|---|---|
| **Cualquier fecha** (1900–2100): el original solo cubre 2026 y deja de funcionar en enero de 2027 | 1 ✅ |
| **Lunas con precisión ≤ 0,38° en dos siglos** (elementos ajustados a las efemérides del JPL; validado en instantes independientes) | 1 ✅ |
| **Orientación real de cada cuerpo** (modelo IAU): la Tierra gira según la hora, los anillos de Saturno se abren y cierran con los años y la Luna muestra su libración | 2, 5, 6 |
| **Una sola aplicación con un lienzo 3D persistente**: viajes de cámara continuos, sin recargar la página | 2, 3 |
| **Eclipses en 3D**: la sombra de la Luna recorre la Tierra y la Luna se enrojece en la sombra terrestre en las fechas reales | 5, 6, 8 |
| **Sombras de las lunas** sobre Júpiter (tránsitos) y eclipses de lunas | 7 |
| **Planetas fieles a sus fotos reales**: sombreado físico por tipo de cuerpo (limbo, atmósferas y Lommel–Seeliger, D29), relieve de Mercurio y Marte con modelos de elevación oficiales y anillos de Saturno con fotometría | 3b |
| **Fondo de Vía Láctea alineado** con el cielo real (panorama de ESO/S. Brunier si su licencia CC BY 4.0 se confirma; omitida en la fase 2 por la licencia CC BY-NC de Gaia) | 3b |
| **Lunas principales con superficie fotográfica** (USGS); el original usa colores planos | 7 |
| **El cielo desde España**: qué se ve esta noche desde los grandes observatorios del país (el Montsec por defecto) o desde tu ubicación, crepúsculos, a qué hora y hacia dónde mirar | 8 |
| **Próximos eclipses visibles desde España**, con «Ver en 3D» | 8 |
| **Fichas HTML** de los 30 cuerpos, con imágenes renderizadas por el propio motor | 9 |
| **Todo usable con teclado y sin 3D**: listas, tablas, fichas y control de cámara por teclado | 3–10 |
| **Calidad adaptativa**: el visor baja de nivel solo si el dispositivo no llega | 2 |
| **Enlaces compartibles** con vista, fecha, cuerpo y escala | 3 |
| **Privacidad total**: sin cookies, sin analítica y sin peticiones a terceros | 9 |
| Tests de precisión frente a JPL Horizons, USNO y NASA, y regresión visual | 1, 2, 5–8, 10 |

---

## 1. Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Angular 22 + TypeScript estricto** | Elección de Iván (valor en el portfolio). |
| D2 | **Standalone + zoneless + signals.** `OnPush` es el valor por defecto: **no se declara** | Guía oficial (`docs/angular-buenas-practicas.md`). |
| D3 | **Three.js directo**, sin `angular-three` | `angular-three` no soporta Angular 22 ni three ≥ 0.183. |
| D4 | **astronomy-engine** para el Sol, los planetas, la Luna, las galileanas, las fases, la orientación de los cuerpos (`RotationAxis`), la libración, las salidas y puestas, los crepúsculos y los eclipses | Sin ficheros de efemérides que caduquen. |
| D5 | **Prerenderizado estático** (`outputMode: "static"`) | Hosting sin Node; primera carga inmediata; las fichas funcionan sin JS. |
| D6 | **`SceneEngine`: clase TS sin Angular** | Testable, sin detección de cambios por frame, seguro en el prerenderizado. |
| D7 | **CSS propio con custom properties.** Dirección visual **A, «Carta celeste»** | `docs/DISENO.md`. |
| D8 | Idiomas: UI, textos, comentarios, commits y docs en **español de España**; identificadores y archivos en **inglés**; URLs en **español** | — |
| D9 | **URLs sin barra final** | Lo que genera el router de Angular. En Cloudflare Pages, cada ruta prerenderizada se publica como `ruta.html`: Pages la sirve en `/ruta` y redirige `/ruta/` a `/ruta`; el canonical, sin barra (fase 4). |
| D10 | **Lienzo 3D único y persistente.** Las vistas del explorador son rutas hijas de un layout que conserva el canvas y el `SceneEngine` | Viajes de cámara continuos. |
| D11 | **Lunas:** galileanas con `Astronomy.JupiterMoons`. Las otras 16, con **elementos medios** (elipse con precesión, más una aceleración secular y términos periódicos de la longitud cuando mejoran el ajuste) **ajustados por mínimos cuadrados a Horizons en 1900–2100**. La tabla del JPL solo aporta los planos de Laplace y los valores iniciales (Urano y Neptuno usan su ecuador con el polo IAU 2015; en Urano, el polo de su rotación); script y residuos en `docs/datos/elementos-lunas.md`. Kepler en el navegador | La tabla del JPL no sirve para fechar posiciones (comprobado en la fase 1). Error conseguido: ≤ 0,38° (TT) en 1900–2100, el máximo sobre las ~2000 muestras del ajuste de cada luna; ≤ 0,36° en los instantes de test. |
| D12 | **Tres marcos de escala con origen flotante desde la fase 2**: vista general ilustrativa, sistema local físico (al enfocar un planeta y sus lunas) y escala real global. Posiciones en float64 en JS, relativas al foco antes de pasar a la GPU | La precisión float32 de la GPU no admite km y miles de millones de km a la vez. Diseñarlo al principio evita rehacer el motor. |
| D13 | **Profundidad logarítmica** (`logarithmicDepthBuffer`) en todos los dispositivos. En la prueba de la fase 2, el buffer invertido de three falla (el halo del Sol tapa su disco desde Fobos) y el estándar empata con el logarítmico en las capturas; se elige el logarítmico por margen de precisión, a costa del early-Z (medido: 60 FPS). **Todo `ShaderMaterial` incluye los chunks de `scene/materials/depth.ts`** | Afecta a todos los shaders posteriores. Decidido con pruebas en la fase 2 (informe, §5.1; aprobado por Iván el 26-10). |
| D14 | **Estrellas reales del catálogo HYG** (magnitud ≤ 6,5) como `Points` (tamaño por magnitud, color por B−V) | Paridad y base del cielo desde España. |
| D15 | **Relieve lunar:** elevación del LOLA en **16 bits empaquetados en dos canales de 8** (los navegadores degradan los PNG de 16 bits a 8 al subirlos a WebGL), desplazamiento de vértices + mapa de normales derivado | Resolución vertical real sin trucos. |
| D16 | **Recorridos y vistas guiadas como datos** (`data/tours.ts`) | Se revisan como contenido. |
| D17 | **Texturas:** Solar System Scope (CC BY 4.0) para el Sol, los planetas, la Tierra y los anillos; NASA CGI Moon Kit para la Luna; USGS Astrogeology para las lunas principales. **Ningún fichero publicado pasa de 25 MiB** (el límite por fichero de Cloudflare Pages; lo comprueba `npm run check`) | Licencias libres y documentadas. El límite, por el hosting (D26). |
| D18 | **Pipeline de texturas:** WebP por niveles, decodificadas fuera del hilo principal (`ImageBitmapLoader`), con tope a `maxTextureSize` y subida progresiva a la GPU. **KTX2 se descarta por ahora** (fase 2, §5.2 del informe: con UASTC pesa 4 veces más que WebP; ahorra unas 4 veces la VRAM); se reevalúa en la fase 6 para la Luna en 8K | Cambiar de formato al final cuesta caro; la VRAM es el límite real en móvil. Aprobado por Iván el 26-10. |
| D19 | **Orientación con el modelo IAU** (`Astronomy.RotationAxis`) para el Sol, los planetas y la Luna; la Tierra con EQD + tiempo sidéreo (fase 1); las demás lunas, en rotación síncrona hacia su planeta | Realismo verificable (anillos, libración, hora del día). |
| D20 | **Sombras analíticas** en los shaders (esferas y anillos oclusores), no mapas de sombras | Estables en cualquier escala, baratas y exactas. |
| D21 | **Iluminación ilustrativa:** luz solar sin atenuación por distancia y exposición por vista (desde la fase 3b, en un único módulo de configuración visual con el motivo de cada valor) | Los planetas exteriores serían invisibles con la caída física; se documenta en `/sobre-el-proyecto`. |
| D22 | **Calidad adaptativa** (`low` / `medium` / `high`): detección inicial, bajada automática si los FPS no llegan y selector manual recordado | Funciona bien en cualquier dispositivo. |
| D23 | **Vista previa por rama desde la fase 4** en Cloudflare Pages: cada rama, en `<rama>.tierra-luna-sol.pages.dev`, y `main`, en `staging.tierra-luna-sol.pages.dev`, todas con `X-Robots-Tag: noindex`. Producción en la fase 11, con una etiqueta de versión | Detectar pronto los problemas del hosting y probar en móviles reales por URL. Sustituye al staging de cPanel (cambio de Iván del 27-10). |
| D24 | **Privacidad:** sin cookies, sin analítica (tampoco Cloudflare Web Analytics) y sin peticiones a terceros (todo autoalojado). El Network Error Logging de Cloudflare (Chrome y Edge envían a `a.nel.cloudflare.com` un informe de cada petición que falla) se acepta como telemetría del propio alojamiento, que ya sirve cada petición y solo informa de fallos, y se explica en la privacidad (fase 9); en la fase 11, con el dominio propio, se mira si la zona permite desactivarlo (revisión del bloque C, C8; decisión de Iván, 30-10) | Cumplimiento sin banner de cookies y una garantía visible de calidad. |
| D25 | **SEO secundario** (decisión de Iván): title y description simples, una imagen Open Graph global y `robots.txt` básico. Sin JSON-LD ni sitemap trabajado | Es una pieza de portfolio dentro de ivanchesa.es. |
| D26 | **Despliegue:** GitHub Actions → **Cloudflare Pages** con `cloudflare/wrangler-action` fijado por SHA: `wrangler pages deploy` del build ya verificado en el CI, sin builds de Cloudflare, en el proyecto `tierra-luna-sol`. Cada push con el CI en verde publica la vista previa de su rama; la etiqueta `v*`, producción (fase 11). `_headers` y `_redirects` en lugar de `.htaccess` | Cambio de Iván del 27-10 (antes, FTPS a Banahosting, porque el SSH estaba bloqueado). Los secrets `CLOUDFLARE_API_TOKEN` (solo con permiso de Pages) y `CLOUDFLARE_ACCOUNT_ID` ya están en el repo. |
| D27 | **Tests:** Vitest (unitarios) + Playwright (e2e y regresión visual) + axe (accesibilidad) | — |
| D28 | **Solo español en la v1**; el inglés queda para después (`@angular/localize`) | — |
| D29 | **Sombreado físico por tipo de cuerpo**, con chunks GLSL comunes en `scene/materials/`: **rocosos sin atmósfera** (Mercurio, la Luna y las lunas) con Lommel–Seeliger y un pico de oposición sencillo (Hapke simplificado); **gigantes** (Júpiter, Saturno, Urano y Neptuno) con el oscurecimiento del limbo de Minnaert, un parámetro por planeta documentado y el terminador suavizado; **con atmósfera** (Venus, Tierra, Marte y Titán; también los gigantes) con una dispersión aproximada en el limbo y en el terminador, con el tono de cada atmósfera; **brillo relativo** coherente con el albedo geométrico del catálogo y la exposición por vista. La luz ambiente plana desaparece: en la vista general puede quedar un relleno mínimo, documentado como ilustrativo | Los planetas parecían de plástico (Lambert + ambiente plano). Fase 3b (`docs/decisiones/FASE-3b-REALISMO.md`); la usan después la Tierra, la Luna y las lunas. |
| D30 | **Interfaz inmersiva del explorador:** lienzo a pantalla completa, fichas de cuerpos abajo, barra de tiempo compacta con línea deslizante y controles desplegables. Se toma la **estructura** de la referencia del original, con **nuestra dirección visual A** («Carta celeste»): la disposición se inspira en ella; los estilos, las formas y los textos son propios | Petición de Iván (26-10). Fase 3c (`docs/decisiones/FASE-3c-INTERFAZ.md`). |
| D31 | **Arranque en movimiento:** al entrar, el sistema solar se reproduce desde «ahora», a la velocidad de su contexto (**D33**: 3 días/s en la vista general). Con `prefers-reduced-motion`, arranca en pausa; con un enlace que fija `?fecha=`, en pausa en ese instante. Cumple WCAG 2.2.2: el botón de pausa es lo primero y más visible de la barra, y `Espacio` también pausa | Petición de Iván (26-10). La velocidad de entrada fue 3 días/s, después 3 horas/s (27-10) y ahora la fija D33 (27-10, fase 4b). Fase 3c. |
| D32 | **Licencia del código propio: MIT** (`LICENSE`, «Copyright (c) 2026 Iván Chesa Lapena»). Las texturas, los datos y los catálogos de terceros conservan sus propias licencias (`docs/FUENTES.md`), en particular el fichero de estrellas (CC BY-SA 4.0); lo dicen el README y `/creditos` | Decisión de Iván (27-10, revisión del bloque R): el repo de GitHub es público. |
| D33 | **Velocidad según el contexto** (sustituye a la velocidad de entrada de D31; sus excepciones siguen): en la **vista general del sistema solar, 3 días/s**, con la que se entra; al **enfocar cualquier cuerpo** (en el lienzo, en una ficha o en el índice) y en las vistas Tierra y Luna, **1 hora/s**; al volver a la vista general, otra vez 3 días/s. Un cambio manual de la velocidad se respeta mientras siga ese contexto, y el siguiente cambio de contexto aplica la del nuevo. El sentido (hacia atrás) se conserva; con movimiento reducido o con `?fecha=` se entra en pausa, y un cambio de contexto no arranca la reproducción. El cambio se anuncia de forma discreta (`aria-live` educado), una vez | Petición de Iván (27-10). Fase 4b (`docs/decisiones/FASE-4b-SISTEMA-SOLAR.md`). |
| D34 | **Estelas de los planetas:** un arco **del color de cada cuerpo** (`scene/body-colors.ts`) sobre su órbita, **detrás** del cuerpo (delante, si la reproducción va hacia atrás), que se desvanece hasta desaparecer. Su longitud es una **fracción de la órbita** (~1/8 de vuelta, en `scene/visual-config.ts`), no un tiempo, para que se vea igual a cualquier velocidad; **visibles también en pausa**; más cortas y tenues en los sistemas de lunas; mezcla aditiva sutil | Petición de Iván (27-10), como en el original. Fase 4b. |
| D35 | **Tamaños de la vista general** (revisión del bloque C, C2 y C3; decisiones de Iván del 30-10): los radios ilustrativos, **un 25 % más grandes** que en la fase 4b (`radiusFactor` 0,105: Júpiter, 9,1 unidades; el Sol, el mayor, sigue en 13); **sin solapes**: cuando dos cuerpos se acercan más que sus radios (o que los anillos de Saturno, como disco plano) más 1,5 unidades, solo esos dos encogen con un paso suave y recuperan el tamaño al separarse, con su sistema de lunas (`relieveOverlaps`, función pura con tests); y un **radio mínimo de 2 px en pantalla** para los planetas en la vista general (solo en la escala ilustrativa), sin cambiar posiciones ni órbitas | Iván quería los planetas «un poco más grandes» y que en el móvil no se vieran como marcadores. De 1900 a 2100 solo encogen Júpiter y Saturno, en sus conjunciones (un 3,2 % del tiempo, hasta ×0,79; muestreo de `scene/illustrative-layout.spec.ts`, también con el tamaño mínimo de un móvil de 390 px). |
| D36 | **Anillos de Saturno** (decisión de Iván, 30-10; `docs/decisiones/ANILLOS-SATURNO.md`): el color de cada anillo, de **espectrofotometría publicada** (Voyager, Hubble o Cassini), no de fotos de prensa (sustituye al color medido en R1); la profundidad óptica τ(r), de un **perfil radial medido** (ocultaciones de Cassini o de Voyager del PDS Ring-Moon Systems Node), con sus divisiones en el radio publicado; un **realce moderado del brillo**, ilustrativo como el relleno de D21 (B / disco ≈ 1,0–1,1, entre la física, 0,77, y la foto de prensa, 1,44), que no toca la fotometría ni sus tests; y sin tono lavanda en los anillos tenues | Los anillos salían gris azulados, con poca estructura fina y apagados. Va en la fase 7, junto a R2, porque los dos tocan Saturno y su material. |

### Dependencias permitidas (lista cerrada)
Cualquier otro paquete → **preguntar a Iván antes de instalarlo**.

- **Producción:** `@angular/*` 22.x · `three` `^0.186.0` · `astronomy-engine` `^2.1.19` · `@fontsource/newsreader` · `@fontsource/public-sans`
- **Desarrollo:** lo que genera `ng new` (incluidos Vitest y jsdom) · `@types/three` · `angular-eslint`, `eslint`, `@eslint/js` y `typescript-eslint` · `prettier` · `@playwright/test` · `@axe-core/playwright` · `sharp` · `@vitest/coverage-v8`
- **Propuestas pendientes de Iván** (se piden en su fase): `@lhci/cli` (Lighthouse en el CI, fase 10); herramienta externa `toktx` (KTX-Software) si la prueba de KTX2 de la fase 2 lo justifica.
- **Herramientas del CI que no son dependencias del proyecto:** `cloudflare/wrangler-action` (instala `wrangler` en el CI para desplegar en Cloudflare Pages), fijada por SHA (decisión de Iván, 27-10, D26).
- **Recursos de three que no son dependencias nuevas:** `three/addons/*` (controles, `KTX2Loader`, post-procesado) y el transcodificador Basis de `three/examples/jsm/libs/basis/`, copiado a `public/`.

---

## 2. Rutas

| Tipo | Ruta | Contenido |
|---|---|---|
| **Explorador** (layout con lienzo persistente) | `/` | Vista del sistema solar + texto introductorio prerenderizado |
| | `/explorar/tierra` | La Tierra en detalle y sus vistas guiadas |
| | `/explorar/luna` | La Luna en detalle, sus vistas y el recorrido |
| | `/cielo` | El cielo desde España: el lugar con `?lugar=` (el Montsec por defecto) o tu ubicación |
| **Fichas** (HTML, sin 3D) | `/planetas`, `/planetas/:id` | Índice y 8 fichas |
| | `/lunas`, `/lunas/:id` | Índice y 20 fichas |
| | `/sol`, `/luna` | Fichas del Sol y de la Luna |
| | `/eclipses` | Próximos eclipses visibles desde España |
| **Otras** | `/creditos`, `/sobre-el-proyecto`, `/404` | — |

Parámetros del explorador: `?fecha=2030-01-01T00:00Z&cuerpo=titan&escala=real`; en `/cielo`, también `?lugar=teide`. Modo de captura para pruebas: `?captura=1` (fecha, cámara y estado deterministas; sin interfaz animada).

---

## 3. Requisitos previos

| Requisito | Estado | Acción |
|---|---|---|
| Node ≥ 22.22.3 o ≥ 24.15 | ✅ v24.22.1 | — |
| Repo independiente | ✅ | — |
| **Repo en GitHub** (`https://github.com/IvanChesa/tierra-luna-sol`, público) | ✅ primer push autorizado por Iván (revisión del bloque R) | Claude Code, al empezar la fase 4: comprobaciones previas (`.gitignore`, sin secretos ni ficheros de más de 50 MB, `LICENSE`) y push de `main` y de las ramas de fase, sin `--force` |
| **Cloudflare Pages** | ✅ secrets `CLOUDFLARE_API_TOKEN` (solo con permiso de Pages) y `CLOUDFLARE_ACCOUNT_ID` en el repo (27-10) | — (sustituye al staging de cPanel) |
| Móvil real | Iván | Desde la fase 4, por la vista previa de Cloudflare Pages (o por la red local) |
| Un iPhone para probar (aunque sea prestado) | Iván | Fase 10: Safari en iOS tiene límites de memoria propios |

Si algún paso de la fase 4 depende de Iván y no está hecho, se hace todo lo demás, se apunta en `PENDIENTES.md` y el bloque sigue con la fase 5.

---

## 4. Arquitectura

### 4.1 Estructura de carpetas

```
src/app/
├─ core/            site.config.ts (fuente única), seo.service.ts, site-title.strategy.ts
├─ ephemeris/       TS PURO: tiempo, coordenadas, efemérides, lunas, estrellas (decodificador), system-state (30 cuerpos con caché), orientation (IAU), escala (3 marcos), órbitas, sombras (geometría), cielo local, eclipses; ids.ts y constants.ts sin dependencias (los puede usar el bundle inicial)
│  └─ fixtures/     datos de referencia (JPL Horizons, USNO, NASA, IGN) con la consulta original
├─ data/            body.model.ts, body-index.ts (ligero), body-data.ts, body-texts.ts, bodies.ts (catálogo completo), moon-elements.ts, tours.ts, places.ts, sources.ts
├─ scene/           THREE.JS SIN ANGULAR
│  ├─ engine.ts           SceneEngine (API pública en index.ts)
│  ├─ frames.ts           marcos de escala y origen flotante
│  ├─ bodies/             sol, planeta, tierra, luna, luna genérica, anillos
│  ├─ materials/          shaders y chunks comunes (profundidad, sombras analíticas, sombreado por tipo D29, atmósfera)
│  ├─ camera/             rig, vuelos, encuadre con paneles, recorridos, viajes cinemáticos
│  ├─ stars.ts · milky-way.ts · trails.ts · orbits.ts (Line2) · labels.ts (capa HTML de etiquetas)
│  ├─ sky/                cúpula del cielo local (fase 8)
│  ├─ quality.ts          niveles, calidad adaptativa, presupuesto de VRAM
│  └─ textures.ts         manifiesto, carga con ImageBitmap, tope de tamaño, subida progresiva
├─ state/           simulation.store.ts, explorer.store.ts (signals)
├─ features/        viewer-layout, time-controls, body-picker, body-panel, camera-controls, tour-player, view-switcher, sky-panel
└─ pages/           home, planets-index, moons-index, body-detail, eclipses, credits, about, not-found
scripts/            fixtures (Horizons/USNO), fit-moon-elements, build-stars, build-body-data, build-body-texts (+ content/body-texts.json), check-initial-bundle, download-assets, build-textures, build-relief (3b; la fase 6 lo reutiliza para la Luna), render-body-images
```

### 4.2 Capas (ESLint `no-restricted-imports`; ya configurado)
- `ephemeris/`: ni Angular, ni `three`, ni RxJS, ni otras capas.
- `data/`: ni Angular ni `three`.
- `scene/`: ni Angular ni RxJS. **Único sitio donde se importa `three`.**
- `state/`, `features/` y `pages/`: solo `scene/index.ts`.

### 4.3 Coordenadas y orientación (todo en `ephemeris/coordinates.ts` y `ephemeris/orientation.ts`, con tests)
- astronomy-engine devuelve vectores **EQJ**. Se pasan a **ECL** con `Rotation_EQJ_ECL()`. Three: ECL `(x, y, z)` → `(x, z, −y)`.
- **Tierra:** EQJ→EQD (precesión y nutación) + tiempo sidéreo de Greenwich (fase 1). Se valida con el punto subsolar.
- **Sol, planetas y Luna:** `Astronomy.RotationAxis` (polo y ángulo del meridiano principal, IAU 2015) → cuaternión en ECL. La alineación del meridiano 0 de cada textura se documenta en el manifiesto y se testa.
- **Otras lunas:** rotación síncrona (la misma cara hacia su planeta).
- **Lunas ajustadas:** plano de referencia de cada luna (Laplace o ecuador IAU; en Urano, el polo de su rotación) → ECL.
- **Cielo local:** `Astronomy.Horizon` con refracción, para el observador de `data/places.ts`.
- **Tiempo interno:** siempre en **UTC**. La UI del explorador muestra la **hora local del navegador con su zona** (con opción UTC). El cielo desde España usa la **zona horaria IANA de cada lugar** (`Europe/Madrid` en la Península; `Atlantic/Canary` en el Teide y el Roque de los Muchachos, una hora menos), indicada junto a las horas.

### 4.4 Marcos de escala (D12)
1. **Vista general ilustrativa** (por defecto): `r_vis = K · log10(1 + r_UA / 0,1)` (monótona y testada), conservando la dirección real; tamaños agrandados con mínimos y máximos, sin solapes y con un mínimo en pantalla (D35); las lunas de cada planeta se ven como un sistema compacto alrededor de él.
2. **Sistema local físico:** al enfocar un planeta (o una de sus lunas), toda la escena pasa a geometría real alrededor de él, con la unidad que conserva su radio ilustrativo: el planeta y sus lunas quedan a escala física real entre ellos, y el resto del sistema a su distancia real (desde el planeta se ve el cielo verdadero). Es lo que permite ver las órbitas reales de las lunas (fase 2, §4.1 del informe; aprobado por Iván el 26-10).
3. **Escala real global:** todo en km, con marcadores de visibilidad para los cuerpos diminutos.

Las transiciones entre marcos son animadas (~1,5 s), interpolando posiciones y tamaños, y directas con `prefers-reduced-motion`. Las órbitas, estelas y sombras usan siempre la misma transformación que los cuerpos. El origen flotante (todo relativo al foco, en float64 en JS) funciona en los tres marcos.

### 4.5 Estado y bucle
- `SimulationStore`: `simTime`, `playing`, `speed`, `selectedBodyId`, `scaleFrame`, `quality`.
- `ExplorerStore`: `view` (sistema / tierra / luna / cielo), `tour` (paso y estado), `cleanView`.
- El motor avanza el tiempo internamente y sincroniza el store **≤ 5 veces/s**. **Render bajo demanda** sin movimiento.
- La **URL se sincroniza solo** en pausa, selección, cambio de vista o de escala; nunca durante la reproducción.
- **Velocidades altas sin aliasing:** si un cuerpo avanzaría más de ~20° por frame, su marcador animado se sustituye por su órbita resaltada y su rotación propia se congela visualmente.

### 4.6 SSR / prerenderizado
- El 3D **nunca** se ejecuta en el servidor: `@defer` con `@placeholder` (póster + texto) y motor creado en `afterNextRender`.
- `astronomy-engine`, los stores y los controles **nunca** van en el bundle inicial. En las fichas, los datos «de hoy» con `import()` dinámico en `afterNextRender` y texto alternativo en el HTML.
- Lo que las rutas importan de `ephemeris/` y `data/` no puede depender de astronomy-engine: `ephemeris/ids.ts`, `ephemeris/constants.ts` y `data/body-index.ts` no tienen dependencias (fase 1). `scripts/check-initial-bundle.mjs` lo comprueba en `npm run check` y en el CI.
- `getPrerenderParams` para `planetas/:id` y `lunas/:id` desde el índice de cuerpos.

### 4.7 Arranque del visor sin bloquear
- **Shaders:** `renderer.compileAsync`.
- **Texturas:** decodificadas con `ImageBitmapLoader` y subidas de forma progresiva (`renderer.initTexture`) priorizando la vista actual.
- **Inicialización troceada**, cediendo el hilo principal entre pasos.
- **Progreso de carga visible** y estados de error con «Reintentar». Si se pierde el contexto WebGL, se recupera (`webglcontextlost`/`restored`).

---

## 5. Presupuestos de calidad

| Área | Objetivo |
|---|---|
| JS inicial | Aviso > 320 kB · error > 400 kB, en bruto, y **código propio** (`src/`) de los chunks iniciales ≤ 15 kB, medido en `browser-stats.json` por `check-initial-bundle.mjs`. La base de Angular (~285 kB) crece con cada versión; todo lo nuevo va diferido (revisión del bloque B, B4) |
| Chunk del visor | Aviso > 900 kB en bruto; tamaño en cada informe |
| Texturas, primera vista (`/`) | ≤ 2,5 MB (alto) · ≤ 1,2 MB (bajo) |
| Vista Tierra | ≤ 6 MB adicionales (alto) · ≤ 2 MB (bajo) |
| Vista Luna en detalle | ≤ 10 MB adicionales (alto) · ≤ 3 MB (bajo) |
| Lunas fotográficas | Al enfocar su sistema; ≤ 300 kB por luna en el nivel bajo |
| Estrellas + Vía Láctea | ≤ 250 kB las estrellas · ≤ 1,5 MB (alto) / 400 kB (bajo) la Vía Láctea |
| **VRAM estimada** (texturas + geometría) | ≤ 300 MB (alto) · ≤ 120 MB (bajo). Ninguna textura supera `maxTextureSize` |
| **Arranque** | Sin tareas largas > 200 ms; compatible con Lighthouse ≥ 90 |
| **Efemérides por frame** | ≤ 2 ms en escritorio con los 30 cuerpos, incluidas sus orientaciones (medido en la fase 2: 0,16 ms) |
| Lighthouse móvil, fichas | ≥ 95 en rendimiento, accesibilidad y buenas prácticas (el SEO no es criterio) |
| Lighthouse móvil, explorador | Rendimiento ≥ 90 · accesibilidad y buenas prácticas ≥ 95. Se mide con `@lhci/cli` desde la fase 10, si Iván aprueba la dependencia; hasta entonces, con las métricas de arranque de cada informe (LCP, CLS y tareas largas con su tiempo de bloqueo, §6.2 de la fase 3c) |
| LCP / CLS | ≤ 2,5 s · ≤ 0,05. El LCP nunca es el canvas |
| FPS | ≥ 55 en escritorio (alto) · ≥ 30 en móvil de gama media (bajo), **en todas las vistas** |
| Memoria | 10 idas y vueltas explorador ↔ ficha y 10 cambios de vista sin crecimiento de `renderer.info.memory` |
| Accesibilidad | axe: 0 violaciones graves o críticas · todo usable con teclado y sin canvas |
| Privacidad | 0 cookies · 0 peticiones a dominios de terceros (comprobado en e2e) |
| **Precisión** | Planetas ≤ 0,05° y ≤ 0,1 % · Luna ≤ 0,1° y ≤ 0,5 % · Galileanas ≤ 0,5° · Otras lunas ≤ 0,5° en 1900–2100 medido en TT; en UT, ≤ 0,5° en 2020–2035 (a partir de ~2055, el ΔT futuro puede añadir más de 0,5° en las lunas más rápidas, y se documenta) · Punto subsolar ±2° · Libración de la Luna frente a `Astronomy.Libration` ±1° · Apertura de los anillos ±1° · Centro de la sombra en un eclipse solar ±1° · Salidas y puestas ±2 min · Eclipses con fecha y tipo exactos |
| Datos | 0 cifras sin fuente |

---

## 6. Fases y bloques

Cada fase va en su rama `fase-N-nombre`. Se trabaja en **modo autónomo por bloques** (prompt en `docs/prompts/PROMPTS.md`): dentro de un bloque, cada fase termina con `npm run check`, un informe, una revisión automática por subagente, correcciones y fusión. **Al final de cada bloque, la ejecución para** y la sesión de revisión hace una revisión completa antes de seguir.

| Bloque | Fases | Esfuerzo | Por qué se para ahí |
|---|---|---|---|
| A | 1 | `max` | Cimientos astronómicos ✅ (revisado en `docs/revisiones/bloque-A.md`) |
| B | 2–3 | `max` | Arquitectura del motor (marcos, profundidad, texturas) y de la interfaz ✅ (revisado en `docs/revisiones/bloque-B.md`) |
| R | 3b–3c | `max` | Realismo de los planetas e interfaz inmersiva: la base de iluminación que usan después la Tierra, la Luna y las lunas, y la cara del explorador ✅ (revisado en `docs/revisiones/bloque-R.md`) |
| C | 4, 4b y 5 | `max` | Vista previa en Cloudflare Pages, la vista general del sistema solar pulida (4b) y la Tierra, primera pieza «guau» probada en móviles reales ✅ (revisado en `docs/revisiones/bloque-C.md`) |
| D | 6–7 | `max` | La Luna, las lunas, las sombras y la escala real: lo más difícil |
| E | 8–9 | `high` | El cielo desde España, los eclipses y el contenido |
| F | 10 | `max` | Pulido y calidad final |
| — | 11 | `high` | Lanzamiento, con Iván |

**Fases grandes:** se trabajan en **entregas** (N.a, N.b…), con el informe actualizado (estado «en curso») al final de cada sesión.

**Capturas:** toda fase con cambios visuales aporta capturas deterministas (modo `?captura=1`) en escritorio y móvil en `docs/informes/img/fase-N/`.

### Fase 0: Cimientos ✅
Angular 22, prerenderizado estático, lint por capas, CI, estructura, dirección visual A. Ver `docs/informes/fase-0.md`.

### Fase 1: Efemérides, catálogo y datos ✅
Coordenadas (EQJ/EQD/ECL/Three/terrestre), efemérides de 30 cuerpos, lunas ajustadas a Horizons (≤ 0,38° en TT; validadas en instantes independientes con un fixture de control), escalas, órbitas, estrellas HYG, lugares del IGN, catálogo de 30 cuerpos con datos con fuente y 120 textos con citas verificadas por script, y comprobación del bundle inicial. Ver `docs/informes/fase-1.md`.

### Fase 2: Motor 3D y escena base ✅

Hecha y revisada (`docs/informes/fase-2.md`, `docs/revisiones/fase-2.md` y `bloque-B.md`). Se conserva el texto como referencia de la arquitectura.

**Objetivo:** el sistema solar real de hoy, con la **arquitectura definitiva del motor**: estado del sistema, orientación, marcos de escala, profundidad y texturas. Lo que se decida aquí no debe rehacerse después.

**Parte de la fase 1:**
- `ephemeris/`: `planetHeliocentric`, `moonGeocentric`, `galileanMoons`, `meanElementsPosition`, `earthFixedToEcl`, `subsolarPoint`, `scale.ts` (ilustrativa, real, `illustrativeMoonOffset` y `blendPosition`), `OrbitCache` y `decodeStarCatalog`/`starDirectionsEcl`.
- `data/`: índice ligero, datos con fuente y `places.ts`.
- **Falta y se crea aquí:** el estado agregado del sistema, la orientación IAU, el marco «sistema local físico» y todo `scene/`.

Entregas en este orden (cada una cierra con `npm run check` y el informe actualizado):

**2.a · Contrato y lógica sin WebGL**
1. **`ephemeris/system-state.ts`**: posiciones de los 30 cuerpos en una sola llamada (heliocéntricas, ECL, float64), con caché por instante. Coste medido (≤ 2 ms en escritorio).
2. **`ephemeris/orientation.ts`** (D19): `RotationAxis` → matriz o cuaternión en ECL para el Sol, los planetas y la Luna; la Tierra con `earthFixedToEcl` (fase 1); las demás lunas en rotación síncrona hacia su planeta. **Achatamiento:** añadir a los datos `flatteningRatio` de cada planeta con fuente (fichas individuales de la NASA NSSDCA, «Ellipticity (Flattening)», mediante `build-body-data.mjs`). La escena dibuja elipsoides, porque Saturno (~10 %) y Júpiter (~6,5 %) no son esferas, y las sombras de los anillos usan el elipsoide.
3. **`ephemeris/scale.ts`**: añadir el marco **sistema local físico** (§4.4) y las transiciones entre los tres marcos, con tests de continuidad y de que ningún cuerpo adelanta a otro.
4. **Contrato público de `SceneEngine`** en `scene/index.ts`, escrito **antes** de implementarlo:
   - órdenes: `setTime`, `setPlaying`, `setSpeed`, `focus`, `setScaleFrame`, `setQuality`, `setView`, `resize`, `capture`, `dispose`;
   - eventos: `ready`, `progress`, `bodyPicked`, `frameStats`, `error`, `contextLost`/`contextRestored`, `qualityChanged`.
   - La lógica (tiempo, marcos, cámara, selección) va separada del renderer, que se inyecta con una fábrica, para poder testearla en Vitest **sin WebGL**.

**2.b · Texturas**
5. `download-assets.mjs` (originales a `assets-src/`) y `build-textures.mjs` (sharp → WebP 1k/2k/4k con hash). Por ahora: Sol, planetas, Tierra (día, noche, nubes, normales, especular), Luna básica y anillos.
6. **Manifiesto tipado** (`scene/textures.ts`), con, por cada mapa:
   - niveles disponibles y alineación del meridiano 0;
   - `colorSpace` (sRGB los de color; sin espacio de color los de datos: normales, especular, elevación);
   - alfa.
7. **Carga** (D18):
   - `ImageBitmapLoader` con `imageOrientation: 'flipY'` y `premultiplyAlpha: 'none'` (si no, las UV salen invertidas y los mapas con alfa, mal);
   - tope a `maxTextureSize`, anisotropía según el dispositivo y subida progresiva con `renderer.initTexture`;
   - estimación de VRAM por nivel.
8. **Prueba de KTX2 sin instalar herramientas:** con las texturas KTX2 de ejemplo del repositorio de three y su `KTX2Loader`, medir VRAM, tiempo de subida y peso frente a WebP equivalentes. Recomendación en el informe. **No es una condición de parada:** si conviene KTX2, se propone `toktx` a Iván y se sigue con WebP.
9. `FUENTES.md` archivo a archivo.

**2.c · Motor y escena**
10. **Renderer:** sRGB, tone mapping, DPR limitado y exposición por vista. **Profundidad** (D13): prueba de `reversedDepthBuffer` frente a `logarithmicDepthBuffer` con capturas en el marco real (Fobos junto a Marte; Neptuno con la Tierra en primer plano), decisión documentada y chunks comunes en `scene/materials/`.
11. **Marcos y origen flotante** (D12) aplicados a cuerpos, órbitas y estrellas.
12. **Sol** (oscurecimiento del limbo + halo) y **luz sin atenuación** (D21).
13. **Planetas** orientados (D19), **anillos de Saturno** en su plano real con **sombras analíticas anillos ↔ planeta** (D20) y la **Luna básica**.
14. **Órbitas** con `Line2` de `three/addons` (grosor en píxeles, nítidas en pantallas de alta densidad), desvanecidas hacia atrás desde el cuerpo.
15. **Estrellas HYG** como `Points` (tamaño por magnitud, color por B−V, sin traslación de cámara). **Vía Láctea alineada** si hay fuente libre (candidata: NASA SVS Deep Star Maps, en TIFF/PNG/JPG, no EXR). **No es una condición de parada:** si no la hay, se omite y se apunta. *(Omitida: la de NASA SVS deriva de Gaia DR2, con licencia CC BY-NC. Pasa a la fase 3b, tarea 5b, con el panorama de ESO.)*
16. **Etiquetas de los cuerpos:**
    - capa HTML superpuesta que gestiona `scene/` (proyección por frame con transformaciones CSS, fuera de Angular);
    - se ocultan las que se solapan, priorizando la seleccionada y los planetas;
    - `aria-hidden` (la lista accesible llega en la fase 3);
    - un clic emite `bodyPicked`.
17. **Póster provisional** generado con el modo de captura (`public/img/poster-*.webp`, con `width`/`height`). La fase 9 lo sustituye por el definitivo.

**2.d · Integración y robustez**
18. **`ViewerLayoutComponent`** como ruta padre (D10), con las rutas hijas `/`, `/explorar/tierra` y `/explorar/luna`; en esta fase, estas dos con un encuadre básico. `@defer`, póster y `afterNextRender`.
19. **Arranque sin bloquear** (§4.7): `compileAsync`, inicialización troceada, progreso visible, errores con «Reintentar» y recuperación del contexto WebGL.
20. **Bucle:** `requestAnimationFrame`, pausa con `visibilitychange` y render bajo demanda.
21. **Calidad adaptativa** (D22):
    - solo baja automáticamente, nunca sube sola, con histéresis: X s por debajo del umbral **mientras hay animación**;
    - al cambiar de nivel se recargan las texturas por el manifiesto, con `dispose()` de las anteriores;
    - selector manual recordado (con `try/catch`).
22. **Modo `?captura=1`** (fecha, cámara y semilla fijas; sin animaciones de interfaz) e indicador de FPS y `renderer.info` solo en desarrollo.
23. **Comprobación del bundle por módulos:** `check-initial-bundle.mjs` pasa a usar el `stats.json` del build (`ng build --stats-json`, el metafile de esbuild). Comprueba por **ruta de módulo** (`node_modules/three`, `node_modules/astronomy-engine`) que nada de eso entra en los chunks iniciales de ninguna página. Las cadenas actuales quedan como segunda capa.

Criterios de aceptación:
- [ ] Primero se pintan el texto y el póster; después, el Sol, los planetas, las órbitas, las estrellas y las etiquetas en las posiciones de hoy (capturas en escritorio y móvil).
- [ ] `three` y `astronomy-engine` van en el chunk diferido (con la salida del build y el tamaño del chunk).
- [ ] Tests de orientación:
  - el punto de la Luna que mira a la Tierra coincide con `Astronomy.Libration` (longitud y latitud de libración) con un margen de ±1°, en 3 fechas;
  - la apertura de los anillos vista desde la Tierra es ≈ 0° el 23-03-2025, cruce del plano de los anillos (±1°).
- [ ] Tests de la lógica del motor sin WebGL (marcos, transiciones, selección, tiempo).
- [ ] Decisión de profundidad con capturas sin parpadeos en el marco real.
- [ ] Memoria, FPS, VRAM, peso de la primera vista y coste por frame según §5 (cifras).
- [ ] En pausa y sin interacción: 0 frames por segundo. Pérdida y recuperación del contexto WebGL probadas.
- [ ] Calidad adaptativa: con FPS bajos simulados (reloj falso) baja una vez y no oscila.
- [ ] Etiquetas legibles y sin solaparse en la vista general (captura).
- [ ] Informe de la prueba de KTX2 con cifras y una recomendación.
- [ ] Saturno y Júpiter con su achatamiento real (captura), con `flatteningRatio` con fuente.
- [ ] La comprobación del bundle por `stats.json` detecta una importación pequeña de three (solo `Vector3`) en una página (demostrado y revertido).

### Fase 3: Interfaz del explorador e interacción ✅

Hecha y revisada (`docs/informes/fase-3.md`, `docs/revisiones/fase-3.md`, `fase-3-diseno.md` y `bloque-B.md`). La fase 3c rehace la disposición sobre esta base.

**Objetivo:** una interfaz profesional, bonita y accesible sobre el 3D, diseñada para móvil desde el principio (la fase 10 pule, no rediseña).

Entregas en este orden:

**3.a · Diseño en código y estilo**
1. **Diseño de alta fidelidad directamente en componentes:**
   - con datos de ejemplo y el 3D en modo captura: panel de tiempo, lista de cuerpos, ficha resumida, controles de cámara, selector de vista, estados de carga y error;
   - **escritorio y móvil** (hoja inferior), coherentes con `docs/DISENO.md`, con `taste-skill` e `impeccable` como referencia;
   - capturas en el informe; el subagente revisor las evalúa con la lista de diseño antes de conectar la lógica.
   - No se hace una maqueta aparte que luego haya que repetir.
2. **`docs/ESTILO.md`**:
   - tuteo, frases cortas y sin anglicismos;
   - cifras con `Intl` `es-ES` y unidades (km, UA, °C, h);
   - fechas y horas;
   - cómo citar las fuentes.

**3.b · Estado, tiempo y selección**
3. **Stores** (§4.5) con sus tests.
4. **`TimeControlsComponent`**:
   - fecha y hora (inputs nativos accesibles, 1900–2100) en hora local con su zona, con opción UTC;
   - «Ahora», reproducir/pausar;
   - **tiempo real** (1 s/s) y velocidades de 1 h/s, 1 día/s, 1 semana/s, 1 mes/s y 1 año/s, **también hacia atrás**;
   - al llegar a 1900 o 2100, pausa con un aviso claro.
5. **`BodyPickerComponent`**: lista accesible + selección en el canvas (raycast con zonas agrandadas y clic en la etiqueta). **`BodyPanelComponent`**: nombre, tipo, dato clave, distancia actual al Sol y a la Tierra y enlace a la ficha.

**3.c · Cámara, vistas y movimiento**
6. **`CameraControlsComponent`**:
   - vuelo y seguimiento, «Vista general»;
   - **botones de zoom +/−**;
   - **teclado en el canvas** (flechas para orbitar, `+`/`−` para el zoom, `Inicio` para la vista general);
   - **encuadre que respeta los paneles** (`camera.setViewOffset`);
   - **vista limpia** (ocultar la interfaz y recuperarla con un botón o `Esc`).
7. **Estelas** y **velocidades altas sin aliasing** (§4.5).
8. **`ViewSwitcherComponent`** (sistema solar, Tierra y Luna; el cielo llega en la fase 8) y **viajes cinemáticos**:
   - ~3 s, con «Saltar» y `Esc`;
   - fundido o corte con `prefers-reduced-motion`;
   - carga diferida de las texturas de destino durante el viaje;
   - el motor no se recrea.

**3.d · URL, teclado, accesibilidad y e2e**
9. **URL** (§4.5): parámetros validados; si alguno no es válido, se ignora y se muestra un aviso discreto.
10. **Teclado completo** y **diálogo de atajos** (`?`). Los atajos no actúan con el foco en un campo de texto **y los de una sola tecla se pueden desactivar en el diálogo (WCAG 2.1.4)** (propuesta de la fase 3, aprobada por Iván el 26-10).
11. **`aria-live`** con una descripción textual al seleccionar o cambiar de vista («Saturno, a 1430 millones de km del Sol…»), sin anuncios por cada tic de la fecha. Transiciones de los textos (CSS, con movimiento reducido).
12. **Playwright:**
    - instalación de Chromium y WebGL en modo sin interfaz con SwiftShader (`--use-angle=swiftshader`, `--enable-unsafe-swiftshader`);
    - e2e deterministas con `?captura=1`: seleccionar, fecha, tiempo real y hacia atrás, zoom, teclado, vista limpia, cambio de vista, enlace con parámetros y parámetro no válido.

Criterios de aceptación:
- [ ] Capturas del diseño y de la implementación (escritorio y móvil) coherentes entre sí y con `docs/DISENO.md`.
- [ ] Todo usable con teclado y sin canvas, incluido el control de cámara; el diálogo de atajos funciona.
- [ ] Movimiento coherente (Mercurio da ~4 vueltas por cada vuelta de la Tierra), también hacia atrás, y sin aliasing a 1 año/s (Fobos se muestra como órbita).
- [ ] Los enlaces con parámetros abren el estado exacto; la URL no cambia durante la reproducción; un parámetro no válido no rompe nada.
- [ ] Store ≤ 5 actualizaciones/s; el viaje sistema → Tierra → Luna → sistema no recrea el motor ni deja fugas.
- [ ] Con movimiento reducido no hay animaciones de cámara ni de texto.
- [ ] e2e en verde en local (y en el CI cuando exista, fase 4).

### Fase 3b: Realismo de los planetas

Rama `fase-3b-realismo` (bloque R). Pedida por Iván el 26-10: «Tenemos que hacer que los modelos 3D de los planetas sean más realistas». Documento de origen, con el análisis completo: `docs/decisiones/FASE-3b-REALISMO.md`. Va antes del bloque C porque la base de iluminación que crea la usan después la Tierra (fase 5), la Luna (fase 6) y las lunas (fase 7).

**Diagnóstico** (capturas de las fases 2 y 3 y `scene/materials/body-material.ts`):
| Lo que se ve | Causa |
|---|---|
| Planetas «de plástico», todos con el mismo aspecto de bola mate | Lambert + luz ambiente plana (`BODY_AMBIENT`) igual para todos |
| Júpiter y Saturno sin el oscurecimiento del limbo de las fotos; terminador duro en los planetas con atmósfera | Sin modelo de limbo ni de atmósfera |
| Ningún planeta tiene atmósfera visible (ni halo ni tono en el terminador) | Sin dispersión atmosférica |
| Marte y Mercurio sin relieve | Solo textura de color; no se usan modelos de elevación |
| Anillos de Saturno planos y sin profundidad | Sin fotometría (contraluz, luz transmitida) |
| Las órbitas cruzan por delante del disco de los planetas | Las líneas no se ocultan ni se desvanecen sobre los cuerpos |
| La Tierra, de un azul uniforme y saturado | A comprobar: espacio de color o exposición de la textura de día |

**Lo que hace atractivo al original** (analizado en su código fuente público, solo las técnicas): dirección de arte, no una física más avanzada: luz de relleno generosa (ambiente 0,7, con el lado nocturno iluminado), ACES, exposición por vista y halos aditivos en la vista general. Esta fase hace las dos cosas: **física correcta y un ajuste artístico de la luz**, para que se vea igual de bonito y además sea fiel.

**Objetivo:** que cada planeta, a la misma fase y distancia, **se parezca a sus fotos reales** (NASA, ESA, Hubble, Cassini, Juno, Voyager, MESSENGER), con un modelo de luz físico por tipo de cuerpo (D29) y sin salirse de los presupuestos de §5.

Tareas:
1. **Referencias reales** (`docs/realismo/referencias.md`): por cada cuerpo, 1–2 fotos reales de dominio público o con licencia libre (URL, misión, fecha y ángulo de fase), solo enlazadas, sin copiarlas al repo. Son la vara de medir de toda la fase.
2. **Chunks de sombreado** (D29), con sus parámetros en datos (`data/`, con fuente cuando sean medidos, como el albedo o el coeficiente de limbo; si no, «ajuste visual» documentado). Tests de la función de limbo y de la de Lommel–Seeliger en TS puro (`ephemeris/` o un módulo puro de `scene/`).
3. **Relieve de Mercurio y Marte:**
   - mapas de normales derivados de modelos de elevación oficiales (Mercurio: MESSENGER; Marte: MOLA; USGS Astrogeology, dominio público, comprobándolo);
   - script común `build-relief.mjs`, que reutilizará la fase 6 para la Luna (16 bits empaquetados, D15);
   - si mejora la fidelidad, mosaicos de color oficiales (Viking para Marte, MESSENGER para Mercurio) en vez de los de Solar System Scope.
4. **Gigantes:** comprobar si existen mapas globales con licencia libre de más calidad que los actuales (Júpiter: Hubble OPAL; Saturno: Cassini). Solo si la licencia encaja con la política del proyecto (CC0, CC BY, MIT, BSD o dominio público; **nada no comercial**). Urano y Neptuno: bandas sutiles fieles a las fotos, sin inventar detalles.
5. **Anillos de Saturno:**
   - fotometría: más brillo a contraluz (dispersión hacia delante) y la cara no iluminada vista con luz transmitida;
   - sombra del planeta sobre los anillos;
   - perfil radial de opacidad y color fiel (división de Cassini, anillos A, B y C).
   - Los anillos tenues de Júpiter, Urano y Neptuno son **opcionales**.
   
   5b. **Vía Láctea** (decisión de Iván, 26-10): panorama «The Milky Way panorama» de ESO/S. Brunier (https://www.eso.org/public/images/eso0932a/), si su página confirma **CC BY 4.0**. Está en coordenadas galácticas: se alinea con el cielo real girando la dirección de muestreo (galácticas → ecuatoriales J2000 → ECL, con la matriz en `ephemeris/coordinates.ts`, testada con 3 objetos de posición conocida, como el centro galáctico). Con brillo sutil, por debajo de las estrellas HYG, y niveles de calidad. Si la licencia no es CC BY 4.0, queda fuera y se apunta.
6. **Sol:** granulación procedural animada (sujeta a `prefers-reduced-motion`), oscurecimiento del limbo físico y corona o halo.
7. **Post-procesado:**
   - tone mapping evaluado (Neutral frente a AgX frente a ACES), con capturas comparadas;
   - bloom solo para el Sol y solo en el nivel alto (`three/addons`, sin dependencias nuevas): **pasa a la fase 10 como opcional** (decisión de Iván, 27-10; informe de la fase 3b, §4.1);
   - antialiasing (MSAA en WebGL2 o SMAA).
   - Todo dentro de los FPS de §5; en el nivel bajo, versión ligera o desactivado.
8. **Órbitas y etiquetas:** las órbitas se ocultan o se desvanecen sobre el disco de cualquier cuerpo y cerca de él (prueba de profundidad + desvanecimiento). Las etiquetas no tapan el planeta enfocado.
9. **Tierra, solo el arreglo de base:** corregir el azul uniforme y saturado (espacio de color, exposición o mezcla de la textura). Nubes, océano, luces y atmósfera completa siguen en la fase 5.
10. **Calidad por niveles:** cada mejora tiene su versión para el nivel bajo y respeta los presupuestos de VRAM, FPS y peso de §5.
11. **Dirección de arte de la luz por vista:**
    - en la **vista general**, un relleno ilustrativo moderado y documentado para que todos los planetas se lean bien, y halos sutiles opcionales;
    - en **primer plano**, la luz física de D29 con un relleno mínimo (el lado nocturno casi negro, como en las fotos de Cassini o Juno);
    - exposición y tone mapping ajustados por vista, con capturas comparadas con las referencias reales y con el aspecto general del original **como referencia visual, sin copiar su código**;
    - los valores, en un único módulo de configuración visual, con el motivo de cada uno.

Criterios de aceptación:
- [ ] **Comparativas lado a lado** con las referencias reales, a un ángulo de fase parecido, para el Sol, Mercurio, Venus, Marte, Júpiter, Saturno, Urano y Neptuno (capturas `?captura=1` en `docs/informes/img/fase-3b/`). El subagente revisor y la sesión de revisión las evalúan.
- [ ] Tests de las funciones de sombreado (limbo de Minnaert y Lommel–Seeliger) con valores esperados.
- [ ] Ninguna órbita se dibuja sobre el disco de un cuerpo (captura de Saturno y Júpiter como las de la fase 2).
- [ ] Mercurio y Marte muestran relieve con luz rasante (capturas en el terminador).
- [ ] Anillos de Saturno a contraluz (captura) y sombra del planeta sobre los anillos.
- [ ] FPS, VRAM y peso por vista dentro de §5 en los tres niveles (tabla).
- [ ] Vía Láctea de ESO alineada (captura con el centro galáctico en Sagitario) o apuntada como omitida si la licencia no encaja.
- [ ] Todas las texturas y modelos de elevación nuevos en `FUENTES.md`, con una licencia compatible comprobada en la fuente.
- [ ] Capturas de la vista general y de cada planeta en primer plano: a la vista, al menos igual de atractivas que el original y más fieles a las fotos reales (la evaluación va en el informe, con las capturas).

### Fase 3c: Interfaz inmersiva del sistema solar

Rama `fase-3c-interfaz` (bloque R, después de la 3b). Pedida por Iván el 26-10, con una captura de la barra inferior del original como referencia: «Al sistema solar me gustaría añadirle una interfaz gráfica parecida a esta. También que, cuando entras en la página, el sistema solar se esté moviendo a unos 3 días por segundo». El 27-10, Iván cambió la velocidad de entrada a **3 horas por segundo** (D31). Documento de origen: `docs/decisiones/FASE-3c-INTERFAZ.md`.

**Qué tiene la referencia:** una fila de fichas de cuerpos con su miniatura redonda; una barra de tiempo compacta (reproducir/pausar redondo, fecha con rótulo e icono de calendario, línea de tiempo deslizante a lo ancho, selector de velocidad y «Controls +», que despliega el resto); pistas discretas y la fuente de los datos en letra pequeña; el lienzo a pantalla completa con la interfaz flotando encima. Se toma esa **estructura** con **nuestro estilo** (D30) y el arranque en movimiento (D31).

Tareas:
1. **Fichas de cuerpos** (sustituyen la lista lateral como selector principal):
   - el Sol y los 8 planetas, cada uno con su **miniatura redonda renderizada por nuestro propio motor** (script con `?captura=1`, WebP pequeño; las mismas texturas y licencias, nada nuevo que atribuir);
   - al elegir un planeta con lunas aparece una **segunda fila con sus lunas**;
   - semántica accesible de grupo de selección (`role="radiogroup"` o barra de herramientas con `aria-pressed`), navegación con flechas, foco visible y nombre accesible con la distancia actual;
   - en móvil, fila desplazable horizontalmente, con zonas táctiles ≥ 44 px.
2. **Barra de tiempo compacta:**
   - botón redondo de reproducir/pausar en latón;
   - fecha legible con su rótulo («Fecha») e icono de calendario que abre el selector nativo;
   - **línea de tiempo deslizante** que abarca el **año de la fecha mostrada** (de enero a diciembre), con una marca de «hoy», el año a la vista y paso al año anterior o siguiente en los extremos; el rango total sigue siendo 1900–2100;
   - accesible: `input type="range"` con `aria-valuetext` («17 de marzo de 2026»); flechas = 1 día, RePág/AvPág = 1 mes, Inicio/Fin = el año;
   - selector de velocidad.
3. **Velocidades:** añadir **3 horas/s (por defecto, desde el 27-10)**, 3 días/s y 10 días/s a las actuales (tiempo real, 1 h/s, 1 día/s, 1 semana/s, 1 mes/s, 1 año/s), en los dos sentidos.
4. **«Controles +»** despliega un panel con lo menos usado: hora y zona, «Ahora», escala (ilustrativa o real, cuando llegue en la fase 7), calidad, vista limpia y atajos de teclado. En móvil es una hoja inferior.

   4b. **La barra lateral pasa a ser un panel desplegable «Índice»** (decisión de Iván, 26-10):
   - **cerrado al entrar**, para que el 3D ocupe toda la pantalla;
   - se abre con un botón «Índice» siempre visible y se cierra con su botón o con `Esc`;
   - contiene el árbol completo de los 30 cuerpos con sus distancias (la lista actual, con su teclado y su árbol plano, WCAG 2.5.3) y la nota de qué mide cada distancia;
   - es la alternativa accesible completa a las fichas;
   - en escritorio se superpone al lado del lienzo sin desplazar el 3D (con el encuadre ajustado mientras está abierto); en móvil es una hoja inferior;
   - el resto de la barra actual: las pestañas «Sistema solar · Tierra · Luna», flotantes arriba; el título y la descripción, al texto de presentación (tarea 5); «Un proyecto de… · Créditos», al pie en letra pequeña (tarea 6).
5. **Texto de presentación** flotando arriba a la izquierda (título + una frase, como el H1 actual), que se pliega al interactuar o al elegir un cuerpo. En los móviles bajos se muestra solo el H1 compacto y la descripción se pliega (resuelve la duda de la fase 3). La ficha resumida del cuerpo elegido aparece como tarjeta flotante.
6. **Pistas de uso** en letra pequeña («Arrastra para girar · usa la rueda o pellizca para acercarte · elige un cuerpo»; «usa la rueda», desde la revisión del bloque R, R4) y el pie de los datos («1900–2100 · NASA/JPL · astronomy-engine»). Se ocultan en la vista limpia.
7. **Arranque en movimiento** (D31), con un test e2e para cada caso: normal → reproduciendo a 3 horas/s; movimiento reducido → en pausa; `?fecha=` → en pausa en esa fecha.
8. **Encuadre:** actualizar los márgenes de `setViewOffset` a la nueva disposición, para que el cuerpo enfocado no quede tapado por las fichas ni por la barra.
9. **Rendimiento:** con la reproducción automática ya no hay render bajo demanda al llegar. Medir el coste (CPU y batería) y comprobar que Lighthouse y los FPS de §5 se siguen cumpliendo; con la pestaña oculta, se pausa (ya existe).

Criterios de aceptación:
- [ ] Capturas en escritorio, portátil y móvil, junto a la referencia, que muestren la misma **estructura** con **nuestro estilo** propio y coherente con `docs/DISENO.md`.
- [ ] Al entrar, el sistema se mueve a 3 horas/s; con movimiento reducido o con `?fecha=` arranca en pausa (e2e).
- [ ] La línea de tiempo funciona con ratón, táctil y teclado, y anuncia la fecha (axe sin violaciones; prueba de teclado en el informe).
- [ ] Las fichas permiten elegir los 30 cuerpos (planetas en la primera fila, lunas en la segunda).
- [ ] El panel «Índice» está cerrado al entrar, se abre y se cierra con el ratón, el teclado y `Esc` (con el foco gestionado: entra al abrir y vuelve al botón al cerrar) y conserva el árbol con distancias y su accesibilidad (e2e + axe).
- [ ] Ningún cuerpo enfocado queda tapado por la interfaz (capturas).
- [ ] FPS, Lighthouse y CLS dentro de §5 con la reproducción automática.

### Fase 4: Despliegue continuo en Cloudflare Pages

Rama `fase-4-staging`. **Cambio de Iván del 27-10:** el hosting pasa a **Cloudflare Pages** (plan gratuito), en lugar de Banahosting por FTPS; la vista previa por rama sustituye al staging de cPanel (D23 y D26). Los secrets `CLOUDFLARE_API_TOKEN` (solo con permiso de Pages) y `CLOUDFLARE_ACCOUNT_ID` ya están en el repo de GitHub.

Tareas:
1. **Primer push** (autorizado por Iván en la revisión del bloque R). Antes: `.gitignore` (`node_modules`, `dist`, `.angular`, `assets-src`, `.claude/skills`, `.codex`, `AGENTS.md` y `.claude/settings.local.json`), sin secretos ni ficheros de más de 50 MB en el historial y `LICENSE` (D32). Después, `git remote add origin`, push de `main` y de las ramas de fase, **sin `--force`**, y push tras cada fusión. Si Git pide credenciales, Iván inicia sesión en la ventana que se abra: nunca se escriben ni se guardan en el repo.
2. **CI verde en GitHub** (lint, test, build y e2e con Chromium y WebGL por SwiftShader), que guarda el build verificado.
3. **Despliegue** con `cloudflare/wrangler-action` fijado por SHA: `wrangler pages deploy` del build del CI, sin builds de Cloudflare, en el proyecto `tierra-luna-sol`. Cada push con el CI en verde publica la **vista previa de su rama** (`<rama>.tierra-luna-sol.pages.dev`; `main`, en `staging.tierra-luna-sol.pages.dev`). Las ramas de Dependabot no se despliegan. La producción llega en la fase 11.
4. **`public/_headers` y `public/_redirects`** (en lugar de `.htaccess`):
   - CSP compatible con el CSS crítico de Angular (valorar `security.autoCsp`) y con `'wasm-unsafe-eval'` solo si se usa KTX2;
   - cabeceras de seguridad;
   - caché larga e `immutable` para los archivos con hash y las texturas, y corta para el HTML y para los datos sin hash;
   - tipos MIME que Pages no conozca (`.bin`, `.ktx2`);
   - `X-Robots-Tag: noindex` en todo `*.pages.dev`;
   - 404 con un `404.html` en la raíz (sin él, Pages trata el sitio como una SPA y responde 200 a cualquier ruta).
5. **URLs sin barra final** (D9) con el comportamiento de Pages: las rutas prerenderizadas se publican como `ruta.html`, que Pages sirve en `/ruta` (y redirige `/ruta/` a `/ruta`); el canonical, sin barra.
6. **Límites de Pages:** ningún fichero de más de 25 MiB (D17) y menos de 20 000 ficheros, comprobado en `npm run check`.
7. **Verificación con `curl`** en la vista previa: 200, redirecciones, 404, cabeceras, MIME y caché, y que no hay scripts de Cloudflare Web Analytics (D24).
8. **Dependabot** (configuración en `.github/`, sin dependencias nuevas).
9. Iván abre la vista previa en su móvil; se recogen FPS y observaciones.

Criterios de aceptación:
- [ ] CI verde en GitHub y vista previa actualizada solo con el CI en verde.
- [ ] Comprobaciones con `curl` en el informe.
- [ ] Iván ha abierto la vista previa en su móvil (no bloquea).

### Fase 4b: Pulido de la vista del sistema solar

Rama `fase-4b-sistema-solar` (bloque C, antes de la fase 5). Pedida por Iván el 27-10, con una captura de la vista general del original como referencia: «Cuando esté en la vista del sistema solar, quiero que vaya a 3 días por segundo, pero cuando pinche en cualquier planeta, que cambie a 1 hora», «Hemos de seguir mejorando los modelos de los planetas visualmente» y «En el sistema solar podríamos poner una estela a los planetas como hace la web» del original. Documento de origen, con el diagnóstico: `docs/decisiones/FASE-4b-SISTEMA-SOLAR.md`.

Tareas:
1. **Velocidad por contexto** (D33): la lógica en el store (TS puro y con tests) y tests unitarios de cada transición (vista general → cuerpo → vista general, cambio manual, hacia atrás, pausa, movimiento reducido y `?fecha=`). E2E: al entrar, 3 días/s; al pinchar un planeta, 1 h/s; al volver, 3 días/s.
2. **Estelas** (D34) con `Line2` y color por vértice (alfa degradado), sin coste apreciable: se miden los draw calls y los FPS.
3. **Planetas más visibles en la vista general:**
   - subir los radios ilustrativos (`radiusFactor`, `minRadius` y `maxRadius` en `ephemeris/scale.ts`) para que Júpiter y Saturno se reconozcan, con sus anillos, y los rocosos sean discos con textura, no puntos;
   - sin solapes con el Sol ni entre ellos, y con las etiquetas recolocadas;
   - el relleno y la exposición de la vista general (tarea 11 de la fase 3b), ajustados para que tenga el atractivo de la referencia **con nuestro estilo**.
4. **Comparativa** de la vista general junto a la captura de referencia de Iván (legibilidad de los planetas, estelas y lectura general), con capturas en `docs/informes/img/fase-4b/`, en escritorio y móvil.
5. `ESTILO.md` (los textos del aviso de velocidad) y `PROMPTS.md`.

Criterios de aceptación:
- [ ] Al entrar, 3 días/s; al pinchar un planeta (lienzo, ficha o índice), 1 h/s; al volver a la vista general, 3 días/s. Un cambio manual se respeta en su contexto (unitarios + e2e).
- [ ] Estelas de color visibles a 3 días/s y en pausa, que se desvanecen y siguen el sentido de la reproducción (capturas).
- [ ] En la vista general, Júpiter y Saturno se reconocen a simple vista (con anillos) y los rocosos son discos con textura, sin solapes (capturas en escritorio y móvil, junto a la referencia).
- [ ] FPS, VRAM y draw calls dentro de §5; `npm run check` y los e2e en verde.

### Fase 5: La Tierra

Tareas:
1. **Material de la Tierra**:
   - día y noche con la dirección real del Sol y un terminador con tono crepuscular;
   - luces nocturnas que se apagan gradualmente en el crepúsculo;
   - especular en los océanos y mapa de normales;
   - nubes con deriva ilustrativa;
   - atmósfera (Fresnel + tono del lado diurno).
2. **Orientación real** según la hora (EQD + sidéreo, fase 1).
3. **Sombra de la Luna** sobre la Tierra (umbra y penumbra analíticas, D20), visible en los eclipses solares reales.
4. **Control de la luz solar**: cambia la hora del día sin perder la fecha.
5. **Vistas guiadas** (`data/tours.ts`): Tierra completa, Pacífico, Himalaya, luces nocturnas y **España**, con marcadores discretos en los lugares del cielo desde España (Fraga entre ellos; fase 8). `TourPlayerComponent` con anterior/siguiente/reproducir y subtítulos accesibles.
6. Textura de día de 8K solo en el nivel alto y si cabe en `maxTextureSize`.
7. Prueba en móviles reales (vista previa de Cloudflare Pages) y ajuste de niveles.
8. **Color y brillo frente a EPIC** (revisión del bloque R, R3; propuesta 2 de la fase 3b): sin el velo atmosférico lechoso y con la relación de brillo océano / tierra de las fotos de EPIC. Si la dispersión se integra, el color del océano de la textura vuelve al de la superficie, para no contar dos veces la atmósfera (informe de la fase 3b, §4.7 y §10). Con las nubes.

Criterios de aceptación:
- [ ] Test: el punto subsolar del 21-06-2026 a las 12:00 UTC está a ≈ +23,4° de latitud y 0° de longitud (±2°), con la misma función que alimenta el shader.
- [ ] Test: en el máximo del eclipse solar del 12-08-2026, el centro de la sombra calculada coincide con el de la NASA (±1°; fixture con URL). Captura del eclipse.
- [ ] Capturas de mediodía y medianoche UTC y de cada vista guiada.
- [ ] FPS y VRAM de la vista Tierra según §5, en escritorio y en el móvil de Iván.
- [ ] Textos de las vistas con fuente y `reviewed: false`.
- [ ] `tierra-epic-2016` otra vez junto a la foto de EPIC: sin velo lechoso y con el océano a la relación de brillo medida (R3).

### Fase 6: La Luna

Tareas:
1. **Relieve lunar** con el script común `build-relief.mjs` de la fase 3b: el NASA CGI Moon Kit → color WebP 2k/4k/8k; elevación del LOLA en **16 bits empaquetados en RG** (D15), indicando la resolución vertical resultante; mapa de normales derivado a resolución completa. Si se reevalúa KTX2 (D18) y se adopta, `public/_headers` necesita en la CSP `'wasm-unsafe-eval'` y `worker-src blob:` (el `KTX2Loader` de three crea sus workers desde un `Blob`) y `Content-Type: image/ktx2` para los `.ktx2` (revisión de la fase 4).
2. **Material lunar**: desplazamiento de vértices a escala física (exageración opcional y documentada) + normales. Malla sin costuras en el meridiano 180° ni en los polos (esfera cúbica o tratamiento específico de UV, justificado). Densidad por nivel.
3. **Orientación** con `RotationAxis` (incluye la libración física); comprobación con `Libration` de astronomy-engine.
4. **Sombra de la Tierra** sobre la Luna en los eclipses lunares (umbra rojiza y penumbra, D20).
5. **Vistas**: cara visible, cara oculta, polo sur y **luz rasante**.
6. **Recorrido guiado** (`data/tours.ts`) con reproducir/pausar, subtítulos y saltar.
7. Fase lunar coherente entre la ficha, la escena y los fixtures del USNO.
8. **VRAM con la Tierra y la Luna a la vez** (revisión del bloque C, C4: la vista Tierra ya usa 278 MB de 300 en el nivel alto, y en la vista Tierra se ve la Luna y en la vista Luna, la Tierra):
   - los mapas de alta resolución de un cuerpo solo se quedan en la GPU mientras es el foco o se ve grande, y la 8K de la Tierra se libera al salir de su vista (comprobado con test, como `BodyMap`);
   - el test del presupuesto mira **las dos vistas** como peor caso: la Tierra con la Luna y la Luna con la Tierra;
   - la reevaluación de KTX2 (D18) empieza por la 8K de la Tierra y los mapas de la Luna, que es donde más VRAM se gana.

Criterios de aceptación:
- [ ] Capturas: cara visible, cara oculta, polo sur, luz rasante, luna llena, cuarto creciente y un eclipse lunar total (Luna enrojecida, fecha de la NASA).
- [ ] Peso, VRAM y FPS según §5 en los tres niveles.
- [ ] La VRAM de §5 también en el peor caso de las dos vistas (la Tierra con la Luna y la Luna con la Tierra), con test; la 8K de la Tierra se libera al salir de su vista (C4).
- [ ] Sin costuras visibles en el meridiano 180° ni en los polos.
- [ ] Libración visible y coherente con `Libration` (test).
- [ ] Recorrido usable con teclado y con movimiento reducido (paso a paso).

### Fase 7: Lunas, sombras y escala real

Tareas:
1. **20 lunas**:
   - textura fotográfica 1k/2k del USGS **donde exista un mosaico global** (comprobarlo luna a luna; los mosaicos en escala de grises se aceptan, con un tinte documentado si hace falta);
   - color esquemático documentado en las demás;
   - rotación síncrona;
   - carga al enfocar su sistema.
2. **Sistemas de lunas** en el marco local físico (§4.4), con sus órbitas y ficha resumida.
3. **Sombras analíticas generalizadas** (D20): las galileanas sobre Júpiter (tránsitos) y los planetas sobre sus lunas (eclipses de lunas).
4. **Interfaz de escala real** (el motor ya la soporta desde la fase 2): interruptor en los controles y en la URL (`escala=real`), con transición animada.
5. **Atmósferas suaves** (borde): la base llega con la fase 3b (D29: Venus, Marte, Titán y los gigantes); aquí se ajustan con las texturas fotográficas de las lunas (Titán), si caben en el presupuesto.
6. Tests de precisión de las lunas (§5), de continuidad de las transiciones y de las sombras.
7. **Anillo de luz del limbo de Saturno a contraluz** (revisión del bloque R, R2; estaba en el backlog de la fase 3b): la dispersión hacia delante en su atmósfera, lo más reconocible de las fotos de Cassini.
8. **Miniaturas de las lunas** regeneradas con sus texturas (`node scripts/build-body-thumbnails.mjs`), con la latitud medida sobre la eclíptica: las de Urano salían con un tercio del disco en sombra y Tritón, con la sombra al otro lado (informe de la fase 3c, §10.3).
9. **Anillos de Saturno** (D36; `docs/decisiones/ANILLOS-SATURNO.md`), junto a R2:
   - la cromaticidad publicada de los anillos A, B y C y de la división de Cassini, en `data/photometry.ts` con su fuente y un test (si no hay valores publicados de alguno, se dice y se usa el más cercano documentado);
   - un script del perfil radial de τ: descarga de la fuente fijada (comprobando su licencia), reducción a una textura 1D (de unos 8–10 km por píxel) con su cabecera «GENERADO por…», comprobación de la posición de las divisiones frente a sus radios publicados (test con tolerancia) y su entrada en el manifiesto;
   - el material: τ(r) del perfil (el alfa de la textura deja de usarse para τ; su luminancia, solo como detalle si aporta algo que el perfil no tenga), el color nuevo y el realce de brillo en `visual-config.ts`, con un comentario que diga que es ilustrativo;
   - capturas antes y después junto a fotos reales enlazadas (no copiadas): la geometría del Hubble de 2019, la de Cassini de 2013 a contraluz (con R2), la sombra sobre el disco, Saturno enfocado en 2026 (anillos casi de canto) y la vista general, en escritorio y móvil;
   - FPS, VRAM y llamadas de dibujo (la textura 1D apenas pesa).

Criterios de aceptación:
- [ ] Sin parpadeos ni temblores en escala real (Fobos y Neptuno; capturas o vídeo corto).
- [ ] Captura de una sombra de luna galileana sobre Júpiter en una fecha de tránsito real (fuente citada).
- [ ] FPS, VRAM y memoria con todos los sistemas cargados según §5.
- [ ] Licencias del USGS registradas una a una en `FUENTES.md`.
- [ ] Captura `saturno-cassini-2013` (la geometría de Cassini de 2013) con el limbo iluminado a contraluz (R2).
- [ ] Anillos (D36): el color de cada uno con fuente científica publicada y test, y el B crema o tostado, no azulado (medido en la captura).
- [ ] Anillos (D36): las divisiones de Cassini, Encke y Keeler, visibles en primer plano y en su radio publicado (test).
- [ ] Anillos (D36): B / disco en el valor elegido con el realce, documentado como ilustrativo.
- [ ] Anillos (D36): sin tono lavanda en el anillo C ni en la división de Cassini (medido).

### Fase 8: El cielo desde España y los eclipses

«El cielo desde España» sustituye a «El cielo desde el Bajo Cinca» (decisión de Iván, 26-10; `docs/decisiones/CAMBIO-CIELO-ESPANA.md`): qué se ve esta noche desde los grandes observatorios del país (el Montsec por defecto) o desde tu ubicación.

Tareas:
1. **Vista `/cielo`** (`?lugar=teide`):
   - **selector de lugares** con el Parque Astronómico del Montsec (Àger, Lleida) **por defecto**, el Observatorio del Roque de los Muchachos (La Palma), el Observatorio del Teide (Tenerife), el Observatorio de Calar Alto (Almería), el Observatori Fabra (Barcelona), la Puerta del Sol (km 0, Madrid) y Fraga (Bajo Cinca), más «usar mi ubicación» (geolocalización **opcional**, tras una acción del usuario y solo en el navegador). `lleida` se conserva en los datos, aunque no salga en el selector;
   - **`data/places.ts`**: cada lugar con latitud, longitud y altitud de **fuentes oficiales citadas** (el IGN, con su Nomenclátor Geográfico o sus núcleos de población, o la web oficial de cada observatorio o del IAC), su `source` y su **zona horaria IANA** (§4.3);
   - cúpula celeste desde el lugar elegido: horizonte, puntos cardinales, estrellas, Vía Láctea, planetas, Luna y Sol en coordenadas horizontales con refracción;
   - **color del cielo según la altura del Sol** (día, crepúsculos civil, náutico y astronómico, y noche);
   - deslizador de la hora a lo largo de la noche, en la **hora local del lugar** con la zona indicada (`Europe/Madrid` en la Península; `Atlantic/Canary` en el Teide y el Roque de los Muchachos);
   - **constelaciones** solo con una fuente de licencia permisiva (CC0, CC BY, MIT, BSD o dominio público; candidata a comprobar: d3-celestial).
2. **«Esta noche»**:
   - qué planetas se ven;
   - salida, puesta y culminación (`SearchRiseSet`, `SearchHourAngle`);
   - **crepúsculos** (`SearchAltitude` a −6°, −12° y −18°) y fase lunar;
   - «hacia dónde mirar» en lenguaje claro;
   - tabla accesible equivalente.
3. **Eclipses** (`SearchLocalSolarEclipse`, `SearchLunarEclipse`): los próximos visibles desde España, con tipo y hora local. Página `/eclipses` (lista prerenderizada «calculado el…» + recálculo en el cliente) con **«Ver en 3D»**, que lleva a la vista Tierra o Luna en el instante del máximo, con la sombra.
4. **Fixtures**: salidas y puestas del USNO para **el Montsec y el Teide** (uno peninsular y uno canario, para probar las dos zonas horarias) en 3 fechas; eclipses de la NASA con URL.
5. **Textos:** donde se nombre la vista del cielo, «España» o el nombre del lugar elegido.

Criterios de aceptación:
- [ ] Salidas, puestas y crepúsculos ±2 min frente al USNO; eclipses con fecha y tipo exactos.
- [ ] La vista del cielo y la tabla dan la misma información.
- [ ] La geolocalización solo se pide tras una acción del usuario y todo funciona si se rechaza.
- [ ] «Ver en 3D» muestra la sombra del eclipse correspondiente.
- [ ] Cambiar de lugar recalcula el cielo y el panel «Esta noche», y la URL lo refleja (`?lugar=`).
- [ ] En el Teide y el Roque de los Muchachos, las horas salen en la hora canaria (test con un fixture del USNO).
- [ ] Las coordenadas de cada lugar tienen fuente oficial (test de campos).

### Fase 9: Contenido y compartir

Tareas:
1. **`scripts/render-body-images.mjs`**: renders de cada cuerpo con el propio motor (Playwright + `?captura=1`) → WebP para las fichas y la imagen Open Graph. Mismo estilo en todo el sitio y sin licencias nuevas (solo las de las texturas).
2. **Fichas** de los 30 cuerpos y sus índices:
   - H1, resumen, tabla de datos con fuentes, curiosidades, imagen y datos «de hoy» calculados en el cliente;
   - «Ver en 3D» → explorador con parámetros;
   - migas de pan;
   - **sin Three.js**.
3. **`/creditos`**: todas las licencias, una por una, y el aviso de que no hay respaldo de la NASA.
4. **`/sobre-el-proyecto`** como **caso de estudio de portfolio**: qué es, stack, diagrama de arquitectura, marcos de escala, precisión medida (tablas de la fase 1), rendimiento medido, decisiones y autor con enlace a ivanchesa.es.
5. **Compartir (D25)**: title y description simples por página, **una imagen Open Graph global** (render del propio motor), `robots.txt` básico y `noindex` siempre en `/404`.
6. **Legal y privacidad (D24)**: pie con enlaces al aviso legal y la privacidad de ivanchesa.es, y una nota visible: «Sin cookies, sin analítica y sin peticiones a terceros». En el texto de privacidad, una frase sobre el NEL de Cloudflare: el propio alojamiento recibe un informe de las peticiones que fallan (revisión del bloque C, C8).
7. Textos repasados con `docs/ESTILO.md` y la lista final para la revisión de Iván.

Criterios de aceptación:
- [ ] Lighthouse móvil ≥ 95 en rendimiento, accesibilidad y buenas prácticas en una muestra de fichas.
- [ ] e2e de privacidad: 0 cookies y 0 peticiones a terceros en todas las rutas.
- [ ] La vista previa del enlace (Open Graph) se ve bien (captura del validador o de una app de mensajería).
- [ ] Sin cifras sin fuente y sin enlaces rotos.

### Fase 10: Pulido y calidad

Tareas:
1. **Móvil**: panel inferior plegable, ficha como hoja inferior, carrusel de cuerpos, gestos y zonas táctiles ≥ 44 px, en todas las vistas.
2. **Sin WebGL o con el contexto perdido**: póster + listas + fichas + mensaje (y recargar). `prefers-reduced-motion` en todas las vistas, recorridos y transiciones.
3. **Accesibilidad**: axe en todas las rutas, contraste, foco, zoom al 200 % y lector de pantalla (prueba manual básica con NVDA o Narrador, con notas en el informe).
4. **Rendimiento**: medición por vista y nivel (tabla); ajustes finales; precarga de la fuente del H1; la **textura de día de 8K de la Tierra, más barata** (propuesta 2 de la fase 5, recomendada en la revisión del bloque C): guardada ya volteada, sin los ~105 ms de su decodificación, y con su `ImageBitmap` (128 MiB) liberado tras subirla; **pintar a la frecuencia que pide el movimiento en pantalla** (informe de la fase 3c, §10.1: a 3 h/s, la vista general se mueve una fracción de píxel por frame; generalizar el render lento a 4 Hz ahorraría GPU y batería en móvil).
5. **iOS Safari**: prueba en un iPhone real (Iván): memoria, pérdida de contexto y gestos.
6. **Regresión visual**: Playwright `toHaveScreenshot` con `?captura=1` en las vistas clave. Referencias generadas en el CI (Linux), no en Windows.
7. **Lighthouse en el CI** (si Iván aprueba `@lhci/cli`) con los presupuestos de §5.
8. **Revisión final de diseño** con `impeccable` y `web-design-guidelines`, y ajustes con capturas antes/después.
9. **Bloom del Sol (opcional)**, que viene de la tarea 7 de la fase 3b (decisión de Iván, 27-10):
   - solo en el nivel alto, con `three/addons` y sin dependencias nuevas;
   - con el fondo pintado dentro de la escena, no como color de borrado: si no, el `OutputPass` lo aclara (informe de la fase 3b, §4.1);
   - dentro de los FPS y la VRAM de §5.
   - Si no mejora lo que ya da el halo del Sol, se descarta y se anota.

Criterios de aceptación:
- [ ] Tabla con **todos** los presupuestos de §5 medidos y cumplidos.
- [ ] axe sin violaciones graves; e2e y regresión visual en verde en el CI.
- [ ] Iván da el visto bueno en su móvil (y en un iPhone).

### Fase 11: Lanzamiento

**Iván (manual):** el dominio propio en Cloudflare Pages (`tierra-luna-sol.ivanchesa.es` como dominio personalizado del proyecto, con su registro CNAME en el DNS de ivanchesa.es). Los secrets de Cloudflare ya están (fase 4) y la licencia, decidida (D32). Con el dominio propio, mirar si su zona permite desactivar el NEL de Cloudflare (D24, C8); si no, queda explicado en la privacidad (fase 9).

**Claude Code:**
1. **`deploy-production.yml`**: despliegue a producción de Cloudflare Pages al crear una etiqueta `v*` (o con lanzamiento manual), reutilizando el build verificado.
2. **Verificación en producción** con `curl` y Lighthouse.
3. **README de portfolio** (capturas, vídeo o GIF corto, stack, arquitectura, precisión y rendimiento medidos), **CHANGELOG** y etiqueta **`v1.0.0`** (el repo de GitHub ya es público y `LICENSE` existe desde la fase 4, D32).
4. `indexable: true` con el OK de Iván.
5. Lista para Iván: ficha del proyecto en ivanchesa.es (en su propio repo) y difusión.

Criterios de aceptación:
- [ ] `v1.0.0` publicada en producción con HTTPS, desplegada por etiqueta.
- [ ] Las comprobaciones con `curl` y Lighthouse en producción cumplen §5.

---

## 7. Flujo de trabajo entre las dos IAs

| Quién | Hace |
|---|---|
| **Claude Code (terminal)** | Ejecuta los bloques en modo autónomo: por fase, plan en el informe → trabajo → `npm run check` → revisión por subagente → correcciones → fusión → `DIARIO.md`. Para al final del bloque o ante una condición de parada. |
| **Claude (sesión de revisión)** | Revisa cada bloque completo: diff, checks propios, criterios, capturas y estrategia. Escribe `docs/revisiones/bloque-X.md` y ajusta el plan si hace falta. |
| **Iván** | Decide, hace los pasos manuales (GitHub, Cloudflare, el dominio y los secrets), revisa los textos, prueba en sus móviles y da el OK a cada bloque. |

Reglas:
- Una sesión de Claude Code por bloque (o por fase, si la sesión se alarga). Al empezar, lee `CLAUDE.md`, §0–§5 del plan, la sección de su fase y el informe y la revisión anteriores.
- Si el contexto se llena: informe «en curso», commit y sesión nueva con el prompt «Retomar».
- Nada fuera del alcance; las ideas van al backlog. Si falta un dato: `TODO(ivan):` + `docs/PENDIENTES.md`.

---

## 8. Riesgos y cómo se cubren

| Riesgo | Mitigación |
|---|---|
| Errores de sistemas de referencia u orientación | `coordinates.ts` y `orientation.ts` únicos, con tests frente a Horizons, IAU y fechas conocidas (cruce de anillos, eclipses) |
| Precisión float32 en escala real | Marcos y origen flotante desde la fase 2; decisión de profundidad con capturas |
| Shaders incompatibles con la profundidad elegida | D13: chunks comunes obligatorios en todos los `ShaderMaterial` |
| VRAM y memoria en móvil (sobre todo iOS) | Presupuesto de VRAM, tope `maxTextureSize`, calidad adaptativa, prueba de KTX2 y prueba en iPhone |
| Tirones al cargar | `ImageBitmapLoader`, `compileAsync`, subida progresiva y arranque troceado |
| Aliasing a velocidades altas | Regla de §4.5 con test |
| Texturas mal alineadas (meridiano 0) | Alineación en el manifiesto + tests de orientación |
| Relieve lunar con 8 bits (escalones) | D15: 16 bits empaquetados en RG |
| Problemas del hosting descubiertos tarde | Vista previa en Cloudflare Pages desde la fase 4 |
| La IA se inventa cifras o textos | `source` obligatorio, citas verificadas, tests de campos y revisión de Iván |
| Fugas de memoria al cambiar de vista o de nivel | `dispose()` por vista y por nivel; prueba de 10 ciclos |
| Contexto de sesión lleno | Entregas, informe vivo y prompt «Retomar» |
| Licencias mezcladas | `FUENTES.md` archivo a archivo + `/creditos`; el BY-SA solo afecta al fichero de estrellas |
| Límites del plan gratuito de Cloudflare Pages (25 MiB por fichero, 20 000 ficheros) | Comprobados en `npm run check` (fase 4); las texturas, por niveles (D18) |

---

## 9. Backlog (después de la v1; no se toca sin el OK de Iván)
1. Versión en inglés (`@angular/localize`).
1b. (Prioridad baja) ΔT con los valores medidos del IERS hasta hoy en lugar del modelo de astronomy-engine (solo afecta a Fobos, ~0,1° hoy).
2. PWA / funcionamiento sin conexión.
3. Formas reales de las lunas irregulares (Fobos, Deimos, Proteo) con modelos 3D de dominio público.
4. Planetas enanos (Plutón, Ceres), cinturón de asteroides y cometas.
5. Satélites artificiales / Estación Espacial (requiere datos en vivo).
6. Ficha del proyecto en ivanchesa.es (en su propio repo).
7. El oscurecimiento del limbo del Sol por canal (informe de la fase 3b, §4.4).
8. Un desvanecimiento elíptico de las órbitas sobre los anillos de Saturno (informe de la fase 3b, §4.12).
9. El relieve como mapa de alturas en gris, con las normales calculadas en el shader (informe de la fase 3b, §4.10).
10. Unificar los colores de los planetas con la fotometría de Mallama et al. (2017) y las funciones de color de la CIE (informe de la fase 3b, §4.12).
