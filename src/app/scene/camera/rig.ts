/**
 * Cámara orbital alrededor del foco. Por el origen flotante (D12), el foco está siempre en el
 * origen, así que seguir a un cuerpo en movimiento no cuesta nada: la cámara se mueve con él.
 *
 * Coordenadas esféricas con el polo norte de la eclíptica hacia +Y (ejes de Three):
 * azimut alrededor de Y (0 hacia +Z) y elevación sobre el plano de la eclíptica.
 *
 * Los cambios se acercan a su objetivo con una amortiguación exponencial independiente de los FPS;
 * la distancia, en escala logarítmica (de 10⁵ a 1 unidad tarda lo mismo que de 10 a 1). Con
 * movimiento reducido, todo es directo.
 */
import type { PerspectiveCamera } from 'three';
import { Vec3, vec3 } from '../../ephemeris/vec3';

export interface RigPose {
  readonly distance: number;
  /** Radianes. */
  readonly azimuth: number;
  /** Radianes, de −π/2 a π/2. */
  readonly elevation: number;
}

/** Margen para no llegar a los polos, donde `lookAt` pierde la orientación. */
export const MAX_ELEVATION = Math.PI / 2 - 0.02;

const TAU = 2 * Math.PI;
/** Velocidad angular por debajo de la cual la inercia se da por terminada (rad/s). */
const MIN_ANGULAR_SPEED = 1e-3;

const wrapAngle = (a: number): number => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const clampElevation = (e: number): number => Math.max(-MAX_ELEVATION, Math.min(MAX_ELEVATION, e));

export class CameraRig {
  distance: number;
  azimuth: number;
  elevation: number;
  private targetDistance: number;
  private targetAzimuth: number;
  private targetElevation: number;
  private inertiaAzimuth = 0;
  private inertiaElevation = 0;
  private minDistance = 0;
  private maxDistance = Infinity;
  /** Constante de tiempo de la amortiguación (ms): en 3τ se recorre el 95 % del camino. */
  smoothingMs = 350;
  /** Frenado de la inercia tras soltar un arrastre (1/s). */
  friction = 4;

  constructor(pose: RigPose) {
    this.distance = this.targetDistance = pose.distance;
    this.azimuth = this.targetAzimuth = wrapAngle(pose.azimuth);
    this.elevation = this.targetElevation = clampElevation(pose.elevation);
  }

  get target(): RigPose {
    return {
      distance: this.targetDistance,
      azimuth: this.targetAzimuth,
      elevation: this.targetElevation,
    };
  }

  /** Límites de distancia (por ejemplo, no entrar en el cuerpo enfocado). */
  setLimits(minDistance: number, maxDistance: number): void {
    this.minDistance = minDistance;
    this.maxDistance = Math.max(minDistance, maxDistance);
    this.targetDistance = this.clampDistance(this.targetDistance);
    this.distance = this.clampDistance(this.distance);
  }

  /** Fija un objetivo. Con `immediate`, salta a él (movimiento reducido, captura). */
  setTarget(target: Partial<RigPose>, immediate = false): void {
    if (target.distance !== undefined) this.targetDistance = this.clampDistance(target.distance);
    if (target.azimuth !== undefined) {
      // Por el camino más corto desde el azimut actual.
      this.targetAzimuth = this.azimuth + wrapAngle(target.azimuth - this.azimuth);
    }
    if (target.elevation !== undefined) this.targetElevation = clampElevation(target.elevation);
    if (immediate) this.snap();
  }

  /** Gira directamente (arrastre del usuario), sin amortiguación. */
  rotate(deltaAzimuth: number, deltaElevation: number): void {
    this.azimuth = this.targetAzimuth = this.azimuth + deltaAzimuth;
    this.elevation = this.targetElevation = clampElevation(this.elevation + deltaElevation);
    this.inertiaAzimuth = this.inertiaElevation = 0;
  }

  /** Al soltar un arrastre: velocidad angular (rad/s) que se frena poco a poco. */
  fling(azimuthSpeed: number, elevationSpeed: number): void {
    this.inertiaAzimuth = azimuthSpeed;
    this.inertiaElevation = elevationSpeed;
  }

  /** Acerca (`factor` < 1) o aleja (> 1) el objetivo de distancia. */
  zoom(factor: number): void {
    if (!(factor > 0)) return;
    this.targetDistance = this.clampDistance(this.targetDistance * factor);
  }

  /**
   * Cambia el origen (el foco nuevo está en `offset` respecto al anterior) sin mover la cámara en
   * el mundo: recalcula distancia y ángulos desde el foco nuevo. Los objetivos pasan a ser la pose
   * actual; quien llama fija después los nuevos.
   */
  reanchor(offset: Vec3): void {
    const p = this.position;
    const x = p.x - offset.x;
    const y = p.y - offset.y;
    const z = p.z - offset.z;
    const distance = Math.hypot(x, y, z);
    if (distance === 0) return;
    this.distance = this.targetDistance = distance;
    this.azimuth = this.targetAzimuth = Math.atan2(x, z);
    this.elevation = this.targetElevation = clampElevation(Math.asin(y / distance));
    this.inertiaAzimuth = this.inertiaElevation = 0;
  }

  /** Salta a los objetivos. */
  snap(): void {
    this.distance = this.targetDistance;
    this.azimuth = this.targetAzimuth;
    this.elevation = this.targetElevation;
    this.inertiaAzimuth = this.inertiaElevation = 0;
  }

  /**
   * Avanza `dtMs` milisegundos. Devuelve `true` si sigue moviéndose (el motor pedirá otro frame).
   */
  update(dtMs: number): boolean {
    const dt = Math.max(0, dtMs) / 1000;
    if (this.inertiaAzimuth !== 0 || this.inertiaElevation !== 0) {
      // Como un arrastre, pero sin anular la inercia (rotate() la anula).
      this.azimuth = this.targetAzimuth = this.azimuth + this.inertiaAzimuth * dt;
      this.elevation = this.targetElevation = clampElevation(
        this.elevation + this.inertiaElevation * dt,
      );
      const decay = Math.exp(-this.friction * dt);
      this.inertiaAzimuth =
        Math.abs(this.inertiaAzimuth * decay) < MIN_ANGULAR_SPEED ? 0 : this.inertiaAzimuth * decay;
      this.inertiaElevation =
        Math.abs(this.inertiaElevation * decay) < MIN_ANGULAR_SPEED
          ? 0
          : this.inertiaElevation * decay;
    }
    const k = 1 - Math.exp(-dtMs / this.smoothingMs);
    const logDistance = Math.log(this.distance);
    const logTarget = Math.log(this.targetDistance);
    this.distance = Math.exp(logDistance + (logTarget - logDistance) * k);
    this.azimuth += (this.targetAzimuth - this.azimuth) * k;
    this.elevation += (this.targetElevation - this.elevation) * k;
    const settled =
      Math.abs(Math.log(this.distance / this.targetDistance)) < 1e-4 &&
      Math.abs(this.targetAzimuth - this.azimuth) < 1e-5 &&
      Math.abs(this.targetElevation - this.elevation) < 1e-5;
    if (settled) {
      this.distance = this.targetDistance;
      this.azimuth = this.targetAzimuth = wrapAngle(this.targetAzimuth);
      this.elevation = this.targetElevation;
    }
    return !settled || this.inertiaAzimuth !== 0 || this.inertiaElevation !== 0;
  }

  /** Posición de la cámara respecto al foco (ejes de Three). */
  get position(): Vec3 {
    const c = Math.cos(this.elevation);
    return vec3(
      this.distance * c * Math.sin(this.azimuth),
      this.distance * Math.sin(this.elevation),
      this.distance * c * Math.cos(this.azimuth),
    );
  }

  /** Coloca una cámara de Three mirando al foco, con la eclíptica norte hacia arriba. */
  applyTo(camera: PerspectiveCamera): void {
    const p = this.position;
    camera.position.set(p.x, p.y, p.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
  }

  private clampDistance(d: number): number {
    return Math.min(Math.max(d, this.minDistance), this.maxDistance);
  }
}
