# Revisión: Bloque S (fase 9b)

- **Fecha:** 2026-11-08
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:**
  - `main` tras la fusión de la fase 9b (`32933c9`) y el resumen del bloque en el `DIARIO` (`e84d469`). La fase 9c (`3ce0905`) ya estaba en `main` y se revisó aparte (`fase-9c.md` y `fase-9c-critica.md`, 33/40): aquí solo se mira cómo ha quedado junto a la 9b;
  - el informe `fase-9b.md`, su revisión automática (`docs/revisiones/fase-9b.md`) y su respuesta;
  - las capturas de la fase, sobre todo las seis vistas de las lunas recreadas y la rejilla;
  - la vista previa de la rama (`fase-9b-sol-lunas.tierra-luna-sol.pages.dev`, `1b28193`, con las mismas texturas y la misma escena que `main`), en escritorio y en el móvil (375 × 812);
  - los PR 1 y 3 de Dependabot;
  - **las decisiones que Iván tenía pendientes**, que delegó en esta sesión el 08-11: «decide tú autónomamente lo que sería más recomendable para el proyecto».
- **Veredicto: CAMBIOS NECESARIOS, sin Bloqueantes.** La fase está bien hecha y bien medida, salvo las lunas recreadas de Urano (S1), que no cumplen los criterios visuales de D45. Se corrigen al principio del bloque F, en una entrega propia (10.a), antes de las referencias de la regresión visual. **El bloque F se puede lanzar al aplicar esta revisión.**

## Verificación independiente
- **Las ramas, en `main`:** las tres del reparto en paralelo (Venus, `226ab0f`; el Sol de la segunda vuelta, `726a880`; la Tierra, `582e440`) y la de la fase son antepasadas de `main` (`git merge-base --is-ancestor`).
- **El CI de `main`** (`e84d469`, ejecución 42515749376), **en verde:** lint, tests y build, los e2e y el despliegue a staging.
- **Las métricas** del resumen del bloque coinciden con las de la revisión de la fase, que las repitió:
  - 808 tests unitarios y 138 e2e (y 1 que se salta);
  - el JS inicial, 315,27 kB (aviso a 320), con 13,81 kB de código propio de 15; three, 813,58 kB;
  - las 15 vistas, a 59–60 FPS de mínimo en los tres niveles, y la VRAM más alta, 278 MB de 300.
- **El código:**
  - sin `console.log` ni `debugger`;
  - un solo `TODO(ivan)`, el del dominio (S6);
  - el bloom apagado sigue importado de forma estática (`renderer.ts:19`; S4).
- **En la vista previa:**
  - **El Sol de cerca:** naranja, con la superficie que fluye y los bucles finos del limbo, como el que aprobó Iván.
  - **La Tierra:** realzada, como se midió. Pero al entrar en `/explorar/tierra` se ve unos segundos como una bola azul lisa (S2).
  - **Venus «Bajo las nubes»:** en escritorio y en el móvil (con «ⓘ», en la hoja de media pantalla), el botón y su aviso. En gris parece la Luna (S3).
  - **La interfaz de la 9c junto a la 9b:** en el móvil, la franja de arriba, la fila de lunas al elegir un planeta y la ficha con «ⓘ», como se aprobó.
  - **Oberón, Titania y Miranda de cerca:** ver S1.

## Valoración
Un bloque grande: 471 ficheros, seis entregas, cuatro sesiones en paralelo y una segunda vuelta del Sol. Está hecho con el rigor de siempre:
- el Sol y la Tierra realzados se miden en CIELAB frente a la referencia, y la Tierra de noche, frente a su criterio (L\* 0,2 · C\* 0,2);
- las formas de Fobos y Deimos salen de los DSK del NAIF, con sus semiejes a menos de 0,5 km de los publicados;
- el radar de Venus pide su textura al pulsar el botón y la suelta al salir, y se usa con el teclado;
- los e2e que fallaban a ratos en el CI se arreglaron en su causa (seis causas; la principal, el `@defer (on idle)` sin tope), y el CI quedó en 137 de 137 sin reintentos;
- el reparto en paralelo (los archivos por sesión, los puertos por entorno y las notas de entrega) funcionó sin conflictos.

La revisión de la fase hizo bien su trabajo: vio el cambio de criterio de D45 y los pósters desfasados. Lo que se le escapó es visual.
- El informe dio por cumplido el criterio de las seis vistas «con tres notas». Pero esas notas describen costuras: «la recta de la longitud 180°» y «las sombras negras del terminador».
- La revisión de la fase solo miró las seis vistas de Tritón y la rejilla.

**La lección para el bloque F:**
- un criterio visual se comprueba en cada caso afectado, en las capturas y en el explorador;
- lo que es una excepción se marca con ⚠️, no con ✅.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| S1 | **Importante** | Las texturas de Oberón, Titania, Miranda y Tritón; `scripts/lib/moon-recreate.mjs`, `moon-recipes.mjs` y `moon-map-build.mjs`; `docs/informes/img/fase-9b/d45-*-seis-vistas-despues.webp` | **Las lunas recreadas de Urano no cumplen los criterios visuales de D45:** ni costuras ni manchas. En las seis vistas: (a) en Oberón, Titania y Miranda, una banda oscura con manchas negras recorre todo el borde entre lo real y lo recreado: son las sombras del terminador de las imágenes de la Voyager, que D45 no dejaba tocar; (b) en Miranda y en Titania, la recta de la longitud 180°, una unión del mosaico; (c) el norte recreado de Oberón (el 66,5 % de la luna) es una mancha de camuflaje de alto contraste, sin forma de cráteres, y el de Titania, parecido pero más suave; (d) el norte de Miranda, plano; (e) el casquete recreado de Tritón, con un borde poligonal. En el explorador, con la fecha de hoy, Oberón de cerca es esa mancha: desde el equinoccio de Urano de 2007, el Sol ilumina sobre todo el norte de sus lunas, el que no vio la Voyager, así que **lo recreado es lo que más se ve**. El grano cumple porque solo mide el paso alto, y el criterio del borde se había cambiado (revisión de la fase 9b, hallazgo 1). | **Entrega 10.a, «las lunas recreadas, segunda vuelta», con D48** (abajo): en su propia sesión y antes de las referencias de la regresión visual (fase 10, tarea 6). |
| S2 | Importante (fase 10) | `/explorar/tierra`; la carga de texturas de la escena | **La Tierra entra como una bola azul lisa.** En la vista previa, a los 9 s de entrar seguía así, y a los 17 s ya tenía su mapa. Mientras llegan las texturas de la vista Tierra, la escena pinta el color esquemático, aunque la de día de 1k ya se pidió en la vista general. Es lo primero que se ve de la vista estrella. | Fase 10, tarea 4 (la textura de día de 8K, más barata): mientras llega la grande, la que ya está en memoria. Medido con la red móvil de §5, con capturas a los 2, 5 y 10 s. |
| S3 | Menor (fase 10) | `VISUAL_CONFIG` del radar; `venus-escritorio-radar.webp` y `venus-movil-radar.webp` | **El radar de Venus, en gris, parece la Luna**, en escritorio y en el móvil. | El color de las fotos de las Venera 13 y 14 (D49, abajo). |
| S4 | Menor (fase 10) | §10 del informe de la fase 9b | Las propuestas de la fase, sin sitio en el plan. | En la fase 10 (abajo, «Propuestas de la fase 9b»). |
| S5 | Menor (fase 10) | `scripts/build-text-review.mjs:110`; `docs/revision-textos.md:15` | El índice de la revisión de textos dice «en 0 lunas, la línea sobre su mapa». Filtra por `kind`, que `body-texts.json` no tiene. Las líneas sí están en la lista. | Contar las lunas sin `kind` (o añadirlo) y regenerar, con la comprobación de los textos (decisión 6). |
| S6 | Menor (antes de la fase 11) | `src/app/core/site.config.ts:48`; el pie | **ivanchesa.com sigue sin existir** (NXDOMAIN el 08-11). Los enlaces del pie (el aviso legal, la privacidad y el autor) llevan a un dominio que no resuelve, y el subdominio de la fase 11 (`tierra-luna-sol.ivanchesa.com`) necesita su zona. En ivanchesa.es, las dos páginas legales responden (200). | Se queda ivanchesa.com (D37). La fase 11 empieza cuando el dominio exista (lo lleva la sesión de ivanchesa.com). Si para entonces no tiene las páginas legales, los enlaces pasan provisionalmente a las de ivanchesa.es. |
| S7 | Menor (ahora) | El plan, `PROMPTS.md`, `PENDIENTES.md` y `CLAUDE.md` | El bloque S, sin cerrar en los documentos, y las decisiones de abajo, sin apuntar. | «Para aplicar esta revisión», abajo. |

## Decisiones que Iván delegó (08-11)
Iván dejó en esta sesión lo que tenía pendiente de decidir. Esto es lo que decido, y por qué.

### 1. Las lunas recreadas, segunda vuelta (D48, que completa D45)
El borde se mide con los dos criterios, porque miden cosas distintas. Y lo real con luz rasante deja de estar protegido, porque no es la luna, sino la luz de 1986.
- **La costura fina: se acepta el criterio relativo.** El salto a la escala fina (σ = 4 texeles) puede quedar, como mucho, 2 L\* por encima de lo natural. A esa escala, el relieve ya salta de 2,4 a 9,8, y un umbral absoluto solo lo pasaría un terreno liso.
- **El brillo medio: además, el absoluto de la adenda.**
  - ΔL\* ≤ 2 en el percentil 95, a una escala de varios grados: la fija y la justifica la terminal, como aquella en la que lo natural queda por debajo de 2. Es «la misma media» de la regla 4 de D45.
  - Cada borde, con su número de teselas: hoy, el p95 de Titania y el de Dione son su máximo (una sola tesela).
- **Lo real con luz rasante:**
  - Qué es: la franja de lo real fotografiada junto al terminador de la Voyager (las sombras negras junto a lo no visto) y las uniones rectas del mosaico (la longitud 180° de Miranda y de Titania). No es albedo, sino la luz con que se hizo la foto.
  - Pasa a una clase propia de la máscara, «real con luz rasante», con su porcentaje.
  - Su brillo a gran escala se lleva al de lo real vecino, y sus sombras se funden en la transición hacia lo recreado.
  - El resto de lo real sigue igual byte a byte, con sus sondas y su test.
- **Lo recreado, con forma del terreno de esa luna, sin manchas de ruido:**
  - cráteres con la población y el albedo de su hemisferio real: rayos claros y fondos oscuros en Oberón y Titania, y coronas y cráteres en Miranda;
  - su contraste a gran escala (la σ del paso bajo de L\*), del 70 al 130 % del de lo real, además del grano.
- **Comprobado a la vista:**
  - las seis vistas y la luna de cerca en el explorador, con la fecha de hoy (el norte iluminado), de las cinco de Urano y de Tritón, antes y después, y la rejilla;
  - el borde del casquete de Tritón, irregular, como el del sur real;
  - las demás lunas no se tocan si sus seis vistas no muestran lo mismo: la terminal las mira todas y lo dice;
  - la sesión de revisión mira las capturas antes de juntar la entrega.
- **En la misma pasada,** si se regeneran las texturas: la máscara de cobertura umbralizada antes de reducir, como la del radar de Venus (propuesta de la 9b.e).
- **Lo de siempre:**
  - por script, determinista y sin dependencias nuevas;
  - las licencias de D45;
  - los porcentajes, en el informe, en `FUENTES.md` y en `/creditos`;
  - §5 sin cambios.

### 2. El radar de Venus, con el color de las fotos de las Venera 13 y 14 (D49)
- **Por qué:**
  - es lo que hace la NASA en su globo de Magellan (PIA00104, la vista global centrada en 180° E): según su pie, los tonos simulados se basan en las fotos en color de las Venera 13 y 14 (https://science.nasa.gov/photojournal/venus-computer-simulated-global-view-centered-at-180-degrees-east-longitude/);
  - las Venera son las únicas fotos hechas bajo las nubes, que es lo que promete el botón;
  - en gris, Venus se confunde con la Luna.
- **El aviso** sigue y dice también el color: «Imagen de radar de la sonda Magellan, con el color de las fotos de las Venera 13 y 14: no es lo que verían tus ojos».
- **Dónde va:** un valor de `VISUAL_CONFIG` con su fuente, y lo mismo en «Lo que es ilustrativo» y en `/creditos`.

### 3. Lo demás de las lunas
- **La línea sobre el mapa en las fichas de las doce lunas vistas de lejos: se queda.** D45 la pide en cada luna afectada (regla 6), y su enlace a «Cómo se recrea» sirve de fuente.
- **Miranda, en gris neutro.** Sin un B−V publicado, no se inventa. Cerrado.
- **Proteo, como esfera en la v1, y Pharos, sin posición.** El zip de Stooke queda como opcional para Iván: si lo deja en `assets-src/shapes/`, se usa en el siguiente build. Cerrado.

### 4. Los textos (540): una comprobación independiente en la fase 10
- **Quién y contra qué:** un subagente sin el contexto de la sesión compara cada texto con su fuente (las citas de `docs/datos/textos-cuerpos.md` y la URL) y con `docs/ESTILO.md`.
- **Qué hace con lo que encuentra:**
  - corrige en su origen lo que esté claramente mal;
  - lo dudoso lo deja en una lista corta, `docs/revisiones/textos.md`, para Iván (no bloquea). Cuando Iván dé el OK a esa lista, todos los textos pasan a `reviewed: true`.
- **También va aquí** el matiz del subtítulo de Shackleton (`PENDIENTES.md`).

### 5. GitHub y dependencias
- **Los PR 1 y 3 de Dependabot:** los fusiona esta sesión el 08-11, con el CI de `main` en verde. Primero el 3 y luego el 1, cada uno con `@dependabot rebase` y su CI en verde. Son versiones de parche.
- **`@lhci/cli`: aprobado** para la tarea 7 de la fase 10, como dependencia de desarrollo, con tres condiciones:
  - los informes, solo en el disco del CI (nunca `temporary-public-storage`, que los sube a un tercero);
  - contra el build local;
  - con el Chromium de Playwright.

  Pasa a la lista cerrada.

### 6. La interfaz
- **El año en la barra del teléfono: no.** Ya está en la fecha de la barra («8 nov 2026, 20:52») y en «Controles»; dos filas restarían zona útil. Cerrado.
- **De lo que dejó la crítica de la 9c (backlog 15), los defectos van a la fase 10, tarea 8:**
  - al volver de «Ficha completa», la fecha vuelve a hoy;
  - en la vista Tierra del móvil, «España» queda cortada;
  - en la tableta, la ficha deja vacía la mitad derecha y la fila de lunas no se alinea con la de planetas;
  - «Cara visible» cambia la fecha y pausa sin avisar;
  - el campo de la fecha acepta 2150 y avisa lejos del campo;
  - el Índice del móvil tapa la barra;
  - en el móvil, la presentación muestra «Saturno» cuatro veces y se pliega al primer Tab;
  - falta contexto en «Escala», «Luz rasante» y «UA»;
  - en `/eclipses`, el aviso de no mirar el Sol sin filtro no destaca, y la fecha va apretada en el título;
  - en `/lunas`, el cuadrado oscuro de las miniaturas y los decimales dispares;
  - en `/planetas/marte`, las lunas son enlaces de texto, y a 1440 px queda un hueco a la derecha;
  - el 404 es seco.
- **Sigue en el backlog** lo demás: el recorrido como primera lección, las fechas con historia, el cielo de día y la Luna nueva como momentos, y la composición de «atlas».

### 7. Lo de antes que seguía abierto
- **La luz de la umbra se queda como está:** rojiza y visible, como en las fotos de un eclipse, ilustrativa y dicha.
- **Los anillos a contraluz siguen en el backlog** (14). Cerrado.

**No lo decido yo,** porque es de Iván y no del proyecto:
- si «Sobre el proyecto» cuenta que se ha hecho con Claude Code (opcional, sin prisa);
- probar en su móvil y en un iPhone (fase 10, no bloquea);
- el dominio (S6).

## Propuestas de la fase 9b (§10 de su informe)
- **El rótulo de Saturno junto al planeta, la precarga de texturas del recorrido y los nombres de los lugares de España** en su vista guiada: **fase 10**, tarea 8.
- **El bloom del Sol: se quita** (queda en git). Desde la segunda vuelta no se usa y pesa unos 16 kB en el chunk del visor. Si algún día vuelve, que vuelva con su medida. **Fase 10**, tarea 4.
- **El Sol de cerca en el móvil, fase 10 (tareas 4 y 5):**
  - medir FPS y batería en el móvil de Iván;
  - en el nivel bajo, pintarlo a 10 fotogramas por segundo en lugar de 20;
  - un hash entero (WebGL2) en lugar de `fract(sin(x)·43758)`.
- **El terminador de Titán, comprobado con otra foto de Cassini con otra fase:** **fase 10**.
- **La máscara de los mosaicos, umbralizada:** en la 10.a (D48), en la misma pasada.

## Para aplicar esta revisión (Claude Code)
Esta revisión ya está en `main` (la subió la sesión de revisión). El bloque F se hace con dos sesiones nuevas en paralelo, como el reparto de la 9b.

### Sesión 1, «Bloque F: fase 10»
- **Dónde:** en la carpeta del proyecto, en la rama `fase-10-pulido`.
- **Prompt:** `Aplica docs/revisiones/bloque-S.md y continúa con el bloque F.`
- **Pasos:**
  1. **En `main`,** tras traer `origin/main` (con los PR de Dependabot ya fusionados, decisión 5) y hacer `npm ci`, pon al día:
     - **el plan:**
       - D48 y D49 en §1, y `@lhci/cli` en la lista cerrada;
       - en §6, el bloque S ✅ (revisado en `bloque-S.md`);
       - la fase 10, con la entrega 10.a, las decisiones 4 y 6 y las propuestas de la 9b;
       - la tarea 9 (el bloom), «quitarlo»;
       - el backlog 15, sin lo que pasa a la fase 10;
     - **`PROMPTS.md`:** el bloque S ✅; en el F, «Antes de empezar»: ✅ `@lhci/cli`, aprobado; el iPhone, cuando Iván pueda (no bloquea);
     - **`PENDIENTES.md`:**
       - lo decidido aquí, marcado con su fecha y «delegado por Iván en la sesión de revisión»;
       - lo que sigue siendo de Iván: sus pruebas en el móvil, el zip de Proteo (opcional), «Sobre el proyecto» (opcional) y la lista corta de textos, cuando exista;
     - **`CLAUDE.md`:** en «Decisiones ya tomadas», `@lhci/cli`, aprobado y con sus condiciones;
     - **el `DIARIO`:** una línea.
  2. **Crea la rama de la fase 10 y sigue el ciclo de siempre.**
     - **La tarea 6 (la regresión visual) va al final, después de juntar la 10.a,** para que sus referencias partan de las lunas buenas.
     - **Las medidas de rendimiento de la tarea 4, con el equipo libre:** cuando la sesión 2 haya terminado.
     - S2 va en la tarea 4, y S3, en la 8.
  3. **Integra la 10.a** con `--no-ff` (como la 9b) y cierra la fase.

### Sesión 2, «Bloque F: las lunas, segunda vuelta (10.a)»
- **Dónde:** en su worktree, rama `fase-10a-lunas` desde `main`, con los puertos `CAPTURE_PORT=4360` y `E2E_PORT=4411`.
- **Prompt:** `Bloque F, entrega 10.a, en paralelo: las lunas recreadas, segunda vuelta (docs/revisiones/bloque-S.md, S1 y D48).`
- **Sus archivos:**
  - `scripts/lib/moon-*`;
  - la parte de las lunas de `scripts/build-textures.mjs` y de `scripts/measure-moon-maps.mjs`;
  - `scripts/capture-moon-views.mjs`;
  - las texturas de las lunas en `public/textures/`;
  - `docs/datos/recreacion-lunas.md`;
  - sus capturas, en `docs/informes/img/fase-10/lunas-*`.

  De lo compartido (`FUENTES.md`, `/creditos`, las fichas de las lunas y `assets-src/`), solo las filas y los textos de las lunas.
- **Al terminar:**
  - `npm run check`;
  - una revisión por subagente, solo de su entrega, y sus correcciones;
  - la nota de entrega `docs/informes/fase-10-entrega-lunas.md`: lo hecho, cada criterio con sus cifras y las capturas antes/después;
  - push de su rama.

  Antes de juntarla, la sesión de revisión mira las capturas.
