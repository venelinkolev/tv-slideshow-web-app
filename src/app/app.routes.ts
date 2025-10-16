import { Routes } from '@angular/router';
import { ErrorStateTestComponent } from './test/error-state-test.component';
import { authGuard } from '@core/guards/auth.guard'; // Импортиране на authGuard

export const routes: Routes = [
    // Login route (no auth required)
    {
        path: 'login',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
        data: { title: 'Login' }
    },
    // Slideshow route (auth required)
    {
        path: 'slideshow',
        loadChildren: () => import('./features/slideshow/slideshow.routes').then(m => m.SLIDESHOW_ROUTES),
        canActivate: [authGuard], // Защита на маршрута със стражата
        data: {
            preload: true, // Приоритизираме зареждането на slideshow модула
            title: 'TV Slideshow'
        }
    },
    // Admin route (auth required)
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        canActivate: [authGuard], // Защита на маршрута със стражата
        data: {
            preload: false, // Не зареждаме предварително admin панела
            title: 'Admin Panel'
        }
    },
    // Default redirect → login
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    // Wildcard route for a 404 page (or error testing)
    {
        path: 'test-error',
        component: ErrorStateTestComponent,
        data: { title: 'Error State Test' }
    },
    // 404 → login
    {
        path: '**',
        redirectTo: '/login'
    }
];