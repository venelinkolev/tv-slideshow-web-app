import { Component, input, EventEmitter, Output } from '@angular/core';
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
    // Required inputs (запазвай signals)
    product = input.required<Product>();

    // Optional inputs with defaults
    imageQuality = input<'low' | 'medium' | 'high'>('medium');
    enableAnimations = input<boolean>(true);

    // ✅ ПРОМЯНА: EventEmitter вместо output signals
    @Output() imageError = new EventEmitter<Event>();
    @Output() templateLoaded = new EventEmitter<string>();

    // Abstract properties
    abstract readonly templateName: string;
    abstract readonly displayName: string;

    // Common TV optimizations
    protected readonly imageErrorFallback = FALLBACK_IMAGE_ALTERNATIVES.css_background;
    protected readonly maxDescriptionLength = 100;

    /**
     * Format price for Bulgarian market with BGN currency
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
     */
    protected onTemplateLoaded(): void {
        console.log(`Template loaded: ${this.templateName}`);
        this.templateLoaded.emit(this.templateName);
    }
}