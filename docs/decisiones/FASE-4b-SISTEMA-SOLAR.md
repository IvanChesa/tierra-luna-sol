# Fase 4b: Pulido de la vista del sistema solar (añadido al plan, 27-10-2026)

> Pedido por Iván con una captura de la vista general del original (earth.ethanplus.ai/solar.html) como referencia:
> «Cuando esté en la vista del sistema solar, quiero que vaya a 3 días por segundo, pero cuando pinche en cualquier planeta, que cambie a 1 hora», «Hemos de seguir mejorando los modelos de los planetas visualmente» y «En el sistema solar podríamos poner una estela a los planetas como hace la web» del original.
> Va en el **bloque C, antes de la fase 5**, en la rama `fase-4b-sistema-solar`, con el ciclo autónomo de siempre (informe, revisión por subagente, fusión).

## Diagnóstico (código actual y capturas de la fase 3c)
| Lo que pide Iván | Hoy | Causa |
|---|---|---|
| Estelas como en el original | Casi invisibles y sin color | `TRAIL_SECONDS = 1` (`scene/engine.ts`): la estela cubre 1 s de tiempo simulado (a 3 h/s, 3 horas de órbita) y solo aclara la órbita (`MOTION_TRAIL_BOOST`, `scene/orbits.ts`) |
| Planetas bien visibles en la vista general | Júpiter ~8 px de radio frente a ~30 px en la referencia | Radios ilustrativos pequeños (`radiusFactor` 0,06 en `ephemeris/scale.ts`) |
| Velocidad según el contexto | Una sola velocidad de entrada para todo (3 h/s, D31) | — |

## Decisiones
- **D33 · Velocidad según el contexto** (sustituye a la velocidad de entrada de D31; las excepciones de D31 siguen):
  - **vista general del sistema solar: 3 días/s**, que es con lo que se entra;
  - **al enfocar cualquier cuerpo** (pinchando en el lienzo, en una ficha o en el índice): **1 hora/s**;
  - **al volver a la vista general**: otra vez 3 días/s;
  - las vistas «Tierra» y «Luna» se tratan como cuerpo enfocado: 1 h/s;
  - **si el usuario cambia la velocidad a mano**, se respeta mientras siga en ese contexto; el siguiente cambio de contexto vuelve a aplicar la velocidad del contexto nuevo;
  - el sentido de la reproducción (hacia atrás) se conserva al cambiar de contexto;
  - con movimiento reducido o con `?fecha=` se sigue entrando en pausa, y el cambio de contexto no arranca la reproducción si estaba en pausa;
  - el cambio de velocidad se anuncia de forma discreta (`aria-live` educado: «Velocidad: 1 hora por segundo»), una vez por cambio.
- **D34 · Estelas de los planetas:**
  - un arco **del color de cada planeta** (`scene/body-colors.ts`) sobre su propia órbita, **detrás del planeta**, que se desvanece hasta desaparecer;
  - longitud por **fracción de órbita** (punto de partida: ~1/8 de vuelta, ajustable en `scene/visual-config.ts`), no por tiempo, para que se vean igual a cualquier velocidad;
  - **visibles también en pausa** (indican hacia dónde se mueve cada planeta);
  - en los sistemas de lunas, estelas más cortas y tenues;
  - mezcla aditiva sutil;
  - el sentido sigue a la reproducción (hacia atrás, la estela va delante).

## Tareas
1. **Velocidad por contexto** (D33): lógica en el store (TS puro y testable) y tests unitarios de cada transición: vista general → cuerpo → vista general, cambio manual, hacia atrás, pausa, movimiento reducido y `?fecha=`. E2E: al entrar, 3 días/s; al pinchar un planeta, 1 h/s; al volver, 3 días/s.
2. **Estelas** (D34) con `Line2` y color por vértice (alfa degradado). Sin coste apreciable: medir los draw calls y los FPS.
3. **Planetas más visibles en la vista general:**
   - subir los radios ilustrativos (`radiusFactor`, `minRadius` y `maxRadius`), para que Júpiter y Saturno se reconozcan, con sus anillos, y los rocosos sean discos texturizados, no puntos;
   - comprobar que no se solapan con el Sol ni entre sí y que las etiquetas se recolocan;
   - ajustar el relleno y la exposición de la vista general (tarea 11 de la fase 3b) para que tenga el atractivo de la referencia, **con nuestro estilo**.
4. **Comparativa** de la vista general junto a la captura de referencia de Iván: legibilidad de los planetas, estelas y lectura general. Las capturas en `docs/informes/img/fase-4b/`, en escritorio y móvil.
5. Actualizar el plan (D31 → D33, D34 y esta fase en §6 y en el bloque C), `ESTILO.md` (los textos del aviso de velocidad) y `PROMPTS.md`.

## Criterios de aceptación
- [ ] Al entrar, 3 días/s; al pinchar un planeta (lienzo, ficha o índice), 1 h/s; al volver a la vista general, 3 días/s. Un cambio manual se respeta en su contexto (unitarios + e2e).
- [ ] Estelas de color visibles a 3 días/s y en pausa, que se desvanecen y siguen el sentido de la reproducción (capturas).
- [ ] En la vista general, Júpiter y Saturno se reconocen a simple vista (con anillos) y los rocosos son discos con textura, sin solapes (capturas en escritorio y móvil, junto a la referencia).
- [ ] FPS, VRAM y draw calls dentro de §5; `npm run check` y los e2e en verde.

## Lo que sigue mejorando los planetas después de esta fase
- **Fase 5:** la Tierra completa (nubes, océanos, luces de las ciudades, atmósfera sin velo, sombra de los eclipses).
- **Fase 6:** la Luna con relieve real.
- **Fase 7:** las lunas con superficie real, el limbo de Saturno a contraluz y las atmósferas.
- **Fase 10:** el bloom del Sol y el pulido final.
