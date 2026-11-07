import { GUIDED_VIEWS } from '../../data/tours';
import { HOME_TOUR_MS, TourHost, homeTourSteps, runTour } from './home-tour';

const SPAIN = GUIDED_VIEWS.find((view) => view.id === 'espana')!;

function fakeHost() {
  const calls: string[] = [];
  const host: TourHost = {
    select: (id) => calls.push(`select:${id}`),
    closePanel: () => calls.push('closePanel'),
    goTo: (view) => calls.push(`goTo:${view}`),
    showGuidedView: (view) => calls.push(`guided:${view.id}`),
    play: () => calls.push('play'),
    announce: () => calls.push('announce'),
  };
  return { host, calls };
}

describe('El recorrido de la portada (fase 9c)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('unos 30 s: Saturno, la Tierra con «España», la Luna y la vista general en marcha', () => {
    const { host, calls } = fakeHost();
    const done = vi.fn();
    runTour(host, homeTourSteps(SPAIN), done);
    vi.advanceTimersByTime(HOME_TOUR_MS - 1);
    expect(calls).toEqual([
      'announce',
      'select:saturno',
      'closePanel',
      'goTo:earth',
      'guided:espana',
      'goTo:moon',
      'goTo:system',
      'play',
    ]);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledExactlyOnceWith(true);
    expect(HOME_TOUR_MS).toBeGreaterThanOrEqual(25_000);
    expect(HOME_TOUR_MS).toBeLessThanOrEqual(35_000);
  });

  it('«Saltar» (o cualquier gesto) lo para donde está: no hay más pasos', () => {
    const { host, calls } = fakeHost();
    const done = vi.fn();
    const tour = runTour(host, homeTourSteps(SPAIN), done);
    vi.advanceTimersByTime(10_000);
    tour.stop();
    tour.stop();
    vi.advanceTimersByTime(HOME_TOUR_MS);
    expect(calls).toEqual(['announce', 'select:saturno', 'closePanel', 'goTo:earth']);
    expect(done).toHaveBeenCalledExactlyOnceWith(false);
  });
});
