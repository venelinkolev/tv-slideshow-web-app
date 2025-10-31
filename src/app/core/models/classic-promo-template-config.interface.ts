// src/app/core/models/classic-promo-template-config.interface.ts

/**
 * Classic Promo Template Configuration
 * Controls all aspects of the Classic Promo Template behavior and appearance
 * 
 * Features:
 * - Multi-slide support with 2-4 products per slide
 * - Individual promo price per slide
 * - Dynamic grid layout (2/3/4 columns)
 * - TV-optimized color scheme
 */
export interface ClassicPromoTemplateConfig {
    /** Array of promotional slides */
    slides: ClassicPromoSlide[];

    /** Layout and color scheme configuration */
    layout: ClassicPromoLayoutConfig;
}

/**
 * Classic Promo Slide Configuration
 * Represents a single promotional slide with selected products and price
 */
export interface ClassicPromoSlide {
    /** Unique slide identifier (UUID v4 format) */
    slideId: string;

    /** Human-readable slide name for admin panel (e.g., "Слайд 1") */
    name: string;

    /** Array of selected product IDs (min: 2, max: 4) */
    productIds: string[];

    /** Promotional price for this slide in BGN */
    promoPrice: number;

    /** Optional: Slide-specific background color override */
    backgroundColor?: string;
}

/**
 * Layout and Color Scheme Configuration
 * Controls visual appearance of the template
 */
export interface ClassicPromoLayoutConfig {
    /** Main background color (default: #000000) */
    backgroundColor: string;

    /** Accent color for product names and footer (default: #FFA500) */
    accentColor: string;

    /** Primary text color (default: #FFFFFF) */
    textColor: string;

    /** Secondary text color for descriptions (default: #CCCCCC) */
    secondaryTextColor: string;

    /** Footer gradient colors */
    footerGradient: {
        start: string;  // default: #FF9800
        end: string;    // default: #FFA500
    };
}

/**
 * Default Classic Promo Template Configuration
 * Used when no custom configuration is provided
 */
export const DEFAULT_CLASSIC_PROMO_CONFIG: ClassicPromoTemplateConfig = {
    slides: [
        {
            slideId: 'default-slide-1',
            name: 'Слайд 1',
            productIds: [],
            promoPrice: 0
        }
    ],
    layout: {
        backgroundColor: '#000000',
        accentColor: '#FFA500',
        textColor: '#FFFFFF',
        secondaryTextColor: '#CCCCCC',
        footerGradient: {
            start: '#FF9800',
            end: '#FFA500'
        }
    }
};

/**
 * Validation constraints for Classic Promo Template
 */
export const CLASSIC_PROMO_VALIDATION = {
    /** Minimum products per slide */
    MIN_PRODUCTS: 2,

    /** Maximum products per slide */
    MAX_PRODUCTS: 4,

    /** Minimum promo price */
    MIN_PRICE: 0.01,

    /** Maximum promo price */
    MAX_PRICE: 999999.99,

    /** Maximum slide name length */
    MAX_SLIDE_NAME_LENGTH: 50
} as const;

/**
 * Helper function to validate a Classic Promo Slide
 * 
 * @param slide - The slide to validate
 * @returns Validation result with errors
 */
export function validateClassicPromoSlide(slide: ClassicPromoSlide): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Validate product count
    if (slide.productIds.length < CLASSIC_PROMO_VALIDATION.MIN_PRODUCTS) {
        errors.push(`Минимум ${CLASSIC_PROMO_VALIDATION.MIN_PRODUCTS} продукта са необходими`);
    }

    if (slide.productIds.length > CLASSIC_PROMO_VALIDATION.MAX_PRODUCTS) {
        errors.push(`Максимум ${CLASSIC_PROMO_VALIDATION.MAX_PRODUCTS} продукта са позволени`);
    }

    // Validate promo price
    if (slide.promoPrice < CLASSIC_PROMO_VALIDATION.MIN_PRICE) {
        errors.push(`Промо цената трябва да е поне ${CLASSIC_PROMO_VALIDATION.MIN_PRICE} лв.`);
    }

    if (slide.promoPrice > CLASSIC_PROMO_VALIDATION.MAX_PRICE) {
        errors.push(`Промо цената не може да надвишава ${CLASSIC_PROMO_VALIDATION.MAX_PRICE} лв.`);
    }

    // Validate slide name
    if (!slide.name || slide.name.trim().length === 0) {
        errors.push('Името на слайда е задължително');
    }

    if (slide.name.length > CLASSIC_PROMO_VALIDATION.MAX_SLIDE_NAME_LENGTH) {
        errors.push(`Името на слайда не може да надвишава ${CLASSIC_PROMO_VALIDATION.MAX_SLIDE_NAME_LENGTH} символа`);
    }

    // Validate unique product IDs
    const uniqueProductIds = new Set(slide.productIds);
    if (uniqueProductIds.size !== slide.productIds.length) {
        errors.push('Продуктите в слайда трябва да са уникални');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Helper function to validate entire Classic Promo Configuration
 * 
 * @param config - The configuration to validate
 * @returns Validation result with errors
 */
export function validateClassicPromoConfig(config: ClassicPromoTemplateConfig): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Validate slides exist
    if (!config.slides || config.slides.length === 0) {
        errors.push('Поне един слайд е необходим');
        return { isValid: false, errors };
    }

    // Validate each slide
    config.slides.forEach((slide, index) => {
        const slideValidation = validateClassicPromoSlide(slide);
        if (!slideValidation.isValid) {
            errors.push(`Слайд ${index + 1}: ${slideValidation.errors.join(', ')}`);
        }
    });

    // Validate unique slide IDs
    const slideIds = config.slides.map(s => s.slideId);
    const uniqueSlideIds = new Set(slideIds);
    if (uniqueSlideIds.size !== slideIds.length) {
        errors.push('Всички слайдове трябва да имат уникални ID-та');
    }

    // Validate layout colors (basic hex color format)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (!hexColorRegex.test(config.layout.backgroundColor)) {
        errors.push('Невалиден формат за фонов цвят (използвайте hex формат, напр. #000000)');
    }

    if (!hexColorRegex.test(config.layout.accentColor)) {
        errors.push('Невалиден формат за акцентен цвят (използвайте hex формат, напр. #FFA500)');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Helper function to generate a new slide with default values
 * 
 * @param slideNumber - The slide number for naming
 * @returns New slide configuration
 */
export function createDefaultSlide(slideNumber: number): ClassicPromoSlide {
    return {
        slideId: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Слайд ${slideNumber}`,
        productIds: [],
        promoPrice: 0
    };
}