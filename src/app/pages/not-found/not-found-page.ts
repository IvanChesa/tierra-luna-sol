import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Adónde se puede seguir desde una dirección que no existe: las secciones del sitio. */
const WAYS = [
  { link: '/', title: 'Explorar en 3D', text: 'El sistema solar, en las posiciones de hoy.' },
  { link: '/planetas', title: 'Los planetas', text: 'Sus fichas, de Mercurio a Neptuno.' },
  { link: '/lunas', title: 'Las lunas', text: 'La nuestra y las otras veinte.' },
  { link: '/sol', title: 'El Sol', text: 'Su ficha y sus datos.' },
  { link: '/cielo', title: 'El cielo desde España', text: 'Lo que se ve esta noche.' },
  { link: '/eclipses', title: 'Los próximos eclipses', text: 'Los que se ven desde España.' },
] as const;

/**
 * La 404 (siempre con `noindex`, fase 9): lo que pasa y adónde seguir, con las secciones del sitio a
 * mano (crítica de la 9c: «el 404 es seco»; revisión del bloque S, decisión 6).
 */
@Component({
  selector: 'tls-not-found-page',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Página no encontrada</h1>
    <p class="lead">
      Esta dirección no está en el atlas: quizá se escribió mal o la página ya no existe. Puedes
      seguir por aquí.
    </p>
    <ul class="ways">
      @for (way of ways; track way.link) {
        <li>
          <a class="way" [routerLink]="way.link">
            <span class="way__title">{{ way.title }}</span>
            <span class="way__text">{{ way.text }}</span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .lead {
      color: var(--color-text-muted);
    }

    .ways {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--space-3);
      max-width: 52rem;
      margin: var(--space-6) 0 0;
      padding: 0;
      list-style: none;
    }

    .way {
      display: grid;
      gap: var(--space-1);
      height: 100%;
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      color: var(--color-text);
      border: var(--border-width) solid var(--color-line);
      border-radius: var(--radius-md);
      text-decoration: none;
    }

    .way:hover {
      border-color: var(--color-control);
    }

    .way__title {
      font-family: var(--font-display);
      font-size: var(--text-lg);
    }

    .way__text {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
  `,
})
export class NotFoundPage {
  protected readonly ways = WAYS;
}
