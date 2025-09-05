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
        SlideProgressComponent,
        NavigationControlsComponent, LoadingStateComponent, ErrorStateComponent, EmblaCarouselDirective, TemplateLoaderComponent],
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

    // ✅ NEW: Transition state signal
    protected readonly isTransitioning = signal<boolean>(false);

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
    public emblaCarousel = signal<EmblaCarouselType | null>(null);

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
        return config?.timing?.resumeDelay ?? 1000; // Default fallback
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
            if (fps < 20 && fps > 0) {
                return Math.max(baseInterval * 1.1, 25000); // Minimum 25s for very low FPS
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
        setTimeout(() => {
            this.initializeEmblaCarousel();
        }, 100);

        // ОБНОВЕН debug interface с timer debugging:
        if (typeof window !== 'undefined') {
            (window as any).debugSlideshow = {
                // Status & Info
                getStatus: () => this.debugGetAutoRotationStatus(),
                checkConditions: () => this.shouldAutoRotationBeRunning(),
                checkCarousel: () => this.checkCarouselStatus(),

                // Auto-rotation Control
                startRotation: () => this.startAutoRotation(),
                stopRotation: () => this.stopAutoRotation(),
                restart: () => this.debugRestartAutoRotation(),
                forceStart: () => this.forceStartAutoRotation(),
                disable: () => this.disableAllAutoRotation(),

                // Test Methods
                simpleStart: () => this.simplifiedAutoRotationStart(),
                quickTest: () => this.quickRotationTest(),
                manualTest: () => this.testManualNavigation(),
                triggerTick: () => this.debugTriggerAutoRotationTick(),

                // Timer Testing
                basicJS: () => this.basicJavaScriptTimerTest(),
                bareRxJS: () => this.bareRxJSTimerTest(),
                testTakeUntil: () => this.testTakeUntilProblem(),

                // FILTER CONDITIONS DEBUG (НОВ)
                testFilter: () => this.testFilterConditions(),
                testRealFilter: () => this.testTimerWithRealFilter(),
                monitor: () => this.monitorFilterConditions(),
                stopMonitor: () => this.stopMonitoring(),

                // Previous debugging
                ultraSimple: () => this.ultraSimpleTimerTest(),
                withTakeUntil: () => this.timerWithTakeUntilTest(),
                debugLogic: () => this.debugQuickTestLogic(),
                checkDestroy: () => this.checkDestroySubject(),

                // Manual Control
                nextSlide: () => this.nextSlide(),
                prevSlide: () => this.previousSlide(),

                disableProgress: () => this.disableSlideProgressAutoAdvance(),
                updateNextSlide: () => this.updateNextSlideToIgnoreProgressAdvance(),
                testClean: () => this.testAutoRotationWithoutProgressConflict(),

                // Utilities
                clearLogs: () => console.clear()
            };

            console.log('🧪 FILTER CONDITIONS DEBUG Ready:');
            console.log('');
            console.log('🎯 НАЙДИ ПРОБЛЕМА (START HERE):');
            console.log('  window.debugSlideshow.testFilter()     ← Check current conditions');
            console.log('  window.debugSlideshow.testRealFilter() ← Test with real filter logic');
            console.log('  window.debugSlideshow.monitor()        ← Monitor conditions changes');
            console.log('');
            console.log('📊 STATUS:');
            console.log('  window.debugSlideshow.getStatus()');
            console.log('');
        }

        // Wait for initialization
        setTimeout(() => {
            console.log('🎬 Ready for filter conditions debugging');
        }, 3000);
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
            this.isTransitioning.set(false);

            // Sync with our internal state САМО ако има реална промяна
            if (selectedIndex !== currentIndex) {
                console.log(`Updating currentSlideIndex: ${currentIndex} -> ${selectedIndex}`);
                this.currentSlideIndex.set(selectedIndex);
            }
        });

        // Listen for settle events (when transition completes)
        emblaCarousel.on('settle', () => {
            console.log('Embla carousel transition settled');
            this.isTransitioning.set(false);

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
 * Navigate to next slide automatically (без user interaction pause)
 * ЗА АВТОМАТИЧНО НАВИГИРАНЕ - НЕ ПАУЗА ROTATION
 */
    private nextSlideAutomatic(): void {
        console.log('SlideShowContainerComponent.nextSlideAutomatic() - Automatic navigation (no pause)');

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (products.length === 0) {
            console.warn('No products available for automatic navigation');
            return;
        }

        if (!carousel) {
            console.warn('Embla carousel not ready - using fallback for automatic navigation');
            this.fallbackNextSlide();
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
            console.log('Using Embla scrollNext() - automatic');
            carousel.scrollNext();
        } else {
            // Loop back to first slide
            console.log('Loop back to beginning - automatic');
            carousel.scrollTo(0);
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
     * Handle go to slide request from NavigationControls
     */
    onGoToSlide(targetIndex: number): void {
        console.log(`SlideShowContainerComponent.onGoToSlide(${targetIndex})`);

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (!carousel || targetIndex < 0 || targetIndex >= products.length) {
            console.warn(`Invalid slide index: ${targetIndex}`);
            return;
        }

        this.isTransitioning.set(true);
        carousel.scrollTo(targetIndex);
    }

    /**
     * Handle slide change request from SlideProgress
     */
    onSlideChangeRequested(targetIndex: number): void {
        console.log(`SlideShowContainerComponent.onSlideChangeRequested(${targetIndex})`);
        this.onGoToSlide(targetIndex);
    }

    /**
     * Handle pause auto rotation request from components
     */
    onPauseAutoRotation(): void {
        console.log('SlideShowContainerComponent.onPauseAutoRotation()');
        this.pauseAutoRotation();
    }

    /**
     * Handle resume auto rotation request from components  
     */
    onResumeAutoRotation(): void {
        console.log('SlideShowContainerComponent.onResumeAutoRotation()');
        this.resumeAutoRotation();
    }

    /**
     * Handle template change request
     */
    onTemplateChangeRequested(templateId: string): void {
        console.log(`SlideShowContainerComponent.onTemplateChangeRequested(${templateId})`);

        // Update config to persist the change  
        if (this.configService) {
            this.configService.updateTemplateSettings({
                selectedTemplateId: templateId
            }).subscribe({
                next: (updatedConfig) => {
                    console.log(`Template updated to: ${templateId}`);
                },
                error: (error) => {
                    console.error('Failed to update template:', error);
                }
            });
        }

        // No need to restart carousel - config reactivity will handle the rest
    }

    /**
     * Handle progress complete event from SlideProgressComponent
     * ТОВА Е КЛЮЧОВАТА ПРОМЯНА - сега прави реална навигация!
     */
    handleProgressComplete(event: { currentIndex: number; totalSlides: number }): void {
        console.log('SlideShowContainerComponent.handleProgressComplete() - Auto advancing to next slide', event);

        const { currentIndex, totalSlides } = event;

        // ✅ Enhanced: Only advance if not transitioning and auto-rotation is active
        if (this.isTransitioning() || !this.isAutoPlaying()) {
            console.log('Skipping progress complete - transitioning or auto-play inactive');
            return;
        }

        // ✅ Enhanced: Verify carousel state before advancing
        const carousel = this.emblaCarousel();
        if (!carousel) {
            console.warn('Cannot advance slide - carousel not ready');
            return;
        }

        console.log(`🚀 Progress complete - auto advancing from slide ${currentIndex}`);

        // ✅ FIXED: Use automatic navigation instead of manual
        // this.nextSlideAutomatic(); // ← Instead of nextSlide()
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
     * САМО ЗА TIMER-BASED AUTO-ROTATION
     **/
    private nextSlideWithRotation(): void {
        console.log('SlideShowContainerComponent.nextSlideWithRotation() - Timer-based automatic navigation');

        const carousel = this.emblaCarousel();
        const products = this.products();

        if (!carousel || products.length === 0) {
            console.warn('Cannot advance slide - carousel not ready or no products');
            return;
        }

        // Check performance before slide transition
        const fps = this.currentFPS();
        if (fps < 10 && fps > 0) { // Only block if FPS is measurable and extremely low
            console.warn('Performance too low for smooth transition - skipping this cycle');
            return;
        }
        // Ако FPS = 0 (не се измерва), продължава нормално

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

    /**
 * Simplified auto-rotation start for testing
 */
    public simplifiedAutoRotationStart(): void {
        console.log('🎯 SIMPLIFIED START: Basic auto-rotation test');

        const products = this.products();
        const carousel = this.emblaCarousel();

        if (products.length <= 1) {
            console.error('❌ Need more than 1 product for rotation');
            return;
        }

        if (!carousel) {
            console.error('❌ Embla carousel not ready');
            return;
        }

        console.log('✅ Starting simplified 5-second rotation for testing');

        this.autoRotationTimer$ = timer(5000, 5000).pipe(
            takeUntil(this.destroy$),
            tap(() => console.log('💫 Simple rotation tick'))
        ).subscribe(() => {
            if (carousel.canScrollNext()) {
                carousel.scrollNext();
            } else {
                carousel.scrollTo(0);
            }
        });

        this.isAutoPlaying.set(true);
        console.log('✅ Simplified rotation started - should tick every 5 seconds');
    }

    /**
 * Quick test method - 3 second intervals
 */
    public quickRotationTest(): void {
        console.log('⚡ QUICK TEST: 3-second rotation test starting...');

        this.stopAutoRotation(); // Stop any existing

        const products = this.products();
        const carousel = this.emblaCarousel();

        console.log('🔍 Quick test conditions:', {
            productsCount: products.length,
            hasCarousel: !!carousel,
            carouselReady: carousel ? 'YES' : 'NO'
        });

        if (products.length <= 1) {
            console.error('❌ QUICK TEST FAILED: Need more than 1 product');
            return;
        }

        if (!carousel) {
            console.error('❌ QUICK TEST FAILED: No Embla carousel available');
            console.log('Try running this after a few seconds when carousel initializes');
            return;
        }

        console.log('✅ Starting QUICK TEST with 3-second intervals');

        let tickCount = 0;
        this.autoRotationTimer$ = timer(3000, 3000).pipe(
            takeUntil(this.destroy$),
            tap(() => {
                tickCount++;
                console.log(`⏰ QUICK TEST Tick #${tickCount}`);
            })
        ).subscribe(() => {
            if (carousel.canScrollNext()) {
                console.log('➡️  Moving to next slide');
                carousel.scrollNext();
            } else {
                console.log('🔄 Looping back to first slide');
                carousel.scrollTo(0);
            }

            // Auto-stop after 5 ticks for testing
            if (tickCount >= 5) {
                console.log('🏁 QUICK TEST completed - stopping after 5 ticks');
                this.stopAutoRotation();
            }
        });

        this.isAutoPlaying.set(true);
        console.log('✅ QUICK TEST started - will auto-stop after 5 ticks (15 seconds)');
    }

    /**
     * Check Embla carousel status
     */
    public checkCarouselStatus(): any {
        const carousel = this.emblaCarousel();
        const products = this.products();

        const status = {
            hasCarousel: !!carousel,
            productsCount: products.length,
            currentIndex: this.currentSlideIndex(),
            canScrollNext: carousel ? carousel.canScrollNext() : 'N/A',
            canScrollPrev: carousel ? carousel.canScrollPrev() : 'N/A',
            selectedIndex: carousel ? carousel.selectedScrollSnap() : 'N/A'
        };

        console.log('🎠 Carousel Status:');
        console.table(status);
        return status;
    }

    /**
     * Manual carousel navigation test
     */
    public testManualNavigation(): void {
        console.log('🎮 Testing manual carousel navigation...');

        const carousel = this.emblaCarousel();
        if (!carousel) {
            console.error('❌ No carousel available for manual test');
            return;
        }

        console.log('➡️  Testing next slide...');
        carousel.scrollNext();

        setTimeout(() => {
            console.log('⬅️  Testing previous slide...');
            carousel.scrollPrev();

            setTimeout(() => {
                console.log('🎯 Testing jump to slide 0...');
                carousel.scrollTo(0);
                console.log('✅ Manual navigation test completed');
            }, 2000);
        }, 2000);
    }

    /**
 * Ultra simple timer test - no conditions, no filters
 */
    public ultraSimpleTimerTest(): void {
        console.log('🔬 ULTRA SIMPLE TIMER TEST - No conditions, just raw timer');

        // Stop existing
        this.stopAutoRotation();

        let tickCount = 0;
        console.log('⏱️  Starting raw timer - 2 second intervals');

        this.autoRotationTimer$ = timer(2000, 2000).subscribe(() => {
            tickCount++;
            console.log(`🔔 RAW TIMER TICK #${tickCount} at ${new Date().toLocaleTimeString()}`);

            // Stop after 3 ticks
            if (tickCount >= 3) {
                console.log('🏁 Raw timer test completed - stopping');
                if (this.autoRotationTimer$) {
                    this.autoRotationTimer$.unsubscribe();
                    this.autoRotationTimer$ = undefined;
                }
            }
        });

        console.log('✅ Raw timer started - should tick every 2 seconds');
    }

    /**
     * Test timer with takeUntil only
     */
    public timerWithTakeUntilTest(): void {
        console.log('🔬 TIMER WITH TAKEUNTIL TEST');

        this.stopAutoRotation();

        let tickCount = 0;
        console.log('⏱️  Starting timer with takeUntil only - 3 second intervals');

        this.autoRotationTimer$ = timer(3000, 3000).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            tickCount++;
            console.log(`🔔 TAKEUNTIL TIMER TICK #${tickCount}`);

            if (tickCount >= 3) {
                console.log('🏁 TakeUntil timer test completed');
                this.stopAutoRotation();
            }
        });

        console.log('✅ TakeUntil timer started');
    }

    /**
     * Test the exact quickTest timer logic step by step
     */
    public debugQuickTestLogic(): void {
        console.log('🔍 DEBUGGING QUICK TEST TIMER LOGIC');

        this.stopAutoRotation();

        const products = this.products();
        const carousel = this.emblaCarousel();

        console.log('📋 Pre-conditions check:');
        console.log(`  - Products: ${products.length}`);
        console.log(`  - Carousel: ${!!carousel}`);
        console.log(`  - destroy$ exists: ${!!this.destroy$}`);

        if (products.length <= 1) {
            console.error('❌ Not enough products');
            return;
        }

        if (!carousel) {
            console.error('❌ No carousel');
            return;
        }

        console.log('⏱️  Creating timer with full observable chain...');

        let tickCount = 0;
        this.autoRotationTimer$ = timer(3000, 3000).pipe(
            takeUntil(this.destroy$),
            tap(() => {
                tickCount++;
                console.log(`🎯 TAP: Timer tick #${tickCount} - before any logic`);
            })
        ).subscribe({
            next: () => {
                console.log(`✅ SUBSCRIBE NEXT: Processing tick #${tickCount}`);

                if (carousel.canScrollNext()) {
                    console.log('➡️  Carousel can scroll next - executing scrollNext()');
                    carousel.scrollNext();
                } else {
                    console.log('🔄 Carousel at end - executing scrollTo(0)');
                    carousel.scrollTo(0);
                }

                if (tickCount >= 3) {
                    console.log('🏁 Debug test completed after 3 ticks');
                    this.stopAutoRotation();
                }
            },
            error: (err) => {
                console.error('❌ SUBSCRIBE ERROR:', err);
            },
            complete: () => {
                console.log('✅ SUBSCRIBE COMPLETED');
            }
        });

        console.log('✅ Debug timer created with full logging');
    }

    /**
     * Check if destroy$ subject is working properly
     */
    public checkDestroySubject(): void {
        console.log('🔍 Checking destroy$ subject status');

        console.log('destroy$ properties:');
        console.log(`  - exists: ${!!this.destroy$}`);
        console.log(`  - closed: ${this.destroy$.closed}`);
        console.log(`  - isStopped: ${this.destroy$.isStopped}`);

        // Test if destroy$ works with a simple timer
        console.log('⏱️  Testing destroy$ with simple timer...');

        const testTimer = timer(1000, 1000).pipe(
            takeUntil(this.destroy$)
        ).subscribe((value) => {
            console.log(`🔔 Destroy$ test timer tick: ${value}`);

            if (value >= 2) {
                console.log('🏁 Destroy$ test completed - timer should stop automatically');
                // Don't unsubscribe manually - let takeUntil handle it
            }
        });
    }

    /**
 * Test basic JavaScript setInterval (no RxJS)
 */
    public basicJavaScriptTimerTest(): void {
        console.log('🧪 BASIC JAVASCRIPT TIMER TEST - Pure setInterval');

        // Clear any existing intervals
        if ((this as any).basicTimerInterval) {
            clearInterval((this as any).basicTimerInterval);
        }

        let tickCount = 0;
        console.log('⏱️  Starting basic JavaScript timer - 2 second intervals');

        (this as any).basicTimerInterval = setInterval(() => {
            tickCount++;
            console.log(`🔔 BASIC JS TIMER TICK #${tickCount} at ${new Date().toLocaleTimeString()}`);

            if (tickCount >= 3) {
                console.log('🏁 Basic JS timer test completed - clearing interval');
                clearInterval((this as any).basicTimerInterval);
                (this as any).basicTimerInterval = null;
            }
        }, 2000);

        console.log('✅ Basic JavaScript timer started');
    }

    /**
     * Test RxJS timer without any pipes
     */
    public bareRxJSTimerTest(): void {
        console.log('🧪 BARE RXJS TIMER TEST - No pipes, no operators');

        // Stop any existing subscription
        if ((this as any).bareTimerSub) {
            (this as any).bareTimerSub.unsubscribe();
        }

        let tickCount = 0;
        console.log('⏱️  Starting bare RxJS timer - 2 second intervals');

        (this as any).bareTimerSub = timer(2000, 2000).subscribe(() => {
            tickCount++;
            console.log(`🔔 BARE RXJS TIMER TICK #${tickCount} at ${new Date().toLocaleTimeString()}`);

            if (tickCount >= 3) {
                console.log('🏁 Bare RxJS timer test completed');
                (this as any).bareTimerSub.unsubscribe();
                (this as any).bareTimerSub = null;
            }
        });

        console.log('✅ Bare RxJS timer started');
    }

    /**
     * Test if takeUntil is the problem
     */
    public testTakeUntilProblem(): void {
        console.log('🧪 TESTING TAKEUNTIL PROBLEM');

        if ((this as any).takeUntilTestSub) {
            (this as any).takeUntilTestSub.unsubscribe();
        }

        console.log('🔍 Checking destroy$ subject:', {
            exists: !!this.destroy$,
            closed: this.destroy$.closed,
            isStopped: this.destroy$.isStopped
        });

        let tickCount = 0;
        console.log('⏱️  Starting timer with takeUntil');

        (this as any).takeUntilTestSub = timer(2000, 2000).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                tickCount++;
                console.log(`🔔 TAKEUNTIL TIMER TICK #${tickCount}`);

                if (tickCount >= 3) {
                    console.log('🏁 TakeUntil timer test completed');
                    (this as any).takeUntilTestSub.unsubscribe();
                    (this as any).takeUntilTestSub = null;
                }
            },
            error: (err) => {
                console.error('❌ TakeUntil timer error:', err);
            },
            complete: () => {
                console.log('✅ TakeUntil timer completed naturally');
            }
        });

        console.log('✅ TakeUntil timer started');
    }

    /**
     * Disable ALL auto-rotation systems for clean testing
     */
    public disableAllAutoRotation(): void {
        console.log('🛑 DISABLING ALL AUTO-ROTATION SYSTEMS');

        // Stop our timer
        this.stopAutoRotation();

        // Disable auto-rotation flag
        this.autoRotationEnabled.set(false);
        this.isAutoPlaying.set(false);

        // Try to stop SlideProgressComponent auto-advance (if possible)
        // This might need to be done differently depending on implementation

        console.log('✅ All auto-rotation systems disabled');
        console.log('Now you can test individual timers without interference');
    }

    /**
 * Test the exact filter conditions used in auto-rotation
 */
    public testFilterConditions() {
        console.log('🔍 TESTING FILTER CONDITIONS - Real auto-rotation logic');

        // Test the exact conditions from startAutoRotation
        const conditions = {
            notPaused: this.pausedByUser() === false,
            enabled: this.autoRotationEnabled() === true,
            hasCarousel: !!this.emblaCarousel(),
        };

        const overallResult = conditions.notPaused && conditions.enabled && conditions.hasCarousel;

        console.log('📊 Filter Conditions Analysis:', {
            ...conditions,
            overallResult
        });

        if (!overallResult) {
            console.error('❌ FILTER CONDITIONS BLOCKING - One or more conditions is FALSE');
            if (!conditions.notPaused) console.error('  → pausedByUser() is TRUE');
            if (!conditions.enabled) console.error('  → autoRotationEnabled() is FALSE');
            if (!conditions.hasCarousel) console.error('  → emblaCarousel() is missing');
        } else {
            console.log('✅ All filter conditions PASS - should allow timer ticks');
        }

        return conditions;
    }

    /**
     * Test timer with the exact same filter logic as auto-rotation
     */
    public testTimerWithRealFilter(): void {
        console.log('🧪 TESTING TIMER WITH REAL FILTER CONDITIONS');

        if ((this as any).realFilterTestSub) {
            (this as any).realFilterTestSub.unsubscribe();
        }

        // First check conditions
        const initialConditions = this.testFilterConditions();

        if (!initialConditions.notPaused || !initialConditions.enabled || !initialConditions.hasCarousel) {
            console.error('❌ Cannot start test - initial conditions failing');
            return;
        }

        let tickCount = 0;
        console.log('⏱️  Starting timer with REAL filter logic');

        (this as any).realFilterTestSub = timer(3000, 3000).pipe(
            takeUntil(this.destroy$),
            filter(() => {
                const notPaused = this.pausedByUser() === false;
                const enabled = this.autoRotationEnabled() === true;
                const hasCarousel = !!this.emblaCarousel();

                // EXACT logging from real auto-rotation code
                if (!notPaused) {
                    console.log('⏸️  Real filter tick BLOCKED - paused by user');
                    return false;
                }
                if (!enabled) {
                    console.log('⏸️  Real filter tick BLOCKED - disabled');
                    return false;
                }
                if (!hasCarousel) {
                    console.log('⏸️  Real filter tick BLOCKED - no carousel');
                    return false;
                }

                console.log('✅ Real filter tick PASSED all conditions');
                return true;
            }),
            tap(() => {
                console.log('🎯 Real filter TAP - this should match auto-rotation behavior');
            })
        ).subscribe({
            next: () => {
                tickCount++;
                console.log(`🔔 REAL FILTER TIMER TICK #${tickCount}`);

                if (tickCount >= 3) {
                    console.log('🏁 Real filter timer test completed');
                    (this as any).realFilterTestSub.unsubscribe();
                    (this as any).realFilterTestSub = null;
                }
            },
            error: (err) => {
                console.error('❌ Real filter timer error:', err);
            },
            complete: () => {
                console.log('✅ Real filter timer completed');
            }
        });

        console.log('✅ Real filter timer started - should behave exactly like auto-rotation');
    }

    /**
     * Monitor filter conditions in real-time
     */
    public monitorFilterConditions(): void {
        console.log('📡 MONITORING FILTER CONDITIONS - Real-time updates');

        if ((this as any).monitorSub) {
            (this as any).monitorSub.unsubscribe();
        }

        let lastConditions = this.testFilterConditions();

        (this as any).monitorSub = timer(0, 1000).pipe(
            takeUntil(this.destroy$)
        ).subscribe(() => {
            const currentConditions = {
                notPaused: this.pausedByUser() === false,
                enabled: this.autoRotationEnabled() === true,
                hasCarousel: !!this.emblaCarousel(),
            };

            const overallResult = currentConditions.notPaused && currentConditions.enabled && currentConditions.hasCarousel;

            // Only log when conditions change
            if (JSON.stringify(currentConditions) !== JSON.stringify(lastConditions)) {
                console.log('🔄 Filter conditions CHANGED:', {
                    ...currentConditions,
                    overallResult,
                    timestamp: new Date().toLocaleTimeString()
                });

                lastConditions = currentConditions;
            }
        });

        console.log('📡 Monitoring started - will log only when conditions change');
        console.log('Use window.debugSlideshow.stopMonitoring() to stop');
    }

    /**
     * Stop monitoring filter conditions
     */
    public stopMonitoring(): void {
        if ((this as any).monitorSub) {
            (this as any).monitorSub.unsubscribe();
            (this as any).monitorSub = null;
            console.log('📡 Filter conditions monitoring stopped');
        }
    }

    // =====================================
    // РЕШЕНИЕ 1: DISABLE SlideProgressComponent AUTO-ADVANCE
    // =====================================

    /**
     * Disable SlideProgressComponent auto-advance temporary
     */
    public disableSlideProgressAutoAdvance(): void {
        console.log('🛑 DISABLING SlideProgressComponent auto-advance to test auto-rotation');

        // Намери SlideProgressComponent и спри неговия auto-advance
        // Това трябва да се направи в SlideProgressComponent
        // Засега - просто логиране че трябва да се направи

        console.log('⚠️  TODO: Disable SlideProgressComponent.handleProgressComplete() auto-advance');
        console.log('⚠️  This requires changes in slide-progress.component.ts');
        console.log('✅ After disabling, auto-rotation timer should work normally');
    }

    // =====================================
    // РЕШЕНИЕ 2: ПРОМЯНА НА INTERACTION DETECTION
    // =====================================

    /**
     * Update nextSlide to NOT pause auto-rotation when called by progress component
     */
    public updateNextSlideToIgnoreProgressAdvance(): void {
        console.log('🔧 UPDATING nextSlide() to ignore progress component advances');

        // В slideshow-container.component.ts, в nextSlide() метода:
        // Вместо винаги да call-ва handleUserInteraction(),
        // трябва да провери дали advance-ът идва от SlideProgressComponent

        console.log('⚠️  CHANGE NEEDED in nextSlide() method:');
        console.log('   - Add parameter: nextSlide(fromProgressComponent = false)');
        console.log('   - Only call handleUserInteraction() if fromProgressComponent === false');
        console.log('   - SlideProgressComponent should call nextSlide(true)');
    }

    // =====================================
    // РЕШЕНИЕ 3: QUICK TEST - FORCE DISABLE PROGRESS
    // =====================================

    /**
     * Quick test to verify auto-rotation works without progress interference
     */
    public testAutoRotationWithoutProgressConflict(): void {
        console.log('🧪 TESTING AUTO-ROTATION WITHOUT PROGRESS CONFLICT');

        // Disable our auto-rotation first
        this.stopAutoRotation();
        this.autoRotationEnabled.set(false);

        // TODO: Also need to disable SlideProgressComponent
        console.log('⚠️  Manually disable SlideProgressComponent auto-advance in its component');
        console.log('⚠️  Then call this test again');

        // Start clean auto-rotation test
        setTimeout(() => {
            console.log('🚀 Starting clean auto-rotation test (5 second interval for testing)');

            this.autoRotationEnabled.set(true);
            this.pausedByUser.set(false);
            this.isAutoPlaying.set(true);

            // Create timer with short interval for testing
            this.autoRotationTimer$ = timer(5000, 5000).pipe(
                takeUntil(this.destroy$),
                tap(() => {
                    console.log('🎯 CLEAN AUTO-ROTATION TICK - No conflicts!');
                })
            ).subscribe(() => {
                const carousel = this.emblaCarousel();
                if (carousel) {
                    if (carousel.canScrollNext()) {
                        carousel.scrollNext();
                    } else {
                        carousel.scrollTo(0);
                    }
                }
            });

            console.log('✅ Clean auto-rotation started - should tick every 5 seconds');

        }, 1000);
    }
}