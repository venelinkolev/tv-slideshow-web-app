// src/app/core/interceptors/auth.interceptor.ts

import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '@core/services/auth.service';

/**
 * Authentication Interceptor for TV Slideshow Application
 * Automatically adds JWT token to HTTP requests and handles 401 errors
 * 
 * Features:
 * - Adds Authorization Bearer token to all requests (except login)
 * - Handles 401 Unauthorized errors → logout and redirect to login
 * - TV-optimized error messages in Bulgarian
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    /**
     * Intercept HTTP requests and add authentication token
     */
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Skip auth header for login endpoint
        if (this.isLoginRequest(req)) {
            console.log('🔓 AuthInterceptor: Skipping token for login request');
            return next.handle(req);
        }

        // Get current valid token
        const token = this.authService.getToken();

        // If no token, pass request as-is
        if (!token) {
            console.log('⚠️ AuthInterceptor: No token available for', req.method, req.url);
            return next.handle(req);
        }

        // Clone request and add Authorization header
        const clonedRequest = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log(`🔑 AuthInterceptor: Added token to ${req.method} ${req.url}`);

        // Handle the request and catch 401 errors
        return next.handle(clonedRequest).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    console.error('🚨 AuthInterceptor: 401 Unauthorized - Token expired or invalid');
                    this.handle401Error();
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Check if request is to login endpoint
     */
    private isLoginRequest(req: HttpRequest<any>): boolean {
        return req.url.includes('/login');
    }

    /**
     * Handle 401 Unauthorized error
     * Logout user and redirect to login page
     */
    private handle401Error(): void {
        console.log('🚪 AuthInterceptor: Logging out user due to 401 error');

        // Logout user (clears token but keeps credentials if Remember Me)
        this.authService.logout();

        // Redirect to login page
        this.router.navigate(['/login'], {
            queryParams: {
                error: 'session_expired',
                message: 'Сесията ви изтече. Моля, влезте отново.'
            }
        });
    }
}