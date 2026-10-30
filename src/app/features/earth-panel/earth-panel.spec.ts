import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { utcOffsetLabel } from '../../core/format';
import { GUIDED_VIEWS } from '../../data/tours';
import { MAX_DATE, MIN_DATE } from '../../ephemeris/constants';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import {
  EarthPanel,
  TOUR_STEP_MS,
  atMinuteOfDay,
  clockText,
  minutesOfDay,
  sliderRange,
} from './earth-panel';

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
    const offset = utcOffsetLabel(sim.time());
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
    expect(slider?.labels?.[0]?.textContent).toContain('Hora del día');
    expect(slider?.getAttribute('aria-valuetext')).toBe(`09:30, hora local, ${offset}`);
    expect(root.querySelector('.earth__hint')?.textContent?.trim()).toBe(
      `Hora local, ${offset}, sin cambiar la fecha`,
    );
    if (!slider) throw new Error('Sin deslizador');
    slider.value = String(18 * 60);
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const time = sim.time();
    expect(time.getDate()).toBe(21);
    expect(minutesOfDay(time)).toBe(18 * 60);
    expect(slider.getAttribute('aria-valuetext')).toBe(`18:00, hora local, ${offset}`);
  });

  it('con UTC elegido en la barra de tiempo, la hora y el día son los UTC', () => {
    const { fixture, root, sim } = render();
    TestBed.inject(ExplorerStore).timeZone.set('utc');
    // Las 23:00 UTC del 24-10: en España ya es el 25, pero se ve el 24 en UTC.
    sim.setTime(new Date('2026-10-24T23:00:00Z'));
    fixture.detectChanges();
    const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider) throw new Error('Sin deslizador');
    expect(slider.getAttribute('aria-valuetext')).toBe('23:00, UTC');
    expect(root.querySelector('.earth__hint')?.textContent?.trim()).toBe(
      'UTC, sin cambiar la fecha',
    );
    slider.value = String(12 * 60);
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(sim.time().toISOString()).toBe('2026-10-24T12:00:00.000Z');
    expect(minutesOfDay(sim.time(), 'utc')).toBe(12 * 60);
  });

  it('el reloj escrito no es una región viva (cambia varias veces por segundo al reproducir)', () => {
    const { root } = render();
    expect(root.querySelector('.earth__clock')?.textContent).toMatch(/^\d\d:\d\d$/);
    expect(
      root.querySelectorAll('output, [aria-live], [role="status"], [role="log"], [role="alert"]'),
    ).toHaveLength(0);
  });

  it('en el primer y el último día de 1900–2100, el deslizador se corta en los límites', () => {
    for (const zone of ['local', 'utc'] as const) {
      const first = sliderRange(MIN_DATE, zone);
      expect(atMinuteOfDay(MIN_DATE, first.min, zone).getTime()).toBeGreaterThanOrEqual(
        MIN_DATE.getTime(),
      );
      if (first.min > 0) {
        expect(atMinuteOfDay(MIN_DATE, first.min - 5, zone).getTime()).toBeLessThan(
          MIN_DATE.getTime(),
        );
      }
      const last = sliderRange(MAX_DATE, zone);
      expect(atMinuteOfDay(MAX_DATE, last.max, zone).getTime()).toBeLessThanOrEqual(
        MAX_DATE.getTime(),
      );
      expect(sliderRange(new Date('2026-06-21T12:00:00Z'), zone)).toEqual({ min: 0, max: 1435 });
    }
    // En UTC, el rango empieza a las 00:00 del 1-1-1900 y acaba a las 23:59 del 31-12-2100.
    expect(sliderRange(MIN_DATE, 'utc')).toEqual({ min: 0, max: 1435 });
    expect(sliderRange(MAX_DATE, 'utc')).toEqual({ min: 0, max: 1435 });
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
    // Anterior y siguiente, sin dar la vuelta: en la última, «Vista siguiente» no está disponible
    // (conserva el foco) y no vuelve a poner la vista ni su hora.
    const next = root.querySelector<HTMLButtonElement>('button[aria-label="Vista siguiente"]');
    const previous = root.querySelector<HTMLButtonElement>('button[aria-label="Vista anterior"]');
    expect(next?.getAttribute('aria-disabled')).toBe('true');
    expect(previous?.hasAttribute('aria-disabled')).toBe(false);
    sim.setTime(new Date('2026-06-21T18:00:00Z'));
    next?.click();
    fixture.detectChanges();
    expect(button('España')?.getAttribute('aria-pressed')).toBe('true');
    expect(sim.time().toISOString()).toBe('2026-06-21T18:00:00.000Z');
    previous?.click();
    fixture.detectChanges();
    expect(button('Las luces de la noche')?.getAttribute('aria-pressed')).toBe('true');
    expect(next?.hasAttribute('aria-disabled')).toBe(false);
  });

  it('el botón del recorrido cambia de texto, sin `aria-pressed` (como reproducir y pausar)', () => {
    const { fixture, button } = render();
    expect(button('Recorrer las vistas')?.hasAttribute('aria-pressed')).toBe(false);
    button('Recorrer las vistas')?.click();
    fixture.detectChanges();
    expect(button('Pausar el recorrido')?.hasAttribute('aria-pressed')).toBe(false);
    button('Pausar el recorrido')?.click();
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
