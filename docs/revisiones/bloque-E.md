# Revisión: Bloque E (fases 8 y 9)

- **Fecha:** 2026-11-04
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:**
  - `main` tras la fusión de la fase 9 (`04be17c`) y el resumen del bloque en el `DIARIO` (`2e9c405`);
  - los informes `fase-8.md` y `fase-9.md`, las revisiones automáticas (`fase-8.md`; `fase-9.md`, con sus dos rondas) y sus respuestas;
  - las capturas de las dos fases, staging y los PR de Dependabot;
  - **los 88 nombres de las constelaciones** (D38), que Iván delegó en esta sesión.
- **Veredicto: APROBADO.** El bloque S (fase 9b, `docs/decisiones/FASE-9b-SOL-LUNAS.md`) se puede lanzar al aplicar esta revisión.

## Verificación independiente
- **CI de la rama de la fase 9** (ejecución 41896083050): lint, tests, build, los e2e y la vista previa, en verde. Las métricas del cierre coinciden con el informe:
  - 715 tests unitarios y 105 e2e;
  - JS inicial de 314,23 kB (aviso a 320);
  - código propio inicial de 14,88 kB de 15.
- **El bloqueante de la fase 9** (las notas `#fuente-N` y «Saltar al contenido», que llevaban a la portada por `<base href="/">`): está corregido, con un e2e que pulsa los enlaces, y `check-links.mjs` ya resuelve contra `<base>`. La segunda ronda no dejó bloqueantes.
- **Capturas:**
  - **El cielo del Montsec de noche:** las constelaciones en español con el latín debajo, Saturno y Neptuno con su nombre, el horizonte y los puntos cardinales. Está muy bien.
  - **La ficha de Marte:** limpia, con cada dato y su nota, «Hoy», las curiosidades con su fuente y el pie legal.
  - **La totalidad del 12-08-2026 desde Fraga** (`fase-8/escritorio-cielo-eclipse-fraga-cerca`): ver E1.
- **Los PR 1 y 3 de Dependabot:** CI en verde y fusionables sin conflictos; son versiones de parche (`typescript-eslint` 8.72.1; Angular 22.2.0 → 22.2.4 y la CLI 22.2.5). Ver E5.

## Valoración
Muy buen bloque, con el rigor de siempre:
- el cielo y la tabla salen de la misma función, comprobado con un test;
- las horas cuadran con el USNO a ±2 min, también con la hora canaria;
- los 45 eclipses de 2026 a 2035 coinciden con la NASA, y la sombra del 12-08-2026 cae a 0,2° de su punto;
- las fichas, prerenderizadas y sin cifras sin fuente;
- `/sobre-el-proyecto` funciona como caso de estudio para el portfolio.

La medida del rendimiento, con el ruido del PC explicado y la medida limpia separada, es un buen ejemplo de honestidad en un informe.

**Las 88 constelaciones (D38): correctas.**
- Los nombres son los del Anuario del Real Observatorio de Madrid (IGN), con las tildes y mayúsculas de la RAE.
- En el zodiaco van los usos del mismo Anuario (Géminis, Tauro, Escorpio, Libra, Virgo, Piscis, Aries, Cáncer, Leo).
- Algunos son menos habituales que su variante: Hidra Hembra (Hidra), Raposilla (Zorra), Caballo Menor (Caballito), Dorada (Dorado), Buril (Cincel), Horno Químico (Horno). Se quedan como están, porque son los de la fuente oficial y el script los comprueba en sus PDF.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| E1 | **Importante** (fase 9b, entrega del Sol) | La totalidad en el cielo (`fase-8/escritorio-cielo-eclipse-fraga-cerca`) | **El disco de la Luna tiene el mismo color que el cielo**, como si fuera un agujero, cuando en la totalidad es lo más oscuro de la escena. **El cielo es malva plano** (en la realidad, azul muy oscuro con el resplandor del horizonte alrededor). **La corona es un anillo liso**, sin serpentinas. El eclipse del 12-08-2026 se ve desde España: es el escaparate del proyecto. | En la fase 9b, entrega del Sol, con sus criterios medidos (`FASE-9b-SOL-LUNAS.md`, 9b.c, tarea 6). |
| E2 | **Importante** (decisiones de Iván, 03-11 y 04-11) | El plan | Iván pidió entre el 01-11 y el 03-11, con capturas de staging, cinco mejoras: el Sol, las lunas sin acabar, los sistemas de lunas de la vista general, la Tierra de noche y los mapas de las lunas que faltan; el 04-11, Venus «Bajo las nubes». | La **fase 9b** (bloque S), con D39–D44: `docs/decisiones/FASE-9b-SOL-LUNAS.md`. En el plan: §2 (D39–D44), §6 (el bloque S en lugar de la «fase propia») y la sección de la fase. Los puntos 3 y 12 del backlog y los de la tarea 10 de la fase 10 (Titán, Jápeto y la textura del planeta) pasan a la 9b; el bloom (tarea 9 de la fase 10), también, solo para el Sol. |
| E3 | Menor (ahora) | `CLAUDE.md` | (a) La licencia nueva (D43) no está en la lista. (b) `npm run check` hace también `check-links.mjs` (propuesta 1 de la fase 9). (c) La terminal escribe en inglés sus mensajes de progreso en el chat; los commits y documentos siguen en español. | (a) En «Decisiones ya tomadas», una línea con las licencias aceptadas para imágenes y datos de terceros: CC0, CC BY, MIT, BSD, dominio público y la política de uso de imágenes del JPL (crédito «Courtesy NASA/JPL-Caltech»; D43); nada no comercial. (b) La línea de «Comandos». (c) En «Idioma»: también los mensajes del chat con Iván. |
| E4 | Menor (decisión de Iván) | `/luna` (segunda ronda de la fase 9, sugerencia 24) | Con el menú nuevo, en `/luna` no se marca ningún enlace y las migas dicen «Inicio › Luna». | Recomendado: «Inicio › Lunas › Luna» y «Lunas» marcado en `/luna`, con la misma URL. Si Iván lo aprueba al lanzar el bloque, va en la fase 9b, como una tarea corta al principio. |
| E5 | Menor (Iván, antes de lanzar) | GitHub | Los PR 1 y 3 de Dependabot llevan días abiertos (los de la revisión del bloque D tampoco se fusionaron). | Iván fusiona primero el 3 y, en el 1, comenta `@dependabot rebase`, espera al CI en verde y lo fusiona. Después, la terminal trae `main` antes de crear la rama de la fase 9b. |

## Propuestas de las fases 8 y 9 (§10 de sus informes)
- **Fase 8:**
  - el cielo en tiempo real y los nombres en español: hechos (D33 y D38);
  - pedir en el cielo solo las texturas que usa, que el resplandor de día no sature y encuadrar la sombra de un eclipse a la puesta: **fase 10**.
- **Fase 9:**
  1. `CLAUDE.md`, el `check` con los enlaces: **E3**.
  2. El presupuesto del código propio inicial (14,88 kB de 15): **fase 10**. Primero, la hidratación incremental; subir el presupuesto, solo si no basta, con el OK de Iván.
  3. y 4. Lighthouse en el CI (si Iván aprueba `@lhci/cli`) y la hidratación incremental de las fichas: **fase 10**.
  5. Los ceros finales de las fuentes («5 km/s» por «5,0»): **fase 10**. Es visible en las fichas y el arreglo es pequeño (`digits` en `build-body-data.mjs`).
  6. `/luna` en el menú y en las migas: **E4**.

## Decisiones de Iván (01-11 a 04-11)
- **03-11:**
  - las constelaciones en español, con el latín de la IAU (D38; revisadas aquí);
  - el cielo en tiempo real (D33);
  - el menú con «Cielo»;
  - el Sol, «real y luminoso» (D41);
  - la política de uso del JPL, aceptada como licencia (D43);
  - prioridad de la fase 9b: primero los sistemas de lunas de la vista general.
- **04-11:**
  - Venus «Bajo las nubes» (D44), en la fase 9b;
  - **E4, aprobado:** «Inicio › Lunas › Luna» y «Lunas» marcado en `/luna`, con la misma URL. Va como tarea corta al principio de la fase 9b.
- **Pendiente, sin prisa:** si «Sobre el proyecto» cuenta cómo se ha hecho.

## Para aplicar esta revisión (Claude Code)
1. **En `main`**, después de traer `origin/main` (Iván habrá fusionado los PR de Dependabot, E5):
   - commit de esta revisión y de `docs/decisiones/FASE-9b-SOL-LUNAS.md`;
   - **el plan** según E2: D39–D44 en §2; en §6, el bloque S con la fase 9b (esfuerzo `high`) en lugar de la «fase propia»; la sección «Fase 9b», que resume el documento y lo enlaza; el backlog y la fase 10, al día;
   - **`CLAUDE.md`**, según E3;
   - **`docs/prompts/PROMPTS.md`:** el bloque E ✅ y el bloque S (`fase-9b-sol-lunas`, `high`);
   - **`PENDIENTES.md`:** las constelaciones, revisadas; las decisiones del 03-11 y del 04-11, marcadas; E4, si Iván no lo decidió al lanzar;
   - una línea en el `DIARIO`.
2. **Sigue con el bloque S** (fase 9b) en la misma sesión, por entregas y en el orden del documento (9b.a primero), con el ciclo de siempre. Al terminar el bloque, para.
