import { Component } from '@angular/core';

/**
 * El cielo desde España (fase 8; decisión de Iván del 26-10, docs/decisiones/CAMBIO-CIELO-ESPANA.md):
 * qué se ve desde el Montsec, los grandes observatorios del país y otros lugares, o desde tu ubicación.
 * La vista la dice la ruta (`data.view`); el layout del explorador la pasa al motor, y el lugar, la URL
 * (`?lugar=teide`).
 */
@Component({
  selector: 'tls-explore-sky-page',
  template: `
    <h1>El cielo desde España</h1>
    <p>
      Lo que se ve esta noche desde el Montsec, los grandes observatorios del país y otros lugares,
      o desde donde estés, calculado en tu navegador.
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
export class ExploreSkyPage {}
