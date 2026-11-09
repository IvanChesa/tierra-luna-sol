import { Directive, ElementRef, inject } from '@angular/core';

/** El fundido del borde derecho de las filas que se desplazan (`.scroll-hint`, 2 rem), en px CSS. */
export const SCROLL_FADE_PX = 32;

/**
 * Desplaza solo su fila (en horizontal) hasta que se vea entero el elemento, también fuera del fundido
 * de su borde derecho mientras quede algo por ver (`.scroll-hint`). Con `scrollIntoView` se moverían
 * los contenedores de fuera y, en las pantallas bajas, la página entera; y Chromium, al enfocar, solo
 * desplaza si el elemento está entero fuera: si asoma algo, se queda casi oculto (crítica de la fase
 * 10: «Luz rasante», enfocado bajo el fundido en el móvil).
 */
export function revealInRow(row: HTMLElement, target: HTMLElement, fadePx = SCROLL_FADE_PX): void {
  if (row.scrollWidth <= row.clientWidth) return;
  const box = row.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const left = box.left + row.clientLeft;
  // Mientras quede algo por ver a la derecha, el fundido tapa su borde.
  const more = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
  const right = left + row.clientWidth - (more ? fadePx : 0);
  let dx = 0;
  if (rect.left < left) dx = rect.left - left;
  else if (rect.right > right) dx = rect.right - right;
  if (dx !== 0) row.scrollBy?.({ left: dx });
}

/**
 * En una fila que se desplaza, el elemento que recibe el foco se ve entero (`revealInRow`): las vistas
 * de la Tierra y de la Luna en el móvil.
 */
@Directive({
  selector: '[tlsRevealFocus]',
  host: { '(focusin)': 'onFocus($event)' },
})
export class RevealFocus {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onFocus(event: FocusEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target !== this.host.nativeElement) {
      revealInRow(this.host.nativeElement, target);
    }
  }
}
