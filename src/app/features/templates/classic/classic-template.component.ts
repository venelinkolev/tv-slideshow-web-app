import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';

/**
 * Classic product template - Traditional centered layout
 * Clean, professional design suitable for all product types
 * 
 * 🎨 DESIGN FEATURES:
 * - Centered vertical layout
 * - Professional typography
 * - Clear product hierarchy
 * - TV-safe margins and spacing
 * - Category badge overlay
 * - Stock status indicator
 */
@Component({
    selector: 'app-classic-template',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './classic-template.component.html',
    styleUrl: './classic-template.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassicTemplateComponent extends BaseProductTemplateComponent implements OnInit {
    readonly templateName = 'classic';
    readonly displayName = 'Класически';

    ngOnInit(): void {
        console.log('ClassicTemplateComponent.ngOnInit() - Initializing classic template');
        this.onTemplateLoaded();
    }

    /**
     * Get product display price with Bulgarian formatting
     */
    getDisplayPrice(): string {
        return this.formatPrice(this.product().price);
    }

    /**
     * Get truncated description for classic layout display
     */
    getDisplayDescription(): string {
        const description = this.product().shortDescription || '';
        return this.truncateText(description, 120); // Slightly longer for classic layout
    }

    /**
     * Check if product has category for badge display
     */
    hasCategory(): boolean {
        return !!(this.product().category);
    }

    /**
     * Check if product has stock information
     */
    hasStockInfo(): boolean {
        return this.product().inStock !== undefined;
    }

    /**
     * Get stock status text in Bulgarian
     */
    getStockStatusText(): string {
        return this.product().inStock ? 'В наличност' : 'Няма в наличност';
    }

    /**
     * Get stock status icon
     */
    getStockStatusIcon(): string {
        return this.product().inStock ? '✓' : '✗';
    }
}