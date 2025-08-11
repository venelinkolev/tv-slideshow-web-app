/**
 * Utility клас с помощни функции за TV оптимизации
 */
export class TvUtils {
    /**
     * Предотвратява автоматичния sleep режим на телевизора
     * чрез периодично изпълнение на леки операции
     */
    static preventTvSleep(): void {
        if (typeof window === 'undefined') return;

        // Създаваме невидим div елемент за микро-анимация
        const keepAliveEl = document.createElement('div');
        keepAliveEl.style.position = 'fixed';
        keepAliveEl.style.top = '0';
        keepAliveEl.style.left = '0';
        keepAliveEl.style.width = '1px';
        keepAliveEl.style.height = '1px';
        keepAliveEl.style.opacity = '0.01';
        keepAliveEl.style.pointerEvents = 'none';
        document.body.appendChild(keepAliveEl);

        // На всеки 30 секунди правим микро-промяна, за да държим TV буден
        const keepAliveFn = () => {
            // Малка визуална промяна, която държи TV активен
            keepAliveEl.style.opacity = keepAliveEl.style.opacity === '0.01' ? '0.02' : '0.01';
        };

        // Стартираме интервал
        const intervalId = window.setInterval(keepAliveFn, 30000);

        // Запазваме референция за по-късно почистване при нужда
        (window as any).__tvKeepAliveInterval = intervalId;
        (window as any).__tvKeepAliveElement = keepAliveEl;
    }

    /**
     * Спира предотвратяването на sleep режима
     */
    static stopPreventTvSleep(): void {
        if (typeof window === 'undefined') return;

        if ((window as any).__tvKeepAliveInterval) {
            window.clearInterval((window as any).__tvKeepAliveInterval);
            (window as any).__tvKeepAliveInterval = null;
        }

        if ((window as any).__tvKeepAliveElement) {
            document.body.removeChild((window as any).__tvKeepAliveElement);
            (window as any).__tvKeepAliveElement = null;
        }
    }

    /**
     * Забранява контекстното меню и други TV интеракции
     */
    static disableTvInteractions(): void {
        if (typeof window === 'undefined') return;

        // Забраняваме контекстно меню
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Забраняваме избор на текст
        document.addEventListener('selectstart', e => e.preventDefault());

        // Скриваме курсора след 3 секунди неактивност
        let cursorTimeout: any;
        const hideCursor = () => {
            document.body.style.cursor = 'none';
        };

        document.addEventListener('mousemove', () => {
            document.body.style.cursor = 'default';
            clearTimeout(cursorTimeout);
            cursorTimeout = setTimeout(hideCursor, 3000);
        });

        // Изпълняваме веднъж при стартиране
        cursorTimeout = setTimeout(hideCursor, 3000);
    }

    /**
     * Прилага TV-безопасни мета тагове
     */
    static applyTvSafeMetaTags(): void {
        if (typeof document === 'undefined') return;

        // Създаваме мета тагове, които са подходящи за TV браузъри
        const metaTags = [
            { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
            { name: 'apple-mobile-web-app-capable', content: 'yes' },
            { name: 'mobile-web-app-capable', content: 'yes' },
            { name: 'theme-color', content: '#000000' }
        ];

        metaTags.forEach(tagInfo => {
            let metaTag = document.querySelector(`meta[name="${tagInfo.name}"]`);
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.setAttribute('name', tagInfo.name);
                document.head.appendChild(metaTag);
            }
            metaTag.setAttribute('content', tagInfo.content);
        });
    }

    /**
     * Опитва да поиска fullscreen режим
     * Това работи само при user interaction в повечето браузъри
     */
    static requestFullscreen(): void {
        if (typeof document === 'undefined') return;

        const docEl = document.documentElement;

        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if ((docEl as any).webkitRequestFullscreen) {
            (docEl as any).webkitRequestFullscreen();
        } else if ((docEl as any).mozRequestFullScreen) {
            (docEl as any).mozRequestFullScreen();
        } else if ((docEl as any).msRequestFullscreen) {
            (docEl as any).msRequestFullscreen();
        }
    }

    /**
     * Определя дали приложението се изпълнява на телевизор
     * Базирано на user agent и viewport размери
     */
    static isTvBrowser(): boolean {
        if (typeof window === 'undefined') return false;

        const ua = navigator.userAgent.toLowerCase();

        // Проверка за известни TV платформи
        const isSmartTv = ua.includes('smart-tv') ||
            ua.includes('smarttv') ||
            ua.includes('tizen') ||
            ua.includes('webos') ||
            ua.includes('vidaa') ||
            ua.includes('hbbtv') ||
            ua.includes('netcast') ||
            ua.includes('viera');

        // Ако директно открием TV в user agent
        if (isSmartTv) return true;

        // Като алтернатива, проверяваме дали viewport-a е типичен за TV
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Типични TV резолюции: 1280x720, 1920x1080, 3840x2160
        const hasCommonTvResolution =
            (viewportWidth === 1280 && viewportHeight === 720) ||
            (viewportWidth === 1920 && viewportHeight === 1080) ||
            (viewportWidth === 3840 && viewportHeight === 2160);

        // Ако е TV резолюция и няма touch поддръжка (повечето TV-та)
        return hasCommonTvResolution && !('ontouchstart' in window);
    }
}