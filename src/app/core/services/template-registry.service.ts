import { Injectable, inject, signal, computed, Type } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import {
    ProductTemplate,
    TemplateConfig,
    TemplateRenderContext,
    TemplateRequirements,
    TemplateSupportedProperties,
    TemplateMetadata,
    TemplateFactoryConfig,
    Product,
    TemplateCategoryEnum,
    ValidationResult,
    ValidationError,
    ValidationWarning
} from '@core/models';

/**
 * Template Registry Service for TV Slideshow Application
 * Manages dynamic template loading, registration, and selection
 * Features:
 * - Dynamic component registration and loading
 * - Template validation for TV compatibility
 * - Performance-based template recommendations
 * - Template metadata and usage tracking
 * - Fallback mechanisms for template failures
 */
@Injectable({
    providedIn: 'root'
})
export class TemplateRegistryService {
    private readonly document = inject(DOCUMENT);

    // Template registry storage
    private readonly templateRegistry = new Map<string, ProductTemplate>();
    private readonly componentRegistry = new Map<string, Type<any>>();
    private readonly activeTemplateUsage = new Map<string, number>();

    // Default template configurations
    private readonly defaultTemplateConfigs = new Map<string, TemplateConfig>();

    // Reactive state with Angular 18 Signals
    private readonly templatesSignal = signal<ProductTemplate[]>([]);
    private readonly activeTemplateSignal = signal<string>('classic');
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly errorSignal = signal<string | null>(null);

    // Public readonly signals for components
    readonly templates = this.templatesSignal.asReadonly();
    readonly activeTemplate = this.activeTemplateSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();

    // Computed values
    readonly availableTemplates = computed(() =>
        this.templates().filter(template => template.isActive)
    );

    readonly templatesByCategory = computed(() => {
        const templates = this.availableTemplates();
        const grouped = new Map<TemplateCategoryEnum, ProductTemplate[]>();

        templates.forEach(template => {
            const existing = grouped.get(template.category) || [];
            grouped.set(template.category, [...existing, template]);
        });

        return grouped;
    });

    readonly currentTemplateInfo = computed(() =>
        this.templates().find(t => t.id === this.activeTemplate())
    );

    readonly hasTemplates = computed(() => this.templates().length > 0);

    // Observable streams for backward compatibility
    private readonly templatesSubject = new BehaviorSubject<ProductTemplate[]>([]);
    readonly templates$ = this.templatesSubject.asObservable();

    constructor() {
        console.log('🎨 TemplateRegistryService initializing...');
        this.initializeDefaultTemplates();
        this.loadTemplatesFromStorage();
    }

    /**
     * Register a new template with component
     * @param template Template configuration
     * @param component Angular component class
     * @returns Observable<boolean>
     */
    registerTemplate(template: ProductTemplate, component: Type<any>): Observable<boolean> {
        console.log(`📝 TemplateRegistryService.registerTemplate(${template.id})`);

        try {
            // Validate template configuration
            const validation = this.validateTemplate(template);
            if (!validation.isValid) {
                const errorMessage = `Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`;
                console.error('❌ Template registration failed:', errorMessage);
                this.errorSignal.set(errorMessage);
                return throwError(() => new Error(errorMessage));
            }

            // Register template and component
            this.templateRegistry.set(template.id, template);
            this.componentRegistry.set(template.id, component);
            this.activeTemplateUsage.set(template.id, 0);

            // Update reactive state
            this.updateTemplatesSignal();
            this.saveTemplatesToStorage();

            console.log(`✅ Template '${template.name}' registered successfully`);
            this.errorSignal.set(null);

            return of(true);

        } catch (error) {
            console.error('❌ Error registering template:', error);
            this.errorSignal.set(`Registration failed: ${error}`);
            return throwError(() => error);
        }
    }

    /**
     * Get template by ID
     * @param templateId Template identifier
     * @returns Observable<ProductTemplate>
     */
    getTemplate(templateId: string): Observable<ProductTemplate> {
        console.log(`🔍 TemplateRegistryService.getTemplate(${templateId})`);

        const template = this.templateRegistry.get(templateId);
        if (template) {
            console.log(`✅ Found template: ${template.name}`);
            return of(template);
        } else {
            console.warn(`⚠️ Template '${templateId}' not found, using fallback`);
            return this.getFallbackTemplate();
        }
    }

    /**
     * Get component class for template
     * @param templateId Template identifier
     * @returns Template component class or null
     */
    getTemplateComponent(templateId: string): Type<any> | null {
        console.log(`🧩 TemplateRegistryService.getTemplateComponent(${templateId})`);

        const component = this.componentRegistry.get(templateId);
        if (component) {
            // Update usage statistics
            const currentUsage = this.activeTemplateUsage.get(templateId) || 0;
            this.activeTemplateUsage.set(templateId, currentUsage + 1);
            console.log(`✅ Component loaded for template '${templateId}' (usage: ${currentUsage + 1})`);
            return component;
        } else {
            console.warn(`⚠️ Component not found for template '${templateId}'`);
            return this.getFallbackComponent();
        }
    }

    /**
     * Get all available templates
     * @returns Observable<ProductTemplate[]>
     */
    getAllTemplates(): Observable<ProductTemplate[]> {
        console.log('📋 TemplateRegistryService.getAllTemplates()');
        return of(Array.from(this.templateRegistry.values()));
    }

    /**
     * Get templates by category
     * @param category Template category
     * @returns Observable<ProductTemplate[]>
     */
    getTemplatesByCategory(category: TemplateCategoryEnum): Observable<ProductTemplate[]> {
        console.log(`📂 TemplateRegistryService.getTemplatesByCategory(${category})`);

        return this.getAllTemplates().pipe(
            map(templates => templates.filter(template =>
                template.category === category && template.isActive
            )),
            tap(filteredTemplates =>
                console.log(`Found ${filteredTemplates.length} templates in category '${category}'`)
            )
        );
    }

    /**
     * Get recommended templates for TV platform
     * @param tvResolution Current TV resolution
     * @param performanceLevel TV performance level (1-5)
     * @returns Observable<ProductTemplate[]>
     */
    getRecommendedTemplates(
        tvResolution: { width: number; height: number },
        performanceLevel: number
    ): Observable<ProductTemplate[]> {
        console.log('🎯 TemplateRegistryService.getRecommendedTemplates()', { tvResolution, performanceLevel });

        return this.getAllTemplates().pipe(
            map(templates => templates.filter(template => {
                // Check resolution compatibility
                const meetsResolution = tvResolution.width >= template.tvRequirements.minResolution.width &&
                    tvResolution.height >= template.tvRequirements.minResolution.height;

                // Check performance requirements
                const meetsPerformance = template.tvRequirements.performance.animationComplexity <= performanceLevel;

                // Check if template is active
                const isActive = template.isActive;

                return meetsResolution && meetsPerformance && isActive;
            })),
            map(compatibleTemplates =>
                // Sort by performance match (lower complexity first for lower performance)
                compatibleTemplates.sort((a, b) => {
                    if (performanceLevel <= 3) {
                        return a.tvRequirements.performance.animationComplexity - b.tvRequirements.performance.animationComplexity;
                    } else {
                        return b.tvRequirements.performance.animationComplexity - a.tvRequirements.performance.animationComplexity;
                    }
                })
            ),
            tap(recommendedTemplates =>
                console.log(`Found ${recommendedTemplates.length} recommended templates for TV`)
            )
        );
    }

    /**
     * Set active template
     * @param templateId Template to activate
     * @returns Observable<boolean>
     */
    setActiveTemplate(templateId: string): Observable<boolean> {
        console.log(`🎯 TemplateRegistryService.setActiveTemplate(${templateId})`);

        return this.getTemplate(templateId).pipe(
            map(template => {
                if (template) {
                    this.activeTemplateSignal.set(templateId);

                    // Update usage statistics
                    const currentUsage = this.activeTemplateUsage.get(templateId) || 0;
                    this.activeTemplateUsage.set(templateId, currentUsage + 1);

                    console.log(`✅ Active template set to '${template.name}'`);
                    return true;
                }
                return false;
            }),
            catchError(error => {
                console.error('❌ Failed to set active template:', error);
                return of(false);
            })
        );
    }

    /**
     * Create template render context
     * @param product Product to display
     * @param templateId Template identifier
     * @param slideInfo Slideshow timing information
     * @returns Template render context
     */
    createRenderContext(
        product: Product,
        templateId: string,
        slideInfo: { duration: number; startTime: Date; isActive: boolean }
    ): TemplateRenderContext {
        console.log(`🎬 TemplateRegistryService.createRenderContext(${templateId})`);

        const template = this.templateRegistry.get(templateId);
        const config = this.getTemplateConfig(templateId);

        // Detect TV environment (simplified)
        const resolution = {
            width: this.document.defaultView?.innerWidth || 1920,
            height: this.document.defaultView?.innerHeight || 1080
        };

        const context: TemplateRenderContext = {
            product,
            config,
            timing: slideInfo,
            environment: {
                resolution,
                platform: this.detectTvPlatform(),
                performanceLevel: this.estimatePerformanceLevel(resolution)
            }
        };

        console.log('✅ Template render context created');
        return context;
    }

    /**
     * Get template configuration
     * @param templateId Template identifier
     * @returns Template configuration
     */
    getTemplateConfig(templateId: string): TemplateConfig {
        console.log(`⚙️ TemplateRegistryService.getTemplateConfig(${templateId})`);

        const template = this.templateRegistry.get(templateId);
        if (template) {
            return template.defaultConfig;
        }

        // Return default config if template not found
        return this.getDefaultTemplateConfig();
    }

    /**
     * Get template usage statistics
     * @returns Map of template usage counts
     */
    getUsageStatistics(): Map<string, number> {
        console.log('📊 TemplateRegistryService.getUsageStatistics()');
        return new Map(this.activeTemplateUsage);
    }

    /**
     * Clear all template registrations (for testing)
     */
    clearRegistry(): void {
        console.log('🗑️ TemplateRegistryService.clearRegistry()');
        this.templateRegistry.clear();
        this.componentRegistry.clear();
        this.activeTemplateUsage.clear();
        this.updateTemplatesSignal();
        this.errorSignal.set(null);
    }

    // Private helper methods

    private initializeDefaultTemplates(): void {
        console.log('🏭 Initializing default templates...');

        // Create default template configurations
        const defaultConfig: TemplateConfig = {
            colors: {
                primary: '#1565C0',
                secondary: '#FFA726',
                accent: '#E91E63',
                background: '#FFFFFF',
                text: '#212121'
            },
            typography: {
                fontFamily: 'Roboto, Arial, sans-serif',
                baseFontSize: '24px',
                fontWeights: {
                    light: 300,
                    normal: 400,
                    bold: 700
                }
            },
            animations: {
                enabled: true,
                durationMultiplier: 1.0,
                entranceAnimation: 'fade',
                textAnimation: 'fade'
            },
            layout: {
                safeAreaMultiplier: 1.0,
                contentAlignment: 'center',
                imageAspectRatio: 'cover'
            }
        };

        this.defaultTemplateConfigs.set('default', defaultConfig);
        console.log('✅ Default template configurations initialized');
    }

    private validateTemplate(template: ProductTemplate): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Required fields validation
        if (!template.id || template.id.trim() === '') {
            errors.push({
                field: 'id',
                message: 'Template ID is required',
                code: 'TEMPLATE_ID_REQUIRED'
            });
        }

        if (!template.name || template.name.trim() === '') {
            errors.push({
                field: 'name',
                message: 'Template name is required',
                code: 'TEMPLATE_NAME_REQUIRED'
            });
        }

        // TV requirements validation
        if (template.tvRequirements.performance.animationComplexity > 5) {
            warnings.push({
                field: 'tvRequirements.performance.animationComplexity',
                message: 'High animation complexity may impact TV performance',
                suggestion: 'Consider reducing animation complexity for better TV compatibility'
            });
        }

        if (template.tvRequirements.performance.maxMemoryUsage > 200) {
            warnings.push({
                field: 'tvRequirements.performance.maxMemoryUsage',
                message: 'High memory usage may cause issues on older TVs',
                suggestion: 'Optimize template for lower memory usage'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    private getFallbackTemplate(): Observable<ProductTemplate> {
        console.log('🔄 Getting fallback template...');

        // Try to get 'classic' template as fallback
        const fallback = this.templateRegistry.get('classic');
        if (fallback) {
            return of(fallback);
        }

        // Return first available template
        const firstTemplate = Array.from(this.templateRegistry.values())[0];
        if (firstTemplate) {
            console.log(`Using '${firstTemplate.name}' as fallback template`);
            return of(firstTemplate);
        }

        // No templates available - return error
        return throwError(() => new Error('No templates available'));
    }

    private getFallbackComponent(): Type<any> | null {
        console.log('🔄 Getting fallback component...');

        // Try classic template component
        const fallbackComponent = this.componentRegistry.get('classic');
        if (fallbackComponent) {
            return fallbackComponent;
        }

        // Return first available component
        const firstComponent = Array.from(this.componentRegistry.values())[0];
        return firstComponent || null;
    }

    private updateTemplatesSignal(): void {
        const templatesArray = Array.from(this.templateRegistry.values());
        this.templatesSignal.set(templatesArray);
        this.templatesSubject.next(templatesArray);
    }

    private loadTemplatesFromStorage(): void {
        console.log('📂 Loading templates from localStorage...');

        try {
            const stored = this.document.defaultView?.localStorage?.getItem('tv-slideshow-templates');
            if (stored) {
                const templates = JSON.parse(stored) as ProductTemplate[];
                templates.forEach(template => {
                    this.templateRegistry.set(template.id, template);
                });
                this.updateTemplatesSignal();
                console.log(`✅ Loaded ${templates.length} templates from storage`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load templates from storage:', error);
        }
    }

    private saveTemplatesToStorage(): void {
        console.log('💾 Saving templates to localStorage...');

        try {
            const templates = Array.from(this.templateRegistry.values());
            this.document.defaultView?.localStorage?.setItem(
                'tv-slideshow-templates',
                JSON.stringify(templates)
            );
            console.log(`✅ Saved ${templates.length} templates to storage`);
        } catch (error) {
            console.warn('⚠️ Failed to save templates to storage:', error);
        }
    }

    private detectTvPlatform(): string | undefined {
        const userAgent = this.document.defaultView?.navigator?.userAgent || '';

        if (userAgent.includes('Tizen')) return 'Samsung Tizen';
        if (userAgent.includes('WebOS')) return 'LG WebOS';
        if (userAgent.includes('Android TV')) return 'Android TV';
        if (userAgent.includes('CrOS')) return 'Chrome OS';

        return undefined;
    }

    private estimatePerformanceLevel(resolution: { width: number; height: number }): number {
        // Simple performance estimation based on resolution
        const pixelCount = resolution.width * resolution.height;

        if (pixelCount >= 3840 * 2160) return 5; // 4K
        if (pixelCount >= 2560 * 1440) return 4; // 2K
        if (pixelCount >= 1920 * 1080) return 3; // Full HD
        if (pixelCount >= 1280 * 720) return 2;  // HD
        return 1; // Lower resolutions
    }

    private getDefaultTemplateConfig(): TemplateConfig {
        return this.defaultTemplateConfigs.get('default')!;
    }
}