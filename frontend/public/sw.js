const CACHE_NAME = 'alert-system-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install - 정적 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate - 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch - 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/') || event.request.url.includes(':3000')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    return;
  }

  // 정적 자원은 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        // 유효한 응답만 캐시
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
      return cached || fetched;
    }),
  );
});

// API base URL for behavior tracking
const API_BASE_URL = self.location.origin.includes('localhost')
  ? 'http://localhost:3000'
  : '/api';

// Push notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Alert System';
  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'default',
    renotify: true,
    // Action buttons for notification
    actions: data.actions || [
      { action: 'leaving-now', title: '🚶 지금 출발' },
      { action: 'dismiss', title: '닫기' },
    ],
    data: {
      url: data.url || '/',
      alertId: data.data?.alertId || data.alertId,
      userId: data.data?.userId || data.userId,
      notificationId: Date.now().toString(),
    },
    // Additional options for better UX
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click - handle action buttons
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notificationData = event.notification.data || {};

  event.notification.close();

  // Handle "지금 출발" action
  if (action === 'leaving-now') {
    event.waitUntil(handleDepartureConfirmation(notificationData));
    return;
  }

  // Handle dismiss action - just close
  if (action === 'dismiss') {
    return;
  }

  // Default click - open app and track notification opened
  const url = notificationData.url || '/';

  event.waitUntil(
    Promise.all([
      trackNotificationOpened(notificationData),
      openAppWindow(url),
    ])
  );
});

// Track departure confirmation via API
async function handleDepartureConfirmation(data) {
  const { alertId, userId } = data;

  if (!userId || !alertId) {
    console.warn('Missing userId or alertId for departure confirmation');
    return openAppWindow('/');
  }

  try {
    await fetch(`${API_BASE_URL}/behavior/departure-confirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        alertId,
        source: 'push',
      }),
    });
    console.log('Departure confirmation tracked from push notification');
  } catch (error) {
    console.error('Failed to track departure confirmation:', error);
  }

  // Open app to show confirmation
  return openAppWindow('/?departure=confirmed');
}

// Track notification opened via API
async function trackNotificationOpened(data) {
  const { alertId, userId, notificationId } = data;

  if (!userId || !alertId) return;

  try {
    await fetch(`${API_BASE_URL}/behavior/notification-opened`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        alertId,
        notificationId,
      }),
    });
  } catch (error) {
    console.error('Failed to track notification opened:', error);
  }
}

// Open app window helper
async function openAppWindow(url) {
  const clientList = await clients.matchAll({ type: 'window' });

  // Try to focus existing window
  for (const client of clientList) {
    if ('focus' in client) {
      await client.focus();
      if (url !== '/') {
        client.navigate(url);
      }
      return;
    }
  }

  // Open new window
  return clients.openWindow(url);
}
