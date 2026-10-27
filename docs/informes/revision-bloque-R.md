# Revisión del bloque R aplicada

- **Fecha:** 2026-10-27
- **Rama:** `main`, como la revisión del bloque B
- **Revisión:** `docs/revisiones/bloque-R.md`. **APROBADO**, con R1 (los anillos) y R4 (la pista de uso) por aplicar, R2 y R3 al plan y las decisiones de Iván.
- **Además:** el cambio de hosting de Iván del mismo día, que pasa a **Cloudflare Pages**, llevado al plan.

## Qué se ha hecho

| # | Qué | Dónde |
|---|---|---|
| R1 | Anillos de Saturno con el **detalle radial fino** de la textura y el **color medido** en la foto del Hubble de 2019, sin tocar la profundidad óptica ni el albedo de la NASA | `scripts/build-textures.mjs`, `src/app/data/photometry.ts` (`RING_PHOTOMETRY.chromaticity`), `src/app/ephemeris/photometry.ts` (`relativeDetail`, con test), la tira regenerada y `scripts/compare-rings.mjs` (nuevo) |
| R2 | El anillo de luz del limbo de Saturno a contraluz, a la **fase 7**, con su criterio | `docs/PLAN.md`, fase 7 |
| R3 | La Tierra frente a EPIC (sin velo lechoso, relación océano / tierra), a la **fase 5**, con su criterio | `docs/PLAN.md`, fase 5 |
| R4 | «Arrastra para girar · **usa la rueda** o pellizca para acercarte · elige un cuerpo» | `viewer-layout.html` y la fase 3c del plan |
| Decisiones | Propuestas de la 3c aprobadas: la fase 10, §5 (Lighthouse) y las miniaturas de las lunas en la fase 7. La propuesta 2 de la 3b, a la fase 5; la 3, al backlog, salvo el limbo de Saturno (fase 7) | `docs/PLAN.md` |
| D32 | **Licencia MIT**: `LICENSE` («Copyright (c) 2026 Iván Chesa Lapena»), `"license": "MIT"` en `package.json` y la nota de las licencias de terceros en el README y en `/creditos` (el catálogo de estrellas, CC BY-SA 4.0) | `LICENSE`, `README.md`, `credits-page.ts` |
| Hosting | **Cloudflare Pages** (cambio de Iván): D9, D17, D23, D24, D26 y las fases 4 y 11, §0, §3, §8, `CLAUDE.md`, `PROMPTS.md` y `PENDIENTES.md` | — |

## R1: color y detalle de los anillos

### Cómo se ha medido
En lugar de medir a ojo, `scripts/compare-rings.mjs` (nuevo) compara radio a radio la foto y la escena con la misma geometría (`?cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra`, en vista limpia):
- **En la foto** (heic1917a), con la elipse de los anillos de `measure-reference-colors.mjs`.
- **En la escena**, proyectando cada punto del plano de los anillos con la cámara del motor.

En las dos se miden las ansas (a ±17,5° del eje mayor) y, como referencia, el disco (medio radio ecuatorial). Así, el brillo de los anillos se da respecto al del disco. La cromaticidad es el RGB lineal entre su luminancia.

### Resultado

| Medida | Foto (Hubble 2019) | Antes | Después |
|---|---|---|---|
| Estructura fina del anillo B (desviación / media en bandas de 500 km) | 0,178 | 0,016 | **0,197** |
| Estructura fina del anillo A | 0,220 | 0,016 | 0,039 |
| Brillo del anillo B / disco | 1,44 | 0,82 | 0,77 |
| Brillo del anillo A / disco | 0,73 | 0,58 | 0,58 |
| Cromaticidad del anillo B | 0,94 · 1,01 · 1,07 | 0,93 · 1,01 · 1,09 | 0,93 · 1,01 · 1,08 |
| Cromaticidad del disco | 1,36 · 0,94 · 0,55 | 1,33 · 0,95 · 0,53 | 1,33 · 0,95 · 0,53 |

Perfil del anillo B, con el brillo relativo al de 100 000 km. Antes era plano; ahora sigue el de la foto:

| Miles de km | 92,5 | 95 | 97,5 | 100 | 102,5 | 105 | 107,5 | 110 | 112,5 | 115 |
|---|---|---|---|---|---|---|---|---|---|---|
| Foto | 0,54 | 0,65 | 0,85 | 1 | 1,05 | 1,12 | 1,21 | 1,19 | 1,15 | 0,82 |
| Antes | 0,95 | 0,96 | 1,00 | 1 | 1,01 | 1,00 | 1,00 | 1,01 | 1,01 | 0,98 |
| Después | 0,55 | 0,58 | 0,76 | 1 | 0,95 | 1,07 | 1,14 | 0,92 | 0,96 | 0,90 |

### Qué cambia
- **El detalle:** la luminancia de la textura de Solar System Scope modula, columna a columna, el albedo de cada anillo. Se normaliza para que su media no cambie donde se calibra: la ventana del Hubble en el B y en el A (Salo y French, 2010) y el anillo entero en el C y en la división de Cassini. Se acota entre ×0,2 y ×2 (en la división de Encke, la textura cae casi a 0). Su perfil en el anillo B es el de la foto (normalizado igual: 0,64 · 0,78 · 1,00 · 0,97 · 1,07 · 1,14) y su contraste fino, el mismo (0,180 frente a 0,178). Por eso se usa la textura y no se inventa nada.
- **La física se conserva:**
  - la profundidad óptica de cada anillo sigue en el intervalo de la ficha de la NASA;
  - el albedo del B y del A sigue dando la reflectividad del Hubble (B 0,534 y A 0,400, frente a 0,533 y 0,400 antes);
  - `build-textures.mjs` lo comprueba al generar la tira.
- **El color:** el matiz de cada anillo, medido en la foto, pasa de `scripts/reference-colors.mjs` a `src/app/data/photometry.ts` (`RING_PHOTOMETRY.chromaticity`), con su fuente y con un test (luminancia 1 y la URL de la foto).
- **El peso:** la tira pasa de 1,5 / 2,4 / 3,7 kB a 1,8 / 3,0 / 5,0 kB en los niveles bajo, medio y alto.

### Lo que no cambia, y por qué
- **El anillo B no es tostado en esa foto.** En heic1917a (y en su versión de la NASA, la misma imagen OPAL) es blanco algo azulado: 0,94 · 1,01 · 1,07. Es el color que se aplica, porque la revisión pide el medido. El tostado es el de la textura de Solar System Scope (1,16 · 0,96 · 0,88), que la fase 3b dejó de usar porque en los anillos tenues salía morado.
- **El brillo de los anillos respecto al disco** sigue siendo el físico (0,77), no el de la foto (1,44).
  - **Los anillos:** el albedo del B da la reflectividad que midió el Hubble (I/F 0,465 a 6° de fase).
  - **El disco:** con el albedo geométrico de Saturno (0,499) y su limbo (Minnaert 0,85), el centro del disco vale I/F ≈ 0,67.
  - **El cociente** sale, pues, de unos 0,8. La foto de prensa está procesada para lucir: en ella, el anillo B brilla 1,44 veces más que el disco y el A, solo 0,47 veces el B (las medidas dan 0,64).
  - La revisión pide mantener la física, y se mantiene. Si se quiere un realce artístico de los anillos en la vista general, como el relleno ilustrativo de D21, es una decisión de Iván.
- **El anillo A gana poco detalle** (de 0,016 a 0,039 frente a 0,220). En la textura es casi uniforme. El contraste de la foto viene sobre todo de su gradiente hacia fuera y de la división de Encke, y no se inventa.
- **El matiz azulado del anillo C y de la división de Cassini en la escena** (1,54 y 1,99 en azul) viene del fondo azul tinta, que asoma a través de los anillos tenues (cubren un 20–30 %). En la foto, el fondo es negro. Es la transparencia física sobre nuestro fondo.

### Capturas
Antes y después en `docs/informes/img/revision-bloque-R/{antes,despues}/`, con `node scripts/capture-realism.mjs <carpeta> saturno`:
- `saturno-hubble-2019`, con la geometría de la foto;
- `saturno-cassini-2013`, a contraluz: el B sigue oscuro y el C y la división de Cassini, brillantes, ahora con su estructura;
- `saturno-sombra`;
- `escritorio-saturno`.

La foto de referencia solo se enlaza, como en la fase 3b: «[Saturn's Rings Shine in Hubble Portrait](https://science.nasa.gov/resource/saturns-rings-shine-in-hubble-portrait/)» (NASA, ESA, A. Simon y M. H. Wong; `docs/realismo/referencias.md`).

## Comprobaciones
- **`npm run check`**, en verde:
  - lint y Prettier limpios;
  - 453 tests (cobertura de `ephemeris/` del 99,65 %);
  - build sin avisos de presupuesto (JS inicial de 298,00 kB);
  - bundle inicial sin three ni astronomy-engine, con 11,58 kB de código propio.
- **e2e:** 60 de 60 (SwiftShader, 4 trabajadores).
- **`node scripts/build-textures.mjs`:** solo cambia la tira de los anillos (sus tres niveles). Las demás texturas salen con el mismo hash, y la tira se regenera igual (determinista).
- **`node scripts/compare-rings.mjs`:** las cifras de arriba.
