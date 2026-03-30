const CACHE_NAME = 'ssk-erp-v6';

const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png',
    '/supabase.js',
    '/core.js',
    '/auth.js',
    '/ui.js',
    '/sync.js',
    '/branding.js',
    '/products.js',
    '/retailers.js',
    '/orders.js',
    '/retailerOrders.js',
    '/corporateOrders.js',
    '/employees.js',
    '/payroll.js',
    '/messaging.js',
    '/reports.js',
    '/app.js',
    '/render.js'
];

// 2. INSTALL: Save all assets to the device storage
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('PWA: Caching all ERP system files...');
            // We use map to catch individual file errors so one missing file doesn't break the whole cache
            return Promise.all(
                ASSETS.map(url => {
                    return cache.add(url).catch(err => console.error(`Failed to cache: ${url}`, err));
                })
            );
        })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// 3. ACTIVATE: Remove old versions of the cache to save space
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('PWA: Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of the page immediately
    self.clients.claim();
});

// 4. FETCH: Strategy - Cache First, then Network
self.addEventListener('fetch', (event) => {
    // CRITICAL: Do NOT cache Supabase API calls. Data must always be live.
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Return the local file from storage
            }
            return fetch(event.request).catch(() => {
                // Optional: If network fails and it's a page navigation, return index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});