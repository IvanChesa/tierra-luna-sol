import { Location } from '@angular/common';
import { Component, DOCUMENT, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { pathOf } from './core/canonical';
import { SITE_CONFIG } from './core/site.config';
import { ExplorerFocus } from './core/explorer-focus';

@Component({
  selector: 'tls-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
})
export class App {
  private readonly location = inject(Location);
  protected readonly site = SITE_CONFIG;
  /**
   * El cuerpo elegido en el explorador: en el móvil y la tableta, la cabecera es entonces una sola
   * franja, con «‹ Sistema solar», su nombre y «Menú» (decisión de Iván del 08-11; styles.css).
   */
  protected readonly focus = inject(ExplorerFocus);
  /**
   * La navegación (fase 9c, decisión 2 de Iván): las páginas de lectura y «Explorar en 3D», la portada
   * del explorador. El cielo es una de sus vistas (sus pestañas); la Luna, la primera de /lunas
   * (decisión del 03-11). Los créditos y lo legal, aparte, en el menú (app.html).
   */
  protected readonly links = [
    { path: '/planetas', label: 'Planetas' },
    { path: '/lunas', label: 'Lunas' },
    { path: '/sol', label: 'Sol' },
    { path: '/eclipses', label: 'Eclipses' },
    { path: '/sobre-el-proyecto', label: 'Sobre el proyecto' },
    { path: '/', label: 'Explorar en 3D' },
  ];

  /**
   * «Saltar al contenido», con la URL de la página delante del ancla, su consulta incluida. Con
   * `<base href="/">`, un «#contenido» suelto se resuelve contra la portada (revisión de la fase 9,
   * hallazgo 1), y sin la consulta sería otra URL: desde `/cielo?lugar=teide`, `/cielo#contenido`
   * carga otro documento y vuelve al Montsec (segunda ronda, hallazgo 21). Sale de `Location`, que
   * conoce la URL antes de la primera navegación: al prerenderizar (funciona sin JavaScript) y al
   * hidratar, sin apuntar a la portada mientras llega el chunk de la página.
   */
  protected readonly skipHref = signal(this.contentHref());
  /**
   * La ruta de la página (sin consulta ni ancla), para marcar su enlace del menú: el de su sección
   * también en sus páginas hijas (/lunas en /lunas/titan) y, en /luna, «Lunas» (la Luna es la primera
   * de /lunas; decisión de Iván del 04-11). Sin `RouterLinkActive`, que no sabe de esa excepción.
   */
  protected readonly path = signal(pathOf(this.location.path()));

  constructor() {
    const router = inject(Router);
    const doc = inject(DOCUMENT);
    // También cuando el explorador escribe su estado en la URL (con el router).
    router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd)) return;
      this.skipHref.set(this.contentHref());
      this.path.set(pathOf(event.urlAfterRedirects));
    });
    // El menú del móvil y el desplazamiento al navegar, después de pintar y fuera del bundle inicial
    // (`core/navigation-effects.ts`); si la app ya no existe cuando llega, nada.
    const destroyRef = inject(DestroyRef);
    let alive = true;
    destroyRef.onDestroy(() => (alive = false));
    afterNextRender(() => {
      void import('./core/navigation-effects').then((m) => {
        if (!alive) return;
        const subscription = m.followNavigation(router, doc);
        destroyRef.onDestroy(() => subscription.unsubscribe());
      });
    });
  }

  /** ¿Es la de `link` la sección de la página? «Explorar en 3D», en las cuatro vistas del explorador. */
  protected current(link: string): boolean {
    const path = this.path();
    if (link === '/') return /^\/(explorar\/|cielo$|$)/.test(path);
    return path === link || path.startsWith(`${link}/`) || (link === '/lunas' && path === '/luna');
  }

  /** La URL que se ve (la ruta y la consulta, sin el ancla), con el ancla del contenido. */
  private contentHref(): string {
    return `${this.location.prepareExternalUrl(this.location.path())}#contenido`;
  }
}
