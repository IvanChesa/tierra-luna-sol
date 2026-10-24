import { Component, input } from '@angular/core';

/** Ficha de un cuerpo: la usan /planetas/:id, /sol y /luna. */
@Component({
  selector: 'tls-body-detail-page',
  host: { class: 'page' },
  template: `
    <h1>{{ name() }}</h1>
    <p>Ficha en preparación (fase 9).</p>
  `,
})
export class BodyDetailPage {
  /** Llega de `data` (/sol, /luna) o del resolver (/planetas/:id). */
  readonly name = input.required<string>();
}
