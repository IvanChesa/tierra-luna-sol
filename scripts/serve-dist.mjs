// Servidor estático mínimo del build (dist/…/browser) para las capturas, las mediciones y los e2e.
// Imita a Cloudflare Pages (fase 4), con el build ya preparado por `scripts/prepare-pages.mjs`:
// - sirve `ruta.html` en `/ruta` y redirige (308) `/ruta/` y `/ruta.html` a `/ruta` (D9);
// - responde `404.html`, con un 404, en lo que no existe;
// - aplica `_redirects` (reglas exactas) y `_headers` (patrones de ruta con `*` y `:nombre`; los de
//   otros dominios, como los de `*.pages.dev`, no cuentan aquí). Si dos reglas dan la misma
//   cabecera, se unen con una coma, como en Pages.
// Lo que `_headers` no dice, sin caché (`no-store`). Solo para uso local.
// Uso: node scripts/serve-dist.mjs [puerto]   (por defecto, 4340; el 4321 es el de Astro)
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist/tierra-luna-sol/browser/', import.meta.url));
export const HOST = '127.0.0.1';
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

/** Las reglas de `_headers`: [{ test(path), headers: [[nombre, valor]] }], en orden. */
export function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim();
      // Los patrones con dominio (https://…) no se aplican en local.
      const local = pattern.startsWith('/');
      const source = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/:[A-Za-z]\w*/g, '[^/]+');
      current = { local, regex: new RegExp(`^${source}$`), headers: [] };
      rules.push(current);
    } else if (current) {
      const line = raw.trim();
      const colon = line.indexOf(':');
      current.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
  }
  return rules.filter((rule) => rule.local);
}

/** Las reglas de `_redirects`: origen exacto → [destino, código]. */
export function parseRedirects(text) {
  const rules = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, code = '302'] = line.split(/\s+/);
    rules.set(from, [to, Number(code)]);
  }
  return rules;
}

/** Las cabeceras de `_headers` para una ruta (las repetidas, unidas con una coma). */
function headersFor(rules, path) {
  const out = {};
  for (const rule of rules) {
    if (!rule.regex.test(path)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      out[key] = out[key] ? `${out[key]}, ${value}` : value;
    }
  }
  return out;
}

export async function startServer(port = 4340) {
  const headerRules = parseHeaders(await readFile(join(ROOT, '_headers'), 'utf8').catch(() => ''));
  const redirects = parseRedirects(
    await readFile(join(ROOT, '_redirects'), 'utf8').catch(() => ''),
  );
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = normalize(decodeURIComponent(url.pathname))
      .replace(/\\/g, '/')
      .replace(/^(\.\.\/)+/, '');
    const redirect = (to, code = 308) => {
      response.writeHead(code, { Location: `${to}${url.search}` });
      response.end();
    };
    if (redirects.has(path)) {
      const [to, code] = redirects.get(path);
      return redirect(to, code);
    }
    // `/ruta.html` → `/ruta` y `/index.html` → `/`.
    if (path.endsWith('.html') && (await isFile(join(ROOT, path)))) {
      return redirect(path === '/index.html' ? '/' : path.slice(0, -'.html'.length));
    }
    // `/ruta/` → `/ruta` si existe `ruta.html`.
    if (
      path.length > 1 &&
      path.endsWith('/') &&
      (await isFile(join(ROOT, `${path.slice(0, -1)}.html`)))
    ) {
      return redirect(path.slice(0, -1));
    }
    let file = join(ROOT, path === '/' ? 'index.html' : path);
    let status = 200;
    if (!(await isFile(file))) file = join(ROOT, `${path}.html`);
    if (!(await isFile(file))) {
      file = join(ROOT, '404.html');
      status = 404;
    }
    // En minúsculas, para que las de `_headers` sustituyan a estas (no se dupliquen).
    response.writeHead(status, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
      ...headersFor(headerRules, path),
    });
    createReadStream(file).pipe(response);
  });
  // Solo en 127.0.0.1: si el puerto ya lo tiene otro servidor (un `astro dev` o `preview` de otro
  // proyecto), falla en vez de convivir con él en otra dirección y servir capturas de otra web.
  return new Promise((resolve, reject) => {
    server.once('error', (error) =>
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`El puerto ${port} ya está en uso: cierra lo que lo ocupa o usa otro.`)
          : error,
      ),
    );
    server.listen(port, HOST, () => resolve(server));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.argv[2] ?? 4340);
  await startServer(port);
  console.log(`Sirviendo dist en http://${HOST}:${port}`);
}
