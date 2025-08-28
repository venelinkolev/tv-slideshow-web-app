// src/app/core/services/tv-optimizations.service.ts
import { Injectable, inject, PLATFORM_ID, DOCUMENT } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TvUtils } from '@features/slideshow/utils/tv-utils';
import { PerformanceMonitorService } from './performance-monitor.service';

/**
 * Сервис за управление на TV-специфични оптимизации
 * Централизира логика за работа с телевизионни браузъри и техните особености
 */
@Injectable({
    providedIn: 'root'
})
export class TvOptimizationsService {
    private readonly document = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly performanceMonitor = inject(PerformanceMonitorService);

    // Флаг за TV браузър
    private isTvBrowser = false;

    // Флаг за активирана превенция на sleep режим
    private sleepPreventionActive = false;

    // Флаг за активирани TV мета тагове
    private metaTagsApplied = false;

    /**
     * Инициализира TV оптимизации
     * Трябва да се извика при стартиране на приложението
     */
    initialize(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Детектираме дали сме на TV
        this.isTvBrowser = TvUtils.isTvBrowser();

        // Прилагаме TV-специфични оптимизации
        this.applyTvOptimizations();

        console.log(`TV Optimizations Service initialized. Running on TV: ${this.isTvBrowser}`);
    }

    /**
     * Прилага TV оптимизации ако сме на телевизор
     */
    private applyTvOptimizations(): void {
        if (!this.isTvBrowser) {
            return;
        }

        // Прилагаме TV-безопасни мета тагове
        this.applyTvSafeMetaTags();

        // Забраняваме нежелани TV интеракции
        TvUtils.disableTvInteractions();

        // Стартираме превенция на sleep режим
        this.startSleepPrevention();

        // Стартираме мониторинг на производителността
        this.performanceMonitor.startMonitoring();
    }

    /**
     * Стартира превенция на sleep режима на телевизора
     */
    startSleepPrevention(): void {
        if (this.sleepPreventionActive) {
            return;
        }

        TvUtils.preventTvSleep();
        this.sleepPreventionActive = true;
        console.log('TV sleep prevention activated');
    }

    /**
     * Спира превенцията на sleep режима
     */
    stopSleepPrevention(): void {
        if (!this.sleepPreventionActive) {
            return;
        }

        TvUtils.stopPreventTvSleep();
        this.sleepPreventionActive = false;
        console.log('TV sleep prevention stopped');
    }

    /**
     * Прилага TV-безопасни мета тагове
     */
    applyTvSafeMetaTags(): void {
        if (this.metaTagsApplied) {
            return;
        }

        TvUtils.applyTvSafeMetaTags();
        this.metaTagsApplied = true;
        console.log('TV-safe meta tags applied');
    }

    /**
     * Опитва се да активира fullscreen режим
     * Забележка: Трябва да се извика от обработчик на потребителско събитие (click)
     */
    requestFullscreen(): void {
        TvUtils.requestFullscreen();
        console.log('Fullscreen requested');
    }

    /**
     * Връща флаг дали устройството е телевизор
     */
    isTvDevice(): boolean {
        return this.isTvBrowser;
    }

    /**
     * Почиства TV оптимизации преди унищожаване
     */
    cleanup(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Спираме sleep превенция
        this.stopSleepPrevention();

        // Спираме мониторинг на производителността
        this.performanceMonitor.stopMonitoring();

        console.log('TV Optimizations Service cleaned up');
    }
}