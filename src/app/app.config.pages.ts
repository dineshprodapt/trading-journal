import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { withInMemoryScrolling, provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

// GitHub Pages cannot rewrite Angular routes to index.html.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withHashLocation(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
};
