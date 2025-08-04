// ErrorInterceptor Usage Guide - How to configure and use in Angular app

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Simple interfaces for demo
interface TestApiResponse {
    success: boolean;
    message: string;
    data?: any;
}

interface ErrorLogEntry {
    timestamp: Date;
    method: string;
    url: string;
    status: number;
    message: string;
    retryable: boolean;
}

/**
 * Example component showing how ErrorInterceptor works in practice
 * Demonstrates error handling, retry logic, and user feedback
 */
@Component({
    selector: 'app-error-interceptor-usage-example',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="error-interceptor-demo">
      <h2>ErrorInterceptor Demo</h2>
      
      <!-- Error Statistics -->
      <div class="stats-section">
        <h3>Error Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalRequests }}</div>
            <div class="stat-label">Total Requests</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ successfulRequests }}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ failedRequests }}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ retriedRequests }}</div>
            <div class="stat-label">Retried</div>
          </div>
        </div>
      </div>
      
      <!-- Test Buttons -->
      <div class="controls-section">
        <h3>Test Different Error Scenarios</h3>
        <div class="control-buttons">
          <button (click)="testSuccessfulRequest()" class="btn btn-success">
            ✅ Successful Request
          </button>
          <button (click)="testNetworkError()" class="btn btn-warning">
            🌐 Network Error (Retryable)
          </button>
          <button (click)="testServerError()" class="btn btn-error">
            🔧 Server Error (Retryable)
          </button>
          <button (click)="testNotFoundError()" class="btn btn-error">
            🔍 Not Found (Non-retryable)
          </button>
          <button (click)="testRateLimitError()" class="btn btn-warning">
            ⏰ Rate Limited (Retryable)
          </button>
          <button (click)="clearErrorLog()" class="btn btn-neutral">
            🧹 Clear Log
          </button>
        </div>
      </div>
      
      <!-- Current Request Status -->
      <div class="status-section">
        <h3>Current Request Status</h3>
        <div class="status-info" [class]="'status-' + currentStatus">
          <div class="status-indicator"></div>
          <span>{{ currentStatusMessage }}</span>
        </div>
        @if (isLoading) {
          <div class="loading-indicator">
            <div class="spinner"></div>
            <span>Processing request...</span>
          </div>
        }
      </div>
      
      <!-- Error Log -->
      <div class="log-section">
        <h3>Error Log (Last 10 entries)</h3>
        <div class="error-log">
          @if (errorLog.length === 0) {
            <div class="no-errors">No errors logged yet. Try testing some error scenarios above.</div>
          } @else {
            <div *ngFor="let entry of errorLog; trackBy: trackByIndex" 
                 class="log-entry" 
                 [class.retryable]="entry.retryable">
              <div class="log-header">
                <span class="timestamp">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
                <span class="method">{{ entry.method }}</span>
                <span class="status" [class]="'status-' + entry.status">{{ entry.status }}</span>
                <span class="retryable-badge" [class.retryable]="entry.retryable">
                  {{ entry.retryable ? 'RETRYABLE' : 'FINAL' }}
                </span>
              </div>
              <div class="log-details">
                <div class="url">{{ entry.url }}</div>
                <div class="message">{{ entry.message }}</div>
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- Configuration Info -->
      <div class="config-section">
        <h3>ErrorInterceptor Configuration</h3>
        <div class="config-info">
          <div class="config-item">
            <strong>Max Retries:</strong> 3 attempts
          </div>
          <div class="config-item">
            <strong>Base Delay:</strong> 1 second (exponential backoff)
          </div>
          <div class="config-item">
            <strong>Max Delay:</strong> 10 seconds
          </div>
          <div class="config-item">
            <strong>Retryable Status Codes:</strong> 0, 408, 429, 500, 502, 503, 504
          </div>
          <div class="config-item">
            <strong>Error Storage:</strong> localStorage (last 20 errors)
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .error-interceptor-demo {
      padding: 20px;
      font-family: 'Roboto', Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .stats-section, .controls-section, .status-section, .log-section, .config-section {
      margin-bottom: 25px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #ccc;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .control-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 15px;
    }
    
    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: opacity 0.2s;
    }
    
    .btn-success { background: #4caf50; color: white; }
    .btn-warning { background: #ff9800; color: white; }
    .btn-error { background: #f44336; color: white; }
    .btn-neutral { background: #666; color: white; }
    
    .status-info {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 4px;
      margin-top: 15px;
    }
    
    .status-idle { background: #f5f5f5; }
    .status-loading { background: #e3f2fd; }
    .status-success { background: #e8f5e8; }
    .status-error { background: #ffebee; }
    
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #666;
    }
    
    .status-loading .status-indicator { background: #2196f3; }
    .status-success .status-indicator { background: #4caf50; }
    .status-error .status-indicator { background: #f44336; }
    
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-log {
      max-height: 300px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-top: 15px;
    }
    
    .no-errors {
      padding: 20px;
      text-align: center;
      color: #666;
      font-style: italic;
    }
    
    .log-entry {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    
    .log-entry:last-child {
      border-bottom: none;
    }
    
    .log-entry.retryable {
      border-left: 4px solid #ff9800;
    }
    
    .log-header {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .timestamp {
      font-size: 12px;
      color: #666;
      min-width: 70px;
    }
    
    .method {
      font-weight: bold;
      font-size: 12px;
      background: #e0e0e0;
      padding: 2px 6px;
      border-radius: 3px;
      min-width: 40px;
      text-align: center;
    }
    
    .status {
      font-weight: bold;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;
      min-width: 35px;
      text-align: center;
    }
    
    .status-0 { background: #ffebee; color: #c62828; }
    .status-400 { background: #fff3e0; color: #ef6c00; }
    .status-404 { background: #fff3e0; color: #ef6c00; }
    .status-429 { background: #fff3e0; color: #ef6c00; }
    .status-500 { background: #ffebee; color: #c62828; }
    .status-503 { background: #ffebee; color: #c62828; }
    
    .retryable-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      background: #f5f5f5;
      color: #666;
    }
    
    .retryable-badge.retryable {
      background: #fff3e0;
      color: #ef6c00;
    }
    
    .log-details {
      font-size: 13px;
    }
    
    .url {
      color: #666;
      font-family: monospace;
      margin-bottom: 3px;
    }
    
    .message {
      color: #333;
    }
    
    .config-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 15px;
    }
    
    .config-item {
      padding: 8px;
      background: white;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
  `]
})
export class ErrorInterceptorUsageExampleComponent implements OnInit {
    private readonly http = inject(HttpClient);

    // Component state
    totalRequests = 0;
    successfulRequests = 0;
    failedRequests = 0;
    retriedRequests = 0;

    currentStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
    currentStatusMessage = 'Ready to test error scenarios';
    isLoading = false;

    errorLog: ErrorLogEntry[] = [];

    ngOnInit() {
        console.log('🛡️ ErrorInterceptorUsageExample initializing...');
        this.loadStoredErrors();
    }

    /**
     * Test successful API request
     */
    testSuccessfulRequest() {
        console.log('✅ Testing successful request...');
        this.setLoadingState('Making successful request...');

        // Simulate successful request (using a mock endpoint that doesn't exist)
        // This will actually fail, but demonstrates the concept
        this.makeTestRequest('GET', '/api/test/success', 'Successful request test')
            .subscribe({
                next: (response) => {
                    this.handleSuccessResponse(response);
                },
                error: (error) => {
                    // Even "successful" test will show error handling in action
                    this.handleErrorResponse(error, 'GET', '/api/test/success');
                }
            });
    }

    /**
     * Test network error scenario
     */
    testNetworkError() {
        console.log('🌐 Testing network error...');
        this.setLoadingState('Simulating network error...');

        // Use an invalid URL to trigger network error
        this.makeTestRequest('GET', 'http://invalid-domain-that-does-not-exist.com/api/test', 'Network error test')
            .subscribe({
                next: (response) => {
                    this.handleSuccessResponse(response);
                },
                error: (error) => {
                    this.handleErrorResponse(error, 'GET', 'http://invalid-domain-that-does-not-exist.com/api/test');
                }
            });
    }

    /**
     * Test server error scenario
     */
    testServerError() {
        console.log('🔧 Testing server error...');
        this.setLoadingState('Simulating server error...');

        // Use httpstat.us to simulate 500 error
        this.makeTestRequest('GET', 'https://httpstat.us/500', 'Server error test')
            .subscribe({
                next: (response) => {
                    this.handleSuccessResponse(response);
                },
                error: (error) => {
                    this.handleErrorResponse(error, 'GET', 'https://httpstat.us/500');
                }
            });
    }

    /**
     * Test not found error scenario
     */
    testNotFoundError() {
        console.log('🔍 Testing not found error...');
        this.setLoadingState('Simulating not found error...');

        // Use httpstat.us to simulate 404 error
        this.makeTestRequest('GET', 'https://httpstat.us/404', 'Not found error test')
            .subscribe({
                next: (response) => {
                    this.handleSuccessResponse(response);
                },
                error: (error) => {
                    this.handleErrorResponse(error, 'GET', 'https://httpstat.us/404');
                }
            });
    }

    /**
     * Test rate limit error scenario
     */
    testRateLimitError() {
        console.log('⏰ Testing rate limit error...');
        this.setLoadingState('Simulating rate limit error...');

        // Use httpstat.us to simulate 429 error
        this.makeTestRequest('GET', 'https://httpstat.us/429', 'Rate limit error test')
            .subscribe({
                next: (response) => {
                    this.handleSuccessResponse(response);
                },
                error: (error) => {
                    this.handleErrorResponse(error, 'GET', 'https://httpstat.us/429');
                }
            });
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        console.log('🧹 Clearing error log...');
        this.errorLog = [];

        // Also clear from localStorage
        try {
            localStorage.removeItem('tv-slideshow-errors');
            console.log('✅ Error log cleared from localStorage');
        } catch (error) {
            console.warn('⚠️ Could not clear localStorage:', error);
        }
    }

    /**
     * Track by function for ngFor
     */
    trackByIndex(index: number, item: any): number {
        return index;
    }

    /**
     * Make test HTTP request
     * @private
     */
    private makeTestRequest(method: string, url: string, description: string): Observable<any> {
        this.totalRequests++;
        console.log(`🔄 Making ${method} request to: ${url}`);

        return this.http.get(url).pipe(
            catchError((error: HttpErrorResponse) => {
                // Log retry attempts
                if (error.status === 0 || error.status >= 500) {
                    this.retriedRequests++;
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Set loading state
     * @private
     */
    private setLoadingState(message: string) {
        this.currentStatus = 'loading';
        this.currentStatusMessage = message;
        this.isLoading = true;
    }

    /**
     * Handle successful response
     * @private
     */
    private handleSuccessResponse(response: any) {
        console.log('✅ Request successful:', response);
        this.successfulRequests++;
        this.currentStatus = 'success';
        this.currentStatusMessage = 'Request completed successfully';
        this.isLoading = false;
    }

    /**
     * Handle error response
     * @private
     */
    private handleErrorResponse(error: any, method: string, url: string) {
        console.error('❌ Request failed:', error);
        this.failedRequests++;
        this.currentStatus = 'error';
        this.isLoading = false;

        // Extract error details
        const status = error.status || 0;
        const message = error.message || 'Unknown error';

        // Determine if error is retryable
        const retryableStatuses = [0, 408, 429, 500, 502, 503, 504];
        const isRetryable = retryableStatuses.includes(status);

        this.currentStatusMessage = `Request failed: ${message}`;

        // Add to error log
        const logEntry: ErrorLogEntry = {
            timestamp: new Date(),
            method,
            url,
            status,
            message,
            retryable: isRetryable
        };

        this.errorLog.unshift(logEntry);

        // Keep only last 10 entries in display
        if (this.errorLog.length > 10) {
            this.errorLog = this.errorLog.slice(0, 10);
        }
    }

    /**
     * Load stored errors from localStorage
     * @private
     */
    private loadStoredErrors() {
        try {
            const storedErrors = localStorage.getItem('tv-slideshow-errors');
            if (storedErrors) {
                const errors = JSON.parse(storedErrors);
                console.log(`📂 Loaded ${errors.length} stored errors`);

                // Convert stored errors to log entries
                this.errorLog = errors.slice(-10).map((error: any) => ({
                    timestamp: new Date(error.timestamp),
                    method: error.method || 'GET',
                    url: error.url || 'Unknown',
                    status: error.status || 0,
                    message: error.message || 'Unknown error',
                    retryable: error.canRetry || false
                }));
            }
        } catch (error) {
            console.warn('⚠️ Could not load stored errors:', error);
        }
    }
}

// Export usage examples for reference
export const errorInterceptorUsageExamples = {
    basicSetup: `
    // In your app.config.ts or main.ts:
    import { provideHttpClient, withInterceptors } from '@angular/common/http';
    import { ErrorInterceptor } from './core/interceptors/error.interceptor';
    
    export const appConfig: ApplicationConfig = {
      providers: [
        provideHttpClient(
          withInterceptors([ErrorInterceptor])
        )
      ]
    };
  `,

    serviceUsage: `
    // In your service:
    import { HttpClient } from '@angular/common/http';
    
    constructor(private http: HttpClient) {}
    
    getData() {
      // ErrorInterceptor will automatically handle errors and retries
      return this.http.get('/api/data').pipe(
        // Your own error handling (optional)
        catchError(error => {
          console.log('Service-level error handling:', error);
          return throwError(() => error);
        })
      );
    }
  `,

    componentUsage: `
    // In your component:
    this.dataService.getData().subscribe({
      next: (data) => {
        // Handle successful response
      },
      error: (error) => {
        // Error has already been processed by ErrorInterceptor
        // You get a standardized ApiResponse with user-friendly message
        this.showErrorMessage(error.message);
      }
    });
  `,

    errorStorage: `
    // Access stored errors for debugging:
    const storedErrors = JSON.parse(
      localStorage.getItem('tv-slideshow-errors') || '[]'
    );
    
    // Each error contains:
    // - timestamp, url, method, status
    // - errorCode, message (in Bulgarian)
    // - canRetry, errorCount
    // - requestId for correlation
  `
};

console.log('📚 ErrorInterceptor usage examples loaded');