# Informe: Fase 4b (Pulido de la vista del sistema solar)

- **Rama:** `fase-4b-sistema-solar`
- **Fecha:** 2026-10-27
- **Estado:** en curso (modo autónomo por bloques, bloque C)

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
| Entrega | Estado | Commit | Notas |
|---|---|---|---|
| 4b.a | ✅ | `062d598` | Velocidad por contexto (D33), con unitarios, e2e y `ESTILO.md`. |
| 4b.b | ✅ | `923f4f0` | Estelas (D34): color del cuerpo con su canal mayor a 1, 1/8 de vuelta (lunas: 1/12 y más tenues), grosor por vértice de 3 px a 1,25 px (con 1,25 px el color no se distinguía), detrás o delante según el sentido, también en pausa; mismo `LineSegments2`. Sin remates redondos: con la mezcla aditiva se sumaban en cada unión (líneas punteadas). |
| 4b.c | ✅ | `702bc09` | `radiusFactor` 0,06 → 0,088, Sol 9 → 13, `moonSpread` 1,5 → 0,5. Muestreo 1900–2100 en `scene/illustrative-layout.spec.ts`: ni discos, ni lunas fuera de su sistema, ni Júpiter en los anillos. El límite lo ponen las conjunciones Júpiter–Saturno y la Luna entre la Tierra y Venus. Lunas de Saturno por fuera de los anillos, medido y descartado: chocarían con Júpiter en cada conjunción (48–87 días cada 20 años). Relleno 0,16 frente a 0,24: sin diferencia apreciable, se mantiene. |
| 4b.d | en curso | — | Hecho: `scripts/capture-system.mjs` y `scripts/measure-system.mjs`, 474 unitarios en verde (cobertura de `ephemeris/` 99,65 %). Falta: e2e completos, **regenerar los pósters** (`build-poster.mjs`: la vista general ha cambiado y el 3D entra con un fundido sobre ellos), capturas finales, mediciones, `npm run check`, informe completo, revisión por subagente, fusión y `DIARIO.md`. |

Observaciones para el informe final: la Tierra se ve oscura en la vista general por el albedo efectivo de su textura sin nubes (lo resuelve la fase 5); la estela del planeta enfocado, en su marco físico, es una recta tenue que cruza la pantalla.
