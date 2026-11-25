import { RenderMode, ServerRoute } from '@angular/ssr';

// Hash routing (withHashLocation) resolves routes client-side from the URL fragment (#/...),
// which browsers do not send to the server. Using RenderMode.Client avoids server-side
// redirect loops (ERR_TOO_MANY_REDIRECTS) on "/".
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
