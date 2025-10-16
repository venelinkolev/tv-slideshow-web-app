// src/app/core/services/token-refresh.service.ts

import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Token Refresh Service for TV Slideshow Application
 * Automatically refreshes authentication token before expiration
 * 
 * Features:
 * - Automatic token refresh 2 hours before expiration
 * - Hourly checks for token status
 * - Re-login with stored credentials
 * - Memory-efficient interval management
 * - Automatic cleanup on service destroy
 */
@Injectable({
    providedIn: 'root'
})
export class TokenRefreshService implements OnDestroy {
    private readonly authService = inject(AuthService);

    // Refresh interval reference
    private refreshInterval?: ReturnType<typeof setInterval>;

    // Configuration
    private readonly CHECK_INTERVAL_MS = 3600000; // Check every hour (60 * 60 * 1000)
    private readonly REFRESH_THRESHOLD_HOURS = 2; // Refresh if less than 2 hours remaining

    constructor() {
        console.log('⏰ TokenRefreshService initialized');
    }

    /**
     * Start automatic token refresh
     * Checks every hour, refreshes 2 hours before expiration
     */
    startAutoRefresh(): void {
        console.log('⏰ TokenRefreshService: Starting automatic token refresh');

        // Clear any existing interval
        this.stopAutoRefresh();

        // Set up hourly check
        this.refreshInterval = setInterval(() => {
            this.checkAndRefreshToken();
        }, this.CHECK_INTERVAL_MS);

        // Run initial check immediately
        this.checkAndRefreshToken();

        console.log('✅ Token refresh scheduler started (checking every hour)');
    }

    /**
     * Stop automatic token refresh
     */
    stopAutoRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = undefined;
            console.log('⏹️ TokenRefreshService: Stopped automatic token refresh');
        }
    }

    /**
     * Check token status and refresh if needed
     */
    private checkAndRefreshToken(): void {
        const authState = this.authService.authState();

        // Skip if not authenticated
        if (!authState.isAuthenticated || !authState.tokenExpiration) {
            console.log('⏭️ TokenRefreshService: Not authenticated, skipping check');
            return;
        }

        // Calculate hours until expiration
        const now = new Date();
        const expiration = authState.tokenExpiration;
        const millisecondsUntilExpiration = expiration.getTime() - now.getTime();
        const hoursUntilExpiration = millisecondsUntilExpiration / (1000 * 60 * 60);

        console.log(`⏱️ TokenRefreshService: Token expires in ${hoursUntilExpiration.toFixed(1)} hours`);

        // Refresh if less than threshold remaining
        if (hoursUntilExpiration < this.REFRESH_THRESHOLD_HOURS) {
            console.log(`🔄 TokenRefreshService: Token expiring soon (< ${this.REFRESH_THRESHOLD_HOURS}h), refreshing...`);
            this.refreshToken();
        } else {
            console.log(`✅ TokenRefreshService: Token is valid for ${hoursUntilExpiration.toFixed(1)} more hours`);
        }
    }

    /**
     * Refresh token by re-logging in with stored credentials
     */
    private refreshToken(): void {
        // Get stored credentials
        const credentials = this.authService.getStoredCredentials();

        if (!credentials) {
            console.warn('⚠️ TokenRefreshService: No stored credentials for refresh');
            return;
        }

        console.log('🔁 TokenRefreshService: Attempting token refresh for user:', credentials.username);

        // Re-login to get new token
        this.authService.login({
            email: credentials.email,
            username: credentials.username,
            password: credentials.password
        }).subscribe({
            next: () => {
                console.log('✅ TokenRefreshService: Token refreshed successfully');
            },
            error: (error) => {
                console.error('❌ TokenRefreshService: Token refresh failed:', error);
                console.error('⚠️ User will need to login again when token expires');
            }
        });
    }

    /**
     * Cleanup on service destroy
     */
    ngOnDestroy(): void {
        console.log('🧹 TokenRefreshService: Cleaning up...');
        this.stopAutoRefresh();
    }
}