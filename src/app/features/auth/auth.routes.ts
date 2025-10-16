// src/app/features/auth/auth.routes.ts

import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';

/**
 * Auth Module Routes
 * No authentication required (public routes)
 */
export const AUTH_ROUTES: Routes = [
    {
        path: '',
        component: LoginComponent,
        data: {
            title: 'Login',
            hideNavigation: true
        }
    }
];