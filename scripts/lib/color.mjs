// Color para las medidas de los scripts: sRGB de 8 bits → lineal, y lineal → CIELAB (D65), como en
// compare-io.mjs y measure-earth-night.mjs.

const TABLE = Float64Array.from({ length: 256 }, (_, c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});

/** Un canal sRGB de 8 bits (0–255) en lineal (0–1). */
export const srgbToLinear = (c) => TABLE[c];

/** CIELAB (D65) de un color en RGB lineal (sRGB): L*, a*, b*, C* y h (grados). */
export function cielab([r, g, b]) {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const t = (v) => (v > 216 / 24389 ? Math.cbrt(v) : ((24389 / 27) * v + 16) / 116);
  const [fx, fy, fz] = [t(x), t(y), t(z)];
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return {
    L: 116 * fy - 16,
    a,
    b: bb,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}
