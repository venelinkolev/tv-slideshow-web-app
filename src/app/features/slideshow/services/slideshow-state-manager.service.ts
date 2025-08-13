import { Injectable, computed, inject, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig } from '@core/models/slideshow-config.interface';
import { PerformanceLevel, ProductCategory } from '@core/models/enums';

/**
 * Управлява глобалното състояние на слайдшоуто
 * използвайки сигнали от Angular 18 за реактивно състояние.
 */
@Injectable({
    providedIn: 'root'
})
export class SlideshowStateManagerService {
    // Основни сигнали за състояние
    private readonly productsSignal = signal<Product[]>([]);
    private readonly filteredProductsSignal = signal<Product[]>([]);
    private readonly activeTemplateSignal = signal<ProductTemplate | null>(null);
    private readonly configSignal = signal<SlideshowConfig | null>(null);
    private readonly performanceLevelSignal = signal<PerformanceLevel>(PerformanceLevel.STANDARD);
    private readonly categoryFilterSignal = signal<ProductCategory | null>(null);

    // Сигнали за UI състояние
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly hasErrorSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');
    private readonly currentSlideIndexSignal = signal<number>(0);
    private readonly isAutoPlayingSignal = signal<boolean>(false);
    private readonly progressSignal = signal<number>(0);

    // Сигнали за четене
    readonly products = this.productsSignal.asReadonly();
    readonly filteredProducts = this.filteredProductsSignal.asReadonly();
    readonly activeTemplate = this.activeTemplateSignal.asReadonly();
    readonly config = this.configSignal.asReadonly();
    readonly performanceLevel = this.performanceLevelSignal.asReadonly();
    readonly categoryFilter = this.categoryFilterSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly hasError = this.hasErrorSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();
    readonly currentSlideIndex = this.currentSlideIndexSignal.asReadonly();
    readonly isAutoPlaying = this.isAutoPlayingSignal.asReadonly();
    readonly progress = this.progressSignal.asReadonly();

    // Изчислими свойства
    readonly hasProducts = computed(() => this.filteredProducts().length > 0);
    readonly productCount = computed(() => this.filteredProducts().length);
    readonly availableCategories = computed(() => {
        const categories = new Set<ProductCategory>();
        this.products().forEach(product => {
            if (product.category) {
                categories.add(product.category as ProductCategory);
            }
        });
        return Array.from(categories);
    });

    // BehaviorSubject за събития
    private stateChangeSubject = new BehaviorSubject<string>('initial');
    readonly stateChange$ = this.stateChangeSubject.asObservable();

    /**
     * Задава текущите продукти
     */
    setProducts(products: Product[]): void {
        this.productsSignal.set(products);
        this.applyFilters(); // Прилагаме текущите филтри
        this.stateChangeSubject.next('products-updated');
    }

    /**
     * Задава текущия активен шаблон
     */
    setActiveTemplate(template: ProductTemplate | null): void {
        this.activeTemplateSignal.set(template);
        this.stateChangeSubject.next('template-updated');
    }

    /**
     * Задава конфигурацията
     */
    setConfig(config: SlideshowConfig | null): void {
        this.configSignal.set(config);
        this.stateChangeSubject.next('config-updated');
    }

    /**
     * Задава ниво на производителност
     */
    setPerformanceLevel(level: PerformanceLevel): void {
        this.performanceLevelSignal.set(level);
        this.stateChangeSubject.next('performance-updated');
    }

    /**
     * Задава състояние на зареждане
     */
    setLoading(isLoading: boolean): void {
        this.isLoadingSignal.set(isLoading);
        this.stateChangeSubject.next('loading-updated');
    }

    /**
     * Задава съобщение за грешка
     */
    setError(hasError: boolean, message: string = ''): void {
        this.hasErrorSignal.set(hasError);
        this.errorMessageSignal.set(message);
        this.stateChangeSubject.next('error-updated');
    }

    /**
     * Задава текущия индекс на слайда
     */
    setCurrentSlideIndex(index: number): void {
        this.currentSlideIndexSignal.set(index);
        this.updateProgress();
        this.stateChangeSubject.next('slide-index-updated');
    }

    /**
     * Задава състояние на автоматично възпроизвеждане
     */
    setAutoPlaying(isPlaying: boolean): void {
        this.isAutoPlayingSignal.set(isPlaying);
        this.stateChangeSubject.next('autoplay-updated');
    }

    /**
     * Филтрира продуктите по категория
     */
    filterByCategory(category: ProductCategory | null): void {
        this.categoryFilterSignal.set(category);
        this.applyFilters();
        this.stateChangeSubject.next('filter-updated');
    }

    /**
     * Изчиства всички филтри
     */
    clearFilters(): void {
        this.categoryFilterSignal.set(null);
        this.applyFilters();
        this.stateChangeSubject.next('filters-cleared');
    }

    /**
     * Обновява прогреса на слайдшоуто
     */
    private updateProgress(): void {
        const totalSlides = this.filteredProducts().length;
        const currentIndex = this.currentSlideIndex();

        if (totalSlides <= 1) {
            this.progressSignal.set(100);
        } else {
            const progress = ((currentIndex + 1) / totalSlides) * 100;
            this.progressSignal.set(progress);
        }
    }

    /**
     * Прилага текущите филтри към продуктите
     */
    private applyFilters(): void {
        let filtered = [...this.products()];
        const category = this.categoryFilter();

        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        this.filteredProductsSignal.set(filtered);

        // Ако текущият слайд излиза извън новата филтрирана колекция, коригираме го
        const currentIndex = this.currentSlideIndex();
        if (currentIndex >= filtered.length && filtered.length > 0) {
            this.setCurrentSlideIndex(0);
        }

        this.updateProgress();
    }

    /**
     * Връща продукт по индекс
     */
    getProductByIndex(index: number): Product | null {
        const products = this.filteredProducts();
        return (index >= 0 && index < products.length) ? products[index] : null;
    }
}