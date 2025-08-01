// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import './test-template-registry-service';
import { TemplateUsageExampleComponent } from './examples/template-registry-usage';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TemplateUsageExampleComponent],
  template: `
    <div class="tv-app-container">
      <app-template-usage-example></app-template-usage-example>
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