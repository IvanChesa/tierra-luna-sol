# Informe: Fase 3b (Realismo de los planetas)

- **Rama:** `fase-3b-realismo`
- **Fecha:** 2026-10-26
- **Estado:** listo para revisión (modo autónomo por bloques, bloque R)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo, a partir de `docs/PLAN.md` (fase 3b), `docs/decisiones/FASE-3b-REALISMO.md`, la revisión del bloque B y el código del motor. Lo que cambie durante la ejecución se explica en §4.

### Entregas
| Entrega | Contenido |
|---|---|
| 3b.a | **Referencias y fotometría (D29).** `docs/realismo/referencias.md` con fotos reales enlazadas (misión, fecha y ángulo de fase). Funciones fotométricas en TS puro (`ephemeris/photometry.ts`): Lommel–Seeliger con pico de oposición, Minnaert y la aproximación de atmósfera, con sus curvas de fase integradas en el disco. Albedo geométrico de los planetas y la Luna en el catálogo (desde las fichas de la NASA, con `build-body-data.mjs`). Chunks GLSL comunes (`scene/materials/shading.ts`) y material de los cuerpos por tipo. Módulo de configuración visual (`scene/visual-config.ts`). Parámetro de captura para mirar un cuerpo desde la Tierra o con un ángulo de fase dado. |
| 3b.b | **Relieve de Mercurio y Marte.** `scripts/build-relief.mjs` (modelo de elevación → mapa de normales por nivel y, para la fase 6, elevación en 16 bits empaquetados, D15). MOLA (Marte, PDS) y MESSENGER (Mercurio, USGS). Mapa de normales en el sombreado. Evaluación de los mosaicos de color de Viking y MESSENGER. |
| 3b.c | **Gigantes y anillos.** Evaluación de los mapas de Hubble OPAL y Cassini (solo con licencia compatible). Urano y Neptuno. Anillos de Saturno: fotometría con la profundidad óptica (cara iluminada, cara oscura con la luz que atraviesa, contraluz), sombra del planeta y perfil radial comprobado con los bordes y huecos de la ficha de la NASA. |
| 3b.d | **Cielo, Sol y post-procesado.** Vía Láctea de ESO (CC BY 4.0) alineada con la matriz galáctica → ECL de `ephemeris/coordinates.ts`, testada con 3 objetos. Sol: oscurecimiento del limbo por canal con fuente, granulación procedural y halo. Tone mapping comparado (Neutral, AgX, ACES), bloom solo para el Sol y en alta, antialiasing. |
| 3b.e | **Órbitas, etiquetas, Tierra, calidad y dirección de arte; cierre.** Órbitas desvanecidas sobre los discos. Etiquetas. Arreglo de base de la Tierra. Versiones por nivel. Dirección de arte de la luz por vista. Capturas comparadas, mediciones, `npm run check`, informe, revisión por subagente, correcciones y fusión. |

### Diseño (decisiones de partida)
1. **La misma fórmula en TS y en GLSL.** Cada función de sombreado existe en `ephemeris/photometry.ts` (TS puro, testado) y en un chunk GLSL de `scene/materials/shading.ts` con la misma expresión. Los tests comprueban valores esperados y propiedades (reciprocidad, límites, Minnaert con k = 1 igual a Lambert) y, además, **integran la función sobre el disco** para obtener la curva de fase del cuerpo entero.
2. **Brillo calibrado con el albedo geométrico.** El albedo geométrico es el brillo medio del disco a fase 0 respecto a un disco lambertiano blanco. Cada cuerpo lleva un factor `albedo / (luminancia media de su textura × factor del disco de su modelo)`: así, a la misma luz, Venus (0,689) se ve unas cinco veces más brillante que Mercurio (0,142) o la Luna, como en el cielo. La luminancia media de cada textura (lineal y ponderada por el área) la mide `build-textures.mjs` y va en el manifiesto. Albedos: fichas individuales de la NASA (planetas y Luna) y del JPL (lunas, ya en el catálogo). La Tierra queda fuera de la calibración hasta la fase 5: su albedo incluye las nubes, que aún no se dibujan.
3. **Leyes de fase con fuente.** Los parámetros del pico de oposición y de la función de fase de los rocosos (Mercurio, la Luna) se ajustan para que la curva de fase integrada del modelo siga las leyes de magnitud de astronomy-engine, que vienen de la literatura (se documenta cuál). Test con tolerancia. Los gigantes usan Minnaert con un k por planeta: con fuente si la hay; si no, «ajuste visual» documentado.
4. **Atmósferas baratas.** Sin integrar la dispersión: un brillo en el limbo que depende de la iluminación, una banda de crepúsculo que suaviza el terminador y un halo fino por fuera del disco (esfera algo mayor con mezcla aditiva), con el tono de cada atmósfera. Parámetros en datos con su motivo.
5. **Relieve con mapas de normales del modelo de elevación.** Normales calculadas por diferencias finitas sobre la esfera (con el factor cos φ de la longitud) a partir del modelo de elevación oficial, con una exageración documentada. En el shader, el marco tangente (este, norte, arriba) sale de la posición en el sistema propio del cuerpo: no hacen falta atributos de tangentes.
6. **Anillos con un modelo de dispersión simple** de una capa de profundidad óptica τ (de la opacidad de la textura): la cara iluminada refleja ∝ μ₀/(μ₀ + μ)·(1 − e^(−τ(1/μ₀ + 1/μ))) y la oscura deja pasar ∝ μ₀/(μ₀ − μ)·(e^(−τ/μ₀) − e^(−τ/μ)); un lóbulo hacia delante suave para el contraluz. La opacidad vista depende de la inclinación (e^(−τ/μ)).
7. **Post-procesado dentro de `renderer.ts`** (lo único con WebGL): `EffectComposer` de `three/addons` solo cuando hay bloom (alta), con un render target de coma flotante y muestras MSAA; si no, el render directo de siempre. El tone mapping se elige con capturas comparadas.
8. **Órbitas sobre los discos:** el material de las líneas (`LineMaterial`, vía `onBeforeCompile`, sin tocar los chunks de profundidad) recibe los discos en pantalla de los cuerpos más grandes y desvanece los fragmentos que caen sobre ellos o muy cerca. La prueba de profundidad sigue ocultando lo que queda detrás.
9. **Un único módulo de configuración visual** (`scene/visual-config.ts`) con la exposición, el tone mapping, el relleno y los halos por vista y por encuadre (vista general frente a primer plano), cada valor con su motivo. La luz ambiente plana (`BODY_AMBIENT`) desaparece.
10. **Capturas comparables:** en el modo de captura, `desde=tierra` coloca la cámara en la línea Tierra → cuerpo (la geometría real de una foto del Hubble en esa fecha, con la misma fase y la misma inclinación de los anillos) y `fase=<grados>` fija el ángulo de fase para las fotos de sondas.
11. **Nada nuevo en el bundle inicial**; todo vive en `scene/` (diferido). Sin dependencias nuevas.

### Archivos
- Nuevos: `docs/realismo/referencias.md`; `src/app/ephemeris/photometry.ts` (+ test); `src/app/scene/materials/shading.ts`; `src/app/scene/visual-config.ts`; `scripts/build-relief.mjs`; `docs/informes/img/fase-3b/`.
- Tocados: `scene/materials/{body,ring,sun,milky-way}-material.ts`, `scene/{world,engine,renderer,quality,textures,texture-meta,orbits,types}.ts`, `scene/texture-files.ts` (generado), `ephemeris/coordinates.ts` (+ test), `data/body-data.ts` (generado) y `scripts/{build-body-data,build-textures,download-assets,capture,measure}.mjs`, `features/viewer/viewer-params.ts`, `/creditos`, `docs/FUENTES.md`.

### Dependencias
Ninguna nueva: el post-procesado es de `three/addons` (§1 del plan).

### Recursos que se descargan (a `assets-src/`, sin versionar)
- MOLA MEGDR de 16 px/° (`megt90n000eb.img`, 33 MB): PDS Geosciences Node, datos de la NASA.
- MESSENGER, modelo de elevación global de 665 m/px v2 (506 MB): USGS Astrogeology. «USGS-authored or produced data and information are considered to be in the U.S. Public Domain» (política del USGS); uso: citar a los autores (Becker et al., 2016).
- «The Milky Way panorama», ESO/S. Brunier (`eso0932a`, 6000 × 3000 px): CC BY 4.0, la licencia por defecto de las imágenes de ESO («Unless specifically noted…»); su página no indica ninguna excepción.

### Skills
`threejs-shaders`, `shader-glsl`, `threejs-materials`, `threejs-lighting`, `threejs-postprocessing` y `threejs-performance` como referencia puntual, adaptadas a three 0.186 dentro de `scene/`.

### Riesgos y dudas
1. **El modelo de Mercurio pesa 506 MB.** Se descarga una vez a `assets-src/`; si falla, se apunta y Mercurio se queda sin relieve (no es condición de parada: el criterio pide relieve, así que se reintentaría con otro producto oficial).
2. **Calibrar con el albedo oscurece Mercurio y la Luna** (es lo real). La exposición por vista lo compensa en parte en los primeros planos, documentado como dirección de arte.
3. **Bloom y MSAA en un render target** cuestan memoria y tiempo: solo en alta y medidos.
4. **Las fotos de sondas no tienen una geometría «desde la Tierra»:** se comparan con `fase=`.

### Estado de las entregas (se actualiza al cerrar cada una)
- **3b.a — hecha.** Albedo geométrico de los planetas y la Luna en el catálogo; `ephemeris/photometry.ts` con sus tests; `data/photometry.ts` con los parámetros ajustados a leyes de fase publicadas o de la literatura; chunks GLSL (`shading.ts`), material de los cuerpos por tipo con el brillo calibrado, halo de las atmósferas, `visual-config.ts`, órbitas desvanecidas sobre los discos y parámetros de captura (`desde`, `fase`, `latitud`, `tonemapping`); colores medidos en fotos reales.
- **3b.b — hecha.** `scripts/build-relief.mjs` (MOLA y MESSENGER), mapas de normales en los primeros planos y elevación en 16 bits empaquetados para la fase 6 (D15). Mosaicos de color de Viking y MESSENGER evaluados y descartados.
- **3b.c — hecha.** Anillos con la profundidad óptica de la ficha de la NASA y la reflectividad medida por el Hubble, cara oscura con la luz que atraviesa, contraluz, sombra del planeta sobre los anillos y de los anillos sobre el planeta, y luz de los anillos. Mapas de OPAL y Cassini evaluados y descartados.
- **3b.d — hecha.** Vía Láctea de ESO alineada con las coordenadas galácticas (y sin las estrellas del panorama); Sol procedural; tone mapping comparado (Neutral). Sin bloom (§4.1).
- **3b.e — hecha.** Etiquetas fuera de los discos y de los anillos; arreglo de base de la Tierra; ángulo de fase de un observador lejano; mediciones por vista y nivel; capturas, informe, `npm run check` y e2e.

## 1. Resumen
Los planetas dejan de ser bolas de plástico. Cada cuerpo tiene su modelo de luz (D29), con parámetros ajustados a leyes de fase publicadas (la Luna, Mercurio, Venus y Marte, a 0,013–0,117 mag RMS) o tomados de la literatura, el brillo de su albedo geométrico y una exposición por encuadre, como haría quien hace la foto. Mercurio y Marte tienen el relieve de sus modelos de elevación oficiales. Los anillos de Saturno llevan la profundidad óptica de la NASA y la reflectividad medida por el Hubble, se ven a contraluz y proyectan y reciben sombras. El Sol tiene el oscurecimiento del limbo medido y granulación, y el cielo, la Vía Láctea de ESO alineada con las coordenadas galácticas. La Tierra pierde el azul plano y saturado (el color de su océano se mide en fotos de EPIC). Sin dependencias nuevas y dentro de §5: 60 FPS en todas las vistas y niveles, VRAM de 150 MB como mucho en alta y 54 MB en baja, y 445 kB de texturas en la primera vista. Hay 30 capturas comparables con fotos reales.

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Comparativas lado a lado con las referencias reales, a un ángulo de fase parecido, para el Sol, Mercurio, Venus, Marte, Júpiter, Saturno, Urano y Neptuno | ✅ | §7.1: 12 capturas con la geometría de 12 fotos reales (fecha, ángulo de fase y latitud de astronomy-engine, Horizons o los metadatos de la imagen; `docs/realismo/referencias.md`), también de la Tierra, y 5 de detalle (terminadores, fases y la sombra de Saturno), cada una con su evaluación. Las fotos solo se enlazan (tarea 1: no se copian al repo). |
| Tests de las funciones de sombreado (limbo de Minnaert y Lommel–Seeliger) con valores esperados | ✅ | `ephemeris/photometry.spec.ts`, 34 tests: Lommel–Seeliger (2μ₀/(μ₀ + μ), reciprocidad de Helmholtz, disco uniforme en fase llena, curva de fase igual a la ley cerrada 1 − sen(α/2)·tan(α/2)·ln(cot(α/4))); Minnaert (k = 1 es Lambert, μ₀^k·μ^(k−1), brillo medio 2/(2k + 1), ley de fase de la esfera de Lambert); oposición, Henyey–Greenstein, atmósfera, limbo del Sol y anillos. `data/photometry.spec.ts`: las curvas de fase integradas siguen sus leyes publicadas (Luna < 0,02 mag RMS; Marte < 0,03; Venus < 0,11; Mercurio < 0,13). |
| Ninguna órbita se dibuja sobre el disco de un cuerpo (captura de Saturno y Júpiter como las de la fase 2) | ✅ | `escritorio-saturno.webp` y `escritorio-jupiter.webp`, y todas las comparativas: las líneas se desvanecen al llegar a cualquier disco (hasta 8, con un margen de un cuarto del radio, de 2 a 10 px) y la prueba de profundidad oculta lo que queda detrás. Limitación: la órbita del propio Saturno, tenue, cruza sus anillos (§4.12). |
| Mercurio y Marte muestran relieve con luz rasante (capturas en el terminador) | ✅ | `marte-terminador.webp` (Olympus Mons y los volcanes de Tharsis en el terminador) y `mercurio-terminador.webp` (cráteres). Alineación comprobada en el build: el punto más alto del MOLA a 1,4° de Olympus Mons y el más bajo a 11,6° de Hellas; correlación relieve–color de 0,344 (Marte) y 0,214 (Mercurio) alineados, frente a ≤ 0,134 y ≤ 0,029 girados. |
| Anillos de Saturno a contraluz (captura) y sombra del planeta sobre los anillos | ✅ | `saturno-cassini-2013.webp` (fase 176°, 17° por debajo de los anillos, como «The Day the Earth Smiled»: el anillo B, denso, se ve oscuro y el C y la división de Cassini brillan con la luz que atraviesan; la parte de los anillos que queda delante del planeta está en su sombra). `saturno-sombra.webp` (2017, fase 60°: la sombra del planeta cruza los anillos por detrás del globo). `saturno-hubble-2019.webp`: la sombra de los anillos sobre el globo. |
| FPS, VRAM y peso por vista dentro de §5 en los tres niveles (tabla) | ✅ escritorio | §6.2 (`node scripts/measure-views.mjs`): 60 FPS de media (mínimo 59) en todas las vistas y niveles; VRAM de 150 MB como mucho en alta (≤ 300) y 54 MB en media y baja (≤ 120); primera vista 445 kB en alta (≤ 2,5 MB) y 388 kB en baja (≤ 1,2 MB); vista Tierra +414 / +127 kB (≤ 6 / 2 MB); Luna +965 / +234 kB (≤ 10 / 3 MB). Los 30 FPS en un móvil de gama media están pendientes de la prueba de Iván (`docs/PENDIENTES.md`; no bloquea). |
| Vía Láctea de ESO alineada (captura con el centro galáctico en Sagitario) | ✅ | `jupiter-hubble-2019.webp`: en junio de 2019, Júpiter estaba a 8° del centro galáctico y detrás se ven las nubes de estrellas de Sagitario. También `tierra-epic-2016.webp` (en el solsticio de junio, el punto antisolar está en Sagitario), `urano-voyager-1986.webp` y `neptuno-voyager-1989.webp` (los dos planetas estaban junto al centro galáctico esos años). La matriz galáctica tiene tests con el centro galáctico, el polo norte galáctico y Vega (SIMBAD), y el build comprueba la orientación del panorama: centro 149, anticentro 56, polos 6 y Gran Nube de Magallanes 29 frente a 8 en el punto simétrico. |
| Todas las texturas y modelos de elevación nuevos en `FUENTES.md`, con una licencia compatible comprobada en la fuente | ✅ | ESO (CC BY 4.0, comprobada en su página el 26-10), MOLA (datos de la NASA en el PDS), modelo de elevación de MESSENGER (USGS, dominio público), medidas de EPIC (reutilización libre con crédito al NASA EPIC Team, comprobado en su página) y de Salo y French (2010), y la ficha de los anillos de la NASA. La fila del Sol desaparece (ya no tiene textura). También en `/creditos`. |
| Capturas de la vista general y de cada planeta en primer plano: al menos igual de atractivas que el original y más fieles a las fotos reales | ✅ (evaluación) | §7.2. |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 1. Referencias reales | hecha | `docs/realismo/referencias.md`: 13 fotos, la figura de Irwin et al. (2024) y las medidas de Salo y French (2010), con misión, fecha, ángulo de fase y cómo se calculó; tabla de los colores medidos. |
| 2. Chunks de sombreado | hecha | La misma fórmula en `ephemeris/photometry.ts` (TS puro, con tests) y en `scene/materials/shading.ts` (GLSL). Parámetros en `data/photometry.ts`, cada uno con su fuente o como «ajuste visual». Lunar-Lambert en los rocosos (§4.2). |
| 3. Relieve de Mercurio y Marte | hecha | `scripts/build-relief.mjs`: lee el GeoTIFF y la etiqueta del PDS, remuestrea por áreas, calcula las normales sobre la esfera con su exageración (Marte ×6, Mercurio ×2; §4.10) y empaqueta la elevación en 16 bits para la fase 6 (ida y vuelta comprobada). Solo se cargan en primer plano. Mosaicos de color descartados (§4.6). |
| 4. Gigantes | hecha | OPAL y Cassini evaluados, no se usan (§4.6). Urano y Neptuno con el color de Irwin et al. (2024) y las bandas de la textura, sin inventar detalles. Júpiter y Saturno con su Minnaert de la literatura y el color medido en el Hubble. |
| 5. Anillos de Saturno | hecha | Dispersión simple con la τ de cada anillo (ficha de la NASA), el albedo del A y el B a partir de la reflectividad medida por el Hubble (§4.3) y el matiz de cada anillo medido en la foto del Hubble de 2019; cara oscura, contraluz, sombras en los dos sentidos y luz de los anillos. Anillos tenues de Júpiter, Urano y Neptuno (opcionales): no. |
| 5b. Vía Láctea | hecha | Panorama de ESO (CC BY 4.0) en coordenadas galácticas, girado con la matriz de `ephemeris/coordinates.ts`; sin las estrellas del panorama (§4.8); 4k en alta y 2k en media y baja. |
| 6. Sol | hecha | Oscurecimiento del limbo de Allen (Cox, 2000), color de un cuerpo negro de 5772 K, granulación procedural (quieta con movimiento reducido y en las capturas) y halo. Una sola ley de limbo para los tres canales (§4.4). |
| 7. Post-procesado | parcial | Tone mapping comparado: **Neutral** (§5.4). Antialiasing: MSAA del lienzo. **Bloom: no** (§4.1). |
| 8. Órbitas y etiquetas | hecha | Órbitas desvanecidas sobre los discos. Las etiquetas ya iban por fuera del disco; ahora también por fuera de los anillos de Saturno, y las demás no se colocan encima (test nuevo en `labels.spec.ts`). |
| 9. Tierra, solo el arreglo de base | hecha | Océano con el color medido en EPIC (`build-textures.mjs`) y atmósfera con el perfil de su limbo (§4.7). Nubes, océano especular, luces y atmósfera completa, en la fase 5. |
| 10. Calidad por niveles | hecha | Tabla en §6.2. Versiones ligeras: relieve y primeros planos en 2k (4k en alta), Vía Láctea en 2k (4k en alta), halos de atmósfera que no se dibujan por debajo de 2 px y granulación barata (tres octavas de ruido de valor, solo en primer plano). |
| 11. Dirección de arte de la luz | hecha | `visual-config.ts`: relleno de 0,16 en la vista general y 0,004 en primer plano, con la mezcla según el tamaño del cuerpo enfocado en pantalla (8–90 px); exposición del primer plano según el brillo de la parte iluminada; tone mapping Neutral. Halos en la vista general: los de las atmósferas y el del Sol, sin halos aditivos por planeta. |

## 4. Desviaciones del plan y motivo

### 4.1 Sin bloom (y sin `EffectComposer`)
Se implementó con `three/addons` (`EffectComposer`, `RenderPass`, `UnrealBloomPass` y `OutputPass`, solo en alta, con un render target de media precisión y 4 muestras de MSAA) y se revirtió entero. El fondo dejaba de coincidir con el de la página: el color de borrado pasa por el render target como un valor lineal y sale aclarado por el tone mapping (comprobado con un borrado negro). Además, en alta añade dos render targets a la resolución del lienzo con su densidad y varias pasadas por frame. El resplandor ya lo da el halo del Sol (3,2 radios en la vista general y 1,7 en primer plano), y el antialiasing es el MSAA del lienzo (`antialias: true`). No queda código muerto. **Propuesta (§10):** quitar el bloom de la tarea 7 o llevarlo al backlog; si se retoma, con el fondo pintado dentro de la escena y no como color de borrado.

### 4.2 Lunar-Lambert en lugar de Lommel–Seeliger puro en los rocosos
D29 pide Lommel–Seeliger con un pico de oposición sencillo. Con Lommel–Seeliger puro, la curva de fase de Mercurio se aleja 0,29 mag RMS de la ley de Hilton (2005): a fases grandes, el limbo sale demasiado brillante. Se usa la mezcla lunar-Lambert de McEwen (1991): Lommel–Seeliger con un peso que baja con la fase hacia Minnaert, L(α) = clamp(L₀ − s·α, 0, 1). Con L = 1 es Lommel–Seeliger. Con `scripts/fit-photometry.mjs`, Mercurio queda a 0,117 mag RMS y la Luna, a 0,013.

### 4.3 Anillos: la opacidad y el brillo salen de medidas, no de la textura
La opacidad de la textura de Solar System Scope es artística (la división de Cassini tenía τ ≈ 0,56; la ficha de la NASA da 0–0,1). De la textura solo queda la estructura radial: cada anillo se lleva a su intervalo de τ de la ficha (comprobado en el build: C 0,16, B 1,35, Cassini 0,02, A 0,45 de mediana). El matiz de cada anillo se mide en la foto del Hubble de 2019, porque el de la textura salía morado en los anillos tenues. El brillo se calibró con la reflectividad del Hubble en F555W (Salo y French, 2010, tabla 5: I/F = 0,465 en el anillo B y 0,297 en el A, a 6° de fase con los anillos abiertos 23,6°). El albedo de la tira pasa de 0,49 a 0,533 en el B y a 0,40 en el A (el mínimo de la ficha). Así, el A ya es más gris que el B, como en las fotos.

### 4.4 Sol sin textura y con una sola ley de limbo
La textura del Sol (una fotosfera con manchas inventadas) se sustituye por un sombreado procedural. El plan de la fase (§0, entrega 3b.d) pedía el oscurecimiento del limbo «por canal». Se usa una sola ley, la de 550 nm de Allen (Cox, 2000: 0,3 + 0,93·μ − 0,23·μ²), para los tres canales. Queda como mejora el borde algo más rojizo de las fotos. La intensidad del primer plano (0,85) se eligió para que el tone mapping no aplane el limbo: el borde queda al ~33 % del centro, cerca del 30 % de la ley.

### 4.5 El tono de las atmósferas sale de las fotos, no del documento de origen
`docs/decisiones/FASE-3b-REALISMO.md` proponía un limbo «anaranjado en Marte» y «azulado en la Tierra». En la foto del Hubble de 2016, el limbo de Marte es una neblina blanquecina y azulada (hielo de agua), y en las fotos de EPIC el de la Tierra es casi blanco y se aclara desde 0,8 radios, sin halo visible por fuera del disco. Se sigue a las fotos. Titán mantiene su neblina anaranjada.

### 4.6 Fuentes evaluadas y no usadas
- **Mosaico de color de Viking (Marte):** la textura sale de esas misiones y su exceso de saturación se corrige con el color medido en el Hubble, sin descargar un mosaico de varios gigas.
- **Mosaico de MESSENGER (Mercurio):** el de Solar System Scope ya sale de él, está alineado y su gris coincide con PIA12371.
- **Mapas de OPAL (Júpiter):** son mapas científicos por filtro (FITS) de un año concreto; habría que componer el color. Se usa su color medio.
- **Mapas de Cassini (Saturno):** no hay un mapa global en color con una licencia clara.

Detalle en `docs/FUENTES.md`.

### 4.7 Tierra: se corrige el color, no la relación de brillo entre océano y tierra
El océano de la textura es un color plano y saturado (RGB lineal / luminancia 0,276 / 0,929 / 3,835 en todo el océano abierto). Se mide en tres fotos de EPIC del 21-06-2016 (Pacífico, Atlántico e Índico): cada píxel a menos de 0,6 radios del centro se lleva a su latitud y longitud, se quedan los de agua de la máscara especular y, de ellos, el 20 % más oscuro (sin nubes). La media da 0,683 / 1,029 / 1,651, y `build-textures.mjs` lleva el océano a ese color conservando la luminancia de cada píxel (comprobado: queda en 0,682 / 1,029 / 1,651). En EPIC, el océano es unas dos veces más claro respecto a los desiertos que en la textura (por la luz que dispersa la atmósfera). Eso no se corrige: la curva de brillo de las imágenes de EPIC no está documentada («color and brightness adjusted to represent what a conventional camera would produce»). Queda para la atmósfera de la fase 5 (§10).

### 4.8 Vía Láctea sin las estrellas del panorama
Las estrellas del panorama de ESO salían como trazos en los primeros planos (la proyección equirrectangular galáctica las estira lejos del plano de la Galaxia) y repetían las del catálogo HYG. El build aplica una mediana de 5 × 5 px sobre el original, la técnica clásica para quitar estrellas puntuales: conserva la luz difusa, las nubes de estrellas, el polvo y objetos extensos como las Pléyades. De paso, la textura 4k pasa de 433 kB a 79 kB (y la 2k, de 181 a 21 kB).

### 4.9 La granulación solo avanza cuando el motor pinta
La regla del render bajo demanda manda: con el Sol enfocado y en pausa no se pinta (0 frames en reposo, medido). La granulación cambia con el reloj de pared en cada frame que se pinta (reproducción o movimiento de cámara) y se queda quieta con movimiento reducido y en las capturas.

### 4.10 Exageración del relieve
Las pendientes reales a escala de un primer plano son de pocos grados: sin exagerar, el relieve no se vería ni con luz rasante. Marte ×6 y Mercurio ×2 (con ×6, Mercurio quedaba demasiado oscuro en el terminador). Documentado en `build-relief.mjs`.

### 4.11 Las comparativas desde la Tierra, a las 12:00 UT
Cuando la página de la foto solo da el día, la captura usa las 12:00 UT: el ángulo de fase apenas cambia en unas horas, pero la cara que se ve sí. Por eso `marte-hubble-2016` muestra Valles Marineris en vez de Syrtis Major y `jupiter-hubble-2019`, el lado sin la Gran Mancha Roja. La comparación es de color, luz y limbo (`docs/realismo/referencias.md`).

### 4.12 Limitaciones visibles conocidas
- **Saturno a contraluz:** donde el limbo del planeta queda en la sombra de los anillos, no se ve el anillo de luz de su atmósfera; en PIA17172 rodea todo el planeta.
- **La órbita del propio planeta enfocado cruza sus anillos** (tenue, con una opacidad de 0,3: indica hacia dónde se mueve). El desvanecimiento es circular y, extendido a los anillos, borraría tramos de las órbitas de las lunas.
- **Urano no tiene el casquete polar brillante** de la foto de 2021: la textura no lo tiene y no se inventa.
- **El globo de Saturno sale más brillante que el anillo B** a fase baja (en lineal, el anillo B vale un 53 % del centro del globo; con las medidas, debería rondar el 80 %). El albedo geométrico del globo (0,499, NASA) y la reflectividad de los anillos (Hubble) vienen de fuentes distintas; no se ajusta uno a ojo para cuadrar el otro.
- **FPS medidos solo en escritorio** (RTX 3060). El móvil, cuando Iván pueda.

### 4.13 Archivos distintos de los previstos
- `scripts/capture.mjs` y `scripts/measure.mjs` no se tocan. Las capturas de la fase salen de `scripts/capture-realism.mjs` y la tabla por vista, de `scripts/measure-views.mjs` (los dos, nuevos).
- Nuevos que no estaban en la lista: `data/photometry.ts` (+ test), `scene/camera/view-from.ts` (+ test), `scene/materials/atmosphere-material.ts`, `scripts/fit-photometry.mjs` y `scripts/reference-geometry.mjs`.
- `scene/texture-meta.spec.ts` se actualiza para el panorama de ESO y los mapas de relieve.

## 5. Decisiones técnicas nuevas

### 5.1 La fotometría usa el ángulo de fase de un observador lejano
La cámara de un primer plano está a unos radios del cuerpo: es un recurso de encuadre (en la escala ilustrativa, ni siquiera es una distancia real), no la posición de una sonda. Con el ángulo de fase de cada punto, las ansas de Saturno se veían a unos 20° de fase en vez de a los 2° de la foto del Hubble, y el pico de oposición las apagaba un 30 % (medido en las capturas antes y después: el anillo B pasa de una luminancia de 0,24 a 0,35, la que predice la fórmula). La función de fase, el peso de lunar-Lambert y el refuerzo a contraluz usan el ángulo Sol–centro del cuerpo–cámara, igual en todo el disco, que es el de una foto tomada desde lejos. μ₀ y μ siguen siendo los de cada punto, para que el sombreado coincida con la silueta. Lo mismo en los anillos y en el halo de las atmósferas. Es coherente con las curvas de fase de `photometry.spec.ts`, que integran el disco con un ángulo de fase único.

### 5.2 El brillo se calibra con el albedo geométrico y la luminancia media de cada textura
Cada cuerpo lleva el factor albedo / (luminancia media lineal de su textura × factor del disco de su modelo). La luminancia media, ponderada por el área, la mide `build-textures.mjs` y va en el manifiesto (`TEXTURE_MEAN_LUMINANCE`). Así, a la misma luz, Venus (0,689) se ve unas cinco veces más brillante que Mercurio (0,142). La Tierra no se calibra hasta la fase 5 (su albedo incluye las nubes).

### 5.3 Exposición por encuadre con el brillo de la parte iluminada
En primer plano, la exposición compensa el brillo del cuerpo enfocado: (0,4 / (albedo × brillo medio de su parte iluminada a esa fase))^0,8, entre 0,6 y 6. La tabla del brillo de la parte iluminada se calcula al enfocar con el modelo del cuerpo (`litBrightnessTable`). Así, una fase creciente se expone más, como en las fotos, y los cuerpos claros no se queman. En la vista general, la exposición es la misma para todos (D21).

### 5.4 Tone mapping Neutral
Comparado con capturas (`tonemapping-{neutral,agx,aces}-{saturno,sistema}.webp`). Medido en el centro del globo de Saturno: con Neutral, la cromaticidad es 1,35 / 0,95 / 0,52 (en la foto del Hubble, 1,36–1,46 / 0,91–0,94 / 0,51–0,57); AgX la desatura (1,18 / 0,97 / 0,74) y ensancha y agrisa el halo del Sol, y ACES la desatura (1,17–1,20 / 0,97 / 0,65–0,71) y aclara el globo (entre un 15 y un 30 % más de luminancia). Neutral conserva el color medido en las fotos. Con el parámetro de captura `tonemapping=` se puede repetir la comparación.

### 5.5 Parámetros de captura para comparar con fotos reales
Solo en el modo de captura: `desde=tierra` (la línea Tierra → cuerpo de la fecha, para las fotos del Hubble), `fase=` y `latitud=` (para las fotos de sondas) y `tonemapping=`. No cambian la experiencia normal ni la URL pública.

### 5.6 Correcciones de textura en el build, con su comprobación
El color del océano (con la máscara de agua), la tira física de los anillos y la Vía Láctea sin estrellas se generan en `build-textures.mjs`. Cada paso falla si el resultado no queda donde debe (el océano en el color medido, la τ de cada anillo en su intervalo, la orientación del panorama). Los ficheros generados no se editan a mano.

### 5.7 Etiquetas con el tamaño en pantalla de los anillos
`layoutLabels` recibe, por cuerpo, cuánto ocupa en radios de su disco (Saturno: el borde exterior del anillo A, 2,27 radios). Su nombre va por fuera y los demás no se colocan encima.

## 6. Salida de los checks
Repetidos el 26-10 sobre el código final.
```
npm run check                                   (código 0)
> ng lint && prettier --check .
All files pass linting.
All matched files use Prettier code style!
> ng test --watch=false
 Test Files  51 passed (51)
      Tests  415 passed (415)
All files (ephemeris/)  |   99.65 |    96.78 |     100 |     100
> ng build
Initial chunk files | Names    |  Raw size | Estimated transfer size
main-…js            | main     | 289.29 kB |                79.67 kB
styles-…css         | styles   |   6.57 kB |                 1.82 kB
                    | Initial total | 296.32 kB |            81.96 kB
Lazy chunk files
chunk-…js           | index        | 661.49 kB | 144.95 kB   (three + motor)
chunk-…js           | explorer-ui  | 223.13 kB |  58.56 kB   (astronomy-engine, stores e interfaz)
chunk-…js           | viewer-layout|   7.00 kB |   2.25 kB
Prerendered 17 static routes.
> node scripts/check-initial-bundle.mjs
✔ El JS inicial de las 18 páginas (6 ficheros) no lleva ningún módulo de three ni de astronomy-engine
  ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 11.61 kB de 15.00.
```
Sin avisos de presupuesto. El JS inicial no cambia (296,32 kB, aviso a 320). El chunk del visor sube de 636,67 a 661,49 kB (+24,8 kB: el sombreado, la fotometría y la configuración visual; aviso a 900 kB) y la interfaz diferida, de 220,07 a 223,13 kB.

```
npm run e2e
  45 passed (2.1m)
```

### 6.1 Mediciones generales (`node scripts/measure.mjs`, 26-10; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Medida | Resultado | Objetivo (§5) |
|---|---|---|
| Reproducción a 1 día/s (alta, media y baja) | 60 FPS de media y de mínimo en los tres · 1,68 / 1,45 / 1,18 ms de CPU por frame · 0,13–0,16 ms de efemérides · 43 llamadas | ≥ 55 ✅ · ≤ 2 ms ✅ |
| Reposo (3 s en pausa) | 0 frames · 0 `requestAnimationFrame` | ✅ |
| Store a 1 año/s | 4,8 actualizaciones por segundo | ≤ 5 ✅ |
| URL durante 5 s de reproducción | 0 cambios | ✅ |
| Memoria tras 10 idas y vueltas explorador ↔ `/planetas`, 10 cambios de vista y 6 de calidad | 7 geometrías · 11 texturas · 10 MB de heap · 1 contexto WebGL vivo · 1 lienzo, sin cambios | sin crecimiento ✅ |
| Contexto WebGL perdido y recuperado | `contextLost` → `contextRestored`, 0 frames mientras está perdido y la fecha cambiada se conserva (`contexto-recuperado.webp`) | ✅ |
| Primera vista (`/`, alta) | JS 1154 kB, texturas 375 kB, estrellas 70 kB, póster 27 kB, fuentes 52 kB · una tarea larga de 82 ms (ninguna en baja) · LCP: `img.poster` a 168 ms | texturas ≤ 2,5 MB ✅ · sin tareas > 200 ms ✅ · el LCP no es el lienzo ✅ |

### 6.2 FPS, VRAM y peso por vista y nivel (`node scripts/measure-views.mjs`, 26-10, la misma GPU)
Una página por nivel recorre las vistas sin recargar. El peso es lo que se descarga en cada paso (texturas y catálogo de estrellas; cada fichero cuenta una vez, porque al volver lo sirve la caché). Los FPS son la media y el mínimo de 4 s de reproducción a 1 día/s.

| Vista | Alta: peso · VRAM · FPS (mín.) | Media | Baja | §5 |
|---|---|---|---|---|
| Sistema solar (primera vista) | 445 kB · 67 MB · 60 (60) | 388 kB · 35 MB · 60 (60) | 388 kB · 35 MB · 60 (60) | ≤ 2,5 MB alta / ≤ 1,2 MB baja ✅ |
| Marte en primer plano (relieve) | +1588 kB · 150 MB · 60 (60) | +397 kB · 54 MB · 60 (59) | +397 kB · 53 MB · 60 (60) | VRAM ≤ 300 / ≤ 120 ✅ |
| Saturno en primer plano (anillos) | +83 kB · 107 MB · 60 (60) | +28 kB · 43 MB · 60 (60) | +28 kB · 43 MB · 60 (59) | ✅ |
| Sol en primer plano | +0 kB · 67 MB · 60 (60) | +0 kB · 35 MB · 60 (60) | +0 kB · 35 MB · 60 (60) | ✅ |
| Vista Tierra | +414 kB · 107 MB · 60 (59) | +127 kB · 43 MB · 60 (60) | +127 kB · 43 MB · 60 (60) | ≤ 6 MB / ≤ 2 MB adicionales ✅ |
| Vista Luna | +965 kB · 147 MB · 60 (59) | +234 kB · 51 MB · 60 (60) | +234 kB · 51 MB · 60 (59) | ≤ 10 MB / ≤ 3 MB adicionales ✅ |

- **Vía Láctea:** 79 kB en alta (4k) y 21 kB en media y baja (2k), frente a ≤ 1,5 MB / 400 kB. **Estrellas:** 70 kB (≤ 250 kB).
- Al dejar un primer plano, la VRAM vuelve a la de la vista general (por ejemplo, de 150 a 107 MB al pasar de Marte a Saturno y a 67 MB con el Sol): las texturas de 4k y el relieve se liberan.
- Media y baja descargan lo mismo (1k en la vista general y 2k en primer plano). Cambian la densidad de píxeles (1,5 y 1), los segmentos de las esferas (72 y 48) y de las órbitas (256 y 180), la magnitud límite de las estrellas (6 y 5,5) y el filtrado anisótropo (4 y 1).
- Frente a la fase 3, la VRAM sube 40 MB en alta (la Vía Láctea 4k con sus mipmaps) y 8 MB en media y baja (la 2k).

## 7. Capturas
En `docs/informes/img/fase-3b/`, deterministas (`?captura=1`), con `node scripts/capture-realism.mjs docs/informes/img/fase-3b`. Las comparativas son cuadradas (900 × 900, solo el lienzo); el resto, de escritorio (1600 × 900) y móvil (390 × 844 a 2×). Los pósters de `public/img/` se han regenerado con `node scripts/build-poster.mjs`.

### 7.1 Comparativas con fotos reales (la foto, enlazada en `docs/realismo/referencias.md`)
| Captura | Foto de referencia | Geometría | Evaluación |
|---|---|---|---|
| `sol-sdo-2024` | SDO/HMI, 10-05-2024 | — | Disco blanco cálido con el limbo oscurecido (el borde al ~33 % del centro, como la ley de Allen) y un halo suave. Sin manchas: la granulación procedural no inventa regiones activas. |
| `mercurio-messenger-2009` | PIA12371 (MESSENGER) | fase 110° | Fase creciente gris con cráteres y relieve en el terminador; el gris coincide con el de la foto. |
| `mercurio-terminador` | — | fase 80° | Relieve con luz rasante. |
| `venus-messenger-2007` | PIA10124 (MESSENGER) | fase 23° | Disco casi lleno, nubes con poco contraste (0,3 del de la textura) y limbo brillante, como en la foto en luz visible. El color es crema algo más saturado que el de la foto (en grises; la textura es amarillenta). |
| `venus-fase-150` | — | fase 150° | Creciente fina con el limbo iluminado por la dispersión hacia delante. |
| `tierra-epic-2016` | EPIC (DSCOVR), 21-06-2016 22:58 UT | fase 9,4°, latitud 22,3° | La misma cara (Hawái en el centro, Norteamérica a la derecha) y el mismo tono del océano entre las nubes; limbo blanquecino sin halo de neón. Faltan las nubes, el brillo especular y la dispersión de la atmósfera (fase 5). |
| `marte-hubble-2016` | heic1609 (Hubble) | fase 8,4°, latitud 8,6° | Naranja apagado (el color medido en la foto, al 75 %) y neblina blanquecina en el limbo. A las 12:00 UT se ve otra cara (§4.11). |
| `marte-terminador` | — | fase 80° | Olympus Mons y Tharsis con luz rasante. |
| `jupiter-hubble-2019` | OPAL 2019 (Hubble) | fase 3,4° | Bandas crema y ocres con el color medido y el limbo de Minnaert; la foto tiene más contraste y la Gran Mancha Roja (otra cara a las 12:00 UT). Detrás, el centro galáctico. |
| `saturno-hubble-2019` | OPAL 2019 (Hubble) | fase 2,0°, anillos abiertos 24° | Globo con su color medido y anillos con su estructura: B claro, A más gris, división de Cassini oscura y C tenue y azulado (como en la foto). La sombra de los anillos sobre el globo. El globo sale algo más brillante que el anillo B (§4.12). |
| `saturno-cassini-2013` | PIA17172 (Cassini) | fase 176°, 17° por debajo | Contraluz: el B oscuro, el C y la división de Cassini brillantes, la sombra del planeta sobre los anillos que tiene delante y el lado nocturno con la luz de los anillos. Falta el anillo de luz del limbo en la sombra de los anillos (§4.12). |
| `saturno-sombra` | — | fase 60°, 30° por encima | La sombra del planeta cruza los anillos por detrás del globo; el hexágono del polo norte. |
| `urano-hubble-2021` | OPAL 2021 (Hubble) | fase 0,5°, latitud 54,6° | Cian pálido (Irwin et al., 2024); sin el casquete polar de la foto (§4.12). |
| `urano-voyager-1986` | PIA18182 (Voyager 2) | fase 13,8° | Disco cian verdoso sin rasgos, como en la foto. Detrás, la Vía Láctea (Urano estaba junto al centro galáctico en 1986). |
| `neptuno-hubble-2021` | OPAL 2021 (Hubble) | fase 0,2° | Azul pálido con bandas tenues (el color de Irwin et al. corrige el azul exagerado de las primeras imágenes de Voyager). |
| `neptuno-voyager-1989` | PIA01492 (Voyager 2) | fase 15° | Azul pálido con nubes claras y bandas, más cercano a la reconstrucción de 2024 que a la imagen realzada de 1989. |
| `luna-fase-90` | — | fase 90° | Cuarto con relieve fotográfico en el terminador y el lado nocturno casi negro. |

### 7.2 Vista general y primeros planos: evaluación
- **Vista general** (`escritorio-sistema`, `movil-sistema`): los planetas se leen bien con el relleno ilustrativo y el Sol deslumbra con su halo. El fondo tiene la Vía Láctea tenue alineada con el cielo real. Frente al original (relleno de 0,7, ACES y un halo por planeta), es más sobria y sin lado nocturno iluminado, pero igual de legible.
- **Primeros planos:** cada planeta se parece a su foto en color (medido), limbo (Minnaert y neblinas) y luz (lado nocturno casi negro, terminador con relieve en Mercurio y Marte, anillos con contraluz). A juicio del autor, más fieles que las de la fase 3 y que el original, y al menos igual de atractivos. La evaluación final es de la revisión.
- **Tierra** (`escritorio-tierra`, `movil-tierra`): azul apagado y limbo blanquecino, como una Tierra sin nubes vista desde el espacio. Hasta que lleguen las nubes de la fase 5 se ve más sobria que con el azul saturado de antes, pero es lo real.
- **Tone mapping:** `tonemapping-*` (§5.4).

## 8. Dependencias añadidas
Ninguna. Todo es de three, astronomy-engine, sharp y Playwright, que ya estaban.

## 9. Pendientes y `TODO(ivan)`
- Pruebas en el móvil real (ya en `docs/PENDIENTES.md`): los 30 FPS en baja también en los primeros planos de esta fase.
- Ningún `TODO(ivan)` nuevo.

## 10. Propuestas de cambio al plan
1. **Tarea 7 de la fase 3b:** quitar el bloom (§4.1) o llevarlo al backlog (§9 del plan).
2. **Fase 5 (Tierra):** que la atmósfera dé la relación de brillo océano / tierra de las fotos de EPIC (el océano unas dos veces más claro respecto a los desiertos que en la textura). Si la dispersión se integra, el color del océano de la textura debería volver al de la superficie para no contar dos veces la atmósfera (§4.7).
3. **Backlog:** el anillo de luz del limbo de Saturno a contraluz dentro de la sombra de los anillos; el oscurecimiento del limbo del Sol por canal (§4.4); un desvanecimiento elíptico de las órbitas sobre los anillos (§4.12).

## 11. Cómo probarlo
```
npm run build
node scripts/capture-realism.mjs docs/informes/img/fase-3b   # todas las capturas de la fase
node scripts/capture-realism.mjs <carpeta> saturno           # solo las de un cuerpo
node scripts/measure-views.mjs                               # la tabla de §6.2
npm start
```
En el navegador:
- `/?cuerpo=saturno&fecha=2013-07-19T21:30Z` y gira la cámara por debajo de los anillos con el Sol detrás: contraluz y sombra.
- `/?cuerpo=marte` y acerca la cámara al terminador: relieve con luz rasante.
- `/?cuerpo=jupiter&fecha=2019-06-27T12:00Z`: detrás de Júpiter, el centro de la Vía Láctea.
- Con el modo de captura se reproducen las fotos de `docs/realismo/referencias.md`, por ejemplo `/?captura=1&cuerpo=tierra&fecha=2016-06-21T22:58Z&fase=9.4&latitud=22.3`.
