import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { TimeControls } from './time-controls';

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

  it('reproducir y pausar cambian el texto del botón (no solo el icono)', () => {
    const { $, fixture, sim } = render();
    const play = $<HTMLButtonElement>('.time__play');
    expect(play.textContent).toContain('Reproducir');
    play.click();
    fixture.detectChanges();
    expect(sim.playing()).toBe(true);
    expect(play.textContent).toContain('Pausar');
  });

  it('la velocidad tiene los seis escalones del plan y el botón de hacia atrás invierte el sentido', () => {
    const { $, fixture, sim } = render();
    const speed = $<HTMLSelectElement>('#time-speed');
    expect([...speed.options].map((o) => o.textContent?.trim())).toEqual([
      'Tiempo real',
      '1 hora por segundo',
      '1 día por segundo',
      '1 semana por segundo',
      '1 mes por segundo',
      '1 año por segundo',
    ]);
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
