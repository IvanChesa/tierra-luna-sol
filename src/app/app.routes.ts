import { CanMatchFn, ResolveFn, Routes } from '@angular/router';
import type { ExplorerView } from './scene';

/**
 * El índice de cuerpos, cargado al ir a una ficha (`import()`): con él en el bundle inicial, el código
 * propio de los chunks iniciales pasaba de su límite de 15 kB (fase 9). Solo lo piden las rutas de las
 * fichas de los planetas y las lunas, y la página ya lo lleva en su chunk.
 */
const index = () => import('./data/body-index');

/** Solo casan los ids del catálogo; el resto cae en la 404. */
const planetExists: CanMatchFn = (_route, segments) =>
  index().then((m) => m.findPlanet(segments[0]?.path ?? '') !== undefined);

const planetName: ResolveFn<string> = (route) =>
  index().then((m) => m.findPlanet(route.paramMap.get('id') ?? '')?.name ?? '');

/** Las 20 lunas con ficha en /lunas/:id (la nuestra está en /luna). */
const findMoon = (id: string) => index().then((m) => m.OTHER_MOONS.find((moon) => moon.id === id));
const moonExists: CanMatchFn = (_route, segments) =>
  findMoon(segments[0]?.path ?? '').then((moon) => moon !== undefined);
const moonName: ResolveFn<string> = (route) =>
  findMoon(route.paramMap.get('id') ?? '').then((moon) => moon?.name ?? '');

const loadBodyDetail = () =>
  import('./pages/body-detail/body-detail-page').then((m) => m.BodyDetailPage);
const loadNotFound = () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage);

export const routes: Routes = [
  {
    // El explorador (D10): un layout con el lienzo 3D persistente y una ruta hija por vista. Cada
    // hija dice su vista en `data.view` (la lee el layout: no hace falta ningún estado inicial) y su
    // description en `data.description`: sus páginas se crean al pintar el layout, después de que
    // `SiteTitleStrategy` ponga las etiquetas (la portada, la del sitio).
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
        data: {
          view: 'earth' satisfies ExplorerView,
          description:
            'La Tierra en 3D, orientada según la hora real y con la Luna a su distancia verdadera: su relieve, sus nubes, las luces de la noche y cinco vistas guiadas.',
        },
        loadComponent: () =>
          import('./pages/explore-earth/explore-earth-page').then((m) => m.ExploreEarthPage),
      },
      {
        path: 'explorar/luna',
        title: 'La Luna',
        data: {
          view: 'moon' satisfies ExplorerView,
          description:
            'La Luna en 3D con su relieve real y su libración: la cara visible y la oculta, el polo sur, la luz rasante y un recorrido por sus lugares.',
        },
        loadComponent: () =>
          import('./pages/explore-moon/explore-moon-page').then((m) => m.ExploreMoonPage),
      },
      {
        // El cielo desde España (fase 8): el lugar va en la URL (`?lugar=teide`).
        path: 'cielo',
        title: 'El cielo desde España',
        data: {
          view: 'sky' satisfies ExplorerView,
          description:
            'Lo que se ve esta noche desde el Montsec, los grandes observatorios de España y otros lugares, o desde donde estés: los planetas, la Luna, las estrellas y las constelaciones.',
        },
        loadComponent: () =>
          import('./pages/explore-sky/explore-sky-page').then((m) => m.ExploreSkyPage),
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
        loadComponent: loadBodyDetail,
      },
    ],
  },
  {
    path: 'lunas',
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Lunas',
        loadComponent: () =>
          import('./pages/moons-index/moons-index-page').then((m) => m.MoonsIndexPage),
      },
      {
        path: ':id',
        canMatch: [moonExists],
        title: moonName,
        loadComponent: loadBodyDetail,
      },
    ],
  },
  // Las fichas del Sol y de la Luna: el cuerpo, en `data.id` (el mismo input que el parámetro `:id`).
  { path: 'sol', title: 'Sol', data: { id: 'sol' }, loadComponent: loadBodyDetail },
  { path: 'luna', title: 'Luna', data: { id: 'luna' }, loadComponent: loadBodyDetail },
  {
    // Próximos eclipses visibles desde España (fase 8): el lugar, en la URL (`?lugar=teide`).
    path: 'eclipses',
    title: 'Próximos eclipses',
    loadComponent: () => import('./pages/eclipses/eclipses-page').then((m) => m.EclipsesPage),
  },
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
  // URL. Sin canonical: no es la página de ninguna URL. Y siempre con `noindex`, aunque `indexable` sea
  // true: /404 se sirve con un 200 si se pide directamente (revisión de la fase 0, hallazgo 5; D25).
  {
    path: '404',
    title: 'Página no encontrada',
    data: { canonical: false, noindex: true },
    loadComponent: loadNotFound,
  },
  {
    path: '**',
    title: 'Página no encontrada',
    data: { canonical: false, noindex: true },
    loadComponent: loadNotFound,
  },
];
