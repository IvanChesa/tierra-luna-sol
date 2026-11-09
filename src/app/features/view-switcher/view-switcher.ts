import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExplorerFocus } from '../../core/explorer-focus';
import type { ExplorerView } from '../../scene';

interface ViewLink {
  readonly view: ExplorerView;
  readonly path: string;
  readonly label: string;
}

/** Las vistas del explorador: el sistema solar, la Tierra, la Luna y el cielo desde España (fase 8). */
export const VIEW_LINKS: readonly ViewLink[] = [
  { view: 'system', path: '/', label: 'Sistema solar' },
  { view: 'earth', path: '/explorar/tierra', label: 'Tierra' },
  { view: 'moon', path: '/explorar/luna', label: 'Luna' },
  { view: 'sky', path: '/cielo', label: 'Cielo' },
];

/**
 * Selector de vista (PLAN 3.c.8): enlaces normales a las rutas de cada vista, así que funciona sin
 * JavaScript y se prerenderiza. Cambiar de vista no recrea el motor: el layout lo conserva y el
 * viaje de cámara lo hace el motor. Los parámetros de la URL se conservan (la fecha, la escala).
 *
 * Con un cuerpo elegido en la vista del sistema solar, «Sistema solar» hace lo mismo que
 * «‹ Sistema solar»: vuelve a la vista general (revisión del bloque S, S9; antes, ya en esa vista, no
 * hacía nada). Su dirección es la de la vista general, sin el cuerpo (abrirla en otra pestaña también
 * vale).
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
          [queryParams]="backs(link) ? withoutBody : null"
          queryParamsHandling="merge"
          [attr.aria-current]="link.view === view() ? 'page' : null"
          (click)="clicked($event, link)"
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
      background: color-mix(in srgb, var(--color-bg) 70%, transparent);
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
  /** La dirección de la vista general sin el cuerpo elegido (los demás parámetros, como estén). */
  protected readonly withoutBody = { cuerpo: null };
  private readonly focus = inject(ExplorerFocus);

  /** Si ese enlace, ahora, vuelve a la vista general (S9): «Sistema solar» con un cuerpo elegido. */
  protected backs(link: ViewLink): boolean {
    return link.view === 'system' && this.view() === 'system' && this.focus.body() !== null;
  }

  /**
   * Un clic normal (no el de abrir en otra pestaña) en «Sistema solar» con un cuerpo elegido: lo que
   * hace «‹ Sistema solar» (la vista general y el foco en la ficha del cuerpo; `ExplorerFocus`). El
   * enlace, además, quita el cuerpo de la dirección.
   */
  protected clicked(event: MouseEvent, link: ViewLink): void {
    const plain =
      event.button === 0 && !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey);
    if (plain && this.backs(link)) this.focus.back();
  }
}
