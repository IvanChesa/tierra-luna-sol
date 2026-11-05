// La esfera de un mapa equirrectangular vista desde una dirección (proyección ortográfica), para
// revisar los mapas de las lunas de D45 (fase 9b): las cuatro longitudes del ecuador y los dos polos.
// Sin luz del Sol (el mapa tal cual), con un oscurecimiento suave hacia el borde para que se lea la
// esfera. Bilineal, con la vuelta del antimeridiano.

/** Las seis direcciones de la adenda D45: [nombre, latitud, longitud]. */
export const SIX_VIEWS = [
  ['0°', 0, 0],
  ['90° E', 0, 90],
  ['180°', 0, 180],
  ['90° O', 0, -90],
  ['Polo norte', 90, 0],
  ['Polo sur', -90, 0],
];

/**
 * Pinta la esfera (RGB de 8 bits, `size` × `size`, fondo negro) del mapa `rgb` (Uint8 o Float32 de
 * 0 a 1, W × H × 3) vista desde latitud y longitud (grados), con el norte arriba (en los polos, la
 * longitud 0 abajo en el norte y arriba en el sur).
 */
export function renderGlobe(rgb, W, H, lat0, lon0, size, scale = 255) {
  const out = Buffer.alloc(size * size * 3);
  const la = (lat0 * Math.PI) / 180;
  const lo = (lon0 * Math.PI) / 180;
  // Ejes de la vista: hacia el observador (c), derecha (r) y arriba (u), en x (lon 0), y (90° E), z (norte).
  const c = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  let r = [-Math.sin(lo), Math.cos(lo), 0];
  if (Math.abs(lat0) > 89.9) r = lat0 > 0 ? [0, 1, 0] : [0, 1, 0];
  const u = [c[1] * r[2] - c[2] * r[1], c[2] * r[0] - c[0] * r[2], c[0] * r[1] - c[1] * r[0]];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * 2 - 1;
      const y = 1 - ((py + 0.5) / size) * 2;
      const rr = x * x + y * y;
      if (rr > 1) continue;
      const z = Math.sqrt(1 - rr);
      const d = [
        c[0] * z + r[0] * x + u[0] * y,
        c[1] * z + r[1] * x + u[1] * y,
        c[2] * z + r[2] * x + u[2] * y,
      ];
      const lat = Math.asin(Math.max(-1, Math.min(1, d[2])));
      const lon = Math.atan2(d[1], d[0]);
      const fx = ((lon / Math.PI + 1) / 2) * W - 0.5;
      const fy = (0.5 - lat / Math.PI) * H - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const ya = Math.min(Math.max(y0, 0), H - 1);
      const yb = Math.min(Math.max(y0 + 1, 0), H - 1);
      const xa = ((x0 % W) + W) % W;
      const xb = (((x0 + 1) % W) + W) % W;
      const shade = 0.55 + 0.45 * Math.pow(z, 0.5);
      const k = (py * size + px) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const v00 = rgb[(ya * W + xa) * 3 + ch];
        const v10 = rgb[(ya * W + xb) * 3 + ch];
        const v01 = rgb[(yb * W + xa) * 3 + ch];
        const v11 = rgb[(yb * W + xb) * 3 + ch];
        const v = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
        out[k + ch] = Math.max(0, Math.min(255, Math.round(v * scale * shade)));
      }
    }
  }
  return out;
}
