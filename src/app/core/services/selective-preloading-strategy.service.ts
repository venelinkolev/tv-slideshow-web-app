// src/app/core/services/selective-preloading-strategy.service.ts
import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Персонализирана стратегия за предварително зареждане на модули.
 * Позволява селективно предварително зареждане на модули базирано на маркери в route data.
 * Оптимизирана за TV приложения - зарежда само критичните модули.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
    preloadedModules: string[] = [];

    /**
     * Определя дали даден route трябва да бъде предварително зареден
     * @param route Route, който се обмисля за предварително зареждане
     * @param load Функция за зареждане на модула
     */
    preload(route: Route, load: () => Observable<any>): Observable<any> {
        // Проверяваме дали route-a има маркер за предварително зареждане
        if (route.data?.['preload'] === true) {
            // Запазваме път, който предварително зареждаме за дебъг цели
            this.preloadedModules.push(route.path || 'unnamed');

            console.log(`Preloading module: ${route.path}`);
            return load();
        } else {
            // Не зареждаме предварително модула
            return of(null);
        }
    }
}