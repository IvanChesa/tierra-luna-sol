import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import type { ExplorerView, SceneEngineEventName, SceneEngineEvents } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerEngine, ExplorerSession } from './explorer-session';

/**
 * Motor falso: apunta las órdenes y deja emitir eventos a mano. Como el real, nace en pausa y
 * responde a cada orden de tiempo con `timeChanged` y su propio estado.
 */
class FakeEngine implements ExplorerEngine {
  readonly calls: string[] = [];
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();
  private state = { time: new Date('2030-01-01T00:00:00Z'), playing: false, speed: 1 };
  setTime(time: Date) {
    this.calls.push(`setTime ${time.toISOString()}`);
    this.state = { ...this.state, time };
    this.emit('timeChanged', this.state);
  }
  setPlaying(playing: boolean) {
    this.calls.push(`setPlaying ${playing}`);
    this.state = { ...this.state, playing };
    this.emit('timeChanged', this.state);
  }
  setSpeed(speed: number) {
    this.calls.push(`setSpeed ${speed}`);
    this.state = { ...this.state, speed };
    this.emit('timeChanged', this.state);
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
  setView(view: string) {
    this.calls.push(`setView ${view}`);
  }
  setViewInsets(insets: { left: number }) {
    this.calls.push(`setViewInsets ${insets.left}`);
  }
  orbitBy(dAz: number, dEl: number) {
    this.calls.push(`orbitBy ${dAz} ${dEl}`);
  }
  zoomBy(factor: number) {
    this.calls.push(`zoomBy ${factor}`);
  }
  skipTransition() {
    this.calls.push('skipTransition');
  }
  setLabelsVisible(visible: boolean) {
    this.calls.push(`setLabelsVisible ${visible}`);
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
}

async function setup(search: string, view: ExplorerView = 'system') {
  window.history.replaceState({}, '', `/${search}`);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(`/${search}`);
  const explorer = TestBed.inject(ExplorerStore);
  const viewSignal = signal<ExplorerView>(view);
  explorer.connectView(viewSignal);
  const session = TestBed.inject(ExplorerSession);
  const sim = TestBed.inject(SimulationStore);
  const navigations: string[] = [];
  router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) navigations.push(event.urlAfterRedirects);
  });
  const settle = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  };
  await settle();
  return { session, sim, explorer, viewSignal, router, navigations, settle };
}

describe('ExplorerSession: la URL, la selección y el motor', () => {
  afterEach(() => {
    TestBed.inject(SimulationStore).pause();
    window.history.replaceState({}, '', '/');
  });

  it('sin fecha en la URL arranca en «ahora» y en tiempo real; con fecha, en pausa en ella', async () => {
    const live = await setup('');
    expect(live.sim.playing()).toBe(true);
    expect(live.sim.speed()).toBe(1);
    expect(Math.abs(live.sim.time().getTime() - Date.now())).toBeLessThan(5000);
    TestBed.resetTestingModule();

    const fixed = await setup('?fecha=2030-01-01T00:00Z&cuerpo=titan');
    expect(fixed.sim.playing()).toBe(false);
    expect(fixed.sim.time().toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(fixed.sim.selectedBodyId()).toBe('titan');
    expect(fixed.explorer.panelOpen()).toBe(true);
  });

  it('sin fecha, al conectar el motor (que nace en pausa) sigue en tiempo real', async () => {
    const { session, sim } = await setup('?cuerpo=marte');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    expect(engine.calls.slice(0, 2)).toEqual(['setSpeed 1', 'setPlaying true']);
    expect(sim.playing()).toBe(true);
  });

  it('un parámetro no válido se ignora y se avisa; el aviso se puede cerrar', async () => {
    const { session, sim } = await setup('?fecha=hola&escala=gigante');
    expect(session.warnings()).toHaveLength(2);
    expect(sim.scaleFrame()).toBe('illustrative');
    session.dismissWarnings();
    expect(session.warnings()).toHaveLength(0);
  });

  it('al conectar el motor le pasa el estado y escucha sus elecciones y sus viajes', async () => {
    const { session, sim, explorer } = await setup('?fecha=2030-01-01T00:00Z');
    const engine = new FakeEngine();
    session.setInsets({ top: 0, right: 0, bottom: 72, left: 320 });
    session.attachEngine(engine);
    expect(engine.calls).toEqual([
      'setSpeed 1',
      'setPlaying false',
      'setViewInsets 320',
      'setLabelsVisible true',
    ]);
    engine.emit('bodyPicked', { id: 'jupiter' });
    expect(sim.selectedBodyId()).toBe('jupiter');
    expect(engine.calls).toContain('focus jupiter');
    expect(explorer.panelOpen()).toBe(true);
    expect(session.announcement()).toMatch(
      /^Júpiter, planeta\. A .* del Sol y a .* de la Tierra\.$/,
    );
    engine.emit('travel', { active: true, kind: 'view' });
    expect(explorer.travelling()).toBe('view');
    session.detachEngine(engine);
    expect(explorer.travelling()).toBeNull();
  });

  it('en la vista de la Tierra, elegir otro cuerpo lleva al sistema solar y lo enfoca al llegar', async () => {
    const { session, sim, explorer, viewSignal, router, settle } = await setup('', 'earth');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    expect(sim.selectedBodyId()).toBe('tierra');
    // El cuerpo de la vista abre su ficha sin moverse de vista.
    session.select('tierra');
    expect(explorer.panelOpen()).toBe(true);
    // La Luna tiene vista propia; Saturno, no: va al sistema solar.
    const navigate = vi.spyOn(router, 'navigate');
    session.select('luna');
    expect(navigate).toHaveBeenLastCalledWith(['/explorar/luna'], {
      queryParamsHandling: 'preserve',
    });
    session.select('saturno');
    expect(navigate).toHaveBeenLastCalledWith(['/'], { queryParamsHandling: 'preserve' });
    viewSignal.set('system');
    await settle();
    expect(engine.calls.slice(-2)).toEqual(['setView system', 'focus saturno']);
    expect(sim.selectedBodyId()).toBe('saturno');
    expect(explorer.panelOpen()).toBe(true);
  });

  it('la URL: en pausa lleva la fecha y el cuerpo; al reproducir quita la fecha y no cambia mientras corre', async () => {
    const { session, sim, router, navigations, settle } = await setup('?fecha=2030-01-01T00:00Z');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    session.select('marte');
    await settle();
    expect(router.url).toContain('fecha=2030-01-01T00:00Z');
    expect(router.url).toContain('cuerpo=marte');
    sim.play();
    engine.emit('timeChanged', { time: new Date('2030-01-01T00:00:01Z'), playing: true, speed: 1 });
    await settle();
    expect(router.url).not.toContain('fecha=');
    const before = navigations.length;
    for (let k = 2; k < 12; k++) {
      engine.emit('timeChanged', {
        time: new Date(`2030-01-01T00:00:${String(k).padStart(2, '0')}Z`),
        playing: true,
        speed: 1,
      });
      await settle();
    }
    expect(navigations.length).toBe(before);
    // Al pausar, la fecha vuelve a la URL (con el instante en que se ha parado).
    engine.emit('timeChanged', {
      time: new Date('2030-01-01T00:00:30Z'),
      playing: false,
      speed: 1,
    });
    await settle();
    expect(router.url).toContain('fecha=2030-01-01T00:00:30Z');
  });

  it('un anuncio repetido vuelve a sonar (la región viva no ignora el mismo texto)', async () => {
    const { session } = await setup('?fecha=2030-01-01T00:00Z');
    session.announce('Vista de la Tierra.');
    const first = session.announcement();
    session.announce('Vista de la Tierra.');
    expect(session.announcement()).not.toBe(first);
    expect(session.announcement().trim()).toBe('Vista de la Tierra.');
  });
});
