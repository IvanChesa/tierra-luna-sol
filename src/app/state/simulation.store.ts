import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { MAX_DATE, MIN_DATE } from '../ephemeris/constants';
import type { BodyId, QualitySetting, ScaleMode, SceneEngineApi } from '../scene';
import { SPEED_STEPS, shiftSpeed } from './speeds';

/** Lo que el store necesita del motor: un subconjunto de `SceneEngineApi` (en los tests, un doble). */
export type SimulationEngine = Pick<
  SceneEngineApi,
  'setTime' | 'setPlaying' | 'setSpeed' | 'focus' | 'setScaleFrame' | 'setQuality' | 'on'
>;

export type TimeLimit = 'min' | 'max';

const MIN_MS = MIN_DATE.getTime();
const MAX_MS = MAX_DATE.getTime();
/** Sin motor (sin WebGL), el store avanza el tiempo él mismo a este ritmo (≤ 5 veces/s, §4.5). */
export const FALLBACK_TICK_MS = 250;

const clampMs = (ms: number): number => Math.min(Math.max(ms, MIN_MS), MAX_MS);

/**
 * Estado de la simulación (PLAN §4.5): tiempo, reproducción, velocidad, cuerpo elegido, escala y
 * calidad. Las órdenes de la interfaz pasan por aquí y llegan al motor; el motor devuelve el estado
 * con sus eventos, como mucho 5 veces por segundo durante la reproducción. Sin motor, las listas, la
 * ficha y las distancias siguen funcionando y el tiempo avanza con un reloj propio.
 *
 * Vive lo que vive el explorador: lo provee su interfaz diferida (`ExplorerUi`), así que no entra en
 * el bundle inicial y al volver al explorador se empieza de nuevo desde la URL.
 */
@Service({ autoProvided: false })
export class SimulationStore {
  private readonly _time = signal(new Date(MIN_MS));
  private readonly _playing = signal(false);
  private readonly _speed = signal(1);
  private readonly _selected = signal<BodyId | null>(null);
  private readonly _scale = signal<ScaleMode>('illustrative');
  private readonly _quality = signal<QualitySetting>('auto');
  private readonly _limit = signal<TimeLimit | null>(null);

  readonly time = this._time.asReadonly();
  readonly playing = this._playing.asReadonly();
  readonly speed = this._speed.asReadonly();
  readonly selectedBodyId = this._selected.asReadonly();
  readonly scaleFrame = this._scale.asReadonly();
  readonly quality = this._quality.asReadonly();
  /** Último límite alcanzado (1900 o 2100), para avisar; se borra al cambiar de tiempo. */
  readonly limit = this._limit.asReadonly();
  readonly reverse = computed(() => this._speed() < 0);
  readonly speedStep = computed(
    () => SPEED_STEPS.find((step) => step.seconds === Math.abs(this._speed())) ?? null,
  );

  private engine: SimulationEngine | null = null;
  private detachEngine: (() => void) | null = null;
  private fallback: ReturnType<typeof setInterval> | null = null;
  private fallbackLastMs = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.detach();
      this.stopFallback();
    });
  }

  // --- Arranque ------------------------------------------------------------------------------

  /** Estado inicial (de la URL o por defecto). No toca el motor: el motor nace con él. */
  init(state: {
    time: Date;
    playing: boolean;
    speed?: number;
    selected?: BodyId | null;
    scale?: ScaleMode;
    quality?: QualitySetting;
  }): void {
    this._time.set(new Date(clampMs(state.time.getTime())));
    this._speed.set(state.speed ?? 1);
    this._selected.set(state.selected ?? null);
    this._scale.set(state.scale ?? 'illustrative');
    this._quality.set(state.quality ?? 'auto');
    this._limit.set(null);
    this.setPlayingState(state.playing);
  }

  /**
   * Conecta el motor: a partir de aquí, el tiempo lo lleva él y el store solo refleja sus eventos.
   * Devuelve la función para desconectarlo.
   */
  attach(engine: SimulationEngine): () => void {
    this.detach();
    this.engine = engine;
    this.stopFallback();
    const offs = [
      engine.on('timeChanged', ({ time, playing, speed }) => {
        this._time.set(time);
        this._playing.set(playing);
        this._speed.set(speed);
      }),
      engine.on('limitReached', ({ limit }) => this._limit.set(limit)),
    ];
    this.detachEngine = () => offs.forEach((off) => off());
    return () => {
      if (this.engine === engine) this.detach();
    };
  }

  // --- Órdenes -------------------------------------------------------------------------------

  setTime(time: Date): void {
    const ms = time.getTime();
    if (Number.isNaN(ms)) return;
    const clamped = new Date(clampMs(ms));
    this._limit.set(null);
    this._time.set(clamped);
    this.engine?.setTime(clamped);
  }

  play(): void {
    this.setPlaying(true);
  }

  pause(): void {
    this.setPlaying(false);
  }

  togglePlaying(): void {
    this.setPlaying(!this._playing());
  }

  setPlaying(playing: boolean): void {
    if (playing) this._limit.set(null);
    if (this.engine) {
      this.engine.setPlaying(playing);
      return;
    }
    if (playing && this.limitAhead()) {
      this._limit.set(this.limitAhead());
      return;
    }
    this.setPlayingState(playing);
  }

  /** Velocidad en segundos simulados por segundo real; el signo es el sentido. */
  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed === 0) return;
    this._speed.set(speed);
    this.engine?.setSpeed(speed);
  }

  /** Cambia de escalón (`steps` = ±1) sin cambiar el sentido. */
  shiftSpeed(steps: number): void {
    this.setSpeed(shiftSpeed(this._speed(), steps));
  }

  setReverse(reverse: boolean): void {
    const magnitude = Math.abs(this._speed());
    this.setSpeed(reverse ? -magnitude : magnitude);
  }

  toggleReverse(): void {
    this.setReverse(!this.reverse());
  }

  /** «Ahora»: el instante actual, en tiempo real y reproduciendo. */
  now(now = new Date()): void {
    this.setSpeed(1);
    this.setTime(now);
    this.setPlaying(true);
  }

  select(id: BodyId | null): void {
    this._selected.set(id);
    this.engine?.focus(id);
  }

  setScale(mode: ScaleMode): void {
    this._scale.set(mode);
    this.engine?.setScaleFrame(mode);
  }

  setQuality(setting: QualitySetting): void {
    this._quality.set(setting);
    this.engine?.setQuality(setting);
  }

  /** Cierra el aviso del límite de 1900–2100. */
  dismissLimit(): void {
    this._limit.set(null);
  }

  /** El motor ha elegido un cuerpo (clic en el lienzo): solo se refleja, el motor ya lo sabe. */
  reflectSelection(id: BodyId | null): void {
    this._selected.set(id);
  }

  // --- Reloj propio (sin motor) ---------------------------------------------------------------

  private setPlayingState(playing: boolean): void {
    this._playing.set(playing);
    if (this.engine) return;
    if (playing) this.startFallback();
    else this.stopFallback();
  }

  private startFallback(): void {
    if (this.fallback !== null || typeof setInterval === 'undefined') return;
    this.fallbackLastMs = Date.now();
    this.fallback = setInterval(() => this.fallbackTick(), FALLBACK_TICK_MS);
  }

  private stopFallback(): void {
    if (this.fallback !== null) clearInterval(this.fallback);
    this.fallback = null;
  }

  private fallbackTick(): void {
    const now = Date.now();
    const dt = now - this.fallbackLastMs;
    this.fallbackLastMs = now;
    const next = this._time().getTime() + dt * this._speed();
    const clamped = clampMs(next);
    this._time.set(new Date(clamped));
    if (clamped !== next) {
      this._limit.set(next < MIN_MS ? 'min' : 'max');
      this.setPlayingState(false);
    }
  }

  private limitAhead(): TimeLimit | null {
    const ms = this._time().getTime();
    if (this._speed() > 0 && ms >= MAX_MS) return 'max';
    if (this._speed() < 0 && ms <= MIN_MS) return 'min';
    return null;
  }

  private detach(): void {
    this.detachEngine?.();
    this.detachEngine = null;
    this.engine = null;
    if (this._playing()) this.startFallback();
  }
}
