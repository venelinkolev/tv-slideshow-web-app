import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-placeholder',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="tv-safe-area" style="display: flex; justify-content: center; align-items: center; height: 100vh;">
      <div style="text-align: center;">
        <h1 class="tv-heading">⚙️ Admin Panel</h1>
        <p class="tv-text" style="margin-top: 2rem;">Административният панел се зарежда...</p>
        <p class="tv-text" style="opacity: 0.7; margin-top: 1rem;">Foundation Setup Complete ✅</p>
      </div>
    </div>
  `
})
class AdminPlaceholderComponent { }

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        component: AdminPlaceholderComponent
    }
];