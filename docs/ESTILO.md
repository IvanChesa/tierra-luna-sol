# Guía de estilo de los textos

> Fase 3, tarea 3.a.2. Vale para todo lo que se lee en la web: la interfaz, las fichas, los avisos, los textos alternativos y las etiquetas accesibles. Los nombres de los identificadores y de los archivos siguen en inglés (`CLAUDE.md`).

## 1. Dos registros

| | Interfaz | Textos divulgativos |
|---|---|---|
| Dónde | Botones, etiquetas, avisos, ayudas, instrucciones, `aria-label`, mensajes de error | Resúmenes y curiosidades de los cuerpos, vistas guiadas, recorridos, «Sobre el proyecto» |
| Persona | **Tuteo** («Elige un cuerpo», «Arrastra para girar la cámara») | **Impersonal**, en tercera persona y en presente («Saturno tarda 29 años en dar una vuelta al Sol») |
| Tono | Directo y breve | Divulgativo y preciso, sin exagerar |

Los 120 textos de los cuerpos ya son impersonales (`docs/revisiones/bloque-A.md`, A5): no se reescriben.

Los textos de las vistas del explorador (su título y su párrafo) van con el registro de la interfaz, en tuteo («la cara que ves»). La primera persona del plural solo para lo que es de todos («nuestro planeta»).

## 2. Frases y palabras

- **Frases cortas**, una idea por frase. En la interfaz, mejor 3–6 palabras.
- **Botones:** un verbo en infinitivo que diga lo que hacen («Reproducir», «Pausar», «Cerrar», «Reintentar», «Saltar el viaje»). Si el botón cambia de estado, cambia su texto (no solo el icono).
- **Mensajes:** qué ha pasado y qué puedes hacer («No se ha podido mostrar la escena 3D. Reintentar»). Sin culpas ni tecnicismos.
- **Sin anglicismos** cuando hay palabra española:

  | No | Sí |
  |---|---|
  | zoom | acercar, alejar |
  | tour | recorrido |
  | click, clicar | clic, pulsar |
  | scroll | desplazar |
  | loading | cargando |
  | reset | restablecer |
  | ok | de acuerdo, aceptar |
  | timeline | línea de tiempo |

  Son excepción las palabras asentadas (web, píxel) y los nombres propios de misiones o instrumentos (Cassini, LRO).
- **Mayúsculas:** solo al principio («Vista general», no «Vista General»). Sol, Luna y Tierra van con mayúscula cuando nombran al astro (RAE); los planetas y las lunas, siempre.
- **Comillas:** latinas «» y, dentro, inglesas “”.
- **Abreviaturas y símbolos:** km, UA (unidad astronómica), h, min, s, °C, K. Los símbolos no llevan punto ni plural. «días», «años» y «meses» se escriben enteros.

## 3. Cifras (siempre con `Intl` y `es-ES`)

Todo se formatea con las funciones de `src/app/core/format.ts`, que usan `Intl.NumberFormat('es-ES')`. Nunca se concatenan cifras a mano.

- **Decimales con coma** (9,63) y **millares con punto** a partir de cinco cifras (384.400; con cuatro, 1430), que es lo que da `Intl` en `es-ES`.
- **Cifras tabulares** (`tabular-nums`) en datos, tablas y en todo lo que cambia al reproducir.
- **Signo menos** «−» (U+2212), no el guion: −173 °C.
- **Espacio entre la cifra y la unidad** (384.400 km, 9,63 UA, 20 °C, 99,8 %). Los grados de ángulo van pegados (23,4°).
- **Distancias:**

  | Rango | Formato | Ejemplo |
  |---|---|---|
  | < 1 millón de km | km enteros | 384.400 km |
  | 1–1000 millones de km | millones con un decimal | 149,6 millones de km |
  | ≥ 1000 millones de km | millones sin decimales | 4497 millones de km |
  | Planetas y cuerpos lejanos (además) | UA con dos decimales | 30,07 UA |

  Excepción: en el índice de cuerpos del explorador (una tabla de efemérides), las lunas van todas en km enteros (1.221.870 km), para que se comparen en la misma columna.

- **Periodos:** horas con un decimal hasta 48 h (10,7 h); después, días (27,3 días) o años (29,4 años).
- **Temperaturas:** °C para los planetas y las lunas; K solo para la temperatura efectiva del Sol.
- **Velocidad de la simulación:** «Tiempo real», «1 hora por segundo», «3 horas por segundo», «1 día por segundo», «3 días por segundo» (la de la vista general, D33), «1 semana por segundo», «10 días por segundo», «1 mes por segundo», «1 año por segundo». Con un cuerpo enfocado, «1 hora por segundo», y en el cielo desde España, «Tiempo real» (D33). El sentido se dice aparte («Hacia atrás»).

## 4. Fechas y horas

- **Dentro del explorador**, la hora es la **local del navegador con su zona**, o UTC si lo eliges. Siempre se dice cuál:
  - en el desplegable de la barra de tiempo, «Local (UTC+2)» o «UTC» (su etiqueta ya dice «Zona»);
  - en la lectura plegada del móvil, «Hora local, UTC+2» o «UTC»;
  - en los textos largos, con el nombre de la zona: «hora local (Europe/Madrid, UTC+2)».
- **Formato largo:** 24 de octubre de 2026, 21:40. **Corto** (barras, tablas): 24 oct 2026, 21:40.
- **Reloj de 24 horas**, con segundos solo donde hacen falta (el tiempo de la simulación).
- **Rangos:** «entre 1900 y 2100», «de 1900 a 2100».
- **Internamente, siempre UTC** (`CLAUDE.md`). El cielo desde España (fase 8) usa la hora local del lugar elegido (`Europe/Madrid` en la Península; `Atlantic/Canary` en el Teide y el Roque de los Muchachos) y lo dice.

## 5. Fuentes

- **Cada dato** lleva su `source` (`data/sources.ts`). En las fichas, una nota numerada junto a la cifra y la lista de fuentes al final, con el nombre de la página y el enlace.
- **Cada texto divulgativo** lleva la URL de la página que lo respalda; `scripts/build-body-texts.mjs` comprueba que la cita está en ella.
- **Cálculos propios** (distancias «de hoy», posiciones): se dice que se calculan en el navegador y con qué («calculado con astronomy-engine»).
- **Imágenes y texturas:** autor, licencia y enlace en `docs/FUENTES.md` y en `/creditos`.
- No se inventa ninguna cifra, fecha ni coordenada (`CLAUDE.md`).

## 6. Accesibilidad de los textos

- **Nombres accesibles** con el mismo registro que la interfaz («Acercar», «Alejar», «Vista general»). Los iconos solos siempre llevan `aria-label` y su texto en un `title` o una etiqueta visible.
- **Anuncios (`aria-live`):** una frase completa al elegir un cuerpo o cambiar de vista («Saturno, planeta. A 1430 millones de km del Sol y a 1320 millones de km de la Tierra.»). Nunca se anuncia cada cambio de la fecha.
  - Si con el cuerpo o la vista cambia la velocidad (D33), se añade al final de esa misma frase, una vez: «Velocidad: 1 hora por segundo.» o «Velocidad: 3 días por segundo, hacia atrás.» («Saturno, planeta. A … de la Tierra. Velocidad: 1 hora por segundo.»).
  - Al elegir una vista guiada de la Tierra (fase 5), su título y su subtítulo en una frase: «España. España y los lugares del cielo desde España: …». El subtítulo se queda escrito en el panel; no se anuncia cada paso del recorrido más que con esa misma frase.
- **El panel de la Tierra (fase 5):** «Vistas guiadas» con los títulos de las vistas («La Tierra completa», «El Pacífico», «El Himalaya», «Las luces de la noche», «España»), «Vista anterior», «Vista siguiente» (no disponibles en la primera y en la última vista) y «Recorrer las vistas» / «Pausar el recorrido» (cambia el texto, como «Reproducir» / «Pausar», sin estado de pulsado); «Luz del Sol» con «Hora del día» (texto accesible del control: «18:00, hora local, UTC+2» o «18:00, UTC», en la zona elegida en la barra de tiempo) y la nota «Hora local, UTC+2, sin cambiar la fecha» o «UTC, sin cambiar la fecha». El reloj escrito junto al control no es una región viva. En el móvil, los rótulos «Vistas guiadas» y «Luz del Sol» solo los leen los lectores de pantalla, y la nota no se muestra.
- **El panel de la Luna (fase 6):** «Vistas» con la fase del día al lado («Gibosa creciente · 87 % iluminada», con el nombre de `moonPhase`) y los títulos de las vistas («Cara visible», «Cara oculta», «Polo sur», «Luz rasante»); «Recorrido» con «Parada anterior», «Recorrer la Luna» / «Pausar el recorrido» y «Parada siguiente» (no disponibles en la primera y en la última parada), y el subtítulo de la parada con su número: «2 de 5 · Copérnico. Copérnico, un cráter de 96 km…». Con movimiento reducido, la nota «Con movimiento reducido, el recorrido va paso a paso.» y, ya empezado, «Seguir el recorrido» en lugar de «Recorrer la Luna» (no «Siguiente parada»: se confundiría con el chevrón «Parada siguiente»). En la última parada, el botón dice «Volver a empezar», que es lo que hace. Al elegir una vista o una parada se anuncian su título y su subtítulo en una frase, como en la Tierra.
- **El cielo desde España (fase 8):** el panel dice «Lugar» (el selector, con la provincia tras una coma o, en las islas, solo la isla: «Parque Astronómico del Montsec, Lleida», «Observatorio del Teide, Tenerife»; `placeOptionLabel` de `data/places.ts`), «Usar mi ubicación», «Hora» (texto accesible: «22:40, hora del lugar (Europe/Madrid, UTC+1)»; en el móvil, la zona junto al reloj: «22:40 · Europe/Madrid, UTC+1») y «Esta noche». El botón de cada fila de la tabla, «Mirar al Sol», «Mirar a la Luna», «Mirar a Júpiter» (con la contracción). Las horas, **siempre en la del lugar** con su zona IANA y su desfase («Atlantic/Canary, UTC+1» en verano). Al cambiar de lugar se anuncia «El cielo desde el Observatorio del Teide.» (con el artículo de cada lugar: «desde la Puerta del Sol», «desde Fraga», «desde tu ubicación»); al entrar en la vista, lo mismo con la velocidad si cambia. «Mirar» se anuncia como «Júpiter, a 35° de altura, hacia el sureste.» o «El Sol está bajo el horizonte.». Los rumbos, en palabras (norte, noreste, este, sureste, sur, suroeste, oeste, noroeste) y, en la tabla, abreviados (N, NE, E, SE, S, SO, O, NO), con su lectura completa para el lector de pantalla. Las constelaciones, con su **nombre en español** y, como secundario, el **oficial de la IAU en latín** (D38): en el cielo, «Osa Mayor» con «Ursa Major» debajo, más pequeño; en los textos, «en Géminis (Gemini)» (si coinciden, una vez: «en Leo»). Los nombres, los del Anuario del Real Observatorio de Madrid (IGN; `scripts/content/constellations-es.json`), con las tildes y las mayúsculas de la RAE.
- **Eclipses (fase 8):** «Eclipse total de Sol», «Eclipse penumbral de Luna»; la fecha larga del lugar; «Máximo a las 20:29 (Europe/Madrid, UTC+2)»; cuánto tapa («La Luna tapa el 97 % del Sol.») y qué se ve («Se ve entero; en el máximo, el Sol a 44° de altura.» o «Se ve en parte: de 20:05 a 21:02, con el Sol sobre el horizonte.»). El enlace «Ver en 3D» lleva como nombre accesible «Ver en 3D el eclipse total de Sol del 12 de agosto de 2026». Y siempre, el aviso de no mirar el Sol sin filtros homologados.
- **Las fichas (fase 9):** las migas de pan, «Inicio › Planetas › Marte» (nombre accesible: «Migas de pan»); el tipo, encima del H1 («Planeta», «Luna de Saturno», con el enlace al planeta, «Satélite de la Tierra», «Estrella»); «Ver en 3D» (lleva al explorador con ese cuerpo; la Tierra y la Luna, a sus vistas). «Hoy», con «Al Sol», «A la Tierra», «A Saturno» y, en la Luna, «Fase» («Gibosa menguante» y, debajo, «87 % iluminada»); antes del cálculo, «—» y «Las distancias de hoy las calcula tu navegador con astronomy-engine al abrir la página (hace falta JavaScript).»; después, «Calculado en tu navegador el 3 de noviembre de 2026 a las 19:40, hora local (Europe/Madrid, UTC+1), con astronomy-engine.». «Datos», con «Datos físicos», «Órbita alrededor del Sol» (o «de Saturno», «de la Tierra») y, en Saturno, «Anillos»; cada cifra con los decimales de su fuente, las masas en notación científica («6,42 × 10²³ kg», que el lector de pantalla lee «6,42 por 10 elevado a 23 kilogramos»), los intervalos con raya corta («0,05–0,35»), la aclaración del dato debajo de su etiqueta y el número de su fuente al lado (nombre accesible: «Fuente 1»). «Fuentes», numeradas: «NASA, NSSDCA (Goddard Space Flight Center): Mars Fact Sheet (consultada el 24 de octubre de 2026).». Los periodos, con las reglas de §3 y, si la fuente da otra cifra, la suya debajo, con todos sus decimales: «15,9 días», con «15,945421 días»; «243,0 días», con «5832,5 h · retrógrada». Si da la misma, nada debajo: Mercurio, «88,0 días» (la NASA, «88.0»). En «Hoy», las lunas a su planeta en km enteros, como en la tabla («1.221.870 km»). Los textos alternativos de sus imágenes dicen qué se ve: «Marte, con la luz del Sol de lado y su superficie real: imagen del propio explorador.»; en vez de «su superficie real», «sus nubes» (Venus, Júpiter, Urano, Neptuno), «sus nubes y sus anillos» (Saturno), «sus continentes, sus océanos y sus nubes» (la Tierra), «su neblina» (Titán) o «su color esquemático (no hay un mapa de su superficie)»; el Sol, «El Sol, con su halo: imagen del propio explorador.».
- **El pie (fase 9):** «Sin cookies, sin analítica y sin peticiones a terceros: tu privacidad, en detalle.» y «Un proyecto de Iván Chesa Lapena · Aviso legal · Política de privacidad · Créditos»; en el pie del explorador, «Un proyecto de Iván Chesa Lapena · Aviso legal · Sin cookies, sin analítica y sin peticiones a terceros · Créditos» (la nota lleva a la privacidad); en el menú del móvil, «Aviso legal», «Política de privacidad» y «Sin cookies, sin analítica y sin peticiones a terceros: tu privacidad.».
- **El menú (fase 9):** «Planetas · Lunas · Sol · Cielo · Eclipses · Sobre el proyecto» (decisión de Iván del 03-11: «Cielo» en lugar de «Luna», que va la primera y destacada en `/lunas`, con «Satélite de la Tierra» y la primera frase de su resumen); en el móvil, además, «Créditos» y lo legal.
- **Las descriptions (fase 9):** una frase, como la entradilla de la página; en las fichas, la primera frase de su resumen.
- **Textos alternativos:** qué muestra la imagen, no «imagen de».
- **Enlaces:** el texto dice adónde llevan («Ficha completa de Saturno»), no «aquí».
