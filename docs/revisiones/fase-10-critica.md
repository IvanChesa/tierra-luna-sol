# La revisión final de diseño de la fase 10 (impeccable y Web Interface Guidelines)

**Fecha:** 2026-11-09. Es la tarea 8 de la fase 10: la revisión final de diseño, con `impeccable` y `web-design-guidelines`, y los ajustes con capturas antes y después.

- **Qué se revisa:** la rama `fase-10-pulido` en un build de `6f26518` (de las 13:52), servido en local con las cabeceras reales del sitio. Ya llevaba la 10.b y la 10.c hasta el encuadre de la sombra; la 10.a (las lunas) aún no estaba junta.
- **Método:** el de la crítica de la 9c, con dos agentes independientes que no vieron el trabajo del otro ni las críticas anteriores:
  - **A**, la revisión de diseño y las heurísticas de Nielsen;
  - **B**, el detector de impeccable (el motor 0.1.16 de la caché, sin descargas; sin telemetría) y las medidas en el navegador: axe, contraste por píxeles, foco, zonas táctiles, medida de lectura y escaneos por URL y por CDP.
  - Además, esta sesión repasó el código con las reglas de las **Web Interface Guidelines** (las de `vercel-labs/web-interface-guidelines`, leídas el 09-11).
- **Tamaños:** 390 × 844 (un móvil de verdad: táctil y DPR 2), 768 × 1024 y 1440 × 900.
- **Rutas:** `/` (también la primera visita), `/?cuerpo=saturno`, `/explorar/tierra`, `/explorar/luna`, `/cielo` (de noche, al anochecer y de día), `/sol`, `/planetas/marte`, `/lunas`, `/eclipses`, `/creditos` y el 404. B midió 57 estados.
- **Limitaciones:**
  - Solo Chromium con la GPU de este equipo: sin WebKit, sin Firefox, sin un móvil de verdad y sin lector de pantalla.
  - El overlay del detector no se inyectó: la CSP del sitio lo bloquea, como en la 9c.
  - Nada se guardó en `.impeccable/`.

## Nota: 31/40 (Bueno)

Es la de A, que no conocía las anteriores: 27/40 al empezar la 9c, 31/40 en su crítica repetida y 33/40 en el repaso de la sesión de revisión. Esta vez la recuperación de errores tiene un 4, y la consistencia y la flexibilidad bajan a 3.

| # | Heurística | Nota | El problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | «Hacia atrás» no se ve en la barra de escritorio. Al llegar desde «Ver en 3D» de un eclipse, nada dice qué se ve. En el cielo de día, el pulgar de «Hora» se queda en el mínimo mientras el reloj marca las 14:19 |
| 2 | Relación con el mundo real | 3 | La Luna roja del eclipse total dice «Luna llena · 100 % iluminada». De día, «Ahora: Venus, 33° S» nombra cuerpos que no se ven |
| 3 | Control y libertad | 3 | Hay salida en casi todo. Falta volver a los eclipses tras «Ver en 3D», y la ficha «Tierra» del cielo saca de él sin avisar |
| 4 | Consistencia y estándares | 3 | En el cielo, la fila de fichas hace tres cosas distintas. En el móvil, Tierra y Luna usan la cabecera completa y Saturno y el Cielo, la franja única |
| 5 | Prevención de errores | 3 | La fecha tiene su rango a la vista y los atajos se pueden desactivar. El campo acepta 2150 y avisa después |
| 6 | Reconocer antes que recordar | 3 | En el móvil hay iconos solos («ⓘ», «Controles», «Mirar»), y la clave del cielo de día está dentro de la hoja cerrada |
| 7 | Flexibilidad y eficiencia | 3 | Hay atajos completos y enlaces profundos. Falta un camino rápido a una fecha concreta y buscar un cuerpo por su nombre |
| 8 | Estética y minimalismo | 3 | La disciplina es buena. Sobran el vacío de la portada en el móvil, Saturno escrito cuatro veces y las 22 tarjetas iguales de `/eclipses` |
| 9 | Recuperarse de errores | 4 | Ejemplar en todo lo probado: sin WebGL, el 404 con sus salidas, la fecha fuera de rango y la ubicación denegada |
| 10 | Ayuda y documentación | 3 | Hay recorrido, pistas, atajos y «Cómo se calcula». No hay ayuda donde más falta: el cielo de día en el móvil y la llegada a un eclipse |

## Especificidad (A)

**Se nota hecho para este producto en lo que dice y en cómo se lee. En cómo se compone, mucho menos.**
- **Lo propio:**
  - la paleta tinta, papel y latón, con sus tipos;
  - las fichas como efemérides, con su fuente y la hora del cálculo;
  - lo local: los observatorios, la hora del lugar y las constelaciones en español y en latín;
  - lo honesto: «Lo que es ilustrativo» y «No sale de tu navegador».
- **Lo intercambiable:**
  - la composición del explorador, la del género;
  - las rejillas de tarjetas de `/planetas`, `/lunas`, `/eclipses` y el 404;
  - y el **favicon, el escudo de Angular** en rosa y morado.
- **Las oportunidades:**
  - que el atlas llegue a la composición: láminas, la línea del año como dial y `/eclipses` como almanaque;
  - una marca propia.

## El detector y las medidas (B)

- **El escaneo del código:** 7 hallazgos.
  - 6 son `broken-image`, falsos positivos: Angular enlaza `[src]` y `[ngSrc]`, y en ejecución no hay ninguna imagen rota de las 227.
  - 1 es `side-tab`: el borde de acento del aviso de `/eclipses`, intencionado (de la crítica de la 9c).
- **Los escaneos por URL y por CDP** (33 y 22):
  - 25 avisos `straggler` (una palabra sola en la última línea);
  - 3 `text-occlusion` en `/cielo` a 1440: dos etiquetas bajo el panel «Esta noche»;
  - `edge-flush-cards` en la fila de lunas: el corte hace de pista de desplazamiento;
  - `content-hidden-at-rest`: es el pliegue de la presentación a los 8 s, una decisión de la 9c.
- **En el navegador:**
  - axe, sin violaciones en los 57 estados;
  - el contraste mínimo, 5,77:1 de noche y 5,36:1 de día (medido por píxeles sobre el lienzo);
  - el foco, visible en las 1272 paradas (2 px);
  - nada se desborda ni queda tapado.
  - Zonas táctiles de menos de 44 px solo en las páginas de lectura del móvil: las migas, los «Fuente N» y los enlaces de licencia. Cumplen los 24 px de WCAG 2.5.8 y de la regla del proyecto.
- **El fallo real:** en la vista Luna del móvil, «Luz rasante» recibe el foco casi oculto, bajo el fundido de la fila (WCAG 2.4.7). Chromium solo desplaza la fila al enfocar si el botón está entero fuera.
- **Menores:**
  - la entradilla de `/creditos`, con 81 caracteres por línea a 768 y 91 a 1440;
  - la ficha enfocada en el borde de la fila del móvil, bajo el fundido.

## Las Web Interface Guidelines (esta sesión, sobre el código)

Con su formato (`archivo:línea`). Lo que no aplica (las mayúsculas de título y el `&` del inglés, el `useState` de React…) se ha dejado fuera.

```text
src/index.html:7 - sin <meta name="theme-color">: la barra del navegador del móvil, clara sobre un sitio oscuro
src/styles.css - sin touch-action: manipulation en los controles: en iOS, dos toques rápidos en «+», «−» o los pasos del año amplían la página
src/styles.css - sin -webkit-tap-highlight-color: el resaltado del toque, el azul del sistema
src/app/app.html:63,95,116 - el nombre del sitio y el del autor, sin translate="no"
src/styles.css - 25 reglas :hover sin @media (hover: hover): en el táctil se quedan puestas tras el toque (menor; queda para el backlog)
✓ sin transition: all; sin outline: none sin reemplazo (los seis tienen su anillo); sin zoom desactivado; sin <div>/<span> con clic; las <img> con width y height; los 176 botones y enlaces con nombre accesible; los campos con su etiqueta; color-scheme: dark; los <select> con su color; text-wrap: balance en los títulos; tabular-nums; enlace para saltar al contenido; scroll-margin-top en los anclajes; fuentes precargadas con font-display; aria-live; Intl para fechas y números; prefers-reduced-motion en todo el CSS
```

## Respuesta a la crítica

| Hallazgo | Qué se ha hecho | Commit |
|---|---|---|
| **[P1] El cielo de día se abre vacío en el móvil** | El cielo va en tiempo real (D33), así que no puede abrirse solo en la noche. De día, la línea de resumen y la barra del móvil dicen «Ahora es de día · noche cerrada desde las 19:12» en vez de nombrar cuerpos que no se ven. El panel lleva el botón «Ver el cielo de esta noche», que lleva al final del crepúsculo astronómico, en pausa. e2e | (pendiente) |
| **[P1] «Ver en 3D» de un eclipse llega sin contexto** | El enlace lleva el tipo de eclipse y el lugar (`eclipse=sol-total&lugar=fraga`). Al llegar, un aviso de los del explorador dice «Eclipse total de Sol del 12 de agosto de 2026, en su máximo visto desde Fraga», con «Volver a los eclipses»; se anuncia (`role="status"`) y se puede cerrar. En la vista Luna, la fase de la Luna eclipsada dice «eclipse total: en la sombra de la Tierra» (`lunarEclipsePhase`, con las magnitudes de la NASA). Tests | (pendiente) |
| [P2] La parada de España del recorrido: puntos sin nombre | Propuesta (§10 del informe) | — |
| [P2] La portada en el teléfono: el sistema, una franja | Propuesta (§10 del informe): la elevación de la cámara según la proporción de la pantalla | — |
| [P2] En el cielo, la fila de fichas hace tres cosas | Propuesta (§10 del informe): en escritorio, DISENO quita las fichas solo en el móvil | — |
| **El favicon, el escudo de Angular** | Una marca propia: el Sol en latón, su órbita y la Tierra con su Luna, sobre la tinta del sitio (`public/favicon.svg`), con el ICO de 16, 32 y 48 px y el `apple-touch-icon` (`scripts/build-icons.mjs`) | (pendiente) |
| «Hacia atrás» invisible en escritorio | Junto a la zona, en latón: «Hora local, UTC+1 · hacia atrás», sin añadir una línea a la barra. Test | (pendiente) |
| El pie de las páginas, cortado a 1440 | `.site-footer p`, sin la medida de lectura | (pendiente) |
| «calculadas en tu navegador», dos veces en la portada | La entradilla, sin repetir la línea de autoría (que es de Iván, D47): «El Sol, los ocho planetas y veintiuna lunas en sus posiciones de hoy y de cualquier fecha entre 1900 y 2100» | (pendiente) |
| **[B] «Luz rasante», enfocado bajo el fundido** | `revealInRow` y la directiva `RevealFocus`: al recibir el foco, la fila de vistas de la Luna (y la de la Tierra) se desplaza hasta verlo entero, fuera del fundido. La fila de fichas usa lo mismo, que arregla también su menor. Tests | (pendiente) |
| [B] La entradilla de `/creditos`, a 91 caracteres | Con la medida de lectura (`--measure`) | (pendiente) |
| [B] 25 palabras solas en la última línea | `text-wrap: pretty` en los párrafos | (pendiente) |
| [B] Etiquetas del cielo bajo «Esta noche» a 1440 | Propuesta: el panel del cielo no cuenta en los márgenes en escritorio (`--chrome-edge: none`); contarlo movería el encuadre del cielo | — |
| [WIG] `theme-color`, `touch-action`, el resaltado del toque y `translate="no"` | Hechos | `2e7fc84`, `e541841` |
