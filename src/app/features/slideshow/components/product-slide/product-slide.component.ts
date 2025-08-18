import {
    Component,
    OnInit,
    OnDestroy,
    input,
    output,
    signal,
    computed,
    effect,
    untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

import { Product } from '@core/models/product.interface';

/**
 * ProductSlideComponent - Показва индивидуален продукт slide
 * 
 * Simplified версия която работи без template система.
 * Ще се upgrade-не по-късно когато template системата е готова.
 * 
 * Отговорности:
 * - Показва продукт с fallback template
 * - Error handling за изображения
 * - TV-optimized display logic
 * - Image preloading support
 */
@Component({
    selector: 'app-product-slide',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-slide.component.html',
    styleUrl: './product-slide.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSlideComponent implements OnInit, OnDestroy {

    // ✅ Angular 18 Input signals
    readonly product = input.required<Product>();
    readonly templateName = input<string>('classic');
    readonly imageQuality = input<'low' | 'medium' | 'high'>('medium');
    readonly enableAnimations = input<boolean>(true);

    // ✅ Angular 18 Output signals  
    readonly imageError = output<{ product: Product; error: Event }>();
    readonly slideReady = output<{ product: Product; success: boolean }>();

    // ✅ Service injection с inject()
    // private readonly templateRegistry = inject(TemplateRegistryService);

    // ✅ Private state signals
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly hasErrorSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');
    private readonly isImageLoadedSignal = signal<boolean>(false);

    // ✅ Public readonly signals
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly hasError = this.hasErrorSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();
    readonly isImageLoaded = this.isImageLoadedSignal.asReadonly();

    // ✅ Computed signals
    readonly isReady = computed(() =>
        !this.isLoading() && !this.hasError() && this.isImageLoaded()
    );

    readonly slideClasses = computed(() => {
        const classes = ['product-slide'];

        if (this.isLoading()) classes.push('product-slide--loading');
        if (this.hasError()) classes.push('product-slide--error');
        if (this.isReady()) classes.push('product-slide--ready');
        if (this.enableAnimations()) classes.push('product-slide--animated');

        classes.push(`product-slide--quality-${this.imageQuality()}`);
        classes.push(`product-slide--template-${this.templateName()}`);

        return classes.join(' ');
    });

    readonly displayPrice = computed(() => {
        const product = this.product();
        if (!product) return '';

        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(product.price);
    });

    readonly truncatedDescription = computed(() => {
        const product = this.product();
        if (!product || !product.shortDescription) return '';

        const description = product.shortDescription;
        const maxLength = 120; // TV viewing optimized

        if (description.length <= maxLength) return description;

        const truncated = description.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
    });

    // ✅ Product change effect
    private productChangeEffect = effect(() => {
        const product = this.product();
        console.log(`ProductSlideComponent: Product changed to ${product?.id}`);

        if (product) {
            untracked(() => {
                this.initializeSlide();
            });
        }
    });

    ngOnInit(): void {
        console.log(`ProductSlideComponent.ngOnInit() - Product: ${this.product()?.id}, Template: ${this.templateName()}`);
        this.initializeSlide();
    }

    ngOnDestroy(): void {
        console.log(`ProductSlideComponent.ngOnDestroy() - Cleaning up product ${this.product()?.id}`);
    }

    /**
     * Инициализира slide компонента
     * @private
     */
    private initializeSlide(): void {
        console.log('ProductSlideComponent.initializeSlide() - Starting initialization');

        this.isLoadingSignal.set(true);
        this.hasErrorSignal.set(false);
        this.errorMessageSignal.set('');
        this.isImageLoadedSignal.set(false);

        const product = this.product();
        if (!product) {
            this.setError('Няма продукт за показване');
            return;
        }

        // Преload изображението
        this.preloadImage(product.imageUrl);
    }

    /**
     * Preload изображение за smooth loading
     * @private
     */
    private preloadImage(imageUrl: string): void {
        console.log(`ProductSlideComponent.preloadImage() - Loading: ${imageUrl}`);

        const img = new Image();

        img.onload = () => {
            console.log(`ProductSlideComponent: Image loaded successfully for ${this.product()?.id}`);
            this.isLoadingSignal.set(false);
            this.isImageLoadedSignal.set(true);
            this.slideReady.emit({ product: this.product(), success: true });
        };

        img.onerror = (error) => {
            console.error(`ProductSlideComponent: Image failed to load for ${this.product()?.id}:`, error);
            this.setError('Грешка при зареждане на изображението');
            this.slideReady.emit({ product: this.product(), success: false });
        };

        img.src = imageUrl;
    }

    /**
     * Handle image loading errors
     */
    onImageError(event: Event): void {
        const product = this.product();
        console.warn(`ProductSlideComponent.onImageError() - Product: ${product?.id}`, event);

        this.imageError.emit({ product, error: event });

        // Fallback към placeholder
        const img = event.target as HTMLImageElement;
        if (img && img.src !== '/assets/images/product-placeholder.jpg') {
            img.src = '/assets/images/product-placeholder.jpg';
        }
    }

    /**
     * Handle image loading success
     */
    onImageLoad(event: Event): void {
        const product = this.product();
        console.log(`ProductSlideComponent.onImageLoad() - Product: ${product?.id} loaded successfully`);

        this.isLoadingSignal.set(false);
        this.isImageLoadedSignal.set(true);
    }

    /**
     * Задава error state
     * @private
     */
    private setError(message: string): void {
        console.error(`ProductSlideComponent: ${message}`);

        this.isLoadingSignal.set(false);
        this.hasErrorSignal.set(true);
        this.errorMessageSignal.set(message);
        this.isImageLoadedSignal.set(false);
    }

    /**
     * Public method за retry при грешка
     */
    retryLoad(): void {
        console.log(`ProductSlideComponent.retryLoad() - Retrying for product ${this.product()?.id}`);
        this.initializeSlide();
    }

    /**
     * Проверява дали продуктът е в наличност
     */
    isInStock(): boolean {
        const product = this.product();
        return product?.inStock !== false; // Default да true ако не е зададено
    }

    /**
     * Връща CSS клас за stock status
     */
    getStockStatusClass(): string {
        return this.isInStock() ? 'in-stock' : 'out-of-stock';
    }

    /**
     * Връща stock status text
     */
    getStockStatusText(): string {
        return this.isInStock() ? 'В наличност' : 'Няма в наличност';
    }

    /**
     * Връща stock status icon
     */
    getStockStatusIcon(): string {
        return this.isInStock() ? '✅' : '❌';
    }
}