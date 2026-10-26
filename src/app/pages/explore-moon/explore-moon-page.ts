import { Component } from '@angular/core';

/**
 * La Luna en detalle (fase 2: encuadre básico; la fase 6 añade el relieve y el recorrido).
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor.
 */
@Component({
  selector: 'tls-explore-moon-page',
  template: `
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
