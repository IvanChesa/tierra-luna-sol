// Colores medidos en fotos reales que usa `build-textures.mjs` (fase 3b). Los mide y los compara
// `scripts/measure-reference-colors.mjs`, que dice la región exacta de cada foto; las fotos, en
// `docs/realismo/referencias.md`. Cromaticidad: RGB lineal / luminancia (Rec. 709). El color de cada
// anillo de Saturno está en `src/app/data/photometry.ts` (`RING_PHOTOMETRY.chromaticity`), con el de
// los planetas.

/**
 * Color del océano de la Tierra visto desde el espacio. La textura de Solar System Scope pinta todo
 * el océano abierto de un azul plano y saturado (≈ 0,28/0,93/3,84). Medido en tres fotos en color
 * natural de EPIC (DSCOVR, NASA; https://epic.gsfc.nasa.gov/) del 21-06-2016, centradas en el
 * Pacífico, el Atlántico y el Índico: cada píxel a menos de 0,6 radios del centro del disco se lleva a
 * su latitud y longitud, se quedan los de agua de la máscara especular (a 2 px de la costa) y, de
 * ellos, el 20 % más oscuro (sin nubes). Incluye la luz que dispersa la atmósfera, que la escena aún
 * no dibuja (fase 5).
 */
export const OCEAN_CHROMA = [0.683, 1.029, 1.651];

/**
 * Balance de color del mosaico de Ío (revisión del bloque D, D1). El «Color Merged» del USGS lleva el
 * color de Galileo (756 nm, verde y violeta, los filtros de PIA02308) con su propio procesado, más
 * rojizo y menos saturado que PIA02308, el mosaico de Ío en color real de la misma sonda (NASA/JPL/
 * University of Arizona; https://photojournal.jpl.nasa.gov/catalog/PIA02308). Ganancia por canal en
 * RGB lineal, calibrada con `scripts/compare-io.mjs`: la escena con la geometría de la foto, en el 60 %
 * central del disco, hasta que su color medio queda a ΔE*ab ≤ 4,6 del de la foto (CIELAB). A diferencia
 * de un tinte, conserva las variaciones de color del mosaico: blancos, naranjas y manchas oscuras.
 */
export const IO_COLOR_GAIN = [0.871, 1.07, 0.643];
