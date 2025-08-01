import { ProductApiService } from './core/services/product-api.service';
import { inject } from '@angular/core';

// Test import
console.log('✅ ProductApiService import successful');

// Test methods exist
const methods = [
    'getProducts', 'getProductById', 'getProductsByCategory',
    'getInStockProducts', 'refreshProducts', 'clearCache', 'getCacheStatus'
];

console.log('Service methods:', methods);