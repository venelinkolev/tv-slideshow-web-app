// src/app/app.config.ts

import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { HTTP_PROVIDERS } from '@core/providers/http.providers';
import { AppInitializationService } from '@core/services/app-initialization.service';

/**
 * Application Configuration
 * Configures all application-wide providers including initialization
 * 
 * Uses Angular 18+ provideAppInitializer() instead of deprecated APP_INITIALIZER token
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Zone.js configuration for change detection
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router configuration
    provideRouter(routes),

    // HTTP Client with interceptors
    provideHttpClient(withInterceptorsFromDi()),

    // HTTP Interceptors (Auth, Timeout, Error)
    ...HTTP_PROVIDERS,

    // App Initialization - Angular 18+ Modern Approach
    // Runs before application bootstrap
    // provideAppInitializer(() => {
    //   const initService = inject(AppInitializationService);
    //   return initService.initialize();
    // })
  ]
};