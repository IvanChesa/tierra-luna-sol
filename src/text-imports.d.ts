// Tipos para importar archivos con atributos de importación (los resuelve el esbuild de Angular):
// `with { loader: 'text' }` da un string y `with { loader: 'binary' }` un Uint8Array. Los usan los
// tests (site.config.spec.ts lee index.html; stars.spec.ts lee public/data/stars.bin).
declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.bin' {
  const content: Uint8Array;
  export default content;
}
