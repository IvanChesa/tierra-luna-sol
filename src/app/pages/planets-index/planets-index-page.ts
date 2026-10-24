import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLANETS } from '../../data/body-index';

@Component({
  selector: 'tls-planets-index-page',
  host: { class: 'page' },
  imports: [RouterLink],
  template: `
    <h1>Planetas</h1>
    <ul>
      @for (planet of planets; track planet.id) {
        <li>
          <a [routerLink]="['/planetas', planet.id]">{{ planet.name }}</a>
        </li>
      }
    </ul>
  `,
})
export class PlanetsIndexPage {
  protected readonly planets = PLANETS;
}
