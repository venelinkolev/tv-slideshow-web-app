import { Injectable, inject, signal, computed, DOCUMENT } from '@angular/core';

import { Observable, BehaviorSubject, throwError, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import {
    SlideshowConfig,
    SlideshowGeneralSettings,
    SlideshowProductSettings,
    SlideshowTemplateSettings,
    SlideshowTimingSettings,
    SlideshowTvSettings,
    SlideshowAutoUpdateSettings,
    SlideshowConfigMetadata,
    ValidationResult,
    ValidationError,
    ValidationWarning
} from '@core/models';

/**
 * Configuration Service for TV Slideshow Application
 * Manages slideshow configuration with Angular 18 Signals
 * Features:
 * - Reactive state management with Signals
 * - localStorage persistence for TV reboot resilience
 * - Comprehensive validation for TV-safe settings  
 * - Default configuration fallbacks
 * - Real-time configuration updates
 */
@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private readonly document = inject(DOCUMENT);

    // Storage keys
    private readonly STORAGE_KEY = 'tv-slideshow-config';
    private readonly BACKUP_STORAGE_KEY = 'tv-slideshow-config-backup';

    // Default configuration for TV slideshow
    private readonly defaultConfig: SlideshowConfig = {
        id: 'default-config',
        name: 'Default TV Slideshow Configuration',

        general: {
            title: 'TV Product Slideshow',
            enabled: true,
            loopMode: 'infinite',
            autoStart: true,
            showLoadingIndicators: true,
            showProgressIndicators: false,
            emergencyStopKey: 'Escape'
        },

        products: {
            selectedProductIds: [],
            filters: {
                categories: [],
                inStockOnly: true,
                minPrice: undefined,
                maxPrice: undefined,
                hasDiscount: undefined,
                excludeIds: []
            },
            ordering: {
                sortBy: 'priority',
                sortDirection: 'desc',
                randomizeOnLoop: false
            },
            maxProducts: 10,
            minProducts: 1
        },

        templates: {
            mode: 'single',
            selectedTemplateId: 'classic',
            rotationOrder: [],
            randomWeights: {},
            productTemplateRules: [],
            allowFallback: true,
            fallbackTemplateId: 'classic'
        },

        timing: {
            baseSlideDuration: 20000, // 20 seconds
            transitionDuration: 1000, // 1 second
            transitionType: 'fade',
            pauseOnInteraction: true,
            resumeDelay: 1000,
            durationOverrides: {
                hasLongDescription: 25000,
                hasDiscount: 22000,
                isNewProduct: 25000,
                isPremiumCategory: 30000
            },
            validation: {
                minSlideDuration: 10000,
                maxSlideDuration: 60000,
                minTransitionDuration: 500,
                maxTransitionDuration: 3000
            }
        },

        tvOptimizations: {
            safeArea: {
                enabled: true,
                marginPercentage: 5,
                customMargins: {
                    top: 50,
                    right: 50,
                    bottom: 80,
                    left: 50
                }
            },
            performance: {
                hardwareAcceleration: true,
                imagePreloading: 'next',
                preloadCount: 3,
                memoryCleanup: true,
                cleanupInterval: 300000 // 5 minutes
            },
            remoteControl: {
                enabled: true,
                keyMappings: {
                    nextSlide: ['ArrowRight', 'PageDown'],
                    previousSlide: ['ArrowLeft', 'PageUp'],
                    pauseResume: ['Space', 'Pause'],
                    restart: ['Home', 'R']
                }
            },
            screenSaver: {
                preventActivation: true,
                preventionMethod: 'wakeLock'
            }
        },

        autoUpdate: {
            enabled: true,
            checkInterval: 600000, // 10 minutes
            sources: {
                products: true,
                templates: false,
                configuration: false
            },
            behavior: {
                seamlessUpdate: true,
                restartOnMajorUpdate: false,
                showUpdateNotifications: false
            },
            offline: {
                cacheDuration: 86400000, // 24 hours
                continueOffline: true,
                showOfflineIndicator: true
            }
        },

        metadata: {
            createdBy: 'system',
            createdAt: new Date(),
            lastModified: {
                by: 'system',
                at: new Date(),
                changes: ['initial_creation']
            },
            version: '1.0.0',
            usage: {
                activationCount: 0,
                totalRuntime: 0,
                lastActivated: undefined,
                performanceMetrics: {
                    averageLoadTime: 0,
                    averageTransitionTime: 0,
                    errorCount: 0
                }
            },
            tags: ['default', 'tv-optimized'],
            notes: 'Default configuration optimized for TV display'
        }
    };

    // Reactive state with Angular 18 Signals
    private readonly configSignal = signal<SlideshowConfig>(this.defaultConfig);
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly validationSignal = signal<ValidationResult>({
        isValid: true,
        errors: [],
        warnings: []
    });

    // Public readonly signals for components
    readonly config = this.configSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly validation = this.validationSignal.asReadonly();

    // Computed values for common use cases
    readonly isConfigValid = computed(() => this.validation().isValid);
    readonly hasValidationErrors = computed(() => this.validation().errors.length > 0);
    readonly hasValidationWarnings = computed(() => this.validation().warnings.length > 0);
    readonly currentTemplate = computed(() => this.config().templates.selectedTemplateId);
    readonly slideDuration = computed(() => this.config().timing.baseSlideDuration);
    readonly isEnabled = computed(() => this.config().general.enabled);

    // Observable for backward compatibility and external integrations
    private readonly configSubject = new BehaviorSubject<SlideshowConfig>(this.defaultConfig);
    readonly config$ = this.configSubject.asObservable();

    // ✅ NEW: Subject за cross-tab communication
    private readonly configChangedFromStorage$ = new Subject<void>();

    constructor() {
        console.log('🔧 ConfigService initializing...');

        // ⚡ PATCH: INSTANT config$ availability - emit defaultConfig immediately
        console.log('🚀 PATCH: Emitting default config immediately to unblock loadProducts()');
        this.configSubject.next(this.defaultConfig);

        // ✅ Original async initialization continues unchanged
        this.initializeConfig();

        // ✅ NEW: Listen for storage changes from other tabs
        this.setupStorageListener();
    }

    /**
 * Setup listener for localStorage changes from other tabs/windows
 * Automatically reloads config when admin panel saves changes
 */
    private setupStorageListener(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('storage', (event: StorageEvent) => {
            // Check if it's our config key that changed
            if (event.key === this.STORAGE_KEY && event.newValue !== event.oldValue) {
                console.log('🔔 ConfigService: Storage change detected from another tab');
                console.log('   Old value:', event.oldValue ? 'exists' : 'null');
                console.log('   New value:', event.newValue ? 'exists' : 'null');

                // Reload config from storage
                this.loadConfig().subscribe({
                    next: (config) => {
                        console.log('✅ Config reloaded from storage:', config.name);
                        // Emit notification
                        this.configChangedFromStorage$.next();
                    },
                    error: (err) => {
                        console.error('❌ Failed to reload config:', err);
                    }
                });
            }
        });

        console.log('👂 ConfigService: Storage listener registered');
    }

    /**
     * Observable for external components to react to config changes
     * Useful for slideshow to reload when admin changes config
     */
    getConfigChanges$(): Observable<void> {
        return this.configChangedFromStorage$.asObservable();
    }

    /**
     * Load configuration from localStorage with fallback to defaults
     */
    loadConfig(): Observable<SlideshowConfig> {
        console.log('📂 ConfigService.loadConfig()');
        this.isLoadingSignal.set(true);

        try {
            const stored = this.document.defaultView?.localStorage?.getItem(this.STORAGE_KEY);

            if (stored) {
                const parsedConfig = JSON.parse(stored) as SlideshowConfig;
                console.log('✅ Loaded config from localStorage');

                // Validate loaded configuration
                const validationResult = this.validateConfiguration(parsedConfig);
                this.validationSignal.set(validationResult);

                if (validationResult.isValid) {
                    // Update signals
                    this.configSignal.set(parsedConfig);
                    this.configSubject.next(parsedConfig);

                    // Update usage statistics
                    this.updateUsageStats(parsedConfig);

                    this.isLoadingSignal.set(false);
                    return of(parsedConfig);
                } else {
                    console.warn('⚠️ Loaded config failed validation, using defaults');
                    return this.useDefaultConfig();
                }
            } else {
                console.log('📝 No stored config found, using defaults');
                return this.useDefaultConfig();
            }
        } catch (error) {
            console.error('❌ Error loading config from localStorage:', error);
            return this.handleConfigError(error);
        }
    }

    /**
     * Save configuration to localStorage with backup
     */
    saveConfig(config: SlideshowConfig): Observable<SlideshowConfig> {
        console.log('💾 ConfigService.saveConfig()', config.name);
        this.isLoadingSignal.set(true);

        try {
            // Validate before saving
            const validationResult = this.validateConfiguration(config);
            this.validationSignal.set(validationResult);

            if (!validationResult.isValid) {
                console.error('❌ Cannot save invalid configuration');
                this.isLoadingSignal.set(false);
                return throwError(() => new Error(`Invalid configuration: ${validationResult.errors.map(e => e.message).join(', ')}`));
            }

            // Create backup of current config
            const currentConfig = this.configSignal();
            this.document.defaultView?.localStorage?.setItem(
                this.BACKUP_STORAGE_KEY,
                JSON.stringify(currentConfig)
            );

            // Update metadata
            const configToSave: SlideshowConfig = {
                ...config,
                metadata: {
                    ...config.metadata,
                    lastModified: {
                        by: 'user',
                        at: new Date(),
                        changes: this.detectChanges(currentConfig, config)
                    },
                    version: this.incrementVersion(config.metadata.version)
                }
            };

            // Save to localStorage
            this.document.defaultView?.localStorage?.setItem(
                this.STORAGE_KEY,
                JSON.stringify(configToSave)
            );

            // Update signals
            this.configSignal.set(configToSave);
            this.configSubject.next(configToSave);

            console.log('✅ Configuration saved successfully');
            this.isLoadingSignal.set(false);

            return of(configToSave);

        } catch (error) {
            console.error('❌ Error saving configuration:', error);
            this.isLoadingSignal.set(false);
            return throwError(() => error);
        }
    }

    /**
     * Update specific configuration section
     */
    updateGeneralSettings(settings: Partial<SlideshowGeneralSettings>): Observable<SlideshowConfig> {
        console.log('⚙️ ConfigService.updateGeneralSettings()');
        const currentConfig = this.configSignal();
        const updatedConfig: SlideshowConfig = {
            ...currentConfig,
            general: { ...currentConfig.general, ...settings }
        };
        return this.saveConfig(updatedConfig);
    }

    updateProductSettings(settings: Partial<SlideshowProductSettings>): Observable<SlideshowConfig> {
        console.log('🛍️ ConfigService.updateProductSettings()');
        const currentConfig = this.configSignal();
        const updatedConfig: SlideshowConfig = {
            ...currentConfig,
            products: { ...currentConfig.products, ...settings }
        };
        return this.saveConfig(updatedConfig);
    }

    updateTemplateSettings(settings: Partial<SlideshowTemplateSettings>): Observable<SlideshowConfig> {
        console.log('🎨 ConfigService.updateTemplateSettings()');
        const currentConfig = this.configSignal();
        const updatedConfig: SlideshowConfig = {
            ...currentConfig,
            templates: { ...currentConfig.templates, ...settings }
        };
        return this.saveConfig(updatedConfig);
    }

    updateTimingSettings(settings: Partial<SlideshowTimingSettings>): Observable<SlideshowConfig> {
        console.log('⏱️ ConfigService.updateTimingSettings()');
        const currentConfig = this.configSignal();
        const updatedConfig: SlideshowConfig = {
            ...currentConfig,
            timing: { ...currentConfig.timing, ...settings }
        };
        return this.saveConfig(updatedConfig);
    }

    /**
     * Reset configuration to defaults
     */
    resetToDefaults(): Observable<SlideshowConfig> {
        console.log('🔄 ConfigService.resetToDefaults()');
        const resetConfig: SlideshowConfig = {
            ...this.defaultConfig,
            id: `reset-${Date.now()}`,
            metadata: {
                ...this.defaultConfig.metadata,
                createdAt: new Date(),
                lastModified: {
                    by: 'user',
                    at: new Date(),
                    changes: ['reset_to_defaults']
                }
            }
        };
        return this.saveConfig(resetConfig);
    }

    /**
     * Export configuration as JSON
     */
    exportConfig(): string {
        console.log('📤 ConfigService.exportConfig()');
        const config = this.configSignal();
        return JSON.stringify(config, null, 2);
    }

    /**
     * Import configuration from JSON string
     */
    importConfig(configJson: string): Observable<SlideshowConfig> {
        console.log('📥 ConfigService.importConfig()');

        try {
            const importedConfig = JSON.parse(configJson) as SlideshowConfig;

            // Assign new ID to prevent conflicts
            importedConfig.id = `imported-${Date.now()}`;
            importedConfig.metadata.createdAt = new Date();
            importedConfig.metadata.lastModified = {
                by: 'user',
                at: new Date(),
                changes: ['config_imported']
            };

            return this.saveConfig(importedConfig);
        } catch (error) {
            console.error('❌ Error importing configuration:', error);
            return throwError(() => new Error('Invalid configuration JSON'));
        }
    }

    // Private helper methods

    private initializeConfig(): void {
        console.log('🔧 Initializing ConfigService...');
        this.loadConfig().subscribe({
            next: (config) => {
                console.log('✅ ConfigService initialized successfully');
                // ⚡ PATCH: Emit the loaded config (may override default)
                this.configSubject.next(config);
            },
            error: (error) => {
                console.error('❌ ConfigService initialization failed:', error);
                // ⚡ PATCH: Keep using default config on error (already emitted)
                console.log('🔄 PATCH: Continuing with default config due to init error');
            }
        });
    }

    private useDefaultConfig(): Observable<SlideshowConfig> {
        console.log('🏭 Using default configuration');
        this.configSignal.set(this.defaultConfig);
        this.configSubject.next(this.defaultConfig);
        this.validationSignal.set({ isValid: true, errors: [], warnings: [] });
        this.isLoadingSignal.set(false);
        return of(this.defaultConfig);
    }

    private validateConfiguration(config: SlideshowConfig): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Validate timing settings
        if (config.timing.baseSlideDuration < config.timing.validation.minSlideDuration) {
            errors.push({
                field: 'timing.baseSlideDuration',
                message: `Slide duration must be at least ${config.timing.validation.minSlideDuration}ms`,
                code: 'SLIDE_DURATION_TOO_SHORT'
            });
        }

        if (config.timing.baseSlideDuration > config.timing.validation.maxSlideDuration) {
            errors.push({
                field: 'timing.baseSlideDuration',
                message: `Slide duration must not exceed ${config.timing.validation.maxSlideDuration}ms`,
                code: 'SLIDE_DURATION_TOO_LONG'
            });
        }

        // Validate product settings
        if (config.products.minProducts < 1) {
            errors.push({
                field: 'products.minProducts',
                message: 'Minimum products must be at least 1',
                code: 'MIN_PRODUCTS_INVALID'
            });
        }

        if (config.products.maxProducts && config.products.maxProducts > 50) {
            warnings.push({
                field: 'products.maxProducts',
                message: 'Large number of products may impact TV performance',
                suggestion: 'Consider limiting to 20 products or less'
            });
        }

        // Validate TV optimizations
        if (!config.tvOptimizations.safeArea.enabled) {
            warnings.push({
                field: 'tvOptimizations.safeArea.enabled',
                message: 'TV safe area is disabled',
                suggestion: 'Enable safe area for better TV compatibility'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private handleConfigError(error: any): Observable<SlideshowConfig> {
        console.error('🚨 Configuration error, attempting recovery...');

        // Try to load backup configuration
        try {
            const backup = this.document.defaultView?.localStorage?.getItem(this.BACKUP_STORAGE_KEY);
            if (backup) {
                const backupConfig = JSON.parse(backup) as SlideshowConfig;
                console.log('🔄 Recovered from backup configuration');
                this.configSignal.set(backupConfig);
                this.configSubject.next(backupConfig);
                this.isLoadingSignal.set(false);
                return of(backupConfig);
            }
        } catch (backupError) {
            console.error('❌ Backup recovery failed:', backupError);
        }

        // Final fallback to defaults
        return this.useDefaultConfig();
    }

    private updateUsageStats(config: SlideshowConfig): void {
        const updatedConfig: SlideshowConfig = {
            ...config,
            metadata: {
                ...config.metadata,
                usage: {
                    ...config.metadata.usage,
                    activationCount: config.metadata.usage.activationCount + 1,
                    lastActivated: new Date()
                }
            }
        };

        // Save updated stats without triggering full validation
        this.document.defaultView?.localStorage?.setItem(
            this.STORAGE_KEY,
            JSON.stringify(updatedConfig)
        );
    }

    private detectChanges(oldConfig: SlideshowConfig, newConfig: SlideshowConfig): string[] {
        const changes: string[] = [];

        if (oldConfig.general.enabled !== newConfig.general.enabled) {
            changes.push(newConfig.general.enabled ? 'slideshow_enabled' : 'slideshow_disabled');
        }

        if (oldConfig.templates.selectedTemplateId !== newConfig.templates.selectedTemplateId) {
            changes.push(`template_changed_to_${newConfig.templates.selectedTemplateId}`);
        }

        if (oldConfig.timing.baseSlideDuration !== newConfig.timing.baseSlideDuration) {
            changes.push(`slide_duration_changed_to_${newConfig.timing.baseSlideDuration}`);
        }

        return changes.length > 0 ? changes : ['configuration_updated'];
    }

    private incrementVersion(currentVersion: string): string {
        const parts = currentVersion.split('.');
        const patch = parseInt(parts[2] || '0') + 1;
        return `${parts[0]}.${parts[1]}.${patch}`;
    }
}