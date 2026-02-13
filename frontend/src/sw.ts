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

// Push notification handler (with B-7 action button support)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title: string; body: string; url?: string; actions?: Array<{ action: string; title: string; url: string }> };
  try {
    data = event.data.json();
  } catch {
    data = { title: '출퇴근 메이트', body: event.data.text() };
  }

  // NotificationOptions.actions is spec-standard but not in TS lib types
  const options: NotificationOptions & { actions?: Array<{ action: string; title: string }> } = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/' },
  };

  // Add action buttons if provided (e.g., delay alerts with "대안 경로 보기")
  if (data.actions?.length) {
    options.actions = data.actions.map(a => ({
      action: a.action,
      title: a.title,
    }));
    // Store action URLs in data for click handling
    options.data.actionUrls = Object.fromEntries(
      data.actions.map(a => [a.action, a.url]),
    );
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler (with action button support)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Resolve URL: action button URL takes priority over default URL
  let url = event.notification.data?.url || '/';
  if (event.action && event.notification.data?.actionUrls?.[event.action]) {
    url = event.notification.data.actionUrls[event.action];
  }

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
