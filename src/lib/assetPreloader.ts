/**
 * Asset Preloader & Caching Engine for PK ARENA
 * Pre-caches all essential graphics, logos, backgrounds, coins, and icons
 * into Browser Memory & CacheStorage for instantaneous loading.
 */

export const CORE_ASSETS_TO_CACHE = [
  '/splash-bg.png',
  '/PK-LOGO.jpg',
  '/PK-LOGO.jpeg',
  '/pk-coin-new.png',
  '/pk-coins.png',
  '/AVATER.png',
  '/lsbg.png',
  '/LSBG.png',
  '/character-box.png',
  '/match-card.png',
  '/easypaisa.png',
  '/jazzcash.png',
  '/sadapay.png',
  '/nayapay.png',
  '/SUPPORT_ICON.png',
  '/run-loading.json',
];

const inMemoryImageCache = new Map<string, HTMLImageElement>();

/**
 * Preload an individual image into memory and CacheStorage
 */
export const preloadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url) return resolve(false);

    // If already in memory cache, resolve immediately
    if (inMemoryImageCache.has(url)) {
      return resolve(true);
    }

    const img = new Image();
    img.src = url;
    img.onload = () => {
      inMemoryImageCache.set(url, img);
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
  });
};

/**
 * Preload and cache all core application assets on startup
 */
export const preloadAllCoreAssets = async (): Promise<void> => {
  try {
    // 1. Parallel memory prefetch
    const preloadPromises = CORE_ASSETS_TO_CACHE.map((url) => preloadImage(url));

    // 2. CacheStorage persistence (if available in WebView / Browser)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('pkarena-assets-v1');
        const existingKeys = await cache.keys();
        if (existingKeys.length < CORE_ASSETS_TO_CACHE.length) {
          // Fetch and store in CacheStorage in background
          CORE_ASSETS_TO_CACHE.forEach(async (url) => {
            try {
              const matched = await cache.match(url);
              if (!matched) {
                const response = await fetch(url, { cache: 'force-cache' });
                if (response.ok) {
                  await cache.put(url, response);
                }
              }
            } catch {
              // Ignore cache storage errors if offline
            }
          });
        }
      } catch (e) {
        console.warn('CacheStorage initialization:', e);
      }
    }

    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.warn('Asset preloading completed with warnings:', error);
  }
};

/**
 * Dynamic caching helper for newly loaded match banners, team logos or user avatars
 */
export const preloadDynamicAssets = (urls: (string | undefined | null)[]): void => {
  const validUrls = urls.filter((u): u is string => Boolean(u && typeof u === 'string' && u.startsWith('http')));
  validUrls.forEach((url) => {
    preloadImage(url);
  });
};
