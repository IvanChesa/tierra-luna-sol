# Informe: Fase 9b (el Sol, las lunas y la Tierra de noche)

- **Rama:** `fase-9b-sol-lunas`
- **Fecha:** 2026-11-04 (en curso)
- **Estado:** en curso: hechas la tarea 0 y la entrega 9b.a; siguen 9b.b, 9b.c, 9b.d y 9b.e

## Plan
Bloque S, modo autónomo, una sola fase por entregas en el orden de `docs/decisiones/FASE-9b-SOL-LUNAS.md` (la prioridad de Iván), que manda sobre este plan en tareas y criterios. La revisión del bloque E está aplicada en `main` (`0963b9f`). Los PR 1 y 3 de Dependabot (E5) siguen abiertos: la rama sale del `main` de hoy y, cuando Iván los fusione, se traen (son de parche). Cada entrega cierra con `npm run check`, este informe al día, sus capturas (`?captura=1`, escritorio y móvil, en `docs/informes/img/fase-9b/`) y un commit; y se sube la rama para que su vista previa (`fase-9b-sol-lunas.tierra-luna-sol.pages.dev`) enseñe cuanto antes la primera.

**0 · `/luna` en las migas y en el menú** (E4, decisión de Iván del 04-11)
- Las migas de `/luna`: «Inicio › Lunas › Luna».
- «Lunas» marcado en el menú también en `/luna` (con la misma URL). El código propio inicial está a 120 bytes de su presupuesto (14,88 kB de 15): se hace con lo mínimo y se mide; si no cabe, se busca el ahorro en el propio bundle inicial, sin subir el presupuesto.

**9b.a · Los sistemas de lunas de la vista general (D39)**
- Primero, una opción **solo de captura**, `?captura=1&cuerpo=jupiter&marco=ilustrativo`: el planeta enfocado sin pasar a su sistema local físico, para ver de cerca su sistema de la vista general. Con ella, las capturas «antes» (el build de `main`) y «después».
- **Tamaños** (`ephemeris/scale.ts`, función pura con tests): cada luna, `R_planeta · (r / R)^β` con β = 0,65, sobre el radio final de su planeta (con el alivio y el mínimo en pantalla de D35). Medido en el script de exploración: Ganímedes, el 11,7 % de Júpiter (objetivo, 10–15 %); la Luna, el 42,9 % de la Tierra (35–45 %); Titán, el 12,9 % de Saturno. El orden de tamaños de cada sistema se conserva (la ley es monótona).
- **Distancias sin cruces** (función pura con tests): por sistema, la primera luna fuera del planeta (en Saturno, del borde exterior del anillo A, a 2,27 radios) con un margen; cada una, al menos a la anterior más la suma de sus radios, un hueco del mismo tamaño y su excentricidad (el periapsis de la de fuera nunca llega al apoapsis de la de dentro); y una parte logarítmica de la distancia real para que los saltos grandes (Titán y Jápeto, Fobos y Deimos) se noten. Cada luna conserva su órbita real escalada por un factor propio: la misma dirección, la misma forma y el mismo orden. Las órbitas y las estelas usan la misma transformación.
- **El alivio de D35 con el tamaño de cada sistema:** Júpiter con sus lunas mide ~2,9 de sus radios y Saturno ~4,8: en sus conjunciones (las de 1901, 1921, …, 2100, a 24–27 unidades), encoger los dos planetas con sus sistemas los dejaría a menos de la mitad. Se propone (y se documenta como decisión técnica) que **el sistema de lunas se comprima hacia su planeta** (posiciones y tamaños de las lunas por un factor c ≤ 1, que conserva los huecos) cuando se acerca a otro cuerpo o sistema, con el mismo paso suave de D35; los discos de los planetas siguen con el alivio de siempre (×0,79 como mucho, el 3,2 % del tiempo). Con c muy pequeño, las lunas se desvanecen. Muestreo de 1900 a 2100 en escritorio y en el móvil de 390 px.
- **Presencia:** una luna aparece cuando su sistema se distingue (como ahora) y, además, cuando su disco llega a ~1 px (sin motas de menos de un píxel alrededor de Saturno, cuyas lunas ahora empiezan fuera de los anillos y se distinguirían antes).
- **El mapa de cada luna cuando se ve grande** (radio de ~24 px o más, con histéresis, como `LARGE_ENTER_PX`), sin enfocarla, al nivel de la vista general de las lunas, y liberado al dejar de verse (§5, VRAM medida).
- **El color esquemático, la media de su mosaico**: un script que lo calcula de cada mosaico (cabecera «GENERADO por…») y `body-colors.ts` que lo usa.
- Tests: el muestreo de 1900 a 2100 (cada 3 días) con los tamaños efectivos, en escritorio y en el móvil: ninguna luna toca a otra, a su planeta, a otro cuerpo o a los anillos, también en las conjunciones; las proporciones del punto 1 y el orden de tamaños y de órbitas de cada sistema. Capturas antes y después (Júpiter y Saturno de cerca, escritorio y móvil; Saturno con todas sus lunas fuera de los anillos) y la de una luna con su mapa sin enfocarla.

**9b.b · La Tierra de noche (D40)**
- Mirar la licencia y la resolución de Black Marble 2016 (NASA Earth Observatory, VIIRS) en gris; si vale (dominio público de la NASA), usarla con un color cálido documentado. Si no, quitar la base azul de la textura de Solar System Scope en el script de texturas (restando el fondo local, sin tocar las luces).
- Sin relleno teñido en la cara nocturna de la Tierra (el de primer plano no ilumina la textura de día donde es de noche) y la compensación de la exposición sin convertir el suelo en otra cosa: las luces pueden ganar, el suelo sin luces sigue negro. El limbo de la atmósfera y las estrellas que tapa dan la forma del disco.
- Medida en CIELAB del suelo sin luces en la captura (L\* ≤ 5, C\* ≤ 3) y del tono de las luces; las comparativas con EPIC de la fase 5, repetidas (las mismas cifras). Capturas antes y después, con una foto de la ISS enlazada.

**9b.c · El Sol (D41)**
- El oscurecimiento del limbo por canal con coeficientes publicados por longitud de onda (Neckel y Labs, 1994, u otros con fuente), con test y medido en la captura (I(μ)/I(1) en R, G y B).
- Que deslumbre: el centro casi blanco; **bloom solo para el Sol** con `three/addons` (sin dependencias nuevas) en los niveles alto y medio, con el fondo pintado dentro de la escena (fase 3b, §4.1), sin quemar los planetas cercanos; en el bajo, el halo.
- Granulación que se mueve, más visible en primer plano; manchas ilustrativas en sus bandas de latitud con umbra y penumbra y la rotación diferencial publicada (test); su cantidad, fija y moderada salvo que haya una fuente del ciclo con licencia compatible (SILSO es CC BY-NC: no vale); fáculas si salen gratis; una corona tenue en primer plano. Quieto con movimiento reducido y en las capturas.
- **La totalidad del cielo** (E1): la Luna más oscura que el cielo, el cielo azul muy oscuro con el resplandor del horizonte y la corona con serpentinas; medido en CIELAB en la captura del 12-08-2026 desde Fraga y comparado con una foto real enlazada.
- §5 en los tres niveles (FPS, VRAM y llamadas de dibujo).

**9b.d · Las lunas: formas y mapas (D42 y D43)**
- Buscar y comprobar (licencia y fichero) los modelos de forma de Fobos, Deimos y Proteo y los mapas de Deimos y de las cinco de Urano (los del JPL, D43). Si un fichero solo se puede bajar a mano (el archivo del PDS SBN tiene una verificación anti-bots), se pide a Iván en `PENDIENTES.md` y se sigue con lo demás.
- Las mallas reducidas por script (cabecera «GENERADO por…»), con el mapa proyectado por longitud y latitud planetocéntricas, la orientación con su test y los semiejes frente a los publicados; las sombras analíticas siguen con el elipsoide medio, y se dice.
- Los mapas de Urano teñidos con su color publicado y el norte que no vio la Voyager difuminado, con sondas del Gazetteer; la dicotomía de Jápeto con los albedos medidos; el terminador de Titán suave; la textura del planeta al enfocar una de sus lunas, si se ve grande.
- La rejilla de las 20 lunas, `FUENTES.md` y `/creditos` fichero a fichero; §5 en los sistemas de lunas.

**9b.e · Venus «Bajo las nubes» (D44)**
- El mosaico global del radar de Magellan (USGS Astropedia, dominio público; comprobar el producto y la resolución) con su sonda (Maat Mons); un botón con `aria-pressed` en el panel de Venus enfocado, con el aviso visible; un fundido (un corte con movimiento reducido); la textura solo al pulsarlo y liberada al salir. e2e del botón, axe, `FUENTES.md`, `/creditos` y §5.

**Cierre:** `npm run check`, este informe con las evidencias de cada criterio, la revisión por subagente, las correcciones, la fusión con `--no-ff`, el diario y el resumen del bloque S. Después, **parar** (no se empieza el bloque F).

## 1. Resumen
En curso. Hechas la tarea 0 y la entrega 9b.a:
- **Tarea 0:** `/luna`, con las migas «Inicio › Lunas › Luna» y «Lunas» marcado en el menú (E4).
- **9b.a, los sistemas de lunas de la vista general (D39):** cada luna con su propia ley de tamaños respecto a su planeta y en una órbita ilustrativa escalada que no se cruza con ninguna otra, con su planeta ni con los anillos (las de Saturno, ahora por fuera); un sistema que se acerca a otro cuerpo o sistema se comprime hacia su planeta en lugar de meterse en él; en la vista general, un sistema aparece cuando su planeta crece en pantalla, y cada luna lleva su mapa cuando se ve grande.

## 2. Criterios de aceptación

### Tarea 0 (E4)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| `/luna`: «Inicio › Lunas › Luna» y «Lunas» marcado en el menú, con la misma URL | ✅ | `body-detail-page.ts` (las migas de toda luna, también la Luna) y `app.ts` (`current()`); tests en `app.spec.ts` (en `/luna` desde antes de la primera navegación, es decir, en el HTML prerenderizado; `/lunas`, `/lunas/titan`, `/cielo?lugar=teide`, `/luna#fuente-1` y ninguno en el explorador) y el e2e de los índices (`e2e/contenido.spec.ts`: de `/lunas` a `/luna`, las migas y un solo `aria-current`). |
| El código propio inicial, dentro de su presupuesto (sin subirlo) | ✅ | 14,86 kB de 15 (antes de la fase, 14,88): lo que el sitio hace al navegar va a un chunk diferido; el JS inicial baja de 314,23 a 310,81 kB (sin `RouterLinkActive`). |

### Entrega 9b.a (D39)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Test: de 1900 a 2100, ninguna luna toca a otra, a su planeta ni a los anillos de Saturno en la vista general (en 3D, con los tamaños efectivos), también en las conjunciones de Júpiter y Saturno y con el tamaño mínimo de un móvil de 390 px | ✅ | `scene/illustrative-layout.spec.ts`, cada 3 días (24 350 muestras), en escritorio y con la cámara del móvil de C3. Peor margen (unidades): luna y su planeta, > 0; luna y otro cuerpo, 0,77 (en el móvil, 0,65); lunas del mismo sistema, 0,05; lunas de sistemas distintos, 1,56 (1,54); lunas y anillos de Saturno, > 0 (también las de Saturno, que antes no se miraban porque caían dentro). Los discos y los anillos, como en D35: ≥ 3,8 y 1,50 unidades de aire; solo encogen Júpiter y Saturno, el 3,2 % del tiempo y como mucho ×0,79. Lunas sin dibujar (su sistema, comprimido del todo): el 0,37 % de las muestras. |
| Las proporciones del punto 1, medidas, y el orden de tamaños y de órbitas de cada sistema, con test | ✅ | Ganímedes, el **11,7 %** del radio de Júpiter (objetivo, 10–15 %; antes, 26,7 %; real, 3,7 %); la Luna, el **42,9 %** del de la Tierra (35–45 %; antes, 59,4 %; real, 27,2 %). Tests en `ephemeris/scale.spec.ts` (`moonSystemLayout`: proporciones, orden de tamaños y de órbitas, también con las lunas desordenadas, como Tritón y Proteo, y el aire con el planeta y entre vecinas en el peor caso de sus excentricidades) y en `illustrative-layout.spec.ts` (los del catálogo). Tabla completa abajo. |
| Capturas antes y después: Júpiter y Saturno de cerca en la vista general, en escritorio y móvil; Saturno con todas sus lunas fuera de los anillos | ✅ | `docs/informes/img/fase-9b/antes-*` y `despues-*` (§7), con `?marco=ilustrativo` (solo en captura). Saturno desde arriba en 2029: antes, las órbitas y los discos de sus lunas, sobre los anillos; después, todas por fuera y en su orden. |
| Las lunas con su mapa al acercarse sin enfocarlas (captura), dentro de §5 | ✅ | Desde 24 px de radio (y hasta bajar de 18), su mapa de 1k sin su sistema enfocado: test en `engine.spec.ts` y comprobado en el navegador (Júpiter de cerca en el marco de la vista general: con dos pasos de zoom, Ganímedes mide 26 px y pide `1k/ganymede.…webp`; VRAM, 81,0 MB con el 4K de Júpiter, de 300). Captura `despues-escritorio-jupiter-mapas`. |

**Tamaños y semiejes de la vista general** (en radios de su planeta; `MOON_SYSTEMS`, del catálogo):

| Luna | Radio real | Antes (fase 4b) | Ahora | Semieje ahora (real) |
|---|---|---|---|---|
| Luna | 27,2 % | 59,4 % | 42,9 % | 1,83 (60,3) |
| Fobos · Deimos | 0,3 · 0,2 % | 10,1 · 9,2 % | 2,4 · 1,7 % | 1,34 · 1,74 (2,8 · 6,9) |
| Ío · Europa · Ganímedes · Calisto | 2,5 · 2,2 · 3,7 · 3,4 % | 23,0 · 21,7 · 26,7 · 25,8 % | 9,2 · 8,3 · 11,7 · 11,0 % | 1,40 · 1,79 · 2,23 · 2,72 (5,9 · 9,4 · 15,0 · 26,3) |
| Mimas · Encélado · Tetis · Dione · Rea | 0,3 · 0,4 · 0,9 · 0,9 · 1,3 % | 10,2 · 11,2 · 15,1 · 15,4 · 17,4 % | 2,4 · 2,8 · 4,6 · 4,8 · 5,8 % | 2,65 · 2,84 · 3,02 · 3,24 · 3,48 (3,1 · 3,9 · 4,9 · 6,3 · 8,7) |
| Titán · Jápeto | 4,3 · 1,2 % | 28,3 · 17,2 % | 12,9 · 5,7 % | 3,99 · 4,63 (20,3 · 59,1) |
| Miranda · Ariel · Umbriel · Titania · Oberón | 0,9 · 2,3 · 2,3 · 3,1 · 3,0 % | 15,3 · 22,0 · 22,1 · 24,9 · 24,5 % | 4,8 · 8,5 · 8,6 · 10,4 · 10,2 % | 1,35 · 1,64 · 2,01 · 2,42 · 2,86 (5,1 · 7,5 · 10,4 · 17,1 · 22,8) |
| Proteo · Tritón | 0,8 · 5,5 % | 14,8 · 31,3 % | 4,5 · 15,1 % | 1,35 · 1,82 (4,8 · 14,3) |

Las de Saturno empiezan en 2,65 radios: el borde exterior del anillo A está a 2,27.

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 0 · `/luna` en las migas y en el menú | hecha | |
| 9b.a.1 · Tamaño de las lunas respecto a su planeta | hecha | `R_planeta · (r / R)^0,65`, sobre el radio final del planeta (con el alivio y el mínimo de D35). |
| 9b.a.2 · Distancias ilustrativas sin cruces | hecha | `moonSystemLayout`: la primera, a 0,3 radios del planeta o del anillo A; cada una, a la anterior más dos veces la suma de sus radios y 0,02 radios, en el peor caso de sus excentricidades; y la parte logarítmica de la distancia real (1 radio por década). La órbita real de cada luna, escalada por su factor: su forma y su dirección. |
| 9b.a.3 · El alivio de D35 con el tamaño de cada sistema | hecha, de otra forma | Ver §4: el sistema se comprime hacia su planeta (`compressSystems`); el disco del planeta, con el alivio de siempre. |
| 9b.a.4 · El mapa de cada luna cuando se ve grande | hecha | ≥ 24 px de radio (lo suelta por debajo de 18), al nivel de la vista general. |
| 9b.a.5 · El color esquemático, la media de su mosaico | hecha | `scripts/build-texture-colors.mjs` → `scene/texture-colors.ts` (GENERADO): Ío, `#988d4d` (antes `#d8c25a`, mostaza); la Luna, `#96958f`. Los mosaicos en gris no lo necesitan (§5). |
| 9b.a.6 · Que pasen por delante es normal | — | Las capturas lo enseñan (Calisto delante de Júpiter); lo que no pasa es que se metan una en otra. |

## 4. Desviaciones del plan y motivo
- **9b.a.3, el alivio con el tamaño de cada sistema:** encoger cada planeta junto con su sistema (lo que proponía el documento) dejaría a Júpiter y a Saturno a menos de la mitad en sus conjunciones: con sus lunas fuera del planeta y de los anillos, sus sistemas llegan a 2,85 y 4,82 de sus radios (26 y 41 unidades), y en las conjunciones de 1900–2100 están a 24–27 unidades. En su lugar, **el disco de cada planeta sigue con el alivio de D35** (×0,79 como mucho, el 3,2 % del tiempo, sin cambios) y **es su sistema de lunas el que se comprime hacia él** (`compressSystems`): lunas, huecos y órbitas, por un mismo factor y con el paso suave de D35, para que los dos sistemas (tomados como esferas) dejen 0,5 unidades de aire. Con la compresión, las lunas nunca tocan nada, y en las conjunciones más cerradas llegan a desaparecer (radio 0). En el muestreo de 1900 a 2100, el sistema de Saturno se comprime el 21,8 % del tiempo (por debajo de ×0,3, el 8 %), el de Júpiter el 12,6 %, el de Urano el 10,7 % y el de Neptuno el 7,5 %; el de la Tierra, el 0,7 % (×0,91 como mucho, con Venus). Con sistemas más compactos apenas baja (Saturno, del 21 al 15 %): lo deciden las conjunciones de Júpiter, Saturno y Urano. En la fecha de hoy ningún sistema se comprime de forma visible; la conjunción de Saturno y Urano de 2032 y la de Júpiter y Saturno de 2040 se ven en las capturas.
- **Cuándo aparecen las lunas en la vista general:** con los sistemas nuevos, las lunas se separan antes del borde de su planeta, y el criterio de la fase 4b las enseñaba ya en la vista general por defecto (Calisto y Titán, con su nombre). Ahora, en la vista general, un sistema aparece cuando su planeta mide de 20 a 40 px de radio (por defecto, Júpiter mide de 16 a 21 px en escritorio) y cada luna, cuando su disco llega a 0,5–1,5 px (sin motas de medio píxel). En el sistema local físico, el criterio de siempre.
- **Tarea 0 y el presupuesto del código propio inicial:** la tarea añadía 260 bytes (15,14 kB de 15); para no subir el presupuesto, lo que el sitio hace al navegar (cerrar el menú del móvil y el desplazamiento al cambiar de página) va a un chunk que se pide después de pintar.

## 5. Decisiones técnicas nuevas
- **`?marco=ilustrativo`, solo en captura:** el cuerpo enfocado sin pasar a su sistema local físico, con las texturas de la vista general (sin sistema enfocado). Es la única forma determinista de ver de cerca un sistema de la vista general, cuya cámara gira alrededor del Sol.
- **Los mosaicos en gris y su color esquemático:** la escena tiñe cada mosaico en gris con el tono de su color esquemático, y el brillo del disco plano y el del mapa salen del albedo (D29): de media ya coinciden, y el script solo genera el color de los mapas en color (Ío y la Luna).
- **La compresión de los sistemas** (§4), en `ephemeris/scale.ts` (TS puro, con tests), y la presencia de las lunas en la vista general, en `visual-config.ts` (`overviewMoonsPx`).

## 6. Salida de los checks
Entrega 9b.a (`npm run check`, 04-11):
```
All files pass linting.
Test Files 75 passed (75) · Tests 726 passed (726)
Statements 98,88 % · Lines 99,67 % (ephemeris/)
Initial total 310,81 kB
✔ El JS inicial de las 40 páginas (17 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 14,86 kB de 15,00
  Diferido: three, 747,22 kB en bruto
✔ Enlaces de las 40 páginas: 1163 internos bien (rutas, ficheros y anclas)
```
Métricas: la vista general, 21 llamadas de dibujo y 38,4 MB de VRAM (como en la fase 9); Júpiter de cerca con Ganímedes y su mapa, 81,0 MB.

## 7. Capturas
`docs/informes/img/fase-9b/`, `antes-*` (el build del primer commit de la fase, sin la disposición nueva) y `despues-*`, con `scripts/capture-moon-systems.mjs`:
- Júpiter de cerca: `escritorio-jupiter-cerca` y `movil-jupiter-cerca`; con sus lunas con mapa, `escritorio-jupiter-mapas`.
- Saturno: `escritorio-saturno-arriba` (2029, desde arriba: el criterio de los anillos), `escritorio-saturno-cerca` (2029), `escritorio-saturno-cerca-2026` y `movil-saturno-cerca`.
- La Tierra y la Luna (`escritorio-tierra-cerca`), Marte, Urano y Neptuno.
- La conjunción de Júpiter y Saturno de 2040 (`escritorio-conjuncion-2040`: los sistemas, comprimidos del todo) y la vista general, por defecto y acercada (`escritorio-sistema`, `escritorio-sistema-cerca`, `movil-sistema`: sin lunas, como antes).

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- Los PR 1 y 3 de Dependabot (E5), en `PENDIENTES.md`.

## 10. Propuestas de cambio al plan
Ninguna por ahora.

## 11. Cómo probarlo
- `npm start` y, en el explorador, acercar la vista general hasta que Júpiter o Saturno midan más de 20 px de radio: aparecen sus lunas, fuera del planeta y de los anillos. Con `?fecha=2040-10-31T00:00Z`, en la conjunción de Júpiter y Saturno, sus sistemas se comprimen.
- `/?captura=1&cuerpo=saturno&marco=ilustrativo&fecha=2029-06-01T00:00Z` y Mayús + flecha arriba: el sistema de Saturno de la vista general, de cerca.
- `/luna`: las migas y «Lunas» marcado en el menú.
