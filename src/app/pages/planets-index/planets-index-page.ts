import { Component } from '@angular/core';
import { getBody } from '../../data/bodies';
import { PLANETS } from '../../data/body-index';
import { BodyCard } from '../shared/body-card';
import { Breadcrumbs } from '../shared/breadcrumbs';

/** Índice de los planetas (fase 9): los ocho, del más cercano al Sol al más lejano. */
@Component({
  selector: 'tls-planets-index-page',
  host: { class: 'page' },
  imports: [BodyCard, Breadcrumbs],
  template: `
    <tls-breadcrumbs [crumbs]="crumbs" />
    <h1>Planetas</h1>
    <p class="lead">
      Los ocho planetas del sistema solar, del más cercano al Sol al más lejano. Cada ficha tiene
      sus datos con su fuente, tres curiosidades y su distancia de hoy.
    </p>
    <ul class="cards">
      @for (planet of planets; track planet.id) {
        <li><tls-body-card [body]="planet" [level]="2" /></li>
      }
    </ul>
  `,
  styleUrl: '../shared/index-page.css',
})
export class PlanetsIndexPage {
  protected readonly crumbs = [{ label: 'Inicio', link: '/' }, { label: 'Planetas' }];
  protected readonly planets = PLANETS.map((planet) => getBody(planet.id));
}
