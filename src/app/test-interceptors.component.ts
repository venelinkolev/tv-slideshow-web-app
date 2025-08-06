// Test Interceptors Component - Step by Step Testing
// Path: src/app/test-interceptors.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterceptorTestService } from '@core/interceptors/test-interceptors-complete';

/**
 * Temporary component for testing HTTP interceptors
 * Use this to verify that ErrorInterceptor and TimeoutInterceptor work correctly
 */
@Component({
    selector: 'app-test-interceptors',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="test-container">
      <h1>🧪 HTTP Interceptors Test Dashboard</h1>
      
      <div class="test-section">
        <h2>📡 Quick Tests</h2>
        <div class="button-grid">
          <button (click)="runAllTests()" class="btn-primary">
            🚀 Run All Tests
          </button>
          
          <button (click)="testNormalRequest()" class="btn-secondary">
            📱 Test Normal Request
          </button>
          
          <button (click)="testTimeoutRequest()" class="btn-warning">
            ⏰ Test Timeout
          </button>
          
          <button (click)="testErrorRequest()" class="btn-danger">
            🚫 Test 404 Error
          </button>
        </div>
      </div>

      <div class="test-section">
        <h2>🛠️ Utility Functions</h2>
        <div class="button-grid">
          <button (click)="viewLogs()" class="btn-info">
            📋 View Stored Logs
          </button>
          
          <button (click)="clearLogs()" class="btn-secondary">
            🧹 Clear All Logs
          </button>
          
          <button (click)="testBrowserConsole()" class="btn-info">
            🌐 Test Browser Console
          </button>
        </div>
      </div>

      <div class="test-section">
        <h2>📊 Test Results</h2>
        <div class="console-output">
          <p>👆 Click buttons above to run tests</p>
          <p>📺 Check Browser DevTools Console for detailed output</p>
          <p>📝 Check localStorage for interceptor logs</p>
        </div>
      </div>

      <div class="test-section">
        <h2>📚 Instructions</h2>
        <ol class="instructions">
          <li><strong>Open DevTools:</strong> Press F12 or Right-click → Inspect</li>
          <li><strong>Go to Console tab:</strong> Click on "Console" tab</li>
          <li><strong>Click "Run All Tests":</strong> This will test all interceptor scenarios</li>
          <li><strong>Watch Console Output:</strong> Look for ✅ PASSED or ❌ FAILED messages</li>
          <li><strong>Check Network Tab:</strong> See actual HTTP requests being made</li>
          <li><strong>View Logs:</strong> Click "View Stored Logs" to see localStorage data</li>
        </ol>
      </div>
    </div>
  `,
    styles: [`
    .test-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .test-section {
      margin-bottom: 2rem;
      padding: 1rem;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .button-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    button {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: transform 0.2s;
    }

    button:hover {
      transform: translateY(-2px);
    }

    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-info { background: #17a2b8; color: white; }

    .console-output {
      background: #2d3748;
      color: #a0aec0;
      padding: 1rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .instructions {
      line-height: 1.6;
    }

    .instructions li {
      margin-bottom: 0.5rem;
    }

    h1 { color: #2d3748; margin-bottom: 1rem; }
    h2 { color: #4a5568; margin-bottom: 0.5rem; }
  `]
})
export class TestInterceptorsComponent {
    private testService = inject(InterceptorTestService);

    /**
     * Run all interceptor tests
     */
    runAllTests(): void {
        console.log('\n🎬 STARTING COMPLETE INTERCEPTOR TEST SUITE');
        console.log('='.repeat(50));
        console.log('📺 Open DevTools Console to see detailed results');
        console.log('🌐 Check Network tab to see HTTP requests');
        console.log('');

        this.testService.runCompleteInterceptorTest();
    }

    /**
     * Test normal request (should succeed)
     */
    testNormalRequest(): void {
        console.log('\n📱 MANUAL TEST: Normal Request');
        console.log('Expected: Request should succeed with timeout applied');

        this.testService['testNormalRequest']();
    }

    /**
     * Test timeout scenario
     */
    testTimeoutRequest(): void {
        console.log('\n⏰ MANUAL TEST: Timeout Scenario');
        console.log('Expected: Request should timeout (very short custom timeout)');

        this.testService['testTimeoutScenario']();
    }

    /**
     * Test 404 error
     */
    testErrorRequest(): void {
        console.log('\n🚫 MANUAL TEST: 404 Error');
        console.log('Expected: Request should fail with 404 error handling');

        this.testService['testErrorScenario']();
    }

    /**
     * View stored logs from localStorage
     */
    viewLogs(): void {
        console.log('\n📋 VIEWING STORED INTERCEPTOR LOGS');
        console.log('='.repeat(40));

        this.testService.viewStoredLogs();
    }

    /**
     * Clear all stored logs
     */
    clearLogs(): void {
        console.log('\n🧹 CLEARING ALL INTERCEPTOR LOGS');

        this.testService.clearAllLogs();
        console.log('✅ All logs cleared successfully');
    }

    /**
     * Test browser console methods
     */
    testBrowserConsole(): void {
        console.log('\n🌐 TESTING BROWSER CONSOLE METHODS');
        console.log('Available global methods:');
        console.log('- testInterceptors()');
        console.log('- viewInterceptorLogs()');
        console.log('- clearInterceptorLogs()');
        console.log('');
        console.log('Try typing these in the console:');

        // Make methods available
        (window as any).testInterceptors();
        (window as any).viewInterceptorLogs();
    }
}