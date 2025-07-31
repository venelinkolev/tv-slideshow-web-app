import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'slideshow',
        loadChildren: () => import('./features/slideshow/slideshow.routes').then(m => m.SLIDESHOW_ROUTES)
    },
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
    },
    {
        path: '',
        redirectTo: '/slideshow',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: '/slideshow'
    }
];
