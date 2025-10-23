// CORRECTED ProductApiService - Matches GitHub Architecture
// src/app/core/services/product-api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, timer, forkJoin } from 'rxjs';
import { catchError, retry, timeout, tap, shareReplay, map } from 'rxjs/operators';

import { environment } from '@environments/environment';

import {
    Product,
    ProductFilters,
    ProductsApiResponse,
    ProductApiResponse,
    ProductBadge,
    ProductDiscount,
    GetStocksRequest,
    GetStocksResponse,
    StockItem,
    ProductGroup,
    GetGroupsResponse,
    ProductGroupWithProducts,
    GroupsWithProductsResponse,
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
     * Get all products (with Real API + Mock fallback)
     * 
     * Strategy:
     * 1. Check cache first (5 minute TTL + filter match)
     * 2. Try Real API (getProductsFromRealApi)
     * 3. On error → Fallback to Mock data
     * 4. Cache successful result
     * 
     * @param filters - Optional filtering criteria
     * @param forceRefresh - Force API call bypassing cache
     * @returns Observable<Product[]> - Array of products
     */
    getProducts(filters?: ProductFilters, forceRefresh = false): Observable<Product[]> {
        console.log('📦 ProductApiService.getProducts() called', { filters, forceRefresh });

        // 1️⃣ Check cache first (using existing helper with filters support)
        if (!forceRefresh && this.isCacheValid(filters)) {
            console.log('✅ Returning cached products');
            return of(this.cachedProducts!.data);
        }

        console.log('🔄 Cache miss or expired, fetching products...');

        // 2️⃣ Try Real API first
        return this.getProductsFromRealApi().pipe(
            // Success → Cache and return
            tap(products => {
                console.log('✅ Real API successful, caching products');
                // Use existing helper with filters parameter
                this.updateCache(products, filters);
            }),

            // Error → Fallback to Mock data
            catchError(error => {
                console.warn('⚠️ Real API failed, falling back to mock data');
                console.error('Real API Error:', error);

                // 3️⃣ Fallback to Mock data (use existing getMockProducts if available)
                // Check if getMockProducts exists, otherwise use instant mock
                return this.getMockProductsFallback(filters).pipe(
                    tap(mockProducts => {
                        console.log('✅ Mock data loaded as fallback');
                        // Cache mock data with filters
                        this.updateCache(mockProducts, filters);
                    }),
                    catchError(mockError => {
                        console.error('❌ Even mock data failed!', mockError);
                        // Last resort: return empty array
                        return of([]);
                    })
                );
            })
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
    * Helper: Get mock products fallback
    * Uses existing getMockProducts method or instant mock data
    * @private
    */
    private getMockProductsFallback(filters?: ProductFilters): Observable<Product[]> {
        // If you have getMockProducts method, use it
        // Otherwise return instant mock data
        if (this.instantMockProducts && this.instantMockProducts.length > 0) {
            console.log('📦 Using instantMockProducts as fallback');
            return of(this.instantMockProducts);
        }

        // Fallback to empty array
        return of([]);
    }

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

    /**
        * 🆕 Get products from REAL API (/getstockslite endpoint)
        * Fetches products from API3.eyanak.com and maps to Product[] interface
        * 
        * Features:
        * - POST request to /getstockslite with get_pictures: true
        * - Authorization header added automatically by AuthInterceptor
        * - 2 second timeout for fast fallback
        * - 1 retry attempt on failure
        * - Maps StockItem[] to Product[] using mapper
        * - Robust error handling for backend errors
        * 
        * @returns Observable<Product[]> - Array of products from API
        */
    getProductsFromRealApi(): Observable<Product[]> {
        console.log('🌐 ProductApiService.getProductsFromRealApi() - Fetching from real API...');

        // Construct full API URL
        const apiUrl = `${environment.apiUrl}${environment.endpoints.getStocks}`;
        console.log('📡 API URL:', apiUrl);

        // Prepare request body
        const requestBody: GetStocksRequest = {
            get_pictures: true
        };

        // Make POST request to API
        return this.http.post<GetStocksResponse>(apiUrl, requestBody).pipe(
            // Apply timeout (2 seconds for fast fallback)
            timeout(this.requestTimeout),

            // Retry once on failure
            retry({
                count: this.maxRetries,
                delay: (error, retryCount) => {
                    console.warn(`⚠️ API request failed, retry ${retryCount}/${this.maxRetries}`, error);
                    return timer(1000); // 1 second delay before retry
                }
            }),

            // Map API response to Product[]
            map((response: GetStocksResponse) => {
                console.log('✅ Real API response received');

                // 🔧 IMPROVED: Check for API error (with better handling)
                if (response.error) {
                    const errorMsg = typeof response.error === 'string'
                        ? response.error.trim()
                        : JSON.stringify(response.error);

                    if (errorMsg && errorMsg !== '' && errorMsg !== '0') {
                        console.error('❌ API returned error:', errorMsg);
                        throw new Error(`API Error: ${errorMsg}`);
                    }
                }

                // 🔧 IMPROVED: Check if items exist and is an array
                if (!response.items) {
                    console.error('❌ API response missing items field (null or undefined)');
                    throw new Error('API response missing items array');
                }

                if (!Array.isArray(response.items)) {
                    console.error('❌ API response items is not an array:', typeof response.items);
                    throw new Error('Invalid API response structure: items is not an array');
                }

                // 🔧 IMPROVED: Check if items array is empty
                if (response.items.length === 0) {
                    console.warn('⚠️ API returned empty items array');
                    return []; // Return empty array instead of throwing error
                }

                console.log(`📦 Received ${response.items.length} products from API`);

                // Map StockItem[] to Product[]
                const products = response.items.map(item => this.mapStockItemToProduct(item));

                console.log(`✅ Mapped ${products.length} products successfully`);
                return products;
            }),

            // Error handling
            catchError((error: HttpErrorResponse) => {
                console.error('❌ ProductApiService.getProductsFromRealApi() - Error:', error);

                // Log detailed error info
                if (error.status === 0) {
                    console.error('🔌 Network error - unable to reach API server');
                } else if (error.status === 401) {
                    console.error('🔒 Unauthorized - token may be invalid or expired');
                } else if (error.status === 404) {
                    console.error('🔍 Endpoint not found - check API URL');
                } else if (error.status) {
                    console.error(`⚠️ HTTP Error ${error.status}: ${error.statusText}`);
                } else {
                    console.error(`⚠️ HTTP Error undefined: ${error.message || 'Unknown error'}`);
                }

                // Re-throw error for fallback handling
                return throwError(() => new Error(`Failed to fetch products from API: ${error.message}`));
            }),

            // Share replay for multiple subscribers
            shareReplay(1)
        );
    }

    /**
     * 🆕 Get product groups from REAL API (/groups endpoint)
     * Fetches product categories/groups from API3.eyanak.com
     * 
     * Features:
     * - GET request to /groups endpoint
     * - Authorization header added automatically by AuthInterceptor
     * - 2 second timeout for fast fallback
     * - 1 retry attempt on failure
     * - Returns ProductGroup[] directly (no mapping needed for now)
     * - Robust error handling for backend errors
     * 
     * @returns Observable<ProductGroup[]> - Array of product groups from API
     */
    getProductGroups(): Observable<ProductGroup[]> {
        console.log('🏷️ ProductApiService.getProductGroups() - Fetching from real API...');

        // Construct full API URL
        const apiUrl = `${environment.apiUrl}${environment.endpoints.groups}`;
        console.log('📡 API URL:', apiUrl);

        // Make GET request to API
        return this.http.get<GetGroupsResponse>(apiUrl).pipe(
            // Apply timeout (2 seconds for fast fallback)
            timeout(this.requestTimeout),

            // Retry once on failure
            retry({
                count: this.maxRetries,
                delay: (error, retryCount) => {
                    console.warn(`⚠️ Groups API request failed, retry ${retryCount}/${this.maxRetries}`, error);
                    return timer(1000); // 1 second delay before retry
                }
            }),

            // Map API response to ProductGroup[]
            map((response: GetGroupsResponse) => {
                console.log('✅ Groups API response received');

                // Check for API error
                if (response.error && response.error.message) {
                    const errorMsg = response.error.message.trim();
                    if (errorMsg && errorMsg !== '' && errorMsg !== '0') {
                        console.error('❌ Groups API returned error:', errorMsg);
                        throw new Error(`API Error: ${errorMsg}`);
                    }
                }

                // Check if items exist and is an array
                if (!response.items) {
                    console.error('❌ Groups API response missing items field');
                    throw new Error('Groups API response missing items array');
                }

                if (!Array.isArray(response.items)) {
                    console.error('❌ Groups API response items is not an array:', typeof response.items);
                    throw new Error('Invalid Groups API response structure: items is not an array');
                }

                // Check if items array is empty
                if (response.items.length === 0) {
                    console.warn('⚠️ Groups API returned empty items array');
                    return []; // Return empty array instead of throwing error
                }

                console.log(`📦 Received ${response.items.length} product groups from API`);

                // Return groups directly (no mapping needed for now)
                return response.items;
            }),

            // Error handling
            catchError((error: HttpErrorResponse) => {
                console.error('❌ ProductApiService.getProductGroups() - Error:', error);

                // Log detailed error info
                if (error.status === 0) {
                    console.error('🔌 Network error - unable to reach Groups API server');
                } else if (error.status === 401) {
                    console.error('🔒 Unauthorized - token may be invalid or expired');
                } else if (error.status === 404) {
                    console.error('🔍 Groups endpoint not found - check API URL');
                } else if (error.status) {
                    console.error(`⚠️ HTTP Error ${error.status}: ${error.statusText}`);
                } else {
                    console.error(`⚠️ HTTP Error: ${error.message || 'Unknown error'}`);
                }

                // Re-throw error (fallback handling can be added later if needed)
                return throwError(() => new Error(`Failed to fetch product groups from API: ${error.message}`));
            }),

            // Share replay for multiple subscribers
            shareReplay(1)
        );
    }

    /**
     * 🆕 Get product groups WITH their associated products
     * Combines groups and products data into a unified response
     * 
     * Features:
     * - Parallel API calls using forkJoin (groups + products)
     * - Maps products to their respective groups by gr_id
     * - Returns enriched groups with product arrays
     * - Calculates statistics (total products, empty groups, etc.)
     * - Robust error handling for both API calls
     * 
     * Flow:
     * 1. Fetch groups from /groups endpoint
     * 2. Fetch products from /getstockslite endpoint (parallel)
     * 3. Map products to groups using helper method
     * 4. Build response with statistics
     * 
     * @returns Observable<GroupsWithProductsResponse> - Groups with mapped products
     */
    getGroupsWithProducts(): Observable<GroupsWithProductsResponse> {
        console.log('🔗 ProductApiService.getGroupsWithProducts() - Fetching groups with products...');

        // Execute parallel API calls using forkJoin
        return forkJoin({
            groups: this.getProductGroups(),
            products: this.getProductsFromRealApi()
        }).pipe(
            // Map the combined results
            map(({ groups, products }) => {
                console.log(`✅ Received ${groups.length} groups and ${products.length} products`);

                // Map products to their respective groups
                const groupsWithProducts = this.mapProductsToGroups(groups, products);

                // Calculate statistics
                const totalProducts = products.length;
                const totalGroups = groups.length;
                const emptyGroupsCount = groupsWithProducts.filter(g => g.group_products.length === 0).length;

                console.log(`📊 Statistics: ${totalProducts} products, ${totalGroups} groups, ${emptyGroupsCount} empty groups`);

                // Build response
                const response: GroupsWithProductsResponse = {
                    success: true,
                    error: {
                        code: 0,
                        message: ''
                    },
                    data: groupsWithProducts,
                    totalProducts,
                    totalGroups,
                    emptyGroupsCount,
                    mappedAt: new Date()
                };

                return response;
            }),

            // Error handling
            catchError((error: any) => {
                console.error('❌ ProductApiService.getGroupsWithProducts() - Error:', error);

                // Return error response
                const errorResponse: GroupsWithProductsResponse = {
                    success: false,
                    error: {
                        code: error.status || -1,
                        message: error.message || 'Failed to fetch groups with products'
                    },
                    data: [],
                    totalProducts: 0,
                    totalGroups: 0,
                    emptyGroupsCount: 0,
                    mappedAt: new Date()
                };

                return of(errorResponse);
            }),

            // Share replay for multiple subscribers
            shareReplay(1)
        );
    }

    /**
     * 🔧 HELPER: Map products to their respective groups
     * Maps Product[] to ProductGroup[] based on gr_id matching
     * 
     * @param groups - Array of ProductGroup from API
     * @param products - Array of Product from API
     * @returns ProductGroupWithProducts[] - Groups with mapped products
     * @private
     */
    private mapProductsToGroups(
        groups: ProductGroup[],
        products: Product[]
    ): ProductGroupWithProducts[] {
        console.log('🗺️ Mapping products to groups...');

        return groups.map(group => {
            // Filter products that belong to this group
            // Match: product.category (string) === group.id.toString()
            const groupProducts = products.filter(
                product => product.category === group.id.toString()
            );

            console.log(`  📦 Group "${group.name}" (ID: ${group.id}): ${groupProducts.length} products`);

            // Return group with products
            return {
                ...group,  // Spread all fields from ProductGroup
                group_products: groupProducts  // Add products array
            };
        });
    }

    /**
     * 🆕 MAPPER: Convert StockItem from API to Product interface
     * Maps API response structure to internal Product model
     * 
     * @param item - StockItem from /getstockslite API response
     * @returns Product object ready for slideshow display
     */
    private mapStockItemToProduct(item: StockItem): Product {
        // Map basic fields
        const product: Product = {
            // ID: Convert number to string
            id: item.stk_idnumb.toString(),

            // Name: Primary product name
            name: item.stk_name || 'Продукт без име',

            // Price: Current selling price
            price: item.price || 0,

            // Image: Convert Base64 to Data URL
            imageUrl: this.convertBase64ToDataUrl(item.image),

            // Short Description: Use description field, fallback to name
            shortDescription: item.description || item.stk_name || '',

            // Category: Convert group ID to string
            category: item.gr_id ? item.gr_id.toString() : 'uncategorized',

            // ⚠️ CRITICAL: inStock is ALWAYS true (no quantity filtering!)
            inStock: true,

            // Optional: Long description (use description_2 if available)
            longDescription: item.description_2 || undefined,

            // Optional: Secondary image (not provided by API currently)
            secondaryImageUrl: undefined,

            // Optional: Calculate discount if basic_price > price
            discount: this.calculateDiscount(item.basic_price, item.price),

            // Optional: Create badge based on discount or other criteria
            badge: this.createBadge(item),

            // Optional: Display settings (not provided by API)
            displaySettings: undefined,

            // Timestamps (not provided by API, set to current time)
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return product;
    }

    /**
     * 🆕 HELPER: Convert Base64 string to Data URL format
     * Converts API Base64 image to browser-readable data URL
     * @param base64 - Base64 encoded image string from API
     * @returns Data URL string (data:image/png;base64,...)
     */
    private convertBase64ToDataUrl(base64: string): string {
        if (!base64 || base64.trim() === '') {
            console.warn('⚠️ Empty Base64 image provided, returning placeholder');
            return '/assets/images/product-placeholder.jpg';
        }

        // Remove any whitespace
        const cleanBase64 = base64.trim();

        // Check if already has data URL prefix
        if (cleanBase64.startsWith('data:image')) {
            return cleanBase64;
        }

        // Add data URL prefix (assuming PNG, but works for JPEG too)
        return `data:image/png;base64,${cleanBase64}`;
    }

    /**
     * 🆕 HELPER: Calculate discount information
     * Compares basic_price with current price to determine discount
     * @param basicPrice - Original price from API
     * @param currentPrice - Current/sale price from API
     * @returns ProductDiscount object or undefined if no discount
     */
    private calculateDiscount(basicPrice: number, currentPrice: number): ProductDiscount | undefined {
        // Validate prices
        if (!basicPrice || !currentPrice || basicPrice <= 0 || currentPrice <= 0) {
            return undefined;
        }

        // No discount if current price >= basic price
        if (currentPrice >= basicPrice) {
            return undefined;
        }

        // Calculate discount percentage
        const discountAmount = basicPrice - currentPrice;
        const discountPercentage = Math.round((discountAmount / basicPrice) * 100);

        // Only show discount if >= 1%
        if (discountPercentage < 1) {
            return undefined;
        }

        return {
            originalPrice: basicPrice,
            percentage: discountPercentage,
            // Optional: Set valid until (not provided by API, so omitted)
        };
    }

    /**
     * 🆕 HELPER: Create product badge based on stock item data
     * Determines if product should have a badge (NEW, SALE, etc.)
     * @param item - StockItem from API
     * @returns ProductBadge object or undefined
     */
    private createBadge(item: StockItem): ProductBadge | undefined {
        // Badge logic based on discount
        if (item.basic_price && item.price && item.basic_price > item.price) {
            const discountPercentage = Math.round(
                ((item.basic_price - item.price) / item.basic_price) * 100
            );

            // Show SALE badge for discounts >= 10%
            if (discountPercentage >= 10) {
                return {
                    text: `${discountPercentage}%`,
                    color: 'error', // Red for sale
                    position: 'top-right'
                };
            }
        }

        // Future: Add logic for NEW badge based on createdAt timestamp
        // Future: Add logic for TOP badge based on popularity
        // For now, only discount badges are supported

        return undefined;
    }
}