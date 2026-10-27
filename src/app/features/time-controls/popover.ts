/**
 * «Controles +» es un `popover` del navegador (Chrome y Edge 114, Safari 17, Firefox 125). Donde no
 * existe, `:popover-open` no es un selector válido y `matches()` lanzaría: estas comprobaciones nunca
 * lanzan y, sin `popover`, el panel se da por cerrado (el CSS lo oculta: time-menu.css).
 */

/** ¿Está abierto el panel? Sin `popover` en el navegador, nunca. */
export function isPopoverOpen(element: Element | null | undefined): boolean {
  if (!(element instanceof HTMLElement) || typeof element.showPopover !== 'function') return false;
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
}

/** Cierra el panel si está abierto (y el navegador devuelve el foco a su botón). */
export function closePopover(element: Element | null | undefined): void {
  if (isPopoverOpen(element)) (element as HTMLElement).hidePopover();
}
