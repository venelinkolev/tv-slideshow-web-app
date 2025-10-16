// src/app/core/models/api/auth.interface.ts

/**
 * Login Request (API POST body)
 * Sent to /e-shop/api/login endpoint
 */
export interface LoginRequest {
    email: string;
    username: string;
    password: string;
}

/**
 * Login Response (API response)
 * Received from /e-shop/api/login endpoint
 */
export interface LoginResponse {
    success: boolean;
    error: {
        code: number;
        message: string;
    };
    token: string;
    shop_domain: string;
    picture_update_type: string;
}

/**
 * Stored Credentials (localStorage)
 * Used for "Remember Me" functionality
 */
export interface StoredCredentials {
    email: string;
    username: string;
    password: string; // Plain text for now (TODO: encrypt in future)
    rememberMe: boolean;
    savedAt: Date;
}

/**
 * Auth State (in-memory state management)
 * Used by AuthService signals
 */
export interface AuthState {
    isAuthenticated: boolean;
    token: string | null;
    tokenExpiration: Date | null;
    user: {
        email: string;
        username: string;
    } | null;
}