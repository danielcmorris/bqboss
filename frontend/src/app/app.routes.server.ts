import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public/static pages — prerender at build time
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'how-it-works', renderMode: RenderMode.Prerender },
  { path: 'ai-assist', renderMode: RenderMode.Prerender },
  // App pages use browser APIs (IndexedDB, AG Grid, GIS) — client only
  { path: '**', renderMode: RenderMode.Client },
];
