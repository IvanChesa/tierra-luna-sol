/**
 * Tiempo de la simulación (PLAN §4.5). El motor lo avanza en su bucle, fuera de Angular, y avisa al
 * store como mucho 5 veces por segundo. Internamente siempre en UTC (milisegundos).
 */
import { MAX_DATE, MIN_DATE } from '../ephemeris/time';

const MIN_MS = MIN_DATE.getTime();
const MAX_MS = MAX_DATE.getTime();

/** Velocidad máxima admitida: 1 año por segundo real (la mayor de la interfaz), con margen. */
export const MAX_SPEED = 2 * 365.25 * 86_400;

export type TimeLimit = 'min' | 'max';

export class SimClock {
  private timeMs: number;
  private _playing = false;
  private _speed = 1;

  constructor(initial: Date) {
    this.timeMs = SimClock.clamp(initial.getTime());
  }

  /** Lleva un instante al rango 1900–2100. Un `NaN` es un error de quien llama. */
  static clamp(ms: number): number {
    if (Number.isNaN(ms)) throw new RangeError('Fecha inválida.');
    return Math.min(Math.max(ms, MIN_MS), MAX_MS);
  }

  get time(): Date {
    return new Date(this.timeMs);
  }

  get timeMsValue(): number {
    return this.timeMs;
  }

  get playing(): boolean {
    return this._playing;
  }

  /** Segundos simulados por segundo real; negativa = hacia atrás. */
  get speed(): number {
    return this._speed;
  }

  setTime(date: Date): void {
    this.timeMs = SimClock.clamp(date.getTime());
  }

  /**
   * Reproduce o pausa. Si ya está en el límite hacia el que avanzaría, no arranca y devuelve ese
   * límite (la interfaz lo explica).
   */
  setPlaying(playing: boolean): TimeLimit | null {
    if (playing) {
      const limit = this.limitAhead();
      if (limit) {
        this._playing = false;
        return limit;
      }
    }
    this._playing = playing;
    return null;
  }

  setSpeed(simSecondsPerSecond: number): void {
    if (!Number.isFinite(simSecondsPerSecond)) throw new RangeError('Velocidad no válida.');
    this._speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, simSecondsPerSecond));
  }

  /**
   * Avanza `realDtMs` milisegundos reales. Si llega a 1900 o a 2100, se queda en el límite, se pausa
   * y devuelve cuál.
   */
  advance(realDtMs: number): TimeLimit | null {
    if (!this._playing || realDtMs <= 0 || this._speed === 0) return null;
    const next = this.timeMs + realDtMs * this._speed;
    this.timeMs = SimClock.clamp(next);
    if (next !== this.timeMs) {
      this._playing = false;
      return next < MIN_MS ? 'min' : 'max';
    }
    return null;
  }

  private limitAhead(): TimeLimit | null {
    if (this._speed > 0 && this.timeMs >= MAX_MS) return 'max';
    if (this._speed < 0 && this.timeMs <= MIN_MS) return 'min';
    return null;
  }
}
