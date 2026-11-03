import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getBody } from '../../data/bodies';
import { PLANETS } from '../../data/body-index';
import { moonsByDistance } from '../shared/moons';
import { BodyCard } from '../shared/body-card';
import { Breadcrumbs } from '../shared/breadcrumbs';

/**
 * Índice de las lunas (fase 9): las 20 que tienen ficha en /lunas/:id, por planeta y de dentro afuera.
 * La nuestra tiene la suya en /luna.
 */
@Component({
  selector: 'tls-moons-index-page',
  host: { class: 'page' },
  imports: [BodyCard, Breadcrumbs, RouterLink],
  template: `
    <tls-breadcrumbs [crumbs]="crumbs" />
    <h1>Lunas</h1>
    <p class="lead">
      Las veinte lunas del explorador, por planeta y de la más cercana a la más lejana. La nuestra,
      el satélite de la Tierra, tiene su propia ficha: <a routerLink="/luna">la Luna</a>.
    </p>
    @for (system of systems; track system.id) {
      <section [attr.aria-labelledby]="'sistema-' + system.id">
        <h2 [id]="'sistema-' + system.id">{{ system.title }}</h2>
        <ul class="cards">
          @for (moon of system.moons; track moon.id) {
            <li><tls-body-card [body]="moon" /></li>
          }
        </ul>
      </section>
    }
  `,
  styleUrl: '../shared/index-page.css',
})
export class MoonsIndexPage {
  protected readonly crumbs = [{ label: 'Inicio', link: '/' }, { label: 'Lunas' }];
  protected readonly systems = PLANETS.map((planet) => ({
    id: planet.id,
    title: `Las lunas de ${planet.name}`,
    // De la más cercana a la más lejana (en Neptuno, Proteo antes que Tritón).
    moons: moonsByDistance(planet.id)
      .filter((moon) => moon.id !== 'luna')
      .map((moon) => getBody(moon.id)),
  })).filter((system) => system.moons.length > 0);
}
