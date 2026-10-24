import { Component, inject } from '@angular/core';
import { ExplorerViewState } from '../../state/explorer-view';

/** La Luna en detalle (fase 2: encuadre básico; la fase 6 añade el relieve y el recorrido). */
@Component({
  selector: 'tls-explore-moon-page',
  template: `
    <h1>La Luna</h1>
    <p>Nuestro satélite con su libración real: la cara que ves cambia un poco cada día.</p>
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
export class ExploreMoonPage {
  constructor() {
    inject(ExplorerViewState).view.set('moon');
  }
}
