# La crítica de diseño de la fase 9c, otra vez (impeccable)

**Fecha:** 2026-11-08. La hace la sesión de revisión, como pide la adenda D47 (§5.3) antes de que Iván autorice la fusión.

- **Qué se revisa:** la rama `fase-9c-interfaz`, en un build de `d995bc0`. Es anterior al arreglo `c4742d0`, que solo cambia cómo entra la hoja del móvil. El build se sirvió en local con las cabeceras reales del sitio.
- **Método:** dos agentes independientes, que no vieron el trabajo del otro:
  - **A**, la revisión de diseño y las heurísticas;
  - **B**, el detector de impeccable y las medidas en el navegador.
- **Tamaños:** 390 × 844, 768 × 1024 y 1440 × 900.
- **Rutas:** `/` (también la primera visita), `/?cuerpo=saturno`, `/explorar/tierra`, `/explorar/luna`, `/cielo`, `/planetas/marte`, `/lunas` y `/eclipses`.
- **Limitaciones:**
  - El panel del navegador estaba oculto. Por eso el render iba a ráfagas, y los viajes de cámara y la subida de texturas pueden haber parecido más lentos de lo que son.
  - El overlay del detector no se pudo inyectar, porque la CSP del sitio lo bloquea, como debe. B usó el escaneo del código y escaneos por URL.
  - No se ha guardado en `.impeccable/`, para no dejar archivos sueltos en el repo mientras trabajan las sesiones.

## Nota: 31/40 (Bueno, 77,5 %)

Antes era 27/40 (crítica del 06-11, en la adenda D47). **El objetivo de D47 era ≥ 32/40: se queda a un punto.**

| # | Heurística | Nota | Por qué |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Hay carga con barra, anuncios completos, y la fecha, la zona y la velocidad están siempre a la vista. Pero el recorrido no dice por dónde va, la Tierra sin textura sale como una esfera azul sin aviso y «Cara visible» cambia la fecha sin decirlo |
| 2 | Relación con el mundo real | 3 | El español es natural y exacto. Piden contexto «Escala: Ilustrativa/Real», «Luz rasante» y «UA» |
| 3 | Control y libertad | 3 | Esc, ×, «Saltar el viaje», «Ahora» y «‹ Sistema solar» funcionan. Pero saltar el recorrido te deja a medias, en Saturno o en la Tierra |
| 4 | Coherencia y estándares | 3 | El sistema es coherente: lo pulsado, en latón y subrayado. Fallan la pestaña «Sistema solar», que no hace nada junto a «‹ Sistema solar»; «Esta noche», sin marcador; el Índice del móvil, que tapa la barra; y `/eclipses`, sin migas |
| 5 | Prevención de errores | 3 | La fecha tiene límites y validación, y los atajos de una tecla se pueden desactivar. Pero el campo acepta 2150 y solo avisa al confirmar |
| 6 | Reconocer antes que recordar | 3 | Las fichas llevan miniatura y nombre. El rango 1900–2100 solo está en «Controles», «España» queda fuera de la fila en el móvil y «Controles» es solo un icono |
| 7 | Flexibilidad y eficiencia | 4 | Atajos para casi todo, con su diálogo y su interruptor, enlaces profundos, el Índice y las flechas dentro de cada fila |
| 8 | Estética y minimalismo | 3 | Cuando se pliega la presentación, manda el 3D. Pero en los primeros segundos del móvil hay un bloque de texto grande y «Saturno» aparece cuatro veces a la vez |
| 9 | Reconocer y recuperarse de errores | 3 | El aviso de fecha es claro y los errores del 3D se distinguen. El 404 es seco y el aviso no está junto a su campo |
| 10 | Ayuda y documentación | 3 | Hay recorrido, pistas, atajos y «Cómo se calcula». Pero las pistas se gastan durante el recorrido, y el recorrido no enseña ningún control |

## Especificidad

**La voz y los datos son propios del producto; la composición del visor es la habitual del género.**
- **Lo propio:**
  - la paleta tinta, crema y latón, con disciplina;
  - Newsreader y Public Sans con cifras tabulares;
  - la ficha como tabla de efemérides, con su fuente y la hora del cálculo;
  - el cielo desde el Montsec.
- **Lo genérico:**
  - el carrusel de planetas redondos, la barra con reproducir y deslizador, la ficha a la derecha;
  - las tarjetas iguales de `/lunas` y `/eclipses`.
- **La oportunidad:** que el «atlas impreso de noche» llegue a la composición. Por ejemplo, la barra como regla de efemérides con meses y eclipses, la fila como leyenda de lámina, o las páginas como láminas con pie de figura.

## El detector y las medidas (B)

- **El escaneo del código** da 6 avisos `broken-image`, y los 6 son falsos positivos: Angular enlaza `[src]` y `[ngSrc]`. En ejecución no hay ninguna imagen rota.
- **Los escaneos por URL** (8 rutas × 3 tamaños):
  - en `/eclipses`, a 1440 y a 768, la medida de lectura es de unos 92 y 101 caracteres por línea (el detector pide menos de 80);
  - en `/explorar/tierra`, a 1440, los botones de las vistas tienen un relleno de 4 px;
  - lo demás sale limpio, salvo avisos menores.
- **En el navegador:**
  - ningún texto por debajo de 11 px (el mínimo es de 12);
  - ningún desbordamiento horizontal de la página;
  - ningún control tapado;
  - ningún fallo de contraste AA en el estado estable;
  - el foco, de 2 px y bien visible, a 1440.
- **El fallo real:** con un cuerpo elegido, a 768 y a 390, **dos paradas del Tab caen en elementos invisibles**:
  - «Volver al sistema solar», recortado dentro de `div.explorer__intro` (1 × 1 px);
  - «Cómo se calcula», recortado dentro de `p.explorer__credit`.
  
  Tienen `:focus-visible`, pero el contorno no se ve (WCAG 2.4.7).
- **Las zonas táctiles por debajo de 24 px** son enlaces dentro del texto (están exentos), salvo la casilla «Constelaciones» de `/cielo` a 1440: 17,6 px, con su etiqueta de 23,6 px de alto.
- **Las etiquetas de la escena** bajan a un contraste de 1,0–3,9 cuando pisan el disco de un planeta (Urano, la Tierra, el Sol). Son de `scene/labels.ts`, de la 9b.

## Lo que funciona

1. **La voz de los datos:** cifras alineadas, unidades en el color secundario, la fuente numerada con su fecha y «Calculado en tu navegador… con astronomy-engine». Da confianza y es solo de este producto.
2. **El 3D manda de verdad** cuando se pliega la presentación. Reproducir es el único latón, el estado pulsado es igual en todas partes y la cámara aparta el cuerpo de los paneles.
3. **El teclado, de primera:** salto al contenido, un orden lógico, cada fila como una sola parada con flechas dentro, anuncios completos, Esc con el foco devuelto y atajos que se pueden desactivar.

## Problemas prioritarios

1. **[P1, accesibilidad] El foco en elementos invisibles,** con un cuerpo elegido a 768 y a 390 (B). Arreglo: que lo plegado salga del orden del Tab (`inert`) o se despliegue al recibir el foco. Un e2e a 390 y a 768 que recorra el Tab con Saturno elegido.
2. **[P1] El recorrido de bienvenida depende del día y, al saltarlo, te deja a medias** (`/`, primera visita).
   - Hoy la parada de la Luna es un disco negro durante 6 s, porque es casi Luna nueva.
   - Si la textura de la Tierra llega tarde, se ve una esfera azul lisa.
   - En la vista España, la península queda arriba a la izquierda y los lugares son puntos sin nombre.
   - «Saltar el recorrido» te deja en Saturno sin ficha, o en la Tierra con un segundo botón, «Saltar el viaje», y con el marco de foco dorado sobre el lienzo, aunque se haya usado el ratón.
   - El final es plano.
   
   Arreglo:
   - que «Saltar» vuelva a la vista general en marcha, sin marco de foco tras ratón o toque;
   - que la Luna se vea iluminada sin tocar la fecha global, o que se salte esa parada si está casi nueva;
   - precargar la Tierra y la Luna durante la parada de Saturno;
   - centrar España y nombrar sus lugares;
   - cerrar con una invitación, por ejemplo «Ahora tú: elige un cuerpo abajo».
3. **[P2] Las pistas de la primera vez se gastan durante el recorrido** y no vuelven. Arreglo: contarlas desde el final del recorrido (o desde que se salta), darlas por vistas solo con una interacción real y enseñarlas 6–8 s junto a la fila.
4. **[P2] La promesa «1900–2100» no tiene mando en la barra.** El deslizador solo recorre el año en curso, y los botones del año se quitaron en esta fase. Arreglo: el año como mando, «‹ 2026 ›», con pulsación larga para avanzar por décadas, y, en «Controles», tres o cuatro saltos a fechas con historia.
5. **[P2, AA] Los nombres de la fila no se leen sobre un planeta brillante** (`.chip__name`: 12 px, `#ABA593`), por ejemplo en `/explorar/tierra` con la vista España. Arreglo: un velo bajo la fila o una placa para el nombre, y que las vistas guiadas encuadren el planeta por encima de la fila.
6. **[P2] «Controles» tapa lo que controla.**
   - En el móvil, la hoja ocupa todo el lienzo.
   - En escritorio, con la ficha abierta, el panel tapa media Saturno.
   
   Arreglo: en el móvil, una hoja baja (≤ 45 %) con Acercar y Alejar fuera; en escritorio, que el panel cuente en el encuadre.

## Por persona

- **Primera vez:**
  - el recorrido no le enseña ningún control;
  - ve la Luna negra y cree que algo se ha roto;
  - después de «Saltar el recorrido» le sale «Saltar el viaje»;
  - la pestaña «Sistema solar» no hace nada;
  - no encuentra 1969.
- **Móvil, con una mano:**
  - «Controles» y el Índice tapan el 3D y la barra;
  - para llegar a Saturno hay que desplazar la fila;
  - al volver de «Ficha completa», la fecha vuelve a hoy.
- **Teclado y lector de pantalla:**
  - la presentación se pliega al primer Tab, antes de llegar a leerla;
  - el foco cae en elementos invisibles (P1);
  - «Esta noche» no dice si está abierto o cerrado.

## Observaciones menores

- **El explorador:**
  - el rótulo 3D de Saturno se coloca más allá de los anillos, lejos del planeta (`scene/labels.ts`);
  - el menú resalta «Explorar en 3D» estando ya en el explorador, y la autoría se pliega a los 8 s.
- **`/cielo`:**
  - «Esta noche» no tiene marcador de abierto o cerrado (`summary` con `display: flex`);
  - de día, el cielo queda vacío;
  - de noche, en el móvil, el suelo parece un hueco.
- **`/explorar/luna`:** «Cara visible» lleva la fecha al 26-10-2026 y pausa sin avisar.
- **La tableta:** la ficha deja la mitad derecha vacía, y la fila de lunas no se alinea con la de planetas.
- **La vista Tierra en el móvil:** «España» queda fuera de la fila, con «El Hi…» cortado.
- **Los avisos:** el de la fecha sale lejos de su campo, y el 404 es seco.
- **`/eclipses`:**
  - no tiene migas;
  - la fecha queda apretada dentro del título;
  - todas las tarjetas pesan igual;
  - el aviso de no mirar el Sol sin filtro no destaca.
- **`/lunas`:** las miniaturas llevan un cuadrado más oscuro y los decimales son dispares.
- **`/planetas/marte`:** las lunas son enlaces de texto, y a 1440 sobran unos 450 px a la derecha.

## Preguntas

- ¿Y si el recorrido fuera la primera lección? Por ejemplo, tres gestos guiados: elige Saturno, arrastra el tiempo y abre la Luna.
- El año es la promesa del producto: ¿por qué no es el mando protagonista de la barra?
- La Luna nueva y el cielo de día son estados frecuentes. ¿Y si fueran momentos, como la luz cenicienta o «Saturno sale esta noche a las…», en lugar de avisos?

## Recomendación para la fusión

No fusionar todavía: antes, una tanda corta de arreglos en la rama.

1. **Antes de fusionar** (dentro del alcance de D47):
   - los problemas 1 a 6;
   - los rápidos:
     - «Constelaciones» a 24 px de alto;
     - «Esta noche» con marcador;
     - `/eclipses` con migas y una medida de lectura de unos 68–75 caracteres;
     - más relleno en los botones de las vistas de la Tierra.
2. **Después:** repasar solo lo que cambie (la nota de las heurísticas afectadas, y el foco y el contraste medidos), sin repetir la crítica entera.
3. **Al backlog de la fase 10:** las demás observaciones menores. Las etiquetas de la escena sobre los discos, y el rótulo de Saturno, son de `scene/labels.ts`: se ven al juntar con la 9b.
