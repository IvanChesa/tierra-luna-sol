# Adenda a la fase 9b: lo que nadie ha visto de las lunas (D45)

- **Fecha:** 2026-11-05
- **Decisión de Iván**, preparada por la sesión de revisión. Va en la **entrega 9b.d** y manda sobre `FASE-9b-SOL-LUNAS.md` donde se contradigan.

## Por qué
Iván, con una captura de Tritón de cerca en staging: «Tritón se ve fatal».

**Diagnóstico** (`public/textures/2k/triton.92e914831a.webp`, del mosaico del USGS de la fase 7): solo el centro del mapa tiene detalle, que es lo que fotografió de cerca la Voyager 2.
- **El norte, que nadie ha visto**, es un gris liso: el 38,4 % del mapa (`FUENTES.md`).
- **Las longitudes que solo se vieron de lejos** salen como manchas borrosas y estiradas.

Al acercarse, esas dos zonas ocupan casi todo el disco. **No es un fallo del render, es el mapa.**

Lo mismo iba a pasar con las cinco lunas de Urano, porque la 9b.d (tarea 2) decía «el norte que no vio la Voyager difuminado, como en Tritón». Y con Proteo, que no tiene mapa.

**Opciones que se le dieron a Iván:**
- detalle fino sobre lo real (la recomendada);
- **recreación completa** (la elegida);
- solo lo real, con la zona sin datos lisa.

Iván eligió la **recreación completa** y añadió: «así con las demás lunas también».

## D45
**Ninguna luna con zonas vacías o borrosas.** Lo que no se vio se recrea entero: un terreno verosímil, también con accidentes grandes, hecho a partir del terreno real de la misma luna. Es **ilustrativo** y se dice.

## Alcance
- **Qué lunas:** la terminal mide los mapas de las 20 lunas y lista las afectadas en el informe. Para cada una, mide la cobertura y la resolución efectiva frente a la textura de 2k con la que se ve de cerca.
- **Esperadas:** Tritón, Miranda, Ariel, Umbriel, Titania, Oberón y Proteo. Quizá también zonas de Calisto, Ganímedes, Europa o Ío que solo se vieron de lejos.
- **Qué cuenta como zona afectada:** la que no tiene datos o la que tiene una resolución de origen peor que la de esa textura. La terminal fija y justifica el umbral.

## Reglas
1. **Lo real manda:**
   - **Donde el mosaico tiene detalle, no se toca.** Las sondas del Gazetteer siguen pasando, y un test comprueba que esa zona es igual al mosaico procesado, dentro de la tolerancia de la compresión.
   - **Donde solo hay imágenes de lejos,** la recreación respeta su brillo a gran escala (lo real, en baja frecuencia) y pone el detalle encima.
   - **Lo que nadie vio** se recrea entero.
2. **De qué se hace:** del terreno real de la misma luna, por sus unidades. En Tritón: el terreno de «piel de melón», las llanuras y el casquete con sus vetas oscuras. En Miranda: las coronas y el terreno de cráteres.
   - **La receta va escrita en el informe:** qué unidad va dónde y por qué (por latitud, por analogía con el hemisferio visto…), sin presentarla como ciencia.
   - **No se usa** nada de otras lunas ni imágenes con otra licencia.
   - **Proteo,** que no tiene mosaico: con lo que haya de sus propias imágenes de la Voyager con licencia aceptada. Si no hay nada usable, cráteres generados con su albedo, y Pharos donde dice el Gazetteer. Va sobre su forma real (tarea 1).
3. **Licencias:**
   - Se comprueba que cada fuente permite obras derivadas.
   - Si la política del JPL (D43) no lo deja claro, se usa el equivalente de dominio público del USGS: sus mosaicos de la Voyager o las láminas I-1920.
4. **Método:**
   - **Por script, fuera de línea:** con la cabecera «GENERADO por…», determinista (semilla fija) y sin dependencias fuera de la lista cerrada. Si hiciera falta una, es condición de parada.
   - **Sobre la esfera, no sobre el plano equirrectangular** (por caras de cubo o por proyecciones locales). Así no se estira en los polos ni deja costura en ±180°.
   - **El borde con lo real**, con mezcla multibanda: sin costura, con la misma media, el mismo contraste y el mismo grano que lo vecino. Y sin repeticiones visibles.
   - **Los mismos tamaños** (1k y 2k) y los mismos presupuestos de §5.
5. **Una máscara por luna** de lo real, lo visto de lejos y lo recreado, generada por el script. Con el porcentaje de cada parte en el informe y en `FUENTES.md`.
6. **Decir que es ilustrativo:**
   - en `FUENTES.md`, como obra derivada («recreación ilustrativa a partir de…»);
   - en `/creditos`;
   - en «Lo que es ilustrativo» de `/sobre-el-proyecto`;
   - en la ficha de cada luna afectada, una línea con fuente, como los demás textos (`reviewed: false`, `docs/ESTILO.md`), por ejemplo: «La Voyager 2 fotografió alrededor del X % de Tritón; el resto de este mapa es una recreación». Si no hay una fuente citable para el porcentaje, el medido en el mapa, con el método.
7. **El tinte de Tritón** (hoy, un tono melocotón), con su color publicado, como el de las lunas de Urano en la tarea 2.

## Cambios en la entrega 9b.d
- **Tarea 2:** donde dice «difuminado, como en Tritón», pasa a decir **recreado (D45)**.
- **Tarea 3:** donde dice «Proteo […] sin mapa inventado», pasa a decir **Proteo con su superficie recreada (D45)** sobre su forma real.
- **Tarea 8, nueva:** Tritón y las demás lunas con zonas sin ver o sin detalle (D45), con las reglas de arriba.

## Criterios de aceptación (se suman a los de la 9b.d)
- [ ] **Capturas de cada luna afectada desde seis direcciones** (cuatro longitudes en el ecuador y los dos polos), en escritorio. Más la rejilla de las 20 lunas. En ninguna se ve:
  - una zona gris lisa;
  - una mancha borrosa;
  - una costura;
  - una repetición;
  - un pellizco en los polos.
- [ ] **Medido en cada luna:**
  - el grano de lo recreado (la desviación típica del paso alto), entre el 70 % y el 130 % del de lo real vecino;
  - en el borde con lo real, ningún salto de brillo medio mayor que ΔL\* 2.
- [ ] **Lo real, sin cambios:** las sondas del Gazetteer y el test de la zona real pasan.
- [ ] **Los porcentajes** de lo real, lo visto de lejos y lo recreado de cada luna, en el informe y en `FUENTES.md`.
- [ ] **Las fichas, `/creditos` y `/sobre-el-proyecto` lo dicen.**
- [ ] **§5 sin cambios.**

## Para aplicar (Claude Code)
- **Cuando toque la 9b.d:** D45 en el plan (§2 y la sección de la fase 9b) y una línea en `PENDIENTES.md` (decisión de Iván del 05-11). Esta adenda va en el primer commit de la entrega.
- **El Sol (9b.c)** sigue como estaba.
