# Revisión: Bloque D (fases 6 y 7)

- **Fecha:** 2026-11-01
- **Revisor:** sesión de revisión (Claude), a petición de Iván
- **Revisado:**
  - la fase 6, ya en `main` (`e321a85`), con su revisión automática (`fase-6.md`);
  - la revisión del bloque C aplicada (`d9e2c89`, `revision-bloque-C.md`);
  - **la fase 7 en su rama** (`fase-7-lunas-escala-real`, `3445cc9`), con el informe «listo para revisión».
- **Esta revisión hace también de revisión de la fase 7.** La sesión de la terminal se paró por el límite de uso antes de lanzar el subagente. Para ahorrar ese gasto, la sesión de revisión ha revisado la fase directamente: el ciclo sigue con «Respuesta a la revisión» en el informe de la fase 7 y la fusión.
- **Veredicto: APROBADO.** Fase 7: **APROBADA CON CAMBIOS MENORES**. Se fusiona después de aplicar D1, D2 y D4, y el bloque E se puede lanzar al terminar.

## Verificación independiente
- **`npm run check` en la rama de la fase 7 → código 0:**
  - lint y Prettier limpios;
  - **567/567 tests** (cobertura de `ephemeris/` del 99,48 %);
  - build;
  - JS inicial de **298,66 kB** (aviso a 320);
  - código propio inicial de **12,13 kB de 15**.
- **CI de GitHub en la rama** (ejecución 41234386428): lint, tests, build y los **74 e2e** en verde, más la vista previa desplegada y comprobada. La ejecución roja anterior (41225586092) la arregló `63a331d`.
- **CI de `main`** tras la fase 6 (41159969591): en verde.
- **Capturas de la fase 7:**
  - **Anillos (D36):** el B, tostado; el C, gris y translúcido; la división de Cassini, oscura y con estructura; la de Encke, visible. En `ansa-ampliada` se ven las mesetas del C y la estructura del B. Es otro nivel respecto al bloque R.
  - **Lunas:** 12 mosaicos alineados y comprobados con sondas. Europa delante de Júpiter queda espectacular. Ver D1 (Ío) y D2 (Tritón).
  - **Tránsito del 24-1-2015:** la sombra de Calisto, con su penumbra ancha, y la de Ío, nítida, como debe ser por la distancia.
  - **Escala real:** sin temblores (medido).
  - **R2:** el anillo de luz del limbo a contraluz se ve.
- **Fase 6 (la Luna):** las texturas del LROC, el relieve del LOLA con los casquetes polares, la libración y la sombra de la Tierra frente al catálogo de la NASA. «Luz rasante» es de lo mejor del proyecto. VRAM: 266 MB en la vista Luna y 284 MB en el viaje Tierra ↔ Luna, dentro de §5 (C4 cumplido).

## Valoración
Muy buen bloque, con el mismo rigor de siempre:
- cada mosaico, con su licencia, su georreferencia y sondas que hacen fallar el build si el mapa está girado o reflejado;
- los anillos, con la τ de una ocultación real comprobada con los radios del PDS y el color de la reflectividad por bandas del Hubble;
- las desviaciones están bien razonadas: Titán sin superficie porque en luz visible no se ve, y las predicciones del IMCCE descartadas por su licencia.

## Hallazgos de esta revisión

| # | Severidad | Dónde | Hallazgo | Qué hacer |
|---|---|---|---|---|
| D1 | **Importante** (ahora) | Ío (`data/photometry.ts:325-334`; `lunas-mosaicos-despues`, la ficha de Ío en `escritorio-europa-jupiter`) | Ío sale **verde lima**. La cromaticidad media de PIA02308 (1,154 · 1,026 · 0,284), aplicada entera (`mix: 1`) sobre un mosaico en gris, da un amarillo verdoso uniforme. En la foto es un amarillo ocre, con manchas blancas, naranjas y negras. | Medir el tono y la croma (CIELAB, como con los anillos) de la escena frente a PIA02308, en la misma geometría, y corregir hasta una tolerancia declarada. Antes, comprobar si el USGS publica la versión en color del mosaico de Ío (por ejemplo, «ClrMerge») con licencia de dominio público. Si existe, usarla en lugar del tinte, con sus sondas. |
| D2 | Menor (ahora) | Tritón (`lunas-mosaicos-despues`) | El hueco que no vio Voyager 2 (el 38,4 %, relleno con el gris medio) **acaba en un corte duro**, un arco que parece un fallo de la textura. | Difuminar el borde del relleno unos grados y usar el gris de la franja vecina, no el medio global. Captura antes y después. Sigue señalado en el informe y en `/creditos`. |
| D3 | **Importante** (ahora, decisión de Iván) | Las vistas con un cuerpo de cerca (`ansa-ampliada`, `escritorio-saturno-hubble-2019`, `escritorio-europa-jupiter`, las vistas Tierra y Luna) | **Rectas que cruzan la pantalla.** De cerca, la órbita y la estela del propio cuerpo alrededor del Sol, y las de los demás planetas, se ven como rectas. En `ansa-ampliada`, una recta naranja atraviesa los anillos de Saturno. En la vista Europa, una diagonal acaba en el limbo de la luna. Detrás de la Tierra y de la Luna hay rayas azules. A esa escala no informan de nada y parecen fallos. | Desvanecer las órbitas y estelas que en pantalla son casi rectas: por la curvatura en pantalla o por el tamaño del cuerpo enfocado frente al radio de la órbita. Que el criterio dependa de lo que se ve, no de la vista. Las órbitas de las lunas en su sistema siguen, porque ahí sí se ven curvas. Test de la función y capturas antes y después de esas cinco vistas. |
| D4 | Menor (ahora) | Anillos a contraluz (`anillos-despues/escritorio-saturno-cassini-2013`) | El realce ilustrativo (×1,3) se aplica también a la cara en sombra: el anillo A a contraluz sale **casi blanco saturado**. D36 lo pedía para el brillo de los anillos respecto al disco con luz de frente. | Medir el A y el C a contraluz frente a PIA17172 (como `compare-rings.mjs`). Si se pasan, aplicar el realce solo a la luz reflejada de la cara iluminada, no a la transmitida. |
| D5 | **Importante** (ahora, decisión de Iván del 31-10) | `src/app/core/site.config.ts:22`, `:27`, sus tests, `CLAUDE.md`, `PLAN.md` (§0, D25, fases 9 y 11), `PENDIENTES.md` y `PROMPTS.md` | **El dominio cambia: ivanchesa.es pasa a ivanchesa.com** (comprado en Cloudflare Registrar; el .es se deja caducar y redirige al .com). El proyecto se publicará en **`tierra-luna-sol.ivanchesa.com`**. | `baseUrl` a `https://tierra-luna-sol.ivanchesa.com` y la URL del autor a `https://ivanchesa.com`, con sus tests (canonical incluido). En el plan: la fase 11 pasa a ser el dominio personalizado en Pages sobre la zona de ivanchesa.com, que está en la misma cuenta de Cloudflare: el registro DNS lo crea el propio panel, y lo hace Iván. Los enlaces legales de la fase 9, a ivanchesa.com. En `CLAUDE.md`, «desarrollador web freelance» pasa a «desarrollador de software» (Iván ya no es autónomo). Los textos visibles no lo mencionan (comprobado). |

## Propuestas de la fase 7 (§10 del informe)
1. **El terminador suave de Titán** → fase 10.
2. **La dicotomía de Jápeto** → **fase 10, no al backlog.** Su cara oscura sale a 0,58 de la clara, cuando la real es ≤ 0,1. Es lo más característico de esa luna, y el arreglo es llevar su contraste a los albedos medidos de cada hemisferio, con fuente.
3. **Las lunas de Urano con los mapas del JPL** → backlog. Se quedan con su color mientras la licencia no esté clara.
4. **El anillo A, con un perfil de I/F medido** → backlog.
5. **Pedir la textura del planeta al enfocar una luna** → fase 10.

## Decisiones de Iván
- **31-10:** el dominio pasa a ivanchesa.com (D5; se decidió en la sesión de ivanchesa.es).
- **31-10:** probó staging en su móvil y va bien; el panel de la Tierra se queda como está (C7); Web Analytics, desactivado. Ya está en `PENDIENTES.md` (`140162e`).
- **01-11:** D3 se hace ahora, como propone esta revisión: Iván lo acepta al lanzar el prompt. Si lo prefiere en la fase 10, lo dirá en el propio prompt.

## Para aplicar esta revisión (Claude Code)
1. En la rama `fase-7-lunas-escala-real`: **D1, D2 y D4**, con sus tests y capturas, y «Respuesta a la revisión» en `docs/informes/fase-7.md` (esta revisión hace de revisión de la fase: no hace falta otro subagente salvo que algún cambio sea grande).
2. **D3 y D5**, en la misma rama o en `revision-bloque-d` (a tu criterio), con sus tests y capturas.
3. **Plan:** las propuestas de arriba (fase 10 y backlog), D5 y la fase 11 con el dominio nuevo.
4. `npm run check` y e2e en verde, fusión con `--no-ff`, push, la línea de la fase 7 y el **resumen del bloque D** en `DIARIO.md`.
5. **Al terminar, para** (no empieces el bloque E): Iván fusiona el PR 1 de Dependabot en GitHub y reinicia Claude Code para instalar la actualización.
