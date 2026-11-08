# Fase 9b: el reparto en tres sesiones en paralelo

- **Fecha:** 2026-11-08
- **Decisión de Iván:** tres sesiones a la vez en el bloque S, para ganar tiempo: el Sol, la Tierra y Venus. La preparó la sesión de revisión.
- **Punto de partida:** `fase-9b-sol-lunas` con la 9b.d cerrada (`d5ce7f8`).
- **Manda:** sobre el orden de entregas del plan del informe (9b.f y después 9b.e). Ahora las dos van a la vez, repartidas así. Las tareas y los criterios siguen siendo los de `FASE-9b-SOL-LUNAS.md` (9b.e, D44) y `FASE-9b-ADENDA-D46.md` (9b.f).

## Las tres sesiones

| Sesión | Qué hace | Dónde | Rama | Puertos (`CAPTURE_PORT` / `E2E_PORT`) |
|---|---|---|---|---|
| **A · el Sol (integra)** | 9b.f: tareas 1–5 y lo del Sol de 13–14. Junta B y C. Cierra la fase | Carpeta principal | `fase-9b-sol-lunas` | 4340 / 4391 |
| **B · la Tierra** | 9b.f: tareas 6–12 y lo de la Tierra de 13–15 | Su worktree | `fase-9b-f-tierra` (desde `fase-9b-sol-lunas`) | 4360 / 4411 |
| **C · Venus** | 9b.e: tareas 1–3 (el botón, ver abajo) | Su worktree | `fase-9b-e-venus` (desde `fase-9b-sol-lunas`) | 4370 / 4421 |

La 9c (la interfaz) está parada, sin fusionar, en `fase-9c-interfaz`, con los puertos 4350 / 4401.

## De quién es cada archivo

### Solo de una sesión
- **A:**
  - `scene/materials/sun-material.ts` y `scene/sun-bloom.ts`;
  - el bloque del Sol de `scene/visual-config.ts`;
  - `scripts/capture-sun.mjs`, `scripts/measure-sun.mjs` y `scripts/measure-views.mjs`;
  - el informe de la fase (`docs/informes/fase-9b.md`), `DIARIO.md`, `PENDIENTES.md` y `PLAN.md`.
  
  `/cielo` (`scene/sky/`) no cambia (D46, tarea 5), y A comprueba que sigue igual.
- **B:**
  - la parte de la Tierra de `scene/materials/body-material.ts` y de `scene/materials/atmosphere-material.ts`;
  - el bloque de la Tierra de `scene/visual-config.ts`;
  - `data/tours.ts` (el texto de «La Tierra completa»);
  - `scripts/capture-earth.mjs` y `scripts/measure-earth-epic.mjs` (este, solo como registro: tarea 15).
- **C:**
  - el camino de las texturas: `scripts/build-textures.mjs`, `scripts/download-assets.mjs`, `scene/texture-files.ts`, `scene/texture-meta.ts`, `scene/textures.ts` y `public/textures/`;
  - un módulo propio para la capa de radar (por ejemplo, `scene/venus-radar.ts`, con sus tests);
  - el bloque de Venus de `scene/visual-config.ts`;
  - sus scripts de captura y de sondas.

### Compartidos
Los cambios en estos archivos, pequeños y en su sitio, sin reordenar ni reformatear lo demás. Los conflictos los resuelve A al juntar.
- **`scene/world.ts`, `scene/engine.ts` y sus specs:** solo los enganches imprescindibles.
- **`body-material.ts` y `atmosphere-material.ts`:** son de B. C no los toca. Si la capa de radar necesita algo de ahí, mejor en su módulo; si no hay otra forma, un enganche mínimo, contado en su nota de entrega.
- **Textos y créditos:**
  - `scripts/content/body-texts.json`: cada sesión, solo las entradas de su cuerpo;
  - «Lo que es ilustrativo» de `pages/about/`, `pages/credits/` y `docs/FUENTES.md`: cada sesión añade lo suyo.
  
  Los generados (`data/body-texts.ts`, `docs/revision-textos.md` y `docs/datos/textos-cuerpos.md`) los regenera A después de juntar.
- **Las herramientas de D46 que ya están preparadas** (`scripts/capture-d46.mjs`, `scripts/measure-d46.mjs` y `scripts/lib/disc-metrics.mjs`): las usan A y B. Si B necesita cambiarlas, lo hace en su rama, y A lo junta.
  - Cada sesión toma sus capturas de «antes» del build de partida, con `--solo=`, antes de cambiar nada.

### De nadie hasta que se fusione la 9c
La interfaz: `features/**`, `app.*`, `styles.css` y `pages/home/`. Es de la fase 9c (D47).

## Lo que no está en git
- **`assets-src/` está ignorado**, así que en los worktrees no existe.
  - B copia `assets-src/referencias/` desde la carpeta principal a la suya. Sigue ignorado y solo sirve para medir; no se sube.
  - C crea su `assets-src/` con lo que baje (Magellan, con su SHA-256). Si el build de texturas necesita otras fuentes, las copia de la carpeta principal sin cambiarlas.
- **`node_modules`:** `npm ci` en el worktree, como hizo la 9c.

## El botón de Venus
Va en la interfaz nueva de la 9c.
1. C hace primero los datos y la escena: la capa de radar, el fundido (o el corte, con movimiento reducido), la carga al pedirla y la liberación al salir, el sombreado (tarea 3), la sonda de Maat Mons y una opción de captura.
2. Si para entonces la 9c está fusionada en `main`, y `main` en `fase-9b-sol-lunas`, C trae `fase-9b-sol-lunas` a su rama y pone el botón con su e2e y axe.
3. Si no, para con el enganche listo y explicado en su nota, y el botón se pone después.

## Cómo se trabaja
- **Commits pequeños y frecuentes, y push** (sin `--force`). Así, si el límite de uso corta una sesión, no deja trabajo sin guardar.
- **B y C no tocan el informe de la fase.** Escriben su parte en su nota de entrega: `docs/informes/fase-9b-entrega-tierra.md` y `docs/informes/fase-9b-entrega-venus.md`.
  - La nota lleva el plan, los criterios con sus evidencias, las decisiones, las desviaciones, las capturas y la salida de `npm run check`.
  - Sus capturas llevan un prefijo propio (`tierra-` y `venus-`) en `docs/informes/img/fase-9b/`.
- **Al terminar su parte**, B y C pasan `npm run check`, hacen push y paran sin fusionar, con un mensaje corto en español.
- **A junta cada rama en `fase-9b-sol-lunas` con `--no-ff`:**
  - resuelve los conflictos;
  - regenera los archivos generados;
  - pasa `npm run check`;
  - lleva la nota al informe y la borra.
- **El rendimiento (§5, FPS):** con tres sesiones en el mismo PC, las medidas de las entregas son provisionales. Se repiten al cerrar la fase, con el PC libre.
- **El cierre de la fase** (revisión por subagente, correcciones y fusión en `main`) lo hace A cuando:
  - las tres partes están juntas;
  - la 9c está fusionada;
  - `main` está traído a la rama, junto con lo que pide la sección 12 del informe de la 9c («Para la fusión»).
- **La ventana de 5 horas:** tres sesiones la llenan antes de que se reinicie. Si una se para por el límite, sigue donde estaba cuando se le pida.
