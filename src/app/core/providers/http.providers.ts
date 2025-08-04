// HTTP Providers Configuration - ErrorInterceptor

import { Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { ErrorInterceptor } from '../interceptors/error.interceptor';
// import { TimeoutInterceptor } from '../interceptors/timeout.interceptor'; // Task I.2

/**
 * HTTP providers configuration for TV Slideshow Application
 * Configures HTTP client with TV-optimized interceptors
 * 
 * Usage in app.config.ts:
 * import { HTTP_PROVIDERS } from './core/providers/http.providers';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     ...HTTP_PROVIDERS,
 *     // other providers
 *   ]
 * };
 */
export const HTTP_PROVIDERS: Provider[] = [

    // Error Interceptor - Task I.1 ✅
    {
        provide: HTTP_INTERCEPTORS,
        useClass: ErrorInterceptor,
        multi: true
    }

    // Timeout Interceptor - Task I.2 (to be added)
    // {
    //   provide: HTTP_INTERCEPTORS,
    //   useClass: TimeoutInterceptor,
    //   multi: true
    // }
];

/**
 * Alternative configuration using functional interceptors (Angular 15+)
 * Can be used with provideHttpClient(withInterceptors([...]))
 */
export const HTTP_INTERCEPTOR_FUNCTIONS = [
    // Functional interceptors would go here when available
    // Currently using class-based interceptors for better compatibility
];

/**
 * Development-only HTTP providers with additional logging
 * Use in development environment for enhanced debugging
 */
export const HTTP_PROVIDERS_DEV: Provider[] = [
    ...HTTP_PROVIDERS,

    // Additional development providers
    {
        provide: 'HTTP_DEBUG_MODE',
        useValue: true
    }
];

/**
 * Production-optimized HTTP providers
 * Minimal configuration for production deployment
 */
export const HTTP_PROVIDERS_PROD: Provider[] = [
    ...HTTP_PROVIDERS

    // Production-specific optimizations can be added here
];

console.log('🔧 HTTP providers configuration loaded');
console.log('📡 Available interceptors: ErrorInterceptor');
console.log('⏳ Pending interceptors: TimeoutInterceptor (Task I.2)');