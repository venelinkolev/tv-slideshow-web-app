// src/app/features/templates/menu/menu-template.component.ts

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Core services
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';

// Models
import { ProductGroupWithProducts } from '@core/models/api/product-group.interface';
import { Product, MenuTemplateConfig } from '@core/models';

// Helpers
import {
    calculateOptimalFontSize,
    calculateColumnCount,
    filterGroupsBySelection,
    findProductById,
    validateMenuConfig,
    getTotalProductCount
} from './helpers/menu-template-helpers';

/**
 * Menu Template Component
 * 
 * Displays products organized by groups in a restaurant/cafe menu style
 * 
 * 🎨 DESIGN FEATURES:
 * - Full-screen background from selected product image
 * - Groups displayed in columns with products listed under each
 * - Dynamic font scaling based on content volume
 * - White overlay with 50% opacity for readability
 * - TV-optimized layout for 24/7 commercial display
 * 
 * 📐 LAYOUT:
 * - Background: Full-screen product image (blurred & darkened)
 * - Overlay: White 50% opacity
 * - Columns: Auto-fit based on group count (2-6 columns)
 * - Font: Auto-scaled or manual (16-48px range)
 */
@Component({
    selector: 'app-menu-template',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './menu-template.component.html',
    styleUrl: './menu-template.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuTemplateComponent implements OnInit, OnDestroy {
    // Template identification
    readonly templateName = 'menu';
    readonly displayName = 'Меню';

    // Service injection
    private readonly productApiService = inject(ProductApiService);
    private readonly configService = inject(ConfigService);

    // Lifecycle management
    private readonly destroy$ = new Subject<void>();

    // State signals
    private readonly allGroupsSignal = signal<ProductGroupWithProducts[]>([]);
    private readonly filteredGroupsSignal = signal<ProductGroupWithProducts[]>([]);
    private readonly backgroundImageUrlSignal = signal<string>('');
    private readonly fontSizeSignal = signal<number>(36);
    private readonly columnCountSignal = signal<number>(3);
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');

    // Public readonly signals
    readonly allGroups = this.allGroupsSignal.asReadonly();
    readonly filteredGroups = this.filteredGroupsSignal.asReadonly();
    readonly backgroundImageUrl = this.backgroundImageUrlSignal.asReadonly();
    readonly fontSize = this.fontSizeSignal.asReadonly();
    readonly columnCount = this.columnCountSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();

    // Computed signals
    readonly hasError = computed(() => this.errorMessage().length > 0);
    readonly hasGroups = computed(() => this.filteredGroups().length > 0);
    readonly totalProducts = computed(() => getTotalProductCount(this.filteredGroups()));
    readonly isReady = computed(() => !this.isLoading() && !this.hasError() && this.hasGroups());

    // Grid template columns for CSS
    readonly gridTemplateColumns = computed(() => {
        const cols = this.columnCount();
        return `repeat(${cols}, 1fr)`;
    });

    ngOnInit(): void {
        console.log('🍽️ MenuTemplateComponent.ngOnInit() - Initializing menu template');
        this.loadMenuData();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load menu configuration and data from API
     */
    private loadMenuData(): void {
        console.log('📂 Loading menu data...');
        this.isLoadingSignal.set(true);
        this.errorMessageSignal.set('');

        // Get current config
        const config = this.configService.config();
        const menuConfig = config.templates.templateSpecificConfig?.menu;

        // Validate menu config exists
        if (!menuConfig) {
            this.handleError('Menu configuration not found. Please configure the menu in admin panel.');
            return;
        }

        // Validate menu config structure
        const validation = validateMenuConfig(menuConfig);
        if (!validation.isValid) {
            this.handleError(`Invalid menu configuration: ${validation.errors.join(', ')}`);
            return;
        }

        // Load groups with products from API
        this.productApiService.getGroupsWithProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('✅ Groups with products loaded:', response);

                    if (!response.success) {
                        this.handleError('Failed to load product groups');
                        return;
                    }

                    // Store all groups
                    this.allGroupsSignal.set(response.data);

                    // Apply filters and settings
                    this.applyMenuConfiguration(menuConfig);

                    this.isLoadingSignal.set(false);
                },
                error: (error) => {
                    console.error('❌ Error loading groups with products:', error);
                    this.handleError('Failed to load menu data. Please try again.');
                }
            });
    }

    /**
     * Apply menu configuration (filters, background, fonts)
     */
    private applyMenuConfiguration(config: MenuTemplateConfig): void {
        console.log('⚙️ Applying menu configuration...', config);

        // Get current slide (MVP: always first slide)
        const currentSlide = config.slides[0];

        if (!currentSlide) {
            this.handleError('No slide configuration found');
            return;
        }

        // Filter groups and products based on selections
        const filtered = filterGroupsBySelection(
            this.allGroupsSignal(),
            currentSlide.groupSelections
        );

        this.filteredGroupsSignal.set(filtered);

        // Set background image
        this.setBackgroundImage(config.backgroundProductId);

        // Calculate font size
        const groupCount = filtered.length;
        const productCount = getTotalProductCount(filtered);

        const fontSize = calculateOptimalFontSize(
            groupCount,
            productCount,
            config.fontScaling.autoScale,
            config.fontScaling.manualFontSize,
            {
                min: config.fontScaling.minFontSize,
                max: config.fontScaling.maxFontSize
            }
        );

        this.fontSizeSignal.set(fontSize);

        // Calculate column count
        const columns = calculateColumnCount(groupCount);
        this.columnCountSignal.set(columns);

        console.log('📊 Menu configuration applied:', {
            groups: groupCount,
            products: productCount,
            fontSize,
            columns
        });
    }

    /**
     * Set background image from product ID
     */
    private setBackgroundImage(productId: string): void {
        if (!productId) {
            console.warn('⚠️ No background product ID specified');
            this.backgroundImageUrlSignal.set('/assets/images/menu-default-background.jpg');
            return;
        }

        // Find product by ID
        const product = findProductById(this.allGroupsSignal(), productId);

        if (product && product.imageUrl) {
            this.backgroundImageUrlSignal.set(product.imageUrl);
            console.log('🖼️ Background image set:', product.imageUrl);
        } else {
            console.warn('⚠️ Background product not found, using default');
            this.backgroundImageUrlSignal.set('/assets/images/menu-default-background.jpg');
        }
    }

    /**
     * Handle errors during data loading
     */
    private handleError(message: string): void {
        console.error('❌ Menu Template Error:', message);
        this.errorMessageSignal.set(message);
        this.isLoadingSignal.set(false);
    }

    /**
     * Format price for display (Bulgarian format)
     */
    formatPrice(price: number): string {
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }

    /**
     * Handle image loading errors
     */
    onImageError(event: Event): void {
        console.warn('⚠️ Background image failed to load');
        const img = event.target as HTMLImageElement;
        if (img) {
            img.src = '/assets/images/menu-default-background.jpg';
        }
    }

    /**
     * Retry loading menu data
     */
    retry(): void {
        console.log('🔄 Retrying menu data load...');
        this.loadMenuData();
    }
}