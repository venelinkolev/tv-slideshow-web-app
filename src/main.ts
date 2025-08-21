// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, withRouterConfig } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { registerLocaleData } from '@angular/common';

import localeBG from '@angular/common/locales/bg';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { HTTP_PROVIDERS } from '@core/providers/http.providers';
import { SelectivePreloadingStrategy } from './app/core/services/selective-preloading-strategy.service';

registerLocaleData(localeBG);

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
    // Регистрация на българския език
    { provide: LOCALE_ID, useValue: 'bg' }
  ]
}).catch(err => console.error(err));