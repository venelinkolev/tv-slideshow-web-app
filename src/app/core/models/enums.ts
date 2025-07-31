/**
 * Product-related enumerations
 */

/** Product categories for organization and filtering */
export enum ProductCategory {
    SMARTPHONES = 'smartphones',
    LAPTOPS = 'laptops',
    TABLETS = 'tablets',
    TELEVISIONS = 'televisions',
    AUDIO = 'audio',
    HOME_APPLIANCES = 'home_appliances',
    WEARABLES = 'wearables',
    GAMING = 'gaming',
    ACCESSORIES = 'accessories',
    TRANSPORT = 'transport',
    HEALTH_FITNESS = 'health_fitness',
    OTHER = 'other'
}

/** Product badge types for visual highlights */
export enum ProductBadgeType {
    NEW = 'new',
    SALE = 'sale',
    TOP_SELLER = 'top_seller',
    LIMITED = 'limited',
    EXCLUSIVE = 'exclusive',
    RECOMMENDED = 'recommended',
    OUT_OF_STOCK = 'out_of_stock'
}

/** Product sorting options */
export enum ProductSortField {
    NAME = 'name',
    PRICE = 'price',
    CATEGORY = 'category',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    PRIORITY = 'priority',
    RANDOM = 'random'
}

export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc'
}

/**
 * Template-related enumerations
 */

/** Template categories for admin panel organization */
export enum TemplateCategoryEnum {
    CLASSIC = 'classic',
    MODERN = 'modern',
    MINIMAL = 'minimal',
    BOLD = 'bold',
    PREMIUM = 'premium',
    COMPACT = 'compact'
}

/** Template loading strategies */
export enum TemplateLoadingStrategy {
    LAZY = 'lazy',
    EAGER = 'eager',
    PRELOAD = 'preload'
}

/** Animation types for templates */
export enum AnimationType {
    FADE = 'fade',
    SLIDE = 'slide',
    ZOOM = 'zoom',
    FLIP = 'flip',
    NONE = 'none'
}

export enum TextAnimationType {
    TYPEWRITER = 'typewriter',
    FADE = 'fade',
    SLIDE = 'slide',
    NONE = 'none'
}

/**
 * Slideshow configuration enumerations
 */

/** Slideshow loop modes */
export enum SlideshowLoopMode {
    INFINITE = 'infinite',
    ONCE = 'once',
    COUNT = 'count'
}

/** Template selection modes */
export enum TemplateSelectionMode {
    SINGLE = 'single',
    ROTATION = 'rotation',
    RANDOM = 'random',
    PRODUCT_BASED = 'product_based'
}

/** Transition types between slides */
export enum TransitionType {
    FADE = 'fade',
    SLIDE = 'slide',
    ZOOM = 'zoom',
    FLIP = 'flip',
    NONE = 'none'
}

/** Image preloading strategies */
export enum ImagePreloadingStrategy {
    ALL = 'all',
    NEXT = 'next',
    NONE = 'none'
}

/** Screen saver prevention methods */
export enum ScreenSaverPreventionMethod {
    WAKE_LOCK = 'wakeLock',
    VIDEO_LOOP = 'videoLoop',
    MOUSE_MOVE_SIMULATION = 'mouseMoveSimulation'
}

/**
 * TV and hardware-related enumerations
 */

/** TV platforms for compatibility */
export enum TvPlatform {
    ANDROID_TV = 'android_tv',
    SAMSUNG_TIZEN = 'samsung_tizen',
    LG_WEBOS = 'lg_webos',
    ROKU_OS = 'roku_os',
    FIRE_TV = 'fire_tv',
    APPLE_TV = 'apple_tv',
    CHROMECAST = 'chromecast',
    GENERIC_BROWSER = 'generic_browser'
}

/** TV resolution categories */
export enum TvResolution {
    HD = 'hd',          // 1366x768
    FULL_HD = 'full_hd',  // 1920x1080
    UHD_4K = 'uhd_4k',    // 3840x2160
    UHD_8K = 'uhd_8k'     // 7680x4320
}

/** Performance levels for TV optimization */
export enum PerformanceLevel {
    LOW = 1,
    BASIC = 2,
    STANDARD = 3,
    HIGH = 4,
    PREMIUM = 5
}

/**
 * API and communication enumerations
 */

/** HTTP status code categories */
export enum ApiErrorType {
    VALIDATION_ERROR = 'validation_error',
    AUTHENTICATION_ERROR = 'authentication_error',
    AUTHORIZATION_ERROR = 'authorization_error',
    NOT_FOUND_ERROR = 'not_found_error',
    CONFLICT_ERROR = 'conflict_error',
    SERVER_ERROR = 'server_error',
    NETWORK_ERROR = 'network_error',
    TIMEOUT_ERROR = 'timeout_error'
}

/** Real-time message types */
export enum RealtimeMessageType {
    PRODUCT_UPDATE = 'product_update',
    CONFIG_UPDATE = 'config_update',
    TEMPLATE_UPDATE = 'template_update',
    SYSTEM_NOTIFICATION = 'system_notification'
}

/** Real-time message priorities */
export enum MessagePriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/** CRUD operation types */
export enum CrudAction {
    CREATED = 'created',
    UPDATED = 'updated',
    DELETED = 'deleted',
    ACTIVATED = 'activated',
    DEACTIVATED = 'deactivated'
}

/**
 * System and logging enumerations
 */

/** System health statuses */
export enum SystemHealthStatus {
    HEALTHY = 'healthy',
    DEGRADED = 'degraded',
    UNHEALTHY = 'unhealthy'
}

/** Service statuses */
export enum ServiceStatusEnum {
    UP = 'up',
    DOWN = 'down',
    DEGRADED = 'degraded'
}

/** Log levels */
export enum LogLevel {
    TRACE = 'trace',
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    FATAL = 'fatal'
}

/** Notification levels */
export enum NotificationLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'success'
}

/**
 * UI and user experience enumerations
 */

/** Loading states */
export enum LoadingState {
    IDLE = 'idle',
    LOADING = 'loading',
    SUCCESS = 'success',
    ERROR = 'error'
}

/** Content alignment options */
export enum ContentAlignment {
    LEFT = 'left',
    CENTER = 'center',
    RIGHT = 'right',
    JUSTIFY = 'justify'
}

/** Image aspect ratio handling */
export enum ImageAspectRatio {
    PRESERVE = 'preserve',
    COVER = 'cover',
    CONTAIN = 'contain',
    FILL = 'fill'
}

/** Color themes */
export enum ColorTheme {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    INFO = 'info'
}

/** Badge positions */
export enum BadgePosition {
    TOP_LEFT = 'top-left',
    TOP_RIGHT = 'top-right',
    BOTTOM_LEFT = 'bottom-left',
    BOTTOM_RIGHT = 'bottom-right'
}

/**
 * File and media enumerations
 */

/** Supported image formats */
export enum ImageFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp',
    SVG = 'svg',
    GIF = 'gif'
}

/** File upload statuses */
export enum UploadStatus {
    PENDING = 'pending',
    UPLOADING = 'uploading',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}