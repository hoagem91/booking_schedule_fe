import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'management', renderMode: RenderMode.Client },
  { path: 'management/**', renderMode: RenderMode.Client },
  { path: 'home', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'profile/appointments', renderMode: RenderMode.Client },
  { path: 'profile/appointments/:id', renderMode: RenderMode.Client },
  { path: 'profile/insurance', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
