// D45 (fase 9b): cada luna desde las seis direcciones de la adenda (cuatro longitudes en el ecuador y
// los dos polos), sobre su textura de 2k tal como la carga la escena (la de public/textures, por el
// manifiesto src/app/scene/texture-files.ts), sin luz del Sol (el mapa tal cual: lo que se busca son
// zonas lisas, manchas borrosas, costuras, repeticiones y pellizcos en los polos). Con `--antes=<ref>`,
// la misma textura en ese commit (su manifiesto y su fichero, sacados con git), para compararlas.
// Con `--explorador` (D48, entrega 10.a): cada luna de cerca en el explorador, con la luz de la fecha de
// `--fecha=` (por defecto, el 09-11-2026: desde el equinoccio de Urano de 2007, el Sol ilumina sobre
// todo el norte de sus lunas, el recreado), en escritorio y en el móvil; sobre el build servido
// (`npm run build`; el «antes», con el build del commit de partida, y `--sufijo=antes`).
// Uso: node scripts/capture-moon-views.mjs <carpeta> [--antes=<ref>] [--prefijo=d45] [luna…]
//      node scripts/capture-moon-views.mjs <carpeta> --explorador [--sufijo=despues] [--fecha=…] [luna…]
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
const explorer = args.includes('--explorador');

/** [textura, nombre, id del catálogo]: las lunas con mapa (recreado en parte o generado, Proteo). */
const MOONS = [
  ['phobos', 'Fobos', 'fobos'],
  ['deimos', 'Deimos', 'deimos'],
  ['io', 'Ío', 'io'],
  ['europa', 'Europa', 'europa'],
  ['ganymede', 'Ganímedes', 'ganimedes'],
  ['callisto', 'Calisto', 'calisto'],
  ['mimas', 'Mimas', 'mimas'],
  ['enceladus', 'Encélado', 'encelado'],
  ['tethys', 'Tetis', 'tetis'],
  ['dione', 'Dione', 'dione'],
  ['rhea', 'Rea', 'rea'],
  ['iapetus', 'Jápeto', 'japeto'],
  ['miranda', 'Miranda', 'miranda'],
  ['ariel', 'Ariel', 'ariel'],
  ['umbriel', 'Umbriel', 'umbriel'],
  ['titania', 'Titania', 'titania'],
  ['oberon', 'Oberón', 'oberon'],
  ['triton', 'Tritón', 'triton'],
  ['proteus', 'Proteo', 'proteo'],
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

/** Las seis vistas de D45 de cada luna, sobre su textura de 2k (la de ahora o la de `--antes=`). */
async function sixViews() {
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
}

/**
 * Las lunas de D48 (las cinco de Urano y Tritón) de cerca en el explorador (`--explorador`), con la luz
 * de `--fecha=`: en escritorio, acercada dos pasos del zoom (×1,4 cada uno, como sus botones), y en el
 * móvil. Sobre el build servido (scripts/capture-lib.mjs, con `CAPTURE_PORT`).
 */
async function explorerShots() {
  const { openBrowser, openViewer, waitForIdle } = await import('./capture-lib.mjs');
  const date = args.find((a) => a.startsWith('--fecha='))?.slice(8) ?? '2026-11-09T12:00Z';
  const suffix = args.find((a) => a.startsWith('--sufijo='))?.slice(9) ?? 'despues';
  const moons = wanted.length
    ? wanted
    : ['miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton'];
  const devices = [
    ['escritorio', { width: 1600, height: 900, scale: 1 }, 2],
    ['movil', { width: 390, height: 844, scale: 2, mobile: true }, 0],
  ];
  const { browser, close } = await openBrowser();
  try {
    for (const id of moons) {
      const body = MOONS.find(([texture]) => texture === id)?.[2];
      if (!body) throw new Error(`«${id}»: no es una luna con mapa`);
      for (const [device, size, zoom] of devices) {
        const { page, problems } = await openViewer(
          browser,
          `/?captura=1&cuerpo=${body}&fecha=${date}`,
          size,
        );
        for (let i = 0; i < zoom; i++) await page.keyboard.press('+');
        if (zoom) await waitForIdle(page);
        const file = fileURLToPath(
          new URL(`${prefix}-${id}-explorador-${device}-${suffix}.webp`, dir),
        );
        await sharp(await page.screenshot())
          .webp({ quality: 88 })
          .toFile(file);
        console.log(
          `${id} (${device}): ${file}${problems.length ? ` · ${problems.join(' | ')}` : ''}`,
        );
        await page.close();
      }
    }
  } finally {
    await close();
  }
}

if (explorer) await explorerShots();
else await sixViews();
