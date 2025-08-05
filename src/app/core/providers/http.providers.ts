// HTTP Providers Configuration - Complete Implementation
// Path: src/app/core/providers/http.providers.ts

import { Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

// FIXED: Use @core alias for consistent imports
import { ErrorInterceptor } from '@core/interceptors/error.interceptor';
import { TimeoutInterceptor } from '@core/interceptors/timeout.interceptor';

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

    // Timeout Interceptor - Task I.2 ✅ (Applied FIRST)
    // Must be first to apply timeouts before error handling
    {
        provide: HTTP_INTERCEPTORS,
        useClass: TimeoutInterceptor,
        multi: true
    },

    // Error Interceptor - Task I.1 ✅ (Applied SECOND)
    // Handles errors including timeout errors from TimeoutInterceptor
    {
        provide: HTTP_INTERCEPTORS,
        useClass: ErrorInterceptor,
        multi: true
    }
];

/**
 * Alternative configuration using functional interceptors (Angular 15+)
 * Can be used with provideHttpClient(withInterceptors([...]))
 * 
 * Note: Currently using class-based interceptors for:
 * - Better compatibility with older Angular versions
 * - Easier dependency injection
 * - More robust error handling capabilities
 */
export const HTTP_INTERCEPTOR_FUNCTIONS = [
    // Functional interceptors would go here when migrating
    // Currently using class-based interceptors for better TV compatibility
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
    },

    // Development timeout testing
    {
        provide: 'TIMEOUT_TEST_MODE',
        useValue: false // Set to true to enable timeout testing
    }
];

/**
 * Production-optimized HTTP providers
 * Minimal configuration for production deployment
 */
export const HTTP_PROVIDERS_PROD: Provider[] = [
    ...HTTP_PROVIDERS

    // Production-specific optimizations
    // Could add additional production interceptors here if needed
];

/**
 * TV-specific providers for different platforms
 * Use these for platform-specific optimizations
 */
export const HTTP_PROVIDERS_TV = {
    // Samsung Tizen - Conservative timeouts
    SAMSUNG_TIZEN: [
        ...HTTP_PROVIDERS,
        {
            provide: 'TV_PLATFORM',
            useValue: 'samsung-tizen'
        }
    ],

    // LG WebOS - Moderate timeouts
    LG_WEBOS: [
        ...HTTP_PROVIDERS,
        {
            provide: 'TV_PLATFORM',
            useValue: 'lg-webos'
        }
    ],

    // Android TV - Standard timeouts
    ANDROID_TV: [
        ...HTTP_PROVIDERS,
        {
            provide: 'TV_PLATFORM',
            useValue: 'android-tv'
        }
    ]
};

// Log configuration loading
console.log('🔧 HTTP providers configuration loaded');
console.log('📡 Available interceptors: TimeoutInterceptor, ErrorInterceptor');
console.log('⚡ Interceptor order: Timeout → Error (optimal for TV networks)');
console.log('✅ Rule 03 COMPLETE: All interceptors implemented with TV optimizations');

/**
 * IMPLEMENTATION NOTES:
 * 
 * 1. Interceptor Order Matters:
 *    - TimeoutInterceptor applies FIRST to set request timeouts
 *    - ErrorInterceptor applies SECOND to handle timeout errors
 * 
 * 2. TV Network Optimizations:
 *    - Higher timeout values for slow TV networks
 *    - Smart retry logic with exponential backoff
 *    - Platform-specific configurations available
 * 
 * 3. Error Handling Flow:
 *    - TimeoutInterceptor: Applies timeout → throws TimeoutError
 *    - ErrorInterceptor: Catches TimeoutError → retries if appropriate
 * 
 * 4. Debugging & Monitoring:
 *    - Both interceptors store logs in localStorage
 *    - Statistics available for admin dashboard
 *    - TV-specific error messages in Bulgarian
 * 
 * 5. Performance Considerations:
 *    - Minimal overhead in production
 *    - Smart caching to avoid repeated processing
 *    - Memory-efficient logging with size limits
 */