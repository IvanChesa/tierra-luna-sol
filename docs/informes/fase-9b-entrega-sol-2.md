# Entrega 9b.f, el Sol, segunda vuelta (D46): nota de entrega

- **Rama:** `fase-9b-f-sol-2` (desde `fase-9b-sol-lunas`, `d765654`, con la Tierra de la 9b.f ya junta), en su worktree; puertos 4380 / 4431.
- **Fecha:** 2026-11-08
- **Estado:** hecha y medida, **esperando la opinión de Iván** (la sesión de revisión le enseña las comparativas). Sin fusionar.
- **Por qué:** Iván, el 08-11, sobre el Sol de la primera vuelta: «Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo».

## 1. Resumen

El Sol del explorador se parece ahora al de la referencia (earth.ethanplus.ai), con un shader propio y procedural (ni su textura ni su código):

- **El disco:** naranja saturado en todo él, también en la vista general, donde el resplandor ya no lo lava. Lleva manchas claras (más amarillas) y oscuras (más rojas) a escala media y grande, granulación fina, manchas solares pardas de borde suave y el borde algo más oscuro y rojizo.
- **El resplandor:** un borde fino naranja rojizo pegado al limbo, un resplandor suave naranja algo más ancho y rayos cortos y finos. Ya no hay la mancha grande y pálida: el bloom está apagado y, de cerca, también la corona.
- **Las protuberancias:** fuera los bultos sólidos. Hay tres bucles de plasma de hilos finos y translúcidos, que se desvanecen con la altura, solo de cerca y moviéndose despacio.
- **El movimiento:** la superficie fluye y los bucles cambian, despacio, también con el tiempo en pausa. Con movimiento reducido, quieto.
- **Lo que no cambia:** `/cielo` sigue igual píxel a píxel.

## Plan

1. Worktree propio, `npm ci` y `assets-src/referencias/` copiada de la carpeta principal (solo para medir; ignorada por git).
2. Antes de cambiar nada, con el build de partida (`d765654`):
   - las capturas «antes» (`sol2-antes-d46-*`);
   - las de `/cielo` en PNG, sin pérdidas, para compararlas píxel a píxel;
   - las medidas de base (`measure-d46.mjs --solo=sol` y `measure-sun.mjs totalidad`).
3. Las cifras de la referencia que fijan el aspecto:
   - el disco, en CIELAB: los percentiles de L\*, C\* y h, lo claro y lo oscuro y el perfil radial;
   - el halo, anillo a anillo;
   - el resplandor de la vista general.
4. El shader, probado inyectándolo en la página (sin rehacer el build en cada prueba), contra esas cifras y lado a lado con la referencia. Después, a `sun-material.ts`, `VISUAL_CONFIG.sun` y `world.ts`.
5. El movimiento en pausa (un enganche mínimo en `engine.ts`), con sus tests.
6. Las medidas y las capturas:
   - las de los criterios, con la vista general añadida a `measure-d46.mjs`;
   - las comparativas a la sesión de revisión, y esperar a Iván.
7. Lo que pidió la revisión mientras tanto (08-11):
   - las zonas oscuras, menos pardas;
   - el σL\* que no baje nunca de 4,13;
   - un resplandor suave naranja;
   - `npm run check`, §5, `/cielo` y esta nota.

## 2. Criterios de aceptación

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas antes, después y referencia, lado a lado: de cerca y en la vista general, en escritorio y en móvil | ✅ (la referencia, solo en local) | `sol2-antes-d46-*` (el Sol de la sesión A, del build de partida) y `sol2-despues-d46-*`, de `escritorio-sol-cerca`, `movil-sol-cerca`, `escritorio-sol-sistema` y `movil-sol-sistema` (§7). Lado a lado con las de la referencia, con `capture-d46.mjs --prefijo=sol2-despues --antes=sol2-antes --comparar`, en `assets-src/referencias/comparativas/sol2-despues-d46-*.png`: D46 pide no subir las capturas de la referencia. |
| De cerca, frente a la referencia: el h a ±5° y el C\* ≥ 90 % | ✅ | `measure-d46.mjs --solo=sol` (tabla abajo). **Escritorio:** el centro, h 81° (la referencia, 81°) y C\* 51,4 (51,5; el 100 %); el borde, h 75° (76°) y C\* 56,1 (53,4; el 105 %). **Móvil:** el centro, h 81° (81°) y C\* 51,3 (el 100 %); el borde, h 74° (76°) y C\* 56,3 (el 105 %). |
| En la vista general, el disco naranja y sin lavar, medido | ✅ | `measure-d46.mjs --solo=sol`, ahora también con la vista general (§5): el centro, el borde y el resplandor, la mediana de L\* a 1,5, 2 y 3 radios, con la del fondo a 6. **Escritorio:** el centro, L\* 79,8 · C\* 51,3 · h 81° (la referencia, 80,9 · 49,8 · 83°); el resplandor, L\* 13,2 a 1,5 radios y 8,2 a 2, sobre un fondo de 6,0 (la referencia, 13,1 y 9,1 sobre 1,5). **Móvil:** el centro, 79,8 · 51,4 · 81° (81,6 · 48,9 · 84°). **Antes** (escritorio, la misma medida): el centro, L\* 98,3 · C\* 21,3 · h 106°, casi blanco, y el resplandor, L\* 58,5 a 1,5 radios y 40,0 a 2: la mancha pálida. |
| El contraste a gran escala (σL\* sin el perfil del limbo), al menos el de la referencia | ✅ | **De cerca:** 4,75 en escritorio y 4,77 en móvil (la referencia, 4,13 y 4,21). **A lo largo del tiempo:** 10 instantes de los primeros 5 minutos de reloj, de 0 a 300 s, dan de **4,66 a 5,57**. La primera versión de esta vuelta (`5b4d1de`) bajaba a 4,09 en algunos instantes; arreglado con el límite suave (§5). |
| `/cielo`, igual que ahora | ✅ | **Píxel a píxel, igual:** 0 canales distintos en las 5 capturas PNG del lienzo, antes (`d765654`) y después. Son la totalidad del 12-08-2026 desde Fraga, de cerca, de lejos y en móvil; la puesta de Sol desde el Montsec; y el Sol de cerca en el cielo. `CORONA_GLSL`, la corona que también usa `/cielo`, no se ha tocado. `measure-sun.mjs totalidad` da las cifras de la 9b.c: la Luna, L\* 12,0; el cielo lejos de la corona, L\* 19,3 · C\* 14,8 · h 283°; el horizonte, h 65° a 0,5°. Y el limbo de D41 con `?medida=limbo`: α R 0,429 · G 0,511 · B 0,629, como antes. |
| §5 en los tres niveles | ✅ (provisional: con otras sesiones en el mismo PC; se repite al cerrar la fase) | `measure-views.mjs` y `measure.mjs` (§6). |
| Con movimiento reducido, quieto | ✅ | **Tests en `engine.spec.ts`:** con movimiento reducido y en las capturas, el tiempo de la superficie, de la granulación y de los bucles se queda en 0 y no hay frames de más. **En uso real** (`scripts/capture-sun-motion.mjs`, sin el modo de captura y con `?fecha=`, que arranca en pausa): dos capturas del lienzo separadas 6 s cambian 7,5 de 255 de media en el disco y 0,3 fuera; con `prefers-reduced-motion`, 0,00 y 0,00. |
| El movimiento, visible y lento | ✅ | Las mismas capturas (`sol2-movimiento-t0` y `-t6`): en 6 s la superficie cambia de forma, sin saltos; en un minuto cambia del todo. **Los bucles:** respiran y se mecen en decenas de segundos y se encienden y se apagan en unos minutos. Antes, con el tiempo en pausa el motor dejaba de pintar y el Sol se quedaba quieto. Ahora, de cerca, pinta cada 50 ms (§5). |

**El Sol, medido** (`measure-d46.mjs --solo=sol`, el build de `315c1a9`, el 15-01-2026; en CIELAB):

| | Centro (μ > 0,9) | Borde (μ 0,15–0,35) | σL\* |
|---|---|---|---|
| Referencia, de cerca, escritorio | L\* 78,6 · C\* 51,5 · h 81° | 71,8 · 53,4 · 76° | 4,13 |
| Referencia, de cerca, móvil | 78,6 · 51,5 · 81° | 71,6 · 53,6 · 76° | 4,21 |
| Primera vuelta (sesión A), de cerca, escritorio | 78,8 · 48,2 · 83° | 66,4 · 51,7 · 79° | 5,65 |
| **Ahora, de cerca, escritorio** | **79,7 · 51,4 · 81°** | **69,8 · 56,1 · 75°** | **4,75** |
| **Ahora, de cerca, móvil** | **79,8 · 51,3 · 81°** | **69,3 · 56,3 · 74°** | **4,77** |
| Referencia, vista general, escritorio | 80,9 · 49,8 · 83° | 59,8 · 50,0 · 68° | — |
| **Ahora, vista general, escritorio** | **79,8 · 51,3 · 81°** | **69,2 · 56,9 · 74°** | — |
| **Ahora, vista general, móvil** | **79,8 · 51,4 · 81°** | **69,0 · 57,3 · 74°** | — |
| Primera vuelta, vista general, escritorio | 98,3 · 21,3 · 106° | 93,4 · 38,1 · 97° | — |

En la vista general el disco mide 30,9 px de radio en escritorio y 19,2 px reales en móvil; el de la referencia, 15,3 y 7,7. Por eso el σL\* de la vista general no se compara.

**El disco, por dentro** (μ > 0,5, de cerca, escritorio; en el instante de la captura):

| | L\* p5 · p50 · p95 | Lo oscuro (el 10 %) |
|---|---|---|
| Referencia | 68,1 · 77,8 · 84,2 | C\* 59,6 · h 72° |
| Ahora | 65,7 · 77,5 · 85,4 | C\* 62,0 · h 72° |

**El halo, de cerca** (la mediana de L\* y su tono en anillos fuera del disco, escritorio):

| ρ (radios) | 1,02 | 1,05 | 1,10 | 1,20 | 1,50 |
|---|---|---|---|---|---|
| Referencia (fondo L\* 1,5) | 20–32 · 44–48° | ~11 · ~36° | 4,6 · 23° | 2,0 | 1,5 |
| Primera vuelta (fondo 6) | 57,7 · 70° | 54,0 · 72° | 47,7 · 72° | 38,6 · 73° | 24,8 · 74° |
| Ahora (fondo 6) | 28,6 · 56° | 21,5 · 54° | 14,9 · 27° | 9,0 | 6,0 |

## 3. Tareas

| Tarea | Estado | Notas |
|---|---|---|
| Protuberancias: fuera los bultos; si se ponen, bucles finos de plasma | hecha | Tres bucles, cada uno con 14 hilos finos (de ~1 px; su ancho, con un mínimo de 0,45 px para que no parpadeen) y translúcidos, en arco entre dos pies en el limbo. Se desvanecen con la altura, con nudos y brillos a lo largo, y cada uno respira, se mece y se enciende y se apaga despacio. Solo de cerca. |
| Color: el naranja de la referencia en todo el disco, también en la vista general | hecha | Paleta lineal antes del tone mapping, con intensidad 1 de cerca y de lejos: el disco no pasa de la compresión del tone mapping neutro, que lo lavaba a crema. |
| Resplandor: halo fino naranja rojizo con rayos cortos y finos, sin la mancha pálida y sin tapar planetas | hecha | **El borde:** dos caídas exponenciales de 0,01 y 0,035 radios, con un mínimo en píxeles. **El resplandor suave:** 0,09 radios, naranja; lo sugirió la revisión. **Los rayos:** 283 + 157 por vuelta, con su curva; por debajo de 2 px se funden en su media. **La vista general:** el resplandor ancho, muy tenue (L\* 8,2 a 2 radios sobre un fondo de 6). Bloom y corona, apagados. |
| Superficie: manchas claras y oscuras a escala media y grande, granulación fina, manchas solares oscuras, borde algo más oscuro y rojizo | hecha | **Las manchas:** ruido de gradiente propio en cinco octavas, retorcido por un campo que cambia con el tiempo, con un límite suave de lo que oscurece y aclara. **La granulación:** dos octavas finas. **Las manchas solares:** pardas, de borde suave. **El borde:** la paleta, más roja, con el perfil del limbo de la 9b.c suavizado (§4). |
| Movimiento visible y lento; con movimiento reducido, quieto | hecha | El tiempo de la superficie, de la granulación y del halo sigue el reloj de pared mientras se pinta. De cerca, se pinta también en pausa. |
| Capturas antes, después y referencia; enviarlas a la sesión de revisión y esperar | hecha | Enviadas el 08-11 (`af72223`). Esta nota y las capturas están al día con `315c1a9`. |

## 4. Desviaciones y su motivo

- **El oscurecimiento del limbo, más suave en el realzado:**
  - Usa los exponentes de la 9b.c por 0,55: la misma ley por canal, más suave. A μ 0,44 el disco baja al 80 % (con los de la 9b.c, al 66 %; en la referencia, al 83 %).
  - Con los de la 9b.c, el borde salía pardo y el disco, más oscuro que la referencia en toda su mitad exterior.
  - D46 (tarea 1) pedía conservar el perfil «como forma». Lo aprobó la sesión de revisión el 08-11.
  - El limbo de `?medida=limbo` sigue siendo el de D41, medido igual.
- **El bloom de la 9b.c, apagado en el explorador** (`VISUAL_CONFIG.sun.bloom.enabled`):
  - Desenfoca el disco entero. Su resplandor caía también sobre el disco, lo aclaraba hacia el amarillo y, en la vista general, lo lavaba; ancho y del color del disco, era «la mancha grande y pálida».
  - El borde fino, el resplandor suave y los rayos los pinta el halo, igual en los tres niveles y sin sus 15 pasadas.
  - El módulo se queda, con su interruptor, por si se vuelve al Sol de D41. Sus tests lo encienden.
- **La corona de cerca, apagada en el explorador:** era un velo pálido hasta 3 radios, y la referencia es negra a 1,2. La de la totalidad de `/cielo` es otra y no cambia.
- **La granulación:** en la 9b.c eran celdas de Worley de 40 por radio, con calles oscuras; ahora es ruido fino. Las celdas se veían como un mosaico y la referencia tiene un grano fino. `?medida=limbo` no la usa.
- **El render bajo demanda tiene una excepción:**
  - Con el Sol de cerca y nada más en marcha, el motor pinta cada 50 ms, para que su superficie fluya también en pausa (como en la referencia).
  - No se aplica en la vista general, en las vistas Tierra, Luna y cielo, con movimiento reducido, en las capturas ni con la pestaña oculta.
  - Con la reproducción lenta (hasta 60 s/s), el Sol de cerca se pinta a ese ritmo en lugar de a 4 Hz.

## 5. Decisiones técnicas nuevas

- **El realzado del disco, en `sun-material.ts`:**
  - la paleta (centro y borde) y su mezcla por μ;
  - el perfil suavizado, con el brillo de μ = 0,1 en el último 0,5 % del radio (sin él, la ley iba a negro y el borde salía oscuro y dentado);
  - la estructura (cinco octavas de ruido de gradiente propio; cada octava se apaga cuando su detalle mide menos de un par de píxeles, sin moiré en la vista general);
  - su forma y un límite suave (tanh), con una ganancia por canal distinta en lo claro y en lo oscuro;
  - la granulación fina y las manchas pardas (su sombra, elevada a 1, 1,6 y 2,2 por canal).
- **El contraste, estable:**
  - En la primera versión, el contraste dependía de unas pocas manchas grandes y oscilaba de 4,1 a 6,3 en cinco minutos, con zonas pardas en algunos instantes (el 5 % más oscuro, hasta L\* 57).
  - Con el límite suave de lo oscuro, una forma más lineal y algo más de amplitud, queda de 4,66 a 5,57, y lo oscuro, como en la referencia (C\* 62,0 y h 72°, frente a 59,6 y 72°).
  - Se probaron también una primera octava más alta (3,4 ciclos por radio), que da cifras aún más estables. Cambiaba el carácter de la superficie, a «camuflaje», y la revisión pidió no cambiar el aspecto hasta que opine Iván.
- **El halo** (`createHaloMaterial`):
  - el borde fino, el resplandor suave y los rayos, con anchos mínimos en píxeles y su media cuando una celda mide menos de 2 px;
  - los bucles, con la distancia a cada semielipse aproximada por el valor de su ecuación entre su gradiente;
  - empieza a 0,97 radios: donde la silueta de la malla (un polígono) se queda dentro del círculo, el hueco lleva el borde y no el fondo; en el resto, el disco lo tapa.
- **El enganche del motor:** `SUN_FRAME_MS` (50 ms) y `sunAnimates()` en `engine.ts`; el interruptor del bloom en `compileSunBloom` y `sunBloomWanted`.
- **Herramientas:**
  - `capture-d46.mjs`, con `--antes=` para comparar con la primera vuelta;
  - `measure-d46.mjs`, con la vista general (`overviewSunMetrics` y `ringLightness`, en `scripts/lib/disc-metrics.mjs`);
  - `scripts/capture-sun-motion.mjs`, nuevo: el movimiento en uso real, con y sin movimiento reducido.
- **El radio del halo de la vista general no cambia** (2,4 radios): `labels.ts` lo usa para apartar los nombres del Sol.

## 6. Salida de los checks

```
npm run check (315c1a9)
  ng lint + prettier --check: sin errores ("All matched files use Prettier code style!")
  tests: 77 ficheros, 766 tests, todos pasan; cobertura de ephemeris/: 98,93 % de sentencias, 94,18 % de ramas, 100 % de funciones, 99,69 % de líneas
  build: 40 rutas prerenderizadas, sin avisos de presupuesto
  check-initial-bundle: ninguna página lleva three, astronomy-engine, los stores ni los controles en su JS inicial; código propio inicial, 14,86 kB de 15,00
  check-links: 1184 enlaces internos bien en las 40 páginas
```

**Rendimiento (§5, provisional):** medido con otras sesiones en el mismo PC; se repite al cerrar la fase.

`measure-views.mjs` (RTX 3060, ANGLE sobre D3D11, el build de `315c1a9`). En **todas las vistas de los tres niveles, 59–60 FPS de mínimo** (§5: ≥ 55 en alto). Las del Sol, en FPS mínimo · VRAM (MB) · llamadas de dibujo:

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| Sistema, ahora | 59 · 38 · 21 | 60 · 38 · 21 | 60 · 38 · 21 |
| Sistema, primera vuelta (con bloom en alto y medio) | 60 · 50 · 36 | — · 50 · 36 | — · 38 · 21 |
| Sol de cerca, ahora | 59 · 161 · 8 | 59 · 65 · 8 | 59 · 64 · 8 |
| Sol de cerca, primera vuelta | 59 · 172 · 23 | 59 · 76 · 23 | 59 · 64 · 8 |
| Vista Tierra, ahora | 60 · 278 · 6 | 60 · 86 · 6 | 59 · 86 · 6 |
| Cielo, ahora | 59 · 39 · 5 | 60 · 39 · 5 | 59 · 38 · 5 |

En la primera vuelta, los FPS de la vista general en medio y en bajo no se midieron (—); su VRAM y sus llamadas son las de la 9b.c, con el mismo bloom.

Sin el bloom, la vista general y el Sol de cerca bajan en VRAM y en llamadas. El shader nuevo del disco (cinco octavas de ruido, la granulación y las manchas) y el del halo (el borde, los rayos y tres bucles de 14 hilos) no bajan los FPS: el coste de CPU por frame del Sol de cerca es de 0,98 ms en alto. La VRAM más alta sigue siendo la de la vista Tierra en alto, 278 MB de 300.

`measure.mjs` (el mismo build):

- **Reposo:** en la vista general, en pausa, 0 frames y 0 `requestAnimationFrame` en 3 s. El pintado cada 50 ms solo va con el Sol de cerca.
- **Reproducción a 1 día/s:** 60 FPS de mínimo en los tres niveles, con 1,37 ms de CPU por frame en alto (en la primera vuelta, 1,83, con el bloom), 21 llamadas y 38 MB.
- **El arranque:** ninguna tarea larga (en la 9b.c, de 53 a 124 ms; la compilación del bloom ya no está). LCP, 232 ms en alto.
- **La memoria:** estable tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas: 11 MB de heap, 12 texturas (25 en la primera vuelta, 13 de ellas del bloom) y un contexto WebGL.
- **El contexto WebGL**, perdido y recuperado: 0 frames mientras falta y uno al volver.

## 7. Capturas (en `docs/informes/img/fase-9b/`)

- **Antes**, el Sol de la sesión A, del build de partida: `sol2-antes-d46-escritorio-sol-cerca`, `sol2-antes-d46-movil-sol-cerca`, `sol2-antes-d46-escritorio-sol-sistema` y `sol2-antes-d46-movil-sol-sistema`.
- **Después:** `sol2-despues-d46-*`, las mismas cuatro.
- **El movimiento:**
  - `sol2-movimiento-t0` y `sol2-movimiento-t6`: el Sol de cerca en uso real, en pausa, con 6 s entre las dos;
  - `sol2-movimiento-reducido-t0` y `-t6`: lo mismo con movimiento reducido, iguales.
- **Lado a lado con la referencia** (solo en local, `assets-src/referencias/comparativas/`): `sol2-despues-d46-escritorio-sol-cerca.png`, `-movil-sol-cerca.png`, `-escritorio-sol-sistema.png` y `-movil-sol-sistema.png`.

## 8. Dependencias añadidas

Ninguna.

## 9. Pendientes

- **La opinión de Iván** sobre esta versión. Si pide cambios, se hacen en esta rama.
- **Las medidas de §5 se repiten al cerrar la fase,** con el PC libre.
- Al juntar, la línea del panel del Sol (de la primera vuelta) sigue pendiente de la 9c, como estaba.

## 11. Cómo probarlo

```bash
npm run build
CAPTURE_PORT=4380 node scripts/measure-d46.mjs --solo=sol
CAPTURE_PORT=4380 node scripts/capture-d46.mjs docs/informes/img/fase-9b --prefijo=sol2-despues --antes=sol2-antes --comparar --solo=d46-escritorio-sol-cerca,d46-movil-sol-cerca,d46-escritorio-sol-sistema,d46-movil-sol-sistema
CAPTURE_PORT=4380 node scripts/capture-sun-motion.mjs docs/informes/img/fase-9b
```

En el navegador: `npm start` y abrir el Sol (`/?cuerpo=sol`). Hay que acercarse y pausar: la superficie sigue fluyendo. Con el sistema en «reducir movimiento», queda quieta.
