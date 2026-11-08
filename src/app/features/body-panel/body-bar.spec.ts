import { TestBed } from '@angular/core/testing';
import { BodyBar } from './body-bar';

/** La barra, con su nombre y su línea; los cambios de la hoja y el cierre, apuntados. */
function render() {
  const fixture = TestBed.createComponent(BodyBar);
  fixture.componentRef.setInput('name', 'Saturno');
  fixture.componentRef.setInput('meta', 'Planeta · Radio ecuatorial: 60.268 km');
  fixture.detectChanges();
  const bar = fixture.componentInstance;
  let closed = 0;
  bar.closed.subscribe(() => closed++);
  const root = fixture.nativeElement as HTMLElement;
  const toggle = root.querySelector<HTMLButtonElement>('.bar__toggle');
  if (!toggle) throw new Error('Sin barra');
  const swipe = (from: number, to: number) => {
    toggle.dispatchEvent(new PointerEvent('pointerdown', { clientY: from, bubbles: true }));
    toggle.dispatchEvent(new PointerEvent('pointerup', { clientY: to, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, bar, root, toggle, swipe, closed: () => closed };
}

describe('BodyBar: la barra fina de la ficha en el móvil (decisión de Iván del 08-11)', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [BodyBar] }));

  it('es un botón con aria-expanded que abre y cierra la hoja, también con el teclado', () => {
    const { fixture, bar, toggle } = render();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain('Ver ficha');
    // Intro o Espacio (un clic sin puntero: `detail` 0).
    toggle.click();
    fixture.detectChanges();
    expect(bar.open()).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('Ver menos');
    toggle.click();
    fixture.detectChanges();
    expect(bar.open()).toBe(false);
  });

  it('deslizarla hacia arriba abre la hoja y, hacia abajo, la cierra; cerrada, cierra la ficha', () => {
    const { bar, swipe, closed } = render();
    swipe(500, 440);
    expect(bar.open()).toBe(true);
    swipe(400, 500);
    expect(bar.open()).toBe(false);
    expect(closed()).toBe(0);
    swipe(400, 500);
    expect(closed()).toBe(1);
    // Un gesto corto es un toque: no abre ni cierra (lo hace su clic).
    swipe(500, 480);
    expect(bar.open()).toBe(false);
  });

  it('el clic que sigue a un gesto no deshace lo que ha hecho; el del teclado sí cuenta', () => {
    const { fixture, bar, toggle, swipe } = render();
    swipe(500, 440);
    toggle.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    fixture.detectChanges();
    expect(bar.open()).toBe(true);
    toggle.click();
    fixture.detectChanges();
    expect(bar.open()).toBe(false);
  });

  it('× cierra la ficha', () => {
    const { root, closed } = render();
    root.querySelector<HTMLButtonElement>('.bar__close')?.click();
    expect(closed()).toBe(1);
  });
});
