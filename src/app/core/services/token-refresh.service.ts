// src/app/core/services/token-refresh.service.ts

import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '@environments/environment';

/**
 * Token Refresh Service for TV Slideshow Application
 * Automatically refreshes authentication token before expiration
 * 
 * Features:
 * - Dynamic refresh threshold based on token lifetime
 * - Frequent checks (every 10 minutes) for reliability
 * - Re-login with stored credentials
 * - Memory-efficient interval management
 * - Automatic cleanup on service destroy
 * 
 * Logic:
 * - Short-lived tokens (< 4h): Refresh at 50% of lifetime
 * - Long-lived tokens (>= 4h): Refresh 2 hours before expiration
 * 
 * Examples:
 * - 1 hour token → refresh at 30 minutes
 * - 4 hour token → refresh at 2 hours before
 * - 24 hour token → refresh at 22 hours (2h before)
 */
@Injectable({
    providedIn: 'root'
})
export class TokenRefreshService implements OnDestroy {
    private readonly authService = inject(AuthService);

    // Refresh interval reference
    private refreshInterval?: ReturnType<typeof setInterval>;

    // ✅ OPTIMIZED: Check every 10 minutes for better responsiveness
    private readonly CHECK_INTERVAL_MS = 600000; // 10 minutes (10 * 60 * 1000)

    constructor() {
        console.log('⏰ TokenRefreshService initialized');
    }

    /**
     * Start automatic token refresh
     * Checks every 10 minutes with dynamic threshold
     */
    startAutoRefresh(): void {
        console.log('⏰ TokenRefreshService: Starting automatic token refresh');

        // Clear any existing interval
        this.stopAutoRefresh();

        // Set up 10-minute check interval
        this.refreshInterval = setInterval(() => {
            this.checkAndRefreshToken();
        }, this.CHECK_INTERVAL_MS);

        // Run initial check immediately
        this.checkAndRefreshToken();

        const tokenLifetime = environment.auth.tokenExpirationHours;
        const threshold = this.getRefreshThresholdHours();
        console.log(`✅ Token refresh scheduler started`);
        console.log(`   - Check interval: every 10 minutes`);
        console.log(`   - Token lifetime: ${tokenLifetime} hour(s)`);
        console.log(`   - Refresh threshold: ${threshold.toFixed(2)} hour(s) before expiration`);
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
     * Calculate dynamic refresh threshold based on token lifetime
     * 
     * Strategy:
     * - Short-lived tokens (< 4h): Refresh at 50% of lifetime
     * - Long-lived tokens (>= 4h): Refresh 2h before expiration
     * 
     * @returns Threshold in hours
     * @private
     */
    private getRefreshThresholdHours(): number {
        const tokenLifetime = environment.auth.tokenExpirationHours;

        // For short-lived tokens (< 4 hours), refresh at 50% of lifetime
        if (tokenLifetime < 4) {
            return tokenLifetime * 0.5;
        }

        // For long-lived tokens (>= 4 hours), refresh 2 hours before
        return 2;
    }

    /**
     * Check token status and refresh if needed
     * @private
     */
    private checkAndRefreshToken(): void {
        const authState = this.authService.authState();

        // Skip if not authenticated
        if (!authState.isAuthenticated || !authState.tokenExpiration) {
            console.log('⏭️ TokenRefreshService: Not authenticated, skipping check');
            return;
        }

        // Calculate time until expiration
        const now = new Date();
        const expiration = authState.tokenExpiration;
        const millisecondsUntilExpiration = expiration.getTime() - now.getTime();
        const hoursUntilExpiration = millisecondsUntilExpiration / (1000 * 60 * 60);
        const minutesUntilExpiration = millisecondsUntilExpiration / (1000 * 60);

        // Get dynamic threshold
        const thresholdHours = this.getRefreshThresholdHours();

        // Format time display for better readability
        const timeDisplay = hoursUntilExpiration >= 1
            ? `${hoursUntilExpiration.toFixed(2)} hours`
            : `${minutesUntilExpiration.toFixed(0)} minutes`;

        console.log(`⏱️ TokenRefreshService: Token expires in ${timeDisplay} (threshold: ${thresholdHours.toFixed(2)}h)`);

        // Refresh if less than threshold remaining
        if (hoursUntilExpiration < thresholdHours) {
            console.log(`🔄 TokenRefreshService: Token expiring soon (< ${thresholdHours.toFixed(2)}h), refreshing...`);
            this.refreshToken();
        } else {
            console.log(`✅ TokenRefreshService: Token is valid (${timeDisplay} remaining)`);
        }
    }

    /**
     * Refresh token by re-logging in with stored credentials
     * @private
     */
    private refreshToken(): void {
        // Get stored credentials
        const credentials = this.authService.getStoredCredentials();

        if (!credentials) {
            console.warn('⚠️ TokenRefreshService: No stored credentials for refresh');
            console.warn('   User will need to login again when token expires');
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
                const newExpiration = this.authService.authState().tokenExpiration;
                console.log('✅ TokenRefreshService: Token refreshed successfully');
                console.log(`   New token expires at: ${newExpiration?.toLocaleString('bg-BG')}`);
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

    /**
     * Get current refresh configuration (for debugging/admin panel)
     * @returns Current configuration object
     */
    getRefreshConfiguration(): {
        tokenLifetimeHours: number;
        checkIntervalMinutes: number;
        refreshThresholdHours: number;
        nextCheckIn: number | null;
    } {
        const tokenLifetime = environment.auth.tokenExpirationHours;
        const threshold = this.getRefreshThresholdHours();

        return {
            tokenLifetimeHours: tokenLifetime,
            checkIntervalMinutes: this.CHECK_INTERVAL_MS / 60000,
            refreshThresholdHours: threshold,
            nextCheckIn: this.refreshInterval ? this.CHECK_INTERVAL_MS : null
        };
    }
}