# Mejora de los anillos de Saturno (añadido al plan, 30-10-2026)

> Pedido por Iván el 30-10: «Habremos de mejorar los anillos de Saturno».
> Va en la **fase 7** (bloque D), junto al anillo de luz del limbo a contraluz (R2), porque los dos tocan Saturno y su material. Rama y ciclo, los de la fase 7.

## Diagnóstico (capturas de `docs/informes/img/revision-bloque-R/despues/` y `fase-4b/escritorio-saturno`)
| Lo que se ve | Causa |
|---|---|
| Anillos **gris azulado**, con un tono **lavanda** en el anillo C y la división de Cassini | El color se midió en una foto de prensa del Hubble (heic1917a), equilibrada hacia el blanco azulado; lo pidió la revisión del bloque R (R1) y fue un error de esa revisión. En los anillos tenues, además, el fondo azul tinta asoma por transparencia. |
| **Poca estructura fina**: el anillo A casi uniforme, sin la división de Encke ni la de Keeler bien marcadas | La profundidad óptica sale del alfa de la textura de Solar System Scope (`ring-material.ts`), que en el A es casi plana. |
| **Apagados** respecto al disco (B / disco ≈ 0,77) | Es el brillo físico. En las fotos de prensa, 1,44. |

El modelo de dispersión (`tlsRingReflectance`, cara iluminada y cara en sombra con τ y μ) es correcto y se mantiene.

## Decisiones
- **D-anillos-1 · Color de fuentes científicas, no de fotos de prensa.** Los anillos son ligeramente rojizos en el visible: crema o tostados en el B, más grises en el A y oscuros en el C. La cromaticidad de cada anillo sale de **espectrofotometría publicada** (Voyager, Hubble o Cassini; artículo o conjunto de datos con su URL en `data/photometry.ts` y en `FUENTES.md`), no de una imagen procesada. Si no hay valores publicados para algún anillo, se dice y se usa el más cercano documentado.
- **D-anillos-2 · Estructura radial real.** La profundidad óptica τ(r) sale de un **perfil radial medido**: por ejemplo, una ocultación de Cassini (RSS, UVIS o VIMS) o de Voyager (PPS) del PDS Ring-Moon Systems Node (https://pds-rings.seti.org/), que son datos públicos de la NASA (comprobar la licencia en la fuente). Se reduce por script a una textura 1D (de unos 8–10 km por píxel; ver el tamaño en el manifiesto), con su cabecera «GENERADO por…». Así aparecen las divisiones (Colombo, Maxwell, Huygens, Encke, Keeler), las ondas de densidad y el anillo F con su sitio exacto, sin inventar nada. El modelo de dispersión ya convierte τ y μ en brillo y transparencia, así que la apertura de los anillos cambia su aspecto de forma realista.
- **D-anillos-3 · Realce moderado del brillo (decisión de Iván, 30-10).** Un factor ilustrativo, documentado como el relleno de D21, que sube el brillo de los anillos respecto al disco entre la física (0,77) y la foto de prensa (1,44). Punto de partida: B / disco ≈ 1,0–1,1, ajustado con capturas. Va en `visual-config.ts`, con un comentario que diga que es ilustrativo, y no afecta a las medidas de fotometría ni a sus tests.
- **D-anillos-4 · Sin tono lavanda.** Comprobar la composición del fondo a través de los anillos tenues. Con el color nuevo, el C y la división de Cassini no pueden salir morados sobre el fondo azul tinta: medirlo en la captura.

## Tareas
1. Buscar y documentar la cromaticidad publicada de los anillos A, B y C y de la división de Cassini; pasarla a `data/photometry.ts` con fuente y test.
2. Script del perfil radial de τ: descarga de la fuente fijada, reducción, textura 1D, comprobación de la posición de las divisiones frente a sus radios publicados (test con tolerancia) y entrada en el manifiesto.
3. Material: τ(r) del perfil (el alfa de la textura deja de usarse para τ; su luminancia solo como detalle, si aporta algo que el perfil no tenga), el color nuevo y el realce de D-anillos-3.
4. Capturas antes y después, junto a fotos reales enlazadas (no copiadas): la geometría del Hubble de 2019, la de Cassini de 2013 a contraluz (con R2), la sombra sobre el disco, Saturno enfocado en 2026 (anillos casi de canto) y la vista general. Escritorio y móvil.
5. Presupuestos: la textura 1D apenas pesa; medir FPS, VRAM y llamadas de dibujo.

## Criterios de aceptación
- [ ] Color de cada anillo con fuente científica publicada y test; el B, crema o tostado, no azulado (medido en la captura).
- [ ] Las divisiones de Cassini, Encke y Keeler, visibles en primer plano y en su radio publicado (test).
- [ ] B / disco en el valor elegido con el realce, documentado como ilustrativo.
- [ ] Sin tono lavanda en el C ni en la división de Cassini (medido).
- [ ] Presupuestos de §5 y `npm run check` en verde.
