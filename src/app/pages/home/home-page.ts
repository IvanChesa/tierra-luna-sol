import { Component, inject } from '@angular/core';
import { ExplorerViewState } from '../../state/explorer-view';

/** Portada: la vista del sistema solar y su texto introductorio (prerenderizado). */
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
      font-size: var(--text-2xl);
      margin-bottom: var(--space-2);
    }

    p {
      margin: 0;
      color: var(--color-text-muted);
    }
  `,
})
export class HomePage {
  constructor() {
    inject(ExplorerViewState).view.set('system');
  }
}
