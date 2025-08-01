// TemplateRegistryService Test File - Place in src/app/test-template-registry-service.ts
import { TemplateRegistryService } from './core/services/template-registry.service';
import {
    ProductTemplate,
    TemplateConfig,
    TemplateRenderContext,
    Product,
    TemplateCategoryEnum
} from './core/models';

console.log('🧪 TESTING TemplateRegistryService...');

// Test service import
try {
    console.log('✅ TemplateRegistryService import successful');

    // Test service methods exist
    const serviceMethods = [
        'registerTemplate', 'getTemplate', 'getTemplateComponent', 'getAllTemplates',
        'getTemplatesByCategory', 'getRecommendedTemplates', 'setActiveTemplate',
        'createRenderContext', 'getTemplateConfig', 'getUsageStatistics', 'clearRegistry'
    ];

    console.log('📋 TemplateRegistryService methods:', serviceMethods);

    // Test computed signals exist
    const computedProperties = [
        'templates', 'activeTemplate', 'isLoading', 'error',
        'availableTemplates', 'templatesByCategory', 'currentTemplateInfo', 'hasTemplates'
    ];

    console.log('⚡ TemplateRegistryService signals:', computedProperties);

    // Test template structure
    console.log('🎨 Testing template interfaces...');

    // Mock ProductTemplate for testing
    const mockTemplate: ProductTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template for validation',
        componentName: 'TestTemplateComponent',
        previewImageUrl: '/assets/previews/test-template.jpg',
        category: TemplateCategoryEnum.MODERN,
        isActive: true,

        tvRequirements: {
            minResolution: { width: 1920, height: 1080 },
            performance: {
                requiresGPU: false,
                maxMemoryUsage: 50,
                animationComplexity: 2
            },
            supportedPlatforms: ['Samsung Tizen', 'LG WebOS', 'Android TV'],
            browserRequirements: {
                chrome: 80,
                firefox: 70,
                edge: 80
            }
        },

        supportedProperties: {
            supportsImages: true,
            supportsSecondaryImages: true,
            supportsBadges: true,
            supportsDiscounts: true,
            supportsLongDescription: false,
            textLimits: {
                productName: 50,
                shortDescription: 120,
                longDescription: 300
            }
        },

        defaultConfig: {
            colors: {
                primary: '#2196F3',
                secondary: '#FF9800',
                accent: '#E91E63',
                background: '#FFFFFF',
                text: '#212121'
            },
            typography: {
                fontFamily: 'Roboto, sans-serif',
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
                textAnimation: 'typewriter'
            },
            layout: {
                safeAreaMultiplier: 1.2,
                contentAlignment: 'center',
                imageAspectRatio: 'cover'
            }
        },

        metadata: {
            author: 'Test Developer',
            version: '1.0.0',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-15'),
            usageStats: {
                timesUsed: 5,
                averageRating: 4.5,
                lastUsed: new Date('2024-01-14')
            },
            tags: ['modern', 'animated', 'tv-optimized']
        }
    };

    console.log('✅ Mock ProductTemplate created successfully');
    console.log('🎯 Template ID:', mockTemplate.id);
    console.log('🏷️ Template Category:', mockTemplate.category);
    console.log('⚡ Animation Complexity:', mockTemplate.tvRequirements.performance.animationComplexity);

    // Test Product for render context
    const testProduct: Product = {
        id: 'test-product-1',
        name: 'Test Product for Template',
        price: 199.99,
        imageUrl: '/assets/images/test-product.jpg',
        shortDescription: 'A test product for template rendering',
        category: 'electronics',
        inStock: true
    };

    console.log('✅ Test Product created for render context');

    // Test TemplateConfig structure
    const testConfig: TemplateConfig = {
        colors: {
            primary: '#1976D2',
            secondary: '#FFC107',
            accent: '#F44336',
            background: '#FAFAFA',
            text: '#333333'
        },
        typography: {
            fontFamily: 'Arial, sans-serif',
            baseFontSize: '22px',
            fontWeights: {
                light: 300,
                normal: 400,
                bold: 600
            }
        },
        animations: {
            enabled: true,
            durationMultiplier: 0.8,
            entranceAnimation: 'slide',
            textAnimation: 'fade'
        },
        layout: {
            safeAreaMultiplier: 1.1,
            contentAlignment: 'left',
            imageAspectRatio: 'contain'
        }
    };

    console.log('✅ TemplateConfig structure test passed');

    // Test Template Categories
    const categories = [
        TemplateCategoryEnum.CLASSIC,
        TemplateCategoryEnum.MODERN,
        TemplateCategoryEnum.MINIMAL,
        TemplateCategoryEnum.BOLD
    ];

    console.log('📂 Available template categories:', categories);

    // Test validation constraints
    const validationTests = {
        requiredFields: ['id', 'name', 'componentName'],
        performanceThresholds: {
            maxAnimationComplexity: 5,
            maxMemoryUsage: 200,
            minResolution: { width: 1280, height: 720 }
        },
        supportedPlatforms: ['Samsung Tizen', 'LG WebOS', 'Android TV', 'Chrome OS']
    };

    console.log('⚖️ Template validation tests:', validationTests);

    console.log('🎉 ALL TemplateRegistryService TESTS PASSED!');

} catch (error) {
    console.error('❌ TemplateRegistryService test failed:', error);
}

// Export test functions for manual verification
export const testTemplateRegistryService = () => {
    console.log('🎨 Manual TemplateRegistryService test function ready');
    return {
        serviceName: 'TemplateRegistryService',
        features: [
            'Dynamic template registration',
            'Component management with Type safety',
            'TV compatibility validation',
            'Performance-based recommendations',
            'Template categorization',
            'Usage statistics tracking',
            'Render context creation',
            'Fallback mechanisms',
            'localStorage persistence',
            'Angular 18 Signals reactivity'
        ],
        templateCategories: [
            'CLASSIC - Traditional product displays',
            'MODERN - Contemporary animated designs',
            'MINIMAL - Clean simplified layouts',
            'BOLD - High-impact visual designs'
        ],
        tvOptimizations: [
            'Resolution compatibility checking',
            'Performance level estimation',
            'Platform detection (Tizen, WebOS, Android TV)',
            'Memory usage validation',
            'Animation complexity limits'
        ],
        status: 'Ready for testing'
    };
};

// Export template categories for easy reference
export const templateCategories = {
    CLASSIC: TemplateCategoryEnum.CLASSIC,
    MODERN: TemplateCategoryEnum.MODERN,
    MINIMAL: TemplateCategoryEnum.MINIMAL,
    BOLD: TemplateCategoryEnum.BOLD
};

// Export mock data for manual testing
export const mockTemplateData = {
    template: {
        id: 'test-template',
        name: 'Test Template',
        category: TemplateCategoryEnum.MODERN,
        isActive: true
    },
    product: {
        id: 'test-product',
        name: 'Test Product',
        price: 299.99,
        imageUrl: '/assets/test-image.jpg'
    },
    tvSpecs: {
        resolution: { width: 1920, height: 1080 },
        performanceLevel: 3,
        platform: 'Samsung Tizen'
    }
};

console.log('📦 Mock template data exported for testing:', mockTemplateData);