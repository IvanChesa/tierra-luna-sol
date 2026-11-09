# Fase 10, entrega 10.a: las lunas recreadas, segunda vuelta (D48)

- **Rama:** `fase-10a-lunas`, desde `main` (`89e77f9`), en su worktree (`.claude/worktrees/fase-10a-lunas`), con `CAPTURE_PORT=4360` y `E2E_PORT=4411`.
- **Fecha:** 2026-11-09
- **Estado:** terminada, con la revisión por subagente corregida (su respuesta, al final), a falta de que la sesión de revisión mire las capturas «después» rehechas; la junta la sesión 1 («Dónde se queda», al final).
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

  Su brillo a gran escala se lleva al de lo real vecino y sus sombras se funden hacia lo recreado; su albedo se conserva (los accidentes con nombre, con su signo). El resto de lo real sigue igual byte a byte.
- **Lo no visto de las lunas de Urano, con forma de terreno:** de 4332 a 8529 cráteres por luna, con la población y el albedo de su real (con rayos los más claros), y dos coronas ilustrativas en Miranda. Su contraste a gran escala, del 89 al 90 % del de lo real.
- **El casquete del norte de Tritón**, con el borde irregular, con la estadística del sur real.
- **Los bordes cumplen los dos criterios de D48:**
  - el fino, relativo a lo natural;
  - y el brillo medio, ΔL\* ≤ 2 en el p95 a 2,8° (de 0,25 a 1,82 según la luna);
  - y, desde la revisión, el perfil junto al borde, sin surcos de más de 2 L\*.

  La escala no se puede justificar como pide D48: lo natural no baja de 2 a ninguna escala (§4).
- **A la vista** (las seis vistas de las 19 lunas, las de cerca en el explorador con la fecha de hoy y la rejilla), ya no están la franja oscura, la recta de 180° ni el camuflaje, ni, desde la revisión, el arco oscuro de Tritón; Wunda vuelve a verse. Quedan estos límites conocidos (§4; todos, salvo el último, en el backlog, 16b):
  - las costuras del mosaico original de Tritón, Deimos, Europa y Calisto;
  - la línea fina del borde exterior de la luz rasante (Oberón, casi quitada; Umbriel), que de cerca, con la fecha de hoy, no se ve;
  - lo recreado de Ariel, casi liso;
  - y las coronas de Miranda, ilustrativas.
- **Además:** la máscara de cobertura, umbralizada antes de reducir; y las miniaturas y las imágenes de las fichas de las 18 lunas, rehechas.
- **`npm run check`, en verde** (09-11, 20:45, con las correcciones de la revisión): lint y Prettier; 808 tests en 81 ficheros, con una cobertura de `ephemeris/` del 98,93 %; build con 40 rutas prerenderizadas, sin avisos de presupuesto; el código propio inicial, 13,72 kB de 15; y 1238 enlaces internos, bien.

## 2. Criterios de aceptación

Los de D48 (`docs/revisiones/bloque-S.md`, decisión 1), con las cifras del build definitivo de las texturas (09-11, 20:01, con las correcciones de la revisión; sin ningún «NO CUMPLE») y de `docs/datos/recreacion-lunas.md`. Los bordes, en ΔL\*, percentil 95 por teselas de 64 texeles, con su número de teselas.

| Criterio | Resultado | Evidencia |
|---|---|---|
| **La costura fina** (σ = 4 texeles): como mucho 2 L\* por encima de lo natural (lo real intacto con bordes ficticios) | ✅ | Con lo no visto o con la luz rasante: Miranda 2,83 (28 teselas; lo natural, 4,89), Ariel 0,81 (22; 2,07), Umbriel 1,56 (37; 2,51), Titania 2,65 (41; 6,61), Oberón 3,00 (40; 8,08), Tritón 1,53 (14; 4,53) y Deimos 4,96 y 3,90 (19 y 12; 3,37). Con lo visto de lejos, frente al mayor de lo natural y del salto que ya tenía el mosaico: las 18 lunas con mosaico pasan (el build lo comprueba; Miranda, 6,77, por el salto del mosaico) |
| **El brillo medio** a varios grados: ΔL\* ≤ 2 en el p95, en el borde con lo no visto y con la luz rasante | ✅ (la escala, ⚠️) | A σ = 16 texeles (2,8°): Miranda 1,19 (28 teselas), Ariel 0,25 (23), Umbriel 0,48 (36), Titania 1,00 (41), Oberón 0,91 (40), Tritón 0,33 (14) y Deimos 0,96 y 1,82 (17 y 12). Los máximos llegan a 2,58 (Deimos, la luz rasante). Desde la revisión, hace fallar el build. **La escala no se puede justificar como pide D48**: lo natural no baja de 2 a ninguna escala de 0,7° a 17°, salvo en Ariel (§4) |
| **Lo real con luz rasante**, una clase propia con su porcentaje; su brillo, al de lo real vecino; sus sombras, fundidas | ✅ | Miranda 6,7 % (franja de 7,0° y la unión de 180°), Ariel 2,4 % (2,5°), Umbriel 6,0 % (6,5°), Titania 5,0 % (5,5°), Oberón 3,5 % (4,0°) y Deimos 0,5 % (la unión de 180°), en `recreacion-lunas.md`, `FUENTES.md` y `/creditos`; las máscaras, con la clase en ámbar (`lunas-mascaras/`). Desde la revisión, se funden solo sus sombras y su borde con lo no visto: su albedo se conserva (§3.1) |
| **El resto de lo real, igual byte a byte**, con sus sondas y su test | ⚠️ | `assertRealUnchanged` y `assertGrazingExtent` hacen fallar el build. Las sondas, en el mapa recreado, sobre lo real y la luz rasante corregida: en la luz rasante, con su signo y **no con la mitad del contraste del mosaico** (lo que pedía la revisión; §4, respuesta al hallazgo 1). En la textura final de 2k: Wunda 1,06 (en el mosaico, 1,25), Belmont Chasma 0,93 (0,80) y Ursula 1,19 (1,30). Swift (Deimos) cae en lo visto de lejos y no se mide. En el WebP de 2k, lo real queda a menos error del mosaico que el mosaico comprimido igual sin recrear (Oberón 1,40 frente a 1,52; Titania 1,75 frente a 1,99) |
| **Lo recreado, con forma del terreno de esa luna**: cráteres con la población y el albedo de su real; coronas y cráteres en Miranda | ⚠️ | De 4332 (Oberón) a 8529 (Ariel) cráteres por luna, con rayos los más claros de los grandes; dos coronas en Miranda, con las bandas de su terreno bandeado (2,1° y 10,9 L\*). Medida en la textura final (§3.2), la población de lo recreado se parece a la de lo real en las escalas de 1,5° a 3°; en las finas (0,4° y 0,7°) tiene menos manchas: del 53 al 76 % en Umbriel, Titania y Oberón, del 50 al 79 % en Miranda y del 15 al 43 % en Ariel, que se ve casi liso (§4) |
| **Su contraste a gran escala**, del 70 al 130 % del de lo real (las lunas de Urano) | ✅ | Miranda 0,90, Ariel 0,90, Umbriel 0,90, Titania 0,90 y Oberón 0,89 (σ = 8 texeles, entre ±60°). Tritón, 0,62, y Deimos, 0,70: no es criterio en ellas (§4) |
| **El grano** (el de D45: del 0,7 al 1,3) | ✅ | De 0,99 (Miranda y Titania) a 1,26 (Oberón); en Tritón, 1,00, y en Deimos, 1,14 |
| **El borde del casquete de Tritón, irregular como el del sur real** | ⚠️ | A la vista, irregular, en las seis vistas y de cerca. La función de estructura del borde (el sur real frente al norte recreado: 3,03° y 3,18° a 5°; 5,07° y 4,90° a 10°; 7,52° y 7,43° a 20°; `recreacion-lunas.md`) se da en los puntos del ajuste y antes del ruido fino: no lo prueba (revisión, hallazgo 7). Medirla en la textura final, al backlog (16b) |
| **Comprobado a la vista: las seis vistas** de las 19 lunas con mapa, antes y después | ⚠️ | Sin la franja oscura del terminador, la recta de 180° ni el camuflaje (la sesión de revisión, 09-11); las de las siete lunas de D48, rehechas tras la revisión. Quedan las costuras del mosaico original de Tritón, Deimos, Europa y Calisto, que no se tocan; la línea fina del borde exterior de la luz rasante (Oberón, casi quitada; Umbriel); y Ariel, casi liso (§4, «Límites conocidos») |
| **Comprobado a la vista: de cerca en el explorador con la fecha de hoy** (las cinco de Urano y Tritón, en escritorio y en el móvil) y la rejilla | ⚠️ | `lunas-<luna>-explorador-{escritorio,movil}-despues.webp` y `lunas-rejilla-despues.webp`, rehechas tras la revisión: el norte iluminado, con cráteres, sin banda oscura ni rectas; en Tritón, sin el arco oscuro (queda el paso, suave, de lo real al casquete, más claro); la línea de Oberón no se ve. Ariel, casi liso. Pendiente: que la sesión de revisión las mire antes de juntar la rama |
| **Las demás lunas no se tocan** si sus seis vistas no muestran lo mismo | ⚠️ | Las seis vistas de las otras 13 no tienen la banda ni el camuflaje. Deimos tenía la recta de 180°: lleva la luz rasante en esa unión y la misma media en su borde con lo no visto. Las otras 11 con mosaico no llevan nada de D48, pero cambian por la máscara umbralizada antes de reducir: lo visto de lejos se vuelve a sintetizar con otros parches (sin cambio del brillo medio ni defectos nuevos a la vista). Proteo, igual (§4) |
| **La máscara de cobertura umbralizada antes de reducir** | ✅ | `loadMosaic` con `maskAtSource`, en las 18 lunas con mosaico, en el build y en `measure-moon-maps.mjs` (§3.5) |
| **Por script, determinista y sin dependencias nuevas**; las licencias de D45 | ✅ | Semillas fijas, sin `Math.random`; `package.json`, sin cambios; las fuentes, las de la 9b (`FUENTES.md`) |
| **Los porcentajes**, en el informe, en `FUENTES.md` y en `/creditos`; **§5, sin cambios** | ✅ | Las texturas, en total, de 26,74 a 26,65 MB (26 651 878 B); las miniaturas y las imágenes de las fichas de las 18 lunas, rehechas (las de las siete de D48, otra vez tras la revisión) |

## 3. Lo hecho

### 3.1 Lo real con luz rasante (`scripts/lib/moon-grazing.mjs`)
- **Qué es, medido en cada luna:**
  - **La franja del terminador** (las cinco de Urano). Sus mapas del JPL son mosaicos de las imágenes de la Voyager 2 de 1986, con el Sol sobre su hemisferio sur: lo no visto es su noche polar, y su borde con lo real es el terminador de las imágenes. El perfil del brillo de lo real por distancia a lo no visto (pasos de 0,5°) cae junto al borde: en Oberón, de L\* 55 (la meseta, de 8° a 14°) a 26 en el primer medio grado, con un 12 % de píxeles negros (L\* < 10). La anchura de la franja: hasta donde el perfil queda a menos de 2 L\* de su meseta y la parte de sombras no pasa del 0,5 % (o del doble de la de la meseta), entre 1° y 8°. Y, hasta 8° de lo no visto, las sombras negras sueltas, con un anillo de 2 texeles: unas pocas no mueven el perfil medio (en Ariel quedaban como motas negras junto al borde).
  - **La unión de 180°** (los seis mapas del JPL: las cinco de Urano y Deimos). Su última columna (la 1439, la de 180°) es más oscura que sus vecinas, un 75 % de su brillo en las seis (Miranda, 90 frente a 120; Titania, 107 frente a 143). Es «la recta de la longitud 180°» de S1, y los parches de la 9b la copiaban como rayitas en lo recreado. En Miranda, además, se juntan ahí dos imágenes con otra luz.
- **Su brillo a gran escala, al de lo real vecino:** en la franja del terminador, la media de cada rodaja de distancia (de 0,5°) a lo largo del borde (σ = 3°) frente a la de lo real de la banda de 3° de más allá de la franja; en la unión, cada columna (su media vertical, σ = 6 texeles) frente a la recta entre las medias de las ocho columnas de lo real de cada lado. Como un desplazamiento del L\* y no como una ganancia: en la franja, el detalle fino son sobre todo las sombras de la luz rasante, y multiplicado saldría más marcado. Se apaga en el borde interior de la franja.
- **Sus sombras, fundidas hacia lo recreado** (D48: «sus sombras se funden»; revisión de la 10.a, hallazgo 1):
  - en toda la franja, lo que queda de 10 a 25 L\* por debajo del brillo que se le pide;
  - solo junto a lo no visto, el borde de lo real: el peso de lo corregido va de 0 (a un 5 % de su anchura de lo no visto) a 1 (a un 30 %);
  - suavizado con σ = 1,5 texeles.

  Lo demás de la franja queda corregido y entero: su albedo es el real. Hasta la revisión, el peso iba de 0 (a un 15 %) a 1 (a un 90 %) en toda la franja, y borraba albedo real (Wunda, en Umbriel, y Belmont Chasma, en Titania).
- **Lo que pone la recreación en su sitio:** sale de la misma síntesis, con el brillo de lo corregido por encima de unos 12 texeles y el detalle de los parches por debajo. Para que no salga oscuro:
  - en el mapa corregido, las sombras suben hacia el brillo que se les pide (la síntesis tomaba su negro como el brillo de la zona);
  - y las islas de sombras sueltas, más allá de la franja, se recrean enteras, con su penumbra (de pocos texeles, el suavizado las diluía y quedaban como manchas oscuras junto a lo real).
- **Los accidentes con nombre** (las sondas del Gazetteer que caen en la franja: Wunda, Belmont Chasma y Ursula):
  - no cuentan para medir la luz rasante: Wunda, un anillo claro de unos 13°, hacía creer que allí la luz era más fuerte;
  - no se funden por estar junto a lo no visto (Wunda toca el borde de lo real); sus sombras, sí;
  - y se comprueban: las sondas se miden también en la luz rasante corregida, y el build falla si una pierde su signo (no se pide la mitad de su contraste en el mosaico: en la franja, ese contraste lleva la luz de la foto; respuesta a la revisión, hallazgo 1).
- **Una clase propia de la máscara** (la 3; en ámbar en las máscaras), con su porcentaje en `docs/datos/recreacion-lunas.md`, en `/creditos` y en `FUENTES.md`. Lo real con luz rasante no es origen de parches (`exclude` en `moon-recreate.mjs`): la columna oscura ya no se copia.
- **Lo demás de lo real, igual byte a byte:**
  - `assertRealUnchanged`, que hoy guarda contra un cambio de cómo se monta el mapa (lo copia del mosaico);
  - `assertGrazingExtent`, que hace fallar el build si la luz rasante sale de la franja o de las columnas de la unión;
  - sus sondas, sobre lo real y lo real con luz rasante;
  - y su comprobación en el WebP.

### 3.2 Lo recreado, con forma de terreno (`scripts/lib/moon-craters.mjs`)
- **El camuflaje de la 9b, explicado:** lo no visto seguía un brillo regional que salía de otra recreación a 1/4 de resolución (sus parches, de unos 11°, ampliados después): manchas borrosas de 1° a 10° sin forma de nada. Las lunas de Urano ya no usan esa guía (`guide: false`): lo no visto sigue el brillo de lo visto extendido sobre la esfera, los parches de lo real ponen solo el detalle fino (por debajo de 4 texeles), y entre medias van los cráteres.
- **Los cráteres, con la población y el albedo de su real:** las manchas claras y oscuras de lo real intacto (extremos del espacio de escalas de diferencias de gaussianas, de σ = 1,5 a 17 texeles, por encima de 1,5 veces la desviación típica de cada escala, entre ±60°), con su densidad por estereorradián y su contraste, por escala y signo. En lo no visto, cráteres con esa misma densidad y un contraste sorteado entre los medidos: de las manchas oscuras, cráteres de fondo oscuro con su borde claro; de las claras, cráteres claros con su halo y, el 10 % más claro de los de 4,2 texeles o más, con rayos («rayos claros y fondos oscuros», D48). Un 60 % se pintan como manchas difusas (lo real de estas lunas, a la resolución de la Voyager, es sobre todo eso), con el contorno algo irregular y desenfocados como la resolución de lo real (σ = 2,5 texeles). Perfiles radiales, sin dirección de luz: se leen como albedo, como lo real cerca del polo sur, con el Sol alto.
- **El contraste a gran escala** (la desviación típica del L\* de lo no visto desenfocado con σ = 8 texeles, entre ±60°): el factor común de los cráteres lo lleva al 90 % del de lo real, en dos pasos.
- **Miranda, coronas y cráteres:** dos coronas ilustrativas en su norte (superelipses de exponente 3, como el contorno de lado recto de Inverness y de Arden, de 30–40° por 20–28° de arco, con el contorno algo irregular), con bandas que siguen su contorno, onduladas y a trozos, con la longitud de onda y la amplitud de su terreno bandeado real (el de orientación más marcada, el percentil 80 de la coherencia del tensor de estructura, en su escala con más energía); sin cráteres dentro, como las reales, que son jóvenes. Ni su sitio ni su tamaño son de Miranda.

- **La población de lo recreado frente a la de lo real**, medida en la textura final de 2k (la del build de las 20:01, con las correcciones de la revisión) con `spotPopulation` (`moon-craters.mjs`): las manchas claras y oscuras de lo real intacto y de lo no visto, con el umbral de lo real para los dos, para contar igual. La densidad, en manchas por estereorradián; el contraste, la mediana, en L\*; real · recreado:

  | Luna | σ (texeles) | Claras por sr | Su contraste | Oscuras por sr | Su contraste |
  |---|---|---|---|---|---|
  | Miranda | 2,1 (0,4°) | 94 · 65 | 4,2 · 3,7 | 88 · 44 | 4,6 · 3,3 |
  | Miranda | 4,2 | 9 · 6 | 3,3 · 3,6 | 14 · 11 | 2,7 · 2,6 |
  | Miranda | 8,5 | 6 · 5 | 2,9 · 4,1 | 8 · 9 | 3,5 · 3,4 |
  | Miranda | 17 (3°) | 0 · 0 | — · 4,9 | 6 · 3 | 3,2 · 2,1 |
  | Ariel | 2,1 | 171 · 59 | 2,2 · 1,8 | 174 · 47 | 2,1 · 1,7 |
  | Ariel | 4,2 | 7 · 3 | 1,7 · 1,6 | 13 · 2 | 1,4 · 1,4 |
  | Ariel | 8,5 | 3 · 5 | 1,1 · 1,1 | 7 · 3 | 1,0 · 0,9 |
  | Ariel | 17 | 1 · 1 | 1,7 · 1,1 | 2 · 2 | 0,8 · 0,4 |
  | Umbriel | 2,1 | 96 · 64 | 1,1 · 1,1 | 99 · 62 | 1,1 · 1,0 |
  | Umbriel | 4,2 | 24 · 17 | 1,2 · 1,5 | 27 · 19 | 1,3 · 1,4 |
  | Umbriel | 8,5 | 13 · 11 | 1,5 · 1,9 | 12 · 12 | 1,1 · 1,5 |
  | Umbriel | 17 | 2 · 1 | 1,1 · 1,6 | 2 · 2 | 1,1 · 1,0 |
  | Titania | 2,1 | 180 · 122 | 3,0 · 2,7 | 160 · 119 | 2,8 · 2,6 |
  | Titania | 4,2 | 15 · 8 | 3,0 · 3,4 | 20 · 11 | 2,4 · 2,6 |
  | Titania | 8,5 | 9 · 9 | 4,0 · 4,6 | 10 · 10 | 2,9 · 3,2 |
  | Titania | 17 | 2 · 1 | 5,8 · 6,2 | 4 · 2 | 4,1 · 3,6 |
  | Oberón | 2,1 | 119 · 72 | 2,8 · 2,8 | 115 · 73 | 2,8 · 2,6 |
  | Oberón | 4,2 | 22 · 13 | 4,0 · 4,7 | 21 · 16 | 3,4 · 3,6 |
  | Oberón | 8,5 | 9 · 8 | 5,3 · 8,3 | 10 · 11 | 4,9 · 4,8 |
  | Oberón | 17 | 1 · 1 | 9,7 · 10,3 | 2 · 1 | 6,7 · 5,7 |

  - **En las escalas de los cráteres grandes** (8,5 y 17 texeles, de 1,5° a 3°), la densidad y el contraste de lo recreado se parecen a los de lo real. Las manchas claras de 8,5 texeles de Oberón salen más marcadas (8,3 frente a 5,3 L\*): son los cráteres con rayos.
  - **En las finas** (2,1 y 4,2 texeles), lo recreado tiene menos manchas que lo real: del 53 al 76 % en Umbriel, Titania y Oberón, del 50 al 79 % en Miranda y del 15 al 43 % en Ariel. Dos causas:
    - los cráteres se desenfocan como la resolución de lo real (σ = 2,5 texeles), y el detalle fino de lo recreado viene de los parches;
    - en Ariel, el factor común de los cráteres (0,68), que lleva su contraste a gran escala al de lo real (0,90), deja muchas manchas por debajo del umbral de lo real.

### 3.3 El casquete de Tritón (`scripts/lib/moon-recipes.mjs`)
- **El polígono, explicado, con dos causas.** (1) La frontera del casquete del norte era un ruido de muy baja frecuencia (±14° en torno a 47°, con una transición de 4°): casi un círculo de lados planos. (2) En el nivel grueso de la síntesis, el brillo regional se desenfocaba cara a cara del cubo, con el borde repetido y una σ mayor que su margen (16 px con 16 de margen): cada cara daba otro brillo junto a sus aristas, y el casquete tomaba la forma de la cara del polo, un cuadrado redondeado a unos 45° de él. Ahora se desenfoca una vez sobre la esfera y se muestrea en las caras (en todas las lunas).
- **El borde del norte, con la estadística del sur real:** el del sur se mide donde lo vio la Voyager (`capBoundary`: donde el L\*, desenfocado 1°, pasa del brillo de fuera al del casquete, con 3° de cada lado), con su función de estructura (cuánto cambia la latitud del borde a cada distancia sobre la esfera). El del norte, en torno a 47° como en la 9b, es una suma de cosenos con fases al azar (semilla fija) y amplitudes en ley de potencias, con la función de estructura del sur de 5° a 20°; lo más fino, un ruido isótropo sobre la esfera (con solo la longitud, las ondas finas salían como rayos hacia el polo). La transición, la del sur.
- **Fuera del casquete, el brillo de lo que no es casquete** (lo real al norte de −30°: la «piel de melón» y las llanuras), y no el de lo visto extendido, que lejos de lo real era la media de todo lo visto, casquete sur incluido, y el del norte no se distinguía; y, junto a su borde, el collar más oscuro que tiene el del sur real (su brillo, el de lo real de 0,5° a 12° al norte del borde sur).

### 3.4 El borde, la mezcla y el grano (`scripts/lib/moon-map-build.mjs`)
- **«La misma media» (regla 4 de D45), en las lunas de Urano y en las que tienen más de un 2 % sin ver (Tritón y Deimos).** No toca lo real ni lo visto de lejos (su brillo a gran escala es el real).
  - **La franja del terminador, frente a lo real intacto:** su brillo medio se lleva al de lo real a σ = 16 texeles (2,8°) y a σ = 4, en tres vueltas (cada escala mueve un poco la otra). Su brillo, ya corregido, es plano.
  - **Lo no visto ya no se iguala así** (revisión de la 10.a, hallazgo 2). Con un degradado en lo recreado (el casquete de Tritón, más claro hacia el norte), igualar las medias en toda la zona oscilaba: dejaba un reborde claro junto a lo real y un surco a 2–3,5°, que de cerca se veía como un arco oscuro.
- **Y una última pasada a la escala de la medida** (`matchBorderExact`), clase a clase (lo no visto y la luz rasante):
  - el salto que mide el criterio en cada píxel del borde se extiende a lo largo del borde y se resta de lo recreado de esa clase junto a lo real, entero hasta 3σ y apagándose hasta 5σ;
  - es un desplazamiento suave y monótono desde el borde: no oscila;
  - sin ella, el brillo medio a 2,8° pasaba de 2 en Oberón (3,15), Miranda (3,32), Titania (2,52) y Deimos (4,18 y 3,84);
  - clase a clase desde la revisión: el salto de lo no visto movía la unión de 180° de Deimos.
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
- **Las demás lunas** (Fobos, Ío, Europa, Ganímedes, Calisto, Mimas, Encélado, Tetis, Dione, Rea y Jápeto; y Deimos, salvo su unión de 180°) **no llevan luz rasante ni cráteres:** sus seis vistas no muestran ni la banda del terminador ni la recta de 180°, ni manchas de camuflaje (§7). Cambian por la máscara umbralizada antes de reducir y, las que tienen algo sin ver, por el brillo regional sobre la esfera. Con la máscara nueva cambian sus clases, y lo visto de lejos se vuelve a sintetizar entero, con otros parches (revisión de la 10.a, hallazgo 5):
  - en Encélado, lo visto de lejos cambia 28,1 niveles de media, y lo real, 2,6 (la compresión);
  - en las seis vistas, del 0,1 al 10 % de los píxeles cambian más de 20 niveles (Encélado, 10,0 %; Jápeto, 9,3 %; Tetis, 7,8 %; Dione, 5,6 %), sin cambio del brillo medio (±0,1 niveles);
  - a la vista, sin defectos nuevos.
- **La luminancia media de las texturas sube en las lunas con franja** (revisión de la 10.a, sugerencia 12). La escena lleva cada luna a su albedo con la luminancia media de su textura (`TEXTURE_MEAN_LUMINANCE`, en `texture-files.ts`), y la franja oscura ya no la baja: de `89e77f9` a ahora, Oberón de 0,2210 a 0,2363 (+6,9 %), Titania de 0,2770 a 0,2897 (+4,6 %) y Umbriel de 0,2134 a 0,2225 (+4,3 %); Miranda, Ariel, Tritón y Deimos, a menos del 0,5 %. Así, lo real de esas tres se pinta entre un 4 y un 7 % más oscuro que antes, que es lo correcto: el albedo de la luna entera no cambia, y la franja ya no lo rebajaba. El brillo medio del disco en la captura no cambia (en Oberón, de 145,9 a 145,8; la revisión).
- **Una sonda de borde de Ariel, más floja en el WebP de 2k.** El build comprueba las sondas en el mapa recreado, antes de comprimir: ahí lo real es el mosaico byte a byte, y Yangoor (el borde de un cráter, a 68,7° S) da 1,21 (pide 1,15). Medida aparte en la textura publicada, da 1,11 (1,17 en la de la 9b; en la de la primera vuelta, ya 1,11): la compresión (WebP, calidad 80) suaviza ese borde según lo que haya en el resto del mapa. Lo real del WebP sigue a menos error del mosaico que el mosaico comprimido solo (1,50 frente a 1,58). No se toca: las sondas son de orientación del mosaico y pasan donde se comprueban.
- **`scripts/usgs-mosaic.mjs`** (no es de esta entrega): una opción nueva, `maskAtSource`, mínima, que solo usan las lunas. La pide D48 («la máscara de cobertura umbralizada antes de reducir»).
- **`RECREACION_SIN_COMPROBAR=1`** (`build-textures.mjs`): el build mide todas las lunas sin fallar por los criterios, para verlas de una vez. Sin ella, falla como en la 9b.
- **Las máscaras, en `docs/informes/img/fase-10/lunas-mascaras/`** (las de la 9b se quedan en la suya, como registro de antes).

### Límites conocidos
La sesión de revisión miró las seis vistas «después» el 09-11: lo de D48 queda resuelto (sin la franja oscura del terminador, sin la recta de 180° y sin el camuflaje, y el casquete de Tritón, con el borde irregular). La revisión por subagente añadió los de Europa, Calisto y Ariel. Todos, salvo las coronas de Miranda, en el backlog (`docs/PLAN.md` §9, punto 16b):
- **Las costuras del mosaico original**, entre lo real visto de cerca y lo visto de lejos, ya presentes antes. No se tocan: lo real sigue igual byte a byte y lo visto de lejos conserva su brillo a gran escala (D45).
  - En Tritón, la recta hacia 13° N a 90° E y la diagonal.
  - En Deimos, las rectas hacia ±60° y los círculos de los polos.
  - En Europa, las tiras de Galileo en los dos polos y a 90° O.
  - En Calisto, el polo sur.
- **La línea fina del borde exterior de la luz rasante**, donde la franja toca lo no visto:
  - **En Oberón**, junto al ecuador (a −1° de latitud, de −20° a 110° de longitud, donde el borde de lo real del mosaico es recto). Se veía en la vista de 0° y, ampliada, centrando en 20° N y 90° E. En la textura de la primera vuelta, en la media de 55° a 85° E, el L\* bajaba de 44,6 a 43,1 en los 4 texeles junto a lo no visto (la revisión midió de 46,0 a 42,2 en dos filas). Con la mezcla de la respuesta a la revisión, el escalón queda en unas 0,4 L\*.
  - **En Umbriel**, junto a Wunda, aún se ve ampliada.
  - **De cerca no se ve con la fecha de hoy:** el ecuador cae junto al limbo. Con el Sol sobre el ecuador de Urano (su próximo equinoccio, hacia 2049), sí podría verse de cerca: el explorador llega a 2100.
- **Ariel: lo recreado (el 66,8 % de la luna) se ve casi liso:** un gris con puntos claros tenues y los trazos finos de los parches. Su real tiene poco contraste (1,09 L\* a gran escala), y el factor de sus cráteres (0,68) deja muchas manchas por debajo del umbral de lo real (§3.2). La mejora, que lo que da forma a su real (sus cráteres claros y sus valles) entre en su receta, como las coronas en Miranda.
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

## Respuesta a la revisión (`docs/revisiones/fase-10-entrega-lunas.md`)

Veredicto de la revisión: cambios necesarios, sin Bloqueantes. Corregidos los tres Importantes y los Menores, salvo lo que se dice; las texturas de las siete lunas de D48, rehechas (las demás, iguales byte a byte), con sus capturas, miniaturas e imágenes de las fichas.

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 1 | Importante | **Hecho.** La luz rasante ya no borra albedo (§3.1): en la franja se funden solo sus sombras y su borde con lo no visto (del 5 al 30 % de su anchura; antes, del 15 al 90 %); las sombras suben, en el mapa corregido, al brillo que se les pide; las islas de sombras sueltas se recrean enteras; y los accidentes con nombre (las sondas) no cuentan para medir la luz rasante ni se funden por el borde. Las sondas se miden también en la luz rasante corregida, y el build falla si una pierde su signo. En la textura final de 2k: Wunda, 1,06 (en el mosaico, 1,25; en la primera vuelta, sin medir); Belmont Chasma, 0,93 (0,80); Ursula, 1,19 (1,30). A la vista, Wunda vuelve a verse en la vista de 90° O (`lunas-umbriel-seis-vistas-despues.webp`), aunque menos marcado que con la franja oscura alrededor. **No se pide la mitad del contraste del mosaico:** en la franja, ese contraste lleva la luz de la foto (el anillo de Wunda, oscurecido junto al terminador; la oscuridad de Belmont Chasma es sobre todo la sombra negra de la fosa), que D48 manda corregir. |
| 2 | Importante | **Hecho.** Lo no visto ya no se iguala con medias en toda la zona: con el degradado del casquete de Tritón, oscilaba (§3.4). Queda la franja frente a lo real (plana, no oscila) y la pasada exacta, clase a clase, como un desplazamiento monótono desde el borde. **Criterio nuevo, que hace fallar el build:** el perfil de lo recreado por distancia al borde con lo real, clase a clase, sin surcos de más de 2 L\* hasta 5° (`borderProfile`). Medido en la textura final de Tritón, en todo su borde con lo no visto (cada 0,5°, hasta 5°): de 37,5 junto al borde a 43,2 (lo real, 38,7), sin reborde y con el surco más hondo en 1,13 L\* (la revisión medía, al norte de 30°, un reborde de 39,0–39,2 y un surco a 34,3–35,0, con lo real a 37,1–37,6). A la vista, sin el arco: queda el paso, suave, de lo real al casquete, más claro (`lunas-triton-explorador-escritorio-despues.webp`). |
| 3 | Importante | **Hecho.** ⚠️ en las filas con excepciones de §2 (las sondas, «de cerca», las demás lunas, el casquete de Tritón y lo recreado con forma de terreno, por Ariel); esta respuesta, aquí. |
| 4 | Menor | **Hecho:** Ariel, con ⚠️ y en los límites conocidos; la mejora de su receta, al backlog (16b). |
| 5 | Menor | **Hecho:** en §4 y en §2, lo visto de lejos de las demás lunas se vuelve a sintetizar (con las cifras de la revisión). |
| 6 | Menor | **Hecho:** Europa y Calisto, en los límites conocidos y en el 16b; la cifra de Oberón, corregida, y su línea, casi quitada por la mezcla nueva (de 1,5 a unas 0,4 L\* en la media de 55° a 85° E); dicho que de cerca podría verse con el Sol sobre el ecuador de Urano (hacia 2049). |
| 7 | Menor | (a) **Dicho, no rehecho:** la función de estructura del casquete se da en los puntos del ajuste y antes del ruido fino; el criterio, con ⚠️ (a la vista, irregular); medirla en la textura final, al backlog (16b). (b) **Hecho:** `node scripts/measure-moon-maps.mjs --natural` rehace la tabla de §4 (con las medias y sin la pendiente: `naturalSteps` y `naturalJumps`). |
| 8 | Menor | **Hecho:** el brillo medio a 2,8°, el contraste y el perfil hacen fallar el build, como el salto fino; `assertGrazingExtent` falla si la luz rasante sale de la franja o de la unión; y el comentario de `assertRealUnchanged` dice lo que guarda. |
| 9 | Menor | **Hecho:** `moon-recreation.ts` guarda cada fracción ya redondeada como su porcentaje (/creditos da lo mismo que `recreacion-lunas.md`), y `FUENTES.md`, corregido (Tritón visto de lejos, 36,3 %; Miranda no visto, 60,7 %; Ganímedes, 1,6 %; Tetis, 20,1 %; Jápeto, 30,8 %). |
| 10 | Menor | **Hecho:** fuera `craterGain`, el `calibrateCraters` de la cabecera y la condición siempre cierta; `preview-moon-recreation.mjs` dice que hace la síntesis de D45, sin lo de D48. |
| 11 | Sugerencia | **Hecho:** /creditos separa la luz rasante (junto al terminador) de la columna más oscura de la unión de 180°, y dice que sus sombras se funden con lo recreado. |
| 12 | Sugerencia | **Hecho:** la línea, en §4 («La luminancia media de las texturas»). |

## Dónde se queda (09-11, al cerrar)

- **Hecho, todo el plan:**
  - el método (§3);
  - la revisión por subagente (`docs/revisiones/fase-10-entrega-lunas.md`) y sus correcciones (la respuesta, arriba);
  - el build definitivo de las texturas, con ellas (09-11, 20:01, sin ningún «NO CUMPLE»): cambian las siete lunas de D48 (Miranda, Ariel, Umbriel, Titania, Oberón, Tritón y Deimos); las demás, iguales byte a byte;
  - las capturas antes y después: las seis vistas, de cerca en el explorador y la rejilla (las «después» de las siete, rehechas tras la revisión);
  - las miniaturas y las imágenes de las fichas de las 18 lunas (las de las siete, rehechas tras la revisión);
  - `FUENTES.md`, `/creditos` y «Lo que es ilustrativo»;
  - esta nota, con los límites conocidos (y el punto 16b del backlog);
  - `npm run check`, en verde (09-11, 20:45; las cifras, en §1).
- **Falta, fuera de esta sesión:**
  - que la sesión de revisión mire las capturas «después» rehechas (las seis vistas de las siete lunas, `lunas-<luna>-explorador-{escritorio,movil}-despues.webp` y la rejilla);
  - después, que la sesión 1 junte la rama (§6).
