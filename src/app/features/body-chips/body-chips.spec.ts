import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { BodyChips } from './body-chips';

function render(view: 'system' | 'sky' = 'system') {
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
  const key = (id: string, key: string) => {
    chip(id)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  return {
    fixture,
    root,
    chip,
    toolbar,
    key,
    sim: TestBed.inject(SimulationStore),
    session: TestBed.inject(ExplorerSession),
  };
}

describe('BodyChips: fichas de cuerpos', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('una barra con el Sol y los planetas, su miniatura y una sola parada del tabulador', () => {
    const { root, toolbar, chip } = render();
    const planets = toolbar('Sol y planetas');
    const buttons = [...(planets?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    expect(buttons.map((b) => b.dataset['body'])).toEqual([
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
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(chip('sol')?.tabIndex).toBe(0);
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('false');
    // La miniatura es decorativa (el nombre lo da el texto) y tiene su tamaño fijado (sin saltos).
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

  it('un clic elige; con un planeta con lunas, la fila pasa a ser la de su sistema (fase 9c)', () => {
    const { root, chip, toolbar, fixture, sim, session } = render();
    chip('saturno')?.click();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBe('saturno');
    // Una sola fila: el planeta y sus lunas, en lugar de los planetas (no una segunda encima).
    expect(toolbar('Sol y planetas')).toBeNull();
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(true);
    const system = toolbar('Saturno y sus lunas');
    const buttons = [...(system?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Saturno',
      'Mimas',
      'Encélado',
      'Tetis',
      'Dione',
      'Rea',
      'Titán',
      'Jápeto',
    ]);
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons.filter((b) => b.tabIndex === 0).map((b) => b.dataset['body'])).toEqual([
      'saturno',
    ]);

    // «‹ Sistema solar» (la vista general) vuelve a la fila de los planetas; se elige otra vez.
    session.overview();
    fixture.detectChanges();
    expect(toolbar('Saturno y sus lunas')).toBeNull();
    expect(toolbar('Sol y planetas')?.querySelectorAll('button')).toHaveLength(9);
    chip('saturno')?.click();
    fixture.detectChanges();

    // Una luna: queda elegida, su planeta sigue en la fila (marcado como su sistema) y la
    // descripción va a su planeta.
    chip('titan')?.click();
    fixture.detectChanges();
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

  it('la Tierra, con su satélite, la Luna', () => {
    const { chip, toolbar, fixture } = render();
    chip('tierra')?.click();
    fixture.detectChanges();
    const system = toolbar('La Tierra y la Luna');
    expect([...(system?.querySelectorAll('button') ?? [])].map((b) => b.dataset['body'])).toEqual([
      'tierra',
      'luna',
    ]);
    expect(chip('luna')?.textContent?.trim()).toBe('Luna');
  });

  it('en el cielo, las lunas siguen en una segunda fila, encima de la de los planetas', () => {
    const { root, chip, toolbar, fixture } = render('sky');
    chip('saturno')?.click();
    fixture.detectChanges();
    expect(toolbar('Sol y planetas')?.querySelectorAll('button')).toHaveLength(9);
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(false);
    const moons = toolbar('Lunas de Saturno');
    expect(moons?.querySelectorAll('button')).toHaveLength(7);
    // Las miniaturas de las lunas, en diferido.
    expect(moons?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });
});
