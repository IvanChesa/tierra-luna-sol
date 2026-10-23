import { CanMatchFn, ResolveFn, Routes } from '@angular/router';
import { findPlanet } from './data/body-index';

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
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
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
  // /404 existe para prerenderizar la página de error (la usará el ErrorDocument de Apache);
  // ** muestra la misma página en el cliente para cualquier otra URL.
  // TODO(fase-8): /404 se sirve con un 200 si se pide directamente, así que debe llevar
  // SIEMPRE `noindex` (aunque `indexable` sea true) y quedar fuera del sitemap
  // (revisión de la fase 0, hallazgo 5).
  { path: '404', title: 'Página no encontrada', loadComponent: loadNotFound },
  { path: '**', title: 'Página no encontrada', loadComponent: loadNotFound },
];
