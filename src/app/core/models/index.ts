// src/app/core/models/index.ts
// Barrel exports for clean imports throughout the application

// Product-related exports
export * from './product.interface';

// Template-related exports  
export * from './template.interface';

// Configuration exports
export * from './slideshow-config.interface';

// API response exports
export * from './api-response.interface';

// Enumerations
export * from './enums';

// Type guards (avoiding circular dependencies)
export * from './type-guards';

// Re-export commonly used types for convenience
export type {
    // Core entities
    Product,
    ProductBadge,
    ProductDiscount,
    ProductTemplate,
    TemplateConfig,
    SlideshowConfig,

    // API responses  
    ApiResponse,
    ApiPagination,
    ProductsApiResponse,
    TemplatesApiResponse,
    ConfigApiResponse,
    SystemHealth,
    ServiceStatusInterface,

    // Configuration components
    SlideshowGeneralSettings,
    SlideshowProductSettings,
    SlideshowTemplateSettings,
    SlideshowTimingSettings,
    SlideshowTvSettings,
    SlideshowAutoUpdateSettings,

    // Template components
    TemplateRequirements,
    TemplateSupportedProperties,
    TemplateMetadata,
    TemplateRenderContext,

    // Real-time updates
    RealtimeMessage,
    ProductUpdateMessage,
    ConfigUpdateMessage
} from './api-response.interface';

// Utility types for development
export type EntityId = string;
export type Timestamp = Date;
export type Url = string;
export type ColorCode = string;
export type PercentageValue = number; // 0-100
export type MillisecondsValue = number;

// Common generic types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// API related utility types  
export type ApiEntityResponse<T> = ApiResponse<T>;
export type ApiListResponse<T> = ApiResponse<T[]> & { pagination?: ApiPagination };

// Template factory types
export type TemplateComponentType = any;
export type TemplateFactory = Map<string, TemplateComponentType>;

// Configuration validation types
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}