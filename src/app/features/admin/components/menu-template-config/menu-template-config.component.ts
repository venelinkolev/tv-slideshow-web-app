// src/app/features/admin/components/menu-template-config/menu-template-config.component.ts

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    Output,
    EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';

// Core services
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';

// Models
import {
    ProductGroupWithProducts,
    GroupsWithProductsResponse
} from '@core/models/api/product-group.interface';
import {
    MenuTemplateConfig,
    MenuSlide,
    MenuGroupSelection,
    FontScalingConfig,
    ColumnControlConfig,
    ManualOverrideConfig,
    AutoOptimizationsConfig,
    DEFAULT_MENU_CONFIG
} from '@core/models/menu-template-config.interface';

// Import helper functions
import { calculateColumnCount } from '@features/templates/menu/helpers/menu-template-helpers';

/**
 * Menu Template Configuration Component
 * 
 * Отговорности:
 * - Зареждане на всички групи с продукти от API
 * - Background product selection с preview
 * - Group/Product tree selection с checkboxes
 * - Font scaling configuration (auto/manual)
 * - Real-time preview на font size
 * - Emit configuration changes to parent
 * 
 * Features:
 * - Hierarchical group/product selection
 * - Background image preview
 * - Font size estimation
 * - Auto-save with debouncing
 * - Error handling and loading states
 */
@Component({
    selector: 'app-menu-template-config',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        // Angular Material modules
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatCheckboxModule,
        MatSliderModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDividerModule,
        MatExpansionModule,
        MatRadioModule,
    ],
    templateUrl: './menu-template-config.component.html',
    styleUrl: './menu-template-config.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuTemplateConfigComponent implements OnInit, OnDestroy {
    // Event emitters
    @Output() configChange = new EventEmitter<MenuTemplateConfig>();
    @Output() configValid = new EventEmitter<boolean>();

    // Service injection
    private readonly productApiService = inject(ProductApiService);
    private readonly configService = inject(ConfigService);
    private readonly snackBar = inject(MatSnackBar);

    // Lifecycle management
    private readonly destroy$ = new Subject<void>();
    private readonly configChange$ = new Subject<MenuTemplateConfig>();

    // State signals
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly hasErrorSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');
    private readonly isSavingSignal = signal<boolean>(false);

    // Data signals
    private readonly allGroupsSignal = signal<ProductGroupWithProducts[]>([]);
    private readonly backgroundProductIdSignal = signal<string>('');
    private readonly selectedGroupIdsSignal = signal<number[]>([]);
    private readonly selectedProductIdsSignal = signal<Record<number, string[]>>({});
    private readonly autoScaleSignal = signal<boolean>(true);
    private readonly manualFontSizeSignal = signal<number>(36);

    // Column Control Signals
    private readonly manualOverrideEnabledSignal = signal<boolean>(false);
    private readonly manualAdjustmentSignal = signal<-1 | 0 | 1>(0);
    private readonly preventEmptyColumnsSignal = signal<boolean>(true);
    private readonly preventOverflowSignal = signal<boolean>(true);
    private readonly optimizeFullWidthSignal = signal<boolean>(false);
    private readonly densityThresholdSignal = signal<number>(0.80);

    // Public readonly signals
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly hasError = this.hasErrorSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();
    readonly isSaving = this.isSavingSignal.asReadonly();
    readonly allGroups = this.allGroupsSignal.asReadonly();
    readonly backgroundProductId = this.backgroundProductIdSignal.asReadonly();
    readonly selectedGroupIds = this.selectedGroupIdsSignal.asReadonly();
    readonly selectedProductIds = this.selectedProductIdsSignal.asReadonly();
    readonly autoScale = this.autoScaleSignal.asReadonly();
    readonly manualFontSize = this.manualFontSizeSignal.asReadonly();

    // Column Control Public Accessors
    readonly manualOverrideEnabled = this.manualOverrideEnabledSignal.asReadonly();
    readonly manualAdjustment = this.manualAdjustmentSignal.asReadonly();
    readonly preventEmptyColumns = this.preventEmptyColumnsSignal.asReadonly();
    readonly preventOverflow = this.preventOverflowSignal.asReadonly();
    readonly optimizeFullWidth = this.optimizeFullWidthSignal.asReadonly();
    readonly densityThreshold = this.densityThresholdSignal.asReadonly();

    // Computed signals
    readonly availableProducts = computed(() => {
        const groups = this.allGroups();
        const allProducts: Array<{ id: string; name: string; groupId: number; groupName: string }> = [];

        groups.forEach(group => {
            group.group_products.forEach(product => {
                allProducts.push({
                    id: product.id,
                    name: product.name,
                    groupId: group.id,
                    groupName: group.name
                });
            });
        });

        return allProducts;
    });

    readonly backgroundProduct = computed(() => {
        const productId = this.backgroundProductIdSignal();
        if (!productId) return null;

        return this.availableProducts().find(p => p.id === productId) || null;
    });

    readonly selectedGroups = computed(() => {
        const groupIds = this.selectedGroupIdsSignal();
        return this.allGroups().filter(group => groupIds.includes(group.id));
    });

    readonly totalSelectedProducts = computed(() => {
        const productIds = this.selectedProductIdsSignal();
        return Object.values(productIds).reduce((total, ids) => total + ids.length, 0);
    });

    readonly estimatedFontSize = computed(() => {
        const groupCount = this.selectedGroupIdsSignal().length;
        const productCount = this.totalSelectedProducts();

        if (this.autoScaleSignal()) {
            // ✅ Synced with calculateOptimalFontSize() - Non-linear algorithm
            const MIN_SIZE = 12;
            const MAX_SIZE = 48;
            const GROUP_HEADER_WEIGHT = 1.5;
            const MIN_UNITS = 5;
            const MAX_UNITS = 55;

            // Calculate effective units
            const effectiveUnits = productCount + (groupCount * GROUP_HEADER_WEIGHT);

            // Calculate expected column count (same logic as display component)
            const columnCount = calculateColumnCount(groupCount, productCount);

            // Normalize and calculate scale factor
            const clampedUnits = Math.max(MIN_UNITS, Math.min(MAX_UNITS, effectiveUnits));
            const normalizedUnits = (clampedUnits - MIN_UNITS) / (MAX_UNITS - MIN_UNITS);
            const scaleFactor = 1 - Math.pow(normalizedUnits, 0.3);

            // Calculate base size
            const fontRange = MAX_SIZE - MIN_SIZE;
            let calculatedSize = MIN_SIZE + (fontRange * scaleFactor);

            // ✅ Column adjustment (same as calculateOptimalFontSize)
            let columnAdjustment = 0;
            if (columnCount >= 6) columnAdjustment = -4;
            else if (columnCount === 5) columnAdjustment = -3;
            else if (columnCount === 4) columnAdjustment = -2;
            else if (columnCount === 3) columnAdjustment = -1;

            calculatedSize += columnAdjustment;

            // ✅ Density compensation (same as calculateOptimalFontSize)
            if (columnCount <= 3 && productCount > 30) {
                const productsPerColumn = productCount / columnCount;
                if (productsPerColumn > 12) {
                    const densityAdjustment = -Math.min(3, Math.floor((productsPerColumn - 12) * 0.3));
                    calculatedSize += densityAdjustment;
                }
            }

            return Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, calculatedSize)));
        } else {
            return this.manualFontSizeSignal();
        }
    });

    readonly isConfigValid = computed(() => {
        return this.backgroundProductIdSignal().length > 0 &&
            this.selectedGroupIdsSignal().length > 0 &&
            this.totalSelectedProducts() > 0;
    });

    readonly configSummary = computed(() => {
        const groups = this.selectedGroupIdsSignal().length;
        const products = this.totalSelectedProducts();
        const fontSize = this.estimatedFontSize();

        return {
            groups,
            products,
            fontSize,
            background: this.backgroundProduct()?.name || 'Не е избран'
        };
    });

    // Column Control Computed Signals
    readonly autoCalculatedColumns = computed(() => {
        const groupCount = this.selectedGroupIdsSignal().length;
        const productCount = this.totalSelectedProducts();

        // Calculate base columns without any overrides
        return calculateColumnCount(groupCount, productCount);
    });

    readonly finalColumnCount = computed(() => {
        const groupCount = this.selectedGroupIdsSignal().length;
        const productCount = this.totalSelectedProducts();

        // Calculate with column control applied
        const columnControl: ColumnControlConfig = {
            manualOverride: {
                enabled: this.manualOverrideEnabledSignal(),
                adjustment: this.manualAdjustmentSignal()
            },
            autoOptimizations: {
                preventEmptyColumns: this.preventEmptyColumnsSignal(),
                preventOverflow: this.preventOverflowSignal(),
                optimizeForFullWidth: this.optimizeFullWidthSignal(),
                densityThreshold: this.densityThresholdSignal()
            }
        };

        return calculateColumnCount(groupCount, productCount, undefined, columnControl);
    });

    readonly columnControlSummary = computed(() => {
        const autoColumns = this.autoCalculatedColumns();
        const finalColumns = this.finalColumnCount();
        const adjustment = finalColumns - autoColumns;

        if (this.manualOverrideEnabledSignal()) {
            if (adjustment === 0) {
                return 'Ръчен режим активен: Използва автоматичен брой';
            }
            return `Ръчен режим активен: ${adjustment > 0 ? '+' : ''}${adjustment} колона`;
        }

        if (adjustment === 0) {
            return 'Автоматични оптимизации: Няма корекции';
        }

        const reasons: string[] = [];
        if (this.preventEmptyColumnsSignal()) reasons.push('празни колони');
        if (this.preventOverflowSignal()) reasons.push('препълване');
        if (this.optimizeFullWidthSignal()) reasons.push('пълна ширина');

        return `Автоматична корекция: ${adjustment > 0 ? '+' : ''}${adjustment} (${reasons.join(', ')})`;
    });

    ngOnInit(): void {
        console.log('🍽️ MenuTemplateConfigComponent.ngOnInit() - Initializing menu config');

        // Load current configuration
        this.loadCurrentConfig();

        // Load groups with products from API
        this.loadGroupsWithProducts();

        // Setup auto-save with debouncing
        this.setupAutoSave();
    }

    ngOnDestroy(): void {
        console.log('🛑 MenuTemplateConfigComponent.ngOnDestroy()');
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load current menu configuration from ConfigService
     */
    private loadCurrentConfig(): void {
        console.log('📂 Loading current menu configuration...');

        const config = this.configService.config();
        const menuConfig = config.templates.templateSpecificConfig?.menu;

        if (menuConfig) {
            console.log('✅ Found existing menu configuration');

            // Load background product
            this.backgroundProductIdSignal.set(menuConfig.backgroundProductId || '');

            // Load font scaling settings
            this.autoScaleSignal.set(menuConfig.fontScaling.autoScale);
            this.manualFontSizeSignal.set(menuConfig.fontScaling.manualFontSize || 36);

            // Load column control settings
            if (menuConfig.columnControl) {
                const columnControl = menuConfig.columnControl;

                // Load manual override
                this.manualOverrideEnabledSignal.set(columnControl.manualOverride.enabled);
                this.manualAdjustmentSignal.set(columnControl.manualOverride.adjustment);

                // Load auto optimizations
                this.preventEmptyColumnsSignal.set(columnControl.autoOptimizations.preventEmptyColumns);
                this.preventOverflowSignal.set(columnControl.autoOptimizations.preventOverflow);
                this.optimizeFullWidthSignal.set(columnControl.autoOptimizations.optimizeForFullWidth);
                this.densityThresholdSignal.set(columnControl.autoOptimizations.densityThreshold);

                console.log('✅ Loaded column control config:', columnControl);
            }

            // Load slide selections (MVP: first slide only)
            const firstSlide = menuConfig.slides[0];
            if (firstSlide) {
                const groupIds = firstSlide.groupSelections.map(gs => gs.groupId);
                const productIds: Record<number, string[]> = {};

                firstSlide.groupSelections.forEach(gs => {
                    productIds[gs.groupId] = gs.productIds;
                });

                this.selectedGroupIdsSignal.set(groupIds);
                this.selectedProductIdsSignal.set(productIds);
            }
        } else {
            console.log('📝 No existing menu configuration, using defaults');
            this.initializeDefaults();
        }
    }

    /**
     * Initialize default configuration
     */
    private initializeDefaults(): void {
        this.backgroundProductIdSignal.set('');
        this.selectedGroupIdsSignal.set([]);
        this.selectedProductIdsSignal.set({});
        this.autoScaleSignal.set(true);
        this.manualFontSizeSignal.set(36);
    }

    /**
     * Load groups with products from API
     */
    private loadGroupsWithProducts(): void {
        console.log('📦 Loading groups with products from API...');
        this.isLoadingSignal.set(true);
        this.hasErrorSignal.set(false);
        this.errorMessageSignal.set('');

        this.productApiService.getGroupsWithProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: GroupsWithProductsResponse) => {
                    console.log('✅ Groups with products loaded:', response);

                    if (response.success && response.data) {
                        this.allGroupsSignal.set(response.data);
                        console.log(`📊 Loaded ${response.data.length} groups with ${response.totalProducts} total products`);
                    } else {
                        this.handleError('Failed to load product groups from API');
                    }

                    this.isLoadingSignal.set(false);
                },
                error: (error) => {
                    console.error('❌ Error loading groups with products:', error);
                    this.handleError('Failed to load menu data. Please try again.');
                    this.isLoadingSignal.set(false);
                }
            });
    }

    /**
     * Setup auto-save with debouncing
     */
    private setupAutoSave(): void {
        this.configChange$
            .pipe(
                debounceTime(1000), // 1 second debounce
                distinctUntilChanged((prev, curr) =>
                    JSON.stringify(prev) === JSON.stringify(curr)
                ),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (config) => {
                    this.saveConfiguration(config);
                }
            });
    }

    /**
     * Handle background product selection
     */
    onBackgroundProductChange(productId: string): void {
        console.log('🖼️ Background product changed to:', productId);
        this.backgroundProductIdSignal.set(productId);
        this.emitConfigChange();
    }

    /**
     * Handle group selection toggle
     */
    onGroupToggle(groupId: number, isSelected: boolean): void {
        console.log(`📁 Group ${groupId} ${isSelected ? 'selected' : 'deselected'} `);

        const currentIds = this.selectedGroupIdsSignal();
        let newIds: number[];

        if (isSelected) {
            newIds = [...currentIds, groupId];
        } else {
            newIds = currentIds.filter(id => id !== groupId);
            // Remove products from deselected group
            const currentProducts = this.selectedProductIdsSignal();
            delete currentProducts[groupId];
            this.selectedProductIdsSignal.set({ ...currentProducts });
        }

        this.selectedGroupIdsSignal.set(newIds);
        this.emitConfigChange();
    }

    /**
     * Handle product selection toggle within a group
     */
    onProductToggle(groupId: number, productId: string, isSelected: boolean): void {
        console.log(`📦 Product ${productId} in group ${groupId} ${isSelected ? 'selected' : 'deselected'} `);

        const currentProducts = this.selectedProductIdsSignal();
        const groupProducts = currentProducts[groupId] || [];

        let newGroupProducts: string[];
        if (isSelected) {
            newGroupProducts = [...groupProducts, productId];
        } else {
            newGroupProducts = groupProducts.filter(id => id !== productId);
        }

        this.selectedProductIdsSignal.set({
            ...currentProducts,
            [groupId]: newGroupProducts
        });

        this.emitConfigChange();
    }

    /**
     * Handle font scaling toggle
     */
    onFontScaleToggle(autoScale: boolean): void {
        console.log('📏 Font auto-scale toggled:', autoScale);
        this.autoScaleSignal.set(autoScale);
        this.emitConfigChange();
    }

    /**
     * Handle manual font size input from slider
     */
    onManualFontSizeInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const fontSize = Number(input.value);

        console.log('📏 Manual font size changed to:', fontSize);
        this.manualFontSizeSignal.set(fontSize);
        this.emitConfigChange();
    }

    /**
     * Check if group is selected
     */
    isGroupSelected(groupId: number): boolean {
        return this.selectedGroupIdsSignal().includes(groupId);
    }

    /**
     * Check if product is selected within a group
     */
    isProductSelected(groupId: number, productId: string): boolean {
        const groupProducts = this.selectedProductIdsSignal()[groupId] || [];
        return groupProducts.includes(productId);
    }

    /**
     * Get selected products for a specific group
     */
    getSelectedProductsForGroup(groupId: number): string[] {
        return this.selectedProductIdsSignal()[groupId] || [];
    }

    /**
     * Select all products in a group
     */
    selectAllProductsInGroup(groupId: number): void {
        const group = this.allGroups().find(g => g.id === groupId);
        if (!group) return;

        const allProductIds = group.group_products.map(p => p.id);
        const currentProducts = this.selectedProductIdsSignal();

        this.selectedProductIdsSignal.set({
            ...currentProducts,
            [groupId]: allProductIds
        });

        this.emitConfigChange();
    }

    /**
     * Deselect all products in a group
     */
    deselectAllProductsInGroup(groupId: number): void {
        const currentProducts = this.selectedProductIdsSignal();
        delete currentProducts[groupId];

        this.selectedProductIdsSignal.set({ ...currentProducts });
        this.emitConfigChange();
    }

    /**
     * Emit configuration change to parent
     */
    private emitConfigChange(): void {
        const config = this.buildMenuConfig();
        this.configChange.emit(config);
        this.configValid.emit(this.isConfigValid());
        this.configChange$.next(config);
    }

    // ✨ NEW: Column Control Event Handlers

    /**
     * Toggle manual override mode
     */
    onManualOverrideToggle(enabled: boolean): void {
        console.log('🎛️ Manual override toggled:', enabled);
        this.manualOverrideEnabledSignal.set(enabled);

        if (!enabled) {
            // Reset to automatic when disabled
            this.manualAdjustmentSignal.set(0);
        }

        this.emitConfigChange();
    }

    /**
     * Change manual column adjustment
     */
    onManualAdjustmentChange(adjustment: -1 | 0 | 1): void {
        console.log('📊 Manual adjustment changed:', adjustment);
        this.manualAdjustmentSignal.set(adjustment);
        this.emitConfigChange();
    }

    /**
     * Toggle prevent empty columns optimization
     */
    onPreventEmptyColumnsChange(checked: boolean): void {
        console.log('🤖 Prevent empty columns:', checked);
        this.preventEmptyColumnsSignal.set(checked);
        this.emitConfigChange();
    }

    /**
     * Toggle prevent overflow optimization
     */
    onPreventOverflowChange(checked: boolean): void {
        console.log('🤖 Prevent overflow:', checked);
        this.preventOverflowSignal.set(checked);
        this.emitConfigChange();
    }

    /**
     * Toggle optimize full width
     */
    onOptimizeFullWidthChange(checked: boolean): void {
        console.log('🤖 Optimize full width:', checked);
        this.optimizeFullWidthSignal.set(checked);
        this.emitConfigChange();
    }

    /**
     * Change density threshold
     */
    onDensityThresholdChange(value: number): void {
        console.log('🎚️ Density threshold changed:', value);
        this.densityThresholdSignal.set(value);
        this.emitConfigChange();
    }

    /**
     * Format label for density slider
     */
    formatDensityLabel = (value: number): string => {
        return `${(value * 100).toFixed(0)}%`;
    };

    /**
     * Build MenuTemplateConfig from current state
     */
    private buildMenuConfig(): MenuTemplateConfig {
        const groupSelections: MenuGroupSelection[] = this.selectedGroupIdsSignal().map((groupId, index) => ({
            groupId,
            productIds: this.getSelectedProductsForGroup(groupId),
            displayOrder: index
        }));

        const slide: MenuSlide = {
            slideId: 'slide-1',
            name: 'Слайд 1',
            groupSelections
        };

        const fontScaling: FontScalingConfig = {
            autoScale: this.autoScaleSignal(),
            manualFontSize: this.manualFontSizeSignal(),
            minFontSize: 12,
            maxFontSize: 48
        };

        // Build column control config
        const columnControl: ColumnControlConfig = {
            manualOverride: {
                enabled: this.manualOverrideEnabledSignal(),
                adjustment: this.manualAdjustmentSignal()
            },
            autoOptimizations: {
                preventEmptyColumns: this.preventEmptyColumnsSignal(),
                preventOverflow: this.preventOverflowSignal(),
                optimizeForFullWidth: this.optimizeFullWidthSignal(),
                densityThreshold: this.densityThresholdSignal()
            }
        };

        return {
            layout: 'single-slide',
            backgroundProductId: this.backgroundProductIdSignal(),
            slides: [slide],
            fontScaling,
            columnControl
        };
    }

    /**
     * Save configuration to ConfigService
     */
    private saveConfiguration(config: MenuTemplateConfig): void {
        console.log('💾 Auto-saving menu configuration...');
        this.isSavingSignal.set(true);

        this.configService.updateTemplateSettings({
            templateSpecificConfig: {
                menu: config
            }
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    console.log('✅ Menu configuration auto-saved');
                    this.isSavingSignal.set(false);

                    // Minimum 300ms delay for spinner visibility
                    setTimeout(() => {
                        this.isSavingSignal.set(false);
                        this.showSuccess('Меню конфигурацията е запазена автоматично');
                    }, 300);
                },
                error: (error) => {
                    console.error('❌ Failed to auto-save menu configuration:', error);
                    this.isSavingSignal.set(false);
                    this.showError('Грешка при запазване на конфигурацията');
                }
            });
    }

    /**
     * Handle errors
     */
    private handleError(message: string): void {
        console.error(`❌ MenuTemplateConfig Error: ${message} `);
        this.hasErrorSignal.set(true);
        this.errorMessageSignal.set(message);
    }

    /**
     * Show success notification
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'OK', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show error notification
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Затвори', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Get background product image URL
     */
    getBackgroundProductImage(): string {
        const product = this.backgroundProduct();
        if (!product) {
            return '/assets/images/product-placeholder.jpg';
        }

        // Find the actual product with imageUrl from all groups
        const allGroups = this.allGroups();
        for (const group of allGroups) {
            const actualProduct = group.group_products.find(p => p.id === product.id);
            if (actualProduct && actualProduct.imageUrl) {
                return actualProduct.imageUrl;
            }
        }

        // Fallback to placeholder
        return '/assets/images/product-placeholder.jpg';
    }

    /**
     * Retry loading data
     */
    retry(): void {
        console.log('🔄 Retrying menu data load...');
        this.loadGroupsWithProducts();
    }
}
