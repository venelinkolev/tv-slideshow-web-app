import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

import { ApiError, ApiErrorType } from '@core/models';
import { ErrorStateComponent } from '../features/slideshow/components/error-state';

/**
 * ErrorStateTestComponent - Визуално тестване на ErrorStateComponent
 * 
 * ИЗПОЛЗВАНЕ:
 * 1. Създай този файл като: src/app/test/error-state-test.component.ts
 * 2. Добави route: { path: 'test-error', component: ErrorStateTestComponent }
 * 3. Отвори: http://localhost:4200/test-error
 * 4. Тествай различните сценарии с buttons
 */
@Component({
    selector: 'app-error-state-test',
    standalone: true,
    imports: [CommonModule, ErrorStateComponent],
    template: `
    <div class="test-container">
      
      <!-- Test Controls Panel -->
      <div class="test-controls">
        <h1>🧪 ErrorStateComponent Test Page</h1>
        <p>Тествай различни error scenarios със buttons-ите по-долу</p>
        
        <!-- Error Scenario Buttons -->
        <div class="scenario-buttons">
          <h3>📋 Error Scenarios:</h3>
          
          <button (click)="testNetworkError()" class="test-btn network">
            🌐 Network Error
          </button>
          
          <button (click)="testServerError()" class="test-btn server">
            🔧 Server Error
          </button>
          
          <button (click)="testTimeoutError()" class="test-btn timeout">
            ⏱️ Timeout Error
          </button>
          
          <button (click)="testNotFoundError()" class="test-btn not-found">
            🔍 Not Found Error
          </button>
          
          <button (click)="testAuthError()" class="test-btn auth">
            🔐 Auth Error
          </button>
          
          <button (click)="testForbiddenError()" class="test-btn forbidden">
            🚫 Forbidden Error
          </button>
          
          <button (click)="testValidationError()" class="test-btn validation">
            ⚠️ Validation Error
          </button>
          
          <button (click)="testUnknownError()" class="test-btn unknown">
            ❓ Unknown Error
          </button>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <h3>🎛️ Actions:</h3>
          
          <button (click)="clearError()" class="test-btn clear">
            ✅ Clear Error
          </button>
          
          <button (click)="toggleRetrying()" class="test-btn retry">
            {{ isRetrying() ? '⏹️ Stop Retrying' : '🔄 Start Retrying' }}
          </button>
          
          <button (click)="toggleCanRetry()" class="test-btn toggle">
            {{ canRetry() ? '🚫 Disable Retry' : '✅ Enable Retry' }}
          </button>
          
          <button (click)="testAutoHide()" class="test-btn auto-hide">
            ⏲️ Test Auto-Hide (5s)
          </button>
        </div>
        
        <!-- Current State Display -->
        <div class="current-state">
          <h3>📊 Current State:</h3>
          <div class="state-info">
            <div><strong>Has Error:</strong> {{ hasError() ? 'YES' : 'NO' }}</div>
            <div><strong>Error Type:</strong> {{ errorType() || 'None' }}</div>
            <div><strong>Error Code:</strong> {{ errorCode() || 'None' }}</div>
            <div><strong>Can Retry:</strong> {{ canRetry() ? 'YES' : 'NO' }}</div>
            <div><strong>Is Retrying:</strong> {{ isRetrying() ? 'YES' : 'NO' }}</div>
            <div><strong>Message:</strong> {{ errorMessage() || 'None' }}</div>
          </div>
        </div>
      </div>
      
      <!-- ErrorStateComponent Test Area -->
      <div class="error-component-area">
        <h3>🎯 ErrorStateComponent Preview:</h3>
        
        <app-error-state 
          [hasError]="hasError()"
          [errorMessage]="errorMessage()"
          [errorCode]="errorCode()"
          [errorType]="errorType()"
          [originalError]="originalError()"
          [canRetry]="canRetry()"
          [isRetrying]="isRetrying()"
          [showDetails]="true"
          [autoHideDelay]="autoHideDelay()"
          (retry)="onErrorRetry()"
          (dismiss)="onErrorDismiss()"
          (reportError)="onErrorReport($event)"
          (toggleDetails)="onErrorDetailsToggle($event)">
        </app-error-state>
      </div>
      
      <!-- Event Log -->
      <div class="event-log">
        <h3>📝 Event Log:</h3>
        <div class="log-container">
          @for (event of eventLog(); track $index) {
            <div class="log-entry" [attr.data-type]="event.type">
              <span class="log-time">{{ event.timestamp | date:'HH:mm:ss.SSS' }}</span>
              <span class="log-type">{{ event.type }}</span>
              <span class="log-message">{{ event.message }}</span>
            </div>
          }
        </div>
        <button (click)="clearLog()" class="clear-log-btn">🗑️ Clear Log</button>
      </div>
      
    </div>
  `,
    styles: [`
    .test-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto 1fr;
      gap: 20px;
      padding: 20px;
      min-height: 100vh;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    
    .test-controls {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    
    .scenario-buttons, .action-buttons {
      margin: 20px 0;
    }
    
    .scenario-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    
    .test-btn {
      padding: 12px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .test-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .test-btn.network { background: #ff9800; color: white; }
    .test-btn.server { background: #f44336; color: white; }
    .test-btn.timeout { background: #ff5722; color: white; }
    .test-btn.not-found { background: #2196f3; color: white; }
    .test-btn.auth { background: #9c27b0; color: white; }
    .test-btn.forbidden { background: #e91e63; color: white; }
    .test-btn.validation { background: #ffeb3b; color: #333; }
    .test-btn.unknown { background: #607d8b; color: white; }
    .test-btn.clear { background: #4caf50; color: white; }
    .test-btn.retry { background: #00bcd4; color: white; }
    .test-btn.toggle { background: #795548; color: white; }
    .test-btn.auto-hide { background: #3f51b5; color: white; }
    
    .current-state {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    
    .state-info div {
      margin: 5px 0;
      font-size: 14px;
    }
    
    .error-component-area {
      position: relative;
      background: #ffffff;
      border: 2px dashed #ddd;
      border-radius: 8px;
      min-height: 400px;
    }
    
    .event-log {
      grid-column: 1 / -1;
      background: #f1f3f4;
      padding: 20px;
      border-radius: 8px;
      max-height: 300px;
    }
    
    .log-container {
      max-height: 200px;
      overflow-y: auto;
      background: white;
      padding: 10px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    
    .log-entry {
      display: grid;
      grid-template-columns: 80px 100px 1fr;
      gap: 10px;
      padding: 2px 0;
      border-bottom: 1px solid #eee;
    }
    
    .log-entry[data-type="error"] { color: #d32f2f; }
    .log-entry[data-type="retry"] { color: #f57c00; }
    .log-entry[data-type="dismiss"] { color: #388e3c; }
    .log-entry[data-type="report"] { color: #1976d2; }
    .log-entry[data-type="details"] { color: #7b1fa2; }
    
    .log-time { color: #666; }
    .log-type { font-weight: bold; }
    
    .clear-log-btn {
      margin-top: 10px;
      padding: 8px 16px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    h1, h3 {
      margin-top: 0;
      color: #333;
    }
    
    @media (max-width: 1200px) {
      .test-container {
        grid-template-columns: 1fr;
      }
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateTestComponent {

    // Test state signals
    protected readonly hasError = signal<boolean>(false);
    protected readonly errorMessage = signal<string>('');
    protected readonly errorCode = signal<string>('');
    protected readonly errorType = signal<ApiErrorType | null>(null);
    protected readonly originalError = signal<ApiError | null>(null);
    protected readonly canRetry = signal<boolean>(true);
    protected readonly isRetrying = signal<boolean>(false);
    protected readonly autoHideDelay = signal<number>(0);

    // Event log
    protected readonly eventLog = signal<Array<{
        timestamp: Date;
        type: string;
        message: string;
    }>>([]);

    // Test scenario methods
    testNetworkError(): void {
        this.logEvent('error', 'Testing Network Error scenario');
        this.setError(
            'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.',
            'NETWORK_ERROR',
            ApiErrorType.NETWORK_ERROR,
            {
                code: 'NETWORK_ERROR',
                message: 'Network request failed',
                context: { status: 0, url: '/api/products' },
                retryStrategy: { canRetry: true, retryDelay: 3000, maxRetries: 3 }
            }
        );
    }

    testServerError(): void {
        this.logEvent('error', 'Testing Server Error scenario');
        this.setError(
            'Възникна техническа грешка на сървъра. Опитайте отново след няколко минути.',
            'SERVER_ERROR',
            ApiErrorType.SERVER_ERROR,
            {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error occurred',
                context: { status: 500, url: '/api/products', stackTrace: 'Error: Database connection failed...' },
                retryStrategy: { canRetry: true, retryDelay: 5000, maxRetries: 2 }
            }
        );
    }

    testTimeoutError(): void {
        this.logEvent('error', 'Testing Timeout Error scenario');
        this.setError(
            'Заявката отне твърде дълго време. Моля, опитайте отново.',
            'TIMEOUT_ERROR',
            ApiErrorType.TIMEOUT_ERROR,
            {
                code: 'REQUEST_TIMEOUT',
                message: 'Request timed out after 10 seconds',
                context: { status: 408, timeout: 10000, url: '/api/products' },
                retryStrategy: { canRetry: true, retryDelay: 2000, maxRetries: 3 }
            }
        );
    }

    testNotFoundError(): void {
        this.logEvent('error', 'Testing Not Found Error scenario');
        this.setError(
            'API адресът не е намерен. Моля, свържете се с администратор.',
            'NOT_FOUND_ERROR',
            ApiErrorType.NOT_FOUND_ERROR,
            {
                code: 'NOT_FOUND',
                message: 'The requested resource was not found',
                context: { status: 404, url: '/api/products', method: 'GET' },
                retryStrategy: { canRetry: false, maxRetries: 0 }
            }
        );
        this.canRetry.set(false);
    }

    testAuthError(): void {
        this.logEvent('error', 'Testing Authentication Error scenario');
        this.setError(
            'Необходима е оторизация за достъп до този ресурс.',
            'AUTHENTICATION_ERROR',
            ApiErrorType.AUTHENTICATION_ERROR,
            {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
                context: { status: 401, url: '/api/products', requiredRole: 'user' },
                retryStrategy: { canRetry: false, maxRetries: 0 }
            }
        );
        this.canRetry.set(false);
    }

    testForbiddenError(): void {
        this.logEvent('error', 'Testing Forbidden Error scenario');
        this.setError(
            'Нямате права за достъп до този ресурс.',
            'AUTHORIZATION_ERROR',
            ApiErrorType.AUTHORIZATION_ERROR,
            {
                code: 'FORBIDDEN',
                message: 'Access denied to this resource',
                context: { status: 403, url: '/api/products', userRole: 'guest', requiredRole: 'admin' },
                retryStrategy: { canRetry: false, maxRetries: 0 }
            }
        );
        this.canRetry.set(false);
    }

    testValidationError(): void {
        this.logEvent('error', 'Testing Validation Error scenario');
        this.setError(
            'Има проблем с подадените данни.',
            'VALIDATION_ERROR',
            ApiErrorType.VALIDATION_ERROR,
            {
                code: 'VALIDATION_FAILED',
                message: 'Request validation failed',
                fieldErrors: {
                    'productId': ['Product ID is required', 'Product ID must be a valid UUID'],
                    'category': ['Category is required']
                },
                context: { status: 400, url: '/api/products' },
                retryStrategy: { canRetry: false, maxRetries: 0 }
            }
        );
        this.canRetry.set(false);
    }

    testUnknownError(): void {
        this.logEvent('error', 'Testing Unknown Error scenario');
        this.setError(
            'Възникна неизвестна грешка.',
            'UNKNOWN_ERROR',
            null,
            {
                code: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred',
                context: { userAgent: navigator.userAgent, timestamp: new Date().toISOString() }
            }
        );
    }

    testAutoHide(): void {
        this.logEvent('error', 'Testing Auto-Hide functionality (5 seconds)');
        this.autoHideDelay.set(5000);
        this.testNetworkError();
    }

    clearError(): void {
        this.logEvent('dismiss', 'Clearing error state manually');
        this.hasError.set(false);
        this.errorMessage.set('');
        this.errorCode.set('');
        this.errorType.set(null);
        this.originalError.set(null);
        this.isRetrying.set(false);
        this.autoHideDelay.set(0);
        this.canRetry.set(true);
    }

    toggleRetrying(): void {
        const newState = !this.isRetrying();
        this.isRetrying.set(newState);
        this.logEvent('retry', `Retrying state changed to: ${newState}`);
    }

    toggleCanRetry(): void {
        const newState = !this.canRetry();
        this.canRetry.set(newState);
        this.logEvent('retry', `Can retry changed to: ${newState}`);
    }

    // Event handlers
    onErrorRetry(): void {
        this.logEvent('retry', 'User clicked retry button');
        this.isRetrying.set(true);

        // Simulate retry process
        setTimeout(() => {
            this.isRetrying.set(false);
            this.logEvent('retry', 'Retry process completed');
        }, 2000);
    }

    onErrorDismiss(): void {
        this.logEvent('dismiss', 'User dismissed error');
        this.clearError();
    }

    onErrorReport(event: { error: ApiError | null; userComment?: string }): void {
        this.logEvent('report', `User reported error. Comment: "${event.userComment || 'No comment'}"`);
    }

    onErrorDetailsToggle(showDetails: boolean): void {
        this.logEvent('details', `Error details toggled: ${showDetails ? 'shown' : 'hidden'}`);
    }

    // Helper methods
    private setError(message: string, code: string, type: ApiErrorType | null, originalError?: ApiError): void {
        this.hasError.set(true);
        this.errorMessage.set(message);
        this.errorCode.set(code);
        this.errorType.set(type);
        this.originalError.set(originalError || null);
    }

    private logEvent(type: string, message: string): void {
        const currentLog = this.eventLog();
        const newEntry = {
            timestamp: new Date(),
            type,
            message
        };
        this.eventLog.set([...currentLog, newEntry]);
    }

    clearLog(): void {
        this.eventLog.set([]);
    }
}