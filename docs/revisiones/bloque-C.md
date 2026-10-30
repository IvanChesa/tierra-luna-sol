# Revisión: Bloque C (fases 4, 4b y 5)

- **Fecha:** 2026-10-30
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:**
  - `main` tras la fusión `5d9a5a2` (+ `9862efa` y `2216809`);
  - los informes `fase-4.md`, `fase-4b.md` y `fase-5.md` y las revisiones automáticas de las tres fases;
  - el resumen del bloque en el `DIARIO`;
  - las capturas de las fases 4b y 5;
  - staging, los dos PR de Dependabot y `.github/dependabot.yml`.
- **Veredicto: APROBADO.** El bloque D se puede lanzar después de aplicar esta revisión.

## Verificación independiente
- **`npm run check` en `main` → código 0:**
  - lint y Prettier limpios;
  - **514/514 tests** (cobertura de `ephemeris/` del 99,5 %);
  - build;
  - el JS inicial de las 17 páginas sin `three`, `astronomy-engine`, stores ni controles del visor;
  - JS inicial de **298,23 kB** (aviso a 320);
  - código propio inicial de **12,13 kB de 15**.
- **Staging (https://staging.tierra-luna-sol.pages.dev):**
  - `/`, `/explorar/tierra`, `/planetas/neptuno`, `/luna` y `/creditos` responden 200;
  - CSP con hashes y `x-robots-tag: noindex`;
  - `Report-To` y `NEL` hacia `a.nel.cloudflare.com`, con `success_fraction: 0.0` (solo se informa de las peticiones que fallan): ver C8;
  - `tierra-luna-sol.pages.dev` da 404, como se espera hasta la fase 11.
- **Dependabot:** los PR 1 y 2 tienen el CI en verde (lint, tests, build y e2e), pero están hechos sobre el `main` del 27-10.
- **Capturas:**
  - **La Tierra frente a EPIC** (`tierra-epic-2016-comparada`): el reparto de nubes, el océano y el desierto se parecen mucho a la foto; R3 está resuelto y medido (océano / desierto 0,189 frente a 0,178).
  - **Vista general:** la Tierra ya no se ve oscura (`fase-5/escritorio-sistema`) y las estelas de color se leen bien (fase 4b).
  - **«España»:** encuadra la Península y Canarias, con los siete marcadores, en escritorio y en móvil.
  - **«El Himalaya»:** las nubes tapan la cordillera; ver C1.

## Valoración
Muy buen bloque:
- un despliegue continuo serio: vista previa por rama, verificación en el propio CI, CSP con hashes y acciones fijadas por SHA;
- la vista general responde a lo que pidió Iván (D33 y D34) sin coste (21 llamadas de dibujo);
- una Tierra calibrada con fotos reales, con la sombra del eclipse a 2,7 km del punto de la NASA.

Las revisiones automáticas cazaron fallos reales que no se veían en las capturas, y todos se corrigieron:
- el relieve con el norte y el sur cambiados;
- la VRAM que no contaba los mapas de la Tierra;
- el reloj como región viva;
- la fecha que cambiaban las vistas guiadas;
- «España» en el móvil;
- la aberración del Sol.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| C1 | **Importante** (ahora) | Vista guiada «El Himalaya» (`vista-himalaya`) | Las nubes de la textura tapan casi toda la cordillera, que es justo lo que enseña la vista. Con las nubes calibradas con EPIC, se nota más (propuesta 1 de la fase 5). | **Atenuar las nubes en los primeros planos** según la distancia de la cámara, como Google Earth: opacidad completa con el disco entero a la vista (las comparativas con EPIC y la medida de R3 no cambian) y bajándola suavemente al acercarse; su sombra, igual. Test de la curva y capturas antes y después de «El Himalaya» y «España», en escritorio y móvil. Si con la atenuación aún se tapa la cordillera, añadir una deriva inicial ilustrativa por vista guiada (la otra opción de la propuesta). |
| C2 | **Importante** (ahora, decisión de Iván) | Vista general (`ephemeris/scale.ts`, `scene/illustrative-layout.spec.ts`) | Iván quiere los planetas **un poco más grandes** (Júpiter mide ~15 px en escritorio y ~30 en la referencia). Hoy el tamaño lo limitan unas pocas conjunciones en 200 años. | **Un ~25 % más grandes** (`radiusFactor` de 0,084 a ~0,105; Júpiter, ~19 px en escritorio), **sin solapes**: cuando dos cuerpos se acercan más que sus radios más el margen, solo esos dos encogen suavemente y recuperan el tamaño al separarse (a 3 días/s, el cambio dura decenas de segundos y apenas se percibe). Es una función pura con test, y el muestreo de 1900–2100 sigue sin solapes con los tamaños efectivos. El Sol sigue siendo el mayor. Etiquetas, estelas y pósters, al día. Se apunta como decisión en el plan (ampliando la de los radios ilustrativos). |
| C3 | **Importante** (ahora, decisión de Iván) | Vista general en el móvil (informe de la 4b, §10.2) | En vertical, los rocosos miden 1–2 px y se ven como marcadores. | **Opción b: un diámetro mínimo en pantalla de ~4 px** para los planetas, solo en la vista general. No cambia ni posiciones ni órbitas, y casi nunca actúa en escritorio. Comprobar los solapes también con el tamaño efectivo en un móvil de 390 px. Capturas en móvil antes y después. |
| C4 | **Importante** (plan, fase 6) | VRAM de la vista Tierra: 278 MB de 300 (93 %) | La fase 6 añade la Luna en detalle (LROC y LOLA). En la vista Tierra se ve la Luna, y en la vista Luna, la Tierra: con el margen actual, el peor caso de la fase 6 puede pasarse de §5. | En la fase 6: (1) los mapas de alta resolución de un cuerpo solo se quedan en la GPU mientras es el foco o se ve grande, y la 8K de la Tierra se libera al salir de su vista (comprobarlo con test, igual que `BodyMap`); (2) el test del presupuesto mira **las dos vistas** como peor caso, la Tierra con la Luna y la Luna con la Tierra; (3) la reevaluación de KTX2 (D18) empieza por la 8K de la Tierra y los mapas de la Luna, que es donde más VRAM se gana. |
| C5 | Menor (ahora) | `e2e/accesibilidad.spec.ts:83`, `privacidad.spec.ts:35` y `publicacion.spec.ts:107` y `:110` | Las cuatro esperas usan `waitForLoadState('networkidle')`, que Playwright desaconseja. Es el origen del fallo intermitente de la fase 4b (los 120 s en `/planetas/neptuno`). | Esperar a algo concreto: el `h1` visible, `document.fonts.ready` y, en el explorador, su estado de listo. Donde haga falta asegurar que no quedan peticiones (privacidad), escuchar las peticiones durante un tiempo fijo y comprobar la lista. |
| C6 | Menor (ahora) | Dependabot (PR 1 y 2) | El PR 2 sube `@types/node` a la 26, pero el proyecto usa Node 24 (`.nvmrc`; `engines` admite 22 y ≥ 24). El PR 1 (`typescript-eslint` 8.72.0) está bien. | PR 1: `@dependabot rebase` y, con el CI en verde, fusionarlo. PR 2: cerrarlo con un comentario y añadir a `dependabot.yml` un `ignore` de las versiones mayores de `@types/node` (va con la versión de Node del proyecto). Iván lo autoriza con esta revisión. |
| C7 | Menor (Iván) | Panel de la Tierra en el móvil | Ocupa algo más de un tercio de la pantalla. | Se decide cuando Iván lo pruebe en su móvil. Si molesta, la opción natural es plegar «Luz del Sol» en el móvil (fase 10). |
| C8 | Sugerencia (fases 9 y 11, decisión de Iván) | NEL de Cloudflare (D24) | Chrome y Edge envían a `a.nel.cloudflare.com` un informe de cada petición que falla. | **Se acepta como telemetría del alojamiento y se explica:** es el propio hosting, que ya sirve cada petición, y solo informa de fallos. En la fase 9, una frase en el texto de privacidad. En la fase 11, con el dominio propio, mirar si la zona permite desactivarlo. `verify-pages` lo sigue marcando como aviso, no como error. |

## Decisiones de Iván (30-10)
1. **Las nubes del Himalaya:** se arreglan **ahora** (C1), atenuándolas en los primeros planos.
2. **La vista general en el móvil:** **tamaño mínimo en pantalla** (C3, opción b de la 4b).
3. **Planetas más grandes:** primero eligió mantener el tamaño sin solapes y, a continuación, pidió **«un poco más grandes»**: se hace con C2, sin solapes.
4. **NEL:** **aceptarlo y explicarlo** (C8).

## Conclusiones de la revisión sobre lo que el `DIARIO` dejó para Iván
- **D33, de un cuerpo a otro:** se conserva la velocidad elegida a mano. Es lo que dice D33: el contexto «cuerpo enfocado» no cambia. Correcto.
- **Propuesta 2 de la fase 5 (la 8K, más barata):** recomendada, en la **fase 10**.
- **La altitud del Montsec y de la Puerta del Sol:** sigue en `null` hasta la fase 8. Allí se busca en una fuente oficial (IGN o la web de cada observatorio), nunca estimada.

## Para aplicar esta revisión (Claude Code)
1. **En la rama `revision-bloque-c`**, desde `main`, con el ciclo de siempre: plan, commits pequeños, informe en `docs/informes/revision-bloque-C.md` (antes y después, con capturas en `docs/informes/img/revision-bloque-c/`), revisión por subagente, correcciones y fusión con `--no-ff`. Al subir la rama, su vista previa permite a Iván verlo antes de fusionar.
2. **C1, C2, C3 y C5**, con sus tests y capturas de escritorio y móvil. Mediciones de FPS, VRAM y llamadas de dibujo de la vista general y de la vista Tierra.
3. **C6** en GitHub, tal como dice la tabla.
4. **Plan:**
   - C4 → fase 6 (tareas y criterio del presupuesto con las dos vistas);
   - C8 → fases 9 y 11;
   - la 8K más barata → fase 10;
   - la decisión de los tamaños de C2 y C3.

   Actualizar también `PENDIENTES.md` (lo decidido, marcado; C7 sigue para Iván) y `PROMPTS.md` (bloques R y C ✅).
5. `npm run check` y e2e en verde, y una línea en `DIARIO.md`.
6. Después, **sigue con el bloque D** en la misma sesión.
