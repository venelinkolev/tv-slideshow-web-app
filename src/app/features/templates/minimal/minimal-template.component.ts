import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';

/**
 * Minimal product template - STUB VERSION
 * This is a placeholder component to satisfy imports
 * Will be fully implemented later
 */
@Component({
    selector: 'app-minimal-template',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Minimal Template STUB - Basic fallback display -->
    <div [class]="getTemplateClasses()">
      <div style="padding: 40px; text-align: center; background: #ffffff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; border: 1px solid #eee;">
        <h1 style="font-size: 28px; color: #333; margin-bottom: 16px; font-weight: 300;">{{ product().name }}</h1>
        <div style="font-size: 24px; color: #666; margin-bottom: 12px;">{{ formatPrice(product().price) }}</div>
        <p style="font-size: 18px; color: #999;">MINIMAL TEMPLATE - В РАЗРАБОТКА</p>
        <img 
          [src]="product().imageUrl"
          [alt]="product().name"
          (error)="onImageError($event)"
          style="max-width: 250px; max-height: 180px; object-fit: cover; margin: 16px auto; border-radius: 4px;"
        />
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinimalTemplateComponent extends BaseProductTemplateComponent implements OnInit {
    readonly templateName = 'minimal';
    readonly displayName = 'Минимален (STUB)';

    ngOnInit(): void {
        console.log('MinimalTemplateComponent.ngOnInit() - STUB version loaded');
        this.onTemplateLoaded();
    }
}