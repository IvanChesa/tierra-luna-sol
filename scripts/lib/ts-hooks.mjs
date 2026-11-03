// Ganchos de carga de Node para los scripts que importan módulos TS de `src/` (ver ts-resolve.mjs):
// - resolve: un import relativo sin extensión (`'./coordinates'`, como los escribe Angular) prueba
//   también con `.ts`;
// - load: los `.ts` se transpilan con el compilador de TypeScript del proyecto (`transpileModule`, un
//   fichero cada vez), que quita los tipos y los imports que solo son de tipos. El «type stripping» de
//   Node no basta: no sabe que en `import { Mat3, vec3 }` Mat3 es un tipo.
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (relative && !/[.][cm]?[jt]s$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
}

export async function load(url, context, next) {
  if (!url.startsWith('file:') || !url.endsWith('.ts')) return next(url, context);
  const source = await readFile(new URL(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: url,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      resolveJsonModule: true,
      sourceMap: false,
    },
  });
  return { format: 'module', source: outputText, shortCircuit: true };
}
