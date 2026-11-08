import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { PHONE_QUERY } from '../viewer/media';
import { BodyChips } from './body-chips';

type View = 'system' | 'earth' | 'moon' | 'sky';

function render(view: View = 'system') {
  window.history.replaceState({}, '', '/?fecha=2026-10-24T00:00Z');
  TestBed.configureTestingModule({
    imports: [BodyChips],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal(view));
  const fixture = TestBed.createComponent(BodyChips);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const chip = (id: string) => root.querySelector<HTMLButtonElement>(`button[data-body="${id}"]`);
  const toolbar = (name: string) =>
    root.querySelector<HTMLElement>(`[role="toolbar"][aria-label="${name}"]`);
  const buttons = (name: string) => [
    ...(toolbar(name)?.querySelectorAll<HTMLButtonElement>('button') ?? []),
  ];
  const key = (id: string, key: string) => {
    chip(id)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  const click = (id: string) => {
    chip(id)?.click();
    fixture.detectChanges();
  };
  return {
    fixture,
    root,
    chip,
    toolbar,
    buttons,
    key,
    click,
    sim: TestBed.inject(SimulationStore),
    session: TestBed.inject(ExplorerSession),
  };
}

/** Un teléfono (`matchMedia` con el corte del móvil); jsdom no lo tiene: sin él, el PC. */
function asPhone(): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: query === PHONE_QUERY,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('BodyChips: fichas de cuerpos', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('una barra con el Sol y los planetas, su miniatura y una sola parada del tabulador', () => {
    const { root, buttons, chip } = render();
    const planets = buttons('Sol y planetas');
    expect(planets.map((b) => b.dataset['body'])).toEqual([
      'sol',
      'mercurio',
      'venus',
      'tierra',
      'marte',
      'jupiter',
      'saturno',
      'urano',
      'neptuno',
    ]);
    expect(planets.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(chip('sol')?.tabIndex).toBe(0);
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('false');
    // Los planetas, redondos y con el nombre debajo: la miniatura es decorativa (el nombre lo da el
    // texto) y tiene su tamaño fijado (sin saltos).
    expect(chip('saturno')?.classList.contains('chip')).toBe(true);
    const thumb = chip('saturno')?.querySelector('img');
    expect(thumb?.getAttribute('src')).toBe('img/cuerpos/saturno.webp');
    expect(thumb?.getAttribute('alt')).toBe('');
    expect(thumb?.getAttribute('width')).toBe('40');
    expect(chip('saturno')?.textContent?.trim()).toBe('Saturno');
    // Sin un planeta con lunas elegido, no hay segunda fila.
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(true);
  });

  it('la distancia de cada ficha llega como descripción («A 9,54 UA del Sol»)', () => {
    const { root, chip } = render();
    const described = chip('saturno')?.getAttribute('aria-describedby');
    const text = root.querySelector(`#${described}`)?.textContent ?? '';
    expect(text.replace(/\s/g, ' ')).toMatch(/^A \d+,\d\d UA del Sol$/);
    // El Sol es el origen: sin descripción.
    expect(chip('sol')?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('las flechas, Inicio y Fin solo mueven el foco (dando la vuelta); no eligen', () => {
    const { chip, key, sim } = render();
    chip('sol')?.focus();
    key('sol', 'ArrowRight');
    expect(document.activeElement).toBe(chip('mercurio'));
    expect(chip('mercurio')?.tabIndex).toBe(0);
    expect(chip('sol')?.tabIndex).toBe(-1);
    key('mercurio', 'End');
    expect(document.activeElement).toBe(chip('neptuno'));
    key('neptuno', 'ArrowRight');
    expect(document.activeElement).toBe(chip('sol'));
    key('sol', 'ArrowLeft');
    expect(document.activeElement).toBe(chip('neptuno'));
    key('neptuno', 'Home');
    expect(document.activeElement).toBe(chip('sol'));
    expect(sim.selectedBodyId()).toBeNull();
  });

  it('en el PC, un planeta con lunas trae una segunda fila encima, con sus lunas en pastillas', () => {
    const { root, chip, buttons, click, sim } = render();
    click('saturno');
    expect(sim.selectedBodyId()).toBe('saturno');
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('true');
    expect(chip('saturno')?.tabIndex).toBe(0);
    // La fila de los planetas sigue entera, debajo (decisión de Iván del 07-11).
    expect(buttons('Sol y planetas')).toHaveLength(9);
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(false);
    const moons = buttons('Lunas de Saturno');
    expect(moons.map((b) => b.textContent?.trim())).toEqual([
      'Mimas',
      'Encélado',
      'Tetis',
      'Dione',
      'Rea',
      'Titán',
      'Jápeto',
    ]);
    // Pastillas (miniatura y nombre al lado), no fichas redondas; una sola parada del tabulador.
    expect(moons.every((b) => b.classList.contains('moon'))).toBe(true);
    expect(moons.filter((b) => b.tabIndex === 0).map((b) => b.dataset['body'])).toEqual(['mimas']);
    // Las miniaturas de las lunas, en diferido.
    expect(moons[0]?.querySelector('img')?.getAttribute('loading')).toBe('lazy');

    // Una luna: queda elegida, su planeta sigue en su fila (marcado como su sistema) y la descripción
    // va a su planeta.
    click('titan');
    expect(sim.selectedBodyId()).toBe('titan');
    expect(chip('titan')?.getAttribute('aria-pressed')).toBe('true');
    expect(chip('titan')?.tabIndex).toBe(0);
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('false');
    expect(chip('saturno')?.classList.contains('is-system')).toBe(true);
    const described = chip('titan')?.getAttribute('aria-describedby');
    expect((root.querySelector(`#${described}`)?.textContent ?? '').replace(/\s/g, ' ')).toMatch(
      /^A [\d.]+ km de Saturno$/,
    );
  });

  it('la Tierra trae a su satélite, la Luna; también en las vistas Tierra y Luna (PC)', () => {
    const { buttons, chip, click } = render();
    click('tierra');
    expect(buttons('Satélite de la Tierra').map((b) => b.dataset['body'])).toEqual(['luna']);
    expect(chip('luna')?.textContent?.trim()).toBe('Luna');
    TestBed.resetTestingModule();

    for (const view of ['earth', 'moon'] as const) {
      const detail = render(view);
      detail.sim.reflectSelection(view === 'earth' ? 'tierra' : 'luna');
      detail.fixture.detectChanges();
      expect(detail.buttons('Sol y planetas'), view).toHaveLength(9);
      expect(
        detail.buttons('Satélite de la Tierra').map((b) => b.dataset['body']),
        view,
      ).toEqual(['luna']);
      TestBed.resetTestingModule();
    }
  });

  it('en el cielo (PC), las lunas también en una segunda fila, encima de la de los planetas', () => {
    const { root, buttons, click } = render('sky');
    click('saturno');
    expect(buttons('Sol y planetas')).toHaveLength(9);
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(false);
    expect(buttons('Lunas de Saturno')).toHaveLength(7);
  });

  it('en el móvil, una sola fila: el planeta, una raya y sus lunas; la vista general vuelve a los planetas', () => {
    const restore = asPhone();
    try {
      const { root, chip, toolbar, buttons, click, key, session, fixture } = render();
      click('saturno');
      // Una sola fila (no una segunda encima): el planeta redondo, la raya y las lunas en pastillas.
      expect(toolbar('Sol y planetas')).toBeNull();
      expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(true);
      const system = toolbar('Saturno y sus lunas');
      expect(buttons('Saturno y sus lunas').map((b) => b.textContent?.trim())).toEqual([
        'Saturno',
        'Mimas',
        'Encélado',
        'Tetis',
        'Dione',
        'Rea',
        'Titán',
        'Jápeto',
      ]);
      expect(chip('saturno')?.classList.contains('chip')).toBe(true);
      expect(chip('mimas')?.classList.contains('moon')).toBe(true);
      const divider = system?.querySelector('.row__divider');
      expect(divider?.getAttribute('aria-hidden')).toBe('true');
      expect(divider?.previousElementSibling).toBe(chip('saturno'));
      expect(divider?.nextElementSibling).toBe(chip('mimas'));
      // Una sola parada del tabulador en la fila, y las flechas pasan del planeta a sus lunas.
      expect(
        buttons('Saturno y sus lunas')
          .filter((b) => b.tabIndex === 0)
          .map((b) => b.dataset['body']),
      ).toEqual(['saturno']);
      chip('saturno')?.focus();
      key('saturno', 'ArrowRight');
      expect(document.activeElement).toBe(chip('mimas'));

      // Una luna, elegida en la misma fila: su planeta, marcado como su sistema.
      click('titan');
      expect(chip('titan')?.getAttribute('aria-pressed')).toBe('true');
      expect(chip('titan')?.tabIndex).toBe(0);
      expect(chip('saturno')?.classList.contains('is-system')).toBe(true);

      // «‹ Sistema solar» (la vista general) vuelve a la fila de los planetas.
      session.overview();
      fixture.detectChanges();
      expect(toolbar('Saturno y sus lunas')).toBeNull();
      expect(buttons('Sol y planetas')).toHaveLength(9);
      expect(root.querySelector('.row__divider')).toBeNull();
    } finally {
      restore();
    }
  });

  it('en el móvil, fuera de la vista del sistema solar, sin fila de lunas', () => {
    const restore = asPhone();
    try {
      const { root, buttons, click } = render('sky');
      click('saturno');
      expect(buttons('Sol y planetas')).toHaveLength(9);
      expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(true);
      expect(root.querySelectorAll('.moon')).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('focusBody lleva el foco a una ficha y la hace la parada de su fila', () => {
    const { fixture, chip } = render();
    expect(fixture.componentInstance.focusBody('saturno')).toBe(true);
    fixture.detectChanges();
    expect(document.activeElement).toBe(chip('saturno'));
    expect(chip('saturno')?.tabIndex).toBe(0);
    expect(chip('sol')?.tabIndex).toBe(-1);
    expect(fixture.componentInstance.focusBody('titan')).toBe(false);
  });
});
