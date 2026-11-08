# Dirección visual

> Fase 0, tarea 0.9. **Decisión de Iván (23-10-2026): propuesta A, «Carta celeste»**, aplicada en `src/styles.css`. La B se conserva como alternativa descartada, por referencia.
> Actualizado en la fase 9c (D47, la interfaz más limpia, 06-11): las reglas de la interfaz, los bocetos del visor y de la ficha, la navegación, el control sin borde y la medida de lectura. El 07-11, planetas y lunas, distintos en el selector (decisión de Iván).

## Línea común

*Atlas científico / observatorio editorial*: sobrio, preciso y legible.

- **El protagonista es el 3D.** La interfaz es un marco discreto: fondos oscuros planos, líneas finas y un único color de acento.
- **Los datos se leen como en una tabla de efemérides:** cifras tabulares (`font-variant-numeric: tabular-nums`), unidades en el color secundario y alineación a la derecha en las tablas.
- **Se evita** el «espacio genérico»: degradados neón, glassmorphism, brillos, tipografías futuristas y la estética de plantilla de IA.
- Un solo tema oscuro. El visor lo necesita y las fichas lo comparten para que la web sea una sola pieza. Un tema claro para imprimir las fichas iría al backlog si hiciera falta.
- **Accesibilidad:** contraste AA comprobado (abajo), foco siempre visible con un anillo de 2 px en el color de foco y `prefers-reduced-motion`, que anula las duraciones de los tokens de movimiento.

---

## Propuesta A · «Carta celeste» (elegida)

Un atlas impreso de noche: tinta azul casi negra, texto color papel y un acento latón como el de los instrumentos antiguos. Los titulares van en serifa editorial y los datos en una sans institucional con cifras tabulares.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0D1321` | Fondo de página y del visor |
| `--color-surface` | `#151C2C` | Paneles (controles de tiempo, ficha resumida) |
| `--color-surface-raised` | `#1D2638` | Elementos sobre paneles (filas activas, menús) y el fondo de los botones (fase 9c) |
| `--color-line` | `#2C3648` | Separadores decorativos (no es borde de control) |
| `--color-control` | `#68748C` | Bordes de los campos y los desplegables (≥ 3:1); desde la fase 9c, los botones no llevan borde |
| `--color-text` | `#ECE5D3` | Texto principal (crema) |
| `--color-text-muted` | `#ABA593` | Texto secundario, unidades y pies |
| `--color-accent` | `#D9B76E` | Enlaces, cuerpo seleccionado y órbita resaltada |
| `--color-focus` | `#F0CF86` | Anillo de foco |

### Contraste (WCAG 2.1, calculado con la fórmula de luminancia relativa)

| Par | Ratio | Mínimo AA | |
|---|---|---|---|
| texto / fondo | 14,76:1 | 4,5:1 | ✅ |
| texto / superficie elevada | 12,05:1 | 4,5:1 | ✅ |
| secundario / fondo | 7,54:1 | 4,5:1 | ✅ |
| secundario / superficie elevada | 6,16:1 | 4,5:1 | ✅ |
| acento / fondo | 9,67:1 | 4,5:1 | ✅ |
| acento / superficie elevada | 7,90:1 | 4,5:1 | ✅ |
| fondo sobre acento (botón principal) | 9,67:1 | 4,5:1 | ✅ |
| foco / fondo | 12,34:1 | 3:1 (no textual) | ✅ |
| foco / superficie elevada | 10,08:1 | 3:1 | ✅ |
| borde de control / fondo | 3,94:1 | 3:1 | ✅ |
| borde de control / superficie elevada | 3,22:1 | 3:1 | ✅ |

### Tipografía (2 familias, self-hosted con Fontsource, solo el subconjunto latino)

| Familia | Uso | Pesos | Cifras tabulares |
|---|---|---|---|
| **Newsreader** (Production Type, OFL-1.1) | H1–H3, nombre del cuerpo y citas | 500 | ✅ `tnum` (comprobado en el GSUB del archivo) |
| **Public Sans** (USWDS, OFL-1.1) | Interfaz, texto corrido, datos y tablas | 400, 600 | ✅ `tnum` (comprobado en el GSUB del archivo) |

Son 3 archivos `woff2`. Newsreader da el tono editorial de atlas sin caer en lo decorativo. Public Sans es neutra, muy legible a tamaños pequeños y con cifras tabulares para la fecha y los datos.

---

## Propuesta B · «Instrumento» (descartada)

La consola de un observatorio: grafito neutro, texto blanco roto y un único acento ámbar de «lámpara de sodio» para lo activo. Todo en grotesca, con las lecturas numéricas en monoespaciada como en una pantalla de instrumento.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#111314` | Fondo de página y del visor |
| `--color-surface` | `#1A1D1F` | Paneles |
| `--color-surface-raised` | `#23272A` | Elementos sobre paneles |
| `--color-line` | `#33383C` | Separadores decorativos |
| `--color-control` | `#6E757A` | Bordes de inputs y botones |
| `--color-text` | `#E6E7E5` | Texto principal |
| `--color-text-muted` | `#A0A5A8` | Texto secundario y unidades |
| `--color-accent` | `#FF9F45` | Enlaces, cuerpo seleccionado y órbita resaltada |
| `--color-focus` | `#FFB86B` | Anillo de foco |

### Contraste

| Par | Ratio | Mínimo AA | |
|---|---|---|---|
| texto / fondo | 15,02:1 | 4,5:1 | ✅ |
| texto / superficie elevada | 12,13:1 | 4,5:1 | ✅ |
| secundario / fondo | 7,49:1 | 4,5:1 | ✅ |
| secundario / superficie elevada | 6,05:1 | 4,5:1 | ✅ |
| acento / fondo | 9,14:1 | 4,5:1 | ✅ |
| acento / superficie elevada | 7,38:1 | 4,5:1 | ✅ |
| fondo sobre acento (botón principal) | 9,14:1 | 4,5:1 | ✅ |
| foco / fondo | 10,93:1 | 3:1 | ✅ |
| foco / superficie elevada | 8,83:1 | 3:1 | ✅ |
| borde de control / fondo | 3,98:1 | 3:1 | ✅ |
| borde de control / superficie elevada | 3,22:1 | 3:1 | ✅ |

### Tipografía

| Familia | Uso | Pesos | Cifras tabulares |
|---|---|---|---|
| **Archivo** (Omnibus-Type, OFL-1.1) | Titulares, interfaz y texto | 400, 600 | ✅ `tnum` (comprobado en el GSUB del archivo) |
| **IBM Plex Mono** (IBM, OFL-1.1) | Fecha, velocidad, distancias y tablas de datos | 400 | ✅ monoespaciada: todas las cifras miden lo mismo |

---

## Por qué A

- **Es más reconocible.** El latón sobre azul tinta y la serifa editorial no se parecen a la estética «espacial» de plantilla ni a un panel de control genérico. B es correcta, pero la consola grafito con acento naranja es un recurso muy visto.
- **Encaja con el contenido.** Las fichas son texto divulgativo: una serifa para los titulares les da carácter de atlas, y Public Sans mantiene los datos limpios.
- **Distingue el portfolio** de la web de ivanchesa.es sin desentonar: sobria y precisa, como pide el plan.
- **Riesgo:** el crema y el latón pueden verse «antiguos» si se abusa. Por eso el acento queda limitado a lo interactivo y a la selección.

---

## Reglas de la interfaz (fase 9c, D47)

- **El 3D manda.** Lo que flota sobre el lienzo sin ser un control ni un panel opaco no captura el puntero: los gestos llegan al 3D por todo el lienzo (también sobre el título).
- **Un control, un peso.** El borde (`--color-control`), solo en los campos y los desplegables; los botones, con su fondo (`--color-surface-raised`) y sin borde. Pulsado o abierto, el texto en latón con un subrayado de 2 px, como la pestaña de la vista actual. **Reproducir es lo único destacado** (el círculo de latón).
- **Paneles sin contorno:** el fondo (`--color-surface`) y la sombra los separan del 3D. Las pestañas, sobre un fondo traslúcido; los planetas de las fichas, sin caja: la miniatura, y el nombre sobre una placa casi opaca del color del fondo, que se lee también sobre un planeta brillante (≥ 4,5:1 en el peor caso, medido por `scripts/measure-ui.mjs`; crítica de la 9c).
- **Un solo selector a la vista:** las fichas de cuerpos. El Índice es su versión en tabla y, abierto, las sustituye. El título dice el cuerpo elegido, con «‹ Sistema solar» para volver.
- **Planetas y lunas, distintos a simple vista** (decisión de Iván del 07-11): los planetas, redondos y con el nombre debajo; las lunas, pastillas con su fondo, la miniatura y el nombre al lado (como un botón: pulsada, el nombre en latón con su subrayado).
  - **En el PC y la tableta (≥ 768 px), dos filas:** abajo, el Sol y los planetas; encima, las lunas del sistema elegido. En todas las vistas: en Tierra y Luna, los planetas y, encima, la Luna.
  - **En el móvil, una sola fila:** con un planeta con lunas elegido, el planeta, una raya y sus lunas (desplazable), y «‹ Sistema solar», en el título, vuelve a la de los planetas. En Tierra, Luna y el Cielo, sin fichas (en el Cielo, su selector es la tabla de «Esta noche», con «Mirar»).
- **Lo que se usa poco, en «Controles»:** la fecha y la hora, el sentido, la cámara (en el móvil), la vista general, la vista limpia, la calidad, la escala, el recorrido y los atajos.
- **La primera vez, y no más:** el recorrido de la portada y, al acabarlo o saltarlo, las pistas de uso (crítica de la 9c).
  - **El recorrido,** unos 29 s: Saturno, la Tierra y España (con sus lugares nombrados), la Luna (si no está casi nueva: con menos del 20 % iluminado, esa parada se salta, sin tocar la fecha) y la vista general en marcha. Cada parada, con su rótulo («1 de 4 · Saturno y sus anillos»). «Saltar el recorrido» lleva a la vista general en marcha, sin anillo de foco si se ha usado el ratón o un toque.
  - **Las pistas,** 7 s junto a la fila: «Ahora tú: elige un cuerpo abajo · arrastra para girar · usa la rueda para acercarte» (o «pellizca», con el dedo). Solo se dan por vistas con una interacción de verdad (un clic, un toque, la rueda o una tecla que no sea moverse con el tabulador); si se acaban sin usarlas, vuelven otro día.
- **Los avisos sobre el 3D** (el rótulo del recorrido, las pistas y «Saltar el recorrido»): en una placa junto a la fila, centrada en la zona libre del encuadre (`tls-callout`); no capturan el puntero.
- **Lo plegado se despliega al recibir el foco** (la presentación y la autoría, con un cuerpo elegido en el móvil): el tabulador nunca se para en algo que no se ve.
- **Medida de lectura:** `--measure` = 30em, unos 68 caracteres de texto corrido (antes 68ch, que con el «0» de Public Sans daban unos 89).
- **Nada por debajo de 11 px** y zonas de 44 × 44 px en el explorador táctil (24 × 24 en todas las páginas).

## Bocetos de disposición

### Navegación

- **Páginas de lectura** (fichas, índices, eclipses…): la cabecera con el nombre (a la portada), Planetas, Lunas, Sol, Eclipses, Sobre el proyecto y «Explorar en 3D» (en latón). En el móvil, en «Menú», con los créditos y lo legal aparte y abajo. Debajo, las migas («Inicio › Planetas › Marte», «Inicio › Eclipses»).
- **El explorador:** la cabecera compacta en todos los tamaños (el nombre y «Menú», con lo mismo dentro). Sus vistas, en las pestañas: Sistema solar, Tierra, Luna y Cielo.

### Visor · escritorio (≥ 1024 px)

Disposición inmersiva (D30, fase 3c; fase 9c): el lienzo a sangre bajo la cabecera y la interfaz flotando encima. Los paneles que tapan el lienzo (`data-chrome`) apartan el encuadre, que se mide en cada maquetación (`features/viewer/insets.ts`).

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Tierra Luna Sol                                                        ≡ Menú  │ ← cabecera compacta
├────────────────────────────────────────────────────────────────────────────────┤
│ Sistema solar  Tierra  Luna  Cielo                     ┌───────────────────┐   │ ← pestañas (vistas 3D)
│ ‹ Sistema solar                                        │ Saturno         × │   │ ← con un cuerpo, «‹ Sistema
│ Saturno (H1)                                           │ Planeta           │   │     solar» y su nombre
│ Posiciones reales, calculadas en tu navegador.         │ Resumen…          │   │ ← autoría (primera pantalla;
│ Un proyecto de … · Cómo se calcula                     │ Distancia, Datos  │   │     se pliega)
│                                                        │ Ficha completa  → │   │ ← ficha, sin contorno
│                    canvas 3D a sangre                  └───────────────────┘   │
│        (los gestos, en todo él; el encuadre se aparta de los paneles)    +     │ ← acercar y alejar, sin marco
│                                                                          −     │
│     Ahora tú: elige un cuerpo abajo · arrastra para girar · usa la rueda…      │ ← pistas, 7 s, la primera vez
│                [◐ Mimas] [◐ Encélado] [◐ Tetis] [◐ Dione] … [◐ Jápeto]         │ ← encima, las lunas del sistema
│ [≡ Índice]    (☉)  (·)  (·)  (·)  (·)  (♃)  (♄)  (·)  (·)                      │    elegido, en pastillas; abajo,
│               Sol  Mer. Ven. Tie. Mar. Júp. Sat. Ura. Nep.                     │    los planetas, el nombre debajo
│ (▶)  Fecha               ‹ 2026 › ──────●──────────   Velocidad  [⚙ Controles] │ ← barra: reproducir, fecha,
│      24 oct 2026, 02:00                    hoy         3 días/s ▾              │     el año (‹ ›), velocidad y más
└────────────────────────────────────────────────────────────────────────────────┘
```
Las cifras y las fechas del boceto son marcadores.

- **El índice y las fichas son HTML:** funcionan con teclado y sin WebGL. `Esc` cierra lo que tiene el foco: «Controles», el índice o la ficha.
- **La franja de abajo** es solo el fondo de la barra de tiempo, con un fundido corto (0,5 rem) encima; los dos, como mucho el 10 % del lienzo; las fichas flotan sobre el 3D y cuentan en el encuadre.
- **La barra no cambia de tamaño al reproducir:** las cifras usan `tabular-nums` y la fecha tiene el ancho de la más larga («30 sept 2026, 23:59»).
- **Al entrar, el sistema se mueve** a la velocidad de su contexto (D33): reproducir y pausar es lo primero y más visible de la barra. La primera vez, el recorrido de la portada.
- **En las vistas Tierra y Luna**, sin Índice: los planetas y, encima, la Luna; «‹ Sistema solar» en el título y su panel en la columna izquierda, que aparta el encuadre a su derecha: la región de una vista guiada (España), en la zona libre. **En el Cielo**, sin Índice: su tabla es la de «Esta noche»; su columna, de 22 rem, para que quepa el lugar más largo.
- **El año, un mando de la barra:** «‹ 2026 ›», en la línea del año, en el PC y la tableta (con el dedo, flechas de 44 px; en el teléfono, la línea apenas mide 100 px: el año va en la fecha y en «Controles»). Un toque, un año; mantenido medio segundo, por décadas; siempre dentro de 1900–2100. Con el teclado, Mayús + Re Pág y Av Pág en la línea del año, que lo dice en su descripción. Las flechas no son paradas del tabulador: la línea y el año son un solo mando (los topes de D47).
- **«Controles»** se abre encima de la franja de abajo, a la derecha (con la ficha abierta, a su izquierda): por encima de la barra, las fichas y la fila de lunas, que no tapa. Abierto, cuenta en el encuadre: la cámara aparta el cuerpo a su izquierda.

### Visor · móvil y tableta (< 1024 px)

```
┌────────────────────────────────┐
│ Tierra Luna Sol         ≡ Menú │
├────────────────────────────────┤
│ Sistema solar Tierra Luna Cielo│ ← pestañas
│ El sistema solar               │ ← se pliega a una línea al
│ (entradilla y autoría, en la   │     primer gesto o a los 8 s
│  primera pantalla)             │
│                                │
│          canvas 3D             │ ← sin columna de cámara: acercar
│   (los gestos, en todo él)     │     y alejar, en «Controles»
│                                │
│ [≡ Índice] (☉)(·)(·)(●)(·) →   │ ← fichas: fila desplazable, con
│ (▶) 24 oct 2026, 02:00 ──●─ [⚙]│     fundido en el borde; barra
│     Hora local · 3 días/s      │     de tiempo en una fila
└────────────────────────────────┘
```
Con un cuerpo elegido (decisión de Iván del 08-11), arriba, una sola franja en lugar de la cabecera y las pestañas; al elegirlo, abajo, solo una barra fina, que abre la hoja de su ficha:
```
┌────────────────────────────────┐
│ ‹ Sistema solar  Saturno ≡ Menú│ ← una sola franja (3 rem): la
│                                │    cabecera y las pestañas, fuera
│              (♄)               │ ← el cuerpo, en el centro del
│                                │    hueco libre
│ Saturno          Ver ficha ⌃ × │ ← la barra fina (≤ 12 %): un botón
│ Planeta · Radio ecuatorial: …  │    que abre la hoja (y se desliza)
│ (▶) 24 oct 2026, 02:00 ──●─ [⚙]│
└────────────────────────────────┘
```
En el teléfono (< 768 px), con un planeta con lunas elegido y la ficha cerrada, la fila es la de su sistema; en la tableta, como en el PC, dos filas:
```
┌────────────────────────────────┐
│ ‹ Sistema solar  Saturno ≡ Menú│ ← la franja del cuerpo elegido
│              …                 │
│ (♄) │ [◐ Mimas] [◐ Encélado] → │ ← el planeta, una raya y sus
│ Sat.│                          │    lunas en pastillas (desplazable)
│ (▶) 24 oct 2026, 02:00 ──●─ [⚙]│
└────────────────────────────────┘
```
- **La ficha** (decisión de Iván del 08-11: la hoja en reposo era «muy invasora»): al elegir un cuerpo, solo una barra fina encima de la barra de tiempo, con el nombre, el tipo y el radio, «Ver ficha» y × (como mucho el 12 % de la pantalla). Es un botón con `aria-expanded` que abre la hoja: un toque, Intro o deslizarla hacia arriba. La hoja, a media pantalla, con el resumen, «Ficha completa» y «Ver los datos» (que la sube entera, con los datos y sus fuentes); deslizarla hacia abajo, o Esc, la devuelve a la barra. El foco va a la barra al elegir el cuerpo; al abrir la hoja, a su contenido; Esc lo devuelve a la barra. Reproducir y pausar, siempre a mano, debajo.
- **Arriba, con un cuerpo elegido, una sola franja:** «‹ Sistema solar», el nombre y «Menú», en la cabecera del sitio (de 3 rem), en lugar de la cabecera y las pestañas. La presentación se recoge: el H1 y su tipo, solo para el lector; la autoría, fuera.
- **El índice y «Controles»** suben como hojas, con su título y su botón de cerrar. Lo que tapan sale del orden del foco. «Controles» es una hoja baja, como mucho el 45 % de la pantalla (lo demás se desplaza dentro): el 3D se ve encima mientras se usa, y la cámara aparta el cuerpo por encima de ella. En un teléfono bajo, deja al menos unos 150 px de 3D bajo el título; en horizontal (o con el zoom al 200 %), es un panel a la derecha, de debajo de las pestañas a la barra, con el 3D a su izquierda.
- **Tierra y Luna:** en el teléfono, sin fichas (en el título, «‹ Sistema solar»); su panel en una fila (las vistas, desplazables, y «Más» para el resto) y la barra plegada a reproducir, la fecha y «Controles». **El Cielo:** el lugar (su nombre corto, «Montsec (Lleida)») con «Usar mi ubicación» debajo (en la tableta, a su lado), la hora y una línea de resumen; «Esta noche», a demanda (con su marcador de abierto o cerrado), con la tabla en dos líneas por fila si no cabe en su caja (también en la columna del escritorio); en el teléfono, sin fichas.
- **En los teléfonos bajos** (en horizontal o con el zoom al 200 %), la página se desplaza: al llegar se ven el lienzo y, justo debajo, la barra con su pausa.

### Ficha completa (`/planetas/marte`) · sin 3D

```
┌──────────────────────────────────────────────┐
│ Inicio › Planetas › Marte                    │
│                                              │
│ Marte                       (H1, Newsreader) │
│ Resumen en 2–3 frases, texto secundario.     │
│ [Ver en 3D]                                  │
│ ┌──────────────────────────────────────────┐ │
│ │ imagen (ancho y alto fijados)            │ │
│ └──────────────────────────────────────────┘ │
│ Datos                                        │
│ ┌─────────────────────────┬────────┬───────┐ │
│ │ Radio medio             │  0 000 │ km  ¹ │ │ ← lo esencial primero
│ │ Duración del día        │   00,0 │ h   ² │ │
│ │ Datos técnicos                           │ │ ← después, lo técnico
│ │ Densidad media          │  0 000 │ kg/m³ │ │
│ └─────────────────────────┴────────┴───────┘ │
│ Posición hoy: a X UA del Sol (calculada aquí)│
│ Curiosidades (3), cada una con su fuente     │
│ Fuentes: ¹ NASA Planetary Fact Sheet …       │
│ ‹ Luna                              Fobos ›  │ ← la anterior y la siguiente,
└──────────────────────────────────────────────┘     en el orden del atlas
```
Ancho de lectura máximo: `--measure` (30em, unos 68 caracteres).
