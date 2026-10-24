import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerStore } from '../../state/explorer.store';
import { SystemPositions } from '../../state/positions';
import { SimulationStore } from '../../state/simulation.store';
import { ExplorerSession } from '../explorer-ui/explorer-session';
import { BodyPicker } from './body-picker';

function render() {
  window.history.replaceState({}, '', '/?fecha=2026-10-24T00:00Z');
  TestBed.configureTestingModule({
    imports: [BodyPicker],
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      SimulationStore,
      ExplorerStore,
      SystemPositions,
      ExplorerSession,
    ],
  });
  TestBed.inject(ExplorerStore).connectView(signal('system'));
  const fixture = TestBed.createComponent(BodyPicker);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const item = (id: string) => root.querySelector<HTMLElement>(`#tree-${id}`);
  const key = (id: string, key: string) => {
    item(id)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, root, item, key, sim: TestBed.inject(SimulationStore) };
}

describe('BodyPicker: índice de cuerpos como árbol accesible', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('un árbol con el Sol y los planetas, una sola parada de tabulación y las distancias de hoy', () => {
    const { root, item } = render();
    const tree = root.querySelector('[role="tree"]');
    expect(tree?.getAttribute('aria-labelledby')).toBe('index-title');
    const top = root.querySelectorAll('[role="tree"] > [role="treeitem"]');
    expect(top).toHaveLength(9);
    expect(
      [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')].filter(
        (el) => el.tabIndex === 0,
      ),
    ).toHaveLength(1);
    expect(item('saturno')?.getAttribute('aria-expanded')).toBe('false');
    expect(item('venus')?.hasAttribute('aria-expanded')).toBe(false);
    // El nombre accesible es solo el nombre; la distancia, la descripción.
    expect(item('saturno')?.getAttribute('aria-labelledby')).toBe('tree-saturno-name');
    const value = root.querySelector('#tree-saturno-value')?.textContent ?? '';
    expect(value.replace(/\s/g, ' ')).toMatch(/^\d+,\d\d UA$/);
  });

  it('flechas, Inicio y Fin recorren las filas; derecha abre las lunas e izquierda vuelve', () => {
    const { item, key } = render();
    item('sol')?.focus();
    key('sol', 'ArrowDown');
    expect(document.activeElement?.id).toBe('tree-mercurio');
    key('mercurio', 'End');
    expect(document.activeElement?.id).toBe('tree-neptuno');
    key('neptuno', 'Home');
    expect(document.activeElement?.id).toBe('tree-sol');
    item('jupiter')?.focus();
    key('jupiter', 'ArrowRight');
    expect(item('jupiter')?.getAttribute('aria-expanded')).toBe('true');
    key('jupiter', 'ArrowRight');
    expect(document.activeElement?.id).toBe('tree-io');
    key('io', 'ArrowLeft');
    expect(document.activeElement?.id).toBe('tree-jupiter');
    key('jupiter', 'ArrowLeft');
    expect(item('jupiter')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('Intro elige el cuerpo: queda seleccionado y su sistema se abre solo', () => {
    const { item, key, sim } = render();
    item('saturno')?.focus();
    key('saturno', 'Enter');
    expect(sim.selectedBodyId()).toBe('saturno');
    expect(item('saturno')?.getAttribute('aria-selected')).toBe('true');
    expect(item('saturno')?.getAttribute('aria-expanded')).toBe('true');
    expect(item('titan')).not.toBeNull();
  });

  it('un clic en el triángulo abre o cierra las lunas sin elegir el planeta', () => {
    const { root, item, fixture, sim } = render();
    root.querySelector<HTMLElement>('#tree-marte .row__toggle')?.click();
    fixture.detectChanges();
    expect(item('marte')?.getAttribute('aria-expanded')).toBe('true');
    expect(sim.selectedBodyId()).toBeNull();
    root.querySelector<HTMLElement>('#tree-fobos .row')?.click();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBe('fobos');
  });
});
