import { Component, inject } from '@angular/core';
import { ExplorerFocus } from '../../features/explorer-ui/explorer-focus';

/**
 * Portada: la vista del sistema solar y su texto introductorio (prerenderizado).
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor.
 * El H1, «El sistema solar», va en paralelo a «La Tierra» y «La Luna» (decisión de Iván, 26-10).
 * Con un cuerpo elegido, el título es el suyo, con «‹ Sistema solar» para volver a la vista general
 * (fase 9c, decisión 2 de Iván); el cambio se anuncia en la región viva del explorador, como siempre.
 */
@Component({
  selector: 'tls-home-page',
  template: `
    @if (focus.body(); as body) {
      <button
        type="button"
        class="explorer__back"
        aria-label="Volver al sistema solar"
        (click)="focus.back()"
      >
        <span aria-hidden="true">‹</span> Sistema solar
      </button>
      <h1>{{ body.name }}</h1>
      <p>{{ body.kind }}</p>
    } @else {
      <h1>El sistema solar</h1>
      <p>
        El Sol, los ocho planetas y veintiuna lunas en las posiciones de hoy, calculadas en tu
        navegador para cualquier fecha entre 1900 y 2100.
      </p>
    }
  `,
  styles: `
    h1 {
      margin-bottom: var(--space-2);
      font-size: 1.75rem;
    }

    p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    @media (max-width: 63.99rem) {
      h1 {
        font-size: 1.375rem;
      }
    }
  `,
})
export class HomePage {
  protected readonly focus = inject(ExplorerFocus);
}
