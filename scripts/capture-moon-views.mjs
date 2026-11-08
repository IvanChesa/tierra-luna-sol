// D45 (fase 9b): cada luna desde las seis direcciones de la adenda (cuatro longitudes en el ecuador y
// los dos polos), sobre su textura de 2k tal como la carga la escena (la de public/textures, por el
// manifiesto src/app/scene/texture-files.ts), sin luz del Sol (el mapa tal cual: lo que se busca son
// zonas lisas, manchas borrosas, costuras, repeticiones y pellizcos en los polos). Con `--antes=<ref>`,
// la misma textura en ese commit (su manifiesto y su fichero, sacados con git), para compararlas.
// Uso: node scripts/capture-moon-views.mjs <carpeta> [--antes=<ref>] [--prefijo=d45] [luna…]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { SIX_VIEWS, renderGlobe } from './lib/globe.mjs';

const ROOT = new URL('../', import.meta.url);
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--'));
if (!out) throw new Error('Uso: node scripts/capture-moon-views.mjs <carpeta> [--antes=<ref>]');
const before = args.find((a) => a.startsWith('--antes='))?.slice(8) ?? null;
const prefix = args.find((a) => a.startsWith('--prefijo='))?.slice(10) ?? 'd45';
const wanted = args.filter((a) => !a.startsWith('--')).slice(1);

/** [textura, nombre]: las lunas con mapa (recreado en parte o generado, Proteo). */
const MOONS = [
  ['phobos', 'Fobos'],
  ['deimos', 'Deimos'],
  ['io', 'Ío'],
  ['europa', 'Europa'],
  ['ganymede', 'Ganímedes'],
  ['callisto', 'Calisto'],
  ['mimas', 'Mimas'],
  ['enceladus', 'Encélado'],
  ['tethys', 'Tetis'],
  ['dione', 'Dione'],
  ['rhea', 'Rea'],
  ['iapetus', 'Jápeto'],
  ['miranda', 'Miranda'],
  ['ariel', 'Ariel'],
  ['umbriel', 'Umbriel'],
  ['titania', 'Titania'],
  ['oberon', 'Oberón'],
  ['triton', 'Tritón'],
  ['proteus', 'Proteo'],
];
const SIZE = 400;
const LABEL = 30;

const git = (...a) => execFileSync('git', a, { cwd: fileURLToPath(ROOT), maxBuffer: 1 << 28 });

/** El fichero de 2k de una textura en el manifiesto de un commit (o en el de ahora). */
function fileOf(id, ref) {
  const manifest = ref
    ? git('show', `${ref}:src/app/scene/texture-files.ts`).toString('utf8')
    : readFileSync(new URL('src/app/scene/texture-files.ts', ROOT), 'utf8');
  const block = manifest.match(new RegExp(`(?:'${id}'|\\b${id}): \\[([\\s\\S]*?)\\]`))?.[1];
  const path = block?.match(/level: '2k',\s*path: '([^']+)'/)?.[1];
  return path ?? null;
}

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const dir = isAbsolute(out)
  ? pathToFileURL(`${out.replace(/[\\/]?$/, '/')}`)
  : new URL(`${out.replace(/\/?$/, '/')}`, ROOT);
await mkdir(dir, { recursive: true });
for (const [id, name] of MOONS) {
  if (wanted.length && !wanted.includes(id)) continue;
  const path = fileOf(id, before);
  if (!path) {
    console.log(`${id}: sin textura de 2k${before ? ` en ${before}` : ''}`);
    continue;
  }
  const input = before
    ? git('show', `${before}:public/${path}`)
    : fileURLToPath(new URL(`public/${path}`, ROOT));
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tiles = SIX_VIEWS.map(([label, lat, lon]) => ({
    label,
    image: renderGlobe(data, info.width, info.height, lat, lon, SIZE, 1),
  }));
  const composites = tiles.flatMap((tile, i) => [
    {
      input: tile.image,
      raw: { width: SIZE, height: SIZE, channels: 3 },
      left: (i % 3) * SIZE,
      top: Math.floor(i / 3) * (SIZE + LABEL) + LABEL,
    },
    {
      input: Buffer.from(
        `<svg width="${SIZE}" height="${LABEL}"><text x="${SIZE / 2}" y="21" font-family="sans-serif" font-size="17" fill="#d8dce6" text-anchor="middle">${escapeXml(`${name} · ${tile.label}`)}</text></svg>`,
      ),
      left: (i % 3) * SIZE,
      top: Math.floor(i / 3) * (SIZE + LABEL),
    },
  ]);
  const file = fileURLToPath(
    new URL(`${prefix}-${id}-seis-vistas-${before ? 'antes' : 'despues'}.webp`, dir),
  );
  await sharp({
    create: {
      width: SIZE * 3,
      height: (SIZE + LABEL) * 2,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 82 })
    .toFile(file);
  console.log(`${id}: ${path} → ${file}`);
}
