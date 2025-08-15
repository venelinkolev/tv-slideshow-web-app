import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    inject,
    signal,
    computed,
    HostListener,
    ElementRef,
    Renderer2,
    PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, interval, combineLatest, fromEvent } from 'rxjs';
import { takeUntil, startWith, debounceTime, filter } from 'rxjs/operators';

import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig, SlideshowTvSettings } from '@core/models/slideshow-config.interface';
import { PerformanceLevel, TvPlatform, TvResolution } from '@core/models/enums';
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';
import { TvOptimizationsService } from '@core/services/tv-optimizations.service';
import { SlideShowService } from '../../services/slideshow.service';
import { ProductSlideComponent } from '../product-slide';
import { SlideProgressComponent } from '../slide-progress';

/**
 * Main TV-optimized container component for the slideshow feature.
 * Handles product loading, template selection, and slideshow orchestration
 * with comprehensive TV-specific optimizations.
 * 
 * KEY TV OPTIMIZATIONS:
 * - Dynamic performance adaptation based on TV capabilities
 * - Remote control navigation support
 * - Memory cleanup and leak prevention
 * - TV safe area enforcement
 * - Sleep prevention and fullscreen management
 * - Platform-specific optimizations (WebOS, Tizen, Android TV)
 */
@Component({
    selector: 'app-slideshow-container',
    standalone: true,
    imports: [CommonModule, ProductSlideComponent, SlideProgressComponent],
    templateUrl: './slideshow-container.component.html',
    styleUrls: ['./slideshow-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideShowContainerComponent implements OnInit, OnDestroy {
    // Services injection using Angular 18 inject approach
    private readonly productApiService = inject(ProductApiService);
    private readonly configService = inject(ConfigService);
    private readonly templateRegistry = inject(TemplateRegistryService);
    private readonly performanceMonitor = inject(PerformanceMonitorService);
    private readonly tvOptimizations = inject(TvOptimizationsService);
    private readonly slideShowService = inject(SlideShowService);
    private readonly elementRef = inject(ElementRef);
    private readonly renderer = inject(Renderer2);
    private readonly platformId = inject(PLATFORM_ID);

    // Basic reactive state signals
    protected readonly isLoading = signal<boolean>(true);
    protected readonly hasError = signal<boolean>(false);
    protected readonly errorMessage = signal<string>('');
    protected readonly products = signal<Product[]>([]);
    protected readonly activeTemplate = signal<ProductTemplate | null>(null);
    protected readonly config = signal<SlideshowConfig | null>(null);
    protected readonly currentSlideIndex = signal<number>(0);
    protected readonly isAutoPlaying = signal<boolean>(false);
    protected readonly progress = signal<number>(0);

    // TV-specific reactive state  
    protected readonly performanceLevel = signal<PerformanceLevel>(PerformanceLevel.STANDARD);
    protected readonly isTvDevice = signal<boolean>(false);
    protected readonly tvPlatform = signal<TvPlatform | null>(null);
    protected readonly currentResolution = signal<TvResolution | null>(null);
    protected readonly isFullscreen = signal<boolean>(false);
    protected readonly memoryUsage = signal<number>(0);
    protected readonly currentFPS = signal<number>(0);
    protected readonly sleepPreventionActive = signal<boolean>(false);

    // Computed values for TV optimizations
    protected readonly tvSettings = computed(() => this.config()?.tvOptimizations);
    protected readonly safeAreaEnabled = computed(() => this.tvSettings()?.safeArea?.enabled ?? true);
    protected readonly remoteControlEnabled = computed(() => this.tvSettings()?.remoteControl?.enabled ?? true);
    protected readonly memoryCleanupEnabled = computed(() => this.tvSettings()?.performance?.memoryCleanup ?? true);
    protected readonly preloadCount = computed(() => {
        const performanceLevel = this.performanceLevel();
        const configCount = this.tvSettings()?.performance?.preloadCount ?? 3;

        // Adjust preload count based on performance (numeric enum: 1=LOW, 2=BASIC, 3=STANDARD, 4=HIGH, 5=PREMIUM)
        if (performanceLevel <= PerformanceLevel.LOW) {
            return Math.min(configCount, 1);
        } else if (performanceLevel <= PerformanceLevel.BASIC) {
            return Math.min(configCount, 2);
        } else {
            return configCount;
        }
    });

    // TV-specific styling computed values
    protected readonly safeAreaStyles = computed(() => {
        const tvSettings = this.tvSettings();
        if (!this.safeAreaEnabled() || !tvSettings?.safeArea) {
            return {};
        }

        const { safeArea } = tvSettings;
        if (safeArea.customMargins) {
            return {
                'margin-top': `${safeArea.customMargins.top}px`,
                'margin-right': `${safeArea.customMargins.right}px`,
                'margin-bottom': `${safeArea.customMargins.bottom}px`,
                'margin-left': `${safeArea.customMargins.left}px`,
            };
        }

        const margin = `${safeArea.marginPercentage}%`;
        return {
            'margin': margin
        };
    });

    // Performance-based feature flags (using numeric enum)
    protected readonly animationsEnabled = computed(() => {
        const performanceLevel = this.performanceLevel();
        return performanceLevel > PerformanceLevel.LOW; // Greater than 1
    });

    protected readonly preloadingEnabled = computed(() => {
        const performanceLevel = this.performanceLevel();
        return performanceLevel > PerformanceLevel.LOW; // Greater than 1
    });

    // Cleanup subject for subscription management
    private readonly destroy$ = new Subject<void>();

    // TV-specific cleanup tracking
    private memoryCleanupInterval?: any;
    private performanceCheckInterval?: any;
    protected readonly preloadedImages = new Set<string>();

    // TrackBy function for performance optimization
    protected trackByProductId = (index: number, product: Product): string => {
        return product.id || `product-${index}`;
    };

    readonly currentProduct = computed(() => {
        const products = this.products(); // или съответния signal с продукти
        const index = this.currentSlideIndex(); // или съответния signal с индекс
        return products.length > 0 ? products[index] : null;
    });

    ngOnInit(): void {
        console.log('SlideShowContainerComponent: Initializing with TV optimizations');

        if (isPlatformBrowser(this.platformId)) {
            this.initializeTvOptimizations();
            this.initializeComponent();
            this.setupTvEventListeners();
            // Note: startPerformanceMonitoring is called from initializeComponent
        } else {
            console.warn('SlideShowContainerComponent: Not running in browser environment');
        }
    }

    ngOnDestroy(): void {
        console.log('SlideShowContainerComponent: Cleaning up TV optimizations');

        // Clean up subscriptions
        this.destroy$.next();
        this.destroy$.complete();

        // TV-specific cleanup
        this.cleanupTvOptimizations();
    }

    /**
     * Initialize TV-specific optimizations
     */
    private initializeTvOptimizations(): void {
        console.log('SlideShowContainerComponent: Initializing TV optimizations');

        // Initialize TV optimizations service
        this.tvOptimizations.initialize();

        // Set TV device detection signals
        this.isTvDevice.set(this.tvOptimizations.isTvDevice());

        // Apply TV-safe area styles
        this.applyTvSafeArea();

        // Start sleep prevention if enabled
        if (this.isTvDevice()) {
            this.tvOptimizations.startSleepPrevention();
            this.sleepPreventionActive.set(true);
        }
    }

    /**
     * Initialize main component logic
     */
    private initializeComponent(): void {
        console.log('SlideShowContainerComponent: Initializing component logic');

        // Subscribe to configuration changes
        this.configService.config$
            .pipe(takeUntil(this.destroy$))
            .subscribe(config => {
                if (config) {
                    this.config.set(config);
                    this.loadProducts();
                    this.updateTvSettings(config.tvOptimizations);
                }
            });

        // Start performance monitoring instead of setupPerformanceMonitoring
        this.startPerformanceMonitoring();
    }

    /**
     * Update performance level based on current metrics (using numeric enum)
     */
    private updatePerformanceLevel(fps: number, memoryMB: number): void {
        let newLevel: PerformanceLevel;

        if (fps >= 30 && memoryMB < 60) {
            newLevel = PerformanceLevel.STANDARD; // 3
        } else if (fps >= 25 && memoryMB < 80) {
            newLevel = PerformanceLevel.BASIC; // 2
        } else {
            newLevel = PerformanceLevel.LOW; // 1
        }

        if (newLevel !== this.performanceLevel()) {
            console.log(`SlideShowContainerComponent: Performance level changed to ${this.getPerformanceLevelName(newLevel)}`);
            this.performanceLevel.set(newLevel);
            this.adaptToPerformanceLevel(newLevel);
        }
    }

    /**
     * Get performance level name for logging and display
     */
    protected getPerformanceLevelName(level: PerformanceLevel): string {
        switch (level) {
            case PerformanceLevel.LOW: return 'LOW';
            case PerformanceLevel.BASIC: return 'BASIC';
            case PerformanceLevel.STANDARD: return 'STANDARD';
            case PerformanceLevel.HIGH: return 'HIGH';
            case PerformanceLevel.PREMIUM: return 'PREMIUM';
            default: return 'UNKNOWN';
        }
    }

    /**
     * Adapt slideshow behavior based on performance level (using numeric enum)
     */
    private adaptToPerformanceLevel(level: PerformanceLevel): void {
        console.log(`SlideShowContainerComponent: Adapting to performance level ${this.getPerformanceLevelName(level)}`);

        if (level <= PerformanceLevel.LOW) {
            // Minimal animations, reduced preloading
            this.disableNonEssentialFeatures();
        } else if (level <= PerformanceLevel.BASIC) {
            // Basic animations, limited preloading
            this.enableBasicFeatures();
        } else {
            // Full feature set
            this.enableAllFeatures();
        }
    }

    /**
     * Setup TV-specific event listeners
     */
    private setupTvEventListeners(): void {
        if (!this.remoteControlEnabled()) {
            return;
        }

        console.log('SlideShowContainerComponent: Setting up TV remote control listeners');

        // Remote control navigation
        fromEvent<KeyboardEvent>(document, 'keydown')
            .pipe(
                takeUntil(this.destroy$),
                filter(event => this.isRemoteControlKey(event.key))
            )
            .subscribe(event => {
                this.handleRemoteControlInput(event);
            });

        // Fullscreen change detection
        fromEvent(document, 'fullscreenchange')
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.isFullscreen.set(!!document.fullscreenElement);
            });
    }

    /**
     * Handle remote control input
     */
    @HostListener('document:keydown', ['$event'])
    handleRemoteControlInput(event: KeyboardEvent): void {
        if (!this.remoteControlEnabled()) {
            return;
        }

        const tvSettings = this.tvSettings();
        if (!tvSettings?.remoteControl?.keyMappings) {
            return;
        }

        const { keyMappings } = tvSettings.remoteControl;
        const key = event.key;

        // Prevent default TV browser behavior
        event.preventDefault();
        event.stopPropagation();

        if (keyMappings.nextSlide.includes(key)) {
            this.nextSlide();
        } else if (keyMappings.previousSlide.includes(key)) {
            this.previousSlide();
        } else if (keyMappings.pauseResume.includes(key)) {
            this.toggleAutoPlay();
        } else if (keyMappings.restart.includes(key)) {
            this.restartSlideshow();
        }

        console.log(`SlideShowContainerComponent: Handled remote control input: ${key}`);
    }

    /**
     * Check if key is a remote control key
     */
    private isRemoteControlKey(key: string): boolean {
        const tvSettings = this.tvSettings();
        if (!tvSettings?.remoteControl?.keyMappings) {
            return false;
        }

        const { keyMappings } = tvSettings.remoteControl;
        return [
            ...keyMappings.nextSlide,
            ...keyMappings.previousSlide,
            ...keyMappings.pauseResume,
            ...keyMappings.restart
        ].includes(key);
    }

    /**
     * Apply TV safe area styles
     */
    private applyTvSafeArea(): void {
        if (!this.safeAreaEnabled()) {
            return;
        }

        const styles = this.safeAreaStyles();
        const element = this.elementRef.nativeElement;

        Object.entries(styles).forEach(([property, value]) => {
            this.renderer.setStyle(element, property, value);
        });

        console.log('SlideShowContainerComponent: Applied TV safe area styles', styles);
    }

    /**
     * Update TV settings when configuration changes
     */
    private updateTvSettings(tvSettings: SlideshowTvSettings): void {
        console.log('SlideShowContainerComponent: Updating TV settings', tvSettings);

        // Re-apply safe area if needed
        this.applyTvSafeArea();

        // Update memory cleanup interval
        if (this.memoryCleanupEnabled()) {
            this.setupMemoryCleanup(tvSettings.performance.cleanupInterval);
        }
    }

    /**
     * Setup memory cleanup interval
     */
    private setupMemoryCleanup(interval: number): void {
        if (this.memoryCleanupInterval) {
            clearInterval(this.memoryCleanupInterval);
        }

        this.memoryCleanupInterval = setInterval(() => {
            this.performMemoryCleanup();
        }, interval);

        console.log(`SlideShowContainerComponent: Memory cleanup scheduled every ${interval}ms`);
    }

    /**
     * Perform memory cleanup
     */
    private performMemoryCleanup(): void {
        console.log('SlideShowContainerComponent: Performing memory cleanup');

        // Clear preloaded images cache
        this.preloadedImages.clear();

        // Force garbage collection if available
        if ('gc' in window) {
            (window as any).gc();
        }

        // Clean up DOM if needed
        this.cleanupUnusedDOMElements();
    }

    /**
     * Clean up unused DOM elements
     */
    private cleanupUnusedDOMElements(): void {
        // Remove any temporary elements or cached DOM nodes
        const tempElements = this.elementRef.nativeElement.querySelectorAll('[data-temp="true"]');
        tempElements.forEach((element: Element) => {
            element.remove();
        });
    }

    /**
     * Load products with TV optimizations (public for retry button)
     */
    public loadProducts(): void {
        console.log('SlideShowContainerComponent: Loading products with TV optimizations');

        this.isLoading.set(true);
        this.hasError.set(false);

        this.slideShowService.loadProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (products) => {
                    this.products.set(products);
                    this.isLoading.set(false);
                    this.setupTemplate();
                    this.initializeSlideShow();

                    // Preload images if enabled
                    if (this.preloadingEnabled()) {
                        this.preloadProductImages(products);
                    }
                },
                error: (error) => {
                    console.error('SlideShowContainerComponent: Error loading products', error);
                    this.isLoading.set(false);
                    this.hasError.set(true);
                    this.errorMessage.set('Грешка при зареждане на продуктите. Моля, опитайте отново.');
                }
            });
    }

    /**
     * Preload product images for smooth slideshow
     */
    private preloadProductImages(products: Product[]): void {
        const preloadCount = Math.min(this.preloadCount(), products.length);
        console.log(`SlideShowContainerComponent: Preloading ${preloadCount} product images`);

        for (let i = 0; i < preloadCount; i++) {
            const product = products[i];
            if (product.imageUrl && !this.preloadedImages.has(product.imageUrl)) {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.add(product.imageUrl);
                    console.log(`SlideShowContainerComponent: Preloaded image for ${product.name}`);
                };
                img.onerror = () => {
                    console.warn(`SlideShowContainerComponent: Failed to preload image for ${product.name}`);
                };
                img.src = product.imageUrl;
            }
        }
    }

    /**
     * Setup template with TV optimizations
     */
    private setupTemplate(): void {
        // Template setup implementation will be in next tasks
        console.log('SlideShowContainerComponent: Setting up template');
    }

    /**
     * Initialize slideshow with TV optimizations
     */
    private initializeSlideShow(): void {
        // Slideshow initialization implementation will be in next tasks
        console.log('SlideShowContainerComponent: Initializing slideshow');
        this.isAutoPlaying.set(true);
    }

    /**
     * TV Remote Control Actions
     */
    public nextSlide(): void {
        const products = this.products();
        if (products.length === 0) return;

        const currentIndex = this.currentSlideIndex();
        const nextIndex = (currentIndex + 1) % products.length;
        this.currentSlideIndex.set(nextIndex);

        console.log(`SlideShowContainerComponent: Next slide ${nextIndex + 1}/${products.length}`);
    }

    public previousSlide(): void {
        const products = this.products();
        if (products.length === 0) return;

        const currentIndex = this.currentSlideIndex();
        const prevIndex = currentIndex === 0 ? products.length - 1 : currentIndex - 1;
        this.currentSlideIndex.set(prevIndex);

        console.log(`SlideShowContainerComponent: Previous slide ${prevIndex + 1}/${products.length}`);
    }

    public toggleAutoPlay(): void {
        const newState = !this.isAutoPlaying();
        this.isAutoPlaying.set(newState);
        console.log(`SlideShowContainerComponent: Auto-play ${newState ? 'enabled' : 'disabled'}`);
    }

    public restartSlideshow(): void {
        this.currentSlideIndex.set(0);
        this.isAutoPlaying.set(true);
        console.log('SlideShowContainerComponent: Slideshow restarted');
    }

    public requestFullscreen(): void {
        this.tvOptimizations.requestFullscreen();
    }

    /**
     * Performance-based feature management
     */
    private disableNonEssentialFeatures(): void {
        console.log('SlideShowContainerComponent: Disabling non-essential features for low performance');
        // Implementation for low performance mode
    }

    private enableBasicFeatures(): void {
        console.log('SlideShowContainerComponent: Enabling basic features');
        // Implementation for basic performance mode
    }

    private enableAllFeatures(): void {
        console.log('SlideShowContainerComponent: Enabling all features');
        // Implementation for standard performance mode
    }

    /**
     * Cleanup TV optimizations
     */
    private cleanupTvOptimizations(): void {
        // Stop memory cleanup interval
        if (this.memoryCleanupInterval) {
            clearInterval(this.memoryCleanupInterval);
            this.memoryCleanupInterval = undefined;
        }

        // Stop performance check interval
        if (this.performanceCheckInterval) {
            clearInterval(this.performanceCheckInterval);
            this.performanceCheckInterval = undefined;
        }

        // Clean up TV optimizations service
        this.tvOptimizations.cleanup();

        // Clear preloaded images
        this.preloadedImages.clear();

        console.log('SlideShowContainerComponent: TV optimizations cleaned up');
    }

    /**
     * Start comprehensive performance monitoring
     */
    private startPerformanceMonitoring(): void {
        if (!this.isTvDevice()) {
            return;
        }

        console.log('SlideShowContainerComponent: Starting comprehensive performance monitoring');

        // Performance check every 5 seconds using getCurrentMetrics method
        this.performanceCheckInterval = setInterval(() => {
            const metrics = this.performanceMonitor.getCurrentMetrics();

            // Update signals with current metrics
            this.currentFPS.set(metrics.fps);
            this.memoryUsage.set(metrics.memoryUsageMB);

            // Log performance warnings
            if (metrics.fps < 25) {
                console.warn(`⚠️ Low FPS detected: ${metrics.fps}`);
            }

            if (metrics.memoryUsageMB > 90) {
                console.warn(`⚠️ High memory usage: ${metrics.memoryUsageMB}MB`);
                this.performMemoryCleanup();
            }

            // Update performance level based on metrics
            this.updatePerformanceLevel(metrics.fps, metrics.memoryUsageMB);
        }, 5000);
    }

    // Event handlers for slide events
    handleSlideReady(event: { product: Product; success: boolean }): void {
        console.log('SlideShowContainerComponent.handleSlideReady()', event);

        if (event.success) {
            console.log(`Slide ready for product: ${event.product.name}`);
        } else {
            console.warn(`Slide failed for product: ${event.product.name}`);
        }
    }

    /**
 * Handle image loading errors
 */

    handleImageError(event: { product: Product; error: Event }): void {
        console.warn('SlideShowContainerComponent.handleImageError()', event);

        const { product, error } = event;
        const img = error.target as HTMLImageElement;

        console.warn(`Failed to load image for product: ${product.name}`, img?.src);

        if (img && img.src !== '/assets/images/product-placeholder.jpg') {
            img.src = '/assets/images/product-placeholder.jpg';
        }
    }

    /**
     * Handle progress complete event from SlideProgressComponent
     * ТОВА Е КЛЮЧОВАТА ПРОМЯНА - сега прави реална навигация!
     */
    handleProgressComplete(event: { currentIndex: number; totalSlides: number }): void {
        console.log('SlideShowContainerComponent.handleProgressComplete() - Auto advancing to next slide', event);

        const products = this.products();
        if (products.length === 0) {
            console.warn('No products available for slide advancement');
            return;
        }

        // Навигирай към следващия slide
        this.nextSlide();

        console.log(`Auto-advanced from slide ${event.currentIndex + 1} to next slide`);
    }

    /**
     * Handle progress click event from SlideProgressComponent
     * Навигира директно към кликнатия slide
     */
    handleProgressClick(event: { targetIndex: number; percentage: number }): void {
        console.log('SlideShowContainerComponent.handleProgressClick() - Manual navigation', event);

        const products = this.products();
        const targetIndex = Math.max(0, Math.min(event.targetIndex, products.length - 1));

        // Навигирай към target slide
        this.currentSlideIndex.set(targetIndex);

        console.log(`Manually navigated to slide ${targetIndex + 1}/${products.length}`);
    }
}