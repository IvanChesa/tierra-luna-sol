/**
 * La línea de autoría de la primera pantalla del explorador (fase 9c, decisión 3 de Iván, D47): que
 * las posiciones son reales y se calculan en el navegador, y quién lo ha hecho, con un enlace a cómo se
 * calcula: «Sobre el proyecto», § Precisión medida (los errores frente a JPL Horizons, del informe de
 * la fase 1), que es su fuente. Corta, para que quepa en dos líneas en un teléfono. Texto nuevo: lo
 * revisa Iván (`reviewed: false`).
 */
export const AUTHORSHIP = {
  text: 'Posiciones reales, calculadas en tu navegador.',
  /** `/sobre-el-proyecto#precision`, el enlace «Cómo se calcula». */
  source: { path: '/sobre-el-proyecto', fragment: 'precision' },
  reviewed: false,
} as const;
