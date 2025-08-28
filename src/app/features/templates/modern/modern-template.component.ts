import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';

/**
 * Modern product template - STUB VERSION
 * This is a placeholder component to satisfy imports
 * Will be fully implemented later
 */
@Component({
    selector: 'app-modern-template',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Modern Template STUB - Basic fallback display -->
    <div [class]="getTemplateClasses()">
      <div style="padding: 40px; text-align: center; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h1 style="font-size: 32px; color: #333; margin-bottom: 20px;">{{ product().name }}</h1>
        <div style="font-size: 28px; color: #ff6b35; margin-bottom: 16px;">{{ formatPrice(product().price) }}</div>
        <p style="font-size: 20px; color: #666;">MODERN TEMPLATE - В РАЗРАБОТКА</p>
        <img 
          [src]="product().imageUrl"
          [alt]="product().name"
          (error)="onImageError($event)"
          style="max-width: 300px; max-height: 200px; object-fit: cover; margin: 20px auto; border-radius: 8px;"
        />
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModernTemplateComponent extends BaseProductTemplateComponent implements OnInit {
    readonly templateName = 'modern';
    readonly displayName = 'Модерен (STUB)';

    ngOnInit(): void {
        console.log('ModernTemplateComponent.ngOnInit() - STUB version loaded');
        this.onTemplateLoaded();
    }
}