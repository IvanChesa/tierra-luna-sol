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

for (const [file, url] of KTX2) {
  const target = new URL(file, KTX2_OUT);
  if (!FORCE && (await exists(target))) continue;
  const bytes = await download(url, target);
  console.log(`↓ ktx2/${file} (${bytes.byteLength} B)`);
}
console.log('Listo: assets-src/textures/, assets-src/elevation/ y assets-src/ktx2/');
