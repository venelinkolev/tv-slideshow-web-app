// src/app/features/slideshow/slideshow.routes.ts
import { Routes } from '@angular/router';
import { SlideshowComponent } from './components/slideshow/slideshow.component';
import { slideshowGuard, slideshowDeactivateGuard } from './guards';
import { CONFIG_PROVIDERS } from './providers/default-config.provider';

/**
 * Маршрути за Slideshow модула
 * Оптимизирани за TV показване и с вградени TV-specific оптимизации
 */
export const SLIDESHOW_ROUTES: Routes = [
  {
    path: '',
    component: SlideshowComponent,
    // canActivate: [slideshowGuard],
    // canDeactivate: [slideshowDeactivateGuard],
    providers: [
      ...CONFIG_PROVIDERS // Предоставяме конфигурация на route ниво
    ],
    data: {
      title: 'TV Slideshow',
      fullscreen: true,
      preserveScrollPosition: false,
      tvSafeZone: true,
      disableAnimation: false, // Enable animations for slideshow
      priority: 100 // High priority for TV display
    }
  }
];