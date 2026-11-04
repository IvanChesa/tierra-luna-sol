import { NavigationEnd, NavigationStart, type Router } from '@angular/router';
import { pathOf } from './canonical';

/**
 * Lo que hace el sitio al navegar (fase 9), sin listeners en la plantilla (arrastrarían más runtime al
 * bundle inicial) y en un chunk diferido que se pide después de pintar (fase 9b: el código propio del
 * bundle inicial está en su presupuesto, §5 del plan):
 * - el menú del móvil (popover) se cierra: con el router, la página no se recarga;
 * - una página nueva empieza arriba, o en su ancla (la del pie: /sobre-el-proyecto#privacidad). Si
 *   solo cambia la consulta (el lugar de /eclipses), no se mueve; al volver atrás tampoco (el
 *   navegador recupera la posición), ni en la primera navegación. Sin `withInMemoryScrolling`, que
 *   pesa 4 kB en el bundle inicial.
 */
export function followNavigation(router: Router, doc: Document): void {
  let back = false;
  // La ruta de partida: si este chunk llega después de la primera navegación, la siguiente se compara
  // con ella (si solo cambia la consulta, la página no se mueve).
  let path = pathOf(router.url);
  router.events.subscribe((event) => {
    if (event instanceof NavigationStart) back = event.navigationTrigger === 'popstate';
    if (!(event instanceof NavigationEnd)) return;
    const menu = doc.getElementById('site-menu');
    if (menu?.matches(':popover-open')) menu.hidePopover();
    const previous = path;
    path = pathOf(event.urlAfterRedirects);
    const fragment = router.parseUrl(event.urlAfterRedirects).fragment;
    if (back || event.id === 1 || (path === previous && !fragment)) return;
    setTimeout(() => {
      const target = fragment ? doc.getElementById(fragment) : null;
      if (target) target.scrollIntoView();
      else doc.defaultView?.scrollTo(0, 0);
    });
  });
}
