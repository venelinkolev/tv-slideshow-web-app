// CORRECTED ProductApiService - Matches GitHub Architecture
// src/app/core/services/product-api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, retry, timeout, tap, shareReplay, map } from 'rxjs/operators';

import {
    Product,
    ProductFilters,
    ProductsApiResponse,
    ProductApiResponse,
    ProductBadge,
    ProductDiscount
} from '@core/models';

/**
 * Product API Service for TV slideshow application - CORRECTED ARCHITECTURE
 * 🚀 MATCHES: Real GitHub interface structure
 * 🔧 FIXES: All TypeScript compilation errors
 */
@Injectable({
    providedIn: 'root'
})
export class ProductApiService {
    private readonly http = inject(HttpClient);

    // Configuration - SHORTER TIMEOUTS for faster fallback
    private readonly apiBaseUrl = '/api/products';
    private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
    private readonly requestTimeout = 2000; // ⚡ REDUCED to 2 seconds from 10!
    private readonly maxRetries = 1; // ⚡ REDUCED retries for faster fallback

    // Cache storage
    private cachedProducts: {
        data: Product[];
        timestamp: number;
        filters?: ProductFilters;
    } | null = null;

    // 🎯 INSTANT MOCK DATA - matches GitHub Product interface EXACTLY
    private readonly instantMockProducts: Product[] = [
        {
            id: '1',
            name: 'Samsung Galaxy S24 Ultra 5G',
            price: 2299.00,
            imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Най-новият флагман с AI възможности, S Pen и 200MP камера',
            category: 'smartphones',
            inStock: true,
            longDescription: 'Революционни AI възможности, титаниев корпус, S Pen с нови функции',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop',
            badge: {
                text: 'NEW',
                color: 'primary',
                position: 'top-right'
            } as ProductBadge,
            discount: {
                originalPrice: 2499.00,
                percentage: 8
            } as ProductDiscount,
            createdAt: new Date('2024-01-15T10:00:00.000Z'),
            updatedAt: new Date('2024-01-15T10:00:00.000Z')
        },
        {
            id: '2',
            name: 'iPhone 15 Pro Max',
            price: 2599.00,
            imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Титаниев корпус, Action Button, A17 Pro чип с невероятна производителност',
            category: 'smartphones',
            inStock: true,
            longDescription: 'Action Button, титаниев дизайн, Pro камера система с 5x zoom',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1678911820207-61718c9c3595?w=800&h=600&fit=crop',
            badge: {
                text: 'TOP',
                color: 'warning',
                position: 'top-right'
            } as ProductBadge,
            discount: {
                originalPrice: 2799.00,
                percentage: 7
            } as ProductDiscount,
            createdAt: new Date('2024-01-10T10:00:00.000Z'),
            updatedAt: new Date('2024-01-10T10:00:00.000Z')
        },
        {
            id: '3',
            name: 'MacBook Pro 16" M3 Max',
            price: 5999.00,
            imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Върхови характеристики за професионалисти с M3 Max чип',
            category: 'laptops',
            inStock: false,
            longDescription: 'M3 Max чип, 48GB RAM, 2TB SSD, Liquid Retina XDR дисплей',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop',
            badge: {
                text: 'SOLD OUT',
                color: 'error',
                position: 'top-left'
            } as ProductBadge,
            // NO discount property = undefined (not null!)
            createdAt: new Date('2024-01-05T10:00:00.000Z'),
            updatedAt: new Date('2024-01-20T15:30:00.000Z')
        },
        {
            id: '4',
            name: 'Sony WH-1000XM5',
            price: 699.00,
            imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Безжични слушалки с водеща технология за потискане на шума',
            category: 'audio',
            inStock: true,
            longDescription: '30-часова батерия, HD аудио, интелигентно потискане на шума',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1590658165737-15a047b7cba4?w=800&h=600&fit=crop',
            badge: {
                text: 'SALE',
                color: 'success',
                position: 'top-right'
            } as ProductBadge,
            discount: {
                originalPrice: 799.00,
                percentage: 13
            } as ProductDiscount,
            createdAt: new Date('2024-01-12T10:00:00.000Z'),
            updatedAt: new Date('2024-01-12T10:00:00.000Z')
        },
        {
            id: '5',
            name: 'Dell XPS 13 Plus',
            price: 2199.00,
            imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Ултра-тънък лаптоп с безгранично OLED дисплей',
            category: 'laptops',
            inStock: true,
            longDescription: '13.4" OLED 3.5K, Intel Core i7-1360P, 32GB RAM, 1TB SSD',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
            badge: {
                text: 'NEW',
                color: 'primary',
                position: 'top-right'
            } as ProductBadge,
            // NO discount
            createdAt: new Date('2024-01-18T10:00:00.000Z'),
            updatedAt: new Date('2024-01-18T10:00:00.000Z')
        },
        {
            id: '6',
            name: 'iPad Pro 12.9" M2',
            price: 1999.00,
            imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=600&fit=crop&crop=center',
            shortDescription: 'Професионален таблет с M2 чип и Liquid Retina XDR дисплей',
            category: 'tablets',
            inStock: true,
            longDescription: 'M2 чип, 12.9" Liquid Retina XDR, поддръжка за Apple Pencil (2nd gen)',
            secondaryImageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&h=600&fit=crop',
            badge: {
                text: 'PRO',
                color: 'warning',
                position: 'top-left'
            } as ProductBadge,
            discount: {
                originalPrice: 2199.00,
                percentage: 9
            } as ProductDiscount,
            createdAt: new Date('2024-01-08T10:00:00.000Z'),
            updatedAt: new Date('2024-01-16T14:20:00.000Z')
        }
    ];

    // 🔧 DEVELOPMENT MODE DETECTION
    private readonly isDevelopmentMode = !this.isProduction();

    /**
     * 🚀 MAIN METHOD: Get products with INSTANT mock fallback
     * @param filters Optional product filtering (CORRECTED - matches GitHub ProductFilters)
     * @param forceRefresh Force API call bypassing cache
     * @returns Observable<Product[]>
     */
    getProducts(filters?: ProductFilters, forceRefresh = false): Observable<Product[]> {
        console.log('🔄 ProductApiService.getProducts()', { filters, forceRefresh, isDev: this.isDevelopmentMode });

        // ⚡ DEVELOPMENT MODE: Use instant mock data (NO API CALLS!)
        if (this.isDevelopmentMode) {
            console.log('🎯 DEVELOPMENT MODE: Using instant mock data!');
            return this.getInstantMockData(filters);
        }

        // Check cache validity
        if (!forceRefresh && this.isCacheValid(filters)) {
            console.log('📦 Using cached products');
            return of(this.cachedProducts!.data);
        }

        // Make API call with FAST error handling
        return this.http.get<ProductsApiResponse>(`${this.apiBaseUrl}`, {
            params: this.buildFilterParams(filters)
        }).pipe(
            timeout(this.requestTimeout), // ⚡ Only 2 seconds!
            retry(this.maxRetries), // ⚡ Only 1 retry!
            map(response => response.data || []),
            tap(products => {
                console.log(`✅ Fetched ${products.length} products from API`);
                this.updateCache(products, filters);
            }),
            catchError(error => this.handleApiError(error)), // ⚡ Fast fallback
            shareReplay(1)
        );
    }

    /**
     * 🎯 INSTANT MOCK DATA with CORRECTED filtering (matches GitHub ProductFilters)
     * @private
     */
    private getInstantMockData(filters?: ProductFilters): Observable<Product[]> {
        let products = [...this.instantMockProducts];

        // Apply filters if provided - CORRECTED according to GitHub ProductFilters interface
        if (filters) {
            if (filters.category) {
                products = products.filter(p => p.category === filters.category);
            }
            if (filters.inStock !== undefined) {
                products = products.filter(p => p.inStock === filters.inStock);
            }
            if (filters.minPrice !== undefined) {
                products = products.filter(p => p.price >= filters.minPrice!);
            }
            if (filters.maxPrice !== undefined) {
                products = products.filter(p => p.price <= filters.maxPrice!);
            }
            if (filters.hasDiscount !== undefined) {
                products = products.filter(p =>
                    filters.hasDiscount ? !!p.discount : !p.discount
                );
            }
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                products = products.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    p.shortDescription.toLowerCase().includes(term) ||
                    p.category.toLowerCase().includes(term)
                );
            }
        }

        console.log(`🎨 Instant mock data: ${products.length} products ready!`);

        // Simulate brief loading for realistic experience
        return timer(100).pipe( // 100ms delay for smooth UX
            map(() => products),
            tap(products => this.updateCache(products, filters))
        );
    }

    /**
     * 🔧 Environment detection
     * @private
     */
    private isProduction(): boolean {
        // Check various indicators for production
        return location.hostname !== 'localhost' &&
            location.hostname !== '127.0.0.1' &&
            !location.hostname.includes('dev') &&
            !location.hostname.includes('staging');
    }

    /**
     * Fetch single product by ID
     * @param id Product identifier
     * @returns Observable<Product>
     */
    getProductById(id: string): Observable<Product> {
        console.log(`🔍 ProductApiService.getProductById(${id})`);

        // ⚡ DEVELOPMENT MODE: Use instant mock data
        if (this.isDevelopmentMode) {
            const product = this.instantMockProducts.find(p => p.id === id);
            if (product) {
                console.log('🎯 Found product in instant mock data');
                return of(product);
            } else {
                return throwError(() => new Error(`Product with ID ${id} not found in mock data`));
            }
        }

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
                const mockProduct = this.instantMockProducts.find(p => p.id === id);
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

        // Return instant mock data as fallback
        console.log('🔄 Falling back to instant mock data for TV slideshow');
        this.updateCache(this.instantMockProducts);
        return of(this.instantMockProducts);
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
     * Build HTTP params from filters (CORRECTED - matches GitHub ProductFilters)
     * @private
     */
    private buildFilterParams(filters?: ProductFilters): any {
        if (!filters) return {};

        const params: any = {};

        if (filters.category) params.category = filters.category;
        if (filters.inStock !== undefined) params.inStock = filters.inStock.toString();
        if (filters.minPrice !== undefined) params.minPrice = filters.minPrice.toString();
        if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice.toString();
        if (filters.searchTerm) params.searchTerm = filters.searchTerm;
        if (filters.hasDiscount !== undefined) params.hasDiscount = filters.hasDiscount.toString();

        return params;
    }
}