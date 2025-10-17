// src/environments/environment.development.ts
// Development Environment Configuration

export const environment = {
    production: false,

    // API Configuration (same as production for now)
    apiUrl: 'https://api3.eyanak.com:1110/e-shop/api',

    endpoints: {
        login: '/login',
        getStocks: '/getstockslite'
    },

    // Authentication Configuration (separate keys for dev)
    auth: {
        tokenExpirationHours: 1,
        rememberMeKey: 'tv-slideshow-remember-me-dev',
        credentialsKey: 'tv-slideshow-credentials-dev',
        tokenKey: 'tv-slideshow-token-dev'
    },

    // Application Info
    app: {
        name: 'TV Slideshow (Dev)',
        version: '1.0.0-dev'
    },

    // Development-specific settings
    debugMode: true, // Extra logging in dev mode
    mockDataFallback: true // Allow mock data as fallback
};