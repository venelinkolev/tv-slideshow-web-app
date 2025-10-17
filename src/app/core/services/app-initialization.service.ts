// src/app/core/services/app-initialization.service.ts

import { Injectable, inject, DOCUMENT } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';
import { ConfigService } from './config.service';
import { ProductApiService } from './product-api.service';

/**
 * App Initialization Service for TV Slideshow Application
 * Coordinates all startup processes in correct order
 * 
 * Responsibilities:
 * - Auto-login with stored credentials/token
 * - Start token refresh mechanism
 * - Load slideshow configuration
 * - Optional data preloading
 * - Error handling during initialization
 * 
 * Usage:
 * Registered in app.config.ts via APP_INITIALIZER
 * Runs before application fully bootstraps
 */
@Injectable({
    providedIn: 'root'
})
export class AppInitializationService {
    private readonly authService = inject(AuthService);
    private readonly tokenRefreshService = inject(TokenRefreshService);
    private readonly configService = inject(ConfigService);
    private readonly productApiService = inject(ProductApiService);
    private readonly document = inject(DOCUMENT);

    // Initialization state tracking
    private initializationComplete = false;
    private initializationStartTime = 0;

    constructor() {
        console.log('🚀 AppInitializationService created');
    }

    /**
     * Main initialization method
     * Called by APP_INITIALIZER before app bootstrap
     * 
     * @returns Promise that resolves when initialization is complete
     */
    async initialize(): Promise<void> {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🚀 APP INITIALIZATION START');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        this.initializationStartTime = Date.now();

        try {
            // STEP 1: Auto-login
            const loginSuccess = await this.performAutoLogin();
            console.log(`✅ Step 1/4: Auto-login ${loginSuccess ? 'successful' : 'skipped'}`);

            // STEP 2: Start token refresh (only if authenticated)
            this.startTokenRefresh();
            console.log('✅ Step 2/4: Token refresh configured');

            // STEP 3: Load configuration
            const configLoaded = await this.loadConfiguration();
            console.log(`✅ Step 3/4: Configuration ${configLoaded ? 'loaded' : 'using defaults'}`);

            // STEP 4: Preload data (non-blocking)
            this.preloadData().catch(err => {
                console.warn('⚠️ Data preload failed (non-critical):', err);
            });
            console.log('✅ Step 4/4: Data preload initiated (background)');

            this.initializationComplete = true;

            const duration = Date.now() - this.initializationStartTime;
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🎉 APP INITIALIZATION COMPLETE (${duration}ms)`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        } catch (error) {
            this.handleInitializationError(error);
            // Don't throw - allow app to start even if initialization has issues
        }
    }

    /**
     * STEP 1: Auto-login with stored credentials or token
     * 
     * @returns Promise<boolean> - true if login successful, false otherwise
     */
    private async performAutoLogin(): Promise<boolean> {
        console.log('🔑 Step 1: Attempting auto-login...');

        try {
            // Try auto-login via AuthService
            const result = await firstValueFrom(this.authService.autoLogin());

            if (result) {
                const user = this.authService.currentUser();
                console.log(`✅ Auto-login successful for user: ${user?.username || 'unknown'}`);
                return true;
            } else {
                console.log('ℹ️ No stored credentials or valid token found');
                return false;
            }

        } catch (error) {
            console.warn('⚠️ Auto-login failed:', error);
            return false;
        }
    }

    /**
     * STEP 2: Start token refresh mechanism
     * Only starts if user is authenticated
     */
    private startTokenRefresh(): void {
        console.log('⏰ Step 2: Configuring token refresh...');

        const isAuthenticated = this.authService.isAuthenticated();

        if (isAuthenticated) {
            this.tokenRefreshService.startAutoRefresh();
            console.log('✅ Token refresh started (checking every hour)');
        } else {
            console.log('ℹ️ Token refresh skipped (not authenticated)');
        }
    }

    /**
     * STEP 3: Load slideshow configuration
     * 
     * @returns Promise<boolean> - true if config loaded, false if using defaults
     */
    private async loadConfiguration(): Promise<boolean> {
        console.log('⚙️ Step 3: Loading configuration...');

        try {
            // Load config from ConfigService
            await firstValueFrom(this.configService.loadConfig());

            const config = this.configService.config();
            console.log(`✅ Configuration loaded: ${config.name}`);
            console.log(`   - Template: ${config.templates.selectedTemplateId || 'not selected'}`);
            console.log(`   - Products: ${config.products.selectedProductIds.length} selected`);
            console.log(`   - Enabled: ${config.general.enabled}`);

            return true;

        } catch (error) {
            console.warn('⚠️ Configuration load failed, using defaults:', error);
            return false;
        }
    }

    /**
     * STEP 4: Preload data in background (non-blocking)
     * Optional optimization to reduce initial load time
     */
    private async preloadData(): Promise<void> {
        console.log('📦 Step 4: Preloading data (background)...');

        try {
            // Only preload if authenticated
            if (!this.authService.isAuthenticated()) {
                console.log('ℹ️ Data preload skipped (not authenticated)');
                return;
            }

            // Preload products in background
            const products = await firstValueFrom(this.productApiService.getProducts());
            console.log(`✅ Preloaded ${products.length} products`);

            // Store preload timestamp for cache optimization
            const storage = this.document.defaultView?.localStorage;
            if (storage) {
                storage.setItem('app-preload-timestamp', new Date().toISOString());
            }

        } catch (error) {
            console.warn('⚠️ Data preload failed (non-critical):', error);
            // Don't throw - preload is optional
        }
    }

    /**
     * Handle initialization errors gracefully
     * App should still start even if initialization has issues
     */
    private handleInitializationError(error: any): void {
        const duration = Date.now() - this.initializationStartTime;

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`❌ APP INITIALIZATION ERROR (${duration}ms)`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error details:', error);
        console.error('Stack trace:', error?.stack);

        // Log error to localStorage for debugging
        try {
            const storage = this.document.defaultView?.localStorage;
            if (storage) {
                const errorLog = {
                    timestamp: new Date().toISOString(),
                    error: error?.message || 'Unknown error',
                    stack: error?.stack || 'No stack trace',
                    duration
                };
                storage.setItem('app-init-error', JSON.stringify(errorLog));
            }
        } catch (storageError) {
            console.error('Failed to store error log:', storageError);
        }

        console.warn('⚠️ App will continue with default configuration');
        console.warn('ℹ️ User may need to login manually');
    }

    /**
     * Check if initialization is complete
     * Useful for debugging and testing
     */
    isInitialized(): boolean {
        return this.initializationComplete;
    }

    /**
     * Get initialization duration
     * Useful for performance monitoring
     */
    getInitializationDuration(): number {
        if (!this.initializationComplete) {
            return 0;
        }
        return Date.now() - this.initializationStartTime;
    }
}