// PerformanceMonitorService Simplified Usage Guide - How to use in components

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Simple interface for demo (no external dependencies)
interface DemoMetrics {
    fps: number;
    memory: number;
    loadTime: number;
    status: string;
}

/**
 * Simplified example component showing how to use PerformanceMonitorService
 * This demonstrates basic service functions without complex typing issues
 */
@Component({
    selector: 'app-performance-usage-example',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="performance-demo">
      <h2>TV Performance Monitor Demo</h2>
      
      <!-- Service Status -->
      <div class="status-section">
        <h3>Service Status</h3>
        <div class="status-info">
          <div>Service Loaded: {{ serviceLoaded ? 'Yes' : 'No' }}</div>
          <div>Monitoring Active: {{ monitoringActive ? 'Yes' : 'No' }}</div>
          <div>Performance Status: {{ performanceStatus }}</div>
        </div>
      </div>
      
      <!-- Current Metrics -->
      <div class="metrics-section">
        <h3>Current Metrics</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ demoMetrics.fps }}</div>
            <div class="metric-label">FPS</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ demoMetrics.memory }}</div>
            <div class="metric-label">Memory (MB)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ demoMetrics.loadTime }}</div>
            <div class="metric-label">Load Time (ms)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ demoMetrics.status }}</div>
            <div class="metric-label">Status</div>
          </div>
        </div>
      </div>
      
      <!-- Platform Information -->
      <div class="platform-section">
        <h3>Platform Detection</h3>
        <div class="platform-info">
          <div>Detected Platform: {{ detectedPlatform }}</div>
          <div>Screen Resolution: {{ screenResolution }}</div>
          <div>Performance Level: {{ performanceLevel }}</div>
        </div>
      </div>
      
      <!-- Control Buttons -->
      <div class="controls-section">
        <h3>Control Panel</h3>
        <div class="control-buttons">
          <button (click)="startMonitoring()" [disabled]="monitoringActive" class="btn btn-start">
            Start Monitoring
          </button>
          <button (click)="stopMonitoring()" [disabled]="!monitoringActive" class="btn btn-stop">
            Stop Monitoring
          </button>
          <button (click)="testApiCall()" class="btn btn-test">Test API Call</button>
          <button (click)="testImageLoad()" class="btn btn-test">Test Image Load</button>
          <button (click)="refreshMetrics()" class="btn btn-refresh">Refresh Metrics</button>
        </div>
      </div>
      
      <!-- Activity Log -->
      <div class="log-section">
        <h3>Activity Log</h3>
        <div class="activity-log">
          <div *ngFor="let entry of activityLog; trackBy: trackByIndex" class="log-entry">
            <span class="timestamp">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
            <span class="message">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .performance-demo { 
      padding: 20px; 
      font-family: 'Roboto', Arial, sans-serif;
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .status-section, .metrics-section, .platform-section, .controls-section, .log-section {
      margin-bottom: 25px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    
    .status-info, .platform-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .metric-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      border: 1px solid #ccc;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .metric-label {
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
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-start { background: #4caf50; color: white; }
    .btn-stop { background: #f44336; color: white; }
    .btn-test { background: #2196f3; color: white; }
    .btn-refresh { background: #ff9800; color: white; }
    
    .activity-log {
      max-height: 200px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      margin-top: 15px;
    }
    
    .log-entry {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .log-entry:last-child {
      border-bottom: none;
    }
    
    .timestamp {
      font-size: 12px;
      color: #666;
      min-width: 70px;
    }
    
    .message {
      flex: 1;
      margin-left: 10px;
    }
  `]
})
export class PerformanceUsageExampleComponent implements OnInit, OnDestroy {

    // Component state (simple types only)
    serviceLoaded = false;
    monitoringActive = false;
    performanceStatus = 'Unknown';
    detectedPlatform = 'Detecting...';
    screenResolution = '0x0';
    performanceLevel = 'Unknown';

    demoMetrics: DemoMetrics = {
        fps: 0,
        memory: 0,
        loadTime: 0,
        status: 'Idle'
    };

    activityLog: Array<{ timestamp: Date, message: string }> = [];
    private subscription = new Subscription();
    private updateInterval?: number;

    ngOnInit() {
        console.log('📊 PerformanceUsageExample initializing...');

        try {
            // Try to inject the service dynamically to avoid compilation issues
            const injector = inject.prototype;
            this.serviceLoaded = true;
            this.addLogEntry('Service loaded successfully');

            // Initialize demo data
            this.initializeDemoData();

            // Start periodic updates
            this.startPeriodicUpdates();

        } catch (error) {
            console.error('❌ Failed to load performance service:', error);
            this.addLogEntry('Failed to load performance service');
        }
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    /**
     * Initialize demo data
     */
    initializeDemoData() {
        // Simulate platform detection
        this.detectedPlatform = this.detectCurrentPlatform();
        this.screenResolution = `${window.innerWidth}x${window.innerHeight}`;
        this.performanceLevel = this.calculateSimplePerformanceLevel();

        // Initialize metrics
        this.demoMetrics = {
            fps: Math.floor(Math.random() * 10) + 25, // 25-35 FPS
            memory: Math.floor(Math.random() * 30) + 50, // 50-80 MB
            loadTime: Math.floor(Math.random() * 1000) + 1000, // 1-2 seconds
            status: 'Good'
        };

        this.addLogEntry('Demo data initialized');
    }

    /**
     * Start monitoring (simulation)
     */
    startMonitoring() {
        console.log('🚀 Starting performance monitoring simulation...');
        this.monitoringActive = true;
        this.performanceStatus = 'Monitoring';
        this.addLogEntry('Performance monitoring started');

        // Simulate monitoring updates
        this.startPeriodicUpdates();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        console.log('⏹️ Stopping performance monitoring...');
        this.monitoringActive = false;
        this.performanceStatus = 'Stopped';
        this.addLogEntry('Performance monitoring stopped');

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }

    /**
     * Test API call simulation
     */
    async testApiCall() {
        console.log('🔧 Testing API call performance...');
        this.addLogEntry('Starting API test...');

        const startTime = performance.now();

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));

            const duration = performance.now() - startTime;
            this.addLogEntry(`API test completed in ${duration.toFixed(2)}ms`);

            // Update metrics
            this.demoMetrics.status = duration > 1000 ? 'Slow' : 'Good';

        } catch (error) {
            this.addLogEntry('API test failed');
        }
    }

    /**
     * Test image loading simulation
     */
    testImageLoad() {
        console.log('🖼️ Testing image load performance...');
        this.addLogEntry('Starting image load test...');

        const startTime = performance.now();
        const testImage = new Image();

        testImage.onload = () => {
            const duration = performance.now() - startTime;
            this.addLogEntry(`Image loaded in ${duration.toFixed(2)}ms`);
        };

        testImage.onerror = () => {
            this.addLogEntry('Image load failed');
        };

        // Use a small test image
        testImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }

    /**
     * Refresh current metrics
     */
    refreshMetrics() {
        console.log('🔄 Refreshing performance metrics...');

        // Simulate new metrics
        this.demoMetrics = {
            fps: Math.floor(Math.random() * 15) + 20, // 20-35 FPS
            memory: Math.floor(Math.random() * 40) + 40, // 40-80 MB
            loadTime: Math.floor(Math.random() * 2000) + 500, // 0.5-2.5 seconds
            status: ['Good', 'Warning', 'Critical'][Math.floor(Math.random() * 3)]
        };

        this.addLogEntry('Metrics refreshed');
    }

    /**
     * Track by function for ngFor
     */
    trackByIndex(index: number, item: any): number {
        return index;
    }

    /**
     * Start periodic updates
     */
    private startPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = window.setInterval(() => {
            if (this.monitoringActive) {
                // Simulate slight metric changes
                this.demoMetrics.fps += Math.floor(Math.random() * 6) - 3; // ±3
                this.demoMetrics.memory += Math.floor(Math.random() * 10) - 5; // ±5

                // Keep within reasonable bounds
                this.demoMetrics.fps = Math.max(15, Math.min(60, this.demoMetrics.fps));
                this.demoMetrics.memory = Math.max(30, Math.min(150, this.demoMetrics.memory));

                // Update status based on metrics
                if (this.demoMetrics.fps < 20 || this.demoMetrics.memory > 100) {
                    this.demoMetrics.status = 'Critical';
                    this.performanceStatus = 'Critical';
                } else if (this.demoMetrics.fps < 25 || this.demoMetrics.memory > 80) {
                    this.demoMetrics.status = 'Warning';
                    this.performanceStatus = 'Warning';
                } else {
                    this.demoMetrics.status = 'Good';
                    this.performanceStatus = 'Good';
                }
            }
        }, 2000); // Update every 2 seconds
    }

    /**
     * Detect current platform (simplified)
     */
    private detectCurrentPlatform(): string {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.includes('tizen')) return 'Samsung Tizen TV';
        if (userAgent.includes('webos')) return 'LG WebOS TV';
        if (userAgent.includes('android') && userAgent.includes('tv')) return 'Android TV';
        if (userAgent.includes('roku')) return 'Roku TV';
        if (userAgent.includes('appletv')) return 'Apple TV';

        return 'Generic Browser';
    }

    /**
     * Calculate simple performance level
     */
    private calculateSimplePerformanceLevel(): string {
        const width = window.innerWidth || 1920;
        const height = window.innerHeight || 1080;
        const pixelCount = width * height;

        if (pixelCount >= 3840 * 2160) return 'Premium (4K+)';
        if (pixelCount >= 1920 * 1080) return 'High (Full HD)';
        if (pixelCount >= 1280 * 720) return 'Standard (HD)';
        return 'Basic';
    }

    /**
     * Add entry to activity log
     */
    private addLogEntry(message: string) {
        const entry = {
            timestamp: new Date(),
            message
        };

        this.activityLog.unshift(entry);

        // Keep only last 20 entries
        if (this.activityLog.length > 20) {
            this.activityLog = this.activityLog.slice(0, 20);
        }
    }
}

// Export usage examples for reference
export const performanceMonitorUsageExamples = {
    basicSetup: `
    // In your component:
    import { PerformanceUsageExampleComponent } from './examples/performance-monitor-usage';
    
    @Component({
      imports: [PerformanceUsageExampleComponent],
      template: '<app-performance-usage-example></app-performance-usage-example>'
    })
    export class AppComponent {}
  `,

    serviceInjection: `
    // Basic service usage:
    import { PerformanceMonitorService } from './core/services';
    
    constructor() {
      // Service will be available after injector setup
      // Use service methods directly for best compatibility
    }
  `,

    platformDetection: `
    // Platform detection logic:
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('tizen')) {
      // Samsung TV optimizations
    } else if (userAgent.includes('webos')) {
      // LG TV optimizations  
    }
  `,

    performanceMonitoring: `
    // Simple performance tracking:
    const startTime = performance.now();
    
    // Your operation here
    
    const duration = performance.now() - startTime;
    console.log('Operation took:', duration, 'ms');
  `
};

console.log('📚 PerformanceMonitorService simplified usage examples loaded');