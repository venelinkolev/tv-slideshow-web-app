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
    ViewChild,
    AfterViewInit,
    Renderer2,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, interval, combineLatest, fromEvent, firstValueFrom, timer, Subscription, BehaviorSubject } from 'rxjs';
import { takeUntil, startWith, debounceTime, filter, switchMap, tap, finalize } from 'rxjs/operators';

import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig, SlideshowTvSettings } from '@core/models/slideshow-config.interface';
import { PerformanceLevel, TvPlatform, TvResolution } from '@core/models/enums';
import { ProductApiService } from '@core/services/product-api.service';
import { ApiError } from '@core/models/api-response.interface';
import { ApiErrorType } from '@core/models/enums';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';
import { TvOptimizationsService } from '@core/services/tv-optimizations.service';
import { SlideShowService } from '../../services/slideshow.service';
import { ProductSlideComponent } from '../product-slide';
import { SlideProgressComponent } from '../slide-progress';
import { NavigationControlsComponent } from '../navigation-controls';
import { LoadingStateComponent } from '../loading-state';
import { ErrorStateComponent } from '../error-state';
import { TemplateLoaderComponent } from '../template-loader';
import { EmblaCarouselDirective, EmblaCarouselType } from 'embla-carousel-angular';

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
    imports: [CommonModule,
        // ProductSlideComponent, 
        SlideProgressComponent, NavigationControlsComponent, LoadingStateComponent, ErrorStateComponent, EmblaCarouselDirective, TemplateLoaderComponent],
    templateUrl: './slideshow-container.component.html',
    styleUrls: ['./slideshow-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideShowContainerComponent implements OnInit, OnDestroy, AfterViewInit {

    // Tracking за auto-rotation status changes
    private lastAutoRotationStatus: boolean = false;
    private lastConditionsCheck: { [key: string]: boolean } = {};

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
    protected readonly errorCode = signal<string>('');
    protected readonly errorType = signal<ApiErrorType | null>(null);
    protected readonly originalError = signal<ApiError | null>(null);
    protected readonly canRetryError = signal<boolean>(true);
    protected readonly isRetrying = signal<boolean>(false);

    // Auto-rotation timer управление
    private autoRotationTimer$?: Subscription;
    private readonly pausedByUser = signal<boolean>(false);
    private readonly lastUserInteraction = signal<number>(0);
    private readonly autoRotationEnabled = signal<boolean>(true);

    // Performance tracking за auto-rotation
    private readonly performanceThrottled = signal<boolean>(false);

    @ViewChild(EmblaCarouselDirective, { static: false }) emblaCarouselRef!: EmblaCarouselDirective;

    /**
    * Embla carousel instance for programmatic control
    */
    private emblaCarousel = signal<EmblaCarouselType | null>(null);

    // TV-specific reactive state  
    protected readonly performanceLevel = signal<PerformanceLevel>(PerformanceLevel.STANDARD);
    protected readonly isTvDevice = signal<boolean>(false);
    protected readonly tvPlatform = signal<TvPlatform | null>(null);
    protected readonly currentResolution = signal<TvResolution | null>(null);
    protected readonly isFullscreen = signal<boolean>(false);
    protected readonly memoryUsage = signal<number>(0);
    protected readonly currentFPS = signal<number>(60);
    protected readonly sleepPreventionActive = signal<boolean>(false);

    // Timing от конфигурация
    readonly pauseOnInteraction = computed((): boolean => {
        const config = this.config();
        return config?.timing?.pauseOnInteraction === true; // Explicit boolean check
    });

    readonly resumeDelay = computed((): number => {
        const config = this.config();
        return config?.timing?.resumeDelay ?? 3000; // Default fallback
    });

    readonly slideInterval = computed((): number => {
        const config = this.config();
        return config?.timing?.baseSlideDuration ?? 20000; // Default 20 seconds
    });

    readonly transitionDuration = computed((): number => {
        const config = this.config();
        return config?.timing?.transitionDuration ?? 500; // Default 500ms
    });

    // Performance-aware timing adjustments
    readonly effectiveSlideInterval = computed((): number => {
        const baseInterval = this.slideInterval();
        const fps = this.currentFPS();
        const performanceLevel = this.performanceLevel();

        // FIX: Explicit null checks for performance level
        if (performanceLevel !== null && performanceLevel !== undefined) {
            if (performanceLevel <= 1) {
                return Math.max(baseInterval * 1.5, 30000); // Minimum 30s for weak TVs
            } else if (performanceLevel === 2) {
                return Math.max(baseInterval * 1.2, 25000); // Minimum 25s for basic TVs
            }
        }

        // FPS-based adjustments with explicit number checks
        if (typeof fps === 'number') {
            if (fps < 20) {
                return Math.max(baseInterval * 2, 40000); // Double interval for very low FPS
            } else if (fps < 30) {
                return Math.max(baseInterval * 1.3, 30000);
            }
        }

        return baseInterval;
    });

    // Computed values for TV optimizations
    protected readonly tvSettings = computed(() => this.config()?.tvOptimizations);
    protected readonly safeAreaEnabled = computed(() => this.tvSettings()?.safeArea?.enabled ?? true);
    // protected readonly remoteControlEnabled = computed(() => this.tvSettings()?.remoteControl?.enabled ?? true);
    protected readonly remoteControlEnabled = computed(() => {
        const config = this.config();
        return config?.tvOptimizations?.remoteControl?.enabled || false;
    });
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

    // ✅ NEW: Additional computed signals for LoadingStateComponent integration
    readonly loadingProgress = computed(() => {
        const products = this.products();
        const isLoading = this.isLoading();

        if (!isLoading || products.length === 0) {
            return 0;
        }

        // Calculate loading progress based on API response and preloaded images
        const totalExpected = this.config()?.products?.maxProducts || 10;
        const currentLoaded = products.length;

        return Math.min((currentLoaded / totalExpected) * 100, 100);
    });

    readonly loadingMessage = computed(() => {
        const isLoading = this.isLoading();
        const hasError = this.hasError();
        const products = this.products();

        if (hasError) {
            return 'Възникна грешка при зареждането...';
        }

        if (!isLoading) {
            return '';
        }

        if (products.length === 0) {
            return 'Свързване със сървъра...';
        }

        return `Зареждане на продукти (${products.length}/${this.config()?.products?.maxProducts || 10})...`;
    });

    readonly shouldShowLoadingProgress = computed(() => {
        const isLoading = this.isLoading();
        const products = this.products();
        const performanceLevel = this.performanceLevel();

        // Show progress only for STANDARD and higher performance levels
        return isLoading && products.length > 0 && performanceLevel >= PerformanceLevel.STANDARD;
    });

    readonly enableDetailedLoadingMessages = computed(() => {
        const performanceLevel = this.performanceLevel();
        // Enable detailed messages for HIGH and PREMIUM levels
        return performanceLevel >= PerformanceLevel.HIGH;
    });

    // ✅ НОВИ: Правилни computed signals
    readonly currentSlideInterval = computed(() => {
        const config = this.config();
        return config?.timing?.baseSlideDuration || 20000;
    });

    readonly currentTemplate = computed(() => {
        const config = this.config();
        return config?.templates?.selectedTemplateId || 'classic';
    });

    readonly showProgressIndicators = computed(() => {
        const config = this.config();
        return config?.general?.showProgressIndicators || false;
    });

    /**
     * TV-optimized Embla carousel options
     * Computed signal that reacts to config changes
     */
    readonly emblaOptions = computed(() => {
        const config = this.config();
        const performanceLevel = this.performanceLevel();

        if (!config) {
            return this.getDefaultEmblaOptions();
        }

        return {
            // Basic carousel configuration
            loop: true,
            align: 'center' as const,
            skipSnaps: false,
            containScroll: 'trimSnaps' as const,

            // TV-optimized drag settings (disabled for programmatic control only)
            dragFree: false,
            draggable: false,

            // Performance optimizations based on TV capabilities
            ...(performanceLevel && performanceLevel <= 2 ? {
                // Low performance TV settings
                duration: 50, // Faster transitions for weak hardware
                watchDrag: false,
                watchResize: false,
            } : {
                // Standard performance settings  
                duration: 30,
                watchDrag: false,
                watchResize: true,
            }),

            // Auto-play settings (handled by our custom logic)
            startIndex: 0,
        };
    });

    ngOnInit(): void {
        console.log('SlideShowContainerComponent: Initializing with TV optimizations');

        if (isPlatformBrowser(this.platformId)) {
            this.initializeTvOptimizations();
            this.initializeComponent();
            this.setupTvEventListeners();
            this.initializeAutoRotation();
            // Note: startPerformanceMonitoring is called from initializeComponent
        } else {
            console.warn('SlideShowContainerComponent: Not running in browser environment');
        }
    }

    ngOnDestroy(): void {
        console.log('SlideShowContainerComponent: Cleaning up TV optimizations');

        this.stopAutoRotation();

        // Clean up subscriptions
        this.destroy$.next();
        this.destroy$.complete();

        // TV-specific cleanup
        this.cleanupTvOptimizations();
    }

    /**
 * Initialize Embla carousel after view init
 */
    ngAfterViewInit(): void {
        // Initialize Embla carousel with delay to ensure DOM is ready
        setTimeout(() => {
            this.initializeEmblaCarousel();
        }, 100);

        if (typeof window !== 'undefined') {
            (window as any).debugSlideshow = {
                getStatus: () => this.debugGetAutoRotationStatus(),
                triggerTick: () => this.debugTriggerAutoRotationTick(),
                startRotation: () => this.startAutoRotation(),
                stopRotation: () => this.stopAutoRotation(),
                restart: () => this.debugRestartAutoRotation(),
                checkConditions: () => this.shouldAutoRotationBeRunning(),
                forceStart: () => this.forceStartAutoRotation(), // НОВ МЕТОД
                clearLogs: () => console.clear() // НОВ МЕТОД
            };
            console.log('🧪 Enhanced debug slideshow methods:');
            console.log('  window.debugSlideshow.forceStart() - Force start rotation');
            console.log('  window.debugSlideshow.getStatus() - Get detailed status');
            console.log('  window.debugSlideshow.clearLogs() - Clear console');
        }
    }

    /**
 * Initialize Embla carousel instance
 */
    private initializeEmblaCarousel(): void {
        if (!this.emblaCarouselRef) {
            console.warn('Embla carousel ref not available');
            return;
        }

        // Get carousel instance from directive
        const carouselInstance = this.emblaCarouselRef.emblaApi;

        if (carouselInstance) {
            console.log('SlideShowContainerComponent: Embla carousel initialized');
            this.emblaCarousel.set(carouselInstance);
            this.setupEmblaEventListeners(carouselInstance);

            // Set initial slide position
            const currentIndex = this.currentSlideIndex();
            if (currentIndex > 0) {
                carouselInstance.scrollTo(currentIndex, false); // Jump without animation
            }
        } else {
            console.warn('Failed to get Embla carousel instance');
        }
    }

    /**
     * Setup Embla carousel event listeners for TV optimization
     */
    private setupEmblaEventListeners(emblaCarousel: EmblaCarouselType): void {
        // Listen for slide changes
        emblaCarousel.on('select', () => {
            const selectedIndex = emblaCarousel.selectedScrollSnap();
            const currentIndex = this.currentSlideIndex();

            console.log(`Embla carousel select event: ${selectedIndex} (current: ${currentIndex})`);

            // Sync with our internal state САМО ако има реална промяна
            if (selectedIndex !== currentIndex) {
                console.log(`Updating currentSlideIndex: ${currentIndex} -> ${selectedIndex}`);
                this.currentSlideIndex.set(selectedIndex);
            }
        });

        // Listen for settle events (when transition completes)
        emblaCarousel.on('settle', () => {
            console.log('Embla carousel transition settled');

            // Performance monitoring: track transition time
            if (this.performanceMonitor) {
                const measurementEnd = this.performanceMonitor.startApiMeasurement('carousel_transition');
                measurementEnd(); // End measurement immediately for now
            }
        });

        // Listen for resize events (TV resolution changes)
        emblaCarousel.on('resize', () => {
            console.log('Embla carousel resized - TV resolution changed');

            // Re-align carousel after resolution change
            emblaCarousel.reInit();
        });

        // Listen for init event
        emblaCarousel.on('init', () => {
            console.log('Embla carousel fully initialized');
        });
    }

    /**
     * Get default Embla options for fallback scenarios
     */
    private getDefaultEmblaOptions() {
        return {
            loop: true,
            align: 'center' as const,
            dragFree: false,
            draggable: false,
            duration: 30,
            skipSnaps: false,
            containScroll: 'trimSnaps' as const,
            startIndex: 0,
        };
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

        // ⚡ PATCH: Call loadProducts() immediately while config subscription runs in parallel
        console.log('🚀 PATCH: Starting product loading immediately (non-blocking)');
        this.loadProducts();

        // ✅ Original config subscription (unchanged logic)
        this.configService.config$
            .pipe(takeUntil(this.destroy$))
            .subscribe(config => {
                console.log('📋 Config update received:', config);
                if (config) {
                    this.config.set(config);
                    this.updateTvSettings(config.tvOptimizations);

                    // Optional: Reload products only if this is a significant config change
                    // (Skip on initial load since we already called loadProducts above)
                    const isInitialLoad = this.products().length === 0;
                    if (!isInitialLoad) {
                        console.log('🔄 Config changed after initial load, refreshing products');
                        this.loadProducts();
                    }
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
        // fromEvent<KeyboardEvent>(document, 'keydown')
        //     .pipe(
        //         takeUntil(this.destroy$),
        //         filter(event => this.isRemoteControlKey(event.key))
        //     )
        //     .subscribe(event => {
        //         this.handleRemoteControlInput(event);
        //     });

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
    // handleRemoteControlInput(event: KeyboardEvent): void {
    //     if (!this.remoteControlEnabled()) {
    //         return;
    //     }

    //     const tvSettings = this.tvSettings();
    //     if (!tvSettings?.remoteControl?.keyMappings) {
    //         return;
    //     }

    //     const { keyMappings } = tvSettings.remoteControl;
    //     const key = event.key;

    //     // Prevent default TV browser behavior
    //     event.preventDefault();
    //     event.stopPropagation();

    //     if (keyMappings.nextSlide.includes(key)) {
    //         this.nextSlide();
    //     } else if (keyMappings.previousSlide.includes(key)) {
    //         this.previousSlide();
    //     } else if (keyMappings.pauseResume.includes(key)) {
    //         this.toggleAutoPlay();
    //     } else if (keyMappings.restart.includes(key)) {
    //         this.restartSlideshow();
    //     }

    //     console.log(`SlideShowContainerComponent: Handled remote control input: ${key}`);
    // }

    /**
     * Check if key is a remote control key
     */
    // private isRemoteControlKey(key: string): boolean {
    //     const tvSettings = this.tvSettings();
    //     if (!tvSettings?.remoteControl?.keyMappings) {
    //         return false;
    //     }

    //     const { keyMappings } = tvSettings.remoteControl;
    //     return [
    //         ...keyMappings.nextSlide,
    //         ...keyMappings.previousSlide,
    //         ...keyMappings.pauseResume,
    //         ...keyMappings.restart
    //     ].includes(key);
    // }

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
    /**
    * Load products using SlideShowService (correct architecture)
    * SlideShowService adds slideshow-specific business logic on top of ProductApiService
    */
    private async loadProducts(): Promise<void> {
        console.log('SlideShowContainerComponent.loadProducts() - Using SlideShowService');

        try {
            this.isLoading.set(true);
            this.hasError.set(false);

            // ✅ CORRECT: Use SlideShowService which adds slideshow business logic
            // This includes: config-based product limiting, slideshow-specific processing
            const products = await firstValueFrom(this.slideShowService.loadProducts());

            if (products && products.length > 0) {
                this.products.set(products);
                console.log(`✅ Loaded ${products.length} products successfully (via SlideShowService)`);
            } else {
                console.warn('No products returned from SlideShowService');
                this.setError('Няма налични продукти за показване.', 'NO_PRODUCTS', null);
            }

        } catch (error: any) {
            console.error('Failed to load products from SlideShowService:', error);
            this.handleProductLoadingError(error);
        } finally {
            this.isLoading.set(false);
        }
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
  * Handle carousel slide change
  */
    onCarouselChange(event: any): void {
        console.log('SlideShowContainerComponent.onCarouselChange:', event);

        if (event && typeof event.startPosition === 'number') {
            const newIndex = event.startPosition;
            console.log(`Carousel changed to slide: ${newIndex}`);
            this.currentSlideIndex.set(newIndex);
        }
    }

    /**
     * TV Remote Control Actions
     */

    /**
  * Toggle auto play functionality - enhanced version
  */
    public toggleAutoPlay(): void {
        const newState = !this.autoRotationEnabled();
        this.autoRotationEnabled.set(newState);

        if (newState) {
            console.log('Auto-rotation enabled by user');
            this.startAutoRotation();
        } else {
            console.log('Auto-rotation disabled by user');
            this.stopAutoRotation();
        }

        this.isAutoPlaying.set(newState);
    }

    public restartSlideshow(): void {
        this.currentSlideIndex.set(0);
        this.isAutoPlaying.set(true);
        console.log('SlideShowContainerComponent: Slideshow restarted');
    }

    public requestFullscreen(): void {
        this.tvOptimizations.requestFullscreen();
    }

    // =====================================
    // EMBLA CAROUSEL EVENT HANDLERS
    // =====================================

    /**
     * Handle Embla carousel initialization
     * Called when carousel is ready
     */
    onEmblaCarouselInit(emblaCarousel: EmblaCarouselType): void {
        console.log('SlideShowContainerComponent.onEmblaCarouselInit() - Embla carousel initialized');

        this.emblaCarousel.set(emblaCarousel);

        // Setup carousel event listeners
        this.setupEmblaEventListeners(emblaCarousel);

        // Initialize carousel position
        const currentIndex = this.currentSlideIndex();
        if (currentIndex > 0) {
            emblaCarousel.scrollTo(currentIndex, false); // Jump without animation
        }
    }


    // =====================================
    // EMBLA CAROUSEL NAVIGATION METHODS
    // =====================================

    /**
   * Navigate to next slide using Embla carousel
   * Enhanced version with auto-rotation integration
   */
    nextSlide(): void {
        console.log('SlideShowContainerComponent.nextSlide() - Manual navigation with pause');

        // Pause auto-rotation for manual interaction
        this.handleUserInteraction();

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (products.length === 0) {
            console.warn('No products available for navigation');
            return;
        }

        if (!carousel) {
            console.warn('Embla carousel not ready - using fallback navigation');
            this.fallbackNextSlide();
            return;
        }

        // Проверка дали carousel може да навигира
        if (carousel.canScrollNext()) {
            console.log('Using Embla scrollNext()');
            carousel.scrollNext();
        } else {
            console.log('Carousel at end - using loop navigation');
            carousel.scrollTo(0, false); // Jump to beginning
        }
    }

    /**
     * Navigate to previous slide using Embla carousel
     * Enhanced version with auto-rotation integration
     */
    previousSlide(): void {
        console.log('SlideShowContainerComponent.previousSlide() - Manual navigation with pause');

        // Pause auto-rotation for manual interaction
        this.handleUserInteraction();

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (products.length === 0) {
            console.warn('No products available for navigation');
            return;
        }

        if (!carousel) {
            console.warn('Embla carousel not ready - using fallback navigation');
            this.fallbackPreviousSlide();
            return;
        }

        // Проверка дали carousel може да навигира
        if (carousel.canScrollPrev()) {
            console.log('Using Embla scrollPrev()');
            carousel.scrollPrev();
        } else {
            console.log('Carousel at beginning - using loop navigation');
            carousel.scrollTo(products.length - 1, false); // Jump to end
        }
    }

    /**
     * Navigate to specific slide using Embla carousel
     * Enhanced method for direct navigation
     */
    goToSlide(targetIndex: number, smooth: boolean = true): void {
        console.log(`SlideShowContainerComponent.goToSlide(${targetIndex}, ${smooth}) - Direct navigation`);

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (products.length === 0) {
            console.warn('No products available for direct navigation');
            return;
        }

        // Validate target index
        const validIndex = Math.max(0, Math.min(targetIndex, products.length - 1));

        if (!carousel) {
            console.warn('Embla carousel not ready - using fallback for direct navigation');
            this.currentSlideIndex.set(validIndex);
            return;
        }

        // Use Embla's scrollTo - второто bool parameter е immediate (true = no animation)
        console.log(`Using Embla scrollTo(${validIndex}, ${!smooth})`);
        carousel.scrollTo(validIndex, !smooth);

        // NOTE: currentSlideIndex се обновява автоматично от select event
    }
    // =====================================
    // FALLBACK NAVIGATION METHODS
    // =====================================

    /**
     * Fallback next slide method when Embla is not ready
     */
    private fallbackNextSlide(): void {
        const products = this.products();
        if (products.length === 0) return;

        const currentIndex = this.currentSlideIndex();
        const nextIndex = (currentIndex + 1) % products.length;
        this.currentSlideIndex.set(nextIndex);
    }

    /**
     * Fallback previous slide method when Embla is not ready
     */
    private fallbackPreviousSlide(): void {
        const products = this.products();
        if (products.length === 0) return;

        const currentIndex = this.currentSlideIndex();
        const prevIndex = currentIndex === 0 ? products.length - 1 : currentIndex - 1;
        this.currentSlideIndex.set(prevIndex);
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
        console.log('SlideShowContainerComponent.handleProgressClick() - Manual progress navigation', event);

        const products = this.products();
        const targetIndex = Math.max(0, Math.min(event.targetIndex, products.length - 1));

        if (products.length === 0) {
            console.warn('No products available for progress navigation');
            return;
        }

        // Use goToSlide method which handles Embla carousel properly
        this.goToSlide(targetIndex, true);

        console.log(`Progress navigation to slide ${targetIndex + 1}/${products.length}`);
    }

    // Handle help toggle from navigation controls
    onHelpToggle(helpVisible: boolean): void {
        console.log(`SlideShowContainerComponent.onHelpToggle(${helpVisible}) - Help overlay toggled`);
        // Optional: could track help usage statistics
    }

    // Enhanced methods за по-добра интеграция
    hasProducts(): boolean {
        return this.products().length > 0;
    }

    // =====================================
    // ERROR STATE COMPONENT EVENT HANDLERS
    // =====================================

    /**
     * Handle retry action from ErrorStateComponent
     */
    onErrorRetry(): void {
        console.log('SlideShowContainerComponent.onErrorRetry() - User initiated retry');

        this.isRetrying.set(true);
        this.hasError.set(false);

        // Retry loading products
        this.loadProducts().finally(() => {
            this.isRetrying.set(false);
        });
    }

    /**
     * Handle error dismissal from ErrorStateComponent
     */
    onErrorDismiss(): void {
        console.log('SlideShowContainerComponent.onErrorDismiss() - User dismissed error');

        this.hasError.set(false);
        this.errorMessage.set('');
        this.errorCode.set('');
        this.errorType.set(null);
        this.originalError.set(null);
    }

    /**
     * Handle error reporting from ErrorStateComponent
     */
    onErrorReport(event: { error: ApiError | null; userComment?: string }): void {
        console.log('SlideShowContainerComponent.onErrorReport() - User reported error', event);

        // TODO: Implement error reporting to backend or analytics service
        // For now, just log the report
        console.log('Error report details:', {
            error: event.error,
            userComment: event.userComment,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            currentConfig: this.config()
        });

        // You could send this to an analytics service or backend
        // this.analyticsService.reportError(event);
    }

    /**
     * Handle error details toggle from ErrorStateComponent
     */
    onErrorDetailsToggle(showDetails: boolean): void {
        console.log(`SlideShowContainerComponent.onErrorDetailsToggle(${showDetails}) - Details visibility changed`);
        // Optional: track error details usage for UX improvements
    }

    // =====================================
    // ENHANCED ERROR HANDLING (PRIVATE METHODS)
    // =====================================

    /**
     * Set error state with enhanced error information
     */
    private setError(
        message: string,
        code: string,
        type: ApiErrorType | null,
        originalError: ApiError | null = null,
        canRetry: boolean = true
    ): void {
        console.log(`SlideShowContainerComponent.setError() - ${code}: ${message}`);

        this.hasError.set(true);
        this.errorMessage.set(message);
        this.errorCode.set(code);
        this.errorType.set(type);
        this.originalError.set(originalError);
        this.canRetryError.set(canRetry);
    }

    /**
     * Handle product loading errors with error categorization
     */
    private handleProductLoadingError(error: any): void {
        console.log('SlideShowContainerComponent.handleProductLoadingError() - Processing error', error);

        let errorMessage = 'Възникна грешка при зареждане на продуктите.';
        let errorCode = 'UNKNOWN_ERROR';
        let errorType: ApiErrorType | null = null;
        let canRetry = true;
        let originalError: ApiError | null = null;

        // Analyze error type
        if (error?.status === 0) {
            errorMessage = 'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.';
            errorCode = 'NETWORK_ERROR';
            errorType = ApiErrorType.NETWORK_ERROR;
        } else if (error?.status >= 500) {
            errorMessage = 'Възникна техническа грешка на сървъра. Опитайте отново след няколко минути.';
            errorCode = 'SERVER_ERROR';
            errorType = ApiErrorType.SERVER_ERROR;
        } else if (error?.status === 404) {
            errorMessage = 'API адресът не е намерен. Моля, свържете се с администратор.';
            errorCode = 'NOT_FOUND_ERROR';
            errorType = ApiErrorType.NOT_FOUND_ERROR;
            canRetry = false;
        } else if (error?.status === 401 || error?.status === 403) {
            errorMessage = 'Няма права за достъп до продуктите. Моля, свържете се с администратор.';
            errorCode = 'AUTHORIZATION_ERROR';
            errorType = ApiErrorType.AUTHORIZATION_ERROR;
            canRetry = false;
        }

        // Check if it's a structured API error
        if (error?.error && typeof error.error === 'object') {
            originalError = error.error as ApiError;
            if (originalError.message) {
                errorMessage = originalError.message;
            }
            if (originalError.code) {
                errorCode = originalError.code;
            }
            if (originalError.retryStrategy) {
                canRetry = originalError.retryStrategy.canRetry;
            }
        }

        this.setError(errorMessage, errorCode, errorType, originalError, canRetry);
    }

    // =====================================
    // TEMPLATE LOADER COMPONENT EVENT HANDLERS
    // =====================================

    /**
     * Handle template loaded event from TemplateLoaderComponent
     */
    onTemplateLoaded(event: { templateName: string; success: boolean; loadTime: number }): void {
        console.log('SlideShowContainerComponent.onTemplateLoaded() - Template loaded successfully', event);

        if (event.success) {
            console.log(`Template '${event.templateName}' loaded in ${event.loadTime.toFixed(2)}ms`);
        }
    }

    /**
     * Handle template error event from TemplateLoaderComponent
     */
    onTemplateError(event: { templateName: string; error: string; fallbackUsed: boolean }): void {
        console.error('SlideShowContainerComponent.onTemplateError() - Template loading failed', event);

        if (event.fallbackUsed) {
            console.log(`Fallback template used for failed template '${event.templateName}'`);
        }
    }

    /**
     * Handle component ready event from TemplateLoaderComponent
     */
    onComponentReady(event: { product: Product; template: string }): void {
        console.log('SlideShowContainerComponent.onComponentReady() - Template component ready', event);

        // Може да се добави логика за performance tracking тук
    }

    // =====================================
    //  AUTO-ROTATION СИСТЕМА
    // =====================================

    /**
     * Initialize enhanced auto-rotation system
     * Integrates with Embla carousel and config reactivity
     */
    private initializeAutoRotation(): void {
        console.log('SlideShowContainerComponent: Initializing enhanced auto-rotation system (RxJS)');

        // Simple approach: Start monitoring conditions immediately
        this.startAutoRotationMonitoring();

        // Monitor performance for rotation adjustments  
        this.setupPerformanceMonitoring();

        // Listen for user interactions to pause rotation
        this.setupInteractionHandlers();

        // Start auto-rotation if conditions are met
        this.checkAndStartAutoRotation();
    }

    /**
 * Start monitoring auto-rotation conditions
 */
    private startAutoRotationMonitoring(): void {
        console.log('🔍 Starting optimized auto-rotation monitoring');

        // Monitor config changes (reactive)
        this.configService.config$.pipe(
            takeUntil(this.destroy$),
            debounceTime(100)
        ).subscribe((config) => {
            console.log('⚙️  Config changed - checking auto-rotation conditions');
            setTimeout(() => this.checkAndStartAutoRotation(), 50);
        });

        // Monitor conditions less frequently and only log changes
        interval(3000).pipe( // Намалих от 1000 на 3000ms
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.checkAutoRotationStatusChange();
        });
    }

    /**
 * Check auto-rotation status and only log when there are changes
 */
    private checkAutoRotationStatusChange(): void {
        const shouldBeRunning = this.shouldAutoRotationBeRunning();
        const isCurrentlyRunning = !!this.autoRotationTimer$;

        // Only log if status changed
        if (shouldBeRunning !== this.lastAutoRotationStatus) {
            console.log(`🔄 Auto-rotation status changed: ${this.lastAutoRotationStatus} -> ${shouldBeRunning}`);
            this.lastAutoRotationStatus = shouldBeRunning;

            if (shouldBeRunning && !isCurrentlyRunning) {
                console.log('▶️  Starting auto-rotation (conditions met)');
                this.checkAndStartAutoRotation();
            } else if (!shouldBeRunning && isCurrentlyRunning) {
                console.log('⏹️  Stopping auto-rotation (conditions not met)');
                this.stopAutoRotation();
            }
        }

        // Check if timer status doesn't match expected status
        if (shouldBeRunning && !isCurrentlyRunning) {
            console.warn('⚠️  Timer should be running but is not - attempting restart');
            this.checkAndStartAutoRotation();
        }
    }
    /**
     * Check if auto-rotation should be running
     */
    private shouldAutoRotationBeRunning(): boolean {
        const products = this.products();
        const config = this.config();
        const enabled = this.autoRotationEnabled();

        const conditions = {
            hasProducts: products.length > 1,
            hasConfig: config !== null && config !== undefined,
            isEnabled: enabled === true,
            notPausedByUser: this.pausedByUser() === false
        };

        // Only log if conditions changed
        const conditionsChanged = JSON.stringify(conditions) !== JSON.stringify(this.lastConditionsCheck);
        if (conditionsChanged) {
            console.log('📋 Auto-rotation conditions changed:', conditions);
            this.lastConditionsCheck = { ...conditions };
        }

        return conditions.hasProducts &&
            conditions.hasConfig &&
            conditions.isEnabled &&
            conditions.notPausedByUser;
    }

    /**
     * Check conditions and start auto-rotation if appropriate
     */
    private checkAndStartAutoRotation(): void {
        console.log('Checking auto-rotation start conditions...');

        if (this.shouldAutoRotationBeRunning()) {
            console.log('✅ All conditions met - starting auto-rotation');
            this.startAutoRotation();
        } else {
            console.log('❌ Conditions not met for auto-rotation');
            this.stopAutoRotation();
        }
    }

    /**
     * Start auto-rotation timer with current settings
     */
    private startAutoRotation(): void {
        // Stop existing timer first
        if (this.autoRotationTimer$) {
            console.log('Stopping existing auto-rotation timer before restart');
            this.autoRotationTimer$.unsubscribe();
            this.autoRotationTimer$ = undefined;
        }

        const interval = this.effectiveSlideInterval();
        const products = this.products();

        console.log('🔧 Starting auto-rotation setup:', {
            interval,
            productsCount: products.length,
            autoRotationEnabled: this.autoRotationEnabled(),
            pausedByUser: this.pausedByUser(),
            hasEmblaCarousel: !!this.emblaCarousel()
        });

        if (products.length <= 1) {
            console.log('❌ Not enough products for auto-rotation');
            this.isAutoPlaying.set(false);
            return;
        }

        console.log(`🚀 Starting auto-rotation timer with ${interval}ms interval`);
        this.isAutoPlaying.set(true);

        this.autoRotationTimer$ = timer(interval, interval).pipe(
            takeUntil(this.destroy$),
            filter(() => {
                const notPaused = this.pausedByUser() === false;
                const enabled = this.autoRotationEnabled() === true;
                const hasCarousel = !!this.emblaCarousel();

                if (!notPaused) {
                    console.log('⏸️  Auto-rotation tick skipped - paused by user');
                    return false;
                }
                if (!enabled) {
                    console.log('⏸️  Auto-rotation tick skipped - disabled');
                    return false;
                }
                if (!hasCarousel) {
                    console.log('⏸️  Auto-rotation tick skipped - no carousel');
                    return false;
                }

                return true;
            }),
            tap(() => {
                console.log('🎯 Auto-rotation tick - advancing to next slide');
            })
        ).subscribe({
            next: () => {
                this.nextSlideWithRotation();
            },
            error: (error) => {
                console.error('❌ Auto-rotation timer error:', error);
                this.handleAutoRotationError(error);
            },
            complete: () => {
                console.log('Auto-rotation timer completed');
            }
        });

        console.log('✅ Auto-rotation timer created successfully');
    }

    /**
     * Stop auto-rotation timer
     */
    private stopAutoRotation(): void {
        if (this.autoRotationTimer$) {
            console.log('🛑 Stopping auto-rotation timer');
            this.autoRotationTimer$.unsubscribe();
            this.autoRotationTimer$ = undefined;
            this.isAutoPlaying.set(false);
        } else {
            console.log('⚪ Auto-rotation timer already stopped');
        }
    }

    /**
     * Restart auto-rotation with new settings
     */
    private restartAutoRotation(): void {
        console.log('Restarting auto-rotation with updated settings');
        this.stopAutoRotation();

        // Small delay to ensure clean restart
        setTimeout(() => {
            this.startAutoRotation();
        }, 100);
    }

    /**
     * Pause auto-rotation temporarily
     */
    public pauseAutoRotation(): void {
        console.log('Pausing auto-rotation due to user interaction');
        this.pausedByUser.set(true);
        this.lastUserInteraction.set(Date.now());
    }

    /**
     * Resume auto-rotation after user interaction delay
     */
    public resumeAutoRotation(): void {
        const shouldPause = this.pauseOnInteraction();
        if (!shouldPause) {
            console.log('Auto-rotation continues - pause on interaction disabled');
            return;
        }

        const resumeDelay = this.resumeDelay();
        console.log(`Resuming auto-rotation after ${resumeDelay}ms delay`);

        setTimeout(() => {
            if (!this.pausedByUser()) {
                console.log('Auto-rotation already resumed');
                return;
            }

            this.pausedByUser.set(false);
            console.log('Auto-rotation resumed');
        }, resumeDelay);
    }

    /**
     * Handle next slide with auto-rotation logic
     * Enhanced version that works with Embla carousel
     */
    private nextSlideWithRotation(): void {
        const carousel = this.emblaCarousel();
        const products = this.products();

        if (!carousel || products.length === 0) {
            console.warn('Cannot advance slide - carousel not ready or no products');
            return;
        }

        // Check performance before slide transition
        const fps = this.currentFPS();
        if (fps < 15) {
            console.warn('Performance too low for smooth transition - skipping this cycle');
            return;
        }

        // Advance to next slide using Embla
        if (carousel.canScrollNext()) {
            carousel.scrollNext();
        } else {
            // Loop back to first slide
            carousel.scrollTo(0);
        }
    }

    /**
     * Setup performance monitoring for rotation adjustments
     */
    private setupPerformanceMonitoring(): void {
        if (!this.performanceMonitor) {
            console.warn('⚠️  Performance monitor not available');
            return;
        }

        // Monitor FPS less frequently 
        interval(5000).pipe( // Намалих от 2000 на 5000ms
            takeUntil(this.destroy$)
        ).subscribe(() => {
            const metrics = this.performanceMonitor.getCurrentMetrics();
            if (metrics && typeof metrics.fps === 'number') {
                const fps = metrics.fps;
                const previousFPS = this.currentFPS();

                // Only update and log if FPS changed significantly
                if (Math.abs(fps - previousFPS) > 5) {
                    this.currentFPS.set(fps);
                    console.log(`📊 FPS updated: ${previousFPS} -> ${fps}`);
                }

                const wasThrottled = this.performanceThrottled();
                const shouldThrottle = fps < 25;

                if (shouldThrottle === true && wasThrottled === false) {
                    console.warn(`🐌 Performance throttling enabled - FPS: ${fps}`);
                    this.performanceThrottled.set(true);
                } else if (shouldThrottle === false && wasThrottled === true) {
                    console.log(`🚀 Performance throttling disabled - FPS: ${fps}`);
                    this.performanceThrottled.set(false);
                }
            }
        });
    }

    /**
 * Force immediate start of auto-rotation (bypass all delays)
 */
    private forceStartAutoRotation(): void {
        console.log('🚀 FORCE START: Bypassing all conditions and delays');

        // Stop any existing timer
        this.stopAutoRotation();

        // Set all required conditions
        this.autoRotationEnabled.set(true);
        this.pausedByUser.set(false);

        // Start immediately
        const interval = this.effectiveSlideInterval();
        console.log(`⚡ Force starting auto-rotation with ${interval}ms interval`);

        this.isAutoPlaying.set(true);

        this.autoRotationTimer$ = timer(interval, interval).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            console.log('⚡ FORCED Auto-rotation tick - advancing to next slide');
            this.nextSlideWithRotation();
        });

        console.log('✅ Force start completed');
    }
    /**
     * Setup user interaction handlers for pause/resume
     */
    private setupInteractionHandlers(): void {
        // Keyboard interactions - FIXED filter typing
        fromEvent<KeyboardEvent>(document, 'keydown').pipe(
            takeUntil(this.destroy$),
            // FIX: Explicit key checking instead of includes with potentially undefined
            filter((event: KeyboardEvent) => {
                const allowedKeys = ['ArrowLeft', 'ArrowRight', 'Space'];
                return allowedKeys.indexOf(event.code) !== -1;
            })
        ).subscribe((event: KeyboardEvent) => {
            this.handleUserInteraction();
        });

        // Embla carousel direct interactions (when we add controls later)
        // This will be expanded in next steps
    }

    /**
     * Handle user interaction event
     */
    private handleUserInteraction(): void {
        const shouldPause = this.pauseOnInteraction();
        // FIX: Explicit boolean check
        if (shouldPause !== true) {
            return;
        }

        this.pauseAutoRotation();
        this.resumeAutoRotation();
    }

    /**
     * Handle auto-rotation errors gracefully
     */
    private handleAutoRotationError(error: any): void {
        console.error('Auto-rotation error:', error);
        this.autoRotationEnabled.set(false);

        // Try to restart after delay
        setTimeout(() => {
            console.log('Attempting to restart auto-rotation after error');
            this.autoRotationEnabled.set(true);
            this.startAutoRotation();
        }, 5000);
    }

    // =========================================
    // DEBUG МЕТОД ЗА ТЕСТВАНЕ НА AUTO-ROTATION
    // =========================================

    /**
     * Debug method to manually trigger auto-rotation tick
     * Call from browser console: window.debugSlideshow.triggerTick()
     */
    public debugTriggerAutoRotationTick(): void {
        console.log('🧪 DEBUG: Manually triggering auto-rotation tick');
        this.nextSlideWithRotation();
    }

    /**
     * Debug method to get current auto-rotation status
     * Call from browser console: window.debugSlideshow.getStatus()
     */
    public debugGetAutoRotationStatus(): any {
        const status = {
            // Timer status
            hasTimer: !!this.autoRotationTimer$,
            isAutoPlaying: this.isAutoPlaying(),

            // Conditions
            autoRotationEnabled: this.autoRotationEnabled(),
            pausedByUser: this.pausedByUser(),
            shouldBeRunning: this.shouldAutoRotationBeRunning(),

            // Configuration
            slideInterval: this.slideInterval(),
            effectiveSlideInterval: this.effectiveSlideInterval(),

            // Data status  
            productsCount: this.products().length,
            hasConfig: this.config() !== null,
            currentSlideIndex: this.currentSlideIndex(),

            // Carousel status
            hasEmblaCarousel: !!this.emblaCarousel(),

            // Performance
            currentFPS: this.currentFPS(),
            performanceThrottled: this.performanceThrottled()
        };

        console.log('🔍 Auto-rotation detailed status:');
        console.table(status);
        return status;
    }

    /**
 * Debug method to force restart auto-rotation
 */
    public debugRestartAutoRotation(): void {
        console.log('🔄 DEBUG: Force restarting auto-rotation');
        this.stopAutoRotation();

        setTimeout(() => {
            console.log('🔄 DEBUG: Starting auto-rotation after stop');
            this.checkAndStartAutoRotation();

            setTimeout(() => {
                console.log('🔄 DEBUG: Final status after restart:');
                this.debugGetAutoRotationStatus();
            }, 1000);
        }, 100);
    }
}