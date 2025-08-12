import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';

import { Product } from '@core/models/product.interface';
import { ProductTemplate } from '@core/models/template.interface';
import { SlideshowConfig } from '@core/models/slideshow-config.interface';
import { ProductApiService } from '@core/services/product-api.service';
import { ConfigService } from '@core/services/config.service';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';
import { PerformanceLevel } from '@core/models/enums';

/**
 * Main container component for the slideshow feature.
 * Handles product loading, template selection, and slideshow orchestration.
 * Optimized for TV display with safe zones and performance considerations.
 */
@Component({
    selector: 'app-slideshow-container',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './slideshow-container.component.html',
    styleUrls: ['./slideshow-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideShowContainerComponent implements OnInit, OnDestroy {
    // Services injection using the new Angular inject approach
    private productApiService = inject(ProductApiService);
    private configService = inject(ConfigService);
    private templateRegistry = inject(TemplateRegistryService);
    private performanceMonitor = inject(PerformanceMonitorService);

    // Signals for reactive state management
    protected isLoading = signal<boolean>(true);
    protected hasError = signal<boolean>(false);
    protected errorMessage = signal<string>('');
    protected products = signal<Product[]>([]);
    protected activeTemplate = signal<ProductTemplate | null>(null);
    protected config = signal<SlideshowConfig | null>(null);
    protected performanceLevel = signal<PerformanceLevel>(PerformanceLevel.STANDARD);

    // Cleanup subject for subscription management
    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        // Initialize state and load initial data
        this.initializeComponent();
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initializes the component by loading configuration,
     * products, and setting up the active template.
     */
    private initializeComponent(): void {
        // Subscribe to configuration
        this.configService.config$
            .pipe(takeUntil(this.destroy$))
            .subscribe(config => {
                if (config) {
                    this.config.set(config);
                    this.loadProducts();
                }
            });

        // Monitor performance for TV optimization
        this.performanceMonitor.metrics$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                // Get current performance level from service
                const performanceStatus = this.performanceMonitor.getPerformanceStatus();
                let level: PerformanceLevel;

                // Map performance status to level
                if (performanceStatus === 'good') {
                    level = PerformanceLevel.STANDARD;
                } else if (performanceStatus === 'warning') {
                    level = PerformanceLevel.BASIC;
                } else { // critical
                    level = PerformanceLevel.LOW;
                }

                this.performanceLevel.set(level);
            });
    }

    /**
     * Loads products from the API service based on current configuration
     */
    private loadProducts(): void {
        this.isLoading.set(true);
        this.hasError.set(false);

        this.productApiService.getProducts()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (products) => {
                    this.products.set(products);
                    this.isLoading.set(false);
                    this.setupTemplate();
                },
                error: (error) => {
                    this.isLoading.set(false);
                    this.hasError.set(true);
                    this.errorMessage.set('Грешка при зареждане на продуктите. Моля, опитайте отново.');
                    console.error('Error loading products:', error);
                }
            });
    }

    /**
     * Sets up the active template based on configuration and performance level
     */
    private setupTemplate(): void {
        const currentConfig = this.config();
        if (!currentConfig) return;

        // Get template ID from configuration
        const templateId = currentConfig.templates.selectedTemplateId;

        // Проверяваме дали ID е дефинирано преди да го използваме
        if (templateId) {
            // Получаваме шаблона и се абонираме за резултата
            this.templateRegistry.getTemplate(templateId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (template) => {
                        if (template) {
                            this.activeTemplate.set(template);
                        } else {
                            this.loadFallbackTemplate();
                        }
                    },
                    error: () => {
                        this.loadFallbackTemplate();
                    }
                });
        } else {
            this.loadFallbackTemplate();
        }
    }

    /**
     * Loads fallback template when the primary template is not available
     */
    private loadFallbackTemplate(): void {
        console.warn('Configured template not found, using fallback template');

        // Получаваме всички шаблони и се абонираме за резултата
        this.templateRegistry.getAllTemplates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (templates) => {
                    if (templates && templates.length > 0) {
                        this.activeTemplate.set(templates[0]);
                    } else {
                        console.error('Няма налични шаблони');
                        this.hasError.set(true);
                        this.errorMessage.set('Няма налични шаблони за показване на продукти.');
                    }
                },
                error: (error) => {
                    console.error('Грешка при зареждане на шаблоните:', error);
                    this.hasError.set(true);
                    this.errorMessage.set('Грешка при зареждане на шаблоните.');
                }
            });
    }
}