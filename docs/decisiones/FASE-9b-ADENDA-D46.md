# Adenda a la fase 9b: el Sol y la Tierra, con el aspecto de la referencia (D46)

- **Fecha:** 2026-11-06
- **Decisión de Iván**, preparada por la sesión de revisión. Es una **entrega nueva, la 9b.f**: va después de la 9b.d y antes de la 9b.e. Manda sobre D41 y sobre las comparativas con EPIC de la fase 5 donde se contradigan.

## Por qué
Iván, el 06-11, con dos capturas de la referencia (`earth.ethanplus.ai/solar.html`):
- **El Sol** de cerca: «quiero mejorar el sol, quiero uno más como el de la imagen».
- **La Tierra** de cerca: «La tierra también se tiene que mejorar».

**Lo que tiene la referencia:**
- **El Sol:** naranja intenso, con manchas grandes de brillo (zonas claras y oscuras), granulación fina, manchas solares y un resplandor naranja con rayos suaves.
  - De cerca, protuberancias animadas en el limbo.
  - Su nota de fuentes dice que es un «enhanced-color surface» con estructura procedural, corona y bucles de plasma animados, y que «in ordinary visible light the Sun is white».
- **La Tierra:**
  - océanos de un azul vivo y saturado, con un reflejo del Sol grande y suave;
  - pocas nubes y finas, así que los continentes se leen enteros;
  - el relieve marcado (el Atlas, el Rift);
  - el desierto cálido y la vegetación verde;
  - un borde de atmósfera fino y azul.
  - Usa las mismas texturas de Solar System Scope que nosotros: la diferencia está en el shader y en los ajustes.

**Lo nuestro:**
- **El Sol** (9b.c): blanco cálido y medido contra la física (el limbo por canal a ±0,006 de la ley). Se ve pálido.
- **La Tierra** (fase 5): calibrada con las fotos de EPIC. Los océanos salen azul marino oscuro, con las nubes reales densas, el reflejo flojo (`glint` 0,12) y la tierra apagada.

Es correcto, pero no es lo que Iván quiere enseñar.

## D46
En el explorador (la vista general, el primer plano y las vistas de la Tierra), **el Sol y la Tierra con color realzado**, como la referencia o mejor. Es una decisión de presentación, **ilustrativa y avisada**, como hacen los observatorios y la propia referencia.

**No cambia:**
- la astronomía (posiciones, orientaciones, fases, eclipses, sombras);
- la Tierra de noche (D40);
- `/cielo`, con la totalidad de la 9b.c: ahí el Sol sigue como lo ven los ojos, blanco y enrojecido junto al horizonte.

## Referencias para medir (no se copian ni se suben)
- **El Sol de la captura de Iván:** `assets-src/referencias/sol-referencia-ivan-06-11.png` (ignorada por git).
- **Capturas propias de la referencia** con Playwright, del Sol y de la Tierra de cerca y con un encuadre parecido al nuestro, en `assets-src/referencias/`.
  - Son solo para medir (CIELAB y estadísticas). No se suben al repo ni se usa nada de su código ni de sus archivos.
  - En particular, **no se usa la textura del Sol de Solar System Scope que usa la referencia**: el nuestro tiene que ser propio.

## Tareas

### El Sol
1. **Color realzado:** naranja como en la captura de referencia (el centro del disco y el borde, medidos en CIELAB), sin perder el oscurecimiento del limbo por canal de la 9b.c como forma del perfil. La paleta va en `visual-config.ts`, documentada.
2. **Superficie con estructura a gran escala:**
   - zonas claras (fáculas, plages) y oscuras a varias escalas, además de la granulación y de las manchas de la 9b.c (con su calendario y su rotación diferencial);
   - **procedural en el shader y en movimiento lento** (preferido: así supera a una textura fija) o derivada de imágenes públicas del SDO;
   - determinista; con movimiento reducido, quieta.
3. **El resplandor:** naranja y con rayos suaves alrededor del disco, como la referencia, con el bloom de la 9b.c ajustado. Que no tape a los planetas cercanos en la vista general.
4. **Protuberancias animadas en el limbo**, en primer plano: bucles de plasma que suben y caen despacio, ilustrativos.
   - **Sin ninguna en el disco de frente** salvo como filamentos oscuros, si quedan bien.
   - Con su coste dentro de §5 en los tres niveles; en bajo, si hace falta, sin ellas.
5. **En `/cielo`, nada de esto:** el Sol, como está.

### La Tierra (en el explorador)
6. **Los océanos**, de un azul vivo como en la referencia (medido en CIELAB en el Atlántico y en el Índico de día), sin la calibración de EPIC.
7. **El reflejo del Sol en el agua:** grande, suave y visible desde la Tierra completa (con Fresnel), solo en el agua (la máscara de siempre) y sin quemar a blanco.
8. **Nubes más finas:**
   - que los continentes se lean enteros desde la Tierra completa (menos cobertura y menos opacidad, sin borrar los grandes sistemas);
   - **la fracción del disco cubierta por nubes, medida**, junto a la de la referencia;
   - la sombra de las nubes, proporcional.
9. **El relieve, más marcado:** las montañas se ven en la Tierra completa (el Atlas, el Himalaya, los Andes) con la normal de siempre o con la elevación que ya tiene el proyecto. Sin exagerar el terminador.
10. **La tierra:** el desierto más cálido y la vegetación más verde, como en la referencia (medido en el Sáhara, el Sahel y el Amazonas).
11. **La atmósfera:** un borde fino, azul y brillante del lado del día; el crepúsculo, como está.
12. **No cambian:** la cara nocturna (D40) ni las luces.

### Para todo
13. **Decir que es realzado:**
    - en «Lo que es ilustrativo» de `/sobre-el-proyecto` y en `/creditos`;
    - en la ficha y en el panel del Sol, una línea con fuente (por ejemplo, de la NASA), como los demás textos (`reviewed: false`, `docs/ESTILO.md`), del tipo «Con luz visible normal el Sol es blanco; aquí se ve en color realzado, como en las imágenes con filtro de los observatorios»;
    - en la vista guiada de la Tierra completa, el texto deja de decir que es «como la fotografía la cámara EPIC».
14. **Los parámetros nuevos**, en `visual-config.ts` y con su porqué.
15. **`measure-earth-epic.mjs`** deja de ser el criterio. Se guardan sus cifras antes y después en el informe, como registro.

## Criterios de aceptación
- [ ] **Capturas antes, después y referencia**, lado a lado, en escritorio y móvil:
  - el Sol de cerca y en la vista general;
  - la Tierra completa (de día, con África y Europa, como la captura de Iván), el Pacífico y el Himalaya.
- [ ] **El Sol, medido frente a la referencia:**
  - el tono (h) del centro y del borde, a ±10°;
  - el croma (C\*), al menos el 80 % del de la referencia;
  - el contraste a gran escala de la superficie (la desviación típica de L\* tras quitar el limbo), al menos el de la referencia.
- [ ] **La Tierra, medida frente a la referencia:**
  - el h y el C\* de los océanos, a ±10° y al menos el 80 %;
  - la fracción de nubes del disco, a ±10 puntos de la de la referencia;
  - el reflejo, visible y sin quemar: el máximo, por debajo del blanco puro.
- [ ] **Sin cambios:**
  - la Tierra de noche (L\* ≤ 5 y C\* ≤ 3, D40);
  - la totalidad y el Sol de `/cielo` (las medidas de la 9b.c);
  - las efemérides y las sombras.
- [ ] **§5 en los tres niveles** (FPS, VRAM, llamadas de dibujo y memoria), con las protuberancias.
- [ ] **Con movimiento reducido,** todo quieto.
- [ ] **Los textos de «realzado»**, en sus tres sitios.

## Para aplicar (Claude Code)
- **D46 en el plan:**
  - §2 y la sección de la fase 9b, con la entrega 9b.f entre la 9b.d y la 9b.e;
  - en el informe, el orden nuevo;
  - una línea en `PENDIENTES.md` (decisión de Iván del 06-11).
- **Esta adenda va en el primer commit de la 9b.f.**
- **La 9b.d sigue como estaba** hasta terminarla.
