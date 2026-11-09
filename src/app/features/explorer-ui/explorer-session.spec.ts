import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import type { ExplorerView, SceneEngineEventName, SceneEngineEvents } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { GUIDED_VIEWS, localDay } from '../../data/tours';
import { CONTEXT_SPEED } from '../../state/speeds';
import { ExplorerMemory, ExplorerMoment } from '../../core/explorer-memory';
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
  lookAtSurface(latDeg: number, lonDeg: number, distanceRadii: number, extentDeg?: number) {
    this.calls.push(`lookAtSurface ${latDeg} ${lonDeg} ${distanceRadii} ${extentDeg}`);
  }
  setSurfaceMarkers(visible: boolean) {
    this.calls.push(`setSurfaceMarkers ${visible}`);
  }
  prefetchCloseUps(ids: readonly string[]) {
    this.calls.push(`prefetchCloseUps ${ids.join(' ')}`);
  }
  setObserver(observer: { latDeg: number; lonDeg: number }) {
    this.calls.push(`setObserver ${observer.latDeg.toFixed(3)} ${observer.lonDeg.toFixed(3)}`);
  }
  lookAtSky(azimuthDeg: number, altitudeDeg: number) {
    this.calls.push(`lookAtSky ${azimuthDeg.toFixed(1)} ${altitudeDeg.toFixed(1)}`);
  }
  setConstellationsVisible(visible: boolean) {
    this.calls.push(`setConstellationsVisible ${visible}`);
  }
  setVenusRadar(on: boolean) {
    this.calls.push(`setVenusRadar ${on}`);
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

/**
 * Monta la sesión. Con `sessionFirst`, como en `ExplorerUi`: la sesión se crea (con la vista por
 * defecto) y después se conecta la vista de la ruta, que llega con el primer `applyView`.
 */
async function setup(
  search: string,
  view: ExplorerView = 'system',
  sessionFirst = false,
  moment: ExplorerMoment | null = null,
) {
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
  // Lo que dejó el explorador al salir antes (una ficha y vuelta).
  if (moment) TestBed.inject(ExplorerMemory).save(moment);
  const router = TestBed.inject(Router);
  await router.navigateByUrl(`/${search}`);
  const explorer = TestBed.inject(ExplorerStore);
  const viewSignal = signal<ExplorerView>(view);
  if (!sessionFirst) explorer.connectView(viewSignal);
  const session = TestBed.inject(ExplorerSession);
  if (sessionFirst) explorer.connectView(viewSignal);
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

  it('sin fecha en la URL arranca en «ahora» a 3 días por segundo (D31, D33); con fecha, en pausa en ella', async () => {
    const live = await setup('');
    expect(live.sim.playing()).toBe(true);
    expect(live.sim.speed()).toBe(CONTEXT_SPEED.overview);
    expect(Math.abs(live.sim.time().getTime() - Date.now())).toBeLessThan(5000);
    TestBed.resetTestingModule();

    const fixed = await setup('?fecha=2030-01-01T00:00Z&cuerpo=titan');
    expect(fixed.sim.playing()).toBe(false);
    expect(fixed.sim.time().toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(fixed.sim.selectedBodyId()).toBe('titan');
    expect(fixed.explorer.panelOpen()).toBe(true);
    // Con un cuerpo en el enlace, su contexto: 1 hora por segundo (D33).
    expect(fixed.sim.speed()).toBe(CONTEXT_SPEED.body);
  });

  it('sin fecha, al conectar el motor (que nace en pausa) sigue reproduciendo a la velocidad del contexto', async () => {
    const { session, sim } = await setup('?cuerpo=marte');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    expect(engine.calls.slice(0, 2)).toEqual([`setSpeed ${CONTEXT_SPEED.body}`, 'setPlaying true']);
    expect(sim.playing()).toBe(true);
  });

  it('al volver de una ficha, sin fecha en la URL, sigue donde se dejó (crítica de la 9c); con fecha, manda la URL', async () => {
    // Al salir (la interfaz se destruye), guarda la fecha, si se reproducía y el sentido.
    const first = await setup('?fecha=2031-05-06T07:08Z');
    first.sim.setSpeed(-CONTEXT_SPEED.overview);
    first.sim.play();
    const memory = TestBed.inject(ExplorerMemory);
    TestBed.resetTestingModule();
    const saved = memory.take();
    expect(saved).toEqual({ timeMs: Date.UTC(2031, 4, 6, 7, 8), playing: true, reverse: true });

    // Al volver sin fecha: en ella, reproduciendo, hacia atrás y a la velocidad de su contexto (D33).
    const back = await setup('?cuerpo=marte', 'system', false, saved);
    expect(back.sim.time().toISOString()).toBe('2031-05-06T07:08:00.000Z');
    expect(back.sim.playing()).toBe(true);
    expect(back.sim.speed()).toBe(-CONTEXT_SPEED.body);
    // Una sola vez: lo guardado se ha usado.
    expect(TestBed.inject(ExplorerMemory).take()).toBeNull();
    TestBed.resetTestingModule();

    // Un enlace con su fecha manda (y lo guardado se descarta).
    const link = await setup('?fecha=2040-01-01T00:00Z', 'system', false, {
      timeMs: Date.UTC(2031, 4, 6),
      playing: true,
      reverse: false,
    });
    expect(link.sim.time().toISOString()).toBe('2040-01-01T00:00:00.000Z');
    expect(link.sim.playing()).toBe(false);
    expect(TestBed.inject(ExplorerMemory).take()).toBeNull();
  });

  it('el recorrido de la primera vez, sin los nombres del 3D; al acabar, vuelven (salvo en la vista limpia)', async () => {
    const { session } = await setup('');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    const labels = () => engine.calls.filter((call) => call.startsWith('setLabelsVisible')).at(-1);
    expect(labels()).toBe('setLabelsVisible true');
    session.setTouring(true);
    expect(labels()).toBe('setLabelsVisible false');
    session.setCleanView(true);
    session.setTouring(false);
    expect(labels()).toBe('setLabelsVisible false');
    session.setCleanView(false);
    expect(labels()).toBe('setLabelsVisible true');
  });

  it('con movimiento reducido arranca en pausa, a la misma velocidad (D31)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('reduce'),
        media: query,
      }) as MediaQueryList) as typeof window.matchMedia;
    try {
      const { sim, session } = await setup('');
      expect(session.reducedMotion).toBe(true);
      expect(sim.playing()).toBe(false);
      expect(sim.speed()).toBe(CONTEXT_SPEED.overview);
      expect(Math.abs(sim.time().getTime() - Date.now())).toBeLessThan(5000);
    } finally {
      window.matchMedia = original;
    }
  });

  it('en el móvil, elegir un cuerpo en el sistema solar no abre su ficha: la abre «ⓘ» (decisión del 08-11)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('63.99rem'),
        media: query,
      }) as MediaQueryList) as typeof window.matchMedia;
    try {
      const { session, sim, explorer } = await setup('?cuerpo=saturno');
      // El cuerpo de la URL, elegido y sin su ficha (como al tocarlo).
      expect(sim.selectedBodyId()).toBe('saturno');
      expect(explorer.panelOpen()).toBe(false);
      // Del planeta a una luna: tampoco.
      session.select('mimas');
      expect(sim.selectedBodyId()).toBe('mimas');
      expect(explorer.panelOpen()).toBe(false);
      session.openPanel();
      expect(explorer.panelOpen()).toBe(true);
      // La vista general la cierra; sin cuerpo, «ⓘ» no abre nada.
      session.overview();
      expect(explorer.panelOpen()).toBe(false);
      session.openPanel();
      expect(explorer.panelOpen()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
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
      `setSpeed ${CONTEXT_SPEED.overview}`,
      'setPlaying false',
      'setViewInsets 320',
      'setLabelsVisible true',
      // El lugar del cielo (el Montsec, por defecto) y las constelaciones (fase 8).
      'setObserver 42.025 0.737',
      'setConstellationsVisible true',
    ]);
    engine.emit('bodyPicked', { id: 'jupiter' });
    expect(sim.selectedBodyId()).toBe('jupiter');
    expect(engine.calls).toContain('focus jupiter');
    expect(explorer.panelOpen()).toBe(true);
    // Con el cuerpo, su velocidad (D33), en la misma frase.
    expect(session.announcement()).toMatch(
      /^Júpiter, planeta\. A .* del Sol y a .* de la Tierra\. Velocidad: 1 hora por segundo\.$/,
    );
    // La vista general también se dice (cierra la ficha y aleja la cámara).
    session.overview();
    expect(engine.calls).toContain('focus null');
    expect(explorer.panelOpen()).toBe(false);
    expect(session.announcement()).toBe(
      'Vista general del sistema solar. Velocidad: 3 días por segundo.',
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

  describe('la velocidad según el contexto (D33)', () => {
    it('vista general → cuerpo → vista general: 3 días, 1 hora y 3 días por segundo', async () => {
      const { session, sim } = await setup('');
      session.attachEngine(new FakeEngine());
      expect(sim.speed()).toBe(CONTEXT_SPEED.overview);
      session.select('marte');
      expect(sim.speed()).toBe(CONTEXT_SPEED.body);
      session.overview();
      expect(sim.speed()).toBe(CONTEXT_SPEED.overview);
      // Sin tocar la reproducción.
      expect(sim.playing()).toBe(true);
    });

    it('un cambio a mano se respeta en su contexto, también de un cuerpo a otro', async () => {
      const { session, sim } = await setup('');
      session.attachEngine(new FakeEngine());
      session.select('marte');
      sim.setSpeed(86_400);
      session.select('jupiter');
      expect(sim.speed()).toBe(86_400);
      expect(session.announcement()).not.toContain('Velocidad');
      // El siguiente cambio de contexto vuelve a poner la suya.
      session.overview();
      expect(sim.speed()).toBe(CONTEXT_SPEED.overview);
      sim.setSpeed(365.25 * 86_400);
      session.select('saturno');
      expect(sim.speed()).toBe(CONTEXT_SPEED.body);
    });

    it('conserva el sentido y no arranca la reproducción en pausa', async () => {
      const { session, sim } = await setup('?fecha=2030-01-01T00:00Z');
      session.attachEngine(new FakeEngine());
      expect(sim.playing()).toBe(false);
      sim.setReverse(true);
      session.select('venus');
      expect(sim.speed()).toBe(-CONTEXT_SPEED.body);
      expect(sim.playing()).toBe(false);
      expect(session.announcement()).toContain('Velocidad: 1 hora por segundo, hacia atrás.');
      session.overview();
      expect(sim.speed()).toBe(-CONTEXT_SPEED.overview);
    });

    it('las vistas Tierra y Luna cuentan como cuerpo; al volver a la general, 3 días por segundo', async () => {
      const { session, sim, viewSignal, settle } = await setup('');
      session.attachEngine(new FakeEngine());
      viewSignal.set('earth');
      await settle();
      expect(sim.speed()).toBe(CONTEXT_SPEED.body);
      expect(session.announcement()).toContain('Velocidad: 1 hora por segundo.');
      // De la Tierra a la Luna: el mismo contexto, la misma velocidad (aunque se cambie a mano).
      sim.setSpeed(7 * 86_400);
      viewSignal.set('moon');
      await settle();
      expect(sim.speed()).toBe(7 * 86_400);
      viewSignal.set('system');
      await settle();
      expect(sim.speed()).toBe(CONTEXT_SPEED.overview);
    });

    it('al entrar en la vista Tierra, ya a 1 hora por segundo y sin aviso', async () => {
      // Como en la aplicación: la sesión nace con la vista general y la de la ruta llega después.
      const { sim, session } = await setup('', 'earth', true);
      session.attachEngine(new FakeEngine());
      expect(sim.speed()).toBe(CONTEXT_SPEED.body);
      expect(session.announcement()).toBe('');
    });
  });

  it('una vista guiada pausa, lleva la hora del día del punto sin cambiar la fecha, mueve la cámara y la anuncia (fase 5)', async () => {
    const { session, sim, explorer } = await setup('', 'earth');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    sim.setTime(new Date('2026-06-21T09:30:00Z'));
    const espana = GUIDED_VIEWS.find((view) => view.id === 'espana');
    if (!espana) throw new Error('Falta la vista «España»');
    session.showGuidedView(espana);
    expect(sim.playing()).toBe(false);
    // Mediodía solar a 7° O: las 12:28 UTC del mismo día.
    expect(sim.time().toISOString()).toBe('2026-06-21T12:28:00.000Z');
    expect(engine.calls).toContain(
      `lookAtSurface ${espana.latDeg} ${espana.lonDeg} ${espana.distanceRadii} ${espana.extentDeg}`,
    );
    expect(engine.calls).toContain('setSurfaceMarkers true');
    expect(session.announcement()).toBe(`${espana.title}. ${espana.text}`);
    // Otra vista quita los marcadores.
    const night = GUIDED_VIEWS.find((view) => view.id === 'luces-nocturnas');
    if (!night) throw new Error('Falta la vista de las luces');
    session.showGuidedView(night);
    expect(engine.calls.at(-1)).toBe('setSurfaceMarkers false');
    // Medianoche solar a 10° E: a las 23:20 UTC, en el día que se ve (el local: en España, las
    // 23:20 UTC del 21 ya serían el 22, así que es la del 20, la 01:20 del 21).
    expect(sim.time().getUTCHours() * 60 + sim.time().getUTCMinutes()).toBe(23 * 60 + 20);
    expect(localDay(sim.time())).toBe(localDay(new Date('2026-06-21T09:30:00Z')));
    // Con UTC elegido, el día UTC.
    explorer.timeZone.set('utc');
    sim.setTime(new Date('2026-06-21T09:30:00Z'));
    session.showGuidedView(night);
    expect(sim.time().toISOString()).toBe('2026-06-21T23:20:00.000Z');
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

describe('ExplorerSession: el cielo desde España (fase 8)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('el lugar de la URL llega al motor; sin él, el Montsec', async () => {
    const teide = await setup('?fecha=2026-11-01T21:00Z&lugar=teide', 'sky');
    expect(teide.explorer.skyPlace().id).toBe('teide');
    expect(teide.session.engineOptions().observer).toEqual({
      latDeg: teide.explorer.skyPlace().latDeg,
      lonDeg: teide.explorer.skyPlace().lonDeg,
      altitudeM: 2390,
    });
    TestBed.resetTestingModule();
    const montsec = await setup('?fecha=2026-11-01T21:00Z', 'sky');
    expect(montsec.explorer.skyPlace().id).toBe('montsec');
    const engine = new FakeEngine();
    montsec.session.attachEngine(engine);
    // Al cambiar de lugar, el motor lo sabe y se anuncia.
    montsec.session.setSkyPlace('calar-alto');
    await montsec.settle();
    expect(engine.calls).toContain('setObserver 37.224 -2.546');
    expect(montsec.session.announcement()).toBe('El cielo desde el Observatorio de Calar Alto.');
  });

  it('la URL dice el lugar en el cielo (en pausa); el Montsec y «Mi ubicación», nunca', async () => {
    const { session, router, settle } = await setup('?fecha=2026-11-01T21:00Z', 'sky');
    session.setSkyPlace('roque-de-los-muchachos');
    await settle();
    expect(router.url).toContain('lugar=roque-de-los-muchachos');
    session.setSkyPlace('montsec');
    await settle();
    expect(router.url).not.toContain('lugar=');
  });

  it('«Usar mi ubicación»: solo tras pulsarlo; si se rechaza, sigue el lugar elegido', async () => {
    const { session, explorer, router, settle } = await setup('?fecha=2026-11-01T21:00Z', 'sky');
    const geolocation = {
      getCurrentPosition: vi.fn(
        (_ok: PositionCallback, fail: PositionErrorCallback | null | undefined) =>
          fail?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
      ),
    };
    // jsdom no tiene geolocalización: se pone una falsa (y se quita al final).
    Object.defineProperty(window.navigator, 'geolocation', {
      value: geolocation,
      configurable: true,
    });
    // Nada la pide al entrar.
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(await session.useMyLocation()).toBe('denied');
    expect(explorer.skyPlace().id).toBe('montsec');
    // Concedida: la ubicación del navegador, que no va a la URL.
    geolocation.getCurrentPosition.mockImplementation((ok: PositionCallback) =>
      ok({
        coords: { latitude: 41.39, longitude: 2.17, altitude: null },
      } as GeolocationPosition),
    );
    expect(await session.useMyLocation()).toBe('ok');
    await settle();
    expect(explorer.skyPlace()).toMatchObject({ id: 'user', latDeg: 41.39, lonDeg: 2.17 });
    expect(router.url).not.toContain('lugar=');
    expect(router.url).not.toContain('41.39');
    Reflect.deleteProperty(window.navigator, 'geolocation');
  });

  it('elegir un cuerpo en el cielo lo mira (o dice que está bajo el horizonte), sin salir', async () => {
    // El 1-11-2026 a las 21:00 UTC desde el Montsec: Saturno, culminando a 48° al sur; el Sol, bajo
    // el horizonte.
    const { session, sim, explorer, navigations } = await setup('?fecha=2026-11-01T21:00Z', 'sky');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    // El motor falso nace en otra fecha: la de la URL, como el real.
    engine.setTime(new Date('2026-11-01T21:00:00Z'));
    session.select('saturno');
    expect(sim.selectedBodyId()).toBe('saturno');
    expect(explorer.panelOpen()).toBe(true);
    expect(engine.calls).toContain('lookAtSky 161.1 47.6');
    expect(session.announcement()).toBe('Saturno, a 48° de altura, hacia el sur.');
    engine.calls.length = 0;
    session.select('sol');
    expect(engine.calls.some((call) => call.startsWith('lookAtSky'))).toBe(false);
    expect(session.announcement()).toBe('El Sol está bajo el horizonte.');
    // «Vista general»: la mirada de partida, al sur.
    session.overview();
    expect(engine.calls.at(-1)).toBe('lookAtSky 180.0 25.0');
    expect(explorer.panelOpen()).toBe(false);
    expect(session.announcement()).toBe(
      'El cielo desde el Parque Astronómico del Montsec, mirando al sur.',
    );
    expect(navigations).toEqual([]);
  });

  it('en el cielo, tiempo real (propuesta de la fase 8 a D33)', async () => {
    const { session, sim, viewSignal, settle } = await setup('?fecha=2026-11-01T21:00Z');
    viewSignal.set('sky');
    await settle();
    expect(sim.speed()).toBe(CONTEXT_SPEED.sky);
    expect(session.announcement()).toBe(
      'El cielo desde el Parque Astronómico del Montsec. Velocidad: Tiempo real.',
    );
  });
});

describe('ExplorerSession: «Ver en 3D» de un eclipse de Sol (fase 8)', () => {
  it('con ?sombra=1, al estar lista la Tierra, la cámara va a la sombra de la Luna (una vez)', async () => {
    const { session } = await setup('?fecha=2026-08-12T17:45:51Z&sombra=1', 'earth');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    // El motor falso nace en otra fecha: la de la URL, como el real.
    engine.setTime(new Date('2026-08-12T17:45:51Z'));
    engine.emit('ready', { startupMs: 10 });
    const aim = engine.calls.filter((call) => call.startsWith('lookAtSurface'));
    expect(aim).toHaveLength(1);
    // El máximo del 12-08-2026: la sombra, al oeste de Islandia (NASA: 65,2° N, 25,2° O).
    const [, lat, lon] = (aim[0] ?? '').split(' ').map(Number);
    expect(Math.abs((lat ?? 0) - 65.2)).toBeLessThan(0.2);
    expect(Math.abs((lon ?? 0) + 25.2)).toBeLessThan(0.2);
    engine.emit('ready', { startupMs: 10 });
    expect(engine.calls.filter((call) => call.startsWith('lookAtSurface'))).toHaveLength(1);
  });

  it('sin ?sombra=1, o en otra vista, la cámara no se toca', async () => {
    const { session } = await setup('?fecha=2026-08-12T17:45:51Z', 'earth');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    engine.emit('ready', { startupMs: 10 });
    expect(engine.calls.some((call) => call.startsWith('lookAtSurface'))).toBe(false);
  });
});

describe('ExplorerSession: Venus «Bajo las nubes» (fase 9b, D44)', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('la orden llega al motor; el estado es el que dice el motor y lo que se ve en el lienzo se anuncia', async () => {
    const { session } = await setup('?fecha=2026-06-01T00:00Z&cuerpo=venus');
    const engine = new FakeEngine();
    session.attachEngine(engine);
    expect(session.radar()).toBe('off');
    session.setVenusRadar(true);
    expect(engine.calls.at(-1)).toBe('setVenusRadar true');
    engine.emit('venusRadar', { state: 'loading' });
    expect(session.radar()).toBe('loading');
    engine.emit('venusRadar', { state: 'on' });
    expect(session.radar()).toBe('on');
    expect(session.announcement()).toBe(
      'Venus bajo las nubes: imagen de radar de la sonda Magellan.',
    );
    session.setVenusRadar(false);
    expect(engine.calls.at(-1)).toBe('setVenusRadar false');
    engine.emit('venusRadar', { state: 'off' });
    expect(session.radar()).toBe('off');
    // Si no llega la textura, se dice.
    engine.emit('venusRadar', { state: 'error' });
    expect(session.announcement()).toMatch(/No se ha podido cargar el radar de Venus/);
    // Sin motor (al desconectarlo), vuelve a «off».
    engine.emit('venusRadar', { state: 'on' });
    session.detachEngine();
    expect(session.radar()).toBe('off');
  });
});
