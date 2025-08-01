import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer, catchError, retry, timeout, tap, shareReplay, map } from 'rxjs';

import {
    Product,
    ProductResponse,
    ProductFilters,
    ApiResponse,
    ProductsApiResponse,
    ProductApiResponse
} from '@core/models';

/**
 * Product API Service for TV slideshow application
 * Handles product data retrieval with TV-specific optimizations:
 * - Smart caching for reduced API calls
 * - Fallback to mock data when API is unavailable
 * - Image preloading for smooth TV display
 * - Offline-ready with graceful degradation
 */
@Injectable({
    providedIn: 'root'
})
export class ProductApiService {
    private readonly http = inject(HttpClient);

    // Configuration
    private readonly apiBaseUrl = '/api/products';
    private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
    private readonly requestTimeout = 10000; // 10 seconds for TV networks
    private readonly maxRetries = 3;

    // Cache storage
    private cachedProducts: {
        data: Product[];
        timestamp: number;
        filters?: ProductFilters;
    } | null = null;

    // Fallback mock data for TV demo purposes
    private readonly mockProducts: Product[] = [
        {
            id: '1',
            name: 'Samsung Galaxy S24 Ultra',
            price: 2299.00,
            imageUrl: '/assets/images/mock/samsung-s24-ultra.jpg',
            shortDescription: 'Най-новият флагман с AI възможности и S Pen',
            category: 'smartphones',
            inStock: true,
            badge: { text: 'NEW', color: 'primary', position: 'top-right' },
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
        },
        {
            id: '2',
            name: 'iPhone 15 Pro Max',
            price: 2599.00,
            imageUrl: '/assets/images/mock/iphone-15-pro-max.jpg',
            shortDescription: 'Титаниев корпус, Action Button, A17 Pro чип',
            category: 'smartphones',
            inStock: true,
            discount: { originalPrice: 2799.00, percentage: 7 },
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10')
        },
        {
            id: '3',
            name: 'MacBook Pro 16" M3 Max',
            price: 5999.00,
            imageUrl: '/assets/images/mock/macbook-pro-16-m3.jpg',
            shortDescription: 'Върхови характеристики за професионалисти',
            category: 'laptops',
            inStock: false,
            badge: { text: 'SOLD OUT', color: 'error', position: 'top-left' },
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-20')
        },
        {
            id: '4',
            name: 'Sony WH-1000XM5',
            price: 699.00,
            imageUrl: '/assets/images/mock/sony-wh1000xm5.jpg',
            shortDescription: 'Безжични слушалки с водеща технология за потискане на шума',
            category: 'audio',
            inStock: true,
            badge: { text: 'TOP', color: 'warning', position: 'top-right' },
            createdAt: new Date('2024-01-12'),
            updatedAt: new Date('2024-01-12')
        }
    ];

    /**
     * Fetch all products with smart caching and fallback
     * @param filters Optional product filtering
     * @param forceRefresh Force API call bypassing cache
     * @returns Observable<Product[]>
     */
    getProducts(filters?: ProductFilters, forceRefresh = false): Observable<Product[]> {
        console.log('🔄 ProductApiService.getProducts()', { filters, forceRefresh });

        // Check cache validity
        if (!forceRefresh && this.isCacheValid(filters)) {
            console.log('📦 Using cached products');
            return of(this.cachedProducts!.data);
        }

        // Make API call with error handling
        return this.http.get<ProductsApiResponse>(`${this.apiBaseUrl}`, {
            params: this.buildFilterParams(filters)
        }).pipe(
            timeout(this.requestTimeout),
            retry(this.maxRetries),
            map(response => response.data || []),
            tap(products => {
                console.log(`✅ Fetched ${products.length} products from API`);
                this.updateCache(products, filters);
                this.preloadImages(products);
            }),
            catchError(error => this.handleApiError(error)),
            shareReplay(1)
        );
    }

    /**
     * Fetch single product by ID
     * @param id Product identifier
     * @returns Observable<Product>
     */
    getProductById(id: string): Observable<Product> {
        console.log(`🔍 ProductApiService.getProductById(${id})`);

        // Try to find in cache first
        const cachedProduct = this.cachedProducts?.data.find(p => p.id === id);
        if (cachedProduct && this.isCacheValid()) {
            console.log('📦 Found product in cache');
            return of(cachedProduct);
        }

        // API call for single product
        return this.http.get<ProductApiResponse>(`${this.apiBaseUrl}/${id}`).pipe(
            timeout(this.requestTimeout),
            retry(2),
            map(response => response.data),
            tap(product => console.log('✅ Fetched single product from API')),
            catchError(error => {
                console.error('❌ Failed to fetch product by ID:', error);
                // Fallback to mock data
                const mockProduct = this.mockProducts.find(p => p.id === id);
                if (mockProduct) {
                    console.log('🔄 Using mock product as fallback');
                    return of(mockProduct);
                }
                return throwError(() => new Error(`Product with ID ${id} not found`));
            })
        );
    }

    /**
     * Get products in specific category (TV-optimized for template filtering)
     * @param category Product category
     * @returns Observable<Product[]>
     */
    getProductsByCategory(category: string): Observable<Product[]> {
        console.log(`📱 ProductApiService.getProductsByCategory(${category})`);

        const filters: ProductFilters = { category };
        return this.getProducts(filters);
    }

    /**
     * Get in-stock products only (for live TV display)
     * @returns Observable<Product[]>
     */
    getInStockProducts(): Observable<Product[]> {
        console.log('📦 ProductApiService.getInStockProducts()');

        const filters: ProductFilters = { inStock: true };
        return this.getProducts(filters);
    }

    /**
     * Force refresh products (for admin panel)
     * @returns Observable<Product[]>
     */
    refreshProducts(): Observable<Product[]> {
        console.log('🔄 ProductApiService.refreshProducts() - Force refresh');
        this.clearCache();
        return this.getProducts(undefined, true);
    }

    /**
     * Clear products cache manually
     */
    clearCache(): void {
        console.log('🗑️ ProductApiService.clearCache()');
        this.cachedProducts = null;
    }

    /**
     * Get cache status for admin monitoring
     * @returns Cache info object
     */
    getCacheStatus(): {
        hasCache: boolean;
        cacheAge: number;
        productCount: number;
        isValid: boolean;
    } {
        if (!this.cachedProducts) {
            return { hasCache: false, cacheAge: 0, productCount: 0, isValid: false };
        }

        const cacheAge = Date.now() - this.cachedProducts.timestamp;
        return {
            hasCache: true,
            cacheAge,
            productCount: this.cachedProducts.data.length,
            isValid: this.isCacheValid()
        };
    }

    // Private helper methods

    /**
     * Check if cached data is still valid
     * @private
     */
    private isCacheValid(filters?: ProductFilters): boolean {
        if (!this.cachedProducts) {
            return false;
        }

        // Check time validity
        const cacheAge = Date.now() - this.cachedProducts.timestamp;
        const isTimeValid = cacheAge < this.cacheTimeout;

        // Check filter match (simplified comparison)
        const filtersMatch = !filters || JSON.stringify(filters) === JSON.stringify(this.cachedProducts.filters);

        return isTimeValid && filtersMatch;
    }

    /**
     * Handle API errors with graceful fallback to mock data
     * @private
     */
    private handleApiError(error: HttpErrorResponse): Observable<Product[]> {
        console.error('❌ ProductApiService API Error:', {
            status: error.status,
            message: error.message,
            url: error.url
        });

        // Log specific error types for TV debugging
        if (error.status === 0) {
            console.warn('🌐 Network error - using mock data for TV display');
        } else if (error.status >= 500) {
            console.warn('🔧 Server error - using mock data for TV display');
        } else if (error.status === 404) {
            console.warn('📭 API endpoint not found - using mock data');
        }

        // Return mock data as fallback
        console.log('🔄 Falling back to mock data for TV slideshow');
        this.updateCache(this.mockProducts);
        return of(this.mockProducts);
    }

    /**
     * Update internal cache with fresh data
     * @private
     */
    private updateCache(products: Product[], filters?: ProductFilters): void {
        this.cachedProducts = {
            data: products,
            timestamp: Date.now(),
            filters
        };
        console.log(`💾 Cache updated with ${products.length} products`);
    }

    /**
     * Build HTTP params from filters
     * @private
     */
    private buildFilterParams(filters?: ProductFilters): { [key: string]: string } {
        if (!filters) {
            return {};
        }

        const params: { [key: string]: string } = {};

        if (filters.category) params['category'] = filters.category;
        if (filters.inStock !== undefined) params['inStock'] = filters.inStock.toString();
        if (filters.minPrice !== undefined) params['minPrice'] = filters.minPrice.toString();
        if (filters.maxPrice !== undefined) params['maxPrice'] = filters.maxPrice.toString();
        if (filters.searchTerm) params['search'] = filters.searchTerm;
        if (filters.hasDiscount !== undefined) params['hasDiscount'] = filters.hasDiscount.toString();

        return params;
    }

    /**
     * Preload product images for smooth TV display
     * @private
     */
    private preloadImages(products: Product[]): void {
        console.log(`🖼️ Preloading ${products.length} product images for TV display`);

        products.forEach(product => {
            // Preload main image
            const img = new Image();
            img.src = product.imageUrl;

            // Preload secondary image if exists
            if (product.secondaryImageUrl) {
                const secondaryImg = new Image();
                secondaryImg.src = product.secondaryImageUrl;
            }
        });
    }
}