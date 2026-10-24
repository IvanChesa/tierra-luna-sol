/**
 * Cielo de estrellas reales (D14): el catálogo HYG de la fase 1 (`public/data/stars.bin`, CC BY-SA
 * 4.0) como `Points`, con la posición de cada estrella en ECL. El catálogo viene ordenado por brillo,
 * así que el límite de magnitud de cada calidad es solo un `drawRange`.
 */
import { BufferAttribute, BufferGeometry, Points } from 'three';
import { StarCatalog, starDirectionsEcl } from '../ephemeris/stars';
import { createStarMaterial } from './materials/star-material';

/**
 * Temperatura efectiva (K) a partir del índice de color B−V, con la fórmula de Ballesteros (2012,
 * EPL 97, 34008): T = 4600 · (1 / (0,92 · B−V + 1,7) + 1 / (0,92 · B−V + 0,62)).
 */
export function bvToTemperature(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

/**
 * Color sRGB (0–1) de un cuerpo negro a esa temperatura, con la aproximación por tramos de
 * Tanner Helland (2012), suficiente para el color de una estrella en pantalla.
 */
export function temperatureToSrgb(kelvin: number): [number, number, number] {
  const t = Math.min(Math.max(kelvin, 1000), 40_000) / 100;
  const red = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const green =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * (t - 60) ** -0.0755148492;
  const blue = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 255) / 255;
  return [clamp(red), clamp(green), clamp(blue)];
}

/** sRGB (0–1) → lineal, para los atributos de color (three trabaja en lineal). */
const srgbToLinear = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** Número de estrellas con magnitud ≤ `limit` (el catálogo está ordenado por brillo). */
export function countBrighterThan(catalog: StarCatalog, limit: number): number {
  let lo = 0;
  let hi = catalog.count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((catalog.magnitude[mid] as number) <= limit) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class StarField {
  readonly object: Points;
  private readonly geometry = new BufferGeometry();
  private readonly material = createStarMaterial();

  constructor(private readonly catalog: StarCatalog) {
    const directions = starDirectionsEcl(catalog);
    const n = catalog.count;
    const position = new Float32Array(3 * n);
    const color = new Float32Array(3 * n);
    for (let k = 0; k < n; k++) {
      // ECL (x, y, z) → Three (x, z, −y).
      position[3 * k] = directions[3 * k] as number;
      position[3 * k + 1] = directions[3 * k + 2] as number;
      position[3 * k + 2] = -(directions[3 * k + 1] as number);
      const bv = catalog.colorIndex[k] as number;
      const rgb = Number.isNaN(bv) ? ([1, 1, 1] as const) : temperatureToSrgb(bvToTemperature(bv));
      color[3 * k] = srgbToLinear(rgb[0]);
      color[3 * k + 1] = srgbToLinear(rgb[1]);
      color[3 * k + 2] = srgbToLinear(rgb[2]);
    }
    this.geometry.setAttribute('position', new BufferAttribute(position, 3));
    this.geometry.setAttribute('aColor', new BufferAttribute(color, 3));
    this.geometry.setAttribute(
      'aMagnitude',
      new BufferAttribute(Float32Array.from(catalog.magnitude), 1),
    );
    this.object = new Points(this.geometry, this.material.material);
    this.object.name = 'stars';
    this.object.renderOrder = -10;
    // Están en el infinito: siempre a la vista.
    this.object.frustumCulled = false;
  }

  /** Límite de magnitud (calidad): solo se dibujan las estrellas más brillantes que él. */
  setMagnitudeLimit(limit: number): void {
    this.material.uniforms.uMagnitudeLimit.value = limit;
    this.geometry.setDrawRange(0, countBrighterThan(this.catalog, limit));
  }

  setPixelRatio(pixelRatio: number): void {
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  /** Distancia a la que se dibujan (entre los planos cercano y lejano de la cámara). */
  setSkyDistance(distance: number): void {
    this.material.uniforms.uSkyDistance.value = distance;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.material.dispose();
  }
}
