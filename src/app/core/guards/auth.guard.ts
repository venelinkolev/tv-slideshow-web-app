// src/app/core/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '@core/services/auth.service';

/**
 * Authentication Guard for TV Slideshow Application
 * Protects routes that require authentication
 * Uses functional guard approach (Angular 14+)
 * 
 * Features:
 * - Checks if user is authenticated
 * - Validates token expiration
 * - Redirects to login if not authenticated
 * - Preserves intended route in returnUrl query param
 */
export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log('🛡️ AuthGuard: Checking authentication for route:', state.url);

    // Check if user is authenticated (from signal)
    if (authService.isAuthenticated()) {
        console.log('✅ AuthGuard: User is authenticated');
        return true;
    }

    // Check if we have a valid token (might be expired in signal but valid in storage)
    const token = authService.getToken();
    if (token && !authService.isTokenExpired()) {
        console.log('✅ AuthGuard: Valid token found');
        return true;
    }

    // Not authenticated or token expired → redirect to login
    console.log('❌ AuthGuard: Not authenticated, redirecting to login');

    // Save the intended route to return after login
    router.navigate(['/login'], {
        queryParams: {
            returnUrl: state.url
        }
    });

    return false;
};