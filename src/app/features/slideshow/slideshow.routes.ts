// src/app/features/slideshow/slideshow.routes.ts
import { Routes } from '@angular/router';
import { SlideshowComponent } from './components/slideshow/slideshow.component';

export const SLIDESHOW_ROUTES: Routes = [
  {
    path: '',
    component: SlideshowComponent,
    // Guard ще бъде добавен в подзадача 4.1.3
  }
];
