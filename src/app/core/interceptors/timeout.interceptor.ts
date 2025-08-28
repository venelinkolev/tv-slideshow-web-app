import { Injectable, inject, DOCUMENT } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';

import { Observable } from 'rxjs';
import { timeout, catchError, tap, finalize } from 'rxjs/operators';

/**
 * HTTP Timeout Interceptor for TV Slideshow Application
 * Implements TV-specific timeout values for different types of requests
 * Features:
 * - Dynamic timeout configuration based on request type and content
 * - TV network-optimized timeout values (slower networks)
 * - Request type detection (API calls, images, static assets)
 * - Performance monitoring integration
 * - Graceful handling of timeout scenarios
 * - Configurable timeout overrides via headers
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
    private readonly document = inject(DOCUMENT);

    // TV-specific timeout configuration (in milliseconds)
    private readonly timeoutConfig = {
        // API endpoints - higher timeout for TV networks
        api: {
            default: 15000,        // 15 seconds for general API calls
            products: 20000,       // 20 seconds for product data
            config: 10000,         // 10 seconds for configuration
            upload: 60000          // 60 seconds for file uploads
        },

        // Static assets - moderate timeout
        assets: {
            images: 12000,         // 12 seconds for product images
            fonts: 8000,           // 8 seconds for font files
            styles: 6000,          // 6 seconds for CSS files
            scripts: 10000         // 10 seconds for JS files
        },

        // Special endpoints
        external: 25000,           // 25 seconds for external APIs

        // Fallback timeout for unknown request types
        fallback: 15000
    };

    // Request tracking for analytics
    private requestCount = 0;
    private timeoutCount = 0;
    private averageResponseTime = 0;

    /**
     * Intercept HTTP requests and apply TV-optimized timeouts
     * @param req HTTP request
     * @param next HTTP handler
     * @returns Observable<HttpEvent<any>>
     */
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const startTime = performance.now();

        // Determine appropriate timeout for this request
        const timeoutValue = this.determineTimeout(req);

        console.log(`⏰ TimeoutInterceptor: ${req.method} ${req.url} (timeout: ${timeoutValue}ms)`);

        // Update request tracking
        this.requestCount++;

        return next.handle(req).pipe(
            // Apply timeout with TV-optimized value
            timeout(timeoutValue),

            // Log successful responses
            tap(() => {
                const duration = performance.now() - startTime;
                this.updateResponseTimeTracking(duration);
                console.log(`✅ TimeoutInterceptor: Request completed in ${duration.toFixed(2)}ms (timeout was ${timeoutValue}ms)`);
            }),

            // Handle timeout errors specifically
            catchError((error) => {
                const duration = performance.now() - startTime;

                if (error.name === 'TimeoutError') {
                    this.handleTimeoutError(req, timeoutValue, duration);
                } else {
                    console.log(`❌ TimeoutInterceptor: Request failed after ${duration.toFixed(2)}ms (non-timeout error)`);
                }

                // Re-throw the error to be handled by ErrorInterceptor
                throw error;
            }),

            finalize(() => {
                const duration = performance.now() - startTime;
                console.log(`🏁 TimeoutInterceptor: Request finalized after ${duration.toFixed(2)}ms`);
            })
        );
    }

    /**
     * Determine appropriate timeout based on request characteristics
     * @private
     */
    private determineTimeout(req: HttpRequest<any>): number {
        // Check for custom timeout header first
        const customTimeout = req.headers.get('X-Custom-Timeout');
        if (customTimeout) {
            const timeout = parseInt(customTimeout, 10);
            if (timeout > 0) {
                console.log(`⚙️ TimeoutInterceptor: Using custom timeout: ${timeout}ms`);
                return timeout;
            }
        }

        const url = req.url.toLowerCase();
        const method = req.method.toUpperCase();

        // API endpoints
        if (url.includes('/api/')) {
            if (url.includes('/products')) {
                return this.timeoutConfig.api.products;
            }
            if (url.includes('/config')) {
                return this.timeoutConfig.api.config;
            }
            if (method === 'POST' || method === 'PUT') {
                return this.timeoutConfig.api.upload; // Assume uploads for POST/PUT
            }
            return this.timeoutConfig.api.default;
        }

        // Static assets
        if (url.includes('/assets/') || url.includes('static/')) {
            if (this.isImageRequest(url)) {
                return this.timeoutConfig.assets.images;
            }
            if (url.includes('.css') || url.includes('styles')) {
                return this.timeoutConfig.assets.styles;
            }
            if (url.includes('.js') || url.includes('scripts')) {
                return this.timeoutConfig.assets.scripts;
            }
            if (url.includes('.woff') || url.includes('.ttf') || url.includes('fonts')) {
                return this.timeoutConfig.assets.fonts;
            }
        }

        // External URLs (outside current domain)
        if (this.isExternalRequest(req)) {
            return this.timeoutConfig.external;
        }

        // Mock data (development)
        if (url.includes('mock-data')) {
            return this.timeoutConfig.assets.images; // Treat like static assets
        }

        // Default fallback
        console.log(`🤔 TimeoutInterceptor: Using fallback timeout for ${url}`);
        return this.timeoutConfig.fallback;
    }

    /**
     * Check if request is for an image file
     * @private
     */
    private isImageRequest(url: string): boolean {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        return imageExtensions.some(ext => url.includes(ext));
    }

    /**
     * Check if request is to external domain
     * @private
     */
    private isExternalRequest(req: HttpRequest<any>): boolean {
        if (!req.url.startsWith('http')) {
            return false; // Relative URL
        }

        try {
            const requestUrl = new URL(req.url);
            const currentDomain = this.document.defaultView?.location?.hostname;

            return requestUrl.hostname !== currentDomain;
        } catch (error) {
            console.warn('⚠️ TimeoutInterceptor: Could not parse URL for external check:', req.url);
            return false;
        }
    }

    /**
     * Handle timeout error with TV-specific logging and analytics
     * @private
     */
    private handleTimeoutError(req: HttpRequest<any>, timeoutValue: number, actualDuration: number): void {
        this.timeoutCount++;

        const timeoutInfo = {
            timestamp: new Date().toISOString(),
            url: req.url,
            method: req.method,
            configuredTimeout: timeoutValue,
            actualDuration: Math.round(actualDuration),
            userAgent: this.document.defaultView?.navigator?.userAgent,
            isOnline: this.document.defaultView?.navigator?.onLine,
            connectionType: (this.document.defaultView?.navigator as any)?.connection?.effectiveType,
            timeoutRate: (this.timeoutCount / this.requestCount * 100).toFixed(1)
        };

        console.error('⏰ TimeoutInterceptor: Request timeout occurred:', timeoutInfo);

        // Store timeout info for offline debugging
        this.storeTimeoutForDebugging(timeoutInfo);

        // Check if timeout rate is concerning
        const timeoutRate = this.timeoutCount / this.requestCount;
        if (timeoutRate > 0.1) { // More than 10% timeout rate
            console.warn(`🚨 TimeoutInterceptor: High timeout rate detected: ${(timeoutRate * 100).toFixed(1)}%`);
        }
    }

    /**
     * Update response time tracking for performance analytics
     * @private
     */
    private updateResponseTimeTracking(duration: number): void {
        // Simple moving average calculation
        this.averageResponseTime = (this.averageResponseTime * (this.requestCount - 1) + duration) / this.requestCount;
    }

    /**
     * Store timeout information for offline debugging
     * @private
     */
    private storeTimeoutForDebugging(timeoutInfo: any): void {
        try {
            const timeoutLogs = JSON.parse(localStorage.getItem('tv-slideshow-timeout-logs') || '[]');
            timeoutLogs.push(timeoutInfo);

            // Keep only the last 30 timeout events
            if (timeoutLogs.length > 30) {
                timeoutLogs.splice(0, timeoutLogs.length - 30);
            }

            localStorage.setItem('tv-slideshow-timeout-logs', JSON.stringify(timeoutLogs));
            console.log('💾 TimeoutInterceptor: Timeout logged for debugging');
        } catch (storageError) {
            console.warn('⚠️ TimeoutInterceptor: Could not store timeout log:', storageError);
        }
    }

    /**
     * Get timeout statistics for monitoring/admin purposes
     * @returns Object with timeout statistics
     */
    getTimeoutStatistics(): {
        requestCount: number;
        timeoutCount: number;
        timeoutRate: number;
        averageResponseTime: number;
    } {
        return {
            requestCount: this.requestCount,
            timeoutCount: this.timeoutCount,
            timeoutRate: this.requestCount > 0 ? (this.timeoutCount / this.requestCount) : 0,
            averageResponseTime: this.averageResponseTime
        };
    }

    /**
     * Clear timeout statistics (for reset/maintenance)
     */
    clearTimeoutStatistics(): void {
        this.requestCount = 0;
        this.timeoutCount = 0;
        this.averageResponseTime = 0;
        console.log('🧹 TimeoutInterceptor: Timeout statistics cleared');
    }

    /**
     * Get current timeout configuration (for admin/debugging)
     * @returns Current timeout configuration object
     */
    getTimeoutConfiguration(): typeof this.timeoutConfig {
        return { ...this.timeoutConfig }; // Return a copy to prevent modifications
    }

    /**
     * Test method to simulate network conditions (development only)
     * @param multiplier Factor to multiply all timeouts (e.g., 0.5 for faster, 2.0 for slower)
     */
    adjustTimeoutsForTesting(multiplier: number): void {
        if (multiplier <= 0) {
            console.error('TimeoutInterceptor: Invalid multiplier, must be > 0');
            return;
        }

        Object.keys(this.timeoutConfig.api).forEach(key => {
            (this.timeoutConfig.api as any)[key] *= multiplier;
        });

        Object.keys(this.timeoutConfig.assets).forEach(key => {
            (this.timeoutConfig.assets as any)[key] *= multiplier;
        });

        this.timeoutConfig.external *= multiplier;
        this.timeoutConfig.fallback *= multiplier;

        console.log(`🧪 TimeoutInterceptor: Timeouts adjusted by factor ${multiplier}`, this.timeoutConfig);
    }
}