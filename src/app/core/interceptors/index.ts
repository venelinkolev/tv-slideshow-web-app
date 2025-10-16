/**
 * Barrel export for all HTTP interceptors
 * Provides clean imports for the application
 * 
 * Usage:
 * import { ErrorInterceptor, TimeoutInterceptor } from '@core/interceptors';
 */

export * from './error.interceptor';

export * from './timeout.interceptor';

export * from './auth.interceptor';

/**
 * All interceptors are now implemented with TV-specific optimizations:
 * 
 * ErrorInterceptor:
 * - Modern retry logic (no deprecated operators)
 * - TV-specific error handling and Bulgarian messages
 * - Smart retry strategies based on error type
 * - Comprehensive logging and debugging features
 * 
 * TimeoutInterceptor:
 * - Dynamic timeout configuration by request type
 * - TV network-optimized timeout values
 * - Performance monitoring integration
 * - Request type detection (API, images, assets)
 * 
 * Both interceptors include:
 * - localStorage debugging support
 * - Statistics tracking for admin dashboard
 * - TV hardware compatibility considerations
 * - Angular 18 patterns (inject() function)
 */