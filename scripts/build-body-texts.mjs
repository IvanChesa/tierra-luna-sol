// Verifica y publica los textos de los cuerpos (resumen y 3 curiosidades).
// Uso: node scripts/build-body-texts.mjs
//
// Entrada: scripts/content/body-texts.json. Cada texto en español lleva la URL de la página de la
// NASA que lo respalda (`source`) y las citas literales en inglés que lo demuestran (`quotes`).
// 1. Descarga cada página (caché en assets-src/texts/) y comprueba que cada cita está literalmente
//    en su texto visible. Si falta alguna, falla y no genera nada.
// 2. Avisa de las cifras del texto español que no aparecen en sus citas (para revisarlas a mano).
// 3. Genera src/app/data/body-texts.ts (sin las citas) y docs/datos/textos-cuerpos.md (la lista
//    de revisión de Iván, con las citas). Iván marca un texto como revisado con `"reviewed": true`.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('assets-src/texts/', ROOT);
const INPUT = new URL('scripts/content/body-texts.json', ROOT);
const ALLOWED_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(nasa\.gov)\//;
const LIMITS = { summary: { min: 150, max: 380 }, fact: { min: 40, max: 240 } };

/** Texto visible de una página HTML, con entidades decodificadas y espacios colapsados. */
function visibleText(html, tagGap) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    rsquo: '’',
    lsquo: '‘',
    rdquo: '”',
    ldquo: '“',
    ndash: '–',
    mdash: '—',
    hellip: '…',
    deg: '°',
    times: '×',
    minus: '−',
    eacute: 'é',
    ouml: 'ö',
    uuml: 'ü',
    aacute: 'á',
    iacute: 'í',
    oacute: 'ó',
    ntilde: 'ñ',
    shy: '',
  };
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, tagGap)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m);
}
/** Normalización para comparar citas: comillas y apóstrofos rectos, guiones y espacios simples. */
const normalize = (text) =>
  text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201c\u201d\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function pageText(url) {
  const name = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const file = new URL(`${name}.html`, CACHE);
  let html;
  try {
    html = await readFile(file, 'utf8');
  } catch {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
    html = await response.text();
    await writeFile(file, html);
  }
  // Dos lecturas: con las etiquetas como espacios y sin ellas (a veces una etiqueta parte una
  // palabra, como «C<span>rater-covered»). Una cita vale si está en cualquiera de las dos.
  return [normalize(visibleText(html, ' ')), normalize(visibleText(html, ''))];
}

/** Cifras de un texto español, en forma comparable con las inglesas («12 756» → «12756»). */
function numbersIn(spanish) {
  return [...spanish.matchAll(/\d[\d\s.]*(,\d+)?/g)]
    .map((m) => m[0].trim().replace(/[\s.]/g, '').replace(',', '.'))
    .filter((n) => n.length > 0);
}
const quoteNumbers = (quotes) =>
  quotes
    .join(' ')
    .replace(/(\d),(\d{3})/g, '$1$2')
    .replace(/(\d),(\d{3})/g, '$1$2');

const bodyIndex = await readFile(new URL('src/app/data/body-index.ts', ROOT), 'utf8');
const INDEX = [...bodyIndex.matchAll(/\{ id: '([a-z]+)', name: '([^']+)'/g)].map((m) => ({
  id: m[1],
  name: m[2],
}));
const input = JSON.parse(await readFile(INPUT, 'utf8'));
const byId = new Map(input.map((entry) => [entry.id, entry]));

await mkdir(CACHE, { recursive: true });
const errors = [];
const warnings = [];
for (const { id, name } of INDEX) {
  const entry = byId.get(id);
  if (!entry) {
    errors.push(`${id}: no tiene textos`);
    continue;
  }
  if (entry.name !== name) errors.push(`${id}: el nombre «${entry.name}» no es «${name}»`);
  if (!Array.isArray(entry.facts) || entry.facts.length !== 3) {
    errors.push(`${id}: necesita exactamente 3 curiosidades`);
  }
  const items = [
    ['resumen', entry.summary, LIMITS.summary],
    ...(entry.facts ?? []).map((f, k) => [`curiosidad ${k + 1}`, f, LIMITS.fact]),
  ];
  for (const [label, item, limit] of items) {
    const where = `${id}, ${label}`;
    if (!item?.text || !item.source || !Array.isArray(item.quotes) || item.quotes.length === 0) {
      errors.push(`${where}: faltan el texto, la fuente o las citas`);
      continue;
    }
    if (!ALLOWED_HOSTS.test(item.source))
      errors.push(`${where}: fuente fuera de nasa.gov (${item.source})`);
    if (item.text.length < limit.min || item.text.length > limit.max) {
      warnings.push(
        `${where}: ${item.text.length} caracteres (se esperan ${limit.min}–${limit.max})`,
      );
    }
    if (/!/.test(item.text)) warnings.push(`${where}: lleva exclamaciones`);
    if (label === 'resumen') {
      const sentences = item.text.split(/(?<=[.?])\s+(?=[A-ZÁÉÍÓÚÑ¿«])/).length;
      if (sentences < 2 || sentences > 3)
        warnings.push(`${where}: ${sentences} frases (se esperan 2 o 3)`);
    }
    const pages = await pageText(item.source);
    for (const quote of item.quotes) {
      if (!pages.some((page) => page.includes(normalize(quote))))
        errors.push(`${where}: la cita no está en la página: «${quote}»`);
    }
    const english = quoteNumbers(item.quotes);
    for (const n of numbersIn(item.text)) {
      if (!english.includes(n)) warnings.push(`${where}: la cifra ${n} no aparece en las citas`);
    }
  }
}
for (const w of warnings) console.warn(`aviso: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

// --- Salida: textos para la app ---------------------------------------------------------------
const lit = (s) => `'${s.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const text = (item) =>
  `{ text: ${lit(item.text)}, source: ${lit(item.source)}, reviewed: ${item.reviewed === true} }`;
const today = new Date().toISOString().slice(0, 10);
const ts = `// GENERADO por scripts/build-body-texts.mjs el ${today} a partir de scripts/content/body-texts.json.
// No se edita a mano: se cambia el JSON y se vuelve a generar. Las citas que respaldan cada texto
// están en docs/datos/textos-cuerpos.md.
import type { BodyId, BodyTexts } from './body.model';

export const BODY_TEXTS: Record<BodyId, BodyTexts> = {
${INDEX.map(({ id }) => {
  const entry = byId.get(id);
  return `  ${id}: {\n    summary: ${text(entry.summary)},\n    facts: [\n${entry.facts.map((f) => `      ${text(f)},`).join('\n')}\n    ],\n  },`;
}).join('\n')}
};
`;
await writeFile(new URL('src/app/data/body-texts.ts', ROOT), ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/data/body-texts.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
);

// --- Salida: lista de revisión ----------------------------------------------------------------
const mdItem = (label, item) =>
  [
    `- [${item.reviewed === true ? 'x' : ' '}] **${label}.** ${item.text}`,
    `  - Fuente: <${item.source}>`,
    ...item.quotes.map((quote) => `  - > ${quote}`),
  ].join('\n');
const total = INDEX.length * 4;
const reviewed = input
  .flatMap((e) => [e.summary, ...e.facts])
  .filter((i) => i.reviewed === true).length;
const md = `# Textos de los cuerpos: lista de revisión (generada el ${today})

Generada por \`scripts/build-body-texts.mjs\` a partir de \`scripts/content/body-texts.json\`. Cada texto
lleva su fuente y las citas literales en inglés que lo respaldan; el script comprueba que cada cita
está en su página. Revisados: **${reviewed} de ${total}**. Para dar uno por revisado, pon
\`"reviewed": true\` en el JSON y vuelve a ejecutar el script.

${INDEX.map(({ id, name }) => {
  const entry = byId.get(id);
  const notes = entry.notes ? `\n\n_Nota de redacción:_ ${entry.notes}` : '';
  return `## ${name} (\`${id}\`)\n\n${mdItem('Resumen', entry.summary)}\n${entry.facts.map((f, k) => mdItem(`Curiosidad ${k + 1}`, f)).join('\n')}${notes}`;
}).join('\n\n')}
`;
await mkdir(new URL('docs/datos/', ROOT), { recursive: true });
await writeFile(new URL('docs/datos/textos-cuerpos.md', ROOT), md);
console.log(
  `${INDEX.length} cuerpos y ${total} textos verificados → src/app/data/body-texts.ts y docs/datos/textos-cuerpos.md`,
);
if (warnings.length) console.log(`${warnings.length} avisos para revisar a mano.`);
