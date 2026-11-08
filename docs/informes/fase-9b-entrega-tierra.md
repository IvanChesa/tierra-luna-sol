# Fase 9b, entrega 9b.f: la Tierra realzada (D46), sesión B en paralelo

- **Rama:** `fase-9b-f-tierra`, desde `fase-9b-sol-lunas` (`d5ce7f8`, la 9b.d cerrada), con la base común de A ya juntada (`43072d6`: las herramientas de D46 y los bloques `enhanced`).
- **Fecha:** 2026-11-08
- **Estado:** hecha y comprobada, sin fusionar. La junta A en `fase-9b-sol-lunas` (`docs/decisiones/FASE-9b-REPARTO-PARALELO.md`) y lleva esta nota al informe de la fase.
- **Alcance:** las tareas 6–12 de `docs/decisiones/FASE-9b-ADENDA-D46.md` (la Tierra) y lo de la Tierra de las 13–15. El Sol (1–5) es de A; Venus (9b.e), de C.
- **Puertos:** `CAPTURE_PORT=4360` y `E2E_PORT=4411`.

## 1. Resumen
La Tierra del explorador, con color realzado, ilustrativo y avisado, como la referencia (earth.ethanplus.ai), medida frente a capturas propias de ella:
- **el océano**, azul vivo;
- **el reflejo del Sol**, ancho, cian y con Fresnel, sin quemar;
- **nubes más finas**, sin los velos borrosos de los primeros planos;
- **la tierra**, más saturada: el desierto más claro y amarillo, la vegetación más verde;
- **el relieve**, ×5, sin los artefactos del mapa de normales;
- **el borde de la atmósfera**, fino y azul.

La cara nocturna y las luces (D40) no cambian: medidas antes y después, iguales. Todo está en el shader de la Tierra (`body-material.ts`, `TLS_EARTH`) y en `VISUAL_CONFIG.earth.enhanced`, con su porqué. Las texturas no cambian.

## 2. Plan (el de la sesión)
1. Worktree propio, `npm ci`, `assets-src/referencias/` copiada de la carpeta principal (ignorada; solo para medir).
2. Capturas de «antes» del build de partida (`d5ce7f8`), antes de cambiar nada.
3. El shader con uniformes nuevos, **inerte por defecto**: con ellos a cero, medido igual que antes (el océano, L\* 25,6 · C\* 18,7 · h 270°; las nubes, el 9,8 %).
4. Calibración sin rehacer el build: un script fuera del repo cambia los uniformes en la página y mide como `measure-d46.mjs` (basado en `tune.mjs` del traspaso).
5. Con la base de A juntada, los valores en `VISUAL_CONFIG.earth.enhanced`, conectados en `configureEarth`, con su test.
6. Los textos (tarea 13, lo de la Tierra), el registro de EPIC (tarea 15), lo que no cambia, §5, las capturas de «después» y `npm run check`.

## 3. Criterios de aceptación (los de la Tierra)

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas antes, después y referencia, lado a lado, en escritorio y móvil: la Tierra completa (de día, con África y Europa), el Pacífico y el Himalaya | ✅ | `node scripts/capture-d46.mjs docs/informes/img/fase-9b --prefijo=antes\|despues --comparar --solo=d46-…`: `docs/informes/img/fase-9b/{antes,despues}-d46-{escritorio,movil}-{tierra-completa,pacifico,himalaya}.webp` (12 capturas, con la interfaz). Las tres lado a lado, en `assets-src/referencias/comparativas/` (ignorada: la referencia no se sube, D46). |
| Los océanos frente a la referencia: h a ±10° y C\* ≥ 80 % del suyo | ✅ | Tabla del §4: en escritorio, el Atlántico sur, **h 275°** (referencia 277°) y **C\* 33,1** (mínimo 21,7); el Índico, **h 281°** (286°) y **C\* 32,6** (mínimo 16,6). En el móvil, 272° / 276° y 281° / 288°, con C\* 32,9 y 32,2 (mínimos 19,9 y 23,9). |
| La fracción de nubes del disco, a ±10 puntos de la de la referencia | ✅ | **El 1,5 %** en escritorio y el 1,0 % en el móvil (referencia, el 0,7 %; antes, el 9,8 % y el 8,7 %). |
| El reflejo, visible y sin quemar: el máximo, por debajo del blanco puro | ✅ | **Máximo 243 de 255** en los dos (antes, 231 y 225, con un reflejo mucho más pequeño). En las capturas, un lóbulo cian ancho, como el de la referencia. |
| Sin cambios: la Tierra de noche (L\* ≤ 5 y C\* ≤ 3, D40) | ✅ | `node scripts/measure-earth-night.mjs`, antes (`d5ce7f8`) y después, iguales (§5 de esta nota): el suelo sin luces, **L\* 0,2 · C\* 0,2** en escritorio y 0,1 · 0,1 en el móvil; las luces, h 94°. La vista general de noche (19-05-2026), su disco con **ΔL\* 4,1** frente al fondo, como antes. |
| Sin cambios: las efemérides y las sombras | ✅ | Nada de `ephemeris/` ni de las sombras (`tlsShadow`, `uOccluderLocal`, `uSunLocal`) ha cambiado; sus tests, en verde (`npm run check`). |
| §5 en los tres niveles (FPS, VRAM, llamadas de dibujo y memoria) | ✅ (provisional) | §6 de esta nota. Sin texturas ni mallas nuevas: la VRAM y las llamadas de dibujo de la vista Tierra, las mismas. |
| Con movimiento reducido, todo quieto | ✅ | La Tierra realzada no añade nada que dependa del tiempo: el reflejo y las nubes son función de la geometría. La deriva de las nubes, la de siempre, se para con movimiento reducido y en las capturas (sus tests). |
| Los textos de «realzado», en sus sitios (lo de la Tierra) | ✅ | «Lo que es ilustrativo» de `/sobre-el-proyecto` (un punto nuevo, la Tierra), `/creditos` (las texturas: la Tierra en color realzado, ajustada al principio con EPIC) y la vista guiada «La Tierra completa» (ya no dice «como la fotografía la cámara EPIC»; fuente: https://science.nasa.gov/earth/facts/, «Earth's global ocean, which covers about 71% of the planet's surface…», comprobada por la sesión del 07-11). `docs/FUENTES.md`: la línea de `earth-day`. La línea del Sol en su ficha y su panel es de A. |

## 4. Las medidas frente a la referencia
`node scripts/measure-d46.mjs --solo=tierra` (15-01-2026, 00:00 UTC; la Tierra completa, con África y Europa de día). Mediana en CIELAB; en el agua, sin el 50 % más claro (nubes y reflejo).

| Región | Referencia (escritorio · móvil) | Antes (escritorio · móvil) | Después (escritorio · móvil) |
|---|---|---|---|
| Atlántico sur | 17,8 · 27,1 · 277° — 15,9 · 24,9 · 276° | 25,6 · 18,7 · 270° — 26,1 · 17,4 · 270° | **30,5 · 33,1 · 275°** — 34,3 · 32,9 · 272° |
| Índico | 6,6 · 20,8 · 286° — 10,9 · 29,9 · 288° | 25,7 · 19,6 · 272° — 24,3 · 19,1 · 272° | **22,7 · 32,6 · 281°** — 21,8 · 32,2 · 281° |
| Sáhara | 64,7 · 19,8 · 81° — 63,0 · 19,6 · 77° | 49,0 · 9,7 · 67° — 49,0 · 9,7 · 67° | **62,2 · 23,4 · 81°** — 62,2 · 23,4 · 81° |
| Sahel | 53,4 · 25,1 · 105° — 53,7 · 23,5 · 90° | 61,4 · 5,5 · 73° (nubes) — 61,7 · 5,5 · 73° | **58,0 · 27,4 · 83°** — 57,8 · 27,6 · 83° |
| Amazonas oriental | 50,4 · 25,0 · 122° — 36,7 · 29,3 · 264° | — — 28,0 · 5,8 · 199° | — — 29,3 · 14,3 · 152° |
| Nubes (fracción del disco) | 0,7 % — 0,7 % | 9,8 % — 8,7 % | **1,5 %** — 1,0 % |
| Reflejo (máximo) | — | 231 — 225 | **243** — 243 |

(Cada celda: L\* · C\* · h. «—»: menos de 200 px de esa región con μ ≥ 0,3; en nuestra vista, el Amazonas oriental cae junto al limbo izquierdo.)

- **El Sáhara**, ya en el tono y el brillo de la referencia (h 81°, L\* 62 frente a 65), con algo más de croma.
- **El Sahel**, más naranja que el de la referencia (h 83° frente a 90–105°). Sus píxeles son áridos para el shader (cálidos), así que el tinte de la vegetación no los toca. La adenda pide medirlo, sin umbral.

## 5. Lo que no cambia y el registro de EPIC
**La noche** (`measure-earth-night.mjs`, el build de partida y el de la rama):

| Medida | Antes (`d5ce7f8`) | Después |
|---|---|---|
| «Las luces de la noche», escritorio: el suelo sin luces | L\* 0,2 (p95 0,8) · C\* 0,2 (p95 1,2) | L\* 0,2 (p95 0,8) · C\* 0,2 (p95 1,2) |
| Lo mismo, móvil | L\* 0,1 (0,5) · C\* 0,1 (0,8) | L\* 0,1 (0,5) · C\* 0,1 (0,8) |
| Las luces (el 2 % más brillante), escritorio · móvil | L\* 66,1 · C\* 27,3 · h 94° — 59,6 · 26,0 · 94° | L\* 66,2 · C\* 27,3 · h 94° — 59,8 · 26,0 · 94° |
| Vista general, la Tierra de noche (19-05-2026, 8,1 px) | disco L\* 26,7 · C\* 1,1; ΔL\* 4,1 | disco L\* 26,7 · C\* 1,1; **ΔL\* 4,1** |
| Vista general, de lado (08-04-2026, 7,7 px) | disco L\* 24,9; ΔL\* 9,7 | disco L\* 23,1; ΔL\* 7,9 (su mitad de día, realzada) |

**EPIC** (`measure-earth-epic.mjs`, tarea 15; ya no es criterio: queda como registro). La relación de brillo océano / desierto, conjunta:
- EPIC: 0,178.
- Antes: 0,189 (1,06 veces la de EPIC).
- Después: **0,108** (0,61 veces): el desierto, más claro, y el océano, de su azul.

Las nubes, en el percentil 98: antes, 0,603–0,696; después, 0,488–0,504 (menos nubes y menos opacas).

## 6. §5 (provisional)
Con la GPU del equipo (una RTX 3060 con ANGLE sobre D3D11), mientras trabajaban también A y C. **Provisional:** se repite al cerrar la fase, con el equipo libre.

**`measure-views.mjs`.** Cada celda: FPS mínimo · VRAM (MB) · llamadas de dibujo.

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| sistema | 60 · 50 · 36 | 60 · 50 · 36 | 60 · 38 · 21 |
| marte (primer plano) | 60 · 138 · 7 | 60 · 74 · 7 | 59 · 62 · 7 |
| saturno (primer plano) | 60 · 106 · 12 | 59 · 74 · 12 | 59 · 62 · 12 |
| dione (luna de saturno) | 60 · 74 · 5 | 59 · 74 · 5 | 59 · 54 · 5 |
| jupiter (sus lunas) | 60 · 100 · 7 | 59 · 68 · 7 | 59 · 56 · 7 |
| europa (luna de jupiter) | 59 · 68 · 5 | 59 · 68 · 5 | 59 · 48 · 5 |
| triton (luna de neptuno) | 60 · 63 · 5 | 59 · 63 · 5 | 59 · 43 · 5 |
| fobos (luna de marte) | 60 · 63 · 5 | 58 · 63 · 5 | 59 · 43 · 5 |
| urano (sus lunas) | 60 · 71 · 6 | 60 · 71 · 6 | 60 · 59 · 7 |
| miranda (luna de urano) | 59 · 71 · 5 | 60 · 71 · 5 | 60 · 51 · 5 |
| deimos (luna de marte) | 60 · 63 · 5 | 59 · 63 · 5 | 60 · 43 · 5 |
| sol (primer plano) | 60 · 172 · 23 | 59 · 76 · 23 | 60 · 64 · 8 |
| **tierra (vista)** | **59 · 278 · 6** | **59 · 86 · 6** | **60 · 86 · 6** |
| luna (vista) | 60 · 266 · 7 | 60 · 103 · 7 | 60 · 62 · 7 |
| cielo (vista) | 60 · 39 · 5 | 59 · 39 · 5 | 60 · 38 · 5 |

- **La vista Tierra,** igual que en la 9b.d (60 · 278 · 6, 59 · 86 · 6 y 59 · 86 · 6): ni texturas ni mallas nuevas, solo unas operaciones más en su shader.
- **`measure.mjs`** (la vista general a 1 día/s):
  - en la primera pasada salió a 44, 26 y 39 FPS de mínimo, con 26 ms de CPU por frame y las efemérides (JS puro, sin cambios) a 9,5 ms: el equipo estaba cargado por las otras sesiones;
  - justo después, el build de partida (`d5ce7f8`) dio 60 FPS y 1,7 ms;
  - el de la rama, repetido, **60 · 59 · 60 FPS** de mínimo y **1,6 · 1,5 · 1,2 ms** de CPU por frame (el de partida, 1,7 · 1,5 · 1,1).
- **La memoria,** estable:
  - tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas: 11 MB de heap (como al empezar), un contexto WebGL y 25 texturas;
  - las geometrías, de 15 a 17 tras las vueltas por las lunas (las formas de Fobos y Deimos, como en la 9b.d).

## 7. Decisiones (con su porqué)
- **El reflejo, con dos tonos.** El núcleo, blanco (el Sol); el lóbulo ancho, cian (`glint.tint`): sumado en blanco sobre el océano azul salía como una mancha gris. La referencia lo tiene cian. Con `exponent` 12, la mitad de su brillo queda a unos 19° de arco del punto del reflejo, un tercio del radio del disco.
- **La vegetación, por su verdor.** El tinte de la vegetación va donde el verde supera al rojo y al azul. Aplicado a toda la tierra que no es árida, teñía de verde lima la nieve del Himalaya y las salinas del Sáhara, que son neutras.
- **El relieve ×5, sin el escalón de cuantización.** Amplificado, el mapa de normales de 8 bits dibujaba rectángulos en las llanuras (India, Tarim) y manchas oscuras (Afganistán). Antes de amplificar, se quita una zona muerta de ~1,5 niveles. Las pendientes fuertes se saturan por debajo de ~45°. Con más de 6, vuelven los bloques.
- **Las nubes de cerca, a 0,15** (`cloudFade.min`, antes 0,3). En el primer plano del Himalaya, la textura de nubes no da para el zoom (unos 11 px de pantalla por texel) y sus restos eran velos borrosos. Con la Tierra entera a la vista, nada cambia: las nubes van enteras hasta `from`.
- **La noche, con la Tierra de la fase 5.** El relleno nocturno de la vista general sale del albedo y de las nubes. Con los realzados (océano más oscuro, menos nubes), la Tierra de noche dejaba de leerse como un disco: ΔL\* de 4,1 a −0,2. El relleno de la noche y las nubes que tapan las luces usan ahora el albedo (con la rodilla de lo árido de EPIC) y las nubes de la textura. Por eso la rodilla realzada va en su propio uniforme (`uEnhancedAridKnee`, solo de día) y `uArid` no cambia.
- **El océano, oscuro y saturado,** como la referencia: más croma que ella (33 frente a 21–27) y su tono, a 2–7°. Por L\*, el Atlántico sale más claro (30 frente a 18): la región de la referencia cae junto al limbo, más oscuro con su luz.

## 8. Desviaciones y avisos para A (al juntar)
- **Los nombres de las capturas,** con el prefijo de la herramienta compartida (`antes-d46-…` y `despues-d46-…`), no con `tierra-`. Son solo de la Tierra (`tierra-completa`, `pacifico`, `himalaya`) y no chocan con las del Sol.
- **Por regenerar después de juntar** (salen con la Tierra):
  - el póster de la vista general (`build-poster.mjs`);
  - la imagen para compartir (`render-body-images.mjs --og`);
  - `docs/revision-textos.md` (`build-text-review.mjs`: cambia el texto de «La Tierra completa»).
  
  La miniatura de la Tierra y las imágenes de su ficha están en esta rama (§9).
- **Archivos compartidos que toco,** con cambios pequeños:
  - `world.ts`: `configureEarth`, la fuerza del relieve en `assignRelief` y el tinte del halo en `createAtmosphere`;
  - `engine.spec.ts`: un test nuevo y el comentario de `uArid`;
  - `visual-config.ts`: el bloque `earth.enhanced` y `earth.cloudFade.min`;
  - `about-page.html`: un punto nuevo, después de la totalidad;
  - `credits-page.html`: el punto de las texturas;
  - `docs/FUENTES.md`: la línea de `earth-day`.
- **El rendimiento (§6),** provisional: tres sesiones en el mismo equipo.

## 9. Imágenes del motor
- **Regeneradas con la Tierra realzada:** la miniatura (`public/img/cuerpos/tierra.webp`, con `build-body-thumbnails.mjs`) y las imágenes de la ficha de la Tierra (`public/img/fichas/tierra-360.webp` y `-720.webp`, con `render-body-images.mjs --solo=tierra`).
- **Las de los demás cuerpos, sin tocar.** El script de las miniaturas las rehace todas; solo se sube la de la Tierra.
  - Marte y Titán: con el tinte del halo como uniforme a 1, cambiaban algún píxel (diferencia media 0,02 y 0,56; máxima 7 y 17). Por eso el tinte va con su `#define` (`TLS_TINT`), solo en la Tierra: ahora salen idénticas a las del repo.
  - Venus cambia de una pasada a otra también con el build de partida (máxima 13), así que no se sube.
- **Para A:** el póster de la vista general y `og.jpg` (llevan la Tierra), mejor después de juntar el Sol (§8).

## 10. `npm run check`
En verde (08-11, sobre `929818c`):
- lint, sin avisos;
- Prettier, limpio;
- **763 tests** (77 ficheros), con la cobertura de `ephemeris/` al 98,93 %;
- el build;
- el JS inicial, en 310,81 kB, y el código propio inicial, en **14,86 kB de 15**;
- three, diferido, en 791,74 kB (en la 9b.d, 785,41: el GLSL nuevo y los bloques `enhanced`);
- **1183 enlaces internos** bien.

Los e2e de la Tierra, del contenido y del móvil (`E2E_PORT=4411 npx playwright test e2e/tierra.spec.ts e2e/contenido.spec.ts e2e/movil.spec.ts`), en verde: 2 y 31.

**Para la revisión:** el test «las nubes derivan con los frames pintados…» (`engine.spec.ts`, fase 5) falló una vez, en una ejecución parcial con el equipo cargado por las otras sesiones. Pasó en las dos siguientes, también en el check completo. Usa un reloj simulado y no toca nada de esta entrega (ni la deriva ni `cloudDrift` cambian). No he encontrado la causa.
