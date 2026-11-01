// Descarga los originales de las texturas a assets-src/ (no se versiona) y apunta de dónde sale
// cada fichero, cuándo se bajó y su SHA-256 en assets-src/textures/manifest.json (FUENTES.md).
// Uso: node scripts/download-assets.mjs [--force]
//
// Licencias (comprobadas en la página de cada fuente; detalle en docs/FUENTES.md):
// - Solar System Scope: CC BY 4.0 (https://www.solarsystemscope.com/textures/).
// - NASA SVS 4720 (CGI Moon Kit): material de la NASA; el color (LROC) y la elevación (LOLA) de la Luna.
// - Vía Láctea (fase 3b): «The Milky Way panorama», ESO/S. Brunier, con la licencia por defecto de
//   las imágenes de ESO, CC BY 4.0 (https://www.eso.org/public/outreach/copyright/); su página no
//   indica ninguna excepción. Sustituye al mapa de NASA SVS 4851, descartado por la licencia
//   CC BY-NC de Gaia DR2.
// - three.js r186 (texturas KTX2 de ejemplo, solo para la prueba de KTX2): MIT.
// - Modelos de elevación (fase 3b, relieve): MOLA MEGDR de 16 px/° (PDS Geosciences Node, datos de
//   la NASA) y MESSENGER, modelo global de 665 m v2 (USGS Astrogeology: «USGS-authored or produced
//   data and information are considered to be in the U.S. Public Domain»; uso: citar a los autores).
// - Lunas (fase 7): mosaicos globales de Astropedia (USGS Astrogeology; en su ficha, «Public domain»
//   o sin restricciones, y «Please cite authors») y, Mimas, el mapa del DLR archivado en el PDS
//   (COISS_3006: datos de la NASA, dominio público en EE. UU.).
// - Constelaciones (fase 8): las líneas y los nombres de d3-celestial (Olaf Frohn), con licencia BSD
//   de 3 cláusulas (su LICENSE, que se descarga con ellos), sobre las cartas de las constelaciones de
//   la IAU; fijados a un commit.
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('assets-src/textures/', ROOT);
const KTX2_OUT = new URL('assets-src/ktx2/', ROOT);
const FORCE = process.argv.includes('--force');

const SSS = 'https://www.solarsystemscope.com/textures/download/';
const SSS_REFERER = 'https://www.solarsystemscope.com/textures/';
const SVS_MOON = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/';
const ESO_MILKY_WAY = 'https://cdn.eso.org/images/original/eso0932a.tif';
const ESO_MILKY_WAY_PAGE = 'https://www.eso.org/public/images/eso0932a/';
const THREE_RAW = 'https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/textures/';
const MOLA = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/';
const MOLA_PAGE = 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html';
const LOLA_POLAR =
  'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/';
const LOLA_POLAR_PAGE = 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm';
/** Mosaicos globales de las lunas (fase 7): el bucket del USGS Astrogeology y sus páginas. */
const USGS_MOSAIC = 'https://planetarymaps.usgs.gov/mosaic/';
const ASTROPEDIA = 'https://astrogeology.usgs.gov/search/map/';
/**
 * Mimas (fase 7): Astropedia no tiene su mosaico; el mapa final del DLR (Roatsch et al., 2018), en el
 * volumen cartográfico de Cassini ISS del PDS (COISS_3006, nodo Rings).
 */
const MIMAS_PDS = 'https://pds-rings.seti.org/holdings/volumes/COISS_3xxx/COISS_3006/';
const MERCURY_DEM =
  'https://planetarymaps.usgs.gov/mosaic/Mercury_Messenger_USGS_DEM_Global_665m_v2.tif';
const MERCURY_DEM_PAGE =
  'https://astrogeology.usgs.gov/search/map/mercury_messenger_global_dem_665m';

/** [fichero local, URL, página de la fuente (para el Referer y FUENTES.md)] */
const ASSETS = [
  ...[
    '8k_mercury.jpg',
    '4k_venus_atmosphere.jpg',
    '8k_earth_daymap.jpg',
    '8k_earth_nightmap.jpg',
    '8k_earth_clouds.jpg',
    '8k_earth_normal_map.tif',
    '8k_earth_specular_map.tif',
    '8k_mars.jpg',
    '8k_jupiter.jpg',
    '8k_saturn.jpg',
    '8k_saturn_ring_alpha.png',
    '2k_uranus.jpg',
    '2k_neptune.jpg',
  ].map((file) => [file, SSS + file, SSS_REFERER]),
  [
    'lroc_color_poles_4k.tif',
    SVS_MOON + 'lroc_color_poles_4k.tif',
    'https://svs.gsfc.nasa.gov/4720',
  ],
  // La Luna en detalle (fase 6): el color en 8K, solo para el nivel alto.
  [
    'lroc_color_poles_8k.tif',
    SVS_MOON + 'lroc_color_poles_8k.tif',
    'https://svs.gsfc.nasa.gov/4720',
  ],
  // Vía Láctea: panorama de 6000 × 3000 px en coordenadas galácticas (el original completo).
  ['eso0932a.tif', ESO_MILKY_WAY, ESO_MILKY_WAY_PAGE],
  // Las lunas (fase 7): mosaicos globales del USGS Astrogeology, en dominio público (FUENTES.md, uno a
  // uno). Deimos, Proteo y las cinco de Urano no tienen ninguno: se quedan con su color esquemático. El
  // de Titán (ISS, 938 nm) es la superficie bajo su neblina, invisible en luz visible: no se usa.
  ...[
    ['Phobos_Viking_Mosaic_40ppd_DLRcontrol.tif', 'phobos_viking_global_mosaic_5m'],
    // Ío, en color (revisión del bloque D, D1): el mosaico en gris con el color de Galileo (756 nm,
    // verde y violeta, los filtros de PIA02308) superpuesto por cocientes; sustituye al gris teñido.
    [
      'Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif',
      'io_galileo_ssi_voyager_color_merged_global_mosaic_1km',
    ],
    [
      'Europa_Voyager_GalileoSSI_global_mosaic_500m.tif',
      'europa_voyager_galileo_ssi_global_mosaic_500m',
    ],
    [
      'Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif',
      'ganymede_voyager_galileo_ssi_global_mosaic_1km',
    ],
    [
      'Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif',
      'callisto_galileo_voyager_global_mosaic_1km',
    ],
    ['Enceladus_Cassini_mosaic_global_110m.tif', 'enceladus_cassini_global_mosaic_110m'],
    ['Tethys_Cassini_mosaic_global_293m.tif', 'tethys_cassini_global_mosaic_293m'],
    ['Dione_Cassini_Voyager_mosaic_global_154m.tif', 'dione_cassini_voyager_global_mosaic_154m'],
    ['Rhea_Cassini_Voyager_mosaic_global_417m.tif', 'rhea_cassini_voyager_global_mosaic_417m'],
    [
      'Iapetus_Cassini_Voyager_mosaic_global_783m.tif',
      'iapetus_cassini_voyager_global_mosaic_803m',
    ],
    ['Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif', 'triton_voyager_2_global_color_mosaic_600m'],
  ].map(([name, page]) => [name, USGS_MOSAIC + name, ASTROPEDIA + page]),
  // Mimas: 5760 × 2880 px (16 px/°, 216 m por píxel), en un IMG del PDS con su etiqueta dentro.
  ['SM_1M_0_0_SIMP.IMG', MIMAS_PDS + 'data/images/SM_1M_0_0_SIMP.IMG', MIMAS_PDS],
];

/**
 * Anillos de Saturno (fase 7, D36): el perfil radial de la profundidad óptica normal de la ocultación
 * de β Centauri del 18-08-2008 (Cassini UVIS, HSP; órbita 81, entrada), con 1 km de paso, y su
 * etiqueta: COUVIS_8001 del PDS Ring-Moon Systems Node (Colwell et al., «Cassini Orbiter Saturn UVIS
 * Ring Stellar Occultations 3.0», CO-SR-UVIS-HSP-2/4-OCC-V3.0, 2020; https://doi.org/10.17189/1522418:
 * «a work of the U.S. Government and is not subject to copyright protection in the United States»).
 */
const RINGS_OUT = new URL('assets-src/rings/', ROOT);
const UVIS_PAGE = 'https://pds-rings.seti.org/holdings/volumes/COUVIS_8xxx/COUVIS_8001/';
const UVIS_PROFILE = 'UVIS_HSP_2008_231_BETCEN_I_TAU01KM';
const RINGS = ['TAB', 'LBL'].map((ext) => [
  `${UVIS_PROFILE}.${ext}`,
  `${UVIS_PAGE}data/${UVIS_PROFILE}.${ext}`,
  UVIS_PAGE,
]);

/** Constelaciones (fase 8): d3-celestial, fijado a su último commit (2022-07-05). */
const D3_CELESTIAL_COMMIT = '7e720a3de062059d4c5400a379146a601d9010e0';
const D3_CELESTIAL = `https://raw.githubusercontent.com/ofrohn/d3-celestial/${D3_CELESTIAL_COMMIT}/`;
const D3_CELESTIAL_PAGE = 'https://github.com/ofrohn/d3-celestial';
const CONSTELLATIONS_OUT = new URL('assets-src/constellations/', ROOT);
const CONSTELLATIONS = [
  ['constellations.lines.json', `${D3_CELESTIAL}data/constellations.lines.json`, D3_CELESTIAL_PAGE],
  ['constellations.json', `${D3_CELESTIAL}data/constellations.json`, D3_CELESTIAL_PAGE],
  ['LICENSE', `${D3_CELESTIAL}LICENSE`, D3_CELESTIAL_PAGE],
];
/** Modelos de elevación (fase 3b): a assets-src/elevation/, con su propio manifiesto. */
const ELEVATION_OUT = new URL('assets-src/elevation/', ROOT);
const ELEVATION = [
  ['megt90n000eb.img', MOLA + 'megt90n000eb.img', MOLA_PAGE],
  ['megt90n000eb.lbl', MOLA + 'megt90n000eb.lbl', MOLA_PAGE],
  ['Mercury_Messenger_USGS_DEM_Global_665m_v2.tif', MERCURY_DEM, MERCURY_DEM_PAGE],
  // La Luna (fase 6): la elevación del LOLA del CGI Moon Kit, 16 px/° (5760 × 2880), en enteros sin
  // signo de 16 bits: medios metros sobre la esfera de 1737,4 km, más 20 000 (10 km).
  ['ldem_16_uint.tif', SVS_MOON + 'ldem_16_uint.tif', 'https://svs.gsfc.nasa.gov/4720'],
  // Sus polos (revisión de la fase 6, hallazgo 1): la elevación equirrectangular junto a un polo salta
  // cientos de metros entre columnas separadas unos metros. Los modelos polares del LOLA (PDS,
  // estereográfica polar de 75° al polo, 240 m por píxel, enteros de 16 bits en medios metros).
  ...['ldem_75s_240m', 'ldem_75n_240m'].flatMap((name) => [
    [`${name}.img`, `${LOLA_POLAR}${name}.img`, LOLA_POLAR_PAGE],
    [`${name}.lbl`, `${LOLA_POLAR}${name}.lbl`, LOLA_POLAR_PAGE],
  ]),
];

const KTX2 = [
  ['spiritedaway.ktx2', THREE_RAW + 'spiritedaway.ktx2'],
  ['2d_etc1s.ktx2', THREE_RAW + 'ktx2/2d_etc1s.ktx2'],
  ['2d_uastc.ktx2', THREE_RAW + 'ktx2/2d_uastc.ktx2'],
];

async function exists(url) {
  try {
    return (await stat(url)).size > 0;
  } catch {
    return false;
  }
}

async function download(url, target, referer) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (tierra-luna-sol build)',
      ...(referer ? { Referer: referer } : {}),
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  const type = response.headers.get('content-type') ?? '';
  if (type.startsWith('text/html')) throw new Error(`${url} devuelve HTML, no la imagen`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(target, bytes);
  return bytes;
}

await mkdir(OUT, { recursive: true });
await mkdir(KTX2_OUT, { recursive: true });
const manifestUrl = new URL('manifest.json', OUT);
const manifest = (await exists(manifestUrl)) ? JSON.parse(await readFile(manifestUrl, 'utf8')) : {};

/** Descarga los ficheros que falten de una lista y los apunta en el manifiesto. */
async function downloadAll(list, dir, entries) {
  for (const [file, url, page] of list) {
    const target = new URL(file, dir);
    if (!FORCE && (await exists(target)) && entries[file]) {
      console.log(`= ${file} (ya estaba)`);
      continue;
    }
    const bytes = await download(url, target, page);
    entries[file] = {
      url,
      page,
      downloaded: new Date().toISOString().slice(0, 10),
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    console.log(`↓ ${file} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
  }
}

await downloadAll(ASSETS, OUT, manifest);
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');

await mkdir(ELEVATION_OUT, { recursive: true });
const elevationManifestUrl = new URL('manifest.json', ELEVATION_OUT);
const elevationManifest = (await exists(elevationManifestUrl))
  ? JSON.parse(await readFile(elevationManifestUrl, 'utf8'))
  : {};
await downloadAll(ELEVATION, ELEVATION_OUT, elevationManifest);
await writeFile(elevationManifestUrl, JSON.stringify(elevationManifest, null, 2) + '\n');

await mkdir(RINGS_OUT, { recursive: true });
const ringsManifestUrl = new URL('manifest.json', RINGS_OUT);
const ringsManifest = (await exists(ringsManifestUrl))
  ? JSON.parse(await readFile(ringsManifestUrl, 'utf8'))
  : {};
await downloadAll(RINGS, RINGS_OUT, ringsManifest);
await writeFile(ringsManifestUrl, JSON.stringify(ringsManifest, null, 2) + '\n');

await mkdir(CONSTELLATIONS_OUT, { recursive: true });
const constellationsManifestUrl = new URL('manifest.json', CONSTELLATIONS_OUT);
const constellationsManifest = (await exists(constellationsManifestUrl))
  ? JSON.parse(await readFile(constellationsManifestUrl, 'utf8'))
  : {};
await downloadAll(CONSTELLATIONS, CONSTELLATIONS_OUT, constellationsManifest);
await writeFile(constellationsManifestUrl, `${JSON.stringify(constellationsManifest, null, 2)}\n`);

for (const [file, url] of KTX2) {
  const target = new URL(file, KTX2_OUT);
  if (!FORCE && (await exists(target))) continue;
  const bytes = await download(url, target);
  console.log(`↓ ktx2/${file} (${bytes.byteLength} B)`);
}
console.log(
  'Listo: assets-src/textures/, assets-src/elevation/, assets-src/rings/, assets-src/constellations/ y assets-src/ktx2/',
);
