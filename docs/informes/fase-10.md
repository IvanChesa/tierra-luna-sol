# Informe: Fase 10 (pulido y calidad; bloque F)

- **Rama:** `fase-10-pulido` (desde `main` en `0eabe29`), en la carpeta del proyecto. La entrega **10.a** (las lunas recreadas, segunda vuelta, D48) la hace otra sesión en paralelo, en su worktree (`.claude/worktrees/fase-10a-lunas`, rama `fase-10a-lunas`), y esta la junta.
- **Fecha:** 2026-11-09 (en curso)
- **Estado:** en curso: hecha la entrega 10.b (las peticiones de Iván: S8, S9 y S11).

## 0. Plan

Lo que trae la fase: las tareas 1–14 del plan (§6, «Fase 10»), con lo de la revisión del bloque S (`docs/revisiones/bloque-S.md`): S2, S3, S8, S9 y S11, las decisiones 4 (los textos) y 6 (los defectos de la 9c) y las propuestas de la 9b. Se trabaja **por entregas**, cada una con sus commits, sus medidas y este informe al día. El orden lo fija la revisión del bloque S: primero las peticiones de Iván; la regresión visual, al final, después de juntar la 10.a; y las medidas de rendimiento, con el equipo libre (cuando la sesión de la 10.a haya terminado).

| Entrega | Tareas | Qué |
|---|---|---|
| Paso previo, en `main` | Decisión 5 | El PR 4 de Dependabot (seis herramientas, con jsdom 31): el test de las etiquetas que comparaba el `transform` como texto, `@dependabot rebase`, el CI en verde y la fusión; después, `npm ci`. Los documentos, al día (el plan, `PROMPTS.md`, `PENDIENTES.md`, `CLAUDE.md` y el `DIARIO`) |
| **10.b** · Las peticiones de Iván | 8 (S8, S9 y S11) | El Sol sin girar; «‹ Sistema solar», un botón reconocible, y la pestaña «Sistema solar» que vuelve a la vista general; el margen de la nota bajo «Ver en 3D». Capturas antes y después |
| **10.c** · Diseño e interfaz | 8 (S3 y lo demás), 11 | El radar de Venus con el color de las Venera (D49); los defectos que dejó la crítica de la 9c (decisión 6); las propuestas de la 9b (el rótulo de Saturno, la precarga del recorrido y los nombres de España) y de la fase 8 (el cielo con solo sus texturas, el resplandor de día, el Sol rojo junto al horizonte y el encuadre de la sombra a la puesta); la revisión final con `impeccable` y `web-design-guidelines` |
| **10.d** · Accesibilidad y resiliencia | 1, 2 y 3 | Las zonas táctiles (≥ 44 px) y el móvil en todas las vistas; sin WebGL y con el contexto perdido; `prefers-reduced-motion` en todo; axe en todas las rutas, el contraste, el foco, el zoom al 200 % y el lector de pantalla (lo que se puede comprobar desde aquí, con notas) |
| **10.e** · Contenido | 12 (los ceros finales), 13 y 14 | Los decimales de las fuentes (`digits`); la comprobación de los 540 textos por un subagente sin el contexto de la sesión (decisión 4), con S5 y el subtítulo de Shackleton, **después de juntar la 10.a** (que toca los textos de las lunas); el terminador de Titán frente a otra foto de Cassini |
| **10.f** · Rendimiento | 4, 9 y 12 (el código propio inicial) | S2 (la Tierra sin la bola azul lisa), la 8K de la Tierra más barata, el bloom fuera, la frecuencia de pintado según el movimiento, la precarga de la fuente del H1, la hidratación incremental, el Sol de cerca en el móvil (10 fotogramas por segundo en el nivel bajo y un hash entero). **Las medidas (la tabla de §5), con el equipo libre** |
| **10.g** · Lighthouse en el CI | 7 y 12 | `@lhci/cli` con sus tres condiciones (los informes, solo en el disco del CI; contra el build local; con el Chromium de Playwright) y los presupuestos de §5, con la muestra de `scripts/measure-pages.mjs` |
| **Juntar la 10.a** | 0 | Cuando la sesión de revisión haya mirado sus capturas: `--no-ff`, como la 9b, con su nota de entrega en este informe |
| **10.h** · Regresión visual | 6 | `toHaveScreenshot` con `?captura=1` en las vistas clave, con las referencias generadas en el CI (Linux) y el Playwright del PR 4 |
| Cierre | — | `npm run check`, los e2e, el informe completo, la revisión por subagente, sus correcciones, la fusión y el resumen del bloque F en el `DIARIO` |

**Lo que no depende de esta sesión** (no bloquea; `PENDIENTES.md`): el visto bueno de Iván en su móvil y en un iPhone (tarea 5), la lista corta de textos dudosos y la prueba con un lector de pantalla de verdad, si la de aquí no basta.

### 0.1 El reparto con la sesión de la 10.a

Como en la 9b, por archivos (la lista, en la revisión del bloque S): **la 10.a** lleva `scripts/lib/moon-*`, la parte de las lunas de `scripts/build-textures.mjs` y de `scripts/measure-moon-maps.mjs`, `scripts/capture-moon-views.mjs`, las texturas de las lunas en `public/textures/`, `docs/datos/recreacion-lunas.md`, sus capturas (`docs/informes/img/fase-10/lunas-*`) y, de lo compartido (`FUENTES.md`, `/creditos`, las fichas de las lunas y `assets-src/`), solo las filas y los textos de las lunas. **Esta sesión** no los toca. Los puertos: los de por defecto aquí (`CAPTURE_PORT` 4340 y `E2E_PORT` 4391); la 10.a, 4360 y 4411.

## 1. Resumen

(En curso.)

## 2. Criterios de aceptación

(En curso.)

## 3. Tareas del plan

| Tarea | Estado | Notas |
|---|---|---|
| Paso previo: el PR 4 de Dependabot | en curso | El test de las etiquetas, en `main` (`0eabe29`): compara los números del `translate3d`, no el texto (jsdom 31 lo serializa como CSSOM, `translate3d(100px, 200px, 0px)`); comprobado con jsdom 30 (en el proyecto) y con jsdom 31 (en una carpeta aparte). `@dependabot rebase` pedido a las 10:40 UTC |
| Paso previo: los documentos | hecha | En `main` (`fa445ce`): D48 y D49 en §1; `@lhci/cli` en la lista cerrada y en `CLAUDE.md`; el bloque S ✅; la fase 10 con la 10.a, S2, S3, S8, S9, S11, las decisiones 4 y 6 y las propuestas de la 9b; el backlog 15 y 17; la fase 11 con S6 y el panel de rendimiento; `PROMPTS.md` y `PENDIENTES.md` |
| 10.b · S8, el Sol sin girar | hecha | §4.1 |
| 10.b · S9, «‹ Sistema solar» | hecha | §4.2 |
| 10.b · S11, el margen de la nota | hecha | §4.3 |

## 4. Lo hecho, entrega a entrega

### 4.1 S8: el Sol del explorador, sin girar (`21f656f`)

Iván, el 08-11: «El sol está rotando, no debe rotar». El disco giraba con la rotación de la IAU (W = 84,176° + 14,1844°·d): a 3 días/s, unos 42° por segundo, y a 1 h/s, una vuelta en unos 10 minutos; y las manchas derivaban, además, con la rotación diferencial.

- **El disco, con su eje y sin girar sobre él:** `bodyFixedToEclWithoutSpin` (en `ephemeris/orientation.ts`, donde vive toda orientación) da el polo de la IAU del instante con el meridiano 0 quieto en el de J2000 (W₀ = 84,176°). La escena lo usa para el Sol con `VISUAL_CONFIG.sun.spins` en `false`, con su motivo; sin giro, el Sol tampoco tiene giro que «aliasar» (§4.5). Test: el mismo polo que con el giro, el meridiano igual tras 10 días (con el giro, 141,8°) y, en J2000, el de la IAU.
- **Las manchas, quietas:** sin la deriva de la rotación diferencial. Nacen y se apagan con su calendario (la misma fecha, las mismas manchas), en su sitio. La ley de Lößnitz et al. (2025) deja de usarse (queda en git): fuera del código y de `/creditos`; en `FUENTES.md`, «hasta la fase 10».
- **Los rayos del halo** no giraban con el disco: su ángulo es el del polo en pantalla, que no cambia con W.
- **Se queda el fluir lento de la superficie** (con el reloj de pared, como lo aprobó Iván en la segunda vuelta de la 9b.f).
- **Test del motor:** a 3 días/s en la vista general y a 1 h/s de cerca, durante 2 s, el cuaternión del Sol no cambia (a 10⁻¹²) y cada mancha de la misma vida sigue en su sitio; el de la Tierra, sí cambia.
- **Medido** con `scripts/capture-sun-motion.mjs --giro` (nuevo): el Sol de cerca, con movimiento reducido (el fluir y los bucles, quietos: lo que cambie es el giro) y el tiempo en marcha 6 s; la diferencia media en el disco (de 0 a 255):

  | | Antes | Después |
  |---|---|---|
  | 1 h/s | 7,82 | **0,01** |
  | 3 días/s | 18,22 | **0,41** |

  Lo que queda a 3 días/s son las manchas que nacen y se apagan en esos 18 días simulados, en su sitio (capturas `antes-sol-giro-3d-t0/t6` y `despues-sol-giro-3d-t0/t6`): antes, la superficie entera había cambiado de sitio. Fuera del disco, 0,12 en las dos (el fondo).
- **Los textos, al día:** «Lo que es ilustrativo» («No gira sobre su eje, para que se vea quieto (el de verdad da una vuelta en unos 25 días, como dice su ficha)»; la ficha da 609,12 h, de la NSSDCA), `/creditos`, `FUENTES.md` y `revision-textos.md` (regenerado). La ficha del Sol no habla del giro de las manchas.

### 4.2 S9: «‹ Sistema solar», un botón reconocible (`e7d52de`)

Iván, el 08-11, con una captura de escritorio con la Tierra elegida: «Haz más reconocible el botón de volver al sistema solar; recuerda, queremos una interfaz limpia y sencilla». Era un texto pequeño y gris sobre el título (`min-height` de 24 px, sin fondo), que se leía como una miga.

- **El botón, con el lenguaje de «Índice» y «Controles»** (`.control`): el fondo elevado (`--color-surface-raised`), una flecha (un trazo de 1,75 con extremos redondeados, como los iconos de ESTILO §6) y «Sistema solar», en el texto; **44 px de alto también en escritorio**; con el ratón encima, el fondo de `.control:hover`; y con el foco, el anillo de latón de siempre. En la portada, en la Tierra y en la Luna (es la misma clase). Sin controles nuevos.
- **La franja del móvil:** el mismo botón. En el teléfono (por debajo de 480 px), solo la flecha, como en la franja del cielo (la decisión de Iván del 08-11 para el cielo: «‹», su título y el lugar), con el nombre accesible «Volver al sistema solar» y su `title`: con el texto, el nombre del cuerpo no cabía (a 390 px, «Ti…»).
- **La pestaña «Sistema solar», con un cuerpo elegido, vuelve a la vista general** (antes no hacía nada; backlog 15): hace lo mismo que el botón (`ExplorerFocus.back()`: la vista general y el foco en la ficha del cuerpo) y su dirección es la de la vista general sin el cuerpo (abrirla en otra pestaña también vale). Desde la Tierra o la Luna, y sin cuerpo, es el enlace de siempre. Test (`view-switcher.spec.ts`).
- **Capturas** (`scripts/capture-requests.mjs`, nuevo; `antes-` y `despues-volver-*`): a 1280 y 1440, la pantalla y el detalle en reposo, con el ratón encima y con el foco; a 390, la pantalla y la franja.

### 4.3 S11: la nota bajo «Ver en 3D», con aire (`a2b6bf8`)

Iván, el 08-11, con una captura de `/sol`: «Corrige márgenes». La línea del color realzado (el Sol) o del mapa (las lunas recreadas) iba pegada al botón: `.body__note` no tenía margen y esta nota, a diferencia de las demás, va justo después del botón. Ahora, `.body__view + .body__note` lleva `margin-top: var(--space-4)` (16 px), el mismo aire que hay entre el resumen y el botón (el margen de los párrafos). Solo esa nota: las de «Hoy» no cambian. Capturas `antes-` y `despues-nota-sol-*` y `nota-oberon-*`, a 1280 y a 390.

## 5. Desviaciones del plan y motivo

- **S9, en el teléfono, la flecha sola** (el texto, desde 480 px): ver §4.2.

## 6. Salida de los checks

(Al cerrar.)

## 7. Capturas

En `docs/informes/img/fase-10/` (las de la 10.a, `lunas-*`, son de la otra sesión).

## 8. Dependencias añadidas

(Al cerrar: `@lhci/cli`, aprobado.)

## 9. Pendientes y `TODO(ivan)`

(Al cerrar.)

## 10. Propuestas de cambio al plan

(Al cerrar.)

## 11. Cómo probarlo

(Al cerrar.)
