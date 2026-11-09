# Fase 10, entrega 10.a: las lunas recreadas, segunda vuelta (D48)

- **Rama:** `fase-10a-lunas`, desde `main` (`89e77f9`), en su worktree (`.claude/worktrees/fase-10a-lunas`), con `CAPTURE_PORT=4360` y `E2E_PORT=4411`.
- **Fecha:** 2026-11-09
- **Estado:** en curso (cortada por el límite de uso el 09-11 a las 15:15; «Dónde se queda», al final).
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

(Al terminar.)

## 2. Criterios de aceptación

(Al terminar, con las cifras del build.)

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

### 3.3 El casquete de Tritón (`scripts/lib/moon-recipes.mjs`)
- **El polígono, explicado, con dos causas.** (1) La frontera del casquete del norte era un ruido de muy baja frecuencia (±14° en torno a 47°, con una transición de 4°): casi un círculo de lados planos. (2) En el nivel grueso de la síntesis, el brillo regional se desenfocaba cara a cara del cubo, con el borde repetido y una σ mayor que su margen (16 px con 16 de margen): cada cara daba otro brillo junto a sus aristas, y el casquete tomaba la forma de la cara del polo, un cuadrado redondeado a unos 45° de él. Ahora se desenfoca una vez sobre la esfera y se muestrea en las caras (en todas las lunas).
- **El borde del norte, con la estadística del sur real:** el del sur se mide donde lo vio la Voyager (`capBoundary`: donde el L\*, desenfocado 1°, pasa del brillo de fuera al del casquete, con 3° de cada lado), con su función de estructura (cuánto cambia la latitud del borde a cada distancia sobre la esfera). El del norte, en torno a 47° como en la 9b, es una suma de cosenos con fases al azar (semilla fija) y amplitudes en ley de potencias, con la función de estructura del sur de 5° a 20°; lo más fino, un ruido isótropo sobre la esfera (con solo la longitud, las ondas finas salían como rayos hacia el polo). La transición, la del sur.
- **Fuera del casquete, el brillo de lo que no es casquete** (lo real al norte de −30°: la «piel de melón» y las llanuras), y no el de lo visto extendido, que lejos de lo real era la media de todo lo visto, casquete sur incluido, y el del norte no se distinguía; y, junto a su borde, el collar más oscuro que tiene el del sur real (su brillo, el de lo real de 0,5° a 12° al norte del borde sur).

### 3.4 El borde, la mezcla y el grano (`scripts/lib/moon-map-build.mjs`)
- **«La misma media» (regla 4 de D45), en dos escalas:** junto a lo real intacto, el brillo medio de la franja (y después el de lo no visto, frente a lo real y la franja) se lleva al de lo real, a σ = 16 texeles (2,8°) y a σ = 4, en tres vueltas (cada escala mueve un poco la otra). En las lunas de Urano y en las que tienen más de un 2 % sin ver (Tritón y Deimos). No toca lo real, lo visto de lejos (su brillo a gran escala es el real) ni la unión de 180°.
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
  - las miniaturas y las imágenes de las fichas de las lunas (`public/img/cuerpos/`, `public/img/fichas/`), rehechas con las texturas nuevas;
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

## Dónde se queda (09-11, 15:15)

- **Hecho y confirmado:** el método entero (§3) en `scripts/lib/moon-*.mjs`, `build-textures.mjs`, `measure-moon-maps.mjs`, `usgs-mosaic.mjs` y `capture-moon-views.mjs`; las capturas «antes» (las seis vistas de las 19 lunas, las seis de cerca en el explorador y la rejilla); las filas de las lunas de `FUENTES.md` y la línea de «Lo que es ilustrativo».
- **El build anterior de las texturas** (sin la última pasada del brillo medio) ya cumplía todo lo que hace fallar el build (grano, salto fino frente a lo natural, lo real igual byte a byte) y el contraste de las cinco de Urano (de 0,92 a 1,06); el brillo medio a 2,8° pasaba de 2 en Oberón (3,15), Miranda (3,32), Titania (2,52) y Deimos (4,18 y 3,84). La última pasada (`matchBorderExact`) los deja, en las pruebas, en 0,91, 1,19, 0,56 y 1,86.
- **En marcha al cortar:** el build definitivo de las texturas (`RECREACION_SIN_COMPROBAR=1 node scripts/build-textures.mjs`), que regenera `public/textures/`, `texture-files.ts`, `moon-recreation.ts`, `recreacion-lunas.md` y las máscaras. Sus salidas quedan en el worktree, sin confirmar.
- **Falta:**
  1. revisar su log (los avisos de D48 y que no haya «NO CUMPLE») y que solo cambien las texturas de las lunas;
  2. confirmar las texturas y los generados junto con `/creditos` (`credits-page.{ts,html}` lee `grazing`, que trae el `moon-recreation.ts` nuevo) y la fila de lo recreado de `FUENTES.md` (`python assets-src/tmp-10a/fuentes-96.py`);
  3. las capturas «después»: `node scripts/capture-moon-views.mjs docs/informes/img/fase-10 --prefijo=lunas`; `npm run build` y, con `CAPTURE_PORT=4360`, `capture-moon-views.mjs … --explorador --prefijo=lunas --sufijo=despues` y la rejilla (`capture-moons.mjs`, copiada a `lunas-rejilla-despues.webp`); mirarlas todas;
  4. las miniaturas y las imágenes de las fichas de las lunas (`build-body-thumbnails.mjs`, devolviendo las que no son de lunas; `render-body-images.mjs --solo=…`);
  5. la población de lo recreado frente a la de lo real (`node assets-src/tmp-10a/population.mjs miranda ariel umbriel titania oberon`), §1 y §2 de esta nota;
  6. `npm run check`, la revisión por subagente (el encargo, en `assets-src/tmp-10a/encargo-revision.md`), sus correcciones y el push.
