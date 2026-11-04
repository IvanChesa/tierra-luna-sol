// Texto de las páginas de un PDF, sin dependencias (fase 9: para comprobar los nombres de las
// constelaciones en el Anuario del IGN, scripts/check-constellation-names.mjs). No es un lector de PDF
// general: basta para los PDF de texto con fuentes Type1 o TrueType (codificación con /Differences o
// ToUnicode), flujos FlateDecode y flujos de objetos (ObjStm), que es lo que usan esos anuarios.
//
// Cada línea de texto del PDF (cada `Td` que baja, `T*` o `ET`) sale en una línea; los saltos dentro
// de una línea (columnas de una tabla), como « | ».
import { constants, inflateSync } from 'node:zlib';

/** Nombres de glifo de /Differences que no son una sola letra. */
const GLYPHS = {
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ntilde: 'Ñ',
  udieresis: 'ü',
  odieresis: 'ö',
  adieresis: 'ä',
  edieresis: 'ë',
  idieresis: 'ï',
  ccedilla: 'ç',
  agrave: 'à',
  egrave: 'è',
  ograve: 'ò',
  space: ' ',
  hyphen: '-',
  minus: '−',
  period: '.',
  comma: ',',
  colon: ':',
  semicolon: ';',
  slash: '/',
  plus: '+',
  equal: '=',
  parenleft: '(',
  parenright: ')',
  bracketleft: '[',
  bracketright: ']',
  quoteright: '’',
  quoteleft: '‘',
  quotedblleft: '“',
  quotedblright: '”',
  guillemotleft: '«',
  guillemotright: '»',
  endash: '–',
  emdash: '—',
  degree: '°',
  fi: 'fi',
  fl: 'fl',
  ff: 'ff',
  ffi: 'ffi',
  ffl: 'ffl',
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

/** El primer diccionario «<< … >>» desde `from` (con anidamiento), o `null`. */
function dictAt(text, from) {
  const start = text.indexOf('<<', from);
  if (start < 0) return null;
  let depth = 0;
  for (let k = start; k < text.length - 1; k++) {
    if (text[k] === '<' && text[k + 1] === '<') {
      depth++;
      k++;
    } else if (text[k] === '>' && text[k + 1] === '>') {
      depth--;
      k++;
      if (depth === 0) return text.slice(start, k + 1);
    }
  }
  return null;
}

/** El valor de `/Clave` en un diccionario: una referencia (número) o un diccionario en línea. */
function entry(dict, key) {
  const at = new RegExp(`/${key}\\s*(\\d+)\\s+0\\s+R`).exec(dict);
  if (at) return { ref: Number(at[1]) };
  const i = dict.search(new RegExp(`/${key}\\s*<<`));
  if (i >= 0) return { dict: dictAt(dict, i) };
  return null;
}

function inflate(bytes) {
  try {
    return inflateSync(bytes);
  } catch {
    try {
      return inflateSync(bytes, { finishFlush: constants.Z_SYNC_FLUSH });
    } catch {
      return null;
    }
  }
}

/** Abre un PDF (un `Buffer`). Devuelve el número de páginas y el texto de cada una. */
export function openPdf(buffer) {
  const text = buffer.toString('latin1');
  /** num → { dict, stream (latin1 sin descomprimir) } */
  const objects = new Map();
  const header = /(\d+)\s+0\s+obj\b/g;
  const starts = [];
  for (let m; (m = header.exec(text));) starts.push([Number(m[1]), m.index + m[0].length]);
  for (const [num, start] of starts) {
    const end = text.indexOf('endobj', start);
    const body = text.slice(start, end < 0 ? text.length : end);
    const s = /stream\r?\n/.exec(body);
    if (s && body.lastIndexOf('endstream') > s.index) {
      const raw = body.slice(s.index + s[0].length, body.lastIndexOf('endstream'));
      objects.set(num, { dict: body.slice(0, s.index), raw: raw.replace(/\r?\n$/, '') });
    } else {
      objects.set(num, { dict: body, raw: null });
    }
  }
  const streamOf = (num) => {
    const obj = objects.get(num);
    if (!obj?.raw) return null;
    if (obj.data === undefined) {
      const bytes = Buffer.from(obj.raw, 'latin1');
      obj.data = /FlateDecode/.test(obj.dict) ? inflate(bytes) : bytes;
    }
    return obj.data;
  };
  // Los objetos dentro de flujos de objetos.
  for (const [num, obj] of [...objects]) {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const data = streamOf(num);
    if (!data) continue;
    const first = Number(/\/First\s+(\d+)/.exec(obj.dict)?.[1] ?? 0);
    const body = data.toString('latin1');
    const nums = body.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k + 1 < nums.length; k += 2) {
      const from = first + nums[k + 1];
      const to = k + 3 < nums.length ? first + nums[k + 3] : body.length;
      if (!objects.has(nums[k])) objects.set(nums[k], { dict: body.slice(from, to), raw: null });
    }
  }
  const dictOf = (num) => objects.get(num)?.dict ?? '';

  // El árbol de páginas, en orden, con los recursos heredados.
  const catalog = [...objects.values()].find((o) => /\/Type\s*\/Catalog/.test(o.dict));
  const root = catalog && entry(catalog.dict, 'Pages')?.ref;
  if (!root) throw new Error('PDF sin catálogo de páginas');
  const pages = [];
  const walk = (num, inherited) => {
    const dict = dictOf(num);
    const res = entry(dict, 'Resources');
    const resources = res?.ref ? dictOf(res.ref) : (res?.dict ?? inherited);
    if (/\/Type\s*\/Pages/.test(dict)) {
      const kids = /\/Kids\s*\[([^\]]*)\]/.exec(dict)?.[1] ?? '';
      for (const [, kid] of kids.matchAll(/(\d+)\s+0\s+R/g)) walk(Number(kid), resources);
    } else {
      pages.push({ num, resources });
    }
  };
  walk(root, '');

  const decoders = new Map();
  /** Cómo se lee el texto de una fuente: su ToUnicode o su /Differences (si no, Latin-1). */
  const decoderOf = (fontNum) => {
    if (decoders.has(fontNum)) return decoders.get(fontNum);
    const dict = dictOf(fontNum);
    const map = new Map();
    let twoBytes = false;
    const toUnicode = entry(dict, 'ToUnicode')?.ref;
    const cmap = toUnicode ? streamOf(toUnicode)?.toString('latin1') : null;
    if (cmap) {
      twoBytes = /Identity-H|Type0/.test(dict);
      for (const [, block] of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const [, a, b] of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
          map.set(parseInt(a, 16), Buffer.from(b, 'hex').swap16().toString('utf16le'));
        }
      }
      for (const [, block] of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        for (const [, a, b, c] of block.matchAll(
          /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g,
        )) {
          for (let i = parseInt(a, 16); i <= parseInt(b, 16); i++) {
            map.set(i, String.fromCodePoint(parseInt(c, 16) + i - parseInt(a, 16)));
          }
        }
      }
    } else {
      const enc = entry(dict, 'Encoding');
      const encDict = enc?.ref ? dictOf(enc.ref) : (enc?.dict ?? '');
      const diffs = /\/Differences\s*\[([^\]]*)\]/.exec(encDict)?.[1] ?? '';
      let code = 0;
      for (const [tok] of diffs.matchAll(/\d+|\/[A-Za-z0-9_.]+/g)) {
        if (tok.startsWith('/')) {
          const name = tok.slice(1);
          map.set(code, name.length === 1 ? name : (GLYPHS[name] ?? `{${name}}`));
          code++;
        } else {
          code = Number(tok);
        }
      }
    }
    let maxCode = 0;
    for (const code of map.keys()) maxCode = Math.max(maxCode, code);
    const decoder = { map, twoBytes, wide: maxCode > 255 };
    decoders.set(fontNum, decoder);
    return decoder;
  };

  const LIT = String.raw`\((?:[^()\\]|\\[\s\S])*\)`;
  const TOKEN = new RegExp(
    String.raw`\/([A-Za-z0-9_+.-]+)\s+-?[\d.]+\s+Tf` +
      String.raw`|\[((?:${LIT}|<[0-9A-Fa-f\s]*>|[^\]])*)\]\s*TJ` +
      String.raw`|(${LIT})\s*(?:Tj|'|")` +
      String.raw`|<([0-9A-Fa-f\s]+)>\s*Tj` +
      String.raw`|(-?[\d.]+)\s+(-?[\d.]+)\s+(?:Td|TD)\b` +
      String.raw`|(T\*|ET)\b`,
    'g',
  );
  const PART = new RegExp(String.raw`(${LIT})|<([0-9A-Fa-f\s]*)>|(-?\d+\.?\d*)`, 'g');

  /** Los bytes de una cadena literal de PDF (con sus escapes). */
  const unescape = (literal) => {
    const out = [];
    for (let i = 0; i < literal.length; i++) {
      const c = literal.charCodeAt(i);
      if (c !== 0x5c || i + 1 >= literal.length) {
        out.push(c & 0xff);
        continue;
      }
      const n = literal[i + 1];
      const simple = { n: 10, r: 13, t: 9, b: 8, f: 12 }[n];
      if (simple !== undefined) {
        out.push(simple);
        i++;
      } else if (n >= '0' && n <= '7') {
        let j = i + 1;
        let v = 0;
        while (j < literal.length && j < i + 4 && literal[j] >= '0' && literal[j] <= '7') {
          v = v * 8 + Number(literal[j]);
          j++;
        }
        out.push(v & 0xff);
        i = j - 1;
      } else if (n === '\n' || n === '\r') {
        i++;
      } else {
        out.push(n.charCodeAt(0) & 0xff);
        i++;
      }
    }
    return out;
  };

  /** El texto de la página `index` (desde 1). */
  function pageText(index) {
    const page = pages[index - 1];
    if (!page) throw new Error(`El PDF no tiene página ${index}`);
    const fontEntry = entry(page.resources ?? '', 'Font');
    const fontDict = fontEntry?.ref ? dictOf(fontEntry.ref) : (fontEntry?.dict ?? '');
    const fonts = new Map();
    for (const [, name, num] of fontDict.matchAll(/\/([A-Za-z0-9_+.-]+)\s+(\d+)\s+0\s+R/g)) {
      fonts.set(name, decoderOf(Number(num)));
    }
    const dict = dictOf(page.num);
    const list = /\/Contents\s*\[([^\]]*)\]/.exec(dict)?.[1];
    const refs = list
      ? [...list.matchAll(/(\d+)\s+0\s+R/g)].map((m) => Number(m[1]))
      : [entry(dict, 'Contents')?.ref].filter(Boolean);
    const content = refs.map((ref) => streamOf(ref)?.toString('latin1') ?? '').join('\n');
    const none = { map: new Map(), twoBytes: false, wide: false };
    let font = none;
    const decode = (bytes, hex = false) => {
      if (font.twoBytes || (hex && font.wide)) {
        let s = '';
        for (let i = 0; i + 1 < bytes.length; i += 2)
          s += font.map.get(bytes[i] * 256 + bytes[i + 1]) ?? '?';
        return s;
      }
      return bytes.map((b) => font.map.get(b) ?? String.fromCharCode(b)).join('');
    };
    const lines = [];
    let current = '';
    for (const m of content.matchAll(TOKEN)) {
      if (m[1]) {
        font = fonts.get(m[1]) ?? none;
      } else if (m[2] !== undefined) {
        for (const p of m[2].matchAll(PART)) {
          if (p[1]) current += decode(unescape(p[1].slice(1, -1)));
          else if (p[2]) current += decode([...Buffer.from(p[2].replace(/\s/g, ''), 'hex')], true);
          else if (p[3] && Number(p[3]) < -180) current += ' ';
        }
      } else if (m[3]) {
        current += decode(unescape(m[3].slice(1, -1)));
      } else if (m[4]) {
        current += decode([...Buffer.from(m[4].replace(/\s/g, ''), 'hex')], true);
      } else if (m[5] !== undefined) {
        if (Number(m[6]) !== 0) {
          lines.push(current);
          current = '';
        } else {
          current += ' | ';
        }
      } else {
        lines.push(current);
        current = '';
      }
    }
    lines.push(current);
    return lines.filter((line) => line.trim()).join('\n');
  }

  return { pageCount: pages.length, pageText };
}
