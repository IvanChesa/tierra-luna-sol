import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GUIDED_VIEWS } from '../../data/tours';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { EarthPanel, TOUR_STEP_MS, atMinuteOfDay, clockText, minutesOfDay } from './earth-panel';

function render() {
  window.history.replaceState({}, '', '/explorar/tierra?fecha=2026-06-21T07:30Z');
  TestBed.configureTestingModule({
    imports: [EarthPanel],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('earth'));
  const session = TestBed.inject(ExplorerSession);
  const sim = TestBed.inject(SimulationStore);
  const fixture = TestBed.createComponent(EarthPanel);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) ?? null;
  return { fixture, root, sim, session, button };
}

describe('EarthPanel: la luz del Sol (fase 5)', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('cambia la hora del día y conserva la fecha (en la hora local)', () => {
    const date = new Date(2026, 5, 21, 9, 30);
    const evening = atMinuteOfDay(date, 21 * 60 + 15);
    expect(evening.getFullYear()).toBe(2026);
    expect(evening.getMonth()).toBe(5);
    expect(evening.getDate()).toBe(21);
    expect(minutesOfDay(evening)).toBe(21 * 60 + 15);
    expect(atMinuteOfDay(date, 0).getDate()).toBe(21);
    expect(clockText(21 * 60 + 5)).toBe('21:05');
    expect(clockText(0)).toBe('00:00');
  });

  it('el deslizador lleva la simulación a esa hora del mismo día, con su texto accesible', () => {
    const { fixture, root, sim } = render();
    sim.setTime(new Date(2026, 5, 21, 9, 30));
    fixture.detectChanges();
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
    expect(slider?.labels?.[0]?.textContent).toContain('Hora del día');
    expect(slider?.getAttribute('aria-valuetext')).toBe('09:30, hora local');
    if (!slider) throw new Error('Sin deslizador');
    slider.value = String(18 * 60);
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const time = sim.time();
    expect(time.getDate()).toBe(21);
    expect(minutesOfDay(time)).toBe(18 * 60);
    expect(slider.getAttribute('aria-valuetext')).toBe('18:00, hora local');
  });
});

describe('EarthPanel: las vistas guiadas (fase 5)', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('las cinco vistas de Iván; elegir una la marca, pausa y deja su subtítulo', () => {
    const { fixture, root, sim, button } = render();
    const titles = [...root.querySelectorAll('.earth__views button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(titles).toEqual(GUIDED_VIEWS.map((view) => view.title));
    expect(titles).toEqual([
      'La Tierra completa',
      'El Pacífico',
      'El Himalaya',
      'Las luces de la noche',
      'España',
    ]);
    button('España')?.click();
    fixture.detectChanges();
    expect(button('España')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('El Pacífico')?.getAttribute('aria-pressed')).toBe('false');
    expect(sim.playing()).toBe(false);
    expect(root.querySelector('.earth__caption')?.textContent).toContain('Roque de los Muchachos');
    // Anterior y siguiente, sin dar la vuelta.
    root.querySelector<HTMLButtonElement>('button[aria-label="Vista siguiente"]')?.click();
    fixture.detectChanges();
    expect(button('España')?.getAttribute('aria-pressed')).toBe('true');
    root.querySelector<HTMLButtonElement>('button[aria-label="Vista anterior"]')?.click();
    fixture.detectChanges();
    expect(button('Las luces de la noche')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('«Recorrer las vistas» las pasa cada 9 s y se para al final', () => {
    vi.useFakeTimers();
    const { fixture, button, root } = render();
    button('Recorrer las vistas')?.click();
    fixture.detectChanges();
    const pressed = () =>
      [...root.querySelectorAll('.earth__views button')].findIndex(
        (b) => b.getAttribute('aria-pressed') === 'true',
      );
    expect(pressed()).toBe(0);
    expect(button('Pausar el recorrido')).not.toBeNull();
    for (let k = 1; k < GUIDED_VIEWS.length; k++) {
      vi.advanceTimersByTime(TOUR_STEP_MS);
      fixture.detectChanges();
      expect(pressed()).toBe(k);
    }
    vi.advanceTimersByTime(TOUR_STEP_MS);
    fixture.detectChanges();
    expect(button('Recorrer las vistas')).not.toBeNull();
    expect(pressed()).toBe(GUIDED_VIEWS.length - 1);
  });
});
