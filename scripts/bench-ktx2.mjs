// Prueba medida de KTX2 frente a WebP (PLAN, fase 2, 2.b.8; D18), sin instalar herramientas: con las
// texturas KTX2 de ejemplo del repositorio de three r186 (assets-src/ktx2/, las baja
// download-assets.mjs) y su KTX2Loader.
// Uso: node scripts/download-assets.mjs && node scripts/bench-ktx2.mjs [--swiftshader]
//
// 1. En Node, el transcodificador Basis de three pasa cada KTX2 a RGBA y sharp hace un WebP con los
//    MISMOS píxeles (calidad 82, la de nuestras texturas de color).
// 2. En Chromium (GPU del equipo), para cada uno: tiempo de descarga + transcodificación o
//    decodificación, tiempo de subida a la GPU (initTexture + gl.finish) y VRAM según el formato.
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { launchArgs } from './capture-lib.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KTX2_DIR = join(ROOT, 'assets-src', 'ktx2');
const SAMPLES = ['spiritedaway.ktx2', '2d_uastc.ktx2', '2d_etc1s.ktx2'];
const PORT = 4322;

// --- 1. KTX2 → RGBA → WebP con los mismos píxeles ----------------------------------------------
// El transcodificador es un script de Emscripten (CommonJS) dentro de un paquete ESM: se evalúa
// como módulo CommonJS para obtener su función de arranque.
const transcoderPath = join(ROOT, 'node_modules/three/examples/jsm/libs/basis/basis_transcoder.js');
const commonjs = { exports: {} };
new Function(
  'module',
  'exports',
  '__filename',
  '__dirname',
  'require',
  await readFile(transcoderPath, 'utf8'),
)(
  commonjs,
  commonjs.exports,
  transcoderPath,
  dirname(transcoderPath),
  createRequire(import.meta.url),
);
const BASIS = commonjs.exports;
const basis = await BASIS({
  wasmBinary: await readFile(
    join(ROOT, 'node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm'),
  ),
});
basis.initializeBasis();
const RGBA32 = 13;
const samples = [];
for (const name of SAMPLES) {
  const bytes = await readFile(join(KTX2_DIR, name));
  const file = new basis.KTX2File(new Uint8Array(bytes));
  if (!file.isValid()) throw new Error(`${name} no es un KTX2 válido`);
  const width = file.getWidth();
  const height = file.getHeight();
  const layers = Math.max(1, file.getLayers());
  const levels = file.getLevels();
  const kind = file.isUASTC() ? 'UASTC' : 'ETC1S';
  file.startTranscoding();
  const webps = [];
  for (let layer = 0; layer < layers; layer++) {
    const dst = new Uint8Array(file.getImageTranscodedSizeInBytes(0, layer, 0, RGBA32));
    if (!file.transcodeImage(dst, 0, layer, 0, RGBA32, 0, -1, -1))
      throw new Error('Transcodificación fallida');
    const webp = `${name.replace('.ktx2', '')}-${layer}.webp`;
    const out = await sharp(Buffer.from(dst), { raw: { width, height, channels: 4 } })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();
    await writeFile(join(KTX2_DIR, webp), out);
    webps.push({ path: webp, bytes: out.byteLength });
  }
  file.close();
  file.delete();
  samples.push({ name, kind, width, height, layers, levels, ktx2Bytes: bytes.byteLength, webps });
}

// --- 2. Medición en el navegador -----------------------------------------------------------------
const PAGE = `<!doctype html><meta charset="utf-8"><title>KTX2</title>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
const renderer = new THREE.WebGLRenderer();
const gl = renderer.getContext();
const loader = new KTX2Loader().setTranscoderPath('/three/examples/jsm/libs/basis/').detectSupport(renderer);
/** Bytes por píxel en la GPU de cada formato de three. */
const BPP = {
  [THREE.RGBA_BPTC_Format]: 1, [THREE.RGBA_ASTC_4x4_Format]: 1, [THREE.RGBA_S3TC_DXT5_Format]: 1,
  [THREE.RGB_S3TC_DXT1_Format]: 0.5, [THREE.RGBA_S3TC_DXT1_Format]: 0.5, [THREE.RGB_ETC1_Format]: 0.5,
  [THREE.RGB_ETC2_Format]: 0.5, [THREE.RGBA_ETC2_EAC_Format]: 1, [THREE.RGBAFormat]: 4,
};
const NAMES = { [THREE.RGBA_BPTC_Format]: 'BC7', [THREE.RGBA_ASTC_4x4_Format]: 'ASTC 4×4',
  [THREE.RGBA_S3TC_DXT5_Format]: 'BC3', [THREE.RGB_S3TC_DXT1_Format]: 'BC1', [THREE.RGBA_S3TC_DXT1_Format]: 'BC1',
  [THREE.RGB_ETC1_Format]: 'ETC1', [THREE.RGB_ETC2_Format]: 'ETC2', [THREE.RGBA_ETC2_EAC_Format]: 'ETC2 RGBA', [THREE.RGBAFormat]: 'RGBA8' };
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
window.runBench = async (samples, runs) => {
  const out = [];
  for (const s of samples) {
    const ktxLoad = [], ktxUpload = [], webpLoad = [], webpUpload = [];
    let format = null, mips = 1;
    for (let r = 0; r < runs; r++) {
      let t0 = performance.now();
      const texture = await loader.loadAsync('/ktx2/' + s.name + '?r=' + r);
      let t1 = performance.now();
      renderer.initTexture(texture); gl.finish();
      let t2 = performance.now();
      ktxLoad.push(t1 - t0); ktxUpload.push(t2 - t1);
      format = texture.format; mips = texture.mipmaps?.length || 1;
      texture.dispose();
      let load = 0, upload = 0;
      for (const w of s.webps) {
        t0 = performance.now();
        const blob = await (await fetch('/ktx2/' + w.path + '?r=' + r)).blob();
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
        t1 = performance.now();
        const tex = new THREE.Texture(bitmap); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
        renderer.initTexture(tex); gl.finish();
        t2 = performance.now();
        load += t1 - t0; upload += t2 - t1;
        tex.dispose(); bitmap.close();
      }
      webpLoad.push(load); webpUpload.push(upload);
    }
    const pixels = s.width * s.height * s.layers;
    out.push({
      name: s.name, kind: s.kind, size: s.width + '×' + s.height + (s.layers > 1 ? '×' + s.layers : ''),
      gpuFormat: NAMES[format] ?? String(format), mips,
      ktx2: { bytes: s.ktx2Bytes, bitsPerPixel: (8 * s.ktx2Bytes) / pixels,
        loadMs: median(ktxLoad), uploadMs: median(ktxUpload),
        vramBytes: pixels * (BPP[format] ?? 4) * (mips > 1 ? 4 / 3 : 1) },
      webp: { bytes: s.webps.reduce((t, w) => t + w.bytes, 0),
        bitsPerPixel: (8 * s.webps.reduce((t, w) => t + w.bytes, 0)) / pixels,
        loadMs: median(webpLoad), uploadMs: median(webpUpload), vramBytes: pixels * 4 * (4 / 3) },
    });
  }
  return { results: out, gpu: (() => { const i = gl.getExtension('WEBGL_debug_renderer_info'); return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : '?'; })() };
};
window.benchReady = true;
</script>`;

const TYPES = {
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
  '.webp': 'image/webp',
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let file = null;
  if (url.pathname === '/bench.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(PAGE);
    return;
  }
  if (url.pathname.startsWith('/three/'))
    file = join(ROOT, 'node_modules', decodeURIComponent(url.pathname));
  if (url.pathname.startsWith('/ktx2/'))
    file = join(KTX2_DIR, decodeURIComponent(url.pathname.slice(6)));
  if (!file || !(await stat(file).catch(() => null))) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(PORT, resolve));
const browser = await chromium.launch({ args: launchArgs() });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/bench.html`);
  await page.waitForFunction(() => window.benchReady === true);
  const { results, gpu } = await page.evaluate((s) => window.runBench(s, 7), samples);
  console.log(`GPU: ${gpu}\n`);
  const kB = (b) => (b / 1024).toFixed(1);
  const ms = (v) => v.toFixed(2);
  console.log(
    '| Muestra | Tipo | Tamaño | Formato GPU | KTX2: peso · bits/px · carga · subida · VRAM | WebP: peso · bits/px · carga · subida · VRAM |',
  );
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    console.log(
      `| ${r.name} | ${r.kind} | ${r.size} | ${r.gpuFormat}${r.mips > 1 ? ` (${r.mips} mips)` : ''} | ${kB(r.ktx2.bytes)} kB · ${r.ktx2.bitsPerPixel.toFixed(2)} · ${ms(r.ktx2.loadMs)} ms · ${ms(r.ktx2.uploadMs)} ms · ${kB(r.ktx2.vramBytes)} kB | ${kB(r.webp.bytes)} kB · ${r.webp.bitsPerPixel.toFixed(2)} · ${ms(r.webp.loadMs)} ms · ${ms(r.webp.uploadMs)} ms · ${kB(r.webp.vramBytes)} kB |`,
    );
  }
} finally {
  await browser.close();
  server.close();
}
