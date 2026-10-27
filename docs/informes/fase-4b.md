# Informe: Fase 4b (Pulido de la vista del sistema solar)

- **Rama:** `fase-4b-sistema-solar`
- **Fecha:** 2026-10-27
- **Estado:** listo para revisión (modo autónomo por bloques, bloque C)

## 0. Plan de la fase

Escrito antes de empezar, a partir de `docs/decisiones/FASE-4b-SISTEMA-SOLAR.md` (decisiones de Iván del 27-10), `docs/PLAN.md` (§0–§5, §7, D21, D29–D34 y la fase 4b, ya integrada), el informe de la fase 3b (tarea 11: la luz de la vista general) y el código: `state/speeds.ts` y `explorer-session.ts` (la velocidad de entrada), `scene/orbits.ts` (las órbitas y la estela de movimiento de la fase 3, con `TRAIL_SECONDS = 1`), `ephemeris/scale.ts` (los radios ilustrativos) y `scene/visual-config.ts`.

### Entregas
| Entrega | Contenido |
|---|---|
| 4b.a | **Velocidad por contexto (D33).** Lógica pura en `state/` (el contexto, «vista general» o «cuerpo», y su velocidad: 3 días/s o 1 h/s), con tests de cada transición. La aplica `ExplorerSession` donde cambia el contexto (`select()` y `applyView()`, sin `effect()` derivados): conserva el sentido y no toca la reproducción. Un cambio manual se respeta hasta el siguiente cambio de contexto; cambiar de un cuerpo a otro no cambia el contexto. El aviso discreto («Velocidad: 1 hora por segundo») va en la misma frase que el del cuerpo, una vez por cambio. `ESTILO.md` con su texto. E2E: al entrar, 3 días/s; al elegir un planeta (lienzo, ficha o índice), 1 h/s; al volver, 3 días/s; un cambio manual, respetado. Se actualizan los tests y los e2e que daban por hecha la entrada a 3 h/s. |
| 4b.b | **Estelas (D34).** En `scene/orbits.ts`: sobre la órbita de cada cuerpo, un arco de su color (`body-colors.ts`), de 1/8 de vuelta (`visual-config.ts`), detrás del cuerpo (delante si va hacia atrás), desvanecido hasta 0, también en pausa. En las lunas, más corto y tenue. Va en el mismo `LineSegments2` (color por vértice, mezcla aditiva): ninguna llamada de dibujo más. Sustituye a la estela de movimiento de la fase 3 (`TRAIL_SECONDS`). Tests de la función del arco. |
| 4b.c | **Planetas más visibles en la vista general.** Radios ilustrativos más grandes (`radiusFactor`, `radiusExponent`, `minRadius` y `maxRadius`), elegidos con un muestreo de 1900–2100 para que ningún disco se solape con el Sol ni con otro planeta (test). Además: el Sol, el mayor, con su halo ajustado; los sistemas de lunas, que crecen con el radio del planeta, revisados para que no ensucien la vista general; las etiquetas (ya esquivan los discos); el relleno y la exposición de la vista general (tarea 11 de la 3b), ajustados con capturas. |
| 4b.d | **Cierre.** Capturas en `docs/informes/img/fase-4b/` (escritorio y móvil: la vista general reproduciendo y en pausa, hacia atrás, con un planeta enfocado). Comparativa con la referencia de Iván. Mediciones (FPS, VRAM y llamadas de dibujo), `npm run check`, e2e, informe, revisión por subagente, correcciones y fusión. |

### Riesgos y dudas
1. **Solapes de discos grandes.** Las órbitas de Júpiter y Saturno se acercan hasta unas 21 unidades en la escala ilustrativa (excentricidades), y las de Urano y Neptuno, hasta unas 17. El tamaño máximo lo fija el muestreo de 1900–2100. Los anillos de Saturno, finos y transparentes, se miran aparte.
2. **La referencia** (la captura de Iván del original) no está en el repositorio: la comparativa se hace con las cifras del documento de origen (Júpiter, ~30 px de radio en la referencia frente a ~8 px hoy) y la evalúa la revisión.
3. **«Cambiar de cuerpo» no es cambiar de contexto:** D33 habla de «enfocar cualquier cuerpo» y de respetar un cambio manual «mientras siga en ese contexto». Se interpreta que los contextos son dos (vista general y cuerpo enfocado). Pasar de Marte a Júpiter mantiene la velocidad elegida a mano, y las vistas Tierra y Luna cuentan como cuerpo enfocado.

### Dependencias
Ninguna nueva.

### Estado de las entregas (se actualiza al cerrar cada una)
| Entrega | Estado | Commits | Notas |
|---|---|---|---|
| 4b.a | ✅ | `062d598` | Velocidad por contexto (D33), con unitarios, e2e y `ESTILO.md`. |
| 4b.b | ✅ | `923f4f0`, `99289ef` | Estelas (D34) y órbitas sin remates (§4.1, §4.2 y §4.8). |
| 4b.c | ✅ | `702bc09` | Radios, sistemas de lunas, Sol y muestreo 1900–2100 (§4.3–§4.7). |
| 4b.d | ✅ | `be67da1`, `ab6a886` y este informe | Pósters regenerados, capturas, mediciones, `npm run check` y e2e. |

## 1. Resumen
La vista general del sistema solar cambia en las tres cosas que pidió Iván. **La velocidad depende del contexto (D33):** se entra a 3 días por segundo y, al enfocar un cuerpo (en el lienzo, en una ficha o en el índice) o en las vistas Tierra y Luna, pasa a 1 hora por segundo; al volver, otra vez 3 días. Se conservan el sentido y la pausa, se respeta un cambio a mano dentro de su contexto y se avisa en la región viva. **Cada cuerpo lleva una estela de su color (D34)** sobre su órbita: 1/8 de vuelta en los planetas (1/12, más tenue, en las lunas), más gruesa junto al cuerpo, detrás de él (delante si el tiempo va hacia atrás) y también en pausa, sin ninguna llamada de dibujo más. **Los planetas son más grandes:** Júpiter pasa de 5,25 a 7,69 unidades (de ~8 a ~15 px de radio en escritorio) y la Tierra de 2,0 a 2,93. Son los mayores con los que, muestreando 1900–2100, nada se solapa: el límite lo ponen las conjunciones de Júpiter y Saturno y la Luna entre la Tierra y Venus. Los sistemas de lunas se compactan y sus órbitas solo aparecen al acercarse, así que la vista general queda más limpia. Se mantienen los 60 FPS, las llamadas de dibujo (42; 43 en la 3c) y la VRAM (35 MB).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Al entrar, 3 días/s; al pinchar un planeta (lienzo, ficha o índice), 1 h/s; al volver a la vista general, 3 días/s. Un cambio manual se respeta en su contexto (unitarios + e2e) | ✅ | **Unitarios:** `state/speeds.spec.ts` (contexto, velocidad con su sentido, texto) y `explorer-session.spec.ts`, «la velocidad según el contexto (D33)»: vista general → cuerpo → vista general, cambio a mano (también de un cuerpo a otro), hacia atrás, en pausa, vistas Tierra y Luna, y entrada en la vista Tierra. **E2E** (`e2e/arranque.spec.ts`): entrada a 3 días/s; ficha de Marte → 1 h/s con el aviso «Velocidad: 1 hora por segundo»; etiqueta de Saturno en el lienzo → 1 h/s; fila de Júpiter en el índice → 1 h/s; vuelta a 3 días/s con «Vista general»; un cambio a mano respetado; con movimiento reducido, el cambio de contexto no arranca la reproducción. |
| Estelas de color visibles a 3 días/s y en pausa, que se desvanecen y siguen el sentido de la reproducción (capturas) | ✅ | `escritorio-sistema` (en pausa), `escritorio-sistema-reproduciendo` (tras 2 s a 3 días/s), `escritorio-sistema-atras` y `movil-sistema-atras` (hacia atrás, delante del planeta). Unitarios: `orbits.spec.ts` (peso del arco, longitudes, tono) y `engine.spec.ts` (color de Mercurio junto al cuerpo en pausa, delante hacia atrás y de nuevo detrás al reproducir; grosor completo junto al cuerpo y el de la órbita a media vuelta; más fina en segundo plano). |
| En la vista general, Júpiter y Saturno se reconocen a simple vista (con anillos) y los rocosos son discos con textura, sin solapes (capturas en escritorio y móvil, junto a la referencia) | ✅ (con la salvedad de §4.3) | `comparativa-antes-despues` (3c frente a 4b), `escritorio-sistema`, `portatil-sistema` y `movil-sistema`: Júpiter con sus bandas y Saturno con sus anillos; los rocosos, discos de 2–3 unidades (4–6 px en escritorio). **Sin solapes:** `scene/illustrative-layout.spec.ts` muestrea 1900–2100 cada 3 días y comprueba que ningún disco toca otro (con al menos 1 unidad de aire), que ninguna luna toca su planeta ni otro cuerpo principal y que nada entra en los anillos de Saturno. La captura de referencia de Iván no está en el repositorio: se compara con sus cifras (§4.9). Júpiter mide ~15 px de radio, frente a ~30 px en la referencia (§4.3). |
| FPS, VRAM y draw calls dentro de §5; `npm run check` y los e2e en verde | ✅ | §6: 60 FPS en los tres niveles en la vista general a 3 días/s, 1,21–1,56 ms de CPU por frame, 42 llamadas de dibujo y 35 MB de VRAM. `npm run check` en verde (475 tests) y 67 e2e en verde. |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 1. Velocidad por contexto (D33) | hecha | La lógica es TS puro en `state/speeds.ts` (`speedContext`, `contextSpeed`, `speedText`) y la aplica `ExplorerSession` en `select()` y `applyView()`, sin `effect()`. |
| 2. Estelas (D34) | hecha | En el mismo `LineSegments2` de las órbitas, con color y grosor por vértice. |
| 3. Planetas más visibles | hecha | Radios, sistemas de lunas compactos, órbitas de lunas por resolución, el Sol y su halo. El relleno, comparado y sin cambios (§4.6). Las etiquetas se recolocan solas: ya esquivaban los discos y ahora leen el halo de la configuración. |
| 4. Comparativa | hecha | `comparativa-antes-despues.webp` y las cifras de la referencia (§4.9). |
| 5. `ESTILO.md` y `PROMPTS.md` | hecha | `ESTILO.md` con los textos del aviso de velocidad (4b.a); `PROMPTS.md` y el plan, al integrar la fase (en `main`, `efc0a93`). |

## 4. Desviaciones del plan y motivo

### 4.1 Las estelas también engordan, no solo cambian de color
Con el grosor de las órbitas (1,25 px), el color de la estela apenas se distinguía (primeras capturas). La estela pasa de 3 px junto al planeta (2 px en las lunas) al grosor de la órbita, con el mismo peso que el color. Va en un atributo más por extremo de segmento (§5.2), sin llamadas de dibujo nuevas.

### 4.2 Las órbitas, sin remates redondos
Con la mezcla aditiva, el remate redondo de cada segmento se sumaba al del siguiente: había una cuenta brillante en cada unión (cada grado) y las líneas, sobre todo las estelas gruesas, se veían punteadas. Se descartan los fragmentos del remate. Con ~1° entre segmentos, la junta a tope no deja hueco visible. Beneficia a todas las órbitas.

### 4.3 Los planetas, más grandes, pero no tanto como en la referencia
En la referencia Júpiter mide ~30 px de radio y aquí ~15 px (antes ~8). Con la escala de distancias logarítmica (D12, §4.4 del plan), Júpiter y Saturno se acercan a ~24 unidades en las conjunciones (1921, 1981, 2040, 2100) y la Luna pasa a ~12 unidades de Venus en cada conjunción inferior (cada 19 meses). Se eligieron los mayores radios sin solapes, medidos con un muestreo de 1900–2100 para cada candidato:

| Candidato | Júpiter (u) | Tierra (u) | Resultado |
|---|---|---|---|
| Antes (`radiusFactor` 0,06, `moonSpread` 1,5) | 5,25 | 2,00 | Calisto y Ganímedes ya atravesaban los anillos de Saturno en 1921 y 1981 |
| **0,088 y 0,5 (elegido)** | **7,69** | **2,93** | Ningún solape; el peor margen, Jápeto frente a Júpiter (1,63 u) |
| 0,09 y 0,5 | 7,87 | 2,99 | Júpiter entra en los anillos de Saturno en las conjunciones de 1921 (62 días) y 1981 (42) |
| 0,10 y 0,45 | 8,74 | 3,33 | Júpiter en los anillos en las cuatro conjunciones más cercanas (126–162 días cada una) y Jápeto dentro de Júpiter |
| Exponente 0,35 (0,15) | 7,50 | 3,22 | Sin solapes, pero con la Luna a 0,95 u de Venus |

Para llegar a la referencia habría que cambiar la ley de distancias o aceptar solapes: es una propuesta para Iván (§10).

### 4.4 Los sistemas de lunas, compactos (y las de Saturno, sobre sus anillos)
Con `moonSpread` 1,5, los sistemas crecían con su planeta: con los radios nuevos, Calisto llegaría hasta Saturno en las conjunciones y la Luna, hasta Venus. Con 0,5 quedan como un sistema compacto alrededor de cada planeta (§4.4 del plan). La contrapartida: las siete lunas de Saturno quedan dentro del radio de sus anillos (antes ya lo estaban Mimas, Encélado, Tetis y Dione). Se midió la alternativa de colocarlas por fuera de los anillos: chocaban con Júpiter en casi todas las conjunciones (hasta 87 días seguidos y hasta 7 unidades dentro de su disco), así que se descartó. Ocultar las lunas en la vista general evitaría las dos cosas, pero contradice §4.4 («las lunas de cada planeta se ven como un sistema compacto alrededor de él»).

### 4.5 Las órbitas de las lunas aparecen cuando el sistema se resuelve
Antes aparecían cuando la luna se separaba de 8 a 30 px del centro de su planeta en pantalla. Con los sistemas compactos, eso dibujaba anillos de órbitas pegados a cada planeta (los que se veían alrededor de Júpiter y Urano). Ahora la separación se mide desde el borde del planeta y con la distancia real en el espacio (en radios del planeta, a la escala de su disco en pantalla). En la vista general quedan ocultas hasta que uno se acerca. Además, la órbita ya no se apaga cuando la luna pasa por delante del disco, como pasaba con la separación proyectada.

### 4.6 El relleno de la vista general, sin cambios
Se compararon capturas con relleno 0,16 (el de la 3b) y 0,24: la diferencia apenas se aprecia. Se mantiene 0,16. Que la Tierra se vea oscura en la vista general viene de su albedo efectivo (la textura de día, sin nubes; `exposureFor` lo documenta hasta la fase 5) y no del relleno. Lo resuelve la fase 5, con las nubes y la Tierra completa.

### 4.7 El Sol, de 13 unidades, menos intenso y con el halo ajustado
El Sol sigue siendo el mayor (13 unidades, 1,7 veces Júpiter; antes 9). Con 14 unidades y la intensidad de la 3b (2,6), era un disco blanco y plano; con 1,9 se intuye el oscurecimiento del limbo. Su halo en la vista general pasa de 3,2 a 2,4 radios (mide ~31 unidades, algo más que antes) y de 1,1 a 1,3 de intensidad. Las etiquetas leen ese tamaño de `VISUAL_CONFIG` en lugar de una copia.

### 4.8 La estela de una órbita en segundo plano es más fina
En las vistas Tierra y Luna, las órbitas de los planetas pasan a un segundo plano (opacidad 0,12), pero la estela conservaba sus 3 px y la de la Tierra se leía como una línea azul gruesa (primera captura de `escritorio-tierra`). El grosor extra se escala con la opacidad de la órbita respecto a la de la vista general (`trails.fullWidthOpacity`). En el marco físico de un planeta enfocado (opacidad 0,3), su estela es una recta tenue que indica hacia dónde se mueve.

### 4.9 La referencia de Iván no está en el repositorio
La comparativa se hace con las cifras del documento de origen (Júpiter, ~30 px en la referencia frente a ~8 px antes y ~15 px ahora) y con `comparativa-antes-despues.webp`. Que Iván la mire junto a su captura queda en pendientes.

### 4.10 Los pósters, regenerados
El 3D entra con un fundido sobre el póster: con los planetas más grandes y las estelas, el de la 3c ya no coincidía. Se regeneraron los seis con `build-poster.mjs` (sistema, Tierra y Luna, en escritorio y móvil).

### 4.11 Archivos nuevos
`scripts/capture-system.mjs` (capturas de la fase, con `--solo=`), `scripts/measure-system.mjs` (mediciones de §6) y `src/app/scene/illustrative-layout.spec.ts` (el muestreo). La estela de movimiento de la fase 3 (`TRAIL_SECONDS`, `MOTION_TRAIL_BOOST`) desaparece: la sustituye D34.

## 5. Decisiones técnicas nuevas

### 5.1 El color de la estela, el del cuerpo con su canal mayor a 1
Los colores esquemáticos son apagados: el de Neptuno, azul oscuro, quedaba por debajo de la órbita gris azulada (luminancia 0,17 frente a 0,25). Se usa el mismo tono con su canal mayor a 1 en el espacio lineal, el más vivo que admite la mezcla aditiva. Junto al cuerpo, la estela sustituye a la órbita (mezcla, no suma), así que conserva su tono en lugar de blanquearse.

### 5.2 El grosor por vértice, con un atributo intercalado y `onBeforeCompile`
`LineMaterial` tiene un único `linewidth`. Se añade un búfer intercalado con el grosor de cada extremo (como el de los colores de three), y el `onBeforeCompile` que ya desvanecía las órbitas sobre los discos lo multiplica en el vértice. El material sigue siendo `LineMaterial`, con sus chunks de profundidad (D13). El test del shader comprueba las tres inyecciones contra el código real de three, para que falle si three cambia sus cadenas.

### 5.3 El sentido de las estelas sale del signo de la velocidad, también en pausa
El motor pasa a la escena el sentido (`trailDirection`) a partir de `clock.speed`, no de la reproducción. Si el signo cambia en pausa, `setSpeed` pide un frame (render bajo demanda).

### 5.4 Un test de muestreo como garantía de los radios
`illustrative-layout.spec.ts` recorre 1900–2100 cada 3 días (~24 000 instantes) con el modelo real del sistema y el polo real de Saturno, en ~4 s. Si alguien cambia los radios o la ley de las lunas, falla con el peor margen de cada comprobación y su fecha.

## 6. Salida de los checks
```
npm run check (27-10, tras la última corrección)
ng lint: All files pass linting. · prettier --check: All matched files use Prettier code style!
Test Files 57 passed (57) · Tests 475 passed (475)
Cobertura de ephemeris/: 99,65 % de sentencias, 96,84 % de ramas, 100 % de funciones y líneas
Initial total 298.23 kB (82.42 kB transferidos) · Prerendered 17 static routes
Pages: 126 ficheros; el mayor, 1,76 MiB de 25
✔ El JS inicial de las 17 páginas no lleva three, astronomy-engine, los stores ni los controles del visor
✔ Código propio en los chunks iniciales: 12.13 kB de 15.00
```
```
npm run e2e (antes de 99289ef, que solo cambia el grosor de las estelas): 67 passed (3.7m)
npm run e2e (código final): 66 passed (3.9m) · 1 failed: «Accesibilidad (axe) › todas las páginas del sitio»
  (escritorio): en /planetas/neptuno, page.waitForLoadState('networkidle') no llegó en 86 s
npx playwright test e2e/accesibilidad.spec.ts -g "todas las páginas" --project=escritorio --repeat-each=4:
  4 passed (31.5s; ~30 s cada una)
```
El fallo es intermitente y no depende de la fase: la ficha de Neptuno no usa el 3D, la traza muestra todas sus peticiones terminadas (la última, un chunk de 468 bytes en 248 ms) y el mismo test pasa en la batería anterior (51 s) y cuatro veces seguidas aislado. Con cuatro workers y la GPU ocupada, alguna conexión no se cerró. La batería completa se repite tras la revisión.

### 6.1 Mediciones (`node scripts/measure-system.mjs`, 27-10; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas de dibujo | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista general a 3 días/s | alta | 60 / 60 | 1,56 ms | 42 | 211 182 | 35 MB |
| | media | 60 / 60 | 1,27 ms | 42 | 94 686 | 35 MB |
| | baja | 60 / 60 | 1,21 ms | 42 | 62 262 | 35 MB |
| Júpiter enfocado a 1 h/s | alta | 60 / 60 | 1,03 ms | 7 | 43 690 | 75 MB |
| | media | 59 / 59,8 | 1,00 ms | 7 | 26 362 | 43 MB |
| | baja | 59 / 59,8 | 0,94 ms | 7 | 18 970 | 43 MB |

La 3c medía en la vista general 43 llamadas y 35 MB, con 1,32–1,92 ms de CPU por frame a 3 horas por segundo: las estelas no añaden llamadas ni coste apreciable, a pesar de que la vista general va ahora a 3 días por segundo. Todo dentro de §5 (≥ 55 FPS; VRAM ≤ 300 MB en alto y ≤ 120 MB en bajo).

### 6.2 Radios ilustrativos (unidades de escena)
| | Sol | Mercurio | Venus | Tierra | Marte | Júpiter | Saturno | Urano | Neptuno | Luna |
|---|---|---|---|---|---|---|---|---|---|---|
| Antes | 9 | 1,36 | 1,95 | 2,00 | 1,55 | 5,25 | 4,90 | 3,48 | 3,43 | 1,19 |
| Ahora | 13 | 1,99 | 2,87 | 2,93 | 2,27 | 7,69 | 7,19 | 5,10 | 5,04 | 1,74 |

Peores márgenes del muestreo 1900–2100 (unidades): discos, Venus–Tierra 6,38 (y Tierra–Marte 7,79, Júpiter–Saturno 9,08); lunas frente a su planeta, Fobos 0,24; lunas frente a otro cuerpo, Jápeto–Júpiter 1,63 y Luna–Venus 2,09; Júpiter nunca entra en los anillos de Saturno.

## 7. Capturas
En `docs/informes/img/fase-4b/` (modo de captura, 24-10-2026, salvo la que reproduce):
- `comparativa-antes-despues`: la vista general de la 3c y la de la 4b, recortadas.
- `escritorio-sistema` (en pausa), `escritorio-sistema-reproduciendo` (tras 2 s a 3 días/s) y `escritorio-sistema-atras` (hacia atrás: la estela, delante).
- `escritorio-jupiter` y `escritorio-saturno` (enfocados, a 1 hora/s; Saturno con los anillos casi de canto, como en 2026) y `escritorio-tierra` (la estela de la Tierra, fina, en segundo plano).
- `portatil-sistema` (1280 × 720).
- `movil-sistema`, `movil-sistema-atras` y `movil-jupiter` (390 × 844 a 2×).

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- Iván: mirar la vista general junto a su captura de referencia (no está en el repositorio) y en su móvil (no bloquea).
- Fase 5: la Tierra se ve oscura en la vista general (albedo efectivo de la textura sin nubes, §4.6).
- Siguen los de la fase 4 (NEL de Cloudflare, Access y entorno de GitHub opcionales, dominio propio).

## 10. Propuestas de cambio al plan
Para que Iván decida, si quiere los planetas aún más grandes (como en la referencia):
1. **Cambiar la ley de distancias** (`referenceAu` de 0,1 a 0,2 UA): da ~12 % más de espacio relativo a los planetas exteriores, pero acerca los interiores al Sol (Mercurio, de 69 a 47 unidades) y cambia el aspecto de toda la vista general.
2. **Aceptar solapes breves y raros:** con `radiusFactor` 0,10, Júpiter mide 8,7 unidades, pero atraviesa los anillos de Saturno durante 4–5 meses en cada conjunción cercana (la próxima, en 2040).
3. **Ocultar las lunas en la vista general** (aparecerían al enfocar su planeta): limpia aún más la vista y saca las lunas de los anillos de Saturno, pero cambia §4.4 del plan.

Mientras tanto, se queda la opción sin solapes.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/`: la vista general se mueve a 3 días por segundo y cada planeta lleva su estela de color.
2. Elegir Júpiter (en el lienzo, en la ficha o en el índice): la velocidad pasa a «1 hora por segundo» y se anuncia. Con «Vista general», vuelve a 3 días por segundo. Cambiar la velocidad a mano y pasar a otro planeta: se respeta.
3. Pausar (`k`) y pulsar `r` (hacia atrás): las estelas pasan delante de cada planeta.
4. Ir a finales de octubre de 2040 (`/?fecha=2040-10-31T00:00Z`), la conjunción de Júpiter y Saturno, y verlos pasar cerca sin tocarse.
5. Capturas y mediciones: `npm run build && node scripts/capture-system.mjs docs/informes/img/fase-4b && node scripts/measure-system.mjs`.
