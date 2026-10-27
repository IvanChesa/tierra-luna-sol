# Dirección visual

> Fase 0, tarea 0.9. **Decisión de Iván (23-10-2026): propuesta A, «Carta celeste»**, aplicada en `src/styles.css`. La B se conserva como alternativa descartada, por referencia.

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

## Bocetos de disposición

### Visor · escritorio (≥ 1024 px)

Disposición inmersiva de D30 (fase 3c): el lienzo a sangre bajo la cabecera y la interfaz flotando encima. Los paneles que tapan el lienzo (`data-chrome`) apartan el encuadre, que se mide en cada maquetación (`features/viewer/insets.ts`).

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Tierra Luna Sol                  Planetas  Sol  Luna  Sobre el proyecto        │ ← cabecera fina
├────────────────────────────────────────────────────────────────────────────────┤
│ Sistema solar  Tierra  Luna                              ┌───────────────────┐ │ ← vistas y texto de presentación
│ Título (H1, Newsreader)                                  │ SATURNO         × │ │ ← tarjeta flotante (al elegir
│ Una frase; se pliega al usar el visor                    │ Resumen en 2–3    │ │     un cuerpo); se desplaza
│ ┌──────────────┐                                         │ frases            │ │
│ │ ÍNDICE     × │                                         │ Al Sol    0,00 UA │ │ ← panel «Índice» (cerrado al
│ │ ○ Sol        │        canvas 3D a sangre               │ Datos y fuentes   │ │     entrar; botón «Índice» o I)
│ │ ● Saturno    │   (el encuadre se aparta de             │ Ficha completa  → │ │
│ │   ○ Titán    │    cada panel: nada tapa el             └───────────────────┘ │
│ │ …            │    cuerpo elegido)                 [+]                        │ ← cámara, en la parte visible
│ └──────────────┘                                    [−]                        │
│                                                     [⌂]                        │
│                                                     [▢]                        │
│                   (·) Titán  (·) Rea  (·) Jápeto  …                            │ ← lunas del planeta elegido
│ [≡ Índice]   (☉) Sol  (·) Mercurio  …  (♄) Saturno  …  (·) Neptuno             │ ← fichas con miniatura
│ (▶)  Fecha                                            Velocidad                │ ← barra de tiempo: reproducir,
│      24 oct 2026, 02:00 [▦]  ‹ 2026 › ───●───────  3 h/s ▾ [⇆]  [Controles +]  │     fecha y calendario, línea
│      Hora local, UTC+1              hoy                                        │     del año, velocidad y más
│ Arrastra para girar · …     1900–2100 · NASA/JPL · astronomy-engine · Créditos │ ← pie, en letra pequeña
└────────────────────────────────────────────────────────────────────────────────┘
```
Las cifras y las fechas del boceto son marcadores.

- **El índice y las fichas son HTML:** funcionan con teclado y sin WebGL. `Esc` cierra lo que tiene el foco: «Controles +», el índice o la ficha.
- **La franja de abajo** (fichas, barra y pie) es un velo del color del fondo, sin desenfoque. Los controles de encima son opacos.
- **La barra no cambia de tamaño al reproducir:** las cifras usan `tabular-nums`, la fecha tiene un ancho mínimo y la lectura, siempre las mismas líneas, para que la fecha no «baile».
- **Al entrar, el sistema se mueve** a 3 horas por segundo (D31): reproducir y pausar es lo primero y más visible de la barra.

### Visor · móvil y tableta (< 1024 px)

```
┌────────────────────────────────┐
│ Tierra Luna Sol            ☰   │
├────────────────────────────────┤
│ Sistema solar  Tierra  Luna    │ ← vistas
│ Título (H1, compacto)          │ ← se pliega al tocar
│ Arrastra · pellizca            │ ← solo en táctil
│                                │
│          canvas 3D             │
│    (el encuadre, entre el      │
│     texto y la franja)     [+] │ ← cámara: una columna a la
│                            [−] │     derecha que cuenta en
│                            [⌂] │     el encuadre
│                            [▢] │
│ (·) Titán  (·) Rea  …          │ ← lunas del planeta elegido
│ [≡ Índice] (☉)(·)(·)(●)(·) →   │ ← fichas: fila desplazable
│ (▶) 24 oct 2026, 02:00     [▦] │ ← barra de tiempo en dos filas;
│     Hora local, UTC+1          │     la lectura, siempre de tres
│     3 horas por segundo        │     líneas (no cambia de alto)
│ ‹ 2026 › ────●─────        [⫶] │ ← «Controles»: su icono, y con
│          hoy                   │     su nombre desde 480 px
└────────────────────────────────┘
```
- **El índice, la ficha y «Controles +»** suben como hojas inferiores, con su título y su botón de cerrar. Lo que tapan sale del orden del foco.
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
