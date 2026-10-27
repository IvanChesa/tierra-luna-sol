import { TestBed } from '@angular/core/testing';
import { SimulationStore } from '../../state/simulation.store';
import { EarthPanel, atMinuteOfDay, clockText, minutesOfDay } from './earth-panel';

describe('EarthPanel: la luz del Sol (fase 5)', () => {
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
    TestBed.configureTestingModule({ imports: [EarthPanel], providers: [SimulationStore] });
    const sim = TestBed.inject(SimulationStore);
    sim.init({
      time: new Date(2026, 5, 21, 9, 30),
      playing: false,
      speed: 3600,
      selected: null,
      scale: 'illustrative',
      quality: 'high',
    });
    const fixture = TestBed.createComponent(EarthPanel);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
    expect(slider?.labels?.[0]?.textContent).toContain('Hora del día');
    expect(slider?.getAttribute('aria-valuetext')).toBe('09:30, hora local');
    expect(root.querySelector('output')?.textContent).toContain('09:30');
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
