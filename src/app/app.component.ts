import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TvOptimizationsService } from '@core/services/tv-optimizations.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <main class="app-container">
      <router-outlet></router-outlet>
    </main>
    
    <!-- Индикатор за offline състояние (показва се само когато е offline) -->
    
    @if (isOffline) {
    <div class="offline-indicator">
      <div class="offline-message">
        <span class="offline-icon">⚠</span>
        <span>Няма връзка с интернет</span>
      </div>
    </div>
  }
  `,
  styles: [`
    .app-container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      overflow-y: scroll;
      position: relative;
    }
    
    .offline-indicator {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      z-index: 1000;
      padding: 10px;
      text-align: center;
      font-size: var(--tv-min-font-size);
      display: flex;
      justify-content: center;
    }
    
    .offline-message {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .offline-icon {
      font-size: 1.5em;
      color: yellow;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tvOptimizations = inject(TvOptimizationsService);

  // Индикатор за offline състояние
  isOffline = false;

  // Референция към интервала за проверка на мрежовата връзка
  private networkCheckInterval: any;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Инициализираме TV оптимизации
      this.tvOptimizations.initialize();

      // Задаваме първоначален статус на мрежата
      this.isOffline = !navigator.onLine;

      // Слушаме за промени в мрежовата връзка
      window.addEventListener('online', this.handleNetworkChange);
      window.addEventListener('offline', this.handleNetworkChange);

      // Започваме периодична проверка на мрежата (за TV които не поддържат online/offline събития)
      this.startNetworkCheck();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Почистваме TV оптимизации
      this.tvOptimizations.cleanup();

      // Премахваме event listeners
      window.removeEventListener('online', this.handleNetworkChange);
      window.removeEventListener('offline', this.handleNetworkChange);

      // Спираме периодичната проверка
      this.stopNetworkCheck();
    }
  }

  /**
   * Обработчик на промени в мрежовата връзка
   */
  private handleNetworkChange = () => {
    if (isPlatformBrowser(this.platformId)) {
      this.isOffline = !navigator.onLine;
      console.log(`Network status changed: ${navigator.onLine ? 'online' : 'offline'}`);
    }
  }

  /**
   * Започва периодична проверка на мрежовата връзка
   * Това е важно за TV които не поддържат online/offline събития
   */
  private startNetworkCheck(): void {
    this.networkCheckInterval = setInterval(() => {
      const wasOffline = this.isOffline;
      this.isOffline = !navigator.onLine;

      // Логваме само при промяна
      if (wasOffline !== this.isOffline) {
        console.log(`Network status changed: ${navigator.onLine ? 'online' : 'offline'}`);
      }
    }, 30000); // Проверяваме на всеки 30 секунди
  }

  /**
   * Спира периодичната проверка на мрежовата връзка
   */
  private stopNetworkCheck(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
  }
}