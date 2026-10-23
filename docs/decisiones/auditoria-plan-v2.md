# Auditoría del plan v1 (fases 2–10) → revisión 2

- **Fecha:** 24-10-2026
- **Autor:** sesión de revisión (Claude), a petición de Iván: «revisa bien todos los bloques restantes; quiero un proyecto profesional perfecto».
- **Método:**
  - lectura completa del plan v1;
  - contraste con el código del original (`ethanplusai/earth-moon-solar`), para verificar la paridad;
  - verificación en el código real de las APIs en las que se apoya el plan (`astronomy-engine` 2.1.19: `RotationAxis`, `Libration`, `SearchAltitude`, eclipses; three 0.186: `reversedDepthBuffer`, `compileAsync`);
  - lo aprendido en la fase 1.

## Resumen
El plan v1 era sólido en enfoque, pero tenía **4 huecos de paridad**, **5 decisiones de arquitectura colocadas demasiado tarde** (habrían obligado a rehacer trabajo), varios **problemas técnicos no previstos** y un **proceso con pocos puntos de control** en las fases más arriesgadas. La revisión 2 lo corrige sin cambiar el objetivo.

## 1. Huecos de paridad con el original (Bloqueante para «paridad completa»)
| Hallazgo | Evidencia en el original | Corrección |
|---|---|---|
| Sombras de los anillos de Saturno | `solar-shadows.js`: oclusión analítica anillo ↔ planeta | Fase 2, D20 |
| Vista limpia (ocultar la interfaz) | `mobile-layout.js`: «Clear view» / «Show controls» | Fase 3 |
| Botones de zoom | `exploration-shell.js`: botones +/− | Fase 3, también por accesibilidad |
| Encuadre que respeta los paneles en móvil | `mobile-camera.js`: `setViewOffset` según el panel | Fase 3 |
| Transiciones de los textos | `text-transition.js` | Fase 3 (CSS, con movimiento reducido) |

## 2. Arquitectura decidida demasiado tarde (Importante)
| Hallazgo | Riesgo | Corrección |
|---|---|---|
| El origen flotante y la escala real se dejaban para la fase 6, pero el «sistema local físico» de las lunas y la propia escala real los necesitan en el motor | Rehacer el motor en la fase 6 | D12: los tres marcos y el origen flotante desde la fase 2 |
| `logarithmicDepthBuffer` decidido en la fase 6, cuando los shaders de la Tierra y la Luna (fases 4–5) ya estarían escritos | Todos los `ShaderMaterial` necesitan sus chunks; three 0.186 ofrece `reversedDepthBuffer` | D13: se decide en la fase 2, con chunks comunes obligatorios |
| «Inclinación del eje» como un número fijo | Un ángulo no da la dirección del polo: los anillos de Saturno no se abrirían ni cerrarían con los años y los planetas girarían de forma inventada | D19: `Astronomy.RotationAxis` (IAU 2015) para el Sol, los planetas y la Luna (con libración física incluida) |
| KTX2 como plan B en la fase 9 | Cambiar el formato de las texturas al final obliga a rehacer el pipeline | D18: prueba medida en la fase 2 |
| §4.4 (lunas «expandidas») contradecía la fase 6 («escala física local») | Ambigüedad para el ejecutor | §4.4 redefinido con tres marcos explícitos |

## 3. Problemas técnicos no previstos (Importante)
| Hallazgo | Corrección |
|---|---|
| Los navegadores degradan los PNG de 16 bits a 8 al subirlos a WebGL: el relieve lunar tendría escalones | D15: 16 bits empaquetados en RG |
| VRAM: una textura de 8K ocupa ~170 MB en la GPU con mipmaps; muchos móviles tienen `maxTextureSize` de 4096 | Presupuesto de VRAM en §5, tope automático y calidad adaptativa |
| Decodificar texturas grandes en el hilo principal provoca tirones y hunde Lighthouse | §4.7: `ImageBitmapLoader`, `compileAsync`, subida progresiva y arranque troceado |
| Aliasing: a 1 año/s, Fobos (7,6 h) da cientos de vueltas por frame | §4.5: se muestra como órbita y se congela la rotación |
| Iluminación física: los planetas exteriores serían invisibles | D21: luz sin atenuación y exposición por vista, documentado |
| La URL se actualizaba durante la reproducción (navegaciones del router en bucle) | §4.5: solo en pausa, selección, vista o escala |
| La zona horaria fija «peninsular» confunde fuera de España | Explorador en hora local del navegador; el cielo del Bajo Cinca en `Europe/Madrid` |
| Faltaban los MIME de `.wasm` y `.ktx2` y `'wasm-unsafe-eval'` en la CSP si se usa KTX2 | Fase 4 |

## 4. Proceso (Importante)
| Hallazgo | Corrección |
|---|---|
| Despliegue solo al final: los problemas del hosting (Imunify360 ya bloqueó conexiones en ivanchesa.es) aparecerían en la última fase, y las pruebas en móvil dependían de la red local | D23: staging en la fase 4 (nueva), protegido con contraseña |
| Bloques grandes con las fases más arriesgadas juntas (4–6) | Bloques B (2–3), C (4–5), D (6–7), E (8–9) y F (10) |
| Sin diseño de alta fidelidad de la interfaz del explorador | Fase 3 empieza por la maqueta |
| Sin guía de estilo de los textos | `docs/ESTILO.md` en la fase 3 |
| Sin capturas reproducibles ni regresión visual | Modo `?captura=1` (fase 2) y regresión visual en el CI (fase 10) |
| Sin prueba en iOS (límites de memoria propios de Safari) | Fase 10 |
| Producción y staging sin separar; sin versión | Producción por etiqueta `v*`, `v1.0.0` y CHANGELOG (fase 11) |

## 5. Mejoras de nivel profesional añadidas
- **Eclipses en 3D:** la sombra de la Luna sobre la Tierra y la Luna enrojecida en la sombra terrestre, en las fechas reales (fases 5–6), enlazados desde `/eclipses` (fase 8).
- **Sombras de las galileanas sobre Júpiter** y eclipses de lunas (fase 7).
- **Vía Láctea alineada** con el cielo real (fase 2, si hay fuente libre).
- **Cielo del Bajo Cinca con crepúsculos**, color del cielo y refracción (fase 8).
- **Fichas con imágenes renderizadas por el propio motor** (fase 9).
- **`/sobre-el-proyecto` como caso de estudio** de portfolio (fase 9).
- **Privacidad total y comprobada** (0 cookies y 0 peticiones a terceros) y enlaces legales a ivanchesa.es (fase 9).
- **Control de cámara por teclado** y una descripción textual de lo que se ve (fase 3).

## 6. Ajustes por lo aprendido en la fase 1
- **30 cuerpos**, no 29.
- **D11:** elementos ajustados a las efemérides del JPL (la tabla de elementos medios no sirve para fechar). Objetivo de precisión de las otras lunas: de ≤ 5° a **≤ 0,5°** (conseguido: ≤ 0,38°).
- **§4.3:** la Tierra con EQD + sidéreo (lo hizo la fase 1).
- **Pendiente para la revisión del bloque A:** comprobar que los tests de las lunas usan **fechas no incluidas en el ajuste** (validación independiente).

## 7. Revisión específica del bloque B (fases 2–3), contrastada con el código de la fase 1
| # | Hallazgo | Corrección |
|---|---|---|
| B1 | El criterio «cara visible de la Luna ±8°» fallaría en los extremos de la libración (hasta ~7,9° en longitud y ~6,7° en latitud, más de 8° combinados) | Comparar con `Astronomy.Libration` con un margen de ±1° en 3 fechas |
| B2 | La fase 1 no creó un agregador de posiciones; el motor necesita los 30 cuerpos por frame | `ephemeris/system-state.ts` con caché y coste medido (2.a) |
| B3 | `scale.ts` de la fase 1 tiene los marcos ilustrativo y real, pero no el «sistema local físico» | Se añade en 2.a, con tests de continuidad |
| B4 | No había etiquetas de los cuerpos en ninguna fase: en la vista general no se sabe qué punto es cada planeta | Capa HTML de etiquetas que gestiona `scene/`, sin solapes y `aria-hidden` (2.c) |
| B5 | La prueba de KTX2 necesitaba una herramienta externa para codificar, y eso habría parado el modo autónomo | Medir con las texturas KTX2 de ejemplo de three; no es una condición de parada |
| B6 | Vía Láctea: si no hay fuente, el modo autónomo podía pararse | Se declara opcional y no es una condición de parada; se evita el formato EXR, que `sharp` no lee |
| B7 | Con `ImageBitmapLoader`, sin `imageOrientation: 'flipY'` las texturas salen invertidas y los alfas mal premultiplicados | Indicado en 2.b, junto con el `colorSpace` de cada mapa |
| B8 | Las órbitas con `Line` miden 1 px en casi todas las plataformas (pobres en pantallas de alta densidad) | `Line2` de `three/addons` (2.c) |
| B9 | Calidad adaptativa sin histéresis: puede oscilar, o bajar por medir FPS sin animación (render bajo demanda) | Solo baja, con histéresis y midiendo durante la animación; test con reloj falso |
| B10 | Motor difícil de testear (WebGL en jsdom) | Lógica separada del renderer, con una fábrica inyectable; tests sin WebGL |
| B11 | No había contrato de la API del motor antes de implementarlo | Contrato en `scene/index.ts` al principio de 2.a |
| B12 | Póster del `@placeholder` sin origen hasta la fase 9 | Póster provisional con el modo de captura (2.c) |
| B13 | Maqueta de la fase 3 aparte, que luego habría que reimplementar | Diseño directamente en componentes con datos de ejemplo |
| B14 | Faltaban el tiempo real (1 s/s), la reproducción hacia atrás y el comportamiento en los límites 1900/2100 | Añadidos en 3.b |
| B15 | Sin diálogo de atajos ni validación de los parámetros de la URL | Añadidos en 3.d |
| B16 | e2e de WebGL en Chromium sin interfaz necesita SwiftShader con flags explícitos | Indicado en 3.d |
| B17 | El selector de vistas incluía el cielo antes de que exista (fase 8) | La fase 3 solo tiene sistema solar, Tierra y Luna |

## 8. SEO (decisión de Iván, 24-10)
- **Fuera:** JSON-LD, sitemap trabajado y una imagen Open Graph por página.
- **Se queda:** title y description simples, una imagen Open Graph global, `robots.txt` básico y `noindex` en `/404`.
- Las fichas se mantienen como alternativa accesible sin 3D y como contenido del portfolio.
- Lighthouse SEO deja de ser criterio.

## 9. Revisión del bloque A (24-10)
Bloque A aprobado (`docs/revisiones/bloque-A.md`). Sus hallazgos están integrados en esta revisión del plan:
- achatamiento de los planetas (fase 2, 2.a);
- comprobación del bundle por `stats.json` (fase 2, 2.d);
- criterio de libración con `Astronomy.Libration` ±1° también en §5;
- D11 y §5 con la redacción aprobada (TT/UT);
- ΔT del IERS en el backlog;
- fixtures de control independientes y cota absoluta de las lunas, al adoptar el plan.

También, por preferencia de Iván, el ciclo del modo autónomo pasa a `CLAUDE.md` y los prompts se reducen a una línea («Bloque B.»).
