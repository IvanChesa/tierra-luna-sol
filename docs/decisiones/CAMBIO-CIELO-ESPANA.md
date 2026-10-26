# Cambio: «El cielo desde el Bajo Cinca» → «El cielo desde España» (decisión de Iván, 26-10-2026)

> Se integra en `docs/PLAN.md`, `CLAUDE.md` y `docs/PENDIENTES.md` al aplicar la revisión del bloque B (junto con `FASE-3b-REALISMO.md`).

## Decisión
**Selector de lugares emblemáticos con el Parque Astronómico del Montsec (Lleida) por defecto**, más «usar mi ubicación» (opcional, solo en el navegador).

Lugares del selector:
| Id | Lugar | Por qué |
|---|---|---|
| `montsec` (por defecto) | Parque Astronómico del Montsec, Àger (Lleida) | Cielo oscuro de referencia y vínculo con Lleida |
| `roque-de-los-muchachos` | Observatorio del Roque de los Muchachos, La Palma | Uno de los mejores observatorios del mundo |
| `teide` | Observatorio del Teide, Tenerife | Icónico, en el Parque Nacional del Teide |
| `calar-alto` | Observatorio de Calar Alto, Almería | El gran observatorio de la Península |
| `observatori-fabra` | Observatori Fabra, Barcelona (sierra de Collserola) | Observatorio histórico de Barcelona (de 1904), símbolo de la ciudad; añadido a petición de Iván (26-10) para tener un lugar junto a Barcelona |
| `madrid` | Puerta del Sol (km 0), Madrid | El centro simbólico de España |
| `fraga` | Fraga (Bajo Cinca) | El origen de Iván; ya está en `places.ts` |

`lleida` se conserva en los datos, aunque no salga en el selector.

## Qué cambia en el plan
1. **Ruta:** `/cielo-bajo-cinca` → **`/cielo`** (parámetro `?lugar=teide`).
2. **Nombre de la mejora** (§0.2 y fase 8): «El cielo desde España: qué se ve esta noche desde los grandes observatorios del país (Montsec por defecto) o desde tu ubicación».
3. **`data/places.ts`** (fase 8): añadir los lugares de la tabla, con latitud, longitud y altitud de **fuentes oficiales citadas**: el IGN (Nomenclátor Geográfico o núcleos de población) o la web oficial de cada observatorio o del IAC. Cada lugar lleva `source` y su **zona horaria IANA**.
4. **Zona horaria por lugar:** `Europe/Madrid` en la Península y **`Atlantic/Canary` en el Teide y el Roque de los Muchachos** (una hora menos que la Península). Las horas de salida, puesta y crepúsculo se muestran en la hora local del lugar elegido, con la zona indicada. Sustituye a «el cielo del Bajo Cinca usa `Europe/Madrid`» de §4.3.
5. **Fixtures** (fase 8): salidas y puestas del USNO para **el Montsec y el Teide** (uno peninsular y uno canario, para probar las dos zonas horarias) en 3 fechas, en lugar de solo Fraga.
6. **Vista guiada de la Tierra** (fase 5): «España / Bajo Cinca» → **«España»**, con marcadores discretos en los lugares del selector. Fraga se mantiene como uno de ellos.
7. **`CLAUDE.md`, decisiones ya tomadas:** cambiar «España / Bajo Cinca» por «España» en la lista de vistas guiadas y añadir esta decisión.
8. **Textos:** donde diga «Bajo Cinca» como vista del cielo, decir «España» o el nombre del lugar elegido.

## Criterios de aceptación añadidos (fase 8)
- [ ] Cambiar de lugar recalcula el cielo y el panel «Esta noche», y la URL lo refleja (`?lugar=`).
- [ ] En el Teide y el Roque de los Muchachos, las horas salen en la hora canaria (test con un fixture del USNO).
- [ ] Las coordenadas de cada lugar tienen fuente oficial (test de campos).
