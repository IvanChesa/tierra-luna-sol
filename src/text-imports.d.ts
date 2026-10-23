// Tipos para importar un archivo como texto con `with { loader: 'text' }` (lo resuelve el esbuild
// de Angular). Lo usa site.config.spec.ts para leer index.html.
declare module '*.html' {
  const content: string;
  export default content;
}
