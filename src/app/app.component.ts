// src/app/app.component.ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
// import './test-error-interceptor';
// import './test-template-registry-service';
// import { TemplateUsageExampleComponent } from './examples/template-registry-usage';
// import { PerformanceUsageExampleComponent } from './examples/performance-monitor-usage';
// import { ErrorInterceptorUsageExampleComponent } from './examples/error-interceptor-usage'; // Uncomment to test error interceptor usage

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule,],
  template: `
    <div class="tv-app-container">
      <!-- <app-template-usage-example></app-template-usage-example> -->
       <!-- <app-performance-usage-example></app-performance-usage-example> -->
      <!-- <app-error-interceptor-usage-example></app-error-interceptor-usage-example> -->
      <button (click)="testErrorHandling()">Test Error Handling</button>
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
  private http = inject(HttpClient);

  testErrorHandling() {
    // This will trigger ErrorInterceptor
    this.http.get('/api/non-existent-endpoint').subscribe({
      next: (data) => console.log('Success:', data),
      error: (error) => {
        // Error processed by ErrorInterceptor
        console.log('Processed error:', error);
        console.log('User-friendly message:', error.message);
      }
    });

    this.http.get('http://invalid-domain-that-does-not-exist.com/api').subscribe({
      error: (err) => console.log('Network error:', err)
    });

    this.http.get('https://httpstat.us/500').subscribe({
      error: (err) => console.log('Server error:', err)
    });

    this.http.get('https://httpstat.us/404').subscribe({
      error: (err) => console.log('Not found error:', err)
    });

    this.http.get('https://httpstat.us/429').subscribe({
      error: (err) => console.log('Rate limit error:', err)
    });
  }
}