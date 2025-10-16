// src/app/core/services/auth.service.ts

import { Injectable, inject, signal, computed, DOCUMENT } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

import {
    LoginRequest,
    LoginResponse,
    StoredCredentials,
    AuthState
} from '@core/models';
import { environment } from '../../../environments/environment';

/**
 * Authentication Service for TV Slideshow Application
 * Manages user authentication, token storage, and auto-login
 * 
 * Features:
 * - Login/Logout with JWT token management
 * - Remember Me functionality (localStorage)
 * - Auto-login on app startup
 * - Token expiration tracking (24h)
 * - Angular 18 Signals for reactive state
 */
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly document = inject(DOCUMENT);

    // Default auth state
    private readonly defaultAuthState: AuthState = {
        isAuthenticated: false,
        token: null,
        tokenExpiration: null,
        user: null
    };

    // Reactive state with Angular 18 Signals
    private readonly authStateSignal = signal<AuthState>(this.defaultAuthState);

    // Public readonly signals
    readonly authState = this.authStateSignal.asReadonly();
    readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
    readonly currentUser = computed(() => this.authState().user);
    readonly token = computed(() => this.authState().token);

    constructor() {
        console.log('🔐 AuthService initialized');
        // Try to restore auth state from localStorage on startup
        this.restoreAuthStateFromStorage();
    }

    /**
     * Login with credentials
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        console.log('🔐 AuthService.login()', credentials.username);

        const url = `${environment.apiUrl}${environment.endpoints.login}`;

        return this.http.post<LoginResponse>(url, credentials).pipe(
            tap(response => {
                if (response.success && response.token) {
                    this.handleSuccessfulLogin(response, credentials);
                } else {
                    throw new Error(response.error.message || 'Login failed');
                }
            }),
            catchError(error => this.handleLoginError(error))
        );
    }

    /**
     * Logout - clear auth state and token (but keep credentials if Remember Me)
     */
    logout(): void {
        console.log('🚪 AuthService.logout()');

        // Clear auth state
        this.authStateSignal.set(this.defaultAuthState);

        // Clear token from localStorage
        const storage = this.document.defaultView?.localStorage;
        if (storage) {
            storage.removeItem(environment.auth.tokenKey);
        }

        // Do NOT clear credentials (remember me should persist)
        console.log('✅ Logged out successfully');
    }

    /**
     * Get current valid token
     */
    getToken(): string | null {
        const state = this.authState();

        // Check in-memory token first
        if (state.token && !this.isTokenExpired()) {
            return state.token;
        }

        // Try to load from localStorage
        const stored = this.getStoredToken();
        if (stored && !this.isStoredTokenExpired(stored.expiration)) {
            // Restore auth state
            this.authStateSignal.update(current => ({
                ...current,
                token: stored.token,
                tokenExpiration: stored.expiration,
                isAuthenticated: true
            }));
            return stored.token;
        }

        return null;
    }

    /**
     * Check if current token is expired
     */
    isTokenExpired(): boolean {
        const state = this.authState();
        if (!state.tokenExpiration) return true;
        return new Date() >= state.tokenExpiration;
    }

    /**
     * Save credentials to localStorage (Remember Me)
     */
    saveCredentials(credentials: StoredCredentials): void {
        if (!credentials.rememberMe) {
            this.clearStoredCredentials();
            return;
        }

        const storage = this.document.defaultView?.localStorage;
        if (!storage) return;

        const toStore = {
            ...credentials,
            savedAt: new Date().toISOString()
        };

        storage.setItem(environment.auth.credentialsKey, JSON.stringify(toStore));
        console.log('💾 Credentials saved (Remember Me)');
    }

    /**
     * Get stored credentials from localStorage
     */
    getStoredCredentials(): StoredCredentials | null {
        const storage = this.document.defaultView?.localStorage;
        if (!storage) return null;

        const stored = storage.getItem(environment.auth.credentialsKey);
        if (!stored) return null;

        try {
            const parsed = JSON.parse(stored);
            return {
                ...parsed,
                savedAt: new Date(parsed.savedAt)
            };
        } catch (error) {
            console.error('❌ Failed to parse stored credentials:', error);
            return null;
        }
    }

    /**
     * Clear stored credentials
     */
    clearStoredCredentials(): void {
        const storage = this.document.defaultView?.localStorage;
        if (!storage) return;

        storage.removeItem(environment.auth.credentialsKey);
        console.log('🗑️ Stored credentials cleared');
    }

    /**
     * Auto-login using stored credentials or valid token
     */
    autoLogin(): Observable<boolean> {
        console.log('🔄 AuthService.autoLogin() - Attempting auto-login...');

        // Check if we have a valid token first
        const token = this.getToken();
        if (token && !this.isTokenExpired()) {
            console.log('✅ Valid token found, auto-login successful');
            return of(true);
        }

        // No valid token, try stored credentials
        const credentials = this.getStoredCredentials();
        if (!credentials) {
            console.log('⚠️ No stored credentials found');
            return of(false);
        }

        // Try to login with stored credentials
        console.log('🔁 Token expired, attempting re-login with stored credentials...');
        return this.login({
            email: credentials.email,
            username: credentials.username,
            password: credentials.password
        }).pipe(
            map(() => {
                console.log('✅ Auto-login successful');
                return true;
            }),
            catchError(error => {
                console.error('❌ Auto-login failed:', error);
                this.clearStoredCredentials(); // Clear invalid credentials
                return of(false);
            })
        );
    }

    // Private helper methods

    /**
     * Handle successful login response
     */
    private handleSuccessfulLogin(response: LoginResponse, credentials: LoginRequest): void {
        // Calculate token expiration (24 hours from now)
        const expiration = new Date();
        expiration.setHours(expiration.getHours() + environment.auth.tokenExpirationHours);

        // Update auth state
        this.authStateSignal.set({
            isAuthenticated: true,
            token: response.token,
            tokenExpiration: expiration,
            user: {
                email: credentials.email,
                username: credentials.username
            }
        });

        // Save token to localStorage
        this.saveToken(response.token, expiration);

        console.log('✅ Login successful, token expires at:', expiration.toISOString());
    }

    /**
     * Handle login error
     */
    private handleLoginError(error: any): Observable<never> {
        console.error('❌ Login error:', error);

        let errorMessage = 'Грешка при вход. Моля, опитайте отново.';

        if (error.status === 401) {
            errorMessage = 'Невалидни данни за вход.';
        } else if (error.status === 0) {
            errorMessage = 'Няма връзка със сървъра.';
        } else if (error.error?.error?.message) {
            errorMessage = error.error.error.message;
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Save token to localStorage
     */
    private saveToken(token: string, expiration: Date): void {
        const storage = this.document.defaultView?.localStorage;
        if (!storage) return;

        storage.setItem(environment.auth.tokenKey, JSON.stringify({
            token,
            expiration: expiration.toISOString()
        }));
    }

    /**
     * Get stored token from localStorage
     */
    private getStoredToken(): { token: string; expiration: Date } | null {
        const storage = this.document.defaultView?.localStorage;
        if (!storage) return null;

        const stored = storage.getItem(environment.auth.tokenKey);
        if (!stored) return null;

        try {
            const parsed = JSON.parse(stored);
            return {
                token: parsed.token,
                expiration: new Date(parsed.expiration)
            };
        } catch (error) {
            console.error('❌ Failed to parse stored token:', error);
            return null;
        }
    }

    /**
     * Check if stored token is expired
     */
    private isStoredTokenExpired(expiration: Date): boolean {
        return new Date() >= expiration;
    }

    /**
     * Restore auth state from localStorage on service initialization
     */
    private restoreAuthStateFromStorage(): void {
        const stored = this.getStoredToken();
        if (!stored || this.isStoredTokenExpired(stored.expiration)) {
            return;
        }

        // Restore user info from stored credentials
        const credentials = this.getStoredCredentials();

        this.authStateSignal.set({
            isAuthenticated: true,
            token: stored.token,
            tokenExpiration: stored.expiration,
            user: credentials ? {
                email: credentials.email,
                username: credentials.username
            } : null
        });

        console.log('✅ Auth state restored from storage');
    }
}