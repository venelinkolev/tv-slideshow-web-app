import { ProductBadge, ProductDiscount } from './product.interface';

/**
 * Main slideshow configuration interface
 * Controls all aspects of TV slideshow behavior and appearance
 */
export interface SlideshowConfig {
    /** Unique configuration ID */
    id: string;

    /** Configuration name for admin panel */
    name: string;

    /** General slideshow settings */
    general: SlideshowGeneralSettings;

    /** Product selection and filtering */
    products: SlideshowProductSettings;

    /** Template configuration */
    templates: SlideshowTemplateSettings;

    /** Timing and transitions */
    timing: SlideshowTimingSettings;

    /** TV-specific optimizations */
    tvOptimizations: SlideshowTvSettings;

    /** Auto-refresh and update settings */
    autoUpdate: SlideshowAutoUpdateSettings;

    /** Configuration metadata */
    metadata: SlideshowConfigMetadata;
}

/**
 * General slideshow settings
 */
export interface SlideshowGeneralSettings {
    /** Slideshow title for admin identification */
    title: string;

    /** Enable/disable entire slideshow */
    enabled: boolean;

    /** Slideshow loop behavior */
    loopMode: 'infinite' | 'once' | 'count';

    /** Loop count if loopMode is 'count' */
    loopCount?: number;

    /** Auto-start slideshow on page load */
    autoStart: boolean;

    /** Show loading indicators */
    showLoadingIndicators: boolean;

    /** Show slide progress indicators */
    showProgressIndicators: boolean;

    /** Emergency stop hotkey (for TV remote) */
    emergencyStopKey?: string;
}

/**
 * Product selection and management
 */
export interface SlideshowProductSettings {
    /** Selected product IDs to display */
    selectedProductIds: string[];

    /** Product filters for auto-selection */
    filters: {
        categories: string[];
        inStockOnly: boolean;
        minPrice?: number;
        maxPrice?: number;
        hasDiscount?: boolean;
        excludeIds?: string[];
    };

    /** Product ordering */
    ordering: {
        /** Sort field */
        sortBy: 'name' | 'price' | 'category' | 'priority' | 'random';

        /** Sort direction */
        sortDirection: 'asc' | 'desc';

        /** Randomize order on each loop */
        randomizeOnLoop: boolean;
    };

    /** Maximum number of products to display */
    maxProducts?: number;

    /** Minimum products required to start slideshow */
    minProducts: number;
}

/**
 * Template selection and rotation
 */
export interface SlideshowTemplateSettings {
    /** Template selection mode */
    mode: 'single' | 'rotation' | 'random' | 'product-based';

    /** Selected template ID (for single mode) */
    selectedTemplateId?: string;

    /** Template rotation order (for rotation mode) */
    rotationOrder?: string[];

    /** Template weights for random selection */
    randomWeights?: Record<string, number>;

    /** Product-to-template mapping rules */
    productTemplateRules?: ProductTemplateRule[];

    /** Allow template fallback on errors */
    allowFallback: boolean;

    /** Fallback template ID */
    fallbackTemplateId: string;
}

/**
 * Product to template mapping rule
 */
export interface ProductTemplateRule {
    /** Rule name for admin identification */
    name: string;

    /** Rule conditions */
    conditions: {
        categories?: string[];
        priceRange?: { min?: number; max?: number };
        hasDiscount?: boolean;
        inStock?: boolean;
        tags?: string[];
    };

    /** Template ID to use when conditions match */
    templateId: string;

    /** Rule priority (higher = checked first) */
    priority: number;
}

/**
 * Timing and transition configuration
 */
export interface SlideshowTimingSettings {
    /** Base slide duration in milliseconds */
    baseSlideDuration: number;

    /** Transition duration between slides (ms) */
    transitionDuration: number;

    /** Transition type */
    transitionType: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';

    /** Pause slideshow on manual interaction */
    pauseOnInteraction: boolean;

    /** Resume delay after interaction (ms) */
    resumeDelay: number;

    /** Different durations for different content types */
    durationOverrides: {
        hasLongDescription?: number;
        hasDiscount?: number;
        isNewProduct?: number;
        isPremiumCategory?: number;
    };

    /** Timing validation */
    validation: {
        minSlideDuration: number;
        maxSlideDuration: number;
        minTransitionDuration: number;
        maxTransitionDuration: number;
    };
}

/**
 * TV-specific optimization settings
 */
export interface SlideshowTvSettings {
    /** TV safe area enforcement */
    safeArea: {
        enabled: boolean;
        marginPercentage: number;
        customMargins?: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };

    /** Performance optimizations */
    performance: {
        /** Enable hardware acceleration */
        hardwareAcceleration: boolean;

        /** Image preloading strategy */
        imagePreloading: 'all' | 'next' | 'none';

        /** Number of slides to preload */
        preloadCount: number;

        /** Enable memory cleanup */
        memoryCleanup: boolean;

        /** Cleanup interval (ms) */
        cleanupInterval: number;
    };

    /** Remote control handling */
    remoteControl: {
        /** Enable remote control navigation */
        enabled: boolean;

        /** Key mappings */
        keyMappings: {
            nextSlide: string[];
            previousSlide: string[];
            pauseResume: string[];
            restart: string[];
        };
    };

    /** Screen saver prevention */
    screenSaver: {
        /** Prevent screen saver activation */
        preventActivation: boolean;

        /** Method to prevent sleep */
        preventionMethod: 'wakeLock' | 'videoLoop' | 'mouseMoveSimulation';
    };
}

/**
 * Auto-update and refresh settings
 */
export interface SlideshowAutoUpdateSettings {
    /** Enable automatic content refresh */
    enabled: boolean;

    /** Check for updates interval (ms) */
    checkInterval: number;

    /** Update sources */
    sources: {
        /** Check for product updates */
        products: boolean;

        /** Check for template updates */
        templates: boolean;

        /** Check for configuration updates */
        configuration: boolean;
    };

    /** Update behavior */
    behavior: {
        /** Seamless updates without interruption */
        seamlessUpdate: boolean;

        /** Restart slideshow after major updates */
        restartOnMajorUpdate: boolean;

        /** Show update notifications */
        showUpdateNotifications: boolean;
    };

    /** Offline behavior */
    offline: {
        /** Cache duration for offline mode (ms) */
        cacheDuration: number;

        /** Continue with cached content when offline */
        continueOffline: boolean;

        /** Show offline indicator */
        showOfflineIndicator: boolean;
    };
}

/**
 * Configuration metadata and tracking
 */
export interface SlideshowConfigMetadata {
    /** Configuration creator */
    createdBy: string;

    /** Creation timestamp */
    createdAt: Date;

    /** Last modification info */
    lastModified: {
        by: string;
        at: Date;
        changes: string[];
    };

    /** Configuration version for change tracking */
    version: string;

    /** Usage statistics */
    usage: {
        /** Times this config was activated */
        activationCount: number;

        /** Total runtime with this config */
        totalRuntime: number;

        /** Last activation timestamp */
        lastActivated?: Date;

        /** Performance metrics */
        performanceMetrics?: {
            averageLoadTime: number;
            averageTransitionTime: number;
            errorCount: number;
        };
    };

    /** Configuration tags for organization */
    tags: string[];

    /** Notes and comments */
    notes?: string;
}