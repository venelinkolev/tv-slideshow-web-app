import {
    Component,
    ChangeDetectionStrategy,
    input,
    signal,
    computed,
    inject,
    PLATFORM_ID,
    OnInit,
    OnDestroy,
    HostBinding
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PerformanceLevel } from '@core/models/enums';
import { PerformanceMonitorService } from '@core/services/performance-monitor.service';

/**
 * LoadingStateComponent - TV-Optimized Loading Indicator
 * 
 * ОТГОВОРНОСТИ:
 * - Показва loading spinner и състояние
 * - Performance-based animation control за TV устройства
 * - Responsive design за различни TV резолюции
 * - Accessibility support с ARIA labels
 * - Memory-efficient animations
 * 
 * TV ОПТИМИЗАЦИИ:
 * - Динамично отключване на анимации за слаби TV устройства
 * - Адаптивни размери базирани на резолюция
 * - Memory cleanup при destroy
 * - Safe area enforcement
 */
@Component({
    selector: 'app-loading-state',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './loading-state.component.html',
    styleUrl: './loading-state.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent implements OnInit, OnDestroy {

    // ✅ Angular 18 Input signals
    readonly isVisible = input<boolean>(true);
    readonly loadingText = input<string>('Зареждане на продукти...');
    readonly showProgress = input<boolean>(false);
    readonly progressValue = input<number>(0);
    readonly performanceLevel = input<PerformanceLevel>(PerformanceLevel.STANDARD);
    readonly enableDetailedMessages = input<boolean>(false);

    // ✅ Services injection
    private readonly performanceMonitor = inject(PerformanceMonitorService);
    private readonly platformId = inject(PLATFORM_ID);

    // ✅ Private reactive state signals
    private readonly currentAnimationFrame = signal<number>(0);
    private readonly isBrowser = signal<boolean>(false);
    private readonly detailedMessage = signal<string>('');
    private readonly animationFrameCount = signal<number>(0);

    // ✅ Public readonly signals for template
    readonly currentFrame = this.currentAnimationFrame.asReadonly();
    readonly currentDetailedMessage = this.detailedMessage.asReadonly();
    readonly currentAnimationFrames = this.animationFrameCount.asReadonly();

    // ✅ Computed signals for TV optimizations
    readonly shouldShowAnimations = computed(() => {
        const perfLevel = this.performanceLevel();
        const isBrowserEnv = this.isBrowser();
        // Само за STANDARD и по-високи performance levels
        return isBrowserEnv && perfLevel >= PerformanceLevel.STANDARD;
    });

    readonly shouldShowDetailedSpinner = computed(() => {
        const perfLevel = this.performanceLevel();
        const isBrowserEnv = this.isBrowser();
        // Детайлен spinner само за HIGH и PREMIUM levels
        return isBrowserEnv && perfLevel >= PerformanceLevel.HIGH;
    });

    readonly spinnerSize = computed(() => {
        const perfLevel = this.performanceLevel();

        // Адаптивни размери базирани на performance
        switch (perfLevel) {
            case PerformanceLevel.LOW:
            case PerformanceLevel.BASIC:
                return 'small'; // 32px
            case PerformanceLevel.STANDARD:
                return 'medium'; // 48px
            case PerformanceLevel.HIGH:
                return 'large'; // 64px
            case PerformanceLevel.PREMIUM:
                return 'extra-large'; // 80px
            default:
                return 'medium';
        }
    });

    readonly progressMessage = computed(() => {
        const progress = this.progressValue();
        const showProgress = this.showProgress();
        const baseText = this.loadingText();

        if (!showProgress || progress === 0) {
            return baseText;
        }

        return `${baseText} (${Math.round(progress)}%)`;
    });

    readonly accessibilityLabel = computed(() => {
        const progress = this.progressValue();
        const showProgress = this.showProgress();
        const baseText = this.loadingText();

        if (!showProgress) {
            return `Loading: ${baseText}`;
        }

        return `Loading: ${baseText} - ${Math.round(progress)} percent complete`;
    });

    // ✅ Cleanup management
    private readonly destroy$ = new Subject<void>();
    private animationIntervalId?: any;

    ngOnInit(): void {
        console.log('LoadingStateComponent: Initializing with TV optimizations');

        // Detect browser environment
        this.isBrowser.set(isPlatformBrowser(this.platformId));

        if (this.isBrowser()) {
            this.startLoadingAnimations();
            this.setupDetailedMessaging();
        }
    }

    ngOnDestroy(): void {
        console.log('LoadingStateComponent: Cleaning up TV optimizations');

        // Cleanup subscriptions and intervals
        this.destroy$.next();
        this.destroy$.complete();

        if (this.animationIntervalId) {
            clearInterval(this.animationIntervalId);
        }
    }


    /**
     * Round number за template използване
     */
    round(value: number): number {
        return Math.round(value);
    }

    /**
     * Start loading animations based on performance level
     * @private
     */
    private startLoadingAnimations(): void {
        console.log('LoadingStateComponent: Starting performance-aware animations');

        if (!this.shouldShowAnimations()) {
            console.log('LoadingStateComponent: Animations disabled for low performance');
            return;
        }

        // Animation frame counter за advanced spinners
        this.animationIntervalId = setInterval(() => {
            const currentFrame = this.currentAnimationFrame();
            const nextFrame = (currentFrame + 1) % 8; // 8-frame animation cycle
            this.currentAnimationFrame.set(nextFrame);

            // Count total animation frames for performance monitoring
            const frameCount = this.animationFrameCount();
            this.animationFrameCount.set(frameCount + 1);
        }, 125); // 8 FPS for smooth but efficient animation
    }

    /**
     * Setup detailed messaging system for enabled levels
     * @private
     */
    private setupDetailedMessaging(): void {
        if (!this.enableDetailedMessages()) {
            return;
        }

        console.log('LoadingStateComponent: Setting up detailed messaging');

        const detailedMessages = [
            'Свързване с API сървъра...',
            'Зареждане на продуктова информация...',
            'Обработване на изображения...',
            'Подготовка на шаблони...',
            'Финализиране на настройките...'
        ];

        let messageIndex = 0;

        // Cycle through detailed messages
        interval(2000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.detailedMessage.set(detailedMessages[messageIndex]);
                messageIndex = (messageIndex + 1) % detailedMessages.length;
            });
    }

    /**
     * Public method for manual loading progress updates
     * @param message Custom loading message
     */
    updateLoadingMessage(message: string): void {
        console.log(`LoadingStateComponent: Updating message to: ${message}`);
        this.detailedMessage.set(message);
    }

    /**
     * Get current loading performance stats for debugging
     * @returns Performance statistics
     */
    getLoadingStats(): {
        animationFrames: number;
        performanceLevel: PerformanceLevel;
        animationsEnabled: boolean;
        spinnerSize: string;
    } {
        return {
            animationFrames: this.animationFrameCount(),
            performanceLevel: this.performanceLevel(),
            animationsEnabled: this.shouldShowAnimations(),
            spinnerSize: this.spinnerSize()
        };
    }

    @HostBinding('class.visible')
    get hostVisible(): boolean {
        return this.isVisible();
    }
}