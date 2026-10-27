# Revisión: Bloque R (fases 3b y 3c)

- **Fecha:** 2026-10-27
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:** `main` tras la fusión `a558e72` (+ `3d4e08a`), `docs/informes/fase-3b.md` y `fase-3c.md`, las revisiones automáticas (`fase-3b.md`, `fase-3c.md`, `fase-3c-diseno.md`), el `DIARIO`, las capturas de las dos fases y `data/photometry.ts`
- **Veredicto: APROBADO.** El bloque C se puede lanzar después de aplicar esta revisión.

## Verificación independiente
- `npm run check` en `main` → código 0:
  - lint y Prettier limpios;
  - **450/450 tests** (cobertura de `ephemeris/` del 99,65 %);
  - build con 17 rutas;
  - bundle por módulos ✔ en las 18 páginas;
  - código propio inicial de **11,58 kB de 15**.
- **Capturas de realismo frente a las fotos reales:**
  - **Júpiter:** limbo, color y Vía Láctea detrás, muy convincente;
  - **Marte:** relieve visible en Valles Marineris y halo tenue;
  - **Saturno:** bien con la luz de frente; los anillos, ver R1 y R2;
  - **Tierra:** velo lechoso, ver R3.
- **Interfaz (fase 3c) frente a la referencia que dio Iván** (la barra inferior del original): **misma estructura** (fichas con miniaturas, línea de tiempo del año, velocidad, «Controles +» y pistas) **con el estilo propio «Carta celeste»**, tal como pide D30. El panel «Índice», cerrado al entrar, y el arranque a 3 h/s funcionan como se decidió. Comparación con la referencia: ✅ hecha en esta revisión.
- **Rigor de la fotometría** (`data/photometry.ts`): cada parámetro dice si sale de una ley de fase publicada (ajustada por script y comprobada en tests), de la literatura (Minnaert de Júpiter y Saturno) o de un ajuste visual documentado. Correcto y honesto.

## Valoración
Bloque muy bueno:
- la iluminación por tipo de cuerpo cambia por completo el aspecto;
- relieve real de Mercurio y Marte;
- la Vía Láctea de ESO alineada;
- la interfaz inmersiva es atractiva y accesible (60 e2e con axe y CLS 0 en móvil);
- 60 FPS en los tres niveles.

Todos los hallazgos de las revisiones automáticas están atendidos.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| R1 | **Importante** (se corrige al aplicar esta revisión) | Anillos de Saturno (captura `saturno-hubble-2019`) | Los anillos salen **gris lavanda y con bandas planas**. En la foto del Hubble son de un tostado claro (anillo B), más grises en el A y oscuros en el C, con una estructura radial fina. Al pasar la opacidad y el albedo a la ficha de la NASA, se perdieron el **color** y el **detalle fino** de la textura. | Mantener la profundidad óptica y el albedo de la NASA para la física, y recuperar el **detalle radial fino** de la textura de Solar System Scope como modulación de la luminancia. Aplicar una **cromaticidad medida** (foto del Hubble de 2019, como con los planetas, en `data/photometry.ts` y con fuente). Capturas antes y después junto a la referencia. |
| R2 | **Importante** (fase 7) | Saturno a contraluz (`saturno-cassini-2013`) | A contraluz, el disco es un óvalo marrón opaco. Falta el **anillo de luz del limbo** (dispersión hacia delante en la atmósfera), lo más reconocible de las fotos de Cassini. Estaba en el backlog de la 3b. | Pasarlo del backlog a la **fase 7** (sombras y atmósferas), con criterio: captura con la geometría de Cassini de 2013 y el limbo iluminado. |
| R3 | Menor (fase 5) | Tierra (`tierra-epic-2016`) | Velo atmosférico lechoso y océanos demasiado claros y planos. | En la fase 5, con la propuesta 2 del informe de la 3b (relación de brillo océano/tierra de EPIC, sin contar dos veces la atmósfera) y las nubes. |
| R4 | Menor | Pista de uso | «rueda o pellizca para acercarte» suena cortado. | **«usa la rueda o pellizca para acercarte»** (propuesta de la revisión de diseño, aceptada). |

## Decisiones de Iván (27-10)
1. **Propuestas de la fase 3c** (§10 del informe): **aprobadas**.
   - Pintar a la frecuencia que pide el movimiento → **fase 10**.
   - «Lighthouse móvil, explorador» con `@lhci/cli` desde la fase 10 (si se aprueba la dependencia) y, hasta entonces, con las métricas de §6.2 → **§5**.
   - Regenerar las miniaturas de las lunas y medir su latitud sobre la eclíptica → **fase 7**.
2. **Propuestas de la fase 3b** (§10):
   - la 2 (relación océano/tierra de EPIC) → **fase 5**;
   - la 3 → **backlog**, salvo el anillo de luz del limbo de Saturno, que pasa a la **fase 7** (R2).
3. **Licencia del código propio: MIT.**
   - `LICENSE` con «Copyright (c) 2026 Iván Chesa Lapena».
   - En el README y en `/creditos`, una nota de que las texturas, los datos y los catálogos de terceros conservan sus propias licencias (`docs/FUENTES.md`), en particular el fichero de estrellas (CC BY-SA 4.0).
4. **Primer push autorizado por Iván** a `https://github.com/IvanChesa/tierra-luna-sol` (público), al empezar la fase 4. Antes de subir:
   - comprobar `.gitignore` (`node_modules`, `dist`, `.angular`, `assets-src`, `.claude/skills`, `.codex`, `AGENTS.md` y `.claude/settings.local.json`);
   - comprobar que no hay secretos ni ficheros de más de 50 MB;
   - comprobar que existe `LICENSE`.

   Después: `git remote add origin …`, push de `main` y de las ramas de fase, **sin `--force`**. A partir de ahí, push tras cada fusión (como dice `CLAUDE.md`). Si Git pide credenciales, Iván inicia sesión en la ventana que se abra; nunca se escriben ni se guardan en el repo.
5. **Staging: aún no está en cPanel.** La fase 4 hace todo lo que no depende de él:
   - CI en GitHub en verde, e2e incluidos;
   - `.htaccess`;
   - `deploy-staging.yml` preparado pero inactivo hasta que existan los secrets (que no falle sin ellos);
   - Dependabot;
   - comprobación del `.htaccess` en local si se puede.

   Lo pendiente queda en `PENDIENTES.md` con los pasos para Iván, y **el bloque sigue con la fase 5**.

## Para aplicar esta revisión (Claude Code, en `main`)
1. **R1** (color y detalle de los anillos) y **R4** (pista de uso), con sus tests y capturas.
2. **Plan:** las decisiones de arriba:
   - fase 5: R3;
   - fase 7: R2 y las miniaturas de las lunas;
   - fase 10: el render a la frecuencia del movimiento;
   - §5: la medida de Lighthouse;
   - backlog;
   - licencia MIT (D32);
   - el push autorizado y el staging pendiente.
3. **`LICENSE` (MIT)** y la nota de las licencias de terceros en el README.
4. `npm run check` y e2e en verde, commits y una línea en `DIARIO.md`.
5. Después, **sigue con el bloque C** en la misma sesión. La fase 4 empieza por el primer push autorizado (punto 4 de las decisiones).
