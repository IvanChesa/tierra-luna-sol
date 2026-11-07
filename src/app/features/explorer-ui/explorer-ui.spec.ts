import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ExplorerView } from '../../scene';
import { ExplorerStore } from '../../state/explorer.store';
import { SimulationStore } from '../../state/simulation.store';
import { ViewerCanvas } from '../viewer/viewer-canvas';
import { ExplorerFocus } from './explorer-focus';
import { ExplorerUi, PRESENTATION_FOLD_MS } from './explorer-ui';

/** Sustituto del lienzo: los atajos no necesitan WebGL. */
@Component({ selector: 'tls-viewer-canvas', template: '' })
class FakeCanvas {
  readonly view = input.required<ExplorerView>();
  readonly ready = output<void>();
}

async function render(search = '?fecha=2030-01-01T00:00Z&cuerpo=marte') {
  window.history.replaceState({}, '', `/${search}`);
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
    // Desde la velocidad de entrada con Marte enfocado (1 hora por segundo, D33), un escalón arriba y
    // otro abajo.
    press('.');
    expect(sim.speed()).toBe(3 * 3600);
    press(',');
    expect(sim.speed()).toBe(3600);
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

describe('ExplorerUi: panel «Índice» y texto de presentación (fase 3c)', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('el índice está cerrado al entrar; su botón lo abre con el foco en el árbol y lo cierra', async () => {
    const { explorer, host, fixture } = await render();
    const toggle = host.querySelector<HTMLButtonElement>('.index-toggle');
    const panel = host.querySelector<HTMLElement>('#explorer-index');
    expect(explorer.indexOpen()).toBe(false);
    expect(panel?.hidden).toBe(true);
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-controls')).toBe('explorer-index');

    toggle?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel?.hidden).toBe(false);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    // El foco entra en la fila que es la parada del árbol (la del cuerpo elegido: Marte).
    expect(document.activeElement?.id).toBe('tree-marte');

    toggle?.click();
    fixture.detectChanges();
    expect(explorer.indexOpen()).toBe(false);
    expect(panel?.hidden).toBe(true);
  });

  it('I lo abre y lo cierra; Esc con el foco dentro cierra el índice antes que la ficha', async () => {
    const { explorer, press, host, fixture } = await render();
    press('i');
    await fixture.whenStable();
    expect(explorer.indexOpen()).toBe(true);
    press('i');
    expect(explorer.indexOpen()).toBe(false);

    press('i');
    await fixture.whenStable();
    const row = host.querySelector<HTMLElement>('#tree-marte');
    press('Escape', {}, row as HTMLElement);
    expect(explorer.indexOpen()).toBe(false);
    expect(explorer.panelOpen()).toBe(true); // la ficha de Marte, de la URL, sigue
    // Con el foco fuera (en el botón «Índice»), Esc cierra antes la ficha y después el índice.
    explorer.indexOpen.set(true);
    host.querySelector<HTMLElement>('.index-toggle')?.focus();
    press('Escape');
    expect(explorer.panelOpen()).toBe(false);
    expect(explorer.indexOpen()).toBe(true);
    press('Escape');
    expect(explorer.indexOpen()).toBe(false);
    // Su botón de cerrar también.
    explorer.indexOpen.set(true);
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('[aria-label="Cerrar el índice"]')?.click();
    expect(explorer.indexOpen()).toBe(false);
  });

  it('en móvil (hoja inferior), elegir en el índice lo cierra y abre la ficha', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('max-width'),
        media: query,
      }) as MediaQueryList) as typeof window.matchMedia;
    try {
      const { explorer, host, fixture, sim } = await render('?fecha=2030-01-01T00:00Z');
      explorer.indexOpen.set(true);
      fixture.detectChanges();
      host.querySelector<HTMLElement>('#tree-venus .row')?.click();
      fixture.detectChanges();
      expect(sim.selectedBodyId()).toBe('venus');
      expect(explorer.panelOpen()).toBe(true);
      expect(explorer.indexOpen()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('en escritorio, elegir en el índice lo deja abierto (la ficha va a la derecha)', async () => {
    const { explorer, host, fixture, sim } = await render('?fecha=2030-01-01T00:00Z');
    explorer.indexOpen.set(true);
    fixture.detectChanges();
    host.querySelector<HTMLElement>('#tree-venus .row')?.click();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBe('venus');
    expect(explorer.indexOpen()).toBe(true);
  });

  it('el texto de presentación se pliega al usar el explorador o al elegir un cuerpo', async () => {
    const plain = await render('?fecha=2030-01-01T00:00Z');
    expect(plain.host.classList.contains('is-interacted')).toBe(false);
    // Moverse con el tabulador no cuenta; una tecla o un clic, sí.
    plain.press('Tab');
    expect(plain.host.classList.contains('is-interacted')).toBe(false);
    plain.host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    plain.fixture.detectChanges();
    expect(plain.host.classList.contains('is-interacted')).toBe(true);
    TestBed.resetTestingModule();

    // Con un cuerpo en el enlace, la ficha está abierta: plegado desde el principio.
    const chosen = await render();
    expect(chosen.host.classList.contains('is-interacted')).toBe(true);
  });

  it('a los pocos segundos de llegar, la presentación se pliega sola (fase 9c)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { host, fixture } = await render('?fecha=2030-01-01T00:00Z');
      expect(host.classList.contains('is-interacted')).toBe(false);
      vi.advanceTimersByTime(PRESENTATION_FOLD_MS);
      fixture.detectChanges();
      expect(host.classList.contains('is-interacted')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('las pistas de uso, solo la primera vez: al plegarse la presentación no vuelven (fase 9c)', async () => {
    window.localStorage.removeItem('tls.pistas');
    try {
      const first = await render('?fecha=2030-01-01T00:00Z');
      expect(first.host.classList.contains('shows-hints')).toBe(true);
      first.host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      first.fixture.detectChanges();
      expect(window.localStorage.getItem('tls.pistas')).toBe('visto');
      TestBed.resetTestingModule();

      const again = await render('?fecha=2030-01-01T00:00Z');
      expect(again.host.classList.contains('shows-hints')).toBe(false);
    } finally {
      window.localStorage.removeItem('tls.pistas');
    }
  });

  it('el título sigue al cuerpo elegido, con «‹ Sistema solar» para volver (fase 9c)', async () => {
    const { fixture, sim } = await render();
    const focus = TestBed.inject(ExplorerFocus);
    expect(focus.body()).toEqual({ id: 'marte', name: 'Marte', kind: 'Planeta' });
    expect(document.title).toBe('Marte · Tierra Luna Sol');
    sim.select('titan');
    fixture.detectChanges();
    expect(focus.body()).toEqual({ id: 'titan', name: 'Titán', kind: 'Luna de Saturno' });
    // «‹ Sistema solar»: la vista general, sin cuerpo en el título.
    focus.back();
    fixture.detectChanges();
    expect(sim.selectedBodyId()).toBeNull();
    expect(focus.body()).toBeNull();
    // Al salir del explorador, el título no se queda con un cuerpo.
    sim.select('jupiter');
    fixture.detectChanges();
    fixture.destroy();
    expect(focus.body()).toBeNull();
  });

  it('la portada puede leer el título antes de que la interfaz tenga su vista (sin NG0950)', async () => {
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
    const focus = TestBed.inject(ExplorerFocus);
    // Creada, sin la entrada `view` todavía: el título sin cuerpo, sin error.
    expect(focus.body()).toBeNull();
    fixture.componentRef.setInput('view', 'system');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(focus.body()?.id).toBe('marte');
  });

  it('las vistas Tierra y Luna van sin Índice; con un cuerpo, sin título de cuerpo', async () => {
    const { fixture, host, sim } = await render();
    fixture.componentRef.setInput('view', 'earth');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.classList.contains('is-detail')).toBe(true);
    expect(host.classList.contains('no-index')).toBe(true);
    expect(TestBed.inject(ExplorerFocus).body()).toBeNull();
    // En el PC, la fila de lunas encima de la de los planetas también aquí: la Luna, con la Tierra.
    sim.reflectSelection('tierra');
    fixture.detectChanges();
    expect(host.classList.contains('has-moons')).toBe(true);
    sim.reflectSelection(null);
    fixture.detectChanges();
    expect(host.classList.contains('has-moons')).toBe(false);
  });

  it('la ficha del móvil, de dos alturas: el tirador la sube, la baja y, abajo, la cierra', async () => {
    const { fixture, host, explorer } = await render();
    const panel = host.querySelector<HTMLElement>('.panel');
    const grip = host.querySelector<HTMLElement>('.panel__grip');
    if (!panel || !grip) throw new Error('Sin ficha');
    const drag = (from: number, to: number) => {
      grip.dispatchEvent(new PointerEvent('pointerdown', { clientY: from, bubbles: true }));
      grip.dispatchEvent(new PointerEvent('pointerup', { clientY: to, bubbles: true }));
      fixture.detectChanges();
    };
    expect(panel.classList.contains('is-expanded')).toBe(false);
    drag(500, 400);
    expect(panel.classList.contains('is-expanded')).toBe(true);
    expect(host.classList.contains('is-sheet-expanded')).toBe(true);
    drag(400, 520);
    expect(panel.classList.contains('is-expanded')).toBe(false);
    expect(explorer.panelOpen()).toBe(true);
    drag(400, 520);
    expect(explorer.panelOpen()).toBe(false);
  });
});
