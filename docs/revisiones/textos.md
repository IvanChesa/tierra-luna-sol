# Revisión de los textos publicados (fase 10; revisión del bloque S, decisión 4)

- **Fecha:** 2026-11-09. Subagente revisor, sin el contexto de la sesión.
- **Contra qué:** `docs/ESTILO.md`, las citas de `docs/datos/textos-cuerpos.md`, las páginas en caché (`assets-src/texts/`), las fuentes de `docs/revision-textos.md` y los datos del propio proyecto (`src/app/data/`).
- **Veredicto:** bien en general; **8 correcciones** (3 de sentido en los textos de los cuerpos y 5 en las fichas y las páginas) y **10 dudas** para Iván. Ninguna cifra mal convertida.

## 1. Qué se ha comprobado y cómo

| Grupo | Textos | Cómo |
|---|---|---|
| Cuerpos: resúmenes, curiosidades, líneas del mapa y del color | 140 | Cada texto frente a sus citas (ni más ni menos), y frente a su página en caché cuando la cita no bastaba (Olympus Mons, las Venera, los anillos de Saturno, la Luna, la Tierra). Las cifras, también frente a la tabla de su ficha (`body-data.ts`): periodos, distancias, temperaturas, albedos y tamaños. |
| Vistas y recorridos | 22 | Frente a sus fuentes: las de la Tierra y la Luna, en caché; NOAA, Earth Observatory, Black Marble, el artículo del polo sur, las tres APOD y el Gazetteer (1296, 3685, 5450, 5684 y 6163), consultados hoy. El matiz de Shackleton (`7389119`) cuadra con sus fuentes. |
| Páginas («Sobre el proyecto», créditos, índices, eclipses, 404) | 100 | Frente a los datos y el código del proyecto (`places.ts`, `eclipses.ts`, `moon-recreation.ts`, las claves de `localStorage`, las texturas) y frente a las cifras del plan, el diario y los informes (fases 1, 2 y 9b). |
| Textos fijos de las fichas, del pie y del menú | 94 | ESTILO, concordancia y lo que enseñan las imágenes de las fichas. |
| Interfaz del explorador | 155 | ESTILO y su código (las teclas, los botones a los que remiten). |
| Descriptions | 40 | Las de las fichas son la primera frase de su resumen; las demás, frente a su página. |
| Constelaciones | — | No se revisan aquí: ya las revisó otra sesión. |

Además, por script: el signo menos, los millares, los espacios dobles, las comillas rectas, las palabras repetidas y «del» ante femenino, en los 551 textos. `docs/revision-textos.md` es del `7389119`. Los textos cambiados después se han leído en su origen y están bien: la entradilla de la portada, el rótulo de España del recorrido, la recreación en «Lo que es ilustrativo» y en `/creditos`, la llegada desde un eclipse, la fase con eclipse del panel de la Luna y el aviso de día del cielo.

## 2. Corregido

| # | Texto | Antes → después | Motivo | Origen |
|---|---|---|---|---|
| 1 | Ío, curiosidad 2 | «En la Tierra, donde las mareas son más altas, la diferencia entre bajamar y pleamar…» → «En el lugar de la Tierra con las mareas más altas, la diferencia…» | Con las comas, la relativa explicaba «la Tierra»: «donde las mareas son más altas [que en Ío]», lo contrario de la cita («On Earth, in the place where tides are highest»). | `scripts/content/body-texts.json` |
| 2 | Titania, curiosidad 1 | «Las paredes que miran al Sol brillan mucho…» → «En algunos, las paredes que miran al Sol brillan mucho…» | La cita habla de los valles de una zona de la foto («In valleys seen at right-center»); el texto lo extendía a todos. | `scripts/content/body-texts.json` |
| 3 | Oberón, resumen | «Su superficie está plagada de cráteres, como la de Umbriel, y, como todas las grandes lunas de Urano, está formada…» → «…como la de Umbriel. Como todas las grandes lunas de Urano, Oberón está formada aproximadamente por mitad de hielo y mitad de roca.» | El sujeto de «está formada» era «su superficie», y la cita habla de la luna entera («Oberon is composed of roughly half ice and half rock»). La description, su primera frase, no cambia. | `scripts/content/body-texts.json` |
| 4 | Ficha de Saturno, tabla «Anillos» | «Profundidad óptica normal del división de Cassini» y «Albedo del división de Cassini» → «… de la división de Cassini» | Concordancia. Con la etiqueta bien, su aclaración ya no la repite debajo (`noteOf`). | `src/app/pages/body-detail/body-facts.ts` |
| 5 | Fichas de Deimos, Miranda, Ariel, Umbriel, Titania y Oberón: texto alternativo de la imagen | «…y su color esquemático (no hay un mapa de su superficie)…» → «…y su superficie real…», como Tritón y las demás lunas con mapa | Desde la 9b (D43 y D45) las seis tienen mapa: `/creditos` lo dice, su línea «Sobre su mapa» habla de «su mapa» y sus imágenes, regeneradas el 09-11, enseñan la superficie. Proteo se queda igual (el test lo pide). Matiz en la duda 4. | `src/app/pages/body-detail/body-labels.ts` |
| 6 | «Sobre el proyecto», Privacidad | «Tu navegador guarda solo dos preferencias…: el nivel de calidad del 3D y si quieres los atajos de una sola tecla.» + «Y, para no repetirlos, si ya has visto las pistas de uso y el recorrido de la portada.» | Desde la 9c (D47) se guardan también `tls.pistas` y `tls.recorrido` (`first-visit.ts`). La página decía que solo había dos datos. | `src/app/pages/about/about-page.html` |
| 7 | «Sobre el proyecto», Lo que es ilustrativo (Venus) | «…las fotos de las Venera 13 y 14 (las únicas hechas bajo las nubes…)» → «(las únicas en color hechas bajo las nubes…)» | Las Venera 9 y 10 (1975) también fotografiaron la superficie, en blanco y negro. D49 dice «las Venera» (el programa), no esas dos. Sin fuente en el proyecto (§4). | `src/app/pages/about/about-page.html` |
| 8 | Créditos, «Las imágenes del propio explorador» | «Los pósters» → «Los pósteres» | El plural normativo (DPD, «póster»). | `src/app/pages/credits/credits-page.html` |

Después de corregir:
- **`node scripts/build-body-texts.mjs`:** sin errores ni avisos («30 cuerpos y 140 textos verificados»). Ha regenerado `src/app/data/body-texts.ts` y `docs/datos/textos-cuerpos.md`, que solo cambian en esos tres textos y en la fecha.
- **Prettier `--check`:** pasa en todos los ficheros tocados.
- **Los tests, por lectura:**
  - `body-facts.spec.ts`: sin la nota del anillo B;
  - `body-labels.spec.ts`: Proteo, con «color esquemático»;
  - los e2e y la regresión visual no miran estos textos.
- **`reviewed`:** no se ha tocado.

## 3. Lista corta para Iván

1. **Venus: la ficha se contradice.**
   - **Dónde:** curiosidad 1 y resumen.
   - **El texto:** la curiosidad 1 dice «Un día en Venus dura 243 días terrestres, más incluso que su año». La tabla de la misma ficha da «Periodo de rotación: 243,0 días» y «Día solar: 116,8 días».
   - **La duda:** la NASA llama «day» a la rotación, entre comillas; la misma página da 117 días de salida a puesta (nota de redacción). Además, el resumen dice «unos 467 °C» (NASA Science) y la tabla, «Temperatura media: 464 °C» (NSSDCA).
   - **Propuesta:** «Venus tarda 243 días terrestres en girar sobre sí mismo, más incluso que en dar la vuelta al Sol, que le lleva 225.». La temperatura puede quedarse («unos») o pasar a «más de 460 °C», que vale para las dos.
2. **Umbriel y Proteo: la luz que reflejan y el albedo de la tabla.**
   - **Dónde:** el resumen y la description de Umbriel, y la curiosidad 1 de Proteo.
   - **El texto:** «solo refleja el 16 % de la luz que recibe», con «Albedo geométrico: 0,21» en la tabla. «el seis por ciento», con 0,10.
   - **La duda:** son medidas distintas (notas de la fase 1), pero en la misma ficha parecen contradecirse.
   - **Propuesta:** quitar la cifra: «solo refleja una pequeña parte de la luz que recibe».
3. **Saturno: hasta dónde llegan los anillos.**
   - **Dónde:** curiosidad 2.
   - **El texto:** «Los anillos se extienden hasta 282.000 km del planeta». La tabla «Anillos» de la misma ficha acaba en el borde exterior del anillo A, a 136.780 km del centro.
   - **La duda:** la cifra es la de la NASA («ring system extends up to 175,000 miles (282,000 kilometers)»), pero no cuadra con ningún borde de la tabla.
   - **Propuesta:** «El sistema de anillos llega hasta 282.000 km del planeta…», más literal, o quitar la cifra.
4. **Texto alternativo de las lunas con mucho recreado.**
   - **Dónde:** las fichas de las lunas, tras la corrección 5.
   - **El texto:** Deimos y las cinco de Urano dicen ahora «su superficie real», como Tritón.
   - **La duda:** lo no visto (recreado) es del 60,7 al 68,9 % en las de Urano, el 33,5 % en Tritón y el 11,8 % en Deimos (`moon-recreation.ts`), y sus imágenes, con el norte iluminado, enseñan mucho de ello. Proteo dice «su color esquemático», pero su imagen enseña cráteres generados.
   - **Propuesta:** «su superficie, en parte recreada» en esas siete; en Proteo, «sus cráteres recreados (no hay un mapa de su superficie)»; y las dos variantes en ESTILO §6.
5. **El recorrido de la portada.**
   - **Dónde:** el anuncio, en `features/tour/home-tour.ts`.
   - **El texto:** «Pulsa «Saltar» o cualquier tecla para pararlo.».
   - **La duda:** el botón se llama «Saltar el recorrido».
   - **Propuesta:** «Pulsa «Saltar el recorrido» o cualquier tecla para pararlo.».
6. **Créditos, «Textos».**
   - **El texto:** «traducidos y resumidos de páginas de NASA Science».
   - **La duda:** la curiosidad 2 de Titania sale de nasa.gov (la nota del JPL), y su ficha dice «NASA».
   - **Propuesta:** «de páginas de la NASA (casi todas, de NASA Science)».
7. **El poema de Pope.**
   - **Dónde:** Ariel, curiosidad 3, y Umbriel, curiosidad 3.
   - **El texto:** «El rizo robado».
   - **La duda:** también se ha publicado como «El robo del rizo»; la nota de redacción ya pedía que lo confirmaras.
   - **Propuesta:** dejarlo, si te vale.
8. **Mare Orientale.**
   - **Dónde:** recorrido de la Luna, parada 4.
   - **El texto:** «Mare Orientale, una diana de unos 950 km».
   - **La duda:** los 950 km son los de la cuenca con sus anillos (la APOD). El Gazetteer, la otra fuente de la parada, da 294 km para el mar.
   - **Propuesta:** «Mare Orientale, en el centro de una diana de unos 950 km…», o dejarlo como lo dice la APOD.
9. **Lleida en los créditos.**
   - **Dónde:** créditos, «Datos».
   - **El texto:** «Los lugares del cielo desde España: Fraga, Lleida, el Observatori Fabra y la Puerta del Sol…».
   - **La duda:** Lleida no es un lugar del cielo (`sky: false`) y no se usa en ninguna parte (solo está en `places.ts`). Además, «Fraga, Lleida» se lee como «lugar, provincia», y Fraga es de Huesca.
   - **Propuesta:** quitar Lleida de los créditos y, si no se va a usar, de `places.ts`.
10. **Los nombres de las teclas.**
    - **El texto:** la línea de tiempo dice «Re Pág» y «Av Pág»; el diálogo de los atajos, «RePág» y «AvPág».
    - **Propuesta:** una sola forma; la del teclado español es «Re Pág», «Av Pág».

## 4. Lo que no se ha podido comprobar

- **«Las únicas en color» (corrección 7):** no tiene fuente en el proyecto, como tampoco la tenía «las únicas». No he conseguido abrir las páginas de las Venera de la NSSDCA (errores del servidor). Si se quiere dejar la afirmación, conviene citar una fuente; si no, basta con quitar el inciso.
- **Las cifras de rendimiento de «Sobre el proyecto»** (58–60 FPS, 278 y 85 MB):
  - no se han vuelto a medir, porque la fase 10 ha tocado el renderer y no me tocaba medir;
  - las de precisión sí cuadran con sus informes (0,008°, 0,002°, 0,06°, 0,38°; Ganímedes, el 11,7 %).
- **Los anuncios compuestos en TypeScript** (las frases de `aria-live`): solo por muestreo.
- **`body-panel.ts` y `body-panel.css`:** no los he mirado; otra sesión los tenía a medio cambiar.
- **Nota de documentación:** en `docs/datos/textos-cuerpos.md`, la línea del color del Sol sale como «Sobre su mapa»; en la web y en `docs/revision-textos.md`, como «Sobre su color». Es un rótulo del generador, no un texto publicado.
- **`docs/revision-textos.md`:** no se ha regenerado (lo hace la sesión principal con un build nuevo). Ahí siguen los textos de antes de estas correcciones.
