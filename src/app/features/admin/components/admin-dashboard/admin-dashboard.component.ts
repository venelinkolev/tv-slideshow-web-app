// src/app/features/admin/components/admin-dashboard/admin-dashboard.component.ts

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

// Core services
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { ProductApiService } from '@core/services/product-api.service';

// Models
import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig } from '@core/models/slideshow-config.interface';
import { BaseProductTemplateComponent } from "@features/templates";

/**
 * AdminDashboardComponent - MVP Admin Panel
 * 
 * Отговорности:
 * - Template selection (dropdown)
 * - Slide duration configuration (slider)
 * - Product selection (checkboxes)
 * - Save/Load configuration
 * - Link to slideshow preview
 * 
 * MVP Focus: Fast, simple, working demo for presentation
 */
@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        // Angular Material modules
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSliderModule,
        MatCheckboxModule,
        MatListModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatIconModule,
        // BaseProductTemplateComponent
    ],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

    // Cleanup subscription
    private readonly destroy$ = new Subject<void>();
    private readonly templateChange$ = new Subject<string>();

    // Services injection using Angular 18 inject()
    private readonly configService = inject(ConfigService);
    private readonly templateRegistry = inject(TemplateRegistryService);
    private readonly productApi = inject(ProductApiService);
    private readonly snackBar = inject(MatSnackBar);

    // ✅ Component state signals
    readonly isLoading = signal<boolean>(false);
    readonly isSaving = signal<boolean>(false);
    readonly saveSuccess = signal<boolean>(false);
    readonly hasError = signal<boolean>(false);
    readonly errorMessage = signal<string>('');
    readonly isTemplateSaving = signal<boolean>(false);

    // ✅ Data signals
    readonly availableTemplates = signal<ProductTemplate[]>([]);
    readonly products = signal<Product[]>([]);
    readonly selectedTemplateId = signal<string>('');
    readonly slideDuration = signal<number>(20000); // milliseconds
    readonly selectedProductIds = signal<string[]>([]);

    // ✅ Computed values
    readonly slideDurationInSeconds = computed(() =>
        Math.round(this.slideDuration() / 1000)
    );

    readonly isConfigReady = computed(() =>
        this.selectedTemplateId().length > 0 &&
        this.selectedProductIds().length > 0
    );

    readonly selectedProductsCount = computed(() =>
        this.selectedProductIds().length
    );

    constructor() {
        console.log('🔧 AdminDashboardComponent initializing...');
    }

    ngOnInit(): void {
        console.log('▶️ AdminDashboardComponent.ngOnInit()');
        this.templateChange$
            .pipe(
                debounceTime(500), // Изчакваме 500ms след последната промяна
                distinctUntilChanged(), // Запазваме само ако стойността е различна
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (templateId) => {
                    this.saveTemplateChange(templateId);
                }
            });
        this.loadInitialData();
    }

    ngOnDestroy(): void {
        console.log('🛑 AdminDashboardComponent.ngOnDestroy()');
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load initial data from services
     */
    private loadInitialData(): void {
        console.log('📂 Loading initial admin data...');
        this.isLoading.set(true);

        try {
            // Load current configuration
            this.configService.loadConfig()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (config: SlideshowConfig) => {
                        console.log('✅ Configuration loaded:', config.name);
                        this.selectedTemplateId.set(config.templates.selectedTemplateId || 'classic');
                        this.slideDuration.set(config.timing.baseSlideDuration);
                        this.selectedProductIds.set(config.products.selectedProductIds || []);
                    },
                    error: (error) => {
                        console.error('❌ Error loading config:', error);
                        this.showError('Грешка при зареждане на конфигурацията');
                    }
                });

            // Load available templates
            this.templateRegistry.getAllTemplates()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (templates: ProductTemplate[]) => {
                        console.log(`✅ Loaded ${templates.length} templates`);
                        this.availableTemplates.set(templates);
                    },
                    error: (error) => {
                        console.error('❌ Error loading templates:', error);
                        this.showError('Грешка при зареждане на темплейтите');
                    }
                });

            // Load products
            this.productApi.getProducts()
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (products: Product[]) => {
                        console.log(`✅ Loaded ${products.length} products`);
                        this.products.set(products);
                        this.isLoading.set(false);
                    },
                    error: (error) => {
                        console.error('❌ Error loading products:', error);
                        this.showError('Грешка при зареждане на продуктите');
                        this.isLoading.set(false);
                    }
                });

        } catch (error) {
            console.error('❌ Unexpected error in loadInitialData:', error);
            this.isLoading.set(false);
            this.showError('Неочаквана грешка при зареждане на данни');
        }
    }

    /**
     * Handle template selection change
     */
    onTemplateChange(templateId: string): void {
        console.log('🎨 Template changed to:', templateId);
        this.selectedTemplateId.set(templateId);

        // Trigger auto-save через Subject
        this.templateChange$.next(templateId);
    }

    /**
     * Handle slide duration change
     */
    onDurationChange(duration: number): void {
        console.log(`⏱️ Duration changed to: ${duration}ms`);
        this.slideDuration.set(duration);
        // Auto-save с debounce будет в следующей фазе
    }

    /**
     * Toggle product selection
     */
    toggleProductSelection(productId: string): void {
        const currentSelection = this.selectedProductIds();
        const index = currentSelection.indexOf(productId);

        if (index > -1) {
            // Remove from selection
            const newSelection = currentSelection.filter(id => id !== productId);
            this.selectedProductIds.set(newSelection);
            console.log(`➖ Product ${productId} deselected`);
        } else {
            // Add to selection
            this.selectedProductIds.set([...currentSelection, productId]);
            console.log(`➕ Product ${productId} selected`);
        }
    }

    /**
     * Check if product is selected
     */
    isProductSelected(productId: string): boolean {
        return this.selectedProductIds().includes(productId);
    }

    /**
     * Select all products
     */
    selectAllProducts(): void {
        console.log('✅ Selecting all products');
        const allProductIds = this.products().map(p => p.id);
        this.selectedProductIds.set(allProductIds);
        this.showSuccess('Всички продукти са избрани');
    }

    /**
     * Deselect all products
     */
    deselectAllProducts(): void {
        console.log('❌ Deselecting all products');
        this.selectedProductIds.set([]);
        this.showSuccess('Всички продукти са премахнати');
    }

    /**
     * Save configuration
     */
    onSaveConfiguration(): void {
        console.log('💾 Saving configuration...');
        this.isSaving.set(true);

        try {
            // Update template settings
            this.configService.updateTemplateSettings({
                selectedTemplateId: this.selectedTemplateId()
            })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        console.log('✅ Template settings saved');

                        // Update timing settings
                        this.configService.updateTimingSettings({
                            baseSlideDuration: this.slideDuration()
                        }).subscribe({
                            next: () => {
                                console.log('✅ Timing settings saved');

                                // Update product settings
                                this.configService.updateProductSettings({
                                    selectedProductIds: this.selectedProductIds()
                                }).subscribe({
                                    next: () => {
                                        console.log('✅ Product settings saved');
                                        this.isSaving.set(false);
                                        this.saveSuccess.set(true);
                                        this.showSuccess('Конфигурацията е запазена успешно!');

                                        // Reset success flag after 3 seconds
                                        setTimeout(() => this.saveSuccess.set(false), 3000);
                                    },
                                    error: (error) => {
                                        console.error('❌ Error saving product settings:', error);
                                        this.isSaving.set(false);
                                        this.showError('Грешка при запазване на продуктите');
                                    }
                                });
                            },
                            error: (error) => {
                                console.error('❌ Error saving timing settings:', error);
                                this.isSaving.set(false);
                                this.showError('Грешка при запазване на времето');
                            }
                        });
                    },
                    error: (error) => {
                        console.error('❌ Error saving template settings:', error);
                        this.isSaving.set(false);
                        this.showError('Грешка при запазване на темплейта');
                    }
                });

        } catch (error) {
            console.error('❌ Unexpected error saving config:', error);
            this.isSaving.set(false);
            this.showError('Неочаквана грешка при запазване');
        }
    }

    /**
     * Reset configuration to defaults
     */
    onResetToDefaults(): void {
        console.log('🔄 Resetting configuration to defaults...');

        if (!confirm('Сигурни ли сте, че искате да възстановите настройките по подразбиране?')) {
            return;
        }

        this.isLoading.set(true);

        this.configService.resetToDefaults()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (config: SlideshowConfig) => {
                    console.log('✅ Configuration reset to defaults');
                    this.selectedTemplateId.set(config.templates.selectedTemplateId || 'classic');
                    this.slideDuration.set(config.timing.baseSlideDuration);
                    this.selectedProductIds.set(config.products.selectedProductIds || []);
                    this.isLoading.set(false);
                    this.showSuccess('Настройките са възстановени по подразбиране');
                },
                error: (error) => {
                    console.error('❌ Error resetting config:', error);
                    this.isLoading.set(false);
                    this.showError('Грешка при възстановяване на настройките');
                }
            });
    }

    /**
     * Auto-save template change
     */
    private saveTemplateChange(templateId: string): void {
        console.log('💾 Auto-saving template:', templateId);
        this.isTemplateSaving.set(true);

        this.configService.updateTemplateSettings({
            selectedTemplateId: templateId
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    console.log('✅ Template auto-saved');
                    this.isTemplateSaving.set(false);
                    // Показваме малко success notification
                    this.showSuccess('Темплейтът е запазен автоматично');
                },
                error: (error) => {
                    console.error('❌ Failed to auto-save template:', error);
                    this.isTemplateSaving.set(false);
                    this.showError('Грешка при запазване на темплейта');
                }
            });
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
        this.hasError.set(true);
        this.errorMessage.set(message);

        this.snackBar.open(message, 'Затвори', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
        });
    }
}