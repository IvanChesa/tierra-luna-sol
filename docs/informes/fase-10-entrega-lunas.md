# Fase 10, entrega 10.a: las lunas recreadas, segunda vuelta (D48)

- **Rama:** `fase-10a-lunas`, desde `main` (`89e77f9`), en su worktree (`.claude/worktrees/fase-10a-lunas`), con `CAPTURE_PORT=4360` y `E2E_PORT=4411`.
- **Fecha:** 2026-11-09
- **Estado:** terminada, a falta de que la sesión de revisión mire las capturas de cerca; la junta la sesión 1 («Dónde se queda», al final).
- **Manda:** la revisión del bloque S (`docs/revisiones/bloque-S.md`): el hallazgo S1, la decisión D48 (que completa D45, `docs/decisiones/FASE-9b-ADENDA-D45.md`) y «Sesión 2» de «Para aplicar esta revisión». La integra la sesión 1 (la fase 10) después de que la sesión de revisión mire las capturas.

## Plan

1. Las capturas «antes», del build de partida: las seis vistas de las 19 lunas con mapa (de `89e77f9`), las cinco de Urano y Tritón de cerca en el explorador con la fecha de hoy (09-11-2026, escritorio y móvil) y la rejilla de las 20.
2. **Lo real con luz rasante**, una clase propia de la máscara: medir la franja del terminador en cada luna de Urano (el perfil del brillo de lo real por distancia a lo no visto) y localizar la recta de 180°; llevar su brillo a gran escala al de lo real vecino y fundir sus sombras hacia lo recreado; lo demás de lo real, igual byte a byte.
3. **Lo recreado con forma del terreno de esa luna:** cráteres con la población y el albedo de su real (Oberón, Titania, Umbriel y Ariel), coronas y cráteres en Miranda, sin la guía gruesa que daba las manchas de camuflaje; su contraste a gran escala, del 70 al 130 % del de lo real.
4. **El borde del casquete de Tritón**, irregular como el del sur real.
5. **Los criterios del borde de D48:** el fino (σ = 4 texeles), relativo a lo natural; el brillo medio a varios grados, absoluto (ΔL\* ≤ 2 en el p95), con la escala justificada y el número de teselas de cada borde.
6. En la misma pasada, la máscara de cobertura umbralizada antes de reducir.
7. El build entero de las texturas, las capturas «después», las miniaturas y las imágenes de las fichas de las lunas, `FUENTES.md`, `/creditos` y «Lo que es ilustrativo».
8. `npm run check`, la revisión por subagente, sus correcciones, esta nota y el push de la rama.

## 1. Resumen

**La segunda vuelta de las lunas recreadas (D48), hecha.**
- **Lo real con luz rasante, una clase propia de la máscara** (del 0,5 % al 6,7 % de cada luna):
  - la franja del terminador de la Voyager en las cinco de Urano, de 2,5° a 7,0° de ancho;
  - y la unión de 180° de los mapas del JPL (las cinco de Urano y Deimos).

  Su brillo a gran escala se lleva al de lo real vecino y sus sombras se funden hacia lo recreado. El resto de lo real sigue igual byte a byte.
- **Lo no visto de las lunas de Urano, con forma de terreno:** de 4332 a 8529 cráteres por luna, con la población y el albedo de su real (con rayos los más claros), y dos coronas ilustrativas en Miranda. Su contraste a gran escala, del 91 al 106 % del de lo real.
- **El casquete del norte de Tritón**, con el borde irregular, con la estadística del sur real.
- **Los bordes cumplen los dos criterios de D48:**
  - el fino, relativo a lo natural;
  - y el brillo medio, ΔL\* ≤ 2 en el p95 a 2,8° (de 0,06 a 1,86 según la luna).

  La escala no se puede justificar como pide D48: lo natural no baja de 2 a ninguna escala (§4).
- **A la vista** (las seis vistas de las 19 lunas, las de cerca en el explorador con la fecha de hoy y la rejilla), ya no están la franja oscura, la recta de 180° ni el camuflaje. Quedan tres límites conocidos (§4):
  - las costuras del mosaico original de Tritón y de Deimos (al backlog);
  - una línea fina en Oberón, que de cerca no se ve (al backlog);
  - y las coronas de Miranda, ilustrativas.
- **Además:** la máscara de cobertura, umbralizada antes de reducir; y las miniaturas y las imágenes de las fichas de las 18 lunas, rehechas.
- **`npm run check`, en verde:** 808 tests; el código propio inicial, 13,72 kB de 15; y 1238 enlaces internos, bien.

## 2. Criterios de aceptación

Los de D48 (`docs/revisiones/bloque-S.md`, decisión 1), con las cifras del build definitivo de las texturas (09-11, 15:40; sin ningún «NO CUMPLE» ni aviso) y de `docs/datos/recreacion-lunas.md`. Los bordes, en ΔL\*, percentil 95 por teselas de 64 texeles, con su número de teselas.

| Criterio | Resultado | Evidencia |
|---|---|---|
| **La costura fina** (σ = 4 texeles): como mucho 2 L\* por encima de lo natural (lo real intacto con bordes ficticios) | ✅ | Con lo no visto o con la luz rasante: Miranda 2,96 (28 teselas; lo natural, 4,89), Ariel 0,61 (22; 2,07), Umbriel 1,73 (37; 2,51), Titania 2,50 (41; 6,61), Oberón 2,72 (40; 8,08), Tritón 1,85 (14; 4,53) y Deimos 4,08 y 3,91 (19 y 12; 3,37). Con lo visto de lejos, frente al mayor de lo natural y del salto que ya tenía el mosaico: las 18 lunas con mosaico pasan (el build lo comprueba; Miranda, 7,14, por el salto del mosaico) |
| **El brillo medio** a varios grados: ΔL\* ≤ 2 en el p95, en el borde con lo no visto y con la luz rasante | ✅ (la escala, ⚠️) | A σ = 16 texeles (2,8°): Miranda 1,19 (28 teselas), Ariel 0,26 (23), Umbriel 0,48 (36), Titania 1,16 (41), Oberón 0,91 (40), Tritón 0,06 (14) y Deimos 0,56 y 1,86 (17 y 12). Los máximos llegan a 2,56 (Deimos, la luz rasante). **La escala no se puede justificar como pide D48**: lo natural no baja de 2 a ninguna escala de 0,7° a 17°, salvo en Ariel (§4) |
| **Lo real con luz rasante**, una clase propia con su porcentaje; su brillo, al de lo real vecino; sus sombras, fundidas | ✅ | Miranda 6,7 % (franja de 7,0° y la unión de 180°), Ariel 2,4 % (2,5°), Umbriel 6,0 % (6,5°), Titania 5,0 % (5,5°), Oberón 3,5 % (4,0°) y Deimos 0,5 % (la unión de 180°), en `recreacion-lunas.md`, `FUENTES.md` y `/creditos`; las máscaras, con la clase en ámbar (`lunas-mascaras/`) |
| **El resto de lo real, igual byte a byte**, con sus sondas y su test | ✅ | `assertRealUnchanged` hace fallar el build si cambia; las sondas pasan también en el mapa recreado (las que caen en lo recreado no se miden, y el build lo dice: Swift en Deimos, Wunda en Umbriel, Belmont Chasma en Titania); en el WebP de 2k, lo real queda a menos error del mosaico que el mosaico comprimido igual sin recrear (Oberón 1,38 frente a 1,52; Titania 1,78 frente a 1,99) |
| **Lo recreado, con forma del terreno de esa luna**: cráteres con la población y el albedo de su real; coronas y cráteres en Miranda | ✅ (las escalas finas, ⚠️) | De 4332 (Oberón) a 8529 (Ariel) cráteres por luna, con rayos los más claros de los grandes; dos coronas en Miranda, con las bandas de su terreno bandeado (2,1° y 10,9 L\*). Medida en la textura final (§3.2), la población de lo recreado se parece a la de lo real en las escalas de 1,5° a 3°; en las finas (0,4° y 0,7°) tiene menos manchas: del 58 al 89 % en Umbriel, Titania y Oberón, y menos en Miranda y en Ariel |
| **Su contraste a gran escala**, del 70 al 130 % del de lo real (las lunas de Urano) | ✅ | Miranda 1,06, Ariel 0,91, Umbriel 0,96, Titania 0,94 y Oberón 0,92 (σ = 8 texeles, entre ±60°). Tritón, 0,62, y Deimos, 0,67: no es criterio en ellas (§4) |
| **El grano** (el de D45: del 0,7 al 1,3) | ✅ | De 0,98 (Titania) a 1,20 (Oberón); en Deimos, 1,14 |
| **El borde del casquete de Tritón, irregular como el del sur real** | ✅ | La función de estructura del borde, el sur real frente al norte recreado: 3,03° y 3,18° a 5°; 5,07° y 4,90° a 10°; 7,52° y 7,43° a 20° (`recreacion-lunas.md`); a la vista, en las seis vistas y de cerca |
| **Comprobado a la vista: las seis vistas** de las 19 lunas con mapa, antes y después | ⚠️ | Sin la franja oscura del terminador, la recta de 180° ni el camuflaje (la sesión de revisión, 09-11). Quedan las costuras del mosaico original de Tritón y de Deimos, que no se tocan, y una línea fina en Oberón (§4, «Límites conocidos») |
| **Comprobado a la vista: de cerca en el explorador con la fecha de hoy** (las cinco de Urano y Tritón, en escritorio y en el móvil) y la rejilla | ✅ | `lunas-<luna>-explorador-{escritorio,movil}-despues.webp` y `lunas-rejilla-despues.webp`: el norte iluminado, con cráteres, sin banda oscura ni rectas; la línea de Oberón no se ve. Pendiente: que la sesión de revisión las mire antes de juntar la rama |
| **Las demás lunas no se tocan** si sus seis vistas no muestran lo mismo | ✅ | Las seis vistas de las 13 restantes no tienen la banda, la recta ni el camuflaje: cambian solo por la máscara umbralizada antes de reducir y, las que tienen algo sin ver, por el brillo regional sobre la esfera (§4) |
| **La máscara de cobertura umbralizada antes de reducir** | ✅ | `loadMosaic` con `maskAtSource`, en las 18 lunas con mosaico, en el build y en `measure-moon-maps.mjs` (§3.5) |
| **Por script, determinista y sin dependencias nuevas**; las licencias de D45 | ✅ | Semillas fijas, sin `Math.random`; `package.json`, sin cambios; las fuentes, las de la 9b (`FUENTES.md`) |
| **Los porcentajes**, en el informe, en `FUENTES.md` y en `/creditos`; **§5, sin cambios** | ✅ | Las texturas, en total, de 26,74 a 26,65 MB; las miniaturas y las imágenes de las fichas de las 18 lunas, rehechas |

## 3. Lo hecho

### 3.1 Lo real con luz rasante (`scripts/lib/moon-grazing.mjs`)
- **Qué es, medido en cada luna:**
  - **La franja del terminador** (las cinco de Urano). Sus mapas del JPL son mosaicos de las imágenes de la Voyager 2 de 1986, con el Sol sobre su hemisferio sur: lo no visto es su noche polar, y su borde con lo real es el terminador de las imágenes. El perfil del brillo de lo real por distancia a lo no visto (pasos de 0,5°) cae junto al borde: en Oberón, de L\* 55 (la meseta, de 8° a 14°) a 26 en el primer medio grado, con un 12 % de píxeles negros (L\* < 10). La anchura de la franja: hasta donde el perfil queda a menos de 2 L\* de su meseta y la parte de sombras no pasa del 0,5 % (o del doble de la de la meseta), entre 1° y 8°. Y, hasta 8° de lo no visto, las sombras negras sueltas, con un anillo de 2 texeles: unas pocas no mueven el perfil medio (en Ariel quedaban como motas negras junto al borde).
  - **La unión de 180°** (los seis mapas del JPL: las cinco de Urano y Deimos). Su última columna (la 1439, la de 180°) es más oscura que sus vecinas, un 75 % de su brillo en las seis (Miranda, 90 frente a 120; Titania, 107 frente a 143). Es «la recta de la longitud 180°» de S1, y los parches de la 9b la copiaban como rayitas en lo recreado. En Miranda, además, se juntan ahí dos imágenes con otra luz.
- **Su brillo a gran escala, al de lo real vecino:** en la franja del terminador, la media de cada rodaja de distancia (de 0,5°) a lo largo del borde (σ = 3°) frente a la de lo real de la banda de 3° de más allá de la franja; en la unión, cada columna (su media vertical, σ = 6 texeles) frente a la recta entre las medias de las ocho columnas de lo real de cada lado. Como un desplazamiento del L\* y no como una ganancia: en la franja, el detalle fino son sobre todo las sombras de la luz rasante, y multiplicado saldría más marcado. Se apaga en el borde interior de la franja.
- **Sus sombras, fundidas hacia lo recreado:** en la franja, el peso de lo corregido va de 0 (a un 15 % de su anchura de lo no visto) a 1 (a un 90 %), y nada en una sombra (de 10 a 25 L\* por debajo del brillo que se le pide), suavizado con σ = 1,5 texeles. Lo recreado de la franja sale de la misma síntesis, con el brillo de lo corregido por encima de unos 12 texeles y el detalle de los parches por debajo.
- **Una clase propia de la máscara** (la 3; en ámbar en las máscaras), con su porcentaje en `docs/datos/recreacion-lunas.md`, en `/creditos` y en `FUENTES.md`. Lo real con luz rasante no es origen de parches (`exclude` en `moon-recreate.mjs`): la columna oscura ya no se copia.
- **Lo demás de lo real, igual byte a byte** (`assertRealUnchanged`, que hace fallar el build), con sus sondas sobre lo real (las que caen en la luz rasante no se miden, y se dice) y su comprobación en el WebP.

### 3.2 Lo recreado, con forma de terreno (`scripts/lib/moon-craters.mjs`)
- **El camuflaje de la 9b, explicado:** lo no visto seguía un brillo regional que salía de otra recreación a 1/4 de resolución (sus parches, de unos 11°, ampliados después): manchas borrosas de 1° a 10° sin forma de nada. Las lunas de Urano ya no usan esa guía (`guide: false`): lo no visto sigue el brillo de lo visto extendido sobre la esfera, los parches de lo real ponen solo el detalle fino (por debajo de 4 texeles), y entre medias van los cráteres.
- **Los cráteres, con la población y el albedo de su real:** las manchas claras y oscuras de lo real intacto (extremos del espacio de escalas de diferencias de gaussianas, de σ = 1,5 a 17 texeles, por encima de 1,5 veces la desviación típica de cada escala, entre ±60°), con su densidad por estereorradián y su contraste, por escala y signo. En lo no visto, cráteres con esa misma densidad y un contraste sorteado entre los medidos: de las manchas oscuras, cráteres de fondo oscuro con su borde claro; de las claras, cráteres claros con su halo y, el 10 % más claro de los de 4,2 texeles o más, con rayos («rayos claros y fondos oscuros», D48). Un 60 % se pintan como manchas difusas (lo real de estas lunas, a la resolución de la Voyager, es sobre todo eso), con el contorno algo irregular y desenfocados como la resolución de lo real (σ = 2,5 texeles). Perfiles radiales, sin dirección de luz: se leen como albedo, como lo real cerca del polo sur, con el Sol alto.
- **El contraste a gran escala** (la desviación típica del L\* de lo no visto desenfocado con σ = 8 texeles, entre ±60°): el factor común de los cráteres lo lleva al 90 % del de lo real, en dos pasos.
- **Miranda, coronas y cráteres:** dos coronas ilustrativas en su norte (superelipses de exponente 3, como el contorno de lado recto de Inverness y de Arden, de 30–40° por 20–28° de arco, con el contorno algo irregular), con bandas que siguen su contorno, onduladas y a trozos, con la longitud de onda y la amplitud de su terreno bandeado real (el de orientación más marcada, el percentil 80 de la coherencia del tensor de estructura, en su escala con más energía); sin cráteres dentro, como las reales, que son jóvenes. Ni su sitio ni su tamaño son de Miranda.

- **La población de lo recreado frente a la de lo real**, medida en la textura final de 2k con `spotPopulation` (`moon-craters.mjs`): las manchas claras y oscuras de lo real intacto y de lo no visto, con el umbral de lo real para los dos, para contar igual. La densidad, en manchas por estereorradián; el contraste, la mediana, en L\*; real · recreado:

  | Luna | σ (texeles) | Claras por sr | Su contraste | Oscuras por sr | Su contraste |
  |---|---|---|---|---|---|
  | Miranda | 2,1 (0,4°) | 95 · 60 | 4,2 · 3,5 | 92 · 37 | 4,6 · 3,3 |
  | Miranda | 4,2 | 9 · 7 | 2,9 · 2,9 | 15 · 9 | 2,9 · 2,5 |
  | Miranda | 8,5 | 6 · 5 | 2,9 · 4,3 | 9 · 9 | 3,5 · 3,0 |
  | Miranda | 17 (3°) | 0 · 0 | — · 4,5 | 4 · 2 | 3,2 · 2,2 |
  | Ariel | 2,1 | 173 · 61 | 2,3 · 1,8 | 169 · 46 | 2,2 · 1,7 |
  | Ariel | 4,2 | 6 · 4 | 1,7 · 1,4 | 17 · 2 | 1,6 · 1,2 |
  | Ariel | 8,5 | 3 · 5 | 1,9 · 1,0 | 6 · 2 | 0,9 · 1,0 |
  | Ariel | 17 | 1 · 1 | 1,6 · 1,0 | 2 · 2 | 0,8 · 0,5 |
  | Umbriel | 2,1 | 98 · 62 | 1,0 · 1,1 | 100 · 69 | 1,1 · 1,0 |
  | Umbriel | 4,2 | 23 · 17 | 1,3 · 1,5 | 26 · 19 | 1,3 · 1,5 |
  | Umbriel | 8,5 | 12 · 11 | 1,5 · 1,9 | 12 · 12 | 1,1 · 1,4 |
  | Umbriel | 17 | 2 · 1 | 1,1 · 1,6 | 2 · 1 | 1,1 · 0,9 |
  | Titania | 2,1 | 175 · 124 | 3,0 · 2,7 | 156 · 115 | 2,9 · 2,5 |
  | Titania | 4,2 | 16 · 10 | 2,9 · 3,0 | 20 · 12 | 2,4 · 2,7 |
  | Titania | 8,5 | 9 · 10 | 3,7 · 4,5 | 9 · 11 | 2,9 · 3,2 |
  | Titania | 17 | 2 · 1 | 5,8 · 6,3 | 4 · 2 | 4,1 · 3,8 |
  | Oberón | 2,1 | 119 · 74 | 2,8 · 2,8 | 113 · 74 | 2,8 · 2,5 |
  | Oberón | 4,2 | 24 · 14 | 3,9 · 4,6 | 18 · 16 | 3,4 · 3,6 |
  | Oberón | 8,5 | 9 · 8 | 5,5 · 8,7 | 9 · 11 | 4,9 · 4,7 |
  | Oberón | 17 | 1 · 1 | 9,7 · 10,2 | 2 · 1 | 6,7 · 5,7 |

  - **En las escalas de los cráteres grandes** (8,5 y 17 texeles, de 1,5° a 3°), la densidad y el contraste de lo recreado se parecen a los de lo real. Las manchas claras de 8,5 texeles de Oberón salen más marcadas (8,7 frente a 5,5 L\*): son los cráteres con rayos.
  - **En las finas** (2,1 y 4,2 texeles), lo recreado tiene menos manchas que lo real: del 58 al 89 % en Umbriel, Titania y Oberón, del 40 al 78 % en Miranda y del 12 al 67 % en Ariel. Dos causas:
    - los cráteres se desenfocan como la resolución de lo real (σ = 2,5 texeles), y el detalle fino de lo recreado viene de los parches;
    - en Ariel, el factor común de los cráteres (0,65), que lleva su contraste a gran escala al de lo real (0,91), deja muchas manchas por debajo del umbral de lo real.

### 3.3 El casquete de Tritón (`scripts/lib/moon-recipes.mjs`)
- **El polígono, explicado, con dos causas.** (1) La frontera del casquete del norte era un ruido de muy baja frecuencia (±14° en torno a 47°, con una transición de 4°): casi un círculo de lados planos. (2) En el nivel grueso de la síntesis, el brillo regional se desenfocaba cara a cara del cubo, con el borde repetido y una σ mayor que su margen (16 px con 16 de margen): cada cara daba otro brillo junto a sus aristas, y el casquete tomaba la forma de la cara del polo, un cuadrado redondeado a unos 45° de él. Ahora se desenfoca una vez sobre la esfera y se muestrea en las caras (en todas las lunas).
- **El borde del norte, con la estadística del sur real:** el del sur se mide donde lo vio la Voyager (`capBoundary`: donde el L\*, desenfocado 1°, pasa del brillo de fuera al del casquete, con 3° de cada lado), con su función de estructura (cuánto cambia la latitud del borde a cada distancia sobre la esfera). El del norte, en torno a 47° como en la 9b, es una suma de cosenos con fases al azar (semilla fija) y amplitudes en ley de potencias, con la función de estructura del sur de 5° a 20°; lo más fino, un ruido isótropo sobre la esfera (con solo la longitud, las ondas finas salían como rayos hacia el polo). La transición, la del sur.
- **Fuera del casquete, el brillo de lo que no es casquete** (lo real al norte de −30°: la «piel de melón» y las llanuras), y no el de lo visto extendido, que lejos de lo real era la media de todo lo visto, casquete sur incluido, y el del norte no se distinguía; y, junto a su borde, el collar más oscuro que tiene el del sur real (su brillo, el de lo real de 0,5° a 12° al norte del borde sur).

### 3.4 El borde, la mezcla y el grano (`scripts/lib/moon-map-build.mjs`)
- **«La misma media» (regla 4 de D45), en dos escalas:** junto a lo real intacto, el brillo medio de la franja (y después el de lo no visto, frente a lo real y la franja) se lleva al de lo real, a σ = 16 texeles (2,8°) y a σ = 4, en tres vueltas (cada escala mueve un poco la otra). En las lunas de Urano y en las que tienen más de un 2 % sin ver (Tritón y Deimos). No toca lo real, lo visto de lejos (su brillo a gran escala es el real) ni la unión de 180°.
- **Y una última pasada a la escala de la medida** (`matchBorderExact`): el salto que mide el criterio en cada píxel del borde, extendido a lo largo del borde y restado de todo lo recreado junto a lo real (lo no visto y la luz rasante), entero hasta 3σ y apagándose hasta 5σ. Es un desplazamiento suave y común, así que no deja otro escalón entre la franja y lo no visto. Sin ella, el brillo medio a 2,8° pasaba de 2 en Oberón (3,15), Miranda (3,32), Titania (2,52) y Deimos (4,18 y 3,84).
- **El grano, al final:** después de la luz rasante, los cráteres y la mezcla, una máscara de enfoque (o un desenfoque parcial) de σ = 1 texel sobre lo recreado lleva su grano al de lo real vecino (`grainRatio`, el de D45).

### 3.5 La máscara de cobertura, umbralizada antes de reducir (propuesta de la 9b.e)
`loadMosaic` con `maskAtSource` (`scripts/usgs-mosaic.mjs`): la máscara de lo que hay se umbraliza en el original y después se reduce, como la del radar de Venus, pero conservando las sombras a 0 de las lunas (`restoreShadowSpecks`). Un píxel del borde de un hueco cuenta por lo que tiene de dato, y su color, por el de ese dato (antes contaba como dato entero y se oscurecía con el hueco). En las 18 lunas con mosaico, en el build y en `measure-moon-maps.mjs`.

## 4. Desviaciones y decisiones

- **La escala del brillo medio no se puede justificar como pide D48 (⚠️).** D48 la fija «como aquella en la que lo natural queda por debajo de 2». Medido en lo real intacto (sin la luz rasante; bordes ficticios con la máscara girada 90°, 180° y 270°), el percentil 95 de lo natural no baja de 2 a ninguna escala de σ = 4 a 96 texeles (de 0,7° a 17°), salvo en Ariel:

  | Luna | σ = 4 | 16 | 32 | 48 | 64 | 96 texeles |
  |---|---|---|---|---|---|---|
  | Oberón | 8,08 | 14,53 | 13,53 | 7,34 | 4,93 | 4,93 |
  | Titania | 6,61 | 8,38 | 7,72 | 4,82 | 3,59 | 2,86 |
  | Miranda | 5,02 | 5,97 | 4,11 | 3,43 | 2,53 | 2,91 |
  | Umbriel | 2,51 | 2,60 | 2,70 | 2,78 | 2,33 | 2,05 |
  | Ariel | 2,75 | 2,03 | 1,30 | 1,03 | 0,79 | 2,56 |
  | Tritón | 4,53 | 4,54 | 4,99 | 7,01 | 9,44 | 13,44 |
  | Deimos | 3,37 | 5,92 | 7,60 | 8,04 | 7,96 | 7,79 |

  Con un estimador que descuenta la pendiente de cada lado (la media de cada lado extrapolada al borde con su propio degradado, `borderJumps`), tampoco: de 1,1 a 12 según la luna, de σ = 4 a 64. Lo real de estas lunas tiene manchas de albedo de esos tamaños, y con más escala la medida recoge además los degradados del terreno (la variación natural crece con la escala, como en un espectro rojo). **Se fija σ = 16 texeles (2,8°):** son «varios grados» y es la escala de la franja oscura del terminador que había que quitar (en la 9b, a esa escala, el borde de lo real con lo no visto de Oberón saltaba 20,9 L\* en el percentil 95, con lo natural en 12,6). El absoluto (ΔL\* ≤ 2 en el p95) se mide ahí en el borde con lo no visto y con lo real con luz rasante, y la tabla de lo natural queda en el informe. **Propuesta, para la sesión de revisión:** o este σ con su motivo, o un absoluto solo donde lo natural lo permite (Ariel y Umbriel), con el relativo en las demás.
- **El salto fino, relativo a lo natural del propio real intacto.** Lo natural de la 9b se medía sobre todo lo real, franja oscura incluida: en las lunas de Urano, los bordes ficticios (la máscara girada en longitud, a las mismas latitudes) caían junto al terminador y medían su propio oscurecimiento (en Oberón, 13,95 a σ = 8). Ahora se mide en lo real intacto, sin la luz rasante: es menor, y el criterio, más exigente.
- **El contraste a gran escala, a σ = 8 texeles (1,4°) y entre ±60°**: D48 no fija la escala. Es «gran escala» frente al grano (σ = 1,5) y la de las manchas de camuflaje (de 1° a 10°); hasta ±60°, sin lo más estirado del polo. El factor de los cráteres apunta al 90 % del de lo real (dentro del 70–130 %).
- **Tritón: el contraste no es criterio, pero se da.** D48 pide el contraste en «lo recreado, con forma del terreno de esa luna», el punto de las lunas de Urano (cráteres y coronas); el de Tritón es su casquete. Su recreado queda en el 66 % del contraste de lo real: lo de lo real lo dan sobre todo las máculas oscuras y el collar del hemisferio que vio la Voyager. Probé a ponerle manchas con su población (las máculas): llegaba al 72 %, pero el norte salía moteado, peor a la vista, y se descartó.
- **El brillo regional de la síntesis, sobre la esfera y no cara a cara del cubo** (la causa del cuadrado de Tritón): cambia el nivel grueso de todas las lunas con algo sin ver (Europa, Ganímedes, Calisto, Deimos, Tritón y las de Urano), no solo el de Tritón. Es un arreglo del método, no una receta nueva.
- **Las demás lunas** (Fobos, Ío, Europa, Ganímedes, Calisto, Mimas, Encélado, Tetis, Dione, Rea y Jápeto; y Deimos, salvo su unión de 180°) **no llevan luz rasante ni cráteres:** sus seis vistas no muestran ni la banda del terminador ni la recta de 180°, ni manchas de camuflaje (§7). Cambian solo por la máscara umbralizada antes de reducir (los bordes de sus huecos) y, las que tienen algo sin ver, por el brillo regional sobre la esfera.
- **`scripts/usgs-mosaic.mjs`** (no es de esta entrega): una opción nueva, `maskAtSource`, mínima, que solo usan las lunas. La pide D48 («la máscara de cobertura umbralizada antes de reducir»).
- **`RECREACION_SIN_COMPROBAR=1`** (`build-textures.mjs`): el build mide todas las lunas sin fallar por los criterios, para verlas de una vez. Sin ella, falla como en la 9b.
- **Las máscaras, en `docs/informes/img/fase-10/lunas-mascaras/`** (las de la 9b se quedan en la suya, como registro de antes).

### Límites conocidos
La sesión de revisión miró las seis vistas «después» el 09-11: lo de D48 queda resuelto (sin la franja oscura del terminador, sin la recta de 180° y sin el camuflaje, y el casquete de Tritón, con el borde irregular). Quedan estos tres límites. Los dos primeros, también en el backlog (`docs/PLAN.md` §9, punto 16b):
- **Las costuras del mosaico original**, entre lo real visto de cerca y lo visto de lejos. No se tocan: lo real sigue igual byte a byte y lo visto de lejos conserva su brillo a gran escala (D45).
  - En Tritón, la recta hacia 13° N a 90° E y la diagonal.
  - En Deimos, las rectas hacia ±60° y los círculos de los polos.
- **Oberón: una línea fina y recta junto al ecuador**, en el borde exterior de la luz rasante:
  - **Dónde está:** en los 4 texeles de la franja que tocan lo no visto, a −1° de latitud y de −20° a 110° de longitud, donde el borde de lo real del mosaico es recto.
  - **Cuánto marca:** de 1 a 3 texeles de ancho; en la media de 55° a 85° E, el L\* baja de 44,6 a 43,1 y vuelve a 44,0 a los 4 texeles, con trozos más marcados.
  - **Dónde se ve:** en la vista de 0° y, ampliada, centrando en 20° N y 90° E.
  - **De cerca, en el explorador con la fecha de hoy, no se ve:** el ecuador cae junto al limbo y la línea queda por debajo del píxel. Por eso no se toca (lo que pidió la sesión de revisión).
- **Miranda: las coronas, ilustrativas** (la sesión de revisión las da por buenas así). Ni su sitio ni su tamaño son de Miranda.

## 5. Archivos

- **De esta entrega** (los del reparto de la revisión del bloque S, «Sesión 2»):
  - `scripts/lib/moon-grazing.mjs` (nuevo: lo real con luz rasante), `scripts/lib/moon-craters.mjs` (nuevo: la población de manchas, los cráteres y las coronas), `scripts/lib/moon-recreate.mjs` (`exclude`, `guide`, `noneDetailSigma` y el brillo regional sobre la esfera), `scripts/lib/moon-recipes.mjs` (las recetas de las lunas de Urano y de Deimos, y el casquete de Tritón: `capBoundary`, `structureFunction` e `irregularBoundary`), `scripts/lib/moon-map-build.mjs` (la cadena de D48, la mezcla, el grano y los criterios) y `scripts/lib/moon-maps.mjs` (`boxBlur`, `borderSteps`, `naturalSteps`, `borderJumps`, `lowPassContrast` y `grainRatio`);
  - la parte de las lunas de `scripts/build-textures.mjs` (la máscara en el original, las máscaras en `fase-10/`, `recreacion-lunas.md`, `moon-recreation.ts` y los avisos) y de `scripts/measure-moon-maps.mjs` (la máscara en el original);
  - `scripts/capture-moon-views.mjs` (`--explorador`);
  - las texturas de las lunas en `public/textures/` (y sus filas de `src/app/scene/texture-files.ts`, generado);
  - `docs/datos/recreacion-lunas.md` y `src/app/data/moon-recreation.ts` (generados);
  - las capturas, en `docs/informes/img/fase-10/lunas-*`.
- **De lo compartido, solo lo de las lunas:**
  - `scripts/usgs-mosaic.mjs`: la opción `maskAtSource` de `loadMosaic` (la pide D48; la usan solo las lunas);
  - `docs/FUENTES.md`: las filas de Tritón, Deimos, las cinco de Urano y lo recreado;
  - `src/app/pages/credits/credits-page.{ts,html}`: la columna de lo real con luz rasante y una frase de D48;
  - `src/app/pages/about/about-page.html`: la línea de las lunas de «Lo que es ilustrativo»;
  - las miniaturas y las imágenes de las fichas de las 18 lunas con mosaico (`public/img/cuerpos/`, `public/img/fichas/`), rehechas con las texturas nuevas (las de los demás cuerpos, devueltas: sus texturas no cambian; Proteo y la imagen para compartir, sin tocar);
  - `docs/PLAN.md`: solo el punto 16b del backlog (§9), los límites conocidos; va entre el 16 y el 17 para no rozar las líneas que cambia la fase 10;
  - los textos de las fichas de las lunas (`mapNote`), sin cambios: siguen siendo exactos.
- **`assets-src/`** (ignorado): copia de `textures/`, `elevation/` y `rings/` de la carpeta principal, sin cambiar nada, y el mosaico del radar de Magellan, que la carpeta principal no tiene (lo tiene el worktree de `fase-9b-e-venus`; SHA-256 `833d5368…`, el de `FUENTES.md`): sin él, `build-textures.mjs` falla en Venus.

## 6. Para la integración (sesión 1)

- `git merge --no-ff fase-10a-lunas`. Las texturas que no son de lunas salen iguales byte a byte (el mismo hash), así que `texture-files.ts` solo cambia en sus filas.
- Si la fase 10 rehace las texturas, necesita el mosaico del radar en `assets-src/textures/` de la carpeta principal.
- Las referencias de la regresión visual (fase 10, tarea 6), después de juntar esta rama.

## 7. Capturas (`docs/informes/img/fase-10/`)

- **Las seis vistas de D45** (cuatro longitudes del ecuador y los dos polos, sobre la textura de 2k que carga la escena, sin luz), de las 19 lunas con mapa, antes (de `89e77f9`) y después: `lunas-<luna>-seis-vistas-antes.webp` y `-despues.webp` (`scripts/capture-moon-views.mjs`).
- **De cerca en el explorador, con la fecha de hoy** (09-11-2026, 12:00 UTC: el Sol, sobre el norte de las lunas de Urano), las cinco de Urano y Tritón, en escritorio (acercadas dos pasos) y en el móvil, antes y después: `lunas-<luna>-explorador-{escritorio,movil}-{antes,despues}.webp` (`capture-moon-views.mjs --explorador`).
- **La rejilla de las 20 lunas** (la luz de las miniaturas): `lunas-rejilla-antes.webp` y `-despues.webp` (`scripts/capture-moons.mjs`).
- **Las máscaras de cada luna** (lo real sin tinte; lo real con luz rasante, en ámbar; lo visto de lejos, en rojo; lo no visto, en azul): `lunas-mascaras/<luna>.webp` (las genera `build-textures.mjs`; las de la 9b, en `../fase-9b/mascaras/`).

## Dónde se queda (09-11, al cerrar)

- **Hecho, todo el plan:**
  - el método (§3);
  - el build definitivo de las texturas (09-11, 15:40, sin ningún «NO CUMPLE» ni aviso);
  - las capturas antes y después: las seis vistas, de cerca en el explorador y la rejilla;
  - las miniaturas y las imágenes de las fichas de las 18 lunas;
  - `FUENTES.md`, `/creditos` y «Lo que es ilustrativo»;
  - esta nota, con los límites conocidos (y el punto 16b del backlog);
  - `npm run check`, en verde;
  - y la revisión por subagente (`docs/revisiones/fase-10-entrega-lunas.md`), con su respuesta abajo.
- **Falta, fuera de esta sesión:**
  - que la sesión de revisión mire las capturas de cerca (`lunas-<luna>-explorador-{escritorio,movil}-despues.webp`) y la rejilla;
  - después, que la sesión 1 junte la rama (§6).
