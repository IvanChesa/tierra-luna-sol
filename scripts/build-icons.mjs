// Los iconos del sitio (fase 10, revisión final de diseño: era el escudo de Angular, en rosa y morado)
// a partir de public/favicon.svg, la marca propia: el Sol en latón, su órbita y la Tierra con su Luna,
// sobre la tinta del sitio. Genera:
// - public/favicon.ico: 16, 32 y 48 px en PNG dentro del contenedor ICO (los navegadores que no usan
//   el SVG y las peticiones a /favicon.ico);
// - public/apple-touch-icon.png: 180 px, a sangre (iOS redondea las esquinas).
// Uso: node scripts/build-icons.mjs
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const PUBLIC = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', PUBLIC), 'utf8');

const png = (source, size) =>
  sharp(Buffer.from(source), { density: (72 * size) / 32 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** Un ICO con una imagen PNG por tamaño (Vista y posteriores, y todos los navegadores actuales). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, k) => {
    const entry = 6 + 16 * k;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(svg, size) })));
await writeFile(new URL('favicon.ico', PUBLIC), ico(images));
// El de iOS, a sangre: sin las esquinas redondeadas del SVG.
await writeFile(
  new URL('apple-touch-icon.png', PUBLIC),
  await png(svg.replace(' rx="7"', ''), 180),
);
console.log(`favicon.ico (${sizes.join(', ')} px) y apple-touch-icon.png (180 px)`);
