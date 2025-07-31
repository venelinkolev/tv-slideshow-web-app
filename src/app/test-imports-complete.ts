// COMPREHENSIVE TEST FILE FOR ALL IMPORTS - PLACE THIS IN SRC/APP

// Test individual file imports (direct imports)
import { Product, ProductBadge, ProductDiscount } from './core/models/product.interface';
import { ProductTemplate, TemplateConfig, TemplateRenderContext } from './core/models/template.interface';
import { SlideshowConfig, SlideshowGeneralSettings, ProductTemplateRule } from './core/models/slideshow-config.interface';
import { ApiResponse, SystemHealth, NotificationAction } from './core/models/api-response.interface';
import { ProductCategory, TemplateCategoryEnum, SystemHealthStatus } from './core/models/enums';
import { isProduct, isProductTemplate, ValidationUtils } from './core/models/type-guards';

// Test barrel exports (index.ts imports)
import {
    // Main interfaces
    Product as ProductFromIndex,
    ProductTemplate as TemplateFromIndex,
    SlideshowConfig as ConfigFromIndex,

    // Enums
    ProductCategory as CategoryFromIndex,
    TemplateCategoryEnum as TemplateCatFromIndex,

    // Type guards
    isProduct as isProductFromIndex,
    ValidationUtils as ValidatorFromIndex
} from './core/models';

// Test with path aliases (if configured)
// import { 
//   Product as ProductFromAlias,
//   ProductCategory as CategoryFromAlias
// } from '@core/models';

console.log('✅ ALL IMPORTS SUCCESSFUL!');

// Test type usage
const testProduct: Product = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
    imageUrl: 'https://example.com/image.jpg',
    shortDescription: 'Test description',
    category: 'smartphones',
    inStock: true
};

const testBadge: ProductBadge = {
    text: 'NEW',
    color: 'primary',
    position: 'top-right'
};

const testDiscount: ProductDiscount = {
    originalPrice: 199.99,
    percentage: 50
};

const testConfig: Partial<SlideshowConfig> = {
    id: 'test-config',
    name: 'Test Configuration'
};

const testRule: ProductTemplateRule = {
    name: 'Test Rule',
    conditions: {
        categories: ['smartphones'],
        inStock: true
    },
    templateId: 'template-1',
    priority: 1
};

// Test enums
const category = ProductCategory.SMARTPHONES;
const templateCat = TemplateCategoryEnum.MODERN;
const healthStatus = SystemHealthStatus.HEALTHY;

// Test type guards
const isValidProduct = isProduct(testProduct);
const validation = ValidationUtils.validateProduct(testProduct);

console.log('✅ ALL TYPE CHECKS SUCCESSFUL!');
console.log('Product valid:', isValidProduct);
console.log('Validation result:', validation);
console.log('Enums working:', { category, templateCat, healthStatus });

export {
    testProduct,
    testBadge,
    testDiscount,
    testConfig,
    testRule,
    category,
    templateCat,
    healthStatus,
    isValidProduct,
    validation
};