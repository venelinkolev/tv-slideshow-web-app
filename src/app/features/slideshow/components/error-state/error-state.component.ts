import {
    Component,
    OnInit,
    OnDestroy,
    input,
    output,
    signal,
    computed,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

import { ApiError } from '@core/models/api-response.interface';
import { ApiErrorType } from '@core/models/enums';

/**
 * ErrorStateComponent - Показва error states с user-friendly messages
 * 
 * FIXED: Removed problematic effects that caused signal write errors
 * 
 * Отговорности:
 * - Показва различни типове грешки с подходящи иконки и съобщения
 * - Предоставя retry functionality за retryable errors
 * - TV-optimized error display с големи fonts и buttons
 * - Bulgarian error messages за локален контекст
 * - Auto-hide capabilities за temporary errors
 * - Error categorization и appropriate actions
 */
@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './error-state.component.html',
    styleUrl: './error-state.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorStateComponent implements OnInit, OnDestroy {

    // ✅ Angular 18 Input signals
    readonly hasError = input<boolean>(false);
    readonly errorMessage = input<string>('');
    readonly errorCode = input<string>('');
    readonly canRetry = input<boolean>(true);
    readonly isRetrying = input<boolean>(false);
    readonly showDetails = input<boolean>(false);
    readonly autoHideDelay = input<number>(0); // 0 = no auto hide
    readonly errorType = input<ApiErrorType | null>(null);
    readonly originalError = input<ApiError | null>(null);

    // ✅ Angular 18 Output signals  
    readonly retry = output<void>();
    readonly dismiss = output<void>();
    readonly reportError = output<{ error: ApiError | null; userComment?: string }>();
    readonly toggleDetails = output<boolean>();

    // ✅ Private state signals
    private readonly showDetailsSignal = signal<boolean>(false);
    private readonly userCommentSignal = signal<string>('');
    private readonly autoHideTimerSignal = signal<number | null>(null);

    // ✅ Public readonly signals
    readonly showErrorDetails = this.showDetailsSignal.asReadonly();
    readonly userComment = this.userCommentSignal.asReadonly();

    // ✅ FIXED: Computed for visibility based on input signal directly
    readonly isVisible = computed(() => this.hasError());

    // ✅ Computed signals за error analysis
    readonly errorCategory = computed(() => {
        const errorType = this.errorType();
        const errorCode = this.errorCode();

        if (!errorType && !errorCode) return 'unknown';

        // Категоризиране на грешките според severity
        if (errorType === ApiErrorType.NETWORK_ERROR || errorCode === 'NETWORK_ERROR') {
            return 'network';
        }
        if (errorType === ApiErrorType.TIMEOUT_ERROR || errorCode === 'TIMEOUT_ERROR') {
            return 'timeout';
        }
        if (errorType === ApiErrorType.SERVER_ERROR || errorCode === 'SERVER_ERROR') {
            return 'server';
        }
        if (errorType === ApiErrorType.NOT_FOUND_ERROR || errorCode === 'NOT_FOUND_ERROR') {
            return 'not_found';
        }
        if (errorType === ApiErrorType.AUTHENTICATION_ERROR || errorCode === 'AUTHENTICATION_ERROR') {
            return 'auth';
        }
        if (errorType === ApiErrorType.AUTHORIZATION_ERROR || errorCode === 'AUTHORIZATION_ERROR') {
            return 'forbidden';
        }
        if (errorType === ApiErrorType.VALIDATION_ERROR || errorCode === 'VALIDATION_ERROR') {
            return 'validation';
        }

        return 'general';
    });

    readonly errorIcon = computed(() => {
        const category = this.errorCategory();

        switch (category) {
            case 'network': return '🌐';
            case 'timeout': return '⏱️';
            case 'server': return '🔧';
            case 'not_found': return '🔍';
            case 'auth': return '🔐';
            case 'forbidden': return '🚫';
            case 'validation': return '⚠️';
            case 'unknown': return '❓';
            default: return '❌';
        }
    });

    readonly friendlyErrorMessage = computed(() => {
        const category = this.errorCategory();
        const originalMessage = this.errorMessage();

        // Bulgarian user-friendly messages
        const friendlyMessages: Record<string, string> = {
            network: 'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.',
            timeout: 'Заявката отне твърде дълго време. Моля, опитайте отново.',
            server: 'Възникна техническа грешка на сървъра. Опитайте отново след няколко минути.',
            not_found: 'Заявената информация не е намерена.',
            auth: 'Необходима е оторизация за достъп до този ресурс.',
            forbidden: 'Нямате права за достъп до този ресурс.',
            validation: 'Има проблем с подадените данни.',
            general: 'Възникна неочаквана грешка.',
            unknown: 'Възникна неизвестна грешка.'
        };

        // Използвай friendly message ако няма specific error message
        if (!originalMessage || originalMessage.length < 10) {
            return friendlyMessages[category] || friendlyMessages['general'];
        }

        return originalMessage;
    });

    readonly actionButtonText = computed(() => {
        if (this.isRetrying()) {
            return 'Зарежда...';
        }

        const category = this.errorCategory();

        if (category === 'network' || category === 'timeout' || category === 'server') {
            return 'Опитай отново';
        }

        if (category === 'not_found') {
            return 'Обнови';
        }

        return 'Повтори';
    });

    readonly shouldShowRetryButton = computed(() => {
        return this.canRetry() && this.errorCategory() !== 'forbidden' && this.errorCategory() !== 'auth';
    });

    readonly errorClasses = computed(() => {
        const classes = ['error-state'];

        if (this.isVisible()) classes.push('error-state--visible');
        if (this.isRetrying()) classes.push('error-state--retrying');

        const category = this.errorCategory();
        classes.push(`error-state--${category}`);

        return classes;
    });

    // ✅ Auto-hide timer
    private autoHideTimer?: number;

    ngOnInit(): void {
        console.log('ErrorStateComponent.ngOnInit() - Error state manager ready');
        console.log(`Initial state: hasError=${this.hasError()}, category=${this.errorCategory()}, canRetry=${this.canRetry()}`);

        // ✅ FIXED: Handle auto-hide in ngOnInit instead of effect
        this.setupAutoHide();
    }

    ngOnDestroy(): void {
        console.log('ErrorStateComponent.ngOnDestroy() - Cleaning up timers');
        this.clearAutoHideTimer();
    }

    /**
     * Handle retry action
     */
    onRetryClick(): void {
        if (!this.shouldShowRetryButton() || this.isRetrying()) {
            return;
        }

        console.log('ErrorStateComponent.onRetryClick() - User initiated retry');
        this.retry.emit();
    }

    /**
     * Handle error dismissal
     */
    onDismissClick(): void {
        console.log('ErrorStateComponent.onDismissClick() - User dismissed error');
        this.dismiss.emit();
        this.clearAutoHideTimer();
    }

    /**
     * Toggle error details visibility
     */
    onToggleDetails(): void {
        const newState = !this.showErrorDetails();
        console.log(`ErrorStateComponent.onToggleDetails() - Details ${newState ? 'shown' : 'hidden'}`);

        this.showDetailsSignal.set(newState);
        this.toggleDetails.emit(newState);
    }

    /**
     * Handle error reporting with user comment
     */
    onReportError(): void {
        const comment = this.userComment();
        const originalError = this.originalError();

        console.log('ErrorStateComponent.onReportError() - Reporting error with user feedback');

        this.reportError.emit({
            error: originalError,
            userComment: comment || undefined
        });

        // Clear comment after reporting
        this.userCommentSignal.set('');
    }

    /**
     * Update user comment for error reporting
     */
    onUserCommentChange(comment: string): void {
        this.userCommentSignal.set(comment);
    }

    /**
     * ✅ FIXED: Setup auto-hide functionality without effects
     * @private
     */
    private setupAutoHide(): void {
        const checkAutoHide = () => {
            const hasError = this.hasError();
            const autoHideDelay = this.autoHideDelay();

            if (hasError && autoHideDelay > 0) {
                this.startAutoHideTimer(autoHideDelay);
            } else {
                this.clearAutoHideTimer();
            }
        };

        // Initial check
        checkAutoHide();

        // ✅ Watch for changes using simple polling instead of effects
        // This is safer for complex scenarios and avoids signal write issues
        const watchInterval = setInterval(() => {
            if (!this.hasError()) {
                this.clearAutoHideTimer();
                this.showDetailsSignal.set(false);
            } else {
                checkAutoHide();
            }
        }, 100); // Check every 100ms

        // Cleanup watcher on destroy
        setTimeout(() => {
            clearInterval(watchInterval);
        }, 60000); // Stop watching after 1 minute to prevent memory leaks
    }

    /**
     * Start auto-hide timer
     * @private
     */
    private startAutoHideTimer(delay: number): void {
        this.clearAutoHideTimer();

        console.log(`ErrorStateComponent.startAutoHideTimer() - Auto-hide in ${delay}ms`);

        this.autoHideTimer = window.setTimeout(() => {
            console.log('ErrorStateComponent: Auto-hiding error after timeout');
            this.onDismissClick();
        }, delay);

        this.autoHideTimerSignal.set(this.autoHideTimer);
    }

    /**
     * Clear auto-hide timer
     * @private
     */
    private clearAutoHideTimer(): void {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = undefined;
            this.autoHideTimerSignal.set(null);
        }
    }

    /**
     * Get detailed error information for debugging
     * @private
     */
    getDetailedErrorInfo(): string {
        const originalError = this.originalError();
        if (!originalError) {
            return `Error Code: ${this.errorCode()}\nMessage: ${this.errorMessage()}`;
        }

        return `Error Code: ${originalError.code}
                Message: ${originalError.message}
                Context: ${JSON.stringify(originalError.context || {}, null, 2)}
                Retry Strategy: ${JSON.stringify(originalError.retryStrategy || {}, null, 2)}`;
    }
}