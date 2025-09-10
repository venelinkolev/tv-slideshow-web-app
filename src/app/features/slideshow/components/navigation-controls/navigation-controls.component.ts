// NavigationControlsComponent - TypeScript Implementation

import {
    Component,
    OnInit,
    OnDestroy,
    input,
    output,
    signal,
    computed,
    HostListener,
    ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * NavigationControlsComponent - TV Remote Control Navigation
 * 
 * Отговорности:
 * - Manual navigation controls (previous/next)
 * - Play/pause toggle functionality
 * - Fullscreen mode toggle
 * - Auto-hide/show based on interaction
 * - Remote control help overlay
 * - TV-safe button sizing и styling
 */
@Component({
    selector: 'app-navigation-controls',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './navigation-controls.component.html',
    styleUrl: './navigation-controls.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationControlsComponent implements OnInit, OnDestroy {

    // ✅ NEW: Carousel integration inputs
    readonly currentSlideIndex = input<number>(0);
    readonly totalSlides = input<number>(0);
    readonly isCarouselReady = input<boolean>(false);

    // ✅ NEW: Loading and error state inputs for integration
    readonly isLoading = input<boolean>(false);
    readonly hasError = input<boolean>(false);

    // ✅ NEW: Template change output
    readonly templateChangeRequested = output<string>();

    // ✅ NEW: Carousel control outputs     
    readonly goToSlide = output<number>();
    readonly pauseCarousel = output<void>();
    readonly resumeCarousel = output<void>();

    // ✅ Angular 18 Input signals
    readonly isAutoPlaying = input<boolean>(true);
    readonly remoteControlEnabled = input<boolean>(false);
    readonly hasProducts = input<boolean>(false);
    readonly productsCount = input<number>(0);
    readonly showHelp = input<boolean>(false);
    readonly autoHideDelay = input<number>(5000); // milliseconds

    // ✅ Angular 18 Output signals
    readonly nextSlide = output<void>();
    readonly previousSlide = output<void>();
    readonly toggleAutoPlay = output<void>();
    readonly requestFullscreen = output<void>();
    readonly helpToggle = output<boolean>();

    // ✅ Private state signals
    private readonly isVisibleSignal = signal<boolean>(false);
    private readonly isHelpVisibleSignal = signal<boolean>(false);
    private readonly isHoveredSignal = signal<boolean>(false);

    // ✅ Public readonly signals
    readonly isVisible = this.isVisibleSignal.asReadonly();
    readonly isHelpVisible = this.isHelpVisibleSignal.asReadonly();
    readonly isHovered = this.isHoveredSignal.asReadonly();

    // ✅ Computed signals  
    readonly shouldShowControls = computed(() => {
        const remoteEnabled = this.remoteControlEnabled();
        const visible = this.isVisible();
        const hovered = this.isHovered();
        const helpVisible = this.isHelpVisible();
        const carouselReady = this.isCarouselReady();
        const hasError = this.hasError();
        const isLoading = this.isLoading();

        // Show controls if carousel has error or is loading
        if (hasError || isLoading) {
            return remoteEnabled;
        }

        // Hide controls if carousel is not ready
        if (!carouselReady) {
            return false;
        }

        const shouldShow = remoteEnabled && (visible || hovered || helpVisible);

        console.log(`shouldShowControls: remote=${remoteEnabled}, visible=${visible}, hovered=${hovered}, help=${helpVisible}, carouselReady=${carouselReady} => ${shouldShow}`);
        return shouldShow;
    });

    readonly controlsClasses = computed(() => {
        const classes = ['navigation-controls'];

        if (this.shouldShowControls()) classes.push('navigation-controls--visible');
        if (this.isHovered()) classes.push('navigation-controls--hovered');
        if (!this.hasProducts()) classes.push('navigation-controls--disabled');
        if (this.isAutoPlaying()) classes.push('navigation-controls--auto-playing');

        return classes.join(' ');
    });

    readonly playPauseLabel = computed(() => {
        return this.isAutoPlaying() ? 'Пауза' : 'Възпроизвеждане';
    });

    readonly playPauseIcon = computed(() => {
        return this.isAutoPlaying() ? '⏸️' : '▶️';
    });

    readonly canNavigate = computed(() => {
        return this.hasProducts() && this.productsCount() > 1;
    });

    // ✅ Auto-hide timer
    private autoHideTimer?: number;

    ngOnInit(): void {
        console.log('NavigationControlsComponent.ngOnInit() - TV remote controls ready');
        console.log(`Initial state: remoteEnabled=${this.remoteControlEnabled()}, autoPlaying=${this.isAutoPlaying()}, hasProducts=${this.hasProducts()}`);

        // 🔧 ENSURE controls start hidden
        this.isVisibleSignal.set(false);
        this.isHelpVisibleSignal.set(false);
        this.isHoveredSignal.set(false);

        // Don't start auto-hide immediately - wait for user interaction
        // this.setupAutoHide();
    }

    ngOnDestroy(): void {
        console.log('NavigationControlsComponent.ngOnDestroy() - Cleaning up timers');
        this.clearAutoHideTimer();
    }

    /**
     * Handle previous slide navigation
     */
    onPreviousSlide(): void {
        if (!this.canNavigate()) return;

        // ✅ COPY SlideProgress logic - calculate target index directly
        const currentIndex = this.currentSlideIndex();
        const targetIndex = Math.max(0, currentIndex - 1);

        console.log(`NavigationControlsComponent.onPreviousSlide() - Direct navigation to index ${targetIndex} (was ${currentIndex})`);

        // ✅ Use goToSlide instead of previousSlide for direct targeting
        this.goToSlide.emit(targetIndex);
        this.resetAutoHideTimer();
    }

    /**
     * Handle next slide navigation
     */
    onNextSlide(): void {
        if (!this.canNavigate()) return;

        // ✅ COPY SlideProgress logic - calculate target index directly
        const currentIndex = this.currentSlideIndex();
        const totalSlides = this.totalSlides();
        const targetIndex = Math.min(totalSlides - 1, currentIndex + 1);

        console.log(`NavigationControlsComponent.onNextSlide() - Direct navigation to index ${targetIndex} (was ${currentIndex})`);

        // ✅ Use goToSlide instead of nextSlide for direct targeting
        this.goToSlide.emit(targetIndex);
        this.resetAutoHideTimer();
    }

    /**
     * Handle play/pause toggle
     */
    onToggleAutoPlay(): void {
        console.log('NavigationControlsComponent.onToggleAutoPlay() - Toggle playback');
        this.toggleAutoPlay.emit();
        this.resetAutoHideTimer();
    }

    /**
     * Handle fullscreen request
     */
    onRequestFullscreen(): void {
        console.log('NavigationControlsComponent.onRequestFullscreen() - Fullscreen toggle');
        this.requestFullscreen.emit();
        this.resetAutoHideTimer();
    }

    /**
    * Handle go to specific slide
    
    */
    onGoToSlide(slideIndex: number): void {
        if (!this.canNavigate() || !this.isCarouselReady()) return;

        const validIndex = Math.max(0, Math.min(slideIndex, this.totalSlides() - 1));
        console.log(`NavigationControlsComponent.onGoToSlide(${validIndex}) - User navigation`);

        // ✅ FIXED: Always emit as user-initiated navigation
        this.goToSlide.emit(validIndex);
        this.resetAutoHideTimer();
    }

    /**
     * Handle carousel pause request
     */
    onPauseCarousel(): void {
        if (!this.isCarouselReady()) return;

        console.log('NavigationControlsComponent.onPauseCarousel() - Pausing carousel');
        this.pauseCarousel.emit();
        this.resetAutoHideTimer();
    }

    /**
     * Handle carousel resume request  
     */
    onResumeCarousel(): void {
        if (!this.isCarouselReady()) return;

        console.log('NavigationControlsComponent.onResumeCarousel() - Resuming carousel');
        this.resumeCarousel.emit();
        this.resetAutoHideTimer();
    }

    /**
     * Handle template change request
     */
    onTemplateChange(templateId: string): void {
        console.log(`NavigationControlsComponent.onTemplateChange(${templateId})`);
        this.templateChangeRequested.emit(templateId);
        this.showControls();
    }

    /**
     * Get current slide info for accessibility
     */
    getSlideInfo(): string {
        const current = this.currentSlideIndex() + 1;
        const total = this.totalSlides();
        return `Слайд ${current} от ${total}`;
    }

    /**
     * Show controls temporarily
     */
    showControls(): void {
        console.log('NavigationControlsComponent.showControls() - Showing controls');
        console.log(`Current state: visible=${this.isVisible()}, autoPlaying=${this.isAutoPlaying()}, remoteEnabled=${this.remoteControlEnabled()}`);

        this.isVisibleSignal.set(true);

        // Log after setting
        console.log(`After setting visible: shouldShow=${this.shouldShowControls()}`);

        this.resetAutoHideTimer();
    }

    /**
     * Hide controls immediately
     */
    hideControls(): void {
        console.log('NavigationControlsComponent.hideControls() - Hiding controls');
        this.isVisibleSignal.set(false);
        this.clearAutoHideTimer();
    }

    /**
     * Toggle help overlay visibility
     */
    toggleHelp(): void {
        const newState = !this.isHelpVisible();
        console.log(`NavigationControlsComponent.toggleHelp() - Help ${newState ? 'shown' : 'hidden'}`);

        this.isHelpVisibleSignal.set(newState);
        this.helpToggle.emit(newState);

        if (newState) {
            this.showControls();
        }
    }

    /**
     * Handle mouse enter for hover state
     */
    onMouseEnter(): void {
        this.isHoveredSignal.set(true);
        this.clearAutoHideTimer();
        console.log('NavigationControlsComponent: Mouse entered, controls persistent');
    }

    /**
     * Handle mouse leave for hover state
     */
    onMouseLeave(): void {
        this.isHoveredSignal.set(false);
        this.resetAutoHideTimer();
        console.log('NavigationControlsComponent: Mouse left, resuming auto-hide');
    }

    /**
     * Handle keyboard shortcuts
     */
    @HostListener('document:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (!this.remoteControlEnabled()) return;

        console.log(`NavigationControlsComponent: Key pressed: "${event.key}" (code: ${event.code})`);

        if (!this.isCarouselReady() && event.key !== 'h' && event.key !== 'H' && event.key !== 'Escape') {
            console.log('Carousel not ready - ignoring key');
            return;
        }

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                console.log('Arrow Left → Previous slide (direct targeting)');

                // ✅ COPY SlideProgress logic for Arrow Left
                if (this.canNavigate()) {
                    const currentIndex = this.currentSlideIndex();
                    const targetIndex = Math.max(0, currentIndex - 1);
                    console.log(`Direct navigation: ${currentIndex} → ${targetIndex}`);
                    this.goToSlide.emit(targetIndex);
                }
                // this.onPreviousSlide();
                this.showControls();
                break;

            case 'ArrowRight':
                event.preventDefault();
                console.log('Arrow Right → Next slide (direct targeting)');

                // ✅ COPY SlideProgress logic for Arrow Right
                if (this.canNavigate()) {
                    const currentIndex = this.currentSlideIndex();
                    const totalSlides = this.totalSlides();
                    const targetIndex = Math.min(totalSlides - 1, currentIndex + 1);
                    console.log(`Direct navigation: ${currentIndex} → ${targetIndex}`);
                    this.goToSlide.emit(targetIndex);
                }
                // this.onNextSlide();
                this.showControls();
                break;

            case ' ':
            case 'Space':
                event.preventDefault();
                console.log('Space → Toggle play/pause');
                if (this.isAutoPlaying()) {
                    this.onPauseCarousel();
                } else {
                    this.onResumeCarousel();
                }
                this.showControls();
                break;

            // ✅ Enhanced number key handling with direct targeting
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                const slideNumber = parseInt(event.key) - 1;
                if (slideNumber < this.totalSlides()) {
                    event.preventDefault();
                    console.log(`Number ${event.key} → Go to slide ${slideNumber} (direct targeting)`);
                    this.goToSlide.emit(slideNumber);
                    this.showControls();
                }
                break;

            case 'p':
            case 'P':
                event.preventDefault();
                console.log('P key → Toggle play/pause');
                if (this.isAutoPlaying()) {
                    this.onPauseCarousel();
                } else {
                    this.onResumeCarousel();
                }
                this.showControls();
                break;

            // Keep other keys unchanged
            case 'f':
            case 'F':
                event.preventDefault();
                this.onRequestFullscreen();
                this.showControls();
                break;

            case 'h':
            case 'H':
                event.preventDefault();
                this.toggleHelp();
                break;

            case 'Escape':
                if (this.isHelpVisible()) {
                    event.preventDefault();
                    this.toggleHelp();
                }
                break;
        }
    }
    /**
     * Reset auto-hide timer
     * @private
     */
    private resetAutoHideTimer(): void {
        this.clearAutoHideTimer();

        // Start auto-hide timer если controls are visible (независимо от autoPlaying състоянието)
        if (this.isVisible()) {
            console.log(`NavigationControlsComponent: Starting auto-hide timer (${this.autoHideDelay()}ms)`);

            this.autoHideTimer = window.setTimeout(() => {
                // Double-check conditions before hiding
                if (this.isVisible() && !this.isHovered() && !this.isHelpVisible()) {
                    console.log('NavigationControlsComponent: Auto-hide timer expired, hiding controls');
                    this.isVisibleSignal.set(false);
                } else {
                    console.log('NavigationControlsComponent: Auto-hide timer expired but conditions changed, keeping visible');
                    console.log(`State: visible=${this.isVisible()}, hovered=${this.isHovered()}, help=${this.isHelpVisible()}`);
                }
            }, this.autoHideDelay());
        } else {
            console.log('NavigationControlsComponent: Controls not visible, skipping auto-hide timer');
        }
    }

    /**
     * Clear auto-hide timer
     * @private
     */
    private clearAutoHideTimer(): void {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = undefined;
        }
    }

    /**
     * Get accessible button description
     */
    getButtonDescription(button: string): string {
        switch (button) {
            case 'previous':
                return `Предишен слайд${!this.canNavigate() ? ' (недостъпно)' : ''}`;
            case 'next':
                return `Следващ слайд${!this.canNavigate() ? ' (недостъпно)' : ''}`;
            case 'play-pause':
                return this.playPauseLabel();
            case 'fullscreen':
                return 'Превключване на цял екран';
            default:
                return button;
        }
    }

    /**
     * Check if button should be disabled
     */
    isButtonDisabled(button: string): boolean {
        switch (button) {
            case 'previous':
            case 'next':
                return !this.canNavigate();
            default:
                return false;
        }
    }

    /**
     * Force show controls (за debugging)
     */
    forceShowControls(): void {
        console.log('NavigationControlsComponent.forceShowControls() - DEBUG: Forcing controls visible');
        this.isVisibleSignal.set(true);
        console.log(`After force show: shouldShowControls=${this.shouldShowControls()}`);
    }
}