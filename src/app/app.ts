import { Component, DOCUMENT, afterNextRender, inject } from '@angular/core';
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
  protected readonly site = SITE_CONFIG;
  /** La navegación principal; las de `extra`, solo en el menú del móvil. */
  protected readonly links = [
    { path: '/planetas', label: 'Planetas', extra: false },
    { path: '/lunas', label: 'Lunas', extra: false },
    { path: '/sol', label: 'Sol', extra: false },
    { path: '/luna', label: 'Luna', extra: false },
    { path: '/eclipses', label: 'Eclipses', extra: false },
    { path: '/sobre-el-proyecto', label: 'Sobre el proyecto', extra: false },
    { path: '/creditos', label: 'Créditos', extra: true },
  ];

  constructor() {
    const router = inject(Router);
    const doc = inject(DOCUMENT);
    // Al navegar, sin listeners en la plantilla (arrastrarían más runtime al bundle inicial):
    // - el menú del móvil (popover) se cierra: con el router, la página no se recarga;
    // - la página nueva empieza arriba, o en su ancla (la del pie: /sobre-el-proyecto#privacidad). Al
    //   volver atrás no se toca (el navegador recupera la posición), ni en la primera navegación. Sin
    //   `withInMemoryScrolling`, que pesa 4 kB en el bundle inicial.
    afterNextRender(() => {
      let back = false;
      router.events.subscribe((event) => {
        if (event instanceof NavigationStart) back = event.navigationTrigger === 'popstate';
        if (!(event instanceof NavigationEnd)) return;
        const menu = doc.getElementById('site-menu');
        if (menu?.matches(':popover-open')) menu.hidePopover();
        if (back || event.id === 1) return;
        const fragment = router.parseUrl(event.urlAfterRedirects).fragment;
        setTimeout(() => {
          const target = fragment ? doc.getElementById(fragment) : null;
          if (target) target.scrollIntoView();
          else doc.defaultView?.scrollTo(0, 0);
        });
      });
    });
  }
}
