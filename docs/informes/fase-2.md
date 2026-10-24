# Informe: Fase 2 (Motor 3D y escena base)

- **Rama:** `fase-2-motor`
- **Fecha:** 2026-10-24
- **Estado:** en curso (modo autónomo por bloques, bloque B)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo. Lo que cambie durante la ejecución se explica en §4.

### Entregas
| Entrega | Contenido |
|---|---|
| 2.a | `ephemeris/system-state.ts` (30 cuerpos en una llamada, caché por instante, coste medido); `ephemeris/orientation.ts` (IAU con `RotationAxis`, la Tierra con `earthFixedToEcl`, lunas síncronas; tests de libración y de apertura de los anillos); `flatteningRatio` con fuente en `build-body-data.mjs`; marco «sistema local físico» y transiciones en `ephemeris/scale.ts`; contrato de `SceneEngine` en `scene/index.ts`; lógica del motor (tiempo, marcos, cámara, selección, bucle bajo demanda, calidad adaptativa) con el renderer inyectado por una fábrica y tests sin WebGL. |
| 2.b | `download-assets.mjs` y `build-textures.mjs` (WebP 1k/2k/4k con hash); manifiesto tipado `scene/textures.ts` (niveles, meridiano 0, `colorSpace`, alfa); carga con `ImageBitmapLoader` (`flipY`, `premultiplyAlpha: 'none'`), tope `maxTextureSize`, anisotropía y subida progresiva; estimación de VRAM; prueba medida de KTX2; `FUENTES.md` archivo a archivo. |
| 2.c | Renderer (sRGB, tone mapping, DPR limitado, exposición por vista); prueba de profundidad (D13) con capturas y chunks comunes en `scene/materials/`; marcos y origen flotante aplicados a cuerpos, órbitas y estrellas; Sol con oscurecimiento del limbo y halo; planetas orientados y achatados; anillos de Saturno con sombras analíticas en los dos sentidos; Luna básica; órbitas con `Line2`; estrellas HYG; Vía Láctea alineada (opcional); etiquetas HTML; póster provisional. |
| 2.d | `ViewerLayoutComponent` como ruta padre (`/`, `/explorar/tierra`, `/explorar/luna`) con `@defer`, póster y `afterNextRender`; arranque troceado con progreso, errores con «Reintentar» y recuperación del contexto WebGL; bucle con `visibilitychange` y render bajo demanda; calidad adaptativa con selector recordado; modo `?captura=1` e indicador de desarrollo; comprobación del bundle por `stats.json`. |
| 2.e | `npm run check`, informe con evidencias (capturas, cifras), revisión por subagente, correcciones, fusión y `DIARIO.md`. |

### Diseño (decisiones de partida)
1. **Estado del sistema sin romper las capas.** `ephemeris/` no puede importar `data/`, así que `system-state.ts` recibe las 16 lunas con elementos medios como parámetro (las pasa `scene/`). Devuelve posiciones heliocéntricas en ECL (UA, float64) y el desplazamiento de cada luna respecto a su planeta, en arrays tipados con un orden fijo, con caché por instante.
2. **Iluminación y sombras con la geometría real, no con la de la escena.** La dirección del Sol de cada cuerpo, las sombras analíticas (D20) y la orientación (D19) se calculan con las posiciones verdaderas en float64 y llegan a los shaders como uniformes en el sistema propio del cuerpo. Así los marcos de escala son solo presentación: ninguno puede falsear una fase, una sombra o una estación. Sin luces de three: un material propio para los cuerpos (Lambert + texturas + sombras analíticas + chunks de profundidad), que las fases 5–7 amplían.
3. **Marcos (D12, §4.4).**
   - *Ilustrativo*: el de la fase 1.
   - *Sistema local físico* de un planeta P: geometría real anclada en P, con una unidad elegida para que P conserve su radio ilustrativo (continuidad: el planeta no cambia de tamaño). El planeta y sus lunas quedan a escala real entre ellos, como pide el plan, y el resto de cuerpos también queda a su distancia real, de modo que desde P se ve el cielo verdadero (el Sol del tamaño y en la dirección reales). Se propone documentarlo así en §4.4.
   - *Real global*: geometría real con una unidad que conserva la extensión del sistema (Neptuno a la misma distancia que en el ilustrativo), con marcadores para los cuerpos diminutos.
   - Las transiciones interpolan, para cada cuerpo, su posición **relativa al foco** (dirección lineal y distancia geométrica) y su radio (geométrico). El foco no se mueve, nada atraviesa el foco y el orden de distancias se conserva cuando coincide en los dos extremos. Todo en funciones puras de `ephemeris/scale.ts`, que usan igual los cuerpos y las órbitas.
4. **Motor testable sin WebGL** (B10). `SceneEngine` (tiempo, marcos, cámara, selección, bucle bajo demanda, calidad, eventos) recibe un `RenderBackend` de una fábrica y un reloj y un `requestAnimationFrame` inyectables. En producción, la fábrica crea el backend de three; en los tests, uno falso que registra lo que se le pide.
5. **Texturas** (D17, D18). Originales en `assets-src/`; WebP por niveles en `public/textures/{1k,2k,4k}/` con hash en el nombre (sí se versionan: el CI no descarga nada de terceros) y un manifiesto generado (`scene/texture-files.ts`, «GENERADO por…»). La alineación del meridiano 0 de cada mapa se documenta en el manifiesto y se comprueba en el script con zonas conocidas (por ejemplo, el Sáhara y el Pacífico en la Tierra; mares e highlands en la Luna). Niveles por cuerpo según la calidad y el foco: en la vista general, mapas pequeños; el cuerpo enfocado sube de nivel.
6. **Profundidad (D13).** Prueba de `reversedDepthBuffer` frente a `logarithmicDepthBuffer` (y el buffer estándar como referencia) con capturas en el marco real. Ojo: el buffer invertido de three usa el buffer de profundidad del lienzo, que suele ser de enteros de 24 bits; ahí la ganancia es pequeña. Se decide con las capturas.
7. **Vía Láctea** (opcional, no es condición de parada). Candidata: *Deep Star Maps 2020* del NASA SVS, versión sin estrellas brillantes en coordenadas celestes ICRF/J2000. Solo existe en EXR (o en una vista previa JPG de 1024×512, insuficiente). Plan: leer el EXR con el `EXRLoader` de `three/addons` (no es una dependencia nueva) en un script de Node, tonemapearlo y pasarlo a WebP. Crédito: «NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC»; los datos de Gaia son de uso libre con crédito. Si no sale bien, se omite y se apunta.
8. **KTX2** (no es condición de parada). Las únicas texturas KTX2 del repositorio de three r186 son `examples/textures/spiritedaway.ktx2` (UASTC, 496×260×6 capas) y las de prueba de `examples/textures/ktx2/` (32×32). Se mide con ellas y su `KTX2Loader`: peso frente a WebP de los mismos píxeles, tiempo de transcodificación y de subida y VRAM por formato. Recomendación en el informe.

### Archivos
- Nuevos:
  - `src/app/ephemeris/{system-state,orientation}.ts` (+ tests);
  - `src/app/scene/`: `index.ts` (contrato), `engine.ts`, `render-backend.ts`, `clock.ts`, `frames.ts`, `quality.ts`, `picking.ts`, `labels.ts`, `textures.ts`, `texture-files.ts` (generado), `camera/`, `bodies/`, `materials/`, `stars.ts`, `milky-way.ts`, `orbits.ts`, `webgl-backend.ts` (+ tests de la lógica);
  - `src/app/features/viewer/` (layout, lienzo, estado de carga, indicador de desarrollo) y las páginas de las vistas Tierra y Luna;
  - `scripts/{download-assets,build-textures,build-milky-way,bench-ktx2,serve-dist,capture,build-poster}.mjs`;
  - `public/textures/**`, `public/img/poster-*.webp`, `docs/informes/img/fase-2/`.
- Tocados: `ephemeris/scale.ts`, `data/body.model.ts`, `data/sources.ts`, `scripts/build-body-data.mjs` → `data/body-data.ts`, `app.routes.ts`, `app.html`/`app.css` (el visor ocupa todo el ancho), `styles.css` (etiquetas), `angular.json` (`statsJson`), `scripts/check-initial-bundle.mjs`, `package.json`, `docs/FUENTES.md`, `docs/PENDIENTES.md`, `.prettierignore` y `.gitignore` (la copia de las skills en `.agents/`, que aparece sin versionar en el equipo de Iván, rompía `prettier --check .`).

### Dependencias (todas de la lista cerrada)
- Producción: `three` `^0.186.1` (MIT).
- Desarrollo: `@types/three` `^0.186.0`, `sharp` (texturas), `@playwright/test` (capturas, póster, mediciones y prueba de KTX2; el navegador Chromium que instala Playwright lo prevé el plan en 3.d).
- Recursos de three que no son dependencias nuevas: `three/addons` (`Line2`, `KTX2Loader`, `EXRLoader`) y el transcodificador Basis de `three/examples/jsm/libs/basis/` (solo para la prueba; no se copia a `public/` si no se adopta KTX2).

### Recursos que se descargan
| Recurso | Licencia | Uso |
|---|---|---|
| Solar System Scope, texturas (Sol, planetas, Tierra día/noche/nubes/normales/especular, anillos) | CC BY 4.0 (comprobado en https://www.solarsystemscope.com/textures/) | Texturas de los cuerpos |
| NASA SVS 4720, CGI Moon Kit (`lroc_color_poles_*`) | Material de la NASA (crédito: NASA's Scientific Visualization Studio) | Luna básica (el mapa está centrado en 0° de longitud, según la página) |
| NASA SVS 4851, Deep Star Maps 2020 (`milkyway_2020_4k.exr`) | Material de la NASA + datos de Gaia DR2 (uso libre con crédito a ESA/Gaia/DPAC) | Vía Láctea (opcional) |
| NASA NSSDCA, fichas de cada planeta («Ellipticity (Flattening)») y de los anillos de Saturno | Material de la NASA | `flatteningRatio` y radios de los anillos |
| three.js r186, `examples/textures/spiritedaway.ktx2` y `examples/textures/ktx2/*` | MIT (repositorio de three) | Solo la prueba de KTX2 (no se publican) |

### Skills
`threejs-scene`, `threejs-shaders`/`shader-glsl` (cuerpos, Sol, anillos, estrellas), `threejs-assets` (texturas), `threejs-spatial-data` (origen flotante y profundidad), `threejs-performance` y `threejs-testing` como referencia puntual, adaptadas a three 0.186 sin React.

### Riesgos y dudas
1. **Tamaño del chunk del visor** (aviso a 900 kB): three + astronomy-engine + datos pueden rondar ese límite. Se mide en cada build; si se acerca, se separa el backend WebGL de los datos.
2. **Profundidad en el marco real** (rango de 10⁸–10⁹): con el buffer de enteros del lienzo, solo la profundidad logarítmica parece viable; la prueba lo confirmará o no.
3. **Mediciones de FPS en escritorio:** el Chromium sin interfaz usa SwiftShader (CPU). Para las cifras de FPS y de subida de texturas se usará la GPU real del equipo (RTX 3060) con el navegador visible o con los parámetros de ANGLE para D3D11, y se dirá en cada cifra con qué se midió.
4. **Calibración del mapa de los anillos:** Solar System Scope no documenta qué radios cubre su textura. Se calibra con la división de Cassini y el borde exterior del anillo A (radios de la ficha de los anillos de Saturno de la NASA) y se documenta en el manifiesto.
5. **Marco local:** la interpretación de §3 del diseño (todo a escala real alrededor del planeta enfocado) cumple la letra de §4.4 y la amplía; se propone en §10 que el plan lo diga así.

### Estado de las entregas (se actualiza al cerrar cada una)
- 2.a ⏳ en curso.
- 2.b pendiente.
- 2.c pendiente.
- 2.d pendiente.
- 2.e pendiente.
