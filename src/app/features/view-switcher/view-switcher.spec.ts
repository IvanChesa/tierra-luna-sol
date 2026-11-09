import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ExplorerFocus, FocusTitle } from '../../core/explorer-focus';
import type { ExplorerView } from '../../scene';
import { ViewSwitcher } from './view-switcher';

describe('ViewSwitcher: «Sistema solar» con un cuerpo elegido (revisión del bloque S, S9)', () => {
  const marte: FocusTitle = { id: 'marte', name: 'Marte', kind: 'Planeta' };

  async function render(view: ExplorerView, body: FocusTitle | null) {
    TestBed.configureTestingModule({
      imports: [ViewSwitcher],
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    await TestBed.inject(Router).navigateByUrl('/?fecha=2030-01-01T00:00Z&cuerpo=marte');
    const focus = TestBed.inject(ExplorerFocus);
    focus.connect(signal(body));
    const back = vi.fn();
    focus.setBackHandler(back);
    const fixture = TestBed.createComponent(ViewSwitcher);
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    await fixture.whenStable();
    const link = (label: string) =>
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a')].find(
        (a) => a.textContent?.trim() === label,
      ) as HTMLAnchorElement;
    return { fixture, back, link };
  }

  it('vuelve a la vista general, como «‹ Sistema solar», y su dirección es la de la vista general sin el cuerpo', async () => {
    const { back, link } = await render('system', marte);
    const system = link('Sistema solar');
    expect(system.getAttribute('aria-current')).toBe('page');
    expect(system.getAttribute('href')).toBe('/?fecha=2030-01-01T00:00Z');
    // Abrirla en otra pestaña no cambia esta.
    system.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
    );
    expect(back).not.toHaveBeenCalled();
    system.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(back).toHaveBeenCalledTimes(1);
    // Las demás vistas conservan los parámetros, como siempre.
    expect(link('Tierra').getAttribute('href')).toBe(
      '/explorar/tierra?fecha=2030-01-01T00:00Z&cuerpo=marte',
    );
  });

  it('sin cuerpo elegido, o desde otra vista, es un enlace como los demás', async () => {
    const overview = await render('system', null);
    overview.link('Sistema solar').click();
    expect(overview.back).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    const earth = await render('earth', marte);
    expect(earth.link('Sistema solar').getAttribute('href')).toBe(
      '/?fecha=2030-01-01T00:00Z&cuerpo=marte',
    );
    expect(earth.link('Sistema solar').getAttribute('aria-current')).toBeNull();
    earth.link('Sistema solar').click();
    expect(earth.back).not.toHaveBeenCalled();
  });
});
