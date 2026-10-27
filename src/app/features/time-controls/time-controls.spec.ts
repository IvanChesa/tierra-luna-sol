import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { TimeControls } from './time-controls';
import { TYPING_PAUSE_MS } from './time-menu';
import { toDateInputValue } from './time-input';

function render() {
  window.history.replaceState({}, '', '/?fecha=2030-01-01T12:00Z');
  TestBed.configureTestingModule({
    imports: [TimeControls],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('system'));
  TestBed.inject(ExplorerSession);
  const fixture = TestBed.createComponent(TimeControls);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector) as T;
  return { fixture, root, $, sim: TestBed.inject(SimulationStore) };
}

describe('TimeControls: barra de tiempo', () => {
  afterEach(() => {
    TestBed.inject(SimulationStore).pause();
    window.history.replaceState({}, '', '/');
  });

  it('la lectura plegada del móvil dice la zona, la velocidad y el sentido', () => {
    const { $, fixture, sim } = render();
    const raw = () => $<HTMLElement>('.time__zone').textContent?.trim() ?? '';
    const detail = () => raw().replaceAll('\u00a0', ' ');
    // Al entrar, 3 horas por segundo (D31).
    expect(detail()).toMatch(/^Hora local, UTC(\S*)? · 3 horas por segundo$/);
    // Solo se parte entre trozos: «3 horas por segundo» y «Hora local, UTC+2» no se cortan por dentro.
    expect(raw()).toMatch(
      /^Hora\u00a0local,\u00a0UTC\S*\u00a0· 3\u00a0horas\u00a0por\u00a0segundo$/,
    );
    // La barra compacta da la hora sin segundos (los tiene el campo de \u00abControles +\u00bb).
    expect($<HTMLElement>('.time__readout time').textContent).toMatch(
      /^\d{1,2}\u00a0\S+\u00a0\d{4}, \d{2}:\d{2}$/,
    );
    sim.setSpeed(-365.25 * 86_400);
    fixture.detectChanges();
    expect(detail()).toMatch(/· 1 año por segundo, hacia atrás$/);
    $<HTMLSelectElement>('#time-zone').value = 'utc';
    $<HTMLSelectElement>('#time-zone').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(detail()).toBe('UTC · 1 año por segundo, hacia atrás');
  });

  it('reproducir y pausar cambian el texto del botón (no solo el icono)', () => {
    const { $, fixture, sim } = render();
    const play = $<HTMLButtonElement>('.time__play');
    expect(play.textContent).toContain('Reproducir');
    play.click();
    fixture.detectChanges();
    expect(sim.playing()).toBe(true);
    expect(play.textContent).toContain('Pausar');
  });

  it('la velocidad tiene los nueve escalones del plan y el botón de hacia atrás invierte el sentido', () => {
    const { $, fixture, sim } = render();
    const speed = $<HTMLSelectElement>('#time-speed');
    expect([...speed.options].map((o) => o.textContent?.trim())).toEqual([
      'Tiempo real',
      '1 hora por segundo',
      '3 horas por segundo',
      '1 día por segundo',
      '3 días por segundo',
      '1 semana por segundo',
      '10 días por segundo',
      '1 mes por segundo',
      '1 año por segundo',
    ]);
    expect(speed.value).toBe('hours3');
    speed.value = 'day';
    speed.dispatchEvent(new Event('change'));
    expect(sim.speed()).toBe(86_400);
    const reverse = $<HTMLButtonElement>('[aria-pressed]');
    reverse.click();
    fixture.detectChanges();
    expect(sim.speed()).toBe(-86_400);
    expect(reverse.getAttribute('aria-pressed')).toBe('true');
  });

  it('los inputs nativos llevan la fecha en UTC al elegir UTC y saltan a la fecha escrita', () => {
    const { $, fixture, sim } = render();
    const zone = $<HTMLSelectElement>('#time-zone');
    zone.value = 'utc';
    zone.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const date = $<HTMLInputElement>('#time-date');
    const clock = $<HTMLInputElement>('#time-clock');
    expect(date.value).toBe('2030-01-01');
    expect(clock.value).toBe('12:00:00');
    expect(date.min).toBe('1900-01-01');
    expect(date.max).toBe('2100-12-31');
    date.value = '1969-07-20';
    clock.value = '20:17:40';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sim.time().toISOString()).toBe('1969-07-20T20:17:40.000Z');
  });

  it('una fecha que no existe o fuera de 1900–2100 no se aplica y se explica', () => {
    const { $, fixture, sim, root } = render();
    const date = $<HTMLInputElement>('#time-date');
    date.value = '2150-01-01';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sim.time().toISOString()).toBe('2030-01-01T12:00:00.000Z');
    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('entre 1900 y 2100');
  });

  it('mientras se escribe, la fecha se aplica al dejar de teclear y el error solo sale al confirmar', () => {
    vi.useFakeTimers({
      now: Date.parse('2026-10-26T10:00:00Z'),
      toFake: ['setTimeout', 'clearTimeout'],
    });
    try {
      const { $, fixture, sim, root } = render();
      const zone = $<HTMLSelectElement>('#time-zone');
      zone.value = 'utc';
      zone.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const date = $<HTMLInputElement>('#time-date');
      date.dispatchEvent(new Event('focus'));
      // A medio escribir el año, el navegador ya lanza `change` (0002, 0020, 0203…).
      for (const value of ['2030-03-15', '0002-03-15', '0020-03-15', '0203-03-15', '2031-03-15']) {
        date.value = value;
        date.dispatchEvent(new Event('change'));
        fixture.detectChanges();
      }
      expect(sim.time().toISOString()).toBe('2030-01-01T12:00:00.000Z');
      expect(root.querySelector('[role="alert"]')).toBeNull();
      vi.advanceTimersByTime(TYPING_PAUSE_MS);
      fixture.detectChanges();
      expect(sim.time().toISOString()).toBe('2031-03-15T12:00:00.000Z');

      // Lo que no vale no se aplica ni se dice mientras se escribe; al salir del campo, sí.
      date.value = '0203-03-15';
      date.dispatchEvent(new Event('change'));
      vi.advanceTimersByTime(TYPING_PAUSE_MS);
      fixture.detectChanges();
      expect(root.querySelector('[role="alert"]')).toBeNull();
      date.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(sim.time().toISOString()).toBe('2031-03-15T12:00:00.000Z');
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('entre 1900 y 2100');

      // Intro aplica ya, sin esperar.
      date.dispatchEvent(new Event('focus'));
      date.value = '2032-04-01';
      date.dispatchEvent(new Event('change'));
      date.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(sim.time().toISOString()).toBe('2032-04-01T12:00:00.000Z');
      expect(root.querySelector('[role="alert"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('los límites del campo y la validación siguen la zona elegida, al instante', () => {
    const { $, fixture, sim, root } = render();
    const date = $<HTMLInputElement>('#time-date');
    const clock = $<HTMLInputElement>('#time-clock');
    // En la hora local, el intervalo empieza y acaba donde caen 1900 y 2100 (UTC) en esa zona.
    expect(date.min).toBe(toDateInputValue(MIN_DATE, 'local'));
    expect(date.max).toBe(toDateInputValue(MAX_DATE, 'local'));
    const zone = $<HTMLSelectElement>('#time-zone');
    zone.value = 'utc';
    zone.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(date.min).toBe('1900-01-01');
    expect(date.max).toBe('2100-12-31');
    // El último segundo del intervalo vale; uno después, no.
    date.value = '2100-12-31';
    clock.value = '23:59:59';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sim.time()).toEqual(MAX_DATE);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    date.value = '2101-01-01';
    clock.value = '00:00:00';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sim.time()).toEqual(MAX_DATE);
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    // Y el primero.
    date.value = '1900-01-01';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sim.time()).toEqual(MIN_DATE);
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('«Ahora» vuelve al instante actual en tiempo real', () => {
    const { root, fixture, sim } = render();
    sim.setSpeed(-31_557_600);
    const now = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Ahora');
    now?.click();
    fixture.detectChanges();
    expect(sim.speed()).toBe(1);
    expect(sim.playing()).toBe(true);
    expect(Math.abs(sim.time().getTime() - Date.now())).toBeLessThan(5000);
  });
});
