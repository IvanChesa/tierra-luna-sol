// Colores medidos en fotos reales que usa `build-textures.mjs` (fase 3b). Los mide y los compara
// `scripts/measure-reference-colors.mjs`, que dice la región exacta de cada foto; las fotos, en
// `docs/realismo/referencias.md`. Cromaticidad: RGB lineal / luminancia (Rec. 709).

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
 * Matiz de cada anillo de Saturno, medido en la foto del Hubble del 20-06-2019 (OPAL, NASA/ESA;
 * heic1917a) a lo largo del ansa derecha: el color de la textura en los anillos tenues no es fiable
 * (salía morado en el C).
 */
export const RING_TINTS = {
  C: [1.04, 0.96, 1.24],
  B: [0.94, 1.01, 1.07],
  Cassini: [0.92, 1.0, 1.24],
  A: [0.99, 1.0, 1.09],
};
