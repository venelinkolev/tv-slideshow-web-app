import { Injectable, inject, signal, computed, DOCUMENT } from '@angular/core';

import { Observable, BehaviorSubject, interval, fromEvent, combineLatest } from 'rxjs';
import { map, startWith, shareReplay, tap, filter, switchMap } from 'rxjs/operators';

import {
    TvPlatform,
    TvResolution,
    PerformanceLevel,
    SystemHealth,
    SystemHealthStatus,
    ServiceStatusEnum,
    ServiceStatusInterface,
    ValidationResult,
    ValidationError,
    ValidationWarning
} from '@core/models';

// Performance interfaces (defined locally since not exported from barrel)
interface PerformanceMetrics {
    fps: number;
    memoryUsageMB: number;
    loadTimeMs: number;
    slideTransitionMs: number;
    apiResponseTimeMs: number;
    imageLoadTimeMs: number;
}

interface PerformanceThresholds {
    fps: { min: number; warning: number };
    memory: { max: number; warning: number };
    loadTime: { max: number; warning: number };
    apiResponse: { max: number; warning: number };
}

/**
 * Performance Monitor Service for TV Slideshow Application
 * Real-time TV performance monitoring and optimization
 * Features:
 * - FPS monitoring for smooth slideshow operation
 * - Memory usage tracking with TV-specific limits
 * - API response time measurement
 * - TV platform detection and optimization
 * - Health checks and performance alerts
 * - Automatic performance level detection
 */
@Injectable({
    providedIn: 'root'
})
export class PerformanceMonitorService {
    private readonly document = inject(DOCUMENT);

    // TV Performance Targets (matching project models)
    private readonly TV_PERFORMANCE_TARGETS: PerformanceThresholds = {
        fps: { min: 30, warning: 25 },
        memory: { max: 100, warning: 80 },
        loadTime: { max: 3000, warning: 2000 },
        apiResponse: { max: 10000, warning: 5000 }
    };

    // Performance tracking state
    private currentFPS = 0;
    private frameCount = 0;
    private lastFrameTime = performance.now();
    private serviceStartTime = Date.now();
    private apiResponseTimes: number[] = [];
    private imageLoadTimes: number[] = [];

    // Reactive state with Angular 18 Signals
    private readonly metricsSignal = signal<PerformanceMetrics>({
        fps: 0,
        memoryUsageMB: 0,
        loadTimeMs: 0,
        slideTransitionMs: 0,
        apiResponseTimeMs: 0,
        imageLoadTimeMs: 0
    });

    private readonly performanceStatusSignal = signal<'good' | 'warning' | 'critical'>('good');
    private readonly tvPlatformSignal = signal<TvPlatform>(TvPlatform.GENERIC_BROWSER);
    private readonly tvResolutionSignal = signal<TvResolution>(TvResolution.FULL_HD);
    private readonly performanceLevelSignal = signal<PerformanceLevel>(PerformanceLevel.STANDARD);
    private readonly isMonitoringSignal = signal<boolean>(false);

    // Public readonly signals for components
    readonly metrics = this.metricsSignal.asReadonly();
    readonly performanceStatus = this.performanceStatusSignal.asReadonly();
    readonly tvPlatform = this.tvPlatformSignal.asReadonly();
    readonly tvResolution = this.tvResolutionSignal.asReadonly();
    readonly performanceLevel = this.performanceLevelSignal.asReadonly();
    readonly isMonitoring = this.isMonitoringSignal.asReadonly();

    // Computed values
    readonly isPerformanceGood = computed(() => this.performanceStatus() === 'good');
    readonly hasPerformanceWarnings = computed(() => this.performanceStatus() === 'warning');
    readonly hasPerformanceIssues = computed(() => this.performanceStatus() === 'critical');
    readonly uptime = computed(() => Math.floor((Date.now() - this.serviceStartTime) / 1000));

    // Observable streams for external integrations
    private readonly metricsSubject = new BehaviorSubject<PerformanceMetrics>(this.metricsSignal());
    readonly metrics$ = this.metricsSubject.asObservable();

    // Performance monitoring observables
    private readonly fpsMonitor$ = this.createFPSMonitor();
    private readonly memoryMonitor$ = this.createMemoryMonitor();
    private readonly networkMonitor$ = this.createNetworkMonitor();

    constructor() {
        console.log('📊 PerformanceMonitorService initializing...');
        this.initializeMonitoring();
    }

    /**
     * Start comprehensive performance monitoring
     * @returns Observable<PerformanceMetrics>
     */
    startMonitoring(): Observable<PerformanceMetrics> {
        console.log('🚀 PerformanceMonitorService.startMonitoring()');
        this.isMonitoringSignal.set(true);

        // Combine all monitoring streams
        return combineLatest([
            this.fpsMonitor$,
            this.memoryMonitor$,
            this.networkMonitor$
        ]).pipe(
            map(([fps, memory, network]) => {
                const metrics: PerformanceMetrics = {
                    fps,
                    memoryUsageMB: memory,
                    loadTimeMs: this.measurePageLoadTime(),
                    slideTransitionMs: this.getAverageTransitionTime(),
                    apiResponseTimeMs: this.getAverageApiResponseTime(),
                    imageLoadTimeMs: this.getAverageImageLoadTime()
                };

                // Update signals
                this.metricsSignal.set(metrics);
                this.metricsSubject.next(metrics);
                this.updatePerformanceStatus(metrics);

                return metrics;
            }),
            tap(metrics => this.logPerformanceMetrics(metrics)),
            shareReplay(1)
        );
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        console.log('⏹️ PerformanceMonitorService.stopMonitoring()');
        this.isMonitoringSignal.set(false);
    }

    /**
     * Get current performance metrics snapshot
     * @returns PerformanceMetrics
     */
    getCurrentMetrics(): PerformanceMetrics {
        console.log('📸 PerformanceMonitorService.getCurrentMetrics()');
        return this.metricsSignal();
    }

    /**
     * Get performance status
     * @returns Performance status
     */
    getPerformanceStatus(): 'good' | 'warning' | 'critical' {
        console.log('🚥 PerformanceMonitorService.getPerformanceStatus()');
        return this.performanceStatusSignal();
    }

    /**
     * Detect TV platform from user agent
     * @returns TvPlatform
     */
    detectTvPlatform(): TvPlatform {
        console.log('🔍 PerformanceMonitorService.detectTvPlatform()');

        const userAgent = this.document.defaultView?.navigator?.userAgent?.toLowerCase() || '';

        if (userAgent.includes('tizen')) {
            console.log('✅ Detected Samsung Tizen TV');
            this.tvPlatformSignal.set(TvPlatform.SAMSUNG_TIZEN);
            return TvPlatform.SAMSUNG_TIZEN;
        }

        if (userAgent.includes('webos')) {
            console.log('✅ Detected LG WebOS TV');
            this.tvPlatformSignal.set(TvPlatform.LG_WEBOS);
            return TvPlatform.LG_WEBOS;
        }

        if (userAgent.includes('android') && userAgent.includes('tv')) {
            console.log('✅ Detected Android TV');
            this.tvPlatformSignal.set(TvPlatform.ANDROID_TV);
            return TvPlatform.ANDROID_TV;
        }

        if (userAgent.includes('roku')) {
            console.log('✅ Detected Roku TV');
            this.tvPlatformSignal.set(TvPlatform.ROKU_OS);
            return TvPlatform.ROKU_OS;
        }

        if (userAgent.includes('firetv') || userAgent.includes('aftt')) {
            console.log('✅ Detected Fire TV');
            this.tvPlatformSignal.set(TvPlatform.FIRE_TV);
            return TvPlatform.FIRE_TV;
        }

        if (userAgent.includes('appletv')) {
            console.log('✅ Detected Apple TV');
            this.tvPlatformSignal.set(TvPlatform.APPLE_TV);
            return TvPlatform.APPLE_TV;
        }

        if (userAgent.includes('chromecast')) {
            console.log('✅ Detected Chromecast');
            this.tvPlatformSignal.set(TvPlatform.CHROMECAST);
            return TvPlatform.CHROMECAST;
        }

        console.log('📱 Generic browser detected');
        this.tvPlatformSignal.set(TvPlatform.GENERIC_BROWSER);
        return TvPlatform.GENERIC_BROWSER;
    }

    /**
     * Detect TV resolution category
     * @returns TvResolution
     */
    detectTvResolution(): TvResolution {
        console.log('📺 PerformanceMonitorService.detectTvResolution()');

        const width = this.document.defaultView?.screen?.width || this.document.defaultView?.innerWidth || 1920;
        const height = this.document.defaultView?.screen?.height || this.document.defaultView?.innerHeight || 1080;

        console.log(`Screen resolution: ${width}x${height}`);

        let resolution: TvResolution;

        if (width >= 7680 && height >= 4320) {
            resolution = TvResolution.UHD_8K;
            console.log('✅ Detected 8K resolution');
        } else if (width >= 3840 && height >= 2160) {
            resolution = TvResolution.UHD_4K;
            console.log('✅ Detected 4K resolution');
        } else if (width >= 1920 && height >= 1080) {
            resolution = TvResolution.FULL_HD;
            console.log('✅ Detected Full HD resolution');
        } else {
            resolution = TvResolution.HD;
            console.log('✅ Detected HD resolution');
        }

        this.tvResolutionSignal.set(resolution);
        return resolution;
    }

    /**
     * Calculate performance level based on hardware and metrics
     * @returns PerformanceLevel
     */
    calculatePerformanceLevel(): PerformanceLevel {
        console.log('⚡ PerformanceMonitorService.calculatePerformanceLevel()');

        const metrics = this.metricsSignal();
        const resolution = this.tvResolutionSignal();
        const platform = this.tvPlatformSignal();

        let score = 0;

        // Resolution scoring
        switch (resolution) {
            case TvResolution.UHD_8K: score += 5; break;
            case TvResolution.UHD_4K: score += 4; break;
            case TvResolution.FULL_HD: score += 3; break;
            case TvResolution.HD: score += 2; break;
        }

        // Platform scoring
        switch (platform) {
            case TvPlatform.SAMSUNG_TIZEN:
            case TvPlatform.LG_WEBOS:
            case TvPlatform.APPLE_TV: score += 2; break;
            case TvPlatform.ANDROID_TV:
            case TvPlatform.FIRE_TV: score += 1; break;
            default: score += 0;
        }

        // Performance metrics scoring
        if (metrics.fps >= 60) score += 2;
        else if (metrics.fps >= 30) score += 1;

        if (metrics.memoryUsageMB <= 50) score += 2;
        else if (metrics.memoryUsageMB <= 80) score += 1;

        // Calculate final performance level
        let level: PerformanceLevel;
        if (score >= 8) level = PerformanceLevel.PREMIUM;
        else if (score >= 6) level = PerformanceLevel.HIGH;
        else if (score >= 4) level = PerformanceLevel.STANDARD;
        else if (score >= 2) level = PerformanceLevel.BASIC;
        else level = PerformanceLevel.LOW;

        console.log(`✅ Performance level calculated: ${level} (score: ${score})`);
        this.performanceLevelSignal.set(level);
        return level;
    }

    /**
     * Start API response time measurement
     * @param requestName API request identifier
     * @returns Function to end measurement
     */
    startApiMeasurement(requestName: string): () => void {
        const startTime = performance.now();
        console.log(`⏱️ Starting API measurement: ${requestName}`);

        return () => {
            const duration = performance.now() - startTime;
            this.apiResponseTimes.push(duration);

            // Keep only last 10 measurements
            if (this.apiResponseTimes.length > 10) {
                this.apiResponseTimes = this.apiResponseTimes.slice(-10);
            }

            console.log(`✅ API ${requestName} completed in ${duration.toFixed(2)}ms`);

            if (duration > this.TV_PERFORMANCE_TARGETS.apiResponse.warning) {
                this.logPerformanceWarning('API Response', duration, this.TV_PERFORMANCE_TARGETS.apiResponse.warning);
            }
        };
    }

    /**
     * Start image load time measurement
     * @param imageUrl Image URL identifier
     * @returns Function to end measurement
     */
    startImageMeasurement(imageUrl: string): () => void {
        const startTime = performance.now();
        console.log(`🖼️ Starting image load measurement: ${imageUrl}`);

        return () => {
            const duration = performance.now() - startTime;
            this.imageLoadTimes.push(duration);

            // Keep only last 10 measurements
            if (this.imageLoadTimes.length > 10) {
                this.imageLoadTimes = this.imageLoadTimes.slice(-10);
            }

            console.log(`✅ Image loaded in ${duration.toFixed(2)}ms`);

            if (duration > 2000) { // 2 second threshold for TV images
                this.logPerformanceWarning('Image Load', duration, 2000);
            }
        };
    }

    /**
     * Get system health status for admin monitoring
     * @returns SystemHealth
     */
    getSystemHealth(): SystemHealth {
        console.log('🏥 PerformanceMonitorService.getSystemHealth()');

        const metrics = this.metricsSignal();
        const status = this.performanceStatusSignal();

        // Determine overall health status
        let healthStatus: SystemHealthStatus;
        switch (status) {
            case 'good': healthStatus = SystemHealthStatus.HEALTHY; break;
            case 'warning': healthStatus = SystemHealthStatus.DEGRADED; break;
            case 'critical': healthStatus = SystemHealthStatus.UNHEALTHY; break;
        }

        const serviceStatus: ServiceStatusInterface = {
            status: status === 'good' ? ServiceStatusEnum.UP :
                status === 'warning' ? ServiceStatusEnum.DEGRADED : ServiceStatusEnum.DOWN,
            responseTime: metrics.apiResponseTimeMs,
            lastCheck: new Date(),
            details: {
                fps: metrics.fps,
                memory: metrics.memoryUsageMB,
                platform: this.tvPlatformSignal(),
                resolution: this.tvResolutionSignal()
            }
        };

        const systemHealth: SystemHealth = {
            status: healthStatus,
            services: {
                database: serviceStatus,
                cache: serviceStatus,
                fileStorage: serviceStatus
            },
            metrics: {
                uptime: this.uptime(),
                memoryUsage: metrics.memoryUsageMB,
                cpuUsage: 0, // Not available in browser
                diskUsage: 0, // Not available in browser
                responseTime: metrics.apiResponseTimeMs
            },
            version: {
                api: '1.0.0',
                database: '1.0.0',
                buildDate: new Date()
            }
        };

        return systemHealth;
    }

    /**
     * Trigger memory cleanup for TV optimization
     */
    triggerMemoryCleanup(): void {
        console.log('🧹 PerformanceMonitorService.triggerMemoryCleanup()');

        try {
            // Force garbage collection if available
            if (this.document.defaultView && 'gc' in this.document.defaultView) {
                (this.document.defaultView as any).gc();
                console.log('✅ Manual garbage collection triggered');
            }

            // Clear API response time cache
            this.apiResponseTimes = [];
            this.imageLoadTimes = [];

            console.log('✅ Performance caches cleared');

        } catch (error) {
            console.warn('⚠️ Memory cleanup failed:', error);
        }
    }

    // Private helper methods

    private initializeMonitoring(): void {
        console.log('🔧 Initializing performance monitoring...');

        // Detect TV platform and resolution
        this.detectTvPlatform();
        this.detectTvResolution();

        // Start FPS monitoring
        this.startFrameRateMonitoring();

        // Calculate initial performance level
        setTimeout(() => {
            this.calculatePerformanceLevel();
        }, 1000);

        console.log('✅ Performance monitoring initialized');
    }

    private createFPSMonitor(): Observable<number> {
        return interval(1000).pipe(
            map(() => this.currentFPS),
            startWith(30), // Initial FPS estimate
            shareReplay(1)
        );
    }

    private createMemoryMonitor(): Observable<number> {
        return interval(5000).pipe(
            map(() => this.getMemoryInfo().used),
            startWith(50), // Initial memory estimate
            shareReplay(1)
        );
    }

    private createNetworkMonitor(): Observable<boolean> {
        return fromEvent(this.document.defaultView || window, 'online').pipe(
            startWith(navigator.onLine),
            map(() => navigator.onLine),
            shareReplay(1)
        );
    }

    private startFrameRateMonitoring(): void {
        let lastTime = performance.now();
        let frameCount = 0;

        const measureFrame = (currentTime: number) => {
            frameCount++;
            const deltaTime = currentTime - lastTime;

            if (deltaTime >= 1000) {
                this.currentFPS = Math.round(frameCount * 1000 / deltaTime);
                frameCount = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(measureFrame);
        };

        requestAnimationFrame(measureFrame);
        console.log('🎬 Frame rate monitoring started');
    }

    private getMemoryInfo(): { used: number; total: number } {
        if (this.document.defaultView && 'memory' in performance) {
            const memoryInfo = (performance as any).memory;
            return {
                used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
                total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)
            };
        }

        // Fallback estimation
        return { used: 50, total: 100 };
    }

    private measurePageLoadTime(): number {
        if (this.document.defaultView && 'performance' in this.document.defaultView) {
            const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (perfData) {
                return Math.round(perfData.loadEventEnd - perfData.fetchStart);
            }
        }
        return 1500; // Fallback
    }

    private getAverageTransitionTime(): number {
        // TODO: Implement actual slide transition time measurement
        return 800; // Mock transition time
    }

    private getAverageApiResponseTime(): number {
        if (this.apiResponseTimes.length === 0) return 0;
        const sum = this.apiResponseTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.apiResponseTimes.length);
    }

    private getAverageImageLoadTime(): number {
        if (this.imageLoadTimes.length === 0) return 0;
        const sum = this.imageLoadTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.imageLoadTimes.length);
    }

    private updatePerformanceStatus(metrics: PerformanceMetrics): void {
        const targets = this.TV_PERFORMANCE_TARGETS;

        // Check critical thresholds
        if (metrics.fps < targets.fps.min ||
            metrics.memoryUsageMB > targets.memory.max ||
            metrics.loadTimeMs > targets.loadTime.max ||
            metrics.apiResponseTimeMs > targets.apiResponse.max) {
            this.performanceStatusSignal.set('critical');
            return;
        }

        // Check warning thresholds
        if (metrics.fps < targets.fps.warning ||
            metrics.memoryUsageMB > targets.memory.warning ||
            metrics.loadTimeMs > targets.loadTime.warning ||
            metrics.apiResponseTimeMs > targets.apiResponse.warning) {
            this.performanceStatusSignal.set('warning');
            return;
        }

        this.performanceStatusSignal.set('good');
    }

    private logPerformanceMetrics(metrics: PerformanceMetrics): void {
        console.log('📊 Performance Metrics:', {
            fps: `${metrics.fps} FPS`,
            memory: `${metrics.memoryUsageMB} MB`,
            loadTime: `${metrics.loadTimeMs} ms`,
            apiResponse: `${metrics.apiResponseTimeMs} ms`,
            imageLoad: `${metrics.imageLoadTimeMs} ms`,
            status: this.performanceStatusSignal()
        });
    }

    private logPerformanceWarning(metric: string, value: number, threshold: number): void {
        console.warn(`⚠️ PERFORMANCE WARNING: ${metric} = ${value.toFixed(2)} (threshold: ${threshold})`);
    }
}