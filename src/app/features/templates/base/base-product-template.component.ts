import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

import { Product } from '@core/models';

/**
 * Abstract base class for all product display templates
 * Provides common functionality and TV-specific optimizations
 * 
 * 🎯 KEY FEATURES:
 * - Common TV optimizations (font sizes, safe areas)
 * - Image error handling with fallbacks
 * - Bulgarian currency formatting
 * - Text truncation for TV viewing
 * - Consistent template interface
 */

export const FALLBACK_IMAGE_ALTERNATIVES = {
    // Online placeholder service
    placeholder_service: 'https://via.placeholder.com/400x300/cccccc/666666?text=Product+Image',

    // Base64 encoded minimal placeholder (1x1 pixel transparent)
    transparent_pixel: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    // CSS fallback (can be handled in SCSS)
    css_background: '/assets/images/product-placeholder.jpg',

    // Default Angular assets
    angular_default: '/assets/angular.svg'
};

@Component({
    template: '',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export abstract class BaseProductTemplateComponent {
    // Required inputs
    product = input.required<Product>();

    // Optional inputs with defaults for TV optimization
    imageQuality = input<'low' | 'medium' | 'high'>('medium');
    enableAnimations = input<boolean>(true);

    // Output events for parent component communication
    imageError = output<Event>();
    templateLoaded = output<string>();

    // Abstract properties that must be implemented by concrete templates
    abstract readonly templateName: string;
    abstract readonly displayName: string;

    // Common TV optimizations and fallbacks
    protected readonly imageErrorFallback = FALLBACK_IMAGE_ALTERNATIVES.css_background;
    protected readonly maxDescriptionLength = 100; // TV viewing optimized

    /**
     * Format price for Bulgarian market with BGN currency
     * @param price Product price
     * @returns Formatted price string (e.g., "29,99 лв.")
     */
    protected formatPrice(price: number): string {
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }

    /**
     * Truncate text for TV display with proper word boundaries
     * @param text Text to truncate
     * @param maxLength Maximum character length
     * @returns Truncated text with ellipsis
     */
    protected truncateText(text: string, maxLength: number = this.maxDescriptionLength): string {
        if (text.length <= maxLength) return text;

        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');

        return (lastSpace > 0 ?
            truncated.substring(0, lastSpace) : truncated) + '...';
    }

    /**
     * Handle image loading errors with fallback
     * @param event Error event
     */
    onImageError(event: Event): void {
        console.log(`BaseProductTemplateComponent.onImageError() - ${this.templateName}`, event);

        const img = event.target as HTMLImageElement;
        if (img && img.src !== this.imageErrorFallback) {
            img.src = this.imageErrorFallback;
        }

        this.imageError.emit(event);
    }

    /**
     * Get CSS classes for template container
     * @returns CSS class string
     */
    protected getTemplateClasses(): string {
        return [
            'product-template',
            `template-${this.templateName}`,
            `quality-${this.imageQuality()}`,
            this.enableAnimations() ? 'animations-enabled' : 'animations-disabled'
        ].join(' ');
    }

    /**
     * Template lifecycle hook - called when template is loaded
     * @protected
     */
    protected onTemplateLoaded(): void {
        console.log(`Template loaded: ${this.templateName}`);
        this.templateLoaded.emit(this.templateName);
    }
}