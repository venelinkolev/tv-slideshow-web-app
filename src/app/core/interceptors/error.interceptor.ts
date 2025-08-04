import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, concatMap, finalize } from 'rxjs/operators';

import {
    ApiError,
    ApiResponse,
    ApiErrorType,
    ServiceStatusEnum
} from '@core/models';

/**
 * HTTP Error Interceptor for TV Slideshow Application
 * Handles network failures common in TV environments with smart retry logic
 * Features:
 * - TV-specific error handling for slow/unreliable networks
 * - Intelligent retry strategies based on error type
 * - Error logging and storage for debugging
 * - User-friendly error messages in Bulgarian
 * - Fallback mechanisms for offline operation
 * - Performance monitoring integration
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    private readonly document = inject(DOCUMENT);

    // TV-specific retry configuration
    private readonly retryConfig = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second base delay
        maxDelay: 10000, // 10 seconds max delay
        retryableStatuses: [0, 408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
        networkTimeoutRetries: 2
    };

    // Error tracking for analytics
    private errorCount = 0;
    private lastErrorTime: number | null = null;

    /**
     * Intercept HTTP requests and handle errors with TV-optimized retry logic
     * @param req HTTP request
     * @param next HTTP handler
     * @returns Observable<HttpEvent<any>>
     */
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        console.log(`🛡️ ErrorInterceptor: Intercepting ${req.method} ${req.url}`);

        const startTime = performance.now();

        return next.handle(req).pipe(
            // Simple retry with exponential backoff
            retryWhen(errors =>
                errors.pipe(
                    concatMap((error: HttpErrorResponse, retryCount: number) => {
                        console.log(`🔄 ErrorInterceptor: Retry attempt ${retryCount + 1} for ${req.url} (status: ${error.status})`);

                        // Check if error is retryable and within retry limit
                        if (!this.isRetryableError(error) || retryCount >= this.retryConfig.maxRetries) {
                            console.log(`❌ ErrorInterceptor: Max retries exceeded or non-retryable error`);
                            return throwError(() => error);
                        }

                        // Calculate retry delay
                        const delayTime = this.calculateRetryDelay(retryCount, error);
                        console.log(`⏳ ErrorInterceptor: Retrying in ${delayTime}ms...`);

                        // Log retry attempt
                        this.logRetryAttempt(error, retryCount, delayTime, req);

                        return timer(delayTime);
                    })
                )
            ),
            catchError((error: HttpErrorResponse) => this.handleError(error, req)),
            finalize(() => {
                const duration = performance.now() - startTime;
                console.log(`🛡️ ErrorInterceptor: Request completed in ${duration.toFixed(2)}ms`);
            })
        );
    }

    /**
     * Handle HTTP errors with comprehensive TV-specific error processing
     * @private
     */
    private handleError(error: HttpErrorResponse, req: HttpRequest<any>): Observable<never> {
        console.error('🚨 ErrorInterceptor: Processing HTTP error:', {
            url: req.url,
            method: req.method,
            status: error.status,
            message: error.message
        });

        // Update error tracking
        this.updateErrorTracking();

        // Create standardized API error
        const apiError = this.createApiError(error, req);

        // Log error details for debugging
        this.logErrorDetails(error, req, apiError);

        // Store error for offline debugging
        this.storeErrorForDebugging(error, req, apiError);

        // Create user-friendly error response
        const errorResponse = this.createErrorResponse(apiError, error);

        console.error('💥 ErrorInterceptor: Final error response:', errorResponse);

        return throwError(() => errorResponse);
    }

    /**
     * Determine if error is retryable based on TV network conditions
     * @private
     */
    private isRetryableError(error: HttpErrorResponse): boolean {
        // Network/connection errors (status 0)
        if (error.status === 0) {
            console.log('🌐 ErrorInterceptor: Network error detected - retryable');
            return true;
        }

        // Server errors that might be temporary
        if (this.retryConfig.retryableStatuses.includes(error.status)) {
            console.log(`🔧 ErrorInterceptor: Server error ${error.status} - retryable`);
            return true;
        }

        // Timeout errors (check both error type and message)
        if (error.error instanceof Error && error.error.name === 'TimeoutError') {
            console.log('⏰ ErrorInterceptor: Timeout error - retryable');
            return true;
        }

        // Alternative timeout detection
        if (error.message && error.message.toLowerCase().includes('timeout')) {
            console.log('⏰ ErrorInterceptor: Timeout detected in message - retryable');
            return true;
        }

        // Client errors - not retryable
        if (error.status >= 400 && error.status < 500) {
            console.log(`🚫 ErrorInterceptor: Client error ${error.status} - not retryable`);
            return false;
        }

        console.log(`❓ ErrorInterceptor: Unknown error ${error.status} - not retryable`);
        return false;
    }

    /**
     * Calculate retry delay with exponential backoff and jitter for TV networks
     * @private
     */
    private calculateRetryDelay(retryCount: number, error: HttpErrorResponse): number {
        // Base exponential backoff: 1s, 2s, 4s, 8s...
        let delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, retryCount),
            this.retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        delay += jitter;

        // Special handling for specific error types
        switch (error.status) {
            case 429: // Rate limiting
                delay = Math.max(delay, 5000); // Minimum 5 seconds
                break;
            case 503: // Service unavailable
                delay = Math.max(delay, 3000); // Minimum 3 seconds
                break;
            case 0: // Network errors
                delay = Math.max(delay, 2000); // Minimum 2 seconds for TV networks
                break;
        }

        return Math.round(delay);
    }

    /**
     * Create standardized API error from HTTP error
     * @private
     */
    private createApiError(error: HttpErrorResponse, req: HttpRequest<any>): ApiError {
        let errorType: ApiErrorType;
        let errorCode: string;
        let userMessage: string;

        // Determine error type and code
        if (error.error instanceof ErrorEvent) {
            // Client-side/network error
            errorType = ApiErrorType.NETWORK_ERROR;
            errorCode = 'NETWORK_ERROR';
            userMessage = 'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.';
        } else {
            // Server-side error
            switch (error.status) {
                case 0:
                    errorType = ApiErrorType.NETWORK_ERROR;
                    errorCode = 'NO_CONNECTION';
                    userMessage = 'Няма връзка със сървъра. Проверете мрежовата връзка.';
                    break;
                case 400:
                    errorType = ApiErrorType.VALIDATION_ERROR;
                    errorCode = 'BAD_REQUEST';
                    userMessage = 'Невалидна заявка към сървъра.';
                    break;
                case 401:
                    errorType = ApiErrorType.AUTHENTICATION_ERROR;
                    errorCode = 'UNAUTHORIZED';
                    userMessage = 'Необходима е оторизация за достъп до този ресурс.';
                    break;
                case 403:
                    errorType = ApiErrorType.AUTHORIZATION_ERROR;
                    errorCode = 'FORBIDDEN';
                    userMessage = 'Нямате права за достъп до този ресурс.';
                    break;
                case 404:
                    errorType = ApiErrorType.NOT_FOUND_ERROR;
                    errorCode = 'NOT_FOUND';
                    userMessage = 'Заявеният ресурс не е намерен.';
                    break;
                case 408:
                    errorType = ApiErrorType.TIMEOUT_ERROR;
                    errorCode = 'REQUEST_TIMEOUT';
                    userMessage = 'Заявката отне твърде дълго време. Моля, опитайте отново.';
                    break;
                case 409:
                    errorType = ApiErrorType.CONFLICT_ERROR;
                    errorCode = 'CONFLICT';
                    userMessage = 'Конфликт с текущото състояние на ресурса.';
                    break;
                case 429:
                    errorType = ApiErrorType.SERVER_ERROR;
                    errorCode = 'RATE_LIMITED';
                    userMessage = 'Твърде много заявки. Моля, изчакайте преди следващата заявка.';
                    break;
                case 500:
                    errorType = ApiErrorType.SERVER_ERROR;
                    errorCode = 'INTERNAL_SERVER_ERROR';
                    userMessage = 'Вътрешна грешка на сървъра. Моля, опитайте отново по-късно.';
                    break;
                case 502:
                    errorType = ApiErrorType.SERVER_ERROR;
                    errorCode = 'BAD_GATEWAY';
                    userMessage = 'Проблем с мрежовата инфраструктура. Опитайте отново.';
                    break;
                case 503:
                    errorType = ApiErrorType.SERVER_ERROR;
                    errorCode = 'SERVICE_UNAVAILABLE';
                    userMessage = 'Услугата временно не е достъпна. Опитайте отново след малко.';
                    break;
                case 504:
                    errorType = ApiErrorType.TIMEOUT_ERROR;
                    errorCode = 'GATEWAY_TIMEOUT';
                    userMessage = 'Заявката отне твърде дълго време. Проверете мрежата.';
                    break;
                default:
                    errorType = ApiErrorType.SERVER_ERROR;
                    errorCode = `HTTP_${error.status}`;
                    userMessage = `Възникна неочаквана грешка (${error.status}). Моля, опитайте отново.`;
            }
        }

        // Create API error object
        const apiError: ApiError = {
            code: errorCode,
            message: userMessage,
            context: {
                httpStatus: error.status,
                httpStatusText: error.statusText,
                url: req.url,
                method: req.method,
                timestamp: new Date().toISOString(),
                errorType,
                userAgent: this.document.defaultView?.navigator?.userAgent,
                isOnline: this.document.defaultView?.navigator?.onLine
            }
        };

        // Add retry strategy if applicable
        if (this.isRetryableError(error)) {
            apiError.retryStrategy = {
                canRetry: true,
                retryDelay: this.calculateRetryDelay(0, error),
                maxRetries: this.retryConfig.maxRetries
            };
        } else {
            apiError.retryStrategy = {
                canRetry: false,
                maxRetries: 0
            };
        }

        // Add field-specific errors for validation errors
        if (error.status === 400 && error.error?.fieldErrors) {
            apiError.fieldErrors = error.error.fieldErrors;
        }

        return apiError;
    }

    /**
     * Create error response for the application
     * @private
     */
    private createErrorResponse(apiError: ApiError, originalError: HttpErrorResponse): ApiResponse<null> {
        return {
            success: false,
            data: null,
            message: apiError.message,
            statusCode: originalError.status || 0,
            timestamp: new Date(),
            error: apiError,
            requestId: this.generateRequestId()
        };
    }

    /**
     * Log detailed error information for debugging
     * @private
     */
    private logErrorDetails(error: HttpErrorResponse, req: HttpRequest<any>, apiError: ApiError): void {
        const errorDetails = {
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId(),
            url: req.url,
            method: req.method,
            httpStatus: error.status,
            httpStatusText: error.statusText,
            errorCode: apiError.code,
            errorMessage: apiError.message,
            userAgent: this.document.defaultView?.navigator?.userAgent,
            isOnline: this.document.defaultView?.navigator?.onLine,
            errorCount: this.errorCount,
            headers: this.extractHeaders(error),
            responseBody: error.error
        };

        console.group('🚨 ErrorInterceptor: Detailed Error Report');
        console.error('Request Details:', {
            url: errorDetails.url,
            method: errorDetails.method,
            requestId: errorDetails.requestId
        });
        console.error('Error Details:', {
            status: errorDetails.httpStatus,
            code: errorDetails.errorCode,
            message: errorDetails.errorMessage
        });
        console.error('Context:', {
            timestamp: errorDetails.timestamp,
            isOnline: errorDetails.isOnline,
            errorCount: errorDetails.errorCount
        });
        console.error('Full Error Object:', error);
        console.groupEnd();
    }

    /**
     * Store error information for offline debugging
     * @private
     */
    private storeErrorForDebugging(error: HttpErrorResponse, req: HttpRequest<any>, apiError: ApiError): void {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                requestId: this.generateRequestId(),
                url: req.url,
                method: req.method,
                status: error.status,
                errorCode: apiError.code,
                message: apiError.message,
                canRetry: apiError.retryStrategy?.canRetry || false,
                errorCount: this.errorCount
            };

            // Get existing errors from localStorage
            const storedErrors = JSON.parse(
                this.document.defaultView?.localStorage?.getItem('tv-slideshow-errors') || '[]'
            );

            // Add new error
            storedErrors.push(errorLog);

            // Keep only last 20 errors to prevent storage bloat
            const recentErrors = storedErrors.slice(-20);

            // Save back to localStorage
            this.document.defaultView?.localStorage?.setItem(
                'tv-slideshow-errors',
                JSON.stringify(recentErrors)
            );

            console.log('💾 ErrorInterceptor: Error stored for debugging');

        } catch (storageError) {
            console.warn('⚠️ ErrorInterceptor: Could not store error in localStorage:', storageError);
        }
    }

    /**
     * Log retry attempt information
     * @private
     */
    private logRetryAttempt(
        error: HttpErrorResponse,
        retryCount: number,
        delayTime: number,
        req: HttpRequest<any>
    ): void {
        console.group(`🔄 ErrorInterceptor: Retry Attempt ${retryCount + 1}`);
        console.log('Request:', `${req.method} ${req.url}`);
        console.log('Error:', `${error.status} ${error.statusText}`);
        console.log('Delay:', `${delayTime}ms`);
        console.log('Retry Strategy:', error.status === 0 ? 'Network Error' : 'Server Error');
        console.groupEnd();
    }

    /**
     * Update error tracking for analytics
     * @private
     */
    private updateErrorTracking(): void {
        this.errorCount++;
        this.lastErrorTime = Date.now();

        console.log(`📊 ErrorInterceptor: Error count updated: ${this.errorCount}`);
    }

    /**
     * Extract relevant headers from error response
     * @private
     */
    private extractHeaders(error: HttpErrorResponse): Record<string, string | null> {
        const headers: Record<string, string | null> = {};

        if (error.headers) {
            // Extract common debugging headers
            const debugHeaders = [
                'content-type', 'content-length', 'date', 'server',
                'x-request-id', 'x-correlation-id', 'retry-after'
            ];

            debugHeaders.forEach(headerName => {
                headers[headerName] = error.headers.get(headerName);
            });
        }

        return headers;
    }

    /**
     * Generate unique request ID for debugging
     * @private
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get error statistics for monitoring
     * @returns Error statistics object
     */
    getErrorStatistics(): {
        totalErrors: number;
        lastErrorTime: number | null;
        averageErrorsPerMinute: number;
    } {
        const now = Date.now();
        const oneMinute = 60 * 1000;

        let averageErrorsPerMinute = 0;
        if (this.lastErrorTime && now - this.lastErrorTime < oneMinute) {
            averageErrorsPerMinute = this.errorCount;
        }

        return {
            totalErrors: this.errorCount,
            lastErrorTime: this.lastErrorTime,
            averageErrorsPerMinute
        };
    }

    /**
     * Clear error statistics (for testing)
     */
    clearErrorStatistics(): void {
        this.errorCount = 0;
        this.lastErrorTime = null;
        console.log('🧹 ErrorInterceptor: Error statistics cleared');
    }
}