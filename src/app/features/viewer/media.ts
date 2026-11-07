import { DOCUMENT, DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * El teléfono, para el selector de cuerpos (fase 9c, decisión de Iván del 07-11): por debajo, una sola
 * fila (el planeta, una raya y sus lunas); desde aquí (la tableta y el PC), las dos filas de siempre,
 * los planetas abajo y las lunas encima. Es el mismo corte con el que se cuentan los controles: la
 * tableta (768 px), con el PC.
 */
export const PHONE_QUERY = '(max-width: 47.99rem)';

/**
 * Una consulta de medios como signal (el navegador es un sistema externo: se escucha su cambio y se
 * deja de escuchar al destruirse). Sin `matchMedia` (jsdom, el prerenderizado), `false`. Se llama en
 * un contexto de inyección (un inicializador de campo o el constructor).
 */
export function mediaQuery(query: string): Signal<boolean> {
  const win = inject(DOCUMENT).defaultView;
  const list = typeof win?.matchMedia === 'function' ? win.matchMedia(query) : null;
  const matches = signal(list?.matches ?? false);
  if (list && typeof list.addEventListener === 'function') {
    const update = (event: MediaQueryListEvent) => matches.set(event.matches);
    list.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', update));
  }
  return matches.asReadonly();
}
