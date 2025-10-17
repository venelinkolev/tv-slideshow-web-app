import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { AppInitializationService } from '@core/services/app-initialization.service';

/**
 * Startup Guard for TV Slideshow Application
 * Delegates all initialization logic to AppInitializationService
 * 
 * Benefits:
 * - Separation of concerns (guard only checks, service initializes)
 * - Reusable initialization logic
 * - Easier to test and maintain
 * - Cleaner architecture
 */
export const startupGuard: CanActivateFn = async () => {
    const initService = inject(AppInitializationService);

    console.log('🚀 STARTUP GUARD: Delegating to AppInitializationService...');

    try {
        // Delegate all initialization to service
        await initService.initialize();
        return true; // Always allow navigation
    } catch (error) {
        console.error('❌ STARTUP GUARD: Initialization failed:', error);
        return true; // Still allow navigation (non-blocking)
    }
};