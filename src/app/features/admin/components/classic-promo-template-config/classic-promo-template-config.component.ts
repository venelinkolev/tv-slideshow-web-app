// src/app/features/admin/components/classic-promo-template-config/classic-promo-template-config.component.ts

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    Output,
    EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

// Core services
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';

// Models
import { Product } from '@core/models/product.interface';
import {
    ClassicPromoTemplateConfig,
    ClassicPromoSlide,
    DEFAULT_CLASSIC_PROMO_CONFIG,
    CLASSIC_PROMO_VALIDATION,
    validateClassicPromoSlide,
    validateClassicPromoConfig,
    createDefaultSlide
} from '@core/models/classic-promo-template-config.interface';

/**
 * Classic Promo Template Configuration Component
 * 
 * Отговорности:
 * - Управление на множество промоционални слайдове
 * - Избор на 2-4 продукта за всеки слайд
 * - Настройка на промоционална цена за всеки слайд
 * - Валидация на конфигурацията
 * - Auto-save функционалност
 * - Emit на промени към parent (AdminDashboard)
 * 
 * Features:
 * - Add/Remove slides
 * - Multi-select products per slide (2-4 products)
 * - Promo price input with validation
 * - Real-time validation feedback
 * - Expansion panels за всеки слайд
 */
@Component({
    selector: 'app-classic-promo-template-config',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDividerModule,
        MatExpansionModule,
        MatTooltipModule
    ],
    templateUrl: './classic-promo-template-config.component.html',
    styleUrl: './classic-promo-template-config.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassicPromoTemplateConfigComponent implements OnInit, OnDestroy {

    // Service injection
    private readonly productApiService = inject(ProductApiService);
    private readonly configService = inject(ConfigService);
    private readonly snackBar = inject(MatSnackBar);

    // Lifecycle management
    private readonly destroy$ = new Subject<void>();
    private readonly configChange$ = new Subject<ClassicPromoTemplateConfig>();

    // Outputs
    @Output() configChange = new EventEmitter<ClassicPromoTemplateConfig>();
    @Output() configValid = new EventEmitter<boolean>();

    // State signals (private writable)
    private readonly allProductsSignal = signal<Product[]>([]);
    private readonly configSignal = signal<ClassicPromoTemplateConfig>(DEFAULT_CLASSIC_PROMO_CONFIG);
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly isSavingSignal = signal<boolean>(false);
    private readonly hasErrorSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');
    private readonly slideValidationSignal = signal<Map<string, string[]>>(new Map());

    // Public readonly signals
    readonly allProducts = this.allProductsSignal.asReadonly();
    readonly config = this.configSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isSaving = this.isSavingSignal.asReadonly();
    readonly hasError = this.hasErrorSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();
    readonly slideValidation = this.slideValidationSignal.asReadonly();

    // Computed signals
    readonly slides = computed(() => this.config().slides);
    readonly slideCount = computed(() => this.slides().length);
    readonly isConfigValid = computed(() => {
        const validation = validateClassicPromoConfig(this.config());
        return validation.isValid;
    });

    // Validation constants (expose to template)
    readonly MIN_PRODUCTS = CLASSIC_PROMO_VALIDATION.MIN_PRODUCTS;
    readonly MAX_PRODUCTS = CLASSIC_PROMO_VALIDATION.MAX_PRODUCTS;
    readonly MIN_PRICE = CLASSIC_PROMO_VALIDATION.MIN_PRICE;
    readonly MAX_PRICE = CLASSIC_PROMO_VALIDATION.MAX_PRICE;

    /**
     * Component initialization
     */
    ngOnInit(): void {
        console.log('ClassicPromoTemplateConfigComponent.ngOnInit()');

        // Load products from API
        this.loadProducts();

        // Load existing configuration
        this.loadConfiguration();

        // Setup auto-save
        this.setupAutoSave();
    }

    /**
     * Component cleanup
     */
    ngOnDestroy(): void {
        console.log('ClassicPromoTemplateConfigComponent.ngOnDestroy()');
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load all products from API
     */
    private loadProducts(): void {
        console.log('📦 Loading products...');
        this.isLoadingSignal.set(true);
        this.hasErrorSignal.set(false);

        this.productApiService.getProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (products: Product[]) => {
                    console.log(`✅ Loaded ${products.length} products`);
                    this.allProductsSignal.set(products);
                    this.isLoadingSignal.set(false);
                },
                error: (error: Error) => {
                    console.error('❌ Error loading products:', error);
                    this.handleError('Failed to load products');
                    this.isLoadingSignal.set(false);
                }
            });
    }

    /**
     * Load existing configuration from ConfigService
     */
    private loadConfiguration(): void {
        console.log('📂 Loading Classic Promo configuration...');

        try {
            const slideshowConfig = this.configService.config();
            const classicPromoConfig = slideshowConfig.templates?.templateSpecificConfig?.classicPromo;

            if (classicPromoConfig) {
                console.log('✅ Loaded existing configuration:', classicPromoConfig);
                this.configSignal.set(classicPromoConfig);
                this.validateAllSlides();
            } else {
                console.log('📝 No existing configuration, using defaults');
                this.configSignal.set(DEFAULT_CLASSIC_PROMO_CONFIG);
            }
        } catch (error) {
            console.error('❌ Error loading configuration:', error);
            this.handleError('Failed to load configuration');
        }
    }

    /**
     * Setup auto-save with debounce
     */
    private setupAutoSave(): void {
        this.configChange$
            .pipe(
                debounceTime(1000),
                distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
                takeUntil(this.destroy$)
            )
            .subscribe((config: ClassicPromoTemplateConfig) => {
                console.log('💾 Auto-saving configuration...');
                this.saveConfiguration(config);
            });
    }

    /**
     * Save configuration to ConfigService
     */
    private saveConfiguration(config: ClassicPromoTemplateConfig): void {
        this.isSavingSignal.set(true);

        // Validate before save
        const validation = validateClassicPromoConfig(config);
        if (!validation.isValid) {
            console.warn('⚠️ Configuration validation failed:', validation.errors);
            this.snackBar.open('Невалидна конфигурация: ' + validation.errors.join(', '), 'Затвори', {
                duration: 5000,
                panelClass: ['error-snackbar']
            });
            this.isSavingSignal.set(false);
            this.configValid.emit(false);
            return;
        }

        // Get current slideshow config
        const currentConfig = this.configService.config();

        // Update template-specific config
        const updatedTemplateSettings = {
            ...currentConfig.templates,
            templateSpecificConfig: {
                ...currentConfig.templates.templateSpecificConfig,
                classicPromo: config
            }
        };

        // Save via ConfigService
        this.configService.updateTemplateSettings(updatedTemplateSettings)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    console.log('✅ Configuration saved successfully');
                    this.snackBar.open('Конфигурацията е запазена', 'Затвори', {
                        duration: 2000,
                        panelClass: ['success-snackbar']
                    });
                    this.isSavingSignal.set(false);
                    this.configValid.emit(true);
                    this.configChange.emit(config);
                },
                error: (error: Error) => {
                    console.error('❌ Error saving configuration:', error);
                    this.snackBar.open('Грешка при запазване', 'Затвори', {
                        duration: 3000,
                        panelClass: ['error-snackbar']
                    });
                    this.isSavingSignal.set(false);
                    this.configValid.emit(false);
                }
            });
    }

    /**
     * Add new slide
     */
    addSlide(): void {
        console.log('➕ Adding new slide');

        const currentSlides = this.config().slides;
        const newSlide = createDefaultSlide(currentSlides.length + 1);

        const updatedConfig: ClassicPromoTemplateConfig = {
            ...this.config(),
            slides: [...currentSlides, newSlide]
        };

        this.configSignal.set(updatedConfig);
        this.configChange$.next(updatedConfig);

        this.snackBar.open('Слайд добавен', 'Затвори', { duration: 2000 });
    }

    /**
     * Remove slide by ID
     */
    removeSlide(slideId: string): void {
        console.log(`🗑️ Removing slide: ${slideId}`);

        const currentSlides = this.config().slides;

        // Prevent removing last slide
        if (currentSlides.length <= 1) {
            this.snackBar.open('Трябва да има поне един слайд', 'Затвори', {
                duration: 3000,
                panelClass: ['warning-snackbar']
            });
            return;
        }

        const updatedSlides = currentSlides.filter(slide => slide.slideId !== slideId);

        const updatedConfig: ClassicPromoTemplateConfig = {
            ...this.config(),
            slides: updatedSlides
        };

        this.configSignal.set(updatedConfig);
        this.configChange$.next(updatedConfig);

        // Clear validation for removed slide
        const validationMap = new Map(this.slideValidation());
        validationMap.delete(slideId);
        this.slideValidationSignal.set(validationMap);

        this.snackBar.open('Слайд премахнат', 'Затвори', { duration: 2000 });
    }

    /**
     * Update slide product selection
     */
    onProductSelectionChange(slideId: string, selectedProductIds: string[]): void {
        console.log(`📝 Updating products for slide ${slideId}:`, selectedProductIds);

        const updatedSlides = this.config().slides.map(slide => {
            if (slide.slideId === slideId) {
                return {
                    ...slide,
                    productIds: selectedProductIds
                };
            }
            return slide;
        });

        const updatedConfig: ClassicPromoTemplateConfig = {
            ...this.config(),
            slides: updatedSlides
        };

        this.configSignal.set(updatedConfig);
        this.validateSlide(slideId);
        this.configChange$.next(updatedConfig);
    }

    /**
     * Update slide promo price
     */
    onPromoPriceChange(slideId: string, price: number): void {
        console.log(`💰 Updating promo price for slide ${slideId}:`, price);

        const updatedSlides = this.config().slides.map(slide => {
            if (slide.slideId === slideId) {
                return {
                    ...slide,
                    promoPrice: price
                };
            }
            return slide;
        });

        const updatedConfig: ClassicPromoTemplateConfig = {
            ...this.config(),
            slides: updatedSlides
        };

        this.configSignal.set(updatedConfig);
        this.validateSlide(slideId);
        this.configChange$.next(updatedConfig);
    }

    /**
     * Update slide name
     */
    onSlideNameChange(slideId: string, name: string): void {
        console.log(`✏️ Updating slide name ${slideId}:`, name);

        const updatedSlides = this.config().slides.map(slide => {
            if (slide.slideId === slideId) {
                return {
                    ...slide,
                    name: name
                };
            }
            return slide;
        });

        const updatedConfig: ClassicPromoTemplateConfig = {
            ...this.config(),
            slides: updatedSlides
        };

        this.configSignal.set(updatedConfig);
        this.configChange$.next(updatedConfig);
    }

    /**
     * Validate a specific slide
     */
    private validateSlide(slideId: string): void {
        const slide = this.config().slides.find(s => s.slideId === slideId);
        if (!slide) return;

        const validation = validateClassicPromoSlide(slide);
        const validationMap = new Map(this.slideValidation());

        if (validation.isValid) {
            validationMap.delete(slideId);
        } else {
            validationMap.set(slideId, validation.errors);
        }

        this.slideValidationSignal.set(validationMap);
    }

    /**
     * Validate all slides
     */
    private validateAllSlides(): void {
        const validationMap = new Map<string, string[]>();

        this.config().slides.forEach(slide => {
            const validation = validateClassicPromoSlide(slide);
            if (!validation.isValid) {
                validationMap.set(slide.slideId, validation.errors);
            }
        });

        this.slideValidationSignal.set(validationMap);
    }

    /**
     * Get validation errors for a slide
     */
    getSlideValidationErrors(slideId: string): string[] {
        return this.slideValidation().get(slideId) || [];
    }

    /**
     * Check if slide is valid
     */
    isSlideValid(slideId: string): boolean {
        return !this.slideValidation().has(slideId);
    }

    /**
     * Get slide by ID
     */
    getSlideById(slideId: string): ClassicPromoSlide | undefined {
        return this.config().slides.find(s => s.slideId === slideId);
    }

    /**
     * Track by function for slides
     */
    trackBySlideId(index: number, slide: ClassicPromoSlide): string {
        return slide.slideId;
    }

    /**
     * Handle errors
     */
    private handleError(message: string): void {
        this.hasErrorSignal.set(true);
        this.errorMessageSignal.set(message);
        console.error(`ClassicPromoTemplateConfigComponent Error: ${message}`);
    }
}