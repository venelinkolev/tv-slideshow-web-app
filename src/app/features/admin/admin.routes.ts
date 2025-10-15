// src/app/features/admin/admin.routes.ts

import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

/**
 * Admin Module Routes
 * 
 * MVP Routes:
 * - / → AdminDashboardComponent (main config panel)
 * 
 * Future routes (after MVP):
 * - /templates → Template editor
 * - /analytics → Usage analytics
 * - /settings → Advanced settings
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    data: {
      title: 'Admin Dashboard',
      description: 'Slideshow configuration panel'
    }
  }
  // Future routes will be added here
  // {
  //     path: 'templates',
  //     loadComponent: () => import('./pages/templates/templates.component')
  //         .then(m => m.TemplatesComponent)
  // },
  // {
  //     path: 'analytics',
  //     loadComponent: () => import('./pages/analytics/analytics.component')
  //         .then(m => m.AnalyticsComponent)
  // }
];