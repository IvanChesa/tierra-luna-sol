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
- **Velocidad de la simulación:** «Tiempo real», «1 hora por segundo», «3 horas por segundo» (la de entrada, D31), «1 día por segundo», «3 días por segundo», «1 semana por segundo», «10 días por segundo», «1 mes por segundo», «1 año por segundo». El sentido se dice aparte («Hacia atrás»).

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
- **Textos alternativos:** qué muestra la imagen, no «imagen de».
- **Enlaces:** el texto dice adónde llevan («Ficha completa de Saturno»), no «aquí».
