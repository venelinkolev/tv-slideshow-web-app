// src/app/core/services/route-preload-checker.service.ts
import { Injectable } from '@angular/core';
import { PerformanceMonitorService } from './performance-monitor.service';

/**
 * Сервис, който проверява дали дадени маршрути трябва да се заредят предварително
 * Базирано на производителността на устройството и други фактори
 */
@Injectable({ providedIn: 'root' })
export class RoutePreloadCheckerService {
    constructor(private performanceMonitor: PerformanceMonitorService) { }

    /**
     * Проверява дали slideshow модула трябва да се зареди предварително
     * на базата на производителността на TV
     */
    shouldPreloadSlideshow(): boolean {
        // Ще използваме PerformanceMonitorService за да преценим
        // дали производителността е достатъчна за предварително зареждане

        // По подразбиране, винаги зареждаме slideshow предварително
        // тъй като това е основният модул
        return true;
    }

    /**
     * Проверява дали admin модула трябва да се зареди предварително
     * Обикновено не го зареждаме предварително, освен ако не знаем,
     * че потребителят е админ и често го използва
     */
    shouldPreloadAdmin(): boolean {
        // По подразбиране не зареждаме admin панела предварително
        // тъй като се използва рядко
        return false;
    }
}