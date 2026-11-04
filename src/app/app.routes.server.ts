import { RenderMode, ServerRoute } from '@angular/ssr';
import { OTHER_MOONS, PLANETS } from './data/body-index';

// Salida estática (outputMode: "static"): todas las rutas se prerenderizan.
export const serverRoutes: ServerRoute[] = [
  {
    path: 'planetas/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PLANETS.map(({ id }) => ({ id })),
  },
  {
    path: 'lunas/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => OTHER_MOONS.map(({ id }) => ({ id })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
