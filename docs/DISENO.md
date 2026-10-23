# Dirección visual

> Fase 0, tarea 0.9. Hay **2 propuestas**; en `src/styles.css` se aplican los tokens de la **recomendada (A)**. **Iván elige en la revisión.** Si elige B, cambiar es un commit: tokens, `@import` de las fuentes y dependencias `@fontsource/*`.

## Línea común

*Atlas científico / observatorio editorial*: sobrio, preciso y legible.

- **El protagonista es el 3D.** La interfaz es un marco discreto: fondos oscuros planos, líneas finas y un único color de acento.
- **Los datos se leen como en una tabla de efemérides:** cifras tabulares (`font-variant-numeric: tabular-nums`), unidades en el color secundario y alineación a la derecha en las tablas.
- **Se evita** el «espacio genérico»: degradados neón, glassmorphism, brillos, tipografías futuristas y la estética de plantilla de IA.
- Un solo tema oscuro. El visor lo necesita y las fichas lo comparten para que la web sea una sola pieza. Un tema claro para imprimir las fichas iría al backlog si hiciera falta.
- **Accesibilidad:** contraste AA comprobado (abajo), foco siempre visible con un anillo de 2 px en el color de foco y `prefers-reduced-motion`, que anula las duraciones de los tokens de movimiento.

---

## Propuesta A · «Carta celeste» (recomendada)

Un atlas impreso de noche: tinta azul casi negra, texto color papel y un acento latón como el de los instrumentos antiguos. Los titulares van en serifa editorial y los datos en una sans institucional con cifras tabulares.

### Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0D1321` | Fondo de página y del visor |
| `--color-surface` | `#151C2C` | Paneles (controles de tiempo, ficha resumida) |
| `--color-surface-raised` | `#1D2638` | Elementos sobre paneles (filas activas, menús) |
| `--color-line` | `#2C3648` | Separadores decorativos (no es borde de control) |
| `--color-control` | `#68748C` | Bordes de inputs y botones (≥ 3:1) |
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

## Propuesta B · «Instrumento»

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

## Por qué recomiendo A

- **Es más reconocible.** El latón sobre azul tinta y la serifa editorial no se parecen a la estética «espacial» de plantilla ni a un panel de control genérico. B es correcta, pero la consola grafito con acento naranja es un recurso muy visto.
- **Encaja con el contenido.** Las fichas son texto divulgativo: una serifa para los titulares les da carácter de atlas, y Public Sans mantiene los datos limpios.
- **Distingue el portfolio** de la web de ivanchesa.es sin desentonar: sobria y precisa, como pide el plan.
- **Riesgo:** el crema y el latón pueden verse «antiguos» si se abusa. Por eso el acento queda limitado a lo interactivo y a la selección.

---

## Bocetos de disposición

### Visor · escritorio (≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Tierra Luna Sol                 Planetas  Sol  Luna  Sobre el proyecto   │ ← cabecera fina
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ CUERPOS       │                                          │ MARTE         │
│ ○ Sol         │                                          │ Newsreader    │
│ ○ Mercurio    │              canvas 3D                   │ Resumen 2–3   │
│ ○ Venus       │      (hueco reservado: sin CLS)          │ frases        │
│ ● Tierra      │                                          │ ─────────     │
│ ○ Luna        │                                          │ Radio  0000 km│ ← cifras
│ ○ Marte  ◄────┼── selección en la lista o en el canvas   │ Día   00,0 h  │   tabulares,
│ …             │                                          │ Al Sol 0,00 UA│   a la derecha
│ [Vista general]                                          │ Ficha completa→
├───────────────┴──────────────────────────────────────────┴───────────────┤
│ ◄◄ ▶ ►►  1 día/s ▾   23 oct 2026 · 21:40 (hora peninsular)   [Ahora]     │ ← barra de tiempo
└──────────────────────────────────────────────────────────────────────────┘
```
Las cifras del boceto son marcadores (`0000`). Los datos reales llegan en la fase 1, con fuente.

- La lista de cuerpos es HTML, así que funciona con teclado y sin WebGL. El panel de la ficha se cierra con `Esc`.
- La barra de tiempo es la única franja fija; sus cifras usan `tabular-nums` para que la fecha no «baile» al reproducir.

### Visor · móvil (< 640 px)

```
┌──────────────────────────┐
│ Tierra Luna Sol      ☰   │
├──────────────────────────┤
│                          │
│        canvas 3D         │
│   (alto fijo: 60svh)     │
│                          │
├──────────────────────────┤
│ ▶  1 día/s ▾     [Ahora] │ ← panel inferior plegable (zonas táctiles ≥ 44 px)
│ 23 oct 2026 · 21:40      │
│ Cuerpos: [Sol][Mer][Ven]…│ ← carrusel horizontal de botones
└──────────────────────────┘
  Ficha → hoja inferior que sube sobre el panel; se cierra con el botón «Cerrar» o deslizando.
```

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
│ │ Radio medio             │  0 000 │ km  ¹ │ │ ← cifras tabulares, a la derecha,
│ │ Duración del día        │   00,0 │ h   ² │ │   unidad en color secundario,
│ │ …                       │        │       │ │   nota con la fuente
│ └─────────────────────────┴────────┴───────┘ │
│ Posición hoy: a X UA del Sol (calculada aquí)│
│ Curiosidades (3), cada una con su fuente     │
│ Fuentes: ¹ NASA Planetary Fact Sheet …       │
└──────────────────────────────────────────────┘
```
Ancho de lectura máximo: `--measure` (68 caracteres).
