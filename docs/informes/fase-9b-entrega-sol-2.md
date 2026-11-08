# Entrega 9b.f, el Sol, segunda vuelta (D46): nota de entrega (en curso)

- **Rama:** `fase-9b-f-sol-2` (desde `fase-9b-sol-lunas`, `d765654`), puertos 4380 / 4431.
- **Por qué:** Iván, el 08-11: «Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo».
- **Estado:** primera versión hecha, medida y enviada a la sesión de revisión para que Iván la vea. Falta su respuesta, `npm run check` completo, §5 en los tres niveles, `/cielo` píxel a píxel y el informe completo.

## Lo hecho (commits `5b4d1de` y `fb82597`)
- **Disco:** naranja saturado en todo el disco (paleta lineal antes del tone mapping, intensidad 1 de cerca y de lejos: ya no se lava a crema en la vista general); manchas claras (más amarillas) y oscuras (más rojas) a escala media y grande con ruido de gradiente propio en cinco octavas, retorcido por un campo que cambia despacio; granulación fina; manchas solares pardas de borde suave; el borde algo más oscuro y rojizo (el perfil de la 9b.c con sus exponentes × 0,55).
- **Halo:** un borde fino naranja rojizo pegado al limbo y rayos cortos y finos (283 + 157 por vuelta, con su curva); resplandor ancho solo en la vista general y muy tenue; sin corona en el explorador. **El bloom, apagado** (`VISUAL_CONFIG.sun.bloom.enabled`): desenfocaba el disco entero y era la mancha pálida.
- **Protuberancias:** fuera los bultos sólidos. Tres bucles de 14 hilos finos (~1 px), translúcidos, que se desvanecen con la altura, solo de cerca, respiran y se encienden y se apagan despacio.
- **Movimiento:** de cerca, el motor pinta cada 50 ms también en pausa (la superficie fluye, los bucles cambian); con movimiento reducido y en las capturas, quieto (tests en `engine.spec.ts`).

## Medidas (build de `fb82597`, 15-01-2026)
| | Centro (μ > 0,9) | Borde (μ 0,15–0,35) | σL\* |
|---|---|---|---|
| Referencia, escritorio | L\* 78,6 · C\* 51,5 · h 81° | 71,8 · 53,4 · 76° | 4,13 |
| Primera vuelta (sesión A) | 78,8 · 48,2 · 83° | 66,4 · 51,7 · 79° | 5,65 |
| **Ahora, de cerca, escritorio** | **78,7 · 52,1 · 81°** | **68,4 · 55,5 · 74°** | **4,71** |
| Ahora, de cerca, móvil | 78,8 · 52,0 · 81° | 67,9 · 56,1 · 74° | 4,74 |
| Ahora, vista general, escritorio | 78,6 · 52,4 · 80° | 67,8 · 56,7 · 74° | 4,19 |
| Ahora, vista general, móvil | 78,4 · 52,6 · 80° | 67,6 · 56,9 · 74° | 3,67 |
| Antes, vista general, escritorio | 98,3 · 21,3 · 106° (lavado) | 93,4 · 38,1 · 97° | 0,52 |

- h a ±5° y C\* ≥ 90 % de la referencia: cumplido en las cuatro vistas.
- El halo de cerca (L\*/h a 1,02 y 1,05 radios): 22,5/43° y 14,1/12° (la referencia, ~20–32/44–48° y ~13/39°; antes, 57,7/70° y 54,0/72°: la mancha pálida).
- **Pendiente:** σL\* cambia con el tiempo (de 4,1 a 6,3 en dos minutos de reloj); hay que asegurar que no baje de 4,13 y suavizar las zonas oscuras más pardas de algunos instantes (prueba a medias, descartada en este commit).
- Movimiento (`scripts/capture-sun-motion.mjs`, en uso real con `?fecha=`, en pausa): en 6 s, diferencia media 7,23 (0–255) en el disco; con movimiento reducido, 0,00.

## Capturas
- En el repo: `sol2-antes-d46-*` y `sol2-despues-d46-*` (escritorio y móvil, de cerca y en la vista general) y `sol2-movimiento-t0/t6` y `sol2-movimiento-reducido-t0/t6` en `docs/informes/img/fase-9b/`.
- Lado a lado con la referencia (solo en local): `assets-src/referencias/comparativas/sol2-despues-d46-*.png`.
