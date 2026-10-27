import { CanMatchFn, ResolveFn, Routes } from '@angular/router';
import { findPlanet } from './data/body-index';
import type { ExplorerView } from './scene';

/** Solo casan los ids del catálogo; el resto cae en la 404. */
const planetExists: CanMatchFn = (_route, segments) =>
  findPlanet(segments[0]?.path ?? '') !== undefined;

const planetName: ResolveFn<string> = (route) =>
  findPlanet(route.paramMap.get('id') ?? '')?.name ?? '';

const loadBodyDetail = () =>
  import('./pages/body-detail/body-detail-page').then((m) => m.BodyDetailPage);
const loadNotFound = () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage);

export const routes: Routes = [
  {
    // El explorador (D10): un layout con el lienzo 3D persistente y una ruta hija por vista. Cada
    // hija dice su vista en `data.view` (la lee el layout: no hace falta ningún estado inicial).
    path: '',
    loadComponent: () => import('./features/viewer/viewer-layout').then((m) => m.ViewerLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { view: 'system' satisfies ExplorerView },
        loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'explorar/tierra',
        title: 'La Tierra',
        data: { view: 'earth' satisfies ExplorerView },
        loadComponent: () =>
          import('./pages/explore-earth/explore-earth-page').then((m) => m.ExploreEarthPage),
      },
      {
        path: 'explorar/luna',
        title: 'La Luna',
        data: { view: 'moon' satisfies ExplorerView },
        loadComponent: () =>
          import('./pages/explore-moon/explore-moon-page').then((m) => m.ExploreMoonPage),
      },
    ],
  },
  {
    path: 'planetas',
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Planetas',
        loadComponent: () =>
          import('./pages/planets-index/planets-index-page').then((m) => m.PlanetsIndexPage),
      },
      {
        path: ':id',
        canMatch: [planetExists],
        title: planetName,
        resolve: { name: planetName },
        loadComponent: loadBodyDetail,
      },
    ],
  },
  { path: 'sol', title: 'Sol', data: { name: 'Sol' }, loadComponent: loadBodyDetail },
  { path: 'luna', title: 'Luna', data: { name: 'Luna' }, loadComponent: loadBodyDetail },
  {
    path: 'creditos',
    title: 'Créditos',
    loadComponent: () => import('./pages/credits/credits-page').then((m) => m.CreditsPage),
  },
  {
    path: 'sobre-el-proyecto',
    title: 'Sobre el proyecto',
    loadComponent: () => import('./pages/about/about-page').then((m) => m.AboutPage),
  },
  // /404 existe para prerenderizar la página de error: es el `404.html` que Cloudflare Pages sirve, con
  // un 404, en lo que no existe (fase 4); ** muestra la misma página en el cliente para cualquier otra
  // URL. Sin canonical: no es la página de ninguna URL.
  // TODO(fase-9): /404 se sirve con un 200 si se pide directamente, así que debe llevar
  // SIEMPRE `noindex`, aunque `indexable` sea true (revisión de la fase 0, hallazgo 5; D25).
  {
    path: '404',
    title: 'Página no encontrada',
    data: { canonical: false },
    loadComponent: loadNotFound,
  },
  {
    path: '**',
    title: 'Página no encontrada',
    data: { canonical: false },
    loadComponent: loadNotFound,
  },
];
