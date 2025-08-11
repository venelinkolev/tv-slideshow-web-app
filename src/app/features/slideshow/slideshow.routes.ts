import { Routes } from '@angular/router';
import { SlideshowComponent } from './components/slideshow/slideshow.component';
import { slideshowGuard, slideshowDeactivateGuard } from './guards';

export const SLIDESHOW_ROUTES: Routes = [
  {
    path: '',
    component: SlideshowComponent,
    canActivate: [slideshowGuard],
    canDeactivate: [slideshowDeactivateGuard],
    title: 'Product Slideshow' // За SEO и browser tab
  }
];