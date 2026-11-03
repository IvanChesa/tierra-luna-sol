import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Un paso de las migas de pan: con enlace, salvo el último (la página en la que estás). */
export interface Crumb {
  readonly label: string;
  readonly link?: string;
}

/** Migas de pan de las fichas y sus índices (fase 9): «Inicio › Planetas › Marte». */
@Component({
  selector: 'tls-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav class="crumbs" aria-label="Migas de pan">
      <ol>
        @for (crumb of crumbs(); track crumb.label; let last = $last) {
          <li>
            @if (crumb.link && !last) {
              <a [routerLink]="crumb.link">{{ crumb.label }}</a>
            } @else {
              <span aria-current="page">{{ crumb.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-2);
      margin: 0 0 var(--space-6);
      padding: 0;
      list-style: none;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    li + li::before {
      content: '›';
      margin-right: var(--space-2);
      color: var(--color-text-muted);
    }

    a {
      display: inline-block;
      padding-block: var(--space-1);
    }
  `,
})
export class Breadcrumbs {
  readonly crumbs = input.required<readonly Crumb[]>();
}
