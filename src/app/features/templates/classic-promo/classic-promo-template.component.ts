// src/app/features/templates/classic-promo/classic-promo-template.component.ts

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';
import { Product } from '@core/models/product.interface';
import { ConfigService } from '@core/services/config.service';
import { ProductApiService } from '@core/services/product-api.service';
import {
    ClassicPromoTemplateConfig,
    ClassicPromoSlide,
    DEFAULT_CLASSIC_PROMO_CONFIG
} from '@core/models/classic-promo-template-config.interface';

/**
 * Classic Promo Template Component
 * 
 * Display promotional slides with 2-4 products and a promotional price
 * Optimized for TV display with dynamic grid layout
 * 
 * 🎨 DESIGN FEATURES:
 * - Dynamic 2/3/4 column grid layout
 * - 60% product image / 40% product info split
 * - Orange accent color scheme
 * - Prominent footer with promo price
 * - TV-safe margins and typography
 * 
 * 📊 LAYOUT MODES:
 * - 2 products: 2 large columns (1fr 1fr)
 * - 3 products: 3 medium columns (1fr 1fr 1fr)
 * - 4 products: 4 small columns (1fr 1fr 1fr 1fr)
 */
@Component({
    selector: 'app-classic-promo-template',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './classic-promo-template.component.html',
    styleUrl: './classic-promo-template.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassicPromoTemplateComponent extends BaseProductTemplateComponent implements OnInit, OnDestroy {
    // Template identification
    readonly templateName = 'classic-promo';
    readonly displayName = 'Classic Promo';

    // Service injection
    private readonly configService = inject(ConfigService);
    private readonly productApiService = inject(ProductApiService);

    // Lifecycle management
    private readonly destroy$ = new Subject<void>();

    // State signals (private writable)
    private readonly configSignal = signal<ClassicPromoTemplateConfig>(DEFAULT_CLASSIC_PROMO_CONFIG);
    private readonly currentSlideSignal = signal<ClassicPromoSlide | null>(null);
    private readonly slideProductsSignal = signal<Product[]>([]);
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');

    // Public readonly signals
    readonly config = this.configSignal.asReadonly();
    readonly currentSlide = this.currentSlideSignal.asReadonly();
    readonly slideProducts = this.slideProductsSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();

    // Computed signals
    readonly hasError = computed(() => this.errorMessage().length > 0);

    readonly productCount = computed(() => this.slideProducts().length);

    readonly columnCount = computed(() => {
        const count = this.productCount();
        return Math.min(Math.max(count, 2), 4); // Clamp between 2-4
    });

    readonly gridTemplateColumns = computed(() => {
        const count = this.columnCount();
        return `repeat(${count}, 1fr)`;
    });

    readonly layoutBackgroundColor = computed(() =>
        this.config().layout.backgroundColor
    );

    readonly layoutAccentColor = computed(() =>
        this.config().layout.accentColor
    );

    readonly layoutTextColor = computed(() =>
        this.config().layout.textColor
    );

    readonly layoutSecondaryTextColor = computed(() =>
        this.config().layout.secondaryTextColor
    );

    readonly footerGradient = computed(() => {
        const gradient = this.config().layout.footerGradient;
        return `linear-gradient(90deg, ${gradient.start}, ${gradient.end})`;
    });

    readonly formattedPromoPrice = computed(() => {
        const slide = this.currentSlide();
        if (!slide) return '0.00 лв.';

        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(slide.promoPrice);
    });

    readonly isReady = computed(() =>
        !this.isLoading() &&
        !this.hasError() &&
        this.slideProducts().length >= 2
    );

    /**
     * Component initialization
     */
    ngOnInit(): void {
        console.log('ClassicPromoTemplateComponent.ngOnInit() - Initializing');

        // Load configuration
        this.loadConfiguration();

        // Signal template loaded
        this.onTemplateLoaded();
    }

    /**
     * Component cleanup
     */
    ngOnDestroy(): void {
        console.log('ClassicPromoTemplateComponent.ngOnDestroy() - Cleaning up');
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load template configuration from ConfigService
     */
    private loadConfiguration(): void {
        try {
            // Access current configuration using signal accessor
            const slideshowConfig = this.configService.config();

            if (!slideshowConfig) {
                console.warn('No slideshow configuration found, using defaults');
                this.configSignal.set(DEFAULT_CLASSIC_PROMO_CONFIG);
                this.loadDefaultSlide();
                return;
            }

            const classicPromoConfig = slideshowConfig.templates?.templateSpecificConfig?.classicPromo;

            if (classicPromoConfig) {
                console.log('✅ Loaded Classic Promo configuration:', classicPromoConfig);
                this.configSignal.set(classicPromoConfig);

                // Load first slide by default
                if (classicPromoConfig.slides.length > 0) {
                    this.loadSlide(classicPromoConfig.slides[0]);
                } else {
                    console.warn('No slides configured, using default');
                    this.loadDefaultSlide();
                }
            } else {
                console.warn('No Classic Promo configuration found, using defaults');
                this.configSignal.set(DEFAULT_CLASSIC_PROMO_CONFIG);
                this.loadDefaultSlide();
            }

        } catch (error) {
            console.error('Error loading Classic Promo configuration:', error);
            this.errorMessageSignal.set('Failed to load template configuration');
            this.configSignal.set(DEFAULT_CLASSIC_PROMO_CONFIG);
        }
    }

    /**
     * Load a specific slide and its products
     */
    private loadSlide(slide: ClassicPromoSlide): void {
        console.log(`Loading slide: ${slide.name} with ${slide.productIds.length} products`);

        this.currentSlideSignal.set(slide);
        this.isLoadingSignal.set(true);
        this.errorMessageSignal.set('');

        // Fetch products for this slide using getProducts() method
        this.productApiService.getProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (products: Product[]) => {
                    // Filter products that match slide's productIds
                    const slideProducts = products.filter((product: Product) =>
                        slide.productIds.includes(product.id)
                    );

                    // Sort products to match the order in productIds
                    const sortedProducts = slide.productIds
                        .map((id: string) => slideProducts.find((p: Product) => p.id === id))
                        .filter((p): p is Product => p !== undefined);

                    this.slideProductsSignal.set(sortedProducts);
                    console.log(`✅ Loaded ${sortedProducts.length} products for slide`);
                    this.isLoadingSignal.set(false);
                },
                error: (error: Error) => {
                    console.error('Error loading slide products:', error);
                    this.handleError('Failed to load slide products');
                    this.isLoadingSignal.set(false);
                }
            });
    }

    /**
     * Load default slide (empty state)
     */
    private loadDefaultSlide(): void {
        const defaultSlide = DEFAULT_CLASSIC_PROMO_CONFIG.slides[0];
        this.currentSlideSignal.set(defaultSlide);
        this.slideProductsSignal.set([]);
        console.log('Using default empty slide');
    }

    /**
     * Handle errors
     */
    private handleError(message: string): void {
        this.errorMessageSignal.set(message);
        console.error(`ClassicPromoTemplateComponent Error: ${message}`);
    }

    /**
     * Get product by index from current slide
     */
    getProductByIndex(index: number): Product | null {
        const products = this.slideProducts();
        return products[index] || null;
    }

    /**
     * Track by function for product list
     */
    trackByProductId(index: number, product: Product): string {
        return product.id;
    }

    /**
     * Get truncated product description for display
     */
    getProductDescription(product: Product): string {
        return this.truncateText(product.shortDescription || '', 100);
    }
}