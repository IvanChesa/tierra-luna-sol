import { Component, inject } from '@angular/core';
import { ExplorerViewState } from '../../state/explorer-view';

/** La Tierra en detalle (fase 2: encuadre básico; la fase 5 añade su material y las vistas guiadas). */
@Component({
  selector: 'tls-explore-earth-page',
  template: `
    <h1>La Tierra</h1>
    <p>Nuestro planeta, orientado según la hora real y con la Luna a su distancia verdadera.</p>
  `,
  styles: `
    h1 {
      font-size: var(--text-2xl);
      margin-bottom: var(--space-2);
    }

    p {
      margin: 0;
      color: var(--color-text-muted);
    }
  `,
})
export class ExploreEarthPage {
  constructor() {
    inject(ExplorerViewState).view.set('earth');
  }
}
