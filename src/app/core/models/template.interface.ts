import { Product } from './product.interface';
import { TemplateCategoryEnum } from './enums';

/**
 * Core Template interface for dynamic product display templates
 * Supports ngComponentOutlet and template factory pattern
 */
export interface ProductTemplate {
    /** Unique template identifier */
    id: string;

    /** Human-readable template name for admin panel */
    name: string;

    /** Template description for admin selection */
    description: string;

    /** Angular component class name for dynamic loading */
    componentName: string;

    /** Template preview image URL for admin panel */
    previewImageUrl: string;

    /** Template category/style grouping */
    category: TemplateCategoryEnum;

    /** Whether template is active and selectable */
    isActive: boolean;

    /** TV-specific requirements and constraints */
    tvRequirements: TemplateRequirements;

    /** Supported product properties for this template */
    supportedProperties: TemplateSupportedProperties;

    /** Default configuration values */
    defaultConfig: TemplateConfig;

    /** Template metadata for filtering and sorting */
    metadata: TemplateMetadata;
}

/**
 * TV hardware and performance requirements
 */
export interface TemplateRequirements {
    /** Minimum TV resolution support */
    minResolution: {
        width: number;
        height: number;
    };

    /** Performance requirements */
    performance: {
        /** Requires hardware acceleration */
        requiresGPU: boolean;

        /** Maximum memory usage estimate (MB) */
        maxMemoryUsage: number;

        /** Animation complexity level (1-5) */
        animationComplexity: number;
    };

    /** Supported TV brands/platforms */
    supportedPlatforms: string[];

    /** Minimum browser requirements */
    browserRequirements: {
        chrome?: number;
        firefox?: number;
        edge?: number;
        safari?: number;
    };
}

/**
 * Template support for product properties
 */
export interface TemplateSupportedProperties {
    /** Supports product images */
    supportsImages: boolean;

    /** Supports secondary/hover images */
    supportsSecondaryImages: boolean;

    /** Supports product badges */
    supportsBadges: boolean;

    /** Supports discount display */
    supportsDiscounts: boolean;

    /** Supports long descriptions */
    supportsLongDescription: boolean;

    /** Maximum text length limits */
    textLimits: {
        productName: number;
        shortDescription: number;
        longDescription?: number;
    };
}

/**
 * Template configuration options
 */
export interface TemplateConfig {
    /** Color scheme configuration */
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };

    /** Typography settings */
    typography: {
        fontFamily: string;
        baseFontSize: string;
        fontWeights: {
            light: number;
            normal: number;
            bold: number;
        };
    };

    /** Animation settings */
    animations: {
        /** Enable/disable all animations */
        enabled: boolean;

        /** Animation duration multiplier (0.5x to 2x) */
        durationMultiplier: number;

        /** Entrance animation type */
        entranceAnimation: 'fade' | 'slide' | 'zoom' | 'none';

        /** Text reveal animation */
        textAnimation: 'typewriter' | 'fade' | 'slide' | 'none';
    };

    /** Layout configuration */
    layout: {
        /** Safe area padding multiplier */
        safeAreaMultiplier: number;

        /** Content alignment */
        contentAlignment: 'left' | 'center' | 'right';

        /** Image aspect ratio handling */
        imageAspectRatio: 'preserve' | 'cover' | 'contain';
    };
}

/**
 * Template metadata for admin panel
 */
export interface TemplateMetadata {
    /** Template author/creator */
    author: string;

    /** Template version */
    version: string;

    /** Creation date */
    createdAt: Date;

    /** Last update date */
    updatedAt: Date;

    /** Usage statistics */
    usageStats?: {
        timesUsed: number;
        averageRating: number;
        lastUsed?: Date;
    };

    /** Template tags for searching */
    tags: string[];
}

/**
 * Template factory configuration for dynamic loading
 */
export interface TemplateFactoryConfig {
    /** Available templates registry */
    availableTemplates: Map<string, ProductTemplate>;

    /** Default fallback template ID */
    defaultTemplateId: string;

    /** Template loading strategy */
    loadingStrategy: 'lazy' | 'eager' | 'preload';
}

/**
 * Template rendering context passed to components
 */
export interface TemplateRenderContext {
    /** Product data to display */
    product: Product;

    /** Template configuration */
    config: TemplateConfig;

    /** Slideshow timing information */
    timing: {
        /** Current slide duration */
        duration: number;

        /** Slide start time */
        startTime: Date;

        /** Is this slide currently active */
        isActive: boolean;
    };

    /** TV environment information */
    environment: {
        /** Screen resolution */
        resolution: { width: number; height: number };

        /** TV brand/platform if detected */
        platform?: string;

        /** Performance level (1-5) */
        performanceLevel: number;
    };
}