import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * La Tierra en detalle (fase 2: encuadre básico; la fase 5 añade su material y las vistas guiadas).
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor.
 */
@Component({
  selector: 'tls-explore-earth-page',
  imports: [RouterLink],
  template: `
    <!-- La vuelta a la vista general (fase 9c, 9c.2: en lugar de la fila de los planetas). -->
    <a
      class="explorer__back"
      routerLink="/"
      queryParamsHandling="preserve"
      aria-label="Volver al sistema solar"
      ><span aria-hidden="true">‹</span> Sistema solar</a
    >
    <h1>La Tierra</h1>
    <p>Nuestro planeta, orientado según la hora real y con la Luna a su distancia verdadera.</p>
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
export class ExploreEarthPage {}
