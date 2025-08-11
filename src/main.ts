// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, withRouterConfig } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { HTTP_PROVIDERS } from '@core/providers/http.providers';
import { SelectivePreloadingStrategy } from './app/core/services/selective-preloading-strategy.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withPreloading(SelectivePreloadingStrategy),
      withRouterConfig({
        // TV-specific router optimizations
        urlUpdateStrategy: 'eager',
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(),
    importProvidersFrom(BrowserAnimationsModule),
    ...HTTP_PROVIDERS,
  ]
}).catch(err => console.error(err));