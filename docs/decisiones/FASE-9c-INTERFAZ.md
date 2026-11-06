# Fase 9c: la interfaz, más limpia (D47)

- **Fecha:** 2026-11-06
- **Decisión de Iván**, preparada por la sesión de revisión: «Quiero retocar la interfaz, y que sea más limpia. Debemos mejorar también la UI/UX, tanto en móvil como en PC».
- **Rama:** `fase-9c-interfaz`, desde `main`. Va **en paralelo** con el bloque S (fase 9b, rama `fase-9b-sol-lunas`), que programa otra sesión. El reparto de archivos está en el prompt de esta sesión y la otra lo confirmó en `7322888`. Aquí se suma `docs/DISENO.md`, que es de esta fase.
- **Manda sobre** el menú del 03-11 (decisión de Iván: «Cielo» en la cabecera en lugar de «Luna», `039fd7a`) y sobre los bocetos de `docs/DISENO.md`, que se actualizan.

## 1. La crítica (skill `impeccable`, 06-11)
Hecha con dos evaluaciones aisladas: la de diseño, con los heurísticos de Nielsen, y la técnica, con mediciones en el navegador a 390×844, 768×1024 y 1440×900 y el detector de impeccable. Se miró la vista previa de `fase-9b-sol-lunas`.

**Puntuación: 27/40**, aceptable y rozando «bueno».
- **Lo más bajo:**
  - Estética y minimalismo, 2;
  - Coherencia, 2;
  - Ayuda, 2.
- **Lo fuerte:**
  - las fichas, que se leen como un atlas;
  - una accesibilidad excepcional;
  - el encuadre que esquiva los paneles;
  - 0 errores en la consola.

**El diagnóstico en una frase:** la interfaz no se retira. En un explorador 3D, el 3D tiene que mandar (`DISENO.md`: «el protagonista es el 3D, la interfaz es un marco discreto»), y hoy compite con él.

**El punto de partida, medido.** La «zona útil» es el porcentaje del lienzo donde `elementFromPoint` devuelve el canvas, es decir, donde arrastrar y hacer zoom funcionan.

| Vista | Tamaño | Zona útil | Controles visibles |
|---|---|---|---|
| `/` | 390 | 46,7 % | 22–23 |
| `/explorar/tierra` | 390 | 25,2 % | 31 |
| `/explorar/luna` | 390 | 27,8 % | 31 |
| `/cielo` | 390 | 27,9 % | 26 |
| `/` | 768 | 64,5 % | 26 |
| Tierra, Luna y Cielo | 768 | 48,5–50 % | 31–37 |
| `/` | 1440 | 74,4 % | 37 (47 con Saturno, ~60 con el Índice) |
| Tierra, Luna y Cielo | 1440 | 64–66 % | 42–48 |

**La ficha de Saturno:** en el móvil es una hoja de 390×508 que ocupa el 60,2 % de la pantalla (en tableta, el 62,7 %) y esconde la barra de tiempo, las fichas, el Índice y la cámara. El degradado de la franja de abajo (`div.explorer__dock`, 170–180 px) tapa por sí solo el 19–23 % del lienzo.

**El detector:** no hay nada grave.
- 5 `broken-image` en los `[src]`/`[ngSrc]` de Angular: son falsos positivos.
- En `/planetas/marte` a 1440: `line-length` (unos 89 caracteres; real y menor) y `straggler`.
- La superposición en vivo la bloquea la CSP del sitio, y está bien que lo haga.

## 2. Lo que decidió Iván
1. **Alcance: todo.** Los cuatro problemas importantes, el de pulido y las observaciones menores.
2. **Navegación nueva:**
   - la cabecera, solo para leer: Planetas, Lunas, Sol, Eclipses y Sobre el proyecto, más un enlace «Explorar en 3D»;
   - las pestañas del explorador, solo vistas 3D: Sistema solar, Tierra, Luna y Cielo;
   - **el título sigue al cuerpo elegido:** «Saturno», con «‹ Sistema solar» para volver.
3. **Un recorrido de unos 30 s en la portada**, la primera vez, con un único «Saltar», y en la primera pantalla una línea discreta que diga quién lo ha hecho y que los datos son reales.

## 3. Tareas

### 9c.1 · Los gestos, en todo el lienzo (P1)
- Lo invisible o transparente no captura el puntero:
  - el `h1` y el `p` de presentación de `tls-home-page` cuando se desvanecen, que hoy bloquean el 12,2 % del lienzo en el móvil;
  - `div.explorer__lead`;
  - el ancho sobrante de `tls-view-switcher`, que mide 358 px con un `nav` de 297;
  - y cualquier contenedor sin fondo que quede encima del canvas.
  - Con `pointer-events: none` en el contenedor y `auto` solo en sus controles.
- **Un e2e:** arrastrar en la franja de arriba del lienzo (a 390 y 768) gira la escena y no selecciona texto.

### 9c.2 · El móvil: que el 3D mande (P1)
- **La presentación:** tras el primer gesto, o a los pocos segundos, la entradilla y la pista táctil se pliegan y queda el título en una línea.
- **En las vistas Tierra y Luna, sin la fila de 9 planetas:** en su lugar, un «‹ Sistema solar». Y sin la ficha suelta «Luna» en la vista Luna.
- **El panel de cada vista (Tierra, Luna y Cielo), en una fila:** las vistas guiadas, en una fila desplazable con pista de desplazamiento. «Hora del día» y lo demás, detrás de un botón.
- **La cámara en el móvil:**
  - sin la columna de cuatro botones sobre el 3D;
  - **+ y − se quedan accesibles** dentro de «Controles» o en un control compacto, porque el pellizco necesita una alternativa con un solo puntero (WCAG 2.5.1);
  - «Vista general» y «Vista limpia», a «Controles».
  - **Las etiquetas,** con texto visible o accesible; nada de iconos sueltos sin nombre en táctil.
- **La ficha del cuerpo, como hoja de dos alturas:**
  - en reposo, como mucho el 45 % de la pantalla, con el nombre, el resumen y «Ficha completa»;
  - al subirla, el resto;
  - **reproducir y pausar, siempre a mano** mientras está abierta;
  - el cuerpo elegido, visible en el hueco libre, y el encuadre sabe la altura de la hoja (`insets`);
  - con `/?cuerpo=saturno`, el planeta queda colocado sin esperar 7 s;
  - «Datos», sin quedar cortado bajo el pie fijo.
- **La franja de abajo:** un degradado más bajo y corto; que no tape más del 10 % del lienzo.
- **La barra de tiempo en las vistas Tierra y Luna:** plegada a ▶ y la fecha, con lo demás detrás de «Controles».

### 9c.3 · Un solo selector y menos controles (P1)
- **Las fichas son el único selector visible.**
  - El **Índice** pasa a ser su versión en tabla (la «tabla de efemérides» de `DISENO.md`): mientras está abierto, sustituye a las fichas, no se suma.
  - La fila de lunas solo aparece con su planeta elegido, y sin repetir lo que ya está en el Índice abierto.
- **El panel del Cielo:**
  - en el panel, el lugar, la hora y una línea de resumen (por ejemplo, «Saturno, 37° al SE»);
  - «Esta noche», la tabla y los eclipses, a una hoja o sección que se abre a demanda, sin barra horizontal (la tabla se recompone en filas en el móvil);
  - el selector de lugar, sin cortar el nombre;
  - el deslizador de la hora y el `summary`, con zonas táctiles de 44 px.
- **«Controles»:**
  - en el móvil, sin «Atajos de teclado»;
  - al abrirse, el foco no va a un `input` de fecha (en Android abre el calendario nativo).
  - Que no se abra encima de la ficha.
- **La velocidad:** sin opciones casi iguales («1 semana» y «10 días»). Las velocidades por defecto de D33, igual.
- **Las cuatro formas de cambiar la fecha:** se agrupan; se pueden quitar las redundantes si «Controles» las conserva.

### 9c.4 · Nada se tapa (P1)
- **A 1024×768 y en cualquier altura,** el panel de la vista acaba antes de la fila de fichas (con desplazamiento interno si hace falta). «Índice» siempre se puede pulsar y su foco se ve (WCAG 2.4.11).
- **Un script de comprobación,** a 390, 768, 1024 y 1440 en las vistas del explorador, con y sin un cuerpo elegido y con «Controles» y el Índice abiertos: en el centro de cada control visible, `elementFromPoint` devuelve ese control (o un hijo suyo).
- **Las etiquetas del 3D, bajo los controles y paneles:** «Tierra» bajo «Acercar», las constelaciones bajo «Esta noche», el cardinal «S» sobre «Mercurio». La lógica de etiquetas vive en `scene/`, que es de la otra sesión. Desde aquí se le pasan bien las zonas ocupadas (`data-chrome`, `insets`) por la API pública de `scene/index.ts`. Si la etiqueta tiene que esquivarlas o esconderse, va a «para la fusión», con el caso concreto, y lo hace la otra sesión.

### 9c.5 · La jerarquía y la navegación (P2)
- **Menos cajas:**
  - las fichas, sin caja: la miniatura y el nombre, con el subrayado latón en la elegida;
  - la cámara (en escritorio), sin marco hasta el hover o el foco, con el icono a 3:1 de contraste como mínimo;
  - el borde, solo para campos y desplegables;
  - el botón de reproducir sigue siendo el único destacado.
- **La navegación (decisión 2):**
  - la cabecera y el menú del móvil con Planetas, Lunas, Sol, Eclipses, Sobre el proyecto y «Explorar en 3D»;
  - en el menú del móvil, lo legal aparte y abajo;
  - las pestañas del explorador, solo vistas 3D, sin «Cielo» repetido;
  - el logo lleva a la portada.
  - **El título sigue al cuerpo elegido,** con «‹ Sistema solar» (en el `h1` y en el título del documento), anunciado con `aria-live` como hoy.
- **Los iconos ambiguos:**
  - «Vista general» (la diana) y el sentido de la reproducción («‹‹»), con un icono que no se confunda con ‹ año › (el ⇆ del boceto) y con su nombre visible donde quepa;
  - los chevrones, con un solo significado por sitio.
- **El pie del explorador en escritorio:** las pistas, solo la primera vez; los créditos y los enlaces legales, en una sola línea discreta o en el menú.

### 9c.6 · El recorrido de la portada y la línea de autoría (decisión 3)
- **El recorrido:**
  - la primera vez que alguien entra en `/` sin parámetros, unos 30 s: Saturno con sus anillos, la Tierra con la vista España y la Luna; después, vuelta a la vista general en reproducción;
  - **«Saltar»** siempre visible y con foco; `Esc`, cualquier toque, arrastre, rueda o tecla lo para, y deja la escena donde está;
  - **no arranca** con `prefers-reduced-motion` (en su lugar, un botón «Ver el recorrido»), con `?captura=1` ni con un enlace profundo (`?cuerpo=`, `?fecha=` o `/explorar/…`);
  - «Ver el recorrido» lo repite cuando se quiera;
  - lo recuerda en `localStorage` (preferencia, con `try/catch`); si no hay almacenamiento, no insiste;
  - **solo con la API pública** de `scene/index.ts` (los viajes y las vistas guiadas que ya existen). Si falta algo, va a «para la fusión».
  - **El presupuesto:** el código propio inicial está a 120 bytes de su tope (14,88 kB de 15). El recorrido va en un chunk diferido, que se pide después de pintar, como ya se hizo con la navegación en la fase 9b. No se sube el presupuesto.
- **La línea de autoría,** discreta, en la primera pantalla:
  - que diga que las posiciones son reales, calculadas en tu navegador, y quién lo ha hecho;
  - con un enlace a «Sobre el proyecto»;
  - con datos y fuentes de lo ya publicado (por ejemplo, la precisión frente al JPL de la fase 1, si se cita, con su cifra de `/sobre-el-proyecto`);
  - `reviewed: false` y `docs/ESTILO.md`.

### 9c.7 · Las observaciones menores
- **Zonas táctiles:**
  - las notas «Fuente N» de las fichas (24×22 px);
  - «Ver en 3D» en `/eclipses` (74×26);
  - los nombres de `/lunas` (19 px de alto);
  - las migas de pan (30 px);
  - el nombre del sitio (129×30).
  - **El objetivo:** 44×44 en el explorador y como mínimo 24×24 en todas las páginas (WCAG 2.5.8), sin romper la lectura.
- **Las filas desplazables en el móvil** (fichas de cuerpos, vistas de la Tierra y de la Luna), con una pista visual: un fundido en el borde o un trozo del siguiente elemento.
- **Texto:**
  - nada legible por debajo de 11 px (los nombres latinos de las constelaciones, hoy a 9 px);
  - la introducción y las pistas sobre el 3D, legibles con cualquier fondo (sombra o velo).
- **La rejilla de vistas de la Tierra:** que no deje «El Himalaya» solo en una fila.
- **En la vista Luna, con la Luna casi nueva,** una frase que explique por qué casi no se ve (con la fase del día, que ya se calcula).
- **Las fichas completas:**
  - «‹ anterior · siguiente ›» al final;
  - en la tabla de datos, lo esencial primero y lo técnico plegado o separado;
  - la medida de las líneas, como mucho la de `--measure` (68 caracteres): el detector midió unos 89 en Marte a 1440.
- **`/eclipses`:** «Calculado el 1 de noviembre de 2026» es la fecha del build y parece la de hoy. Que diga que se calculó al publicar o que muestre la fecha de forma que no confunda.
- **La anchura de la fecha** en la barra (escritorio), estable también con meses largos («sept.»).

## 4. Criterios de aceptación
Se miden con un script de la fase (`scripts/measure-ui.mjs` o parecido; los scripts de medida de esta fase son suyos), en los tres tamaños, con `CAPTURE_PORT=4350`.

- [ ] **Zona útil del 3D:**

  | Tamaño | `/` | Tierra, Luna y Cielo |
  |---|---|---|
  | 390×844 | ≥ 65 % | ≥ 50 % |
  | 768×1024 | ≥ 75 % | ≥ 65 % |
  | 1440×900 | ≥ 82 % | ≥ 75 % |

- [ ] **Controles visibles:**
  - en escritorio, ≤ 24 en `/` y ≤ 30 con un cuerpo elegido;
  - en el móvil, ≤ 16 en cualquier vista.
- [ ] **La hoja del cuerpo en el móvil, en reposo:** ≤ 45 % de la pantalla, con el cuerpo visible y la pausa a mano (e2e).
- [ ] **Los gestos:** el e2e de 9c.1 en verde a 390 y 768.
- [ ] **Sin solapes:** el script de 9c.4 sin fallos en los cuatro tamaños.
- [ ] **Zonas táctiles:** 44×44 en el explorador en el móvil y ≥ 24×24 en todas las páginas; nada legible por debajo de 11 px.
- [ ] **axe sin violaciones** en todas las rutas. El teclado y el lector de pantalla, como hoy o mejor:
  - el orden de Tab;
  - el foco visible y nunca tapado;
  - las alternativas de un solo puntero.
- [ ] **El recorrido:**
  - e2e de que arranca la primera vez;
  - de que «Saltar», `Esc` y un toque lo paran;
  - de que no arranca con movimiento reducido, con `?captura=1` ni con enlaces profundos.
- [ ] **El presupuesto:** `npm run check` en verde, con el JS inicial y el **código propio inicial** dentro de su presupuesto (15 kB) sin subirlo.
- [ ] **Capturas antes y después** (`docs/informes/img/fase-9c/`) a 390, 768 y 1440:
  - la portada, también durante el recorrido;
  - Saturno elegido, con la hoja en el móvil;
  - la Tierra, la Luna y el Cielo;
  - una ficha completa, `/lunas` y `/eclipses`.
- [ ] **El detector de impeccable** (`.claude/skills/impeccable/scripts/impeccable detect --json src/app`), sin hallazgos reales nuevos; los falsos positivos, explicados en el informe.
- [ ] **`docs/DISENO.md`:** los bocetos de escritorio y móvil y la navegación, al día.
- [ ] **El rendimiento (FPS) no se mide aquí:** se repite al cerrar el bloque, con el PC libre.

## 5. Cierre de la fase
1. `npm run check`, el informe completo (`docs/informes/fase-9c.md`) con las evidencias de cada criterio y «Para la fusión», con lo que necesite de la otra sesión.
2. **Revisión automática** por un subagente, como en `CLAUDE.md`, con `docs/revisiones/fase-9c.md`; las correcciones y la respuesta.
3. **PARA, sin fusionar.** La sesión de revisión repasa la fase y repite la crítica de impeccable (objetivo: ≥ 32/40). Iván autoriza la fusión. Al fusionar, se añaden D47 al plan (§2 y la fase), una línea en `PENDIENTES.md` y otra en el `DIARIO`, que son archivos de la otra sesión mientras trabaja.
