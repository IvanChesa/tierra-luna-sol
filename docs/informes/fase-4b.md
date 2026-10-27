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
| 4b.c | ✅ | `702bc09` y, tras la revisión, `4cd68ec`, `13be4fb` y `a01a260` | Radios, sistemas de lunas, Sol, relleno y muestreo 1900–2100 (§4.3–§4.7). |
| 4b.d | ✅ | `be67da1`, `ab6a886`, `c28155e` y este informe | Pósters, capturas, mediciones, `npm run check`, e2e, revisión y correcciones. |

## 1. Resumen
La vista general del sistema solar cambia en las tres cosas que pidió Iván.

**La velocidad depende del contexto (D33).** Se entra a 3 días por segundo. Al enfocar un cuerpo (en el lienzo, en una ficha o en el índice), o en las vistas Tierra y Luna, pasa a 1 hora por segundo; al volver, otra vez 3 días. Se conservan el sentido y la pausa, se respeta un cambio a mano dentro de su contexto y el cambio se anuncia en la región viva.

**Cada cuerpo lleva una estela de su color (D34)** sobre su órbita: 1/8 de vuelta en los planetas y 1/12, más tenue, en las lunas. Es más gruesa junto al cuerpo, va detrás de él (delante si el tiempo va hacia atrás), se ve también en pausa y no añade ninguna llamada de dibujo.

**Los planetas son más grandes:** Júpiter pasa de 5,25 a 7,34 unidades (de ~8 a 13–17 px de radio en escritorio) y la Tierra, de 2,0 a 2,79. Son los mayores con los que, muestreando 1900–2100, ningún disco toca otro ni los anillos de Saturno, con una unidad de aire. El límite lo ponen las conjunciones de Júpiter y Saturno y la Luna entre la Tierra y Venus. Los sistemas de lunas se compactan. Cada luna, como su órbita, solo aparece cuando su sistema se distingue en pantalla: en la vista general quedan los planetas limpios, sin bultos pegados. El relleno sube a 0,3 para que los planetas vistos por su cara nocturna se lean como discos.

**Rendimiento:** 60 FPS, 21 llamadas de dibujo (43 en la 3c) y 35 MB de VRAM. En móvil, los rocosos siguen siendo marcadores de 1–2 px: queda como decisión de Iván (§10).

## 2. Criterios de aceptación
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Al entrar, 3 días/s; al pinchar un planeta (lienzo, ficha o índice), 1 h/s; al volver a la vista general, 3 días/s. Un cambio manual se respeta en su contexto (unitarios + e2e) | ✅ | **Unitarios:** `state/speeds.spec.ts` (contexto, velocidad con su sentido, texto) y `explorer-session.spec.ts`, «la velocidad según el contexto (D33)». Cubren vista general → cuerpo → vista general, el cambio a mano (también de un cuerpo a otro), hacia atrás, en pausa y las vistas Tierra y Luna. La entrada en la vista Tierra crea la sesión antes que la vista, como en la aplicación. **E2E** (`e2e/arranque.spec.ts`): entrada a 3 días/s; ficha de Marte → 1 h/s, con el aviso «Velocidad: 1 hora por segundo»; etiqueta de Saturno en el lienzo → 1 h/s; fila de Júpiter en el índice → 1 h/s; vuelta a 3 días/s con «Vista general»; un cambio a mano, respetado; con movimiento reducido, el cambio de contexto no arranca la reproducción. |
| Estelas de color visibles a 3 días/s y en pausa, que se desvanecen y siguen el sentido de la reproducción (capturas) | ✅ | **Capturas:** `escritorio-sistema` (en pausa), `escritorio-sistema-reproduciendo` (tras 2 s a 3 días/s), y `escritorio-sistema-atras` y `movil-sistema-atras` (hacia atrás, delante del planeta). **Unitarios:** `orbits.spec.ts` (peso del arco, longitudes, tono e inyecciones en el shader) y `engine.spec.ts` (color de Mercurio junto al cuerpo en pausa, delante hacia atrás y otra vez detrás al reproducir; grosor completo junto al cuerpo y el de la órbita a media vuelta; más fina en segundo plano). |
| En la vista general, Júpiter y Saturno se reconocen a simple vista (con anillos) y los rocosos son discos con textura, sin solapes (capturas en escritorio y móvil, junto a la referencia) | ✅ en escritorio y portátil · ❌ en móvil | **Escritorio** (`escritorio-sistema`, `escritorio-sistema-2032` y `comparativa-antes-despues`): Júpiter mide 13–17 px de radio, con sus bandas; Saturno, ~10,5 px, con los anillos (abiertos en 2032); los rocosos, discos de 3,5–6 px. **Portátil:** Júpiter, 10–13 px; Mercurio y Marte, ~2,7 px, ya con marcador. **Móvil** (`movil-sistema` y `movil-sistema-2032`): los rocosos miden 1,2–1,8 px y se dibujan como marcadores; Júpiter y Saturno, 4–5 px. No se cumple: queda como propuesta para Iván (§10). **Sin solapes:** `scene/illustrative-layout.spec.ts` (§6.2). La referencia de Iván no está en el repositorio (§4.9). |
| FPS, VRAM y draw calls dentro de §5; `npm run check` y los e2e en verde | ✅ | §6: 60 FPS en los tres niveles en la vista general a 3 días/s, 1,17–1,46 ms de CPU por frame, 21 llamadas de dibujo y 35 MB de VRAM. `npm run check` en verde y la batería completa de e2e, repetida tras las correcciones (§6). |

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 1. Velocidad por contexto (D33) | hecha | La lógica es TS puro en `state/speeds.ts` (`speedContext`, `contextSpeed`, `speedText`). La aplica `ExplorerSession` en `select()` y `applyView()`, sin `effect()`. |
| 2. Estelas (D34) | hecha | En el mismo `LineSegments2` de las órbitas, con color y grosor por vértice. |
| 3. Planetas más visibles | hecha (en móvil, parcial) | Radios, sistemas de lunas compactos que aparecen al resolverse, el Sol y su halo, y relleno 0,3. Las etiquetas se recolocan solas: ya esquivaban los discos y ahora leen el halo de la configuración. |
| 4. Comparativa | hecha | `comparativa-antes-despues.webp`, `comparativa-relleno.webp` y las cifras de la referencia (§4.9). |
| 5. `ESTILO.md` y `PROMPTS.md` | hecha | `ESTILO.md`, con los textos del aviso de velocidad (4b.a); `PROMPTS.md` y el plan, al integrar la fase (en `main`, `efc0a93`). |

## 4. Desviaciones del plan y motivo

### 4.1 Las estelas también engordan, no solo cambian de color
Con el grosor de las órbitas (1,25 px), el color de la estela apenas se distinguía (primeras capturas). La estela pasa de 3 px junto al planeta (2 px en las lunas) al grosor de la órbita, con el mismo peso que el color. Va en un atributo más por extremo de segmento (§5.2), sin llamadas de dibujo nuevas.

### 4.2 Las órbitas, sin remates redondos
Con la mezcla aditiva, el remate redondo de cada segmento se sumaba al del siguiente: había una cuenta brillante en cada unión (cada grado), y las líneas, sobre todo las estelas gruesas, se veían punteadas. Se descartan los fragmentos del remate. Con ~1° entre segmentos, la junta a tope no deja hueco visible (la revisión lo midió: menos de 0,2 px en el nivel bajo).

### 4.3 Los planetas, más grandes, pero no tanto como en la referencia
En la referencia, Júpiter mide ~30 px de radio y aquí 13–17 px (antes ~8). La escala de distancias es logarítmica (D12, §4.4 del plan). Con ella, Júpiter y Saturno se acercan a ~24 unidades en las conjunciones (1921, 1981, 2040 y 2100), y la Luna pasa a ~12 unidades de Venus en cada conjunción inferior (cada 19 meses). Se eligieron los mayores radios sin solapes, medidos con un muestreo de 1900–2100 para cada candidato:

| Candidato (`radiusFactor`, `moonSpread`) | Júpiter (u) | Tierra (u) | Resultado |
|---|---|---|---|
| Antes (0,06 y 1,5) | 5,25 | 2,00 | Calisto y Ganímedes ya atravesaban los anillos de Saturno en 1921 y 1981 |
| **0,084 y 0,5 (elegido)** | **7,34** | **2,79** | Ningún disco a menos de 1 u de otro ni de los anillos (Júpiter, a 1,15 u del anillo A en 1921). Las lunas de Júpiter llegan a los anillos y a las lunas de Saturno solo en las conjunciones (§4.4) |
| 0,088 y 0,5 (antes de la revisión) | 7,69 | 2,93 | Júpiter, a 0,05 u del anillo A en 1921: a la vista, lo toca |
| 0,09 y 0,5 | 7,87 | 2,99 | Júpiter entra en los anillos en las conjunciones de 1921 (62 días) y 1981 (42) |
| 0,10 y 0,45 | 8,74 | 3,33 | Júpiter en los anillos en las cuatro conjunciones más cercanas (126–162 días cada una) |

Para llegar a la referencia habría que cambiar la ley de distancias o aceptar solapes: es una propuesta para Iván (§10).

### 4.4 Los sistemas de lunas, compactos y visibles solo cuando se distinguen
Con `moonSpread` 1,5, los sistemas crecían con su planeta: con los radios nuevos, Calisto llegaría hasta Saturno en las conjunciones y la Luna, hasta Venus. Con 0,5 son un sistema compacto alrededor de cada planeta (§4.4 del plan). La revisión midió que eso traía problemas:
- las lunas de un mismo sistema se interpenetraban (el 47–61 % de los días);
- se veían como bultos pegados al disco;
- las siete de Saturno quedaban dentro del radio de sus anillos;
- una luna delante del centro de Saturno le quitaba la etiqueta (el 10,5 % de las fechas de 2024–2035);
- en las conjunciones, Ganímedes y Calisto entraban en los anillos (hasta 1,95 u).

**La solución:** cada luna sigue la misma regla que su órbita (`moonPresence`, §5.5). Crece de 0 a su tamaño mientras su separación del borde de su planeta en pantalla pasa de 8 a 30 px. Mientras no se ve, no tapa, no lleva nombre y no se puede elegir.

En la vista general, los sistemas miden unos píxeles y sus lunas no se dibujan. Aparecen al acercarse o al enfocar el planeta (marco local físico, a su distancia real). Las interpenetraciones y las lunas sobre los anillos solo se verían ampliando la vista general sin enfocar ningún planeta, en las fechas de una conjunción. Lo comprueba el muestreo: fuera de las conjunciones, ninguna luna toca los anillos ni otro sistema (§6.2).

Se midió también colocar las lunas de Saturno por fuera de sus anillos: chocaban con Júpiter en casi todas las conjunciones (hasta 87 días seguidos y hasta 7 unidades dentro de su disco). Se descartó.

### 4.5 Las órbitas de las lunas aparecen con su luna
Antes aparecían cuando la luna se separaba de 8 a 30 px del centro de su planeta en pantalla. Ahora la separación se mide desde el borde del planeta y con la distancia real en el espacio (en radios del planeta, a la escala de su disco en pantalla). Es la misma regla que el disco de la luna (§4.4). Además, la órbita ya no se apaga cuando la luna pasa por delante del disco, como pasaba con la separación proyectada.

### 4.6 El relleno de la vista general, de 0,16 a 0,3
Se compararon 0,16, 0,3 y 0,45 el 24-10-2026 (Mercurio) y el 01-03-2032 (Venus y la Tierra por su cara nocturna): `comparativa-relleno.webp`. Con 0,3, un planeta visto por su cara nocturna se lee como un disco sin perder la fase; con 0,45, la fase casi desaparece. Mercurio, de albedo 0,14 y unos 4 px, sigue oscuro con cualquier valor: se encuentra por su nombre y su estela.

Que la Tierra se vea oscura viene sobre todo de su albedo efectivo: la textura de día, sin nubes (`exposureFor` lo documenta hasta la fase 5). Lo resuelve la fase 5, con las nubes y la Tierra completa.

### 4.7 El Sol, de 13 unidades, menos intenso y con el halo ajustado
El Sol sigue siendo el mayor: 13 unidades, 1,8 veces Júpiter (antes, 9). Con 14 unidades y la intensidad de la 3b (2,6), era un disco blanco y plano; con 1,9 se intuye el oscurecimiento del limbo. Su halo en la vista general pasa de 3,2 a 2,4 radios (mide ~31 unidades, algo más que antes) y de 1,1 a 1,3 de intensidad. Las etiquetas leen ese tamaño de `VISUAL_CONFIG` en lugar de una copia.

### 4.8 La estela de una órbita en segundo plano es más fina
En las vistas Tierra y Luna, las órbitas de los planetas pasan a un segundo plano (opacidad 0,12), pero la estela conservaba sus 3 px, y la de la Tierra se leía como una línea azul gruesa (primera captura de `escritorio-tierra`). El grosor extra se escala con la opacidad de la órbita respecto a la de la vista general (`overviewOrbitOpacity`, una sola constante). En el marco físico de un planeta enfocado (opacidad 0,3), su estela es una recta tenue que indica hacia dónde se mueve.

### 4.9 La referencia de Iván no está en el repositorio
La comparativa se hace con las cifras del documento de origen (Júpiter, ~30 px en la referencia frente a ~8 px antes y 13–17 px ahora) y con `comparativa-antes-despues.webp`. Que Iván la mire junto a su captura queda en `PENDIENTES.md`.

### 4.10 Los pósters, regenerados
El 3D entra con un fundido sobre el póster: con los planetas más grandes, las estelas y las lunas ocultas, el de la 3c ya no coincidía. Se regeneraron los seis con `build-poster.mjs` (sistema, Tierra y Luna, en escritorio y móvil), la última vez tras las correcciones.

### 4.11 Archivos nuevos
- `scripts/capture-system.mjs`: las capturas de la fase, con `--solo=`.
- `scripts/measure-system.mjs`: las mediciones de §6 y los radios en pantalla.
- `src/app/scene/illustrative-layout.spec.ts`: el muestreo.

La estela de movimiento de la fase 3 (`TRAIL_SECONDS` y `MOTION_TRAIL_BOOST`) desaparece: la sustituye D34.

### 4.12 La selección con el puntero y la ocultación (revisión, hallazgo 5)
- **Selección:** un clic dentro del disco de un cuerpo lo elige a él, el más cercano a la cámara si hay varios. Antes ganaba el centro más próximo relativo a la zona sensible, y un clic en el disco de Saturno podía elegir Rea. Fuera de los discos, la zona mínima de 22 px sigue igual.
- **Ocultación:** un cuerpo con menos de la mitad del tamaño aparente del que tiene detrás no lo tapa, y su etiqueta ya no desaparece.

## 5. Decisiones técnicas nuevas

### 5.1 El color de la estela, el del cuerpo con su canal mayor a 1
Los colores esquemáticos son apagados: el de Neptuno, azul oscuro, quedaba por debajo de la órbita gris azulada (luminancia 0,17 frente a 0,25). Se usa el mismo tono con su canal mayor a 1 en el espacio lineal, el más vivo que admite la mezcla aditiva. Junto al cuerpo, la estela sustituye a la órbita (mezcla, no suma), así que conserva su tono en lugar de blanquearse.

### 5.2 El grosor por vértice, con un atributo intercalado y `onBeforeCompile`
`LineMaterial` tiene un único `linewidth`. Se añade un búfer intercalado con el grosor de cada extremo (como el de los colores de three), y el `onBeforeCompile` que ya desvanecía las órbitas sobre los discos lo multiplica en el vértice. El material sigue siendo `LineMaterial`, con sus chunks de profundidad (D13). El test del shader comprueba las tres inyecciones contra el código real de three, para que falle si three cambia sus cadenas. Al crecer la capacidad (subir de calidad), la geometría libera antes sus búferes de la GPU (revisión, sugerencia 10).

### 5.3 El sentido de las estelas sale del signo de la velocidad, también en pausa
El motor pasa a la escena el sentido (`trailDirection`) a partir de `clock.speed`, no de la reproducción. Si el signo cambia en pausa, `setSpeed` pide un frame (render bajo demanda).

### 5.4 Un test de muestreo como garantía de los radios
`illustrative-layout.spec.ts` recorre 1900–2100 cada 3 días (~24 000 instantes) con el modelo real del sistema y el polo real de Saturno. Comprueba los discos y los anillos (con 1 u de aire), las lunas frente a su planeta y a los demás cuerpos principales, y que las lunas solo tocan los anillos de Saturno o a las lunas de otro sistema en las conjunciones de Júpiter y Saturno (a menos de 32 u). Si alguien cambia los radios o la ley de las lunas, falla con el peor margen de cada comprobación y su fecha.

### 5.5 La presencia de las lunas, en el mismo frame
`moonPresence` (`visual-config.ts`) da de 0 a 1 según la separación de la luna del borde de su planeta en pantalla. El motor la calcula antes de actualizar la escena, con la cámara ya colocada: el radio en pantalla del planeta sale de su distancia a la cámara y de la focal en píxeles, que con los márgenes de la interfaz (`setViewOffset`) sigue siendo alto / (2 · tan(fov / 2)). Así no hace falta un frame más para corregirla, como pasaba con la primera versión (lo detectó el test de render bajo demanda). La escena escala el disco de cada luna por su presencia y no lo dibuja por debajo del 5 %. Las proyecciones (etiquetas, ocultación y puntero) usan los radios por la presencia, y las lunas con menos del 50 % no llevan nombre ni se eligen. El cuerpo enfocado se ve siempre.

## 6. Salida de los checks
```
npm run check (27-10, con el código final)
ng lint: All files pass linting. · prettier --check: All matched files use Prettier code style!
Test Files 57 passed (57) · Tests 481 passed (481)
Cobertura de ephemeris/: 99,65 % de sentencias, 96,84 % de ramas, 100 % de funciones y líneas
Initial total 298.23 kB (82.45 kB transferidos) · Prerendered 17 static routes
Pages: 126 ficheros; el mayor, 1,76 MiB de 25
✔ El JS inicial de las 17 páginas no lleva three, astronomy-engine, los stores ni los controles del visor
✔ Código propio en los chunks iniciales: 12.13 kB de 15.00
```
```
npm run e2e (código final, tras las correcciones de la revisión): 67 passed (4.0m)
Antes de las correcciones: 66 passed y un fallo intermitente de axe en /planetas/neptuno
(networkidle no llegó; repetido 4 veces aislado, 4 passed en ~30 s cada una).
```

### 6.1 Mediciones (`node scripts/measure-system.mjs`, 27-10, tras las correcciones; Chromium con la GPU: RTX 3060, ANGLE D3D11)
| Escena | Nivel | FPS (mín. / medio) | CPU por frame | Llamadas de dibujo | Triángulos | VRAM |
|---|---|---|---|---|---|---|
| Vista general a 3 días/s | alta | 60 / 60 | 1,46 ms | 21 | 175 854 | 35 MB |
| | media | 60 / 60 | 1,17 ms | 21 | 70 446 | 35 MB |
| | baja | 60 / 60 | 1,19 ms | 21 | 40 854 | 35 MB |
| Júpiter enfocado a 1 h/s | alta | 59 / 59,8 | 1,07 ms | 7 | 43 690 | 75 MB |
| | media | 60 / 60 | 1,09 ms | 7 | 26 362 | 43 MB |
| | baja | 60 / 60 | 0,91 ms | 7 | 18 970 | 43 MB |

En la vista general, la 3c medía 43 llamadas y 35 MB, con 1,32–1,92 ms de CPU por frame a 3 horas por segundo. Las estelas no añaden llamadas (42 antes de la revisión), y las lunas que no se distinguen, al no dibujarse, quitan otras 21. Todo dentro de §5 (≥ 55 FPS; VRAM ≤ 300 MB en alto y ≤ 120 MB en bajo).

### 6.2 Radios ilustrativos y márgenes
Radios (unidades de escena):

| | Sol | Mercurio | Venus | Tierra | Marte | Júpiter | Saturno | Urano | Neptuno | Luna |
|---|---|---|---|---|---|---|---|---|---|---|
| Antes | 9 | 1,36 | 1,95 | 2,00 | 1,55 | 5,25 | 4,90 | 3,48 | 3,43 | 1,19 |
| Ahora | 13 | 1,90 | 2,74 | 2,79 | 2,17 | 7,34 | 6,86 | 4,87 | 4,81 | 1,66 |

Peores márgenes del muestreo de 1900–2100, cada 3 días (unidades):

| Comprobación | Margen | Fecha |
|---|---|---|
| Discos entre sí | 6,68 | 22-12-2077 |
| Discos frente a los anillos de Saturno (Júpiter) | 1,15 | 15-08-1921 |
| Luna frente a su planeta (Fobos) | 0,22 | 11-01-1901 |
| Luna frente a otro cuerpo (Jápeto y Júpiter) | 2,64 | 05-09-1921 |
| Lunas de Júpiter en los anillos de Saturno (solo en conjunciones, y sin dibujar) | −1,95 | 29-01-1981 |
| Lunas de sistemas distintos (solo en conjunciones, y sin dibujar) | −1,46 | 01-06-1981 |

Con muestreo diario, las lunas de Júpiter están en los anillos de Saturno de 2 a 19 días por luna en las conjunciones de 1921, 1940, 1981, 2000, 2040, 2060 y 2100, y las de sistemas distintos se tocan de 1 a 3 días.

### 6.3 Radio en pantalla del Sol y de los planetas en la vista general (px CSS, modo de captura)
| | Sol | Mercurio | Venus | Tierra | Marte | Júpiter | Saturno | Urano | Neptuno |
|---|---|---|---|---|---|---|---|---|---|
| Escritorio, 24-10-2026 | 25,4 | 3,6 | 4,7 | 4,8 | 3,7 | 13,0 | 10,8 | 7,0 | 7,4 |
| Escritorio, 01-03-2032 | 25,4 | 3,5 | 5,9 | 5,6 | 3,6 | 16,9 | 10,4 | 7,1 | 7,1 |
| Portátil, 24-10-2026 | 19,1 | 2,7 | 3,6 | 3,6 | 2,8 | 9,8 | 8,2 | 5,3 | 5,6 |
| Portátil, 01-03-2032 | 19,1 | 2,6 | 4,4 | 4,2 | 2,7 | 12,7 | 7,9 | 5,4 | 5,4 |
| Móvil, 24-10-2026 | 8,2 | 1,2 | 1,7 | 1,7 | 1,3 | 4,5 | 4,0 | 2,7 | 2,8 |
| Móvil, 01-03-2032 | 8,2 | 1,2 | 1,8 | 1,8 | 1,3 | 5,0 | 4,0 | 2,8 | 2,8 |

Por debajo de 3 px, un cuerpo con nombre lleva un marcador (un anillo): en móvil, los rocosos y los gigantes de hielo; en el portátil, Mercurio y Marte.

## 7. Capturas
En `docs/informes/img/fase-4b/` (modo de captura, 24-10-2026, salvo las de 2032 y la que reproduce):
- `comparativa-antes-despues`: la vista general de la 3c y la de la 4b (anterior a las correcciones de la revisión), recortadas.
- `comparativa-relleno`: el relleno a 0,16, 0,3 y 0,45, el 01-03-2032 (Venus y la Tierra) y el 24-10-2026 (Mercurio).
- `escritorio-sistema` (en pausa), `escritorio-sistema-reproduciendo` (tras 2 s a 3 días/s) y `escritorio-sistema-atras` (hacia atrás: la estela, delante).
- `escritorio-sistema-2032` y `movil-sistema-2032`: el 01-03-2032, con los anillos de Saturno abiertos.
- `escritorio-jupiter` y `escritorio-saturno` (enfocados, a 1 hora/s; Saturno con los anillos casi de canto, como en 2026) y `escritorio-tierra` (la estela de la Tierra, fina, en segundo plano).
- `portatil-sistema` (1280 × 720).
- `movil-sistema`, `movil-sistema-atras` y `movil-jupiter` (390 × 844 a 2×).

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
En `docs/PENDIENTES.md`, «Bloque C (fase 4b)»:
- mirar la vista general junto a la captura de referencia y en el móvil;
- decidir las propuestas de §10;
- confirmar que pasar de un cuerpo a otro mantiene la velocidad elegida a mano (riesgo 3).

Para la fase 5: la Tierra se ve oscura en la vista general (albedo efectivo de la textura sin nubes, §4.6). Siguen los pendientes de la fase 4 (NEL de Cloudflare, Access y entorno de GitHub opcionales, dominio propio).

## 10. Propuestas de cambio al plan
Para que Iván decida:
1. **Planetas aún más grandes, como en la referencia.**
   - **a) Cambiar la ley de distancias** (`referenceAu` de 0,1 a 0,2 UA): da ~12 % más de espacio relativo a los planetas exteriores, pero acerca los interiores al Sol (Mercurio, de 69 a 47 unidades) y cambia el aspecto de toda la vista general.
   - **b) Aceptar solapes breves y raros:** con `radiusFactor` 0,10, Júpiter mide 8,7 unidades, pero atraviesa los anillos de Saturno durante 4–5 meses en cada conjunción cercana (la próxima, en 2040).
2. **La vista general en el móvil.** En vertical, el sistema entero cabe en 390 px de ancho: los rocosos miden 1–2 px y se ven como marcadores, y Júpiter y Saturno, 4–5 px.
   - **a) Un encuadre propio en vertical:** por ejemplo, hasta la órbita de Saturno, con Urano y Neptuno fuera de la pantalla hasta que uno se aleja.
   - **b) Un tamaño mínimo en pantalla** para los planetas en la vista general (por ejemplo, 3 px), que no cambia su tamaño en el espacio.
   - **c) Aceptar los marcadores:** el nombre y la estela ya dicen dónde está cada uno.
3. **Ocultar del todo las lunas en la vista general.** No hace falta: ya solo aparecen cuando su sistema se distingue (§4.4).

Mientras tanto, se queda la opción sin solapes y la vista general del móvil como está.

## 11. Cómo probarlo
1. `npm start` y abrir `http://localhost:4200/`. La vista general se mueve a 3 días por segundo, cada planeta lleva su estela de color y no hay lunas pegadas a los planetas.
2. Elegir Júpiter (en el lienzo, en la ficha o en el índice): la velocidad pasa a «1 hora por segundo» y se anuncia, y aparecen sus lunas. Con «Vista general», vuelve a 3 días por segundo. Si se cambia la velocidad a mano y se pasa a otro planeta, se respeta.
3. Pausar (`k`) y pulsar `r` (hacia atrás): las estelas pasan delante de cada planeta.
4. Ir a finales de octubre de 2040 (`/?fecha=2040-10-31T00:00Z`), la conjunción de Júpiter y Saturno, y verlos pasar cerca sin tocarse. Con `/?fecha=2032-03-01T00:00Z`, Saturno lleva los anillos abiertos.
5. Capturas y mediciones: `npm run build && node scripts/capture-system.mjs docs/informes/img/fase-4b && node scripts/measure-system.mjs`.

---

## Respuesta a la revisión
Revisión del subagente en `docs/revisiones/fase-4b.md` (veredicto: CAMBIOS NECESARIOS; cuatro importantes, cuatro menores y dos sugerencias, sin bloqueantes).

| Hallazgo | Acción | Commit |
|---|---|---|
| 1 · Importante: el test no miraba las lunas frente a los anillos ni las lunas entre sistemas; los anillos, sin margen | `radiusFactor` 0,088 → 0,084: Júpiter, a 1,15 u del anillo A (antes 0,05). El test mira ahora las lunas frente a los anillos y las de sistemas distintos: solo se tocan en las conjunciones (hasta 1,95 u) y, entonces, no se dibujan (hallazgo 2). §1, §2, §4.3, §6.2 y el comentario de `scale.ts`, corregidos con las cifras reales | `13be4fb` |
| 2 · Importante: los sistemas compactos (lunas pegadas e interpenetradas, Saturno sin etiqueta) | Cada luna sigue la regla de su órbita (`moonPresence`): no se dibuja, no tapa, no se nombra y no se elige hasta que su sistema se distingue (§4.4 y §5.5). Test del motor: en la vista general no se dibujan, Saturno no queda tapado y, al enfocar Júpiter, sus lunas aparecen | `4cd68ec` |
| 3 · Importante: el criterio 3, sin demostrar en móvil ni con los anillos abiertos | Capturas del 01-03-2032 en escritorio y móvil, y radios en pantalla medidos en los tres tamaños (§6.3). Criterio 3 marcado como no cumplido en móvil; propuestas en §10 y en `PENDIENTES.md` | `a01a260`, `c28155e` |
| 4 · Importante: el relleno sin cambios | Comparados 0,16, 0,3 y 0,45 en dos fechas (`comparativa-relleno.webp`). Se elige 0,3, con el motivo en `visual-config.ts` (§4.6) | `a01a260` |
| 5 · Menor: un clic en el disco de Saturno elegía una luna | Dentro del disco de un cuerpo se elige ese cuerpo; un ocluyente mucho más pequeño no tapa (§4.12); tests en `picking.spec.ts` | `4cd68ec` |
| 6 · Menor: §2 decía 67 e2e con 66 y un fallo | Batería completa repetida tras las correcciones, con su cifra en §2 y §6 | este informe |
| 7 · Menor: `PENDIENTES.md` sin lo de la fase | Añadido el apartado «Bloque C (fase 4b)» | este informe |
| 8 · Menor: el test de la vista Tierra no seguía el orden de la aplicación | `setup(…, sessionFirst)`: la sesión se crea antes de conectar la vista, como en `ExplorerUi`; comentario en el constructor | `fcc8830` |
| 9 · Sugerencia: la opacidad 0,85, escrita dos veces | Una sola constante, `VISUAL_CONFIG.overviewOrbitOpacity` | `4cd68ec` |
| 10 · Sugerencia: búferes sin liberar al subir de calidad | `geometry.dispose()` antes de sustituirlos | `4cd68ec` |
