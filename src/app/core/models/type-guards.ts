import {
    Product,
    ProductBadge,
    ProductDiscount
} from './product.interface';
import {
    ProductTemplate,
    TemplateConfig
} from './template.interface';
import {
    SlideshowConfig,
    SlideshowGeneralSettings
} from './slideshow-config.interface';
import {
    ApiResponse,
    SystemHealth
} from './api-response.interface';

/**
 * Type guard functions for runtime type checking
 * Essential for validating API responses and user input
 */

/**
 * Product type guards
 */
export function isProduct(obj: unknown): obj is Product {
    if (!obj || typeof obj !== 'object') return false;

    const product = obj as Record<string, unknown>;

    return typeof product['id'] === 'string' &&
        typeof product['name'] === 'string' &&
        typeof product['price'] === 'number' &&
        typeof product['imageUrl'] === 'string' &&
        typeof product['shortDescription'] === 'string' &&
        typeof product['category'] === 'string' &&
        typeof product['inStock'] === 'boolean';
}

export function isProductArray(obj: unknown): obj is Product[] {
    return Array.isArray(obj) && obj.every(isProduct);
}

export function isProductBadge(obj: unknown): obj is ProductBadge {
    if (!obj || typeof obj !== 'object') return false;

    const badge = obj as Record<string, unknown>;

    return typeof badge['text'] === 'string' &&
        ['primary', 'secondary', 'success', 'warning', 'error'].includes(badge['color'] as string) &&
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(badge['position'] as string);
}

export function isProductDiscount(obj: unknown): obj is ProductDiscount {
    if (!obj || typeof obj !== 'object') return false;

    const discount = obj as Record<string, unknown>;

    return typeof discount['originalPrice'] === 'number' &&
        typeof discount['percentage'] === 'number' &&
        typeof discount['percentage'] === 'number' &&
        (discount['percentage'] as number) >= 0 &&
        (discount['percentage'] as number) <= 100;
}

/**
 * Template type guards
 */
export function isProductTemplate(obj: unknown): obj is ProductTemplate {
    if (!obj || typeof obj !== 'object') return false;

    const template = obj as Record<string, unknown>;

    return typeof template['id'] === 'string' &&
        typeof template['name'] === 'string' &&
        typeof template['description'] === 'string' &&
        typeof template['componentName'] === 'string' &&
        typeof template['previewImageUrl'] === 'string' &&
        typeof template['isActive'] === 'boolean' &&
        template['tvRequirements'] !== undefined &&
        template['supportedProperties'] !== undefined &&
        template['defaultConfig'] !== undefined &&
        template['metadata'] !== undefined;
}

export function isTemplateConfig(obj: unknown): obj is TemplateConfig {
    if (!obj || typeof obj !== 'object') return false;

    const config = obj as Record<string, unknown>;

    return config['colors'] !== undefined &&
        config['typography'] !== undefined &&
        config['animations'] !== undefined &&
        config['layout'] !== undefined;
}

/**
 * Configuration type guards
 */
export function isSlideshowConfig(obj: unknown): obj is SlideshowConfig {
    if (!obj || typeof obj !== 'object') return false;

    const config = obj as Record<string, unknown>;

    return typeof config['id'] === 'string' &&
        typeof config['name'] === 'string' &&
        config['general'] !== undefined &&
        config['products'] !== undefined &&
        config['templates'] !== undefined &&
        config['timing'] !== undefined &&
        config['tvOptimizations'] !== undefined &&
        config['autoUpdate'] !== undefined &&
        config['metadata'] !== undefined;
}

export function isSlideshowGeneralSettings(obj: unknown): obj is SlideshowGeneralSettings {
    if (!obj || typeof obj !== 'object') return false;

    const settings = obj as Record<string, unknown>;

    return typeof settings['title'] === 'string' &&
        typeof settings['enabled'] === 'boolean' &&
        ['infinite', 'once', 'count'].includes(settings['loopMode'] as string) &&
        typeof settings['autoStart'] === 'boolean';
}

/**
 * API response type guards
 */
export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
    if (!obj || typeof obj !== 'object') return false;

    const response = obj as Record<string, unknown>;

    return typeof response['success'] === 'boolean' &&
        response['data'] !== undefined &&
        typeof response['message'] === 'string' &&
        typeof response['statusCode'] === 'number' &&
        (response['timestamp'] instanceof Date || typeof response['timestamp'] === 'string');
}

export function isSystemHealth(obj: unknown): obj is SystemHealth {
    if (!obj || typeof obj !== 'object') return false;

    const health = obj as Record<string, unknown>;

    return ['healthy', 'degraded', 'unhealthy'].includes(health['status'] as string) &&
        health['services'] !== undefined &&
        health['metrics'] !== undefined &&
        health['version'] !== undefined;
}

/**
 * Validation utility functions
 */
export class ValidationUtils {

    /**
     * Validates product data with detailed error reporting
     */
    static validateProduct(product: unknown): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!product || typeof product !== 'object') {
            return { isValid: false, errors: ['Product must be a valid object'] };
        }

        const prod = product as Record<string, unknown>;

        // Required fields validation
        if (!prod['id'] || typeof prod['id'] !== 'string') {
            errors.push('Product ID is required and must be a string');
        }

        if (!prod['name'] || typeof prod['name'] !== 'string') {
            errors.push('Product name is required and must be a string');
        } else if ((prod['name'] as string).length > 50) {
            errors.push('Product name must be 50 characters or less for TV display');
        }

        if (typeof prod['price'] !== 'number' || (prod['price'] as number) < 0) {
            errors.push('Product price must be a non-negative number');
        }

        if (!prod['imageUrl'] || typeof prod['imageUrl'] !== 'string') {
            errors.push('Product image URL is required');
        } else if (!this.isValidUrl(prod['imageUrl'] as string)) {
            errors.push('Product image URL must be a valid URL');
        }

        if (!prod['shortDescription'] || typeof prod['shortDescription'] !== 'string') {
            errors.push('Product short description is required');
        } else if ((prod['shortDescription'] as string).length > 120) {
            errors.push('Product short description must be 120 characters or less for TV display');
        }

        if (!prod['category'] || typeof prod['category'] !== 'string') {
            errors.push('Product category is required');
        }

        if (typeof prod['inStock'] !== 'boolean') {
            errors.push('Product inStock status must be a boolean');
        }

        // Optional fields validation
        if (prod['longDescription'] && typeof prod['longDescription'] !== 'string') {
            errors.push('Product long description must be a string if provided');
        }

        if (prod['secondaryImageUrl'] && !this.isValidUrl(prod['secondaryImageUrl'] as string)) {
            errors.push('Product secondary image URL must be a valid URL if provided');
        }

        if (prod['badge'] && !isProductBadge(prod['badge'])) {
            errors.push('Product badge must be a valid ProductBadge object if provided');
        }

        if (prod['discount'] && !isProductDiscount(prod['discount'])) {
            errors.push('Product discount must be a valid ProductDiscount object if provided');
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Validates slideshow configuration
     */
    static validateSlideshowConfig(config: unknown): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!config || typeof config !== 'object') {
            return { isValid: false, errors: ['Configuration must be a valid object'] };
        }

        const conf = config as Record<string, unknown>;

        // General settings validation
        if (!conf['general'] || !isSlideshowGeneralSettings(conf['general'])) {
            errors.push('Invalid general settings configuration');
        }

        // Timing validation
        if (conf['timing'] && typeof conf['timing'] === 'object') {
            const timing = conf['timing'] as Record<string, unknown>;

            if (typeof timing['baseSlideDuration'] !== 'number' ||
                (timing['baseSlideDuration'] as number) < 1000 ||
                (timing['baseSlideDuration'] as number) > 60000) {
                errors.push('Base slide duration must be between 1 and 60 seconds');
            }

            if (typeof timing['transitionDuration'] !== 'number' ||
                (timing['transitionDuration'] as number) < 100 ||
                (timing['transitionDuration'] as number) > 5000) {
                errors.push('Transition duration must be between 100ms and 5 seconds');
            }
        }

        // Products validation
        if (conf['products'] && typeof conf['products'] === 'object') {
            const products = conf['products'] as Record<string, unknown>;

            if (!Array.isArray(products['selectedProductIds'])) {
                errors.push('Selected product IDs must be an array');
            }

            if (typeof products['minProducts'] !== 'number' || (products['minProducts'] as number) < 1) {
                errors.push('Minimum products must be at least 1');
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * Validates template configuration
     */
    static validateTemplateConfig(config: unknown): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!isTemplateConfig(config)) {
            errors.push('Invalid template configuration structure');
            return { isValid: false, errors };
        }

        // Color validation
        const colorProps = ['primary', 'secondary', 'accent', 'background', 'text'];
        const colors = (config.colors as Record<string, unknown>);

        for (const colorProp of colorProps) {
            const colorValue = colors[colorProp];
            if (!this.isValidColor(colorValue as string)) {
                errors.push(`Invalid color value for ${colorProp}`);
            }
        }

        // Animation validation
        const animations = (config.animations as Record<string, unknown>);
        const animationMultiplier = animations['durationMultiplier'] as number;

        if (animationMultiplier < 0.1 || animationMultiplier > 5) {
            errors.push('Animation duration multiplier must be between 0.1x and 5x');
        }

        return { isValid: errors.length === 0, errors };
    }

    /**
     * URL validation utility
     */
    static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Color validation utility (hex, rgb, rgba, named colors)
     */
    static isValidColor(color: string): boolean {
        if (!color || typeof color !== 'string') return false;

        // Hex colors
        if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return true;

        // RGB/RGBA colors
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/i.test(color)) return true;

        // HSL/HSLA colors
        if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/i.test(color)) return true;

        // CSS named colors (basic check)
        const namedColors = [
            'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow',
            'cyan', 'magenta', 'gray', 'grey', 'orange', 'purple', 'pink'
        ];

        return namedColors.includes(color.toLowerCase());
    }

    /**
     * Deep validation for nested objects
     */
    static deepValidate(obj: unknown, schema: unknown): { isValid: boolean; errors: string[] } {
        // This would be implemented with a more sophisticated validation library
        // like Joi or Yup in a real application
        return { isValid: true, errors: [] };
    }
}