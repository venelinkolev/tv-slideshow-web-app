// src/app/features/auth/components/login/login.component.ts

import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '@core/services/auth.service';
import { ConfigService } from '@core/services/config.service';
import { LoginRequest } from '@core/models';

/**
 * Login Component for TV Slideshow Application
 * 3-field login form: Email, Username, Password
 * 
 * Features:
 * - Email validation
 * - Password show/hide toggle
 * - Remember Me functionality
 * - Smart routing after login (Slideshow or Admin)
 * - Error handling with Bulgarian messages
 * - Loading state with spinner
 */
@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatIconModule
    ],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly configService = inject(ConfigService);

    // Signals for reactive state
    readonly isLoading = signal<boolean>(false);
    readonly errorMessage = signal<string>('');
    readonly showPassword = signal<boolean>(false);
    readonly returnUrl = signal<string | null>(null);

    // Form
    loginForm!: FormGroup;

    ngOnInit(): void {
        this.initializeForm();
        this.loadStoredCredentials();
        this.loadReturnUrl();
    }

    /**
     * Initialize login form with validators
     */
    private initializeForm(): void {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            username: ['', Validators.required],
            password: ['', Validators.required],
            rememberMe: [true]
        });
    }

    /**
     * Load stored credentials if Remember Me was checked
     */
    private loadStoredCredentials(): void {
        const stored = this.authService.getStoredCredentials();
        if (stored) {
            this.loginForm.patchValue({
                email: stored.email,
                username: stored.username,
                password: stored.password,
                rememberMe: stored.rememberMe
            });
            console.log('✅ Loaded stored credentials for:', stored.username);
        }
    }

    /**
 * Load return URL from query params
 */
    private loadReturnUrl(): void {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
            this.returnUrl.set(returnUrl);
            console.log('📍 Return URL found:', returnUrl);
        }
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        // Clear previous error
        this.errorMessage.set('');

        // Validate form
        if (this.loginForm.invalid) {
            this.errorMessage.set('Моля, попълнете всички полета правилно');
            this.markFormAsTouched();
            return;
        }

        // Start loading
        this.isLoading.set(true);

        const formValue = this.loginForm.value;
        const credentials: LoginRequest = {
            email: formValue.email,
            username: formValue.username,
            password: formValue.password
        };

        // Attempt login
        this.authService.login(credentials).subscribe({
            next: () => {
                console.log('✅ Login successful');

                // Save credentials if Remember Me is checked
                if (formValue.rememberMe) {
                    this.authService.saveCredentials({
                        email: formValue.email,
                        username: formValue.username,
                        password: formValue.password,
                        rememberMe: true,
                        savedAt: new Date()
                    });
                } else {
                    // Clear stored credentials if Remember Me is unchecked
                    this.authService.clearStoredCredentials();
                }

                // Check config and redirect
                this.checkConfigAndRedirect();
            },
            error: (error) => {
                console.error('❌ Login failed:', error);
                this.isLoading.set(false);

                // Set user-friendly error message
                this.errorMessage.set(
                    error.message || 'Грешка при вход. Проверете данните си.'
                );
            }
        });
    }

    /**
 * Check if slideshow is configured and redirect accordingly
 * Priority: returnUrl > config check
 */
    private checkConfigAndRedirect(): void {
        // Priority 1: Check for returnUrl from query params
        const returnUrl = this.returnUrl();
        if (returnUrl) {
            console.log('✅ Redirecting to return URL:', returnUrl);
            this.router.navigateByUrl(returnUrl);
            return;
        }

        // Priority 2: Check config and redirect based on setup status
        const config = this.configService.config();
        const hasConfig = config.products.selectedProductIds.length > 0;

        if (hasConfig) {
            console.log('✅ Config found, redirecting to slideshow');
            this.router.navigate(['/slideshow']);
        } else {
            console.log('⚠️ No config found, redirecting to admin');
            this.router.navigate(['/admin']);
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(): void {
        this.showPassword.update(val => !val);
    }

    /**
     * Mark all form fields as touched to show validation errors
     */
    private markFormAsTouched(): void {
        Object.keys(this.loginForm.controls).forEach(key => {
            this.loginForm.get(key)?.markAsTouched();
        });
    }

    /**
     * Get form field error message
     */
    getErrorMessage(fieldName: string): string {
        const field = this.loginForm.get(fieldName);

        if (!field || !field.touched) {
            return '';
        }

        if (field.hasError('required')) {
            return 'Полето е задължително';
        }

        if (field.hasError('email')) {
            return 'Невалиден email адрес';
        }

        return '';
    }
}