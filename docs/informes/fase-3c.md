# Informe: Fase 3c (Interfaz inmersiva del sistema solar)

- **Rama:** `fase-3c-interfaz`
- **Fecha:** 2026-10-26
- **Estado:** en curso (modo autónomo por bloques, bloque R)

## 0. Plan de la fase

Escrito antes de empezar, como pide el modo autónomo, a partir de `docs/PLAN.md` (fase 3c, D30 y D31), `docs/decisiones/FASE-3c-INTERFAZ.md`, `docs/DISENO.md`, `docs/ESTILO.md`, la revisión del bloque B (B5), el informe y la revisión de la fase 3b y el código de la interfaz (fase 3). Lo que cambie durante la ejecución se explica en §4.

La referencia del original (la captura de su barra inferior) no está en el repositorio: se sigue su descripción del documento de origen. Se toma la **estructura**; los estilos, las formas y los textos son nuestros (D30, dirección visual A «Carta celeste»).

### Entregas
| Entrega | Contenido |
|---|---|
| 3c.a | **Arranque en movimiento y velocidades (D31).** 3 días/s (por defecto) y 10 días/s en `state/speeds.ts`, en los dos sentidos; al entrar sin `?fecha=`, reproduciendo a 3 días/s desde «ahora»; con movimiento reducido o con `?fecha=`, en pausa. Tests unitarios y un e2e por caso. `ESTILO.md` §3 con las velocidades nuevas. |
| 3c.b | **Lienzo a pantalla completa y panel «Índice».** El explorador deja la rejilla de columnas: el lienzo ocupa todo y la interfaz flota encima. La columna lateral pasa a un panel desplegable «Índice» (cerrado al entrar; botón siempre visible; `Esc`; foco que entra al abrir y vuelve al botón al cerrar) con el árbol de los 30 cuerpos tal como está (teclado, árbol plano, distancias y nota). Pestañas de vista flotantes arriba; texto de presentación arriba a la izquierda que se pliega al interactuar o al elegir un cuerpo (en los móviles bajos, solo el H1); pie con «Un proyecto de… · Créditos», las pistas de uso y la fuente de los datos en letra pequeña (ocultos en la vista limpia). La ficha resumida, como tarjeta flotante. Márgenes del encuadre (`setViewOffset`) recalculados con los paneles flotantes (`[data-chrome]`). |
| 3c.c | **Fichas de cuerpos.** Una fila con el Sol y los 8 planetas, cada uno con su miniatura redonda renderizada por nuestro motor (`scripts/build-body-thumbnails.mjs`: modo de captura con el cuerpo aislado, sin estrellas, órbitas ni otros cuerpos, recortado y en WebP pequeño en `public/img/cuerpos/`); al elegir un planeta con lunas, una segunda fila con ellas (sus miniaturas, también del motor: hasta la fase 7, con su color esquemático). Barra de herramientas con botones `aria-pressed` (el patrón que el plan admite junto al `radiogroup`): las flechas solo mueven el foco, una sola parada de tabulación por fila, e Intro, Espacio o clic eligen; así, recorrer la fila con el teclado no lanza un viaje de cámara en cada paso. Foco visible y nombre accesible con la distancia actual (como descripción, que no cambia mientras el foco sigue en la ficha, como en el índice). En móvil, filas desplazables con zonas táctiles ≥ 44 px. |
| 3c.d | **Barra de tiempo compacta y «Controles +».** Botón redondo de reproducir/pausar en latón (el primer control de la barra, WCAG 2.2.2); fecha legible con su rótulo «Fecha» e icono de calendario que abre el selector nativo; línea de tiempo del año de la fecha mostrada (`input type="range"` con `aria-valuetext` «17 de marzo de 2026»; flechas = 1 día, RePág/AvPág = 1 mes, Inicio/Fin = el año; marca de «hoy»; el año a la vista y paso al anterior o al siguiente en los extremos; rango total 1900–2100); selector de velocidad. «Controles +» despliega lo menos usado: hora y zona, «Ahora», calidad, vista limpia y atajos (en móvil, hoja inferior). |
| 3c.e | **Cierre.** Rendimiento con la reproducción automática (FPS, coste de CPU, Lighthouse y CLS), capturas en escritorio, portátil y móvil (también de que ningún cuerpo enfocado queda tapado), e2e y axe, informe, `npm run check`, revisión por subagente, correcciones y fusión. |

### Diseño (decisiones de partida)
1. **El motor y el lienzo no cambian** (lienzo único, D10). Solo cambia lo que flota encima y los márgenes del encuadre, que ya se miden de los paneles `[data-chrome]` (`insets.ts`): la clasificación por borde sirve igual para paneles flotantes.
2. **Accesibilidad primero:** el panel «Índice» sigue siendo la alternativa completa a las fichas y al canvas; las fichas son un `radiogroup` (una parada de tabulación, flechas); la línea de tiempo es un `input type="range"` nativo (ratón, táctil y teclado de serie) con `aria-valuetext`; la pausa es el primer control de la barra y `Espacio`/`K` pausan. axe sin violaciones en los nuevos estados (índice abierto, controles desplegados).
3. **Nada nuevo en el bundle inicial:** el marco prerenderizado (póster, pestañas, texto de presentación, pie) sigue siendo ligero; fichas, barra, índice y miniaturas llegan en el `@defer` de siempre. Las miniaturas son `<img>` con ancho y alto fijados (sin CLS) y `loading="lazy"` en la segunda fila.
4. **Sin saltos de maquetación:** el marco prerenderizado reserva el sitio de la barra y de las fichas (CLS ≤ 0,05).
5. **La URL** sigue sin cambiar durante la reproducción (§4.5): la reproducción automática no la toca.
6. **Rendimiento:** con la reproducción automática no hay render bajo demanda al llegar; se mide el coste (CPU por frame y FPS) y se comprueba que la pestaña oculta pausa. Lighthouse móvil del explorador ≥ 90.

### Archivos
- Nuevos: `features/body-chips/` (fichas, con test), `features/time-controls/timeline.ts` (lógica pura de la línea de tiempo, con test), `features/explorer-ui/index-panel` o equivalente, `scripts/build-body-thumbnails.mjs`, `public/img/cuerpos/*.webp`, `docs/informes/img/fase-3c/`.
- Tocados: `features/viewer/viewer-layout.{html,ts,css}`, `features/explorer-ui/*`, `features/time-controls/*`, `features/body-picker/*` (dentro del panel), `features/view-switcher/*`, `state/speeds.ts` (+ test), `explorer-session.ts` (arranque), `e2e/*`, `docs/ESTILO.md` (velocidades), `docs/FUENTES.md` (las miniaturas salen de texturas ya atribuidas; se anota su origen).

### Dependencias
Ninguna nueva.

### Riesgos y dudas
1. **Dos filas de fichas + la barra en un móvil bajo** pueden tapar mucho lienzo: la segunda fila solo aparece con un planeta con lunas elegido, y la hoja inferior se desplaza por dentro si no cabe (como ahora).
2. **La reproducción automática** gasta CPU y batería: se pausa con la pestaña oculta (ya existe) y se mide.
3. **Los e2e y las capturas** suponen hoy un arranque en pausa: el modo de captura sigue arrancando en pausa en su fecha fija; los e2e que dependan del arranque se adaptan.
