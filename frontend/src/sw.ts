/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Activate new SW immediately without waiting for all tabs to close
self.skipWaiting();
clientsClaim();

// Remove outdated precache entries from previous versions
cleanupOutdatedCaches();

// Workbox precaching (injected by VitePWA)
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation: use NetworkFirst so fresh HTML is always served
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigation-cache',
    networkTimeoutSeconds: 3,
  }),
);
registerRoute(navigationRoute);

// Runtime caching: Pretendard font (long-lived, immutable)
registerRoute(
  ({ url }) => url.hostname === 'cdn.jsdelivr.net',
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
);

// Runtime caching: API responses (stale-while-revalidate for weather/transit)
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/weather') ||
    url.pathname.startsWith('/api/air-quality') ||
    url.pathname.startsWith('/api/subway/stations/search') ||
    url.pathname.startsWith('/api/bus/stops/search'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
    ],
  }),
);

// Fallback: accept SKIP_WAITING message from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title: string; body: string; url?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: '출퇴근 메이트', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url || '/' },
    }),
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
