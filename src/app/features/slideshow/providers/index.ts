export * from './default-config.provider';

// src/app/features/slideshow/providers/slideshow.providers.ts
import { Provider } from '@angular/core';
import { CONFIG_PROVIDERS } from './default-config.provider';

/**
 * Providers за Slideshow модула
 */
export const SLIDESHOW_PROVIDERS: Provider[] = [
    ...CONFIG_PROVIDERS,
    // Тук ще добавим други providers при нужда
];