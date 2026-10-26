import { TestBed } from '@angular/core/testing';
import { MAX_DATE } from '../ephemeris/constants';
import type { SceneEngineEventName, SceneEngineEvents } from '../scene';
import { FALLBACK_TICK_MS, SimulationEngine, SimulationStore } from './simulation.store';

/** Motor falso: apunta las órdenes y deja emitir eventos a mano. */
class FakeEngine implements SimulationEngine {
  readonly calls: string[] = [];
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();
  setTime(time: Date) {
    this.calls.push(`setTime ${time.toISOString()}`);
  }
  setPlaying(playing: boolean) {
    this.calls.push(`setPlaying ${playing}`);
  }
  setSpeed(speed: number) {
    this.calls.push(`setSpeed ${speed}`);
  }
  focus(id: string | null) {
    this.calls.push(`focus ${id}`);
  }
  setScaleFrame(mode: string) {
    this.calls.push(`setScaleFrame ${mode}`);
  }
  setQuality(setting: string) {
    this.calls.push(`setQuality ${setting}`);
  }
  on<K extends SceneEngineEventName>(type: K, listener: (event: SceneEngineEvents[K]) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as (event: unknown) => void);
    this.listeners.set(type, set);
    return () => set.delete(listener as (event: unknown) => void);
  }
  emit<K extends SceneEngineEventName>(type: K, event: SceneEngineEvents[K]) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
  get listening(): number {
    return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

const START = new Date('2026-10-24T00:00:00Z');

describe('SimulationStore', () => {
  let store: SimulationStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SimulationStore] });
    store = TestBed.inject(SimulationStore);
    store.init({ time: START, playing: false });
  });

  afterEach(() => vi.useRealTimers());

  it('las órdenes cambian el estado y llegan al motor conectado', () => {
    const engine = new FakeEngine();
    store.attach(engine);
    store.setTime(new Date('2030-01-01T00:00:00Z'));
    store.setSpeed(86_400);
    store.toggleReverse();
    store.select('saturno');
    store.setScale('real');
    store.setQuality('low');
    store.play();
    expect(store.time().toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(store.speed()).toBe(-86_400);
    expect(store.reverse()).toBe(true);
    expect(store.speedStep()?.id).toBe('day');
    expect(store.selectedBodyId()).toBe('saturno');
    expect(engine.calls).toEqual([
      'setTime 2030-01-01T00:00:00.000Z',
      'setSpeed 86400',
      'setSpeed -86400',
      'focus saturno',
      'setScaleFrame real',
      'setQuality low',
      'setPlaying true',
    ]);
  });

  it('refleja el tiempo que manda el motor, sin devolvérselo (no hay bucles)', () => {
    const engine = new FakeEngine();
    store.attach(engine);
    const time = new Date('2026-10-25T12:00:00Z');
    engine.emit('timeChanged', { time, playing: true, speed: 3600 });
    expect(store.time()).toEqual(time);
    expect(store.playing()).toBe(true);
    expect(store.speed()).toBe(3600);
    expect(engine.calls).toEqual([]);
    engine.emit('limitReached', { limit: 'max' });
    expect(store.limit()).toBe('max');
  });

  it('las fechas se llevan al rango 1900–2100 y una fecha inválida no hace nada', () => {
    store.setTime(new Date('2300-01-01T00:00:00Z'));
    expect(store.time()).toEqual(MAX_DATE);
    store.setTime(new Date(Number.NaN));
    expect(store.time()).toEqual(MAX_DATE);
  });

  it('«Ahora»: el instante actual, en tiempo real y reproduciendo', () => {
    store.setSpeed(-31_557_600);
    const now = new Date('2026-10-24T18:00:00Z');
    store.now(now);
    expect(store.time()).toEqual(now);
    expect(store.speed()).toBe(1);
    expect(store.playing()).toBe(true);
    store.pause();
  });

  it('desconectar el motor deja de escucharlo', () => {
    const engine = new FakeEngine();
    const detach = store.attach(engine);
    // `timeChanged` y `limitReached`.
    expect(engine.listening).toBe(2);
    detach();
    expect(engine.listening).toBe(0);
    engine.emit('timeChanged', {
      time: new Date('2001-01-01T00:00:00Z'),
      playing: false,
      speed: 1,
    });
    expect(store.time()).toEqual(START);
  });

  it('sin motor (sin WebGL) el tiempo avanza con su propio reloj, como mucho 4 veces por segundo', () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-24T10:00:00Z') });
    store.setSpeed(3600); // 1 hora/s
    store.play();
    const before = store.time().getTime();
    // Se mira cada 10 ms durante 2 s cuántas veces cambia el tiempo del store.
    let changes = 0;
    let last = before;
    for (let t = 0; t < 2000; t += 10) {
      vi.advanceTimersByTime(10);
      if (store.time().getTime() !== last) changes++;
      last = store.time().getTime();
    }
    const advancedHours = (store.time().getTime() - before) / 3_600_000;
    expect(advancedHours).toBeCloseTo(2, 6); // 2 s reales a 1 h/s
    expect(changes).toBe(2000 / FALLBACK_TICK_MS);
    expect(changes / 2).toBeLessThanOrEqual(5); // ≤ 5 actualizaciones por segundo (§4.5)
    store.pause();
    const paused = store.time().getTime();
    vi.advanceTimersByTime(2000);
    expect(store.time().getTime()).toBe(paused);
  });

  it('sin motor, al llegar a 2100 se para y avisa', () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-24T10:00:00Z') });
    store.setTime(new Date(MAX_DATE.getTime() - 3_600_000));
    store.setSpeed(86_400);
    store.play();
    vi.advanceTimersByTime(1000);
    expect(store.time()).toEqual(MAX_DATE);
    expect(store.playing()).toBe(false);
    expect(store.limit()).toBe('max');
    // Ya en el límite y hacia delante, no vuelve a arrancar.
    store.play();
    expect(store.playing()).toBe(false);
  });
});
