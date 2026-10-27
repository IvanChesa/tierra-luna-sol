import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { localZoneName } from '../../core/format';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { TimelineSlider } from './timeline-slider';

function render(date: string, zone: 'utc' | 'local' = 'utc') {
  window.history.replaceState({}, '', `/?fecha=${date}`);
  TestBed.configureTestingModule({
    imports: [TimelineSlider],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('system'));
  const fixture = TestBed.createComponent(TimelineSlider);
  fixture.componentRef.setInput('zone', zone);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const line = root.querySelector<HTMLInputElement>('input[type="range"]') as HTMLInputElement;
  const text = () => line.getAttribute('aria-valuetext');
  const key = (key: string) => {
    line.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  const sim = TestBed.inject(SimulationStore);
  return { fixture, root, line, text, key, sim };
}

describe('TimelineSlider: la línea de tiempo de la barra', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('el año de la fecha, de enero a diciembre, y la fecha en aria-valuetext', () => {
    const { root, line, text } = render('2031-03-15T13:00Z');
    expect(root.querySelector('.year__label')?.textContent).toBe('2031');
    expect(line.getAttribute('aria-label')).toBe('Línea de tiempo');
    expect(line.min).toBe('0');
    expect(line.max).toBe('364');
    expect(line.value).toBe('73');
    expect(text()).toBe('15 de marzo de 2031');
  });

  it('con el foco del teclado y el tiempo en marcha, lo anunciado se queda quieto; → parte de ello', () => {
    const { line, text, key, sim, fixture } = render('2031-03-15T13:00Z');
    sim.play();
    line.dispatchEvent(new FocusEvent('focus'));
    // El reloj avanza (aquí, a mano): lo que se anuncia no cambia mientras el foco sigue ahí.
    sim.setTime(new Date('2031-04-20T13:00:00Z'));
    fixture.detectChanges();
    expect(text()).toBe('15 de marzo de 2031');
    expect(line.value).toBe('73');
    // → es el día siguiente al anunciado, no al del reloj.
    key('ArrowRight');
    expect(sim.time().toISOString()).toBe('2031-03-16T13:00:00.000Z');
    expect(text()).toBe('16 de marzo de 2031');
    // Al salir, vuelve a seguir a la fecha.
    line.dispatchEvent(new FocusEvent('blur'));
    sim.setTime(new Date('2031-04-20T13:00:00Z'));
    fixture.detectChanges();
    expect(text()).toBe('20 de abril de 2031');
    sim.pause();
  });

  it('con el ratón o el dedo, la línea sigue a la fecha aunque tenga el foco', () => {
    const { line, text, sim, fixture } = render('2031-03-15T13:00Z');
    sim.play();
    line.dispatchEvent(new Event('pointerdown'));
    line.dispatchEvent(new FocusEvent('focus'));
    line.value = '100';
    line.dispatchEvent(new Event('input'));
    expect(sim.time().toISOString()).toBe('2031-04-11T13:00:00.000Z');
    sim.setTime(new Date('2031-05-02T13:00:00Z'));
    fixture.detectChanges();
    expect(text()).toBe('2 de mayo de 2031');
    sim.pause();
  });

  it('en 1900 y en 2100 no se pasa del rango: sin año anterior o siguiente', () => {
    const start = render('1900-01-01T00:00Z');
    const previous = () =>
      start.root.querySelector<HTMLButtonElement>('button[title="Año anterior"]');
    expect(previous()?.disabled).toBe(true);
    start.key('ArrowLeft');
    // El store no baja de 1900: la fecha se queda y la línea con ella.
    expect(start.sim.time().toISOString()).toBe('1900-01-01T00:00:00.000Z');
    expect(start.line.value).toBe('0');
    TestBed.resetTestingModule();

    const end = render('2100-12-31T23:59Z');
    const next = end.root.querySelector<HTMLButtonElement>('button[title="Año siguiente"]');
    expect(next?.disabled).toBe(true);
    expect(end.line.max).toBe('364');
    end.key('End');
    expect(end.sim.time().getUTCFullYear()).toBe(2100);
  });

  it.runIf(localZoneName() === 'Europe/Madrid')(
    'en la hora de Madrid, el final de 2100 es 2101, con un solo día en la pista',
    () => {
      const { root, line, text } = render('2100-12-31T23:59Z', 'local');
      expect(root.querySelector('.year__label')?.textContent).toBe('2101');
      expect(line.min).toBe('0');
      expect(line.max).toBe('0');
      expect(text()).toBe('1 de enero de 2101');
    },
  );
});
