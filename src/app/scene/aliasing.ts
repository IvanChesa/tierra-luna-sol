/**
 * Velocidades altas sin aliasing (PLAN §4.5): si un cuerpo avanzaría más de ~20° de su órbita por
 * frame, su movimiento ya no se puede seguir (a 1 año/s, Fobos da más de 1100 vueltas por segundo y
 * parecería saltar al azar). Entonces su marcador se oculta y su órbita se resalta entera; y si su
 * rotación avanza más de 20° por frame, se congela visualmente.
 *
 * Con histéresis (entra a 20° y sale a 15°) para que no parpadee cuando los FPS rondan el umbral, y
 * con el intervalo real entre frames: a 30 FPS el salto por frame es el doble que a 60.
 */

/** Umbral de entrada (grados por frame) y de salida. */
export const ALIAS_ENTER_DEG = 20;
export const ALIAS_EXIT_DEG = 15;

export interface MotionBody {
  /** Periodo orbital sidéreo (días, positivo), o `null` si no orbita (el Sol). */
  readonly orbitDays: number | null;
  /** Periodo de rotación sidéreo (días, positivo), o `null` si no se conoce. */
  readonly spinDays: number | null;
  /** Índice del cuerpo alrededor del que orbita (−1 si ninguno o el Sol). */
  readonly parentIndex: number;
  readonly isMoon: boolean;
}

/** Grados que avanza en un frame algo con ese periodo. */
export const degreesPerFrame = (periodDays: number, daysPerSecond: number, frameMs: number) =>
  (360 * Math.abs(daysPerSecond) * (frameMs / 1000)) / periodDays;

/**
 * Periodo del movimiento de un cuerpo VISTO DESDE EL FOCO. Normalmente, su órbita; pero si el foco
 * es una luna, su planeta da vueltas a su alrededor con el periodo de la luna, y las lunas hermanas
 * se mueven con el más corto de los dos.
 */
export function apparentPeriodDays(
  bodies: readonly MotionBody[],
  index: number,
  focusIndex: number,
): number | null {
  if (index === focusIndex) return null;
  const body = bodies[index];
  if (!body) return null;
  const focus = focusIndex >= 0 ? bodies[focusIndex] : undefined;
  if (focus?.isMoon && focus.orbitDays !== null) {
    if (index === focus.parentIndex) return focus.orbitDays;
    if (body.isMoon && body.parentIndex === focus.parentIndex && body.orbitDays !== null)
      return Math.min(body.orbitDays, focus.orbitDays);
  }
  return body.orbitDays;
}

export class AliasingState {
  /** 1 si el movimiento orbital del cuerpo se sustituye por su órbita. */
  readonly orbit: Uint8Array;
  /** 1 si su rotación propia está congelada. */
  readonly spin: Uint8Array;

  constructor(private readonly bodies: readonly MotionBody[]) {
    this.orbit = new Uint8Array(bodies.length);
    this.spin = new Uint8Array(bodies.length);
  }

  /**
   * Actualiza los indicadores. Con el tiempo parado, nada está en aliasing.
   * @param daysPerSecond velocidad de la simulación (días simulados por segundo real; 0 en pausa).
   * @param frameMs intervalo real entre frames (suavizado).
   */
  update(daysPerSecond: number, frameMs: number, focusIndex: number): void {
    this.bodies.forEach((body, k) => {
      const orbitPeriod = apparentPeriodDays(this.bodies, k, focusIndex);
      this.orbit[k] = flag(this.orbit[k] === 1, orbitPeriod, daysPerSecond, frameMs);
      this.spin[k] = flag(this.spin[k] === 1, body.spinDays, daysPerSecond, frameMs);
    });
  }

  /** ¿Hay algún cuerpo en aliasing? (Para saber si el frame cambia algo.) */
  get any(): boolean {
    return this.orbit.some((v) => v === 1) || this.spin.some((v) => v === 1);
  }
}

function flag(was: boolean, period: number | null, daysPerSecond: number, frameMs: number): 0 | 1 {
  if (period === null || !(period > 0) || daysPerSecond === 0) return 0;
  const degrees = degreesPerFrame(period, daysPerSecond, frameMs);
  return degrees > (was ? ALIAS_EXIT_DEG : ALIAS_ENTER_DEG) ? 1 : 0;
}
