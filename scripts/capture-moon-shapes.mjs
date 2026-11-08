// Capturas de la entrega 9b.d (fase 9b, D42): las formas de Fobos y Deimos y el terminador de Titán,
// cada luna sola (`aislado=1`, ?captura=1, deterministas), con dos luces (la de las miniaturas, fase de
// 30° desde 15° sobre la eclíptica, y una más rasante, fase de 75° desde su ecuador) y, Titán, con la
// geometría de PIA06230 (fase de 56°, desde su ecuador: measure-titan-terminator.mjs). Con
// `--prefijo=antes` o `--prefijo=despues`, para comparar (el «antes», desde una copia del commit sin la
// entrega, que sirve su propio dist).
// Uso: npm run build && node scripts/capture-moon-shapes.mjs <carpeta> [--prefijo=despues]
import { mkdir } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-moon-shapes.mjs <carpeta> [--prefijo=…]');
const prefix = process.argv.find((a) => a.startsWith('--prefijo='))?.slice(10) ?? '';
const named = (name) => (prefix ? `${prefix}-${name}` : name);
const dir = isAbsolute(out)
  ? pathToFileURL(`${out.replace(/[\\/]?$/, '/')}`)
  : new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });

/** [nombre del fichero, luna, fase, latitud, sobre la eclíptica]. */
const SHOTS = [
  ['forma-fobos', 'fobos', 30, 15, true],
  ['forma-fobos-rasante', 'fobos', 75, 0, false],
  ['forma-deimos', 'deimos', 30, 15, true],
  ['forma-deimos-rasante', 'deimos', 75, 0, false],
  ['terminador-titan', 'titan', 56, 0, true],
  ['proteo', 'proteo', 30, 15, true],
  ['japeto', 'japeto', 30, 15, true],
];
const SHOT = { width: 640, height: 640 };
/** La fracción del lado del lienzo que ocupa el disco (`FRAMING_FILL.body`): se recorta a 1,25 radios. */
const BODY_FILL = 0.46;

const { browser, close } = await openBrowser();
try {
  for (const [name, id, phase, latitude, ecliptic] of SHOTS) {
    const query = new URLSearchParams({
      captura: '1',
      aislado: '1',
      cuerpo: id,
      fase: String(phase),
      latitud: String(latitude),
      ...(ecliptic ? { sobre: 'ecliptica' } : {}),
    });
    const { page } = await openViewer(browser, `/?${query}`, SHOT);
    const base64 = await page.evaluate(async () => {
      const blob = await window.__tlsViewer.engine.capture();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    });
    await page.close();
    const half = Math.round(((BODY_FILL * SHOT.width) / 2) * 1.25);
    await sharp(Buffer.from(base64, 'base64'))
      .extract({
        left: SHOT.width / 2 - half,
        top: SHOT.height / 2 - half,
        width: 2 * half,
        height: 2 * half,
      })
      .webp({ quality: 88 })
      .toFile(fileURLToPath(new URL(named(`${name}.webp`), dir)));
    console.log(named(name));
  }
} finally {
  await close();
}
