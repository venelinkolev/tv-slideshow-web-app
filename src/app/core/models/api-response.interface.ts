import {
    Product,
    ProductBadge,
    ProductDiscount
} from './product.interface';
import { ProductTemplate } from './template.interface';
import {
    SlideshowConfig,
    SlideshowGeneralSettings,
    SlideshowProductSettings,
    SlideshowTemplateSettings,
    SlideshowTimingSettings,
    SlideshowTvSettings,
    SlideshowAutoUpdateSettings
} from './slideshow-config.interface';
import { ServiceStatusEnum } from './enums';

/**
 * Generic API response wrapper
 * Standardizes all HTTP responses from the backend
 */
export interface ApiResponse<T = any> {
    /** Response success status */
    success: boolean;

    /** Response data payload */
    data: T;

    /** Human-readable message */
    message: string;

    /** HTTP status code */
    statusCode: number;

    /** Server timestamp */
    timestamp: Date;

    /** Request ID for debugging */
    requestId?: string;

    /** Optional error details */
    error?: ApiError;

    /** Pagination info (if applicable) */
    pagination?: ApiPagination;

    /** API version */
    apiVersion?: string;
}

/**
 * API error details structure
 */
export interface ApiError {
    /** Error code for programmatic handling */
    code: string;

    /** Detailed error message */
    message: string;

    /** Field-specific validation errors */
    fieldErrors?: Record<string, string[]>;

    /** Stack trace (development only) */
    stackTrace?: string;

    /** Additional error context */
    context?: Record<string, any>;

    /** Suggested retry strategy */
    retryStrategy?: {
        /** Can retry this request */
        canRetry: boolean;

        /** Recommended retry delay (ms) */
        retryDelay?: number;

        /** Maximum retry attempts */
        maxRetries?: number;
    };
}

/**
 * Pagination information for list endpoints
 */
export interface ApiPagination {
    /** Current page number (1-based) */
    currentPage: number;

    /** Items per page */
    pageSize: number;

    /** Total number of items */
    totalItems: number;

    /** Total number of pages */
    totalPages: number;

    /** Has previous page */
    hasPrevious: boolean;

    /** Has next page */
    hasNext: boolean;

    /** Links for navigation */
    links?: {
        first?: string;
        previous?: string;
        next?: string;
        last?: string;
    };
}

/**
 * Products API response types
 */
export interface ProductsApiResponse extends ApiResponse<Product[]> {
    data: Product[];
    pagination?: ApiPagination;
}

export interface ProductApiResponse extends ApiResponse<Product> {
    data: Product;
}

export interface ProductCreateRequest {
    name: string;
    price: number;
    imageUrl: string;
    shortDescription: string;
    category: string;
    inStock: boolean;
    longDescription?: string;
    secondaryImageUrl?: string;
    badge?: ProductBadge;
    discount?: ProductDiscount;
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {
    id: string;
}

/**
 * Templates API response types
 */
export interface TemplatesApiResponse extends ApiResponse<ProductTemplate[]> {
    data: ProductTemplate[];
}

export interface TemplateApiResponse extends ApiResponse<ProductTemplate> {
    data: ProductTemplate;
}

/**
 * Configuration API response types
 */
export interface ConfigApiResponse extends ApiResponse<SlideshowConfig> {
    data: SlideshowConfig;
}

export interface ConfigsApiResponse extends ApiResponse<SlideshowConfig[]> {
    data: SlideshowConfig[];
}

export interface ConfigCreateRequest {
    name: string;
    general: SlideshowGeneralSettings;
    products: SlideshowProductSettings;
    templates: SlideshowTemplateSettings;
    timing: SlideshowTimingSettings;
    tvOptimizations: SlideshowTvSettings;
    autoUpdate: SlideshowAutoUpdateSettings;
}

export interface ConfigUpdateRequest extends Partial<ConfigCreateRequest> {
    id: string;
}

/**
 * Health check and system status
 */
export interface HealthCheckResponse extends ApiResponse<SystemHealth> {
    data: SystemHealth;
}

export interface SystemHealth {
    /** Overall system status */
    status: 'healthy' | 'degraded' | 'unhealthy';

    /** Individual service statuses */
    services: {
        database: ServiceStatusInterface;
        cache: ServiceStatusInterface;
        fileStorage: ServiceStatusInterface;
        externalApis?: ServiceStatusInterface;
    };

    /** System metrics */
    metrics: {
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
        responseTime: number;
    };

    /** System version info */
    version: {
        api: string;
        database: string;
        buildDate: Date;
    };
}

export interface ServiceStatusInterface {
    /** Service health status */
    status: ServiceStatusEnum;

    /** Response time in milliseconds */
    responseTime?: number;

    /** Last health check timestamp */
    lastCheck: Date;

    /** Additional service-specific info */
    details?: Record<string, any>;
}

/**
 * Real-time updates via WebSocket/SSE
 */
export interface RealtimeMessage<T = any> {
    /** Message type */
    type: 'product_update' | 'config_update' | 'template_update' | 'system_notification';

    /** Message payload */
    payload: T;

    /** Message timestamp */
    timestamp: Date;

    /** Message ID for deduplication */
    messageId: string;

    /** Priority level */
    priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ProductUpdateMessage {
    action: 'created' | 'updated' | 'deleted';
    product: Product;
    changes?: string[];
}

export interface ConfigUpdateMessage {
    action: 'created' | 'updated' | 'deleted' | 'activated';
    config: SlideshowConfig;
    changes?: string[];
}

export interface SystemNotificationMessage {
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    actions?: NotificationAction[];
}

export interface NotificationAction {
    label: string;
    action: string;
    params?: Record<string, any>;
}

/**
 * File upload responses
 */
export interface FileUploadResponse extends ApiResponse<UploadedFile> {
    data: UploadedFile;
}

export interface UploadedFile {
    /** File ID */
    id: string;

    /** Original filename */
    originalName: string;

    /** Generated filename */
    fileName: string;

    /** File MIME type */
    mimeType: string;

    /** File size in bytes */
    size: number;

    /** Public URL for accessing the file */
    url: string;

    /** Thumbnail URL (for images) */
    thumbnailUrl?: string;

    /** File metadata */
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
    };

    /** Upload timestamp */
    uploadedAt: Date;
}