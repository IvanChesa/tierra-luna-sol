# Fase 3b: Realismo de los planetas (añadido al plan v2, 26-10-2026)

> Pedido por Iván: «Tenemos que hacer que los modelos 3D de los planetas sean más realistas».
> Se integra en `docs/PLAN.md` al aplicar la revisión del bloque B. Es un bloque propio (**R**), entre el B y el C, porque la base de iluminación que crea la usan después la Tierra (fase 5), la Luna (fase 6) y las lunas (fase 7).

## Diagnóstico (capturas de las fases 2 y 3 + `scene/materials/body-material.ts`)
| Lo que se ve | Causa |
|---|---|
| Planetas «de plástico», con el mismo aspecto de bola mate en todos | Sombreado de Lambert + luz ambiente plana (`BODY_AMBIENT`) igual para todos los cuerpos |
| Júpiter y Saturno sin el oscurecimiento del limbo que tienen en las fotos reales; terminador duro en planetas con atmósfera | Sin modelo de limbo ni de atmósfera |
| Ningún planeta tiene atmósfera visible (ni halo ni tono en el terminador) | No hay dispersión atmosférica |
| Marte y Mercurio sin relieve | Solo hay textura de color; no se usan modelos de elevación |
| Anillos de Saturno planos y sin profundidad | Sin fotometría: no brillan a contraluz ni dejan ver la luz transmitida |
| Las órbitas cruzan por delante del disco de los planetas | Las líneas no se ocultan ni se desvanecen sobre los cuerpos |
| La Tierra, de un azul uniforme y saturado | A comprobar: espacio de color o exposición de la textura de día. El resto de la Tierra es de la fase 5 |

## Cómo lo hace el original (earth.ethanplus.ai, analizado el 26-10 en su código fuente público; solo técnicas, sin copiar código)
| Pieza | Original | Nosotros (hoy) | Con la fase 3b y siguientes |
|---|---|---|---|
| Planetas (vista del sistema) | `MeshStandardMaterial` mate (rugosidad ~0,92) + **luz ambiente fuerte (0,7)** + luz puntual del Sol sin caída + **tone mapping ACES**. Bonito, pero no físico: el lado nocturno se ve iluminado | Lambert + ambiente 0,025 + tone mapping Neutral: más físico, pero plano y oscuro | Sombreado físico por tipo (D29) **+ dirección de arte de la luz por vista** (tarea 11) |
| Tierra | Phong con especular en los océanos (mapa de agua), bump, luces nocturnas como emisivo enmascarado en el lado de noche, capa de nubes y **halo atmosférico** (esfera por fuera con mezcla aditiva) | Solo la textura de día | Fase 5: todo lo del original + orientación real, terminador con dispersión, sombra de la Luna en los eclipses |
| Luna | Bump a partir de la altura (sin desplazamiento real) | Esfera con textura | Fase 6: desplazamiento real con el LOLA en 16 bits + normales: **por encima del original** |
| Saturno | Sombras analíticas anillo ↔ planeta | ✅ Igual (fase 2) | + fotometría de los anillos (tarea 5) |
| Sol | Textura sin luz + sprite de halo aditivo | Oscurecimiento del limbo + halo | + granulación y bloom en el nivel alto |
| Vista general | Halos aditivos en cada planeta para que «brillen» | Etiquetas | Valorar halos sutiles para la legibilidad (tarea 11) |
| Privacidad | Carga la analítica de Vercel (`/_vercel/insights`), una petición a un tercero | 0 terceros (D24) | Ventaja nuestra |

**Conclusión:** el atractivo del original es **dirección de arte** (luz de relleno generosa, ACES, exposición por vista y halos), no una física más avanzada. La fase 3b debe hacer las dos cosas: física correcta **y** un ajuste artístico de la luz, para que se vea igual de bonito y además sea fiel.

## Objetivo
Que cada planeta, a la misma fase y distancia, **se parezca a sus fotos reales** (NASA, ESA, Hubble, Cassini, Juno, Voyager, MESSENGER), con un modelo de luz físico por tipo de cuerpo y sin salirse de los presupuestos de §5.

## Decisión nueva
**D29 · Sombreado físico por tipo de cuerpo**, con chunks GLSL comunes en `scene/materials/`:
- **Rocosos sin atmósfera** (Mercurio, la Luna y las lunas): Lommel–Seeliger con un pico de oposición sencillo (Hapke simplificado). Terminador nítido y disco casi uniforme en fase llena, como la Luna real.
- **Gigantes** (Júpiter, Saturno, Urano y Neptuno): oscurecimiento del limbo de Minnaert, con un parámetro por planeta documentado, y terminador suavizado por la atmósfera.
- **Con atmósfera** (Venus, Tierra, Marte y Titán; también los gigantes): dispersión aproximada en el limbo y en el terminador, con el tono de cada atmósfera (azulado en la Tierra, Urano y Neptuno; anaranjado en Marte y Titán; amarillento en Venus). La versión completa de la Tierra sigue en la fase 5.
- **Brillo relativo coherente** con el albedo geométrico del catálogo y la exposición por vista. La luz ambiente plana desaparece: en la vista general puede quedar un relleno mínimo, documentado como ilustrativo.

## Tareas
1. **Referencias reales** (`docs/realismo/referencias.md`): por cada cuerpo, 1–2 fotos reales de dominio público o con licencia libre (URL, misión, fecha y ángulo de fase), solo enlazadas, sin copiarlas al repo. Son la vara de medir de toda la fase.
2. **Chunks de sombreado** (D29) con sus parámetros en datos (`data/`, con fuente cuando sean medidos, como el albedo o el coeficiente de limbo si hay referencia; si no, «ajuste visual» documentado). Tests de la función de limbo y de la de Lommel–Seeliger en TS puro (`ephemeris/` o un módulo puro de `scene/`).
3. **Relieve de Mercurio y Marte:**
   - mapas de normales derivados de modelos de elevación oficiales (Mercurio: MESSENGER; Marte: MOLA; USGS Astrogeology, dominio público, comprobándolo);
   - script común `build-relief.mjs`, que reutilizará la fase 6 para la Luna (16 bits empaquetados, D15);
   - si mejora la fidelidad, mosaicos de color oficiales (Viking para Marte, MESSENGER para Mercurio) en vez de los de Solar System Scope.
4. **Gigantes:** comprobar si existen mapas globales con licencia libre de más calidad que los actuales (Júpiter: mapas de Hubble OPAL; Saturno: Cassini). Usarlos solo si la licencia encaja con la política del proyecto (CC0, CC BY, MIT, BSD o dominio público; **nada no comercial**, como pasó con la Vía Láctea). Urano y Neptuno: bandas sutiles fieles a las fotos, sin inventar detalles.
5. **Anillos de Saturno:**
   - fotometría: más brillo a contraluz (dispersión hacia delante) y la cara no iluminada vista con luz transmitida;
   - sombra del planeta sobre los anillos;
   - perfil radial de opacidad y color fiel (división de Cassini, anillos A, B y C).
   - Los anillos tenues de Júpiter, Urano y Neptuno son **opcionales**.
5b. **Vía Láctea** (decisión de Iván, 26-10): panorama «The Milky Way panorama» de ESO/S. Brunier (https://www.eso.org/public/images/eso0932a/), si su página confirma **CC BY 4.0**. Está en coordenadas galácticas: se alinea con el cielo real girando la dirección de muestreo (galácticas → ecuatoriales J2000 → ECL, con la matriz en `ephemeris/coordinates.ts`, testada con 3 objetos de posición conocida, por ejemplo el centro galáctico). Con brillo sutil, por debajo de las estrellas HYG, y niveles de calidad. Si la licencia no es CC BY 4.0, queda fuera y se apunta.
6. **Sol:** granulación procedural animada (sujeta a `prefers-reduced-motion`), oscurecimiento del limbo físico y corona o halo.
7. **Post-procesado:**
   - tone mapping evaluado (Neutral frente a AgX frente a ACES), con capturas comparadas;
   - bloom solo para el Sol y solo en el nivel alto (`three/addons`, sin dependencias nuevas);
   - antialiasing (MSAA en WebGL2 o SMAA).
   - Todo dentro de los FPS de §5; en el nivel bajo, versión ligera o desactivado.
8. **Órbitas y etiquetas:** las órbitas se ocultan o desvanecen sobre el disco de cualquier cuerpo y cerca de él (prueba de profundidad + desvanecimiento). Las etiquetas no tapan el planeta enfocado.
9. **Tierra, solo el arreglo de base:** corregir el azul uniforme y saturado (espacio de color, exposición o mezcla de la textura). Nubes, océano, luces y atmósfera completa siguen en la fase 5.
10. **Calidad por niveles:** cada mejora tiene su versión para el nivel bajo y respeta los presupuestos de VRAM, FPS y peso de §5.
11. **Dirección de arte de la luz por vista** (lo que hace atractivo al original):
    - en la **vista general**, un relleno ilustrativo moderado y documentado para que todos los planetas se lean bien, y halos sutiles opcionales;
    - en **primer plano**, la luz física de D29 con un relleno mínimo (el lado nocturno casi negro, como en las fotos de Cassini o Juno);
    - exposición y tone mapping ajustados por vista, con capturas comparadas con las referencias reales y con el aspecto general del original **como referencia visual, sin copiar su código**;
    - los valores, en un único módulo de configuración visual, con el motivo de cada uno.

## Criterios de aceptación
- [ ] **Comparativas lado a lado** con las referencias reales, a un ángulo de fase parecido, para el Sol, Mercurio, Venus, Marte, Júpiter, Saturno, Urano y Neptuno (capturas `?captura=1` en `docs/informes/img/fase-3b/`). El subagente revisor y la sesión de revisión las evalúan.
- [ ] Tests de las funciones de sombreado (limbo de Minnaert y Lommel–Seeliger) con valores esperados.
- [ ] Ninguna órbita se dibuja sobre el disco de un cuerpo (captura de Saturno y Júpiter como las de la fase 2).
- [ ] Mercurio y Marte muestran relieve con luz rasante (capturas en el terminador).
- [ ] Anillos de Saturno a contraluz (captura) y sombra del planeta sobre los anillos.
- [ ] FPS, VRAM y peso por vista dentro de §5 en los tres niveles (tabla).
- [ ] Vía Láctea de ESO alineada (captura con el centro galáctico en Sagitario) o apuntada como omitida si la licencia no encaja.
- [ ] Todas las texturas y modelos de elevación nuevos en `FUENTES.md`, con una licencia compatible comprobada en la fuente.
- [ ] Capturas de la vista general y de cada planeta en primer plano: a la vista, al menos igual de atractivas que el original y más fieles a las fotos reales (la evaluación va en el informe, con las capturas).

## Bloque y prompt
| Bloque | Fase | Rama | Esfuerzo |
|---|---|---|---|
| R | 3b | `fase-3b-realismo` | `max` |

Prompt (sesión nueva, tras revisar el bloque B): `Bloque R.`
