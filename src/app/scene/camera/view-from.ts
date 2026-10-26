/**
 * Desde dónde se mira un cuerpo en las capturas comparables (fase 3b): la misma geometría que una
 * foto de referencia (docs/realismo/referencias.md).
 * - Desde la Tierra: la línea Tierra → cuerpo de la fecha (las fotos del Hubble).
 * - Con un ángulo de fase y una latitud sobre el ecuador del cuerpo (las fotos de sondas).
 */
import { Vec3, cross, dot, normalize, scale, sub, vec3 } from '../../ephemeris/vec3';

export type ViewFrom =
  | { readonly kind: 'earth' }
  | {
      readonly kind: 'phase';
      /** Ángulo de fase Sol–cuerpo–cámara (grados). */
      readonly phaseDeg: number;
      /** Latitud de la cámara sobre el ecuador del cuerpo (grados); por defecto, la del Sol. */
      readonly latitudeDeg?: number;
    };

const DEG = Math.PI / 180;

/**
 * Dirección unitaria desde el cuerpo hacia la cámara con ese ángulo de fase y esa latitud sobre su
 * ecuador. `toSun` y `pole` unitarios, en el mismo sistema (ECL). Si la latitud pedida no admite esa
 * fase (el Sol muy alto sobre el ecuador, por ejemplo), se acerca lo más posible.
 */
export function phaseViewDirection(
  toSun: Vec3,
  pole: Vec3,
  phaseDeg: number,
  latitudeDeg?: number,
): Vec3 {
  const sunLatitude = dot(toSun, pole);
  let horizontal = sub(toSun, scale(pole, sunLatitude));
  const horizontalLength = Math.hypot(horizontal.x, horizontal.y, horizontal.z);
  // El Sol justo sobre el polo: cualquier dirección del ecuador vale.
  horizontal =
    horizontalLength > 1e-9
      ? scale(horizontal, 1 / horizontalLength)
      : normalize(cross(pole, Math.abs(pole.x) < 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0)));
  const side = cross(pole, horizontal);
  const latitude = latitudeDeg === undefined ? Math.asin(sunLatitude) : latitudeDeg * DEG;
  const sinB = Math.sin(latitude);
  const cosB = Math.cos(latitude);
  const denominator = horizontalLength * cosB;
  const cosPhi =
    Math.abs(denominator) < 1e-9
      ? 1
      : Math.min(Math.max((Math.cos(phaseDeg * DEG) - sunLatitude * sinB) / denominator, -1), 1);
  const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
  return normalize(
    vec3(
      pole.x * sinB + cosB * (horizontal.x * cosPhi + side.x * sinPhi),
      pole.y * sinB + cosB * (horizontal.y * cosPhi + side.y * sinPhi),
      pole.z * sinB + cosB * (horizontal.z * cosPhi + side.z * sinPhi),
    ),
  );
}

/** Acimut y elevación del rig (ejes de Three) para mirar desde una dirección ECL. */
export function anglesFromEcl(direction: Vec3): { azimuth: number; elevation: number } {
  // ECL → Three (x, z, −y).
  const x = direction.x;
  const y = direction.z;
  const z = -direction.y;
  const length = Math.hypot(x, y, z);
  return { azimuth: Math.atan2(x, z), elevation: Math.asin(y / length) };
}
