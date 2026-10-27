import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ExplorerView } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { ExplorerUi } from './explorer-ui';

/** Sustituto del lienzo: los atajos no necesitan WebGL. */
@Component({ selector: 'tls-viewer-canvas', template: '' })
class FakeCanvas {
  readonly view = input.required<ExplorerView>();
  readonly ready = output<void>();
}

async function render() {
  window.history.replaceState({}, '', '/?fecha=2030-01-01T00:00Z&cuerpo=marte');
  TestBed.configureTestingModule({
    imports: [ExplorerUi],
    providers: [provideRouter([{ path: '**', children: [] }])],
  });
  TestBed.overrideComponent(ExplorerUi, {
    remove: { imports: [ViewerCanvas] },
    add: { imports: [FakeCanvas] },
  });
  const fixture = TestBed.createComponent(ExplorerUi);
  fixture.componentRef.setInput('view', 'system');
  fixture.detectChanges();
  await fixture.whenStable();
  const injector = fixture.debugElement.injector;
  const sim = injector.get(SimulationStore);
  const explorer = injector.get(ExplorerStore);
  const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    fixture.detectChanges();
  };
  return { fixture, sim, explorer, press, host: fixture.nativeElement as HTMLElement };
}

describe('ExplorerUi: atajos de teclado del explorador', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    window.localStorage.removeItem('tls.atajos');
  });

  it('K reproduce y pausa; «,» y «.» cambian de escalón; R invierte; N vuelve a ahora', async () => {
    const { sim, press } = await render();
    press('k');
    expect(sim.playing()).toBe(true);
    press('K');
    expect(sim.playing()).toBe(false);
    // Desde la velocidad de entrada (3 horas por segundo, D31), un escalón arriba y otro abajo.
    press('.');
    expect(sim.speed()).toBe(86_400);
    press(',');
    expect(sim.speed()).toBe(3 * 3600);
    press('r');
    expect(sim.reverse()).toBe(true);
    press('n');
    expect(sim.speed()).toBe(1);
    expect(sim.playing()).toBe(true);
    sim.pause();
  });

  it('? abre el diálogo de atajos; V oculta la interfaz y Esc la recupera; Esc cierra la ficha', async () => {
    const { explorer, press, host } = await render();
    press('?', { shiftKey: true });
    expect(explorer.helpOpen()).toBe(true);
    explorer.helpOpen.set(false);
    press('v');
    expect(explorer.cleanView()).toBe(true);
    expect(host.classList.contains('is-clean')).toBe(true);
    expect(host.querySelector('.restore')).not.toBeNull();
    press('Escape');
    expect(explorer.cleanView()).toBe(false);
    expect(explorer.panelOpen()).toBe(true); // marte, de la URL
    press('Escape');
    expect(explorer.panelOpen()).toBe(false);
  });

  it('los números cambian de vista sin recrear nada (navegan a la ruta de la vista)', async () => {
    const { press } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    press('2');
    expect(navigate).toHaveBeenCalledWith(['/explorar/tierra'], {
      queryParamsHandling: 'preserve',
    });
    press('1'); // ya está en la vista del sistema solar: no hace nada
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('se pueden desactivar en el diálogo (WCAG 2.1.4): entonces solo queda Esc', async () => {
    const { sim, explorer, press, host, fixture } = await render();
    const option = host.querySelector<HTMLInputElement>('.dialog__option input');
    expect(option?.checked).toBe(true);
    option?.click();
    fixture.detectChanges();
    expect(explorer.singleKeyShortcuts()).toBe(false);
    expect(window.localStorage.getItem('tls.atajos')).toBe('no');
    press('k');
    expect(sim.playing()).toBe(false);
    press('Escape');
    expect(explorer.panelOpen()).toBe(false);
    option?.click();
    fixture.detectChanges();
    expect(window.localStorage.getItem('tls.atajos')).toBeNull();
    press('k');
    expect(sim.playing()).toBe(true);
    sim.pause();
  });

  it('no actúan con el foco en un campo de texto ni con Ctrl, Cmd o Alt', async () => {
    const { sim, press, host } = await render();
    const date = host.querySelector<HTMLInputElement>('#time-date');
    press('k', {}, date as HTMLInputElement);
    expect(sim.playing()).toBe(false);
    press('k', { ctrlKey: true });
    expect(sim.playing()).toBe(false);
  });

  it('la región aria-live está en la página desde el principio y anuncia lo que se elige', async () => {
    const { host, fixture } = await render();
    const live = host.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    host.querySelector<HTMLElement>('#tree-saturno .row')?.click();
    fixture.detectChanges();
    expect(live?.textContent).toContain('Saturno, planeta.');
  });
});
