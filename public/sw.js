// FU Corp CRM — Service Worker for PWA
// Strategy:
//  - Static assets (precache): app shell + manifest + icons
//  - Navigations (HTML): network-first with cache fallback to offline page
//  - Static GET (images/css/js): stale-while-revalidate for fast repeat loads
//  - API: never cache (always live)
//
// Bump CACHE_VERSION on every meaningful change so old caches are evicted.

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `fu-corp-crm-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fu-corp-crm-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/mascot-32.png',
  '/mascot-192.png',
  '/mascot-512.png',
  OFFLINE_URL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // Use addAll with individual catches so one missing asset doesn't fail install
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (let the browser handle it)
  if (url.origin !== self.location.origin) return;

  // Never cache APIs, auth, or SSE
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.startsWith('/_next/image')
  )
    return;

  // HTML navigation: network-first, fallback to cache, fallback to offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Listen for skipWaiting messages from the page (for instant updates)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Push Notifications ─────────────────────────────────
// Server pushes a JSON payload via web-push:
// { title, body, icon, badge, url, tag, data }
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Alpha Command Center', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/mascot-192.png',
    badge: payload.badge || '/mascot-96.png',
    tag: payload.tag,
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || '/',
      ...payload.data,
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Alpha Command Center', options)
  );
});

// Click on a notification — focus or open the relevant URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If a tab is already open, focus it and navigate
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
            return;
          } catch {
            // continue to fallback
          }
        }
      }

      // Otherwise open a new tab
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
