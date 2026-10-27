/**
 * Proyección de los cuerpos a la pantalla, ocultación entre ellos y selección con el puntero
 * (zonas agrandadas: un cuerpo de 1 px se puede tocar con el dedo). Lo usan las etiquetas y el clic
 * en el lienzo. Sin WebGL: solo matemáticas de la cámara de three.
 */
import { Matrix4, PerspectiveCamera, Vector4 } from 'three';

/** Un cuerpo proyectado. Coordenadas en píxeles CSS desde la esquina superior izquierda. */
export interface ScreenBody {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  /** Radio aparente en píxeles CSS. */
  readonly radiusPx: number;
  /** Distancia a la cámara (unidades de escena). */
  readonly depth: number;
  /** Delante de la cámara y dentro de la pantalla (con margen). */
  readonly onScreen: boolean;
  /** Tapado por otro cuerpo más cercano. */
  readonly occluded: boolean;
}

/** Radio mínimo de la zona sensible al puntero (px CSS): 44 px de diámetro en táctil (WCAG 2.5.5). */
export const MIN_HIT_RADIUS_PX = 22;

/**
 * Un cuerpo no tapa a otro si su tamaño aparente es menos de esta fracción del de él: una luna que
 * pasa por delante del centro de Saturno no lo oculta (fase 4b).
 */
export const SMALL_OCCLUDER = 0.5;

const tmpMatrix = new Matrix4();
const tmpVector = new Vector4();

/**
 * Proyecta los cuerpos. `positions` son x, y, z por cuerpo EN EJES DE THREE y relativos al foco
 * (las mismas coordenadas que la escena); `radii`, en unidades de escena.
 */
export function projectBodies(
  camera: PerspectiveCamera,
  positions: Float64Array,
  radii: Float64Array,
  width: number,
  height: number,
): ScreenBody[] {
  camera.updateMatrixWorld();
  tmpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const cam = camera.position;
  // Focal en píxeles a partir de la propia proyección (tiene en cuenta el zoom y el view offset).
  const focalPx = ((camera.projectionMatrix.elements[5] as number) * height) / 2;
  const n = radii.length;
  const raw: Omit<ScreenBody, 'occluded'>[] = [];
  for (let k = 0; k < n; k++) {
    const px = positions[3 * k] as number;
    const py = positions[3 * k + 1] as number;
    const pz = positions[3 * k + 2] as number;
    const r = radii[k] as number;
    tmpVector.set(px, py, pz, 1).applyMatrix4(tmpMatrix);
    const w = tmpVector.w;
    const depth = Math.hypot(px - cam.x, py - cam.y, pz - cam.z);
    const inFront = w > 0;
    const x = ((tmpVector.x / w + 1) / 2) * width;
    const y = ((1 - tmpVector.y / w) / 2) * height;
    const radiusPx = depth > r ? (focalPx * r) / Math.sqrt(depth * depth - r * r) : Infinity;
    const margin = Math.max(radiusPx, 50);
    const onScreen =
      inFront && x > -margin && x < width + margin && y > -margin && y < height + margin;
    raw.push({ index: k, x, y, radiusPx, depth, onScreen });
  }
  return raw.map((body) => ({ ...body, occluded: isOccluded(body.index, positions, radii, cam) }));
}

/**
 * ¿Hay otro cuerpo entre la cámara y el centro de `index` que lo tape? Solo cuenta si no es mucho más
 * pequeño en pantalla (`SMALL_OCCLUDER`); los de radio 0 (las lunas que no se dibujan), nunca.
 */
function isOccluded(
  index: number,
  positions: Float64Array,
  radii: Float64Array,
  cam: { x: number; y: number; z: number },
): boolean {
  const tx = (positions[3 * index] as number) - cam.x;
  const ty = (positions[3 * index + 1] as number) - cam.y;
  const tz = (positions[3 * index + 2] as number) - cam.z;
  const distance = Math.hypot(tx, ty, tz);
  if (distance === 0) return false;
  const dx = tx / distance;
  const dy = ty / distance;
  const dz = tz / distance;
  const reach = distance - (radii[index] as number);
  for (let k = 0; k < radii.length; k++) {
    if (k === index) continue;
    const cx = (positions[3 * k] as number) - cam.x;
    const cy = (positions[3 * k + 1] as number) - cam.y;
    const cz = (positions[3 * k + 2] as number) - cam.z;
    const along = cx * dx + cy * dy + cz * dz;
    if (along <= 0 || along >= reach) continue;
    const r = radii[k] as number;
    if (r / along < SMALL_OCCLUDER * ((radii[index] as number) / distance)) continue;
    const perpendicular2 = cx * cx + cy * cy + cz * cz - along * along;
    if (perpendicular2 < r * r) return true;
  }
  return false;
}

/**
 * Cuerpo bajo el puntero. Si cae dentro del disco de algún cuerpo, el más cercano a la cámara de
 * ellos: un clic en el disco de Saturno elige Saturno aunque una luna tenga el centro más cerca
 * (fase 4b). Si no, el de menor distancia al centro relativa a su zona sensible (su disco o, si es
 * más pequeño, `minHitPx`), y a igualdad, el más cercano a la cámara.
 */
export function pickBody(
  bodies: readonly ScreenBody[],
  x: number,
  y: number,
  minHitPx = MIN_HIT_RADIUS_PX,
): number | null {
  let inside: { index: number; depth: number } | null = null;
  for (const body of bodies) {
    if (!body.onScreen || body.occluded) continue;
    if (Math.hypot(body.x - x, body.y - y) > body.radiusPx) continue;
    if (!inside || body.depth < inside.depth) inside = { index: body.index, depth: body.depth };
  }
  if (inside) return inside.index;
  let best: { index: number; score: number; depth: number } | null = null;
  for (const body of bodies) {
    if (!body.onScreen || body.occluded) continue;
    const hit = Math.max(body.radiusPx, minHitPx);
    const score = Math.hypot(body.x - x, body.y - y) / hit;
    if (score > 1) continue;
    if (
      !best ||
      score < best.score - 1e-9 ||
      (Math.abs(score - best.score) <= 1e-9 && body.depth < best.depth)
    ) {
      best = { index: body.index, score, depth: body.depth };
    }
  }
  return best?.index ?? null;
}
