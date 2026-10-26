import { Component } from '@angular/core';

/**
 * Portada: la vista del sistema solar y su texto introductorio (prerenderizado).
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor.
 *
 * TODO(ivan): ¿«El sistema solar» como H1, en paralelo a «La Tierra» y «La Luna»? Hoy repite la
 * marca de la cabecera (docs/PENDIENTES.md).
 */
@Component({
  selector: 'tls-home-page',
  template: `
    <h1>Tierra Luna Sol</h1>
    <p>
      El Sol, los ocho planetas y veintiuna lunas en las posiciones de hoy, calculadas en tu
      navegador para cualquier fecha entre 1900 y 2100.
    </p>
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
export class HomePage {}
