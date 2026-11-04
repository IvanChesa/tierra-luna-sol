// El color medio de los mapas en color de las lunas (fase 9b, D39, tarea 5): el de Ío (el mosaico en
// color del USGS) y el de la Luna (el CGI Moon Kit), del WebP de 1k que publica build-textures.mjs,
// con la media lineal ponderada por el área de cada fila (cos φ), como la luminancia del albedo.
// El disco de color plano que se ve mientras llega el mapa (o sin él) usa ese color: al llegar, el
// cambio no se nota. Los mosaicos en gris no lo necesitan: la escena los tiñe con el tono de su color
// esquemático y el brillo de los dos sale del albedo (D29).
//
// Escribe src/app/scene/texture-colors.ts. Uso: node scripts/build-texture-colors.mjs
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import './lib/ts-resolve.mjs';

const { TEXTURE_FILES } = await import('../src/app/scene/texture-files.ts');
const ROOT = new URL('../', import.meta.url);
const PUBLIC = new URL('public/', ROOT);
/** Los mapas en color de las lunas. */
const COLOR_MAPS = ['io', 'moon'];

const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const table = Float64Array.from({ length: 256 }, (_, c) => linear(c));
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const hex = (rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(Math.max(toSrgb(v), 0), 1) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

const colors = {};
for (const id of COLOR_MAPS) {
  const file = TEXTURE_FILES[id]?.find((entry) => entry.level === '1k');
  if (!file) throw new Error(`No encuentro el WebP de 1k de «${id}» en texture-files.ts.`);
  const { data, info } = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let weights = 0;
  for (let y = 0; y < info.height; y++) {
    const weight = Math.cos((((y + 0.5) / info.height) * 2 - 1) * (Math.PI / 2));
    for (let x = 0; x < info.width; x++) {
      const k = (y * info.width + x) * info.channels;
      for (let c = 0; c < 3; c++) sum[c] += weight * table[data[k + c]];
      weights += weight;
    }
  }
  colors[id] = hex(sum.map((v) => v / weights));
  console.log(`${id}: ${colors[id]} (${file.path})`);
}

const today = new Date().toISOString().slice(0, 10);
const ts = `// GENERADO por scripts/build-texture-colors.mjs el ${today}. No se edita a mano.
// El color medio (sRGB) de los mapas en color de las lunas: la media lineal de su WebP de 1k,
// ponderada por el área de cada fila. Es el de su disco mientras llega el mapa (fase 9b, D39).

/** Ío (el mosaico en color del USGS) y la Luna (el CGI Moon Kit de la NASA). */
export const MOON_MAP_COLORS = {
${COLOR_MAPS.map((id) => `  ${id}: '${colors[id]}',`).join('\n')}
} as const;
`;
await writeFile(new URL('src/app/scene/texture-colors.ts', ROOT), ts);
console.log('src/app/scene/texture-colors.ts');
