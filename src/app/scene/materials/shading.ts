/**
 * Sombreado físico por tipo de cuerpo (D29): las fórmulas de `ephemeris/photometry.ts`, en GLSL.
 * Cualquier cambio en una tiene que ir también en la otra (los tests prueban la de TS).
 *
 * Uniformes por cuerpo:
 * - `uPhotometryA` = (L₀, s, k, B₀) y `uPhotometryB` = (h, g₁, f, g₂): la reflectancia.
 * - `uPhaseNorm` = 1 / Φ(0), para normalizar la función de fase (se calcula en JS).
 * - `uHaze` = (intensidad, exponente del limbo, crepúsculo, refuerzo a contraluz) y `uHazeColor` =
 *   (color lineal, asimetría del refuerzo): la atmósfera.
 */
import { Color, Uniform, Vector4 } from 'three';
import type { Haze, Photometry } from '../../ephemeris/photometry';
import { phaseFunction } from '../../ephemeris/photometry';

/** Declaraciones y funciones (después de los chunks de profundidad del fragment shader). */
export const SHADING_PARS = /* glsl */ `
uniform vec4 uPhotometryA;
uniform vec4 uPhotometryB;
uniform float uPhaseNorm;
uniform vec4 uHaze;
uniform vec4 uHazeColor;

float tlsHenyeyGreenstein(float cosAlpha, float g) {
  return (1.0 - g * g) / pow(1.0 + 2.0 * g * cosAlpha + g * g, 1.5);
}

// Φ(α): pico de oposición de Hapke × Henyey–Greenstein doble.
float tlsPhase(float alpha, float cosAlpha) {
  float opposition = uPhotometryA.w > 0.0
    ? 1.0 + uPhotometryA.w / (1.0 + tan(0.5 * alpha) / uPhotometryB.x)
    : 1.0;
  float lobes = (1.0 - uPhotometryB.z) * tlsHenyeyGreenstein(cosAlpha, uPhotometryB.y)
    + uPhotometryB.z * tlsHenyeyGreenstein(cosAlpha, uPhotometryB.w);
  return opposition * lobes;
}

// Reflectancia relativa (1 en μ₀ = μ = 1, α = 0): Lommel–Seeliger y Minnaert con el peso L(α).
float tlsReflectance(float mu0, float mu, float alpha, float cosAlpha) {
  if (mu0 <= 0.0) return 0.0;
  float m = max(mu, 0.02);
  float lommelSeeliger = 2.0 * mu0 / (mu0 + m);
  float k = uPhotometryA.z;
  float minnaert = pow(mu0, k) * pow(m, k - 1.0);
  float weight = clamp(uPhotometryA.x - uPhotometryA.y * alpha, 0.0, 1.0);
  return mix(minnaert, lommelSeeliger, weight) * tlsPhase(alpha, cosAlpha) * uPhaseNorm;
}

// Atmósfera: crece hacia el limbo, sigue al Sol hasta el crepúsculo y se refuerza a contraluz.
float tlsHaze(float mu0, float mu, float cosAlpha) {
  if (uHaze.x <= 0.0) return 0.0;
  float lit = smoothstep(-uHaze.z, uHaze.z, mu0);
  float limb = pow(1.0 - clamp(mu, 0.0, 1.0), uHaze.y);
  float g = uHazeColor.w;
  float forward = 1.0 + uHaze.w * tlsHenyeyGreenstein(cosAlpha, g) / tlsHenyeyGreenstein(-1.0, g);
  return uHaze.x * lit * limb * forward;
}
`;

export interface ShadingUniforms {
  readonly uPhotometryA: Uniform<Vector4>;
  readonly uPhotometryB: Uniform<Vector4>;
  readonly uPhaseNorm: Uniform<number>;
  readonly uHaze: Uniform<Vector4>;
  readonly uHazeColor: Uniform<Vector4>;
}

/** Uniformes del sombreado de un cuerpo (el color de la atmósfera, en sRGB). */
export function shadingUniforms(
  photometry: Photometry,
  haze: Haze | null,
  hazeColor: string,
): ShadingUniforms {
  const color = new Color(hazeColor); // three lo pasa a lineal
  return {
    uPhotometryA: new Uniform(
      new Vector4(
        photometry.lommel,
        photometry.lommelSlope,
        photometry.minnaertK,
        photometry.oppositionAmplitude,
      ),
    ),
    uPhotometryB: new Uniform(
      new Vector4(
        photometry.oppositionWidth,
        photometry.backAsymmetry,
        photometry.forwardFraction,
        photometry.forwardAsymmetry,
      ),
    ),
    uPhaseNorm: new Uniform(1 / phaseFunction(0, photometry)),
    uHaze: new Uniform(
      haze
        ? new Vector4(haze.strength, haze.limbExponent, haze.twilight, haze.forwardBoost)
        : new Vector4(0, 1, 0.1, 0),
    ),
    uHazeColor: new Uniform(new Vector4(color.r, color.g, color.b, haze?.forwardAsymmetry ?? 0.5)),
  };
}
