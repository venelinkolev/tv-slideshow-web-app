import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseProductTemplateComponent } from '../base/base-product-template.component';

/**
 * Minimal product template - Fullscreen TV-optimized layout
 * Clean, focused design with large product image and centered info section
 * 
 * 🎨 DESIGN FEATURES:
 * - 2/3 screen product image with price badge overlay
 * - 1/3 screen info section with product details
 * - Dark background for TV viewing comfort
 * - High contrast text for readability
 * - No animations for performance
 * - Optimized for 24/7 commercial display
 * 
 * 📐 LAYOUT:
 * - Image section: 66.67vh (top 2/3)
 * - Info section: 33.33vh (bottom 1/3)
 * - Price badge: Circular, positioned top-right of image
 * - Text: Centered, high readability fonts
 */
@Component({
  selector: 'app-minimal-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minimal-template.component.html',
  styleUrl: './minimal-template.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinimalTemplateComponent extends BaseProductTemplateComponent implements OnInit {
  readonly templateName = 'minimal';
  readonly displayName = 'Минимален';

  ngOnInit(): void {
    console.log('MinimalTemplateComponent.ngOnInit() - Production version loaded');
    this.onTemplateLoaded();
  }

  /**
   * Get product display price with Bulgarian formatting
   * Uses base class formatPrice() method for BGN currency
   */
  getDisplayPrice(): string {
    return this.formatPrice(this.product().price);
  }

  getDisplayPriceEur(): string | null {
    return this.formatPriceEur(this.product().price);
  }

  /**
   * Get product name for display
   */
  getProductName(): string {
    return this.product().name;
  }

  /**
   * Get product description for display
   * Returns full shortDescription from API (no truncation)
   */
  getProductDescription(): string {
    return this.product().shortDescription || '';
  }

  /**
   * Check if product has description for conditional rendering
   */
  hasDescription(): boolean {
    return !!(this.product().shortDescription);
  }
}