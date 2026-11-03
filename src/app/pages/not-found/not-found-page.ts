import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { describePage } from '../../core/page-meta';

@Component({
  selector: 'tls-not-found-page',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Página no encontrada</h1>
    <p>La página que buscas no existe. <a routerLink="/">Volver al inicio</a>.</p>
  `,
})
export class NotFoundPage {
  constructor() {
    describePage('La página que buscas no existe.');
  }
}
