# Informe: Fase 2 (Motor 3D y escena base)

- **Rama:** `fase-2-motor`
- **Fecha:** 2026-10-24
- **Estado:** revisada y corregida (modo autónomo por bloques, bloque B); ver «Respuesta a la revisión» al final

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
| NASA SVS 4851, Deep Star Maps 2020 (`milkyway_2020_4k.exr`) | Material de la NASA derivado de Gaia DR2. **Corregido tras la revisión:** los datos de Gaia son CC BY-NC 3.0 IGO, así que la Vía Láctea no se publica (§4.5) | Vía Láctea (opcional; omitida) |
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
- 2.a ✅ estado del sistema, orientación IAU, achatamiento con fuente, marcos y transiciones, contrato y lógica del motor con tests sin WebGL.
- 2.b ✅ texturas por niveles con hash, manifiesto tipado con alineación comprobada, carga con `ImageBitmapLoader`, VRAM y prueba de KTX2.
- 2.c ✅ renderer, decisión de profundidad, Sol, planetas, anillos con sombras, Luna, órbitas, estrellas, Vía Láctea, etiquetas y póster.
- 2.d ✅ layout del visor con `@defer`, arranque troceado, contexto WebGL, bucle bajo demanda, calidad adaptativa, modo de captura y comprobación del bundle por `stats.json`.
- 2.e ✅ check, informe y capturas; revisión por subagente a continuación.

---

## 1. Resumen
El motor 3D está hecho con la arquitectura que pedía el plan y medido. El explorador (`/`, `/explorar/tierra` y `/explorar/luna`) pinta primero el texto prerenderizado y un póster, y después, con `@defer` y un `import()` dinámico, el Sol, los 8 planetas y las 21 lunas en sus posiciones y orientaciones reales del día, con órbitas, estrellas HYG y etiquetas. La Vía Láctea se hizo y se alineó, pero tras la revisión se ha retirado: su única fuente deriva de Gaia, con licencia no comercial (decide Iván). Lo esencial:
- **Estado del sistema** (30 cuerpos en una llamada, 0,16 ms por frame con orientaciones) y **orientación IAU** (la libración coincide con `Astronomy.Libration` a 0,025° y la apertura de los anillos es de 0,043° el día del cruce).
- **Tres marcos con origen flotante**: ilustrativo, sistema local físico y escala real, con transiciones relativas al foco que no atraviesan el foco ni cambian el orden de distancias. Cuerpos y órbitas usan la misma transformación.
- **Luz y sombras con la geometría verdadera** (float64), independientes del marco: sombras analíticas anillos ↔ Saturno, y planetas achatados con `flatteningRatio` de la NASA.
- **Motor testable sin WebGL**: el renderer entra por una fábrica; 246 tests (104 más que al cerrar la fase 1).
- **Profundidad logarítmica** (D13): en la prueba, el buffer invertido de three falla (el halo tapa el disco del Sol) y el estándar empata con el logarítmico; se elige el logarítmico por margen de precisión (§5.1, corregido tras la revisión).
- **Texturas WebP por niveles** con hash y alineación del meridiano 0 comprobada por script; **KTX2 medido** (no compensa ahora).
- **Medido en una RTX 3060** (tras las correcciones de la revisión): 60 FPS en los tres niveles, 0 frames en reposo, VRAM de 27 a 107 MB, memoria estable y un solo contexto WebGL vivo en 10 idas y vueltas, 10 cambios de vista y 6 de calidad, contexto WebGL recuperado y JS inicial de 288 kB sin three ni astronomy-engine (comprobado por módulos).

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Primero se pintan el texto y el póster; después, el Sol, los planetas, las órbitas, las estrellas y las etiquetas en las posiciones de hoy (capturas en escritorio y móvil) | ✅ | Sin JavaScript (lo que llega prerenderizado): `img/fase-2/sin-js-escritorio.webp` y `sin-js-movil.webp` (texto + póster). Con el 3D (modo de captura, 2026-10-24 00:00 UTC, la fecha de hoy): `escritorio-sistema.webp`, `movil-sistema.webp` y las vistas Tierra y Luna en los dos formatos. Tras la revisión, el póster sigue debajo del lienzo hasta el primer frame (y si hay un error): comprobado muestreando la página cada 25 ms. LCP medido: el póster (156 ms en alta, 68 ms en baja); nunca el lienzo. |
| `three` y `astronomy-engine` en el chunk diferido (salida del build y tamaño) | ✅ | `main` 278,81 kB; inicial total **283,37 kB** (78,35 kB transferidos), sin avisos. `check-initial-bundle`: «✔ El JS inicial de las 18 páginas (7 ficheros) no lleva ningún módulo de three ni de astronomy-engine. Diferido: chunk-…js (**728,71 kB** en bruto) con three y astronomy-engine» (aviso de §5 a 900 kB). |
| Tests de orientación: la cara de la Luna frente a `Astronomy.Libration` (±1°) en 3 fechas | ✅ | `orientation.spec.ts`, con las cifras en el nombre del test: 2026-10-24 (libración −5,93°, −3,72°): 0,001° y 0,020°; 2027-03-15: 0,002° y 0,024°; 2030-07-01: 0,001° y 0,025°. |
| Tests de orientación: apertura de los anillos ≈ 0° el 23-03-2025 (±1°) | ✅ | **0,043°** (en el nombre del test). Además, +27° el 2017-10-16 (cara norte) y −27° el 2032-05-01 (cara sur). |
| Tests de la lógica del motor sin WebGL (marcos, transiciones, selección, tiempo) | ✅ | `engine.spec.ts` (17 tests con renderer y `requestAnimationFrame` falsos): arranque por pasos, render bajo demanda, tiempo y velocidades (también hacia atrás), pausa en 2100, pestaña oculta, foco y sistema local físico, reanclaje de la cámara, escala real, vuelta a la vista general, movimiento reducido, clic y etiquetas, vistas, calidad adaptativa, contexto WebGL, `dispose()` y chunks de profundidad. Además, `frames`, `rig`, `clock`, `quality`, `picking`, `labels` y las texturas. |
| Decisión de profundidad con capturas sin parpadeos en el marco real | ✅ (corregido) | §5.1. Sin parpadeos con ninguno de los tres buffers. Fobos junto a Marte y Neptuno con la Tierra en primer plano: idénticas con los tres. Desde Fobos con el Sol al fondo (1,5 UA), **solo el invertido** funde el disco del Sol con su halo (centro 255, 255, 255); el estándar y el logarítmico dan el mismo píxel (251, 166, 116): `profundidad-sol-detalle-*.png`. **Elegido: `logarithmicDepthBuffer`**, por margen de precisión y no porque el estándar falle en estas escenas (la primera versión del informe decía lo contrario: era un error). |
| Memoria, FPS, VRAM, peso de la primera vista y coste por frame según §5 (cifras) | ✅ | §6 (repetido tras la revisión, ya sin la Vía Láctea). FPS: 60 en alta, media y baja. VRAM (sistema / Tierra / Luna): 27 / 67 / 107 MB en alta y 27 / 35 / 43 en media y en baja. Primera vista: texturas de 378 kB. Efemérides: 0,17 ms por frame. Memoria: 6 geometrías, 11 texturas, 10 MB de heap y **un contexto WebGL vivo** al empezar, tras 10 idas y vueltas, tras 10 cambios de vista y tras 6 cambios de calidad. |
| En pausa y sin interacción, 0 FPS; pérdida y recuperación del contexto probadas | ✅ | `measure.mjs`: **0 frames y 0 llamadas a `requestAnimationFrame` en 3 s** de pausa. Contexto: `loseContext()` → evento `contextLost` y 0 frames; `restoreContext()` → `contextRestored` y vuelve a pintar con la fecha nueva (`contexto-recuperado.webp`). También en `engine.spec.ts`. |
| Calidad adaptativa: con FPS bajos simulados (reloj falso) baja una vez y no oscila | ✅ | `quality.spec.ts`: a 40 FPS baja a media una vez; a 60 FPS no vuelve a subir; sin animación no mide; los picos cortos no cuentan. `engine.spec.ts`: el motor completo a 40 FPS durante 12 s da un solo `qualityChanged` automático. |
| Etiquetas legibles y sin solaparse en la vista general (captura) | ✅ | `escritorio-sistema.webp` y `movil-sistema.webp`. Colocación voraz por prioridad con 4 posiciones por etiqueta (tests en `labels.spec.ts`). |
| Informe de la prueba de KTX2 con cifras y una recomendación | ✅ | §5.2. |
| Saturno y Júpiter con su achatamiento real (captura) y `flatteningRatio` con fuente | ✅ | `escritorio-saturno.webp` y `escritorio-jupiter.webp`. Datos generados por `build-body-data.mjs` desde la ficha de cada planeta de la NASA («Ellipticity (Flattening)»): Saturno 0,09796, Júpiter 0,06487… (test en `body-data.spec.ts`). |
| La comprobación del bundle por `stats.json` detecta una importación pequeña de three (solo `Vector3`) en una página (demostrado y revertido) | ✅ | §6. Con `import { Vector3 } from 'three'` en `/planetas`: «✖ three está en el JS inicial (chunk-…js, módulos: node_modules/three/build/three.core.js, node_modules/three/build/three.module.js), que cargan: planetas/index.html», código 1. Revertido: ✔. |

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| 2.a.1 `system-state.ts` | hecha | Los cuerpos llegan como parámetro: las capas no permiten que `ephemeris/` importe `data/`. Caché LRU por instante. Coste: 0,16 ms por frame con los 30 cuerpos y sus orientaciones. |
| 2.a.2 `orientation.ts` + achatamiento | hecha | IAU con `RotationAxis` (Sol, planetas y Luna), la Tierra con `earthFixedToEcl` y las lunas síncronas con el meridiano 0 hacia el planeta. `flatteningRatio` con fuente; elipsoides; las sombras de los anillos usan el elipsoide. |
| 2.a.3 Sistema local físico y transiciones | hecha | §4.1. Tests de continuidad, extremos exactos, no atravesar el foco y orden de distancias. |
| 2.a.4 Contrato de `SceneEngine` | hecha | `scene/types.ts` (lo reexporta `scene/index.ts`), escrito antes que el motor. Añadidos: §4.6. |
| 2.b.5 `download-assets` y `build-textures` | hecha | 16 texturas, WebP 1k/2k/4k con hash (10,7 MB en `public/textures/`). |
| 2.b.6 Manifiesto tipado | hecha | `texture-files.ts` (generado) + `texture-meta.ts`: niveles, meridiano 0, espacio de color, alfa y proyección. |
| 2.b.7 Carga | hecha | `ImageBitmapLoader` con `flipY` y `premultiplyAlpha: 'none'` (y sin conversión de color en los mapas de datos), tope `maxTextureSize`, anisotropía por calidad, una subida por frame y VRAM por textura. |
| 2.b.8 Prueba de KTX2 | hecha | §5.2. |
| 2.b.9 `FUENTES.md` | hecha | Una fila por fichero, con URL, fecha, SHA-256, licencia y transformaciones. |
| 2.c.10 Renderer y profundidad | hecha | sRGB, tone mapping neutro, DPR limitado por la calidad y exposición por vista; `logarithmicDepthBuffer` (§5.1); chunks en `scene/materials/depth.ts`, obligatorios con `sceneShaderMaterial` y comprobados en un test sobre toda la escena. |
| 2.c.11 Marcos y origen flotante | hecha | Cuerpos y órbitas, relativos al foco y en float64; las estrellas y la Vía Láctea solo giran. |
| 2.c.12 Sol y luz | hecha | Oscurecimiento del limbo (ley lineal, u = 0,6) y halo con tamaño mínimo en píxeles; luz sin atenuación, con la dirección real. |
| 2.c.13 Planetas, anillos y Luna | hecha | Sombras analíticas en los dos sentidos (`escritorio-saturno.webp`). Tira de los anillos calibrada (§5.3). |
| 2.c.14 Órbitas con `Line2` | hecha | Un solo `LineSegments2` con las 29 órbitas; la estela sale del cuerpo y se desvanece hacia atrás; la órbita del cuerpo enfocado va en el color de acento. |
| 2.c.15 Estrellas y Vía Láctea | hecha (Vía Láctea omitida) | HYG (magnitud límite de 5,5, 6,0 y 6,5 según la calidad). La Vía Láctea del NASA SVS se generó y se alineó en ICRF, pero no se publica: deriva de Gaia DR2 (CC BY-NC 3.0 IGO). El código queda listo para otra fuente (`PENDIENTES.md`). |
| 2.c.16 Etiquetas | hecha | Capa HTML gestionada por `scene/`, `aria-hidden`, sin solapes y con marcador para los cuerpos diminutos; el clic emite `bodyPicked`. |
| 2.c.17 Póster provisional | hecha | `public/img/poster-{system,earth,moon}-{escritorio,movil}.webp` (13–36 kB), con `width` y `height`. |
| 2.d.18 `ViewerLayout` | hecha | Ruta padre de las tres vistas; el motor persiste entre ellas; `@defer (on idle)` y `afterNextRender`. |
| 2.d.19 Arranque sin bloquear | hecha | `compileAsync`, pasos con `scheduler.yield` (o `setTimeout`), progreso visible, error con «Reintentar» y contexto WebGL. Una sola tarea larga, de 53 ms. |
| 2.d.20 Bucle | hecha | `requestAnimationFrame` solo cuando hace falta; con `visibilitychange`, sin saltos de tiempo. |
| 2.d.21 Calidad adaptativa | hecha | Solo baja, con una ventana de 5 s de animación y una espera de 8 s; recarga de texturas con `dispose()`; selector recordado con try/catch. |
| 2.d.22 Modo `?captura=1` e indicador | hecha | Fecha fija (2026-10-24 00:00 UTC), calidad alta, sin animaciones ni calidad adaptativa; indicador de FPS y `renderer.info` solo con `isDevMode()`. |
| 2.d.23 Bundle por módulos | hecha | `statsJson` en `angular.json`; el script recorre el JS inicial de cada página y sus importaciones estáticas. |

## 4. Desviaciones del plan y motivo

### 4.1 Sistema local físico: geometría real alrededor del planeta enfocado
§4.4 dice que, al enfocar un planeta, «el planeta y sus lunas pasan a escala física real entre ellos», sin decir qué pasa con el resto. Lo implementado: el marco local es **geometría real para todos los cuerpos**, con la unidad elegida para que el planeta conserve su radio ilustrativo. Cumple la letra (el planeta y sus lunas, a escala real entre ellos) y además:
- desde el planeta se ve el cielo verdadero: el Sol de su tamaño y en su dirección, y los demás planetas como puntos con su marcador;
- la transición es un zoom continuo: el planeta no cambia de tamaño y el resto se aleja;
- la escala real global es el mismo marco con otra unidad, así que no hay casos especiales.

La alternativa (lunas a escala real dentro del sistema ilustrativo) metía, por ejemplo, la órbita de Jápeto (59 radios de Saturno) a través de Júpiter y Urano. Propuesta de redacción en §10.

### 4.2 Iluminación y sombras con la geometría verdadera, no con la de la escena
El plan no lo dice explícitamente. La dirección del Sol de cada cuerpo, las sombras de los anillos y la orientación se calculan en float64 con las posiciones reales y llegan a los shaders como uniformes. Así, ningún marco ni ninguna transición puede alterar una fase o una sombra. Consecuencia: no hay luces de three; todos los cuerpos usan un material propio (Lambert + texturas + sombras + chunks de profundidad), que las fases 5–7 ampliarán.

### 4.3 Encuadres por fracción de la pantalla
El encuadre de un cuerpo es «ocupa el 46 % (foco) o el 82 % (vistas Tierra y Luna) del lado más corto», y no un número fijo de radios. Con un número fijo, en un móvil vertical la Tierra se salía por los lados (lo detectaron las capturas).

### 4.4 Parte de la fase 3 adelantada (lo mínimo)
- **Gestos** sobre el lienzo (arrastrar, rueda, pellizco y clic para elegir): sin ellos, el visor no se podía usar ni revisar. El teclado, los botones y los viajes cinemáticos siguen en la fase 3.
- **Parámetros de URL** `fecha`, `cuerpo`, `escala` y `calidad`, que necesita el modo de captura. La validación con aviso y la sincronización de la URL son de la fase 3.
- **Estado de la vista** en `state/explorer-view.ts` (`@Service`): la fase 3 lo integra en el `ExplorerStore`.

### 4.5 Detalles
1. **La Tierra solo usa su mapa de día** en esta fase: las texturas de noche, nubes, normales y especular ya están generadas y en el manifiesto, pero su material es de la fase 5.
2. **Las lunas pequeñas usan una esfera ligera** (32 segmentos), salvo la enfocada: la vista general pasa de 523 000 a 220 000 triángulos.
3. **El modo de captura respeta la densidad de píxeles.** El plan decía «semilla fija», pero el motor no tiene aleatoriedad. La captura es determinista para una ventana y una densidad dadas, que fija el script.
4. **Las capturas del informe van en WebP** (calidad 88): 1,4 MB en vez de 12 MB en PNG. Los recortes de la prueba de profundidad van en PNG.
5. **La Vía Láctea en 4k llevaba un desenfoque de 0,6 px**: el grano de las estrellas débiles duplicaba el peso (1,67 MB, por encima del límite de 1,5 MB de §5) y quedaba en 784 kB. **Tras la revisión está omitida** (licencia CC BY-NC de Gaia DR2): `build-textures.mjs` la salta (`OMITTED`), sus WebP se han retirado de `public/textures/`, ningún nivel de calidad la pide y la esfera del cielo no se dibuja sin textura.

### 4.6 Añadidos al contrato de `SceneEngine`
- `stats()` (indicador de desarrollo y mediciones).
- Eventos `timeChanged` (≤ 5 por segundo, §4.5 del plan) y `limitReached` (1900 y 2100).
- Opciones `focus` (cuerpo inicial, de la URL) y `background` (solo en captura: un cuerpo detrás del enfocado, para la prueba de profundidad).

## 5. Decisiones técnicas nuevas

### 5.1 Profundidad (D13): `logarithmicDepthBuffer` (corregido tras la revisión)
Prueba en el marco real con los tres buffers (`?profundidad=logaritmica|invertida|estandar`), en Chromium con ANGLE sobre D3D11. Repetida tras la revisión con el build corregido (`scripts` propios: el píxel central del Sol en la página, el plano cercano real y `DEPTH_BITS`):
- En este equipo existe `EXT_clip_control` y el modo invertido se activa de verdad (`stats().depth = reversed`). El lienzo tiene 24 bits de profundidad (`DEPTH_BITS`).
- **Fobos junto a Marte** y **Neptuno con la Tierra en primer plano**: las tres capturas coinciden (2 píxeles distintos de 1,44 millones). No hay nada lejano que compita en profundidad.
- **Desde Fobos, con el Sol al fondo** (cámara a 66 km de Fobos, Sol a 1,5 UA; plano cercano real 0,0127 unidades y Sol a 108 306): **el invertido** pinta el halo sobre el disco del Sol (centro 255, 255, 255). **El estándar y el logarítmico** dan exactamente el mismo píxel en el centro (251, 166, 116) y a medio radio (250, 148, 97): el disco se ve dentro del halo. Recortes: `profundidad-sol-detalle-{logaritmica,invertida,estandar}.png`. La primera versión de este informe decía que el estándar también fallaba: no es lo que muestran sus capturas ni la repetición; era un error.
- **Lo que predice el cálculo:** con un buffer de enteros de 24 bits, el estándar separa profundidades a esa distancia de unas 5,5·10⁴ unidades (z²/(cerca · 2²⁴)), y el Sol mide 274 de radio: el disco y el halo deberían caer en el mismo valor y el halo pintarse encima. No pasa en esta GPU; lo más probable es que compare la profundidad del fragmento antes de redondearla a 24 bits. Eso no está garantizado en otras GPU (las de móvil, sobre todo).
- **Por qué el invertido empeora:** three lo implementa sobre el buffer de profundidad del lienzo, que es de enteros de 24 bits. La ventaja del Z invertido viene de combinarlo con un buffer en coma flotante, que el lienzo no ofrece; con enteros, lo lejano queda peor resuelto que con el estándar. Haría falta pintar en un render target con `DepthTexture` flotante y copiarlo al lienzo.
- **Decisión:** el logarítmico, por margen de precisión en las escalas extremas (el error relativo es el mismo a cualquier distancia) y porque su coste está medido: escribe `gl_FragDepth` y pierde el early-Z, y con 35 llamadas y 220 000 triángulos da 60 FPS y 1,9 ms de CPU por frame. El estándar empata en estas capturas: si Iván prefiere conservar el early-Z, es la alternativa (propuesta 2 de §10). Los planos de recorte se ajustan en cada frame (el cercano, a la mitad de la distancia a la superficie más próxima).

### 5.2 KTX2 frente a WebP: seguir con WebP
`scripts/bench-ktx2.mjs` usa las únicas texturas KTX2 del repositorio de three r186 (la grande es UASTC; de ETC1S solo hay una de 40 × 40 px) y WebP con los mismos píxeles (calidad 82). RTX 3060, ANGLE/D3D11, mediana de 7 repeticiones:

| Muestra | Tipo | Tamaño | Formato en la GPU | KTX2: peso · bits/px · carga · subida · VRAM | WebP: peso · bits/px · carga · subida · VRAM |
|---|---|---|---|---|---|
| spiritedaway.ktx2 | UASTC | 496×260×6 | BC7 | 755,9 kB · 8,00 · 19,4 ms · 0,2 ms · 755,6 kB | 194,1 kB · 2,05 · 33,0 ms · 1,3 ms · 4030 kB |
| 2d_uastc.ktx2 | UASTC | 40×40 | BC7 (6 mipmaps) | 2,5 kB · 12,80 · 2,8 ms · 0,1 ms · 2,1 kB | 0,7 kB · 3,38 · 2,5 ms · 0,1 ms · 8,3 kB |
| 2d_etc1s.ktx2 | ETC1S | 40×40 | BC7 (6 mipmaps) | 0,9 kB · 4,83 · 3,0 ms · 0,1 ms · 2,1 kB | 0,6 kB · 3,13 · 2,6 ms · 0,1 ms · 8,3 kB |

«Carga» incluye la descarga local y la transcodificación o decodificación. La VRAM de WebP es la de RGBA8 con mipmaps.
- **A favor de KTX2:** unas 4 veces menos VRAM en igualdad de condiciones (la cifra de 5,3 de la tabla compara el WebP con mipmaps contra el KTX2 de muestra sin ellos; corregido tras la revisión) y subidas 6 veces más rápidas.
- **En contra:** UASTC pesa 3,9 veces más que WebP (8 frente a 2 bits por píxel). Con nuestras texturas, la primera vista pasaría de 1,2 MB a unos 4–5 MB, y §5 permite 2,5. ETC1S pesaría parecido a WebP, pero con más artefactos en los degradados de color de los planetas, y no se puede medir a escala con estas muestras. Además, generar KTX2 necesita una herramienta externa (`toktx`).
- **Recomendación:** seguir con WebP. Toda la VRAM medida cabe con holgura en §5 (como mucho 150 de 300 MB en alta y 45 de 120 en baja). Volver a medir en la **fase 6**: la Luna en 8K (8192 × 4096 en RGBA8 con mipmaps, unos 179 MB) solo cabría en alta con KTX2 o sin mipmaps. Si hace falta, en esa fase se propondrá `toktx` a Iván.

### 5.3 Calibración de la tira de los anillos
Solar System Scope no documenta qué radios cubre su textura (8192 px). `build-textures.mjs` busca el borde exterior del anillo B (x = 5506 px) y el del anillo A (x = 7705 px) y los asocia a sus radios en la ficha de la NASA (117 507 y 136 780 km): 8,764 km/px. La tira cubre de **69 250 a 141 048 km**. Comprobación independiente: el borde interior del anillo C (74 658 km) cae en x = 617 px, donde el alfa sube de 0,09 a 0,18. La escena dibuja el anillo con esos radios y la sombra sobre Saturno usa los mismos.

### 5.4 Alineación del meridiano 0, comprobada por script
Sondas sobre el nivel 1k ya generado. El script falla si no se cumplen y comprueba también que, con el mapa girado 180°, fallarían:
- Tierra: el Pacífico (69) frente al Sáhara (201).
- Luna (CGI Moon Kit, «centrado en 0°»): Mare Imbrium (85) y Crisium (83) frente a las tierras altas (145) y la cara oculta (166).
- Marte: Syrtis Major (58) y Acidalia (48) frente a Hellas (123) y Tharsis (145).
- Mercurio: el cráter Kuiper (215) frente a la llanura vecina (140).
- Vía Láctea (antes de omitirla): el centro galáctico (131) frente al polo galáctico norte (22). El mapa tiene la AR 0 en el centro y crece hacia la izquierda; también lo comprobé con las Nubes de Magallanes.

`texture-meta.spec.ts` cierra la cadena en el modelo: el vértice u = 0,5 de la esfera de three es +X (meridiano 0) y, con la orientación de la escena, cae en (0°, 0°) de la Tierra; u = 0,75 cae en 90° E.

### 5.5 Otras
- **Expresión de marcos:** lo que se ve es un marco o una mezcla de dos, que puede anidarse si una transición interrumpe a otra. La anterior sigue avanzando dentro de la nueva, así que no hay saltos (test).
- **Interpolación esférica de las direcciones** en `blendPosition`: con vectores sin normalizar, un cuerpo cuya distancia se multiplica por mil giraba casi todo el ángulo en el primer instante (lo detectó un test de continuidad).
- **Reanclaje de la cámara** al cambiar de foco: la cámara no se mueve en el mundo y luego vuela al encuadre nuevo con amortiguación logarítmica (de 10⁵ a 1 unidad tarda lo mismo que de 10 a 1).
- **La distancia de la vista general sigue la escala del marco** durante las transiciones: al volver de la Luna, la cámara ya no llega antes que el sistema (el Sol llenaba la pantalla; hay un test de regresión).
- **Los `ImageBitmap` no se cierran tras subirlos:** si se pierde el contexto, three los vuelve a subir solo. Coste: memoria del sistema parecida a la VRAM de las texturas sin mipmaps.
- **Al recuperar el contexto se repone el color de fondo:** three rehace su estado con el fondo negro (lo detectó la captura).
- **`Date.parse` acepta el 31 de febrero** (lo convierte en el 3 de marzo): la URL lo rechaza (test).
- **Etiquetas:** cuatro posiciones antes de descartar una; las lunas solo se nombran si su planeta tiene nombre y están separadas de él (14 px en el sistema enfocado, 40 px en los demás).

## 6. Salida de los checks
Tras las correcciones de la revisión:
```
$ npm run check            (código de salida 0)
All files pass linting.
All matched files use Prettier code style!
 Test Files  29 passed (29)
      Tests  251 passed (251)
Statements   : 99.57% ( 466/468 )
Branches     : 96.73% ( 178/184 )
Functions    : 100% ( 107/107 )
Lines        : 100% ( 407/407 )
Initial chunk files | Names              |  Raw size | Estimated transfer size
main-TV2OUQ2R.js    | main               | 283.14 kB |                78.08 kB
styles-OMJHEEKH.css | styles             |   4.09 kB |                 1.27 kB
                    | Initial total      | 287.70 kB |                79.81 kB
Prerendered 17 static routes.
✔ El JS inicial de las 18 páginas (7 ficheros) no lleva ningún módulo de three ni de astronomy-engine.
  Diferido: chunk-…js (729.38 kB en bruto) con three y astronomy-engine
```
- Sin avisos de presupuesto. El inicial pasa de 274,17 a 283,37 kB por el router del layout, `@defer` y `@Service`, y a 287,70 kB con las correcciones: el lienzo nuevo por intento usa `@for`, y esbuild coloca el código de Angular que lo ejecuta en el chunk que comparte con `main` (las funciones del núcleo que usa cualquier componente diferido acaban ahí). three y astronomy-engine siguen fuera.
- 17 rutas prerenderizadas (antes, 15): `/explorar/tierra` y `/explorar/luna`.

**Demostración de la comprobación por módulos** (`import { Vector3 } from 'three'` y `new Vector3(1, 2, 3).length()` en `pages/planets-index`):
```
✖ three está en el JS inicial (chunk-DJ_DQ6nl.js, módulos: node_modules/three/build/three.core.js, node_modules/three/build/three.module.js), que cargan: planetas/index.html
✖ three (por su código) está en el JS inicial (chunk-DJ_DQ6nl.js)
exit=1
```
El inicial total no cambió (283,37 kB): para el build, el chunk de `/planetas` es diferido, pero su HTML lo precarga, y eso es lo que mira el script. Con el fichero original de nuevo, vuelve a ✔.

### Mediciones (`node scripts/measure.mjs`)
Equipo: Ryzen 7 5700G y RTX 3060; Chromium 1248 de Playwright con ANGLE sobre D3D11 (WebGL2 en la GPU).

| Medición | Resultado | §5 |
|---|---|---|
| Reposo (3 s en pausa, sin tocar nada) | 0 frames · 0 `requestAnimationFrame` | 0 FPS ✅ |
| Reproducción a 1 día/s, alta | 60 FPS (mín. 60) · 1,59 ms de CPU por frame · 0,17 ms de efemérides · 34 llamadas · 218 k triángulos | ≥ 55 ✅ · ≤ 2 ms ✅ |
| Reproducción, media | 59,8 FPS (mín. 59) · 1,34 ms · 0,18 ms · 96 k triángulos | ✅ |
| Reproducción, baja | 60 FPS (mín. 60) · 1,17 ms · 0,20 ms · 60 k triángulos | ✅ |
| VRAM en alta: sistema / Tierra / Luna | 27 / 67 / 107 MB | ≤ 300 ✅ |
| VRAM en media | 27 / 35 / 43 MB | — |
| VRAM en baja | 27 / 35 / 43 MB | ≤ 120 ✅ |
| Primera vista, alta y baja | Texturas 378 kB (los cuerpos en 1k; sin Vía Láctea) · estrellas 70 kB · póster 31 kB · fuentes 52 kB · JS 1003 kB en bruto (288 inicial + 729 diferido + chunks de las rutas) | ≤ 2,5 MB y ≤ 1,2 MB ✅ · estrellas ≤ 250 kB ✅ |
| Vistas Tierra y Luna en alta (adicional) | Tierra de día 4k: 437 kB · Luna 4k: 965 kB | ≤ 6 MB ✅ · ≤ 10 MB ✅ |
| Tareas largas en la carga | Ninguna (alta y baja) | Ninguna > 200 ms ✅ |
| LCP | Póster: 156 ms (alta) · 68 ms (baja) | Nunca el lienzo ✅ |
| Memoria: inicio → 10 idas y vueltas explorador ↔ ficha → 10 cambios de vista → 6 cambios de calidad | 6 geometrías y 11 texturas en los cuatro momentos · heap de JS 10 → 10 → 10 → 10 MB · **1 contexto WebGL vivo** en los cuatro (se cuentan envolviendo `getContext` y descontando los perdidos) | Sin crecimiento ✅ |
| Contexto WebGL | `contextLost` → 0 frames; `contextRestored` → vuelve a pintar y conserva la fecha y el fondo | ✅ |

Qué demuestra cada cifra de memoria (corregido tras la revisión, hallazgo 15): el heap de JS (tras forzar el recolector) no crece; los contextos WebGL vivos siguen siendo uno (la primera versión contaba lienzos en el DOM, que no ve un motor huérfano fuera del DOM); y `renderer.info.memory` del motor que queda no acumula geometrías ni texturas. Al liberar una textura se cierra además su `ImageBitmap` (hallazgo 5), memoria del proceso que ni el heap ni `renderer.info` miden.

Los 60 FPS son el límite de la pantalla (vsync). Las cifras en móvil (≥ 30 FPS en baja) quedan para cuando Iván pueda probar (fase 4 o red local); por decisión ya tomada, no bloquean.

## 7. Capturas
En `docs/informes/img/fase-2/` (modo de captura: 2026-10-24 00:00 UTC, calidad alta; escritorio 1600 × 900; móvil 390 × 844 con densidad 2). **Regeneradas tras la revisión**, sin la Vía Láctea y con las etiquetas que evitan los discos:
- Vista general: `escritorio-sistema.webp` y `movil-sistema.webp`. Escala real: `escritorio-escala-real.webp` y `movil-escala-real.webp`.
- Vistas de detalle: `escritorio-tierra.webp`, `movil-tierra.webp`, `escritorio-luna.webp` y `movil-luna.webp` (la cara visible tal como se ve hoy desde la Tierra, gibosa creciente).
- Achatamiento y sombras: `escritorio-saturno.webp` (sombra de los anillos sobre el planeta y del planeta sobre los anillos) y `escritorio-jupiter.webp`.
- Profundidad: `profundidad-fobos-marte.webp`, `profundidad-tierra-neptuno.webp`, `profundidad-fobos-sol-{logaritmica,invertida,estandar}.webp` y sus recortes `profundidad-sol-detalle-*.png`.
- Primera pintura sin JavaScript: `sin-js-escritorio.webp` y `sin-js-movil.webp`.
- Contexto recuperado: `contexto-recuperado.webp`.

Se regeneran con `npm run build && node scripts/capture.mjs docs/informes/img/fase-2`.

## 8. Dependencias añadidas

| Paquete | Versión | Motivo | ¿Está en la lista permitida? |
|---|---|---|---|
| `three` | 0.186.1 (MIT) | Motor 3D (D3) | ✅ |
| `@types/three` | 0.186.0 | Tipos | ✅ |
| `sharp` | 0.35.5 (Apache-2.0) | Texturas y póster | ✅ |
| `@playwright/test` | 1.64.1 (Apache-2.0) | Capturas, póster, mediciones y prueba de KTX2 (el Chromium que instala está previsto en 3.d) | ✅ |

Sin herramientas externas: la prueba de KTX2 usa el transcodificador de three, y el EXR se lee con el `EXRLoader` de three.

## 9. Pendientes y `TODO(ivan)`
- **Probar en un móvil real** (≥ 30 FPS en baja): cuando haya staging o por la red local (`npm start -- --host 0.0.0.0`). No bloquea.
- **KTX2 en la fase 6:** si la Luna en 8K lo necesita, decidir sobre `toktx` (herramienta externa).
- **TODO(ivan): Vía Láctea** (tras la revisión): omitida por la licencia CC BY-NC 3.0 IGO de Gaia DR2; opciones en `PENDIENTES.md`.
- **Fase 10:** comprobar en el iPhone que las texturas no salen invertidas (`ImageBitmapLoader` con `imageOrientation` necesita Safari 17).
- **Fase 3:** revisar el encuadre de la vista general en móvil vertical con los paneles (sugerencia 18) y el orden del texto en el DOM (sugerencia 22).

## 10. Propuestas de cambio al plan
No se aplican hasta que Iván las apruebe.
1. **§4.4, punto 2 (sistema local físico):** «al enfocar un planeta (o una de sus lunas), toda la escena pasa a geometría real alrededor de él, con la unidad que conserva su radio ilustrativo: el planeta y sus lunas quedan a escala física real entre ellos, y el resto del sistema a su distancia real (desde el planeta se ve el cielo verdadero)» (§4.1).
2. **D13** (redacción corregida tras la revisión): «Profundidad logarítmica (`logarithmicDepthBuffer`) en todos los dispositivos. En la prueba de la fase 2, el buffer invertido de three falla (el halo del Sol tapa su disco desde Fobos) y el estándar empata con el logarítmico en las capturas; se elige el logarítmico por margen de precisión, a costa del early-Z (medido: 60 FPS). Todo `ShaderMaterial` incluye los chunks de `scene/materials/depth.ts`». Si Iván prefiere conservar el early-Z, la alternativa es el estándar.
3. **D18:** «KTX2 se descarta por ahora (fase 2, §5.2 del informe: con UASTC pesa 4 veces más que WebP; ahorra unas 4 veces la VRAM); se reevalúa en la fase 6 para la Luna en 8K».
4. **§5 (efemérides por frame):** añadir que la cifra incluye las orientaciones de los 30 cuerpos (medido: 0,16 ms).

## 11. Cómo probarlo
```bash
npm ci
npm run check                                   # lint + tests + build + bundle por módulos
npm start                                       # http://localhost:4200 (indicador de FPS arriba a la derecha)
npm run build && node scripts/serve-dist.mjs    # el build prerenderizado en http://localhost:4321
```
- Arrastra para girar, usa la rueda o pellizca para el zoom y haz clic en un cuerpo o en su nombre para enfocarlo.
- `/?captura=1&cuerpo=saturno`: Saturno con sus sombras. `/?captura=1&escala=real`: la escala real.
- `/explorar/tierra` y `/explorar/luna`: las vistas de detalle.
- `/?captura=1&escala=real&cuerpo=fobos&detras=sol&profundidad=invertida`: el fallo del buffer invertido (con `estandar` o `logaritmica`, el disco del Sol se ve dentro del halo).
- Texturas: `node scripts/download-assets.mjs && node scripts/build-textures.mjs` (con las comprobaciones).
- Mediciones: `node scripts/measure.mjs` · KTX2: `node scripts/bench-ktx2.mjs` · póster: `node scripts/build-poster.mjs`.

---

## Respuesta a la revisión
Revisión: `docs/revisiones/fase-2.md` (CAMBIOS NECESARIOS: 0 bloqueantes, 5 importantes, 12 menores y 7 sugerencias). Corregidos los 5 importantes y los 12 menores; de las sugerencias, 4 hechas y 3 llevadas a la fase 3 o anotadas. Sin bloqueantes, no hace falta otra ronda de revisión (`CLAUDE.md`). Comprobaciones repetidas con scripts propios contra el build corregido (Chromium con la GPU, como el revisor).

| Hallazgo | Acción | Commit |
|---|---|---|
| 1 · «Reintentar» no recuperaba la escena (Importante) | Cada intento crea un `<canvas>` nuevo (`@for` sobre un contador de intentos). Repetido: con `stars.bin` respondiendo 503 sale el error en español con el póster detrás; con la red ya bien, «Reintentar» → escena lista, 1 contexto vivo, 1 lienzo y ningún error de página | `00f8c66` |
| 2 · Motor huérfano al salir durante la carga (Importante) | `start()` comprueba tras cada `await` que el componente y el intento siguen vivos. Repetido: con el chunk del motor retrasado 3 s y «Planetas» → **0 contextos vivos**; al volver, 1 | `00f8c66` |
| 3 · La prueba de profundidad no decía lo que se afirmaba (Importante) | Repetida con el build corregido: solo el invertido funde el disco del Sol (255, 255, 255); el estándar y el logarítmico dan el mismo píxel (251, 166, 116). Corregidos §1, §2, §5.1, §10.2 y §11; se mantiene el logarítmico por margen de precisión, con la redacción que propone la revisión, y se explica por qué el estándar no falla en esta GPU (compara antes de redondear a 24 bits) | este commit |
| 4 · Licencia de la Vía Láctea (Importante) | Comprobada en la fuente: «Gaia data are distributed under the CC BY-NC 3.0 IGO license». Omitida: `build-textures.mjs` la salta, sus WebP salen de `public/textures/`, ningún nivel la pide y la esfera del cielo no se dibuja. Pósters y capturas regenerados sin ella. Corregidos `FUENTES.md`, el script y el informe; `TODO(ivan)` con opciones en `PENDIENTES.md` (dejarla fuera, un panorama CC BY como el de ESO o pedir permiso a ESA) | `356852c` y este commit |
| 5 · Los `ImageBitmap` no se liberaban (Importante) | `releaseTexture()` cierra el bitmap al sustituir, descartar o liberar una textura (se conserva mientras está en uso, para recuperar el contexto) | `59daf6e` |
| 6 · Texturas que fallan (Menor) | Se captura el error, el cuerpo se queda con su color esquemático y se vuelve a pedir en el siguiente cambio de foco o de calidad; corregido el comentario de `progress` | `59daf6e`, `8176f91` |
| 7 · El póster se iba antes de tiempo (Menor) | El póster sigue debajo del lienzo hasta el primer frame y en el estado de error. Comprobado muestreando la página cada 25 ms: siempre hay póster o escena | `00f8c66` |
| 8 · El selector de calidad tapaba las cajas (Menor) | Oculto hasta que la escena está lista y con fondo de panel (en la fase 3 pasa a la barra de tiempo) | `00f8c66` |
| 9 · Mensajes técnicos (Menor) | `viewer-errors.ts`: un mensaje en español por tipo (sin WebGL, red, otro) y el detalle en la consola; un solo texto de carga con el porcentaje. Con tests | `00f8c66` |
| 10 · Etiquetas sobre otros cuerpos (Menor) | Los discos visibles y el halo del Sol son obstáculos; la Tierra va antes que los demás planetas; el nombre del cuerpo elegido sale siempre. 3 tests nuevos y capturas regeneradas | `bc19c08` |
| 11 · Umbrales de la calidad adaptativa (Menor) | 50 FPS en alta y 30 en media, alineados con §5 | `322aa26` |
| 12 · `colorSpaceConversion` sin efecto (Menor) | Quitada, con el comentario y el informe corregidos | `59daf6e` |
| 13 · `ImageBitmapLoader` sin alternativa (Menor) | Documentado el navegador mínimo (Safari 17, Firefox 98) y anotado para el iPhone de la fase 10 (§9) | `59daf6e` |
| 14 · La comprobación por módulos fallaba en abierto (Menor) | Patrones sin ancla y fallo si alguno no casa con ningún módulo del metafile | `322aa26` |
| 15 · La prueba de memoria demostraba menos (Menor) | `measure.mjs` cuenta contextos WebGL vivos y hace 6 cambios de calidad; §6 dice qué demuestra cada cifra | `322aa26` y este commit |
| 16 · `/creditos` sin las atribuciones (Menor) | Lista mínima con las licencias de lo que ya se publica y el aviso de que la NASA no respalda el proyecto | `8d59450` |
| 17 · Restos (Menor) | Corregidos los tres | `322aa26` |
| 18 · Encuadre de la vista general en móvil (Sugerencia) | A la fase 3 (paneles y `setViewOffset`) | — |
| 19 · Caché de los puntos de las órbitas (Sugerencia) | Anotada para la fase 10 (rendimiento en móvil): hoy el frame entero cuesta 1,6 ms | — |
| 20 · Lint de la API del motor en `core/` y `src/app/` (Sugerencia) | Hecho | `322aa26` |
| 21 · VRAM de KTX2 sin mipmaps (Sugerencia) | Corregido en §5.2 y en la propuesta 3: unas 4 veces, no 5,3 | este commit |
| 22 · Orden del H1 y `NgOptimizedImage` (Sugerencia) | El orden, en la fase 3 (el layout nuevo pone el texto antes del escenario). El póster usa `<picture>` con un recorte distinto por formato, que `NgOptimizedImage` no cubre: se mantiene como excepción justificada | — |
| 23 · Guardas de `capture()` (Sugerencia) | Hecho | `322aa26` |
| 24 · Estado de la vista en el chunk del layout (Sugerencia) | En la fase 3 los stores van en el bloque `@defer` y la vista sale de la ruta | — |
