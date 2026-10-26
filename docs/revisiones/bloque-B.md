# Revisión: Bloque B (fases 2 y 3)

- **Fecha:** 2026-10-26
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:** `main` tras la fusión `8fbc389` (+ `ec9993c`), `docs/informes/fase-2.md` y `fase-3.md`, `docs/revisiones/fase-2.md`, `fase-3.md` y `fase-3-diseno.md`, `DIARIO.md` y las capturas de las fases 2 y 3
- **Veredicto: APROBADO.** El bloque R se puede lanzar después de aplicar esta revisión.

## Verificación independiente
- `npm run check` en `main` → código 0: lint y Prettier limpios, **357/357 tests** en 47 ficheros, cobertura del 99,57 %, build con 17 rutas y la comprobación del bundle por módulos ✔ en las 18 páginas.
- **Análisis del JS inicial** (`browser-stats.json`): `main` = Angular (`core` ~195 kB, `router` ~96 kB, `common`, `platform-browser`, `rxjs`) + **solo ~11 kB de código propio** (`app.ts` 6,6 kB, `body-index` 2,5 kB y rutas). El margen frente al aviso de 300 kB (3,68 kB) lo consume el framework, no nuestro código.
- **Capturas** de escritorio, ficha y móvil revisadas. La interfaz funciona y es coherente con la dirección A. Los problemas visuales que quedan son los que motivan las fases 3b y 3c (abajo).
- **Proceso:** cuatro sesiones (tres cortadas por el límite de uso) retomadas sin pérdidas gracias al informe vivo y al `DIARIO`. El incidente de los e2e contra los servidores de Astro de otra sesión está bien resuelto: servidor en 127.0.0.1, puertos propios y sin reutilizar servidores.

## Valoración
Bloque sólido:
- motor sin Angular con la lógica testada sin WebGL;
- orientación IAU a ≤ 0,005° de Horizons;
- tres marcos con origen flotante;
- sombras analíticas en los dos sentidos;
- VRAM de 27/67/107 MB;
- 0 frames en reposo;
- LCP de 164 ms;
- interfaz accesible (árbol WAI-ARIA, atajos desactivables por WCAG 2.1.4, foco y movimiento reducido) con 45 e2e y axe.

Los revisores por fase pidieron cambios (sin bloqueantes) y están todos atendidos.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| B1 | **Importante** | Escena (capturas de Saturno y Júpiter) | Las órbitas se dibujan **sobre el disco** de los planetas. | Fase 3b, tarea 8 (ya prevista). |
| B2 | **Importante** | Vista Tierra (captura de la fase 3) | La Tierra se ve de un **azul uniforme y saturado**: posible fallo de espacio de color, exposición o mezcla de la textura de día. | Fase 3b, tarea 9 (ya prevista). |
| B3 | **Importante** | `body-material.ts` | Sombreado de Lambert + ambiente plano: los planetas parecen de plástico (petición de Iván). | Fase 3b completa (D29). |
| B4 | **Importante** | `angular.json`, `check-initial-bundle.mjs` | El presupuesto inicial de 300 kB está al límite por el crecimiento de Angular, no por el código propio. | Decisión de Iván: aviso general a **320 kB** (error a 400) + comprobación nueva en `check-initial-bundle.mjs`: el **código propio** (`src/`) de los chunks iniciales ≤ **15 kB**, medido en `browser-stats.json`. |
| B5 | Menor | Interfaz del explorador | La barra lateral fija resta mucho lienzo, y en móvil el texto de la vista ocupa media pantalla. | Fase 3c (interfaz inmersiva, panel «Índice» desplegable y texto de presentación plegable). La duda del texto en los móviles bajos se resuelve ahí: se muestra solo el H1 compacto y la descripción se pliega. |
| B6 | Menor | `.codex/`, `AGENTS.md` | Ficheros locales de otra herramienta (Codex) sin versionar en la raíz. | Añadirlos a `.gitignore` (son configuración local; `AGENTS.md` es una copia de `CLAUDE.md` que se desfasaría). |

## Decisiones de Iván (26-10)
1. **Propuestas de cambio al plan de la fase 2** (§10 del informe): **aprobadas las 4**, con la redacción del informe:
   - sistema local físico (§4.4);
   - D13: profundidad logarítmica;
   - D18: KTX2 descartado por ahora y reevaluado en la fase 6 para la Luna en 8K;
   - §5: las efemérides por frame incluyen las orientaciones.
2. **Propuesta de la fase 3:** **aprobada**. Los atajos de una sola tecla se pueden desactivar (WCAG 2.1.4).
3. **Vía Láctea:** **panorama de ESO/S. Brunier** (CC BY 4.0, a comprobar en su página), alineado con el cielo real. Va en la fase 3b (tarea 5b).
4. **H1 de la vista del sistema solar:** **«El sistema solar»** (en paralelo a «La Tierra» y «La Luna»).
5. **Presupuesto del JS inicial:** el de B4.
6. **Planetas más realistas:** fase nueva **3b** (`docs/decisiones/FASE-3b-REALISMO.md`).
7. **Interfaz inmersiva del sistema solar:** fase nueva **3c** (`docs/decisiones/FASE-3c-INTERFAZ.md`):
   - fichas de cuerpos con miniaturas;
   - barra de tiempo con línea deslizante;
   - «Controles +»;
   - la barra lateral pasa a ser un panel «Índice» desplegable, cerrado al entrar;
   - el sistema arranca reproduciendo a **3 días/s**, salvo con movimiento reducido o con `?fecha=`.
8. **«El cielo desde España»** en lugar de «El cielo desde el Bajo Cinca» (`docs/decisiones/CAMBIO-CIELO-ESPANA.md`): selector con el **Montsec por defecto**, Observatori Fabra (Barcelona), Roque de los Muchachos, Teide, Calar Alto, Madrid y Fraga, más «usar mi ubicación», en la ruta `/cielo` y con la zona horaria de cada lugar. La vista guiada de la Tierra pasa a «España».

## Para aplicar esta revisión (Claude Code, en `main`)
1. **Plan:**
   - integrar en `docs/PLAN.md` las fases **3b** y **3c** (secciones completas, a partir de los documentos de `docs/decisiones/`) y el cambio del cielo (§0.2, §2 Rutas, §4.3 zona horaria por lugar, fase 5 «España», fase 8);
   - añadir D29, D30 y D31;
   - aplicar las propuestas aprobadas de las fases 2 y 3 (§4.4, D13, D18, §5, fase 3).
   - **Bloques:** A ✅ · B ✅ · **R (3b–3c)** · C (4–5) · D (6–7) · E (8–9) · F (10) · 11. Actualizar `docs/prompts/PROMPTS.md` con el bloque R (ramas `fase-3b-realismo` y `fase-3c-interfaz`; esfuerzo `max`).
2. **`CLAUDE.md`, «Decisiones ya tomadas»:** «España» en vez de «España / Bajo Cinca» en las vistas guiadas; el cielo desde España con el Montsec por defecto; arranque a 3 días/s.
3. **`docs/PENDIENTES.md` y `docs/FUENTES.md`:**
   - marcar como resueltas las decisiones de arriba (propuestas de las fases 2 y 3, Vía Láctea, H1 y texto de los móviles bajos → fase 3c);
   - añadir a `FUENTES.md` las candidatas nuevas: el panorama de ESO; MESSENGER y MOLA del USGS; los mosaicos de Viking y MESSENGER; Hubble OPAL y Cassini, todas «a comprobar».
4. **Código:**
   - H1 «El sistema solar» (`src/app/pages/home/home-page.ts`, con sus tests y e2e);
   - presupuesto de B4 (`angular.json` + comprobación del código propio en `check-initial-bundle.mjs`, demostrada con un fallo provocado y revertido);
   - `.codex/` y `AGENTS.md` en `.gitignore` (B6).
5. `npm run check` y e2e en verde, commit `docs: plan con las fases 3b y 3c, el cielo desde España y las decisiones del bloque B` (más los commits de código que hagan falta) y una línea en `DIARIO.md`. Después, **sigue con el bloque R** en la misma sesión.

## Antes del bloque C (pasos de Iván)
- Conectar el repo local con `https://github.com/IvanChesa/tierra-luna-sol` (público) y hacer el primer push. **Iván lo hace o lo autoriza explícitamente**, porque publica el código.
- Staging en cPanel: subdominio protegido, cuenta FTP y secrets (`docs/PENDIENTES.md`).
