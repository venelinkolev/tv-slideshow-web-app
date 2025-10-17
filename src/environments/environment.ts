// src/environments/environment.ts
// Production Environment Configuration

export const environment = {
    production: true,

    // API Configuration
    apiUrl: 'https://api3.eyanak.com:1110/e-shop/api',

    endpoints: {
        login: '/login',
        getStocks: '/getstockslite'
    },

    // Authentication Configuration
    auth: {
        tokenExpirationHours: 1,
        rememberMeKey: 'tv-slideshow-remember-me',
        credentialsKey: 'tv-slideshow-credentials',
        tokenKey: 'tv-slideshow-token'
    },

    // Application Info
    app: {
        name: 'TV Slideshow',
        version: '1.0.0'
    }
};