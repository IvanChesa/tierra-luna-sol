# Revisión del bloque C aplicada

- **Fecha:** 2026-10-30
- **Rama:** `revision-bloque-c`, desde `main` (lo pide la revisión: su vista previa deja verlo antes de fusionar)
- **Revisión:** `docs/revisiones/bloque-C.md`, **APROBADO**. Por aplicar: C1, C2, C3 y C5, con tests y capturas, y C6 en GitHub. Al plan: C4 (fase 6), C8 (fases 9 y 11) y la 8K más barata (fase 10). C7 queda para Iván.
- **Además:** la decisión nueva de Iván del mismo día, la **mejora de los anillos de Saturno** (`docs/decisiones/ANILLOS-SATURNO.md`), llevada a la fase 7 del plan junto a R2 (D36), con el realce moderado del brillo ya decidido.
- **Estado:** listo para la revisión por subagente.

## Plan
1. C6 primero, porque el CI de GitHub tarda: el rebase del PR 1, el cierre del PR 2 y el `ignore` de `dependabot.yml`.
2. C5: un `settlePage` común para los e2e, sin `networkidle`.
3. Capturas «antes» con el build de `main`: las vistas «El Himalaya» (también en móvil), «España» y «Las luces de la noche», la comparativa con EPIC y la vista general (escritorio, portátil y móvil, en 2026, 2032 y la conjunción de 2040).
4. C1: la opacidad de las nubes según lo que el disco de la Tierra desborda la parte visible, con test de la curva y del motor.
5. C2 y C3: los radios un 25 % mayores, el alivio de solapes (función pura con tests) y el tamaño mínimo en pantalla, con el muestreo de 1900–2100 en escritorio y en un móvil de 390 px.
6. Capturas «después», mediciones (FPS, VRAM, llamadas de dibujo y radios en pantalla) y pósteres.
7. El plan (C4, C8, la 8K, D35 y D36), `PENDIENTES.md` y `PROMPTS.md`.
8. `npm run check`, e2e, revisión por subagente, correcciones, fusión y `DIARIO.md`. Después, el bloque D.

## Qué se ha hecho

| # | Qué | Dónde |
|---|---|---|
| C1 | Las **nubes se atenúan en los primeros planos**: enteras con el disco a la vista y hasta 0,3 cuando lo desborda; su sombra, igual. El Himalaya ya se ve, y la comparativa con EPIC sale **idéntica** | `visual-config.ts` (`cloudFade`, `cloudOpacity`), `body-material.ts` (`uCloudOpacity`), `world.ts`, `engine.ts` |
| C2 | Los planetas, **un 25 % más grandes** (`radiusFactor` 0,084 → 0,105) y **sin solapes**: solo encogen los dos que se acercan, con un paso suave, y su sistema de lunas con ellos | `ephemeris/scale.ts` (`relieveOverlaps`, `reliefFactor`, `placeBodies`), `engine.ts` |
| C3 | **2 px de radio mínimo en pantalla** para los planetas en la vista general, sin cambiar posiciones ni órbitas | `ephemeris/scale.ts` (`OverviewScreen`), `engine.ts` (`updateOverviewScreen`), `visual-config.ts` |
| C5 | Los e2e esperan a algo concreto (el `h1`, las fuentes y el explorador listo) en lugar de `networkidle` | `e2e/support.ts` (`settlePage`), `accesibilidad`, `privacidad` y `publicacion` |
| C6 | PR 2 cerrado con su comentario e `ignore` de las versiones mayores de `@types/node`. **PR 1, rebasado y con el CI en verde, pero sin fusionar**: el clasificador de permisos del modo automático no me dejó (ver abajo) | GitHub, `.github/dependabot.yml` |
| C4, C8, 8K | Al plan: la fase 6 (tarea 8 y un criterio), D24 y las fases 9, 10 y 11 | `docs/PLAN.md` |
| D35 | La decisión de los tamaños de la vista general (C2 y C3) | `docs/PLAN.md` §1 y §4.4 |
| D36 | Los anillos de Saturno (decisión de Iván): tarea 9 y cuatro criterios de la fase 7 | `docs/PLAN.md`, `docs/decisiones/ANILLOS-SATURNO.md` |
| — | `PENDIENTES.md` (lo decidido, marcado; C7 y el PR 1, para Iván) y `PROMPTS.md` (R y C ✅) | — |
| Propio | Los **pósteres** regenerados: el de la vista Tierra seguía siendo el de la fase 4b (la Tierra lechosa de antes de la fase 5) | `public/img/poster-*.webp` |

## C1: las nubes en los primeros planos

### La curva
La opacidad sigue a **lo que el disco de la Tierra desborda la parte visible del lienzo**: su radio en pantalla entre la mitad del lado más corto de esa parte. Es la distancia de la cámara medida contra lo que se ve, así que vale igual en escritorio y en móvil, con o sin paneles:
- hasta **1** (el disco entero a la vista), las nubes enteras;
- de 1 a **2,2**, bajan con una curva suave (smoothstep);
- desde 2,2, **0,3**.

Con la textura de las nubes multiplicada por esa opacidad cambian a la vez la cobertura, su sombra, el brillo del océano que tapan, las luces de las ciudades que atenúan y el relleno. El motor la recalcula en cada frame con el radio en pantalla de la Tierra (`screen`), así que un vuelo o la rueda la animan solos.

Medida en el modo de captura (el uniforme del shader, 1600 × 900 y 390 × 844):

| Vista | Escritorio | Móvil |
|---|---|---|
| Vista Tierra, «La Tierra completa» y «El Pacífico» (y las comparativas con EPIC) | 1 | 1 |
| «Las luces de la noche» (2,4 radios) | 0,57 | 0,30 |
| «España» (2 radios) | 0,31 | 0,30 |
| «El Himalaya» (1,9 radios) | 0,30 | 0,30 |

En el móvil, la parte visible es más estrecha y, a igual distancia, el disco la desborda más.

### Comprobaciones
- **Tests:** la curva (1 con el disco a la vista, el mínimo de cerca, monótona y sin saltos) y el motor (enfocada la Tierra, 1; en «El Himalaya», menos de 0,6; en la vista general, 1).
- **EPIC y R3:** `tierra-epic-2016` sale **idéntica píxel a píxel** antes y después (diferencia media 0, máxima 0). La medida de R3 (océano / desierto 0,189 frente a 0,178) no cambia.
- **No hace falta la deriva inicial por vista guiada** (la otra opción de la revisión): con la atenuación, la cordillera se ve entera, nevada, en escritorio y en móvil.

### Capturas (`docs/informes/img/revision-bloque-c/{antes,despues}/`)
- `vista-himalaya` y `movil-vista-himalaya` (nueva en `capture-earth.mjs`): antes, una banda de nubes tapaba el Tíbet y el Himalaya; después, una bruma tenue deja ver la cordillera.
- `vista-espana` y `movil-vista-espana`: la Península y Canarias se leen mejor, con los siete marcadores.
- `vista-luces`: casi igual (diferencia media 0,7 de 255): de noche las nubes apenas se ven.
- `tierra-epic-2016` y `tierra-epic-2016-comparada`: iguales.

## C2 y C3: los tamaños de la vista general

### Cómo funciona
- **Los radios, un 25 % más grandes** (`radiusFactor` 0,105): Júpiter, 9,1 unidades (7,3 en la 4b), y la Tierra, 3,5 (2,8). El Sol sigue en 13 y sigue siendo el mayor.
- **Sin solapes (`relieveOverlaps`, función pura en `ephemeris/scale.ts`).** Para cada par de cuerpos (el Sol y los planetas), el factor que deja 1,5 unidades de aire entre sus discos es f = (d − 1,5) / (r₁ + r₂). Si uno es Saturno, también entre el otro disco y **sus anillos como disco plano** en su ecuador (con el polo de ese instante y una bisección), no como una esfera: así Júpiter solo encoge cuando de verdad se acerca al plano de los anillos.
  - Los dos encogen por igual con un paso suave: nada por encima de 1,15, lo justo por debajo de 0,85 y, entre medias, una parábola tangente a las dos que nunca se pasa.
  - Cada cuerpo se queda con el menor de sus pares: **solo encogen los que se acercan**, y recuperan el tamaño al separarse. Las posiciones cambian de forma continua y los tamaños también.
- **El tamaño mínimo (C3):** en la escala ilustrativa, ningún planeta mide menos de **2 px de radio** (4 de diámetro). El radio mínimo sale de la distancia de cada planeta a la cámara de la vista general y de la focal en píxeles. No toca posiciones ni órbitas, y el Sol no lo necesita.
- **Todo va dentro de la colocación ilustrativa** (`placeBodies`): primero el Sol y los planetas, después el mínimo y el alivio de solapes, y por último las lunas, alrededor de su planeta con su tamaño final.
  - Un sistema de lunas encoge con su planeta, y sus órbitas (que usan el radio colocado del planeta) siguen pasando por ellas.
  - Las transiciones de marco interpolan desde esos tamaños: al enfocar un planeta, el mínimo de los demás se desvanece con la colocación ilustrativa, sin saltos. Mientras hay un cuerpo enfocado, la cámara de la vista general se conserva.
  - En los marcos físicos (un sistema local o la escala real), nada de esto actúa.
- **Las lunas aparecen cuando antes:** con los planetas un 25 % más grandes, sus sistemas también lo son en pantalla. Los umbrales de `moonResolutionPx` crecen igual (de 8–30 a 10–37,5 px); si no, Calisto se empezaba a dibujar en la vista general de escritorio.

### El muestreo de 1900 a 2100 (cada 3 días, `scene/illustrative-layout.spec.ts`)

| Comprobación | Escritorio | Móvil de 390 px (con el mínimo, cámara pesimista) |
|---|---|---|
| Aire mínimo entre discos | 5,30 unidades | 3,80 |
| Aire mínimo entre un disco y los anillos de Saturno | 1,50 (el margen exacto, en 1921) | 1,50 |
| Una luna y su planeta | 0,31 | 0,53 |
| Una luna y otro cuerpo | 0,74 | (no se dibujan) |
| Lunas de sistemas distintos, solo en conjunciones | −3,30 (2060) | (no se dibujan) |
| Lunas en los anillos, solo en conjunciones | −2,33 (2000) | (no se dibujan) |
| Quién encoge | **Júpiter y Saturno**, en un **3,2 %** de las muestras, como mucho **×0,79** | lo mismo: los rocosos, con el mínimo, nunca se acercan |

- En las conjunciones de Júpiter y Saturno, cada ~20 años, encogen unos meses: a 3 días/s, decenas de segundos.
- El test del móvil usa una cámara más pesimista que la real (0,5 px por unidad a la distancia del Sol; la fase 4b midió 0,62 en Júpiter). En el móvil, con los planetas de unos 2 px, ningún sistema de lunas se distingue y sus lunas no se dibujan (`moonPresence`): el test solo mira sus discos y los anillos.
- Las lunas de sistemas distintos se tocan algo más que en la 4b en las conjunciones (−3,30 frente a −2,5), porque sus sistemas son un 25 % mayores. En esas fechas no se dibujan; el límite del test crece igual (−3,5).

### Radios en pantalla (px CSS, `node scripts/measure-system.mjs`, modo de captura)

| | Sol | Mercurio | Venus | Tierra | Marte | Júpiter | Saturno | Urano | Neptuno |
|---|---|---|---|---|---|---|---|---|---|
| Escritorio, 24-10-2026, antes | 25,4 | 3,6 | 4,7 | 4,8 | 3,7 | 13,0 | 10,8 | 7,0 | 7,4 |
| Escritorio, 24-10-2026, después | 25,4 | 4,5 | 5,9 | 6,0 | 4,6 | **16,2** | 13,5 | 8,7 | 9,2 |
| Escritorio, 01-03-2032, después | 25,4 | 4,3 | 7,3 | 7,0 | 4,5 | **21,2** | 13,0 | 8,9 | 8,9 |
| Portátil, 24-10-2026, después | 19,1 | 3,4 | 4,5 | 4,5 | 3,5 | 12,3 | 10,3 | 6,7 | 7,0 |
| Móvil, 24-10-2026, antes | 8,2 | 1,2 | 1,7 | 1,7 | 1,3 | 4,5 | 4,0 | 2,7 | 2,8 |
| Móvil, 24-10-2026, después | 8,2 | **2,0** | 2,1 | 2,1 | **2,0** | 5,7 | 5,0 | 3,4 | 3,5 |
| Móvil, 01-03-2032, después | 8,2 | 2,0 | 2,2 | 2,2 | 2,0 | 6,2 | 4,9 | 3,5 | 3,5 |

Júpiter pasa de 13–17 px de radio a **16–21** en escritorio (la revisión pedía ~19). En el móvil, el mínimo actúa en Mercurio y Marte (de 1,2–1,3 a 2,0 px); en escritorio y en el portátil, en ninguno.

### Capturas (`docs/informes/img/revision-bloque-c/{antes,despues}/`)
- `escritorio-sistema`, `escritorio-sistema-2032` y `portatil-sistema`: los planetas, más grandes.
- `escritorio-sistema-2040` y `movil-sistema-2040` (nuevas en `capture-system.mjs`): la conjunción de Júpiter y Saturno de 2040. Los dos encogen hasta más o menos su tamaño de la fase 4b y no se tocan; los demás, más grandes.
- `movil-sistema`, `movil-sistema-2032` y `movil-sistema-2040`: los rocosos ya no bajan de 4 px de diámetro. Por debajo de 3 px de radio siguen llevando su marcador (un anillo), como en la fase 4b.

## C5: los e2e, sin `networkidle`
`settlePage` (en `e2e/support.ts`) espera:
- a que el `h1` sea visible;
- a `document.fonts.ready`;
- en el explorador (su layout está en el HTML prerenderizado), al primer frame del 3D (`is-ready`) y a la interfaz diferida.

Además:
- **accesibilidad** («todas las páginas del sitio»): `settlePage` en cada ruta;
- **privacidad**: `settlePage` en cada ficha y, al final, 2 s fijos escuchando peticiones, por si alguna llega tarde (lo que pide la revisión);
- **publicación** (CSP): espera a que hayan terminado la petición del catálogo de estrellas y las de 9 texturas, y después `settlePage`.

## C6: Dependabot
- **PR 2** (`@types/node` 26): cerrado con un comentario que explica el motivo. `dependabot.yml` ignora desde ahora las versiones mayores de `@types/node`, que siguen la de Node del proyecto (`.nvmrc`, Node 24).
- **PR 1** (`typescript-eslint` 8.72.0): pedido el rebase (`@dependabot rebase`). Con el `main` actual, el CI pasa entero (lint, tests, build y e2e). **No está fusionado:** al lanzar `gh pr merge`, el clasificador de permisos del modo automático lo bloqueó («Merge Without Review»), aunque la revisión lo autorizaba. No lo he rodeado. Queda para Iván en `PENDIENTES.md`: un clic en GitHub, o el permiso para `gh pr merge`.

## El plan
- **C4, fase 6:** la tarea 8 y un criterio:
  - los mapas de alta resolución, solo con el cuerpo enfocado o grande;
  - la 8K de la Tierra, liberada al salir de su vista;
  - el test del presupuesto con las dos vistas como peor caso;
  - KTX2, empezando por la 8K y la Luna.
- **C8:** en D24 (se acepta y se explica), en la fase 9 (una frase en la privacidad) y en la fase 11 (mirar si la zona del dominio propio permite desactivarlo, en la parte manual de Iván).
- **La 8K más barata:** en la fase 10, tarea 4.
- **D35:** los tamaños de la vista general (C2 y C3), también en §4.4.
- **D36:** los anillos de Saturno (decisión de Iván, 30-10):
  - el color, de espectrofotometría publicada;
  - τ(r), de un perfil radial medido;
  - el realce moderado del brillo, ilustrativo;
  - sin tono lavanda.
  
  Va en la tarea 9 de la fase 7, con sus cuatro criterios. Sustituye al color medido en R1, que la propia decisión llama un error de esa revisión.
- **§6 y `PROMPTS.md`:** los bloques R y C, marcados como revisados.

## Hallazgos propios
- **El póster de la vista Tierra era el de la fase 4b.** La fase 5 cambió el material de la Tierra y no regeneró los pósteres. Como el 3D entra con un fundido sobre el póster, durante ese fundido se veían dos Tierras distintas: la lechosa del póster y la nueva. Regenerados los seis con `build-poster.mjs` (mismos tamaños, así que `viewer-poster.ts` no cambia). El de la vista general cambia por los planetas más grandes, y los de la Luna, apenas (diferencia media < 0,4).
- **El tamaño mínimo, atrasado un frame.** La primera versión calculaba el mínimo con la cámara del frame anterior. Con el render bajo demanda, el último frame tras mover la cámara se quedaba con los tamaños de antes: el test del motor en 390 × 844 dio 1,7 px. Ahora se recalcula después de colocar la cámara y, si ha cambiado, se recolocan los 30 cuerpos (en reposo, una sola vez).

## Comprobaciones
- **Tests unitarios:** 524 (antes, 514), con la cobertura de `ephemeris/` en el 99,56 % de sentencias y el 96,96 % de ramas.
- **Mediciones** (RTX 3060, `measure-system.mjs`, alta / media / baja):
  - **vista general a 3 días/s:** 60 / 59,8 / 59,8 FPS, 21 llamadas de dibujo y 38 / 38 / 37 MB de VRAM;
  - **Júpiter a 1 h/s:** 60 FPS, 7 llamadas y 78 / 46 / 45 MB;
  - **vista Tierra a 1 h/s:** 60 FPS, 6 llamadas y 278 / 86 / 85 MB.

  Lo mismo que antes de la revisión. En la vista general, la CPU por frame pasa de 1,39 ms (fase 5) a 1,52 ms en alto: el alivio de solapes (36 pares y una bisección para Saturno) y el mínimo en pantalla. Con la cámara quieta, los cuerpos se colocan una sola vez por frame.
- **`npm run check` y e2e:** en §«Salida de los checks».

## Salida de los checks
- **e2e:** 70 de 70 en 4,5 min (`npx playwright test`, SwiftShader, 4 trabajadores), con las esperas nuevas de C5.
- **`npm run check`:** (se completa tras la revisión).

## Cómo probarlo
1. La vista previa de la rama: https://revision-bloque-c.tierra-luna-sol.pages.dev.
2. **C1:** en la vista Tierra, «El Himalaya». Acercar la rueda en cualquier punto: las nubes se aclaran al llenar la pantalla.
3. **C2:** en la vista general, los planetas, más grandes. Con `/?fecha=2040-10-15T00:00Z` y la reproducción a 3 días/s, Júpiter y Saturno encogen un poco al cruzarse y recuperan su tamaño después.
4. **C3:** en el móvil, en vertical, ningún planeta baja de 4 px de diámetro.
5. Capturas y mediciones: `npm run build && node scripts/capture-earth.mjs <carpeta> --solo=vista-himalaya,movil-vista-himalaya`, `node scripts/capture-system.mjs <carpeta>` y `node scripts/measure-system.mjs`.
