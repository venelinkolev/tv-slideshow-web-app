import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, PLATFORM_ID, Inject, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';
import { Product } from '@core/models/product.interface';
import { SlideshowConfig } from '@core/models/slideshow-config.interface';
import { Subject, takeUntil } from 'rxjs';
import { SlideShowContainerComponent } from "../slideshow-container/slideshow-container.component";

@Component({
    selector: 'app-slideshow',
    standalone: true,
    imports: [CommonModule, SlideShowContainerComponent,],
    templateUrl: './slideshow.component.html',
    styleUrls: ['./slideshow.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideshowComponent implements OnInit, OnDestroy {
    // Стрийм за управление на unsubscribe при компонентно разрушаване
    private destroy$ = new Subject<void>();

    // Флаг за браузър среда (важно за TV браузъри)
    private isBrowser: boolean;

    // Данни за продукти - ще бъдат попълнени от ProductApiService
    products: Product[] = [];

    // Конфигурация на слайдшоу - ще бъде взета от ConfigService
    slideshowConfig?: SlideshowConfig;

    // Флаг за зареждане
    isLoading = false;

    // Флаг за грешка
    hasError = false;

    constructor(
        @Inject(PLATFORM_ID) platformId: Object,
        private productApiService: ProductApiService,
        private configService: ConfigService,
        private templateRegistry: TemplateRegistryService,
        private performanceMonitor: PerformanceMonitorService,
        private ngZone: NgZone
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        console.log('SlideshowComponent initialized');

        // Започваме наблюдение на производителността (важно за TV)
        if (this.isBrowser) {
            this.performanceMonitor.startMonitoring();
        }

        // Тук ще добавим инициализация на данни в следващите задачи
        // - Зареждане на продукти
        // - Зареждане на конфигурация
        // - Инициализация на carousel
        // - Инициализация на темплейти
    }

    ngOnDestroy(): void {
        // Прекратяване на всички subscription-и
        this.destroy$.next();
        this.destroy$.complete();

        // Спиране на мониторинга за производителност
        if (this.isBrowser) {
            this.performanceMonitor.stopMonitoring();
        }
    }

    /**
     * Инициализира TV-specific оптимизации
     * Ще бъде имплементирана в следващи задачи
     */
    private initTvOptimizations(): void {
        // TV-специфични оптимизации ще бъдат добавени тук
        // - Отключване на пълен екран
        // - Забрана на контекстно меню
        // - Предотвратяване на sleep режим
    }
}