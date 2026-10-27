# Informe: Fase 5 (La Tierra)

- **Rama:** `fase-5-tierra`
- **Fecha:** 2026-10-27
- **Estado:** en curso (modo autónomo por bloques, bloque C)

## 0. Plan de la fase

Escrito antes de empezar, a partir de `docs/PLAN.md` (§0–§5, §7, D13, D20, D21, D29 y la fase 5), la revisión del bloque R (R3: velo lechoso y océanos frente a EPIC), el informe de la fase 3b (§4.7 y la propuesta 2 de §10: relación de brillo océano/tierra de EPIC sin contar dos veces la atmósfera), `docs/decisiones/CAMBIO-CIELO-ESPANA.md` (los lugares de la vista «España») y el código: `scene/materials/body-material.ts` y `atmosphere-material.ts` (la Tierra se dibuja hoy con el material común y solo la textura de día), `ephemeris/coordinates.ts` (`subsolarPoint`), `ephemeris/orientation.ts` (orientación de la Tierra de la fase 1), `scene/textures.ts` (ya hay día, noche, nubes, normales y especular en 1K/2K/4K) y `data/places.ts` (Fraga y Lleida).

### Entregas
| Entrega | Contenido |
|---|---|
| 5.a | **Material de la Tierra** (`scene/materials/earth-material.ts`, con los chunks de profundidad, D13): día y noche con la dirección real del Sol; terminador con tono crepuscular; luces nocturnas que se apagan gradualmente en el crepúsculo; especular en los océanos (máscara) y mapa de normales; nubes en una capa propia con deriva ilustrativa (quieta con movimiento reducido y en las capturas); atmósfera (Fresnel + tono del lado diurno) sin el velo lechoso (R3). Color y brillo frente a EPIC (propuesta 2 de la 3b): relación de brillo océano/tierra de las fotos de EPIC, sin contar dos veces la atmósfera; con las nubes, la exposición de la Tierra pasa a su albedo geométrico (0,434). Las texturas, por el manifiesto (noche, nubes, normales y especular solo en primer plano). Captura `tierra-epic-2016` junto a la foto de EPIC. |
| 5.b | **Orientación y Sol.** Test del punto subsolar del 21-06-2026 a las 12:00 UTC (≈ +23,4°, 0°, ±2°) con la misma función que da al shader la dirección del Sol en el sistema propio de la Tierra. **Control de la luz solar** en la vista Tierra: cambia la hora del día sin perder la fecha (control accesible con teclado y anuncio). |
| 5.c | **Sombra de la Luna** sobre la Tierra (umbra y penumbra analíticas, D20). Test: en el máximo del eclipse del 12-08-2026, el centro de la sombra calculada coincide con el de la NASA (±1°; fixture con URL). Captura del eclipse. |
| 5.d | **Vistas guiadas** (`data/tours.ts`): Tierra completa, Pacífico, Himalaya, luces nocturnas y España, con marcadores discretos en los lugares del cielo desde España (Montsec, Observatori Fabra, Roque de los Muchachos, Teide, Calar Alto, Madrid y Fraga). Sus coordenadas, de fuentes oficiales (IGN o la web de cada observatorio), con su zona horaria en `data/places.ts`. `TourPlayerComponent` con anterior, siguiente, reproducir y subtítulos accesibles; movimiento reducido. Textos con fuente y `reviewed: false`. |
| 5.e | **Textura de día de 8K** solo en el nivel alto y si cabe en `maxTextureSize`; presupuestos de §5 (vista Tierra ≤ 6 MB adicionales en alto y ≤ 2 MB en bajo; VRAM). |
| 5.f | **Cierre:** capturas de mediodía y medianoche UTC, de cada vista guiada, del eclipse y de EPIC, en escritorio y móvil; FPS y VRAM de la vista Tierra; `npm run check`, e2e, informe, revisión por subagente, correcciones y fusión. Al terminar, resumen del bloque C en `DIARIO.md` y **parada**. |

### Riesgos y dudas
1. **Coordenadas de los observatorios:** tienen que venir de fuentes oficiales citadas. Si alguna no se encuentra, el marcador se omite y se apunta (no se inventa).
2. **Calibración frente a EPIC:** las fotos de EPIC tienen una curva de brillo no documentada (informe de la 3b, §4.7). Se calibra la relación océano/tierra y el color, no el brillo absoluto.
3. **La prueba en el móvil de Iván** (criterio de FPS y VRAM en su móvil) no bloquea: se recoge cuando pueda.

### Dependencias
Ninguna nueva.

### Estado de las entregas (se actualiza al cerrar cada una)
| Entrega | Estado | Commits | Notas |
|---|---|---|---|
| 5.a | ✅ (falta la textura de 8K, en 5.e) | `2705fc6`, `296fbf5`, `5bb36a8` | Variante `TLS_EARTH` del material común: nubes con deriva (reloj de pared) y su sombra, reflejo del Sol en el océano, luces nocturnas en el crepúsculo, tono crepuscular y luz azulada dispersada sobre el lado diurno; la neblina del limbo, azulada y más tenue (R3). Las nubes, también en la vista general (allí la Tierra ya no se ve oscura); la noche, la máscara y las normales, solo en primer plano (test). Exposición con el albedo geométrico (0,434). Captura junto a EPIC: `scripts/capture-earth.mjs`. |
| 5.b | ✅ | `3b13188`, `727d278` | Test del punto subsolar con lo que recibe el shader (a menos de 0,05° de `subsolarPoint`). Panel «Luz del Sol» en la vista Tierra (hora del día sin cambiar la fecha), con su spec. |
| 5.c | ✅ | `072ee70`, `776e8c6` | `moonShadowCenter` (eje Sol–Luna contra el elipsoide WGS84) a menos de 1° del máximo del catálogo de la NASA (fixture generado con su URL), con el Sol a la altura de la ficha. En el shader, umbra y penumbra analíticas con las posiciones reales de la Luna y del Sol (no su dirección: su paralaje movía la sombra ~0,7°); test: el eje con lo que recibe el shader, a menos de 0,1° de `moonShadowCenter`. Captura `tierra-eclipse-2026`. |
| 5.d | pendiente | | Vistas guiadas y lugares del cielo desde España. |
| 5.e | pendiente | | Textura de día de 8K. |
| 5.f | pendiente | | Cierre. |
