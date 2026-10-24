// Servidor estático mínimo del build (dist/…/browser) para las capturas, las mediciones y los e2e.
// Imita lo que hará Apache en la fase 4: URL sin barra final servidas desde /ruta/index.html y la
// página 404 para lo que no existe. Solo para uso local.
// Uso: node scripts/serve-dist.mjs [puerto]   (por defecto, 4321)
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/tierra-luna-sol/browser/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export function startServer(port = 4321) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(ROOT, path);
    let status = 200;
    if (!(await isFile(file))) file = join(ROOT, path, 'index.html');
    if (!(await isFile(file))) {
      file = join(ROOT, '404', 'index.html');
      status = 404;
    }
    response.writeHead(status, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.argv[2] ?? 4321);
  await startServer(port);
  console.log(`Sirviendo dist en http://localhost:${port}`);
}
