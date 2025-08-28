import {
    Component,
    OnInit,
    OnDestroy,
    input,
    output,
    signal,
    computed,
    effect,
    untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

/**
 * SlideProgressComponent - Показва прогреса на слайдшоуто
 * 
 * Отговорности:
 * - Progress bar visualization
 * - Slide counter (текущ/общо)
 * - Real-time progress animations
 * - TV-safe styling и accessibility
 * - Auto-hide/show functionality
 */
@Component({
    selector: 'app-slide-progress',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './slide-progress.component.html',
    styleUrl: './slide-progress.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlideProgressComponent implements OnInit, OnDestroy {

    // ✅ Angular 18 Input signals
    readonly currentIndex = input.required<number>();
    readonly totalSlides = input.required<number>();
    readonly slideInterval = input<number>(20000); // milliseconds
    readonly showCounter = input<boolean>(true);
    readonly showProgressBar = input<boolean>(true);
    readonly autoHide = input<boolean>(false);
    readonly animationEnabled = input<boolean>(true);

    // ✅ Angular 18 Output signals
    readonly progressComplete = output<{ currentIndex: number; totalSlides: number }>();
    readonly progressClick = output<{ targetIndex: number; percentage: number }>();

    // ✅ Private state signals
    private readonly isVisibleSignal = signal<boolean>(true);
    private readonly progressPercentageSignal = signal<number>(0);
    private readonly slideProgressSignal = signal<number>(0); // Progress within current slide
    private readonly isHoveredSignal = signal<boolean>(false);

    // ✅ Public readonly signals
    readonly isVisible = this.isVisibleSignal.asReadonly();
    readonly progressPercentage = this.progressPercentageSignal.asReadonly();
    readonly slideProgress = this.slideProgressSignal.asReadonly();
    readonly isHovered = this.isHoveredSignal.asReadonly();

    // ✅ Computed signals
    readonly overallProgress = computed(() => {
        const current = this.currentIndex();
        const total = this.totalSlides();

        if (total === 0) return 0;

        // Calculate base progress + current slide progress
        const baseProgress = (current / total) * 100;
        const slideProgressBonus = (this.slideProgress() / total);

        return Math.min(100, baseProgress + slideProgressBonus);
    });

    readonly displayCurrentIndex = computed(() => this.currentIndex() + 1);

    readonly progressBarClasses = computed(() => {
        const classes = ['slide-progress'];

        if (!this.isVisible()) classes.push('slide-progress--hidden');
        if (this.isHovered()) classes.push('slide-progress--hovered');
        if (this.animationEnabled()) classes.push('slide-progress--animated');
        if (this.autoHide()) classes.push('slide-progress--auto-hide');
        if (this.totalSlides() <= 1) classes.push('slide-progress--single-slide');

        return classes.join(' ');
    });

    readonly counterText = computed(() => {
        return `${this.displayCurrentIndex()} / ${this.totalSlides()}`;
    });

    readonly ariaLabel = computed(() => {
        return `Слайд ${this.displayCurrentIndex()} от ${this.totalSlides()}, прогрес ${Math.round(this.overallProgress())}%`;
    });

    // ✅ Auto-hide effect
    private autoHideEffect = effect(() => {
        const autoHide = this.autoHide();
        const isHovered = this.isHovered();

        untracked(() => {
            if (autoHide && !isHovered) {
                setTimeout(() => {
                    if (!this.isHovered() && this.autoHide()) {
                        this.isVisibleSignal.set(false);
                    }
                }, 3000);
            } else if (isHovered || !autoHide) {
                this.isVisibleSignal.set(true);
            }
        });
    });

    // ✅ Progress tracking variables
    private progressInterval?: number;
    private slideStartTime: number = 0;

    // ✅ Computed за markers array
    readonly slideMarkers = computed(() => {
        const total = this.totalSlides();
        return total > 1 && total <= 10 ? Array(total).fill(0) : [];
    });

    // В SlideProgressComponent класа, след computed signals:
    Math = Math;
    Array = Array;

    /**
     * Round number за template използване
     */
    round(value: number): number {
        return Math.round(value);
    }

    /**
     * Create array за template използване  
     */
    createArray(length: number): any[] {
        return Array(length).fill(0);
    }

    ngOnInit(): void {
        console.log('SlideProgressComponent.ngOnInit() - Starting progress tracking');
        this.initializeProgress();
        this.startProgressTracking();
    }

    ngOnDestroy(): void {
        console.log('SlideProgressComponent.ngOnDestroy() - Cleaning up');
        this.stopProgressTracking();
    }

    /**
     * Инициализира начални стойности за прогреса
     * @private
     */
    private initializeProgress(): void {
        console.log('SlideProgressComponent.initializeProgress()');

        const current = this.currentIndex();
        const total = this.totalSlides();

        // Calculate initial progress percentage
        const percentage = total > 0 ? ((current + 1) / total) * 100 : 0;
        this.progressPercentageSignal.set(percentage);

        // Reset slide progress
        this.slideProgressSignal.set(0);
        this.slideStartTime = Date.now();

        console.log(`Progress initialized: ${current + 1}/${total} (${percentage.toFixed(1)}%)`);
    }

    /**
     * Започва tracking на прогреса в реално време
     * @private
     */
    private startProgressTracking(): void {
        if (!this.animationEnabled()) return;

        console.log('SlideProgressComponent.startProgressTracking()');

        this.stopProgressTracking(); // Cleanup existing interval

        const interval = this.slideInterval();
        if (interval <= 0) return;

        // Update every 100ms за smooth animation
        this.progressInterval = window.setInterval(() => {
            this.updateSlideProgress();
        }, 100);
    }

    /**
     * Спира tracking на прогреса
     * @private
     */
    private stopProgressTracking(): void {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = undefined;
        }
    }

    /**
     * Обновява прогреса в рамките на текущия slide
     * @private
     */
    private updateSlideProgress(): void {
        const elapsed = Date.now() - this.slideStartTime;
        const interval = this.slideInterval();

        if (interval <= 0) return;

        const slideProgressPercent = Math.min(100, (elapsed / interval) * 100);
        this.slideProgressSignal.set(slideProgressPercent);

        // Emit complete event ако slide-a е завършен
        if (slideProgressPercent >= 100) {
            this.progressComplete.emit({
                currentIndex: this.currentIndex(),
                totalSlides: this.totalSlides()
            });

            // Reset за next slide
            this.resetSlideProgress();
        }
    }

    /**
     * Reset slide progress за нов slide
     * @private
     */
    private resetSlideProgress(): void {
        this.slideProgressSignal.set(0);
        this.slideStartTime = Date.now();

        // Update overall progress
        this.initializeProgress();
    }

    /**
     * Handle click на progress bar за manual navigation
     */
    onProgressBarClick(event: MouseEvent): void {
        const progressElement = event.currentTarget as HTMLElement;
        const rect = progressElement.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;

        const targetIndex = Math.floor((percentage / 100) * this.totalSlides());
        const validIndex = Math.max(0, Math.min(targetIndex, this.totalSlides() - 1));

        console.log(`SlideProgressComponent.onProgressBarClick() - Target: ${validIndex}, Percentage: ${percentage.toFixed(1)}%`);

        this.progressClick.emit({
            targetIndex: validIndex,
            percentage: percentage
        });
    }

    /**
     * Handle mouse enter за hover effects
     */
    onMouseEnter(): void {
        this.isHoveredSignal.set(true);
        console.log('SlideProgressComponent: Mouse entered, showing progress');
    }

    /**
     * Handle mouse leave за hover effects
     */
    onMouseLeave(): void {
        this.isHoveredSignal.set(false);
        console.log('SlideProgressComponent: Mouse left, hiding progress');
    }

    /**
     * Forced visibility toggle (за external control)
     */
    toggleVisibility(): void {
        const newVisibility = !this.isVisible();
        this.isVisibleSignal.set(newVisibility);
        console.log(`SlideProgressComponent: Visibility toggled to ${newVisibility}`);
    }

    /**
     * Force show progress (за external control)
     */
    show(): void {
        this.isVisibleSignal.set(true);
        console.log('SlideProgressComponent: Forced show');
    }

    /**
     * Force hide progress (за external control)
     */
    hide(): void {
        this.isVisibleSignal.set(false);
        console.log('SlideProgressComponent: Forced hide');
    }

    /**
     * Restart progress tracking с нови settings
     */
    restartProgress(): void {
        console.log('SlideProgressComponent.restartProgress() - Restarting with new settings');
        this.stopProgressTracking();
        this.initializeProgress();
        this.startProgressTracking();
    }

    /**
     * Get readable progress status за accessibility
     */
    getProgressStatus(): string {
        const current = this.displayCurrentIndex();
        const total = this.totalSlides();
        const progress = Math.round(this.overallProgress());

        return `Слайд ${current} от ${total}, завършени ${progress}%`;
    }

    /**
     * Check дали progress bar трябва да се показва
     */
    shouldShowProgressBar(): boolean {
        return this.showProgressBar() && this.totalSlides() > 1;
    }

    /**
     * Check дали counter трябва да се показва
     */
    shouldShowCounter(): boolean {
        return this.showCounter() && this.totalSlides() > 0;
    }
}