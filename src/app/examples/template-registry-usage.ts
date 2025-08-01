// TemplateRegistryService Usage Guide - How to use in components
// Place in src/app/examples/template-registry-usage.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { TemplateRegistryService } from '../core/services/template-registry.service';
import { ProductTemplate, TemplateCategoryEnum, Product } from '../core/models';

/**
 * Example component showing how to use TemplateRegistryService
 * This demonstrates all major service functions with real examples
 */
@Component({
    selector: 'app-template-usage-example',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="template-demo">
      <h2>Template Registry Demo</h2>
      
      <!-- Show available templates -->
      <div class="templates-list">
        <h3>Available Templates: {{ templateService.templates().length }}</h3>
        @for (template of templateService.availableTemplates(); track template.id) {
          <div class="template-item">
            <span>{{ template.name }} ({{ template.category }})</span>
            <button (click)="activateTemplate(template.id)">Activate</button>
          </div>
        }
      </div>
      
      <!-- Show current active template -->
      <div class="active-template">
        <h3>Active Template: {{ templateService.activeTemplate() }}</h3>
        @if (templateService.currentTemplateInfo(); as template) {
          <p>{{ template.description }}</p>
          <p>Performance Level: {{ template.tvRequirements.performance.animationComplexity }}/5</p>
        }
      </div>
      
      <!-- Show templates by category -->
      <div class="templates-by-category">
        <h3>Templates by Category</h3>
        @for (category of templateService.templatesByCategory() | keyvalue; track category.key) {
          <div class="category-group">
            <h4>{{ category.key }} ({{ category.value.length }})</h4>
            @for (template of category.value; track template.id) {
              <span class="template-badge">{{ template.name }}</span>
            }
          </div>
        }
      </div>
      
      <!-- Loading state -->
      @if (templateService.isLoading()) {
        <div class="loading">Loading templates...</div>
      }
      
      <!-- Error state -->
      @if (templateService.error(); as error) {
        <div class="error">Error: {{ error }}</div>
      }
    </div>
  `,
    styles: [`
    .template-demo { padding: 20px; }
    .template-item { display: flex; justify-content: space-between; margin: 10px 0; }
    .template-badge { background: #e3f2fd; padding: 4px 8px; margin: 2px; border-radius: 4px; }
    .category-group { margin: 15px 0; }
    .loading { color: #1976d2; }
    .error { color: #d32f2f; }
  `]
})
export class TemplateUsageExampleComponent implements OnInit {
    // Inject TemplateRegistryService using Angular 18 pattern
    readonly templateService = inject(TemplateRegistryService);

    async ngOnInit() {
        console.log('🎨 TemplateUsageExample initializing...');

        // Register sample templates for demonstration
        await this.registerSampleTemplates();

        // Load recommended templates for current TV
        await this.loadRecommendedTemplates();

        // Demonstrate template usage statistics
        this.showUsageStatistics();
    }

    /**
     * Register sample templates for demo purposes
     */
    private async registerSampleTemplates() {
        console.log('📝 Registering sample templates...');

        // Classic Template Example
        const classicTemplate: ProductTemplate = {
            id: 'classic',
            name: 'Classic TV Template',
            description: 'Traditional product display optimized for all TV types',
            componentName: 'ClassicTemplateComponent',
            previewImageUrl: '/assets/previews/classic-template.jpg',
            category: TemplateCategoryEnum.CLASSIC,
            isActive: true,

            tvRequirements: {
                minResolution: { width: 1280, height: 720 },
                performance: {
                    requiresGPU: false,
                    maxMemoryUsage: 30,
                    animationComplexity: 1
                },
                supportedPlatforms: ['Samsung Tizen', 'LG WebOS', 'Android TV', 'Chrome OS'],
                browserRequirements: {
                    chrome: 60,
                    firefox: 55,
                    edge: 79
                }
            },

            supportedProperties: {
                supportsImages: true,
                supportsSecondaryImages: false,
                supportsBadges: true,
                supportsDiscounts: true,
                supportsLongDescription: false,
                textLimits: {
                    productName: 40,
                    shortDescription: 100
                }
            },

            defaultConfig: {
                colors: {
                    primary: '#1565C0',
                    secondary: '#FFA726',
                    accent: '#E91E63',
                    background: '#FFFFFF',
                    text: '#212121'
                },
                typography: {
                    fontFamily: 'Roboto, Arial, sans-serif',
                    baseFontSize: '28px',
                    fontWeights: { light: 300, normal: 400, bold: 700 }
                },
                animations: {
                    enabled: false,
                    durationMultiplier: 1.0,
                    entranceAnimation: 'none',
                    textAnimation: 'none'
                },
                layout: {
                    safeAreaMultiplier: 1.2,
                    contentAlignment: 'center',
                    imageAspectRatio: 'contain'
                }
            },

            metadata: {
                author: 'TV Slideshow Team',
                version: '1.0.0',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15'),
                tags: ['classic', 'reliable', 'tv-safe']
            }
        };

        // Modern Template Example
        const modernTemplate: ProductTemplate = {
            id: 'modern',
            name: 'Modern Animated Template',
            description: 'Contemporary design with smooth animations for high-end TVs',
            componentName: 'ModernTemplateComponent',
            previewImageUrl: '/assets/previews/modern-template.jpg',
            category: TemplateCategoryEnum.MODERN,
            isActive: true,

            tvRequirements: {
                minResolution: { width: 1920, height: 1080 },
                performance: {
                    requiresGPU: true,
                    maxMemoryUsage: 80,
                    animationComplexity: 4
                },
                supportedPlatforms: ['Samsung Tizen', 'LG WebOS', 'Android TV'],
                browserRequirements: {
                    chrome: 80,
                    firefox: 75,
                    edge: 80
                }
            },

            supportedProperties: {
                supportsImages: true,
                supportsSecondaryImages: true,
                supportsBadges: true,
                supportsDiscounts: true,
                supportsLongDescription: true,
                textLimits: {
                    productName: 60,
                    shortDescription: 150,
                    longDescription: 300
                }
            },

            defaultConfig: {
                colors: {
                    primary: '#2196F3',
                    secondary: '#FF9800',
                    accent: '#9C27B0',
                    background: '#FAFAFA',
                    text: '#333333'
                },
                typography: {
                    fontFamily: 'Roboto, sans-serif',
                    baseFontSize: '26px',
                    fontWeights: { light: 300, normal: 400, bold: 600 }
                },
                animations: {
                    enabled: true,
                    durationMultiplier: 1.2,
                    entranceAnimation: 'slide',
                    textAnimation: 'typewriter'
                },
                layout: {
                    safeAreaMultiplier: 1.0,
                    contentAlignment: 'left',
                    imageAspectRatio: 'cover'
                }
            },

            metadata: {
                author: 'Design Team',
                version: '2.1.0',
                createdAt: new Date('2024-01-10'),
                updatedAt: new Date('2024-01-20'),
                tags: ['modern', 'animated', 'premium']
            }
        };

        // Register templates (mock component classes for demo)
        try {
            await this.templateService.registerTemplate(classicTemplate, class ClassicMock { }).toPromise();
            await this.templateService.registerTemplate(modernTemplate, class ModernMock { }).toPromise();
            console.log('✅ Sample templates registered successfully');
        } catch (error) {
            console.error('❌ Failed to register templates:', error);
        }
    }

    /**
     * Load templates recommended for current TV
     */
    private async loadRecommendedTemplates() {
        console.log('🎯 Loading TV-optimized templates...');

        const currentResolution = {
            width: window.innerWidth || 1920,
            height: window.innerHeight || 1080
        };

        const performanceLevel = this.estimateDevicePerformance();

        try {
            const recommended = await this.templateService.getRecommendedTemplates(
                currentResolution,
                performanceLevel
            ).toPromise();

            console.log(`✅ Found ${recommended?.length || 0} recommended templates for this TV`);
            recommended?.forEach(template => {
                console.log(`  - ${template.name} (complexity: ${template.tvRequirements.performance.animationComplexity})`);
            });
        } catch (error) {
            console.error('❌ Failed to load recommended templates:', error);
        }
    }

    /**
     * Activate template by ID
     */
    async activateTemplate(templateId: string) {
        console.log(`🎯 Activating template: ${templateId}`);

        try {
            const success = await this.templateService.setActiveTemplate(templateId).toPromise();
            if (success) {
                console.log(`✅ Template '${templateId}' activated successfully`);

                // Create render context for demo
                this.demonstrateRenderContext(templateId);
            } else {
                console.warn(`⚠️ Failed to activate template '${templateId}'`);
            }
        } catch (error) {
            console.error('❌ Error activating template:', error);
        }
    }

    /**
     * Demonstrate render context creation
     */
    private demonstrateRenderContext(templateId: string) {
        console.log('🎬 Creating template render context...');

        const sampleProduct: Product = {
            id: 'demo-product',
            name: 'Samsung Galaxy S24 Ultra',
            price: 2299.00,
            imageUrl: '/assets/images/samsung-s24.jpg',
            shortDescription: 'Latest flagship with AI features and S Pen',
            category: 'smartphones',
            inStock: true
        };

        const slideInfo = {
            duration: 20000,
            startTime: new Date(),
            isActive: true
        };

        const context = this.templateService.createRenderContext(sampleProduct, templateId, slideInfo);

        console.log('✅ Render context created:', {
            productName: context.product.name,
            templateConfig: context.config.colors.primary,
            tvResolution: context.environment.resolution,
            tvPlatform: context.environment.platform || 'Unknown',
            performanceLevel: context.environment.performanceLevel
        });
    }

    /**
     * Show usage statistics for templates
     */
    private showUsageStatistics() {
        console.log('📊 Template usage statistics:');

        const stats = this.templateService.getUsageStatistics();
        stats.forEach((count, templateId) => {
            console.log(`  - ${templateId}: ${count} times used`);
        });
    }

    /**
     * Estimate device performance level (1-5)
     */
    private estimateDevicePerformance(): number {
        const pixelCount = (window.innerWidth || 1920) * (window.innerHeight || 1080);

        // Simple performance estimation
        if (pixelCount >= 3840 * 2160) return 5; // 4K capable
        if (pixelCount >= 2560 * 1440) return 4; // 2K capable  
        if (pixelCount >= 1920 * 1080) return 3; // Full HD
        if (pixelCount >= 1280 * 720) return 2;  // HD
        return 1; // Lower performance
    }
}

// Export usage examples for reference
export const templateRegistryUsageExamples = {
    basicUsage: `
    // Inject service
    private templateService = inject(TemplateRegistryService);
    
    // Get all templates
    this.templateService.getAllTemplates().subscribe(templates => {
      console.log('Available templates:', templates);
    });
    
    // Set active template
    this.templateService.setActiveTemplate('modern').subscribe(success => {
      if (success) console.log('Template activated');
    });
  `,

    signalsUsage: `
    // Use reactive signals in templates
    readonly templates = this.templateService.templates;
    readonly activeTemplate = this.templateService.activeTemplate;
    readonly isLoading = this.templateService.isLoading;
    
    // Computed values
    readonly hasTemplates = this.templateService.hasTemplates;
    readonly currentTemplateInfo = this.templateService.currentTemplateInfo;
  `,

    tvOptimization: `
    // Get TV-optimized templates
    const tvResolution = { width: 1920, height: 1080 };
    const performanceLevel = 3;
    
    this.templateService.getRecommendedTemplates(tvResolution, performanceLevel)
      .subscribe(recommended => {
        console.log('TV-optimized templates:', recommended);
      });
  `,

    renderContext: `
    // Create render context for template
    const context = this.templateService.createRenderContext(
      product,
      'modern',
      { duration: 20000, startTime: new Date(), isActive: true }
    );
    
    // Context contains: product, config, timing, environment
    console.log('TV Platform:', context.environment.platform);
    console.log('Performance Level:', context.environment.performanceLevel);
  `
};

console.log('📚 TemplateRegistryService usage examples loaded');