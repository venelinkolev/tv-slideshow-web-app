// src/app/features/slideshow/guards/slideshow.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';

/**
 * Guard който проверява дали SlideShow може да бъде активиран
 * Използва функционален guard подход (Angular 14+)
 */
export const slideshowGuard: CanActivateFn = () => {
    const configService = inject(ConfigService);
    const templateRegistry = inject(TemplateRegistryService);
    const router = inject(Router);

    // Проверка за валидна конфигурация от ConfigService
    const config = configService.config();

    // Проверка за валидна конфигурация - използваме достъпни методи и свойства
    if (!config) {
        console.warn('SlideShow Guard: Invalid configuration detected, redirecting to admin');
        router.navigate(['/admin']);
        return false;
    }

    // Проверка дали има регистрирани темплейти - използваме hasTemplates signal
    // Това е computed свойство в TemplateRegistryService
    const hasTemplates = templateRegistry.hasTemplates();
    if (!hasTemplates) {
        console.warn('SlideShow Guard: No templates registered, redirecting to admin');
        router.navigate(['/admin']);
        return false;
    }

    // Всичко е наред - има конфигурация и има темплейти
    return true;
};

/**
 * Guard който проверява дали SlideShow може да бъде деактивиран
 * За телевизионен режим, винаги позволяваме деактивация
 */
export const slideshowDeactivateGuard: CanActivateFn = () => {
    // В TV режим, всички навигации са разрешени
    return true;
};

// Експорт на guards индекс файл
// src/app/features/slideshow/guards/index.ts
export * from './slideshow.guard';