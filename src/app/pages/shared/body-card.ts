import { IMAGE_LOADER, ImageLoaderConfig, NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatExact, formatPeriodHours } from '../../core/format';
import type { Body } from '../../data/body.model';
import { bodyPagePath } from '../../data/body-links';

/** Las miniaturas del motor (fase 3c, `public/img/cuerpos/`): 96 px, una por cuerpo. */
const thumbnailLoader = ({ src }: ImageLoaderConfig): string => `/img/cuerpos/${src}.webp`;

/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = ' ';

/**
 * Una tarjeta de los índices de cuerpos (fase 9): la miniatura, el nombre (el enlace a su ficha, que
 * ocupa toda la tarjeta) y dos datos con su fuente en la ficha: el radio y el periodo de la órbita.
 */
@Component({
  selector: 'tls-body-card',
  imports: [RouterLink, NgOptimizedImage],
  providers: [{ provide: IMAGE_LOADER, useValue: thumbnailLoader }],
  template: `
    <article class="card">
      <img [ngSrc]="body().id" width="56" height="56" alt="" />
      <div>
        @if (level() === 2) {
          <h2 class="card__name">
            <a [routerLink]="link()">{{ body().name }}</a>
          </h2>
        } @else {
          <h3 class="card__name">
            <a [routerLink]="link()">{{ body().name }}</a>
          </h3>
        }
        <dl>
          @for (fact of facts(); track fact.label) {
            <div>
              <dt>{{ fact.label }}</dt>
              <dd>{{ fact.value }}</dd>
            </div>
          }
        </dl>
      </div>
    </article>
  `,
  styles: `
    .card {
      position: relative;
      display: grid;
      grid-template-columns: 3.5rem minmax(0, 1fr);
      gap: var(--space-4);
      align-items: center;
      height: 100%;
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      border: var(--border-width) solid var(--color-line);
      border-radius: var(--radius-md);
    }

    .card:hover {
      border-color: var(--color-control);
    }

    .card__name {
      margin: 0 0 var(--space-1);
      font-size: var(--text-lg);
    }

    /* El enlace cubre la tarjeta: toda ella lleva a la ficha (y el foco la rodea entera). */
    a {
      color: var(--color-text);
      text-decoration: none;
    }

    a::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: var(--radius-md);
    }

    a:focus-visible {
      outline: none;
    }

    a:focus-visible::after {
      outline: var(--focus-ring-width) solid var(--color-focus);
      outline-offset: var(--focus-ring-offset);
    }

    dl {
      display: grid;
      gap: 0 var(--space-2);
      grid-template-columns: max-content max-content;
      margin: 0;
      font-size: var(--text-sm);
    }

    dl div {
      display: contents;
    }

    dt {
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
    }
  `,
})
export class BodyCard {
  readonly body = input.required<Body>();
  /** El nivel del título: 2 bajo el H1 de la página, 3 bajo el título de su grupo. */
  readonly level = input<2 | 3>(3);

  protected readonly link = computed(() => bodyPagePath(this.body().id));
  protected readonly facts = computed(() => {
    const body = this.body();
    const facts = [
      { label: 'Radio', value: `${formatExact(body.physical.radiusKm.value)}${NBSP}km` },
    ];
    if (body.orbit) {
      facts.push({
        label: body.kind === 'planet' ? 'Año' : 'Órbita',
        value: formatPeriodHours(body.orbit.periodDays.value * 24),
      });
    }
    return facts;
  });
}
