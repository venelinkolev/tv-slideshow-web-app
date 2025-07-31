/**
 * Core Product interface for TV slideshow display
 * Optimized for smart TV viewing and remote API integration
 */
export interface Product {
    /** Unique product identifier */
    id: string;

    /** Product display name (TV-optimized max 50 chars) */
    name: string;

    /** Product price in BGN */
    price: number;

    /** High-resolution product image URL (min 1920x1080 for TV) */
    imageUrl: string;

    /** Short marketing description (TV-optimized max 120 chars) */
    shortDescription: string;

    /** Product category for filtering and organization */
    category: string;

    /** Current stock availability */
    inStock: boolean;

    /** Optional: Long description for admin panel only */
    longDescription?: string;

    /** Optional: Secondary/hover image for advanced templates */
    secondaryImageUrl?: string;

    /** Optional: Product badge/label (NEW, SALE, TOP, etc.) */
    badge?: ProductBadge;

    /** Optional: Discount information */
    discount?: ProductDiscount;

    /** Optional: TV-specific display override settings */
    displaySettings?: ProductDisplaySettings;

    /** Created/updated timestamps for cache management */
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Product badge configuration for visual highlights
 */
export interface ProductBadge {
    /** Badge text (max 10 chars for TV display) */
    text: string;

    /** Badge color theme */
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';

    /** Badge position on product card */
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Product discount information
 */
export interface ProductDiscount {
    /** Original price before discount */
    originalPrice: number;

    /** Discount percentage (0-100) */
    percentage: number;

    /** Optional: Discount end date for urgency */
    validUntil?: Date;
}

/**
 * TV-specific display settings per product
 */
export interface ProductDisplaySettings {
    /** Custom display duration override (milliseconds) */
    customDuration?: number;

    /** Skip this product on specific template types */
    excludeFromTemplates?: string[];

    /** Priority for product ordering (higher = shown first) */
    priority?: number;

    /** Custom TV-safe area adjustments */
    safeAreaAdjustments?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
}

/**
 * Product API response wrapper
 */
export interface ProductResponse {
    products: Product[];
    total: number;
    page?: number;
    pageSize?: number;
    lastUpdated: Date;
}

/**
 * Product filtering options for admin panel
 */
export interface ProductFilters {
    category?: string;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
    hasDiscount?: boolean;
}