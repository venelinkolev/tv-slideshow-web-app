// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { ErrorStateTestComponent } from './test/error-state-test.component';
import { authGuard } from '@core/guards/auth.guard';
import { startupGuard } from '@core/guards/startup.guard';

/**
 * Application Routes Configuration
 * 
 * startupGuard: Runs on ALL routes to ensure app initialization
 * authGuard: Protects authenticated routes (slideshow, admin)
 */
export const routes: Routes = [
    // Login route (public, but with startup guard)
    {
        path: 'login',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
        canActivate: [startupGuard], // Initialize app on first route
        data: { title: 'Login' }
    },
    // Slideshow route (auth required + startup guard)
    {
        path: 'slideshow',
        loadChildren: () => import('./features/slideshow/slideshow.routes').then(m => m.SLIDESHOW_ROUTES),
        canActivate: [startupGuard, authGuard], // Startup first, then auth check
        data: {
            preload: true, // Приоритизираме зареждането на slideshow модула
            title: 'TV Slideshow'
        }
    },
    // Admin route (auth required + startup guard)
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [startupGuard, authGuard], // Startup first, then auth check
        data: {
            preload: false,
            title: 'Admin Panel'
        }
    },
    // Default redirect → login
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    // Test route (with startup guard)
    {
        path: 'test-error',
        component: ErrorStateTestComponent,
        canActivate: [startupGuard],
        data: { title: 'Error State Test' }
    },
    // 404 → login
    {
        path: '**',
        redirectTo: '/login'
    }
];