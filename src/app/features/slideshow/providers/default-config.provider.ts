import { Provider } from '@angular/core';
import { ConfigService } from '@core/services/config.service';

/**
 * Провайдер който предоставя default mock конфигурация за разработка
 * в development режим
 */
export const DEFAULT_CONFIG_PROVIDER: Provider = {
    provide: 'DEFAULT_SLIDESHOW_CONFIG',
    useFactory: () => {
        // Създаваме mock конфигурация за разработка
        const defaultConfig = {
            id: 'default-config',
            name: 'Default Slideshow Configuration',
            selectedTemplate: 'classic',
            productCount: 10,
            slideInterval: 20000, // 20 секунди за слайд
            autoRefreshInterval: 600000, // 10 минути
            enableTransitions: true,
            imageQuality: 'medium'
        };

        return defaultConfig;
    },
    // Предоставяме само в development режим
    multi: false
};

/**
 * Провайдер който инициализира конфигурацията от default стойностите,
 * ако не е вече инициализирана в localStorage
 */
export const INIT_CONFIG_PROVIDER: Provider = {
    provide: 'INIT_CONFIG',
    useFactory: (configService: ConfigService, defaultConfig: any) => {
        // Не правим никаква инициализация, тъй като ConfigService
        // вече има инициализация в конструктора си
        console.log('Config provider initialized');

        // Не вземаме нито едно действие тук
        return true;
    },
    deps: [ConfigService, 'DEFAULT_SLIDESHOW_CONFIG']
};

// Комбиниран провайдер за конфигурация
export const CONFIG_PROVIDERS = [
    DEFAULT_CONFIG_PROVIDER,
    INIT_CONFIG_PROVIDER
];