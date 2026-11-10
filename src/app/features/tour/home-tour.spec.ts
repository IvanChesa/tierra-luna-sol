import { GUIDED_VIEWS } from '../../data/tours';
import { HOME_TOUR_MS, SPAIN_CAPTION, TourHost, homeTourSteps, runTour } from './home-tour';

const SPAIN = GUIDED_VIEWS.find((view) => view.id === 'espana')!;

function fakeHost() {
  const calls: string[] = [];
  const captions: string[] = [];
  const said: string[] = [];
  const host: TourHost = {
    select: (id) => calls.push(`select:${id}`),
    closePanel: () => calls.push('closePanel'),
    goTo: (view) => calls.push(`goTo:${view}`),
    showGuidedView: (view) => calls.push(`guided:${view.id}`),
    play: () => calls.push('play'),
    announce: (text) => {
      calls.push('announce');
      said.push(text);
    },
    caption: (text) => captions.push(text),
    prefetch: (ids) => calls.push(`prefetch:${ids.join(',')}`),
  };
  return { host, calls, captions, said };
}

describe('El recorrido de la portada (fase 9c)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('unos 30 s: Saturno, la Tierra con «España», la Luna y la vista general en marcha', () => {
    const { host, calls, captions, said } = fakeHost();
    const done = vi.fn();
    const plan = homeTourSteps(SPAIN);
    expect(plan.totalMs).toBe(HOME_TOUR_MS);
    runTour(host, plan, done);
    vi.advanceTimersByTime(HOME_TOUR_MS - 1);
    expect(calls).toEqual([
      'announce',
      // Las texturas grandes de las paradas que vienen, por la red, mientras se ve Saturno (9b).
      'prefetch:tierra,luna',
      'select:saturno',
      'closePanel',
      'goTo:earth',
      'guided:espana',
      'goTo:moon',
      'goTo:system',
      'play',
    ]);
    // Cada parada dice dónde se está y cuántas hay; España nombra sus lugares (crítica de la 9c).
    expect(captions).toEqual([
      '1 de 4 · Saturno y sus anillos',
      '2 de 4 · La Tierra',
      `2 de 4 · ${SPAIN_CAPTION}`,
      '3 de 4 · La Luna',
      '4 de 4 · El sistema solar, en marcha',
    ]);
    expect(said[0]).toContain('unos 30 segundos: Saturno, la Tierra y la Luna');
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledExactlyOnceWith(true);
    expect(HOME_TOUR_MS).toBeGreaterThanOrEqual(25_000);
    expect(HOME_TOUR_MS).toBeLessThanOrEqual(35_000);
  });

  it('con la Luna casi nueva, sin su parada (la fecha no se toca): 6 s menos', () => {
    const { host, calls, captions, said } = fakeHost();
    const done = vi.fn();
    const plan = homeTourSteps(SPAIN, { moon: false });
    runTour(host, plan, done);
    vi.advanceTimersByTime(plan.totalMs);
    expect(calls).not.toContain('goTo:moon');
    expect(calls.slice(-2)).toEqual(['goTo:system', 'play']);
    expect(captions.at(-1)).toBe('3 de 3 · El sistema solar, en marcha');
    expect(said[0]).toContain('Saturno y la Tierra');
    expect(plan.totalMs).toBe(HOME_TOUR_MS - 6000);
    expect(done).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('pararlo no da más pasos (lo demás, ir a la vista general o quedarse, lo decide la interfaz)', () => {
    const { host, calls } = fakeHost();
    const done = vi.fn();
    const tour = runTour(host, homeTourSteps(SPAIN), done);
    vi.advanceTimersByTime(10_000);
    tour.stop();
    tour.stop();
    vi.advanceTimersByTime(HOME_TOUR_MS);
    expect(calls).toEqual([
      'announce',
      'prefetch:tierra,luna',
      'select:saturno',
      'closePanel',
      'goTo:earth',
    ]);
    expect(done).toHaveBeenCalledExactlyOnceWith(false);
  });
});
