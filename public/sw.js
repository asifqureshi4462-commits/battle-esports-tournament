// Service Worker for BATTLE ESPORTS Mobile & Web Push Notifications
const CACHE_NAME = 'battle-esports-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Push Events dispatched from the server
self.addEventListener('push', (event) => {
  let payload = {
    title: 'BATTLE ESPORTS Notification',
    body: 'You have a new tournament update',
    icon: '/icon.svg',
    badge: '/icon.svg',
    linkTab: 'home',
    vibrate: [200, 100, 200],
    tag: 'battle-esports-alert',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: payload.badge || '/icon.svg',
    vibrate: payload.vibrate !== false ? [200, 100, 200] : undefined,
    data: {
      linkTab: payload.linkTab || 'home',
      url: payload.url || '/',
      timestamp: Date.now(),
    },
    tag: payload.tag || `battle-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: payload.linkTab === 'matches', // Keep room details sticky
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle User Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const linkTab = event.notification.data?.linkTab || 'home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to navigate to the tab
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TAB',
            tab: linkTab,
          });
          return;
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(`/?tab=${linkTab}`);
      }
    })
  );
});
