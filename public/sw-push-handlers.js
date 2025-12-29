// Push notification handlers - imported by the main PWA service worker
// This file is included via workbox importScripts

console.log('[SW Push] Push handlers loading...');

self.addEventListener('push', function(event) {
  console.log('[SW Push] Push event received');
  
  let data = {
    title: 'Fluzz',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW Push] Payload:', JSON.stringify(payload));
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'fluzz-notification-' + Date.now(),
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    renotify: !!data.tag // Only renotify if tag is specified
  };

  console.log('[SW Push] Showing notification:', data.title);

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('[SW Push] Notification displayed'))
      .catch(err => console.error('[SW Push] Failed to show notification:', err))
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW Push] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.navigate(fullUrl).then(() => client.focus());
          }
        }
        // Open new window
        return clients.openWindow(fullUrl);
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW Push] Notification closed');
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  console.log('[SW Push] Message received:', event.data?.type);
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

// Confirm handlers are loaded
console.log('[SW Push] Handlers ready');
