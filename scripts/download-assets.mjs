// Descarga los originales de las texturas a assets-src/ (no se versiona) y apunta de dónde sale
// cada fichero, cuándo se bajó y su SHA-256 en assets-src/textures/manifest.json (FUENTES.md).
// Uso: node scripts/download-assets.mjs [--force]
//
// Licencias (comprobadas en la página de cada fuente; detalle en docs/FUENTES.md):
// - Solar System Scope: CC BY 4.0 (https://www.solarsystemscope.com/textures/).
// - NASA SVS 4720 (CGI Moon Kit) y 4851 (Deep Star Maps 2020): material de la NASA; los datos de
//   Gaia DR2 son de uso libre con crédito a ESA/Gaia/DPAC.
// - three.js r186 (texturas KTX2 de ejemplo, solo para la prueba de KTX2): MIT.
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('assets-src/textures/', ROOT);
const KTX2_OUT = new URL('assets-src/ktx2/', ROOT);
const FORCE = process.argv.includes('--force');

const SSS = 'https://www.solarsystemscope.com/textures/download/';
const SSS_REFERER = 'https://www.solarsystemscope.com/textures/';
const SVS_MOON = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/';
const SVS_STARS = 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/';
const THREE_RAW = 'https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/textures/';

/** [fichero local, URL, página de la fuente (para el Referer y FUENTES.md)] */
const ASSETS = [
  ...[
    '8k_sun.jpg',
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
  // Vía Láctea: se descarga para poder evaluarla, pero no se publica (licencia CC BY-NC de Gaia
  // DR2; ver OMITTED en build-textures.mjs y docs/PENDIENTES.md).
  ['milkyway_2020_4k.exr', SVS_STARS + 'milkyway_2020_4k.exr', 'https://svs.gsfc.nasa.gov/4851'],
  // Vista previa con estrellas, solo para comprobar la orientación del mapa del cielo.
  [
    'starmap_2020_4k_print.jpg',
    SVS_STARS + 'starmap_2020_4k_print.jpg',
    'https://svs.gsfc.nasa.gov/4851',
  ],
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

for (const [file, url, page] of ASSETS) {
  const target = new URL(file, OUT);
  if (!FORCE && (await exists(target)) && manifest[file]) {
    console.log(`= ${file} (ya estaba)`);
    continue;
  }
  const bytes = await download(url, target, page);
  manifest[file] = {
    url,
    page,
    downloaded: new Date().toISOString().slice(0, 10),
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  console.log(`↓ ${file} (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
}
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');

for (const [file, url] of KTX2) {
  const target = new URL(file, KTX2_OUT);
  if (!FORCE && (await exists(target))) continue;
  const bytes = await download(url, target);
  console.log(`↓ ktx2/${file} (${bytes.byteLength} B)`);
}
console.log('Listo: assets-src/textures/ y assets-src/ktx2/');
