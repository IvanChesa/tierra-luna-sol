# Fuentes y licencias

Registro de todo recurso de terceros: imágenes, datos y librerías. Se refleja en la página `/creditos`.
Claude Code lo completa al incorporar cada recurso, con **archivo exacto, URL, fecha de descarga y licencia comprobada en la propia web de la fuente**.

## Previstas (comprobar en la fuente antes de usarlas)

| Recurso | Fuente | Licencia | Fase |
|---|---|---|---|
| Texturas del Sol, los planetas, la Tierra (día, noche, nubes, normales, especular) y los anillos de Saturno | Solar System Scope: https://www.solarsystemscope.com/textures/ | CC BY 4.0 (atribución obligatoria) | 2 |
| Luna en detalle: color (LROC) y elevación (LOLA) | NASA SVS, CGI Moon Kit: https://svs.gsfc.nasa.gov/4720 | Material de la NASA: citar «NASA's Scientific Visualization Studio», sin dar a entender que la NASA respalda el proyecto | 6 |
| Superficies de las lunas principales | USGS Astrogeology Science Center: https://astrogeology.usgs.gov/search | Dominio público (EE. UU.). **Comprobar luna a luna** qué mosaicos globales existen | 7 |
| Estrellas (magnitud ≤ 6,5) | HYG Database v4.x (David Nash / Astronomy Nexus): https://github.com/astronexus/HYG-Database | **CC BY-SA 4.0**: el fichero derivado se distribuye con la misma licencia y su aviso en `public/data/` | 1 ✅ |
| Líneas de constelaciones (opcional) | Por decidir en la fase 8 | Solo CC0, CC BY, MIT, BSD o dominio público (decisión de Iván); si no, se omiten | 8 |
| Posiciones, fases, salidas y puestas, lunas de Júpiter, orientación (`RotationAxis`), libración, crepúsculos y eclipses | astronomy-engine (Don Cross): https://github.com/cosinekitty/astronomy | MIT | 1 ✅ |
| Elementos orbitales medios de las lunas | NASA/JPL SSD: https://ssd.jpl.nasa.gov/sats/elem/ | Datos públicos de NASA/JPL | 1 ✅ (solo planos de Laplace y valores iniciales; los elementos se ajustan a Horizons, D11) |
| Parámetros físicos de las lunas | NASA/JPL SSD: https://ssd.jpl.nasa.gov/sats/phys_par/ | Datos públicos de NASA/JPL | 1 ✅ |
| Datos físicos de los planetas | NASA Planetary Fact Sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/ · NASA Science: https://science.nasa.gov/ | Material de la NASA (atribución) | 1 ✅ · 2 ✅ (achatamiento, fichas individuales; bordes de los anillos de Saturno) |
| Fixtures de posiciones | NASA/JPL Horizons API: https://ssd.jpl.nasa.gov/horizons/ | Datos públicos de NASA/JPL | 1 ✅ |
| Fixtures de fases y de salidas y puestas | USNO Astronomical Applications: https://aa.usno.navy.mil/ | Dominio público (EE. UU.) | 1 ✅ (fases, tiempo sidéreo y estaciones), 8 (salidas y puestas) |
| Fixtures de eclipses | NASA Eclipse Web Site: https://eclipse.gsfc.nasa.gov/ | Material de la NASA | 8 |
| Coordenadas de Fraga y Lleida | Instituto Geográfico Nacional u otra fuente oficial | Datos públicos | 1 ✅ |
| Motor 3D | three.js: https://threejs.org | MIT | 2 |
| Tipografías | Newsreader y Public Sans (Fontsource) | OFL-1.1 | 0 ✅ |
| Vía Láctea en coordenadas celestes (candidata) | NASA SVS, Deep Star Maps: https://svs.gsfc.nasa.gov/ (buscar «Deep Star Maps 2020») | Comprobar en la propia página, y que exista una versión sin estrellas | 2 |
| Líneas de constelaciones (candidata) | d3-celestial (Olaf Frohn): https://github.com/ofrohn/d3-celestial | Comprobar la licencia del repositorio y de los datos | 8 |
| Fixtures de eclipses (sombra del 12-08-2026, eclipses lunares) | NASA Eclipse Web Site: https://eclipse.gsfc.nasa.gov/ | Material de la NASA | 5, 6, 8 |
| Tránsitos de sombra de las galileanas | Fuente de efemérides publicada (por determinar en la fase 7) | Por comprobar | 7 |
| Transcodificador Basis (si se usa KTX2) | three.js, `examples/jsm/libs/basis/` | MIT / Apache-2.0 (comprobar) | 2 |

## Usadas (rellenar al incorporar cada recurso)

| Archivo en el repo | Origen (URL exacta) | Fecha de descarga | Licencia | Transformaciones |
|---|---|---|---|---|
| `@fontsource/newsreader` (latin 500) | https://fontsource.org/fonts/newsreader | 2026-10-23 | OFL-1.1 | Ninguna |
| `@fontsource/public-sans` (latin 400 y 600) | https://fontsource.org/fonts/public-sans | 2026-10-23 | OFL-1.1 | Ninguna |
| `astronomy-engine` 2.1.19 (dependencia npm) | https://github.com/cosinekitty/astronomy | 2026-10-23 | MIT | Ninguna |
| `public/data/stars.bin` (+ `stars.LICENSE.txt`) | HYG Database v4.1, David Nash (Astronomy Nexus), fijada por commit: https://raw.githubusercontent.com/astronexus/HYG-Database/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/hygdata_v41.csv (SHA-256 `d9f69fd8…ebe4ebd`) | 2026-10-23 | **CC BY-SA 4.0** (el derivado mantiene la licencia) | Solo magnitud ≤ 6,5 sin el Sol (8920 estrellas); ascensión recta, declinación, magnitud y B−V cuantizados a 16 bits; formato en `scripts/build-stars.mjs` |
| `src/app/ephemeris/fixtures/hyg-reference-stars.json` | La misma fila de HYG v4.1 | 2026-10-23 | CC BY-SA 4.0 | 6 estrellas copiadas sin cambios (solo test) |
| `src/app/ephemeris/fixtures/horizons-*.json` | NASA/JPL Horizons API, https://ssd-api.jpl.nasa.gov/doc/horizons.html (cada serie lleva su consulta exacta) | 2026-10-23 | Datos públicos de NASA/JPL | Ninguna (vectores en km, eclíptica J2000) |
| `src/app/ephemeris/fixtures/usno-*.json` | U.S. Naval Observatory, Astronomical Applications API, https://aa.usno.navy.mil/data/api (cada serie lleva su consulta) | 2026-10-23 | Dominio público (EE. UU.) | Ninguna |
| `src/app/data/moon-elements.ts` + `docs/datos/elementos-lunas.md` | Ajuste propio a NASA/JPL Horizons (consultas en el informe generado) · polos de Laplace: https://ssd.jpl.nasa.gov/sats/elem/ · polos de Urano y Neptuno: IAU WGCCRE 2015, https://doi.org/10.1007/s10569-017-9805-5 | 2026-10-23 | Datos públicos de NASA/JPL; constantes publicadas por la IAU | Elementos medios ajustados por mínimos cuadrados (`scripts/fit-moon-elements.mjs`) |
| `src/app/data/body-data.ts` | NASA NSSDCA: Planetary Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/), Sun Fact Sheet, Mars Fact Sheet y fichas de satélites de Júpiter, Saturno, Urano y Neptuno · NASA/JPL, Planetary Satellite Physical Parameters (https://ssd.jpl.nasa.gov/sats/phys_par/) · **fase 2:** fichas individuales de cada planeta (`…/factsheet/mercuryfact.html`, `venusfact`, `earthfact`, `marsfact`, `jupiterfact`, `saturnfact`, `uranusfact`, `neptunefact`; fila «Ellipticity (Flattening)») y Saturnian Rings Fact Sheet (`…/factsheet/satringfact.html`) | 2026-10-23 · 2026-10-24 (achatamiento y anillos) | Material de la NASA (atribución) · datos públicos de NASA/JPL | Cambios de unidad exactos; radio de los planetas = diámetro / 2; achatamiento y bordes de los anillos copiados sin cambios (`scripts/build-body-data.mjs`) |
| `scripts/content/body-texts.json` → `src/app/data/body-texts.ts` + `docs/datos/textos-cuerpos.md` | Páginas de NASA Science (science.nasa.gov) y nasa.gov, una por texto (URL exacta en cada uno; 332 citas literales en inglés en el JSON y en la lista de revisión) | 2026-10-23 | Material de la NASA (atribución; sin respaldo de la NASA al proyecto) | Textos propios en español, traducidos y resumidos a partir de las citas; `scripts/build-body-texts.mjs` comprueba que cada cita está en su página |
| `src/app/data/places.ts` | IGN, API OGC «Núcleos de población»: https://api-features.ign.es/collections/nuc/items/200000448 (Fraga) y …/900014081 (Lleida) | 2026-10-23 | Uso libre compatible con CC BY 4.0 (Orden FOM/2807/2015, https://www.ign.es/web/politica-datos); cita: «© Instituto Geográfico Nacional» | Ninguna |
| `src/app/ephemeris/constants.ts` (`KM_PER_AU`) | IAU 2012, resolución B2: https://www.iau.org/static/resolutions/IAU2012_English.pdf | 2026-10-23 | Constante publicada por la IAU | Ninguna |
