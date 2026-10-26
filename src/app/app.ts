import { Component, DOCUMENT, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SITE_CONFIG } from './core/site.config';

@Component({
  selector: 'tls-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly site = SITE_CONFIG;

  constructor() {
    const router = inject(Router);
    const doc = inject(DOCUMENT);
    // El menú del móvil (popover) se cierra al navegar: con el router, la página no se recarga. Sin
    // listeners en la plantilla, que arrastrarían más runtime al bundle inicial.
    afterNextRender(() => {
      router.events.subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;
        const menu = doc.getElementById('site-menu');
        if (menu?.matches(':popover-open')) menu.hidePopover();
      });
    });
  }
}
