// D45 (fase 9b), herramienta de revisión: mide el mapa de 2k de una luna, recrea lo que no se vio con su
// receta y guarda el mapa antes y después y las seis vistas de la adenda (cuatro longitudes del ecuador
// y los dos polos) antes y después, más la guía del nivel grueso. No toca las texturas del proyecto.
// EN CURSO (entrega 9b.d): la recreación aún no está en `build-textures.mjs`.
// Uso: node scripts/preview-moon-recreation.mjs <luna> [--out=carpeta] [--semilla=1]
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { SIX_VIEWS, renderGlobe } from './lib/globe.mjs';
import { recipeFor } from './lib/moon-recipes.mjs';
import { recreate } from './lib/moon-recreate.mjs';
import { MOON_MOSAICS, measureMoon } from './measure-moon-maps.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--')) ?? 'triton';
const out =
  args.find((a) => a.startsWith('--out='))?.slice(6) ?? join(tmpdir(), 'tierra-luna-sol-d45');
const seed = Number(args.find((a) => a.startsWith('--semilla='))?.slice(10) ?? 1);
if (!MOON_MOSAICS[id])
  throw new Error(`Sin mosaico para «${id}»: ${Object.keys(MOON_MOSAICS).join(', ')}`);
await mkdir(out, { recursive: true });

const W = 2048;
const H = 1024;
const t0 = Date.now();
const m = await measureMoon(id, MOON_MOSAICS[id]);
const pct = (x) => `${(100 * x).toFixed(1)} %`;
console.log(
  `${id}: real ${pct(m.real)}, de lejos ${pct(m.far)}, sin datos ${pct(m.none)} (medida en ${((Date.now() - t0) / 1000).toFixed(0)} s)`,
);
const rgb = new Float32Array(W * H * 3);
for (let k = 0; k < rgb.length; k++) rgb[k] = m.data[k] / 255;
const recipe = recipeFor(id, { rgb, classes: m.classes, W, H });
const t1 = Date.now();
const result = recreate({ rgb, classes: m.classes, sigmaEff: m.sigmaEff, W, H, seed, recipe });
console.log(`recreación en ${((Date.now() - t1) / 1000).toFixed(0)} s:`, result.stats);

const toBuffer = (map) => {
  const b = Buffer.alloc(W * H * 3);
  for (let k = 0; k < map.length; k++) b[k] = Math.max(0, Math.min(255, Math.round(255 * map[k])));
  return b;
};
const raw = { raw: { width: W, height: H, channels: 3 } };
const SIZE = 420;
const globes = async (map, name) => {
  const tiles = SIX_VIEWS.map(([, lat, lon]) => renderGlobe(map, W, H, lat, lon, SIZE));
  await sharp({
    create: { width: SIZE * 3, height: SIZE * 2, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .composite(
      tiles.map((t, i) => ({
        input: t,
        raw: { width: SIZE, height: SIZE, channels: 3 },
        left: (i % 3) * SIZE,
        top: Math.floor(i / 3) * SIZE,
      })),
    )
    .png()
    .toFile(join(out, `${id}-globos-${name}.png`));
};
await sharp(toBuffer(rgb), raw)
  .png()
  .toFile(join(out, `${id}-original.png`));
await sharp(toBuffer(result.rgb), raw)
  .png()
  .toFile(join(out, `${id}-recreado.png`));
await globes(rgb, 'antes');
await globes(result.rgb, 'despues');
if (result.guide) {
  await sharp(toBuffer(result.guide), raw)
    .png()
    .toFile(join(out, `${id}-guia.png`));
  await globes(result.guide, 'guia');
}
console.log(`guardado en ${out}`);
