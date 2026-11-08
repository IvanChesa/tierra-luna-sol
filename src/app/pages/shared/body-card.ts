import { IMAGE_LOADER, NgOptimizedImage } from '@angular/common';
import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatExact } from '../../core/format';
import { firstSentence } from '../../data/body-description';
import type { Body } from '../../data/body.model';
import { bodyPagePath } from '../../data/body-links';
import { periodCells } from '../body-detail/body-facts';
import { kindLineOf } from '../body-detail/body-labels';
import { cardImageLoader } from './body-images';

/** Espacio duro entre la cifra y la unidad (ESTILO §3). */
const NBSP = ' ';

/**
 * Una tarjeta de los índices de cuerpos (fase 9): la miniatura, el nombre (el enlace a su ficha, que
 * ocupa toda la tarjeta) y dos datos con su fuente en la ficha: el radio y el periodo de la órbita.
 * La destacada (`featured`; la Luna, la primera de /lunas: decisión de Iván del 03-11) lleva además
 * su tipo, la primera frase de su resumen y una imagen más grande, la de su ficha.
 */
@Component({
  selector: 'tls-body-card',
  imports: [RouterLink, NgOptimizedImage],
  providers: [{ provide: IMAGE_LOADER, useValue: cardImageLoader }],
  template: `
    <article class="card" [class.card--featured]="featured()">
      @if (featured()) {
        <img [ngSrc]="body().id" width="112" height="112" alt="" [loaderParams]="ficha" priority />
      } @else {
        <img [ngSrc]="body().id" width="56" height="56" alt="" />
      }
      <div>
        @if (featured()) {
          <p class="card__kind">{{ kind() }}</p>
        }
        @if (level() === 2) {
          <h2 class="card__name">
            <a [routerLink]="link()">{{ body().name }}</a>
          </h2>
        } @else {
          <h3 class="card__name">
            <a [routerLink]="link()">{{ body().name }}</a>
          </h3>
        }
        @if (featured()) {
          <p class="card__summary">{{ summary() }}</p>
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

    /* La destacada: más grande, con el borde de los controles y la imagen a su columna. */
    .card--featured {
      grid-template-columns: clamp(4.5rem, 22vw, 7rem) minmax(0, 1fr);
      padding: var(--space-4) var(--space-6);
      border-color: var(--color-control);
    }

    .card--featured img {
      width: 100%;
      height: auto;
    }

    .card--featured .card__name {
      font-size: var(--text-2xl);
    }

    .card__kind {
      margin: 0 0 var(--space-1);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .card__summary {
      max-width: 40rem;
      margin: 0 0 var(--space-3);
      color: var(--color-text-muted);
    }

    .card__name {
      margin: 0 0 var(--space-1);
      font-size: var(--text-lg);
    }

    /* El enlace cubre la tarjeta: toda ella lleva a la ficha (y el foco la rodea entera). */
    /*
     * El nombre: el enlace a la ficha, que ocupa toda la tarjeta (con ::after). Su propia caja, de 24 px
     * de alto como mínimo (fase 9c, 9c.7: medía 19).
     */
    a {
      display: inline-flex;
      align-items: center;
      min-width: 1.5rem;
      min-height: 1.5rem;
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
  /** La tarjeta destacada, con su tipo, su primera frase y la imagen de su ficha. */
  readonly featured = input(false, { transform: booleanAttribute });

  protected readonly ficha = { ficha: true };
  protected readonly link = computed(() => bodyPagePath(this.body().id));
  /** «Satélite de la Tierra», sin el enlace de la ficha: toda la tarjeta es ya un enlace. */
  protected readonly kind = computed(() => {
    const kind = kindLineOf(this.body());
    return kind.parent ? `${kind.text} ${kind.parent.name}` : kind.text;
  });
  protected readonly summary = computed(() => firstSentence(this.body().summary.text));
  protected readonly facts = computed(() => {
    const body = this.body();
    const facts = [
      { label: 'Radio', value: `${formatExact(body.physical.radiusKm.value)}${NBSP}km` },
    ];
    if (body.orbit) {
      facts.push({
        label: body.kind === 'planet' ? 'Año' : 'Órbita',
        value: ((v) => `${v.number}${NBSP}${v.unit}`)(
          periodCells(body.orbit.periodDays.value * 24, 'días').value,
        ),
      });
    }
    return facts;
  });
}
