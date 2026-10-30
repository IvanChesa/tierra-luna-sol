// La Tierra frente a las fotos de EPIC (fase 5, R3; revisión de la fase 5, hallazgo 5): la relación
// de brillo entre el océano y los desiertos, medida igual en las fotos y en nuestra Tierra pintada con
// la geometría de cada foto (?captura=1 con su fecha, su ángulo de fase y su latitud).
// Uso: npm run build && node scripts/measure-earth-epic.mjs [--guardar=<carpeta>]
//
// El método es el de la fase 3b (`measure-reference-colors.mjs`, docs/realismo/referencias.md):
// - cada píxel se lleva a su latitud y longitud: en las fotos, con la proyección ortográfica desde su
//   centroide (DSCOVR está a 1,5 millones de km); en nuestra Tierra, con la cámara y la malla reales
//   de la escena (el rayo de cada píxel contra la esfera de la malla);
// - solo cuenta lo que está a menos de 0,6 radios del centro del disco (36,9° de arco), lejos del
//   limbo;
// - océano: el agua de la máscara especular (a 2 px de la costa) y, de ella, el 20 % más oscuro (sin
//   nubes); desierto: la tierra de la máscara dentro de cada caja, su mediana;
// - luminancia Rec. 709 de los píxeles decodificados como sRGB (lo que se ve: las dos imágenes pasan
//   por su curva de tono, la de EPIC sin documentar).
// Las fotos se descargan a la carpeta temporal de `measure-reference-colors.mjs` (no entran en el repo).
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const CACHE = join(tmpdir(), 'tls-referencias');
const ROOT = new URL('../', import.meta.url);

/**
 * Las tres fotos de EPIC del 21-06-2016 (docs/realismo/referencias.md): instante, centroide y ángulo
 * de fase, de los metadatos de la API de EPIC (https://epic.gsfc.nasa.gov/api/natural/date/2016-06-21:
 * `centroid_coordinates` y el ángulo entre `sun_j2000_position` y `dscovr_j2000_position`).
 */
const PHOTOS = [
  {
    id: 'epic_1b_20160621074644',
    name: 'Índico',
    time: '2016-06-21T07:41:55Z',
    lat: 22.522,
    lon: 74.026,
    phase: 9.33,
  },
  {
    id: 'epic_1b_20160621152458',
    name: 'Atlántico',
    time: '2016-06-21T15:20:09Z',
    lat: 22.412,
    lon: -40.562,
    phase: 9.37,
  },
  {
    id: 'epic_1b_20160621230313',
    name: 'Pacífico',
    time: '2016-06-21T22:58:24Z',
    lat: 22.324,
    lon: -155.039,
    phase: 9.4,
  },
].map((photo) => ({
  ...photo,
  url: `https://epic.gsfc.nasa.gov/archive/natural/2016/06/21/jpg/${photo.id}.jpg`,
}));

/** Desiertos (la tierra de la máscara dentro de la caja): [lat. mín., lat. máx., lon. mín., lon. máx.]. */
const DESERTS = [
  { name: 'Arabia (Rub al-Jali)', box: [17, 23, 45, 55] },
  { name: 'Sáhara occidental', box: [18, 26, -13, -5] },
];

/** Radio (fracción del disco) y, en grados de arco, hasta dónde se mide: lejos del limbo. */
const INNER = 0.6;
const INNER_ARC_DEG = (Math.asin(INNER) * 180) / Math.PI;
/** Píxeles mínimos de un desierto para medirlo en una foto. */
const MIN_DESERT_PX = 300;

const D = Math.PI / 180;
const TABLE = Float64Array.from({ length: 256 }, (_, c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});

async function download(url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, url.split('/').pop());
  if ((await stat(file).catch(() => null))?.size) return file;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

/** Luminancia lineal de cada píxel (Rec. 709) de una imagen sRGB. */
async function luminanceImage(input) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const lum = new Float64Array(info.width * info.height);
  for (let i = 0; i < lum.length; i++) {
    lum[i] =
      0.2126 * TABLE[data[3 * i]] +
      0.7152 * TABLE[data[3 * i + 1]] +
      0.0722 * TABLE[data[3 * i + 2]];
  }
  return { width: info.width, height: info.height, lum };
}

// --- Máscara del agua (la especular de la Tierra, 1k: blanca en el agua) ---------------------------
const maskDir = fileURLToPath(new URL('public/textures/1k/', ROOT));
const maskName = (await readdir(maskDir)).find((name) => name.startsWith('earth-specular.'));
const maskData = await sharp(await readFile(join(maskDir, maskName)))
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });
const MW = maskData.info.width;
const MH = maskData.info.height;
/** 1: agua; 0: tierra; `null`: costa (a menos de 2 px de la otra). */
function surface(lat, lon) {
  const sx = Math.floor(((lon + 180) / 360) * MW);
  const sy = Math.floor(((90 - lat) / 180) * MH);
  let water = 0;
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const x = (((sx + i) % MW) + MW) % MW;
      const y = Math.min(MH - 1, Math.max(0, sy + j));
      if (maskData.data[y * MW + x] >= 128) water++;
    }
  }
  return water === 25 ? 1 : water === 0 ? 0 : null;
}

const arcDeg = (latA, lonA, latB, lonB) => {
  const h =
    Math.sin(((latB - latA) * D) / 2) ** 2 +
    Math.cos(latA * D) * Math.cos(latB * D) * Math.sin(((lonB - lonA) * D) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / D;
};
const wrap = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
/** «Índico» → «indico». */
const slug = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Océano y desiertos de una imagen: `geo(x, y)` da la latitud y la longitud del píxel (o `null` fuera
 * del disco); `center`, el punto bajo el observador.
 */
function measure(image, geo, center) {
  const ocean = [];
  const deserts = DESERTS.map(() => []);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const point = geo(x, y);
      if (!point) continue;
      if (arcDeg(center.lat, center.lon, point.lat, point.lon) > INNER_ARC_DEG) continue;
      const kind = surface(point.lat, point.lon);
      const lum = image.lum[y * image.width + x];
      if (kind === 1) ocean.push(lum);
      if (kind !== 0) continue;
      DESERTS.forEach(({ box: [lat0, lat1, lon0, lon1] }, k) => {
        if (point.lat >= lat0 && point.lat <= lat1 && point.lon >= lon0 && point.lon <= lon1) {
          deserts[k].push(lum);
        }
      });
    }
  }
  ocean.sort((a, b) => a - b);
  const darkest = ocean.slice(0, Math.max(1, Math.floor(ocean.length * 0.2)));
  const oceanLum = darkest.reduce((s, v) => s + v, 0) / darkest.length;
  // Las nubes más claras: el percentil 98 de todo lo que se mide (agua y tierra).
  const all = [];
  for (let y = 0; y < image.height; y += 2) {
    for (let x = 0; x < image.width; x += 2) {
      const point = geo(x, y);
      if (point && arcDeg(center.lat, center.lon, point.lat, point.lon) <= INNER_ARC_DEG) {
        all.push(image.lum[y * image.width + x]);
      }
    }
  }
  all.sort((a, b) => a - b);
  return {
    ocean: oceanLum,
    oceanPx: ocean.length,
    clouds: all[Math.floor(all.length * 0.98)] ?? Number.NaN,
    deserts: deserts.map((values, k) => {
      if (values.length < MIN_DESERT_PX) return null;
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      return { name: DESERTS[k].name, px: values.length, lum: median, ratio: oceanLum / median };
    }),
  };
}

/** La foto: su disco (la caja de lo que no es fondo) y la ortográfica inversa desde el centroide. */
async function photoGeo(photo, image) {
  let minX = image.width;
  let maxX = 0;
  let minY = image.height;
  let maxY = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.lum[y * image.width + x] > 0.004) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const radius = (maxX - minX) / 2;
  const lat0 = photo.lat * D;
  return (x, y) => {
    const px = (x - cx) / radius;
    const py = -(y - cy) / radius;
    const rho = Math.hypot(px, py);
    if (rho >= 1 || rho === 0) return rho === 0 ? { lat: photo.lat, lon: photo.lon } : null;
    const c = Math.asin(rho);
    const lat =
      Math.asin(Math.cos(c) * Math.sin(lat0) + (py * Math.sin(c) * Math.cos(lat0)) / rho) / D;
    const lon =
      photo.lon +
      Math.atan2(
        px * Math.sin(c),
        rho * Math.cos(c) * Math.cos(lat0) - py * Math.sin(c) * Math.sin(lat0),
      ) /
        D;
    return { lat, lon: wrap(lon) };
  };
}

/** Nuestra Tierra: el lienzo (sin la interfaz) y la latitud y la longitud de cada píxel. */
async function renderEarth(browser, photo, size) {
  const path = `/?captura=1&cuerpo=tierra&fecha=${photo.time}&fase=${photo.phase}&latitud=${photo.lat}`;
  const { page, problems } = await openViewer(browser, path, { width: size, height: size });
  // La vista limpia: la escena centrada en el lienzo, sin paneles.
  await page.keyboard.press('v');
  await waitForIdle(page);
  const { png, geo } = await page.evaluate(async (side) => {
    const engine = window.__tlsViewer.engine;
    const blob = await engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    // El rayo de cada píxel, en el sistema de la malla de la Tierra (la esfera unidad, con el polo en
    // Y, el meridiano 0 en +X y la longitud este hacia −Z), contra la esfera.
    const { camera, scene } = engine.world;
    const earth = scene.getObjectByName('tierra');
    camera.updateMatrixWorld();
    earth.updateMatrixWorld();
    const toLocal = earth.matrixWorld.clone().invert();
    const origin = camera.position.clone().applyMatrix4(toLocal);
    const point = camera.position.clone();
    const out = new Float32Array(2 * side * side).fill(Number.NaN);
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        point.set(((x + 0.5) / side) * 2 - 1, 1 - ((y + 0.5) / side) * 2, 0.5);
        point.unproject(camera).applyMatrix4(toLocal);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const dz = point.z - origin.z;
        const length = Math.hypot(dx, dy, dz);
        const ux = dx / length;
        const uy = dy / length;
        const uz = dz / length;
        const b = origin.x * ux + origin.y * uy + origin.z * uz;
        const c = origin.x ** 2 + origin.y ** 2 + origin.z ** 2 - 1;
        const disc = b * b - c;
        if (disc < 0) continue;
        const t = -b - Math.sqrt(disc);
        if (t < 0) continue;
        const hx = origin.x + t * ux;
        const hy = origin.y + t * uy;
        const hz = origin.z + t * uz;
        out[2 * (y * side + x)] = (Math.asin(Math.max(-1, Math.min(1, hy))) * 180) / Math.PI;
        out[2 * (y * side + x) + 1] = (Math.atan2(-hz, hx) * 180) / Math.PI;
      }
    }
    const geoBytes = new Uint8Array(out.buffer);
    let geoBinary = '';
    for (let i = 0; i < geoBytes.length; i += 0x8000) {
      geoBinary += String.fromCharCode(...geoBytes.subarray(i, i + 0x8000));
    }
    return { png: btoa(binary), geo: btoa(geoBinary) };
  }, size);
  await page.close();
  const geoBuffer = Buffer.from(geo, 'base64');
  const map = new Float32Array(geoBuffer.buffer, geoBuffer.byteOffset, geoBuffer.byteLength / 4);
  return {
    png: Buffer.from(png, 'base64'),
    problems,
    geo: (x, y) => {
      const lat = map[2 * (y * size + x)];
      return Number.isNaN(lat) ? null : { lat, lon: map[2 * (y * size + x) + 1] };
    },
  };
}

// --- Medida ------------------------------------------------------------------------------------------
const saveArg = process.argv.find((arg) => arg.startsWith('--guardar='));
const saveDir = saveArg
  ? new URL(`../${saveArg.slice('--guardar='.length)}/`, import.meta.url)
  : null;
if (saveDir) await mkdir(saveDir, { recursive: true });

const SIZE = 900;
const rows = [];
const { browser, close } = await openBrowser();
try {
  for (const photo of PHOTOS) {
    const photoImage = await luminanceImage(await download(photo.url));
    const theirs = measure(photoImage, await photoGeo(photo, photoImage), photo);
    const render = await renderEarth(browser, photo, SIZE);
    if (render.problems.length) console.log(render.problems.join('\n'));
    const ourImage = await luminanceImage(render.png);
    // El centro del disco en nuestra Tierra: el punto del píxel central (comprueba la geometría).
    const middle = render.geo(SIZE / 2, SIZE / 2);
    const ours = measure(ourImage, render.geo, middle ?? photo);
    rows.push({ photo, theirs, ours, middle });
    if (saveDir) {
      // Nuestra Tierra y la foto, a la misma altura.
      const ours = await sharp(render.png).resize({ height: SIZE }).png().toBuffer();
      const theirsPng = await sharp(await download(photo.url))
        .resize({ height: SIZE })
        .png()
        .toBuffer();
      await sharp({
        create: { width: 2 * SIZE, height: SIZE, channels: 3, background: '#000' },
      })
        .composite([
          { input: ours, left: 0, top: 0 },
          { input: theirsPng, left: SIZE, top: 0 },
        ])
        .webp({ quality: 88 })
        .toFile(fileURLToPath(new URL(`tierra-epic-${slug(photo.name)}.webp`, saveDir)));
    }
  }
} finally {
  await close();
}

const f = (v, digits = 3) => v.toFixed(digits);
console.log('Océano (20 % más oscuro del agua) / desierto (mediana), luminancia lineal\n');
const factors = [];
for (const { photo, theirs, ours, middle } of rows) {
  const offset = middle ? arcDeg(middle.lat, middle.lon, photo.lat, photo.lon) : Number.NaN;
  console.log(
    `${photo.name} (${photo.time}): centro de nuestra Tierra a ${f(offset, 2)}° del de la foto · océano EPIC ${f(theirs.ocean, 4)} (${theirs.oceanPx} px), nuestro ${f(ours.ocean, 4)} (${ours.oceanPx} px) · nubes (percentil 98) EPIC ${f(theirs.clouds)}, nuestras ${f(ours.clouds)}`,
  );
  DESERTS.forEach((desert, k) => {
    const a = theirs.deserts[k];
    const b = ours.deserts[k];
    if (!a || !b) return;
    const factor = b.ratio / a.ratio;
    factors.push(factor);
    console.log(
      `  ${desert.name}: EPIC ${f(a.lum, 4)} → relación ${f(a.ratio)} (${a.px} px) · nuestra ${f(b.lum, 4)} → ${f(b.ratio)} (${b.px} px) · nuestra / EPIC ${f(factor, 2)}`,
    );
  });
}
if (factors.length) {
  const mean = factors.reduce((s, v) => s + v, 0) / factors.length;
  console.log(
    `\nRelación nuestra / EPIC, desierto a desierto (media de ${factors.length}): ${f(mean, 2)}`,
  );
}
// Como en la fase 3b (docs/realismo/referencias.md): el océano medio de las tres fotos entre el
// desierto medio de las dos cajas. Menos ruidosa que cada foto por separado: las nubes de nuestra
// textura no son las de ese día y cambian qué agua queda despejada.
const average = (values) => values.reduce((s, v) => s + v, 0) / values.length;
const pooled = (side) => {
  const ocean = average(rows.map((row) => row[side].ocean));
  const desert = average(
    rows.flatMap((row) => row[side].deserts.filter(Boolean).map((d) => d.lum)),
  );
  const clouds = average(rows.map((row) => row[side].clouds));
  return { ocean, desert, clouds, ratio: ocean / desert };
};
const epic = pooled('theirs');
const ours = pooled('ours');
console.log(
  `Conjunta: EPIC océano ${f(epic.ocean, 4)} / desierto ${f(epic.desert, 4)} = ${f(epic.ratio)} · nuestra ${f(ours.ocean, 4)} / ${f(ours.desert, 4)} = ${f(ours.ratio)} · nuestra / EPIC ${f(ours.ratio / epic.ratio, 2)}`,
);
console.log(
  `Respecto a las nubes (percentil 98): desierto EPIC ${f(epic.desert / epic.clouds)}, nuestro ${f(ours.desert / ours.clouds)} · océano EPIC ${f(epic.ocean / epic.clouds)}, nuestro ${f(ours.ocean / ours.clouds)}`,
);
