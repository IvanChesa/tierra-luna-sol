import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ExplorerView } from '../../scene';

interface ViewLink {
  readonly view: ExplorerView;
  readonly path: string;
  readonly label: string;
}

/** Las vistas del explorador (el cielo desde España llega en la fase 8). */
export const VIEW_LINKS: readonly ViewLink[] = [
  { view: 'system', path: '/', label: 'Sistema solar' },
  { view: 'earth', path: '/explorar/tierra', label: 'Tierra' },
  { view: 'moon', path: '/explorar/luna', label: 'Luna' },
];

/**
 * Selector de vista (PLAN 3.c.8): enlaces normales a las rutas de cada vista, así que funciona sin
 * JavaScript y se prerenderiza. Cambiar de vista no recrea el motor: el layout lo conserva y el
 * viaje de cámara lo hace el motor. Los parámetros de la URL se conservan (la fecha, la escala).
 */
@Component({
  selector: 'tls-view-switcher',
  imports: [RouterLink],
  template: `
    <nav class="views" aria-label="Vistas del explorador">
      @for (link of links; track link.view) {
        <a
          class="views__link"
          [routerLink]="link.path"
          queryParamsHandling="preserve"
          [attr.aria-current]="link.view === view() ? 'page' : null"
          >{{ link.label }}</a
        >
      }
    </nav>
  `,
  styles: `
    .views {
      display: flex;
      width: fit-content;
      max-width: 100%;
      padding: 2px;
      border: var(--border-width) solid var(--color-control);
      border-radius: var(--radius-md);
    }

    .views__link {
      display: inline-flex;
      flex: 1 1 auto;
      align-items: center;
      justify-content: center;
      min-height: 2.25rem;
      padding: 0 var(--space-3);
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-strong);
      text-decoration: none;
      white-space: nowrap;
      transition: color var(--duration-fast) var(--ease-standard);
    }

    .views__link:hover {
      color: var(--color-text);
    }

    /* La vista actual: fondo, texto claro y un subrayado en acento (no solo el color). */
    .views__link[aria-current='page'] {
      background: var(--color-surface-raised);
      color: var(--color-text);
      box-shadow: inset 0 -2px 0 var(--color-accent);
    }

    @media (pointer: coarse) {
      .views__link {
        min-height: var(--tap-target);
      }
    }
  `,
})
export class ViewSwitcher {
  readonly view = input.required<ExplorerView>();
  protected readonly links = VIEW_LINKS;
}
