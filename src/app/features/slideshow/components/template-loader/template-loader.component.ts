import {
    Component,
    OnInit,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ViewContainerRef,
    ComponentRef,
    input,
    output,
    signal,
    computed,
    effect,
    inject,
    untracked,
    ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Product } from '@core/models/product.interface';
import { TemplateRegistryService } from '@core/services/template-registry.service';
import { ConfigService } from '@core/services/config.service';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';

// Import TemplateFactory utility (будe created separately)
// import { TemplateFactory } from '../../../templates/utils/template-factory.util';

/**
 * TemplateLoaderComponent - Dynamic template component loader
 * 
 * Най-техническият компонент в slideshow системата.
 * Отговорен за dynamic loading на template components на base на конфигурацията.
 * 
 * KEY FEATURES:
 * 🔄 Dynamic Component Loading: ViewContainerRef за runtime component creation
 * 🎛️ Template Switching: Real-time template change без application restart  
 * 🧠 Lifecycle Management: Proper cleanup и memory leak prevention
 * 📦 Fallback System: Graceful degradation когато template fails
 * 📊 Performance Tracking: Memory usage и load time monitoring
 * 🎯 TV Optimization: Large fonts, simple interactions, error resilience
 * 
 * TECHNICAL CHALLENGES:
 * - Angular dynamic component lifecycle
 * - Memory cleanup и leak prevention  
 * - Template switching performance
 * - Error recovery mechanisms
 * - TypeScript type safety с dynamic loading
 */
@Component({
    selector: 'app-template-loader',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './template-loader.component.html',
    styleUrls: ['./template-loader.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateLoaderComponent implements OnInit, OnDestroy, AfterViewInit {

    // ✅ Angular 18 Input signals
    readonly product = input.required<Product>();
    readonly templateName = input<string>('classic');
    readonly imageQuality = input<'low' | 'medium' | 'high'>('medium');
    readonly enableAnimations = input<boolean>(true);
    readonly forceReload = input<boolean>(false);

    // ✅ Angular 18 Output signals
    readonly templateLoaded = output<{ templateName: string; success: boolean; loadTime: number }>();
    readonly templateError = output<{ templateName: string; error: string; fallbackUsed: boolean }>();
    readonly componentReady = output<{ product: Product; template: string }>();

    // ✅ Service injection с inject()
    private readonly templateRegistry = inject(TemplateRegistryService);
    private readonly configService = inject(ConfigService);
    private readonly performanceMonitor = inject(PerformanceMonitorService);

    // ✅ ViewChild за dynamic component loading
    @ViewChild('dynamicTemplateContainer', { read: ViewContainerRef, static: true })
    private dynamicTemplateContainer!: ViewContainerRef;

    // ✅ Component lifecycle management
    private readonly destroy$ = new Subject<void>();
    private currentComponentRef: ComponentRef<any> | null = null;
    private loadStartTime: number = 0;

    // ✅ Private state signals
    private readonly isLoadingSignal = signal<boolean>(false);
    private readonly hasErrorSignal = signal<boolean>(false);
    private readonly errorMessageSignal = signal<string>('');
    private readonly currentTemplateSignal = signal<string>('');
    private readonly isUsingFallbackSignal = signal<boolean>(false);
    private readonly loadTimeSignal = signal<number>(0);

    // ✅ Public readonly signals
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly hasError = this.hasErrorSignal.asReadonly();
    readonly errorMessage = this.errorMessageSignal.asReadonly();
    readonly currentTemplate = this.currentTemplateSignal.asReadonly();
    readonly isUsingFallback = this.isUsingFallbackSignal.asReadonly();
    readonly loadTime = this.loadTimeSignal.asReadonly();

    // ✅ Computed signals
    readonly isReady = computed(() =>
        !this.isLoading() && !this.hasError() && this.currentTemplate() !== ''
    );

    readonly templateInfo = computed(() => {
        const templateName = this.templateName();
        return this.templateRegistry.getTemplate(templateName);
    });

    readonly hasValidTemplate = computed(() => {
        const info = this.templateInfo();
        return info !== null;
    });

    readonly loaderClasses = computed(() => {
        const classes = ['template-loader'];

        if (this.isLoading()) classes.push('template-loader--loading');
        if (this.hasError()) classes.push('template-loader--error');
        if (this.isReady()) classes.push('template-loader--ready');
        if (this.isUsingFallback()) classes.push('template-loader--fallback');

        return classes.join(' ');
    });

    readonly debugInfo = computed(() => ({
        templateName: this.templateName(),
        isLoading: this.isLoading(),
        hasError: this.hasError(),
        isReady: this.isReady(),
        isUsingFallback: this.isUsingFallback(),
        loadTime: this.loadTime(),
        currentTemplate: this.currentTemplate(),
        hasValidTemplate: this.hasValidTemplate()
    }));

    // ✅ Effects за reactive loading
    private readonly templateChangeEffect = effect(() => {
        const templateName = this.templateName();
        const product = this.product();
        const forceReload = this.forceReload();

        console.log(`TemplateLoaderComponent: Template change detected - ${templateName}`, {
            productId: product.id,
            forceReload
        });

        // Use untracked за да не влизаме в infinite loop
        untracked(() => {
            this.loadTemplate(templateName, product);
        });
    });

    ngOnInit(): void {
        console.log('TemplateLoaderComponent: Initializing', {
            templateName: this.templateName(),
            productId: this.product().id
        });

        // Initialize error state
        this.isLoadingSignal.set(false);
        this.hasErrorSignal.set(false);
        this.errorMessageSignal.set('');
    }

    ngAfterViewInit(): void {
        console.log('TemplateLoaderComponent: ViewInit - Container ready');

        // Ensure container is available
        if (!this.dynamicTemplateContainer) {
            console.error('TemplateLoaderComponent: ViewContainerRef not available!');
            this.handleLoadingError('Template container not initialized', 'classic');
            return;
        }

        // Load initial template
        const initialTemplate = this.templateName();
        const initialProduct = this.product();
        this.loadTemplate(initialTemplate, initialProduct);
    }

    ngOnDestroy(): void {
        console.log('TemplateLoaderComponent: Destroying');

        // Complete destroy subject
        this.destroy$.next();
        this.destroy$.complete();

        // Cleanup current component
        this.cleanupCurrentComponent();
    }

    /**
     * Load template component dynamically
     * @param templateName Template identifier 
     * @param product Product data
     */
    private async loadTemplate(templateName: string, product: Product): Promise<void> {
        console.log(`TemplateLoaderComponent.loadTemplate(${templateName}) for product ${product.id}`);

        // Check if already loading the same template
        if (this.isLoading() && this.currentTemplate() === templateName) {
            console.log('TemplateLoaderComponent: Already loading same template, skipping');
            return;
        }

        // Start loading
        this.loadStartTime = performance.now();
        this.isLoadingSignal.set(true);
        this.hasErrorSignal.set(false);
        this.errorMessageSignal.set('');
        this.isUsingFallbackSignal.set(false);

        try {
            // Get template component from registry
            const templateComponent = this.templateRegistry.getTemplateComponent(templateName);

            if (!templateComponent) {
                console.warn(`TemplateLoaderComponent: Template component '${templateName}' not found`);
                await this.loadFallbackTemplate(product, `Template '${templateName}' not found`);
                return;
            }

            // Cleanup previous component
            this.cleanupCurrentComponent();

            // Create new component using TemplateFactory (будe imported when available)
            // For now, direct ViewContainerRef usage
            this.dynamicTemplateContainer.clear();

            const componentRef = this.dynamicTemplateContainer.createComponent(templateComponent);

            // Set component inputs
            componentRef.setInput('product', product);
            componentRef.setInput('imageQuality', this.imageQuality());
            componentRef.setInput('enableAnimations', this.enableAnimations());

            // Subscribe to component outputs if available
            if (componentRef.instance.templateLoaded) {
                componentRef.instance.templateLoaded
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((loadedTemplate: string) => {
                        console.log(`TemplateLoaderComponent: Template loaded event - ${loadedTemplate}`);
                        this.onTemplateComponentLoaded(loadedTemplate);
                    });
            }

            if (componentRef.instance.imageError) {
                componentRef.instance.imageError
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((error: Event) => {
                        console.warn('TemplateLoaderComponent: Image error in template', error);
                        // Handle image errors but don't fail the entire template
                    });
            }

            // Store reference
            this.currentComponentRef = componentRef;

            // Trigger change detection
            componentRef.changeDetectorRef.detectChanges();

            // Calculate load time
            const loadTime = performance.now() - this.loadStartTime;
            this.loadTimeSignal.set(loadTime);

            // Update state
            this.currentTemplateSignal.set(templateName);
            this.isLoadingSignal.set(false);

            // Emit success event
            this.templateLoaded.emit({
                templateName,
                success: true,
                loadTime
            });

            this.componentReady.emit({
                product,
                template: templateName
            });

            console.log(`✅ TemplateLoaderComponent: Template '${templateName}' loaded successfully in ${loadTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('TemplateLoaderComponent: Error loading template:', error);
            await this.loadFallbackTemplate(product, `Loading error: ${error}`);
        }
    }

    /**
     * Load fallback template when primary template fails
     * @param product Product data
     * @param reason Failure reason
     */
    private async loadFallbackTemplate(product: Product, reason: string): Promise<void> {
        console.log(`TemplateLoaderComponent.loadFallbackTemplate() - Reason: ${reason}`);

        const fallbackTemplate = 'classic'; // Always fall back to classic

        if (this.templateName() === fallbackTemplate) {
            // If classic template itself fails, use inline fallback
            this.handleLoadingError(reason, fallbackTemplate);
            return;
        }

        try {
            this.isUsingFallbackSignal.set(true);

            // Try to load classic template
            const classicComponent = this.templateRegistry.getTemplateComponent(fallbackTemplate);

            if (!classicComponent) {
                this.handleLoadingError('Fallback template not available', fallbackTemplate);
                return;
            }

            // Load classic template
            this.cleanupCurrentComponent();
            this.dynamicTemplateContainer.clear();

            const componentRef = this.dynamicTemplateContainer.createComponent(classicComponent);
            componentRef.setInput('product', product);
            componentRef.setInput('imageQuality', 'medium');
            componentRef.setInput('enableAnimations', false);

            this.currentComponentRef = componentRef;
            componentRef.changeDetectorRef.detectChanges();

            // Update state
            this.currentTemplateSignal.set(fallbackTemplate);
            this.isLoadingSignal.set(false);
            this.hasErrorSignal.set(false);

            console.log(`✅ TemplateLoaderComponent: Fallback template '${fallbackTemplate}' loaded`);

            // Emit fallback success
            this.templateLoaded.emit({
                templateName: fallbackTemplate,
                success: true,
                loadTime: performance.now() - this.loadStartTime
            });

        } catch (fallbackError) {
            console.error('TemplateLoaderComponent: Fallback template also failed:', fallbackError);
            this.handleLoadingError(`Primary: ${reason}, Fallback: ${fallbackError}`, fallbackTemplate);
        }
    }

    /**
     * Handle template loading errors
     * @param errorMessage Error description
     * @param attemptedTemplate Template that failed
     */
    private handleLoadingError(errorMessage: string, attemptedTemplate: string): void {
        console.error(`TemplateLoaderComponent.handleLoadingError: ${errorMessage}`);

        // Update error state
        this.isLoadingSignal.set(false);
        this.hasErrorSignal.set(true);
        this.errorMessageSignal.set(errorMessage);
        this.currentTemplateSignal.set('');

        // Cleanup any partial components
        this.cleanupCurrentComponent();

        // Emit error event
        this.templateError.emit({
            templateName: attemptedTemplate,
            error: errorMessage,
            fallbackUsed: this.isUsingFallback()
        });
    }

    /**
     * Template component loaded callback
     * @param templateName Loaded template name
     */
    private onTemplateComponentLoaded(templateName: string): void {
        console.log(`TemplateLoaderComponent.onTemplateComponentLoaded(${templateName})`);

        // Additional setup when template reports it's loaded
        const loadTime = performance.now() - this.loadStartTime;
        this.loadTimeSignal.set(loadTime);

        console.log(`Template component '${templateName}' fully loaded in ${loadTime.toFixed(2)}ms`);
    }

    /**
     * Cleanup current component reference
     */
    private cleanupCurrentComponent(): void {
        if (this.currentComponentRef) {
            console.log('TemplateLoaderComponent: Cleaning up current component');

            try {
                if (!this.currentComponentRef.hostView.destroyed) {
                    this.currentComponentRef.destroy();
                }
            } catch (error) {
                console.error('TemplateLoaderComponent: Error destroying component:', error);
            }

            this.currentComponentRef = null;
        }
    }

    /**
     * Force reload current template (for debugging)
     */
    public forceReloadTemplate(): void {
        console.log('TemplateLoaderComponent.forceReloadTemplate()');
        const currentTemplate = this.templateName();
        const currentProduct = this.product();
        this.loadTemplate(currentTemplate, currentProduct);
    }

    /**
     * Get current component instance (for debugging)
     */
    public getCurrentComponentInstance(): any | null {
        return this.currentComponentRef?.instance || null;
    }

    /**
     * Handle fallback image error
     * @param event Error event from image element
     */
    public onFallbackImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        if (img && img.src !== '/assets/images/product-placeholder.jpg') {
            img.src = '/assets/images/product-placeholder.jpg';
            console.warn('TemplateLoaderComponent: Fallback image failed, using placeholder');
        }
    }
}