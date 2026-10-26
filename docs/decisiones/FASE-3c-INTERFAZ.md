# Fase 3c: Interfaz inmersiva del sistema solar (añadido al plan v2, 26-10-2026)

> Pedido por Iván, con una captura de la barra inferior del original como referencia: «Al sistema solar me gustaría añadirle una interfaz gráfica parecida a esta. También que, cuando entras en la página, el sistema solar se esté moviendo a unos 3 días por segundo».
> Se integra en `docs/PLAN.md` al aplicar la revisión del bloque B. Va en el **bloque R**, junto a la 3b (realismo): primero la 3b y después la 3c, en la rama `fase-3c-interfaz`.

## Qué tiene la referencia (barra inferior del original)
- Una fila de **«fichas» de cuerpos** con su miniatura redonda: Sol, Mercurio… Neptuno.
- Una barra de tiempo compacta:
  - botón redondo de reproducir/pausar;
  - fecha con un pequeño rótulo encima e icono de calendario;
  - una **línea de tiempo deslizante** a lo ancho;
  - un selector de velocidad («10 days / sec»);
  - «Controls +», que despliega el resto.
- Pistas discretas («arrastra para orbitar · rueda para acercarte · elige un mundo») y la fuente de los datos en letra pequeña.
- El lienzo 3D ocupa toda la pantalla: la interfaz flota por encima, ligera.

## Decisiones
- **D30 · Interfaz inmersiva del explorador.** Se toma la **estructura** de la referencia (lienzo a pantalla completa, fichas de cuerpos abajo, barra de tiempo compacta con línea deslizante y controles desplegables), pero con **nuestra dirección visual A, «Carta celeste»** (latón sobre azul tinta, Newsreader y Public Sans), no la del original. La regla de no copiar su diseño sigue vigente: la disposición se inspira en la referencia; los estilos, las formas y los textos son propios.
- **D31 · Arranque en movimiento:** al entrar, el sistema solar **se reproduce a 3 días/s** desde «ahora». Excepciones:
  - con `prefers-reduced-motion`, arranca en pausa (D7/CLAUDE.md);
  - con un enlace compartido que fija `?fecha=`, arranca en pausa en ese instante, porque quien comparte un momento quiere que se vea ese momento.
  - Cumple WCAG 2.2.2 (pausar, detener u ocultar): el botón de pausa es lo primero y más visible de la barra, y `Espacio` también pausa.

## Tareas
1. **Fichas de cuerpos** (sustituyen la lista lateral como selector principal):
   - Sol + 8 planetas, cada uno con su **miniatura redonda renderizada por nuestro propio motor** (script con `?captura=1`, WebP pequeño; las mismas texturas y licencias de siempre, nada nuevo que atribuir);
   - al elegir un planeta con lunas aparece una **segunda fila con sus lunas**;
   - semántica accesible de grupo de selección (`role="radiogroup"` o una barra de herramientas con `aria-pressed`), navegación con flechas, foco visible y nombre accesible con la distancia actual;
   - en móvil, fila desplazable horizontalmente, con zonas táctiles ≥ 44 px.
2. **Barra de tiempo compacta:**
   - botón redondo de reproducir/pausar en latón;
   - fecha legible con su rótulo («Fecha») e icono de calendario que abre el selector nativo;
   - **línea de tiempo deslizante** que abarca el **año de la fecha mostrada** (de enero a diciembre), con una marca de «hoy», el año a la vista y paso al año anterior o siguiente en los extremos; el rango total sigue siendo 1900–2100;
   - accesible: `input type="range"` con `aria-valuetext` («17 de marzo de 2026»); flechas = 1 día, RePág/AvPág = 1 mes, Inicio/Fin = el año;
   - selector de velocidad.
3. **Velocidades:** añadir **3 días/s (por defecto)** y 10 días/s a las actuales (tiempo real, 1 h/s, 1 día/s, 1 semana/s, 1 mes/s, 1 año/s), en los dos sentidos.
4. **«Controles +»** despliega un panel con lo menos usado: hora y zona, «Ahora», escala (ilustrativa o real, cuando llegue en la fase 7), calidad, vista limpia y atajos de teclado. En móvil es una hoja inferior.
4b. **La barra lateral actual pasa a ser un panel desplegable «Índice»** (decisión de Iván, 26-10):
   - **cerrado al entrar**, para que el 3D ocupe toda la pantalla;
   - se abre con un botón «Índice» siempre visible y se cierra con su botón o con `Esc`;
   - contiene el árbol completo de los 30 cuerpos con sus distancias (la lista actual, con su comportamiento de teclado y árbol plano, WCAG 2.5.3) y la nota de qué mide cada distancia;
   - es la alternativa accesible completa a las fichas;
   - en escritorio se superpone al lado del lienzo sin desplazar el 3D (con el encuadre ajustado mientras está abierto); en móvil es una hoja inferior.
   - Reparto del resto del contenido de la barra actual:
     - pestañas «Sistema solar · Tierra · Luna» → flotantes arriba;
     - título y descripción → texto de presentación flotante (tarea 5);
     - «Un proyecto de… · Créditos» → pie en letra pequeña (tarea 6).
5. **Texto de presentación** flotando arriba a la izquierda (título + una frase, como el H1 actual), que se pliega al interactuar o al elegir un cuerpo. La ficha resumida del cuerpo elegido aparece como tarjeta flotante.
6. **Pistas de uso** en letra pequeña («Arrastra para girar · rueda o pellizca para acercarte · elige un cuerpo») y el pie de los datos («1900–2100 · NASA/JPL · astronomy-engine»). Se ocultan en la vista limpia.
7. **Arranque en movimiento** (D31), con un test e2e para cada caso: normal → reproduciendo a 3 días/s; movimiento reducido → en pausa; `?fecha=` → en pausa en esa fecha.
8. **Encuadre:** actualizar los márgenes de `setViewOffset` a la nueva disposición, para que el cuerpo enfocado no quede tapado por las fichas ni por la barra.
9. **Rendimiento:** con la reproducción automática ya no hay render bajo demanda al llegar. Medir el coste (CPU y batería) y comprobar que Lighthouse y los FPS de §5 se siguen cumpliendo; si la pestaña está oculta, se pausa (ya existe).

## Criterios de aceptación
- [ ] Capturas en escritorio, portátil y móvil, junto a la referencia, que muestren la misma **estructura** con **nuestro estilo** propio y coherente con `docs/DISENO.md`.
- [ ] Al entrar, el sistema se mueve a 3 días/s; con movimiento reducido o con `?fecha=` arranca en pausa (e2e).
- [ ] La línea de tiempo funciona con ratón, táctil y teclado, y anuncia la fecha (axe sin violaciones; prueba de teclado en el informe).
- [ ] Las fichas permiten elegir los 30 cuerpos (planetas en la primera fila, lunas en la segunda).
- [ ] El panel «Índice» está cerrado al entrar, se abre y se cierra con el ratón, el teclado y `Esc` (con el foco gestionado: entra al abrir y vuelve al botón al cerrar) y conserva el árbol con distancias y su accesibilidad (e2e + axe).
- [ ] Ningún cuerpo enfocado queda tapado por la interfaz (capturas).
- [ ] FPS, Lighthouse y CLS dentro de §5 con la reproducción automática.

## Bloque y prompt
| Bloque | Fases | Ramas | Esfuerzo |
|---|---|---|---|
| R | 3b, 3c | `fase-3b-realismo`, `fase-3c-interfaz` | `max` (3b) · `high` (3c) |

Prompt (sesión nueva, tras revisar el bloque B): `Bloque R.`
