// src/app/core/guards/startup.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { TokenRefreshService } from '@core/services/token-refresh.service';
import { ConfigService } from '@core/services/config.service';

/**
 * Startup Guard for TV Slideshow Application
 * Ensures all critical services are initialized before app routes activate
 * 
 * This guard:
 * - Runs ONCE on first route activation
 * - Triggers auto-login if credentials exist
 * - Starts token refresh mechanism
 * - Loads configuration
 * - Returns true (never blocks routing)
 * 
 * Pattern: Lazy initialization via guard injection
 * Services initialize when first injected by this guard
 */
export const startupGuard: CanActivateFn = async (route, state) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 STARTUP GUARD: App initialization starting...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const startTime = Date.now();

    // STEP 1: Inject services (triggers constructors)
    const authService = inject(AuthService);
    const tokenRefreshService = inject(TokenRefreshService);
    const configService = inject(ConfigService);

    console.log('✅ Step 1/4: Services injected');

    try {
        // STEP 2: Auto-login attempt
        const loginResult = await firstValueFrom(authService.autoLogin());
        console.log(`✅ Step 2/4: Auto-login ${loginResult ? 'successful' : 'skipped'}`);

        // STEP 3: Start token refresh (if authenticated)
        if (authService.isAuthenticated()) {
            tokenRefreshService.startAutoRefresh();
            console.log('✅ Step 3/4: Token refresh started');
        } else {
            console.log('ℹ️ Step 3/4: Token refresh skipped (not authenticated)');
        }

        // STEP 4: Load configuration
        await firstValueFrom(configService.loadConfig());
        console.log('✅ Step 4/4: Configuration loaded');

    } catch (error) {
        console.warn('⚠️ Startup initialization error (non-blocking):', error);
        // Don't block routing - allow app to continue
    }

    const duration = Date.now() - startTime;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 STARTUP GUARD: Initialization complete (${duration}ms)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Always return true - never block navigation
    return true;
};