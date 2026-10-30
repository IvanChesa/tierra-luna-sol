# Informe: Fase 6 (la Luna)

- **Rama:** `fase-6-luna`
- **Fecha:** 2026-10-30
- **Estado:** en curso (entrega 6.a)

## Plan
La fase es grande: va por entregas, con este informe al día al final de cada una.

**6.a · Recursos y relieve (tarea 1)**
- `download-assets.mjs`: el color LROC en 8K (`lroc_color_poles_8k.tif`) y la elevación del LOLA (`ldem_16_uint.tif`, 16 px/°, medios metros con 10 km de desplazamiento) del CGI Moon Kit (NASA SVS 4720), con su SHA-256 en el manifiesto.
- `build-relief.mjs`, para la Luna:
  - la elevación, con sondas de alineación (sus puntos más alto y más bajo, junto a cráteres con nombre del Gazetteer de la IAU);
  - un mapa de normales derivado, con su exageración documentada y sondas de pendiente en las paredes de un cráter grande;
  - la elevación en 16 bits empaquetada en RG (D15), **sin pérdidas**, con la resolución vertical resultante.
- `build-textures.mjs`:
  - el color en 1k / 2k / 4k / 8k (la 8K, solo en el nivel alto);
  - las normales en 2k / 4k;
  - la elevación en 1k / 2k.

  Pesos frente a §5: ≤ 10 MB en alto y ≤ 3 MB en bajo.

**6.b · La malla y el material (tareas 2 y 3)**
- **Una esfera cúbica** (seis caras subdivididas y normalizadas), con la densidad de cada nivel de calidad. Sin el pellizco de los polos de `SphereGeometry`: la vista «Polo sur» lo pide.
- **Las coordenadas de textura, por píxel** a partir de la posición, con el truco de Tarini (dos juegos de longitud y el de derivada continua) para que no haya costura en el meridiano 180°.
- **El material lunar**, variante del común (`TLS_MOON`), como la Tierra:
  - desplazamiento de vértices con la elevación a escala física (exageración opcional y documentada);
  - normales del relieve;
  - Lommel–Seeliger (D29), que ya lleva.
- **La orientación y la libración:** la de `RotationAxis` ya se comprueba frente a `Libration` desde la fase 2. Aquí, además, en la escena (el punto subterrestre de la malla) y en capturas en dos fechas.

**6.c · La sombra de la Tierra (tarea 4) y la fase (tarea 7)**
- `ephemeris/`: la geometría de la sombra de la Tierra con la regla de Danjon (radio de la Tierra +1/85) y su achatamiento, que usa la NASA. Test frente a la ficha de la NASA del eclipse total del 3-3-2026 (radios de la umbra y la penumbra, distancia al eje y magnitud umbral; fixture con su URL).
- **El shader:** la fracción del disco del Sol que la Tierra deja ver desde cada punto (como la sombra de la Luna en la fase 5) y una luz rojiza ilustrativa en la umbra, documentada.
- **La fase:** la ficha de la Luna, la escena y el USNO, coherentes (tests con las fases del USNO y la iluminación de Horizons).

**6.d · Vistas, recorrido y panel (tareas 5 y 6)**
- `data/tours.ts`:
  - las vistas «Cara visible», «Cara oculta», «Polo sur» y «Luz rasante», cada una con la fecha más cercana que la ilumina (luna llena, luna nueva, el terminador sobre la región);
  - un recorrido por lugares con nombre del Gazetteer y la NASA, con subtítulos y fuentes y `reviewed: false`.
- **Un panel de la vista Luna** como el de la Tierra: «Reproducir», «Pausar», anterior, siguiente y «Saltar», con teclado. Con movimiento reducido, paso a paso y con cortes de cámara.

**6.e · VRAM con la Tierra y la Luna (tarea 8, C4) y cierre**
- Los mapas de alta resolución, solo del cuerpo enfocado o del que se ve grande. El planeta de una luna enfocada (la Tierra en la vista Luna) ya no pide su textura de máxima resolución.
- La 8K de la Tierra se libera al salir de su vista (test).
- Test del presupuesto con las dos vistas como peor caso.
- Capturas de los siete criterios (escritorio y móvil) y mediciones de peso, FPS y VRAM en los tres niveles.

Fuera de alcance, por el plan: KTX2 solo si la VRAM no cabe con WebP (necesitaría `toktx`, condición de parada).
