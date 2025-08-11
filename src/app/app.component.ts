// src/app/app.component.ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
// import { TestInterceptorsComponent } from './test-interceptors.component';

// import './test-interceptors-completed'; // Importing test interceptors for debugging
// import './test-error-interceptor';
// import './test-template-registry-service';
// import { TemplateUsageExampleComponent } from './examples/template-registry-usage';
// import { PerformanceUsageExampleComponent } from './examples/performance-monitor-usage';
// import { ErrorInterceptorUsageExampleComponent } from './examples/error-interceptor-usage'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule,],
  template: `
    <div class="tv-app-container">
      <!-- <app-template-usage-example></app-template-usage-example> -->
       <!-- <app-performance-usage-example></app-performance-usage-example> -->
      <!-- <app-error-interceptor-usage-example></app-error-interceptor-usage-example> -->
      <!-- <app-test-interceptors></app-test-interceptors> -->
       <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .tv-app-container {
      width: 100vw;
      height: 100vh;
      background: var(--tv-background);
      overflow: hidden; /* Prevent scrolling on TV */
    }
  `]
})
export class AppComponent {
  title = 'TV Slideshow Application';

}