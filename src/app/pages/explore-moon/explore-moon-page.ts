import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * La Luna en detalle (fase 2: encuadre básico; la fase 6 añade el relieve y el recorrido).
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor.
 */
@Component({
  selector: 'tls-explore-moon-page',
  imports: [RouterLink],
  template: `
    <!-- La vuelta a la vista general (fase 9c, 9c.2: en lugar de la fila de los planetas). -->
    <a
      class="explorer__back"
      routerLink="/"
      queryParamsHandling="preserve"
      aria-label="Volver al sistema solar"
      ><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M19 12H5.5M11 6.5 5.5 12l5.5 5.5" /></svg
      >Sistema solar</a
    >
    <h1>La Luna</h1>
    <p>Nuestro satélite con su libración real: la cara que ves cambia un poco cada día.</p>
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
export class ExploreMoonPage {}
