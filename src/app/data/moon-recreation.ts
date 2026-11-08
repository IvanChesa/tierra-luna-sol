// GENERADO por scripts/build-textures.mjs el 2026-11-08. No se edita a mano.
// D45 (fase 9b): de cada luna con mosaico, la fracción de su superficie (por el área de la esfera) que
// es real con detalle, la que solo se fotografió de lejos (con detalle recreado) y la que no se vio
// (recreada entera), medidas en su mapa de 2k (scripts/measure-moon-maps.mjs). El método y las demás
// medidas, en docs/datos/recreacion-lunas.md.
import type { BodyId } from './body.model';

export interface MoonRecreation {
  readonly body: BodyId;
  readonly real: number;
  readonly far: number;
  readonly none: number;
}

export const MOON_RECREATION: readonly MoonRecreation[] = [
  { body: 'fobos', real: 0.9167, far: 0.0833, none: 0.0 },
  { body: 'io', real: 0.8293, far: 0.1707, none: 0.0 },
  { body: 'europa', real: 0.7997, far: 0.1949, none: 0.0054 },
  { body: 'ganimedes', real: 0.9791, far: 0.0162, none: 0.0047 },
  { body: 'calisto', real: 0.8753, far: 0.1149, none: 0.0097 },
  { body: 'mimas', real: 0.8004, far: 0.1996, none: 0.0 },
  { body: 'encelado', real: 0.7409, far: 0.259, none: 0.0001 },
  { body: 'tetis', real: 0.7978, far: 0.2022, none: 0.0001 },
  { body: 'dione', real: 0.8729, far: 0.1268, none: 0.0003 },
  { body: 'rea', real: 0.9264, far: 0.0736, none: 0.0 },
  { body: 'japeto', real: 0.6916, far: 0.3084, none: 0.0 },
  { body: 'triton', real: 0.3058, far: 0.3607, none: 0.3335 },
  { body: 'deimos', real: 0.555, far: 0.3267, none: 0.1183 },
  { body: 'miranda', real: 0.305, far: 0.0888, none: 0.6062 },
  { body: 'ariel', real: 0.2449, far: 0.0877, none: 0.6674 },
  { body: 'umbriel', real: 0.3526, far: 0.0113, none: 0.6361 },
  { body: 'titania', real: 0.3092, far: 0.0044, none: 0.6863 },
  { body: 'oberon', real: 0.335, far: 0.0004, none: 0.6646 },
];
