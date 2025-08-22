import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';

/**
 * Bold product template - STUB VERSION
 * This is a placeholder component to satisfy imports
 * Will be fully implemented later
 */
@Component({
    selector: 'app-bold-template',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Bold Template STUB - Basic fallback display -->
    <div [class]="getTemplateClasses()">
      <div style="padding: 40px; text-align: center; background: linear-gradient(45deg, #ff6b35, #f7931e); min-height: 100vh; display: flex; flex-direction: column; justify-content: center; color: white;">
        <h1 style="font-size: 36px; margin-bottom: 20px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">{{ product().name }}</h1>
        <div style="font-size: 32px; margin-bottom: 16px; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">{{ formatPrice(product().price) }}</div>
        <p style="font-size: 22px; opacity: 0.9;">BOLD TEMPLATE - В РАЗРАБОТКА</p>
        <img 
          [src]="product().imageUrl"
          [alt]="product().name"
          (error)="onImageError($event)"
          style="max-width: 350px; max-height: 220px; object-fit: cover; margin: 20px auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);"
        />
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoldTemplateComponent extends BaseProductTemplateComponent implements OnInit {
    readonly templateName = 'bold';
    readonly displayName = 'Смел (STUB)';

    ngOnInit(): void {
        console.log('BoldTemplateComponent.ngOnInit() - STUB version loaded');
        this.onTemplateLoaded();
    }
}