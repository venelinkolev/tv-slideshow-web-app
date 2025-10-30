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
import { convertBgnToEur, shouldShowEurCurrency } from '@core/utils/currency.utils';

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

    // State signals (private writable)
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

    /**
     * Menu dynamic styles for CSS custom properties
     * Computed from fontSize and columnCount signals
     */
    protected readonly menuStyles = computed(() => ({
        '--menu-font-size': `${this.fontSize()}px`,
        '--menu-column-count': `${this.columnCount()}`
    }));

    ngOnInit(): void {
        console.log('🍽️ MenuTemplateComponent.ngOnInit() - Initializing menu template');
        this.loadMenuData();

        // ✅ Listen for config changes from admin panel (cross-tab)
        this.configService.getConfigChanges$()
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                console.log('🔔 MenuTemplate: Config changed in admin panel, reloading...');
                this.loadMenuData();
            });
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
     * Apply menu configuration (filtering, background, font size, columns)
     */
    private applyMenuConfiguration(menuConfig: MenuTemplateConfig): void {
        console.log('⚙️ Applying menu configuration:', menuConfig);

        // Get current slide (MVP: always first slide)
        const currentSlide = menuConfig.slides[0];
        if (!currentSlide) {
            this.handleError('No slides configured in menu template');
            return;
        }

        // Filter groups and products based on selections
        const allGroups = this.allGroupsSignal();
        const filtered = filterGroupsBySelection(allGroups, currentSlide.groupSelections);

        console.log(`🔍 Filtered to ${filtered.length} groups from ${allGroups.length} total`);
        this.filteredGroupsSignal.set(filtered);

        // Set background image
        const backgroundProductId = currentSlide.backgroundProductId || menuConfig.backgroundProductId;
        if (backgroundProductId) {
            this.setBackgroundImage(backgroundProductId, allGroups);
        }

        // Calculate content metrics
        const groupCount = filtered.length;
        const totalProducts = getTotalProductCount(filtered);
        const fontConfig = menuConfig.fontScaling;

        // Calculate column count FIRST (considering both groups and products)
        const columns = calculateColumnCount(
            groupCount,
            totalProducts,
            undefined,  // screenWidth - let function use window.innerWidth
            menuConfig.columnControl  // ✨ Pass column control config
        );

        // Log column control details if present
        if (menuConfig.columnControl) {
            if (menuConfig.columnControl.manualOverride.enabled) {
                console.log(`🎛️ Manual column override active: adjustment ${menuConfig.columnControl.manualOverride.adjustment}`);
            } else {
                const opts = menuConfig.columnControl.autoOptimizations;
                console.log(`🤖 Auto optimizations active:`, {
                    preventEmpty: opts.preventEmptyColumns,
                    preventOverflow: opts.preventOverflow,
                    fullWidth: opts.optimizeForFullWidth,
                    threshold: opts.densityThreshold
                });
            }
        }

        console.log(`📊 Column count: ${columns} (groups: ${groupCount}, products: ${totalProducts})`);
        this.columnCountSignal.set(columns);

        // Calculate font size SECOND (now considering column count)
        const calculatedFontSize = calculateOptimalFontSize(
            groupCount,
            totalProducts,
            fontConfig.autoScale,
            fontConfig.manualFontSize,
            { min: fontConfig.minFontSize, max: fontConfig.maxFontSize },
            columns
        );

        console.log(`📏 Font size: ${calculatedFontSize}px (groups: ${groupCount}, products: ${totalProducts}, columns: ${columns})`);
        this.fontSizeSignal.set(calculatedFontSize);

        console.log('✅ Menu configuration applied successfully');
    }

    /**
     * Set background image from product
     */
    private setBackgroundImage(productId: string, groups: ProductGroupWithProducts[]): void {
        const product = findProductById(groups, productId);

        if (product && product.imageUrl) {
            console.log(`🖼️ Setting background from product: ${product.name}`);
            this.backgroundImageUrlSignal.set(product.imageUrl);
        } else {
            console.warn(`⚠️ Background product not found (ID: ${productId}), using fallback`);
            this.backgroundImageUrlSignal.set('/assets/images/menu-default-background.jpg');
        }
    }

    /**
     * Handle errors
     */
    private handleError(message: string): void {
        console.error(`❌ MenuTemplate Error: ${message}`);
        this.errorMessageSignal.set(message);
        this.isLoadingSignal.set(false);
    }

    /**
     * Format price for display (Bulgarian format)
     */
    protected formatPrice(price: number): string {
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    }

    /**
     * Format price in EUR (temporary promotional feature)
     * Returns null if EUR display is disabled
     */
    protected formatPriceEur(price: number): string | null {
        if (!shouldShowEurCurrency()) {
            return null;
        }
        return convertBgnToEur(price);
    }

    /**
     * Handle image loading errors
     */
    protected onImageError(event: Event): void {
        console.warn('⚠️ Background image failed to load, using fallback');
        this.backgroundImageUrlSignal.set('/assets/images/menu-default-background.jpg');
    }

    /**
     * Retry loading data (for error state button)
     */
    public retry(): void {
        console.log('🔄 Retrying menu data load...');
        this.loadMenuData();
    }
}