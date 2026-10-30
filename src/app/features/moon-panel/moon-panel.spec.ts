import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MOON_TOUR, MOON_VIEWS } from '../../data/tours';
import { moonPhase } from '../../ephemeris/ephemeris';
import { moonSunElevationDeg } from '../../ephemeris/moon-light';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { MOON_TOUR_STEP_MS, MoonPanel } from './moon-panel';

function render(reducedMotion = false) {
  window.history.replaceState({}, '', '/explorar/luna?fecha=2026-11-20T00:00Z');
  TestBed.configureTestingModule({
    imports: [MoonPanel],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('moon'));
  const session = TestBed.inject(ExplorerSession);
  // El movimiento reducido lo lee la sesión al crearse; aquí se fuerza.
  (session as unknown as { reducedMotion: boolean }).reducedMotion = reducedMotion;
  const sim = TestBed.inject(SimulationStore);
  sim.setTime(new Date('2026-11-20T00:00:00Z'));
  const fixture = TestBed.createComponent(MoonPanel);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) ?? null;
  const labelled = (label: string) =>
    root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  return { fixture, root, sim, session, button, labelled };
}

describe('MoonPanel: vistas y recorrido de la Luna (fase 6)', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('dice la fase de la fecha que se ve, con la misma función que la ficha', () => {
    const { root, sim } = render();
    const phase = moonPhase(sim.time());
    expect(root.querySelector('.moon__phase')?.textContent?.trim()).toBe(
      `${phase.name} · ${Math.round(phase.illuminatedFraction * 100)} % iluminada`,
    );
  });

  it('cada vista lleva la fecha a su luz: la cara visible a la luna llena y la oculta a la nueva', () => {
    const { fixture, root, sim, session, button } = render();
    const shown: string[] = [];
    vi.spyOn(session, 'showMoonStop').mockImplementation((stop) => {
      shown.push(stop.id);
      session.constructor.prototype.showMoonStop.call(session, stop);
    });
    button('Cara visible')?.click();
    fixture.detectChanges();
    expect(moonPhase(sim.time()).name).toBe('Luna llena');
    expect(sim.playing()).toBe(false);
    expect(button('Cara visible')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.moon__caption')?.textContent?.trim()).toBe(MOON_VIEWS[0]?.text);
    button('Cara oculta')?.click();
    fixture.detectChanges();
    expect(moonPhase(sim.time()).name).toBe('Luna nueva');
    // La luz rasante: el Sol, a 4° sobre su lugar.
    button('Luz rasante')?.click();
    const grazing = MOON_VIEWS.find((view) => view.id === 'luz-rasante');
    expect(moonSunElevationDeg(grazing?.latDeg ?? 0, grazing?.lonDeg ?? 0, sim.time())).toBeCloseTo(
      4,
      1,
    );
    expect(shown).toEqual(['cara-visible', 'cara-oculta', 'luz-rasante']);
  });

  it('el recorrido pasa solo por las cinco paradas y se para al final; «Parada siguiente» salta', () => {
    vi.useFakeTimers();
    const { fixture, root, session, button, labelled } = render();
    const shown: string[] = [];
    vi.spyOn(session, 'showMoonStop').mockImplementation((stop) => shown.push(stop.id));
    button('Recorrer la Luna')?.click();
    fixture.detectChanges();
    expect(root.querySelector('.moon__caption')?.textContent).toContain(`1 de ${MOON_TOUR.length}`);
    expect(labelled('Parada anterior')?.getAttribute('aria-disabled')).toBe('true');
    expect(button('Pausar el recorrido')).not.toBeNull();
    vi.advanceTimersByTime(MOON_TOUR_STEP_MS);
    fixture.detectChanges();
    expect(shown).toEqual(MOON_TOUR.slice(0, 2).map((stop) => stop.id));
    // «Parada siguiente» salta a la tercera y para el recorrido.
    labelled('Parada siguiente')?.click();
    fixture.detectChanges();
    expect(shown.at(-1)).toBe(MOON_TOUR[2]?.id);
    expect(button('Recorrer la Luna')).not.toBeNull();
    // Otra vez en marcha, llega a la última y se para.
    button('Recorrer la Luna')?.click();
    vi.advanceTimersByTime(MOON_TOUR_STEP_MS * MOON_TOUR.length);
    fixture.detectChanges();
    expect(shown.at(-1)).toBe(MOON_TOUR.at(-1)?.id);
    expect(labelled('Parada siguiente')?.getAttribute('aria-disabled')).toBe('true');
    expect(button('Recorrer la Luna')).not.toBeNull();
  });

  it('con movimiento reducido, el recorrido va paso a paso: no avanza solo', () => {
    vi.useFakeTimers();
    const { fixture, root, session, button } = render(true);
    const shown: string[] = [];
    vi.spyOn(session, 'showMoonStop').mockImplementation((stop) => shown.push(stop.id));
    expect(root.querySelector('.moon__hint')?.textContent).toContain('paso a paso');
    button('Recorrer la Luna')?.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(MOON_TOUR_STEP_MS * 3);
    expect(shown).toEqual([MOON_TOUR[0]?.id]);
    button('Siguiente parada')?.click();
    expect(shown).toEqual(MOON_TOUR.slice(0, 2).map((stop) => stop.id));
  });

  it('los textos llevan sus fuentes y están por revisar (Iván, fase 9)', () => {
    for (const stop of [...MOON_VIEWS, ...MOON_TOUR]) {
      expect(stop.sources.length, stop.id).toBeGreaterThan(0);
      for (const source of stop.sources) expect(source, stop.id).toMatch(/^https:\/\//);
      expect(stop.reviewed).toBe(false);
      expect(Math.abs(stop.latDeg)).toBeLessThanOrEqual(90);
      expect(Math.abs(stop.lonDeg)).toBeLessThanOrEqual(180);
    }
  });
});
