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
        const paused = !this.isAutoPlaying();

        // Show controls if remote is enabled AND (manually shown OR hovered OR paused)
        const shouldShow = remoteEnabled && (visible || hovered || paused);

        console.log(`shouldShowControls: remote=${remoteEnabled}, visible=${visible}, hovered=${hovered}, paused=${paused} => ${shouldShow}`);
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

        console.log('NavigationControlsComponent.onPreviousSlide() - Manual navigation');
        this.previousSlide.emit();
        this.resetAutoHideTimer();
    }

    /**
     * Handle next slide navigation
     */
    onNextSlide(): void {
        if (!this.canNavigate()) return;

        console.log('NavigationControlsComponent.onNextSlide() - Manual navigation');
        this.nextSlide.emit();
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

        console.log(`NavigationControlsComponent: Key pressed: ${event.key}`);

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.onPreviousSlide();
                this.showControls();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.onNextSlide();
                this.showControls();
                break;
            case ' ':
            case 'Space':
                event.preventDefault();
                this.onToggleAutoPlay();
                this.showControls();
                break;
            case 'f':
            case 'F':
                event.preventDefault();
                this.onRequestFullscreen();
                this.showControls(); // ✅ ДОБАВЕНО - show controls при fullscreen
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

        // Only start auto-hide if controls are visible and auto-playing
        if (this.isVisible() && this.isAutoPlaying()) {
            this.autoHideTimer = window.setTimeout(() => {
                // Double-check conditions before hiding
                if (this.isVisible() && this.isAutoPlaying() && !this.isHovered()) {
                    console.log('NavigationControlsComponent: Auto-hide timer expired, hiding controls');
                    this.isVisibleSignal.set(false);
                } else {
                    console.log('NavigationControlsComponent: Auto-hide timer expired but conditions changed, keeping visible');
                }
            }, this.autoHideDelay());
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