import { RenderMode, ServerRoute } from '@angular/ssr';
import { PLANETS } from './data/bodies';

// Salida estática (outputMode: "static"): todas las rutas se prerenderizan.
export const serverRoutes: ServerRoute[] = [
  {
    path: 'planetas/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PLANETS.map(({ id }) => ({ id })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
