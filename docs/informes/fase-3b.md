# Informe: Fase 3b (Realismo de los planetas)

- **Rama:** `fase-3b-realismo`
- **Fecha:** 2026-10-26
- **Estado:** en curso (modo autónomo por bloques, bloque R)

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
- 3b.a — en curso.
