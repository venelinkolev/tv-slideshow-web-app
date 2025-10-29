// src/app/core/models/menu-template-config.interface.ts

/**
 * Menu Template Configuration
 * Controls all aspects of the Menu Template behavior and appearance
 */
export interface MenuTemplateConfig {
    /** Layout mode - single slide or multi-slide */
    layout: 'single-slide' | 'multi-slide';

    /** Product ID whose image will be used as background */
    backgroundProductId: string;

    /** Array of slide configurations */
    slides: MenuSlide[];

    /** Font scaling settings */
    fontScaling: FontScalingConfig;

    /** Column control configuration */
    columnControl?: ColumnControlConfig;
}

/**
 * Menu Slide Configuration
 * Represents a single slide in the menu (for multi-slide mode)
 */
export interface MenuSlide {
    /** Unique slide identifier */
    slideId: string;

    /** Human-readable slide name for admin panel */
    name: string;

    /** Groups and their products for this slide */
    groupSelections: MenuGroupSelection[];

    /** Optional slide-specific background (overrides main background) */
    backgroundProductId?: string;
}

/**
 * Menu Group Selection
 * Defines which products from which group should be displayed
 */
export interface MenuGroupSelection {
    /** Group ID from API (ProductGroup.id) */
    groupId: number;

    /** Selected product IDs from this group */
    productIds: string[];

    /** Display order in menu (left to right) */
    displayOrder: number;
}

/**
 * Font Scaling Configuration
 * Controls how font size adapts to content volume
 */
export interface FontScalingConfig {
    /** Enable automatic font size calculation */
    autoScale: boolean;

    /** Manual font size (used when autoScale is false) */
    manualFontSize?: number;

    /** Minimum font size for readability */
    minFontSize: number;

    /** Maximum font size for aesthetic balance */
    maxFontSize: number;
}

/**
 * Column Control Configuration
 * Controls manual and automatic column adjustments
 */
export interface ColumnControlConfig {
    /** Manual override settings */
    manualOverride: ManualOverrideConfig;

    /** Smart auto-optimization settings */
    autoOptimizations: AutoOptimizationsConfig;
}

/**
 * Manual Override Configuration
 * Direct user control over column count
 */
export interface ManualOverrideConfig {
    /** Whether manual override is enabled */
    enabled: boolean;

    /** Column adjustment (-1, 0, +1) */
    adjustment: -1 | 0 | 1;
}

/**
 * Auto Optimizations Configuration
 * Intelligent automatic column adjustments
 */
export interface AutoOptimizationsConfig {
    /** Automatically remove empty/sparse columns */
    preventEmptyColumns: boolean;

    /** Add column when density is too high */
    preventOverflow: boolean;

    /** Optimize for full horizontal width usage */
    optimizeForFullWidth: boolean;

    /** Density threshold (0.70-0.95) for overflow detection */
    densityThreshold: number;
}

/**
 * Type guard: Check if object is MenuTemplateConfig
 */
export function isMenuTemplateConfig(obj: any): obj is MenuTemplateConfig {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.layout === 'string' &&
        (obj.layout === 'single-slide' || obj.layout === 'multi-slide') &&
        typeof obj.backgroundProductId === 'string' &&
        Array.isArray(obj.slides) &&
        obj.fontScaling &&
        typeof obj.fontScaling === 'object'
    );
}

/**
 * Type guard: Check if object is MenuSlide
 */
export function isMenuSlide(obj: any): obj is MenuSlide {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.slideId === 'string' &&
        typeof obj.name === 'string' &&
        Array.isArray(obj.groupSelections)
    );
}

/**
 * Type guard: Check if object is MenuGroupSelection
 */
export function isMenuGroupSelection(obj: any): obj is MenuGroupSelection {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.groupId === 'number' &&
        Array.isArray(obj.productIds) &&
        typeof obj.displayOrder === 'number'
    );
}

/**
 * Default Menu Template Configuration
 * Used when menu template is first selected
 */
export const DEFAULT_MENU_CONFIG: MenuTemplateConfig = {
    layout: 'single-slide',
    backgroundProductId: '',
    slides: [
        {
            slideId: 'slide-1',
            name: 'Слайд 1',
            groupSelections: []
        }
    ],
    fontScaling: {
        autoScale: true,
        minFontSize: 12,
        maxFontSize: 48
    },
    columnControl: {
        manualOverride: {
            enabled: false,
            adjustment: 0
        },
        autoOptimizations: {
            preventEmptyColumns: true,
            preventOverflow: true,
            optimizeForFullWidth: false,
            densityThreshold: 0.80
        }
    }
};