import { Location } from '@angular/common';
import { Component, DOCUMENT, afterNextRender, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { SITE_CONFIG } from './core/site.config';

@Component({
  selector: 'tls-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly location = inject(Location);
  protected readonly site = SITE_CONFIG;
  /**
   * La navegación principal; las de `extra`, solo en el menú del móvil. «Cielo» en lugar de «Luna»
   * (decisión de Iván del 03-11): la Luna, la primera de /lunas.
   */
  protected readonly links = [
    { path: '/planetas', label: 'Planetas', extra: false },
    { path: '/lunas', label: 'Lunas', extra: false },
    { path: '/sol', label: 'Sol', extra: false },
    { path: '/cielo', label: 'Cielo', extra: false },
    { path: '/eclipses', label: 'Eclipses', extra: false },
    { path: '/sobre-el-proyecto', label: 'Sobre el proyecto', extra: false },
    { path: '/creditos', label: 'Créditos', extra: true },
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

  constructor() {
    const router = inject(Router);
    const doc = inject(DOCUMENT);
    // También cuando el explorador escribe su estado en la URL (con el router).
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.skipHref.set(this.contentHref());
    });
    // Al navegar, sin listeners en la plantilla (arrastrarían más runtime al bundle inicial):
    // - el menú del móvil (popover) se cierra: con el router, la página no se recarga;
    // - una página nueva empieza arriba, o en su ancla (la del pie: /sobre-el-proyecto#privacidad). Si
    //   solo cambia la consulta (el lugar de /eclipses), no se mueve; al volver atrás tampoco (el
    //   navegador recupera la posición), ni en la primera navegación. Sin `withInMemoryScrolling`, que
    //   pesa 4 kB en el bundle inicial.
    afterNextRender(() => {
      let back = false;
      let path = '';
      router.events.subscribe((event) => {
        if (event instanceof NavigationStart) back = event.navigationTrigger === 'popstate';
        if (!(event instanceof NavigationEnd)) return;
        const menu = doc.getElementById('site-menu');
        if (menu?.matches(':popover-open')) menu.hidePopover();
        const previous = path;
        path = event.urlAfterRedirects.split(/[?#]/)[0] ?? '';
        const fragment = router.parseUrl(event.urlAfterRedirects).fragment;
        if (back || event.id === 1 || (path === previous && !fragment)) return;
        setTimeout(() => {
          const target = fragment ? doc.getElementById(fragment) : null;
          if (target) target.scrollIntoView();
          else doc.defaultView?.scrollTo(0, 0);
        });
      });
    });
  }

  /** La URL que se ve (la ruta y la consulta, sin el ancla), con el ancla del contenido. */
  private contentHref(): string {
    return `${this.location.prepareExternalUrl(this.location.path())}#contenido`;
  }
}
