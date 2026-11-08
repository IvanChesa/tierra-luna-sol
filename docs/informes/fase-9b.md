# Informe: Fase 9b (el Sol, las lunas y la Tierra de noche)

- **Rama:** `fase-9b-sol-lunas`
- **Fecha:** 2026-11-04 · 2026-11-05 · 2026-11-06 · 2026-11-07 · 2026-11-08 (en curso)
- **Estado:** en cierre: la tarea 0 y las seis entregas, hechas y juntadas en esta rama:
  - 9b.a, 9b.b, 9b.c y 9b.d;
  - 9b.f: el Sol, en dos vueltas (la segunda, aprobada por Iván el 08-11), y la Tierra, de la sesión B;
  - 9b.e: Venus, de la sesión C, con la interfaz de la 9c que traía su rama.

  Sigue el cierre: lo pendiente, §5 con el equipo libre, la revisión y la fusión en `main`.

## Plan
Bloque S, modo autónomo, una sola fase por entregas en el orden de `docs/decisiones/FASE-9b-SOL-LUNAS.md` (la prioridad de Iván), que manda sobre este plan en tareas y criterios, con sus adendas D45 (05-11) y D46 (06-11): **0, 9b.a, 9b.b, 9b.c, 9b.d, 9b.f y 9b.e**. La revisión del bloque E está aplicada en `main` (`0963b9f`). Los PR 1 y 3 de Dependabot (E5) siguen abiertos: la rama sale del `main` de hoy y, cuando Iván los fusione, se traen (son de parche). Cada entrega cierra con `npm run check`, este informe al día, sus capturas (`?captura=1`, escritorio y móvil, en `docs/informes/img/fase-9b/`) y un commit; y se sube la rama para que su vista previa (`fase-9b-sol-lunas.tierra-luna-sol.pages.dev`) enseñe cuanto antes la primera.

**Reparto en tres sesiones en paralelo (decisión de Iván del 08-11, `docs/decisiones/FASE-9b-REPARTO-PARALELO.md`):** manda sobre el orden de entregas de este plan: la 9b.f y la 9b.e van a la vez, repartidas entre A (el Sol, que integra y cierra la fase, en esta carpeta y esta rama), B (la Tierra, en `fase-9b-f-tierra`) y C (Venus, en `fase-9b-e-venus`), con los archivos de cada una y los compartidos que dice ese documento.

**Reparto con la sesión en paralelo de la fase 9c (la interfaz; aviso de Iván del 06-11):** la 9c va en su worktree y en la rama `fase-9c-interfaz`, desde `main`. De esta sesión: `src/app/scene`, `ephemeris`, `data`, `scripts` (salvo los puertos de `capture-lib.mjs` y `playwright.config.ts`, que pasan a leer `CAPTURE_PORT` y `E2E_PORT`, con 4340 y 4391 por defecto), `public`, `scripts/content`, `pages/credits`, `pages/about`, el plan, `PENDIENTES`, `DIARIO`, `FUENTES` y este informe. De la 9c: `src/app/features`, el resto de `src/app/pages`, `app.*`, `styles.css` y los e2e de la interfaz. Lo que esta fase tenga que tocar de la 9c se apunta en este informe para la fusión, y las medidas de rendimiento que sirven de criterio se repiten al cerrar (las de antes, con la otra sesión en marcha, no valen como criterio).

**0 · `/luna` en las migas y en el menú** (E4, decisión de Iván del 04-11)
- Las migas de `/luna`: «Inicio › Lunas › Luna».
- «Lunas» marcado en el menú también en `/luna` (con la misma URL). El código propio inicial está a 120 bytes de su presupuesto (14,88 kB de 15): se hace con lo mínimo y se mide; si no cabe, se busca el ahorro en el propio bundle inicial, sin subir el presupuesto.

**9b.a · Los sistemas de lunas de la vista general (D39)**
- Primero, una opción **solo de captura**, `?captura=1&cuerpo=jupiter&marco=ilustrativo`: el planeta enfocado sin pasar a su sistema local físico, para ver de cerca su sistema de la vista general. Con ella, las capturas «antes» (el build de `main`) y «después».
- **Tamaños** (`ephemeris/scale.ts`, función pura con tests): cada luna, `R_planeta · (r / R)^β` con β = 0,65, sobre el radio final de su planeta (con el alivio y el mínimo en pantalla de D35). Medido en el script de exploración: Ganímedes, el 11,7 % de Júpiter (objetivo, 10–15 %); la Luna, el 42,9 % de la Tierra (35–45 %); Titán, el 12,9 % de Saturno. El orden de tamaños de cada sistema se conserva (la ley es monótona).
- **Distancias sin cruces** (función pura con tests): por sistema, la primera luna fuera del planeta (en Saturno, del borde exterior del anillo A, a 2,27 radios) con un margen; cada una, al menos a la anterior más la suma de sus radios, un hueco del mismo tamaño y su excentricidad (el periapsis de la de fuera nunca llega al apoapsis de la de dentro); y una parte logarítmica de la distancia real para que los saltos grandes (Titán y Jápeto, Fobos y Deimos) se noten. Cada luna conserva su órbita real escalada por un factor propio: la misma dirección, la misma forma y el mismo orden. Las órbitas y las estelas usan la misma transformación.
- **El alivio de D35 con el tamaño de cada sistema:** Júpiter con sus lunas mide ~2,9 de sus radios y Saturno ~4,8: en sus conjunciones (las de 1901, 1921, …, 2100, a 24–27 unidades), encoger los dos planetas con sus sistemas los dejaría a menos de la mitad. Se propone (y se documenta como decisión técnica) que **el sistema de lunas se comprima hacia su planeta** (posiciones y tamaños de las lunas por un factor c ≤ 1, que conserva los huecos) cuando se acerca a otro cuerpo o sistema, con el mismo paso suave de D35; los discos de los planetas siguen con el alivio de siempre (×0,79 como mucho, el 3,2 % del tiempo). Con c muy pequeño, las lunas se desvanecen. Muestreo de 1900 a 2100 en escritorio y en el móvil de 390 px.
- **Presencia:** una luna aparece cuando su sistema se distingue (como ahora) y, además, cuando su disco llega a ~1 px (sin motas de menos de un píxel alrededor de Saturno, cuyas lunas ahora empiezan fuera de los anillos y se distinguirían antes).
- **El mapa de cada luna cuando se ve grande** (radio de ~24 px o más, con histéresis, como `LARGE_ENTER_PX`), sin enfocarla, al nivel de la vista general de las lunas, y liberado al dejar de verse (§5, VRAM medida).
- **El color esquemático, la media de su mosaico**: un script que lo calcula de cada mosaico (cabecera «GENERADO por…») y `body-colors.ts` que lo usa.
- Tests: el muestreo de 1900 a 2100 (cada 3 días) con los tamaños efectivos, en escritorio y en el móvil: ninguna luna toca a otra, a su planeta, a otro cuerpo o a los anillos, también en las conjunciones; las proporciones del punto 1 y el orden de tamaños y de órbitas de cada sistema. Capturas antes y después (Júpiter y Saturno de cerca, escritorio y móvil; Saturno con todas sus lunas fuera de los anillos) y la de una luna con su mapa sin enfocarla.

**9b.b · La Tierra de noche (D40)**
- Mirar la licencia y la resolución de Black Marble 2016 (NASA Earth Observatory, VIIRS) en gris; si vale (dominio público de la NASA), usarla con un color cálido documentado. Si no, quitar la base azul de la textura de Solar System Scope en el script de texturas (restando el fondo local, sin tocar las luces).
- Sin relleno teñido en la cara nocturna de la Tierra (el de primer plano no ilumina la textura de día donde es de noche) y la compensación de la exposición sin convertir el suelo en otra cosa: las luces pueden ganar, el suelo sin luces sigue negro. El limbo de la atmósfera y las estrellas que tapa dan la forma del disco.
- Medida en CIELAB del suelo sin luces en la captura (L\* ≤ 5, C\* ≤ 3) y del tono de las luces; las comparativas con EPIC de la fase 5, repetidas (las mismas cifras). Capturas antes y después, con una foto de la ISS enlazada.

**9b.c · El Sol (D41)**
- El oscurecimiento del limbo por canal con coeficientes publicados por longitud de onda (Neckel y Labs, 1994, u otros con fuente), con test y medido en la captura (I(μ)/I(1) en R, G y B).
- Que deslumbre: el centro casi blanco; **bloom solo para el Sol** con `three/addons` (sin dependencias nuevas) en los niveles alto y medio, con el fondo pintado dentro de la escena (fase 3b, §4.1), sin quemar los planetas cercanos; en el bajo, el halo.
- Granulación que se mueve, más visible en primer plano; manchas ilustrativas en sus bandas de latitud con umbra y penumbra y la rotación diferencial publicada (test); su cantidad, fija y moderada salvo que haya una fuente del ciclo con licencia compatible (SILSO es CC BY-NC: no vale); fáculas si salen gratis; una corona tenue en primer plano. Quieto con movimiento reducido y en las capturas.
- **La totalidad del cielo** (E1): la Luna más oscura que el cielo, el cielo azul muy oscuro con el resplandor del horizonte y la corona con serpentinas; medido en CIELAB en la captura del 12-08-2026 desde Fraga y comparado con una foto real enlazada.
- §5 en los tres niveles (FPS, VRAM y llamadas de dibujo).

**9b.d · Las lunas: formas y mapas (D42, D43 y D45)**
- Buscar y comprobar (licencia y fichero) los modelos de forma de Fobos, Deimos y Proteo y los mapas de Deimos y de las cinco de Urano (los del JPL, D43, hechos por el USGS). Si un fichero solo se puede bajar a mano (el archivo del PDS SBN tiene una verificación anti-bots), se pide a Iván en `PENDIENTES.md` y se sigue con lo demás.
- **Decisiones de Iván del 06-11:** las formas de Fobos y Deimos, de los **DSK del NAIF**, citando la fuente (sus reglas de uso, en la lista de licencias de `CLAUDE.md`); Proteo, con la forma de Stooke si su zip está en `assets-src/shapes/` y, si no, como esfera. El 06-11 la carpeta está vacía: **Proteo sigue como esfera**, con su superficie recreada (D45: cráteres generados con su albedo).
- Las mallas reducidas por script (cabecera «GENERADO por…»), con el mapa proyectado por longitud y latitud planetocéntricas, la orientación con su test y los semiejes frente a los publicados; las sombras analíticas siguen con el elipsoide medio, y se dice.
- **D45 (adenda del 05-11, `docs/decisiones/FASE-9b-ADENDA-D45.md`; «Tritón se ve fatal»):** medir los mapas de las 20 lunas por script: en cada una, lo real con detalle, lo visto de lejos (con una resolución de origen peor que la de la textura de 2k con la que se ve de cerca) y lo que no se vio, con el umbral justificado. Después, por script (determinista, con la cabecera «GENERADO por…» y sin dependencias nuevas), recrear lo que no se vio y poner detalle sobre lo visto de lejos a partir del terreno real de la misma luna, sobre la esfera (por caras de cubo), con una mezcla multibanda en el borde y sin repeticiones; lo real, intacto (con un test y sus sondas). Una máscara por luna con sus porcentajes (en este informe y en `FUENTES.md`) y la receta de cada una, escrita aquí.
- Los mapas de Urano, con el norte recreado (D45) y teñidos con su color publicado; Tritón, con el suyo; Proteo, con su superficie recreada sobre su forma real (Pharos, donde dice el Gazetteer); la dicotomía de Jápeto, con los albedos medidos; el terminador de Titán, suave; y la textura del planeta al enfocar una de sus lunas, si se ve grande.
- Las capturas de cada luna afectada desde seis direcciones (cuatro longitudes en el ecuador y los dos polos) y la rejilla de las 20 lunas; medidos, el grano de lo recreado (del 70 al 130 % del de lo real vecino) y el borde con lo real (ΔL\* ≤ 2); `FUENTES.md` y `/creditos` fichero a fichero, «Lo que es ilustrativo» y una línea con fuente en la ficha de cada luna afectada; §5 en los sistemas de lunas.

**9b.f · El Sol y la Tierra, con el aspecto de la referencia (D46, adenda del 06-11, `docs/decisiones/FASE-9b-ADENDA-D46.md`)**
- **La referencia, para medir** (no se copia nada): capturas propias de `earth.ethanplus.ai/solar.html` con Playwright, del Sol y de la Tierra de cerca y con un encuadre parecido al nuestro, en `assets-src/referencias/` (ignorada por git), junto a la de Iván. De ellas, las cifras en CIELAB que fijan los objetivos: el tono (h) y el croma (C*) del centro y del borde del Sol y el contraste a gran escala de su superficie (la desviación típica de L* tras quitar el limbo); el h y el C* de los océanos (el Atlántico y el Índico), la fracción del disco cubierta por nubes y el tono del Sáhara, del Sahel y del Amazonas. Las capturas «antes», del build de la rama sin la entrega.
- **El Sol** (`sun-material.ts`, `VISUAL_CONFIG.sun`): una paleta realzada (naranja; el perfil del limbo por canal de la 9b.c como forma); estructura a gran escala procedural en el shader (fáculas y zonas oscuras a varias escalas), en movimiento lento, determinista y quieta con movimiento reducido; el resplandor naranja con rayos suaves (el bloom de la 9b.c, ajustado, sin tapar a los planetas cercanos); protuberancias animadas en el limbo en primer plano (bucles que suben y caen despacio; en el nivel bajo, sin ellas si no caben). En `/cielo`, el Sol de siempre.
- **La Tierra** (`body-material.ts`, `VISUAL_CONFIG.earth`): los océanos de un azul vivo (sin la calibración de EPIC), el reflejo del Sol grande y suave con Fresnel (solo en el agua y sin quemar), nubes más finas (la fracción del disco medida junto a la de la referencia; la sombra, proporcional), el relieve más marcado (sin exagerar el terminador), el desierto más cálido y la vegetación más verde, y un borde de atmósfera fino y azul del lado del día. La cara nocturna (D40) y las luces, sin cambios.
- **Decir que es realzado:** «Lo que es ilustrativo», `/creditos` y una línea con fuente en la ficha y en el panel del Sol (`reviewed: false`); la vista guiada «Tierra completa» deja de decir que es como la fotografía la cámara EPIC. Los parámetros nuevos, en `visual-config.ts` con su porqué. `measure-earth-epic.mjs` deja de ser criterio: sus cifras antes y después, como registro.
- **Medidas y capturas:** antes, después y la referencia, lado a lado (el Sol de cerca y en la vista general; la Tierra completa de día con África y Europa, el Pacífico y el Himalaya), en escritorio y móvil; lo que no cambia (la Tierra de noche, la totalidad y el Sol de `/cielo`, las efemérides y las sombras), medido otra vez; §5 en los tres niveles con las protuberancias; y con movimiento reducido, todo quieto.

**9b.e · Venus «Bajo las nubes» (D44)**
- El mosaico global del radar de Magellan (USGS Astropedia, dominio público; comprobar el producto y la resolución) con su sonda (Maat Mons); un botón con `aria-pressed` en el panel de Venus enfocado, con el aviso visible; un fundido (un corte con movimiento reducido); la textura solo al pulsarlo y liberada al salir. e2e del botón, axe, `FUENTES.md`, `/creditos` y §5.

**Cierre:** `npm run check`, este informe con las evidencias de cada criterio, la revisión por subagente, las correcciones, la fusión con `--no-ff`, el diario y el resumen del bloque S. Después, **parar** (no se empieza el bloque F).

## Dónde se queda (2026-11-08)
- **Hechas y comprobadas:** la tarea 0 y las entregas 9b.a, 9b.b, 9b.c y 9b.d, cada una con su `npm run check`, sus capturas y este informe. La 9b.d se cerró el 08-11 (el 07-11 la cortó el límite de uso con el build de texturas a medias, y se repitió entero).
- **El reparto en tres sesiones** (decisión de Iván del 08-11, `docs/decisiones/FASE-9b-REPARTO-PARALELO.md`): A, el Sol (esta sesión, que integra y cierra la fase); B, la Tierra (`fase-9b-f-tierra`); C, Venus (`fase-9b-e-venus`). La base común de la 9b.f (las herramientas de D46 y los bloques `enhanced` de `visual-config.ts`) está en `43072d6`; antes, `0447eae` trae de la 9c los puertos por entorno (`CAPTURE_PORT` y `E2E_PORT`) para que las tres sesiones no se pisen.
- **El Sol de la 9b.f, hecho** (§2 a §7): realzado y medido frente a la referencia, con sus textos. La línea del panel del Sol del explorador la puso la sesión C al traer la 9c (`features/body-panel`, con su test).
- **El Sol, rehecho en una segunda vuelta y juntado** (08-11): a Iván no le gustó el de la primera («Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo») y se rehízo en `fase-9b-f-sol-2`, desde `d765654` (§2). Iván lo aprobó el 08-11 («el sol le doy aprobado») y se juntó con `--no-ff` y sin conflictos (`fb3d021`). Después se rehicieron las imágenes del motor con el Sol nuevo (su miniatura, las de su ficha, la imagen para compartir y el póster de la vista general). Al hacerlo salieron puntos oscuros en el borde del Sol pequeño, un fallo del halo ya arreglado (`d881476`, §4). `npm run check`, en verde (§6). Su nota de entrega está ya en este informe y se ha borrado.
- **La Tierra de la 9b.f, hecha y juntada** (08-11, sesión de integración que sustituye a A): `fase-9b-f-tierra` (`582e440`), con `--no-ff` y sin conflictos. Después, `docs/revision-textos.md`, los pósters de la vista general y de la vista Tierra y la imagen para compartir, regenerados, y `npm run check` en verde (§6). Su nota de entrega está ya en este informe (§2 a §7) y se ha borrado.
- **El CI, otra vez en verde:** el e2e del móvil «/sol a 320 px» fallaba desde `08120db` (la dirección de la fuente del Sol realzado, sin dónde partirse, ensanchaba la ficha hasta 528 px). Arreglado en el CSS de la ficha (`dfbc655`, §4).
- **Venus (9b.e), hecha y juntada** (08-11, en la sesión de cierre): `fase-9b-e-venus` (`226ab0f`, con el CI en verde), con `--no-ff` y sin conflictos (`bdacb27`). Su rama ya traía `main` (la 9c, la interfaz nueva, con sus conflictos resueltos según la sección 12 de su informe) y el Sol de la segunda vuelta. Su nota de entrega ya está en este informe (§2 a §11) y se ha borrado.
- **El cierre** (08-11, en esta carpeta, con el equipo libre; detalle en §2, «Cierre de la fase»):
  - Venus, juntada;
  - las dos frases del Sol de «Lo que es ilustrativo», al día;
  - los e2e que fallaban a ratos en el CI, arreglados en su causa (sobre todo, el explorador que no llegaba a cargar en 90 s);
  - lo de la escena que dejó la 9c: la placa de las etiquetas y el suelo del cielo, hechos; el rótulo de Saturno, la precarga del recorrido y los nombres de España, propuestos para la fase 10;
  - §5 en los tres niveles, `npm run check` y los e2e, en verde;
  - después, la revisión por subagente, sus correcciones y la fusión en `main`.
- **Las medidas de rendimiento son provisionales:** con tres sesiones en el mismo PC. Se repiten al cerrar la fase, con el equipo libre.

## 1. Resumen
Hechas la tarea 0 y las seis entregas (9b.a, 9b.b, 9b.c, 9b.d, 9b.f y 9b.e), y el cierre (§2):
- **Tarea 0:** `/luna`, con las migas «Inicio › Lunas › Luna» y «Lunas» marcado en el menú (E4).
- **9b.a, los sistemas de lunas de la vista general (D39):** cada luna con su propia ley de tamaños respecto a su planeta y en una órbita ilustrativa escalada que no se cruza con ninguna otra, con su planeta ni con los anillos (las de Saturno, ahora por fuera); un sistema que se acerca a otro cuerpo o sistema se comprime hacia su planeta en lugar de meterse en él; en la vista general, un sistema aparece cuando su planeta crece en pantalla, y cada luna lleva su mapa cuando se ve grande.
- **9b.b, la Tierra de noche (D40):** las luces, del mapa Black Marble 2016 de la NASA (negro fuera de ellas) con el tono cálido de las de antes, y sin relleno en la cara nocturna en primer plano (en la vista general, gris neutro): el suelo sin luces, negro y neutro.
- **9b.c, el Sol (D41) y la totalidad del cielo (E1):** el Sol de la luz visible, casi blanco en el centro y dorado hacia el borde, con el oscurecimiento del limbo de cada color de una ley publicada (medido en la captura: el exponente de cada canal, a 0,003 de la ley), un resplandor (bloom) que solo sale del Sol en los niveles alto y medio, granulación que se mueve, manchas que giran con la rotación diferencial medida, fáculas y una corona tenue. En la totalidad del eclipse del 12-08-2026 desde Fraga, el cielo pasa del malva plano a un azul muy oscuro con el horizonte anaranjado en toda la vuelta, la Luna es lo más oscuro del cielo y la corona tiene serpentinas.
- **9b.f, el Sol (D46, en dos vueltas):** en el explorador, el Sol se ve en color realzado, como en la referencia. A Iván no le gustó la primera vuelta (sesión A): sus protuberancias parecían «tumores» y, en la vista general, el bloom lavaba el disco. Se rehízo en una segunda, que aprobó el 08-11:
  - el disco, naranja saturado de cerca y de lejos, con zonas claras y oscuras que fluyen despacio (también en pausa), granulación fina, manchas oscuras y el borde algo más oscuro y rojizo;
  - alrededor, un borde fino naranja rojizo, un resplandor suave y rayos cortos, sin la mancha pálida de antes;
  - de cerca, tres bucles de plasma finos y translúcidos.

  Medido frente a capturas propias de la referencia: de cerca, el tono del centro y del borde, a 2° como mucho del suyo, y el croma, del 100 al 105 %; en la vista general, el centro, naranja y sin lavar (L\* 79,8 · C\* 51,3 · h 81°, frente a 80,9 · 49,8 · 83°); y algo más de contraste. En `/cielo`, el Sol de siempre (las mismas capturas, píxel a píxel). Lo dicen su ficha, «Lo que es ilustrativo» y `/creditos`.
- **9b.f, la Tierra (D46, sesión B):** también en color realzado, como en la referencia: el océano de un azul vivo, el reflejo del Sol ancho y cian (sin quemar), muchas menos nubes y más finas (del 9,8 % del disco al 1,5 %; la referencia, el 0,7 %), el desierto más claro y amarillo, la vegetación más verde, el relieve cinco veces más marcado y un borde de atmósfera fino y azul. Medido frente a capturas propias de la referencia: el tono y el croma de los océanos, en los suyos. La cara nocturna y las luces (D40), iguales que antes. Lo dicen «Lo que es ilustrativo», `/creditos` y la vista guiada «La Tierra completa», que ya no dice que es como la foto de la cámara EPIC.
- **9b.e, Venus «Bajo las nubes» (D44, sesión C):** con Venus enfocada, su ficha del explorador lleva un botón «Bajo las nubes».
  - Al pulsarlo, las nubes dan paso al mosaico global del radar de Magellan, con un fundido (un corte con movimiento reducido). Va en gris y con la luz del Sol de Venus.
  - La ficha avisa de que es una imagen de radar, no lo que verían los ojos.
  - La textura se pide al pulsarlo y se suelta al apagarlo o al dejar Venus.
  - Maat Mons cae en su sitio (sus sondas, en el build).
  - Se usa con el teclado (`aria-pressed`) y no tiene violaciones de axe.
- **9b.d, las lunas: formas y mapas (D42, D43 y D45):** ninguna luna es ya una bola de un color (salvo Titán, por su neblina, ahora con el terminador suave de las fotos). Deimos y las cinco de Urano tienen los mapas del JPL; Proteo, cráteres generados. Lo que nadie ha visto (el norte de Tritón y de las lunas de Urano, y lo que no cubre el mapa de Deimos) se recrea con el terreno real de cada luna, y lo visto de lejos lleva detalle, sin tocar lo real. Fobos y Deimos tienen su forma real (los DSK del NAIF); Jápeto, el contraste de sus dos caras de los albedos de la NASA; las lunas en gris, el color de su B−V. Las fichas, los créditos y «Lo que es ilustrativo» lo dicen.

## 2. Criterios de aceptación

### Tarea 0 (E4)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| `/luna`: «Inicio › Lunas › Luna» y «Lunas» marcado en el menú, con la misma URL | ✅ | `body-detail-page.ts` (las migas de toda luna, también la Luna) y `app.ts` (`current()`); tests en `app.spec.ts` (en `/luna` desde antes de la primera navegación, es decir, en el HTML prerenderizado; `/lunas`, `/lunas/titan`, `/cielo?lugar=teide`, `/luna#fuente-1` y ninguno en el explorador) y el e2e de los índices (`e2e/contenido.spec.ts`: de `/lunas` a `/luna`, las migas y un solo `aria-current`). |
| El código propio inicial, dentro de su presupuesto (sin subirlo) | ✅ | 14,86 kB de 15 (antes de la fase, 14,88): lo que el sitio hace al navegar va a un chunk diferido; el JS inicial baja de 314,23 a 310,81 kB (sin `RouterLinkActive`). |

### Entrega 9b.a (D39)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Test: de 1900 a 2100, ninguna luna toca a otra, a su planeta ni a los anillos de Saturno en la vista general (en 3D, con los tamaños efectivos), también en las conjunciones de Júpiter y Saturno y con el tamaño mínimo de un móvil de 390 px | ✅ | `scene/illustrative-layout.spec.ts`, cada 3 días (24 350 muestras), en escritorio y con la cámara del móvil de C3. Peor margen (unidades): luna y su planeta, > 0; luna y otro cuerpo, 0,77 (en el móvil, 0,65); lunas del mismo sistema, 0,05; lunas de sistemas distintos, 1,56 (1,54); lunas y anillos de Saturno, > 0 (también las de Saturno, que antes no se miraban porque caían dentro). Los discos y los anillos, como en D35: ≥ 3,8 y 1,50 unidades de aire; solo encogen Júpiter y Saturno, el 3,2 % del tiempo y como mucho ×0,79. Lunas sin dibujar (su sistema, comprimido del todo): el 0,37 % de las muestras. |
| Las proporciones del punto 1, medidas, y el orden de tamaños y de órbitas de cada sistema, con test | ✅ | Ganímedes, el **11,7 %** del radio de Júpiter (objetivo, 10–15 %; antes, 26,7 %; real, 3,7 %); la Luna, el **42,9 %** del de la Tierra (35–45 %; antes, 59,4 %; real, 27,2 %). Tests en `ephemeris/scale.spec.ts` (`moonSystemLayout`: proporciones, orden de tamaños y de órbitas, también con las lunas desordenadas, como Tritón y Proteo, y el aire con el planeta y entre vecinas en el peor caso de sus excentricidades) y en `illustrative-layout.spec.ts` (los del catálogo). Tabla completa abajo. |
| Capturas antes y después: Júpiter y Saturno de cerca en la vista general, en escritorio y móvil; Saturno con todas sus lunas fuera de los anillos | ✅ | `docs/informes/img/fase-9b/antes-*` y `despues-*` (§7), con `?marco=ilustrativo` (solo en captura). Saturno desde arriba en 2029: antes, las órbitas y los discos de sus lunas, sobre los anillos; después, todas por fuera y en su orden. |
| Las lunas con su mapa al acercarse sin enfocarlas (captura), dentro de §5 | ✅ | Desde 24 px de radio (y hasta bajar de 18), su mapa de 1k sin su sistema enfocado: test en `engine.spec.ts` y comprobado en el navegador (Júpiter de cerca en el marco de la vista general: con dos pasos de zoom, Ganímedes mide 26 px y pide `1k/ganymede.…webp`; VRAM, 81,0 MB con el 4K de Júpiter, de 300). Captura `despues-escritorio-jupiter-mapas`. |

### Entrega 9b.b (D40)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Medido en CIELAB en la captura de la cara nocturna: el suelo sin luces, con L\* ≤ 5 y C\* ≤ 3 (negro y neutro); las luces conservan su tono cálido | ✅ | `scripts/measure-earth-night.mjs` (el lienzo de «Las luces de la noche», dentro de 0,85 radios; el suelo, el 80 % más oscuro de unos 580 000 px; las luces, el 2 % más brillante). **Después:** el suelo, L\* 0,2 (percentil 95, 0,8) y C\* 0,2 (1,2) en escritorio, y L\* 0,1 y C\* 0,1 en el móvil; las luces, h 94° (amarillo anaranjado), C\* 27. **Antes:** el suelo, L\* 2,9 y **C\* 18,8** (el azul marino); las luces, h 97°, C\* 10. |
| Captura antes y después, junto a una foto nocturna de la ISS enlazada (no copiada), en escritorio y móvil; y la vista general con la Tierra de noche, que sigue leyéndose como un disco | ✅ | `antes-` y `despues-tierra-vista-luces`, `-movil-vista-luces` y `-tierra-medianoche-utc`; la referencia, la foto de Singapur y Malasia de noche de un astronauta de la ISS (ISS070-E-80842, 26-01-2024; imagen del día del NASA Earth Observatory del 13-04-2025, https://science.nasa.gov/earth/earth-observatory/singapore-and-malaysia-at-night-154170/): el suelo, negro, y las luces, del naranja al blanco. La vista general con la cara nocturna de la Tierra hacia la cámara (`-tierra-sistema-noche` y su `-detalle` ampliado, 08-04-2026): un disco gris neutro (L\* 23,2, C\* 0,5) sobre el fondo (L\* 12,0), ΔL\* 11,2 (antes 11,8, con los colores del día); el 19-05-2026, delante del Sol, ΔL\* 7,7 (antes 8,4). |
| La cara de día, el terminador y las comparativas con EPIC de la fase 5 no cambian (las mismas medidas) | ✅ | `scripts/measure-earth-epic.mjs`, antes y después, **idénticas**: océano / desierto, 0,189 (EPIC, 0,178); las nubes (percentil 98) de las tres fotos, 0,696 · 0,631 · 0,603 (EPIC, 0,696 · 0,619 · 0,584). El relleno del lado del día no cambia; solo se vuelve gris del terminador hacia la noche (μ☉ de 0,1 a −0,1). |

### Entrega 9b.c (D41 y E1)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| El perfil del limbo por canal, medido en la captura (I(μ)/I(1) en R, G y B) y comparado con la ley publicada, con test | ✅ | `scripts/measure-sun.mjs limbo`, con `?medida=limbo` (solo en captura: el Sol sin halo, corona, bloom, granulación ni manchas, y con todo su disco por debajo de la compresión del tone mapping neutro; el lineal de cada píxel, el sRGB decodificado más el 0,04 que resta ese tone mapping; μ, en perspectiva, con el disco exacto del motor). **α medido: R 0,429, G 0,511 y B 0,629; la ley, 0,426, 0,508 y 0,626** (+0,003 en los tres). I(μ)/I(1), a ±0,006 de la ley de μ = 1 a 0,1 en los tres canales (tabla abajo). Tests (`ephemeris/sun.spec.ts`): la ley de Hestroffer y Magnan (1998, ec. 5) a ±0,02 de los exponentes de Neckel y Labs de su tabla 2 (la ecuación y la tabla, comprobadas en el texto del artículo), la potencia y el color del centro. |
| Capturas antes y después del Sol en primer plano y en la vista general, junto a una imagen de luz blanca de SDO/HMI enlazada; el centro casi blanco y el borde dorado, medidos | ✅ | `antes-` y `despues-sol-cerca` (la comparativa de la fase 3b, el 10-05-2024 a las 00:00 UTC), `-escritorio-sol-cerca`, `-movil-sol-cerca`, `-escritorio-sol-sistema` y `-movil-sol-sistema`. La referencia, el intensitograma del HMI de ese mismo instante: https://sdo.gsfc.nasa.gov/assets/img/browse/2024/05/10/20240510_000000_1024_HMIIC.jpg (el continuo a 617 nm, con la paleta naranja de falso color del SDO): el mismo oscurecimiento hacia el borde, la granulación y manchas con umbra y penumbra (las nuestras son ilustrativas: no es el grupo AR 3664 de ese día); el color, el blanco cálido de la luz visible que eligió Iván (D41), no el de esa paleta. Medido (`measure-sun.mjs disco`, con su bloom): **el centro, L\* 95,2 · C\* 3,4 · h 71° (casi blanco, cálido); a μ ≈ 0,4, L\* 85,5 · C\* 8,8; el borde (μ ≈ 0,15), L\* 71,2 · C\* 13,2 · h 76° (dorado)**. Antes: el centro, L\* 88,0 · C\* 7,5; a μ ≈ 0,4, L\* 72,8 · C\* 6,6; el borde, L\* 61,4 · C\* 6,0 · h 72°: un disco beige plano, del mismo tono del centro al borde (el limbo era el mismo en los tres canales). |
| La rotación diferencial de las manchas, con test | ✅ | `ephemeris/sun.spec.ts`: la ley de tres parámetros de Lößnitz et al. (2025; las manchas α del SDO/HMI de 2013 a 2024, sidérea; comprobada en el artículo): 25,1 días en el ecuador y 26,5 a 30°, más lenta hacia los polos; su deriva respecto al meridiano de la IAU (+0,15°/día en el ecuador, −0,62°/día a 30°); y el calendario de las manchas ilustrativas, determinista, en su banda y sin saltos (hora a hora durante 60 días en tres fechas de 1900 a 2100). En la escena, cada mancha va en su latitud y su longitud del sistema de la IAU de la malla del Sol. |
| La totalidad del 12-08-2026 desde Fraga: la Luna, más oscura que el cielo (medido); el cielo, azul y no malva (C\* y h en CIELAB, medidos); la corona, con estructura | ✅ | `measure-sun.mjs totalidad`. **De cerca** (campo de 3°): la Luna, **L\* 12,0**; el cielo de 2 a 3 radios, con la corona, L\* 46,8; el cielo lejos de la corona, **L\* 19,3 · C\* 14,8 · h 283° (azul)**. **De lejos** (campo de 50°): de 5° a 33° de altura, **h de 282° a 285° y C\* de 11 a 20**; el horizonte, anaranjado (a 0,5°, h 65° y C\* 26); entre los dos, a 3°, un gris casi neutro (C\* 3,6), sin pasar por el malva. Antes: la Luna, L\* 30,5 · h 338°, más clara que el cielo lejano (L\* 29,4 · C\* 14,5 · **h 335°, malva**); de lejos, h de 290° a 315° y sin el horizonte anaranjado. La corona, con serpentinas a varias latitudes y plumas en los polos (`CORONA_GLSL`), orientada con el polo del Sol (IAU) de ese instante y sin borde marcado (se apaga hasta los 6 radios). La foto real, enlazada: «Planets Around a Total Eclipse», de Stephane Vetter, desde el monte Nebo (Arkansas) el 8-04-2024 (APOD del 10-04-2024, https://apod.nasa.gov/apod/ap240410.html): el mismo cielo azul profundo, la corona blanca, Venus y Júpiter y el horizonte anaranjado en toda la vuelta, con una franja rosada y tenue encima, como nuestro cruce casi neutro; y la corona de cerca, «The Crown of the Sun» (APOD del 23-08-2017, https://apod.nasa.gov/apod/ap170823.html). |
| El bloom y la granulación, dentro de §5 en los tres niveles (FPS, VRAM y llamadas de dibujo); con movimiento reducido, todo quieto | ✅ | `measure-views.mjs`, dos pasadas con la GPU del equipo (una RTX 3060 con ANGLE sobre D3D11; tabla abajo): **59–60 FPS de mínimo en las 12 vistas de los tres niveles** (§5: ≥ 55 en alto). El bloom va solo en la vista del sistema solar; en ella, en alto y medio, **36 llamadas de dibujo en lugar de 21** (sus 15 pasadas: el Sol, el filtro, los 10 desenfoques y las tres mezclas) y **50 MB de VRAM en lugar de 38** (12 MB: sus render targets, a media resolución CSS, y la copia del lienzo; con una pantalla de densidad 2, unos 30). Con el Sol de cerca, 20 llamadas (5 sin el bloom) y el mismo FPS con la granulación. La VRAM más alta, la de la vista Tierra en alto: **278 MB de 300** (con el bloom reservado ahí habría pasado de 300 con densidad 2: por eso se suelta fuera del sistema solar, §4). `measure.mjs`: la vista general a 1 día/s, 60 FPS en los tres niveles y 1,83 ms de CPU por frame en alto (antes, 1,45); las tareas largas del arranque, como antes (53, 98 y 124 ms; antes, 65, 61, 82 y 139: la compilación del bloom es asíncrona); la memoria, estable tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas (15 geometrías y 25 texturas, 13 de ellas del bloom, y 11 MB de heap, igual que al empezar; un contexto WebGL). Con movimiento reducido y en las capturas, la granulación queda quieta (test en `engine.spec.ts`), la corona y el bloom no se mueven y las manchas solo siguen al reloj de la simulación (que con movimiento reducido arranca en pausa). |

**El limbo medido** (`measure-sun.mjs limbo`; I(μ)/I(1) de cada canal y, entre paréntesis, la ley μ^α):

| μ | R | G | B |
|---|---|---|---|
| 0,988 | 1,000 (0,995) | 1,000 (0,994) | 1,000 (0,992) |
| 0,787 | 0,908 (0,903) | 0,892 (0,886) | 0,868 (0,861) |
| 0,588 | 0,802 (0,797) | 0,768 (0,763) | 0,722 (0,717) |
| 0,388 | 0,671 (0,668) | 0,622 (0,618) | 0,556 (0,553) |
| 0,287 | 0,590 (0,588) | 0,533 (0,531) | 0,460 (0,458) |
| 0,188 | 0,491 (0,490) | 0,428 (0,427) | 0,351 (0,351) |
| 0,139 | 0,430 (0,431) | 0,366 (0,366) | 0,289 (0,290) |
| 0,099 | 0,372 (0,374) | 0,308 (0,310) | 0,234 (0,236) |
| **α** | **0,429** (0,426) | **0,511** (0,508) | **0,629** (0,626) |

El primer intervalo (μ de 0,975 a 1) es la referencia: por eso la ley no da 1 en él. Con el borde del disco tomado de la imagen (a media altura, 0,8 px por dentro del geométrico, porque el limbo ya está oscuro), los α salían 0,02 más bajos: el script usa el disco exacto del motor y μ en perspectiva (la cámara, a 6 radios del Sol).

**§5 por vista y nivel** (`measure-views.mjs`, segunda pasada; la primera, igual salvo la VRAM de las vistas Tierra, Luna y cielo, con el bloom aún reservado en ellas). Cada celda: FPS mínimo · VRAM (MB) · llamadas de dibujo.

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| sistema | 59 · 50 · 36 | 60 · 50 · 36 | 59 · 38 · 21 |
| Sol de cerca | 60 · 132 · 20 | 59 · 68 · 20 | 60 · 56 · 5 |
| vista Tierra | 59 · 278 · 6 | 60 · 86 · 6 | 59 · 86 · 6 |
| vista Luna | 60 · 266 · 5 | 59 · 103 · 5 | 60 · 62 · 5 |
| cielo | 59 · 39 · 5 | 60 · 39 · 5 | 60 · 38 · 5 |

**Tamaños y semiejes de la vista general** (en radios de su planeta; `MOON_SYSTEMS`, del catálogo):

| Luna | Radio real | Antes (fase 4b) | Ahora | Semieje ahora (real) |
|---|---|---|---|---|
| Luna | 27,2 % | 59,4 % | 42,9 % | 1,83 (60,3) |
| Fobos · Deimos | 0,3 · 0,2 % | 10,1 · 9,2 % | 2,4 · 1,7 % | 1,34 · 1,74 (2,8 · 6,9) |
| Ío · Europa · Ganímedes · Calisto | 2,5 · 2,2 · 3,7 · 3,4 % | 23,0 · 21,7 · 26,7 · 25,8 % | 9,2 · 8,3 · 11,7 · 11,0 % | 1,40 · 1,79 · 2,23 · 2,72 (5,9 · 9,4 · 15,0 · 26,3) |
| Mimas · Encélado · Tetis · Dione · Rea | 0,3 · 0,4 · 0,9 · 0,9 · 1,3 % | 10,2 · 11,2 · 15,1 · 15,4 · 17,4 % | 2,4 · 2,8 · 4,6 · 4,8 · 5,8 % | 2,65 · 2,84 · 3,02 · 3,24 · 3,48 (3,1 · 3,9 · 4,9 · 6,3 · 8,7) |
| Titán · Jápeto | 4,3 · 1,2 % | 28,3 · 17,2 % | 12,9 · 5,7 % | 3,99 · 4,63 (20,3 · 59,1) |
| Miranda · Ariel · Umbriel · Titania · Oberón | 0,9 · 2,3 · 2,3 · 3,1 · 3,0 % | 15,3 · 22,0 · 22,1 · 24,9 · 24,5 % | 4,8 · 8,5 · 8,6 · 10,4 · 10,2 % | 1,35 · 1,64 · 2,01 · 2,42 · 2,86 (5,1 · 7,5 · 10,4 · 17,1 · 22,8) |
| Proteo · Tritón | 0,8 · 5,5 % | 14,8 · 31,3 % | 4,5 · 15,1 % | 1,35 · 1,82 (4,8 · 14,3) |

Las de Saturno empiezan en 2,65 radios: el borde exterior del anillo A está a 2,27.

### Entrega 9b.d (D42, D43 y D45)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Ninguna luna como bola lisa de color plano, salvo Titán (por su neblina): la rejilla de las 20 | ✅ | `antes-` y `despues-lunas-rejilla.webp` (§7; el «antes», del build de `8165610`, sin la entrega): antes, Deimos, Miranda, Ariel, Umbriel, Titania, Oberón y Proteo eran discos de un color; ahora, todas con mapa (Proteo, con cráteres generados). Titán, sin superficie a propósito (su neblina), con el terminador suave de abajo. |
| Fobos, Deimos y Proteo con su forma real y sus medidas (los semiejes de la malla frente a los publicados, con test) | ✅ Fobos y Deimos · ⚠️ Proteo | Las de Fobos y Deimos, de los DSK del NAIF (decisión de Iván del 06-11), en una rejilla de radios (`scripts/build-shapes.mjs`): el elipsoide ajustado, Fobos **13,11 × 11,39 × 9,27 km** (NASA: 13,0 × 11,4 × 9,1) y Deimos **7,78 × 6,02 × 5,35** (7,8 × 6,0 × 5,1), a menos de 0,5 km, con sus ejes a menos de 8° de los del cuerpo; el radio del volumen equivalente, 11,11 y 6,23 km (el catálogo: 11,08 y 6,2). Stickney (Gazetteer, Feature/5707), una depresión de 1,01 km en su sitio (0,24 girada 180°, 0,11 reflejada): la forma no está girada ni reflejada. Tests: `scene/shapes.spec.ts` (13: los binarios decodificados, los semiejes, el volumen, el eje largo hacia el meridiano 0 —hacia Marte con la rotación síncrona— y Stickney; y, con elipsoides sintéticos, el radio de cada vértice y las normales a menos de 1°, también en los polos y en la costura de ±180°) y `engine.spec.ts` (se piden con su mapa, una vez; la geometría se rehace al cambiar de calidad y se libera al cerrar). **Proteo, como esfera:** su forma de Stooke solo se baja a mano y `assets-src/shapes/` no la tiene (decisión de Iván del 06-11; `PENDIENTES.md`). |
| Los mapas nuevos, con sus sondas en el build, y la licencia de cada fichero en `FUENTES.md` | ✅ | Deimos y las cinco de Urano, los mapas del JPL (D43). Sin georreferencia: su convención de longitud, la única de las cuatro posibles con la que pasan las sondas (Wunda, clara, y Hamlet, oscura, con su claridad en pies de foto de la NASA; los bordes de Yangoor y Domovoy) y con la que fallan las otras tres; en las demás, sondas que fallan giradas o reflejadas (Verona Rupes, Belmont Chasma y Ursula, Swift). En `FUENTES.md`, fila a fila, con su SHA-256. |
| Jápeto: el contraste de sus dos caras, medido frente a los albedos publicados | ✅ | El material oscuro de su hemisferio delantero (el 37,5 % de la luna) frente a su hemisferio trasero: **de 0,537 a 0,073** en el mapa; la NASA: «albedo 0.03-0.05» y «0.5-0.6» (0,04 / 0,55 = 0,073). En la escena, el hemisferio trasero, a 0,55 (`TEXTURE_ALBEDO_REFERENCE`): antes, la media del mapa iba al 0,05 del catálogo (su cara oscura) y las dos caras salían oscuras. |
| §5 en las vistas de los sistemas de lunas (FPS, VRAM y memoria tras 10 vueltas) | ✅ (provisional: se repite al cerrar la fase, con el equipo libre) | `measure-views.mjs` (tabla abajo; con la sesión de la 9c y un build de texturas en marcha en el mismo equipo): **59–60 FPS de mínimo en las 15 vistas de los tres niveles** (§5: ≥ 55 en alto). Los sistemas de lunas, de 43 a 138 MB de VRAM (lo más alto, Marte de cerca en alto, con su 4K, sus dos lunas con su mapa y sus formas) y de 5 a 12 llamadas de dibujo; lo más alto de todas, la vista Tierra en alto, 278 MB de 300, como antes. `measure.mjs`: tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas, 11 MB de heap (como al empezar), un contexto WebGL y 25 texturas; las geometrías, de 15 a 17 tras las vueltas por las lunas: las dos de más son las formas de Fobos y Deimos, que se conservan (una por luna, también tras más vueltas: test en `engine.spec.ts`) y se rehacen al cambiar de calidad. |
| D45: capturas de cada luna afectada desde seis direcciones y la rejilla de las 20: ni zonas grises lisas, ni manchas borrosas, ni costuras, ni repeticiones, ni pellizcos en los polos | ✅ (con tres notas) | `d45-<luna>-seis-vistas-{antes,despues}.webp` de las 18 lunas con mapa y Proteo (`scripts/capture-moon-views.mjs`, sobre la textura de 2k que carga la escena; el «antes», la del commit anterior), y la rejilla. **Notas:** la recta de la longitud 180° de Miranda y de Titania, las uniones de las láminas de la carta de Deimos y el contorno claro con el que esa carta cierra lo cartografiado, y las sombras negras del terminador de las imágenes de la Voyager junto a lo no visto ya están en el mapa del JPL (son datos reales, que D45 no deja tocar); y el norte recreado de Miranda tiene relieve, pero menos contraste que su sur (fotografiado con el Sol bajo): para Iván, en `PENDIENTES.md`. |
| D45: el grano de lo recreado, del 70 al 130 % del de lo real vecino; en el borde con lo real, ningún salto de brillo medio de más de ΔL* 2 | ✅ el grano · ⚠️ el borde: medido con un criterio cambiado, **pendiente del OK de Iván** (§4 y §9; revisión de la fase 9b, hallazgo 1). En valor absoluto, con esa misma medida, el percentil 95 llega a 7,98 (Dione), 6,91 (Miranda) y 6,35 (Oberón) con lo no visto, y a 12,71 (Titania) y 7,98 (Mimas) con lo visto de lejos | Las 18 (`docs/datos/recreacion-lunas.md`, GENERADO): el grano, **de 0,93 a 1,26** (antes de recrear, de 0,45 a 0,94, salvo Deimos, 1,70). El borde, por teselas de 64 texeles (el brillo medio con σ = 4 a cada lado): con lo no visto, como mucho 1,23 L* por encima de lo natural en el percentil 95 (Dione) y por debajo en el máximo; con lo visto de lejos, por debajo del salto que ya tenía el mosaico en ese borde en las 18. |
| D45: lo real, sin cambios (las sondas y el test de la zona real) | ✅ | En el build (`moon-map-build.mjs`, que hace fallar el build): lo real, **igual byte a byte** antes de comprimir (falla si un solo canal cambia) y, en el WebP de 2k, dentro de la tolerancia de su compresión (el error medio frente al mosaico, como mucho el del propio mosaico comprimido igual + 10 %: de 1,07 a 3,11 niveles de 255, frente a 1,09–3,25); las sondas de cada mosaico, otra vez sobre el mapa recreado y solo sobre lo real. Una sonda que cae sobre todo en lo recreado no se mide ahí (Burr en Calisto, Parwez en Encélado, Philoetius en Tetis; en Deimos y Miranda, su única sonda, Swift y Verona Rupes, y se dice): ya pasó en el mosaico, y lo real queda igual byte a byte. Jápeto, con su dicotomía después de recrear (§4). |
| D45: los porcentajes de lo real, lo visto de lejos y lo recreado de cada luna, en el informe y en `FUENTES.md` | ✅ | Tabla de abajo; en `FUENTES.md`, en `docs/datos/recreacion-lunas.md` y en `/creditos#lunas-recreadas`. |
| D45: las fichas, `/creditos` y `/sobre-el-proyecto` lo dicen | ✅ | Las fichas de las 18 lunas con mapa y Proteo, una línea sobre su mapa (`mapNote`, `reviewed: false`): con fuente de la NASA en Tritón («Voyager photographed two-thirds…»), las cinco de Urano («the Sun illuminated only the southern hemispheres…») y Proteo; en las demás, sin fuente externa y con el enlace a «Cómo se recrea». `/creditos`: los mapas del JPL, las formas del NAIF y lo recreado, con su tabla. «Lo que es ilustrativo»: lo recreado, Proteo y las sombras de Fobos y Deimos. |

**§5 por vista y nivel en la 9b.d** (`measure-views.mjs`, provisional; cada celda: FPS mínimo · VRAM (MB) · llamadas de dibujo):

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| sistema | 59 · 50 · 36 | 60 · 50 · 36 | 59 · 38 · 21 |
| Marte de cerca (Fobos y Deimos con su mapa y su forma) | 59 · 138 · 7 | 59 · 74 · 7 | 59 · 62 · 7 |
| Saturno de cerca | 60 · 106 · 12 | 59 · 74 · 12 | 60 · 62 · 12 |
| Dione | 60 · 74 · 5 | 59 · 74 · 5 | 60 · 54 · 5 |
| Júpiter y sus lunas | 59 · 100 · 7 | 59 · 68 · 7 | 60 · 56 · 7 |
| Europa | 60 · 68 · 5 | 60 · 68 · 5 | 60 · 48 · 5 |
| Tritón | 59 · 63 · 5 | 59 · 63 · 5 | 59 · 43 · 5 |
| Fobos | 60 · 63 · 5 | 60 · 63 · 5 | 60 · 43 · 5 |
| Urano y sus lunas (con los mapas del JPL) | 60 · 71 · 6 | 60 · 71 · 7 | 59 · 59 · 6 |
| Miranda | 59 · 71 · 5 | 59 · 71 · 5 | 59 · 51 · 5 |
| Deimos | 60 · 63 · 5 | 59 · 63 · 5 | 60 · 43 · 5 |
| Sol de cerca | 60 · 172 · 23 | 60 · 76 · 23 | 59 · 64 · 8 |
| vista Tierra | 60 · 278 · 6 | 59 · 86 · 6 | 59 · 86 · 6 |
| vista Luna | 60 · 266 · 7 | 59 · 103 · 7 | 60 · 62 · 7 |
| cielo | 59 · 39 · 5 | 60 · 39 · 5 | 59 · 38 · 5 |

En el Sol de cerca, 172 MB y 23 llamadas en alto (en la 9b.c, 132 y 20): con las tres vistas nuevas del recorrido (Urano, Miranda y Deimos, cada una con 5 s a 1 día/s), el Sol se mide unos 15 días más tarde, con Venus grande junto a él, que pide su textura de 4K (el único fichero de ese paso); dentro de §5.

**D45, cada luna** (`docs/datos/recreacion-lunas.md`, GENERADO por el build, con el salto en el borde, el enfoque, lo real en el WebP y la máscara de cada una). Los porcentajes, por el área de la esfera; el grano de lo recreado frente a lo real vecino (entre paréntesis, el del mapa antes de recrear):

| Luna | Real | Visto de lejos | No visto | Grano |
|---|---|---|---|---|
| Fobos | 91,7 % | 8,3 % | 0,0 % | 1,02 (0,94) |
| Deimos | 55,5 % | 32,7 % | 11,8 % | 1,26 (1,70) |
| Ío | 82,9 % | 17,1 % | 0,0 % | 0,99 (0,81) |
| Europa | 80,0 % | 19,5 % | 0,5 % | 0,98 (0,45) |
| Ganímedes | 97,9 % | 1,6 % | 0,5 % | 0,97 (0,47) |
| Calisto | 87,5 % | 11,5 % | 1,0 % | 1,00 (0,79) |
| Mimas | 80,0 % | 20,0 % | 0,0 % | 0,97 (0,76) |
| Encélado | 74,1 % | 25,9 % | 0,0 % | 0,98 (0,90) |
| Tetis | 79,8 % | 20,2 % | 0,0 % | 0,97 (0,78) |
| Dione | 87,3 % | 12,7 % | 0,0 % | 0,95 (0,49) |
| Rea | 92,6 % | 7,4 % | 0,0 % | 0,96 (0,53) |
| Jápeto | 69,2 % | 30,8 % | 0,0 % | 0,96 (0,53) |
| Tritón | 30,6 % | 36,1 % | 33,4 % | 0,98 (0,55) |
| Miranda | 30,5 % | 8,9 % | 60,6 % | 0,96 (0,53) |
| Ariel | 24,5 % | 8,8 % | 66,7 % | 0,95 (0,57) |
| Umbriel | 35,3 % | 1,1 % | 63,6 % | 0,95 (0,71) |
| Titania | 30,9 % | 0,4 % | 68,6 % | 0,93 (0,48) |
| Oberón | 33,5 % | 0,0 % | 66,5 % | 1,06 (0,71) |

En Tritón, lo real y lo visto de lejos suman dos tercios (66,7 %), lo que dice la NASA («Voyager photographed two-thirds of Neptune's largest moon Triton»); en las cinco de Urano, lo no visto es su norte (la Voyager 2 las vio con el Sol sobre su hemisferio sur). Proteo no tiene mosaico: su superficie es entera generada (un campo de 13 049 cráteres, ilustrativo).

### Entrega 9b.f (D46): el Sol (sesión A y segunda vuelta)
**Dos vueltas.** La primera (sesión A, hasta `31a7a19`) cumplía los criterios de la adenda: de cerca, el centro a h 83° y C\* 48,2 y el borde a h 79° y C\* 51,7 (la referencia: 81° y 51,5; 76° y 53,4), con σL\* 5,65 (4,13). Pero a Iván no le gustó. El 08-11 dijo: «Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo». Las protuberancias se veían como bultos sólidos en el limbo y, en la vista general, el bloom lavaba el disco hasta dejarlo color crema. Decidió rehacerlo.

La **segunda vuelta** se hizo en `fase-9b-f-sol-2`, desde `d765654`, con la Tierra ya junta. Sus criterios son más estrictos que los de la adenda: de cerca, el h a ±5° y el C\* al menos el 90 %; y el disco, naranja y sin lavar también en la vista general. Iván la aprobó el 08-11 («el sol le doy aprobado») y se juntó aquí con `--no-ff` (`fb3d021`). Lo de abajo es la segunda vuelta; las cifras de la primera quedan en las tablas, como registro.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas antes, después y referencia, lado a lado: el Sol de cerca y en la vista general, en escritorio y móvil | ✅ (la referencia, solo en local) | `sol2-antes-d46-*` (el Sol de la primera vuelta, del build de `d765654`) y `sol2-despues-d46-*`, de `escritorio-sol-cerca`, `movil-sol-cerca`, `escritorio-sol-sistema` y `movil-sol-sistema` (§7), con `scripts/capture-d46.mjs` en la fecha de la referencia (15-01-2026). Lado a lado con la referencia, con `--prefijo=sol2-despues --antes=sol2-antes --comparar`, en `assets-src/referencias/comparativas/sol2-despues-d46-*.png`: esa carpeta la ignora git, porque la referencia no se sube (§4). Las de la primera vuelta, `antes-` y `despues-d46-*-sol-*` (su «antes», del build de `43072d6`). |
| De cerca, frente a la referencia: el h del centro y del borde, a ±5°; el C\*, al menos el 90 % del suyo (la adenda pedía ±10° y el 80 %) | ✅ | `scripts/measure-d46.mjs --solo=sol`, con `scripts/lib/disc-metrics.mjs`: lo mismo, medido igual en las dos (tabla abajo). **Escritorio:** el centro (μ > 0,9), h 81° (la referencia, 81°) y C\* 51,4 (51,5: el 100 %); el borde (μ de 0,15 a 0,35), h 75° (76°) y C\* 56,1 (53,4: el 105 %). **Móvil:** el centro, h 81° (81°) y C\* 51,3 (el 100 %); el borde, h 74° (76°) y C\* 56,3 (el 105 %). |
| En la vista general, el disco naranja y sin lavar, medido | ✅ | `measure-d46.mjs --solo=sol` mide ahora también la vista general, en la referencia y en lo nuestro: el centro, el borde y el resplandor (la mediana de L\* a 1,5, 2 y 3 radios, con la del fondo a 6). **Escritorio:** el centro, L\* 79,8 · C\* 51,3 · h 81° (la referencia, 80,9 · 49,8 · 83°); el resplandor, L\* 13,2 a 1,5 radios y 8,2 a 2, sobre un fondo de 6,0 (la referencia, 13,1 y 9,1 sobre 1,5). **Móvil:** el centro, 79,8 · 51,4 · 81° (81,6 · 48,9 · 84°); el resplandor, 17,8 y 10,6 (12,7 y 8,6). **La primera vuelta** (escritorio, la misma medida): el centro, L\* 98,3 · C\* 21,3 · h 106°, casi blanco, y el resplandor, L\* 58,5 a 1,5 radios y 40,0 a 2: la mancha pálida. |
| El contraste a gran escala (σL\* sin el perfil del limbo), al menos el de la referencia, también a lo largo del tiempo | ✅ | **De cerca:** 4,75 en escritorio y 4,77 en el móvil (la referencia, 4,13 y 4,21). **A lo largo del tiempo:** 10 instantes de los primeros 5 minutos de reloj, de 0 a 300 s, dan de **4,66 a 5,57**. La primera versión de esta vuelta (`5b4d1de`) bajaba a 4,09 en algunos instantes, con zonas pardas. Se arregló con un límite suave de lo que oscurece y aclara (§5). |
| Sin cambios: la totalidad y el Sol de `/cielo` (las medidas de la 9b.c), las efemérides y las sombras | ✅ | `/cielo` (`scene/sky/`, otro shader) sale **igual píxel a píxel** en las dos vueltas. En la segunda, 0 canales distintos en las 5 capturas PNG del lienzo entre el build de `d765654` y el de después, también tras juntarla y arreglar el halo. Son la totalidad del 12-08-2026 desde Fraga (de cerca, de lejos y en el móvil), la puesta de Sol desde el Montsec y el Sol de cerca en el cielo. `CORONA_GLSL`, la corona que también usa `/cielo`, no cambia. `measure-sun.mjs`: la totalidad, con las cifras de la 9b.c (la Luna, L\* 12,0; el cielo lejos de la corona, L\* 19,3 · C\* 14,8 · h 283°; el horizonte, h 65° a 0,5°). El limbo de D41 con `?medida=limbo` (el Sol sin realzar): α R 0,429 · G 0,511 · B 0,629, como antes. Las efemérides y las sombras: sus tests, en `npm run check`. |
| §5 en los tres niveles (FPS, VRAM, llamadas de dibujo y memoria), con los bucles de plasma | ✅ (provisional: con otras sesiones en el mismo PC; se repite al cerrar la fase) | `measure-views.mjs` y `measure.mjs` (tabla abajo): **59–60 FPS de mínimo en todas las vistas de los tres niveles**. Sin el bloom, menos memoria y menos llamadas: la vista general, 38 MB y 21 llamadas en los tres niveles (en la primera vuelta, 50 y 36 en alto y medio); el Sol de cerca en alto, 161 MB y 8 llamadas (172 y 23). La memoria, estable: 11 MB de heap, 12 texturas (25 en la primera vuelta, 13 de ellas del bloom) y un contexto WebGL. |
| Con movimiento reducido, todo quieto | ✅ | **Tests en `engine.spec.ts`:** con movimiento reducido y en las capturas, el tiempo de la superficie, de la granulación y de los bucles se queda en 0 y no hay frames de más. **En uso real** (`scripts/capture-sun-motion.mjs`, sin el modo de captura y con `?fecha=`, que arranca en pausa): dos capturas del lienzo separadas 6 s cambian 7,5 de 255 de media en el disco y 0,3 fuera; con `prefers-reduced-motion`, 0,00 y 0,00. |
| El movimiento, visible y lento (lo pedía la segunda vuelta) | ✅ | Las mismas capturas (`sol2-movimiento-t0` y `-t6`): en 6 s la superficie cambia de forma, sin saltos; en un minuto, del todo. Los bucles respiran y se mecen en decenas de segundos, y se encienden y se apagan en unos minutos. En la primera vuelta, con el tiempo en pausa el motor dejaba de pintar y el Sol se quedaba quieto; ahora, de cerca, pinta cada 50 ms (§4). |
| Los textos de «realzado», en sus tres sitios (la parte del Sol) | ✅ | La línea del Sol va en su ficha, con fuente de la NASA y `reviewed: false`, y enlaza a «Lo que es ilustrativo». La fuente es el SVS: «In photos, the Sun appears white…» y que los datos del SDO se pasan a colores; `build-body-texts.mjs` comprueba las citas. El panel del Sol del explorador (`features/body-panel`, con su test) la lleva desde que la sesión C trajo la 9c. Las dos frases de «Lo que es ilustrativo» que la segunda vuelta dejó atrás, al día en el cierre. |

**El Sol, medido** (`measure-d46.mjs --solo=sol`, el 15-01-2026, en CIELAB). Las cifras de la segunda vuelta salen iguales en su rama (`315c1a9`) y tras juntarla con el halo arreglado (`d881476`).

| | Centro (μ > 0,9) | Borde (μ 0,15–0,35) | σL\* |
|---|---|---|---|
| Referencia, de cerca, escritorio | L\* 78,6 · C\* 51,5 · h 81° | 71,8 · 53,4 · 76° | 4,13 |
| Referencia, de cerca, móvil | 78,6 · 51,5 · 81° | 71,6 · 53,6 · 76° | 4,21 |
| Primera vuelta, de cerca, escritorio | 78,8 · 48,2 · 83° | 66,4 · 51,7 · 79° | 5,65 |
| Primera vuelta, de cerca, móvil | 79,3 · 48,1 · 83° | 65,4 · 51,6 · 78° | 5,31 |
| **Segunda vuelta, de cerca, escritorio** | **79,7 · 51,4 · 81°** | **69,8 · 56,1 · 75°** | **4,75** |
| **Segunda vuelta, de cerca, móvil** | **79,8 · 51,3 · 81°** | **69,3 · 56,3 · 74°** | **4,77** |
| Referencia, vista general, escritorio | 80,9 · 49,8 · 83° | 59,8 · 50,0 · 68° | — |
| Referencia, vista general, móvil | 81,6 · 48,9 · 84° | 53,1 · 41,0 · 74° | — |
| Primera vuelta, vista general, escritorio | 98,3 · 21,3 · 106° | 93,4 · 38,1 · 97° | — |
| **Segunda vuelta, vista general, escritorio** | **79,8 · 51,3 · 81°** | **69,2 · 56,9 · 74°** | — |
| **Segunda vuelta, vista general, móvil** | **79,8 · 51,4 · 81°** | **69,0 · 57,3 · 74°** | — |

En la vista general, nuestro disco mide 30,9 px de radio en escritorio y 19,2 px reales en el móvil; el de la referencia, 15,3 y 7,7. Por eso su σL\* no se compara. Antes de la 9b.f (el Sol de la 9b.c), el centro de cerca era casi blanco: L\* 94,8 · C\* 3,7 · h 71°, con σL\* 0,51.

**El disco, por dentro** (μ > 0,5, de cerca, escritorio, en el instante de la captura):

| | L\* p5 · p50 · p95 | Lo oscuro (el 10 %) |
|---|---|---|
| Referencia | 68,1 · 77,8 · 84,2 | C\* 59,6 · h 72° |
| Segunda vuelta | 65,7 · 77,5 · 85,4 | C\* 62,0 · h 72° |

**El halo, de cerca** (la mediana de L\* y su tono en anillos fuera del disco, escritorio):

| ρ (radios) | 1,02 | 1,05 | 1,10 | 1,20 | 1,50 |
|---|---|---|---|---|---|
| Referencia (fondo L\* 1,5) | 20–32 · 44–48° | ~11 · ~36° | 4,6 · 23° | 2,0 | 1,5 |
| Primera vuelta (fondo 6) | 57,7 · 70° | 54,0 · 72° | 47,7 · 72° | 38,6 · 73° | 24,8 · 74° |
| Segunda vuelta (fondo 6) | 28,6 · 56° | 21,5 · 54° | 14,9 · 27° | 9,0 | 6,0 |

**§5 de la segunda vuelta, provisional.** `measure-views.mjs` con una RTX 3060 con ANGLE sobre D3D11, sobre el build de `315c1a9` y con otras sesiones en el mismo PC; se repite al cerrar la fase. En todas las vistas de los tres niveles, 59–60 FPS de mínimo. Las del Sol, en FPS mínimo · VRAM (MB) · llamadas de dibujo:

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| Sistema, segunda vuelta | 59 · 38 · 21 | 60 · 38 · 21 | 60 · 38 · 21 |
| Sistema, primera vuelta (con bloom en alto y medio) | 60 · 50 · 36 | — · 50 · 36 | — · 38 · 21 |
| Sol de cerca, segunda vuelta | 59 · 161 · 8 | 59 · 65 · 8 | 59 · 64 · 8 |
| Sol de cerca, primera vuelta | 59 · 172 · 23 | 59 · 76 · 23 | 59 · 64 · 8 |
| Vista Tierra, segunda vuelta | 60 · 278 · 6 | 60 · 86 · 6 | 59 · 86 · 6 |
| Cielo, segunda vuelta | 59 · 39 · 5 | 60 · 39 · 5 | 59 · 38 · 5 |

En la primera vuelta no se midieron los FPS de la vista general en medio y en bajo (—). El shader nuevo del disco (cinco octavas de ruido, la granulación y las manchas) y el del halo (el borde, los rayos y tres bucles de 14 hilos) no bajan los FPS: el Sol de cerca gasta 0,98 ms de CPU por frame en alto. La VRAM más alta sigue siendo la de la vista Tierra en alto, 278 MB de 300.

`measure.mjs`, sobre el mismo build:
- **Reposo:** en la vista general en pausa, 0 frames y 0 `requestAnimationFrame` en 3 s. El pintado cada 50 ms solo va con el Sol de cerca.
- **Reproducción a 1 día/s:** 60 FPS de mínimo en los tres niveles, con 1,37 ms de CPU por frame en alto (en la primera vuelta, 1,83, con el bloom).
- **Arranque:** sin tareas largas, porque la compilación del bloom ya no está (en la 9b.c, de 53 a 124 ms). LCP, 232 ms en alto.
- **Memoria:** estable tras las idas y vueltas, los cambios de vista y de calidad y las vueltas por las lunas: 11 MB de heap, 12 texturas y un contexto WebGL.
- **Contexto WebGL perdido y recuperado:** 0 frames mientras falta y uno al volver.

El arreglo del halo tras juntarla (`d881476`, §4) no cambia estas cifras. De cerca, las capturas salen iguales: 197 píxeles cambian, con 1 nivel de diferencia como mucho. En la vista general y en la miniatura cambian solo los píxeles de los puntos.

### Entrega 9b.f (D46): la Tierra (sesión B)
Hecha en `fase-9b-f-tierra` (desde `d5ce7f8`, con la base común `43072d6`) y juntada aquí el 08-11 (§4). Todo está en el shader de la Tierra (`body-material.ts`, `TLS_EARTH`) y en `VISUAL_CONFIG.earth.enhanced`, con su porqué: las texturas no cambian.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Capturas antes, después y referencia, lado a lado, en escritorio y móvil: la Tierra completa (de día, con África y Europa), el Pacífico y el Himalaya | ✅ (la referencia, solo en local) | `antes-` y `despues-d46-{escritorio,movil}-{tierra-completa,pacifico,himalaya}` (§7; el «antes», del build de partida, `d5ce7f8`), con `scripts/capture-d46.mjs --solo=d46-…`. Lado a lado con la referencia, con `--comparar`, en `assets-src/referencias/comparativas/` (ignorada: la referencia no se sube). |
| Los océanos frente a la referencia: h a ±10° y C\* ≥ 80 % del suyo | ✅ | Tabla de abajo. En escritorio, el Atlántico sur, **h 275°** (la referencia, 277°) y **C\* 33,1** (mínimo, 21,7); el Índico, **h 281°** (286°) y **C\* 32,6** (mínimo, 16,6). En el móvil, 272° / 276° y 281° / 288°, con C\* 32,9 y 32,2 (mínimos, 19,9 y 23,9). |
| La fracción de nubes del disco, a ±10 puntos de la de la referencia | ✅ | **El 1,5 %** en escritorio y el 1,0 % en el móvil (la referencia, el 0,7 %; antes, el 9,8 % y el 8,7 %). |
| El reflejo, visible y sin quemar: el máximo, por debajo del blanco puro | ✅ | **243 de 255** de máximo en los dos (antes, 231 y 225, con un reflejo mucho más pequeño); en las capturas, un lóbulo cian ancho, como el de la referencia. |
| Sin cambios: la Tierra de noche (L\* ≤ 5 y C\* ≤ 3, D40) | ✅ | `scripts/measure-earth-night.mjs`, antes (`d5ce7f8`) y después, iguales (tabla de abajo): el suelo sin luces, **L\* 0,2 · C\* 0,2** en escritorio y 0,1 · 0,1 en el móvil; las luces, h 94°. En la vista general de noche (19-05-2026), el disco, con **ΔL\* 4,1** frente al fondo, como antes. |
| Sin cambios: las efemérides y las sombras | ✅ | Nada de `ephemeris/` ni de las sombras (`tlsShadow`, `uOccluderLocal`, `uSunLocal`) cambia; sus tests, en `npm run check`. |
| §5 en los tres niveles (FPS, VRAM, llamadas de dibujo y memoria) | ✅ (provisional: con tres sesiones en el mismo PC; se repite al cerrar la fase) | `measure-views.mjs`: la vista Tierra, **59 · 278 MB · 6** en alto, 59 · 86 · 6 en medio y 60 · 86 · 6 en bajo (FPS mínimo · VRAM · llamadas de dibujo), como en la 9b.d: ni texturas ni mallas nuevas, solo unas operaciones más en su shader. Las demás vistas, en la tabla de §5 de abajo. `measure.mjs` (la vista general a 1 día/s): **60 · 59 · 60 FPS** de mínimo y 1,6 · 1,5 · 1,2 ms de CPU por frame (el build de partida, medido justo antes: 1,7 · 1,5 · 1,1); la primera pasada dio 44, 26 y 39 FPS con 26 ms por frame, con el equipo cargado por las otras sesiones. La memoria, estable: tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas, 11 MB de heap, un contexto WebGL y 25 texturas. |
| Con movimiento reducido, todo quieto | ✅ | La Tierra realzada no añade nada que dependa del tiempo: el reflejo y las nubes son función de la geometría; la deriva de las nubes, la de siempre, se para con movimiento reducido y en las capturas (sus tests). |
| Los textos de «realzado», en sus sitios (la parte de la Tierra) | ✅ | Un punto nuevo en «Lo que es ilustrativo» de `/sobre-el-proyecto`; `/creditos` (las texturas: la Tierra en color realzado, ajustada al principio con EPIC); y la vista guiada «La Tierra completa», que ya no dice «como la fotografía la cámara EPIC» (fuente: https://science.nasa.gov/earth/facts/, «Earth's global ocean, which covers about 71% of the planet's surface…»). `docs/FUENTES.md`: la línea de `earth-day`. |

**Las medidas frente a la referencia** (`scripts/measure-d46.mjs --solo=tierra`, el 15-01-2026 a las 00:00 UTC: la Tierra completa, con África y Europa de día). Mediana en CIELAB; en el agua, sin el 50 % más claro (nubes y reflejo). Cada celda: L\* · C\* · h, en escritorio — en el móvil.

| Región | Referencia | Antes | Después |
|---|---|---|---|
| Atlántico sur | 17,8 · 27,1 · 277° — 15,9 · 24,9 · 276° | 25,6 · 18,7 · 270° — 26,1 · 17,4 · 270° | **30,5 · 33,1 · 275°** — 34,3 · 32,9 · 272° |
| Índico | 6,6 · 20,8 · 286° — 10,9 · 29,9 · 288° | 25,7 · 19,6 · 272° — 24,3 · 19,1 · 272° | **22,7 · 32,6 · 281°** — 21,8 · 32,2 · 281° |
| Sáhara | 64,7 · 19,8 · 81° — 63,0 · 19,6 · 77° | 49,0 · 9,7 · 67° — 49,0 · 9,7 · 67° | **62,2 · 23,4 · 81°** — 62,2 · 23,4 · 81° |
| Sahel | 53,4 · 25,1 · 105° — 53,7 · 23,5 · 90° | 61,4 · 5,5 · 73° (nubes) — 61,7 · 5,5 · 73° | **58,0 · 27,4 · 83°** — 57,8 · 27,6 · 83° |
| Amazonas oriental | 50,4 · 25,0 · 122° — 36,7 · 29,3 · 264° | — — 28,0 · 5,8 · 199° | — — 29,3 · 14,3 · 152° |
| Nubes (fracción del disco) | 0,7 % — 0,7 % | 9,8 % — 8,7 % | **1,5 %** — 1,0 % |
| Reflejo (máximo) | — | 231 — 225 | **243** — 243 |

«—»: menos de 200 px de esa región con μ ≥ 0,3 (en nuestra vista, el Amazonas oriental cae junto al limbo izquierdo). El Sáhara, ya en el tono y el brillo de la referencia (h 81°, L\* 62 frente a 65), con algo más de croma. El Sahel, más naranja que el de la referencia (h 83° frente a 90–105°): sus píxeles son áridos para el shader, así que el tinte de la vegetación no los toca; la adenda pide medirlo, sin umbral. Por L\*, el Atlántico sale más claro que el de la referencia (30 frente a 18): la región de la referencia cae junto al limbo, más oscuro con su luz.

**Lo que no cambia: la noche** (`measure-earth-night.mjs`, el build de partida y el de la rama):

| Medida | Antes (`d5ce7f8`) | Después |
|---|---|---|
| «Las luces de la noche», escritorio: el suelo sin luces | L\* 0,2 (p95 0,8) · C\* 0,2 (p95 1,2) | L\* 0,2 (p95 0,8) · C\* 0,2 (p95 1,2) |
| Lo mismo, móvil | L\* 0,1 (0,5) · C\* 0,1 (0,8) | L\* 0,1 (0,5) · C\* 0,1 (0,8) |
| Las luces (el 2 % más brillante), escritorio — móvil | L\* 66,1 · C\* 27,3 · h 94° — 59,6 · 26,0 · 94° | L\* 66,2 · C\* 27,3 · h 94° — 59,8 · 26,0 · 94° |
| Vista general, la Tierra de noche (19-05-2026, 8,1 px) | disco L\* 26,7 · C\* 1,1; ΔL\* 4,1 | disco L\* 26,7 · C\* 1,1; **ΔL\* 4,1** |
| Vista general, de lado (08-04-2026, 7,7 px) | disco L\* 24,9; ΔL\* 9,7 | disco L\* 23,1; ΔL\* 7,9 (su mitad de día, realzada) |

**El registro de EPIC** (`measure-earth-epic.mjs`, tarea 15: ya no es criterio). La relación de brillo océano / desierto, conjunta: EPIC, 0,178; antes, 0,189 (1,06 veces la de EPIC); después, **0,108** (0,61 veces): el desierto, más claro, y el océano, de su azul. Las nubes, en el percentil 98: antes, 0,603–0,696; después, 0,488–0,504 (menos nubes y menos opacas).

**§5, provisional** (`measure-views.mjs` en la rama de B, con una RTX 3060 con ANGLE sobre D3D11, mientras trabajaban también A y C; se repite al cerrar la fase con el equipo libre). Cada celda: FPS mínimo · VRAM (MB) · llamadas de dibujo.

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| sistema | 60 · 50 · 36 | 60 · 50 · 36 | 60 · 38 · 21 |
| marte (primer plano) | 60 · 138 · 7 | 60 · 74 · 7 | 59 · 62 · 7 |
| saturno (primer plano) | 60 · 106 · 12 | 59 · 74 · 12 | 59 · 62 · 12 |
| dione (luna de saturno) | 60 · 74 · 5 | 59 · 74 · 5 | 59 · 54 · 5 |
| jupiter (sus lunas) | 60 · 100 · 7 | 59 · 68 · 7 | 59 · 56 · 7 |
| europa (luna de jupiter) | 59 · 68 · 5 | 59 · 68 · 5 | 59 · 48 · 5 |
| triton (luna de neptuno) | 60 · 63 · 5 | 59 · 63 · 5 | 59 · 43 · 5 |
| fobos (luna de marte) | 60 · 63 · 5 | 58 · 63 · 5 | 59 · 43 · 5 |
| urano (sus lunas) | 60 · 71 · 6 | 60 · 71 · 6 | 60 · 59 · 7 |
| miranda (luna de urano) | 59 · 71 · 5 | 60 · 71 · 5 | 60 · 51 · 5 |
| deimos (luna de marte) | 60 · 63 · 5 | 59 · 63 · 5 | 60 · 43 · 5 |
| sol (primer plano) | 60 · 172 · 23 | 59 · 76 · 23 | 60 · 64 · 8 |
| **tierra (vista)** | **59 · 278 · 6** | **59 · 86 · 6** | **60 · 86 · 6** |
| luna (vista) | 60 · 266 · 7 | 60 · 103 · 7 | 60 · 62 · 7 |
| cielo (vista) | 60 · 39 · 5 | 59 · 39 · 5 | 60 · 38 · 5 |

En la rama de B, el Sol todavía era el de la 9b.c: el Sol realzado no añade VRAM ni llamadas de dibujo (§2, el Sol), y la Tierra realzada tampoco, así que juntos dan las mismas cifras de memoria y de llamadas. Los FPS de los dos juntos, al cerrar la fase.

### Entrega 9b.e (D44): Venus «Bajo las nubes» (sesión C)
Hecha en `fase-9b-e-venus` y juntada aquí el 08-11 (`bdacb27`, §4). La rama sale de `d765654`; trae `main` (la 9c) en `940cc65` y el Sol de la segunda vuelta en `d19d06a`.

| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| Captura de Venus con las nubes y «Bajo las nubes», con Maat Mons en su sitio (sonda) | ✅ | **Capturas:** `venus-escritorio-nubes` y `-radar`, `venus-movil-nubes` y `-radar` (con la interfaz; en el móvil, la ficha abierta con «ⓘ»), y `venus-radar-maat-mons` (solo el lienzo, con Maat Mons señalado). El punto de 0,5° N y 194,6° E del Gazetteer, proyectado con la orientación de Venus y la cámara de la escena, cae sobre sus coladas, claras en el radar. La fecha, el 05-11-2026: Maat Mons de frente y a pleno sol (`capture-venus.mjs --buscar`). **Las sondas, en el build** (disco / anillo; tienen que pasar de 1,08): Maat Mons 1,12, Sapas Mons 1,33 y Maxwell Montes 1,39. Con el mapa girado 180°, 1,00 · 1,01 · 0,98; reflejado, 1,01 · 1,03 · 1,15: no pasan. |
| e2e del botón (teclado y `aria-pressed`) y axe sin violaciones | ✅ | **`e2e/venus.spec.ts`** (escritorio): con Intro, `aria-pressed="true"`, la textura de 4k pedida una vez (y no antes), el aviso visible y axe (WCAG 2.1 A y AA) sin violaciones graves ni críticas. Con espacio, vuelven las nubes. Con otro cuerpo, no hay botón, y de vuelta en Venus está apagado. `?radar=1` en captura. **`e2e/movil.spec.ts`:** en la hoja en reposo, el botón (44 px de alto) y, al tocarlo, el aviso a la vista; al cerrar la ficha, vuelven las nubes. |
| La licencia en `FUENTES.md` y en `/creditos` | ✅ | **`FUENTES.md`:** la fila de `venus-radar` (el producto, la URL, el SHA-256, «Access Constraints: public domain» y «Use Constraints: None» de su ficha, y lo que se le hace). **`/creditos`:** «Venus bajo las nubes», con el enlace a su ficha de Astropedia. **«Lo que es ilustrativo»:** el radar, en gris, con la luz del Sol y el brillo de sus nubes. |
| §5 con la textura cargada | ✅ (provisional; la vista general, repetida al cerrar: §5 de abajo) | **Con el radar:** en alto, 132 MB de VRAM (≤ 300) y las mismas 6 llamadas de dibujo; en medio y bajo, 68 y 56 MB (≤ 120 en bajo). FPS mínimo de 60, 59 y 59 a 1 día/s. **Tras 10 encendidos y apagados,** la misma VRAM; apagado, la de las nubes (90, 58 y 46 MB). |

**El radar de Magellan:**
- **El producto:** «Venus Magellan Global C3-MDIR Mosaic 2025m» del USGS Astrogeology (https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_mosaic_2025m).
  - El mosaico: 18 775 × 9388 px, 8 bits en gris, equirrectangular, 2025 m por píxel.
  - Su ficha: «Access Constraints: public domain», «Use Constraints: None»; originador, el PDS Geosciences Node; referencia, Ford et al. (1993).
  - Se usa el mosaico en gris (el radar tal cual), no el «Synthetic Color» ni el «Colorized Topographic».
  - Bajado con `download-assets.mjs` (176 335 453 bytes, SHA-256 `833d5368…01ec380`), sin verificación anti-bots.
- **Los huecos:** el 8,1 % del mapa vale 0: las franjas de las órbitas sin cubrir (de unos 25 px) y parte de los polos. En el radar, todo 0 es un hueco.
  - Se rellenan como los de las lunas: las rayas, con la media local de los lados; las zonas grandes, con el gris liso de la franja vecina.
  - Sin inventar relieve y sin la recreación de D45, que es de las lunas.
- **Las sondas:** Maat Mons, Sapas Mons y Maxwell Montes, más claros en el radar que lo que los rodea. Una sonda oscura (Lakshmi Planum, Mead o Atalanta Planitia) no se distingue a esta escala, así que no se usa.
- **Las texturas:** `venus-radar` en 1k (50 806 bytes), 2k (187 010) y 4k (653 204), con una luminancia media de 0,2382. El build de texturas se repitió entero: las demás texturas, las máscaras y los generados de las lunas salen idénticos.

**§5, provisional** (`capture-venus.mjs --medir`, Venus enfocada el 05-11-2026 a 1600 × 900, con otras sesiones en marcha). Cada celda: VRAM (MB) · llamadas de dibujo.

| Nivel | Con las nubes | Con el radar | FPS mínimo con el radar (1 día/s) · CPU por frame | Tras 10 encendidos y apagados | Apagado |
|---|---|---|---|---|---|
| Alto | 90 · 6 | **132 · 6** | **60** · 1,03 ms | 132 | **90** |
| Medio | 58 · 6 | **68 · 6** | **59** · 0,92 ms | 68 | **58** |
| Bajo | 46 · 6 | **56 · 6** | **59** · 0,87 ms | 56 | **46** |

- **El peso de la textura,** solo al pulsar: 638 kB en alto (4k) y 183 kB en medio y bajo (2k).
- **Al apagarlo,** la VRAM vuelve a la de las nubes, con una textura menos.
- **Al dejar Venus,** el estado pasa a «off» y el heap se queda en 13–14 MB.

### Cierre de la fase (08-11)
| Criterio | ✅/❌ | Evidencia |
|---|---|---|
| §5 en los tres niveles, con el equipo libre: FPS, VRAM, llamadas de dibujo, memoria tras vueltas y JS inicial | ✅ | **Las 15 vistas** (`measure-views.mjs`, tabla de abajo): **58–60 FPS** de mínimo en todas (§5: ≥ 55 en alto). La VRAM más alta, la vista Tierra en alto, **278 MB de 300**; en bajo, **86 de 120**. **La vista general a 1 día/s** (`measure.mjs`): **59 · 60 · 59 FPS** de mínimo, con 1,38 · 1,22 · 1,14 ms de CPU por frame y las efemérides a 0,19 ms (§5: ≤ 2). **Venus con el radar** (`capture-venus.mjs --medir`): 121 · 57 · 56 MB y 6 llamadas, con 60 · 59 · 60 FPS. **La memoria:** tras 10 idas y vueltas a una ficha, 10 cambios de vista, 6 de calidad y 10 vueltas por los sistemas de lunas, **11 MB de heap**, **un contexto WebGL** y **12 texturas**, como al empezar; las geometrías, de 14 a 16 tras las vueltas (las formas de Fobos y Deimos, que se conservan). **El arranque:** una tarea larga de 61 ms en alto y ninguna en bajo (§5: ninguna de más de 200), y el LCP, el póster (248 y 88 ms). **El JS inicial:** 315,27 kB, con el código propio en 13,81 kB de 15 (`npm run check`). |
| Lo ya medido y aprobado no cambia | ✅ | **La Tierra de noche** (`measure-earth-night.mjs`): el suelo sin luces, L\* 0,2 · C\* 0,2 en escritorio y 0,1 · 0,2 en el móvil; las luces, h 94°. En la vista general de noche, el disco frente al fondo, ΔL\* 8,0 y 9,6: con el Sol sin bloom, el fondo es más oscuro y el disco se lee mejor que antes (4,1 y 9,7). **La totalidad del cielo** (`measure-sun.mjs totalidad`): de 5° a 33° de altura, h de 282° a 285° y C\* de 11 a 20, como en la 9b.c; el suelo nuevo del cielo queda por debajo del horizonte. **Las sombras, los anillos y las efemérides**, sin cambios: sus tests, en verde. |
| Lo pendiente de §9 y del encargo del cierre | ✅ | **Las dos frases del Sol** de «Lo que es ilustrativo»: el borde, «con la ley medida, pero más suave» (en `/cielo`, el medido), y sin la corona de cerca; en `/creditos`, también el borde. **Los e2e intermitentes del CI**, arreglados en su causa (§4), con un e2e nuevo que reproduce el principal: sin el arreglo falla igual que en el CI («element(s) not found»), y con él pasa en 3,7 s. **Lo de la escena de la 9c** (backlog 17): la placa de las etiquetas y el suelo del cielo, con sus capturas (`cierre-*`, §7). |

**§5 con el equipo libre** (`measure-views.mjs`, con una RTX 3060 con ANGLE sobre D3D11). Cada celda: FPS mínimo · VRAM (MB) · llamadas de dibujo.

| Vista | Alto | Medio | Bajo |
|---|---|---|---|
| sistema | 60 · 38 · 21 | 59 · 38 · 21 | 60 · 38 · 21 |
| marte (primer plano) | 59 · 126 · 7 | 59 · 62 · 7 | 60 · 62 · 7 |
| saturno (primer plano) | 59 · 94 · 11 | 59 · 62 · 12 | 59 · 62 · 12 |
| dione (luna de saturno) | 59 · 102 · 6 | 59 · 70 · 5 | 59 · 62 · 5 |
| jupiter (sus lunas) | 59 · 89 · 7 | 59 · 57 · 7 | 60 · 56 · 7 |
| europa (luna de jupiter) | 60 · 97 · 5 | 59 · 65 · 5 | 59 · 56 · 5 |
| triton (luna de neptuno) | 60 · 52 · 5 | 59 · 51 · 5 | 59 · 43 · 5 |
| fobos (luna de marte) | 59 · 52 · 5 | 60 · 51 · 5 | 60 · 43 · 5 |
| urano (sus lunas) | 60 · 60 · 6 | 60 · 59 · 6 | 59 · 59 · 6 |
| miranda (luna de urano) | 60 · 68 · 5 | 60 · 67 · 5 | 60 · 59 · 5 |
| deimos (luna de marte) | 60 · 52 · 5 | 59 · 51 · 5 | 59 · 43 · 5 |
| sol (primer plano) | 59 · 38 · 8 | 60 · 38 · 8 | 59 · 38 · 8 |
| tierra (vista) | 60 · 278 · 6 | 59 · 86 · 6 | 60 · 86 · 6 |
| luna (vista) | 60 · 266 · 7 | 59 · 103 · 7 | 59 · 62 · 7 |
| cielo (vista) | 60 · 39 · 5 | 60 · 39 · 5 | 59 · 38 · 5 |

Frente a la 9b.d: la vista general y el Sol de cerca gastan menos (38 MB y 21 u 8 llamadas, frente a 50 MB y 36 o 23), porque el bloom está apagado desde la segunda vuelta del Sol. Las vistas Tierra y Luna, igual. Las lunas, algo distinto según la fecha y el encuadre de la interfaz de la 9c.

## 3. Tareas del plan
| Tarea | Estado | Notas |
|---|---|---|
| 0 · `/luna` en las migas y en el menú | hecha | |
| 9b.a.1 · Tamaño de las lunas respecto a su planeta | hecha | `R_planeta · (r / R)^0,65`, sobre el radio final del planeta (con el alivio y el mínimo de D35). |
| 9b.a.2 · Distancias ilustrativas sin cruces | hecha | `moonSystemLayout`: la primera, a 0,3 radios del planeta o del anillo A; cada una, a la anterior más dos veces la suma de sus radios y 0,02 radios, en el peor caso de sus excentricidades; y la parte logarítmica de la distancia real (1 radio por década). La órbita real de cada luna, escalada por su factor: su forma y su dirección. |
| 9b.a.3 · El alivio de D35 con el tamaño de cada sistema | hecha, de otra forma | Ver §4: el sistema se comprime hacia su planeta (`compressSystems`); el disco del planeta, con el alivio de siempre. |
| 9b.a.4 · El mapa de cada luna cuando se ve grande | hecha | ≥ 24 px de radio (lo suelta por debajo de 18), al nivel de la vista general. |
| 9b.a.5 · El color esquemático, la media de su mosaico | hecha | `scripts/build-texture-colors.mjs` → `scene/texture-colors.ts` (GENERADO): Ío, `#988d4d` (antes `#d8c25a`, mostaza); la Luna, `#96958f`. Los mosaicos en gris no lo necesitan (§5). |
| 9b.a.6 · Que pasen por delante es normal | — | Las capturas lo enseñan (Calisto delante de Júpiter); lo que no pasa es que se metan una en otra. |
| 9b.b.1 · Un mapa de solo luces | hecha | Black Marble 2016 en gris (NASA Earth Observatory, VIIRS; material de la NASA, con su crédito), de 13 500 × 6750 px, en `download-assets.mjs` con su SHA-256 y en `build-textures.mjs` (1k, 2k y 4k, más ligeros que los de antes: el de 2k, 37 kB frente a 61), con sondas de alineación (Madrid y El Cairo encendidos, el Atlántico y el Sáhara a oscuras; girado 180°, fallan). El tono, `VISUAL_CONFIG.earth.nightTint`: el medio de las luces de la textura anterior (rgb lineal 1,200 · 0,993 · 0,485). En `FUENTES.md` y `/creditos`. |
| 9b.b.2 · Sin relleno teñido en la cara nocturna | hecha | El relleno, con el color de la superficie solo del lado del día; del de la noche, en gris neutro (la luminancia del albedo) y con el de la vista general (`uNightFill` = relleno × (1 − primer plano)): en primer plano, nada. |
| 9b.b.3 · La exposición | hecha | Con el suelo negro y sin relleno, la compensación del primer plano (hasta ×6) solo sube las luces, como una foto de larga exposición. |
| 9b.b.4 · La forma del disco | hecha | El limbo de la atmósfera (sin cambios) y las estrellas que tapa; en la vista general, el gris neutro del relleno. |
| 9b.c.1 · El oscurecimiento del limbo por canal | hecha | μ^α con el α de Hestroffer y Magnan (1998) a 650, 550 y 450 nm (0,426, 0,508 y 0,626); el color del centro, el que da al disco entero el de 5772 K (`solarCenterColor`). También en el disco del Sol del cielo (antes, una ley lineal igual en los tres canales). |
| 9b.c.2 · Que deslumbre: el centro casi blanco y el bloom solo para el Sol | hecha | La intensidad, 2,2 en la vista general (un disco blanco) y 1,1 en primer plano (con 1,9 el tone mapping aplanaba el disco; el centro, L\* 95). El bloom, en alto y medio (`scene/sun-bloom.ts`, con `UnrealBloomPass` de `three/addons`): la escena se pinta como siempre y su resplandor se suma después, en luz lineal, leyendo el lienzo; solo en la vista del sistema solar; en el nivel bajo, el halo. |
| 9b.c.3 · Granulación que se mueve | hecha | Ruido de Worley (celdas y calles) que evoluciona con el reloj de pared mientras se pinta, solo en primer plano; quieta con movimiento reducido y en las capturas. 40 gránulos por radio (los reales serían unos 700): ilustrativa. |
| 9b.c.4 · Manchas ilustrativas con la rotación diferencial publicada | hecha | 8 a la vez, de 6° a 32° de latitud, que nacen, derivan con la ley de Lößnitz et al. (2025) y se apagan; umbra y penumbra de borde irregular; número fijo (SILSO es CC BY-NC). Fáculas a trozos, en la red de las celdas grandes y solo hacia el limbo. |
| 9b.c.5 · Una corona tenue en primer plano | hecha | `CORONA_GLSL` en el halo, con serpentinas y plumas polares orientadas con el polo del Sol. |
| 9b.c.6 · La totalidad del cielo (E1) | hecha | Sin el resplandor del lado del Sol ni el halo; el anillo de todo el horizonte (naranja y amarillo); la Luna, más oscura que el cielo; y la corona con serpentinas, hasta 6 radios. |
| 9b.d.1 · Formas reales de Fobos, Deimos y Proteo | hecha (Fobos y Deimos) · Proteo, esfera | Los DSK del NAIF (decisión de Iván del 06-11) en una rejilla de radios (`scripts/build-shapes.mjs` → `public/data/shapes/`, `scene/shape-files.ts`); la escena deforma la esfera de la luna con ella (`scene/shapes.ts`), con el mapa por la misma latitud y longitud planetocéntricas; las normales, de la rejilla. Proteo sigue como esfera: su forma de Stooke solo se baja a mano y no está en `assets-src/shapes/` (decisión de Iván del 06-11). |
| 9b.d.2 · Las cinco de Urano, con su mapa | hecha | Los mapas del JPL (D43), con sus sondas, el norte recreado (D45) y el color de su B−V (Miranda, sin B−V publicado: gris neutro). |
| 9b.d.3 · Deimos con su mapa y su forma; Proteo con su superficie | hecha | Deimos, el mapa del JPL (el fondo de su carta, lo no cartografiado, recreado: §4) y su forma del DSK del NAIF. Proteo: un campo de cráteres generado (`scripts/lib/crater-field.mjs`), con su mapa de normales, sobre la esfera; sin Pharos (el Gazetteer no da su posición). |
| 9b.d.4 · La dicotomía de Jápeto | hecha | `scripts/lib/dichotomy.mjs`: el material oscuro del hemisferio delantero, de 0,537 a 0,073 del trasero (NASA: 0,04 / 0,55); la escena calibra con el hemisferio trasero a 0,55. |
| 9b.d.5 · El terminador de Titán | hecha | Un oscurecimiento hacia el terminador, min(1, μ₀/μ)^1,15 (`terminatorExponent`, en TS y en GLSL), ajustado a los perfiles de PIA06230: el error del modelo, del 9,2 % al 2,4 % (`scripts/measure-titan-terminator.mjs`); en la captura de la escena (`--captura`: con la exposición del primer plano, el halo de la neblina y el tone mapping), un 8,4 % frente a la foto. Captura `-terminador-titan`. |
| 9b.d.6 · La textura del planeta al enfocar una de sus lunas | hecha (ya la daba C4) | La regla de C4 (un cuerpo de 160 px o más lleva la textura del primer plano) ya la cubría; ahora, con su test (Ío enfocada: Júpiter, grande detrás, pide la suya). |
| 9b.d.7 · `FUENTES.md`, `/creditos` y la licencia en `CLAUDE.md` | hecha | `FUENTES.md`, fila a fila; `/creditos`, con los mapas del JPL, las formas del NAIF y lo recreado (con su tabla); la licencia del JPL (D43) y las reglas del NAIF ya estaban en `CLAUDE.md`. |
| 9b.f.1 · El Sol, con color realzado | hecha (dos vueltas) | **Segunda vuelta:** una paleta lineal antes del tone mapping, con intensidad 1 de cerca y de lejos: el disco no llega a la compresión del tone mapping neutro, que en la vista general lo lavaba a crema. El color del centro y el del borde, más rojo, se mezclan por μ (`VISUAL_CONFIG.sun.enhanced.palette`). El brillo, con el oscurecimiento del limbo por canal de la 9b.c y sus exponentes × 0,55 (§4). **Primera:** la paleta por la luminancia de ese limbo, sin suavizar. |
| 9b.f.2 · Su estructura a gran escala | hecha (dos vueltas) | **Segunda vuelta:** ruido de gradiente propio en cinco octavas, retorcido por un campo que cambia con el tiempo. Cada octava se apaga cuando su detalle baja de un par de píxeles. Un límite suave (tanh) acota lo que oscurece y aclara, con una ganancia por canal: lo claro, más amarillo; lo oscuro, más rojo. Encima, granulación fina (dos octavas) y manchas solares pardas de borde suave. Fluye despacio con el reloj de pared, también en pausa con el Sol de cerca (§4), y queda quieta con movimiento reducido y en las capturas. **Primera:** un ruido a tres escalas con *domain warp*, llevado a manchas con smoothstep. |
| 9b.f.3 · El resplandor naranja con rayos suaves | hecha (dos vueltas) | **Segunda vuelta**, todo en el halo e igual en los tres niveles: un borde fino naranja rojizo pegado al limbo (dos caídas exponenciales de 0,01 y 0,035 radios, con un ancho mínimo en píxeles), un resplandor suave naranja de 0,09 radios y rayos cortos y finos (283 + 157 por vuelta, con su curva; por debajo de 2 px, su media). En la vista general, un resplandor ancho muy tenue (L\* 8,2 a 2 radios, sobre un fondo de 6) que no tapa a los planetas. El bloom de la 9b.c y la corona de cerca, apagados (§4). **Primera:** el halo y la corona, naranjas, con rayos, y el bloom de la 9b.c. |
| 9b.f.4 · Protuberancias animadas en primer plano | hecha (dos vueltas) | **Segunda vuelta:** tres bucles de plasma, cada uno con 14 hilos finos y translúcidos en arco entre dos pies en el limbo. Los hilos miden ~1 px, con un mínimo de 0,45 px para que no parpadeen. Se desvanecen con la altura, y cada bucle respira, se mece y se enciende y se apaga despacio. Solo de cerca, en los tres niveles. **Primera:** cinco bucles de tres hilos, que se veían como bultos sólidos (los «tumores»). |
| 9b.f.5 · `/cielo`, sin cambios | hecha | Igual píxel a píxel en las dos vueltas (§2). |
| 9b.f.6 · Los océanos, de un azul vivo | hecha (B) | En el shader, sin la calibración de EPIC: oscuros y saturados como en la referencia (`VISUAL_CONFIG.earth.enhanced`); medidos en el Atlántico y el Índico (§2). |
| 9b.f.7 · El reflejo del Sol en el agua | hecha (B) | Con Fresnel y solo en el agua (la máscara de siempre): un núcleo blanco (el Sol) y un lóbulo ancho cian (`glint.tint`); con `exponent` 12, la mitad de su brillo a unos 19° de arco del punto del reflejo. Sin quemar: 243 de 255 de máximo. |
| 9b.f.8 · Nubes más finas | hecha (B) | Del 9,8 % del disco al 1,5 % (la referencia, el 0,7 %); de cerca, `cloudFade.min` 0,15 (antes 0,3): sin los velos borrosos del primer plano del Himalaya. |
| 9b.f.9 · El relieve, más marcado | hecha (B) | ×5 en `assignRelief`, sin el escalón de cuantización del mapa de normales de 8 bits (una zona muerta de ~1,5 niveles antes de amplificar); las pendientes fuertes se saturan por debajo de ~45°. |
| 9b.f.10 · El desierto más cálido y la vegetación más verde | hecha (B) | Lo árido, con su propia rodilla (`uEnhancedAridKnee`, solo de día); la vegetación, donde el verde supera al rojo y al azul. Medidos en el Sáhara, el Sahel y el Amazonas (§2). |
| 9b.f.11 · El borde de la atmósfera, fino y azul | hecha (B) | El tinte del halo (`atmosphere-material.ts`, `createAtmosphere`), con su `#define` (`TLS_TINT`) solo en la Tierra; el crepúsculo, como estaba. |
| 9b.f.12 · La cara nocturna y las luces, sin cambios | hecha (B) | Medidas antes y después, iguales (§2). |
| 9b.f.13 · Decir que es realzado | hecha | El Sol: la ficha, «Lo que es ilustrativo», `/creditos` y el panel del explorador (`features/body-panel`, puesto por la sesión C al traer la 9c). La Tierra (B): «Lo que es ilustrativo», `/creditos`, `FUENTES.md` y la vista guiada «La Tierra completa» (`data/tours.ts`). |
| 9b.f.14 · Los parámetros nuevos | hecha | `VISUAL_CONFIG.sun.enhanced` y `VISUAL_CONFIG.earth.enhanced` (con `earth.cloudFade.min`), con su porqué y lo medido. |
| 9b.f.15 · `measure-earth-epic.mjs`, como registro | hecha (B) | Sus cifras antes y después, en §2. |
| 9b.e.1 · El mosaico del radar de Magellan, con su sonda | hecha (C) | El C3-MDIR de 2025 m del USGS (dominio público), en 1k, 2k y 4k (`build-textures.mjs`, tipo `radar`), con los huecos rellenados y tres sondas (Maat Mons, Sapas Mons y Maxwell Montes). |
| 9b.e.2 · El botón «Bajo las nubes», con el aviso, el fundido y la carga al pedirlo | hecha (C) | En la ficha del explorador de Venus enfocada (la interfaz de la 9c), con `aria-pressed` y una nota enlazada (`aria-describedby`). El estado, en `scene/venus-radar.ts` (con tests); la API, `setVenusRadar` y el evento `venusRadar`. El fundido dura 800 ms (un corte con movimiento reducido o en captura). La textura se pide al pulsarlo y se suelta al apagarlo, al dejar Venus o al cerrar la ficha. |
| 9b.e.3 · El sombreado del radar | hecha (C) | Con la luz del Sol y la fotometría de Venus (su terminador y su cara de noche), en su material con `#define TLS_RADAR`. El brillo, calibrado como su textura de nubes; la neblina del limbo, al 30 %. |
| 9b.e.4 · La interfaz de la 9c, traída (sección 12 de su informe) | hecha (C) | `main` traído a la rama de Venus: los 11 conflictos que preveía, resueltos como decía. Además, la línea del Sol realzado en su ficha del explorador, los selectores de los scripts, `tls.recorrido` y las zonas táctiles de los enlaces de «Sobre el proyecto» y `/creditos` (§4). |
| Cierre.1 · Juntar Venus | hecha | `bdacb27`, sin conflictos, con su CI en verde (§4). |
| Cierre.2 · Las dos frases del Sol de «Lo que es ilustrativo» | hecha | Y el borde en `/creditos` (§4); la lista de textos, regenerada. |
| Cierre.3 · Los e2e que fallan a ratos en el CI, arreglados en su causa | hecha | Seis causas (§4): el `@defer (on idle)` sin tope, el reposo sin contar las texturas en vuelo, una espera fija, la velocidad del arranque medida entre dos actualizaciones de la barra, el redondeo del tamaño táctil en el móvil y el contraste del índice en el hover. |
| Cierre.4 · Lo de la escena que dejó la 9c (backlog 17) | hecha en parte | La placa de las etiquetas y el suelo del cielo, hechos; el rótulo de Saturno, la precarga del recorrido y los nombres de España, propuestos para la fase 10 (§10). |
| Cierre.5 · §5 con el equipo libre | hecha | §2, «Cierre de la fase». |
| 9b.d.8 · Lo que nadie ha visto (D45) | hecha | 18 lunas con mapa (las 12 de antes y las 6 del JPL): lo no visto, recreado entero, y lo visto de lejos, con detalle, a partir de su propio terreno, en `build-textures.mjs`; con sus criterios en el build y su máscara. La receta de cada luna, en §5. |

## 4. Desviaciones del plan y motivo
- **9b.a.3, el alivio con el tamaño de cada sistema:** encoger cada planeta junto con su sistema (lo que proponía el documento) dejaría a Júpiter y a Saturno a menos de la mitad en sus conjunciones: con sus lunas fuera del planeta y de los anillos, sus sistemas llegan a 2,85 y 4,82 de sus radios (26 y 41 unidades), y en las conjunciones de 1900–2100 están a 24–27 unidades. En su lugar, **el disco de cada planeta sigue con el alivio de D35** (×0,79 como mucho, el 3,2 % del tiempo, sin cambios) y **es su sistema de lunas el que se comprime hacia él** (`compressSystems`): lunas, huecos y órbitas, por un mismo factor y con el paso suave de D35, para que los dos sistemas (tomados como esferas) dejen 0,5 unidades de aire. Con la compresión, las lunas nunca tocan nada, y en las conjunciones más cerradas llegan a desaparecer (radio 0). En el muestreo de 1900 a 2100, el sistema de Saturno se comprime el 21,8 % del tiempo (por debajo de ×0,3, el 8 %), el de Júpiter el 12,6 %, el de Urano el 10,7 % y el de Neptuno el 7,5 %; el de la Tierra, el 0,7 % (×0,91 como mucho, con Venus). Con sistemas más compactos apenas baja (Saturno, del 21 al 15 %): lo deciden las conjunciones de Júpiter, Saturno y Urano. En la fecha de hoy ningún sistema se comprime de forma visible; la conjunción de Saturno y Urano de 2032 y la de Júpiter y Saturno de 2040 se ven en las capturas.
- **Cuándo aparecen las lunas en la vista general:** con los sistemas nuevos, las lunas se separan antes del borde de su planeta, y el criterio de la fase 4b las enseñaba ya en la vista general por defecto (Calisto y Titán, con su nombre). Ahora, en la vista general, un sistema aparece cuando su planeta mide de 20 a 40 px de radio (por defecto, Júpiter mide de 16 a 21 px en escritorio) y cada luna, cuando su disco llega a 0,5–1,5 px (sin motas de medio píxel). En el sistema local físico, el criterio de siempre.
- **Tarea 0 y el presupuesto del código propio inicial:** la tarea añadía 260 bytes (15,14 kB de 15); para no subir el presupuesto, lo que el sitio hace al navegar (cerrar el menú del móvil y el desplazamiento al cambiar de página) va a un chunk que se pide después de pintar.
- **El bloom, sin `EffectComposer` y sumado en luz lineal** (9b.c.2). La fase 3b (§4.1) lo descartó porque, con el compositor, el fondo pasaba por un render target y salía aclarado. Ahora la escena se pinta como siempre, directa al lienzo; después, a media resolución (en px CSS), solo el Sol, con los cuerpos que lo tapan en ese frame en negro para la profundidad (`sunOccluders`: los que tocan su disco en pantalla, no todos), su bloom y, por último, el lienzo copiado a una textura con el resplandor sumado en lineal: 1 − (1 − base)·e^(−bloom). La primera versión (la del trabajo guardado de la sesión anterior) lo sumaba en sRGB sin leer el lienzo: un resplandor lineal pequeño sube mucho al codificarse, velaba todo el fondo y, sobre el disco, borraba el limbo. Con la suma en lineal, Júpiter y Venus, junto al Sol, no se queman (`despues-sol-cerca`).
- **El bloom, con dos formas** (`VISUAL_CONFIG.sun.bloom`): en la vista general, un núcleo fuerte y unas alas débiles (fuerza 0,8); en primer plano, mucho menos (0,1) y solo las capas estrechas. El resplandor de un disco crece con su área: con la misma forma, en primer plano velaba el lienzo entero. Se interpola con el primer plano del Sol.
- **La intensidad del primer plano, 1,1 en lugar de 1,9** (la del trabajo guardado): con 1,9 el tone mapping aplanaba el disco y el limbo dorado solo se veía en el último 5 % del radio (medido: L\* 97 en el centro y 91 a μ = 0,4; ahora, 95 y 85,5).
- **`?medida=limbo`, una opción solo de captura** (en lugar de la `?resplandor=0` que proponía la sesión anterior): además de quitar halo, corona y bloom, deja el disco por debajo de la compresión del tone mapping. Con el disco comprimido, la captura no da I(μ)/I(1) de la ley, sino la curva del tone mapping.
- **La Luna de la totalidad, más oscura que el cielo: ilustrativo** (E1). En la realidad, el aire de delante de la Luna brilla como el de al lado (la Luna solo es más oscura que lo que la rodea, por la corona); a simple vista y en las fotos se ve negra. Se le quita el 60 % de la luz del cielo (`moonVeil`), y está en «Lo que es ilustrativo».
- **El bloom, solo en la vista del sistema solar.** En las vistas Tierra y Luna el Sol casi nunca está en pantalla (y, si lo está, es pequeño y basta su halo), y sus texturas de primer plano llenan la VRAM: con el bloom reservado, la vista Tierra en alto llegaba a 290 MB (de 300) con una pantalla de densidad 1, y con densidad 2 (la copia del lienzo pasa de 6 a 23 MB) habría pasado de 300. Al salir de la vista del sistema solar se suelta su memoria (278 MB); al volver, se reserva otra vez sin compilar nada.
- **El disco del Sol del cielo, con el limbo por canal** (no lo pedía la entrega): la misma ley que el del espacio, en lugar de una lineal igual en los tres canales.

- **D45, el salto del brillo en el borde con lo real, medido frente a lo natural** (y no como un ΔL* ≤ 2 absoluto). **Es un cambio de criterio, y lo decide Iván** (`CLAUDE.md`): pendiente de su OK (§9 y `PENDIENTES.md`; revisión de la fase 9b, hallazgo 1). Con la medida del brillo medio a cada lado (σ = 4 texeles, por teselas de 64), un borde trazado al azar dentro de lo real ya salta de 2,4 a 9,8 L* en el percentil 95 según la luna (las de sombras duras, por los cráteres): un umbral absoluto de 2 solo lo pasaría el relieve liso. El criterio, por separado: en el borde con lo **no visto** (cuyo brillo pone solo la recreación), como mucho 2 L* por encima de lo natural (esos bordes ficticios, con la máscara girada 90°, 180° y 270°); en el borde con lo **visto de lejos** (cuyo brillo a gran escala es real, D45 regla 1, y ya saltaba en el mosaico por juntar imágenes distintas), como mucho 2 por encima del mayor de lo natural y del salto del mosaico original. La primera versión (de la sesión anterior) mezclaba los dos bordes con la referencia mayor, y así Encélado pasaba con un borde de 6,3 frente a 2,8 de lo natural solo porque el mosaico ya saltaba 13,6. Las zonas no vistas por encima de 70° de latitud no se miden (el equirrectangular las estira): se ven en las seis vistas.
- **Las motas a 0 dentro de sombras, como sombra y no como hueco** (`restoreShadowSpecks`, `usgs-mosaic.mjs`). En un mosaico de 8 bits, lo más hondo de la sombra de un cráter vale 0, como lo que no tiene datos: en Fobos había 152 motas así, en Encélado 1338 y en Dione 1914, que la recreación rellenaba de terreno gris (contra «lo real no se toca»). Una mota sin datos de como mucho 400 px del mapa de 2k que toca algo casi negro (el píxel más oscuro a 1–2 px, ≤ 20 de 255) cuenta como dato. La media del anillo no servía: a 2 km ya es la del terreno, y su mínimo es casi siempre negro (de 0 a 10 en 1033 de las 1338 motas de Encélado). Cambia también las cifras de lo «sin datos» de la fase 7 (Fobos, de 0,04 % a 0).
- **La dicotomía de Jápeto, después de la recreación.** Lo real o lo visto de lejos es cosa de la resolución de origen, no del brillo: medidas después de oscurecer Cassini Regio, lo visto de lejos pasaba del 31 % al 42 % (con menos contraste, parece tener menos detalle). Y sus sondas son de borde: con el material oscuro a 0,045 de su brillo, el gradiente de Valdebron se pierde en 8 bits (en el mapa recreado y calibrado, 1,01 frente al 1,15 que pide). Así que la recreación parte del mosaico tal como llega, las sondas se miden en él y después la dicotomía se aplica con el mismo factor (medido en el mosaico) al mosaico y al mapa recreado: lo real sigue igual en los dos, y la comprobación tras comprimir se hace frente al mosaico calibrado.
- **Jápeto: el material oscuro, solo en el hemisferio delantero.** El mosaico del USGS tiene zonas grises en el hemisferio trasero (junto a su ápice, a 270° O) que en las fotos de Cassini son hielo claro: con un umbral sin más, o con una curva continua, se oscurecía también ese hemisferio. Como la NASA atribuye el albedo de 0,03–0,05 al hemisferio delantero, el oscurecimiento va en él (entero hasta 80° de su ápice y nada desde 110°); el trasero no cambia.
- **El terminador de Titán: oscurece hacia el terminador, no ilumina más allá.** La propuesta de la fase 7 era «una sombra suavizada por la atmósfera»; medida en PIA06230, la luz más allá del terminador es despreciable (el mejor ajuste con luz envolvente da w = 0) y lo que hace suave el terminador es que el brillo cae poco a poco por todo el disco (μ₀² frente al μ₀^0,9 de la escena). El factor min(1, μ₀/μ)^e es neutro en fase llena (no toca la calibración del albedo) y no abrillanta el limbo iluminado.
- **Las seis vistas de D45, sobre la textura y no en la escena.** `capture-moon-views.mjs` pinta cada luna desde las seis direcciones con su textura de 2k (la que carga la escena): las longitudes exactas, sin depender de la fecha. En la escena, la rejilla de las 20 y las capturas de las formas y de Titán.
- **La línea sobre el mapa en las fichas de las lunas con zonas vistas de lejos, sin fuente externa.** Las de Tritón, Proteo y las cinco de Urano llevan una fuente de la NASA; las otras doce dicen lo que el explorador recrea (no hay una fuente que respalde eso), con un enlace a «Cómo se recrea» (`/creditos#lunas-recreadas`), donde está lo medido y el método. Para Iván, en `PENDIENTES.md`.
- **La ficha de las lunas es de la sesión de la 9c** (`pages/body-detail`): la línea del mapa añade un `@if` tras «Ver en 3D» en su plantilla y su fuente a `textSources()`. **Para la fusión.**
- **Deimos: el fondo claro de su carta, como lo no visto.** El mapa del JPL de Deimos es una carta aerografiada (de las imágenes de la Viking) sobre un fondo claro y liso: el norte y una franja junto al meridiano de 180°, que nadie cartografió. No vale 0, así que la primera versión lo tomaba por real, y en la rejilla y en el primer plano salía una mancha blanca y lisa (contra D45). A gran escala, ese fondo es más claro que 165 (de 0 a 255) y lo cartografiado va de 60 a 160 (el histograma tiene dos modas separadas): con ese umbral (`background`, solo en Deimos), el fondo pasa a «sin datos» (el 17,2 % del mapa, el 11,8 % de la esfera) y se recrea con su terreno, como el norte de las lunas de Urano. Las uniones de las láminas de la carta (dos rectas horizontales, una vertical y el círculo del casquete sur) y el contorno claro que cierra lo cartografiado son de lo real y se quedan, como la recta de los 180° de Miranda y de Titania: se ven en las seis vistas.
- **Proteo, como esfera; sin Pharos.** Lo decidió Iván el 06-11 (sin el zip de Stooke, esfera); el Gazetteer da Pharos en 0°, 0° y con diámetro 0, y ninguna otra fuente comprobable da su posición.
- **El norte recreado de Miranda, con menos contraste que su sur.** Tiene relieve (cráteres y arcos), pero su sur se fotografió con el Sol bajo y sus sombras son muy marcadas. No es una zona lisa (el criterio); queda para que Iván lo vea (`PENDIENTES.md`).

- **9b.f, las capturas lado a lado con la referencia, solo en local.** La adenda pide «capturas antes, después y referencia, lado a lado» y, a la vez, que las capturas de la referencia no se suban al repo. En el repo van el antes y el después; el lado a lado con la referencia, con `capture-d46.mjs --comparar`, en `assets-src/referencias/comparativas/` (ignorada por git), para Iván.
- **9b.f, la línea del panel del Sol, al juntar con la 9c.** El panel del explorador está en `features/body-panel`, que el reparto dejaba de nadie hasta que se fusionara la 9c (que lo rehace). La línea estaba ya en los datos (`mapNote` del Sol) y en la ficha; en el panel la puso la sesión C al traer la 9c.
- **9b.f, el halo y la corona del Sol, naranjas.** En la 9b.c eran de un blanco cálido: con el disco naranja, el resplandor salía gris. Ahora toman el color de `glow`, en la vista general y en primer plano (también la corona ilustrativa). En la segunda vuelta, la corona de cerca está apagada (abajo).
- **9b.f, los puertos por entorno, traídos de la 9c** (`0447eae`, un cherry-pick de `2f52b14`, el mismo contenido): sin ellos, esta rama no tenía `CAPTURE_PORT` ni `E2E_PORT`, y B y C no podían usar los puertos del reparto.
- **9b.f, las imágenes que no son del Sol, sin regenerar.** Al regenerar las del Sol (su miniatura, las de su ficha, la de compartir y el póster de la vista general) cambiaban también, con ruido o por cambios de entregas anteriores, la miniatura de Venus, las fichas de otros planetas y los pósters de las vistas Tierra y cielo. Se dejan como estaban: los pósters se rehacen al juntar la Tierra (B) y con la interfaz de la 9c.
- **9b.f, juntar la Tierra** (08-11): `git merge --no-ff fase-9b-f-tierra`, sin conflictos (B tocó, con cambios pequeños, los compartidos `world.ts`, `engine.spec.ts`, `visual-config.ts`, `about-page.html`, `credits-page.html` y `FUENTES.md`). Regenerados después: `docs/revision-textos.md` (el texto nuevo de «La Tierra completa» y el punto de la Tierra en «Lo que es ilustrativo»), los pósters de la vista general y de la vista Tierra (escritorio y móvil; el de la vista Tierra, sin la Tierra realzada, haría un salto al pasar del póster al 3D) y la imagen para compartir (lleva la Tierra de su ficha). `body-texts.ts` y `textos-cuerpos.md`, regenerados sin cambios (B no tocó `body-texts.json`). Los pósters de las vistas Luna y cielo no llevan la Tierra de día: siguen como estaban, hasta la interfaz de la 9c.
- **9b.f, las capturas de la Tierra con el prefijo de la herramienta común** (`antes-d46-…` y `despues-d46-…`), no con `tierra-` como pedía el reparto: son solo de la Tierra (`tierra-completa`, `pacifico`, `himalaya`) y no chocan con las del Sol.
- **9b.f, las imágenes del motor de la Tierra, en la rama de B:** su miniatura (`public/img/cuerpos/tierra.webp`) y las de su ficha (`public/img/fichas/tierra-360.webp` y `-720.webp`). Las de los demás cuerpos, sin tocar: Venus cambia de una pasada a otra también con el build de partida (máximo 13 niveles); Marte y Titán salen idénticas gracias al `#define` del tinte del halo (con un uniforme neutro a 1 cambiaban algún píxel: diferencia media 0,02 y 0,56, máxima 7 y 17).
- **9b.f, el Sol, rehecho en una segunda vuelta** (decisión de Iván del 08-11). La primera cumplía los criterios de la adenda, pero a Iván no le gustó: «Las manchas estas que sobresalen parecen tumores… no me acaba de gustar. Intentemos basarnos en el sol del proyecto ejemplo». Se rehízo en `fase-9b-f-sol-2` con criterios más estrictos (§2), e Iván aprobó el resultado el 08-11. Se juntó con `git merge --no-ff fase-9b-f-sol-2`, sin conflictos: tocaba los archivos del Sol, `engine.ts`, `engine.spec.ts`, `world.ts`, `visual-config.ts`, los scripts de D46 y sus capturas.
- **9b.f, segunda vuelta: el oscurecimiento del limbo, más suave en el realzado (× 0,55).**
  - Usa la ley por canal de la 9b.c con sus exponentes por 0,55: a μ 0,44 el disco baja al 80 % (con los de la 9b.c, al 66 %; en la referencia, al 83 %).
  - **Motivo:** con los exponentes de la 9b.c, el borde salía pardo y el disco, más oscuro que la referencia en toda su mitad exterior.
  - D46 (tarea 1) pedía conservar el perfil «como forma»: es la misma ley, más suave. Lo aprobó la sesión de revisión el 08-11, y después Iván, con el Sol entero.
  - El limbo de `?medida=limbo` y el del Sol de `/cielo` siguen siendo el de D41, medido igual.
- **9b.f, segunda vuelta: el bloom de la 9b.c, apagado en el explorador** (`VISUAL_CONFIG.sun.bloom.enabled`).
  - Desenfoca el disco entero: su resplandor caía también sobre el disco, lo aclaraba hacia el amarillo y, en la vista general, lo lavaba. Ancho y del color del disco, era «la mancha grande y pálida».
  - El borde fino, el resplandor suave y los rayos los pinta el halo, igual en los tres niveles y sin sus 15 pasadas.
  - El módulo se queda, con su interruptor, por si se vuelve al Sol de D41. Sus tests lo encienden.
- **9b.f, segunda vuelta: la corona de cerca, apagada en el explorador.** Era un velo pálido hasta 3 radios, y la referencia es negra a 1,2. La de la totalidad de `/cielo` es otra y no cambia.
- **9b.f, segunda vuelta: la granulación, de celdas a ruido fino.** En la 9b.c eran celdas de Worley de 40 por radio, con calles oscuras. Se veían como un mosaico, y la referencia tiene un grano fino. `?medida=limbo` no la usa.
- **9b.f, segunda vuelta: una excepción al render bajo demanda.**
  - Con el Sol de cerca y nada más en marcha, el motor pinta cada 50 ms, para que su superficie fluya también en pausa (como en la referencia).
  - No se aplica en la vista general, en las vistas Tierra, Luna y cielo, con movimiento reducido, en las capturas ni con la pestaña oculta.
  - Con la reproducción lenta (hasta 60 s/s), el Sol de cerca se pinta a ese ritmo en lugar de a 4 Hz.
- **9b.f, el halo del Sol, arreglado al juntar la segunda vuelta** (`d881476`).
  - **El fallo:** al rehacer las imágenes del motor salieron puntos oscuros de un píxel en el borde fino del Sol pequeño. En la miniatura había ocho alrededor del limbo, y también salían en la vista general del móvil (el Sol, de unos 14 px de radio).
  - **La causa:** el halo medía el píxel con `fwidth` dentro de la rama de ρ > 0,97, que no siguen todos los píxeles de su cuadro de 2 × 2. Ahí una derivada no está definida, y el compilador de D3D (ANGLE) la metía en la rama aunque se calculara antes. En los cuadros que cruzan el borde de la rama daba casi 0, y el borde fino perdía su ancho mínimo.
  - **El arreglo:** el vértice da lo que mide un píxel (sus unidades por píxel a la distancia del Sol y la densidad del renderer), con el mismo valor que daba `fwidth(r)`. Tiene su test.
  - **Lo comprobado:** de cerca, las capturas salen iguales; en la vista general y en la miniatura cambian solo los píxeles de los puntos; `/cielo`, igual píxel a píxel.
- **9b.f, segunda vuelta: las imágenes que no son del Sol, sin regenerar.** Al rehacer las miniaturas, las de Venus, la Tierra, Saturno y Titán cambian de una pasada a otra (como mucho 20 niveles, en unos 30 canales): se dejan como estaban.
- **El CI, en rojo desde `08120db`, arreglado** (`dfbc655`): el e2e del móvil «/sol: a 320 px de ancho, sin desplazamiento horizontal» (WCAG 1.4.10) daba una página de 533 px en el CI (528 en local). La causa: la línea de la ficha «Los textos, de…» enseña la dirección de cada fuente, y la del Sol realzado (`svs.gsfc.nasa.gov/vis/a010000/a013800/a013859/script_31299_00.html`) no tiene espacios donde partirse. Arreglado en la causa, sin tocar el test: `overflow-wrap: anywhere` en los enlaces de `.body__note` (`body-detail-page.css`), para esta y para cualquier dirección larga que venga. Los 16 e2e del móvil, en verde en local. `body-detail-page.css` también lo cambia la 9c, en otras líneas: **para la fusión**.
- **Un test de la fase 5 que falló una vez en la rama de B:** «las nubes derivan con los frames pintados…» (`engine.spec.ts`), en una ejecución parcial con el equipo cargado por las otras sesiones; pasó en las dos siguientes y en el check completo, aquí también. Usa un reloj simulado y la entrega no toca ni la deriva ni `cloudDrift`. Sin causa encontrada: para la revisión.
- **Dos tests, corregidos al cerrar la 9b.d.** El de la alineación de los mapas de las lunas (`texture-meta.spec.ts`) solo trataba como retrógrada a Tritón: las cinco de Urano, ahora con mapa, también giran al revés respecto a su polo norte de la IAU (el del lado norte del plano invariable), y su hemisferio delantero está a 90° E. Y el de la textura de Júpiter con Ío enfocada (`engine.spec.ts`) dependía de la hora: a las 00:00 del 24-10-2026 Júpiter queda detrás de la cámara del encuadre de Ío; a las 18:00, detrás de Ío.

- **9b.e, juntar Venus** (08-11, cierre): `git merge --no-ff fase-9b-e-venus`, sin conflictos (`bdacb27`), con su CI en verde (`226ab0f`). Su rama ya traía `main` (la 9c) y el Sol de la segunda vuelta.
  - **Los conflictos con la 9c,** resueltos en la rama de Venus como decía la sección 12 de su informe:
    - `app.*`, `app.spec.ts` y `e2e/contenido.spec.ts`: la versión de la 9c, que ya llevaba la tarea 0 de esta fase (traída con cherry-pick);
    - `scene/engine.ts`, `scene/types.ts` y `scripts/capture-moon-systems.mjs`: la de la 9b;
    - `viewer-params.ts`, su spec y `explorer-session.ts`: con los parámetros de captura de las dos (`marco=ilustrativo`, `medida=limbo` y `radar=1`);
    - el plan, con D45, D46 y D47.
  - **Otros ajustes:**
    - `ExplorerFocus` está ahora en `core/` (nada de la 9b lo importaba);
    - `measure.mjs` abre «Menú» antes de pulsar `/planetas`, y `measure-autoplay.mjs` marca el recorrido y las pistas como vistos;
    - los enlaces de los informes en las tablas de «Sobre el proyecto» (16 px) y los de las licencias de `/creditos` (19 px) pasan a 24 px de alto (las zonas táctiles de la 9c).
- **9b.e, la máscara de cobertura del radar, umbralizada antes de reducir** (`zerosAreGaps`, solo en el radar).
  - **El fallo:** sharp umbraliza después de reducir, así que la máscara de `loadMosaic` salía binaria y un píxel mezclado con un hueco contaba como dato entero. En las lunas, con huecos grandes, lo tapa el fundido del borde; en las rayas finas del radar quedaban líneas oscuras.
  - **El camino de las lunas no se toca:** cambiaría sus texturas, y D45 dice que lo real no se toca. Queda como propuesta para la fase 10 (§10).
- **9b.e, en gris y con la luz de Venus.** El producto es en gris y el aviso dice que es una imagen de radar.
  - Iluminado con la luz del Sol de Venus (su terminador y su cara de noche), se lee como una superficie. El radar no mide la luz visible, y se dice en «Lo que es ilustrativo».
  - Teñirlo con el color de las fotos de las Venera 13 y 14, como las vistas de Magellan de la NASA (PIA00104), queda como propuesta para Iván (§9).
- **9b.e, sin botón en la ficha completa** (`/planetas/venus`): es una página sin 3D. La tarea lo pedía «si encaja», y no encaja.

- **El cierre: los e2e que fallaban a ratos en el CI, arreglados en su causa.** De los runs del 08-11, los intermitentes (en verde con el reintento) y los fallidos tenían estas causas (las del CI del propio cierre y de los e2e en local, incluidas):
  - **El explorador que no cargaba en 90 s** (5 de los 7 casos; `arranque`, `accesibilidad`, `indice-y-ficha` y `movil`): en `openExplorer`, `tls-viewer-canvas` no llegaba a existir. La traza de un run fallido (`42471327598`) lo explica: en 90 s, la página pidió solo 11 ficheros, sin el chunk de la interfaz. El `@defer (on idle)` que la crea esperaba a `requestIdleCallback`, que, con el hilo principal ocupado sin pausa (SwiftShader y dos workers), podía no llegar nunca.
    - **El arreglo:** `@defer (on idle(3s))` (`viewer-layout.html`), que pasa ese `timeout` a `requestIdleCallback`: como mucho a los 3 s, la interfaz llega. En un navegador normal, el idle llega mucho antes y nada cambia.
    - **Su e2e** (`arranque.spec.ts`): un `requestIdleCallback` que solo llama por su `timeout`. Sin el arreglo falla con el mismo error del CI; con él, pasa en 3,7 s.
  - **La memoria «en caliente» de `vistas.spec.ts`** (15 texturas en lugar de 25): `waitForIdle` daba el motor por quieto tras 1,2 s sin pintar, pero una textura que tardaba más en decodificarse, sin un frame entre medias, se quedaba fuera. El motor cuenta ahora las texturas en vuelo (`stats().texturesLoading`, con su test), y las esperas de los e2e y de los scripts de captura esperan también a que no quede ninguna.
  - **La fecha escrita a mano** (`tiempo.spec.ts`): la interfaz la aplica tras una pausa al teclear (700 ms), y el test miraba a los 1,5 s fijos. Ahora espera a que llegue (con un tope de 15 s) y después cuenta los saltos y las URL, como antes.
  - **La velocidad del arranque** (`arranque.spec.ts`; en local, con cuatro workers): 84,9 h/s con un tope de 80 (lo esperado, 72). El test leía la hora de la barra, que se actualiza como mucho 5 veces por segundo: entre dos actualizaciones, cada extremo de la ventana de 2 s podía llevar hasta 200 ms de retraso. Ahora toma cada extremo justo cuando la barra cambia, con la hora de la página en ese momento. En el CI del cierre, la misma prueba dio también 0 h/s: con SwiftShader, la barra no llegó a cambiar en 2 s. Con la medida nueva, cada extremo espera al cambio (como mucho 20 s).
  - **El tamaño táctil del botón de Venus en el móvil** (`movil.spec.ts`, CI del cierre): 43,99994 px frente a ≥ 44. Es el redondeo a píxeles del dispositivo del Pixel 7 (44 px × 2,625 = 115,5 píxeles), no un botón más pequeño: las comprobaciones de 44 px del móvil llevan una tolerancia de 0,01 px (`TAP_MIN_PX`).
  - **El contraste del índice en el móvil** (`accesibilidad.spec.ts`): con el puntero sobre la última fila visible, que queda bajo la sombra de «hay más abajo», el valor en gris bajaba a **4,48:1** (`#8c887c` sobre `#1a2233`). Que el puntero quedara ahí dependía de la maquetación. Es un fallo real del hover, así que se arregla en el CSS (`body-picker.css`): en el hover, el valor y el nombre de las lunas pasan al color del texto. En ese mismo test, una carrera: tras tocar la fila, `isVisible()` no espera a que salga «ⓘ»; ahora espera a la ficha o a «ⓘ».
- **El cierre: lo de la escena que dejó la 9c (backlog 17).**
  - **Las etiquetas del 3D, con una placa** como la de los nombres de la fila (`.chip__name`): sobre un disco brillante, el contraste bajaba a 1,0–3,9. Con ella, además, las órbitas ya no cruzan los nombres (`cierre-*-etiquetas-*`). Su contraste, en el peor caso (la placa, el 88 % de `--color-bg`, sobre blanco puro): el texto, 10,6:1; el acento, 6,9:1; el gris de las lunas, 5,4:1 (calculado con la fórmula de WCAG).
  - **El suelo del cielo, con un degradado** desde el horizonte (`VISUAL_CONFIG.sky.ground.glow`): liso y casi negro bajo el azul marino del horizonte de noche, en el móvil se leía como un hueco (`cierre-*-movil-cielo-noche`). De día, una bruma junto al horizonte. La totalidad no cambia.
  - **El rótulo de Saturno, la precarga del recorrido y los nombres de los lugares de España,** propuestos para la fase 10 (§10): el primero necesita saber, frame a frame, lo que miden los anillos en pantalla; los otros dos son de la interfaz y de la escena a la vez.

## 5. Decisiones técnicas nuevas
- **El tono de las luces de la Tierra** (9b.b): el medio de las luces de la textura de Solar System Scope que se usaba, medido (sus píxeles de luminancia lineal de más de 0,1), en lugar de un color elegido: así «conservan su tono cálido» por construcción. El mapa en gris pone el brillo.
- **`?marco=ilustrativo`, solo en captura:** el cuerpo enfocado sin pasar a su sistema local físico, con las texturas de la vista general (sin sistema enfocado). Es la única forma determinista de ver de cerca un sistema de la vista general, cuya cámara gira alrededor del Sol.
- **Los mosaicos en gris y su color esquemático:** la escena tiñe cada mosaico en gris con el tono de su color esquemático, y el brillo del disco plano y el del mapa salen del albedo (D29): de media ya coinciden, y el script solo genera el color de los mapas en color (Ío y la Luna).
- **La compresión de los sistemas** (§4), en `ephemeris/scale.ts` (TS puro, con tests), y la presencia de las lunas en la vista general, en `visual-config.ts` (`overviewMoonsPx`).
- **`SunBloomPort`**, un miembro opcional del puerto del renderer (`renderer.ts`): el bloom se crea al primer uso, se compila antes del primer frame con `compileAsync` (cada programa en la variante con la que se usa: el Sol y los que lo tapan, en su render target; la mezcla, en el lienzo), sigue el tamaño del lienzo y, donde no se usa (el nivel bajo y las vistas Tierra, Luna y cielo), suelta la memoria de vídeo de sus render targets y conserva sus materiales compilados: al volver, no hay que compilarlos. El renderer falso de los tests lleva uno que cuenta lo que se le pide.
- **`renderer.info.autoReset = false`**: las llamadas de dibujo y los triángulos de un frame suman todas sus pasadas; three los ponía a cero en cada `render`, y el bloom se habría quedado solo con los de su última pasada.
- **`scene/layers.ts`**: las capas del bloom (el Sol y los que lo tapan), para que `sun-bloom.ts` no dependa de `world.ts`.
- **`totalityOf`** (`sky-colors.ts`, con test): la totalidad, de 0 a 1, del 99,9 % al 100 % del disco tapado.
- **`scripts/lib/color.mjs`**: sRGB → lineal y CIELAB para los scripts de medida (los anteriores llevan su propia copia).

- **Las formas como rejilla de radios** (9b.d.1): una forma estrellada vista desde su centro (como los modelos de Thomas) es una función r(latitud, longitud); la escena deforma con ella la esfera que ya usa (la detallada o la ligera), así el mapa se proyecta igual que en la esfera y no hay malla nueva que mantener. Se carga al pedir el mapa de la luna (`EngineDeps.loadShape`, como las constelaciones) y, mientras, es una esfera. El binario lleva su hash en la consulta (`?v=`): un nombre fijo que los tests leen.
- **Las normales de los cuerpos, del atributo `normal`** (`body-material.ts`): en la esfera es la posición, como antes; en las formas, la de la rejilla. La esfera cúbica de la Luna (sin normales) sigue con la posición.
- **La recreación, en `build-textures.mjs`, con su calidad como condición del build**: si una luna no cumple el grano o el borde, o si lo real cambia un canal, el build falla.
- **Las recetas:** Tritón, con su casquete (el del sur, real; el del norte, por encima de una frontera de unos 47° con un ruido fractal de ±14° y apartada de lo real; el resto, con la «piel de melón» y las llanuras de lo visto). Las demás, la receta por defecto: lo no visto, con parches de todo lo real de la misma luna (en Miranda, sus coronas y su terreno de cráteres por igual) y el brillo de lo visto extendido sobre la esfera; lo visto de lejos, con su brillo real por encima de 1,5 veces su resolución de origen y detalle por debajo.
- **Los mapas del JPL, con `plain`** (`loadMosaic`): un TIFF sin georreferencia con la longitud de su borde izquierdo y el sentido de sus columnas dados, que comprueban las sondas; y, en Deimos, `background`: el fondo claro de su carta, lo no cartografiado, como sin datos (§4).
- **El color de las lunas en gris, de su B−V** (`COLOR_INDICES`, `data/photometry.ts`): la reflectividad relativa en B y V frente a la del Sol, en las longitudes de onda pivote de Johnson del SVO, con `bandChromaticity` (el método de Venus). Son tintes casi neutros, como dice la NASA.
- **`TEXTURE_ALBEDO_REFERENCE`** (generado en `texture-files.ts`): las texturas cuyo brillo se calibra con una región (Jápeto: su hemisferio trasero a 0,55) y no con su media.
- **`mapNote`** (`BodyTexts`, generado por `build-body-texts.mjs`): la línea sobre el mapa, con fuente de la NASA y citas comprobadas o sin fuente (`source: null`); también en `docs/datos/textos-cuerpos.md` y en `docs/revision-textos.md`.
- **`data/moon-recreation.ts`** (generado por `build-textures.mjs`): lo medido de cada luna, para la tabla de `/creditos`, siempre igual a lo del build.

- **El Sol realzado, en los shaders que ya había** (9b.f): el disco (`uEnhance`, la paleta y la estructura) y el halo (los rayos y las protuberancias), sin mallas ni pasadas nuevas: las mismas llamadas de dibujo y la misma VRAM. Sus valores fijos (la paleta, la amplitud, los colores) se ponen una vez al crear el mundo; en cada frame, solo su tiempo y el brillo de las protuberancias con el primer plano. Así se calibran cambiando los uniformes en la página, sin rehacer el build.
- **`?medida=limbo` mide el Sol de D41** (9b.f): `setSunMeasure` apaga el realzado; el limbo sigue midiéndose sobre la ley publicada.
- **Las herramientas de D46** (`measure-d46.mjs`, `capture-d46.mjs` y `lib/disc-metrics.mjs`), comunes a A y B, con `--solo=`: cada sesión mide y captura lo suyo.
- **La Tierra realzada, con uniformes inertes por defecto** (9b.f, B): con ellos a cero, la Tierra mide igual que antes (el océano, L\* 25,6 · C\* 18,7 · h 270°; las nubes, el 9,8 %). Se calibró cambiando los uniformes en la página, sin rehacer el build, y los valores van en `VISUAL_CONFIG.earth.enhanced`, conectados en `configureEarth` (con su test en `engine.spec.ts`).
- **El reflejo, con dos tonos:** el núcleo, blanco (el Sol); el lóbulo ancho, cian (`glint.tint`). Sumado en blanco sobre el océano azul, salía una mancha gris; la referencia lo tiene cian.
- **La vegetación, por su verdor:** el tinte va donde el verde supera al rojo y al azul. Aplicado a toda la tierra que no es árida, teñía de verde lima la nieve del Himalaya y las salinas del Sáhara, que son neutras.
- **El relieve ×5, sin el escalón de cuantización:** amplificado, el mapa de normales de 8 bits dibujaba rectángulos en las llanuras (India, Tarim) y manchas oscuras (Afganistán); antes de amplificar se quita una zona muerta de ~1,5 niveles. Con más de ×6, vuelven los bloques.
- **La noche, con la Tierra de la fase 5:** el relleno nocturno de la vista general sale del albedo y de las nubes; con los realzados (un océano más oscuro y menos nubes), la Tierra de noche dejaba de leerse como un disco (ΔL\* de 4,1 a −0,2). El relleno de la noche y las nubes que tapan las luces usan el albedo (con la rodilla de lo árido de EPIC) y las nubes de la textura; por eso la rodilla realzada va en su propio uniforme (`uEnhancedAridKnee`, solo de día) y `uArid` no cambia.
- **El tinte del halo de la Tierra, con un `#define`** (`TLS_TINT`), no con un uniforme neutro: un uniforme a 1 en el shader compartido cambiaba algún píxel de Marte y de Titán.

- **El Sol de la segunda vuelta, en los mismos dos shaders** (el disco y el halo), sin mallas ni pasadas nuevas. Con el bloom apagado, gasta menos llamadas de dibujo y menos VRAM.
- **El realzado del disco** (`sun-material.ts`):
  - la paleta (centro y borde) y su mezcla por μ;
  - el perfil suavizado, con el brillo de μ = 0,1 en el último 0,5 % del radio (sin él, la ley iba a negro y el borde salía oscuro y dentado);
  - la estructura: cinco octavas de ruido de gradiente propio, cada una apagada cuando su detalle mide menos de un par de píxeles (sin moiré en la vista general);
  - su forma y un límite suave (tanh), con una ganancia por canal distinta en lo claro y en lo oscuro;
  - la granulación fina y las manchas pardas (su sombra, elevada a 1, 1,6 y 2,2 por canal).
- **El contraste, estable:**
  - En la primera versión de la segunda vuelta dependía de unas pocas manchas grandes y oscilaba de 4,1 a 6,3 en cinco minutos, con zonas pardas en algunos instantes (el 5 % más oscuro, hasta L\* 57).
  - Con el límite suave de lo oscuro, una forma más lineal y algo más de amplitud, queda de 4,66 a 5,57. Lo oscuro, como en la referencia: C\* 62,0 y h 72°, frente a 59,6 y 72°.
  - Una primera octava más alta (3,4 ciclos por radio) daba cifras aún más estables. Cambiaba el carácter de la superficie a «camuflaje», y la revisión pidió no tocar el aspecto hasta que opinara Iván.
- **El halo** (`createHaloMaterial`):
  - el borde fino, el resplandor suave y los rayos, con anchos mínimos en píxeles y su media cuando una celda mide menos de 2 px;
  - los bucles, con la distancia a cada semielipse aproximada por el valor de su ecuación entre su gradiente;
  - empieza a 0,97 radios: donde la silueta de la malla (un polígono) se queda dentro del círculo, el hueco lleva el borde y no el fondo;
  - lo que mide un píxel, sin derivadas (§4).
- **El enganche del motor:** `SUN_FRAME_MS` (50 ms) y `sunAnimates()` en `engine.ts`; el interruptor del bloom, en `compileSunBloom` y `sunBloomWanted`.
- **Las herramientas de la segunda vuelta:**
  - `capture-d46.mjs`, con `--antes=`, para comparar con la primera vuelta;
  - `measure-d46.mjs`, con la vista general (`overviewSunMetrics` y `ringLightness`, en `scripts/lib/disc-metrics.mjs`);
  - `scripts/capture-sun-motion.mjs`, nuevo: el movimiento en uso real, con y sin movimiento reducido.
- **El radio del halo de la vista general no cambia** (2,4 radios): `labels.ts` lo usa para apartar los nombres del Sol.

- **El radar, en el material de Venus con su `#define` (`TLS_RADAR`)** (9b.e): el albedo del radar sustituye al de las nubes según el fundido. Ni mallas, ni pasadas, ni llamadas de dibujo nuevas, y ningún otro cuerpo cambia (la lección del tinte del halo de la Tierra).
- **El brillo del radar, el de una textura de Venus** (`VISUAL_CONFIG.venus.radar.brightness`, 1): calibrado como su textura de nubes (el disco lleno, al albedo geométrico de Venus), sin el contraste rebajado de las nubes ni su color. La neblina del limbo, al 30 % (`haze`).
- **El estado del radar, en `scene/venus-radar.ts`** (con tests), y `venusRadarState` (solo lectura) en la API del motor: los scripts y los e2e esperan a que el radar esté a la vista.
  - Mientras llega la textura, siguen las nubes, con el botón ya pulsado y «Cargando la imagen de radar…»; si no llega, vuelven las nubes y se dice.
  - Al cambiar de calidad con el radar encendido, se pide al nivel nuevo y el anterior se suelta cuando llega.
- **El aviso, siempre a la vista con el radar:** si la ficha deja de verse (se cierra, otro cuerpo, otra vista), vuelven las nubes. En captura, `?radar=1` lo enciende sin la ficha.

- **`@defer (on idle(3s))`** (cierre): la interfaz del explorador llega cuando el navegador queda libre y, como mucho, a los 3 s.
- **`stats().texturesLoading`** (cierre): las texturas pedidas que no han llegado ni fallado, contadas en un envoltorio de la fuente de texturas del motor (`countedLoads`). «En reposo», para los e2e y las capturas, es también «sin texturas por llegar».
- **El índice, en el hover, con el color del texto** en los valores y en los nombres de las lunas (cierre): bajo la sombra de «hay más abajo», el gris no llegaba a 4,5:1.
- **Las etiquetas del 3D, con placa, y el suelo del cielo, con degradado** (cierre; `VISUAL_CONFIG.sky.ground.glow`: la fracción del color del horizonte junto a él, 0,6, y la profundidad a la que se apaga, 14°).

## 6. Salida de los checks
Entrega 9b.a (`npm run check`, 04-11):
```
All files pass linting.
Test Files 75 passed (75) · Tests 726 passed (726)
Statements 98,88 % · Lines 99,67 % (ephemeris/)
Initial total 310,81 kB
✔ El JS inicial de las 40 páginas (17 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 14,86 kB de 15,00
  Diferido: three, 747,22 kB en bruto
✔ Enlaces de las 40 páginas: 1163 internos bien (rutas, ficheros y anclas)
```
Métricas: la vista general, 21 llamadas de dibujo y 38,4 MB de VRAM (como en la fase 9); Júpiter de cerca con Ganímedes y su mapa, 81,0 MB.

Entrega 9b.b (`npm run check`, 04-11): lint limpio; 727 tests (75 ficheros); JS inicial de 310,81 kB; código propio inicial, 14,86 kB de 15; 1163 enlaces internos bien. `build-textures.mjs`, con las sondas nuevas: «earth-night: oscuros Atlántico 0, Sáhara 0 · claros Madrid 30, El Cairo 84 (girado 180°, fallaría)»; regenerado dos veces, los mismos ficheros (el resto, idénticos). En la vista Tierra, el mapa de noche de 2k pesa 37 kB (antes 61).

Entrega 9b.c (`npm run check`, 05-11): lint limpio; **744 tests** (76 ficheros); cobertura de `ephemeris/` del 98,93 % de las sentencias y el 99,69 % de las líneas; JS inicial de 310,81 kB; código propio inicial, 14,86 kB de 15; three, diferido, 775,14 kB (antes, 753,54: el `UnrealBloomPass` y el Sol nuevo); 1163 enlaces internos bien y 111 externos sin comprobar (dos nuevos, los de los artículos del Sol en `/creditos`: el de arXiv responde; el de ADS tiene una verificación antibots).

Entrega 9b.d (`npm run check`, 08-11):
```
All files pass linting. · All matched files use Prettier code style!
Test Files 77 passed (77) · Tests 762 passed (762)
Statements 98,93 % · Lines 99,69 % (ephemeris/)
Initial total 310,81 kB
✔ El JS inicial de las 40 páginas (17 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 14,86 kB de 15,00
  Diferido: three, 785,41 kB en bruto
✔ Enlaces de las 40 páginas: 1183 internos bien (rutas, ficheros y anclas); 118 externos sin comprobar
```
three, diferido, pasa de 775,14 kB (9b.c) a 785,41 por las formas de Fobos y Deimos, el terminador de Titán y el color de las lunas. `build-textures.mjs`, entero y determinista: las 97 texturas del manifiesto, en disco (nada sobra), con sus criterios de D45 y sus sondas.

El Sol de la 9b.f (`npm run check`, 08-11, sesión A): lint y Prettier limpios; **763 tests** (77 ficheros); la cobertura de `ephemeris/`, 98,93 % de las sentencias y 99,69 % de las líneas; el JS inicial, 310,81 kB; el código propio inicial, 14,86 kB de 15; three, diferido, 792,61 kB (antes, 785,41: el Sol realzado en sus shaders); 1184 enlaces internos bien.

La Tierra de la 9b.f, en su rama (`npm run check`, 08-11, sesión B, sobre `929818c`): lint y Prettier limpios; 763 tests (77 ficheros); el JS inicial, 310,81 kB; el código propio inicial, 14,86 kB de 15; three, diferido, 791,74 kB (en la 9b.d, 785,41: el GLSL nuevo y los bloques `enhanced`); 1183 enlaces internos bien. Los e2e de la Tierra, del contenido y del móvil, en verde.

**La 9b.f entera, el Sol y la Tierra juntos** (`npm run check`, 08-11, tras juntar la Tierra y arreglar el e2e del móvil, sobre `c8a965d`):
```
All files pass linting. · All matched files use Prettier code style!
Test Files 77 passed (77) · Tests 764 passed (764)
Statements 98,93 % · Lines 99,69 % (ephemeris/)
Initial total 310,81 kB
✔ El JS inicial de las 40 páginas (17 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 14,86 kB de 15,00
  Diferido: three, 798,65 kB en bruto
✔ Enlaces de las 40 páginas: 1184 internos bien (rutas, ficheros y anclas); 119 externos sin comprobar
```
three, diferido, 798,65 kB (en la 9b.d, 785,41: el GLSL del Sol y de la Tierra realzados y sus bloques `enhanced`). Sin avisos de presupuesto. Los 16 e2e del móvil, en verde en local (`E2E_PORT=4391`).

El Sol de la segunda vuelta, en su rama (`npm run check`, 08-11, sobre `315c1a9`): lint y Prettier limpios; 766 tests (77 ficheros); la cobertura de `ephemeris/`, 98,93 % de las sentencias y 99,69 % de las líneas; el build, sin avisos de presupuesto; el código propio inicial, 14,86 kB de 15; 1184 enlaces internos bien.

**La 9b.f con el Sol de la segunda vuelta** (`npm run check`, 08-11, tras juntarla y arreglar el halo, `d881476`):
```
All files pass linting. · All matched files use Prettier code style!
Test Files 77 passed (77) · Tests 767 passed (767)
Statements 98,93 % · Branches 94,18 % · Functions 100 % · Lines 99,69 % (ephemeris/)
Initial total 310,81 kB
✔ El JS inicial de las 40 páginas (17 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 14,86 kB de 15,00
  Diferido: three, 808,43 kB en bruto
✔ Enlaces de las 40 páginas: 1184 internos bien (rutas, ficheros y anclas); 119 externos sin comprobar
```
three, diferido, pasa de 798,65 kB (el Sol de la primera vuelta y la Tierra) a 808,43 por el GLSL del Sol de la segunda vuelta. Sin avisos de presupuesto. El test nuevo (el halo, sin derivadas) es el 767.

**Venus (9b.e), en su rama, con el Sol de la segunda vuelta traído** (`npm run check`, 08-11, sesión C, sobre `226ab0f`):
- lint y Prettier, sin avisos;
- **807 tests** (81 ficheros), con la cobertura de `ephemeris/` al 98,93 %;
- el build;
- el JS inicial, 315,18 kB (lo que trae la 9c), y el código propio inicial, **13,81 kB de 15**;
- three, diferido, 812,94 kB (el radar, +4,5);
- **1238 enlaces internos** bien.

**Los e2e** (`E2E_PORT=4421`, todos, con los tres proyectos): **136 de 136** (7,2 min). Antes de traer el Sol, 135 de 136: el que falló, `vistas.spec.ts:19` («sistema → Tierra → Luna → sistema … sin fugas», 25 texturas en lugar de 15), no toca el radar y pasó solo dos veces seguidas (tiempos, con la máquina cargada). El CI de la rama, en verde.

**El cierre** (`npm run check`, 08-11, con todo junto: la 9b entera, Venus, la 9c y lo del cierre):
```
All files pass linting. · All matched files use Prettier code style!
Test Files 81 passed (81) · Tests 808 passed (808)
Statements 98,93 % · Branches 94,18 % · Functions 100 % · Lines 99,69 % (ephemeris/)
Initial total 315,27 kB
✔ El JS inicial de las 40 páginas (20 ficheros) no lleva ningún módulo de three ni de astronomy-engine ni de los stores ni de los controles del visor.
✔ Código propio en los chunks iniciales: 13,81 kB de 15,00
  Diferido: three, 813,58 kB en bruto
✔ Enlaces de las 40 páginas: 1238 internos bien (rutas, ficheros y anclas); 120 externos sin comprobar
```
Sin avisos de presupuesto. Los tests nuevos: las texturas en vuelo (`engine.spec.ts`) y el arranque sin idle (`arranque.spec.ts`, e2e).

**Los e2e completos** (`E2E_PORT=4391 npx playwright test`, en local, con los tres proyectos y cuatro workers): en la primera pasada, 136 de 137 (la velocidad del arranque, 84,9 h/s: §4); con su arreglo, **137 de 137** (6,6 min). En el CI de la rama, en verde (los intermitentes que quedaban, con su causa en §4).

**Tras la revisión** (08-11, con sus correcciones): `npm run check`, otra vez en verde (808 tests, el JS inicial en 315,27 kB y el código propio en 13,81 kB de 15, three en 813,58 kB y 1238 enlaces internos bien), y los e2e completos en local, **138 pasan y 1 se salta** (el de axe a 320 px va solo en el proyecto del móvil).

## 7. Capturas
`docs/informes/img/fase-9b/`, `antes-*` (el build del primer commit de la fase, sin la disposición nueva) y `despues-*`, con `scripts/capture-moon-systems.mjs`:
- Júpiter de cerca: `escritorio-jupiter-cerca` y `movil-jupiter-cerca`; con sus lunas con mapa, `escritorio-jupiter-mapas`.
- Saturno: `escritorio-saturno-arriba` (2029, desde arriba: el criterio de los anillos), `escritorio-saturno-cerca` (2029), `escritorio-saturno-cerca-2026` y `movil-saturno-cerca`.
- La Tierra y la Luna (`escritorio-tierra-cerca`), Marte, Urano y Neptuno.
- La conjunción de Júpiter y Saturno de 2040 (`escritorio-conjuncion-2040`: los sistemas, comprimidos del todo) y la vista general, por defecto y acercada (`escritorio-sistema`, `escritorio-sistema-cerca`, `movil-sistema`: sin lunas, como antes).

- La Tierra de noche (9b.b), con `scripts/capture-earth.mjs`: `antes-` y `despues-tierra-vista-luces`, `-tierra-movil-vista-luces`, `-tierra-tierra-medianoche-utc` y `-tierra-sistema-noche` (con su `-detalle`, ampliado 4 veces alrededor de la Tierra).
- El Sol y la totalidad (9b.c), con `scripts/capture-sun.mjs` (`antes-*`, del build de la rama sin la entrega, `8068f3c`; `despues-*`): `sol-cerca` (solo el lienzo, como la comparativa de la fase 3b con el SDO), `escritorio-sol-cerca`, `movil-sol-cerca`, `escritorio-sol-sistema`, `movil-sol-sistema` y, solo después, `sol-medida-limbo`; la totalidad del 12-08-2026 desde Fraga: `escritorio-cielo-eclipse-fraga-cerca` (campo de 3°), `escritorio-cielo-eclipse-fraga` (50°) y `movil-cielo-eclipse-fraga-cerca`.
- Regeneradas con el motor nuevo (son capturas suyas): la miniatura y las imágenes de la ficha del Sol, la imagen para compartir (lleva el Sol) y el póster de la vista general (escritorio y móvil), para que el paso del póster al 3D no dé un salto. Al regenerar las miniaturas cambian también, de forma reproducible, las de la Tierra (su cara nocturna de la 9b.b, que no se había regenerado) y Marte (apenas: 104 canales de 27 648 con más de 8 niveles).

- Las lunas (9b.d), con el «antes» del build de `8165610` (la rama sin la entrega, servido desde una copia aparte):
  - la rejilla de las 20 (`antes-` y `despues-lunas-rejilla`) y los sistemas de cerca, `-escritorio-` y `-movil-europa-jupiter`, `-titan-saturno`, `-dione-saturno` y `-triton-neptuno`, con `scripts/capture-moons.mjs`;
  - las formas, `-forma-fobos`, `-forma-fobos-rasante`, `-forma-deimos` y `-forma-deimos-rasante`; Titán con la geometría de PIA06230, `-terminador-titan`; `-proteo` y `-japeto`, con `scripts/capture-moon-shapes.mjs`;
  - D45: cada luna con mapa (y Proteo) desde las seis direcciones de la adenda, `d45-<luna>-seis-vistas-antes` y `-despues`, con `scripts/capture-moon-views.mjs --antes=8165610`; y la máscara de las clases de cada una (sin tinte, lo real; en rojo, lo visto de lejos; en azul, lo no visto), en `mascaras/` (las genera `build-textures.mjs`).
  - regeneradas con las lunas nuevas (son capturas del motor): las miniaturas (`public/img/cuerpos/`) y las imágenes de las fichas (`public/img/fichas/`) de las lunas, que ahora salen con su mapa (Deimos, las de Urano y Proteo), con su forma (Fobos y Deimos), con Tritón y lo visto de lejos recreados, Jápeto con sus dos caras y Titán con su terminador. Con ellas cambian, de forma reproducible, las que no se habían regenerado tras las entregas anteriores: la de la Tierra (su cara nocturna de la 9b.b), las de Venus, Marte, Saturno, Urano y Neptuno (apenas: como mucho 20–24 niveles en algunos píxeles) y la imagen para compartir (`og.jpg`).

- El Sol realzado (9b.f, sesión A), con `scripts/capture-d46.mjs` en la fecha de la referencia (15-01-2026): `antes-` y `despues-d46-escritorio-sol-cerca`, `-movil-sol-cerca`, `-escritorio-sol-sistema` y `-movil-sol-sistema` (el «antes», del build de `43072d6`). Regeneradas con él: su miniatura, las imágenes de su ficha, la imagen para compartir y el póster de la vista general.
- La Tierra realzada (9b.f, sesión B), con `scripts/capture-d46.mjs` en la misma fecha: `antes-` y `despues-d46-escritorio-` y `-movil-tierra-completa`, `-pacifico` y `-himalaya` (12 capturas, con la interfaz; el «antes», del build de `d5ce7f8`). Regeneradas con ella: su miniatura y las imágenes de su ficha (en la rama de B) y, tras juntarla, los pósters de la vista general y de la vista Tierra y la imagen para compartir.
- El Sol de la segunda vuelta (9b.f):
  - Con `scripts/capture-d46.mjs`, en la fecha de la referencia: `sol2-antes-d46-` y `sol2-despues-d46-escritorio-sol-cerca`, `-movil-sol-cerca`, `-escritorio-sol-sistema` y `-movil-sol-sistema`. El «antes» es el Sol de la primera vuelta, del build de `d765654`.
  - El movimiento en uso real, con `scripts/capture-sun-motion.mjs`: `sol2-movimiento-t0` y `-t6` (en pausa, con 6 s entre las dos) y `sol2-movimiento-reducido-t0` y `-t6` (con movimiento reducido: iguales).
  - Lado a lado con la referencia, solo en local: `assets-src/referencias/comparativas/sol2-despues-d46-*.png`.
  - Regeneradas tras juntarla y arreglar el halo: la miniatura y las imágenes de la ficha del Sol, la imagen para compartir y el póster de la vista general (escritorio y móvil).
- Venus (9b.e), con `scripts/capture-venus.mjs` (el 05-11-2026, con la interfaz):
  - `venus-escritorio-nubes` y `venus-escritorio-radar`;
  - `venus-movil-nubes` y `venus-movil-radar` (390 × 844 a 2×, con la ficha abierta con «ⓘ»: el botón y su nota en la hoja en reposo);
  - `venus-radar-maat-mons` (solo el lienzo, con el radar y Maat Mons señalado).
- El cierre: `cierre-antes-` y `cierre-despues-`, con `-movil-etiquetas-sistema` y `-escritorio-etiquetas-tierra` (las etiquetas sin y con su placa; el «antes», el mismo build sin la regla nueva) y `-movil-cielo-noche` (el cielo de noche a 390 × 660, sin y con el degradado del suelo).

## 8. Dependencias añadidas
Ninguna.

## 9. Pendientes y `TODO(ivan)`
- Los PR 1 y 3 de Dependabot (E5), en `PENDIENTES.md`.
- ~~Dos frases de «Lo que es ilustrativo» del Sol, que la segunda vuelta dejó atrás~~: **al día en el cierre** (§4).
- **Los textos nuevos o cambiados de la fase**, en `docs/revision-textos.md` (regenerada en el cierre), para la revisión de Iván.
- **El criterio del borde de D45** (para Iván; revisión de la fase 9b, hallazgo 1): ¿el relativo, «no más de 2 L\* por encima de lo natural», o el absoluto de la adenda (ΔL\* ≤ 2), medido a una escala de brillo medio más ancha? Las cifras, en §2 y en `PENDIENTES.md`.
- **El color del radar de Venus** (para Iván): en gris (el producto tal cual) o teñido con el de las fotos de las Venera 13 y 14, como las vistas de Magellan de la NASA. Es un valor de `VISUAL_CONFIG`, con su fuente.

## 10. Propuestas de cambio al plan
- **Para la fase 10, de la escena** (lo que el cierre no hace del backlog 17):
  - **el rótulo de Saturno, junto al planeta:** hoy su hueco es el radio del anillo A en todas direcciones (`LABEL_EXTENTS`). Con lo que miden los anillos en pantalla en cada eje (el polo de Saturno en la cámara: `a·√(1 − n_x²)` en horizontal y `a·√(1 − n_y²)` en vertical), arriba y abajo el hueco sería casi el del disco, y el rótulo quedaría pegado al planeta;
  - **la precarga de texturas del recorrido** (la Tierra y la Luna, durante la parada de Saturno), una llamada nueva en la API de la escena;
  - **los nombres de los lugares de España** sobre sus puntos de la vista guiada.
- **Para la fase 10, de la revisión de la fase 9b:**
  - **el bloom del Sol,** apagado desde la segunda vuelta: quitarlo (queda en git) o cargarlo con `import()` solo si se enciende. Hoy, el `UnrealBloomPass` y `sun-bloom.ts` van en el chunk del visor sin usarse (unos 16 kB);
  - **el Sol de cerca en el móvil:** se pinta 20 veces por segundo, también en pausa. Medir FPS y batería en un móvil y valorar un ritmo menor en el nivel bajo; y un hash entero (WebGL2) o un tiempo acotado en su ruido, porque `fract(sin(x)·43758)` pierde precisión con argumentos grandes en las GPU de móvil;
  - **el terminador de Titán,** comprobado con otra foto de Cassini con otra fase (hoy se ajusta y se valida con PIA06230).
- **Para la fase 10** (9b.e): la máscara de cobertura de los mosaicos de las lunas, umbralizada antes de reducir, como la del radar (`zerosAreGaps`). Cambiaría los bordes de sus huecos, y con ellos las texturas y las medidas de D45: habría que rehacerlas y revisarlas.

## 11. Cómo probarlo
- `npm start` y, en el explorador, acercar la vista general hasta que Júpiter o Saturno midan más de 20 px de radio: aparecen sus lunas, fuera del planeta y de los anillos. Con `?fecha=2040-10-31T00:00Z`, en la conjunción de Júpiter y Saturno, sus sistemas se comprimen.
- `/?captura=1&cuerpo=saturno&marco=ilustrativo&fecha=2029-06-01T00:00Z` y Mayús + flecha arriba: el sistema de Saturno de la vista general, de cerca.
- `/luna`: las migas y «Lunas» marcado en el menú.
- `/explorar/tierra` y «Las luces de la noche»: la cara nocturna, negra, con las luces; `node scripts/measure-earth-night.mjs` mide el suelo y las luces en CIELAB.
- El Sol de cerca: en el explorador, «Sol» en el carrusel (o `/?cuerpo=sol`). Su superficie fluye despacio, también en pausa, y en el limbo hay tres bucles de plasma; con movimiento reducido, quieto. Desde la segunda vuelta de la 9b.f, el bloom de la 9b.c está apagado en los tres niveles (§4).
- Venus «Bajo las nubes»: en el explorador, Venus en la fila (o `/?cuerpo=venus`) y, en su ficha, «Bajo las nubes» (en el móvil, con «ⓘ»). `?captura=1&cuerpo=venus&radar=1` lo enciende sin la ficha. `node scripts/capture-venus.mjs <carpeta>` hace sus capturas, y con `--medir`, §5.
- El cierre: `E2E_PORT=4391 npx playwright test e2e/arranque.spec.ts -g requestIdleCallback` (el explorador carga aunque el navegador no quede libre nunca); el cielo de noche en un móvil pequeño, con el suelo en degradado.
- La totalidad: `/cielo?lugar=fraga&fecha=2026-08-12T18:29:29Z` y acercar hacia el Sol (al oeste, a 5° de altura).
- `node scripts/measure-sun.mjs` mide el limbo, el disco y la totalidad; `node scripts/capture-sun.mjs <carpeta> --prefijo=despues`, las capturas.
- El Sol y la Tierra realzados (9b.f): `/?cuerpo=sol` y `/explorar/tierra` («La Tierra completa», «El Pacífico» o «El Himalaya»). `node scripts/measure-d46.mjs --solo=sol` o `--solo=tierra` mide frente a las capturas de la referencia (en `assets-src/referencias/`, solo en local), y `node scripts/capture-d46.mjs <carpeta> --prefijo=despues [--comparar]`, las capturas.
- La segunda vuelta del Sol:
  - `node scripts/measure-d46.mjs --solo=sol` mide también la vista general.
  - `node scripts/capture-d46.mjs docs/informes/img/fase-9b --prefijo=sol2-despues --antes=sol2-antes --comparar --solo=d46-escritorio-sol-cerca,d46-movil-sol-cerca,d46-escritorio-sol-sistema,d46-movil-sol-sistema` hace sus capturas.
  - `node scripts/capture-sun-motion.mjs docs/informes/img/fase-9b` captura el movimiento en uso real.

## Respuesta a la revisión (08-11)
La revisión por subagente (`docs/revisiones/fase-9b.md`, sobre `1b28193`) da **cambios necesarios**: ningún Bloqueante, tres Importantes, cuatro Menores y cuatro Sugerencias. Repitió `npm run check`, los 137 e2e y las medidas del informe, con las mismas cifras.

| # | Severidad | Qué se ha hecho |
|---|---|---|
| 1 | Importante | **El criterio del borde de D45, para Iván.** La fila de §2 pasa de ✅ a ⚠️ en el borde (el grano cumple), con las cifras absolutas de la propia medida (el percentil 95, hasta 7,98 con lo no visto y 12,71 con lo visto de lejos, comprobadas en `docs/datos/recreacion-lunas.md`). La decisión, en §9 y en `PENDIENTES.md` («Fase 9b (08-11): para decidir»): el criterio relativo o el absoluto de la adenda, medido a una escala de brillo medio más ancha. |
| 2 | Importante | **Los ocho pósters, regenerados** con el build final (`build-poster.mjs`): la Luna del móvil, grande y centrada, como en el 3D; el cielo, con su horizonte y el suelo en degradado. El del cielo en el móvil mide 720 × 1424 (sin la cabecera de las otras vistas): `viewer-poster.ts` declara ahora su alto por vista. |
| 3 | Importante | **La tabla de `/creditos`, en una región desplazable que se enfoca** (`tabindex="0"`, `role="region"` y el nombre de su `caption`), como el diagrama de «Sobre el proyecto». Y un e2e nuevo, axe a 320 px en las 36 páginas de lectura (en el proyecto del móvil): sin el arreglo falla con `scrollable-region-focusable` en la tabla; con él, pasa. |
| 4 | Menor | **El plan, al día:** el bloom, apagado desde la segunda vuelta (la 9b.c y la tarea 9 de la fase 10), y la excepción al render bajo demanda del Sol de cerca (§4.5). Quitar el bloom del chunk del visor o cargarlo solo si se enciende, propuesto para la fase 10 (§10): toca el renderer y el motor, y no cambia nada de lo que se ve. |
| 5 | Menor | **`FUENTES.md`:** los pósters (ahora los ocho, con el cielo), las miniaturas y las imágenes de las fichas, con sus fechas y lo que cambia en la 9b, y las atribuciones del JPL (D43) y del NAIF. |
| 6 | Menor | **El informe, sin contradicciones:** la 9b.e en §1; la fila de los textos del Sol, ✅ (el panel ya lleva su línea, puesta por la sesión C al traer la 9c); y una sola cifra del contraste del Sol a lo largo del tiempo, la del build final (de 4,66 a 5,57), también en `visual-config.ts`. |
| 7 | Menor | **`PENDIENTES.md`:** el color del radar de Venus y el criterio de D45, para Iván, con las propuestas de la fase 10. |
| 8 | Sugerencia | El contraste de la placa de las etiquetas, en §4 (10,6:1, 6,9:1 y 5,4:1, calculados). |
| 9 | Sugerencia | El Sol de cerca en el móvil (FPS, batería y la precisión de su ruido), propuesto para la fase 10 (§10). |
| 10 | Sugerencia | El terminador de Titán con otra foto de Cassini, propuesto para la fase 10 (§10). |
| 11 | Sugerencia | El test de las nubes: la revisión tampoco le encuentra causa (determinista con su arnés, 119 ms en reposo y 167 ms con carga). Se deja como está; si vuelve a fallar, se guarda la salida completa para saber si fue una aserción o el tiempo. |

No queda ningún Bloqueante, así que no hace falta una segunda revisión (`CLAUDE.md`). `npm run check` y los e2e, otra vez en verde tras las correcciones (§6).
