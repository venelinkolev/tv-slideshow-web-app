import { Routes } from '@angular/router';
import { ErrorStateTestComponent } from './test/error-state-test.component';

export const routes: Routes = [
    {
        path: 'slideshow',
        loadChildren: () => import('./features/slideshow/slideshow.routes').then(m => m.SLIDESHOW_ROUTES),
        data: {
            preload: true, // Приоритизираме зареждането на slideshow модула
            title: 'TV Slideshow'
        }
    },
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
        data: {
            preload: false, // Не зареждаме предварително admin панела
            title: 'Admin Panel'
        }
    },
    {
        path: '',
        redirectTo: '/slideshow',
        pathMatch: 'full'
    },
    { path: 'test-error', component: ErrorStateTestComponent, data: { title: 'Error State Test' } },
    {
        path: '**',
        redirectTo: '/slideshow' // TV-safe fallback
    }
];