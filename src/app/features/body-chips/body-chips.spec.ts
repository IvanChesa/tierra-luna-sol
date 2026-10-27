import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { BodyChips } from './body-chips';

function render() {
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
  TestBed.inject(ExplorerStore).connectView(signal('system'));
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
  return { fixture, root, chip, toolbar, key, sim: TestBed.inject(SimulationStore) };
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

  it('un clic (o Intro y Espacio, que son clics) elige; la segunda fila trae sus lunas', () => {
    const { root, chip, toolbar, fixture, sim } = render();
    chip('saturno')?.click();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBe('saturno');
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('true');
    expect(chip('saturno')?.tabIndex).toBe(0);
    const moons = toolbar('Lunas de Saturno');
    expect(root.querySelector<HTMLElement>('.moons')?.hidden).toBe(false);
    const buttons = [...(moons?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Mimas',
      'Encélado',
      'Tetis',
      'Dione',
      'Rea',
      'Titán',
      'Jápeto',
    ]);
    expect(buttons.filter((b) => b.tabIndex === 0).map((b) => b.dataset['body'])).toEqual([
      'mimas',
    ]);
    // Las miniaturas de las lunas, en diferido.
    expect(buttons[0]?.querySelector('img')?.getAttribute('loading')).toBe('lazy');

    // Una luna: queda elegida, su planeta sigue con su fila y la descripción va a su planeta.
    chip('titan')?.click();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBe('titan');
    expect(chip('titan')?.getAttribute('aria-pressed')).toBe('true');
    expect(chip('titan')?.tabIndex).toBe(0);
    expect(chip('saturno')?.getAttribute('aria-pressed')).toBe('false');
    const described = chip('titan')?.getAttribute('aria-describedby');
    expect((root.querySelector(`#${described}`)?.textContent ?? '').replace(/\s/g, ' ')).toMatch(
      /^A [\d.]+ km de Saturno$/,
    );
  });

  it('la Tierra trae a su satélite, la Luna', () => {
    const { chip, toolbar, fixture } = render();
    chip('tierra')?.click();
    fixture.detectChanges();
    const moons = toolbar('Satélite de la Tierra');
    expect(moons?.querySelectorAll('button')).toHaveLength(1);
    expect(chip('luna')?.textContent?.trim()).toBe('Luna');
  });
});
