import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject, interval, Subscription } from 'rxjs';
import { tap, switchMap, takeWhile, map } from 'rxjs/operators';

import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig } from '@core/models/slideshow-config.interface';
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';
import { PerformanceLevel } from '@core/models/enums';

/**
 * SlideShowService управлява логиката на слайдшоу, включително преходите между слайдове,
 * таймери и интеграцията със сервизите за продукти и шаблони.
 * Оптимизиран за работа на TV платформи.
 */
@Injectable({
    providedIn: 'root'
})
export class SlideShowService {
    // Инжектиране на сервиси с използване на функцията inject
    private productApiService = inject(ProductApiService);
    private configService = inject(ConfigService);
    private templateRegistry = inject(TemplateRegistryService);
    private performanceMonitor = inject(PerformanceMonitorService);

    // Състояние на слайдшоу
    private currentSlideIndexSubject = new BehaviorSubject<number>(0);
    private runningSubject = new BehaviorSubject<boolean>(false);
    private timerSubscription?: Subscription;

    // Публични Observable
    readonly currentSlideIndex$ = this.currentSlideIndexSubject.asObservable();
    readonly isRunning$ = this.runningSubject.asObservable();

    /**
     * Зарежда продукти с помощта на ProductApiService според конфигурацията
     */

    loadProducts(): Observable<Product[]> {
        console.log('🔄 SlideShowService.loadProducts()');

        // Get configuration
        const config = this.configService.config();
        const selectedProductIds = config.products.selectedProductIds || [];
        const maxProducts = this.getMaxProductCountSafe();

        return this.productApiService.getProducts().pipe(
            map((products: Product[]) => {
                console.log(`✅ Received ${products.length} products from API`);

                // ✅ FILTER: Only show selected products from admin panel
                let filteredProducts: Product[];

                if (selectedProductIds.length > 0) {
                    // Show ONLY selected products
                    filteredProducts = products.filter(p => selectedProductIds.includes(p.id));
                    console.log(`🎯 Filtered to ${filteredProducts.length} selected products (from ${selectedProductIds.length} IDs)`);
                } else {
                    // No selection = show first N products (fallback)
                    filteredProducts = products.slice(0, maxProducts);
                    console.log(`⚠️ No products selected in admin, showing first ${filteredProducts.length}`);
                }

                return filteredProducts;
            }),
            tap((products: Product[]) => {
                console.log(`✅ SlideShow will display ${products.length} products`);
            })
        );
    }

    // loadProducts(): Observable<Product[]> {
    //     console.log('🔄 SlideShowService.loadProducts()');
    //     // Получаваме лимит на продукти от конфигурацията
    //     const maxProducts = this.getMaxProductCount();

    //     return this.productApiService.getProducts().pipe(
    //         tap((products: Product[]) => {
    //             console.log(`✅ Заредени ${products.length} продукта`);

    //             // Ограничаваме броя продукти, ако надвишава лимита от конфигурацията
    //             if (products.length > maxProducts) {
    //                 console.log(`⚠️ Броят продукти надвишава лимита (${maxProducts}), отрязваме до лимита`);
    //             }
    //         })
    //     );
    // }

    /**
     * Зарежда шаблон по ID
     */
    loadTemplate(templateId: string): Observable<ProductTemplate | null> {
        console.log(`🎨 SlideShowService.loadTemplate(${templateId})`);
        return this.templateRegistry.getTemplate(templateId);
    }

    /**
     * Стартира автоматично слайдшоу
     */
    startSlideShow(): void {
        console.log('▶️ SlideShowService.startSlideShow()');
        if (this.runningSubject.value) {
            console.log('⚠️ Слайдшоуто вече е стартирано');
            return;
        }

        // Получаваме интервал от конфигурацията
        const slideInterval = this.getSlideInterval();
        console.log(`📊 Интервал на слайдшоу: ${slideInterval}ms`);

        this.runningSubject.next(true);

        // Създаваме таймер за автоматично превключване на слайдове
        this.timerSubscription = interval(slideInterval).pipe(
            takeWhile(() => this.runningSubject.value)
        ).subscribe(() => {
            const currentIndex = this.currentSlideIndexSubject.value;
            // Тъй като нямаме информация за общия брой слайдове тук,
            // просто ще извършим операцията nextSlide
            this.nextSlide(10); // Предполагаме максимум 10 слайда като стандартен случай
        });
    }

    /**
     * Спира автоматичното слайдшоу
     */
    stopSlideShow(): void {
        console.log('⏹️ SlideShowService.stopSlideShow()');
        if (!this.runningSubject.value) {
            console.log('⚠️ Слайдшоуто вече е спряно');
            return;
        }

        this.runningSubject.next(false);

        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = undefined;
        }
    }

    /**
     * Превключва към следващия слайд
     */
    nextSlide(totalSlides: number): void {
        console.log('⏭️ SlideShowService.nextSlide()');
        const currentIndex = this.currentSlideIndexSubject.value;
        const nextIndex = this.getNextSlideIndex(currentIndex, totalSlides);
        this.currentSlideIndexSubject.next(nextIndex);
    }

    /**
     * Превключва към предишния слайд
     */
    previousSlide(totalSlides: number): void {
        console.log('⏮️ SlideShowService.previousSlide()');
        const currentIndex = this.currentSlideIndexSubject.value;
        const prevIndex = this.getPreviousSlideIndex(currentIndex, totalSlides);
        this.currentSlideIndexSubject.next(prevIndex);
    }

    /**
     * Отива към посочения слайд
     */
    goToSlide(slideIndex: number, totalSlides: number): void {
        console.log(`🎯 SlideShowService.goToSlide(${slideIndex})`);
        const validIndex = this.validateSlideIndex(slideIndex, totalSlides);
        this.currentSlideIndexSubject.next(validIndex);
    }

    /**
     * Обновява данните за продукти и шаблони
     */
    refreshData(): Observable<Product[]> {
        console.log('🔄 SlideShowService.refreshData()');
        return this.loadProducts();
    }

    /**
     * Изчислява индекса на следващия слайд с отчитане на цикличност
     */
    getNextSlideIndex(currentIndex: number, totalSlides: number): number {
        if (totalSlides <= 1) return 0;
        return (currentIndex + 1) % totalSlides;
    }

    /**
     * Изчислява индекса на предишния слайд с отчитане на цикличност
     */
    getPreviousSlideIndex(currentIndex: number, totalSlides: number): number {
        if (totalSlides <= 1) return 0;
        return currentIndex === 0 ? totalSlides - 1 : currentIndex - 1;
    }

    /**
     * Проверява валидността на индекса и коригира, ако излиза извън границите
     */
    validateSlideIndex(index: number, totalSlides: number): number {
        if (totalSlides === 0) return 0;
        if (index < 0) return 0;
        if (index >= totalSlides) return totalSlides - 1;
        return index;
    }

    /**
     * Изчислява прогреса на слайдшоуто в проценти
     */
    calculateProgress(currentIndex: number, totalSlides: number): number {
        if (totalSlides <= 1) return 100;
        return ((currentIndex + 1) / totalSlides) * 100;
    }

    /**
     * Получава интервал за смяна на слайдове от конфигурацията
     */
    getSlideInterval(): number {
        return this.configService.slideDuration();
    }

    /**
     * Получава максимален брой продукти от конфигурацията
     */
    getMaxProductCount(): number {
        // Получаваме стойност от конфигурацията
        const config = this.configService.config();
        // Връщаме максимален брой продукти или 10 по подразбиране
        return config?.products?.maxProducts ?? 10;
    }

    /**
     * Получава параметри за тайминг на анимации
     */
    getSlideTimings(): { interval: number; transition: number; pause: number } {
        const interval = this.getSlideInterval();
        const timings = {
            interval: interval,
            transition: Math.min(1000, interval * 0.1), // 10% от интервала, максимум 1 секунда
            pause: 500 // Пауза между слайдове
        };

        return timings;
    }

    /**
     * Проверява дали слайдшоуто трябва да се върти автоматично
     */
    shouldAutoRotate(): boolean {
        const config = this.configService.config();
        return config?.general?.autoStart ?? true;
    }

    /**
 * Get max product count with safe fallback
 */
    private getMaxProductCountSafe(): number {
        try {
            return this.getMaxProductCount();
        } catch (error) {
            console.warn('⚠️ Could not get max product count, using fallback of 10');
            return 10;
        }
    }
}